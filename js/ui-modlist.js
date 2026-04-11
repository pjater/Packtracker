(function attachModListModule() {
  const namespace = window.PackTracker;
  const {
    AppState,
    notifyStateChanged,
    getActiveProfile,
    isFavoritesProfileId,
    setActiveTab,
    setViewMode,
    getViewMode,
    addMod,
    addResourcePack,
    addShader,
    deleteProfile,
    removeMod,
    removeResourcePack,
    removeShader,
    saveData,
    updateMod,
    updateResourcePack,
    updateShader,
    getDependencies,
    getProject,
    getVersion,
    getProjectVersions,
    initScanner,
    downloadFile,
  } = namespace;
  const HOME_VIEW_ID = "view-home";
  const MODAL_ROOT_ID = "modal-root";
  const CONTEXT_ROOT_ID = "context-menu-root";
  const UPDATE_TARGET_VERSION_PRESETS = ["1.21.6", "1.21.5", "1.21.4", "1.21.1", "1.20.6", "1.20.4"];
  const DOWNLOAD_ROW_STATES = {
    QUEUED: "queued",
    DOWNLOADING: "downloading",
    DONE: "done",
    NO_URL: "no-url",
    ERROR: "error",
  };
  const UPDATE_ROW_STATES = {
    QUEUED: "queued",
    CHECKING: "downloading",
    UPDATED: "done",
    SKIPPED: "no-url",
    ERROR: "error",
  };
  const TAB_DEFINITIONS = [
    { key: "mods", label: "Mods", projectType: "mod" },
    { key: "resourcepacks", label: "Resource Packs", projectType: "resourcepack" },
    { key: "shaders", label: "Shaders", projectType: "shader" },
  ];
  let downloadSession = null;
  let updateSession = null;

/**
 * Renders the full profile view for the currently active profile.
 */
function renderProfileView() {
  const root = document.getElementById(HOME_VIEW_ID);
  const profile = getActiveProfile();
  if (!root) {
    return;
  }

  root.replaceChildren();

  if (!profile) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.textContent = "⬡";

    const text = document.createElement("div");
    text.className = "empty-state-text";
    text.textContent = "Choose a profile from the sidebar to manage mods, resource packs, and shaders.";

    empty.append(icon, text);
    root.appendChild(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "profile-header";

  const headerRow = document.createElement("div");
  headerRow.className = "profile-header-row";

  const heading = document.createElement("div");
  heading.className = "profile-heading";

  const title = document.createElement("div");
  title.className = "profile-title";
  title.textContent = profile.name;

  heading.appendChild(title);
  if (isFavoritesProfileId(AppState.activeProfileId)) {
    heading.appendChild(createBadge("badge-source", "Starred across all profiles"));
  } else {
    heading.append(
      createLoaderBadge(profile.loader),
      createBadge("badge-version", profile.mcVersion)
    );
  }

  headerRow.appendChild(heading);

  if (!isFavoritesProfileId(AppState.activeProfileId)) {
    const scanButton = createButton("Scan Minecraft Folder");
    scanButton.addEventListener("click", () => {
      initScanner(profile.id);
    });
    headerRow.appendChild(scanButton);
  }

  header.appendChild(headerRow);

  const tabBar = document.createElement("div");
  tabBar.className = "tab-bar tabs";
  TAB_DEFINITIONS.forEach((definition) => {
    const tab = document.createElement("button");
    tab.className = definition.key === AppState.activeTab ? "tab active" : "tab";
    tab.type = "button";
    tab.textContent = definition.label;
    tab.addEventListener("click", () => {
      setActiveTab(definition.key);
    });
    tabBar.appendChild(tab);
  });

  root.append(header, tabBar, renderTabContent(AppState.activeTab));
}

/**
 * Renders the active profile tab content for mods, packs, or shaders.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab id.
 * @returns {HTMLDivElement} Tab content element.
 */
function renderTabContent(tab) {
  const profile = getActiveProfile();
  const container = document.createElement("div");
  container.className = "tab-content tab-panel";

  if (!profile) {
    return container;
  }

  const isFavoritesView = isFavoritesProfileId(AppState.activeProfileId);

  const definition = TAB_DEFINITIONS.find((entry) => entry.key === tab) ?? TAB_DEFINITIONS[0];
  const actions = document.createElement("div");
  actions.className = "tab-actions";

  const title = document.createElement("div");
  title.className = "helper-text";
  title.textContent = isFavoritesView
    ? `Starred ${definition.label.toLowerCase()} from all profiles.`
    : `Manage ${definition.label.toLowerCase()} for this profile.`;

  const buttons = document.createElement("div");
  buttons.className = "profile-toolbar";

  if (!isFavoritesView) {
    const searchButton = createButton("+ Add via Browse", "btn-accent");
    searchButton.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("packtracker:open-search", {
          detail: {
            query: "",
            projectType: definition.projectType,
            sourceTab: tab,
          },
        })
      );
    });

    const manualButton = createButton("+ Add manually");
    manualButton.addEventListener("click", () => {
      const manualType = tab === "mods" ? "mod" : definition.projectType;
      showAddManualModal(profile.id, manualType);
    });

    const updateButton = createButton("↻ Update to version");
    updateButton.addEventListener("click", () => {
      showBulkUpdateModal(profile.id, tab);
    });

    const downloadButton = createButton(resolveDownloadButtonLabel(tab));
    downloadButton.addEventListener("click", async () => {
      downloadButton.disabled = true;
      const originalLabel = downloadButton.textContent;
      downloadButton.textContent = "Downloading...";
      try {
        await beginDownloadFlow(profile.id, tab);
      } finally {
        downloadButton.disabled = false;
        downloadButton.textContent = originalLabel;
      }
    });

    buttons.append(searchButton, manualButton, updateButton, downloadButton, createViewToggle(tab));
  } else {
    buttons.append(createViewToggle(tab));
  }
  actions.append(title, buttons);
  container.appendChild(actions);

  const items = getTabItems(profile, tab);
  if (items.length === 0) {
    container.appendChild(createEmptyState(definition));
    return container;
  }

  const list = document.createElement("div");
  list.className = getViewMode(tab) === "grid" ? "list-stack is-grid" : "list-stack";

  items.forEach((item) => {
    if (tab === "mods") {
      list.appendChild(renderModCard(item, profile.id));
    } else {
      list.appendChild(renderPackCard(item, profile.id, definition.projectType));
    }
  });

  container.appendChild(list);
  return container;
}

/**
 * Builds the mod card UI with compatibility and dependency affordances.
 *
 * @param {object} mod - Mod entry.
 * @param {string} profileId - Profile identifier.
 * @returns {HTMLDivElement} Mod card.
 */
