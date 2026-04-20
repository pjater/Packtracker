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
    generateShareLink,
    getDependencies,
    getProject,
    getVersion,
    getProjectVersions,
    cfGetProject,
    cfGetVersion,
    cfGetProjectVersions,
    initScanner,
    downloadFile,
  } = namespace;
  const HOME_VIEW_ID = "view-home";
  const MODAL_ROOT_ID = "modal-root";
  const CONTEXT_ROOT_ID = "context-menu-root";
  const TOOLTIP_ROOT_ID = "tooltip-root";
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
  const RELEASE_TYPE_LABELS = {
    release: "Release",
    beta: "Beta",
    alpha: "Alpha",
  };
  const layoutEditState = {
    mods: false,
    resourcepacks: false,
    shaders: false,
  };
  let activeListDragHandle = null;
  let downloadSession = null;
  let updateSession = null;

/**
 * Renders the full profile view for the currently active profile.
 */
function renderProfileView() {
  if (activeListDragHandle) {
    activeListDragHandle.destroy();
    activeListDragHandle = null;
  }

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
    const headerActions = document.createElement("div");
    headerActions.className = "profile-header-actions";

    const shareButton = createButton("Share profile");
    shareButton.addEventListener("click", async () => {
      try {
        const shareLink = generateShareLink(profile.id);
        await navigator.clipboard.writeText(shareLink);
        if (typeof namespace.showToast === "function") {
          namespace.showToast("Share link copied!", "success");
        }
      } catch (error) {
        if (typeof namespace.showToast === "function") {
          namespace.showToast("Could not copy share link", "danger");
        }
      }
    });

    const scanButton = createButton("Scan Minecraft Folder");
    scanButton.addEventListener("click", () => {
      initScanner(profile.id);
    });
    headerActions.append(shareButton, scanButton);
    headerRow.appendChild(headerActions);
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

  const content = renderTabContent(AppState.activeTab);
  const existingContent = root.querySelector(".content-panel, .tab-panel");
  if (existingContent instanceof HTMLElement) {
    root.replaceChildren(header, tabBar, existingContent);
  } else {
    root.replaceChildren(header, tabBar);
  }
  switchTabContent(root, content, existingContent instanceof HTMLElement ? existingContent : null);
  queueTabIndicatorUpdate(tabBar);
}

/**
 * Renders the active profile tab content for mods, packs, or shaders.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab id.
 * @returns {HTMLDivElement} Tab content element.
 */
function renderTabContent(tab) {
  if (activeListDragHandle) {
    activeListDragHandle.destroy();
    activeListDragHandle = null;
  }

  const profile = getActiveProfile();
  const container = document.createElement("div");
  container.className = "tab-content tab-panel content-panel";

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
  const isEditing = layoutEditState[tab];

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
      downloadButton.textContent = "Bundling...";
      try {
        await beginDownloadFlow(profile.id, tab);
      } catch (error) {
        if (typeof namespace.showToast === "function") {
          namespace.showToast(error instanceof Error ? error.message : "ZIP download failed", "danger");
        }
      } finally {
        downloadButton.disabled = false;
        downloadButton.textContent = originalLabel;
      }
    });

    buttons.append(searchButton, manualButton, updateButton, downloadButton, createViewToggle(tab));

    const editLayoutButton = document.createElement("button");
    editLayoutButton.type = "button";
    editLayoutButton.className = isEditing
      ? "btn btn-primary btn-small"
      : "btn btn-small";
    editLayoutButton.textContent = isEditing ? "\u2713 Done editing" : "\u270E Edit layout";
    editLayoutButton.addEventListener("click", () => {
      layoutEditState[tab] = !layoutEditState[tab];
      const root = document.getElementById(HOME_VIEW_ID);
      if (root) {
        const newContent = renderTabContent(tab);
        const old = root.querySelector(".content-panel");
        if (old) {
          old.replaceWith(newContent);
        } else {
          root.appendChild(newContent);
        }
      }
    });
    buttons.appendChild(editLayoutButton);

    if (isEditing) {
      buttons.querySelectorAll("button").forEach((button) => {
        if (button !== editLayoutButton) {
          button.disabled = true;
          button.classList.add("is-layout-disabled");
        }
      });
    }
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

  items.forEach((item, index) => {
    const card = tab === "mods"
      ? renderModCard(item, profile.id, isEditing)
      : renderPackCard(item, profile.id, definition.projectType, isEditing);
    card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;
    if (isEditing) {
      card.setAttribute("data-drag-item", "");
      card.classList.add("is-reorder-mode");
    }
    list.appendChild(card);
  });

  container.appendChild(list);
  if (layoutEditState[tab] && typeof namespace.enableDragOrder === "function") {
    activeListDragHandle = namespace.enableDragOrder(list, (fromIndex, toIndex) => {
      const activeProfile = namespace.getActiveProfile?.();
      if (!activeProfile) {
        return;
      }

      let itemsArray;
      if (tab === "mods") {
        itemsArray = activeProfile.mods;
      } else if (tab === "resourcepacks") {
        itemsArray = activeProfile.resourcePacks;
      } else {
        itemsArray = activeProfile.shaders;
      }

      if (!Array.isArray(itemsArray)) {
        return;
      }

      const moved = itemsArray.splice(fromIndex, 1)[0];
      if (!moved) {
        return;
      }
      itemsArray.splice(toIndex, 0, moved);

      if (typeof saveData === "function") {
        AppState.data = saveData(AppState.data);
      }
    });
  }
  return container;
}

