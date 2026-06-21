"""Small, framework-free backend for the Upcoming Movies site.

It serves the static frontend and exposes a tiny JSON API that proxies TMDb.
The TMDB API key is read from the environment and never sent to the browser:
the frontend only ever talks to our own /api/* endpoints.

Endpoints
---------
GET /api/upcoming-movies
    Query params: mode, region, siteLanguage, originalLanguage, genre, daysAhead,
    sortBy (release|popularity), sortOrder (asc|desc).
    Returns the filtered + sorted movie list plus some meta counts.

GET /api/genres
    Query params: siteLanguage.
    Returns TMDB movie genres localized for the site language.

GET /api/movie/<id>
    Query params: siteLanguage.
    Returns the details needed by the detail page: title, poster, release
    date, overview, trailer, cast, and grouped crew.

POST /api/recommend
    JSON body: message, siteLanguage, region, daysAhead, movies (combined catalog snapshot).
    Calls OpenAI server-side and returns validated recommendations.

POST /api/recommend/stream
    Same request body as /api/recommend. Streams the summary narrative via SSE,
    then sends validated recommendations in a final done event.
"""

import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"

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
THEATRICAL_RELEASE_TYPE_IDS = {2, 3}

# Map the two site languages to TMDb language codes.
SITE_LANGUAGE_MAP = {"en": "en-US", "pt": "pt-BR"}

# Filtering thresholds (kept from the original project).
MIN_POPULARITY = 2
MIN_OVERVIEW_LENGTH = 30
MAX_MOVIES = 100

# AI recommendation prompt limits.
MAX_AI_CANDIDATES = 50
MAX_AI_METADATA_FETCH = 20
MAX_OVERVIEW_FOR_AI = 80
MAX_CAST_FOR_AI = 4
MAX_CREW_NAMES_PER_ROLE = 3
MAX_RECOMMEND_REASON = 160
MAX_RECOMMEND_SUMMARY = 2500
MAX_RECOMMEND_COUNT = 5
MAX_RECOMMEND_MESSAGE = 2000
MAX_RECOMMEND_BODY_BYTES = 512_000

# How many discover pages to pull at most (each page ~20 movies). Caps latency.
MAX_PAGES = 15

# In-memory cache for movie list endpoints, keyed by mode + filters.
MOVIES_LIST_CACHE = {}
# Per-movie detail cache, keyed by (movie_id, tmdb_language, region).
MOVIE_DETAIL_CACHE = {}
# Release-dates payloads are region-agnostic; cache by movie id.
RELEASE_DATES_CACHE = {}
# Original premiere date from /movie/{id} release_date.
MOVIE_ORIGINAL_RELEASE_CACHE = {}
# Combined original + release_dates for now-playing slow-path checks.
MOVIE_NOW_PLAYING_META_CACHE = {}
AI_MOVIE_CREDITS_CACHE = {}
CACHE_TTL_SECONDS = 15 * 60  # 15 minutes (within the 10–30 min target)

# Valid browsing modes for the catalog API.
MODE_UPCOMING = "upcoming"
MODE_NOW_PLAYING = "nowPlaying"
VALID_MODES = {MODE_UPCOMING, MODE_NOW_PLAYING}

# Date window bounds requested by the product spec.
MIN_DAYS_AHEAD = 1
MAX_DAYS_AHEAD = 365  # up to 1 year
NOW_PLAYING_MAX_AGE_DAYS = 60  # exclude old re-releases beyond this window
NOW_PLAYING_MAX_ORIGINAL_AGE_YEARS = 2  # original premiere must be within this many years

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


def get_genre_list(site_language):
    """Return sorted [{id, name}, ...] for the genre filter dropdown."""
    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")
    genre_map = get_genre_map(tmdb_language)
    return sorted(
        [{"id": gid, "name": name} for gid, name in genre_map.items()],
        key=lambda item: item["name"].lower(),
    )


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


def normalize_mode(raw_value):
    """Return a supported catalog mode (defaults to upcoming)."""
    mode = (raw_value or MODE_UPCOMING).strip()
    return mode if mode in VALID_MODES else MODE_UPCOMING


def parse_genre_id(raw_value):
    """Parse a TMDB genre id from the query string (None = any genre)."""
    if raw_value in (None, "", "any", "all"):
        return None
    try:
        genre_id = int(raw_value)
    except (TypeError, ValueError):
        return None
    return genre_id if genre_id > 0 else None


def get_movies_list(mode, region, site_language, original_language, days_ahead,
                    genre_id=None):
    """Return the deduped + filtered movie list for the given mode and filters.

    Results are cached for CACHE_TTL_SECONDS. Sorting/search are applied later.
    """
    mode = normalize_mode(mode)
    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")
    days_key = days_ahead if mode == MODE_UPCOMING else 0
    cache_key = (mode, region, tmdb_language, original_language, days_key, genre_id or 0)

    now = time.time()
    cached = MOVIES_LIST_CACHE.get(cache_key)
    if cached and (now - cached["createdAt"]) < CACHE_TTL_SECONDS:
        cached["cacheHit"] = True
        cached["pagesFetched"] = 0
        cached["fetchMs"] = 0
        return cached

    if mode == MODE_NOW_PLAYING:
        entry = _fetch_now_playing_list(
            region, tmdb_language, original_language, genre_id, now
        )
    else:
        entry = _fetch_upcoming_list(
            region, tmdb_language, original_language, days_ahead, genre_id, now
        )

    MOVIES_LIST_CACHE[cache_key] = entry
    return entry


