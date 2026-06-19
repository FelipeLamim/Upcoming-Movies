"""Small, framework-free backend for the Upcoming Movies site.

It serves the static frontend and exposes a tiny JSON API that proxies TMDb.
The TMDB API key is read from the environment and never sent to the browser:
the frontend only ever talks to our own /api/* endpoints.

Endpoints
---------
GET /api/upcoming-movies
    Query params: region, siteLanguage, originalLanguage, daysAhead,
    sortBy (release|popularity), sortOrder (asc|desc).
    Returns the filtered + sorted movie list plus some meta counts.

GET /api/movie/<id>
    Query params: siteLanguage.
    Returns the details needed by the detail page: title, poster, release
    date, overview, trailer, cast, and grouped crew.
"""

import json
import os
import time
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests
from dotenv import load_dotenv

# -----------------------------
# Configuration
# -----------------------------

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env.local")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

if not TMDB_API_KEY:
    raise SystemExit(
        "Missing TMDB_API_KEY. Set it as an environment variable, or add it to "
        "my-upcoming-films/.env.local like this:\nTMDB_API_KEY=your_api_key_here"
    )

# Public site origin used for canonical URLs, sitemap, robots, and social tags.
# Override with SITE_URL env var if the domain changes.
SITE_URL = os.getenv("SITE_URL", "https://movie-horizon.com").rstrip("/")

TMDB_BASE_URL = "https://api.themoviedb.org/3"
IMG_POSTER_URL = "https://image.tmdb.org/t/p/w500"
IMG_BACKDROP_URL = "https://image.tmdb.org/t/p/w1280"
IMG_PROFILE_URL = "https://image.tmdb.org/t/p/w185"

# Theatrical release types on TMDb: 2 = limited, 3 = wide.
THEATRICAL_RELEASE_TYPES = "2|3"

# Map the two site languages to TMDb language codes.
SITE_LANGUAGE_MAP = {"en": "en-US", "pt": "pt-BR"}

# Filtering thresholds (kept from the original project).
MIN_POPULARITY = 2
MIN_OVERVIEW_LENGTH = 30
MAX_MOVIES = 100

# How many discover pages to pull at most (each page ~20 movies). Caps latency.
MAX_PAGES = 15

# In-memory cache for the upcoming endpoint, keyed by the inputs that change the
# underlying TMDb data (region, language, original language, days ahead).
# Sorting/search are applied on top, so they don't need their own cache entries.
UPCOMING_CACHE = {}
# Per-movie detail cache, keyed by (movie_id, tmdb_language).
MOVIE_DETAIL_CACHE = {}
CACHE_TTL_SECONDS = 15 * 60  # 15 minutes (within the 10–30 min target)

# Date window bounds requested by the product spec.
MIN_DAYS_AHEAD = 1
MAX_DAYS_AHEAD = 365  # up to 1 year

PORT = int(os.getenv("PORT", "8000"))

# Static files we are willing to serve, mapped to their content types.
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


# -----------------------------
# TMDb helpers
# -----------------------------

