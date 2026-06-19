// Detail page logic: read ?id= from the URL, fetch /api/movie/<id>, render.

(function () {
    "use strict";

    const I18N = {
        en: {
            back: "Back to results",
            inTheaters: "In theaters",
            trailer: "Trailer",
            watchTrailer: "Watch Trailer",
            cast: "Cast",
            crew: "Crew",
            noTrailer: "No trailer available yet.",
            noCast: "Cast information is not available yet.",
            noCrew: "Crew information is not available yet.",
            noPoster: "Poster not available",
            unknownRole: "Unknown role",
            loading: "Loading movie…",
            error: "Could not load this movie. Please try again.",
            footer: "Data from The Movie Database (TMDb).",
            runtime: "Runtime",
            release: "Release",
            roles: {
                Director: "Director",
                Writers: "Writers",
                Producers: "Producers",
                Music: "Music",
                Cinematography: "Cinematography",
            },
        },
        pt: {
            back: "Voltar aos resultados",
            inTheaters: "Nos cinemas em",
            trailer: "Trailer",
            watchTrailer: "Assistir trailer",
            cast: "Elenco",
            crew: "Equipe",
            noTrailer: "Trailer ainda não disponível.",
            noCast: "Informações de elenco ainda não disponíveis.",
            noCrew: "Informações da equipe ainda não disponíveis.",
            noPoster: "Pôster indisponível",
            unknownRole: "Papel desconhecido",
            loading: "Carregando filme…",
            error: "Não foi possível carregar este filme. Tente novamente.",
            footer: "Dados do The Movie Database (TMDb).",
            runtime: "Duração",
            release: "Estreia",
            roles: {
                Director: "Direção",
                Writers: "Roteiro",
                Producers: "Produção",
                Music: "Trilha sonora",
                Cinematography: "Fotografia",
            },
        },
    };

    const params = new URLSearchParams(window.location.search);
    const movieId = params.get("id");
    // Accept the new siteLanguage param, with a fallback to the older lang param.
    const siteLanguage = params.get("siteLanguage") || params.get("lang") || "en";
    const lang = siteLanguage === "pt" ? "pt" : "en";
    const dict = I18N[lang];

    const contentEl = document.getElementById("content");
    const statusEl = document.getElementById("status");

    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.getElementById("back-text").textContent = dict.back;
    document.getElementById("footer-text").textContent = dict.footer;

    // Build the "Back to results" link by reusing every filter param except id,
    // so the homepage reopens with the same region/language/date/sort context.
    const backParams = new URLSearchParams(window.location.search);
    backParams.delete("id");
    const backQuery = backParams.toString();
    document.getElementById("back-link").setAttribute(
        "href", "index.html" + (backQuery ? "?" + backQuery : "")
    );

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatReleaseDate(iso) {
        if (!iso) return "";
        const parsed = new Date(iso + "T00:00:00");
        if (isNaN(parsed)) return iso;
        const locale = lang === "pt" ? "pt-BR" : "en-US";
        return parsed.toLocaleDateString(locale, {
            year: "numeric", month: "short", day: "numeric",
        });
    }

    function formatRuntime(minutes) {
        if (!minutes) return "";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h && m) return h + "h " + m + "m";
        if (h) return h + "h";
        return m + "m";
    }

    function initials(name) {
        const parts = (name || "").split(" ").filter(Boolean);
        return parts.slice(0, 2).map(function (p) { return p[0].toUpperCase(); }).join("") || "?";
    }

    function showStatus(message, isError) {
        statusEl.textContent = message;
        statusEl.classList.toggle("error", Boolean(isError));
        statusEl.hidden = false;
    }

    function buildTrailer(trailer) {
        if (!trailer || !trailer.url) {
            return '<p class="empty">' + dict.noTrailer + "</p>";
        }
        return (
            '<div class="trailer-frame"><iframe src="' + escapeHtml(trailer.url) +
            '" title="' + dict.trailer + '" allow="accelerometer; autoplay; ' +
            'clipboard-write; encrypted-media; picture-in-picture" allowfullscreen ' +
            'loading="lazy"></iframe></div>'
        );
    }

    function buildCast(cast) {
        if (!cast || !cast.length) {
            return '<p class="empty">' + dict.noCast + "</p>";
        }
        const cards = cast.map(function (person) {
            const photo = person.profileUrl
                ? '<img src="' + escapeHtml(person.profileUrl) + '" alt="' +
                  escapeHtml(person.name) + '" loading="lazy">'
                : '<div class="photo-placeholder">' + escapeHtml(initials(person.name)) + "</div>";
            return (
                '<div class="cast-card">' + photo +
                '<div class="cast-body">' +
                '<p class="cast-name">' + escapeHtml(person.name) + "</p>" +
                '<p class="cast-character">' +
                escapeHtml(person.character || dict.unknownRole) + "</p>" +
                "</div></div>"
            );
        }).join("");
        return '<div class="cast-grid">' + cards + "</div>";
    }

    function buildCrew(crew) {
        if (!crew || !crew.length) {
            return '<p class="empty">' + dict.noCrew + "</p>";
        }
        const groups = crew.map(function (group) {
            const roleLabel = dict.roles[group.role] || group.role;
            return (
                '<div class="crew-group">' +
                '<p class="crew-role">' + escapeHtml(roleLabel) + "</p>" +
                '<p class="crew-names">' +
                group.names.map(escapeHtml).join(", ") + "</p>" +
                "</div>"
            );
        }).join("");
        return '<div class="crew-groups">' + groups + "</div>";
    }

    function render(movie) {
        // SEO meta + JSON-LD are rendered server-side (see server.py) so scrapers
        // without JS still get them; here we just keep the tab title in sync.
        document.title = movie.title + " | Movie Horizon";

        const poster = movie.posterUrl
            ? '<img src="' + escapeHtml(movie.posterUrl) + '" alt="' +
              escapeHtml(movie.title) + ' poster">'
            : '<div class="placeholder">' + dict.noPoster + "</div>";

        const releaseLabel = formatReleaseDate(movie.releaseDate);
        const runtime = formatRuntime(movie.runtime);

        let chips = "";
        if (releaseLabel) {
            chips += '<span class="chip"><span>' + dict.release + "</span> " +
                escapeHtml(releaseLabel) + "</span>";
        }
        if (runtime) {
            chips += '<span class="chip"><span>' + dict.runtime + "</span> " +
                escapeHtml(runtime) + "</span>";
        }
        (movie.genres || []).forEach(function (genre) {
            chips += '<span class="chip">' + escapeHtml(genre) + "</span>";
        });

        const tagline = movie.tagline
            ? '<p class="tagline">' + escapeHtml(movie.tagline) + "</p>"
            : "";

        // Cinematic backdrop banner (shown on mobile only via CSS).
        const heroBackdrop = movie.backdropUrl
            ? '<div class="detail-backdrop" style="background-image:url(\'' +
              movie.backdropUrl + '\')"></div>'
            : "";

        // "Watch Trailer" jumps to the trailer section (shown on mobile only).
        const hasTrailer = movie.trailer && movie.trailer.url;
        const watchTrailer = hasTrailer
            ? '<a class="watch-trailer" href="#trailer">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" ' +
              'aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
              dict.watchTrailer + "</a>"
            : "";

        if (movie.backdropUrl) {
            document.body.style.backgroundImage =
                "linear-gradient(180deg, rgba(7,8,13,0.82), rgba(7,8,13,0.97)), url('" +
                movie.backdropUrl + "')";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundPosition = "center top";
            document.body.style.backgroundAttachment = "fixed";
        }

        contentEl.innerHTML =
            '<section class="detail-hero">' +
            heroBackdrop +
            '<div class="detail-poster">' + poster + "</div>" +
            '<div class="detail-main">' +
            '<p class="eyebrow">' + dict.inTheaters + " " + escapeHtml(releaseLabel) + "</p>" +
            '<h1 class="detail-title">' + escapeHtml(movie.title) + "</h1>" +
            tagline +
            '<div class="meta-row">' + chips + "</div>" +
            watchTrailer +
            '<p class="detail-overview">' + escapeHtml(movie.overview) + "</p>" +
            "</div></section>" +
            '<section class="section" id="trailer"><h2 class="section-title">' + dict.trailer +
            "</h2>" + buildTrailer(movie.trailer) + "</section>" +
            '<section class="section"><h2 class="section-title">' + dict.cast +
            "</h2>" + buildCast(movie.cast) + "</section>" +
            '<section class="section"><h2 class="section-title">' + dict.crew +
            "</h2>" + buildCrew(movie.crew) + "</section>";
    }

    // ---- Load ----

    if (!movieId || isNaN(parseInt(movieId, 10))) {
        showStatus(dict.error, true);
        return;
    }

    showStatus(dict.loading, false);

    const region = (params.get("region") || "US").toUpperCase();
    const listReleaseDate = params.get("listReleaseDate") || "";
    const apiParams = new URLSearchParams({
        siteLanguage: lang,
        region: region,
    });
    if (listReleaseDate) {
        apiParams.set("listReleaseDate", listReleaseDate);
    }

    fetch("/api/movie/" + encodeURIComponent(movieId) +
          "?" + apiParams.toString())
        .then(function (response) {
            if (!response.ok) throw new Error("Request failed: " + response.status);
            return response.json();
        })
        .then(function (movie) {
            render(movie);
            const meta = movie.releaseDateMeta;
            if (meta) {
                console.log("[release-date]", {
                    movieId: movie.id,
                    region: meta.region,
                    listReleaseDate: meta.listReleaseDate || listReleaseDate || "n/a",
                    detailReleaseDate: meta.detailReleaseDate,
                    usedFallback: meta.usedFallback,
                });
            }
        })
        .catch(function (error) {
            console.error("Failed to load movie:", error);
            showStatus(dict.error, true);
        });
})();