function renderModCard(mod, profileId) {
  const sourceProfileId = mod.sourceProfileId || profileId;
  const profile = AppState.data?.profiles.find((entry) => entry.id === sourceProfileId);
  const compatibility = checkCompatibility(mod, profile);
  const missingDependencies = getMissingDependencies(mod, profile);
  const card = document.createElement("div");
  card.className = compatibility.compatible ? "mod-card" : "mod-card is-incompatible";

  card.appendChild(createIconNode(mod.name, mod.iconUrl, 48));

  const info = document.createElement("div");
  info.className = "mod-info";

  const titleRow = document.createElement("div");
  titleRow.className = "mod-title-row";

  const titleStack = document.createElement("div");
  titleStack.className = "mod-title-stack";

  const headingLine = document.createElement("div");
  headingLine.className = "card-heading-line";

  const name = document.createElement("div");
  name.className = "mod-name";
  name.textContent = mod.name;

  const author = document.createElement("div");
  author.className = "mod-author";
  author.textContent = `by ${mod.author || "Unknown author"}`;

  headingLine.append(name, author);

  const badges = document.createElement("div");
  badges.className = "mod-badges";
  if (mod.versionNumber || mod.version) {
    badges.appendChild(createBadge("badge-version", mod.versionNumber || mod.version));
  }
  if (Array.isArray(mod.loaders) && mod.loaders.length > 0) {
    badges.appendChild(createLoaderBadge(resolveDisplayedLoader(mod.loaders, profile?.loader)));
  }
  if (Array.isArray(mod.mcVersions) && mod.mcVersions.length > 0) {
    badges.appendChild(createBadge("badge-version", mod.mcVersions[0]));
  }
  if (!compatibility.compatible && compatibility.warning) {
    const warning = createBadge("badge-danger", "Incompatible");
    warning.classList.add("warning-indicator");
    warning.title = compatibility.warning;
    badges.appendChild(warning);
  }

  if (missingDependencies.length > 0) {
    const depsButton = document.createElement("button");
    depsButton.className = "btn btn-small deps-btn";
    depsButton.type = "button";
    depsButton.textContent = `+ Dependencies: ${missingDependencies.length}`;
    depsButton.addEventListener("click", () => {
      showMissingDependenciesModal(mod, profile, missingDependencies);
    });
    badges.appendChild(depsButton);
  }

  const description = document.createElement("div");
  description.className = "mod-desc";
  description.textContent = mod.description || "No description provided.";

  const meta = document.createElement("div");
  meta.className = "mod-meta";
  meta.textContent = buildMetaLine([
    mod.sourceProfileName ? `From ${mod.sourceProfileName}` : "",
    mod.source === "manual" ? "Manual" : "Modrinth",
    `Added ${formatRelativeDate(mod.addedAt)}`,
  ]);

  const footer = document.createElement("div");
  footer.className = "mod-card-footer";

  const links = document.createElement("div");
  links.className = "mod-card-links";

  const sourceButton = createButton(mod.source === "manual" ? "Manual" : "Modrinth");
  if (mod.modrinthUrl) {
    sourceButton.addEventListener("click", () => {
      window.open(mod.modrinthUrl, "_blank", "noopener");
    });
  } else {
    sourceButton.disabled = true;
  }

  const notesButton = createButton(mod.notes ? "Edit note" : "Note");
  notesButton.classList.add("btn-small");
  notesButton.addEventListener("click", () => {
    showModNotesModal(sourceProfileId, mod.id);
  });

  links.append(sourceButton, notesButton);

  const actions = document.createElement("div");
  actions.className = "mod-actions";

  const starButton = document.createElement("button");
  starButton.className = mod.starred ? "star-btn active" : "star-btn";
  starButton.type = "button";
  starButton.setAttribute("aria-label", `Toggle favorite for ${mod.name}`);
  starButton.textContent = mod.starred ? "★" : "☆";
  starButton.addEventListener("click", () => {
    starButton.classList.remove("bounce");
    void starButton.offsetWidth;
    starButton.classList.add("bounce");
    updateMod(sourceProfileId, mod.id, { starred: !mod.starred });
  });

  const menuButton = document.createElement("button");
  menuButton.className = "icon-btn";
  menuButton.type = "button";
  menuButton.textContent = "⋯";
  menuButton.addEventListener("click", () => {
    const rect = menuButton.getBoundingClientRect();
    showItemMenu(mod, sourceProfileId, "mod", rect.left, rect.bottom + 4);
  });

  actions.append(starButton, menuButton);
  footer.append(links, actions);
  titleStack.append(headingLine, badges, description, meta, footer);
  titleRow.append(titleStack);
  info.appendChild(titleRow);
  card.appendChild(info);
  return card;
}

/**
 * Builds the simpler pack/shader card layout used for non-mod items.
 *
 * @param {object} item - Resource pack or shader item.
 * @param {string} profileId - Profile identifier.
 * @param {"resourcepack"|"shader"} type - Pack type.
 * @returns {HTMLDivElement} Pack card.
 */
function renderPackCard(item, profileId, type) {
  const sourceProfileId = item.sourceProfileId || profileId;
  const card = document.createElement("div");
  card.className = "mod-card";

  if (item.source === "manual") {
    const placeholder = document.createElement("div");
    placeholder.className = "mod-icon-placeholder";
    placeholder.textContent = "↗";
    card.appendChild(placeholder);
  } else {
    card.appendChild(createIconNode(item.name, item.iconUrl, 48));
  }

  const info = document.createElement("div");
  info.className = "mod-info";

  const titleRow = document.createElement("div");
  titleRow.className = "mod-title-row";

  const titleStack = document.createElement("div");
  titleStack.className = "mod-title-stack";

  const headingLine = document.createElement("div");
  headingLine.className = "card-heading-line";

  const name = document.createElement("div");
  name.className = "mod-name";
  name.textContent = item.name;

  const author = document.createElement("div");
  author.className = "mod-author";
  author.textContent = `by ${item.author || "Unknown author"}`;

  headingLine.append(name, author);

  const badges = document.createElement("div");
  badges.className = "item-badges";
  badges.appendChild(createBadge("badge-source", item.source === "manual" ? "Manual" : "Modrinth"));
  if (item.version) {
    badges.appendChild(createBadge("badge-version", item.version));
  }

  const description = document.createElement("div");
  description.className = "mod-desc";
  description.textContent = item.description || `No ${resolveTypeLabel(type).toLowerCase()} description provided.`;

  const meta = document.createElement("div");
  meta.className = "item-meta";
  meta.textContent = buildMetaLine([
    item.sourceProfileName ? `From ${item.sourceProfileName}` : "",
    resolveTypeLabel(type),
    `Added ${formatRelativeDate(item.addedAt)}`,
  ]);

  const footer = document.createElement("div");
  footer.className = "mod-card-footer";

  const links = document.createElement("div");
  links.className = "mod-card-links";

  const sourceButton = createButton(item.source === "manual" ? "Manual" : "Modrinth");
  if (item.modrinthUrl) {
    sourceButton.addEventListener("click", () => {
      window.open(item.modrinthUrl, "_blank", "noopener");
    });
  } else {
    sourceButton.disabled = true;
  }

  const notesButton = createButton(item.notes ? "Edit note" : "Note");
  notesButton.classList.add("btn-small");
  notesButton.addEventListener("click", () => {
    showItemNotesModal(sourceProfileId, item.id, type);
  });

  links.append(sourceButton, notesButton);

  const actions = document.createElement("div");
  actions.className = "mod-actions";

  const starButton = document.createElement("button");
  starButton.className = item.starred ? "star-btn active" : "star-btn";
  starButton.type = "button";
  starButton.setAttribute("aria-label", `Toggle favorite for ${item.name}`);
  starButton.textContent = item.starred ? "★" : "☆";
  starButton.addEventListener("click", () => {
    starButton.classList.remove("bounce");
    void starButton.offsetWidth;
    starButton.classList.add("bounce");
    if (type === "resourcepack") {
      updateResourcePack(sourceProfileId, item.id, { starred: !item.starred });
    } else {
      updateShader(sourceProfileId, item.id, { starred: !item.starred });
    }
  });

  const menuButton = document.createElement("button");
  menuButton.className = "icon-btn";
  menuButton.type = "button";
  menuButton.textContent = "⋯";
  menuButton.addEventListener("click", () => {
    const rect = menuButton.getBoundingClientRect();
    showItemMenu(item, sourceProfileId, type, rect.left, rect.bottom + 4);
  });

  actions.append(starButton, menuButton);
  footer.append(links, actions);
  titleStack.append(headingLine, badges, description, meta, footer);
  titleRow.append(titleStack);
  info.appendChild(titleRow);
  card.appendChild(info);
  return card;
}