def tmdb_get(path, **params):
    """Call a TMDb endpoint with the server-side API key and return JSON."""
    params["api_key"] = TMDB_API_KEY
    response = requests.get(f"{TMDB_BASE_URL}{path}", params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def image_url(path, base=IMG_POSTER_URL):
    return f"{base}{path}" if path else None


# Genre id -> name maps are small and rarely change, so cache them per language.
GENRE_CACHE = {}


def get_genre_map(language):
    """Return a {genre_id: genre_name} map for the given TMDb language."""
    if language in GENRE_CACHE:
        return GENRE_CACHE[language]
    try:
        data = tmdb_get("/genre/movie/list", language=language)
        mapping = {g["id"]: g["name"] for g in data.get("genres", [])}
    except requests.RequestException:
        mapping = {}
    GENRE_CACHE[language] = mapping
    return mapping


def clamp_days_ahead(raw_value):
    """Parse and clamp the requested day interval to [MIN_DAYS_AHEAD, MAX_DAYS_AHEAD]."""
    try:
        days = int(raw_value)
    except (TypeError, ValueError):
        days = 60
    return max(MIN_DAYS_AHEAD, min(MAX_DAYS_AHEAD, days))


def passes_filters(movie):
    """Apply the preserved base filters (adult/video/poster/popularity/overview)."""
    overview = (movie.get("overview") or "").strip()
    return (
        not movie.get("adult", False)
        and not movie.get("video", False)
        and bool(movie.get("poster_path"))
        and (movie.get("popularity") or 0) >= MIN_POPULARITY
        and len(overview) >= MIN_OVERVIEW_LENGTH
    )


def get_filtered_movies(region, site_language, original_language, days_ahead):
    """Return the deduped + filtered (but unsorted) movie list for these inputs.

    Results are cached for CACHE_TTL_SECONDS, keyed by everything that affects the
    underlying TMDb data. Sorting and search are applied later, on top of this.
    """
    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")
    cache_key = (region, tmdb_language, original_language, days_ahead)

    now = time.time()
    cached = UPCOMING_CACHE.get(cache_key)
    if cached and (now - cached["createdAt"]) < CACHE_TTL_SECONDS:
        cached["cacheHit"] = True
        cached["pagesFetched"] = 0
        cached["fetchMs"] = 0
        return cached

    today = date.today()
    window_end = today + timedelta(days=days_ahead)

    # Pull pages sorted by popularity so the most relevant come first. Because the
    # results are popularity-descending, once a page ends below our popularity
    # threshold no later page can qualify, so we can stop early.
    started = time.time()
    raw_movies = []
    pages_fetched = 0
    for page in range(1, MAX_PAGES + 1):
        discover_params = {
            "region": region,
            "language": tmdb_language,
            "page": page,
            "sort_by": "popularity.desc",
            "with_release_type": THEATRICAL_RELEASE_TYPES,
            "release_date.gte": today.isoformat(),
            "release_date.lte": window_end.isoformat(),
        }
        if original_language:
            discover_params["with_original_language"] = original_language

        data = tmdb_get("/discover/movie", **discover_params)
        results = data.get("results", [])
        raw_movies.extend(results)
        pages_fetched += 1

        if page >= data.get("total_pages", page):
            break
        # Early stop: remaining pages are all below the popularity threshold.
        if results and (results[-1].get("popularity") or 0) < MIN_POPULARITY:
            break
        # Early stop: we already have comfortably more than we will display.
        if len(raw_movies) >= MAX_MOVIES * 2:
            break

    fetch_ms = int((time.time() - started) * 1000)
    raw_count = len(raw_movies)

    # Remove duplicates by TMDB id.
    unique_by_id = {m["id"]: m for m in raw_movies}
    unique_movies = list(unique_by_id.values())

    # Filter: base filters + the exact release-date window.
    filtered = []
    for movie in unique_movies:
        try:
            release = datetime.strptime(movie.get("release_date", ""), "%Y-%m-%d").date()
        except ValueError:
            continue
        if today <= release <= window_end and passes_filters(movie):
            filtered.append(movie)

    entry = {
        "filtered": filtered,
        "tmdbLanguage": tmdb_language,
        "windowStart": today.isoformat(),
        "windowEnd": window_end.isoformat(),
        "rawCount": raw_count,
        "dedupedCount": len(unique_movies),
        "filteredCount": len(filtered),
        "createdAt": now,
        "cacheHit": False,
        "pagesFetched": pages_fetched,
        "fetchMs": fetch_ms,
    }
    UPCOMING_CACHE[cache_key] = entry
    return entry


def fetch_upcoming(region, site_language, original_language, days_ahead,
                   sort_by, sort_order):
    """Sort + trim the (cached) filtered list into the API response shape."""
    data = get_filtered_movies(region, site_language, original_language, days_ahead)

    # Build a stable pool first: the most relevant MAX_MOVIES by popularity. This
    # keeps the returned set identical regardless of sort, so the client can
    # re-sort locally without losing/gaining movies.
    pool = sorted(
        data["filtered"], key=lambda m: m.get("popularity") or 0, reverse=True
    )[:MAX_MOVIES]

    # Sort the pool by the requested field/order for the initial paint.
    reverse = sort_order == "desc"
    if sort_by == "popularity":
        top_movies = sorted(pool, key=lambda m: m.get("popularity") or 0, reverse=reverse)
    else:
        top_movies = sorted(pool, key=lambda m: m.get("release_date") or "", reverse=reverse)

    # Resolve genre ids to readable names (limited to the first few per card).
    genre_map = get_genre_map(data["tmdbLanguage"])

    movies = [
        {
            "id": m.get("id"),
            "title": m.get("title") or m.get("name") or "Untitled",
            "overview": m.get("overview") or "",
            "releaseDate": m.get("release_date") or "",
            "popularity": round(m.get("popularity") or 0, 1),
            "voteAverage": round(m.get("vote_average") or 0, 1),
            "posterUrl": image_url(m.get("poster_path")),
            "backdropUrl": image_url(m.get("backdrop_path"), IMG_BACKDROP_URL),
            "originalLanguage": m.get("original_language"),
            "genres": [
                genre_map[gid]
                for gid in (m.get("genre_ids") or [])
                if gid in genre_map
            ][:3],
        }
        for m in top_movies
    ]

    return {
        "movies": movies,
        "meta": {
            "region": region,
            "siteLanguage": site_language,
            "originalLanguage": original_language or "any",
            "daysAhead": days_ahead,
            "windowStart": data["windowStart"],
            "windowEnd": data["windowEnd"],
            "rawCount": data["rawCount"],
            "dedupedCount": data["dedupedCount"],
            "filteredCount": data["filteredCount"],
            "returnedCount": len(movies),
            "sortBy": sort_by,
            "sortOrder": sort_order,
            "cacheHit": data["cacheHit"],
            "pagesFetched": data["pagesFetched"],
            "fetchMs": data["fetchMs"],
        },
    }


def pick_trailer(videos):
    """Choose the best YouTube trailer and return {key, url} or None."""
    results = (videos or {}).get("results", [])
    youtube = [v for v in results if v.get("site") == "YouTube" and v.get("key")]
    for video_type in ("Trailer", "Teaser", "Clip", "Featurette"):
        matches = [v for v in youtube if v.get("type") == video_type]
        official = [v for v in matches if v.get("official")]
        chosen = official[0] if official else (matches[0] if matches else None)
        if chosen:
            return {
                "key": chosen["key"],
                "url": f"https://www.youtube.com/embed/{chosen['key']}",
            }
    if youtube:
        return {
            "key": youtube[0]["key"],
            "url": f"https://www.youtube.com/embed/{youtube[0]['key']}",
        }
    return None


def group_crew(crew):
    """Group crew into labeled roles, de-duplicating names within each group."""
    groups = [
        ("Director", {"Director"}),
        ("Writers", {"Writer", "Screenplay", "Story", "Author", "Novel"}),
        ("Producers", {"Producer", "Executive Producer"}),
        ("Music", {"Original Music Composer", "Music"}),
        ("Cinematography", {"Director of Photography"}),
    ]
    result = []
    for label, jobs in groups:
        seen = set()
        names = []
        for person in crew or []:
            if person.get("job") in jobs and person.get("name") not in seen:
                seen.add(person.get("name"))
                names.append(person["name"])
        if names:
            result.append({"role": label, "names": names})
    return result


def fetch_movie_detail(movie_id, site_language):
    """Fetch and trim a single movie's details, credits, and videos (cached)."""
    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")

    cache_key = (movie_id, tmdb_language)
    now = time.time()
    cached = MOVIE_DETAIL_CACHE.get(cache_key)
    if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    details = tmdb_get(
        f"/movie/{movie_id}",
        language=tmdb_language,
        append_to_response="credits,videos",
    )

    credits = details.get("credits") or {}
    cast = [
        {
            "name": person.get("name", "Unknown"),
            "character": person.get("character") or "",
            "profileUrl": image_url(person.get("profile_path"), IMG_PROFILE_URL),
        }
        for person in (credits.get("cast") or [])[:12]
        if person.get("name")
    ]

    result = {
        "id": details.get("id"),
        "title": details.get("title") or details.get("name") or "Untitled",
        "tagline": details.get("tagline") or "",
        "overview": details.get("overview") or "",
        "releaseDate": details.get("release_date") or "",
        "runtime": details.get("runtime") or 0,
        "voteAverage": round(details.get("vote_average") or 0, 1),
        "genres": [g.get("name") for g in details.get("genres") or [] if g.get("name")],
        "posterUrl": image_url(details.get("poster_path")),
        "backdropUrl": image_url(details.get("backdrop_path"), IMG_BACKDROP_URL),
        "trailer": pick_trailer(details.get("videos")),
        "cast": cast,
        "crew": group_crew(credits.get("crew")),
    }

    MOVIE_DETAIL_CACHE[cache_key] = (now, result)
    return result


# -----------------------------
# SEO: robots.txt + sitemap.xml
# -----------------------------

def build_robots():
    """Allow all crawlers and point them at the sitemap."""
    return (
        "User-agent: *\n"
        "Allow: /\n\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )


def _xml_escape(value):
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def build_sitemap():
    """Generate a sitemap with the homepage + every current catalog movie URL."""
    urls = [SITE_URL + "/"]
    try:
        # Use the broadest default window so the sitemap covers the full catalog.
        data = get_filtered_movies("US", "en", "", MAX_DAYS_AHEAD)
        for movie in data["filtered"]:
            movie_id = movie.get("id")
            if movie_id:
                urls.append(f"{SITE_URL}/movie?id={movie_id}")
    except requests.RequestException:
        # If TMDb is unreachable, still return a valid sitemap with the homepage.
        pass

    body = "".join(
        "<url><loc>" + _xml_escape(url) + "</loc></url>" for url in urls
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + body +
        "</urlset>\n"
    )


# -----------------------------
# SEO: server-rendered <head> meta for movie pages
# -----------------------------
# Social scrapers (WhatsApp, Discord, Facebook, X, LinkedIn) and many crawlers do
# not run JavaScript, so movie meta tags must be present in the initial HTML.

HOME_DESCRIPTION = (
    "Discover upcoming movies worldwide, including release dates, trailers, cast "
    "information, and the most anticipated films coming soon to theaters."
)


def _attr(value):
    """Escape a string for safe use inside an HTML attribute value."""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _meta_tags(title, description, url, image, og_type, json_ld=None):
    """Assemble the shared <title> + description + OG + Twitter + JSON-LD block."""
    parts = [
        f"<title>{_attr(title)}</title>",
        f'<meta name="description" content="{_attr(description)}">',
        f'<link rel="canonical" href="{_attr(url)}">',
        '<meta property="og:site_name" content="Movie Horizon">',
        f'<meta property="og:type" content="{_attr(og_type)}">',
        f'<meta property="og:title" content="{_attr(title)}">',
        f'<meta property="og:description" content="{_attr(description)}">',
        f'<meta property="og:url" content="{_attr(url)}">',
        f'<meta property="og:image" content="{_attr(image)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{_attr(title)}">',
        f'<meta name="twitter:description" content="{_attr(description)}">',
        f'<meta name="twitter:image" content="{_attr(image)}">',
    ]
    if json_ld is not None:
        parts.append(
            '<script type="application/ld+json">'
            + json.dumps(json_ld, ensure_ascii=False)
            + "</script>"
        )
    return "\n    ".join(parts)


def build_movie_meta(movie):
    """Server-rendered head meta + Movie JSON-LD for a single movie."""
    movie_id = movie.get("id")
    title = movie.get("title") or "Movie"
    full_title = f"{title} | Movie Horizon"
    overview = (movie.get("overview") or "").strip()
    description = overview
    if len(description) > 300:
        description = description[:299].rstrip() + "…"
    if not description:
        description = f"Release details, trailer, and cast for {title} on Movie Horizon."
    image = (
        movie.get("backdropUrl")
        or movie.get("posterUrl")
        or f"{SITE_URL}/static/og-image.svg"
    )
    url = f"{SITE_URL}/movie?id={movie_id}"

    json_ld = {
        "@context": "https://schema.org",
        "@type": "Movie",
        "name": title,
        "url": url,
    }
    if overview:
        json_ld["description"] = overview
    if image:
        json_ld["image"] = image
    if movie.get("releaseDate"):
        json_ld["datePublished"] = movie["releaseDate"]
    if movie.get("genres"):
        json_ld["genre"] = movie["genres"]
    runtime = movie.get("runtime") or 0
    if runtime:
        hours, minutes = divmod(runtime, 60)
        json_ld["duration"] = "PT" + (f"{hours}H" if hours else "") + (f"{minutes}M" if minutes else "")
    if movie.get("cast"):
        json_ld["actor"] = [
            {"@type": "Person", "name": p["name"]}
            for p in movie["cast"][:10] if p.get("name")
        ]
    for group in movie.get("crew") or []:
        if group.get("role") == "Director" and group.get("names"):
            json_ld["director"] = [
                {"@type": "Person", "name": n} for n in group["names"]
            ]
            break

    return _meta_tags(full_title, description, url, image, "video.movie", json_ld)


def build_default_movie_meta():
    """Fallback meta for the movie page when no/invalid id is supplied."""
    return _meta_tags(
        "Movie Horizon | Discover Upcoming Movies Worldwide",
        HOME_DESCRIPTION,
        SITE_URL + "/",
        SITE_URL + "/static/og-image.svg",
        "website",
    )


def render_movie_page(query):
    """Read movie.html and inject server-rendered SEO meta into the <head>."""
    template = (BASE_DIR / "movie.html").read_text(encoding="utf-8")
    raw_id = (query.get("id", [""])[0] or "").strip()
    site_language = query.get("siteLanguage", query.get("lang", ["en"]))[0] or "en"

    meta = None
    if raw_id.isdigit():
        try:
            movie = fetch_movie_detail(int(raw_id), site_language)
            meta = build_movie_meta(movie)
        except requests.RequestException:
            meta = None
    if meta is None:
        meta = build_default_movie_meta()

    return template.replace("<!-- SEO_META -->", meta)


# -----------------------------
# HTTP request handling
# -----------------------------

class AppHandler(BaseHTTPRequestHandler):
    server_version = "UpcomingMovies/1.0"

    # --- response helpers ---

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, text, content_type, status=200):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_static(self, relative_path):
        """Serve a whitelisted static file, guarding against path traversal."""
        # index.html and movie.html live at the project root; everything else
        # is served from the static/ directory.
        if relative_path in ("index.html", "movie.html"):
            file_path = (BASE_DIR / relative_path).resolve()
            allowed_root = BASE_DIR.resolve()
        else:
            file_path = (STATIC_DIR / relative_path).resolve()
            allowed_root = STATIC_DIR.resolve()

        # Prevent escaping the allowed directory (e.g. ../../etc/passwd).
        if allowed_root not in file_path.parents and file_path != allowed_root:
            self.send_error(403, "Forbidden")
            return
        if not file_path.is_file():
            self.send_error(404, "Not found")
            return

        content_type = CONTENT_TYPES.get(file_path.suffix, "application/octet-stream")
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # --- routing ---

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        try:
            if path in ("/", "/index.html"):
                self.send_static("index.html")
            elif path in ("/movie", "/movie.html"):
                # /movie is the canonical, extension-less detail URL. Meta tags are
                # rendered server-side so social scrapers (no JS) get rich previews.
                self.send_text(render_movie_page(query), "text/html; charset=utf-8")
            elif path == "/robots.txt":
                self.send_text(build_robots(), "text/plain; charset=utf-8")
            elif path == "/sitemap.xml":
                self.send_text(build_sitemap(), "application/xml; charset=utf-8")
            elif path.startswith("/static/"):
                self.send_static(path[len("/static/"):])
            elif path == "/api/upcoming-movies":
                self.handle_upcoming(query)
            elif path.startswith("/api/movie/"):
                self.handle_movie_detail(path[len("/api/movie/"):], query)
            else:
                self.send_error(404, "Not found")
        except requests.RequestException as error:
            # Any TMDb / network failure becomes a clean 502 for the frontend.
            self.send_json({"error": "Upstream TMDb request failed."}, status=502)
            print(f"  ! TMDb request failed: {error}")

    def handle_upcoming(self, query):
        region = (query.get("region", ["US"])[0] or "US").upper()
        site_language = query.get("siteLanguage", ["en"])[0] or "en"
        original_language = query.get("originalLanguage", [""])[0] or ""
        days_ahead = clamp_days_ahead(query.get("daysAhead", ["60"])[0])
        sort_by = query.get("sortBy", ["release"])[0]
        sort_order = query.get("sortOrder", ["asc"])[0]

        if original_language in ("any", "all"):
            original_language = ""
        if sort_by not in ("release", "popularity"):
            sort_by = "release"
        if sort_order not in ("asc", "desc"):
            sort_order = "asc"

        result = fetch_upcoming(
            region, site_language, original_language, days_ahead, sort_by, sort_order
        )

        meta = result["meta"]
        source = "CACHE_HIT" if meta["cacheHit"] else "TMDB_FETCH"
        print(
            "[upcoming] "
            f"{source} "
            f"region={meta['region']} "
            f"originalLanguage={meta['originalLanguage']} "
            f"siteLanguage={meta['siteLanguage']} "
            f"daysAhead={meta['daysAhead']} "
            f"pages={meta['pagesFetched']} "
            f"fetchMs={meta['fetchMs']} "
            f"before={meta['rawCount']} after={meta['filteredCount']} "
            f"returned={meta['returnedCount']}",
            flush=True,
        )

        self.send_json(result)

    def handle_movie_detail(self, raw_id, query):
        try:
            movie_id = int(raw_id.strip("/"))
        except ValueError:
            self.send_error(400, "Invalid movie id")
            return

        site_language = query.get("siteLanguage", ["en"])[0] or "en"
        detail = fetch_movie_detail(movie_id, site_language)
        print(f"[movie] id={movie_id} siteLanguage={site_language} title={detail['title']!r}")
        self.send_json(detail)

    def log_message(self, format, *args):
        # Keep the default access log concise.
        print(f"  {self.address_string()} - {format % args}")


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), AppHandler)
    print(f"Upcoming Movies server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