def _fetch_upcoming_list(region, tmdb_language, original_language, days_ahead,
                         genre_id, now):
    """Upcoming mode: theatrical releases from today through today + daysAhead."""
    today = date.today()
    window_end = today + timedelta(days=days_ahead)

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
        if genre_id:
            discover_params["with_genres"] = str(genre_id)

        data = tmdb_get("/discover/movie", **discover_params)
        results = data.get("results", [])
        raw_movies.extend(results)
        pages_fetched += 1

        if page >= data.get("total_pages", page):
            break
        if results and (results[-1].get("popularity") or 0) < MIN_POPULARITY:
            break
        if len(raw_movies) >= MAX_MOVIES * 2:
            break

    fetch_ms = int((time.time() - started) * 1000)
    raw_count = len(raw_movies)
    unique_movies = list({m["id"]: m for m in raw_movies}.values())

    filtered = []
    for movie in unique_movies:
        try:
            release = datetime.strptime(movie.get("release_date", ""), "%Y-%m-%d").date()
        except ValueError:
            continue
        if today <= release <= window_end and passes_filters(movie):
            filtered.append(movie)

    return {
        "mode": MODE_UPCOMING,
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


def _fetch_now_playing_list(region, tmdb_language, original_language, genre_id, now):
    """Now in Theaters: region-specific movies in theaters within the last 60 days."""
    today = date.today()
    window_start = today - timedelta(days=NOW_PLAYING_MAX_AGE_DAYS)
    started = time.time()
    raw_movies = []
    pages_fetched = 0

    for page in range(1, MAX_PAGES + 1):
        data = tmdb_get(
            "/movie/now_playing",
            region=region,
            language=tmdb_language,
            page=page,
        )
        results = data.get("results", [])
        raw_movies.extend(results)
        pages_fetched += 1

        if page >= data.get("total_pages", page):
            break
        if len(raw_movies) >= MAX_MOVIES * 2:
            break

    fetch_ms = int((time.time() - started) * 1000)
    raw_count = len(raw_movies)
    unique_movies = list({m["id"]: m for m in raw_movies}.values())

    candidates = []
    for movie in unique_movies:
        if original_language and movie.get("original_language") != original_language:
            continue
        if genre_id and genre_id not in (movie.get("genre_ids") or []):
            continue
        if not passes_filters(movie):
            continue
        candidates.append(movie)

    filtered = []
    slow_movies = []
    cutoff = original_release_cutoff(today)

    for movie in candidates:
        list_release = _parse_list_release(movie)
        if (
            list_release
            and window_start <= list_release <= today
            and list_release >= cutoff
        ):
            title = movie.get("title") or movie.get("name") or "Untitled"
            regional = list_release.isoformat()
            log_now_playing_decision(
                title, regional, regional, True, "quick_path"
            )
            updated = dict(movie)
            updated["release_date"] = regional
            filtered.append(updated)
        else:
            slow_movies.append(movie)

    if slow_movies:
        def _evaluate_slow(movie):
            try:
                return _evaluate_now_playing_slow(
                    movie, region, today, window_start
                )
            except requests.RequestException as error:
                title = movie.get("title") or movie.get("name") or "Untitled"
                log_now_playing_decision(
                    title, None, None, False, f"tmdb_error={error}"
                )
                return None

        with ThreadPoolExecutor(max_workers=8) as pool:
            for kept in pool.map(_evaluate_slow, slow_movies):
                if kept:
                    filtered.append(kept)

    return {
        "mode": MODE_NOW_PLAYING,
        "filtered": filtered,
        "tmdbLanguage": tmdb_language,
        "windowStart": window_start.isoformat(),
        "windowEnd": today.isoformat(),
        "rawCount": raw_count,
        "dedupedCount": len(unique_movies),
        "filteredCount": len(filtered),
        "createdAt": now,
        "cacheHit": False,
        "pagesFetched": pages_fetched,
        "fetchMs": fetch_ms,
    }


def fetch_upcoming(mode, region, site_language, original_language, days_ahead,
                   genre_id, sort_by, sort_order):
    """Sort + trim the (cached) filtered list into the API response shape."""
    mode = normalize_mode(mode)
    data = get_movies_list(
        mode, region, site_language, original_language, days_ahead, genre_id
    )

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
            "genreIds": list(m.get("genre_ids") or []),
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
            "mode": mode,
            "region": region,
            "siteLanguage": site_language,
            "originalLanguage": original_language or "any",
            "genre": genre_id or "any",
            "availableGenres": get_genre_list(site_language),
            "daysAhead": days_ahead if mode == MODE_UPCOMING else None,
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


def pick_regional_release_date(release_dates_payload, region, global_fallback):
    """Pick the earliest theatrical release date for a region (types 2/3).

    Matches the discover/upcoming list, which filters by region + theatrical types.
    Falls back to the movie's global release_date when no regional theatrical date exists.
    Returns (iso_date, used_fallback).
    """
    region = (region or "US").upper()
    candidates = []

    for entry in (release_dates_payload or {}).get("results") or []:
        if (entry.get("iso_3166_1") or "").upper() != region:
            continue
        for rd in entry.get("release_dates") or []:
            if rd.get("type") not in THEATRICAL_RELEASE_TYPE_IDS:
                continue
            raw = rd.get("release_date") or ""
            if not raw:
                continue
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
                candidates.append(parsed)
            except ValueError:
                continue

    if candidates:
        return min(candidates).isoformat(), False

    fallback = (global_fallback or "").strip()
    return fallback, True


def fetch_release_dates(movie_id):
    """Fetch (and cache) the /release_dates payload for a movie."""
    now = time.time()
    cached = RELEASE_DATES_CACHE.get(movie_id)
    if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]
    meta_cached = MOVIE_NOW_PLAYING_META_CACHE.get(movie_id)
    if meta_cached and (now - meta_cached[0]) < CACHE_TTL_SECONDS:
        return meta_cached[1]["release_dates"]
    return fetch_movie_now_playing_meta(movie_id)["release_dates"]


def fetch_movie_original_release(movie_id):
    """Return the movie's original release_date from /movie/{id}."""
    return fetch_movie_now_playing_meta(movie_id)["original"]


def fetch_movie_now_playing_meta(movie_id):
    """Fetch original release_date + release_dates in one TMDB call (cached)."""
    now = time.time()
    cached = MOVIE_NOW_PLAYING_META_CACHE.get(movie_id)
    if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    orig_cached = MOVIE_ORIGINAL_RELEASE_CACHE.get(movie_id)
    rd_cached = RELEASE_DATES_CACHE.get(movie_id)
    if (
        orig_cached
        and rd_cached
        and (now - orig_cached[0]) < CACHE_TTL_SECONDS
        and (now - rd_cached[0]) < CACHE_TTL_SECONDS
    ):
        meta = {"original": orig_cached[1], "release_dates": rd_cached[1]}
        MOVIE_NOW_PLAYING_META_CACHE[movie_id] = (now, meta)
        return meta

    data = tmdb_get(f"/movie/{movie_id}", append_to_response="release_dates")
    original = (data.get("release_date") or "").strip()
    release_dates = data.get("release_dates") or {}
    meta = {"original": original, "release_dates": release_dates}
    MOVIE_NOW_PLAYING_META_CACHE[movie_id] = (now, meta)
    MOVIE_ORIGINAL_RELEASE_CACHE[movie_id] = (now, original)
    RELEASE_DATES_CACHE[movie_id] = (now, release_dates)
    return meta