/**
 * Checks whether a mod's declared loaders fit the selected profile loader.
 *
 * @param {object} mod - Mod entry.
 * @param {object|null} profile - Active profile.
 * @returns {{compatible:boolean, warning:string|null}} Compatibility result.
 */
function checkCompatibility(mod, profile) {
  if (!profile || !Array.isArray(mod?.loaders) || mod.loaders.length === 0) {
    return { compatible: true, warning: null };
  }

  const compatible = mod.loaders.includes(profile.loader);
  if (compatible) {
    return { compatible: true, warning: null };
  }

  return {
    compatible: false,
    warning: `${mod.name} targets ${mod.loaders.join(", ")} instead of ${profile.loader}.`,
  };
}

/**
 * Returns dependency project ids that are not already present in the profile.
 *
 * @param {object} mod - Mod entry.
 * @param {object|null} profile - Target profile.
 * @returns {Array<string>} Missing dependency project ids.
 */
function getMissingDependencies(mod, profile) {
  if (!profile || !Array.isArray(mod?.dependencies) || mod.dependencies.length === 0) {
    return [];
  }

  const installedIds = new Set(profile.mods.map((entry) => entry.id));
  return mod.dependencies.filter((dependencyId) => !installedIds.has(dependencyId));
}

/**
 * Opens a notes modal for editing a mod's freeform notes.
 *
 * @param {string} profileId - Profile identifier.
 * @param {string} modId - Mod identifier.
 */
function showModNotesModal(profileId, modId) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  const mod = profile?.mods.find((entry) => entry.id === modId);
  if (!mod) {
    return;
  }

  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle(`Notes for ${mod.name}`);
  const fieldGroup = document.createElement("div");
  fieldGroup.className = "form-group";
  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = "Notes";
  const textarea = document.createElement("textarea");
  textarea.value = mod.notes || "";
  fieldGroup.append(label, textarea);

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const saveButton = createButton("Save", "btn-primary");
  cancelButton.addEventListener("click", closeOverlays);
  saveButton.addEventListener("click", () => {
    updateMod(profileId, modId, { notes: textarea.value.trim() });
    closeOverlays();
  });

  actions.append(cancelButton, saveButton);
  modal.append(title, fieldGroup, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Opens a notes modal for resource packs and shaders.
 *
 * @param {string} profileId - Profile identifier.
 * @param {string} itemId - Item identifier.
 * @param {"resourcepack"|"shader"} type - Pack-like item type.
 */
function showItemNotesModal(profileId, itemId, type) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const collection = type === "resourcepack" ? profile.resourcePacks : profile.shaders;
  const item = collection.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle(`Notes for ${item.name}`);
  const fieldGroup = document.createElement("div");
  fieldGroup.className = "form-group";

  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = "Notes";

  const textarea = document.createElement("textarea");
  textarea.value = item.notes || "";
  fieldGroup.append(label, textarea);

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const saveButton = createButton("Save", "btn-primary");
  cancelButton.addEventListener("click", closeOverlays);
  saveButton.addEventListener("click", () => {
    item.notes = textarea.value.trim();
    AppState.data = saveData(AppState.data);
    notifyStateChanged("update-item-notes");
    closeOverlays();
  });

  actions.append(cancelButton, saveButton);
  modal.append(title, fieldGroup, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Opens a modal for manually tracking a mod, resource pack, or shader entry.
 *
 * @param {string} profileId - Profile identifier.
 * @param {"mod"|"resourcepack"|"shader"} type - Manual entry type.
 */
function showAddManualModal(profileId, type) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle(`Add manual ${resolveTypeLabel(type)}`);

  const nameGroup = createTextField("Name");
  const authorGroup = createTextField("Author");
  const versionGroup = createTextField("Version");
  const urlGroup = createTextField("URL");
  const notesGroup = document.createElement("div");
  notesGroup.className = "form-group";
  const notesLabel = document.createElement("label");
  notesLabel.className = "form-label";
  notesLabel.textContent = "Notes";
  const notesInput = document.createElement("textarea");
  notesGroup.append(notesLabel, notesInput);

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const addButton = createButton("Add", "btn-primary");
  cancelButton.addEventListener("click", closeOverlays);
  addButton.addEventListener("click", () => {
    const commonFields = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: nameGroup.input.value.trim() || `Untitled ${resolveTypeLabel(type)}`,
      version: versionGroup.input.value.trim(),
      versionNumber: versionGroup.input.value.trim(),
      description: notesInput.value.trim(),
      author: authorGroup.input.value.trim() || "Unknown",
      downloadUrl: urlGroup.input.value.trim(),
      modrinthUrl: "",
      iconUrl: "",
      source: "manual",
      starred: false,
      notes: notesInput.value.trim(),
      addedAt: Date.now(),
    };

    if (type === "mod") {
      addMod(profileId, {
        ...commonFields,
        versionId: "",
        versionNumber: versionGroup.input.value.trim() || "Manual",
        mcVersions: profile.mcVersion ? [profile.mcVersion] : [],
        loaders: profile.loader && profile.loader !== "vanilla" ? [profile.loader] : [],
        dependencies: [],
      });
    } else if (type === "resourcepack") {
      addResourcePack(profileId, commonFields);
    } else {
      addShader(profileId, commonFields);
    }

    closeOverlays();
  });

  actions.append(cancelButton, addButton);
  modal.append(
    title,
    nameGroup.group,
    authorGroup.group,
    versionGroup.group,
    urlGroup.group,
    notesGroup,
    actions
  );
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Returns the correct item list for the selected profile tab.
 *
 * @param {object} profile - Active profile.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab id.
 * @returns {Array<object>} Items for the tab.
 */
function getTabItems(profile, tab) {
  if (tab === "mods") {
    return profile.mods;
  }
  if (tab === "resourcepacks") {
    return profile.resourcePacks;
  }
  return profile.shaders;
}

/**
 * Builds the empty-state UI for a tab with a search shortcut.
 *
 * @param {{label:string, projectType:string}} definition - Tab descriptor.
 * @returns {HTMLDivElement} Empty state element.
 */
function createEmptyState(definition) {
  const empty = document.createElement("div");
  empty.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-state-icon";
  icon.textContent = "◻";

  const title = document.createElement("div");
  title.className = "empty-state-title";
  title.textContent = definition.key === "mods"
    ? "No mods yet"
    : definition.key === "resourcepacks"
      ? "No resource packs yet"
      : "No shaders yet";

  const text = document.createElement("div");
  text.className = "empty-state-text";
  text.textContent = definition.key === "mods"
    ? "Browse Modrinth or add your first mod manually."
    : definition.key === "resourcepacks"
      ? "Browse Modrinth or add your first resource pack manually."
      : "Browse Modrinth or add your first shader manually.";

  const button = createButton(
    definition.key === "mods"
      ? "+ Add mod"
      : definition.key === "resourcepacks"
        ? "+ Add resource pack"
        : "+ Add shader",
    "btn-primary"
  );
  button.addEventListener("click", () => {
    window.dispatchEvent(
      new CustomEvent("packtracker:open-search", {
        detail: {
          query: "",
          projectType: definition.projectType,
          sourceTab: definition.key,
        },
      })
    );
  });

  empty.append(icon, title, text, button);
  return empty;
}

/**
 * Resolves the button label used for tab-specific bulk downloads.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @returns {string} Button label.
 */
function resolveDownloadButtonLabel(tab) {
  if (tab === "resourcepacks") {
    return "⤓ Download resource packs";
  }
  if (tab === "shaders") {
    return "⤓ Download shaders";
  }
  return "⤓ Download mods";
}

/**
 * Opens the bulk-update modal for the current tab and lets the user choose a target version.
 *
 * @param {string} profileId - Active profile id.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 */
function showBulkUpdateModal(profileId, tab) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle(`Update ${resolveTabCollectionLabel(tab)} to a Minecraft version`);
  const subtitle = createModalSubtitle("PackTracker will try to find the newest compatible Modrinth version for every visible item. If it cannot find one, it will tell you why.");

  const versionGroup = createTextField("Target Minecraft version");
  versionGroup.input.value = profile.mcVersion || "1.21.1";
  versionGroup.input.setAttribute("list", "update-version-presets");
  versionGroup.input.placeholder = "1.21.1";

  const presets = document.createElement("datalist");
  presets.id = "update-version-presets";
  UPDATE_TARGET_VERSION_PRESETS.forEach((version) => {
    const option = document.createElement("option");
    option.value = version;
    presets.appendChild(option);
  });

  const note = document.createElement("div");
  note.className = "modal-subtitle";
  note.textContent = tab === "mods"
    ? `Mods will be matched against ${capitalize(profile.loader)} and the target Minecraft version.`
    : "Resource packs and shaders will be matched against the chosen Minecraft version when possible.";

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const startButton = createButton("Start update", "btn-primary");
  cancelButton.addEventListener("click", closeOverlays);
  startButton.addEventListener("click", () => {
    const targetVersion = versionGroup.input.value.trim() || profile.mcVersion || "1.21.1";
    closeOverlays();
    void beginBulkUpdateFlow(profileId, tab, targetVersion);
  });

  actions.append(cancelButton, startButton);
  modal.append(title, subtitle, versionGroup.group, presets, note, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Starts a sequential update pass for the current tab items.
 *
 * @param {string} profileId - Active profile id.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @param {string} targetVersion - Requested Minecraft version.
 */
async function beginBulkUpdateFlow(profileId, tab, targetVersion) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const items = getTabItems(profile, tab);
  updateSession = {
    profileId,
    tab,
    targetVersion,
    title: `Updating ${resolveTabCollectionLabel(tab)} to ${targetVersion}`,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      status: UPDATE_ROW_STATES.QUEUED,
      message: "queued",
      fromVersion: item.versionNumber || item.version || "",
      toVersion: "",
    })),
    running: true,
  };

  renderBulkUpdateProgressModal();
  const summary = await runBulkUpdateQueue(profileId, tab, targetVersion);
  updateSession.running = false;
  renderBulkUpdateProgressModal();
  if (typeof namespace.showToast === "function") {
    namespace.showToast(`Updated ${summary.updated} items, skipped ${summary.skipped}, failed ${summary.failed}.`, summary.failed > 0 ? "warning" : "success");
  }
}

