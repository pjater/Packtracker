(function attachSearchModule() {
const namespace = window.PackTracker;
const {
  AppState,
  setActiveProfile,
  setActiveView,
  setBrowseContext,
  setSearchSource,
  setSearchResults,
  setSearchState,
  setViewMode,
  getViewMode,
  addMod,
  addResourcePack,
  addShader,
  getDependencies,
  getGameVersions,
  getProjectVersions,
  searchProjects,
  cfSearchProjects,
  cfGetProjectVersions,
  openVersionPickerModal,
  checkItemCompatibility,
  showCompatibilityWarnings,
} = namespace;
const SEARCH_VIEW_ID = "view-search";
const MODAL_ROOT_ID = "modal-root";
const CONTEXT_ROOT_ID = "context-menu-root";
const SEARCH_INPUT_ID = "search-input";
const SEARCH_DEBOUNCE_MS = 400;
const BROWSE_TABS = [
  { key: "mods", label: "Mods", projectType: "mod" },
  { key: "resourcepacks", label: "Resource Packs", projectType: "resourcepack" },
  { key: "shaders", label: "Shaders", projectType: "shader" },
];

let searchTimer = null;
let cachedGameVersions = [""];
let lastExecutedSearchKey = "";
let inflightSearchKey = "";
let searchRequestSerial = 0;

/**
 * Forces an immediate browse search for the current filter state.
 */
function requestBrowseSearch() {
  inflightSearchKey = "";
  lastExecutedSearchKey = "";
  setSearchState(
    {
      loading: false,
      offset: 0,
      totalHits: 0,
      results: [],
    },
    { notify: false }
  );
  void executeSearch(false);
}

/**
 * Renders the browse page and wires the search/filter controls.
 */
function renderSearchPage() {
  const root = document.getElementById(SEARCH_VIEW_ID);
  if (!root) {
    return;
  }

  const activeElement = document.activeElement;
  const shouldRestoreSearchFocus = activeElement instanceof HTMLInputElement && activeElement.id === SEARCH_INPUT_ID;
  const previousSelectionStart = shouldRestoreSearchFocus ? activeElement.selectionStart : null;
  const previousSelectionEnd = shouldRestoreSearchFocus ? activeElement.selectionEnd : null;
  const previousScrollLeft = shouldRestoreSearchFocus ? activeElement.scrollLeft : 0;

  const desiredProjectType = mapBrowseTabToProjectType(AppState.browseContext?.defaultTab);
  if (desiredProjectType && AppState.search.projectType !== desiredProjectType) {
    setSearchState({ projectType: desiredProjectType }, { notify: false });
  }

  const page = document.createElement("div");
  page.id = "search-page";

  const header = document.createElement("div");
  header.className = "search-header";

  const titleRow = document.createElement("div");
  titleRow.className = "search-title-row";

  const backButton = createButton("← Back to profiles");
  backButton.addEventListener("click", () => {
    setActiveView("home");
  });

  const title = document.createElement("div");
  title.className = "search-title";
  title.textContent = `Browse ${resolveActiveSourceLabel()}`;

  titleRow.append(backButton, title);
  const browseTabs = renderBrowseTabs();
  header.append(titleRow, renderSourceToggle(), browseTabs);

  const searchWrap = document.createElement("div");
  searchWrap.className = "search-input-wrap";

  const searchInput = document.createElement("input");
  searchInput.id = SEARCH_INPUT_ID;
  searchInput.className = AppState.search.loading ? "search-input loading" : "search-input";
  searchInput.type = "search";
  searchInput.placeholder = "Search mods, resource packs, and shaders...";
  searchInput.value = AppState.search.query;
  searchInput.addEventListener("input", () => {
    setSearchState(
      {
        query: searchInput.value,
        offset: 0,
      },
      { notify: false }
    );
    scheduleSearch();
  });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (searchTimer) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }
    setSearchState(
      {
        query: searchInput.value,
        offset: 0,
        results: [],
      },
      { notify: false }
    );
    void executeSearch(false);
  });

  searchWrap.appendChild(searchInput);
  const controlsRow = document.createElement("div");
  controlsRow.className = "search-controls-row";
  controlsRow.append(renderFilterRow(), createViewToggle("browse"));
  header.append(searchWrap, controlsRow);
  page.appendChild(header);

  const feedback = document.createElement("div");
  feedback.className = "search-feedback";
  if (AppState.search.loading) {
    feedback.textContent = `Searching ${resolveActiveSourceLabel()}...`;
  } else {
    feedback.textContent = `${AppState.search.totalHits || 0} results`;
  }
  page.appendChild(feedback);

  const resultsHost = document.createElement("div");
  resultsHost.className = "content-panel";
  const activeLoader = AppState.search.projectType === "mod" ? AppState.search.loader : "";
  const currentSearchKey = JSON.stringify({
    source: AppState.searchSource,
    query: AppState.search.query,
    projectType: AppState.search.projectType,
    loader: activeLoader,
    gameVersion: AppState.search.gameVersion,
  });
  const hasPendingCurrentSearch = AppState.search.loading && inflightSearchKey === currentSearchKey;
  const shouldBootSearch = (
    AppState.search.results.length === 0
    && !hasPendingCurrentSearch
    && lastExecutedSearchKey !== currentSearchKey
  );

  if ((AppState.search.loading || shouldBootSearch) && AppState.search.results.length === 0) {
    renderSkeletonCards(resultsHost, getViewMode("browse") === "grid" ? 8 : 6, getViewMode("browse"));
  } else if (AppState.search.results.length === 0) {
    const emptyWrapper = document.createElement("div");
    emptyWrapper.className = "results-wrapper search-results";
    emptyWrapper.appendChild(createEmptySearchState());
    resultsHost.appendChild(emptyWrapper);
  } else {
    renderResults(AppState.search.results, resultsHost, getViewMode("browse"));
  }

  page.appendChild(resultsHost);

  if (!AppState.search.loading && AppState.search.results.length > 0 && AppState.search.results.length < AppState.search.totalHits) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "search-actions-row";
    const loadMoreButton = createButton("Load more");
    loadMoreButton.addEventListener("click", () => {
      void executeSearch(true);
    });
    actionsRow.appendChild(loadMoreButton);
    page.appendChild(actionsRow);
  }

  root.replaceChildren(page);
  queueTabIndicatorUpdate(browseTabs);

  if (shouldRestoreSearchFocus) {
    searchInput.focus();
    if (typeof previousSelectionStart === "number" && typeof previousSelectionEnd === "number") {
      searchInput.setSelectionRange(previousSelectionStart, previousSelectionEnd);
    }
    searchInput.scrollLeft = previousScrollLeft;
  }

  if (cachedGameVersions.length === 1) {
    void hydrateGameVersions();
  }

  if (shouldBootSearch) {
    void executeSearch(false);
  }
}