def _parse_list_release(movie):
    raw = movie.get("release_date") or ""
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def _evaluate_now_playing_slow(movie, region, today, window_start):
    """Full original + regional validation for re-releases and edge cases."""
    title = movie.get("title") or movie.get("name") or "Untitled"
    meta = fetch_movie_now_playing_meta(movie["id"])
    original = meta["original"]

    if not passes_contemporary_original(original, today):
        log_now_playing_decision(
            title, original, None, False, "original_release_older_than_2y"
        )
        return None

    list_release = _parse_list_release(movie)
    if list_release and window_start <= list_release <= today:
        regional = list_release.isoformat()
    else:
        regional, _ = pick_current_theater_release(
            meta["release_dates"],
            region,
            movie.get("release_date") or "",
            today=today,
        )

    if not regional:
        log_now_playing_decision(
            title, original, None, False, "no_regional_theatrical_in_window"
        )
        return None

    log_now_playing_decision(title, original, regional, True)
    updated = dict(movie)
    updated["release_date"] = regional
    return updated


def original_release_cutoff(today=None):
    """Earliest original release date still considered contemporary."""
    today = today or date.today()
    try:
        return today.replace(year=today.year - NOW_PLAYING_MAX_ORIGINAL_AGE_YEARS)
    except ValueError:
        return today.replace(
            year=today.year - NOW_PLAYING_MAX_ORIGINAL_AGE_YEARS, month=2, day=28
        )


def passes_contemporary_original(release_iso, today=None):
    """True when the original premiere is within the last two years."""
    if not release_iso:
        return False
    try:
        parsed = datetime.strptime(release_iso, "%Y-%m-%d").date()
    except ValueError:
        return False
    return parsed >= original_release_cutoff(today)


def log_now_playing_decision(title, original_release, regional_theatrical, keep, reason=""):
    decision = "KEEP" if keep else "EXCLUDE"
    suffix = f" reason={reason}" if reason else ""
    print(
        f"[nowPlaying] {decision} title={title!r} "
        f"originalRelease={original_release or 'n/a'} "
        f"regionalTheatrical={regional_theatrical or 'n/a'}{suffix}",
        flush=True,
    )


def pick_current_theater_release(
    release_dates_payload, region, global_fallback, today=None, max_age_days=None
):
    """Most recent regional theatrical release within the last max_age_days.

    Used for Now in Theaters so re-releases count from their current run, not
    the original premiere decades ago. Returns (iso_date_or_none, used_fallback).
    """
    today = today or date.today()
    max_age_days = max_age_days if max_age_days is not None else NOW_PLAYING_MAX_AGE_DAYS
    window_start = today - timedelta(days=max_age_days)
    region = (region or "US").upper()
    candidates = []

    for entry in (release_dates_payload or {}).get("results") or []:
        if (entry.get("iso_3166_1") or "").upper() != region:
            continue
        for rd in entry.get("release_dates") or []:
            if rd.get("type") not in THEATRICAL_RELEASE_TYPE_IDS:
                continue
            raw = rd.get("release_date") or ""
            if not raw:
                continue
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
            except ValueError:
                continue
            if window_start <= parsed <= today:
                candidates.append(parsed)

    if candidates:
        return max(candidates).isoformat(), False

    fallback = (global_fallback or "").strip()
    if fallback:
        try:
            parsed = datetime.strptime(fallback, "%Y-%m-%d").date()
            if window_start <= parsed <= today:
                return fallback, True
        except ValueError:
            pass
    return None, True


def pick_theater_since_date(release_dates_payload, region, global_fallback, today=None):
    """Earliest past theatrical release in a region (types 2/3) — when it entered theaters."""
    today = today or date.today()
    region = (region or "US").upper()
    candidates = []

    for entry in (release_dates_payload or {}).get("results") or []:
        if (entry.get("iso_3166_1") or "").upper() != region:
            continue
        for rd in entry.get("release_dates") or []:
            if rd.get("type") not in THEATRICAL_RELEASE_TYPE_IDS:
                continue
            raw = rd.get("release_date") or ""
            if not raw:
                continue
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
            except ValueError:
                continue
            if parsed <= today:
                candidates.append(parsed)

    if candidates:
        return min(candidates).isoformat(), False

    fallback = (global_fallback or "").strip()
    if fallback:
        try:
            parsed = datetime.strptime(fallback, "%Y-%m-%d").date()
            if parsed <= today:
                return fallback, True
        except ValueError:
            pass
    return fallback, True


def fetch_movie_detail(movie_id, site_language, region="US"):
    """Fetch and trim a single movie's details, credits, and videos (cached)."""
    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")
    region = (region or "US").upper()

    cache_key = (movie_id, tmdb_language, region)
    now = time.time()
    cached = MOVIE_DETAIL_CACHE.get(cache_key)
    if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    details = tmdb_get(
        f"/movie/{movie_id}",
        language=tmdb_language,
        append_to_response="credits,videos,release_dates",
    )

    global_release = details.get("release_date") or ""
    regional_release, used_fallback = pick_regional_release_date(
        details.get("release_dates"), region, global_release
    )
    theater_since, since_fallback = pick_current_theater_release(
        details.get("release_dates"), region, global_release
    )
    release_date = regional_release or global_release

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
        "releaseDate": release_date,
        "theaterSinceDate": theater_since or release_date,
        "releaseDateMeta": {
            "region": region,
            "detailReleaseDate": release_date,
            "theaterSinceDate": theater_since or release_date,
            "globalReleaseDate": global_release,
            "usedFallback": used_fallback,
            "sinceFallback": since_fallback,
        },
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
        data = get_movies_list(MODE_UPCOMING, "US", "en", "", MAX_DAYS_AHEAD)
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
    region = (query.get("region", ["US"])[0] or "US").upper()

    meta = None
    if raw_id.isdigit():
        try:
            movie = fetch_movie_detail(int(raw_id), site_language, region)
            meta = build_movie_meta(movie)
        except requests.RequestException:
            meta = None
    if meta is None:
        meta = build_default_movie_meta()

    return template.replace("<!-- SEO_META -->", meta)


# -----------------------------
# AI movie recommendations
# -----------------------------