/**
 * Runs the active bulk-update queue and writes successful version updates back to storage once.
 *
 * @param {string} profileId - Active profile id.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @param {string} targetVersion - Requested Minecraft version.
 * @returns {Promise<{updated:number, skipped:number, failed:number}>} Update summary.
 */
async function runBulkUpdateQueue(profileId, tab, targetVersion) {
  const summary = { updated: 0, skipped: 0, failed: 0 };
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile || !updateSession) {
    return summary;
  }

  const collection = getTabItems(profile, tab);
  for (const row of updateSession.items) {
    const currentItem = collection.find((item) => item.id === row.id);
    if (!currentItem) {
      row.status = UPDATE_ROW_STATES.ERROR;
      row.message = "Item no longer exists";
      summary.failed += 1;
      renderBulkUpdateProgressModal();
      continue;
    }

    row.status = UPDATE_ROW_STATES.CHECKING;
    row.message = "checking Modrinth...";
    renderBulkUpdateProgressModal();

    try {
      const candidate = await resolveBulkUpdateCandidate(currentItem, tab, targetVersion, profile);
      if (candidate.kind === "skip") {
        row.status = UPDATE_ROW_STATES.SKIPPED;
        row.message = candidate.message;
        summary.skipped += 1;
        renderBulkUpdateProgressModal();
        continue;
      }

      applyBulkUpdateToItem(currentItem, candidate.project, candidate.version, tab);
      row.status = UPDATE_ROW_STATES.UPDATED;
      row.message = candidate.message;
      row.toVersion = candidate.version.version_number || "";
      summary.updated += 1;
    } catch (error) {
      row.status = UPDATE_ROW_STATES.ERROR;
      row.message = error instanceof Error ? error.message : "Update failed";
      summary.failed += 1;
    }

    renderBulkUpdateProgressModal();
  }

  AppState.data = saveData(AppState.data);
  notifyStateChanged("bulk-update");
  return summary;
}

/**
 * Finds a compatible Modrinth version for one item and target Minecraft version.
 *
 * @param {object} item - Stored item.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @param {string} targetVersion - Requested Minecraft version.
 * @param {object} profile - Owning profile.
 * @returns {Promise<{kind:"update", project:object, version:object, message:string}|{kind:"skip", message:string}>} Update candidate.
 */
