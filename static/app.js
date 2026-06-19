// Homepage logic: build controls, call our own /api, render the movie list.
// The browser never talks to TMDb directly; it only calls /api/* on our server.

(function () {
    "use strict";

    // ---- UI translations -------------------------------------------------

    const I18N = {
        en: {
            eyebrow: "Now on the horizon",
            brand: "Upcoming",
            brandAccent: "Movies",
            subtitle: "A curated selection of films arriving in theaters soon.",
            heroEyebrow: "In theaters soon",
            siteName: "Movie Horizon",
            heroTitle: "Discover what's coming next.",
            heroSubtitle: "Discover upcoming theatrical releases — trailers, cast, and crew, all in one place.",
            cta: "Explore Upcoming Movies",
            featuredLabel: "Featured Release",
            viewDetails: "View details",
            mostAnticipated: "Most Anticipated",
            browseAll: "Browse all upcoming",
            featuring: "Featuring",
            search: "Search",
            searchPlaceholder: "Search by title…",
            region: "Region",
            originalLanguage: "Film language",
            daysAhead: "Days ahead",
            siteLanguage: "Website language",
            sortBy: "Sort by",
            order: "Order",
            releaseDate: "Release date",
            popularity: "Popularity",
            ascending: "Ascending",
            descending: "Descending",
            anyLanguage: "Any language",
            showing: "Showing",
            films: "films",
            window: "Window",
            loadMore: "Load more",
            filtersButton: "Filters",
            filtersTitle: "Filters",
            apply: "Apply",
            reset: "Reset",
            close: "Close",
            loading: "Loading movies…",
            empty: "No movies match these filters.",
            error: "Could not load movies. Please try again.",
            footer: "Data from The Movie Database (TMDb).",
        },
        pt: {
            eyebrow: "Em breve nos cinemas",
            brand: "Filmes",
            brandAccent: "em Breve",
            subtitle: "Uma seleção de filmes que chegam aos cinemas em breve.",
            heroEyebrow: "Em breve nos cinemas",
            siteName: "Movie Horizon",
            heroTitle: "Descubra o que vem a seguir.",
            heroSubtitle: "Conheça os próximos lançamentos nos cinemas — trailers, elenco e equipe, tudo em um só lugar.",
            cta: "Explorar próximos filmes",
            featuredLabel: "Destaque",
            viewDetails: "Ver detalhes",
            mostAnticipated: "Mais aguardados",
            browseAll: "Ver todos os lançamentos",
            featuring: "Em destaque",
            search: "Pesquisar",
            searchPlaceholder: "Pesquisar por título…",
            region: "Região",
            originalLanguage: "Idioma do filme",
            daysAhead: "Dias à frente",
            siteLanguage: "Idioma do site",
            sortBy: "Ordenar por",
            order: "Ordem",
            releaseDate: "Data de estreia",
            popularity: "Popularidade",
            ascending: "Crescente",
            descending: "Decrescente",
            anyLanguage: "Qualquer idioma",
            showing: "Mostrando",
            films: "filmes",
            window: "Período",
            loadMore: "Carregar mais",
            filtersButton: "Filtros",
            filtersTitle: "Filtros",
            apply: "Aplicar",
            reset: "Redefinir",
            close: "Fechar",
            loading: "Carregando filmes…",
            empty: "Nenhum filme corresponde a estes filtros.",
            error: "Não foi possível carregar os filmes. Tente novamente.",
            footer: "Dados do The Movie Database (TMDb).",
        },
    };

    // Region display names per site language. Value = TMDb region code.
    const REGIONS = [
        { code: "US", en: "United States", pt: "Estados Unidos" },
        { code: "BR", en: "Brazil", pt: "Brasil" },
        { code: "GB", en: "United Kingdom", pt: "Reino Unido" },
        { code: "FR", en: "France", pt: "França" },
        { code: "JP", en: "Japan", pt: "Japão" },
        { code: "KR", en: "South Korea", pt: "Coreia do Sul" },
        { code: "DE", en: "Germany", pt: "Alemanha" },
        { code: "ES", en: "Spain", pt: "Espanha" },
        { code: "IT", en: "Italy", pt: "Itália" },
        { code: "IN", en: "India", pt: "Índia" },
        { code: "CA", en: "Canada", pt: "Canadá" },
        { code: "AU", en: "Australia", pt: "Austrália" },
        { code: "MX", en: "Mexico", pt: "México" },
    ];

    // Original-language options. Value = ISO 639-1 code ("" = any).
    const LANGUAGES = [
        { code: "", en: "Any language", pt: "Qualquer idioma" },
        { code: "en", en: "English", pt: "Inglês" },
        { code: "pt", en: "Portuguese", pt: "Português" },
        { code: "es", en: "Spanish", pt: "Espanhol" },
        { code: "fr", en: "French", pt: "Francês" },
        { code: "ja", en: "Japanese", pt: "Japonês" },
        { code: "ko", en: "Korean", pt: "Coreano" },
        { code: "de", en: "German", pt: "Alemão" },
        { code: "it", en: "Italian", pt: "Italiano" },
        { code: "hi", en: "Hindi", pt: "Hindi" },
        { code: "zh", en: "Chinese", pt: "Chinês" },
    ];

    // ---- Element references ----------------------------------------------

    const els = {
        search: document.getElementById("search"),
        region: document.getElementById("region"),
        originalLanguage: document.getElementById("original-language"),
        daysAhead: document.getElementById("days-ahead"),
        siteLanguage: document.getElementById("site-language"),
        sortField: document.getElementById("sort-field"),
        sortOrder: document.getElementById("sort-order"),
        list: document.getElementById("movie-list"),
        status: document.getElementById("status"),
        loadMore: document.getElementById("load-more"),
        metaRow: document.getElementById("meta-row"),
        backdrops: [
            document.getElementById("backdrop-a"),
            document.getElementById("backdrop-b"),
        ],
        heroBg: document.getElementById("hero-bg"),
        heroCaption: document.getElementById("hero-caption"),
        exploreCta: document.getElementById("explore-cta"),
        heroScroll: document.getElementById("hero-scroll"),
        featuredSection: document.getElementById("featured-section"),
        anticipatedSection: document.getElementById("anticipated-section"),
        anticipatedGrid: document.getElementById("anticipated-grid"),
        catalog: document.getElementById("catalog"),
        filtersTrigger: document.getElementById("filters-trigger"),
        filtersSummary: document.getElementById("filters-summary"),
        filtersDrawer: document.getElementById("filters-drawer"),
        drawerOverlay: document.getElementById("drawer-overlay"),
        drawerClose: document.getElementById("drawer-close"),
        drawerApply: document.getElementById("drawer-apply"),
        drawerReset: document.getElementById("drawer-reset"),
    };

    let siteLanguage = "en";

    // How many cards to add per render batch (initial paint + each "Load more").
    const BATCH_SIZE = 24;

    // Days-ahead bounds (mirror the backend) + the fallback when empty/invalid.
    const DAYS_MIN = 1;
    const DAYS_MAX = 365;
    const DAYS_FALLBACK = 60;
    // Idle delay before a half-typed days-ahead value is auto-applied.
    const DAYS_IDLE_MS = 10000;

    // Holds the most recent server response so search/sort can run without refetch.
    const state = { movies: [], meta: null };

    // The currently visible (sorted + searched) list and how many are rendered.
    let visibleMovies = [];
    let renderedCount = 0;

    // ---- Filter-state persistence (URL query params + localStorage) -------

    const STORAGE_KEY = "upcomingMoviesFilters";
    const DEFAULTS = {
        search: "",
        region: "US",
        filmLanguage: "any",
        daysAhead: "60",
        siteLanguage: "en",
        sortBy: "release",
        sortOrder: "asc",
    };

    // The query string (without id) that represents the current homepage state.
    // Card links and the detail "Back to results" link reuse it.
    let lastQuery = "";

    function readStateFromUrl() {
        const p = new URLSearchParams(window.location.search);
        if (Array.from(p.keys()).length === 0) return null;
        return {
            search: p.get("search") || "",
            region: p.get("region") || DEFAULTS.region,
            filmLanguage: p.get("filmLanguage") || DEFAULTS.filmLanguage,
            daysAhead: p.get("daysAhead") || DEFAULTS.daysAhead,
            siteLanguage: p.get("siteLanguage") || DEFAULTS.siteLanguage,
            sortBy: p.get("sortBy") || DEFAULTS.sortBy,
            sortOrder: p.get("sortOrder") || DEFAULTS.sortOrder,
        };
    }

    function readStateFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
        } catch (e) { /* ignore unavailable/broken storage */ }
        return null;
    }

    // Read the current values straight from the controls.
    function currentState() {
        return {
            search: els.search.value.trim(),
            region: els.region.value || DEFAULTS.region,
            filmLanguage: els.originalLanguage.value === "" ? "any" : els.originalLanguage.value,
            daysAhead: String(els.daysAhead.value || DEFAULTS.daysAhead),
            siteLanguage: els.siteLanguage.value || DEFAULTS.siteLanguage,
            sortBy: els.sortField.value || DEFAULTS.sortBy,
            sortOrder: els.sortOrder.value || DEFAULTS.sortOrder,
        };
    }

    function stateToQuery(st) {
        return new URLSearchParams({
            search: st.search,
            region: st.region,
            filmLanguage: st.filmLanguage,
            daysAhead: st.daysAhead,
            siteLanguage: st.siteLanguage,
            sortBy: st.sortBy,
            sortOrder: st.sortOrder,
        }).toString();
    }

    // Persist the state to the URL (without adding history entries) and storage.
    function saveState() {
        const st = currentState();
        lastQuery = stateToQuery(st);
        history.replaceState(null, "", "?" + lastQuery);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
        } catch (e) { /* ignore unavailable storage */ }
        updateFilterSummary();
    }

    // Push the given state onto the controls. siteLanguage is applied first so
    // the language-dependent selects are repopulated before we set their values.
    function applyState(st) {
        els.siteLanguage.value = st.siteLanguage;
        siteLanguage = st.siteLanguage;
        applyTranslations();
        els.region.value = st.region;
        els.originalLanguage.value = st.filmLanguage === "any" ? "" : st.filmLanguage;
        els.daysAhead.value = st.daysAhead;
        els.sortField.value = st.sortBy;
        els.sortOrder.value = st.sortOrder;
        els.search.value = st.search;
    }

    // ---- Helpers ---------------------------------------------------------

    function t(key) {
        const dict = I18N[siteLanguage] || I18N.en;
        return dict[key] || key;
    }

    // Locale-aware date so ordering follows the language:
    // en-US -> "Jun 19, 2026"  |  pt-BR -> "19 de jun. de 2026".
    function formatReleaseDate(iso, lang) {
        if (!iso) return "";
        const parsed = new Date(iso + "T00:00:00");
        if (isNaN(parsed)) return iso;
        const locale = lang === "pt" ? "pt-BR" : "en-US";
        return parsed.toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showStatus(messageKey, isError) {
        els.status.hidden = false;
        els.status.textContent = t(messageKey);
        els.status.classList.toggle("error", Boolean(isError));
        els.list.innerHTML = "";
        els.loadMore.hidden = true;
    }

    function hideStatus() {
        els.status.hidden = true;
        els.status.classList.remove("error");
    }

    // Fill the grid with placeholder cards while data loads. Same dimensions as
    // real cards so there's no layout shift when content arrives.
    function renderSkeletons(count) {
        hideStatus();
        els.loadMore.hidden = true;
        let html = "";
        for (let i = 0; i < count; i++) {
            html +=
                '<div class="movie-card skeleton" aria-hidden="true">' +
                '<div class="poster skeleton-box"></div>' +
                '<div class="movie-info">' +
                '<div class="skeleton-line skeleton-line--sm"></div>' +
                '<div class="skeleton-line skeleton-line--lg"></div>' +
                '<div class="skeleton-line"></div>' +
                '<div class="skeleton-line skeleton-line--sm"></div>' +
                "</div></div>";
        }
        els.list.innerHTML = html;
    }

    // ---- Populate selects + translate static labels ----------------------

    function populateSelect(select, items) {
        const current = select.value;
        select.innerHTML = "";
        items.forEach(function (item) {
            const option = document.createElement("option");
            option.value = item.code;
            option.textContent = item[siteLanguage] || item.en;
            select.appendChild(option);
        });
        if (current) select.value = current;
    }

    function applyTranslations() {
        document.documentElement.lang = siteLanguage === "pt" ? "pt-BR" : "en";
        document.querySelectorAll("[data-i18n]").forEach(function (node) {
            const key = node.getAttribute("data-i18n");
            if (I18N[siteLanguage] && I18N[siteLanguage][key]) {
                node.textContent = I18N[siteLanguage][key];
            }
        });
        els.search.placeholder = t("searchPlaceholder");
        populateSelect(els.region, REGIONS);
        populateSelect(els.originalLanguage, LANGUAGES);
        els.drawerClose.setAttribute("aria-label", t("close"));
        // Keep the SEO-friendly home title regardless of UI language.
        document.title = "Movie Horizon | Discover Upcoming Movies Worldwide";
        updateFilterSummary();
    }

    // Compact "US • English • 365d" summary shown on the mobile Filters button.
    function updateFilterSummary() {
        const region = els.region.value || DEFAULTS.region;
        const langSelect = els.originalLanguage;
        const langLabel = langSelect.options[langSelect.selectedIndex]
            ? langSelect.options[langSelect.selectedIndex].text
            : "";
        const days = normalizeDaysAhead();
        els.filtersSummary.textContent =
            [region, langLabel, days + "d"].filter(Boolean).join(" • ");
    }

    // ---- Backdrop hover effect (crossfading layers) ----------------------

    let activeBackdrop = 0;
    let currentBackdropUrl = null;

    function showBackdrop(url) {
        if (!url || url === currentBackdropUrl) return;
        currentBackdropUrl = url;
        const next = 1 - activeBackdrop;
        els.backdrops[next].style.backgroundImage = "url('" + url + "')";
        els.backdrops[next].classList.add("is-visible");
        els.backdrops[activeBackdrop].classList.remove("is-visible");
        activeBackdrop = next;
    }

    function clearBackdrop() {
        currentBackdropUrl = null;
        els.backdrops.forEach(function (layer) {
            layer.classList.remove("is-visible");
        });
    }

    function preloadBackdrops(movies) {
        movies.forEach(function (movie) {
            if (movie.backdropUrl) {
                const img = new Image();
                img.src = movie.backdropUrl;
            }
        });
    }

    // ---- Rendering -------------------------------------------------------

    function renderMeta(displayedCount) {
        const meta = state.meta;
        if (!meta) return;
        const windowLabel =
            formatReleaseDate(meta.windowStart, siteLanguage) +
            " – " +
            formatReleaseDate(meta.windowEnd, siteLanguage);
        els.metaRow.innerHTML =
            '<span class="chip"><span>' + t("showing") + "</span> " +
            displayedCount + " " + t("films") + "</span>" +
            '<span class="chip"><span>' + t("window") + "</span> " +
            escapeHtml(windowLabel) + "</span>" +
            '<span class="chip"><span>' + t("region") + "</span> " +
            escapeHtml(meta.region) + "</span>";
    }

    // Build a detail-page href that preserves filters and passes the list date
    // so the backend can log/compare homepage vs detail release dates.
    function movieDetailHref(movie) {
        const qs = lastQuery ? new URLSearchParams(lastQuery) : new URLSearchParams();
        if (movie.releaseDate) {
            qs.set("listReleaseDate", movie.releaseDate);
        }
        const query = qs.toString();
        return "movie.html?id=" + encodeURIComponent(movie.id) +
            (query ? "&" + query : "");
    }

    function cardHtml(movie) {
        const poster = movie.posterUrl
            ? '<img src="' + escapeHtml(movie.posterUrl) + '" alt="' +
              escapeHtml(movie.title) + ' poster" loading="lazy">'
            : "";
        // Carry the full homepage state to the detail page so "Back to results"
        // can return here with the same filters applied.
        const href = movieDetailHref(movie);
        const genres = (movie.genres && movie.genres.length)
            ? '<p class="genres">' + escapeHtml(movie.genres.join(" • ")) + "</p>"
            : "";
        const backdropAttr = movie.backdropUrl
            ? ' data-backdrop="' + escapeHtml(movie.backdropUrl) + '"'
            : "";

        return (
            '<a class="card-link" href="' + href + '"' + backdropAttr + ">" +
            '<article class="movie-card">' +
            '<div class="poster">' + poster + "</div>" +
            '<div class="movie-info">' +
            '<p class="release-date">&#128197; ' +
            escapeHtml(formatReleaseDate(movie.releaseDate, siteLanguage)) + "</p>" +
            "<h2>" + escapeHtml(movie.title) + "</h2>" +
            genres +
            '<p class="overview">' + escapeHtml(movie.overview) + "</p>" +
            "</div></article></a>"
        );
    }

    // Sort a copy of the loaded movies by the current sort controls. Runs purely
    // on the client so changing sort never triggers a refetch.
    function sortMovies(list) {
        const field = els.sortField.value || "release";
        const order = els.sortOrder.value || "asc";
        const dir = order === "asc" ? 1 : -1;
        return list.slice().sort(function (a, b) {
            let cmp;
            if (field === "popularity") {
                cmp = (a.popularity || 0) - (b.popularity || 0);
            } else {
                cmp = (a.releaseDate || "").localeCompare(b.releaseDate || "");
            }
            return cmp * dir;
        });
    }

    // Append the next batch of cards and update the "Load more" button.
    function renderNextBatch() {
        const slice = visibleMovies.slice(renderedCount, renderedCount + BATCH_SIZE);
        els.list.insertAdjacentHTML("beforeend", slice.map(cardHtml).join(""));
        renderedCount += slice.length;
        els.loadMore.hidden = renderedCount >= visibleMovies.length;
    }

    // Applies sort (local) + search (local) and renders the first batch.
    function applySearchAndRender() {
        // Keep the URL/storage in sync (covers search + sort changes too).
        saveState();

        const sorted = sortMovies(state.movies);
        const term = els.search.value.trim().toLowerCase();
        visibleMovies = term
            ? sorted.filter(function (m) {
                  return m.title.toLowerCase().indexOf(term) !== -1;
              })
            : sorted;

        renderedCount = 0;

        if (!visibleMovies.length) {
            showStatus("empty", false);
            renderMeta(0);
            return;
        }

        hideStatus();
        els.list.innerHTML = "";
        renderNextBatch();
        renderMeta(visibleMovies.length);
    }

    // ---- Cinematic highlights (hero + featured + most anticipated) --------

    function setHeroBackdrop(url) {
        if (!url) {
            els.heroBg.classList.remove("loaded");
            els.heroBg.style.backgroundImage = "";
            return;
        }
        // Fade in only once the image is decoded, for a smooth entrance.
        const img = new Image();
        img.onload = function () {
            els.heroBg.style.backgroundImage = "url('" + url + "')";
            els.heroBg.classList.add("loaded");
        };
        img.src = url;
    }

    function featuredHtml(movie) {
        const media = movie.backdropUrl || movie.posterUrl || "";
        const href = movieDetailHref(movie);
        return (
            '<div class="featured-card">' +
            '<div class="featured-media" style="background-image:url(\'' +
            media + '\')"></div>' +
            '<div class="featured-body">' +
            '<p class="featured-label">' + t("featuredLabel") + "</p>" +
            '<h3 class="featured-title">' + escapeHtml(movie.title) + "</h3>" +
            '<p class="release-date">&#128197; ' +
            escapeHtml(formatReleaseDate(movie.releaseDate, siteLanguage)) + "</p>" +
            '<p class="featured-overview">' + escapeHtml(movie.overview) + "</p>" +
            '<a class="cta" href="' + href + '">' + t("viewDetails") + "</a>" +
            "</div></div>"
        );
    }

    // Highlights are based on popularity, independent of the user's sort choice.
    function renderHighlights(movies) {
        if (!movies || !movies.length) {
            els.featuredSection.hidden = true;
            els.anticipatedSection.hidden = true;
            setHeroBackdrop(null);
            els.heroCaption.textContent = "";
            return;
        }

        const byPopularity = movies.slice().sort(function (a, b) {
            return (b.popularity || 0) - (a.popularity || 0);
        });

        const heroMovie = byPopularity.find(function (m) { return m.backdropUrl; })
            || byPopularity[0];
        setHeroBackdrop(heroMovie.backdropUrl);
        els.heroCaption.textContent = t("featuring") + ": " + heroMovie.title;

        const featured = byPopularity[0];
        els.featuredSection.innerHTML = featuredHtml(featured);
        els.featuredSection.hidden = false;

        const anticipated = byPopularity
            .filter(function (m) { return m.id !== featured.id; })
            .slice(0, 5);
        if (anticipated.length) {
            els.anticipatedGrid.innerHTML = anticipated.map(cardHtml).join("");
            els.anticipatedSection.hidden = false;
        } else {
            els.anticipatedSection.hidden = true;
        }
    }

    function scrollToCatalog() {
        els.catalog.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ---- Data fetching ---------------------------------------------------

    let requestToken = 0;

    function loadMovies() {
        siteLanguage = els.siteLanguage.value || "en";

        const region = els.region.value || "US";
        const originalLanguage = els.originalLanguage.value || "";
        const daysAhead = normalizeDaysAhead();
        els.daysAhead.value = daysAhead;
        const sortBy = els.sortField.value || "release";
        const sortOrder = els.sortOrder.value || "asc";

        // Reflect the current filters in the URL/storage right away.
        saveState();

        const params = new URLSearchParams({
            region: region,
            siteLanguage: siteLanguage,
            originalLanguage: originalLanguage,
            daysAhead: String(daysAhead),
            sortBy: sortBy,
            sortOrder: sortOrder,
        });

        // Skeletons keep the layout stable and avoid a blank flash while loading.
        renderSkeletons(BATCH_SIZE);
        clearBackdrop();
        const token = ++requestToken;
        const startedAt = performance.now();

        fetch("/api/upcoming-movies?" + params.toString())
            .then(function (response) {
                if (!response.ok) throw new Error("Request failed: " + response.status);
                return response.json();
            })
            .then(function (data) {
                if (token !== requestToken) return; // superseded by a newer request
                state.movies = data.movies;
                state.meta = data.meta;
                renderHighlights(data.movies);
                applySearchAndRender();
                preloadBackdrops(data.movies);

                // ---- Performance / debug metrics ----
                const roundTripMs = Math.round(performance.now() - startedAt);
                console.log(
                    "%c[perf] upcoming",
                    "color:#d4af37;font-weight:bold",
                    {
                        source: data.meta.cacheHit ? "CACHE_HIT" : "TMDB_FETCH",
                        pagesFetched: data.meta.pagesFetched,
                        serverFetchMs: data.meta.fetchMs,
                        roundTripMs: roundTripMs,
                        moviesBeforeFilter: data.meta.rawCount,
                        moviesAfterFilter: data.meta.filteredCount,
                        moviesReturned: data.movies.length,
                        moviesRendered: renderedCount,
                    }
                );
            })
            .catch(function (error) {
                if (token !== requestToken) return;
                console.error("Failed to load movies:", error);
                showStatus("error", true);
            });
    }

    function debounce(fn, delay) {
        let timer;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    // ---- Days-ahead input handling --------------------------------------
    // The field must stay comfortable to edit: it can be empty while focused and
    // is only validated/applied on Enter, blur, or after a 10s typing pause.

    // Parse + clamp the field's value, falling back to the default when empty or
    // invalid. Does NOT write to the input — callers decide when to commit.
    function normalizeDaysAhead() {
        const parsed = parseInt(els.daysAhead.value, 10);
        if (isNaN(parsed)) return DAYS_FALLBACK;
        return Math.max(DAYS_MIN, Math.min(DAYS_MAX, parsed));
    }

    let daysAheadIdleTimer;

    // Validate, write the normalized value back, and reload. Called only at the
    // explicit commit points — never on every keystroke.
    function commitDaysAhead() {
        clearTimeout(daysAheadIdleTimer);
        loadMovies(); // normalizes + writes the field, then refetches
    }

    // ---- Mobile filters drawer ------------------------------------------

    function openDrawer() {
        document.body.classList.add("drawer-open");
        els.filtersTrigger.setAttribute("aria-expanded", "true");
    }

    function closeDrawer() {
        document.body.classList.remove("drawer-open");
        els.filtersTrigger.setAttribute("aria-expanded", "false");
    }

    function isDrawerOpen() {
        return document.body.classList.contains("drawer-open");
    }

    // Apply = commit the (possibly half-typed) days value, refetch, then close.
    // Other controls already update live, so this mainly flushes days + closes.
    function applyDrawer() {
        commitDaysAhead();
        closeDrawer();
    }

    // Reset the drawer's filters back to defaults (search stays — it lives
    // outside the drawer), then refetch. Drawer stays open to show the result.
    function resetDrawer() {
        const previousLang = els.siteLanguage.value || DEFAULTS.siteLanguage;
        els.siteLanguage.value = DEFAULTS.siteLanguage;
        if (DEFAULTS.siteLanguage !== previousLang) {
            siteLanguage = DEFAULTS.siteLanguage;
            applyTranslations();
        }
        els.region.value = DEFAULTS.region;
        els.originalLanguage.value = DEFAULTS.filmLanguage === "any" ? "" : DEFAULTS.filmLanguage;
        els.daysAhead.value = DEFAULTS.daysAhead;
        els.sortField.value = DEFAULTS.sortBy;
        els.sortOrder.value = DEFAULTS.sortOrder;
        loadMovies();
    }

    // ---- Wire up events --------------------------------------------------

    function onSiteLanguageChange() {
        siteLanguage = els.siteLanguage.value || "en";
        applyTranslations();
        loadMovies();
    }

    // Refetch only when the inputs that change the underlying data set change.
    els.region.addEventListener("change", loadMovies);
    els.originalLanguage.addEventListener("change", loadMovies);
    els.siteLanguage.addEventListener("change", onSiteLanguageChange);

    // Days-ahead: never reset the field mid-typing. Apply only on a 10s pause...
    els.daysAhead.addEventListener("input", function () {
        clearTimeout(daysAheadIdleTimer);
        daysAheadIdleTimer = setTimeout(commitDaysAhead, DAYS_IDLE_MS);
    });
    // ...on blur (the native "change" event)...
    els.daysAhead.addEventListener("change", commitDaysAhead);
    // ...or when the user presses Enter.
    els.daysAhead.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            commitDaysAhead();
        }
    });

    // Sort changes are handled locally — no refetch, just re-sort + re-render.
    els.sortField.addEventListener("change", applySearchAndRender);
    els.sortOrder.addEventListener("change", applySearchAndRender);

    // Search filters the already-loaded list instantly (works with filters/sort).
    els.search.addEventListener("input", debounce(applySearchAndRender, 150));

    // Incremental rendering: reveal the next batch on demand.
    els.loadMore.addEventListener("click", renderNextBatch);

    // Mobile filters drawer: open/apply/reset/close + overlay + Escape.
    els.filtersTrigger.addEventListener("click", openDrawer);
    els.drawerApply.addEventListener("click", applyDrawer);
    els.drawerReset.addEventListener("click", resetDrawer);
    els.drawerClose.addEventListener("click", closeDrawer);
    els.drawerOverlay.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isDrawerOpen()) closeDrawer();
    });
    // If the viewport grows past the mobile breakpoint, ensure we don't leave
    // the page in the locked/open state.
    window.matchMedia("(min-width: 601px)").addEventListener("change", function (e) {
        if (e.matches && isDrawerOpen()) closeDrawer();
    });

    // Backdrop hover via event delegation for performance.
    els.list.addEventListener("mouseover", function (event) {
        const card = event.target.closest(".card-link");
        if (card && els.list.contains(card)) {
            showBackdrop(card.dataset.backdrop);
        }
    });
    els.list.addEventListener("mouseleave", clearBackdrop);

    // Hero call-to-action and scroll hint both jump to the catalog.
    els.exploreCta.addEventListener("click", scrollToCatalog);
    els.heroScroll.addEventListener("click", scrollToCatalog);

    // Back/forward navigation: re-apply whatever state the URL now holds.
    window.addEventListener("popstate", function () {
        applyState(readStateFromUrl() || Object.assign({}, DEFAULTS));
        loadMovies();
    });

    // ---- Initial load ----------------------------------------------------

    // Restore from the URL first (shareable), then localStorage, then defaults.
    const initialState =
        readStateFromUrl() || readStateFromStorage() || Object.assign({}, DEFAULTS);
    applyState(initialState);
    loadMovies();
})();