RECOMMEND_SYSTEM_PROMPT = """You are Movie Horizon's movie curator — warm, knowledgeable, and precise.

Rules:
- Recommend ONLY movies from the catalog JSON. Each id MUST be copied exactly from the catalog.
- The catalog combines movies currently in theaters (availability: nowPlaying) and upcoming releases (availability: upcoming). Recommend whichever best fits the request — already playing or arriving soon.
- Use title, overview, genres, releaseDate, availability, popularity, and directors when judging fit.
- Prioritize RELEVANCE over quantity. Return 0 to 5 recommendations — never pad with weak picks.
- Return 1 movie if only 1 strong match exists. Return 0 if nothing is a strong match.
- Do not stretch similarities or recommend unrelated popular movies to satisfy the user.
- Do not act as a general chatbot.

Write like a premium recommendation assistant talking to the user:
- summary: the FULL conversational explanation (2–5 short paragraphs). Open with what you searched for and how many strong matches you found. Then discuss each recommended movie in order — why it fits, what makes it distinctive, and how it compares to the others. Use natural prose, not bullet labels like "Why it matches". Mention movie titles in the text.
- reason: optional short internal note per movie (may be empty); all user-facing reasoning belongs in summary.

Respond with valid JSON only:
{"summary": "<string>", "recommendations": [{"id": <number>, "title": "<string>", "reason": "<string>"}]}"""

RECOMMEND_RETRY_INSTRUCTION = (
    "Your previous answer used ids not in the catalog or invalid JSON. "
    "Use ONLY these ids: {ids}. Return valid JSON with summary and recommendations "
    "(0–{max_count} items, only genuinely strong matches)."
)

PERSON_QUERY_PATTERNS = (
    re.compile(
        r"(?:filme|movie|film|assistir|watch).*?(?:do|da|de|by|from|with|com|starring)\s+(.+)$",
        re.IGNORECASE,
    ),
    re.compile(r"(?:director|diretor|direção|diretora|ator|atriz|actor|actress|star)\s+(.+)$", re.IGNORECASE),
)

AI_QUERY_STOPWORDS = {
    "a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "em", "no", "na",
    "por", "para", "com", "que", "filme", "film", "movie", "movies", "filmes", "assistir",
    "watch", "ver", "see", "quero", "want", "like", "gosto", "the", "and", "or",
}


def fallback_recommendation_summary(count, site_language):
    """Short summary when the model omits one."""
    pt = site_language == "pt"
    if count == 0:
        return (
            "Não encontrei uma correspondência forte no catálogo atual."
            if pt
            else "I couldn't find a strong match in the current catalog."
        )
    if count == 1:
        return (
            "Analisei o catálogo atual e encontrei 1 filme que combina com o seu pedido."
            if pt
            else "I looked through the current catalog and found 1 movie that matches your request."
        )
    if pt:
        return (
            f"Analisei o catálogo atual e encontrei {count} filmes que combinam com o seu pedido."
        )
    return (
        f"I looked through the current catalog and found {count} movies that match your request."
    )


def extract_ai_summary(ai_payload):
    """Read the model's narrative from common JSON keys."""
    if not isinstance(ai_payload, dict):
        return ""
    for key in ("summary", "explanation", "narrative", "response", "message"):
        value = ai_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def build_recommendation_narrative(summary, recommendations, site_language):
    """Ensure the API always returns a conversational narrative for the UI."""
    summary = (summary or "").strip()
    if len(summary) > MAX_RECOMMEND_SUMMARY:
        summary = summary[: MAX_RECOMMEND_SUMMARY - 1].rstrip() + "…"

    reason_blocks = []
    for rec in recommendations:
        reason = (rec.get("reason") or "").strip()
        title = (rec.get("title") or "").strip()
        if not reason:
            continue
        if title and title.lower() not in reason.lower():
            reason_blocks.append(f"{title} — {reason}")
        else:
            reason_blocks.append(reason)

    if len(summary) >= 120:
        return summary

    count = len(recommendations)
    if not summary:
        summary = fallback_recommendation_summary(count, site_language)

    if reason_blocks:
        return summary + "\n\n" + "\n\n".join(reason_blocks)

    return summary


def read_json_body(handler):
    """Read and parse a JSON request body with a size guard."""
    length = int(handler.headers.get("Content-Length", 0))
    if length <= 0 or length > MAX_RECOMMEND_BODY_BYTES:
        raise ValueError("Invalid request body size.")
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def compact_catalog_entry(movie, ai_metadata=None):
    """Lean movie payload for the AI prompt — title, genres, overview, date, popularity."""
    meta = ai_metadata or {}
    overview = (meta.get("overview") or movie.get("overview") or "").strip()
    if len(overview) > MAX_OVERVIEW_FOR_AI:
        overview = overview[: MAX_OVERVIEW_FOR_AI - 1].rstrip() + "…"

    entry = {
        "id": movie.get("id"),
        "title": movie.get("title") or "Untitled",
        "genres": (meta.get("genres") or movie.get("genres") or [])[:3],
        "releaseDate": movie.get("releaseDate") or "",
        "popularity": round(movie.get("popularity") or 0, 1),
    }
    availability = movie.get("availability")
    if availability in (MODE_NOW_PLAYING, MODE_UPCOMING):
        entry["availability"] = availability
    if overview:
        entry["overview"] = overview

    directors = meta.get("directors") or []
    if directors:
        entry["directors"] = directors[:2]

    return entry


def fetch_movie_ai_metadata(movie_id, site_language):
    """Fetch credits + text fields from TMDb for AI matching (cached)."""
    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")
    cache_key = (movie_id, tmdb_language)
    now = time.time()
    cached = AI_MOVIE_CREDITS_CACHE.get(cache_key)
    if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    try:
        details = tmdb_get(
            f"/movie/{movie_id}",
            language=tmdb_language,
            append_to_response="credits",
        )
    except requests.RequestException:
        return None

    credits = details.get("credits") or {}
    directors = []
    seen_directors = set()
    for person in credits.get("crew") or []:
        if person.get("job") != "Director":
            continue
        name = (person.get("name") or "").strip()
        if name and name not in seen_directors:
            seen_directors.add(name)
            directors.append(name)

    cast = []
    for person in (credits.get("cast") or [])[:MAX_CAST_FOR_AI]:
        name = (person.get("name") or "").strip()
        if name:
            cast.append(name)

    metadata = {
        "overview": details.get("overview") or "",
        "genres": [g.get("name") for g in details.get("genres") or [] if g.get("name")],
        "directors": directors[:2],
        "cast": cast,
    }
    AI_MOVIE_CREDITS_CACHE[cache_key] = (now, metadata)
    return metadata