async function resolveBulkUpdateCandidate(item, tab, targetVersion, profile) {
  const projectId = resolveDownloadProjectId(item);
  if (!projectId || item.source === "manual") {
    return { kind: "skip", message: "Manual item or missing Modrinth link" };
  }

  const project = await getProject(projectId);
  if (project.error) {
    return { kind: "skip", message: project.message || "Could not load project" };
  }

  let versions = await getProjectVersions(projectId, {
    loader: tab === "mods" && profile.loader !== "vanilla" ? profile.loader : "",
    gameVersion: targetVersion,
  });
  if (versions.error || versions.length === 0) {
    versions = await getProjectVersions(projectId);
  }
  if (versions.error || versions.length === 0) {
    return { kind: "skip", message: "No versions found" };
  }

  const compatibleVersions = sortVersionsNewestFirst(versions).filter((version) => {
    const matchesVersion = Array.isArray(version.game_versions) && version.game_versions.includes(targetVersion);
    const matchesLoader = tab !== "mods"
      || profile.loader === "vanilla"
      || (Array.isArray(version.loaders) && version.loaders.includes(profile.loader));
    return matchesVersion && matchesLoader;
  });

  if (compatibleVersions.length === 0) {
    return {
      kind: "skip",
      message: tab === "mods"
        ? `No ${capitalize(profile.loader)} version for ${targetVersion}`
        : `No version found for ${targetVersion}`,
    };
  }

  const nextVersion = compatibleVersions[0];
  const currentVersion = item.versionNumber || item.version || "";
  if ((nextVersion.version_number || "") === currentVersion) {
    return { kind: "skip", message: `Already on ${targetVersion}` };
  }

  return {
    kind: "update",
    project,
    version: nextVersion,
    message: `Updated to ${nextVersion.version_number || targetVersion}`,
  };
}

/**
 * Applies a chosen Modrinth version payload back onto a stored item.
 *
 * @param {object} item - Stored item reference.
 * @param {object} project - Resolved Modrinth project.
 * @param {object} version - Chosen Modrinth version.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 */
function applyBulkUpdateToItem(item, project, version, tab) {
  const primaryFile = Array.isArray(version?.files)
    ? version.files.find((file) => file.primary) || version.files[0]
    : null;

  if (tab === "mods") {
    Object.assign(item, {
      version: version.version_number || item.version || "",
      versionNumber: version.version_number || item.versionNumber || "",
      versionId: version.id || item.versionId || "",
      modrinthId: project.id || item.modrinthId || item.id,
      downloadUrl: primaryFile?.url || item.downloadUrl || "",
      modrinthUrl: `https://modrinth.com/mod/${project.slug || project.id}`,
      iconUrl: project.icon_url || item.iconUrl || "",
      description: project.description || item.description || "",
      author: project.author || item.author || "Unknown author",
      mcVersions: Array.isArray(version.game_versions) ? version.game_versions : item.mcVersions,
      loaders: Array.isArray(version.loaders) ? version.loaders : item.loaders,
      source: "modrinth",
    });
    return;
  }

  Object.assign(item, {
    version: version.version_number || item.version || "",
    versionId: version.id || item.versionId || "",
    modrinthId: project.id || item.modrinthId || item.id,
    downloadUrl: primaryFile?.url || item.downloadUrl || "",
    modrinthUrl: `https://modrinth.com/${tab === "resourcepacks" ? "resourcepack" : "shader"}/${project.slug || project.id}`,
    iconUrl: project.icon_url || item.iconUrl || "",
    description: project.description || item.description || "",
    author: project.author || item.author || "Unknown author",
    source: "modrinth",
  });
}

/**
 * Renders the persistent bulk-update progress modal with per-item results.
 */
function renderBulkUpdateProgressModal() {
  if (!updateSession) {
    return;
  }

  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (!modalRoot) {
    return;
  }

  modalRoot.replaceChildren();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay download-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal-wide download-modal";

  const header = document.createElement("div");
  header.className = "download-modal-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "scan-modal-title-wrap";

  const title = document.createElement("div");
  title.className = "modal-title";
  title.textContent = updateSession.title;

  const completedCount = updateSession.items.filter((item) => item.status !== UPDATE_ROW_STATES.QUEUED && item.status !== UPDATE_ROW_STATES.CHECKING).length;
  const subtitle = document.createElement("div");
  subtitle.className = "modal-subtitle";
  subtitle.textContent = `${completedCount} of ${updateSession.items.length} checked`;

  titleWrap.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.className = "icon-btn";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close update progress");
  closeButton.textContent = "X";
  closeButton.addEventListener("click", closeBulkUpdateModal);

  header.append(titleWrap, closeButton);

  const progress = document.createElement("div");
  progress.className = "download-progress";

  const progressBar = document.createElement("div");
  progressBar.className = "download-progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "download-progress-fill";
  progressFill.style.width = `${resolveBulkUpdateProgress(updateSession)}%`;
  progressBar.appendChild(progressFill);

  const progressLabel = document.createElement("div");
  progressLabel.className = "download-progress-label";
  progressLabel.textContent = `${resolveBulkUpdateProgress(updateSession)}%`;
  progress.append(progressBar, progressLabel);

  const list = document.createElement("div");
  list.className = "download-list";
  updateSession.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "download-item";

    const name = document.createElement("div");
    name.className = "download-item-name";
    name.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = `download-item-meta status-${item.status}`;
    meta.textContent = `${resolveDownloadStatusIcon(item.status)} ${item.message}`;

    const version = document.createElement("div");
    version.className = "download-item-size";
    version.textContent = item.toVersion || item.fromVersion || "";

    row.append(name, meta, version);
    list.appendChild(row);
  });

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const doneButton = document.createElement("button");
  doneButton.className = "btn btn-primary";
  doneButton.type = "button";
  doneButton.textContent = "Done";
  doneButton.addEventListener("click", closeBulkUpdateModal);
  actions.appendChild(doneButton);

  modal.append(header, progress, list, actions);
  overlay.appendChild(modal);
  modalRoot.appendChild(overlay);
}

/**
 * Closes the active bulk-update modal.
 */
function closeBulkUpdateModal() {
  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (modalRoot) {
    if (typeof namespace.dismissRootChildren === "function") {
      namespace.dismissRootChildren(modalRoot);
    } else {
      modalRoot.replaceChildren();
    }
  }
  updateSession = null;
}

/**
 * Returns the bulk-update completion percentage.
 *
 * @param {object} session - Active update session.
 * @returns {number} Percentage from 0 to 100.
 */
function resolveBulkUpdateProgress(session) {
  if (!session.items.length) {
    return 0;
  }

  const completedCount = session.items.filter((item) => item.status !== UPDATE_ROW_STATES.QUEUED && item.status !== UPDATE_ROW_STATES.CHECKING).length;
  return Math.round((completedCount / session.items.length) * 100);
}

/**
 * Returns the user-facing collection label for a tab key.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @returns {string} Collection label.
 */
function resolveTabCollectionLabel(tab) {
  if (tab === "resourcepacks") {
    return "resource packs";
  }
  if (tab === "shaders") {
    return "shaders";
  }
  return "mods";
}

/**
 * Starts a sequential download queue for the currently visible tab items.
 *
 * @param {string} profileId - Active profile id.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 */
async function beginDownloadFlow(profileId, tab) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const items = getTabItems(profile, tab);
  const label = tab === "resourcepacks" ? "resource packs" : tab === "shaders" ? "shaders" : "mods";
  downloadSession = {
    profileId,
    tab,
    title: `Downloading ${label} to your browser downloads folder`,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      versionId: item.versionId || "",
      modrinthId: item.modrinthId || item.id || "",
      modrinthUrl: item.modrinthUrl || "",
      downloadUrl: item.downloadUrl || item.url || "",
      source: item.source || "manual",
      mcVersions: Array.isArray(item.mcVersions) ? item.mcVersions : [],
      loaders: Array.isArray(item.loaders) ? item.loaders : [],
      fileName: "",
      sizeLabel: "",
      status: DOWNLOAD_ROW_STATES.QUEUED,
      message: "queued",
    })),
    completed: 0,
    running: true,
  };

  renderDownloadProgressModal();
  await runDownloadQueue();
}