/**
 * Animates tab panel replacement without changing the surrounding layout.
 *
 * @param {HTMLElement} root - Home view root.
 * @param {HTMLElement} nextContent - Newly rendered content panel.
 * @param {HTMLElement|null} existingContent - Previous content panel.
 */
function switchTabContent(root, nextContent, existingContent) {
  if (!existingContent || !existingContent.parentElement) {
    root.appendChild(nextContent);
    return;
  }

  existingContent.classList.add("leaving");
  root.appendChild(existingContent);
  window.setTimeout(() => {
    if (existingContent.parentElement === root) {
      existingContent.replaceWith(nextContent);
    } else if (!nextContent.parentElement) {
      root.appendChild(nextContent);
    }
  }, 110);
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
 * Builds the mod card UI with compatibility and dependency affordances.
 *
 * @param {object} mod - Mod entry.
 * @param {string} profileId - Profile identifier.
 * @param {boolean} isEditing - Whether layout editing is active.
 * @returns {HTMLDivElement} Mod card.
 */
function renderModCard(mod, profileId, isEditing = false) {
  const sourceProfileId = mod.sourceProfileId || profileId;
  const profile = AppState.data?.profiles.find((entry) => entry.id === sourceProfileId);
  const warnings = checkItemCompatibility(mod, profile);
  const hasErrors = warnings.some((warning) => warning.level === "error");
  const missingDependencies = getMissingDependencies(mod, profile);
  const card = document.createElement("div");
  card.className = hasErrors ? "mod-card is-incompatible" : "mod-card";

  if (isEditing) {
    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "\u283F";
    handle.setAttribute("aria-hidden", "true");
    card.prepend(handle);
  }

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

  headingLine.append(name, createWarningIcon(warnings), author);

  const badges = document.createElement("div");
  badges.className = "mod-badges";
  badges.appendChild(createBadge("badge-source", resolveSourceLabel(mod.source)));
  if (mod.versionNumber || mod.version) {
    badges.appendChild(createBadge("badge-version", mod.versionNumber || mod.version));
  }
  if (Array.isArray(mod.loaders) && mod.loaders.length > 0) {
    badges.appendChild(createLoaderBadge(resolveDisplayedLoader(mod.loaders, profile?.loader)));
  }
  if (Array.isArray(mod.mcVersions) && mod.mcVersions.length > 0) {
    badges.appendChild(createBadge("badge-version", mod.mcVersions[0]));
  }
  if (hasErrors) {
    const warning = createBadge("badge-danger", "Incompatible");
    warning.classList.add("warning-indicator");
    attachTooltip(warning, warnings.map((entry) => entry.message).join("\n"));
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
    resolveSourceLabel(mod.source),
    `Added ${formatRelativeDate(mod.addedAt)}`,
  ]);

  const footer = document.createElement("div");
  footer.className = "mod-card-footer";

  const links = document.createElement("div");
  links.className = "mod-card-links";

  const fileLink = mod.fileUrl || mod.downloadUrl || "";
  const isManual = mod.source === "manual";
  const sourceLabel = isManual ? "Manual" : resolveSourceLabel(mod.source || "modrinth");
  const sourceButton = createButton(sourceLabel);
  sourceButton.classList.add("btn-small");

  if (isManual) {
    if (fileLink) {
      sourceButton.addEventListener("click", () => {
        window.open(fileLink, "_blank", "noopener");
      });
    } else {
      sourceButton.disabled = true;
    }
  } else if (mod.modrinthUrl) {
    sourceButton.addEventListener("click", () => {
      window.open(mod.modrinthUrl, "_blank", "noopener");
    });
  } else {
    sourceButton.disabled = true;
  }

  links.append(sourceButton, createChangeVersionButton(mod, sourceProfileId, "mod"));

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
  if (isEditing) {
    card.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      button.classList.add("is-layout-disabled");
    });
  }
  return card;
}

/**
 * Builds the simpler pack/shader card layout used for non-mod items.
 *
 * @param {object} item - Resource pack or shader item.
 * @param {string} profileId - Profile identifier.
 * @param {"resourcepack"|"shader"} type - Pack type.
 * @param {boolean} isEditing - Whether layout editing is active.
 * @returns {HTMLDivElement} Pack card.
 */
function renderPackCard(item, profileId, type, isEditing = false) {
  const sourceProfileId = item.sourceProfileId || profileId;
  const profile = AppState.data?.profiles.find((entry) => entry.id === sourceProfileId);
  const warnings = checkItemCompatibility(item, profile);
  const hasErrors = warnings.some((warning) => warning.level === "error");
  const card = document.createElement("div");
  card.className = hasErrors ? "mod-card is-incompatible" : "mod-card";

  if (isEditing) {
    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "\u283F";
    handle.setAttribute("aria-hidden", "true");
    card.prepend(handle);
  }

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

  headingLine.append(name, createWarningIcon(warnings), author);

  const badges = document.createElement("div");
  badges.className = "item-badges";
  badges.appendChild(createBadge("badge-source", resolveSourceLabel(item.source)));
  if (item.version || item.versionNumber) {
    badges.appendChild(createBadge("badge-version", item.version || item.versionNumber));
  }
  if (hasErrors) {
    const warning = createBadge("badge-danger", "Warning");
    warning.classList.add("warning-indicator");
    attachTooltip(warning, warnings.map((entry) => entry.message).join("\n"));
    badges.appendChild(warning);
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

  const fileLink = item.fileUrl || item.downloadUrl || "";
  const isManual = item.source === "manual";
  const sourceLabel = isManual ? "Manual" : resolveSourceLabel(item.source || "modrinth");
  const sourceButton = createButton(sourceLabel);
  sourceButton.classList.add("btn-small");

  if (isManual) {
    if (fileLink) {
      sourceButton.addEventListener("click", () => {
        window.open(fileLink, "_blank", "noopener");
      });
    } else {
      sourceButton.disabled = true;
    }
  } else if (item.modrinthUrl) {
    sourceButton.addEventListener("click", () => {
      window.open(item.modrinthUrl, "_blank", "noopener");
    });
  } else {
    sourceButton.disabled = true;
  }

  links.append(sourceButton, createChangeVersionButton(item, sourceProfileId, type));

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
  if (isEditing) {
    card.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      button.classList.add("is-layout-disabled");
    });
  }
  return card;
}