/**
 * Animates search results into view using the existing layout modes.
 *
 * @param {Array<object>} results - Search results.
 * @param {HTMLElement} container - Results host container.
 * @param {"list"|"grid"} viewMode - Active browse layout.
 */
function renderResults(results, container, viewMode) {
  container.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = viewMode === "grid" ? "results-wrapper search-results is-grid" : "results-wrapper search-results";
  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateY(8px)";
  wrapper.style.transition = "opacity 200ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)";

  results.forEach((hit, index) => {
    const card = renderSearchCard(hit);
    card.style.animationDelay = `${Math.min(index * 35, 280)}ms`;
    wrapper.appendChild(card);
  });

  container.appendChild(wrapper);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      wrapper.style.opacity = "1";
      wrapper.style.transform = "translateY(0)";
    });
  });
}

/**
 * Renders animated skeleton cards while browse results are loading.
 *
 * @param {HTMLElement} container - Results host container.
 * @param {number} count - Number of placeholder cards.
 * @param {"list"|"grid"} viewMode - Active browse layout.
 */
function renderSkeletonCards(container, count = 8, viewMode = "grid") {
  container.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = viewMode === "grid" ? "results-wrapper search-results is-grid" : "results-wrapper search-results";

  for (let index = 0; index < count; index += 1) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
      <div class="skeleton-line skeleton-icon"></div>
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-meta"></div>
      <div class="skeleton-line skeleton-desc"></div>
      <div class="skeleton-line skeleton-desc-2"></div>
    `;
    card.style.animationDelay = `${index * 60}ms`;
    card.style.opacity = "0";
    card.style.animation = `itemReveal 200ms ease ${Math.min(index * 40, 280)}ms both`;
    wrapper.appendChild(card);
  }

  container.appendChild(wrapper);
}

/**
 * Schedules a tab-indicator update after layout has settled.
 *
 * @param {HTMLElement} tabBarElement - Tab bar wrapper.
 */
function queueTabIndicatorUpdate(tabBarElement) {
  window.requestAnimationFrame(() => {
    updateTabIndicator(tabBarElement);
  });
}

/**
 * Aligns the sliding underline with the currently active tab.
 *
 * @param {HTMLElement} tabBarElement - Tab bar wrapper.
 */
function updateTabIndicator(tabBarElement) {
  if (!(tabBarElement instanceof HTMLElement)) {
    return;
  }

  const activeTab = tabBarElement.querySelector(".tab.active");
  if (!(activeTab instanceof HTMLElement)) {
    return;
  }

  tabBarElement.style.setProperty("--indicator-left", `${activeTab.offsetLeft}px`);
  tabBarElement.style.setProperty("--indicator-width", `${activeTab.offsetWidth}px`);
}

/**
 * Renders one search result card with add-to-profile actions.
 *
 * @param {object} project - Modrinth search hit.
 * @returns {HTMLDivElement} Search card element.
 */
function renderSearchCard(project) {
  const card = document.createElement("div");
  card.className = "search-card";
  card.appendChild(createSearchIcon(project.title || project.name, project.icon_url));

  const info = document.createElement("div");
  info.className = "search-card-info";

  const headingLine = document.createElement("div");
  headingLine.className = "card-heading-line";

  const name = document.createElement("div");
  name.className = "search-card-name";
  name.textContent = project.title || project.name || "Unknown project";

  const author = document.createElement("div");
  author.className = "mod-author";
  author.textContent = `by ${project.author || "Unknown author"}`;

  headingLine.append(name, author);

  const description = document.createElement("div");
  description.className = "search-card-desc";
  description.textContent = project.description || "No description provided.";

  const meta = document.createElement("div");
  meta.className = "search-card-meta";
  meta.append(
    createMetaPill(formatClientServerSummary(project), "meta-neutral"),
    createMetaPill(formatProjectTypeSummary(project), "meta-neutral"),
    createMetaPill(formatLoaderSummary(project), "meta-loader"),
    createMetaPill(formatVersionSummary(project), "meta-version")
  );

  info.append(headingLine, description, meta);
  card.appendChild(info);

  const aside = document.createElement("div");
  aside.className = "search-card-aside";

  const stats = document.createElement("div");
  stats.className = "search-card-stats";
  stats.append(
    createStatLine(`↓ ${formatNumber(project.downloads || 0)}`),
    createStatLine(`♡ ${formatNumber(project.follows || 0)}`),
    createStatLine(`↻ ${formatProjectUpdate(project)}`)
  );
  aside.appendChild(stats);

  const addButton = createButton(resolveAddButtonLabel(), "btn-accent");
  addButton.addEventListener("click", () => {
    const profiles = AppState.data?.profiles || [];
    if (profiles.length === 0) {
      return;
    }
    if (profiles.length === 1) {
      void showVersionPickerModal(project, profiles[0].id);
      return;
    }

    const rect = addButton.getBoundingClientRect();
    showProfilePicker(project, rect.left, rect.bottom + 4);
  });

  const projectType = project.project_type || AppState.search.projectType || "mod";
  const projectId = project.project_id || project.id || "";
  const projectPageUrl = project.source_url
    || buildProjectUrl(project.source || AppState.searchSource || "modrinth", projectType, project.slug || projectId, projectId);

  const sourceLinkButton = document.createElement("button");
  sourceLinkButton.className = "btn btn-small";
  sourceLinkButton.type = "button";
  sourceLinkButton.textContent = project.source === "curseforge" ? "CurseForge \u2197" : "Modrinth \u2197";
  sourceLinkButton.title = "Open project page";
  sourceLinkButton.addEventListener("click", (event) => {
    event.stopPropagation();
    window.open(projectPageUrl, "_blank", "noopener");
  });

  const actions = document.createElement("div");
  actions.className = "search-card-actions";
  actions.append(sourceLinkButton, addButton);
  aside.appendChild(actions);
  card.appendChild(aside);
  return card;
}

/**
 * Opens the shared version-picker modal before a project is added to a profile.
 *
 * @param {object} project - Search result project.
 * @param {string} profileId - Target profile id.
 */
async function showVersionPickerModal(project, profileId) {
  if (typeof openVersionPickerModal !== "function") {
    return;
  }

  await openVersionPickerModal(
    project.project_id || project.id,
    "",
    project.source || AppState.searchSource || "modrinth",
    async (selectedVersion) => {
      await resolveAndAddMod(project, selectedVersion, profileId, {
        projectType: project.project_type || AppState.search.projectType,
      });
    },
    {
      profileId,
      projectType: project.project_type || AppState.search.projectType || "mod",
      projectName: project.title || project.name,
      mode: "add",
      confirmLabel: "Add selected version",
    }
  );
}

/**
 * Schedules a debounced search request after the user pauses typing.
 */
function scheduleSearch() {
  if (searchTimer) {
    window.clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    searchTimer = null;
    void executeSearch(false);
  }, SEARCH_DEBOUNCE_MS);
}

/**
 * Resolves dependencies and persists the selected project version into an profile.
 *
 * @param {object} project - Modrinth project payload or search hit.
 * @param {object} version - Chosen version payload.
 * @param {string} profileId - Profile identifier.
 */
async function resolveAndAddMod(project, version, profileId, options = {}) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const projectType = options.projectType || AppState.search.projectType;
  const source = options.source || project.source || AppState.searchSource || "modrinth";
  const shouldReturnHome = options.returnHome !== false;
  const shouldCloseOverlays = options.closeOverlays !== false;
  if (projectType !== "mod") {
    const savedItem = persistNonModProject(project, version, profileId, projectType, source);
    showItemCompatibilityWarnings(savedItem, profileId);
    setActiveProfile(profileId);
    if (shouldReturnHome) {
      setActiveView("home");
    }
    if (shouldCloseOverlays) {
      closeSearchOverlays();
    }
    return;
  }

  if (source !== "modrinth") {
    const savedItem = addMod(profileId, mapProjectVersionToMod(project, version, [], source));
    showItemCompatibilityWarnings(savedItem, profileId);
    setActiveProfile(profileId);
    if (shouldReturnHome) {
      setActiveView("home");
    }
    if (shouldCloseOverlays) {
      closeSearchOverlays();
    }
    return;
  }

  const dependencyPayload = await getDependencies(version.id);
  const requiredDependencies = dependencyPayload.error
    ? []
    : dependencyPayload.dependencies.filter((dependency) => dependency?.dependency_type === "required");
  const installedIds = new Set(profile.mods.map((entry) => entry.id));
  const missingDependencies = requiredDependencies
    .map((dependency) => resolveDependencyCandidate(dependency, dependencyPayload))
    .filter((candidate) => candidate && !installedIds.has(candidate.projectId));

  if (missingDependencies.length > 0) {
    if (options.skipDependencyModal) {
      const savedItem = addMod(profileId, mapProjectVersionToMod(project, version, missingDependencies.map((entry) => entry.projectId), source));
      showItemCompatibilityWarnings(savedItem, profileId);
      setActiveProfile(profileId);
      if (shouldReturnHome) {
        setActiveView("home");
      }
      if (shouldCloseOverlays) {
        closeSearchOverlays();
      }
      return;
    }
    showDependencySelectionModal(project, version, profileId, missingDependencies);
    return;
  }

  const savedItem = addMod(profileId, mapProjectVersionToMod(project, version, [], source));
  showItemCompatibilityWarnings(savedItem, profileId);
  setActiveProfile(profileId);
  if (shouldReturnHome) {
    setActiveView("home");
  }
  if (shouldCloseOverlays) {
    closeSearchOverlays();
  }
}

/**
 * Executes the current search request and updates result state.
 *
 * @param {boolean} append - Whether to append results or replace them.
 */
async function executeSearch(append) {
  const nextOffset = append ? AppState.search.results.length : 0;
  const activeLoader = AppState.search.projectType === "mod" ? AppState.search.loader : "";
  const requestKey = JSON.stringify({
    source: AppState.searchSource,
    query: AppState.search.query,
    projectType: AppState.search.projectType,
    loader: activeLoader,
    gameVersion: AppState.search.gameVersion,
  });
  const requestId = searchRequestSerial + 1;
  searchRequestSerial = requestId;
  inflightSearchKey = requestKey;

  if (!append) {
    lastExecutedSearchKey = requestKey;
  }
  setSearchState(
    {
      loading: true,
      offset: nextOffset,
    },
    { notify: true }
  );

  const sourceSearch = AppState.searchSource === "curseforge" ? cfSearchProjects : searchProjects;
  const response = await sourceSearch({
    query: AppState.search.query,
    projectType: AppState.search.projectType,
    loader: activeLoader,
    gameVersion: AppState.search.gameVersion,
    offset: nextOffset,
  });

  if (response.error) {
    if (requestId === searchRequestSerial) {
      inflightSearchKey = "";
    }
    setSearchState(
      {
        loading: false,
        totalHits: 0,
      },
      { notify: true }
    );
    return;
  }

  if (requestId === searchRequestSerial) {
    inflightSearchKey = "";
  }
  setSearchResults(
    Array.isArray(response.hits)
      ? response.hits.map((project) => ({
          ...project,
          source: project.source || AppState.searchSource,
        }))
      : [],
    append
  );
  setSearchState(
    {
      loading: false,
      totalHits: response.total_hits || 0,
      offset: response.offset || nextOffset,
    },
    { notify: true }
  );
}

/**
 * Renders the filter row using current search state and cached game-version options.
 *
 * @returns {HTMLDivElement} Search filter row.
 */
function renderFilterRow() {
  const row = document.createElement("div");
  row.className = "search-filters";

  if (AppState.search.projectType === "mod") {
    row.append(
      createFilterSelect("Loader", "loader-filter", [
        { value: "", label: "Any" },
        { value: "fabric", label: "Fabric" },
        { value: "forge", label: "Forge" },
        { value: "neoforge", label: "NeoForge" },
      ], AppState.search.loader, (value) => {
        setSearchState({
          loader: value,
          offset: 0,
          results: [],
        }, { notify: false });
        void executeSearch(false);
      })
    );
  }

  row.append(
    createFilterSelect(
      "Version",
      "version-filter",
      [{ value: "", label: "Any" }, ...cachedGameVersions.filter(Boolean).map((version) => ({ value: version, label: version }))],
      AppState.search.gameVersion,
      (value) => {
        setSearchState({
          gameVersion: value,
          offset: 0,
          results: [],
        }, { notify: false });
        void executeSearch(false);
      }
    )
  );

  return row;
}

/**
 * Renders the Modrinth/CurseForge source toggle.
 *
 * @returns {HTMLDivElement} Source toggle row.
 */
function renderSourceToggle() {
  const toggle = document.createElement("div");
  toggle.className = "source-toggle";

  [
    { value: "modrinth", label: "Modrinth" },
    { value: "curseforge", label: "CurseForge" },
  ].forEach((source) => {
    const button = document.createElement("button");
    button.className = AppState.searchSource === source.value ? "source-toggle-btn active" : "source-toggle-btn";
    button.type = "button";
    button.textContent = source.label;
    button.addEventListener("click", () => {
      if (AppState.searchSource !== source.value) {
        setSearchState(
          {
            results: [],
            offset: 0,
            totalHits: 0,
            loading: false,
          },
          { notify: false }
        );
        setSearchSource(source.value);
        requestBrowseSearch();
      }
    });
    toggle.appendChild(button);
  });

  return toggle;
}

/**
 * Renders the top-level browse tabs and keeps project type in sync.
 *
 * @returns {HTMLDivElement} Browse tab row.
 */
function renderBrowseTabs() {
  const tabs = document.createElement("div");
  tabs.className = "tab-bar browse-tabs";

  BROWSE_TABS.forEach((tab) => {
    const button = document.createElement("button");
    button.className = AppState.browseContext?.defaultTab === tab.key ? "tab active" : "tab";
    button.type = "button";
    button.textContent = tab.label;
    button.addEventListener("click", () => {
      setBrowseContext(tab.key);
      setSearchState(
        {
          projectType: tab.projectType,
          loader: tab.projectType === "mod" ? AppState.search.loader : "",
          results: [],
          offset: 0,
          loading: true,
        },
        { notify: false }
      );
      void executeSearch(false);
    });
    tabs.appendChild(button);
  });

  return tabs;
}

/**
 * Hydrates cached game versions from Modrinth and rerenders the search page.
 */
async function hydrateGameVersions() {
  cachedGameVersions = ["", ...(await getGameVersions())];
  if (AppState.activeView === "search") {
    renderSearchPage();
  }
}

/**
 * Shows a small profile chooser menu anchored below an add button.
 *
 * @param {object} project - Search hit to add.
 * @param {number} x - Viewport x-position.
 * @param {number} y - Viewport y-position.
 */
function showProfilePicker(project, x, y) {
  const root = document.getElementById(CONTEXT_ROOT_ID);
  if (!root) {
    return;
  }

  root.replaceChildren();
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  (AppState.data?.profiles || []).forEach((profile) => {
    const item = document.createElement("button");
    item.className = "context-menu-item";
    item.type = "button";
    item.textContent = profile.name;
    item.addEventListener("click", () => {
      closeContextMenu(root, () => {
        void showVersionPickerModal(project, profile.id);
      });
    });
    menu.appendChild(item);
  });

  root.appendChild(menu);
  positionFloatingMenu(menu, x, y);

  const handleOutsideClick = (event) => {
    if (!menu.contains(event.target)) {
      closeContextMenu(root);
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    }
  };
  const handleEscape = (event) => {
    if (event.key === "Escape") {
      closeContextMenu(root);
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    }
  };
  window.addEventListener("mousedown", handleOutsideClick);
  window.addEventListener("keydown", handleEscape);
}

/**
 * Shows a dependency checkbox modal before adding a mod with required dependencies.
 *
 * @param {object} project - Selected project.
 * @param {object} version - Selected version.
 * @param {string} profileId - Profile identifier.
 * @param {Array<object>} dependencies - Missing dependency candidates.
 */
function showDependencySelectionModal(project, version, profileId, dependencies) {
  const overlay = createModalOverlay();
  const modal = createModalCard();
  modal.classList.add("modal-wide");
  const title = createModalTitle(`Add ${(project.title || project.name)} with dependencies?`);
  const subtitle = createModalSubtitle("This mod requires the projects below. Choose which missing dependencies to add now.");
  const list = document.createElement("div");
  list.className = "dependency-list";

  const checkboxStates = new Map();
  dependencies.forEach((dependency) => {
    checkboxStates.set(dependency.projectId, true);

    const row = document.createElement("label");
    row.className = "checkbox-row";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.addEventListener("change", () => {
      checkboxStates.set(dependency.projectId, input.checked);
    });

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "dependency-name";
    name.textContent = dependency.project.title || dependency.project.name || dependency.projectId;
    const meta = document.createElement("div");
    meta.className = "dependency-meta";
    meta.textContent = dependency.version
      ? dependency.version.version_number || "Compatible version available"
      : "Will fetch the latest compatible version";

    text.append(name, meta);
    row.append(input, text);
    list.appendChild(row);
  });

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const confirmButton = createButton("Add selected version", "btn-accent");
  cancelButton.addEventListener("click", closeSearchOverlays);
  confirmButton.addEventListener("click", async () => {
    const dependencyIds = [];
    for (const dependency of dependencies) {
      if (!checkboxStates.get(dependency.projectId)) {
        continue;
      }

      const chosenVersion = dependency.version || await fetchLatestCompatibleVersion(dependency.projectId, profileId);
      if (chosenVersion) {
        const savedDependency = addMod(profileId, mapProjectVersionToMod(dependency.project, chosenVersion, [], "modrinth"));
        showItemCompatibilityWarnings(savedDependency, profileId);
        dependencyIds.push(dependency.projectId);
      }
    }

    const savedItem = addMod(profileId, mapProjectVersionToMod(project, version, dependencyIds, "modrinth"));
    showItemCompatibilityWarnings(savedItem, profileId);
    setActiveProfile(profileId);
    setActiveView("home");
    closeSearchOverlays();
  });

  actions.append(cancelButton, confirmButton);
  modal.append(title, subtitle, list, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Persists a selected resource pack or shader version into the target profile.
 *
 * @param {object} project - Project payload.
 * @param {object} version - Selected version payload.
 * @param {string} profileId - Profile identifier.
 * @param {"resourcepack"|"shader"} projectType - Non-mod project type.
 */
function persistNonModProject(project, version, profileId, projectType, source = AppState.searchSource || "modrinth") {
  const primaryFile = Array.isArray(version?.files)
    ? version.files.find((file) => file.primary) || version.files[0]
    : null;
  const projectId = resolveProjectId(project);
  const payload = {
    id: projectId,
    projectId,
    projectType,
    slug: project.slug || projectId,
    name: project.title || project.name || "Unknown item",
    version: version?.version_number || "",
    versionNumber: version?.version_number || "",
    versionId: version?.id || "",
    description: project.description || "",
    author: project.author || "Unknown author",
    fileUrl: primaryFile?.url || "",
    downloadUrl: primaryFile?.url || "",
    modrinthId: projectId,
    modrinthUrl: buildProjectUrl(source, projectType, project.slug || projectId, projectId),
    iconUrl: project.icon_url || "",
    source,
    starred: false,
    notes: "",
    addedAt: Date.now(),
  };

  if (projectType === "resourcepack") {
    return addResourcePack(profileId, payload);
  }
  return addShader(profileId, payload);
}

/**
 * Resolves a dependency into a project/version candidate for the checkbox modal.
 *
 * @param {object} dependency - Raw dependency entry.
 * @param {{projects:Array<object>, versions:Array<object>}} payload - Resolved dependency payload.
 * @returns {{projectId:string, project:object, version:object|null}|null} Dependency candidate.
 */
function resolveDependencyCandidate(dependency, payload) {
  const projectId = dependency.project_id
    || payload.versions.find((version) => version.id === dependency.version_id)?.project_id;
  if (!projectId) {
    return null;
  }

  const project = payload.projects.find((entry) => entry.id === projectId);
  const version = payload.versions.find((entry) => entry.project_id === projectId)
    || (dependency.version_id ? payload.versions.find((entry) => entry.id === dependency.version_id) : null);

  if (!project) {
    return null;
  }

  return {
    projectId,
    project,
    version: version || null,
  };
}

/**
 * Fetches the newest compatible version for a dependency project.
 *
 * @param {string} projectId - Dependency project id.
 * @param {string} profileId - Target profile id.
 * @returns {Promise<object|null>} Compatible version or null.
 */
async function fetchLatestCompatibleVersion(projectId, profileId) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return null;
  }

  let versions = await getProjectVersions(projectId, {
    loader: profile.loader === "vanilla" ? "" : profile.loader,
    gameVersion: profile.mcVersion,
  });
  if (versions.error || versions.length === 0) {
    versions = await getProjectVersions(projectId);
  }
  if (versions.error || versions.length === 0) {
    return null;
  }
  return sortVersionsNewestFirst(versions)[0];
}

/**
 * Creates the empty state shown when the search page has no results.
 *
 * @returns {HTMLDivElement} Empty search state element.
 */
function createEmptySearchState() {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const icon = document.createElement("div");
  icon.className = "empty-state-icon";
  icon.textContent = "⌕";
  const text = document.createElement("div");
  text.className = "empty-state-text";
  text.textContent = "No results yet. Try another search or browse the most popular projects.";
  empty.append(icon, text);
  return empty;
}

/**
 * Creates a labeled select control for the search filters row.
 *
 * @param {string} labelText - Visible label.
 * @param {string} id - Select id.
 * @param {Array<{value:string, label:string}>} options - Select options.
 * @param {string} value - Current value.
 * @param {(value:string) => void} onChange - Change handler.
 * @returns {HTMLDivElement} Filter wrapper.
 */
function createFilterSelect(labelText, id, options, value, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "filter-group";
  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = labelText;

  const selectedOption = options.find((option) => option.value === value) || options[0];
  const select = document.createElement("div");
  select.className = "filter-select";

  const trigger = document.createElement("button");
  trigger.className = "filter-trigger";
  trigger.type = "button";
  trigger.id = id;
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerValue = document.createElement("span");
  triggerValue.className = "filter-trigger-value";
  triggerValue.textContent = selectedOption?.label || labelText;

  const caret = document.createElement("span");
  caret.className = "filter-trigger-caret";
  caret.textContent = "▾";

  trigger.append(triggerValue, caret);

  const menu = document.createElement("div");
  menu.className = "filter-menu";
  menu.setAttribute("role", "listbox");

  let isOpen = false;
  let handleOutsideClick = null;
  let handleEscape = null;

  /**
   * Closes the custom filter menu and cleans up listeners.
   */
    function closeMenu() {
      if (!isOpen) {
        return;
      }

      isOpen = false;
      select.classList.remove("is-open");
      select.classList.add("is-closing");
      menu.classList.add("closing");
      trigger.setAttribute("aria-expanded", "false");
      if (handleOutsideClick) {
        window.removeEventListener("mousedown", handleOutsideClick);
        handleOutsideClick = null;
      }
      if (handleEscape) {
        window.removeEventListener("keydown", handleEscape);
        handleEscape = null;
      }
      window.setTimeout(() => {
        select.classList.remove("is-closing");
        menu.classList.remove("closing");
      }, 100);
    }

  /**
   * Opens the custom filter menu.
   */
  function openMenu() {
    if (isOpen) {
      closeMenu();
      return;
    }

    isOpen = true;
    select.classList.remove("is-closing");
    menu.classList.remove("closing");
    select.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    handleOutsideClick = (event) => {
      if (!select.contains(event.target)) {
        closeMenu();
      }
    };
    handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
  }

  options.forEach((optionData) => {
    const option = document.createElement("button");
    option.className = optionData.value === value ? "filter-option active" : "filter-option";
    option.type = "button";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", optionData.value === value ? "true" : "false");
    option.textContent = optionData.label;
    option.addEventListener("click", () => {
      closeMenu();
      onChange(optionData.value);
    });
    menu.appendChild(option);
  });

  trigger.addEventListener("click", openMenu);
  select.append(trigger, menu);
  wrapper.append(label, select);
  return wrapper;
}

/**
 * Creates the list/grid toggle used on the browse page.
 *
 * @param {"browse"} scope - View mode scope.
 * @returns {HTMLDivElement} Toggle group.
 */
function createViewToggle(scope) {
  const group = document.createElement("div");
  group.className = "view-toggle";

  ["list", "grid"].forEach((mode) => {
    const button = document.createElement("button");
    button.className = getViewMode(scope) === mode ? "view-toggle-btn active" : "view-toggle-btn";
    button.type = "button";
    button.textContent = mode === "list" ? "☰" : "⊞";
    button.setAttribute("aria-label", mode === "list" ? "List view" : "Grid view");
    button.addEventListener("click", () => {
      setViewMode(scope, mode);
    });
    group.appendChild(button);
  });

  return group;
}

/**
 * Creates the shared search button style helper.
 *
 * @param {string} text - Button text.
 * @param {string} [modifier] - Optional extra classes.
 * @returns {HTMLButtonElement} Button element.
 */
function createButton(text, modifier) {
  const button = document.createElement("button");
  button.className = modifier ? `btn ${modifier}` : "btn";
  button.type = "button";
  button.textContent = text;
  return button;
}

/**
 * Creates a small meta pill element used inside result-card metadata rows.
 *
 * @param {string} text - Meta text.
 * @param {string} [modifier] - Optional style modifier class.
 * @returns {HTMLSpanElement} Meta pill element.
 */
function createMetaPill(text, modifier) {
  const pill = document.createElement("span");
  pill.className = modifier ? `meta-pill ${modifier}` : "meta-pill";
  pill.textContent = text;
  return pill;
}

/**
 * Creates a compact stat line for the right-hand search card rail.
 *
 * @param {string} text - Stat text.
 * @returns {HTMLDivElement} Stat element.
 */
function createStatLine(text) {
  const line = document.createElement("div");
  line.className = "search-card-stat";
  line.textContent = text;
  return line;
}

/**
 * Creates the result-card icon image or a fallback placeholder.
 *
 * @param {string} label - Project label for fallback initials.
 * @param {string|null} iconUrl - Remote icon url.
 * @returns {HTMLElement} Icon node.
 */
function createSearchIcon(label, iconUrl) {
  if (iconUrl) {
    const image = document.createElement("img");
    image.className = "search-card-icon";
    image.src = iconUrl;
    image.alt = "";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener(
      "error",
      () => {
        image.replaceWith(createSearchPlaceholder(label));
      },
      { once: true }
    );
    return image;
  }
  return createSearchPlaceholder(label);
}

/**
 * Creates a search-card placeholder using the first label character.
 *
 * @param {string} label - Project label.
 * @returns {HTMLDivElement} Placeholder node.
 */
function createSearchPlaceholder(label) {
  const placeholder = document.createElement("div");
  placeholder.className = "search-card-icon-placeholder";
  placeholder.textContent = (label || "?").charAt(0).toUpperCase();
  return placeholder;
}

/**
 * Creates the standard modal overlay element for search modals.
 *
 * @returns {HTMLDivElement} Overlay element.
 */
function createModalOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  return overlay;
}

/**
 * Creates the standard modal card element for search modals.
 *
 * @returns {HTMLDivElement} Modal card.
 */
function createModalCard() {
  const card = document.createElement("div");
  card.className = "modal";
  return card;
}

/**
 * Creates a modal title element.
 *
 * @param {string} text - Title text.
 * @returns {HTMLDivElement} Title element.
 */
function createModalTitle(text) {
  const element = document.createElement("div");
  element.className = "modal-title";
  element.textContent = text;
  return element;
}

/**
 * Creates a modal subtitle element.
 *
 * @param {string} text - Subtitle text.
 * @returns {HTMLDivElement} Subtitle element.
 */
function createModalSubtitle(text) {
  const element = document.createElement("div");
  element.className = "modal-subtitle";
  element.textContent = text;
  return element;
}

/**
 * Creates the shared modal action row.
 *
 * @returns {HTMLDivElement} Action row.
 */
function createActionRow() {
  const row = document.createElement("div");
  row.className = "modal-actions";
  return row;
}

/**
 * Mounts a search modal overlay into the shared modal root.
 *
 * @param {HTMLDivElement} overlay - Overlay element.
 */
function mountModal(overlay) {
  const root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    return;
  }

  root.replaceChildren();
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeSearchOverlays();
    }
  });
  root.appendChild(overlay);
}

/**
 * Removes any active search modal or context-menu overlay.
 */
function closeSearchOverlays() {
  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  const contextRoot = document.getElementById(CONTEXT_ROOT_ID);
  if (modalRoot) {
    if (typeof namespace.dismissRootChildren === "function") {
      namespace.dismissRootChildren(modalRoot);
    } else {
      modalRoot.replaceChildren();
    }
  }
  if (contextRoot) {
    closeContextMenu(contextRoot);
  }
}

/**
 * Closes the active context menu with a short exit animation.
 *
 * @param {HTMLElement|null} root - Context-menu root.
 * @param {() => void} [onClosed] - Optional callback after removal.
 */
function closeContextMenu(root, onClosed) {
  if (!(root instanceof HTMLElement)) {
    if (typeof onClosed === "function") {
      onClosed();
    }
    return;
  }

  const menu = root.querySelector(".context-menu");
  if (!(menu instanceof HTMLElement)) {
    root.replaceChildren();
    if (typeof onClosed === "function") {
      onClosed();
    }
    return;
  }

  if (menu.classList.contains("closing")) {
    return;
  }

  menu.classList.add("closing");
  window.setTimeout(() => {
    if (menu.parentElement === root) {
      root.replaceChildren();
    }
    if (typeof onClosed === "function") {
      onClosed();
    }
  }, 100);
}

/**
 * Keeps a floating context menu inside the current viewport.
 *
 * @param {HTMLDivElement} menu - Floating menu element.
 * @param {number} fallbackLeft - Preferred x-coordinate.
 * @param {number} fallbackTop - Preferred y-coordinate.
 */
function positionFloatingMenu(menu, fallbackLeft, fallbackTop) {
  const menuRect = menu.getBoundingClientRect();
  const menuWidth = menuRect.width || 180;
  const menuHeight = menuRect.height || 180;
  const safeLeft = Math.min(Math.max(12, fallbackLeft), window.innerWidth - menuWidth - 12);
  const safeTop = Math.min(Math.max(12, fallbackTop), window.innerHeight - menuHeight - 12);
  menu.style.left = `${safeLeft}px`;
  menu.style.top = `${safeTop}px`;
}

/**
 * Focuses the search input when the page is visible.
 */
function focusSearchInput() {
  const input = document.getElementById(SEARCH_INPUT_ID);
  if (input instanceof HTMLInputElement) {
    input.focus();
    input.select();
  }
}

/**
 * Shows a simple modal message for lightweight error or empty states.
 *
 * @param {string} titleText - Modal title.
 * @param {string} bodyText - Modal body text.
 */
function showTransientModal(titleText, bodyText) {
  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle(titleText);
  const subtitle = createModalSubtitle(bodyText);
  const actions = createActionRow();
  const closeButton = createButton("Close");
  closeButton.addEventListener("click", closeSearchOverlays);
  actions.appendChild(closeButton);
  modal.append(title, subtitle, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Formats project loader categories for the metadata row.
 *
 * @param {object} project - Search hit.
 * @returns {string} Loader summary.
 */
function formatLoaderSummary(project) {
  const loaders = Array.isArray(project.display_categories) && project.display_categories.length > 0
    ? project.display_categories
    : Array.isArray(project.categories)
      ? project.categories
      : [];
  return loaders.length > 0 ? loaders.slice(0, 3).join(", ") : "Any loader";
}

/**
 * Formats supported Minecraft versions for the search-card metadata row.
 *
 * @param {object} project - Search hit.
 * @returns {string} Version summary.
 */
function formatVersionSummary(project) {
  const versions = Array.isArray(project.versions) ? project.versions : [];
  return versions.length > 0 ? versions.slice(0, 3).join(", ") : "Any version";
}

/**
 * Formats the client/server compatibility phrase for a result pill.
 *
 * @param {object} project - Search hit.
 * @returns {string} Client/server summary.
 */
function formatClientServerSummary(project) {
  if (project.client_side === "required" && project.server_side === "required") {
    return "Client and server";
  }
  if (project.client_side === "required") {
    return "Client";
  }
  if (project.server_side === "required") {
    return "Server";
  }
  return "Client or server";
}

/**
 * Formats the project-type label for browse cards.
 *
 * @param {object} project - Search hit.
 * @returns {string} Project type label.
 */
function formatProjectTypeSummary(project) {
  const projectType = project.project_type || AppState.search.projectType || "mod";
  if (projectType === "resourcepack") {
    return "Resource Pack";
  }
  if (projectType === "shader") {
    return "Shader";
  }
  return "Mod";
}

/**
 * Formats the best available updated-at label for a result card.
 *
 * @param {object} project - Search hit.
 * @returns {string} Relative updated label.
 */
function formatProjectUpdate(project) {
  const timestamp = new Date(project.date_modified || project.date_published || Date.now()).getTime();
  return formatRelativeDate(timestamp);
}

/**
 * Maps browse-tab keys to Modrinth project types.
 *
 * @param {string} tab - Browse tab key.
 * @returns {"mod"|"resourcepack"|"shader"} Project type.
 */
function mapBrowseTabToProjectType(tab) {
  if (tab === "resourcepacks") {
    return "resourcepack";
  }
  if (tab === "shaders") {
    return "shader";
  }
  return "mod";
}

/**
 * Formats a version array for the version picker modal.
 *
 * @param {Array<string>} versions - Supported game versions.
 * @returns {string} Human-readable version list.
 */
function formatVersionList(versions) {
  const safeVersions = Array.isArray(versions) ? versions : [];
  return safeVersions.length > 0 ? safeVersions.slice(0, 4).join(", ") : "Any version";
}

/**
 * Creates the correct add-button label based on profile count.
 *
 * @returns {string} Add button label.
 */
function resolveAddButtonLabel() {
  const profiles = AppState.data?.profiles || [];
  return profiles.length > 1 ? "+ Add to profile ▾" : "+ Add to profile";
}

/**
 * Converts project/version data into the local mod storage shape.
 *
 * @param {object} project - Project payload.
 * @param {object} version - Version payload.
 * @param {Array<string>} dependencyIds - Required dependency ids.
 * @returns {object} Storage-ready mod record.
 */
function mapProjectVersionToMod(project, version, dependencyIds, source = AppState.searchSource || "modrinth") {
  const primaryFile = Array.isArray(version?.files)
    ? version.files.find((file) => file.primary) || version.files[0]
    : null;
  const projectId = resolveProjectId(project);

  return {
    id: projectId,
    projectId,
    projectType: "mod",
    slug: project.slug || projectId,
    name: project.title || project.name || "Unknown mod",
    description: project.description || "",
    author: project.author || "Unknown author",
    versionId: version.id || "",
    versionNumber: version.version_number || "Unknown",
    mcVersions: Array.isArray(version.game_versions) ? version.game_versions : [],
    loaders: Array.isArray(version.loaders) ? version.loaders : [],
    fileUrl: primaryFile?.url || "",
    downloadUrl: primaryFile?.url || "",
    modrinthId: projectId,
    modrinthUrl: buildProjectUrl(source, "mod", project.slug || projectId, projectId),
    iconUrl: project.icon_url || "",
    source,
    starred: false,
    notes: "",
    dependencies: dependencyIds,
    addedAt: Date.now(),
  };
}

/**
 * Resolves a shared project id from any project payload.
 *
 * @param {object} project - Project payload.
 * @returns {string} Project id.
 */
function resolveProjectId(project) {
  return String(project?.project_id || project?.id || "");
}

/**
 * Builds the public project URL for the active source.
 *
 * @param {"modrinth"|"curseforge"} source - Project source.
 * @param {"mod"|"resourcepack"|"shader"} projectType - Project type.
 * @param {string} slug - Project slug.
 * @param {string} projectId - Project id fallback.
 * @returns {string} Public project URL.
 */
function buildProjectUrl(source, projectType, slug, projectId) {
  if (source === "curseforge") {
    const segment = projectType === "resourcepack"
      ? "texture-packs"
      : projectType === "shader"
        ? "shaders"
        : "mc-mods";
    return `https://www.curseforge.com/minecraft/${segment}/${slug || projectId}`;
  }

  return `https://modrinth.com/${projectType}/${slug || projectId}`;
}

