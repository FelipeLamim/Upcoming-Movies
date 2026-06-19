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
            heroTitle: "Discover what's coming next — and what's in theaters now.",
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
            genre: "Genre",
            daysAhead: "Days ahead",
            siteLanguage: "Website language",
            sortBy: "Sort by",
            order: "Order",
            releaseDate: "Release date",
            popularity: "Popularity",
            ascending: "Ascending",
            descending: "Descending",
            anyLanguage: "Any language",
            anyGenre: "Any genre",
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
            modeUpcoming: "Upcoming Movies",
            modeNowPlaying: "Now in Theaters",
            heroEyebrowNow: "Now in theaters",
            heroTitleNow: "See what's playing today.",
            heroSubtitleNow: "Browse films currently in theaters — trailers, cast, and crew, all in one place.",
            ctaNow: "Explore Now Playing",
            featuredLabelNow: "Now Showing",
            mostAnticipatedNow: "Popular in Theaters",
            browseAllNow: "Browse all now playing",
            inTheatersSince: "In theaters since",
            windowNow: "Last 60 days",
            loadingNow: "Loading now playing…",
            emptyNowPlaying: "No movies currently in theaters match these filters.",
            modeLabel: "Mode",
            langEn: "English",
            langPt: "Portuguese",
            aiRecommendToggle: "Recommendations from the AI",
            aiRecommendTitle: "Find your next watch",
            aiRecommendHint: "Tell us what you like — we will pick from the current catalog only.",
            aiRecommendLabel: "Your preferences",
            aiRecommendPlaceholder: "What are you in the mood for?",
            aiRecommendSubmit: "Get recommendations",
            aiRecommendResults: "Picked for you",
            aiRecommendLoading: "Finding matches in the catalog…",
            aiRecommendError: "Could not get recommendations. Please try again.",
            aiRecommendEmptyCatalog: "Load the catalog first, or widen your filters.",
            aiRecommendTooFew: "Need at least 3 movies in the catalog for recommendations.",
            aiRecommendReason: "Why this pick",
        },
        pt: {
            eyebrow: "Em breve nos cinemas",
            brand: "Filmes",
            brandAccent: "em Breve",
            subtitle: "Uma seleção de filmes que chegam aos cinemas em breve.",
            heroEyebrow: "Em breve nos cinemas",
            siteName: "Movie Horizon",
            heroTitle: "Descubra o que vem a seguir — e o que está nos cinemas agora.",
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
            genre: "Gênero",
            daysAhead: "Dias à frente",
            siteLanguage: "Idioma do site",
            sortBy: "Ordenar por",
            order: "Ordem",
            releaseDate: "Data de estreia",
            popularity: "Popularidade",
            ascending: "Crescente",
            descending: "Decrescente",
            anyLanguage: "Qualquer idioma",
            anyGenre: "Qualquer gênero",
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
            modeUpcoming: "Próximos filmes",
            modeNowPlaying: "Nos cinemas",
            heroEyebrowNow: "Nos cinemas agora",
            heroTitleNow: "Veja o que está em cartaz hoje.",
            heroSubtitleNow: "Explore filmes em exibição nos cinemas — trailers, elenco e equipe, tudo em um só lugar.",
            ctaNow: "Explorar em cartaz",
            featuredLabelNow: "Em cartaz",
            mostAnticipatedNow: "Populares nos cinemas",
            browseAllNow: "Ver todos em cartaz",
            inTheatersSince: "Nos cinemas desde",
            windowNow: "Últimos 60 dias",
            loadingNow: "Carregando em cartaz…",
            emptyNowPlaying: "Nenhum filme em cartaz corresponde a estes filtros.",
            modeLabel: "Modo",
            langEn: "English",
            langPt: "Português",
            aiRecommendToggle: "Recomendações da IA",
            aiRecommendTitle: "Encontre seu próximo filme",
            aiRecommendHint: "Conte o que você gosta — escolheremos apenas do catálogo atual.",
            aiRecommendLabel: "Suas preferências",
            aiRecommendPlaceholder: "O que você gostaria de assistir?",
            aiRecommendSubmit: "Obter recomendações",
            aiRecommendResults: "Escolhidos para você",
            aiRecommendLoading: "Buscando correspondências no catálogo…",
            aiRecommendError: "Não foi possível obter recomendações. Tente novamente.",
            aiRecommendEmptyCatalog: "Carregue o catálogo primeiro ou amplie seus filtros.",
            aiRecommendTooFew: "São necessários pelo menos 3 filmes no catálogo para recomendar.",
            aiRecommendReason: "Por que este filme",
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
        genre: document.getElementById("genre"),
        daysAhead: document.getElementById("days-ahead"),
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
        page: document.querySelector(".page"),
        filtersTrigger: document.getElementById("filters-trigger"),
        filtersSummary: document.getElementById("filters-summary"),
        filtersDrawer: document.getElementById("filters-drawer"),
        drawerDragArea: document.getElementById("drawer-drag-area"),
        drawerOverlay: document.getElementById("drawer-overlay"),
        drawerClose: document.getElementById("drawer-close"),
        drawerApply: document.getElementById("drawer-apply"),
        drawerReset: document.getElementById("drawer-reset"),
        langButtons: document.querySelectorAll(".lang-toggle__btn"),
        modeToggle: document.querySelector(".mode-toggle"),
        modeButtons: document.querySelectorAll(".mode-toggle__btn"),
        catalogHeading: document.getElementById("catalog-heading"),
        catalogSubtitle: document.getElementById("catalog-subtitle"),
        anticipatedHeading: document.getElementById("anticipated-heading"),
        daysAheadControl: document.getElementById("days-ahead-control"),
        heroEyebrow: document.querySelector(".hero .eyebrow"),
        heroTitle: document.querySelector(".hero-title"),
        heroSubtitle: document.querySelector(".hero-sub"),
        aiRecommendToggle: document.getElementById("ai-recommend-toggle"),
        aiRecommendPanel: document.getElementById("ai-recommend-panel"),
        aiRecommendForm: document.getElementById("ai-recommend-form"),
        aiRecommendInput: document.getElementById("ai-recommend-input"),
        aiRecommendSubmit: document.getElementById("ai-recommend-submit"),
        aiRecommendStatus: document.getElementById("ai-recommend-status"),
        aiRecommendResults: document.getElementById("ai-recommend-results"),
        aiRecommendGrid: document.getElementById("ai-recommend-grid"),
        aiRecommendNotice: document.getElementById("ai-recommend-notice"),
    };

    let siteLanguage = "en";
    let cachedGenres = [];
    let genresLanguage = "";

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
        mode: "upcoming",
        search: "",
        region: "US",
        filmLanguage: "any",
        genre: "any",
        daysAhead: "60",
        siteLanguage: "en",
        sortBy: "release",
        sortOrder: "asc",
    };

    // The query string (without id) that represents the current homepage state.
    // Card links and the detail "Back to results" link reuse it.
    let lastQuery = "";

    function getDefaultSort(mode) {
        return {
            sortBy: "release",
            sortOrder: mode === "nowPlaying" ? "desc" : "asc",
        };
    }

    function getMode() {
        const active = document.querySelector(".mode-toggle__btn.is-active");
        return active ? active.dataset.mode : DEFAULTS.mode;
    }

    function isNowPlaying() {
        return getMode() === "nowPlaying";
    }

    function setMode(mode) {
        els.modeButtons.forEach(function (btn) {
            const active = btn.dataset.mode === mode;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-selected", active ? "true" : "false");
        });
        applyModeUI();
    }

    function applyModeUI() {
        const now = isNowPlaying();
        if (els.daysAheadControl) {
            els.daysAheadControl.classList.toggle("is-hidden", now);
        }
        if (els.heroEyebrow) {
            els.heroEyebrow.textContent = t(now ? "heroEyebrowNow" : "heroEyebrow");
        }
        if (els.heroSubtitle) {
            els.heroSubtitle.textContent = t(now ? "heroSubtitleNow" : "heroSubtitle");
        }
        if (els.exploreCta) {
            els.exploreCta.textContent = t(now ? "ctaNow" : "cta");
        }
        if (els.catalogHeading) {
            els.catalogHeading.textContent = t(now ? "browseAllNow" : "browseAll");
        }
        if (els.catalogSubtitle) {
            els.catalogSubtitle.textContent = t(now ? "heroSubtitleNow" : "subtitle");
        }
        if (els.anticipatedHeading) {
            els.anticipatedHeading.textContent = t(now ? "mostAnticipatedNow" : "mostAnticipated");
        }
    }

    function applyModeSortDefaults() {
        const defaults = getDefaultSort(getMode());
        els.sortField.value = defaults.sortBy;
        els.sortOrder.value = defaults.sortOrder;
    }

    function resetFiltersToDefaults(options) {
        options = options || {};
        els.search.value = DEFAULTS.search;
        els.region.value = DEFAULTS.region;
        els.originalLanguage.value = DEFAULTS.filmLanguage === "any" ? "" : DEFAULTS.filmLanguage;
        els.genre.value = DEFAULTS.genre === "any" ? "" : DEFAULTS.genre;
        els.daysAhead.value = DEFAULTS.daysAhead;
        if (!options.keepSiteLanguage) {
            syncSiteLanguage(DEFAULTS.siteLanguage);
            applyTranslations();
        } else {
            updateFilterSummary();
        }
    }

    function readStateFromUrl() {
        const p = new URLSearchParams(window.location.search);
        if (Array.from(p.keys()).length === 0) return null;
        const mode = p.get("mode") || DEFAULTS.mode;
        const sortDefaults = getDefaultSort(mode);
        return {
            mode: mode,
            search: p.get("search") || "",
            region: p.get("region") || DEFAULTS.region,
            filmLanguage: p.get("filmLanguage") || DEFAULTS.filmLanguage,
            genre: p.get("genre") || DEFAULTS.genre,
            daysAhead: p.get("daysAhead") || DEFAULTS.daysAhead,
            siteLanguage: p.get("siteLanguage") || DEFAULTS.siteLanguage,
            sortBy: p.has("sortBy") ? p.get("sortBy") : sortDefaults.sortBy,
            sortOrder: p.has("sortOrder") ? p.get("sortOrder") : sortDefaults.sortOrder,
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
            mode: getMode(),
            search: els.search.value.trim(),
            region: els.region.value || DEFAULTS.region,
            filmLanguage: els.originalLanguage.value === "" ? "any" : els.originalLanguage.value,
            genre: els.genre.value === "" ? "any" : els.genre.value,
            daysAhead: String(els.daysAhead.value || DEFAULTS.daysAhead),
            siteLanguage: siteLanguage || DEFAULTS.siteLanguage,
            sortBy: els.sortField.value || DEFAULTS.sortBy,
            sortOrder: els.sortOrder.value || DEFAULTS.sortOrder,
        };
    }

    function stateToQuery(st) {
        const params = {
            mode: st.mode || DEFAULTS.mode,
            search: st.search,
            region: st.region,
            filmLanguage: st.filmLanguage,
            siteLanguage: st.siteLanguage,
            sortBy: st.sortBy,
            sortOrder: st.sortOrder,
        };
        if (st.genre && st.genre !== "any") {
            params.genre = st.genre;
        }
        if (params.mode === "upcoming") {
            params.daysAhead = st.daysAhead;
        }
        return new URLSearchParams(params).toString();
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

    function syncSiteLanguage(lang) {
        siteLanguage = lang === "pt" ? "pt" : "en";
        els.langButtons.forEach(function (btn) {
            const active = btn.dataset.lang === siteLanguage;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    // Push the given state onto the controls. siteLanguage is applied first so
    // the language-dependent selects are repopulated before we set their values.
    function applyState(st) {
        syncSiteLanguage(st.siteLanguage);
        applyTranslations();
        setMode(st.mode || DEFAULTS.mode);
        els.region.value = st.region;
        els.originalLanguage.value = st.filmLanguage === "any" ? "" : st.filmLanguage;
        els.genre.value = st.genre === "any" ? "" : (st.genre || "");
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

    function formatMovieDateLine(movie) {
        const formatted = formatReleaseDate(movie.releaseDate, siteLanguage);
        if (!formatted) return "";
        if (isNowPlaying()) {
            return t("inTheatersSince") + " " + formatted;
        }
        return "\u{1F4C5} " + formatted;
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

    function setCachedGenres(genres, lang) {
        if (!genres || !genres.length) return;
        cachedGenres = genres;
        genresLanguage = lang || siteLanguage;
        populateGenreSelect();
    }

    function syncGenresFromMeta(meta) {
        if (!meta || !meta.availableGenres || !meta.availableGenres.length) return;
        if (genresLanguage === siteLanguage && cachedGenres.length) return;
        setCachedGenres(meta.availableGenres, siteLanguage);
    }

    function populateGenreSelect() {
        if (!els.genre) return;
        const current = els.genre.value;
        els.genre.innerHTML = "";
        const anyOption = document.createElement("option");
        anyOption.value = "";
        anyOption.textContent = t("anyGenre");
        els.genre.appendChild(anyOption);
        cachedGenres.forEach(function (genre) {
            const option = document.createElement("option");
            option.value = String(genre.id);
            option.textContent = genre.name;
            els.genre.appendChild(option);
        });
        if (current) els.genre.value = current;
    }

    function loadGenres() {
        return fetch("/api/genres?siteLanguage=" + encodeURIComponent(siteLanguage))
            .then(function (response) {
                if (!response.ok) throw new Error("Failed to load genres");
                return response.json();
            })
            .then(function (data) {
                setCachedGenres(data.genres || [], siteLanguage);
            })
            .catch(function (error) {
                console.warn("Genre list endpoint unavailable, will use movie API fallback:", error);
                if (!cachedGenres.length) {
                    populateGenreSelect();
                }
            });
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
        if (els.aiRecommendInput) {
            els.aiRecommendInput.placeholder = t("aiRecommendPlaceholder");
        }
        populateSelect(els.region, REGIONS);
        populateSelect(els.originalLanguage, LANGUAGES);
        populateGenreSelect();
        els.drawerClose.setAttribute("aria-label", t("close"));
        // Keep the SEO-friendly home title regardless of UI language.
        document.title = "Movie Horizon | Discover Upcoming Movies Worldwide";
        updateFilterSummary();
        applyModeUI();
    }

    // Compact "US • English • 365d" summary shown on the mobile Filters button.
    function updateFilterSummary() {
        const region = els.region.value || DEFAULTS.region;
        const langSelect = els.originalLanguage;
        const langLabel = langSelect.options[langSelect.selectedIndex]
            ? langSelect.options[langSelect.selectedIndex].text
            : "";
        const genreSelect = els.genre;
        const genreLabel = genreSelect && genreSelect.value && genreSelect.selectedIndex >= 0
            ? genreSelect.options[genreSelect.selectedIndex].text
            : "";
        const days = normalizeDaysAhead();
        const parts = [region, langLabel];
        if (genreLabel && genreSelect.value) {
            parts.push(genreLabel);
        }
        if (!isNowPlaying()) {
            parts.push(days + "d");
        }
        els.filtersSummary.textContent = parts.filter(Boolean).join(" • ");
    }

    // ---- Backdrop hover effect (crossfading layers) ----------------------

    let activeBackdrop = 0;
    let currentBackdropUrl = null;
    let backdropRequestId = 0;
    const backdropLoadCache = new Map();

    function preloadBackdrop(url) {
        if (!url) return Promise.resolve(null);
        if (backdropLoadCache.has(url)) return backdropLoadCache.get(url);
        const promise = new Promise(function (resolve) {
            const img = new Image();
            img.onload = function () { resolve(url); };
            img.onerror = function () { resolve(null); };
            img.src = url;
        });
        backdropLoadCache.set(url, promise);
        return promise;
    }

    function showBackdrop(url) {
        if (!url || url === currentBackdropUrl) return;
        const requestId = ++backdropRequestId;
        preloadBackdrop(url).then(function (loadedUrl) {
            if (requestId !== backdropRequestId || !loadedUrl) return;
            if (loadedUrl === currentBackdropUrl) return;
            currentBackdropUrl = loadedUrl;
            const next = 1 - activeBackdrop;
            els.backdrops[next].style.backgroundImage = "url('" + loadedUrl + "')";
            els.backdrops[next].classList.add("is-visible");
            els.backdrops[activeBackdrop].classList.remove("is-visible");
            activeBackdrop = next;
        });
    }

    function clearBackdrop() {
        backdropRequestId++;
        currentBackdropUrl = null;
        els.backdrops.forEach(function (layer) {
            layer.classList.remove("is-visible");
        });
    }

    function preloadBackdrops(movies) {
        movies.forEach(function (movie) {
            if (movie.backdropUrl) preloadBackdrop(movie.backdropUrl);
        });
    }

    function handleCardBackdropHover(event) {
        const card = event.target.closest(".card-link[data-backdrop]");
        if (card) showBackdrop(card.dataset.backdrop);
    }

    function handlePageBackdropLeave(event) {
        if (!els.page.contains(event.relatedTarget)) clearBackdrop();
    }

    // ---- Rendering -------------------------------------------------------

    function renderMeta(displayedCount) {
        if (!state.meta) return;
        els.metaRow.innerHTML =
            '<span class="chip"><span>' + t("showing") + "</span> " +
            displayedCount + " " + t("films") + "</span>";
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
            '<p class="release-date">' +
            escapeHtml(formatMovieDateLine(movie)) + "</p>" +
            "<h2>" + escapeHtml(movie.title) + "</h2>" +
            genres +
            '<p class="overview">' + escapeHtml(movie.overview) + "</p>" +
            "</div></article></a>"
        );
    }

    function recommendationCardHtml(movie, reason) {
        const poster = movie.posterUrl
            ? '<img src="' + escapeHtml(movie.posterUrl) + '" alt="' +
              escapeHtml(movie.title) + ' poster" loading="lazy">'
            : "";
        const href = movieDetailHref(movie);
        const genres = (movie.genres && movie.genres.length)
            ? '<p class="genres">' + escapeHtml(movie.genres.join(" • ")) + "</p>"
            : "";
        const backdropAttr = movie.backdropUrl
            ? ' data-backdrop="' + escapeHtml(movie.backdropUrl) + '"'
            : "";

        return (
            '<a class="card-link" href="' + href + '"' + backdropAttr + ">" +
            '<article class="movie-card movie-card--recommend">' +
            '<div class="poster">' + poster + "</div>" +
            '<div class="movie-info">' +
            '<p class="release-date">' +
            escapeHtml(formatMovieDateLine(movie)) + "</p>" +
            "<h2>" + escapeHtml(movie.title) + "</h2>" +
            genres +
            '<p class="recommend-reason"><span class="recommend-reason__label">' +
            escapeHtml(t("aiRecommendReason")) + ":</span> " +
            escapeHtml(reason) + "</p>" +
            "</div></article></a>"
        );
    }

    function compactCatalogForAi(movies) {
        return movies.map(function (movie) {
            return {
                id: movie.id,
                title: movie.title,
                overview: movie.overview || "",
                genres: movie.genres || [],
                releaseDate: movie.releaseDate || "",
                mode: getMode(),
                popularity: movie.popularity || 0,
            };
        });
    }

    function setAiRecommendStatus(messageKey, isError) {
        if (!els.aiRecommendStatus) return;
        els.aiRecommendStatus.hidden = false;
        els.aiRecommendStatus.textContent = t(messageKey);
        els.aiRecommendStatus.classList.toggle("error", !!isError);
        els.aiRecommendStatus.classList.toggle("is-loading", messageKey === "aiRecommendLoading");
    }

    function clearAiRecommendStatus() {
        if (!els.aiRecommendStatus) return;
        els.aiRecommendStatus.hidden = true;
        els.aiRecommendStatus.textContent = "";
        els.aiRecommendStatus.classList.remove("error", "is-loading");
    }

    function renderAiRecommendSkeletons() {
        if (!els.aiRecommendGrid || !els.aiRecommendResults) return;
        els.aiRecommendResults.hidden = false;
        els.aiRecommendGrid.innerHTML = Array.from({ length: 3 }, function () {
            return (
                '<article class="movie-card skeleton">' +
                '<div class="poster skeleton-box"></div>' +
                '<div class="movie-info">' +
                '<div class="skeleton-line skeleton-line--sm"></div>' +
                '<div class="skeleton-line skeleton-line--lg"></div>' +
                '<div class="skeleton-line"></div>' +
                "</div></article>"
            );
        }).join("");
    }

    function renderAiRecommendations(recommendations, notice) {
        if (!els.aiRecommendGrid || !els.aiRecommendResults) return;
        if (els.aiRecommendNotice) {
            if (notice) {
                els.aiRecommendNotice.textContent = notice;
                els.aiRecommendNotice.hidden = false;
            } else {
                els.aiRecommendNotice.textContent = "";
                els.aiRecommendNotice.hidden = true;
            }
        }
        els.aiRecommendGrid.innerHTML = recommendations.map(function (rec) {
            return recommendationCardHtml(rec, rec.reason);
        }).join("");
        els.aiRecommendResults.hidden = false;
        preloadBackdrops(recommendations);
    }

    function getRecommendationCatalog() {
        return state.movies;
    }

    async function submitAiRecommendations(event) {
        if (event) event.preventDefault();
        if (!els.aiRecommendInput || !els.aiRecommendSubmit) return;

        const message = els.aiRecommendInput.value.trim();
        if (!message) {
            els.aiRecommendInput.focus();
            return;
        }

        const catalog = getRecommendationCatalog();
        if (!catalog.length) {
            setAiRecommendStatus("aiRecommendEmptyCatalog", true);
            if (els.aiRecommendResults) els.aiRecommendResults.hidden = true;
            return;
        }
        if (catalog.length < 3) {
            setAiRecommendStatus("aiRecommendTooFew", true);
            if (els.aiRecommendResults) els.aiRecommendResults.hidden = true;
            return;
        }

        els.aiRecommendSubmit.disabled = true;
        clearAiRecommendStatus();
        setAiRecommendStatus("aiRecommendLoading", false);
        renderAiRecommendSkeletons();

        try {
            const response = await fetch("/api/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: message,
                    mode: getMode(),
                    siteLanguage: siteLanguage,
                    movies: compactCatalogForAi(catalog),
                }),
            });
            const data = await response.json().catch(function () { return {}; });
            if (!response.ok) {
                throw new Error(data.error || t("aiRecommendError"));
            }
            clearAiRecommendStatus();
            renderAiRecommendations(data.recommendations || [], data.notice || "");
        } catch (error) {
            setAiRecommendStatus("aiRecommendError", true);
            if (els.aiRecommendResults) els.aiRecommendResults.hidden = true;
            if (error && error.message && error.message !== t("aiRecommendError")) {
                els.aiRecommendStatus.textContent = error.message;
            }
        } finally {
            els.aiRecommendSubmit.disabled = false;
        }
    }

    function toggleAiRecommendPanel() {
        if (!els.aiRecommendPanel || !els.aiRecommendToggle) return;
        const isOpen = !els.aiRecommendPanel.hidden;
        els.aiRecommendPanel.hidden = isOpen;
        els.aiRecommendToggle.setAttribute("aria-expanded", String(!isOpen));
        if (!isOpen) {
            els.aiRecommendPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
            els.aiRecommendInput.focus();
        }
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

    function getSelectedGenreId() {
        const raw = els.genre.value;
        if (!raw) return null;
        const id = parseInt(raw, 10);
        return isNaN(id) ? null : id;
    }

    function filterAndSortMovies(list) {
        let movies = sortMovies(list);
        const genreId = getSelectedGenreId();
        if (genreId) {
            movies = movies.filter(function (m) {
                return (m.genreIds || []).indexOf(genreId) !== -1;
            });
        }
        const term = els.search.value.trim().toLowerCase();
        if (term) {
            movies = movies.filter(function (m) {
                return m.title.toLowerCase().indexOf(term) !== -1;
            });
        }
        return movies;
    }

    // Append the next batch of cards and update the "Load more" button.
    function renderNextBatch() {
        const slice = visibleMovies.slice(renderedCount, renderedCount + BATCH_SIZE);
        els.list.insertAdjacentHTML("beforeend", slice.map(cardHtml).join(""));
        renderedCount += slice.length;
        els.loadMore.hidden = renderedCount >= visibleMovies.length;
    }

    // Applies sort, genre, and search locally, then renders the first batch.
    function applySearchAndRender(updateHighlights) {
        saveState();

        visibleMovies = filterAndSortMovies(state.movies);
        renderedCount = 0;

        if (!visibleMovies.length) {
            showStatus(isNowPlaying() ? "emptyNowPlaying" : "empty", false);
            renderMeta(0);
            if (updateHighlights !== false) {
                renderHighlights([]);
            }
            return;
        }

        hideStatus();
        els.list.innerHTML = "";
        renderNextBatch();
        renderMeta(visibleMovies.length);
        if (updateHighlights !== false) {
            renderHighlights(visibleMovies);
        }
    }

    // ---- Cinematic highlights (hero + featured + most anticipated) --------

    function setHeroBackdrop(url) {
        if (!url) {
            els.heroBg.classList.remove("loaded");
            els.heroBg.style.backgroundImage = "";
            return;
        }
        preloadBackdrop(url).then(function (loadedUrl) {
            if (!loadedUrl) return;
            els.heroBg.style.backgroundImage = "url('" + loadedUrl + "')";
            els.heroBg.classList.add("loaded");
        });
    }

    function featuredHtml(movie) {
        const media = movie.backdropUrl || movie.posterUrl || "";
        const href = movieDetailHref(movie);
        return (
            '<div class="featured-card">' +
            '<div class="featured-media" style="background-image:url(\'' +
            media + '\')"></div>' +
            '<div class="featured-body">' +
            '<p class="featured-label">' + t(isNowPlaying() ? "featuredLabelNow" : "featuredLabel") + "</p>" +
            '<h3 class="featured-title">' + escapeHtml(movie.title) + "</h3>" +
            '<p class="release-date">' +
            escapeHtml(formatMovieDateLine(movie)) + "</p>" +
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
    const modeDataCache = new Map();
    const MODE_CACHE_TTL_MS = 15 * 60 * 1000;

    function buildFetchKey(mode, region, originalLanguage, siteLang, daysAhead,
                          sortBy, sortOrder) {
        return [
            mode,
            region,
            originalLanguage || "",
            siteLang,
            mode === "upcoming" ? daysAhead : "",
            sortBy,
            sortOrder,
        ].join("|");
    }

    function applyMovieData(data, token) {
        if (token !== requestToken) return;
        syncGenresFromMeta(data.meta);
        state.movies = data.movies;
        state.meta = data.meta;
        applySearchAndRender();
        preloadBackdrops(data.movies);
    }

    function prefetchOtherMode(currentKey) {
        const mode = getMode();
        const otherMode = mode === "nowPlaying" ? "upcoming" : "nowPlaying";
        const region = els.region.value || "US";
        const originalLanguage = els.originalLanguage.value || "";
        const daysAhead = normalizeDaysAhead();
        const sortDefaults = getDefaultSort(otherMode);
        const sortBy = sortDefaults.sortBy;
        const sortOrder = sortDefaults.sortOrder;
        const prefetchKey = buildFetchKey(
            otherMode, region, originalLanguage, siteLanguage, daysAhead,
            sortBy, sortOrder
        );
        if (modeDataCache.has(prefetchKey)) return;

        const params = new URLSearchParams({
            mode: otherMode,
            region: region,
            siteLanguage: siteLanguage,
            originalLanguage: originalLanguage,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        if (otherMode === "upcoming") {
            params.set("daysAhead", String(daysAhead));
        }

        fetch("/api/upcoming-movies?" + params.toString())
            .then(function (response) {
                if (!response.ok) return null;
                return response.json();
            })
            .then(function (data) {
                if (!data) return;
                modeDataCache.set(prefetchKey, {
                    data: data,
                    fetchedAt: Date.now(),
                });
                preloadBackdrops(data.movies);
                console.log(
                    "%c[perf] prefetch " + otherMode,
                    "color:#888",
                    { movies: data.movies.length }
                );
            })
            .catch(function () { /* ignore background prefetch errors */ });
    }

    function loadMovies() {
        siteLanguage = siteLanguage || "en";
        const mode = getMode();

        const region = els.region.value || "US";
        const originalLanguage = els.originalLanguage.value || "";
        const daysAhead = normalizeDaysAhead();
        if (mode === "upcoming") {
            els.daysAhead.value = daysAhead;
        }
        const sortBy = els.sortField.value || "release";
        const sortOrder = els.sortOrder.value || "asc";

        saveState();

        const params = new URLSearchParams({
            mode: mode,
            region: region,
            siteLanguage: siteLanguage,
            originalLanguage: originalLanguage,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        if (mode === "upcoming") {
            params.set("daysAhead", String(daysAhead));
        }

        const fetchKey = buildFetchKey(
            mode, region, originalLanguage, siteLanguage, daysAhead,
            sortBy, sortOrder
        );
        const cached = modeDataCache.get(fetchKey);
        const cacheFresh = cached &&
            (Date.now() - cached.fetchedAt) < MODE_CACHE_TTL_MS;

        const token = ++requestToken;
        const startedAt = performance.now();

        if (cached) {
            applyMovieData(cached.data, token);
        } else {
            renderSkeletons(BATCH_SIZE);
        }
        clearBackdrop();

        if (cacheFresh) {
            prefetchOtherMode(fetchKey);
            return;
        }

        fetch("/api/upcoming-movies?" + params.toString())
            .then(function (response) {
                if (!response.ok) throw new Error("Request failed: " + response.status);
                return response.json();
            })
            .then(function (data) {
                if (token !== requestToken) return;
                modeDataCache.set(fetchKey, {
                    data: data,
                    fetchedAt: Date.now(),
                });
                applyMovieData(data, token);

                // ---- Performance / debug metrics ----
                const roundTripMs = Math.round(performance.now() - startedAt);
                const fromCache = cached && !data.meta.cacheHit ? "CLIENT_CACHE_STALE" : null;
                console.log(
                    "%c[perf] " + (data.meta.mode || mode),
                    "color:#d4af37;font-weight:bold",
                    {
                        source: fromCache || (data.meta.cacheHit ? "CACHE_HIT" : "TMDB_FETCH"),
                        pagesFetched: data.meta.pagesFetched,
                        serverFetchMs: data.meta.fetchMs,
                        roundTripMs: roundTripMs,
                        clientCache: Boolean(cached),
                        moviesBeforeFilter: data.meta.rawCount,
                        moviesAfterFilter: data.meta.filteredCount,
                        moviesReturned: data.movies.length,
                        moviesRendered: renderedCount,
                    }
                );
                prefetchOtherMode(fetchKey);
            })
            .catch(function (error) {
                if (token !== requestToken) return;
                if (!cached) {
                    console.error("Failed to load movies:", error);
                    showStatus("error", true);
                }
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
        resetDrawerTransform();
    }

    function closeDrawer() {
        document.body.classList.remove("drawer-open");
        els.filtersTrigger.setAttribute("aria-expanded", "false");
        resetDrawerTransform();
    }

    function resetDrawerTransform() {
        els.filtersDrawer.style.transition = "";
        els.filtersDrawer.style.transform = "";
        if (els.drawerDragArea) {
            els.drawerDragArea.classList.remove("is-dragging");
        }
    }

    function initDrawerDrag() {
        if (!els.drawerDragArea) return;

        let startY = 0;
        let dragging = false;
        const closeThreshold = 72;

        function pointerY(event) {
            return event.touches ? event.touches[0].clientY : event.clientY;
        }

        function onStart(event) {
            if (!isDrawerOpen()) return;
            dragging = true;
            startY = pointerY(event);
            els.drawerDragArea.classList.add("is-dragging");
            els.filtersDrawer.style.transition = "none";
        }

        function onMove(event) {
            if (!dragging) return;
            const delta = Math.max(0, pointerY(event) - startY);
            els.filtersDrawer.style.transform = "translateY(" + delta + "px)";
            if (event.cancelable) event.preventDefault();
        }

        function onEnd(event) {
            if (!dragging) return;
            dragging = false;
            els.drawerDragArea.classList.remove("is-dragging");
            const delta = (event.changedTouches
                ? event.changedTouches[0].clientY
                : event.clientY) - startY;
            resetDrawerTransform();
            if (delta >= closeThreshold) closeDrawer();
        }

        els.drawerDragArea.addEventListener("touchstart", onStart, { passive: true });
        els.drawerDragArea.addEventListener("touchmove", onMove, { passive: false });
        els.drawerDragArea.addEventListener("touchend", onEnd);
        els.drawerDragArea.addEventListener("touchcancel", onEnd);
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
        resetFiltersToDefaults();
        applyModeSortDefaults();
        loadMovies();
    }

    // ---- Wire up events --------------------------------------------------

    els.langButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (btn.classList.contains("is-active")) return;
            syncSiteLanguage(btn.dataset.lang);
            loadGenres().then(function () {
                applyTranslations();
                loadMovies();
            });
        });
    });

    els.modeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (btn.classList.contains("is-active")) return;
            setMode(btn.dataset.mode);
            resetFiltersToDefaults({ keepSiteLanguage: true });
            applyModeSortDefaults();
            loadMovies();
        });
    });

    // Refetch only when the inputs that change the underlying data set change.
    els.region.addEventListener("change", loadMovies);
    els.originalLanguage.addEventListener("change", loadMovies);
    els.genre.addEventListener("change", applySearchAndRender);

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

    // Backdrop hover via delegation on .page (catalog + most anticipated cards).
    if (els.page) {
        els.page.addEventListener("mouseover", handleCardBackdropHover);
        els.page.addEventListener("mouseleave", handlePageBackdropLeave);
    }

    initDrawerDrag();

    // Hero call-to-action and scroll hint both jump to the catalog.
    els.exploreCta.addEventListener("click", scrollToCatalog);
    els.heroScroll.addEventListener("click", scrollToCatalog);

    if (els.aiRecommendToggle) {
        els.aiRecommendToggle.addEventListener("click", toggleAiRecommendPanel);
    }
    if (els.aiRecommendForm) {
        els.aiRecommendForm.addEventListener("submit", submitAiRecommendations);
    }

    // Back/forward navigation: re-apply whatever state the URL now holds.
    window.addEventListener("popstate", function () {
        applyState(readStateFromUrl() || Object.assign({}, DEFAULTS));
        loadMovies();
    });

    // ---- Initial load ----------------------------------------------------

    // Restore from the URL first (shareable), then localStorage, then defaults.
    const urlState = readStateFromUrl();
    const storageState = readStateFromStorage();
    let initialState = urlState || storageState;
    if (!initialState) {
        initialState = Object.assign({}, DEFAULTS);
        const sortDefaults = getDefaultSort(initialState.mode);
        initialState.sortBy = sortDefaults.sortBy;
        initialState.sortOrder = sortDefaults.sortOrder;
    }
    loadGenres().then(function () {
        applyState(initialState);
        loadMovies();
    });
})();