/**
 * Runs the active download queue sequentially.
 */
async function runDownloadQueue() {
  if (!downloadSession) {
    return;
  }

  for (const row of downloadSession.items) {
    if (!downloadSession) {
      return;
    }

    const resolved = await resolveDownloadTarget(row);
    if (!resolved.url) {
      row.status = DOWNLOAD_ROW_STATES.NO_URL;
      row.message = resolved.message || "No download URL";
      renderDownloadProgressModal();
      continue;
    }

    row.status = DOWNLOAD_ROW_STATES.DOWNLOADING;
    row.message = "sending to browser...";
    row.fileName = resolved.filename;
    row.sizeLabel = resolved.sizeLabel;
    renderDownloadProgressModal();

    try {
      await downloadFile(resolved.url, resolved.filename);
      row.status = DOWNLOAD_ROW_STATES.DONE;
      row.message = "download started";
      downloadSession.completed += 1;
      if (typeof namespace.showToast === "function") {
        namespace.showToast(`Started download for ${resolved.filename}`, "success");
      }
    } catch (error) {
      row.status = DOWNLOAD_ROW_STATES.ERROR;
      row.message = error instanceof Error ? error.message : "Download failed";
      if (typeof namespace.showToast === "function") {
        namespace.showToast(`Download failed: ${row.message}`, "danger");
      }
    }

    renderDownloadProgressModal();
  }

  downloadSession.running = false;
  renderDownloadProgressModal();
}

/**
 * Resolves the correct file URL and filename for one queued item.
 *
 * @param {object} item - Download queue row.
 * @returns {Promise<{url:string, filename:string, sizeLabel:string, message?:string}>} Download target info.
 */
async function resolveDownloadTarget(item) {
  if (item.versionId) {
    const version = await getVersion(item.versionId);
    if (!version.error && Array.isArray(version.files) && version.files.length > 0) {
      const primaryFile = version.files.find((file) => file.primary) || version.files[0];
      return {
        url: primaryFile?.url || "",
        filename: primaryFile?.filename || `${sanitizeFileName(item.name)}.jar`,
        sizeLabel: formatByteSize(primaryFile?.size),
      };
    }
  }

  if (item.downloadUrl) {
    return {
      url: item.downloadUrl,
      filename: inferFileName(item.downloadUrl, item.name),
      sizeLabel: "",
    };
  }

  const projectId = resolveDownloadProjectId(item);
  if (projectId) {
    let versions = await getProjectVersions(projectId, {
      loader: Array.isArray(item.loaders) && item.loaders.length > 0 ? item.loaders[0] : "",
      gameVersion: Array.isArray(item.mcVersions) && item.mcVersions.length > 0 ? item.mcVersions[0] : "",
    });

    if (versions?.error || !Array.isArray(versions) || versions.length === 0) {
      versions = await getProjectVersions(projectId);
    }

    if (!versions?.error && Array.isArray(versions)) {
      const downloadableVersion = sortVersionsNewestFirst(versions).find(
        (version) => Array.isArray(version.files) && version.files.length > 0
      );
      if (downloadableVersion) {
        const primaryFile = downloadableVersion.files.find((file) => file.primary) || downloadableVersion.files[0];
        return {
          url: primaryFile?.url || "",
          filename: primaryFile?.filename || `${sanitizeFileName(item.name)}.jar`,
          sizeLabel: formatByteSize(primaryFile?.size),
        };
      }
    }
  }

  return {
    url: "",
    filename: "",
    sizeLabel: "",
    message: item.source === "manual" ? "Manual entries need a direct download URL" : "No downloadable file found",
  };
}

/**
 * Renders the persistent bulk-download progress modal.
 */
function renderDownloadProgressModal() {
  if (!downloadSession) {
    return;
  }

  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (!modalRoot) {
    return;
  }

  modalRoot.replaceChildren();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay download-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal-wide download-modal";

  const header = document.createElement("div");
  header.className = "download-modal-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "scan-modal-title-wrap";

  const title = document.createElement("div");
  title.className = "modal-title";
  title.textContent = downloadSession.title;

  const subtitle = document.createElement("div");
  subtitle.className = "modal-subtitle";
  subtitle.textContent = `${downloadSession.completed} of ${downloadSession.items.length} queued for browser download`;

  titleWrap.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.className = "icon-btn";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close downloads");
  closeButton.textContent = "X";
  closeButton.addEventListener("click", closeDownloadModal);

  header.append(titleWrap, closeButton);

  const progress = document.createElement("div");
  progress.className = "download-progress";

  const progressBar = document.createElement("div");
  progressBar.className = "download-progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "download-progress-fill";
  progressFill.style.width = `${resolveDownloadProgress(downloadSession)}%`;
  progressBar.appendChild(progressFill);

  const progressLabel = document.createElement("div");
  progressLabel.className = "download-progress-label";
  progressLabel.textContent = `${resolveDownloadProgress(downloadSession)}%`;
  progress.append(progressBar, progressLabel);

  const list = document.createElement("div");
  list.className = "download-list";
  downloadSession.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "download-item";

    const name = document.createElement("div");
    name.className = "download-item-name";
    name.textContent = item.fileName || item.name;

    const meta = document.createElement("div");
    meta.className = `download-item-meta status-${item.status}`;
    meta.textContent = `${resolveDownloadStatusIcon(item.status)} ${item.message}`;

    const size = document.createElement("div");
    size.className = "download-item-size";
    size.textContent = item.sizeLabel || "";

    row.append(name, meta, size);
    list.appendChild(row);
  });

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const doneButton = document.createElement("button");
  doneButton.className = "btn btn-primary";
  doneButton.type = "button";
  doneButton.textContent = "Done";
  doneButton.addEventListener("click", closeDownloadModal);
  actions.appendChild(doneButton);

  modal.append(header, progress, list, actions);
  overlay.appendChild(modal);
  modalRoot.appendChild(overlay);
}

/**
 * Closes the active download modal.
 */
function closeDownloadModal() {
  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (modalRoot) {
    if (typeof namespace.dismissRootChildren === "function") {
      namespace.dismissRootChildren(modalRoot);
    } else {
      modalRoot.replaceChildren();
    }
  }
  downloadSession = null;
}

/**
 * Returns the queue completion percentage.
 *
 * @param {object} session - Download session.
 * @returns {number} Percentage from 0 to 100.
 */
function resolveDownloadProgress(session) {
  if (!session.items.length) {
    return 0;
  }

  const completedCount = session.items.filter((item) => item.status !== DOWNLOAD_ROW_STATES.QUEUED && item.status !== DOWNLOAD_ROW_STATES.DOWNLOADING).length;
  return Math.round((completedCount / session.items.length) * 100);
}

/**
 * Returns the inline icon for one download state.
 *
 * @param {string} status - Download state.
 * @returns {string} Display icon.
 */
function resolveDownloadStatusIcon(status) {
  if (status === DOWNLOAD_ROW_STATES.DONE) {
    return "+";
  }
  if (status === DOWNLOAD_ROW_STATES.DOWNLOADING) {
    return ">";
  }
  if (status === DOWNLOAD_ROW_STATES.NO_URL) {
    return "x";
  }
  if (status === DOWNLOAD_ROW_STATES.ERROR) {
    return "x";
  }
  return "o";
}

