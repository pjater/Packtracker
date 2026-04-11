(function attachScannerModule() {
  const namespace = window.PackTracker;
  const {
    AppState,
    getActiveProfile,
    notifyStateChanged,
    searchProjects,
    getProjectVersions,
    pickFolder,
    readFilesInFolder,
    getDirectoryLabel,
  } = namespace;
  const MODAL_ROOT_ID = "modal-root";
  const LOADER_TAG_PATTERN = /(?:^|[\s._-])(fabric|forge|neoforge|quilt)(?=$|[\s._-])/gi;
  const MC_TAG_PATTERN = /(?:^|[\s._-])(?:mc)?\d+(?:\.\d+)+(?:[-+._]?\w+)*/gi;
  const VERSION_PATTERN = /(?:^|[\s._-])v?\d+(?:\.\d+)+(?:[-+._]?\w+)*/gi;
  const TRAILING_NOISE_PATTERN = /(?:[-._](?:api|core|lib|forge|fabric|neoforge|quilt))+$/gi;
  const SCAN_CONFIG_BY_TAB = {
    mods: {
      projectType: "mod",
      collectionKey: "mods",
      fileExtensions: [".jar"],
      fileKindLabel: ".jar files",
    },
    resourcepacks: {
      projectType: "resourcepack",
      collectionKey: "resourcePacks",
      fileExtensions: [".zip"],
      fileKindLabel: ".zip files",
    },
    shaders: {
      projectType: "shader",
      collectionKey: "shaders",
      fileExtensions: [".zip"],
      fileKindLabel: ".zip files",
    },
  };
  let scanSession = null;

/**
 * Opens a browser folder picker and scans archive files from the selected directory.
 *
 * @param {string} profileId - Profile to compare scan results against.
 */
async function initScanner(profileId) {
  const profile = getActiveProfile();
  if (!profile || profile.id !== profileId) {
    return;
  }

  const scanConfig = resolveScanConfig();
  try {
    const folderHandle = await pickFolder({
      mode: "read",
      accept: scanConfig.fileExtensions,
    });
    if (!folderHandle) {
      return;
    }

    const files = await readFilesInFolder(folderHandle, scanConfig.fileExtensions);
    scanSession = {
      profileId,
      folderPath: getDirectoryLabel(folderHandle),
      folderHandle,
      rows: createScanRows(profile, Array.isArray(files) ? files : [], scanConfig),
      scanConfig,
      activeInlineRowId: null,
      addingAll: false,
    };

    renderScanResultsModal();
    notifyStateChanged("scan");
  } catch (error) {
    if (typeof namespace.showToast === "function") {
      namespace.showToast(
        error instanceof Error ? error.message : "Failed to read files from the selected folder.",
        "danger"
      );
    }
  }
}

/**
 * Parses a Minecraft mod archive filename into a user-friendly name guess.
 *
 * @param {string} filename - Original archive filename.
 * @returns {string} Parsed mod name guess.
 */
function parseModFilename(filename) {
  const withoutExtension = String(filename || "").replace(/\.(jar|zip)$/i, "");
  const normalized = withoutExtension
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(LOADER_TAG_PATTERN, " ")
    .replace(MC_TAG_PATTERN, " ")
    .replace(VERSION_PATTERN, " ")
    .replace(TRAILING_NOISE_PATTERN, " ")
    .replace(/[_+]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || withoutExtension;
}

/**
 * Renders the persistent scan-results modal with inline search panels.
 */
function renderScanResultsModal() {
  if (!scanSession) {
    return;
  }

  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (!modalRoot) {
    return;
  }

  modalRoot.replaceChildren();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay scan-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal-wide scan-modal";

  const header = document.createElement("div");
  header.className = "scan-modal-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "scan-modal-title-wrap";

  const title = document.createElement("div");
  title.className = "modal-title";
  title.textContent = "Scan Results";

  const subtitle = document.createElement("div");
  subtitle.className = "modal-subtitle";
  subtitle.textContent = `${scanSession.folderPath} - ${scanSession.rows.length} ${scanSession.scanConfig.fileKindLabel} found`;

  titleWrap.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.className = "icon-btn";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close scan results");
  closeButton.textContent = "X";
  closeButton.addEventListener("click", closeScanModal);

  header.append(titleWrap, closeButton);

  const betaNote = document.createElement("div");
  betaNote.className = "scan-beta-note";
  betaNote.textContent = "Beta feature: scan results may be incomplete or inaccurate. It is safer to add items manually or double-check everything before adding it to your profile.";

  const list = document.createElement("div");
  list.className = "scan-list";
  scanSession.rows.forEach((row) => {
    list.appendChild(renderScanRow(row));
  });

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const addAllButton = document.createElement("button");
  addAllButton.className = "btn";
  addAllButton.type = "button";
  addAllButton.disabled = scanSession.addingAll;
  addAllButton.textContent = scanSession.addingAll ? "Adding..." : "Add All Found";
  addAllButton.addEventListener("click", () => {
    void addAllFoundMods();
  });

  const doneButton = document.createElement("button");
  doneButton.className = "btn btn-primary";
  doneButton.type = "button";
  doneButton.textContent = "Done";
  doneButton.addEventListener("click", closeScanModal);

  actions.append(addAllButton, doneButton);
  modal.append(header, betaNote, list, actions);
  overlay.appendChild(modal);
  modalRoot.appendChild(overlay);

  window.removeEventListener("keydown", handleScanEscape);
  window.addEventListener("keydown", handleScanEscape);
}

/**
 * Renders one scan row plus its optional inline Modrinth match.
 *
 * @param {object} row - Scan row state.
 * @returns {HTMLDivElement} Row wrapper.
 */
function renderScanRow(row) {
  const wrapper = document.createElement("div");
  wrapper.className = "scan-row";
  wrapper.dataset.rowId = row.id;

  const item = document.createElement("div");
  item.className = "scan-item";

  const status = document.createElement("div");
  status.className = `scan-status status-${row.status}`;
  status.textContent = resolveStatusIcon(row.status);

  const text = document.createElement("div");
  text.className = "scan-item-text";

  const name = document.createElement("div");
  name.className = "scan-item-name";
  name.textContent = row.filename;

  const meta = document.createElement("div");
  meta.className = "scan-item-meta";
  meta.textContent = row.statusText || row.parsedName;

  text.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "scan-row-actions";

  if (row.status === "added") {
    const added = document.createElement("div");
    added.className = "scan-row-label is-added";
    added.textContent = "Added";
    actions.appendChild(added);
  } else if (row.searchResult) {
    const matched = document.createElement("div");
    matched.className = "scan-row-label is-added";
    matched.textContent = "Match found";
    actions.appendChild(matched);
  } else if (row.status === "tracked") {
    const tracked = document.createElement("div");
    tracked.className = "scan-row-label";
    tracked.textContent = "Tracked";
    actions.appendChild(tracked);
  } else if (row.status === "not-found") {
    const notFound = document.createElement("div");
    notFound.className = "scan-row-label";
    notFound.textContent = "Not found";
    actions.appendChild(notFound);
  } else {
    const searchButton = document.createElement("button");
    searchButton.className = "btn btn-small btn-accent";
    searchButton.type = "button";
    searchButton.disabled = row.searching;
    searchButton.textContent = row.searching ? "Searching..." : "Search";
    searchButton.addEventListener("click", () => {
      void openInlineSearch(row.id);
    });
    actions.appendChild(searchButton);
  }

  item.append(status, text, actions);
  wrapper.appendChild(item);

  if (scanSession.activeInlineRowId === row.id && row.searchResult) {
    wrapper.appendChild(renderInlineSearchResult(row));
  }

  return wrapper;
}

/**
 * Finds and opens the best inline Modrinth match for a scanned row.
 *
 * @param {string} rowId - Scan row identifier.
 */
async function openInlineSearch(rowId) {
  const row = findRow(rowId);
  const profile = getCurrentSessionProfile();
  if (!row || !profile) {
    return;
  }

  try {
    row.searching = true;
    row.status = "pending";
    row.statusText = "Searching Modrinth...";
    renderScanResultsModal();

    const response = await searchProjects({
      query: row.parsedName,
      projectType: scanSession.scanConfig.projectType,
      loader: scanSession.scanConfig.projectType === "mod" && profile.loader !== "vanilla" ? profile.loader : "",
      gameVersion: profile.mcVersion,
      offset: 0,
    });

    row.searching = false;
    if (response.error || !Array.isArray(response.hits) || response.hits.length === 0) {
      row.searchResult = null;
      row.status = "not-found";
      row.statusText = response.error ? (response.message || "Search failed") : "No Modrinth match found";
      scanSession.activeInlineRowId = null;
      renderScanResultsModal();
      return;
    }

    const project = response.hits[0];
    let versions = await getProjectVersions(project.project_id || project.id, {
      loader: scanSession.scanConfig.projectType === "mod" && profile.loader !== "vanilla" ? profile.loader : "",
      gameVersion: profile.mcVersion,
    });
    if (versions.error || versions.length === 0) {
      versions = await getProjectVersions(project.project_id || project.id);
    }

    if (versions.error || versions.length === 0) {
      row.searchResult = null;
      row.status = "not-found";
      row.statusText = versions.error ? (versions.message || "Version lookup failed") : "No installable version found";
      scanSession.activeInlineRowId = null;
      renderScanResultsModal();
      return;
    }

    row.status = "pending";
    row.statusText = "Match found below";
    row.searchResult = {
      project,
      version: sortVersionsNewestFirst(versions)[0],
    };
    scanSession.activeInlineRowId = row.id;
    renderScanResultsModal();
    scrollScanRowIntoView(row.id);
  } catch (error) {
    row.searching = false;
    row.searchResult = null;
    row.status = "not-found";
    row.statusText = error instanceof Error ? error.message : "Search failed";
    scanSession.activeInlineRowId = null;
    renderScanResultsModal();
    if (typeof namespace.showToast === "function") {
      namespace.showToast(row.statusText, "danger");
    }
  }
}

/**
 * Adds the current inline search result to the active profile.
 *
 * @param {string} rowId - Scan row identifier.
 */
async function addInlineResult(rowId) {
  const row = findRow(rowId);
  const profile = getCurrentSessionProfile();
  const resolveAndAdd = namespace.resolveAndAddMod;
  if (!row?.searchResult || !profile) {
    return;
  }
  if (typeof resolveAndAdd !== "function") {
    row.status = "not-found";
    row.statusText = "Add flow is not ready yet";
    row.searchResult = null;
    scanSession.activeInlineRowId = null;
    renderScanResultsModal();
    if (typeof namespace.showToast === "function") {
      namespace.showToast("Add flow is not ready yet. Please try again.", "danger");
    }
    return;
  }

  try {
    row.searching = true;
    row.statusText = "Adding to profile...";
    renderScanResultsModal();

    await resolveAndAdd(row.searchResult.project, row.searchResult.version, profile.id, {
      projectType: scanSession.scanConfig.projectType,
      returnHome: false,
      closeOverlays: false,
      skipDependencyModal: scanSession.scanConfig.projectType === "mod",
    });

    row.searching = false;
    row.status = "added";
    row.statusText = row.searchResult.version?.version_number || "Added";
    row.searchResult = null;
    scanSession.activeInlineRowId = null;
    renderScanResultsModal();
    notifyStateChanged("scan");
  } catch (error) {
    row.searching = false;
    row.status = "not-found";
    row.statusText = error instanceof Error ? error.message : "Could not add item";
    row.searchResult = null;
    scanSession.activeInlineRowId = null;
    renderScanResultsModal();
    if (typeof namespace.showToast === "function") {
      namespace.showToast(row.statusText, "danger");
    }
  }
}

/**
 * Searches and adds every unresolved scan row sequentially.
 */
async function addAllFoundMods() {
  const profile = getCurrentSessionProfile();
  if (!scanSession || !profile || scanSession.addingAll) {
    return;
  }

  scanSession.addingAll = true;
  renderScanResultsModal();

  for (const row of scanSession.rows) {
    if (row.status === "added" || row.status === "tracked") {
      continue;
    }

    await openInlineSearch(row.id);
    if (row.searchResult) {
      await addInlineResult(row.id);
    }
  }

  scanSession.addingAll = false;
  renderScanResultsModal();
}

/**
 * Renders the inline project candidate shown under one scan row.
 *
 * @param {object} row - Scan row with an active search result.
 * @returns {HTMLDivElement} Inline result element.
 */
function renderInlineSearchResult(row) {
  const panel = document.createElement("div");
  panel.className = "scan-inline-result";

  const content = document.createElement("div");
  content.className = "scan-inline-content";

  const title = document.createElement("div");
  title.className = "scan-inline-title";
  title.textContent = `${row.searchResult.project.title || row.searchResult.project.name} by ${row.searchResult.project.author || "Unknown author"}`;

  const meta = document.createElement("div");
  meta.className = "scan-inline-meta";
  meta.textContent = `${row.searchResult.version.version_number || "Unknown"} - ${formatLoaders(row.searchResult.version.loaders)} - ${formatMcVersion(row.searchResult.version.game_versions)}`;

  const description = document.createElement("div");
  description.className = "scan-inline-description";
  description.textContent = row.searchResult.project.description || "No description provided.";

  const actions = document.createElement("div");
  actions.className = "scan-inline-actions";

  const addButton = document.createElement("button");
  addButton.className = "btn btn-small btn-primary";
  addButton.type = "button";
  addButton.textContent = "+ Add to profile";
  addButton.addEventListener("click", () => {
    void addInlineResult(row.id);
  });

  const dismissButton = document.createElement("button");
  dismissButton.className = "btn btn-small";
  dismissButton.type = "button";
  dismissButton.textContent = "Not this one";
  dismissButton.addEventListener("click", () => {
    row.searchResult = null;
    scanSession.activeInlineRowId = null;
    renderScanResultsModal();
  });

  actions.append(addButton, dismissButton);
  content.append(title, meta, description, actions);
  panel.appendChild(content);
  return panel;
}

/**
 * Returns the active scan-session profile, if it still exists.
 *
 * @returns {object|null} Profile object or null.
 */
function getCurrentSessionProfile() {
  if (!scanSession) {
    return null;
  }

  return (AppState.data?.profiles || []).find((profile) => profile.id === scanSession.profileId) || null;
}

/**
 * Finds a scan row by id.
 *
 * @param {string} rowId - Row identifier.
 * @returns {object|null} Matching row or null.
 */
function findRow(rowId) {
  return scanSession?.rows.find((row) => row.id === rowId) || null;
}

/**
 * Handles Escape for the persistent scan modal.
 *
 * @param {KeyboardEvent} event - Keyboard event.
 */
function handleScanEscape(event) {
  if (event.key === "Escape" && scanSession) {
    closeScanModal();
  }
}

/**
 * Closes the current scan modal and clears the active session.
 */
function closeScanModal() {
  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (modalRoot) {
    if (typeof namespace.dismissRootChildren === "function") {
      namespace.dismissRootChildren(modalRoot);
    } else {
      modalRoot.replaceChildren();
    }
  }

  scanSession = null;
  window.removeEventListener("keydown", handleScanEscape);
}

/**
 * Scrolls a scan row into view so the inline result is visible immediately.
 *
 * @param {string} rowId - Row identifier.
 */
function scrollScanRowIntoView(rowId) {
  const row = document.querySelector(`.scan-row[data-row-id="${CSS.escape(rowId)}"]`);
  if (!row) {
    return;
  }

  row.scrollIntoView({
    block: "nearest",
    behavior: "smooth",
  });
}

/**
 * Builds normalized scan rows for the active profile collection.
 *
 * @param {object} profile - Active profile.
 * @param {Array<object>} files - Folder scan file results.
 * @param {object} scanConfig - Active tab scan configuration.
 * @returns {Array<object>} Scan rows.
 */
function createScanRows(profile, files, scanConfig) {
  const trackedItems = Array.isArray(profile?.[scanConfig.collectionKey]) ? profile[scanConfig.collectionKey] : [];
  const trackedLookup = new Set(trackedItems.map((item) => normalizeNameForCompare(item.name)));

  return files.map((file, index) => {
    const filename = String(file?.name || "");
    const parsedName = parseModFilename(filename);
    const alreadyTracked = trackedLookup.has(normalizeNameForCompare(parsedName));
    return {
      id: `scan-row-${scanConfig.projectType}-${index}-${Date.now()}`,
      filename,
      path: String(file?.path || file?.webkitRelativePath || ""),
      parsedName,
      status: alreadyTracked ? "tracked" : "pending",
      statusText: alreadyTracked ? "Already tracked" : "",
      searchResult: null,
      searching: false,
    };
  });
}

/**
 * Resolves the active scan configuration from the selected tab.
 *
 * @returns {{projectType:string, collectionKey:string, fileExtensions:Array<string>, fileKindLabel:string}} Scan config.
 */
function resolveScanConfig() {
  return SCAN_CONFIG_BY_TAB[AppState.activeTab] || SCAN_CONFIG_BY_TAB.mods;
}

/**
 * Normalizes a name string for loose case-insensitive comparisons.
 *
 * @param {string} value - Name candidate.
 * @returns {string} Normalized comparison key.
 */
function normalizeNameForCompare(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/**
 * Resolves the visual state icon for one scan row.
 *
 * @param {string} status - Row status.
 * @returns {string} Status icon.
 */
function resolveStatusIcon(status) {
  if (status === "added" || status === "tracked") {
    return "+";
  }
  if (status === "not-found") {
    return "x";
  }
  return "o";
}

/**
 * Formats a loader list into a short readable label.
 *
 * @param {Array<string>} loaders - Loader labels.
 * @returns {string} Loader summary.
 */
function formatLoaders(loaders) {
  if (!Array.isArray(loaders) || loaders.length === 0) {
    return "Any loader";
  }

  return loaders.slice(0, 2).map((loader) => {
    if (loader === "neoforge") {
      return "NeoForge";
    }
    return loader.charAt(0).toUpperCase() + loader.slice(1);
  }).join(", ");
}

/**
 * Formats game-version metadata for inline scan results.
 *
 * @param {Array<string>} versions - Game version list.
 * @returns {string} Version label.
 */
function formatMcVersion(versions) {
  return Array.isArray(versions) && versions.length > 0 ? versions[0] : "Any version";
}

/**
 * Sorts a version array from newest to oldest.
 *
 * @param {Array<object>} versions - Version list.
 * @returns {Array<object>} Sorted versions.
 */
function sortVersionsNewestFirst(versions) {
  return [...versions].sort(
    (left, right) => new Date(right.date_published || 0).getTime() - new Date(left.date_published || 0).getTime()
  );
}

Object.assign(namespace, {
  initScanner,
  parseModFilename,
});
})();