def enrich_catalog_movies_for_ai(movies, site_language):
    """Load TMDb credits for the selected catalog entries in parallel."""
    enriched = {}
    if not movies:
        return enriched

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(fetch_movie_ai_metadata, int(movie["id"]), site_language): int(movie["id"])
            for movie in movies
            if movie.get("id") is not None
        }
        for future in futures:
            movie_id = futures[future]
            try:
                metadata = future.result()
                if metadata:
                    enriched[movie_id] = metadata
            except Exception:
                continue
    return enriched


def extract_person_search_query(message):
    """Pull a person name from requests like 'filme do Christopher Nolan'."""
    text = (message or "").strip()
    if not text:
        return None
    for pattern in PERSON_QUERY_PATTERNS:
        match = pattern.search(text)
        if match:
            query = match.group(1).strip(" .?!,")
            if len(query) >= 3:
                return query
    return None


def extract_query_terms(message):
    """Tokenize the user message for lightweight title/overview matching."""
    terms = re.findall(r"\w+", (message or "").lower(), flags=re.UNICODE)
    return [term for term in terms if len(term) >= 3 and term not in AI_QUERY_STOPWORDS]


def keyword_relevance_score(movie, terms, ai_metadata=None):
    if not terms:
        return 0
    meta = ai_metadata or {}
    haystack = " ".join([
        movie.get("title") or "",
        meta.get("overview") or movie.get("overview") or "",
        " ".join(meta.get("genres") or movie.get("genres") or []),
        " ".join(meta.get("directors") or []),
        " ".join(meta.get("cast") or []),
    ]).lower()
    return sum(1 for term in terms if term in haystack)


def find_person_catalog_matches(person_query, catalog_by_id, site_language):
    """Map catalog ids to director/cast matches via TMDb person search."""
    if not person_query:
        return {}

    tmdb_language = SITE_LANGUAGE_MAP.get(site_language, "en-US")
    try:
        data = tmdb_get("/search/person", query=person_query, language=tmdb_language)
    except requests.RequestException:
        return {}

    catalog_ids = set(catalog_by_id.keys())
    matches = {}

    for person in data.get("results", [])[:3]:
        person_id = person.get("id")
        name = (person.get("name") or "").strip()
        if not person_id or not name:
            continue
        try:
            credits = tmdb_get(f"/person/{person_id}/movie_credits")
        except requests.RequestException:
            continue

        for credit in credits.get("crew") or []:
            if credit.get("job") != "Director":
                continue
            movie_id = credit.get("id")
            if movie_id not in catalog_ids:
                continue
            slot = matches.setdefault(movie_id, {"directors": [], "cast": []})
            if name not in slot["directors"]:
                slot["directors"].append(name)

        for credit in credits.get("cast") or []:
            movie_id = credit.get("id")
            if movie_id not in catalog_ids:
                continue
            slot = matches.setdefault(movie_id, {"directors": [], "cast": []})
            if name not in slot["cast"]:
                slot["cast"].append(name)

    return matches


def order_movies_for_ai(all_movies, message, person_matches, ai_metadata_by_id=None):
    """Prioritize person matches, keyword hits, then popularity."""
    terms = extract_query_terms(message)
    matched_ids = set(person_matches.keys())
    ai_metadata_by_id = ai_metadata_by_id or {}
    scored = []

    for movie in all_movies:
        try:
            movie_id = int(movie.get("id"))
        except (TypeError, ValueError):
            continue
        meta = ai_metadata_by_id.get(movie_id)
        score = keyword_relevance_score(movie, terms, meta) * 10
        if movie_id in matched_ids:
            score += 1000
        score += movie.get("popularity") or 0
        scored.append((score, movie))

    scored.sort(key=lambda item: item[0], reverse=True)

    ordered = []
    seen = set()
    for movie_id in matched_ids:
        movie = next((item for item in all_movies if item.get("id") == movie_id), None)
        if movie and movie_id not in seen:
            ordered.append(movie)
            seen.add(movie_id)

    for _, movie in scored:
        movie_id = movie.get("id")
        if movie_id in seen:
            continue
        ordered.append(movie)
        seen.add(movie_id)

    return ordered


def build_recommend_candidates(raw_movies, message="", site_language="en"):
    """Normalize catalog entries and pick the most relevant ones for the AI prompt."""
    catalog_by_id = {}
    all_movies = []

    for movie in raw_movies[:MAX_MOVIES]:
        if not isinstance(movie, dict):
            continue
        try:
            movie_id = int(movie.get("id"))
        except (TypeError, ValueError):
            continue
        catalog_by_id[movie_id] = movie
        all_movies.append(movie)

    person_query = extract_person_search_query(message)
    person_matches = find_person_catalog_matches(person_query, catalog_by_id, site_language)
    if not person_matches and person_query and person_query != message:
        person_matches = find_person_catalog_matches(message, catalog_by_id, site_language)

    preselected = order_movies_for_ai(all_movies, message, person_matches)
    selected_movies = preselected[:MAX_AI_CANDIDATES]

    enrich_ids = set(person_matches.keys())
    for movie in selected_movies[:MAX_AI_METADATA_FETCH]:
        enrich_ids.add(int(movie["id"]))
    movies_to_enrich = [
        catalog_by_id[movie_id]
        for movie_id in enrich_ids
        if movie_id in catalog_by_id
    ]
    ai_metadata_by_id = enrich_catalog_movies_for_ai(movies_to_enrich, site_language)
    selected_movies = order_movies_for_ai(
        selected_movies, message, person_matches, ai_metadata_by_id
    )

    candidates = []
    for movie in selected_movies:
        movie_id = int(movie["id"])
        meta = dict(ai_metadata_by_id.get(movie_id) or {})
        person_hit = person_matches.get(movie_id) or {}
        if person_hit.get("directors"):
            merged = list(dict.fromkeys(person_hit["directors"] + (meta.get("directors") or [])))
            meta["directors"] = merged[:2]
        entry = compact_catalog_entry(movie, ai_metadata=meta)
        entry["id"] = movie_id
        candidates.append(entry)

    if person_matches:
        matched = ", ".join(
            f"{catalog_by_id[mid].get('title')} (id {mid})"
            for mid in person_matches
        )
        print(f"[recommend] person_matches={matched}", flush=True)

    return candidates, catalog_by_id