/**
 * Shows compatibility warnings for a newly added item.
 *
 * @param {object|null} item - Saved item.
 * @param {string} profileId - Owning profile id.
 */
function showItemCompatibilityWarnings(item, profileId) {
  if (!item) {
    return;
  }

  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  if (typeof showCompatibilityWarnings === "function") {
    showCompatibilityWarnings(item, profile);
    return;
  }

  if (typeof checkItemCompatibility === "function" && typeof namespace.showToast === "function") {
    checkItemCompatibility(item, profile).forEach((warning) => {
      namespace.showToast(warning.message, "warning");
    });
  }
}

/**
 * Returns the active source label for titles and loading states.
 *
 * @returns {string} Active source label.
 */
function resolveActiveSourceLabel() {
  return AppState.searchSource === "curseforge" ? "CurseForge" : "Modrinth";
}

/**
 * Sorts version payloads newest-first.
 *
 * @param {Array<object>} versions - Version list.
 * @returns {Array<object>} Sorted versions.
 */
function sortVersionsNewestFirst(versions) {
  return [...versions].sort(
    (left, right) => new Date(right.date_published || 0).getTime() - new Date(left.date_published || 0).getTime()
  );
}

/**
 * Builds a simple metadata line from non-empty string segments.
 *
 * @param {Array<string>} parts - Metadata segments.
 * @returns {string} Joined string.
 */
function buildMetaLine(parts) {
  return parts.filter(Boolean).join(" • ");
}

/**
 * Formats a relative date label from a timestamp.
 *
 * @param {number} timestamp - Epoch milliseconds.
 * @returns {string} Relative date label.
 */
function formatRelativeDate(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));
  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "1 day ago";
  }
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths <= 1 ? "1 month ago" : `${diffMonths} months ago`;
}

/**
 * Formats large numeric values for metadata pills.
 *
 * @param {number} value - Number to format.
 * @returns {string} Formatted number.
 */
function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

/**
 * Capitalizes the first letter of a label.
 *
 * @param {string} value - Raw label.
 * @returns {string} Capitalized label.
 */
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

Object.assign(namespace, {
  renderSearchPage,
  renderSearchCard,
  showVersionPickerModal,
  resolveAndAddMod,
  focusSearchInput,
  requestBrowseSearch,
});
})();