/**
 * Formats bytes into a compact size label.
 *
 * @param {number|undefined} value - Byte size.
 * @returns {string} Human-readable size.
 */
function formatByteSize(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  const megabytes = value / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
}

/**
 * Builds a safe fallback filename from a URL or item name.
 *
 * @param {string} url - Source URL.
 * @param {string} name - Item display name.
 * @returns {string} File name.
 */
function inferFileName(url, name) {
  try {
    const pathname = new URL(url).pathname;
    const candidate = pathname.split("/").pop();
    if (candidate) {
      return decodeURIComponent(candidate);
    }
  } catch (error) {
    // Ignore malformed URLs and fall back to the display name.
  }

  return `${sanitizeFileName(name)}.jar`;
}

/**
 * Sanitizes a label for filesystem use.
 *
 * @param {string} value - Raw label.
 * @returns {string} Safe file stem.
 */
function sanitizeFileName(value) {
  return String(value || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim() || "download";
}

/**
 * Resolves a Modrinth project id from a stored item record.
 *
 * @param {object} item - Download queue item.
 * @returns {string} Modrinth project id or empty string.
 */
function resolveDownloadProjectId(item) {
  if (item.modrinthId) {
    return String(item.modrinthId);
  }

  const url = String(item.modrinthUrl || "");
  if (!url) {
    return "";
  }

  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return segments.at(-1) || "";
  } catch (error) {
    return "";
  }
}

/**
 * Shows a dependency-resolution modal with quick-add buttons for missing deps.
 *
 * @param {object} mod - Parent mod.
 * @param {object|null} profile - Active profile.
 * @param {Array<string>} missingDependencies - Missing dependency ids.
 */