class RecommendRequestError(Exception):
    """User-facing recommendation API failure."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.message = message
        self.status = status


def openai_error_message(status_code, api_message, site_language):
    """Map OpenAI HTTP errors to short messages for the frontend."""
    pt = site_language == "pt"
    if status_code == 429:
        return (
            "Limite da OpenAI atingido. Aguarde um momento e tente novamente, "
            "ou verifique sua cota em platform.openai.com."
            if pt
            else "OpenAI rate limit reached. Wait a moment and try again, "
            "or check your quota at platform.openai.com."
        )
    if status_code == 401:
        return (
            "Chave OpenAI inválida. Verifique OPENAI_API_KEY em .env.local."
            if pt
            else "Invalid OpenAI API key. Check OPENAI_API_KEY in .env.local."
        )
    if status_code in (402, 403):
        return (
            "Acesso OpenAI negado. Verifique cobrança e permissões em platform.openai.com."
            if pt
            else "OpenAI access denied. Check billing and permissions at platform.openai.com."
        )
    if api_message:
        return api_message
    return (
        "Falha ao contactar o serviço de IA. Tente novamente."
        if pt
        else "AI service request failed. Please try again."
    )


def build_recommend_user_prompt(user_message, candidates, site_language, region,
                                  days_ahead, extra_instruction=None):
    """Build the user message sent to OpenAI for recommendations."""
    valid_ids = [entry["id"] for entry in candidates]
    catalog_json = json.dumps(candidates, ensure_ascii=False)
    user_prompt = (
        f"Recommendation scope for region {region}:\n"
        f"- Movies currently in theaters (availability: nowPlaying)\n"
        f"- Upcoming theatrical releases within the next {days_ahead} days "
        f"(availability: upcoming)\n"
        f"Write the summary narrative in: {'Portuguese' if site_language == 'pt' else 'English'}\n"
        f"Valid catalog ids (use ONLY these): {', '.join(str(i) for i in valid_ids)}\n\n"
        f"User preferences:\n{user_message}\n\n"
        f"Catalog:\n{catalog_json}"
    )
    if extra_instruction:
        user_prompt += f"\n\n{extra_instruction}"

    person_lines = []
    for entry in candidates:
        if not entry.get("directors"):
            continue
        person_lines.append(
            f"- id {entry['id']}: {entry['title']} (director: {', '.join(entry['directors'])})"
        )
    if person_lines:
        user_prompt += "\n\nStrong matches for this query:\n" + "\n".join(person_lines[:6])
    return user_prompt


def build_openai_recommend_request(user_message, candidates, site_language, region,
                                   days_ahead, extra_instruction=None, stream=False):
    """Return the JSON body for OpenAI chat completions."""
    request_json = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": RECOMMEND_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_recommend_user_prompt(
                    user_message, candidates, site_language, region, days_ahead,
                    extra_instruction,
                ),
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.45,
        "max_tokens": 1200,
        "stream": stream,
    }
    return request_json


def extract_streaming_summary_partial(raw):
    """Best-effort summary text from a partial JSON object response."""
    key_match = re.search(r'"summary"\s*:\s*"', raw)
    if not key_match:
        return ""
    index = key_match.end()
    chars = []
    while index < len(raw):
        char = raw[index]
        if char == '"':
            break
        if char == "\\":
            if index + 1 >= len(raw):
                break
            nxt = raw[index + 1]
            escape_map = {"n": "\n", "r": "\r", "t": "\t", '"': '"', "\\": "\\"}
            chars.append(escape_map.get(nxt, nxt))
            index += 2
            continue
        chars.append(char)
        index += 1
    return "".join(chars)


def openai_recommend_headers():
    return {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }


def fetch_ai_recommendations(user_message, candidates, site_language, region, days_ahead,
                             extra_instruction=None):
    """Call OpenAI with the compact catalog and return parsed JSON recommendations."""
    request_json = build_openai_recommend_request(
        user_message, candidates, site_language, region, days_ahead,
        extra_instruction, stream=False,
    )
    headers = openai_recommend_headers()

    last_error = None
    openai_started = time.perf_counter()
    for attempt in range(2):
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=request_json,
                timeout=45,
            )
        except requests.RequestException as error:
            last_error = error
            if attempt == 0:
                time.sleep(1)
                continue
            raise RecommendRequestError(
                openai_error_message(0, "", site_language),
                status=502,
            ) from error

        if response.status_code == 429 and attempt == 0:
            time.sleep(2)
            continue

        if not response.ok:
            api_message = ""
            try:
                api_message = response.json().get("error", {}).get("message", "")
            except ValueError:
                pass
            status = 429 if response.status_code == 429 else 502
            raise RecommendRequestError(
                openai_error_message(response.status_code, api_message, site_language),
                status=status,
            )

        content = response.json()["choices"][0]["message"]["content"]
        openai_seconds = time.perf_counter() - openai_started
        return json.loads(content), openai_seconds

    if last_error:
        raise RecommendRequestError(
            openai_error_message(0, "", site_language),
            status=502,
        ) from last_error
    raise RecommendRequestError(
        openai_error_message(429, "", site_language),
        status=429,
    )


def stream_ai_recommendations(user_message, candidates, site_language, region, days_ahead,
                              extra_instruction=None):
    """Stream OpenAI JSON output; yield delta text and the final parsed payload."""
    request_json = build_openai_recommend_request(
        user_message, candidates, site_language, region, days_ahead,
        extra_instruction, stream=True,
    )
    headers = openai_recommend_headers()
    openai_started = time.perf_counter()
    first_chunk_at = None
    content_buffer = ""
    last_preview = ""

    for attempt in range(2):
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=request_json,
                stream=True,
                timeout=60,
            )
        except requests.RequestException as error:
            if attempt == 0:
                time.sleep(1)
                continue
            raise RecommendRequestError(
                openai_error_message(0, "", site_language),
                status=502,
            ) from error

        if response.status_code == 429 and attempt == 0:
            time.sleep(2)
            continue

        if not response.ok:
            api_message = ""
            try:
                api_message = response.json().get("error", {}).get("message", "")
            except ValueError:
                pass
            status = 429 if response.status_code == 429 else 502
            raise RecommendRequestError(
                openai_error_message(response.status_code, api_message, site_language),
                status=status,
            )

        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data_str = line[6:].strip()
            if data_str == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
            except json.JSONDecodeError:
                continue
            delta = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content") or ""
            if not delta:
                continue
            if first_chunk_at is None:
                first_chunk_at = time.perf_counter() - openai_started
            content_buffer += delta
            preview = extract_streaming_summary_partial(content_buffer)
            if len(preview) > len(last_preview):
                new_text = preview[len(last_preview):]
                last_preview = preview
                if new_text:
                    yield ("delta", new_text)

        openai_seconds = time.perf_counter() - openai_started
        first_chunk_seconds = first_chunk_at if first_chunk_at is not None else openai_seconds
        try:
            ai_payload = json.loads(content_buffer)
        except json.JSONDecodeError as error:
            raise RecommendRequestError(
                openai_error_message(0, "", site_language),
                status=502,
            ) from error
        yield ("complete", ai_payload, openai_seconds, first_chunk_seconds)
        return

    raise RecommendRequestError(
        openai_error_message(429, "", site_language),
        status=429,
    )


def finalize_recommendation(message, candidates, catalog_by_id, site_language, region,
                            days_ahead, ai_payload, openai_seconds):
    """Validate, optionally retry, enrich, and return the final recommendation payload."""
    parsed = parse_ai_recommendation_response(ai_payload, catalog_by_id, site_language)

    if parsed["invalid_ids"]:
        valid_ids = [entry["id"] for entry in candidates]
        retry_instruction = RECOMMEND_RETRY_INSTRUCTION.format(
            ids=", ".join(str(i) for i in valid_ids),
            max_count=MAX_RECOMMEND_COUNT,
        )
        print(
            f"[recommend] retry invalid_ids count={len(parsed['recommendations'])} "
            f"catalog={len(candidates)}",
            flush=True,
        )
        ai_payload, openai_seconds = fetch_ai_recommendations(
            message, candidates, site_language, region, days_ahead,
            extra_instruction=retry_instruction,
        )
        parsed = parse_ai_recommendation_response(ai_payload, catalog_by_id, site_language)

    recommendations = enrich_recommendations(parsed["recommendations"], catalog_by_id)
    return {
        "summary": parsed["summary"],
        "recommendations": recommendations,
        "openai_seconds": openai_seconds,
        "returned_count": len(recommendations),
    }


def parse_ai_recommendation_response(ai_payload, catalog_by_id, site_language):
    """Validate AI output: summary plus 0–5 catalog-only recommendations."""
    raw_items = ai_payload.get("recommendations") or []
    if not isinstance(raw_items, list):
        raw_items = []

    valid = []
    seen = set()
    invalid_ids = False
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        try:
            movie_id = int(item.get("id"))
        except (TypeError, ValueError):
            invalid_ids = True
            continue
        if movie_id not in catalog_by_id:
            invalid_ids = True
            continue
        if movie_id in seen:
            continue

        reason = (item.get("reason") or "").strip()
        if len(reason) > MAX_RECOMMEND_REASON:
            reason = reason[: MAX_RECOMMEND_REASON - 1].rstrip() + "…"

        movie = catalog_by_id[movie_id]
        valid.append({
            "id": movie_id,
            "title": movie.get("title") or item.get("title") or "Untitled",
            "reason": reason,
        })
        seen.add(movie_id)
        if len(valid) >= MAX_RECOMMEND_COUNT:
            break

    summary = extract_ai_summary(ai_payload)
    summary = build_recommendation_narrative(summary, valid, site_language)

    return {
        "summary": summary,
        "recommendations": valid,
        "invalid_ids": invalid_ids,
    }


def enrich_recommendations(recommendations, catalog_by_id):
    """Attach card fields from the catalog so the frontend can render links."""
    enriched = []
    for rec in recommendations:
        movie = catalog_by_id.get(rec["id"]) or {}
        enriched.append({
            **rec,
            "posterUrl": movie.get("posterUrl"),
            "backdropUrl": movie.get("backdropUrl"),
            "releaseDate": movie.get("releaseDate"),
            "genres": movie.get("genres") or [],
        })
    return enriched


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

    def send_sse_headers(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

    def send_sse_event(self, event, payload):
        data = json.dumps(payload, ensure_ascii=False)
        message = f"event: {event}\ndata: {data}\n\n"
        self.wfile.write(message.encode("utf-8"))
        self.wfile.flush()

    def read_recommend_request(self):
        """Parse and validate a recommendation request body."""
        body = read_json_body(self)
        message = (body.get("message") or "").strip()
        if not message:
            raise ValueError("Please describe what you are looking for.")
        if len(message) > MAX_RECOMMEND_MESSAGE:
            raise ValueError(
                f"Message is too long (max {MAX_RECOMMEND_MESSAGE} characters)."
            )

        site_language = body.get("siteLanguage") or "en"
        if site_language not in SITE_LANGUAGE_MAP:
            site_language = "en"

        region = (body.get("region") or "US").upper()
        days_ahead = clamp_days_ahead(body.get("daysAhead"))

        raw_movies = body.get("movies")
        if not isinstance(raw_movies, list) or not raw_movies:
            raise ValueError("Catalog is empty. Load movies first.")

        return message, site_language, raw_movies, region, days_ahead

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
            elif path == "/api/genres":
                self.handle_genres(query)
            elif path.startswith("/api/movie/"):
                self.handle_movie_detail(path[len("/api/movie/"):], query)
            else:
                self.send_error(404, "Not found")
        except requests.RequestException as error:
            # Any TMDb / network failure becomes a clean 502 for the frontend.
            self.send_json({"error": "Upstream TMDb request failed."}, status=502)
            print(f"  ! TMDb request failed: {error}")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/recommend", "/api/recommend/stream"):
            self.send_error(404, "Not found")
            return

        try:
            if parsed.path == "/api/recommend/stream":
                self.handle_recommend_stream()
            else:
                self.handle_recommend()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON body."}, status=400)
        except ValueError as error:
            self.send_json({"error": str(error)}, status=400)
        except RecommendRequestError as error:
            if parsed.path == "/api/recommend/stream":
                try:
                    self.send_sse_headers()
                    self.send_sse_event("error", {"error": error.message})
                except (BrokenPipeError, ConnectionResetError):
                    pass
            else:
                self.send_json({"error": error.message}, status=error.status)
            print(f"  ! AI request failed: {error.message}")
        except requests.RequestException as error:
            if parsed.path == "/api/recommend/stream":
                try:
                    self.send_sse_headers()
                    self.send_sse_event("error", {"error": "AI service request failed."})
                except (BrokenPipeError, ConnectionResetError):
                    pass
            else:
                self.send_json({"error": "AI service request failed."}, status=502)
            print(f"  ! AI request failed: {error}")

    def handle_recommend(self):
        if not OPENAI_API_KEY:
            self.send_json(
                {"error": "AI recommendations are not configured."},
                status=503,
            )
            return

        message, site_language, raw_movies, region, days_ahead = self.read_recommend_request()

        total_started = time.perf_counter()
        build_started = time.perf_counter()
        candidates, catalog_by_id = build_recommend_candidates(
            raw_movies, message, site_language
        )
        build_seconds = time.perf_counter() - build_started
        if not candidates:
            self.send_json({"error": "Catalog is empty. Load movies first."}, status=400)
            return

        ai_payload, openai_seconds = fetch_ai_recommendations(
            message, candidates, site_language, region, days_ahead
        )
        result = finalize_recommendation(
            message, candidates, catalog_by_id, site_language, region, days_ahead,
            ai_payload, openai_seconds,
        )
        total_seconds = time.perf_counter() - total_started
        print(
            f"[recommend] catalog={len(candidates)} "
            f"build_time={build_seconds:.1f}s "
            f"openai_time={result['openai_seconds']:.1f}s "
            f"total_time={total_seconds:.1f}s "
            f"returned={result['returned_count']} "
            f"region={region} daysAhead={days_ahead} "
            f"siteLanguage={site_language}",
            flush=True,
        )
        self.send_json({
            "summary": result["summary"],
            "recommendations": result["recommendations"],
        })

    def handle_recommend_stream(self):
        if not OPENAI_API_KEY:
            self.send_json(
                {"error": "AI recommendations are not configured."},
                status=503,
            )
            return

        message, site_language, raw_movies, region, days_ahead = self.read_recommend_request()

        total_started = time.perf_counter()
        build_started = time.perf_counter()
        candidates, catalog_by_id = build_recommend_candidates(
            raw_movies, message, site_language
        )
        build_seconds = time.perf_counter() - build_started
        if not candidates:
            self.send_json({"error": "Catalog is empty. Load movies first."}, status=400)
            return

        self.send_sse_headers()
        self.send_sse_event("status", {
            "phase": "streaming",
            "catalogCount": len(candidates),
        })

        ai_payload = None
        openai_seconds = 0.0
        first_chunk_seconds = None
        for event in stream_ai_recommendations(
            message, candidates, site_language, region, days_ahead
        ):
            if event[0] == "delta":
                self.send_sse_event("delta", {"text": event[1]})
            elif event[0] == "complete":
                ai_payload = event[1]
                openai_seconds = event[2]
                first_chunk_seconds = event[3]

        result = finalize_recommendation(
            message, candidates, catalog_by_id, site_language, region, days_ahead,
            ai_payload, openai_seconds,
        )
        total_seconds = time.perf_counter() - total_started
        first_chunk_label = (
            f"{first_chunk_seconds:.1f}s"
            if first_chunk_seconds is not None
            else "n/a"
        )
        print(
            f"[recommend-stream] catalog={len(candidates)} "
            f"build_time={build_seconds:.1f}s "
            f"first_chunk_time={first_chunk_label} "
            f"openai_time={result['openai_seconds']:.1f}s "
            f"total_time={total_seconds:.1f}s "
            f"returned={result['returned_count']} "
            f"region={region} daysAhead={days_ahead} "
            f"siteLanguage={site_language}",
            flush=True,
        )
        self.send_sse_event("done", {
            "summary": result["summary"],
            "recommendations": result["recommendations"],
        })

    def handle_upcoming(self, query):
        mode = normalize_mode(query.get("mode", [MODE_UPCOMING])[0])
        region = (query.get("region", ["US"])[0] or "US").upper()
        site_language = query.get("siteLanguage", ["en"])[0] or "en"
        original_language = query.get("originalLanguage", [""])[0] or ""
        days_ahead = clamp_days_ahead(query.get("daysAhead", ["60"])[0])
        genre_id = parse_genre_id(query.get("genre", [""])[0])
        sort_by = query.get("sortBy", ["release"])[0]
        sort_order = query.get("sortOrder", ["asc"])[0]

        if original_language in ("any", "all"):
            original_language = ""
        if sort_by not in ("release", "popularity"):
            sort_by = "release"
        if sort_order not in ("asc", "desc"):
            sort_order = "asc"

        result = fetch_upcoming(
            mode, region, site_language, original_language, days_ahead,
            genre_id, sort_by, sort_order
        )

        meta = result["meta"]
        source = "CACHE_HIT" if meta["cacheHit"] else "TMDB_FETCH"
        print(
            f"[{mode}] "
            f"{source} "
            f"region={meta['region']} "
            f"originalLanguage={meta['originalLanguage']} "
            f"genre={meta.get('genre')} "
            f"siteLanguage={meta['siteLanguage']} "
            f"daysAhead={meta.get('daysAhead')} "
            f"pages={meta['pagesFetched']} "
            f"fetchMs={meta['fetchMs']} "
            f"before={meta['rawCount']} after={meta['filteredCount']} "
            f"returned={meta['returnedCount']}",
            flush=True,
        )

        self.send_json(result)

    def handle_genres(self, query):
        site_language = query.get("siteLanguage", ["en"])[0] or "en"
        self.send_json({"genres": get_genre_list(site_language)})

    def handle_movie_detail(self, raw_id, query):
        try:
            movie_id = int(raw_id.strip("/"))
        except ValueError:
            self.send_error(400, "Invalid movie id")
            return

        site_language = query.get("siteLanguage", ["en"])[0] or "en"
        region = (query.get("region", ["US"])[0] or "US").upper()
        list_release_date = (query.get("listReleaseDate", [""])[0] or "").strip()

        detail = fetch_movie_detail(movie_id, site_language, region)
        if list_release_date:
            detail["releaseDateMeta"]["listReleaseDate"] = list_release_date

        meta = detail.get("releaseDateMeta") or {}
        print(
            "[release-date] "
            f"id={movie_id} "
            f"region={region} "
            f"list={meta.get('listReleaseDate') or list_release_date or 'n/a'} "
            f"detail={meta.get('detailReleaseDate', detail['releaseDate'])} "
            f"fallback={meta.get('usedFallback', False)}",
            flush=True,
        )
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
