(function attachMainModule() {
  const {
    AppState,
    setActiveProfile,
    setActiveView,
    setBrowseContext,
    setData,
    setSearchSource,
    setSearchState,
    subscribe,
    exportBackup,
    parseShareLink,
    importBackup,
    loadData,
    renderSidebar,
    showNewProfileModal,
    renderProfileView,
    focusSearchInput,
    renderSearchPage,
    renderShareView,
    requestBrowseSearch,
    showShareImportModal,
  } = window.PackTracker;

  const HOME_VIEW_ID = "view-home";
  const SEARCH_VIEW_ID = "view-search";
  const SHARE_VIEW_ID = "view-share";
  const APP_ROOT_ID = "app";
  const MODAL_ROOT_ID = "modal-root";
  const CONTEXT_ROOT_ID = "context-menu-root";
  const TOAST_ROOT_ID = "toast-root";
  const PAGE_ENTER_CLASS = "page-enter";
  const PAGE_EXIT_CLASS = "page-exit";
  const PAGE_EXIT_MS = 120;
  const PAGE_ENTER_MS = 240;
  let deferredInstallPrompt = null;
  const PROJECT_TYPE_TO_TAB = {
    mod: "mods",
    resourcepack: "resourcepacks",
    shader: "shaders",
  };
  const TAB_TO_PROJECT_TYPE = {
    mods: "mod",
    resourcepacks: "resourcepack",
    shaders: "shader",
  };
  let lastVisibleViewId = null;

  document.addEventListener("DOMContentLoaded", () => {
    registerStandaloneAppSupport();
    void initializeApp();
  });

  /**
   * Boots the PackTracker application from persisted storage and wires UI events.
   */
  async function initializeApp() {
    try {
      const data = await loadData();
      if (typeof setData === "function") {
        setData(data);
      } else {
        AppState.data = data;
      }

      if (data.profiles.length > 0) {
        setActiveProfile(data.profiles[0].id);
      }

      bindTopLevelEvents();
      window.PackTracker.showToast = showToast;
      subscribe((detail) => {
        const reason = detail?.reason || "update";
        if (reason === "search" || reason === "search-results" || reason === "search-source") {
          if (AppState.activeView === "search") {
            renderSearchPage();
          }
          return;
        }

        renderApp();
      });
      renderApp();
      handleIncomingShareLink();
    } catch (error) {
      console.error("PackTracker failed to initialize", error);
      renderFatalState(error);
    }
  }

  /**
   * Renders the current app shell state, including active view visibility.
   */
  function renderApp() {
    try {
      renderSidebar();
      syncShellMode();
      toggleViews();

      if (AppState.activeView === "home" && (AppState.data?.profiles || []).length === 0) {
        renderWelcomeState();
      } else if (AppState.activeView === "home") {
        renderProfileView();
      }

      renderSearchPage();
      if (typeof renderShareView === "function") {
        renderShareView();
      }
    } catch (error) {
      console.error("PackTracker failed to render", error);
      renderFatalState(error);
    }
  }

  /**
   * Binds top-level application controls and custom event bridges.
   */
  function bindTopLevelEvents() {
    const installAppButton = document.getElementById("install-app-button");
    const exportButton = document.getElementById("export-button");
    const importInput = document.getElementById("import-input");
    const newProfileButton = document.getElementById("new-profile-button");

    installAppButton?.addEventListener("click", async () => {
      if (isStandaloneAppMode()) {
        showToast("PackTracker is already installed as an app.", "success");
        syncInstallButtonVisibility();
        return;
      }

      if (!deferredInstallPrompt) {
        showToast("App install is not available yet in this browser. Try Chrome or Edge over HTTPS.", "warning");
        return;
      }

      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch (error) {
        // Ignore prompt cancellation.
      }
      deferredInstallPrompt = null;
      syncInstallButtonVisibility();
    });

    exportButton?.addEventListener("click", () => {
      exportBackup(AppState.activeProfileId);
    });
    newProfileButton?.addEventListener("click", showNewProfileModal);

    importInput?.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) {
        return;
      }

      try {
        const result = await importBackup(file);
        if (result?.importedProfile?.id) {
          setActiveProfile(result.importedProfile.id);
          setActiveView("home");
        } else {
          const firstProfile = AppState.data?.profiles?.[0];
          if (firstProfile && !AppState.activeProfileId) {
            setActiveProfile(firstProfile.id);
          }
        }
      } catch (error) {
        console.warn("PackTracker: failed to import backup", error);
        showToast("Import failed", "danger");
      } finally {
        importInput.value = "";
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeTransientUi();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setActiveView("search");
        window.setTimeout(() => {
          focusSearchInput();
          if (typeof requestBrowseSearch === "function") {
            requestBrowseSearch();
          }
        }, 0);
      }
    });

    window.addEventListener("packtracker:open-search", (event) => {
      const detail = event.detail || {};
      const defaultTab = detail.sourceTab || PROJECT_TYPE_TO_TAB[detail.projectType] || AppState.browseContext.defaultTab || "mods";
      const projectType = TAB_TO_PROJECT_TYPE[defaultTab] || detail.projectType || AppState.search.projectType;
      if (detail.searchSource && typeof setSearchSource === "function") {
        setSearchSource(detail.searchSource);
      }
      setBrowseContext(defaultTab);
      setSearchState(
        {
          query: detail.query || "",
          projectType,
          results: [],
          offset: 0,
          loading: true,
        },
        { notify: false }
      );
      setActiveView("search");
      window.setTimeout(() => {
        focusSearchInput();
        if (typeof requestBrowseSearch === "function") {
          requestBrowseSearch();
        }
      }, 0);
    });
  }

  /**
   * Toggles the home and search view containers based on current state.
   */
  function toggleViews() {
    const homeView = document.getElementById(HOME_VIEW_ID);
    const searchView = document.getElementById(SEARCH_VIEW_ID);
    const shareView = document.getElementById(SHARE_VIEW_ID);
    if (!homeView || !searchView || !shareView) {
      return;
    }

    const viewsById = {
      [HOME_VIEW_ID]: homeView,
      [SEARCH_VIEW_ID]: searchView,
      [SHARE_VIEW_ID]: shareView,
    };
    const nextVisibleViewId = AppState.activeView === "search"
      ? SEARCH_VIEW_ID
      : AppState.activeView === "share"
        ? SHARE_VIEW_ID
        : HOME_VIEW_ID;
    const nextVisibleView = viewsById[nextVisibleViewId];
    const previousView = lastVisibleViewId ? viewsById[lastVisibleViewId] : null;
    const hiddenViews = Object.entries(viewsById)
      .filter(([id]) => id !== nextVisibleViewId)
      .map(([, view]) => view);

    if (previousView && previousView !== nextVisibleView) {
      previousView.classList.remove("hidden");
      previousView.classList.remove(PAGE_ENTER_CLASS);
      previousView.classList.add(PAGE_EXIT_CLASS);
      window.setTimeout(() => {
        previousView.classList.remove(PAGE_EXIT_CLASS);
        previousView.classList.add("hidden");
      }, PAGE_EXIT_MS);
    } else {
      hiddenViews.forEach((view) => {
        if (view !== nextVisibleView) {
          view.classList.add("hidden");
        }
      });
    }

    if (nextVisibleView) {
      nextVisibleView.classList.remove("hidden");
      nextVisibleView.classList.remove(PAGE_EXIT_CLASS);
      nextVisibleView.classList.add(PAGE_ENTER_CLASS);
      window.setTimeout(() => {
        nextVisibleView.classList.remove(PAGE_ENTER_CLASS);
      }, PAGE_ENTER_MS);
    }

    lastVisibleViewId = nextVisibleViewId;
  }

  /**
   * Adjusts the main shell layout for dedicated share-download mode.
   */
  function syncShellMode() {
    const app = document.getElementById(APP_ROOT_ID);
    if (!app) {
      return;
    }

    app.classList.toggle("share-mode", AppState.activeView === "share");
  }

  /**
   * Renders the first-launch welcome state when no profiles exist yet.
   */
  function renderWelcomeState() {
    const homeView = document.getElementById(HOME_VIEW_ID);
    if (!homeView) {
      return;
    }

    homeView.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = "welcome-state";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.textContent = "⬡";

    const title = document.createElement("div");
    title.className = "welcome-title";
    title.textContent = "No profiles yet";

    const subtitle = document.createElement("div");
    subtitle.className = "welcome-subtitle";
    subtitle.textContent = "Create your first Minecraft profile and start collecting mods, resource packs, and shaders.";

    const actions = document.createElement("div");
    actions.className = "welcome-actions";

    const createButton = document.createElement("button");
    createButton.className = "btn btn-primary";
    createButton.type = "button";
    createButton.textContent = "+ New profile";
    createButton.addEventListener("click", showNewProfileModal);

    const browseButton = document.createElement("button");
    browseButton.className = "btn";
    browseButton.type = "button";
    browseButton.textContent = "Browse projects";
    browseButton.addEventListener("click", () => {
      setActiveView("search");
      if (typeof requestBrowseSearch === "function") {
        requestBrowseSearch();
      }
    });

    const restore = document.createElement("div");
    restore.className = "welcome-subtitle";
    restore.append("Or ");

    const importLabel = document.createElement("label");
    importLabel.className = "inline-link";
    importLabel.setAttribute("for", "import-input");
    importLabel.textContent = "import a backup";

    restore.append(importLabel, " to restore a previous session.");
    actions.append(createButton, browseButton);
    wrapper.append(icon, title, subtitle, actions, restore);
    homeView.appendChild(wrapper);
  }

  /**
   * Shows a toast notification in the bottom-right corner.
   *
   * @param {string} message - Toast message.
   * @param {"success"|"danger"|"warning"} [variant] - Visual style.
   */
  function showToast(message, variant = "success") {
    const root = document.getElementById(TOAST_ROOT_ID);
    if (!root || !message) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${variant}`;
    toast.textContent = message;
    root.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("leaving");
      window.setTimeout(() => {
        toast.remove();
      }, 180);
    }, 2200);
  }

  /**
   * Closes shared modals and context menus opened by any module.
   */
  function closeTransientUi() {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    const contextRoot = document.getElementById(CONTEXT_ROOT_ID);
    if (modalRoot) {
      dismissRootChildren(modalRoot);
    }
    if (contextRoot) {
      contextRoot.replaceChildren();
    }
  }

  /**
   * Renders a visible fatal-state message instead of leaving the UI unresponsive.
   *
   * @param {unknown} error - Initialization or render error.
   */
  function renderFatalState(error) {
    const homeView = document.getElementById(HOME_VIEW_ID);
    const searchView = document.getElementById(SEARCH_VIEW_ID);
    const shareView = document.getElementById(SHARE_VIEW_ID);
    if (searchView) {
      searchView.classList.add("hidden");
    }
    if (shareView) {
      shareView.classList.add("hidden");
    }
    if (!homeView) {
      return;
    }

    homeView.classList.remove("hidden");
    homeView.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.className = "welcome-state";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.textContent = "!";

    const title = document.createElement("div");
    title.className = "welcome-title";
    title.textContent = "PackTracker could not load";

    const subtitle = document.createElement("div");
    subtitle.className = "welcome-subtitle";
    subtitle.textContent = error instanceof Error ? error.message : "Unknown startup error.";

    wrapper.append(icon, title, subtitle);
    homeView.appendChild(wrapper);
  }

  /**
   * Closes all mounted overlays in one root with a short exit animation.
   *
   * @param {HTMLElement} root - Root containing modal overlays.
   */
  function dismissRootChildren(root) {
    const overlays = Array.from(root.children);
    if (overlays.length === 0) {
      return;
    }

    overlays.forEach((overlay) => {
      overlay.classList.add("closing");
      const modal = overlay.querySelector(".modal");
      if (modal) {
        modal.classList.add("closing");
      }
    });

    window.setTimeout(() => {
      overlays.forEach((overlay) => {
        if (overlay.parentElement === root) {
          overlay.remove();
        }
      });
    }, 150);
  }

  /**
   * Parses and opens an incoming `?share=` URL payload once on app startup.
   */
  function handleIncomingShareLink() {
    if (typeof parseShareLink !== "function" || typeof showShareImportModal !== "function") {
      return;
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has("share")) {
      return;
    }

    try {
      const sharedProfile = parseShareLink(url.toString());
      url.searchParams.delete("share");
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", nextUrl);
      showShareImportModal(sharedProfile);
    } catch (error) {
      url.searchParams.delete("share");
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", nextUrl);
      showToast(error instanceof Error ? error.message : "Invalid share link", "danger");
    }
  }

  /**
   * Registers the service worker that makes the web build installable as a standalone app.
   */
  function registerStandaloneAppSupport() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      syncInstallButtonVisibility();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      syncInstallButtonVisibility();
      showToast("PackTracker installed as an app.", "success");
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=20260422-1").catch((error) => {
        console.warn("PackTracker: service worker registration failed", error);
      });
      syncInstallButtonVisibility();
    }, { once: true });
  }

  /**
   * Shows or hides the explicit install button based on browser install support.
   */
  function syncInstallButtonVisibility() {
    const installAppButton = document.getElementById("install-app-button");
    if (!installAppButton) {
      return;
    }

    const shouldShow = !isStandaloneAppMode() && Boolean(deferredInstallPrompt);
    installAppButton.classList.toggle("hidden", !shouldShow);
  }

  /**
   * Returns true when PackTracker already runs in standalone installed-app mode.
   *
   * @returns {boolean} Standalone display-mode flag.
   */
  function isStandaloneAppMode() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  Object.assign(window.PackTracker, {
    dismissRootChildren,
  });
})();