async function showMissingDependenciesModal(mod, profile, missingDependencies) {
  if (!profile) {
    return;
  }

  const overlay = createModalOverlay();
  const modal = createModalCard();
  modal.classList.add("modal-wide");
  const title = createModalTitle(`Missing dependencies for ${mod.name}`);
  const subtitle = createModalSubtitle("Add the required projects that are not yet tracked in this profile.");
  const list = document.createElement("div");
  list.className = "dependency-list";

  missingDependencies.forEach((dependencyId) => {
    const item = document.createElement("div");
    item.className = "dependency-item";

    const text = document.createElement("div");
    text.className = "dependency-text";

    const name = document.createElement("div");
    name.className = "dependency-name";
    name.textContent = dependencyId;

    const meta = document.createElement("div");
    meta.className = "dependency-meta";
    meta.textContent = "Fetching Modrinth details...";

    text.append(name, meta);

    const addButton = createButton("+ Add", "btn-accent btn-small");
    addButton.addEventListener("click", async () => {
      addButton.disabled = true;
      addButton.textContent = "Adding...";
      const outcome = await addDependencyToProfile(dependencyId, profile);
      addButton.textContent = outcome ? "Added" : "Unavailable";
      if (!outcome) {
        addButton.disabled = false;
      }
    });

    item.append(text, addButton);
    list.appendChild(item);

    getProject(dependencyId).then((project) => {
      if (!project.error) {
        name.textContent = project.title || project.name || dependencyId;
        meta.textContent = project.description || dependencyId;
      } else {
          meta.textContent = project.message || "Failed to fetch project details.";
      }
    });
  });

  const actions = createActionRow();
  const closeButton = createButton("Close");
  closeButton.addEventListener("click", closeOverlays);
  actions.appendChild(closeButton);

  modal.append(title, subtitle, list, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Adds a compatible dependency project to the profile using its newest matching version.
 *
 * @param {string} projectId - Dependency project id.
 * @param {object} profile - Target profile.
 * @returns {Promise<boolean>} True when a dependency was added.
 */
async function addDependencyToProfile(projectId, profile) {
  const project = await getProject(projectId);
  if (project.error) {
    return false;
  }

  let versions = await getProjectVersions(projectId, {
    loader: profile.loader === "vanilla" ? "" : profile.loader,
    gameVersion: profile.mcVersion,
  });
  if (versions.error || versions.length === 0) {
    versions = await getProjectVersions(projectId);
  }
  if (versions.error || versions.length === 0) {
    return false;
  }

  const version = sortVersionsNewestFirst(versions)[0];
  const dependencies = await getDependencies(version.id);
  const dependencyIds = dependencies.error
    ? []
    : dependencies.dependencies
        .filter((entry) => entry?.dependency_type === "required")
        .map((entry) => entry.project_id)
        .filter(Boolean);

  addMod(profile.id, mapProjectVersionToMod(project, version, dependencyIds));
  return true;
}

/**
 * Shows the per-item overflow menu for mod, resource-pack, and shader cards.
 *
 * @param {object} item - Stored item.
 * @param {string} profileId - Profile identifier.
 * @param {"mod"|"resourcepack"|"shader"} type - Item type.
 * @param {number} x - Viewport x-position.
 * @param {number} y - Viewport y-position.
 */
function showItemMenu(item, profileId, type, x, y) {
  const root = document.getElementById(CONTEXT_ROOT_ID);
  if (!root) {
    return;
  }

  root.replaceChildren();
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  if (item.modrinthUrl) {
    menu.appendChild(
      createContextItem("Open on Modrinth", () => {
        window.open(item.modrinthUrl, "_blank", "noopener");
        root.replaceChildren();
      })
    );
  }

  if (type === "mod") {
    menu.appendChild(
      createContextItem("Edit notes", () => {
        root.replaceChildren();
        showModNotesModal(profileId, item.id);
      })
    );
  } else {
    menu.appendChild(
      createContextItem("Edit notes", () => {
        root.replaceChildren();
        showItemNotesModal(profileId, item.id, type);
      })
    );
  }

  menu.appendChild(
    createContextItem("Remove from profile", () => {
      root.replaceChildren();
      if (type === "mod") {
        removeMod(profileId, item.id);
      } else if (type === "resourcepack") {
        removeResourcePack(profileId, item.id);
      } else {
        removeShader(profileId, item.id);
      }
    }, true)
  );

  root.appendChild(menu);
  positionFloatingMenu(menu, x, y);

  const handleOutsideClick = (event) => {
    if (!menu.contains(event.target)) {
      root.replaceChildren();
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    }
  };
  const handleEscape = (event) => {
    if (event.key === "Escape") {
      root.replaceChildren();
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    }
  };
  window.addEventListener("mousedown", handleOutsideClick);
  window.addEventListener("keydown", handleEscape);
}

/**
 * Shows a delete confirmation modal for the active profile header action.
 *
 * @param {string} profileId - Profile identifier.
 * @param {string} name - Profile display name.
 */
function showDeleteProfileModal(profileId, name) {
  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle(`Delete ${name}?`);
  const subtitle = createModalSubtitle("This removes the profile and every tracked item from PackTracker.");
  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const deleteButton = createButton("Delete", "btn-danger");
  cancelButton.addEventListener("click", closeOverlays);
  deleteButton.addEventListener("click", () => {
    deleteProfile(profileId);
    closeOverlays();
  });
  actions.append(cancelButton, deleteButton);
  modal.append(title, subtitle, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Converts Modrinth project/version data into the local mod storage shape.
 *
 * @param {object} project - Modrinth project payload.
 * @param {object} version - Modrinth version payload.
 * @param {Array<string>} dependencyIds - Required dependency project ids.
 * @returns {object} Storage-ready mod item.
 */
function mapProjectVersionToMod(project, version, dependencyIds) {
  const primaryFile = Array.isArray(version?.files)
    ? version.files.find((file) => file.primary) || version.files[0]
    : null;

  return {
    id: project.id,
    name: project.title || project.name || "Unknown mod",
    description: project.description || "",
    author: project.author || project.team || "Unknown author",
    versionId: version.id || "",
    versionNumber: version.version_number || "Unknown",
    mcVersions: Array.isArray(version.game_versions) ? version.game_versions : [],
    loaders: Array.isArray(version.loaders) ? version.loaders : [],
    downloadUrl: primaryFile?.url || "",
    modrinthUrl: `https://modrinth.com/mod/${project.slug || project.id}`,
    iconUrl: project.icon_url || "",
    source: "modrinth",
    starred: false,
    notes: "",
    dependencies: dependencyIds,
    addedAt: Date.now(),
  };
}

/**
 * Builds a joined metadata line while skipping empty values.
 *
 * @param {Array<string>} parts - Metadata segments.
 * @returns {string} Joined metadata line.
 */
function buildMetaLine(parts) {
  return parts.filter(Boolean).join(" • ");
}

/**
 * Chooses a displayed loader label for the current mod card.
 *
 * @param {Array<string>} loaders - Declared loaders.
 * @param {string|undefined} profileLoader - Profile loader.
 * @returns {string} Loader to display.
 */
function resolveDisplayedLoader(loaders, profileLoader) {
  if (profileLoader && loaders.includes(profileLoader)) {
    return profileLoader;
  }
  return loaders[0];
}

/**
 * Sorts a version array from newest to oldest by publish date.
 *
 * @param {Array<object>} versions - Modrinth version array.
 * @returns {Array<object>} Sorted version array.
 */
function sortVersionsNewestFirst(versions) {
  return [...versions].sort(
    (left, right) => new Date(right.date_published || 0).getTime() - new Date(left.date_published || 0).getTime()
  );
}

/**
 * Creates the list/grid toggle used on profile tabs.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} scope - View mode scope.
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
 * Creates a shared text field group used by manual-entry modals.
 *
 * @param {string} labelText - Field label.
 * @returns {{group: HTMLDivElement, input: HTMLInputElement}} Wrapped field references.
 */
function createTextField(labelText) {
  const group = document.createElement("div");
  group.className = "form-group";
  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  group.append(label, input);
  return { group, input };
}

/**
 * Creates a button with optional modifier classes.
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
 * Creates a badge using the shared badge classes.
 *
 * @param {string} modifier - Modifier class.
 * @param {string} text - Badge label.
 * @returns {HTMLSpanElement} Badge element.
 */
function createBadge(modifier, text) {
  const badge = document.createElement("span");
  badge.className = `badge ${modifier}`;
  badge.textContent = text;
  return badge;
}

/**
 * Creates a loader badge for loader-tag displays.
 *
 * @param {string} loader - Loader identifier.
 * @returns {HTMLSpanElement} Loader badge.
 */
function createLoaderBadge(loader) {
  if (loader === "neoforge") {
    return createBadge("badge-neoforge", "NeoForge");
  }
  if (loader === "vanilla") {
    return createBadge("badge-vanilla", "Vanilla");
  }
  return createBadge(`badge-${loader}`, capitalize(loader));
}

/**
 * Creates an image or placeholder icon node for card media.
 *
 * @param {string} label - Fallback label text.
 * @param {string} iconUrl - Remote icon URL.
 * @param {number} size - Icon size in pixels.
 * @returns {HTMLElement} Icon node.
 */
function createIconNode(label, iconUrl, size) {
  if (iconUrl) {
    const image = document.createElement("img");
    image.className = size === 56 ? "search-card-icon" : "mod-icon";
    image.src = iconUrl;
    image.alt = "";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener(
      "error",
      () => {
        image.replaceWith(createIconPlaceholder(label, size));
      },
      { once: true }
    );
    return image;
  }

  return createIconPlaceholder(label, size);
}

/**
 * Creates a fallback icon placeholder using the first character of the label.
 *
 * @param {string} label - Item label.
 * @param {number} size - Placeholder size.
 * @returns {HTMLDivElement} Placeholder node.
 */
function createIconPlaceholder(label, size) {
  const placeholder = document.createElement("div");
  placeholder.className = size === 56 ? "search-card-icon-placeholder" : "mod-icon-placeholder";
  placeholder.textContent = (label || "?").charAt(0).toUpperCase();
  return placeholder;
}

/**
 * Creates the shared modal overlay element.
 *
 * @returns {HTMLDivElement} Modal overlay.
 */
function createModalOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  return overlay;
}

/**
 * Creates the shared modal card element.
 *
 * @returns {HTMLDivElement} Modal card.
 */
function createModalCard() {
  const modal = document.createElement("div");
  modal.className = "modal";
  return modal;
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
 * Creates a shared modal action row.
 *
 * @returns {HTMLDivElement} Action row.
 */
function createActionRow() {
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  return actions;
}

/**
 * Adds a modal overlay to the shared root and closes on backdrop click.
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
      closeOverlays();
    }
  });
  root.appendChild(overlay);
}

/**
 * Removes shared modal and context-menu overlays from the document.
 */
function closeOverlays() {
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
    contextRoot.replaceChildren();
  }
}

/**
 * Keeps a floating context menu inside the viewport.
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
 * Creates a context-menu action button with optional danger styling.
 *
 * @param {string} text - Menu label.
 * @param {() => void} onClick - Click handler.
 * @param {boolean} danger - Whether this action is destructive.
 * @returns {HTMLButtonElement} Context-menu button.
 */
function createContextItem(text, onClick, danger = false) {
  const item = document.createElement("button");
  item.className = danger ? "context-menu-item danger" : "context-menu-item";
  item.type = "button";
  item.textContent = text;
  item.addEventListener("click", onClick);
  return item;
}

/**
 * Formats a timestamp into a lightweight relative date string.
 *
 * @param {number} timestamp - Unix epoch milliseconds.
 * @returns {string} Relative label.
 */
function formatRelativeDate(timestamp) {
  const diffMs = Date.now() - Number(timestamp || Date.now());
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
  if (diffMonths === 1) {
    return "1 month ago";
  }
  return `${diffMonths} months ago`;
}

/**
 * Converts internal type ids into UI labels.
 *
 * @param {"mod"|"resourcepack"|"shader"} type - Item type.
 * @returns {string} UI label.
 */
function resolveTypeLabel(type) {
  if (type === "resourcepack") {
    return "Resource Pack";
  }
  if (type === "shader") {
    return "Shader";
  }
  return "Mod";
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
  renderProfileView,
  renderTabContent,
  renderModCard,
  renderPackCard,
  checkCompatibility,
  getMissingDependencies,
  showModNotesModal,
  showAddManualModal,
});
})();
