(function attachStateModule() {
  const VALID_TABS = ["mods", "resourcepacks", "shaders"];
  const VALID_VIEWS = ["home", "search", "share"];
  const VALID_VIEW_MODES = ["list", "grid"];
  const VALID_BROWSE_TABS = ["mods", "resourcepacks", "shaders"];
  const VALID_SEARCH_SOURCES = ["modrinth", "curseforge"];
  const EMPTY_SEARCH_RESULTS = [];
  const VIEW_MODE_STORAGE_KEY = "packtracker_view_modes_v1";
  const FAVORITES_PROFILE_ID = "__favorites__";
  const namespace = (window.PackTracker = window.PackTracker || {});

  /**
   * Loads persisted list/grid preferences for the UI.
   *
   * @returns {{mods:string, resourcepacks:string, shaders:string, browse:string}} View mode map.
   */
  function loadViewModes() {
    const fallback = {
      mods: "list",
      resourcepacks: "list",
      shaders: "list",
      browse: "list",
    };

    try {
      const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      return {
        mods: VALID_VIEW_MODES.includes(parsed?.mods) ? parsed.mods : fallback.mods,
        resourcepacks: VALID_VIEW_MODES.includes(parsed?.resourcepacks) ? parsed.resourcepacks : fallback.resourcepacks,
        shaders: VALID_VIEW_MODES.includes(parsed?.shaders) ? parsed.shaders : fallback.shaders,
        browse: VALID_VIEW_MODES.includes(parsed?.browse) ? parsed.browse : fallback.browse,
      };
    } catch (error) {
      return fallback;
    }
  }

  const AppState = {
    activeProfileId: null,
    activeTab: "mods",
    activeView: "home",
    searchSource: "modrinth",
    search: {
      query: "",
      projectType: "mod",
      loader: "",
      gameVersion: "",
      results: EMPTY_SEARCH_RESULTS,
      loading: false,
      offset: 0,
      totalHits: 0,
    },
    browseContext: {
      defaultTab: "mods",
    },
    data: null,
    settings: null,
    dirty: false,
    viewModes: loadViewModes(),
  };

  const listeners = new Set();

  /**
   * Registers a state-change listener used by the entry point to rerender views.
   *
   * @param {(detail:{reason:string}) => void} listener - Callback fired after state mutation.
   * @returns {() => void} Unsubscribe function.
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Broadcasts state updates to all active listeners.
   *
   * @param {string} reason - Reason label for the current update.
   */
  function notifyStateChanged(reason = "update") {
    listeners.forEach((listener) => {
      listener({ reason });
    });
  }

  /**
   * Replaces the in-memory persisted data object.
   *
   * @param {object} data - Normalized storage payload.
   */
  function setData(data) {
    AppState.data = data;
    notifyStateChanged("data");
  }

  /**
   * Selects the active profile when the id exists in state.
   *
   * @param {string|null} id - Profile identifier or null to clear selection.
   * @returns {boolean} True when the selection changed.
   */
  function setActiveProfile(id) {
    if (id === null) {
      if (AppState.activeProfileId === null) {
        return false;
      }
      AppState.activeProfileId = null;
      notifyStateChanged("active-profile");
      return true;
    }

    if (id === FAVORITES_PROFILE_ID) {
      if (AppState.activeProfileId === id) {
        return false;
      }
      AppState.activeProfileId = id;
      notifyStateChanged("active-profile");
      return true;
    }

    const profiles = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];
    const exists = profiles.some((profile) => profile.id === id);
    if (!exists || AppState.activeProfileId === id) {
      return false;
    }

    AppState.activeProfileId = id;
    notifyStateChanged("active-profile");
    return true;
  }

  /**
   * Updates the active tab shown in the profile content area.
   *
   * @param {string} tab - One of the supported profile tabs.
   * @returns {boolean} True when the tab changed.
   */
  function setActiveTab(tab) {
    if (!VALID_TABS.includes(tab) || AppState.activeTab === tab) {
      return false;
    }

    AppState.activeTab = tab;
    notifyStateChanged("active-tab");
    return true;
  }

  /**
   * Switches between the profile manager and Modrinth search views.
   *
   * @param {string} view - View identifier.
   * @returns {boolean} True when the view changed.
   */
  function setActiveView(view) {
    if (!VALID_VIEWS.includes(view) || AppState.activeView === view) {
      return false;
    }

    AppState.activeView = view;
    notifyStateChanged("active-view");
    return true;
  }

  /**
   * Applies a partial update to the search sub-state and optionally resets pagination.
   *
   * @param {object} patch - Search state fields to merge in.
   * @param {{ notify?: boolean }} [options] - Optional render control.
   */
  function setSearchState(patch, options = {}) {
    AppState.search = {
      ...AppState.search,
      ...patch,
    };

    if (options.notify !== false) {
      notifyStateChanged("search");
    }
  }

  /**
   * Replaces the current search results list while keeping the rest of search state intact.
   *
   * @param {Array<object>} results - Next search result list.
   * @param {boolean} append - Whether to append to existing results.
   */
  function setSearchResults(results, append = false) {
    AppState.search.results = append ? [...AppState.search.results, ...results] : [...results];
    notifyStateChanged("search-results");
  }

  /**
   * Switches the active browse/search data source.
   *
   * @param {"modrinth"|"curseforge"} source - Search source identifier.
   * @returns {boolean} True when the source changed.
   */
  function setSearchSource(source) {
    if (!VALID_SEARCH_SOURCES.includes(source) || AppState.searchSource === source) {
      return false;
    }

    AppState.searchSource = source;
    notifyStateChanged("search-source");
    return true;
  }

  /**
   * Stores the desired default browse tab before navigating into the search page.
   *
   * @param {"mods"|"resourcepacks"|"shaders"} tab - Requested browse tab.
   * @returns {boolean} True when the context changed.
   */
  function setBrowseContext(tab) {
    const safeTab = VALID_BROWSE_TABS.includes(tab) ? tab : "mods";
    if (AppState.browseContext.defaultTab === safeTab) {
      return false;
    }

    AppState.browseContext = {
      ...AppState.browseContext,
      defaultTab: safeTab,
    };
    return true;
  }

  /**
   * Marks whether the current UI has unsaved transient work.
   *
   * @param {boolean} dirty - Dirty flag value.
   */
  function setDirtyState(dirty) {
    AppState.dirty = Boolean(dirty);
    notifyStateChanged("dirty");
  }

  /**
   * Updates a persisted list/grid preference for one UI scope.
   *
   * @param {"mods"|"resourcepacks"|"shaders"|"browse"} scope - View mode scope.
   * @param {"list"|"grid"} mode - Layout mode.
   * @returns {boolean} True when the mode changed.
   */
  function setViewMode(scope, mode) {
    if (!Object.prototype.hasOwnProperty.call(AppState.viewModes, scope) || !VALID_VIEW_MODES.includes(mode)) {
      return false;
    }

    if (AppState.viewModes[scope] === mode) {
      return false;
    }

    AppState.viewModes = {
      ...AppState.viewModes,
      [scope]: mode,
    };

    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify(AppState.viewModes));
    } catch (error) {
      console.warn("PackTracker: failed to save view mode preference", error);
    }

    notifyStateChanged("view-mode");
    return true;
  }

  /**
   * Returns the current list/grid preference for one UI scope.
   *
   * @param {"mods"|"resourcepacks"|"shaders"|"browse"} scope - View mode scope.
   * @returns {"list"|"grid"} Active mode.
   */
  function getViewMode(scope) {
    return AppState.viewModes?.[scope] === "grid" ? "grid" : "list";
  }

  /**
   * Returns the currently selected profile object, if any.
   *
   * @returns {object|null} Active profile or null.
   */
  function getActiveProfile() {
    if (AppState.activeProfileId === FAVORITES_PROFILE_ID) {
      return getFavoritesProfile();
    }

    const profiles = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];
    return profiles.find((profile) => profile.id === AppState.activeProfileId) ?? null;
  }

  /**
   * Returns true when the given id points to the virtual favorites profile.
   *
   * @param {string|null} id - Active profile id candidate.
   * @returns {boolean} Favorite-profile flag.
   */
  function isFavoritesProfileId(id) {
    return id === FAVORITES_PROFILE_ID;
  }

  /**
   * Builds the virtual favorites profile from starred items across every saved profile.
   *
   * @returns {object} Virtual favorites profile.
   */
  function getFavoritesProfile() {
    const profiles = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];
    const favorites = {
      id: FAVORITES_PROFILE_ID,
      name: "Favorites",
      mcVersion: "All versions",
      loader: "vanilla",
      loaderVersion: "",
      createdAt: 0,
      mods: [],
      resourcePacks: [],
      shaders: [],
      isVirtual: true,
    };

    profiles.forEach((profile) => {
      profile.mods
        .filter((item) => item.starred)
        .forEach((item) => {
          favorites.mods.push({
            ...item,
            sourceProfileId: profile.id,
            sourceProfileName: profile.name,
          });
        });

      profile.resourcePacks
        .filter((item) => item.starred)
        .forEach((item) => {
          favorites.resourcePacks.push({
            ...item,
            sourceProfileId: profile.id,
            sourceProfileName: profile.name,
          });
        });

      profile.shaders
        .filter((item) => item.starred)
        .forEach((item) => {
          favorites.shaders.push({
            ...item,
            sourceProfileId: profile.id,
            sourceProfileName: profile.name,
          });
        });
    });

    return favorites;
  }

  Object.assign(namespace, {
    AppState,
    FAVORITES_PROFILE_ID,
    subscribe,
    notifyStateChanged,
    setData,
    setActiveProfile,
    setActiveTab,
    setActiveView,
    setSearchSource,
    setSearchState,
    setSearchResults,
    setBrowseContext,
    setDirtyState,
    setViewMode,
    getViewMode,
    getActiveProfile,
    isFavoritesProfileId,
    getFavoritesProfile,
  });
})();