/**
 * Collects non-blocking compatibility warnings for one stored item.
 *
 * @param {object} item - Stored item.
 * @param {object|null} profile - Owning profile.
 * @returns {Array<{level:"warning"|"error", message:string}>} Active warnings.
 */
function checkItemCompatibility(item, profile) {
  if (!item || !profile) {
    return [];
  }

  const warnings = [];
  const itemLoaders = Array.isArray(item.loaders)
    ? item.loaders.map((loader) => String(loader || "").toLowerCase()).filter(Boolean)
    : [];
  const itemVersions = Array.isArray(item.mcVersions)
    ? item.mcVersions.map((version) => String(version || "")).filter(Boolean)
    : [];
  const profileLoader = String(profile.loader || "").toLowerCase();
  const profileVersion = String(profile.mcVersion || "").trim();

  if (profileLoader === "fabric" && itemLoaders.some((loader) => loader === "forge" || loader === "neoforge")) {
    warnings.push({
      level: "error",
      message: "This mod requires Forge/NeoForge but your profile uses Fabric.",
    });
  }

  if ((profileLoader === "forge" || profileLoader === "neoforge") && itemLoaders.some((loader) => loader === "fabric" || loader === "quilt")) {
    warnings.push({
      level: "error",
      message: "This mod requires Fabric/Quilt but your profile uses Forge/NeoForge.",
    });
  }

  if (profileVersion && itemVersions.length > 0 && !itemVersions.includes(profileVersion)) {
    warnings.push({
      level: "warning",
      message: `Version ${item.versionNumber || item.version || "Unknown"} may not be compatible with Minecraft ${profileVersion}.`,
    });
  }

  if (item.source === "curseforge" && item.slug) {
    const projectType = item.projectType || inferProjectTypeFromItem(item);
    const siblingCollections = resolveProfileCollectionsForProjectType(profile, projectType);
    const hasModrinthDuplicate = siblingCollections.some((entry) => (
      entry !== item
      && entry.source === "modrinth"
      && entry.slug
      && entry.slug === item.slug
    ));

    if (hasModrinthDuplicate) {
      warnings.push({
        level: "warning",
        message: "A version of this mod is already tracked from Modrinth.",
      });
    }
  }

  return warnings;
}

/**
 * Keeps the legacy compatibility helper available for existing callers.
 *
 * @param {object} item - Stored item.
 * @param {object|null} profile - Active profile.
 * @returns {{compatible:boolean, warning:string|null}} Legacy compatibility shape.
 */
