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
            heroAiTeaseLead: "Need help choosing?",
            heroAiAction: "Ask our AI →",
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
            aiRecommendToggle: "AI Recommendations",
            aiRecommendTitle: "AI Recommendations",
            aiRecommendWindow: "Upcoming window",
            aiRecommendScopeTitle: "The AI will search:",
            aiRecommendScopeNow: "Movies currently in theaters",
            aiRecommendScopeUpcoming: "Upcoming movies within the next {days} days",
            aiRecommendLabel: "What are you in the mood for?",
            aiRecommendPlaceholder: "What are you in the mood for?",
            aiRecommendSubmit: "Get recommendations",
            aiRecommendResults: "Picked for you",
            aiRecommendLoading: "Finding the best matches…",
            aiRecommendLoadingCatalog: "Building your search catalog…",
            aiRecommendLoadingAnalyzing: "Finding the best matches…",
            aiRecommendStreamingIntro: "I'm looking through movies in theaters and coming soon…",
            aiRecommendError: "Could not get recommendations. Please try again.",
            aiRecommendEmptyCatalog: "No movies found for this region and window. Try another region or a wider window.",
            aiRecommendReason: "Why it matches:",
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
            heroAiTeaseLead: "Precisa de ajuda para escolher?",
            heroAiAction: "Pergunte à nossa IA →",
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
            aiRecommendTitle: "Recomendações da IA",
            aiRecommendWindow: "Período futuro",
            aiRecommendScopeTitle: "A IA vai buscar:",
            aiRecommendScopeNow: "Filmes em cartaz agora",
            aiRecommendScopeUpcoming: "Próximos lançamentos nos próximos {days} dias",
            aiRecommendLabel: "O que você quer assistir?",
            aiRecommendPlaceholder: "O que você gostaria de assistir?",
            aiRecommendSubmit: "Obter recomendações",
            aiRecommendResults: "Escolhidos para você",
            aiRecommendLoading: "Buscando as melhores opções…",
            aiRecommendLoadingCatalog: "Montando o catálogo de busca…",
            aiRecommendLoadingAnalyzing: "Buscando as melhores opções…",
            aiRecommendStreamingIntro: "Estou analisando filmes em cartaz e em breve…",
            aiRecommendError: "Não foi possível obter recomendações. Tente novamente.",
            aiRecommendEmptyCatalog: "Nenhum filme encontrado para esta região e período. Tente outra região ou um período maior.",
            aiRecommendReason: "Por que combina:",
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
        hero: document.getElementById("hero"),
        heroCaption: document.getElementById("hero-caption"),
        exploreCta: document.getElementById("explore-cta"),
        heroAiCta: document.getElementById("hero-ai-cta"),
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
        heroTitle: document.querySelector(".hero-title"),
        heroSubtitle: document.querySelector(".hero-sub"),
        aiRecommendToggle: document.getElementById("ai-recommend-toggle"),
        aiRecommend: document.getElementById("ai-recommend"),
        aiRecommendPanel: document.getElementById("ai-recommend-panel"),
        aiRecommendForm: document.getElementById("ai-recommend-form"),
        aiRecommendInput: document.getElementById("ai-recommend-input"),
        aiRecommendSubmit: document.getElementById("ai-recommend-submit"),
        aiRecommendStatus: document.getElementById("ai-recommend-status"),
        aiRecommendOutput: document.getElementById("ai-recommend-output"),
        aiRecommendSummary: document.getElementById("ai-recommend-summary"),
        aiRecommendResults: document.getElementById("ai-recommend-results"),
        aiRecommendResultsTitle: document.getElementById("ai-recommend-results-title"),
        aiRecommendGrid: document.getElementById("ai-recommend-grid"),
        aiRecommendRegion: document.getElementById("ai-recommend-region"),
        aiRecommendDays: document.getElementById("ai-recommend-days"),
        aiRecommendScopeUpcoming: document.getElementById("ai-recommend-scope-upcoming"),
    };

    let siteLanguage = "en";
    let cachedGenres = [];
    let genresLanguage = "";

    // How many cards to add per render batch (initial paint + each "Load more").
    const BATCH_SIZE = 24;

    const AI_DAYS_OPTIONS = [30, 60, 90, 120, 180, 365];
    const AI_CATALOG_CACHE_TTL_MS = 15 * 60 * 1000;
    const aiCatalogCache = new Map();
    const DAYS_MIN = 1;
    const DAYS_MAX = 365;
    const DAYS_FALLBACK = 60;
    // Idle delay before a half-typed days-ahead value is auto-applied.
    const DAYS_IDLE_MS = 10000;

    // Holds the most recent server response so search/sort can run without refetch.
    const state = { movies: [], meta: null, aiCatalog: [] };

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

    function populateAiRecommendControls() {
        if (els.aiRecommendRegion) {
            populateSelect(els.aiRecommendRegion, REGIONS);
            if (!els.aiRecommendRegion.value) {
                els.aiRecommendRegion.value = els.region.value || DEFAULTS.region;
            }
        }
        if (els.aiRecommendDays) {
            const current = els.aiRecommendDays.value;
            els.aiRecommendDays.innerHTML = "";
            AI_DAYS_OPTIONS.forEach(function (days) {
                const option = document.createElement("option");
                option.value = String(days);
                option.textContent = days + " " + (siteLanguage === "pt" ? "dias" : "days");
                els.aiRecommendDays.appendChild(option);
            });
            const fallbackDays = String(normalizeDaysAhead());
            els.aiRecommendDays.value = current || fallbackDays;
            if (!els.aiRecommendDays.value) {
                els.aiRecommendDays.value = String(DAYS_FALLBACK);
            }
        }
        updateAiRecommendScopeCopy();
    }

    function getAiRecommendRegion() {
        return (els.aiRecommendRegion && els.aiRecommendRegion.value) ||
            els.region.value ||
            DEFAULTS.region;
    }

    function getAiRecommendDaysAhead() {
        const parsed = parseInt(
            (els.aiRecommendDays && els.aiRecommendDays.value) || DAYS_FALLBACK,
            10
        );
        if (isNaN(parsed)) return DAYS_FALLBACK;
        return Math.max(DAYS_MIN, Math.min(DAYS_MAX, parsed));
    }

    function updateAiRecommendScopeCopy() {
        if (!els.aiRecommendScopeUpcoming) return;
        const days = getAiRecommendDaysAhead();
        els.aiRecommendScopeUpcoming.textContent = t("aiRecommendScopeUpcoming")
            .replace("{days}", String(days));
    }

    function buildAiCatalogCacheKey(region, daysAhead) {
        return [region, daysAhead, siteLanguage].join("|");
    }

    async function fetchModeMoviesForAi(mode, region, daysAhead) {
        const sortDefaults = getDefaultSort(mode);
        const params = new URLSearchParams({
            mode: mode,
            region: region,
            siteLanguage: siteLanguage,
            originalLanguage: "",
            sortBy: sortDefaults.sortBy,
            sortOrder: sortDefaults.sortOrder,
        });
        if (mode === "upcoming") {
            params.set("daysAhead", String(daysAhead));
        }
        const response = await fetch("/api/upcoming-movies?" + params.toString());
        if (!response.ok) {
            throw new Error(t("aiRecommendError"));
        }
        const data = await response.json();
        return data.movies || [];
    }

    function mergeCombinedAiCatalog(nowPlaying, upcoming) {
        const byId = new Map();
        nowPlaying.forEach(function (movie) {
            byId.set(movie.id, Object.assign({}, movie, { availability: "nowPlaying" }));
        });
        upcoming.forEach(function (movie) {
            if (byId.has(movie.id)) {
                return;
            }
            byId.set(movie.id, Object.assign({}, movie, { availability: "upcoming" }));
        });
        return Array.from(byId.values());
    }

    async function fetchCombinedAiCatalog(region, daysAhead) {
        const cacheKey = buildAiCatalogCacheKey(region, daysAhead);
        const cached = aiCatalogCache.get(cacheKey);
        if (cached && (Date.now() - cached.fetchedAt) < AI_CATALOG_CACHE_TTL_MS) {
            return cached.movies.slice();
        }

        const results = await Promise.all([
            fetchModeMoviesForAi("nowPlaying", region, daysAhead),
            fetchModeMoviesForAi("upcoming", region, daysAhead),
        ]);
        const combined = mergeCombinedAiCatalog(results[0], results[1]);
        aiCatalogCache.set(cacheKey, {
            movies: combined,
            fetchedAt: Date.now(),
        });
        return combined.slice();
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
        populateAiRecommendControls();
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

    function resolveRecommendNarrative(summary, recommendations) {
        var text = (summary || "").trim();
        var list = recommendations || [];
        var reasons = list.map(function (rec) {
            var reason = (rec.reason || "").trim();
            var title = (rec.title || "").trim();
            if (!reason) return "";
            if (title && reason.toLowerCase().indexOf(title.toLowerCase()) === -1) {
                return title + " — " + reason;
            }
            return reason;
        }).filter(Boolean);

        if (text.length >= 120) return text;

        var count = list.length;
        if (!text && count > 0) {
            if (siteLanguage === "pt") {
                text = count === 1
                    ? "Analisei o catálogo atual e encontrei 1 filme que combina com o seu pedido."
                    : "Analisei o catálogo atual e encontrei " + count +
                        " filmes que combinam com o seu pedido.";
            } else {
                text = count === 1
                    ? "I looked through the current catalog and found 1 movie that matches your request."
                    : "I looked through the current catalog and found " + count +
                        " movies that match your request.";
            }
        }

        if (reasons.length) {
            return text + (text ? "\n\n" : "") + reasons.join("\n\n");
        }
        return text;
    }

    let aiStreamText = "";

    function setAiRecommendStreamingNarrative(text, isStreaming) {
        if (!els.aiRecommendSummary) return;
        var narrativeText = text || "";
        if (!narrativeText) {
            els.aiRecommendSummary.textContent = "";
            els.aiRecommendSummary.classList.remove("is-visible", "is-streaming");
            els.aiRecommendSummary.setAttribute("hidden", "");
            return;
        }
        els.aiRecommendSummary.textContent = narrativeText;
        els.aiRecommendSummary.classList.add("is-visible");
        els.aiRecommendSummary.classList.toggle("is-streaming", !!isStreaming);
        els.aiRecommendSummary.removeAttribute("hidden");
    }

    function appendAiStreamDelta(chunk) {
        aiStreamText += chunk || "";
        setAiRecommendStreamingNarrative(aiStreamText, true);
    }

    function showAiRecommendStreamingStart() {
        hideAiRecommendOutput();
        aiStreamText = "";
        if (els.aiRecommendOutput) {
            els.aiRecommendOutput.hidden = false;
            els.aiRecommendOutput.removeAttribute("hidden");
        }
        if (els.aiRecommendResultsTitle) {
            els.aiRecommendResultsTitle.hidden = false;
            els.aiRecommendResultsTitle.removeAttribute("hidden");
        }
        if (els.aiRecommendGrid) {
            els.aiRecommendGrid.innerHTML = "";
        }
        setAiRecommendStreamingNarrative(t("aiRecommendStreamingIntro"), true);
    }

    function parseRecommendSseEvent(raw, handlers) {
        var eventName = "message";
        var dataLines = [];
        raw.split("\n").forEach(function (line) {
            if (line.indexOf("event:") === 0) {
                eventName = line.slice(6).trim();
            } else if (line.indexOf("data:") === 0) {
                dataLines.push(line.slice(5).trim());
            }
        });
        if (!dataLines.length) return;
        var payload;
        try {
            payload = JSON.parse(dataLines.join("\n"));
        } catch (error) {
            return;
        }
        if (eventName === "delta" && payload.text) {
            handlers.onDelta(payload.text);
        } else if (eventName === "done") {
            handlers.onDone(payload);
        } else if (eventName === "error") {
            handlers.onError(payload.error || t("aiRecommendError"));
        }
    }

    async function consumeRecommendSse(response, handlers) {
        if (!response.body) {
            throw new Error(t("aiRecommendError"));
        }
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            var boundary;
            while ((boundary = buffer.indexOf("\n\n")) >= 0) {
                var rawEvent = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                parseRecommendSseEvent(rawEvent, handlers);
            }
        }
        if (buffer.trim()) {
            parseRecommendSseEvent(buffer, handlers);
        }
    }

    async function tryRecommendStream(payload) {
        var response = await fetch("/api/recommend/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            body: JSON.stringify(payload),
        });

        if (response.status === 404) {
            return false;
        }

        var contentType = response.headers.get("content-type") || "";
        if (!response.ok) {
            if (contentType.indexOf("application/json") >= 0) {
                var errorData = await response.json().catch(function () { return {}; });
                throw new Error(errorData.error || t("aiRecommendError"));
            }
            return false;
        }

        if (contentType.indexOf("text/event-stream") < 0) {
            return false;
        }

        var finished = false;
        await consumeRecommendSse(response, {
            onDelta: function (text) {
                if (aiStreamText === t("aiRecommendStreamingIntro")) {
                    aiStreamText = "";
                }
                appendAiStreamDelta(text);
            },
            onDone: function (data) {
                finished = true;
                if (els.aiRecommendSummary) {
                    els.aiRecommendSummary.classList.remove("is-streaming");
                }
                clearAiRecommendStatus();
                var apiSummary = data.summary || data.narrative || data.explanation || "";
                renderAiRecommendations(apiSummary, data.recommendations || []);
            },
            onError: function (message) {
                throw new Error(message || t("aiRecommendError"));
            },
        });

        if (!finished) {
            throw new Error(t("aiRecommendError"));
        }
        return true;
    }

    async function submitAiRecommendationsFallback(payload) {
        showAiRecommendOutputLoading();
        var response = await fetch("/api/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) {
            throw new Error(data.error || t("aiRecommendError"));
        }
        clearAiRecommendStatus();
        var apiSummary = data.summary || data.narrative || data.explanation || "";
        renderAiRecommendations(apiSummary, data.recommendations || []);
    }

    function setAiRecommendNarrative(text) {
        if (!els.aiRecommendSummary) return;
        var narrativeText = (text || "").trim();
        if (!narrativeText) {
            els.aiRecommendSummary.innerHTML = "";
            els.aiRecommendSummary.classList.remove("is-visible");
            els.aiRecommendSummary.setAttribute("hidden", "");
            return;
        }
        els.aiRecommendSummary.innerHTML = formatAiNarrative(narrativeText);
        els.aiRecommendSummary.classList.add("is-visible");
        els.aiRecommendSummary.classList.remove("is-streaming");
        els.aiRecommendSummary.removeAttribute("hidden");
    }

    function formatAiNarrative(text) {
        var trimmed = (text || "").trim();
        if (!trimmed) return "";
        var paragraphs = trimmed.split(/\n\s*\n/);
        if (paragraphs.length === 1 && trimmed.indexOf("\n") >= 0) {
            paragraphs = trimmed.split("\n");
        }
        return paragraphs
            .map(function (part) { return part.trim(); })
            .filter(Boolean)
            .map(function (part) {
                return "<p>" + escapeHtml(part) + "</p>";
            })
            .join("");
    }

    function recommendPosterHtml(movie) {
        const initial = escapeHtml((movie.title || "?").trim().charAt(0) || "?");
        const alt = escapeHtml((movie.title || "Movie") + " poster");
        const fallback =
            '<div class="recommend-poster__fallback" aria-hidden="true">' +
            "<span>" + initial + "</span></div>";
        if (!movie.posterUrl) {
            return '<div class="recommend-poster is-empty">' + fallback + "</div>";
        }
        return (
            '<div class="recommend-poster">' +
            '<img class="recommend-poster__img" src="' +
            escapeHtml(movie.posterUrl) + '" alt="' + alt + '" loading="lazy">' +
            fallback +
            "</div>"
        );
    }

    function bindRecommendPosterFallbacks(container) {
        if (!container) return;
        container.querySelectorAll(".recommend-poster__img").forEach(function (img) {
            img.addEventListener("error", function () {
                var frame = img.closest(".recommend-poster");
                if (frame) frame.classList.add("is-fallback");
            }, { once: true });
        });
    }

    function recommendationCardHtml(movie) {
        const href = movieDetailHref(movie);
        const genres = (movie.genres && movie.genres.length)
            ? '<p class="genres">' + escapeHtml(movie.genres.slice(0, 3).join(" • ")) + "</p>"
            : "";

        return (
            '<a class="card-link card-link--recommend" href="' + href + '">' +
            '<article class="movie-card movie-card--recommend">' +
            recommendPosterHtml(movie) +
            '<div class="movie-info">' +
            "<h2>" + escapeHtml(movie.title) + "</h2>" +
            '<p class="release-date">' +
            escapeHtml(formatMovieDateLine(movie)) + "</p>" +
            genres +
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
                popularity: movie.popularity || 0,
                posterUrl: movie.posterUrl || "",
                backdropUrl: movie.backdropUrl || "",
                availability: movie.availability || "",
            };
        });
    }

    function enrichRecommendationsFromCatalog(recommendations) {
        var byId = {};
        var sourceList = state.aiCatalog.length ? state.aiCatalog : state.movies;
        sourceList.forEach(function (movie) {
            byId[movie.id] = movie;
        });
        return (recommendations || []).map(function (rec) {
            var source = byId[rec.id] || {};
            return {
                id: rec.id,
                title: rec.title || source.title || "Untitled",
                reason: rec.reason || "",
                posterUrl: rec.posterUrl || source.posterUrl || "",
                backdropUrl: rec.backdropUrl || source.backdropUrl || "",
                releaseDate: rec.releaseDate || source.releaseDate || "",
                genres: (rec.genres && rec.genres.length) ? rec.genres : (source.genres || []),
            };
        });
    }

    function setAiRecommendStatus(messageKey, isError) {
        if (!els.aiRecommendStatus) return;
        els.aiRecommendStatus.hidden = false;
        els.aiRecommendStatus.textContent = t(messageKey);
        els.aiRecommendStatus.classList.toggle("error", !!isError);
        var isLoading = messageKey === "aiRecommendLoading" ||
            messageKey === "aiRecommendLoadingAnalyzing" ||
            messageKey === "aiRecommendLoadingCatalog";
        els.aiRecommendStatus.classList.toggle("is-loading", isLoading && !isError);
    }

    function clearAiRecommendStatus() {
        if (!els.aiRecommendStatus) return;
        els.aiRecommendStatus.hidden = true;
        els.aiRecommendStatus.textContent = "";
        els.aiRecommendStatus.classList.remove("error", "is-loading");
    }

    function hideAiRecommendOutput() {
        if (els.aiRecommendOutput) {
            els.aiRecommendOutput.hidden = true;
        }
        if (els.aiRecommendResultsTitle) {
            els.aiRecommendResultsTitle.hidden = true;
        }
        if (els.aiRecommendSummary) {
            els.aiRecommendSummary.innerHTML = "";
            els.aiRecommendSummary.classList.remove("is-visible", "is-streaming");
            els.aiRecommendSummary.setAttribute("hidden", "");
        }
        aiStreamText = "";
        if (els.aiRecommendGrid) {
            els.aiRecommendGrid.innerHTML = "";
        }
    }

    function showAiRecommendOutputLoading() {
        hideAiRecommendOutput();
        if (els.aiRecommendOutput) {
            els.aiRecommendOutput.hidden = false;
            els.aiRecommendOutput.removeAttribute("hidden");
        }
        renderAiRecommendSkeletons();
    }

    function recommendSkeletonCardHtml() {
        return (
            '<article class="movie-card movie-card--recommend skeleton" aria-hidden="true">' +
            '<div class="recommend-poster skeleton-box"></div>' +
            '<div class="movie-info">' +
            '<div class="skeleton-line skeleton-line--lg"></div>' +
            '<div class="skeleton-line skeleton-line--sm"></div>' +
            "</div></article>"
        );
    }

    function renderAiRecommendSkeletons() {
        if (els.aiRecommendResultsTitle) {
            els.aiRecommendResultsTitle.hidden = false;
            els.aiRecommendResultsTitle.removeAttribute("hidden");
        }
        if (els.aiRecommendSummary) {
            els.aiRecommendSummary.innerHTML =
                '<div class="ai-recommend__narrative-skeleton" aria-hidden="true">' +
                '<div class="skeleton-line skeleton-line--narrative"></div>' +
                '<div class="skeleton-line skeleton-line--narrative"></div>' +
                '<div class="skeleton-line skeleton-line--narrative skeleton-line--short"></div>' +
                "</div>";
            els.aiRecommendSummary.classList.add("is-visible");
            els.aiRecommendSummary.removeAttribute("hidden");
        }
        if (!els.aiRecommendGrid) return;
        els.aiRecommendGrid.innerHTML =
            recommendSkeletonCardHtml() +
            recommendSkeletonCardHtml() +
            recommendSkeletonCardHtml();
    }

    function renderAiRecommendations(summary, recommendations) {
        if (!els.aiRecommendResults) return;

        var list = enrichRecommendationsFromCatalog(recommendations || []);
        var narrativeText = resolveRecommendNarrative(summary, list);
        var hasNarrative = !!narrativeText.trim();
        var hasCards = list.length > 0;

        if (els.aiRecommendResultsTitle) {
            var showResults = hasNarrative || hasCards;
            els.aiRecommendResultsTitle.hidden = !showResults;
            if (showResults) {
                els.aiRecommendResultsTitle.removeAttribute("hidden");
            }
        }

        setAiRecommendNarrative(narrativeText);

        if (els.aiRecommendGrid) {
            els.aiRecommendGrid.innerHTML = hasCards
                ? list.map(function (rec) {
                    return recommendationCardHtml(rec);
                }).join("")
                : "";
            if (hasCards) {
                bindRecommendPosterFallbacks(els.aiRecommendGrid);
            }
        }

        els.aiRecommendResults.hidden = false;
        els.aiRecommendResults.removeAttribute("hidden");
        if (els.aiRecommendOutput) {
            els.aiRecommendOutput.hidden = false;
            els.aiRecommendOutput.removeAttribute("hidden");
        }
        if (hasCards) {
            preloadBackdrops(list);
        }
    }

    async function submitAiRecommendations(event) {
        if (event) event.preventDefault();
        if (!els.aiRecommendInput || !els.aiRecommendSubmit) return;

        const message = els.aiRecommendInput.value.trim();
        if (!message) {
            els.aiRecommendInput.focus();
            return;
        }

        const region = getAiRecommendRegion();
        const daysAhead = getAiRecommendDaysAhead();

        els.aiRecommendSubmit.disabled = true;
        clearAiRecommendStatus();
        setAiRecommendStatus("aiRecommendLoadingCatalog", false);

        let catalog;
        try {
            catalog = await fetchCombinedAiCatalog(region, daysAhead);
        } catch (error) {
            setAiRecommendStatus("aiRecommendError", true);
            hideAiRecommendOutput();
            els.aiRecommendSubmit.disabled = false;
            return;
        }

        state.aiCatalog = catalog;
        if (!catalog.length) {
            setAiRecommendStatus("aiRecommendEmptyCatalog", true);
            hideAiRecommendOutput();
            els.aiRecommendSubmit.disabled = false;
            return;
        }

        setAiRecommendStatus("aiRecommendLoading", false);

        const payload = {
            message: message,
            siteLanguage: siteLanguage,
            region: region,
            daysAhead: daysAhead,
            movies: compactCatalogForAi(catalog),
        };

        showAiRecommendStreamingStart();

        try {
            const streamed = await tryRecommendStream(payload);
            if (!streamed) {
                await submitAiRecommendationsFallback(payload);
            }
        } catch (error) {
            try {
                await submitAiRecommendationsFallback(payload);
            } catch (fallbackError) {
                setAiRecommendStatus("aiRecommendError", true);
                hideAiRecommendOutput();
                const messageText = (fallbackError && fallbackError.message) ||
                    (error && error.message) ||
                    t("aiRecommendError");
                if (messageText !== t("aiRecommendError")) {
                    els.aiRecommendStatus.textContent = messageText;
                }
            }
        } finally {
            els.aiRecommendSubmit.disabled = false;
        }
    }

    function openAiRecommendPanel() {
        if (!els.aiRecommendPanel || !els.aiRecommendToggle) return;
        els.aiRecommendPanel.hidden = false;
        els.aiRecommendToggle.setAttribute("aria-expanded", "true");
        if (els.catalog) {
            els.catalog.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        window.setTimeout(function () {
            if (els.aiRecommend) {
                els.aiRecommend.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
            if (els.aiRecommendInput) {
                els.aiRecommendInput.focus({ preventScroll: true });
            }
        }, 350);
    }

    function scrollToAiRecommend() {
        openAiRecommendPanel();
    }

    function toggleAiRecommendPanel() {
        if (!els.aiRecommendPanel || !els.aiRecommendToggle) return;
        const isOpen = !els.aiRecommendPanel.hidden;
        if (isOpen) {
            els.aiRecommendPanel.hidden = true;
            els.aiRecommendToggle.setAttribute("aria-expanded", "false");
            return;
        }
        openAiRecommendPanel();
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

    function pickHeroBackdropMovie(byPopularity, featuredId) {
        for (var i = 0; i < byPopularity.length; i++) {
            var movie = byPopularity[i];
            if (movie.id !== featuredId && movie.backdropUrl) {
                return movie;
            }
        }
        return null;
    }

    function setHeroBackdrop(url) {
        if (!url) {
            els.heroBg.classList.remove("loaded");
            els.heroBg.style.backgroundImage = "";
            if (els.hero) {
                els.hero.classList.add("hero--ambient");
            }
            return;
        }
        if (els.hero) {
            els.hero.classList.remove("hero--ambient");
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

        const featured = byPopularity[0];
        const heroMovie = pickHeroBackdropMovie(byPopularity, featured.id);
        if (heroMovie) {
            setHeroBackdrop(heroMovie.backdropUrl);
        } else {
            setHeroBackdrop(null);
        }
        els.heroCaption.textContent = "";

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
    if (els.heroAiCta) {
        els.heroAiCta.addEventListener("click", scrollToAiRecommend);
    }

    if (els.aiRecommendToggle) {
        els.aiRecommendToggle.addEventListener("click", toggleAiRecommendPanel);
    }
    if (els.aiRecommendForm) {
        els.aiRecommendForm.addEventListener("submit", submitAiRecommendations);
    }
    if (els.aiRecommendRegion) {
        els.aiRecommendRegion.addEventListener("change", updateAiRecommendScopeCopy);
    }
    if (els.aiRecommendDays) {
        els.aiRecommendDays.addEventListener("change", updateAiRecommendScopeCopy);
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