function checkCompatibility(item, profile) {
  const warnings = checkItemCompatibility(item, profile);
  const primary = warnings[0] || null;
  return {
    compatible: warnings.every((entry) => entry.level !== "error"),
    warning: primary ? primary.message : null,
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
 * Creates a compact warning icon that uses the shared tooltip root on hover.
 *
 * @param {Array<{level:"warning"|"error", message:string}>} warnings - Active warnings.
 * @returns {HTMLElement} Warning icon node or placeholder.
 */
function createWarningIcon(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    return document.createTextNode("");
  }

  const icon = document.createElement("span");
  icon.className = warnings.some((entry) => entry.level === "error")
    ? "item-warning-icon is-error"
    : "item-warning-icon";
  icon.textContent = "⚠";
  attachTooltip(icon, warnings.map((entry) => entry.message).join("\n"));
  return icon;
}

/**
 * Creates the subtle version-change action used on item cards.
 *
 * @param {object} item - Stored item.
 * @param {string} profileId - Owning profile id.
 * @param {"mod"|"resourcepack"|"shader"} type - Item type.
 * @returns {HTMLButtonElement} Version action button.
 */
function createChangeVersionButton(item, profileId, type) {
  const button = createButton(item.versionNumber || item.version ? "Change version" : "Pick version");
  button.classList.add("btn-small", "version-action-btn");
  if (item.source === "manual") {
    button.disabled = true;
    return button;
  }

  button.addEventListener("click", () => {
    void openVersionPickerModal(
      resolveProjectId(item),
      item.versionId || "",
      item.source || "modrinth",
      async (version) => {
        await updateTrackedItemVersion(profileId, item, type, version);
      },
      {
        profileId,
        projectType: type === "mod" ? "mod" : type,
        projectName: item.name,
        mode: "update",
        confirmLabel: "Update to selected",
      }
    );
  });
  return button;
}

/**
 * Opens the shared version picker used by browse-add and in-profile updates.
 *
 * @param {string} projectId - Project identifier.
 * @param {string} currentVersionId - Currently selected version id.
 * @param {"modrinth"|"curseforge"} source - Item source.
 * @param {(version:object) => Promise<unknown>|unknown} onConfirm - Confirm callback.
 * @param {{profileId?:string, projectType?:string, projectName?:string, mode?:"add"|"update", confirmLabel?:string}} [options] - Modal options.
 */
async function openVersionPickerModal(projectId, currentVersionId, source, onConfirm, options = {}) {
  const safeProjectId = String(projectId || "");
  const profile = AppState.data?.profiles.find((entry) => entry.id === options.profileId);
  if (!safeProjectId || !profile) {
    return;
  }

  const projectType = options.projectType || "mod";
  const versionFilters = {
    loader: projectType === "mod" && profile.loader !== "vanilla" ? profile.loader : "",
    gameVersion: profile.mcVersion,
  };
  let versions = await getVersionsForSource(source, safeProjectId, versionFilters);
  if (versions.error || !Array.isArray(versions) || versions.length === 0) {
    versions = await getVersionsForSource(source, safeProjectId);
  }
  if (versions.error || !Array.isArray(versions) || versions.length === 0) {
    showTransientModal("No versions available", `${resolveSourceLabel(source)} did not return any installable versions for this project.`);
    return;
  }

  const sortedVersions = sortVersionsNewestFirst(versions);
  const overlay = createModalOverlay();
  const modal = createModalCard();
  modal.classList.add("modal-wide");

  const recommendedVersion = findRecommendedVersion(sortedVersions, profile, projectType);
  let selectedVersionId = currentVersionId
    && sortedVersions.some((version) => version.id === currentVersionId)
    ? currentVersionId
    : (recommendedVersion?.id || sortedVersions[0].id);

  const title = createModalTitle(
    options.mode === "update"
      ? `Change version for ${options.projectName || "this item"}`
      : `Add ${options.projectName || "this item"} to ${profile.name}`
  );
  const subtitle = createModalSubtitle(
    `Choose a ${resolveSourceLabel(source)} version for ${profile.loader === "vanilla" ? "Minecraft" : capitalize(profile.loader)} ${profile.mcVersion || "any version"}.`
  );

  const list = document.createElement("div");
  list.className = "version-list";

  sortedVersions.forEach((version) => {
    const row = document.createElement("label");
    row.className = "version-item";
    if (recommendedVersion?.id === version.id) {
      row.classList.add("is-recommended");
    }

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `version-select-${safeProjectId}`;
    radio.checked = version.id === selectedVersionId;
    radio.addEventListener("change", () => {
      selectedVersionId = version.id;
    });

    const text = document.createElement("div");
    text.className = "version-item-label";

    const topLine = document.createElement("div");
    topLine.className = "version-row-top";

    const name = document.createElement("div");
    name.className = "version-name";
    name.textContent = version.version_number || "Unknown version";

    const badges = document.createElement("div");
    badges.className = "version-row-badges";
    badges.appendChild(createReleaseTypeBadge(version.release_type));
    if (recommendedVersion?.id === version.id) {
      badges.appendChild(createBadge("badge-source", "Recommended"));
    }

    const meta = document.createElement("div");
    meta.className = "version-meta";
    meta.textContent = buildMetaLine([
      formatLoaderList(version.loaders),
      formatVersionList(version.game_versions),
      `released ${formatRelativeDate(new Date(version.date_published || 0).getTime())}`,
    ]);

    topLine.append(name, badges);
    text.append(topLine, meta);
    row.append(radio, text);
    list.appendChild(row);
  });

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const confirmButton = createButton(
    options.confirmLabel || (options.mode === "update" ? "Update to selected" : "Add selected version"),
    "btn-accent"
  );
  cancelButton.addEventListener("click", closeOverlays);
  confirmButton.addEventListener("click", async () => {
    const selectedVersion = sortedVersions.find((version) => version.id === selectedVersionId) || recommendedVersion || sortedVersions[0];
    closeOverlays();
    await onConfirm(selectedVersion);
  });

  actions.append(cancelButton, confirmButton);
  modal.append(title, subtitle, list, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Applies a new selected version to an already tracked item and persists it.
 *
 * @param {string} profileId - Owning profile id.
 * @param {object} item - Stored item.
 * @param {"mod"|"resourcepack"|"shader"} type - Item type.
 * @param {object} version - Selected version payload.
 * @returns {Promise<void>} Completion promise.
 */
async function updateTrackedItemVersion(profileId, item, type, version) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  const patch = buildVersionPatch(item, version, type);
  if (type === "mod") {
    updateMod(profileId, item.id, patch);
  } else if (type === "resourcepack") {
    updateResourcePack(profileId, item.id, patch);
  } else {
    updateShader(profileId, item.id, patch);
  }

  const updatedProfile = AppState.data?.profiles.find((entry) => entry.id === profileId) || profile;
  const updatedCollection = type === "mod"
    ? updatedProfile.mods
    : type === "resourcepack"
      ? updatedProfile.resourcePacks
      : updatedProfile.shaders;
  const updatedItem = updatedCollection.find((entry) => entry.id === item.id);
  showCompatibilityWarnings(updatedItem, updatedProfile);
}

/**
 * Shows compatibility warnings as toast notifications when they exist.
 *
 * @param {object|undefined} item - Stored item.
 * @param {object|undefined|null} profile - Owning profile.
 */
function showCompatibilityWarnings(item, profile) {
  if (!item || !profile || typeof namespace.showToast !== "function") {
    return;
  }

  checkItemCompatibility(item, profile).forEach((warning) => {
    namespace.showToast(warning.message, "warning");
  });
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
      const manualId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fileUrl = urlGroup.input.value.trim();
      const commonFields = {
        id: manualId,
        projectId: manualId,
        projectType: type,
        slug: "",
        name: nameGroup.input.value.trim() || `Untitled ${resolveTypeLabel(type)}`,
        version: versionGroup.input.value.trim(),
        versionNumber: versionGroup.input.value.trim(),
        description: notesInput.value.trim(),
        author: authorGroup.input.value.trim() || "Unknown",
        fileUrl,
        downloadUrl: fileUrl,
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
    ? "Browse projects or add your first mod manually."
    : definition.key === "resourcepacks"
      ? "Browse projects or add your first resource pack manually."
      : "Browse projects or add your first shader manually.";

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
  return "⬇ Download as ZIP";
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
  const subtitle = createModalSubtitle("PackTracker will try to find the newest compatible tracked version for every visible item. If it cannot find one, it will tell you why.");

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
    row.message = `checking ${resolveSourceLabel(currentItem.source || "modrinth")}...`;
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
  const projectId = resolveProjectId(item);
  if (!projectId || item.source === "manual") {
    return { kind: "skip", message: "Manual item or missing project link" };
  }

  const project = await getProjectForSource(item.source, projectId);
  if (project.error) {
    return { kind: "skip", message: project.message || "Could not load project" };
  }

  let versions = await getVersionsForSource(item.source, projectId, {
    loader: tab === "mods" && profile.loader !== "vanilla" ? profile.loader : "",
    gameVersion: targetVersion,
  });
  if (versions.error || versions.length === 0) {
    versions = await getVersionsForSource(item.source, projectId);
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
  const nextProjectId = resolveNormalizedProjectId(project, item);
  const nextSource = item.source || "modrinth";
  const nextProjectType = tab === "resourcepacks" ? "resourcepack" : tab === "shaders" ? "shader" : "mod";
  const nextSlug = project?.slug || item.slug || nextProjectId;

  if (tab === "mods") {
    Object.assign(item, {
      version: version.version_number || item.version || "",
      versionNumber: version.version_number || item.versionNumber || "",
      versionId: version.id || item.versionId || "",
      projectId: nextProjectId,
      modrinthId: nextProjectId,
      slug: nextSlug,
      projectType: nextProjectType,
      fileUrl: primaryFile?.url || item.fileUrl || item.downloadUrl || "",
      downloadUrl: primaryFile?.url || item.fileUrl || item.downloadUrl || "",
      modrinthUrl: buildProjectUrl(nextSource, nextProjectType, nextSlug, nextProjectId),
      iconUrl: project.icon_url || item.iconUrl || "",
      description: project.description || item.description || "",
      author: project.author || item.author || "Unknown author",
      mcVersions: Array.isArray(version.game_versions) ? version.game_versions : item.mcVersions,
      loaders: Array.isArray(version.loaders) ? version.loaders : item.loaders,
      source: nextSource,
    });
    return;
  }

  Object.assign(item, {
    version: version.version_number || item.version || "",
    versionNumber: version.version_number || item.versionNumber || "",
    versionId: version.id || item.versionId || "",
    projectId: nextProjectId,
    modrinthId: nextProjectId,
    slug: nextSlug,
    projectType: nextProjectType,
    fileUrl: primaryFile?.url || item.fileUrl || item.downloadUrl || "",
    downloadUrl: primaryFile?.url || item.fileUrl || item.downloadUrl || "",
    modrinthUrl: buildProjectUrl(nextSource, nextProjectType, nextSlug, nextProjectId),
    iconUrl: project.icon_url || item.iconUrl || "",
    description: project.description || item.description || "",
    author: project.author || item.author || "Unknown author",
    source: nextSource,
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
 * Maps one tab id to the folder name used inside ZIP bundles.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @returns {string} ZIP folder name.
 */
function resolveZipFolderName(tab) {
  if (tab === "resourcepacks") {
    return "resourcepacks";
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

  await downloadCategoryAsZip(getTabItems(profile, tab), resolveZipFolderName(tab), profile.name);
}

/**
 * Downloads one category as a ZIP bundle while skipping missing/directly duplicated items.
 *
 * @param {Array<object>} items - Items in the active category.
 * @param {string} categoryFolderName - Folder name inside the ZIP.
 * @param {string} profileName - Profile label used in the ZIP filename.
 */
async function downloadCategoryAsZip(items, categoryFolderName, profileName) {
  if (typeof window.JSZip !== "function") {
    throw new Error("JSZip is not available.");
  }

  const zip = new window.JSZip();
  const folder = zip.folder(categoryFolderName) || zip;
  const readmeLines = [];
  const normalizedItems = Array.isArray(items) ? items : [];
  const [withUrl, withoutUrl] = partition(normalizedItems, (item) => Boolean(item.fileUrl || item.downloadUrl || item.url));

  withoutUrl.forEach((item) => {
    readmeLines.push(`- ${item.name || item.slug || "Unknown item"}: No direct download link available.`);
  });

  if (typeof namespace.showToast === "function") {
    namespace.showToast(`Downloading ${withUrl.length} files...`, "success");
  }

  const settled = await Promise.allSettled(withUrl.map(async (item) => {
    const resolved = await resolveZipDownloadTarget(item);
    if (!resolved.url) {
      return {
        status: "skipped",
        item,
        reason: resolved.message || "No download URL",
      };
    }

    const response = await fetch(resolved.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return {
      status: "fulfilled",
      item,
      blob,
      filename: resolved.filename,
    };
  }));

  let bundledCount = 0;
  let skippedCount = withoutUrl.length;
  settled.forEach((result, index) => {
    const item = withUrl[index];
    if (result.status === "fulfilled" && result.value?.status === "fulfilled") {
      bundledCount += 1;
      folder.file(result.value.filename, result.value.blob);
      return;
    }

    skippedCount += 1;
    const reason = result.status === "fulfilled"
      ? result.value?.reason || "Skipped"
      : (result.reason instanceof Error ? result.reason.message : "Download failed");
    readmeLines.push(`- ${item?.name || item?.slug || "Unknown item"}: ${reason}`);
  });

  if (readmeLines.length > 0) {
    zip.file("README.txt", [
      "PackTracker ZIP notes",
      "",
      ...readmeLines,
    ].join("\n"));
  }

  const archiveBlob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(archiveBlob);
  try {
    await downloadFile(objectUrl, `${sanitizeFileName(profileName)}-${categoryFolderName}.zip`);
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }

  if (withoutUrl.length > 0 && typeof namespace.showToast === "function") {
    namespace.showToast(`${withoutUrl.length} items have no direct download link and were skipped.`, "warning");
  }

  if (typeof namespace.showToast === "function") {
    namespace.showToast(`ZIP ready: ${bundledCount} files bundled, ${skippedCount} skipped.`, skippedCount > 0 ? "warning" : "success");
  }
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
  if (downloadSession.skippedWithoutDirectUrl > 0 && typeof namespace.showToast === "function") {
    namespace.showToast(`${downloadSession.skippedWithoutDirectUrl} items have no direct download link and were skipped.`, "warning");
  }
}

/**
 * Resolves the correct file URL and filename for one queued item.
 *
 * @param {object} item - Download queue row.
 * @returns {Promise<{url:string, filename:string, sizeLabel:string, message?:string}>} Download target info.
 */
async function resolveDownloadTarget(item) {
  if (item.source === "modrinth" && item.versionId) {
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

  if (item.fileUrl || item.downloadUrl) {
    const directUrl = item.fileUrl || item.downloadUrl;
    return {
      url: directUrl,
      filename: inferFileName(directUrl, item.name),
      sizeLabel: "",
    };
  }

  if (item.source === "manual") {
    return {
      url: "",
      filename: "",
      sizeLabel: "",
      message: "Manual entries need a direct download URL",
    };
  }

  const projectId = resolveProjectId(item);
  if (projectId) {
    let versions = await getVersionsForSource(item.source, projectId, {
      loader: Array.isArray(item.loaders) && item.loaders.length > 0 ? item.loaders[0] : "",
      gameVersion: Array.isArray(item.mcVersions) && item.mcVersions.length > 0 ? item.mcVersions[0] : "",
    });

    if (versions?.error || !Array.isArray(versions) || versions.length === 0) {
      versions = await getVersionsForSource(item.source, projectId);
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
 * Resolves a stored project id from an item record.
 *
 * @param {object} item - Download queue item.
 * @returns {string} Project id or empty string.
 */
function resolveDownloadProjectId(item) {
  if (item.projectId) {
    return String(item.projectId);
  }
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
 * Resolves the canonical project id used by source-aware helpers.
 *
 * @param {object} item - Stored item.
 * @returns {string} Project id.
 */
function resolveProjectId(item) {
  return resolveDownloadProjectId(item);
}

/**
 * Fetches a project payload from the correct API source.
 *
 * @param {"modrinth"|"curseforge"|string} source - Project source.
 * @param {string} projectId - Project id.
 * @returns {Promise<object>} Project payload or error.
 */
async function getProjectForSource(source, projectId) {
  if (source === "curseforge" && typeof cfGetProject === "function") {
    return cfGetProject(projectId);
  }
  return getProject(projectId);
}

/**
 * Fetches versions from the correct API source.
 *
 * @param {"modrinth"|"curseforge"|string} source - Project source.
 * @param {string} projectId - Project id.
 * @param {{loader?:string, gameVersion?:string}} [options] - Optional filters.
 * @returns {Promise<Array<object>|object>} Version payload.
 */
async function getVersionsForSource(source, projectId, options = {}) {
  if (source === "curseforge" && typeof cfGetProjectVersions === "function") {
    return cfGetProjectVersions(projectId, options);
  }
  return getProjectVersions(projectId, options);
}

/**
 * Fetches a single version from the correct API source.
 *
 * @param {"modrinth"|"curseforge"|string} source - Item source.
 * @param {string} versionId - Version identifier.
 * @returns {Promise<object>} Version payload or error.
 */
async function getVersionForSource(source, versionId) {
  if (source === "curseforge" && typeof cfGetVersion === "function") {
    return cfGetVersion(versionId);
  }
  return getVersion(versionId);
}

/**
 * Resolves the most direct downloadable file target for ZIP bundling.
 *
 * @param {object} item - Stored item.
 * @returns {Promise<{url:string, filename:string, message?:string}>} Download target.
 */
async function resolveZipDownloadTarget(item) {
  const directUrl = String(item?.fileUrl || item?.downloadUrl || item?.url || "");
  if (directUrl) {
    return {
      url: directUrl,
      filename: String(item?.fileName || "") || inferFileName(directUrl, item?.name || item?.slug || "download"),
    };
  }

  const versionId = String(item?.versionId || "");
  if (versionId) {
    const version = await getVersionForSource(item?.source || "modrinth", versionId);
    if (!version?.error && Array.isArray(version?.files) && version.files.length > 0) {
      const primaryFile = version.files.find((file) => file.primary) || version.files[0];
      return {
        url: String(primaryFile?.url || ""),
        filename: String(primaryFile?.filename || "") || `${sanitizeFileName(item?.name || item?.slug || "download")}.jar`,
      };
    }
  }

  const projectId = resolveProjectId(item);
  if (projectId) {
    let versions = await getVersionsForSource(item?.source || "modrinth", projectId, {
      loader: Array.isArray(item?.loaders) && item.loaders.length > 0 ? item.loaders[0] : "",
      gameVersion: Array.isArray(item?.mcVersions) && item.mcVersions.length > 0 ? item.mcVersions[0] : "",
    });
    if (versions?.error || !Array.isArray(versions) || versions.length === 0) {
      versions = await getVersionsForSource(item?.source || "modrinth", projectId);
    }
    if (Array.isArray(versions)) {
      const downloadableVersion = sortVersionsNewestFirst(versions).find(
        (version) => Array.isArray(version?.files) && version.files.length > 0
      );
      if (downloadableVersion) {
        const primaryFile = downloadableVersion.files.find((file) => file.primary) || downloadableVersion.files[0];
        return {
          url: String(primaryFile?.url || ""),
          filename: String(primaryFile?.filename || "") || `${sanitizeFileName(item?.name || item?.slug || "download")}.jar`,
        };
      }
    }
  }

  return {
    url: "",
    filename: "",
    message: "No downloadable file found",
  };
}

/**
 * Builds the public project URL for either Modrinth or CurseForge.
 *
 * @param {"modrinth"|"curseforge"|string} source - Item source.
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
 * Resolves the shared project id from a project payload or existing item.
 *
 * @param {object} project - Project payload.
 * @param {object} item - Existing item.
 * @returns {string} Normalized project id.
 */
function resolveNormalizedProjectId(project, item) {
  return String(project?.project_id || project?.id || item?.projectId || item?.modrinthId || item?.id || "");
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

  const savedItem = addMod(profile.id, mapProjectVersionToMod(project, version, dependencyIds));
  showCompatibilityWarnings(savedItem, profile);
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

  if (type === "mod") {
    menu.appendChild(
      createContextItem("Edit notes", () => {
        closeContextMenu(root, () => {
          showModNotesModal(profileId, item.id);
        });
      })
    );
  } else {
    menu.appendChild(
      createContextItem("Edit notes", () => {
        closeContextMenu(root, () => {
          showItemNotesModal(profileId, item.id, type);
        });
      })
    );
  }

  menu.appendChild(
    createContextItem("Remove from profile", () => {
      closeContextMenu(root, () => {
        if (type === "mod") {
          removeMod(profileId, item.id);
        } else if (type === "resourcepack") {
          removeResourcePack(profileId, item.id);
        } else {
          removeShader(profileId, item.id);
        }
      });
    }, true)
  );

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
  const projectId = resolveNormalizedProjectId(project, {});
  const source = project?.source || "modrinth";
  const slug = project?.slug || projectId;

  return {
    id: projectId,
    projectId,
    projectType: "mod",
    slug,
    name: project.title || project.name || "Unknown mod",
    description: project.description || "",
    author: project.author || project.team || "Unknown author",
    versionId: version.id || "",
    versionNumber: version.version_number || "Unknown",
    mcVersions: Array.isArray(version.game_versions) ? version.game_versions : [],
    loaders: Array.isArray(version.loaders) ? version.loaders : [],
    fileUrl: primaryFile?.url || "",
    downloadUrl: primaryFile?.url || "",
    modrinthId: projectId,
    modrinthUrl: buildProjectUrl(source, "mod", slug, projectId),
    iconUrl: project.icon_url || "",
    source,
    starred: false,
    notes: "",
    dependencies: dependencyIds,
    addedAt: Date.now(),
  };
}

/**
 * Builds the patch applied when a user selects a different project version.
 *
 * @param {object} item - Existing stored item.
 * @param {object} version - Selected version payload.
 * @param {"mod"|"resourcepack"|"shader"} type - Item type.
 * @returns {object} Partial item patch.
 */
function buildVersionPatch(item, version, type) {
  const primaryFile = Array.isArray(version?.files)
    ? version.files.find((file) => file.primary) || version.files[0]
    : null;
  const patch = {
    versionId: version.id || item.versionId || "",
    version: version.version_number || item.version || "",
    versionNumber: version.version_number || item.versionNumber || item.version || "",
    fileUrl: primaryFile?.url || item.fileUrl || item.downloadUrl || "",
    downloadUrl: primaryFile?.url || item.fileUrl || item.downloadUrl || "",
  };

  if (type === "mod") {
    patch.mcVersions = Array.isArray(version.game_versions) ? version.game_versions : item.mcVersions;
    patch.loaders = Array.isArray(version.loaders) ? version.loaders : item.loaders;
  }

  return patch;
}

/**
 * Chooses the default recommended version for a profile-aware picker.
 *
 * @param {Array<object>} versions - Available versions.
 * @param {object} profile - Owning profile.
 * @param {"mod"|"resourcepack"|"shader"} projectType - Project type.
 * @returns {object|null} Recommended version.
 */
function findRecommendedVersion(versions, profile, projectType) {
  const safeVersions = Array.isArray(versions) ? versions : [];
  if (safeVersions.length === 0 || !profile) {
    return safeVersions[0] || null;
  }

  const preferred = safeVersions.find((version) => {
    const matchesGameVersion = !profile.mcVersion
      || !Array.isArray(version.game_versions)
      || version.game_versions.length === 0
      || version.game_versions.includes(profile.mcVersion);
    const matchesLoader = projectType !== "mod"
      || profile.loader === "vanilla"
      || !Array.isArray(version.loaders)
      || version.loaders.length === 0
      || version.loaders.includes(profile.loader);
    return matchesGameVersion && matchesLoader;
  });

  return preferred || safeVersions[0] || null;
}

/**
 * Creates the release-type badge shown inside version picker rows.
 *
 * @param {string} releaseType - Normalized release type.
 * @returns {HTMLSpanElement} Badge node.
 */
function createReleaseTypeBadge(releaseType) {
  const safeType = String(releaseType || "release").toLowerCase();
  const modifier = safeType === "alpha"
    ? "badge-danger"
    : safeType === "beta"
      ? "badge-warning"
      : "badge-source";
  return createBadge(modifier, RELEASE_TYPE_LABELS[safeType] || "Release");
}

/**
 * Formats a version list for compact modal metadata.
 *
 * @param {Array<string>} versions - Supported versions.
 * @returns {string} Joined version summary.
 */
function formatVersionList(versions) {
  const safeVersions = Array.isArray(versions) ? versions.filter(Boolean) : [];
  return safeVersions.length > 0 ? safeVersions.slice(0, 4).join(", ") : "Any version";
}

/**
 * Formats loaders for compact modal metadata.
 *
 * @param {Array<string>} loaders - Supported loaders.
 * @returns {string} Joined loader summary.
 */
function formatLoaderList(loaders) {
  const safeLoaders = Array.isArray(loaders) ? loaders.filter(Boolean) : [];
  return safeLoaders.length > 0 ? safeLoaders.map(capitalize).join(", ") : "Any loader";
}

/**
 * Returns the source label used in UI chrome.
 *
 * @param {string} source - Item source.
 * @returns {string} User-facing label.
 */
function resolveSourceLabel(source) {
  if (source === "curseforge") {
    return "CurseForge";
  }
  if (source === "manual") {
    return "Manual";
  }
  return "Modrinth";
}

/**
 * Infers a shared project type from one item.
 *
 * @param {object} item - Stored item.
 * @returns {"mod"|"resourcepack"|"shader"} Project type.
 */
function inferProjectTypeFromItem(item) {
  if (item?.projectType === "resourcepack" || item?.projectType === "shader" || item?.projectType === "mod") {
    return item.projectType;
  }
  if (Array.isArray(item?.mcVersions) || Array.isArray(item?.loaders)) {
    return "mod";
  }
  return "resourcepack";
}

/**
 * Infers a shared project type from a tab key.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @returns {"mod"|"resourcepack"|"shader"} Project type.
 */
function inferProjectTypeFromTab(tab) {
  if (tab === "resourcepacks") {
    return "resourcepack";
  }
  if (tab === "shaders") {
    return "shader";
  }
  return "mod";
}

/**
 * Returns the profile collection(s) relevant for duplicate-source checks.
 *
 * @param {object} profile - Owning profile.
 * @param {"mod"|"resourcepack"|"shader"} projectType - Shared project type.
 * @returns {Array<object>} Relevant sibling items.
 */
function resolveProfileCollectionsForProjectType(profile, projectType) {
  if (!profile) {
    return [];
  }
  if (projectType === "resourcepack") {
    return Array.isArray(profile.resourcePacks) ? profile.resourcePacks : [];
  }
  if (projectType === "shader") {
    return Array.isArray(profile.shaders) ? profile.shaders : [];
  }
  return Array.isArray(profile.mods) ? profile.mods : [];
}

/**
 * Shows a lightweight modal message.
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
  closeButton.addEventListener("click", closeOverlays);
  actions.appendChild(closeButton);
  modal.append(title, subtitle, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Partitions a list into matching and non-matching subsets.
 *
 * @template T
 * @param {Array<T>} items - Input items.
 * @param {(item:T) => boolean} predicate - Match predicate.
 * @returns {[Array<T>, Array<T>]} Partitioned tuples.
 */
function partition(items, predicate) {
  return (Array.isArray(items) ? items : []).reduce(
    (groups, item) => {
      groups[predicate(item) ? 0 : 1].push(item);
      return groups;
    },
    [[], []]
  );
}

/**
 * Attaches a tooltip rendered inside the shared tooltip root.
 *
 * @param {HTMLElement} element - Anchor element.
 * @param {string} text - Tooltip text.
 */
function attachTooltip(element, text) {
  if (!(element instanceof HTMLElement) || !text) {
    return;
  }

  const show = () => {
    const root = document.getElementById(TOOLTIP_ROOT_ID);
    if (!root) {
      return;
    }

    root.replaceChildren();
    const tooltip = document.createElement("div");
    tooltip.className = "app-tooltip";
    tooltip.textContent = text;
    root.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.min(
      Math.max(12, rect.left + (rect.width / 2) - (tooltipRect.width / 2)),
      window.innerWidth - tooltipRect.width - 12
    );
    const top = Math.max(12, rect.top - tooltipRect.height - 10);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  const hide = () => {
    const root = document.getElementById(TOOLTIP_ROOT_ID);
    if (root) {
      root.replaceChildren();
    }
  };

  element.addEventListener("mouseenter", show);
  element.addEventListener("focus", show);
  element.addEventListener("mouseleave", hide);
  element.addEventListener("blur", hide);
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
  checkItemCompatibility,
  getMissingDependencies,
  openVersionPickerModal,
  showCompatibilityWarnings,
  showModNotesModal,
  showAddManualModal,
  downloadCategoryAsZip,
});
})();
