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
    updateAppSettings,
    generateShareLink,
    getDependencies,
    getProject,
    getProjects,
    getVersion,
    getProjectVersions,
    searchProjects,
    cfGetProject,
    cfGetVersion,
    cfGetProjectVersions,
    cfSearchProjects,
    initScanner,
    downloadFile,
    downloadWithPreferences,
    prepareDownloadWithPreferences,
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
  const PROFILE_LIST_CONTROLS_STORAGE_KEY = "packtracker_profile_list_controls_v1";
  const profileListControls = loadProfileListControls();
  let activeListDragHandle = null;
  let downloadSession = null;
  let updateSession = null;
  const UPDATE_PROVIDER_PREFERENCES = [
    { value: "auto", label: "Auto" },
    { value: "modrinth", label: "Prefer Modrinth" },
    { value: "curseforge", label: "Prefer CurseForge" },
  ];

  function translate(key, fallback) {
    return typeof namespace.t === "function" ? namespace.t(key, fallback) : fallback;
  }

  /**
   * Loads persisted profile-list search/sort controls.
   *
   * @returns {{mods:object, resourcepacks:object, shaders:object}} Controls state.
   */
  function loadProfileListControls() {
    const fallback = {
      mods: { query: "", sort: "custom" },
      resourcepacks: { query: "", sort: "custom" },
      shaders: { query: "", sort: "custom" },
    };
    try {
      const raw = localStorage.getItem(PROFILE_LIST_CONTROLS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        mods: normalizeProfileListControl(parsed.mods, fallback.mods),
        resourcepacks: normalizeProfileListControl(parsed.resourcepacks, fallback.resourcepacks),
        shaders: normalizeProfileListControl(parsed.shaders, fallback.shaders),
      };
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Persists profile-list search/sort controls.
   */
  function saveProfileListControls() {
    try {
      localStorage.setItem(PROFILE_LIST_CONTROLS_STORAGE_KEY, JSON.stringify(profileListControls));
    } catch (error) {
      console.warn("PackTracker: failed to save profile list controls", error);
    }
  }

  /**
   * Normalizes one tab's list controls.
   *
   * @param {object} value - Candidate controls.
   * @param {object} fallback - Fallback controls.
   * @returns {{query:string, sort:string}} Normalized controls.
   */
  function normalizeProfileListControl(value, fallback) {
    const sort = ["custom", "az", "za"].includes(value?.sort) ? value.sort : fallback.sort;
    return {
      query: String(value?.query || "").slice(0, 120),
      sort,
    };
  }

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
    icon.appendChild(createStateLogoImage());

    const text = document.createElement("div");
    text.className = "empty-state-text";
    text.textContent = translate("noProfilesBody", "Create your first Minecraft profile and start collecting mods, resource packs, and shaders.");

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

    const shareButton = createButton(translate("shareProfile", "Share profile"));
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

    const scanButton = createButton(translate("scanMinecraftFolder", "Scan Minecraft Folder"));
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
    tab.appendChild(createTabLabel(resolveTabLabel(definition.key)));
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
  const collectionLabel = resolveTabLabel(definition.key).toLowerCase();
  title.textContent = isFavoritesView
    ? translate("starredFromAllProfiles", `Starred ${collectionLabel} from all profiles.`).replace("{label}", collectionLabel)
    : translate("manageForThisProfile", `Manage ${collectionLabel} for this profile.`).replace("{label}", collectionLabel);

  const buttons = document.createElement("div");
  buttons.className = "profile-toolbar";
  const isEditing = layoutEditState[tab];

  const renderContentPanel = () => {
    const root = document.getElementById(HOME_VIEW_ID);
    if (!root) {
      return;
    }

    const newContent = renderTabContent(tab);
    const old = root.querySelector(".content-panel");
    if (old) {
      old.replaceWith(newContent);
    } else {
      root.appendChild(newContent);
    }
  };

  if (!isFavoritesView) {
    const searchButton = createButton(translate("addViaBrowse", "+ Add via Browse"), "btn-accent");
    searchButton.replaceChildren(
      createIconLabelContent(
        "+",
        translate("addViaBrowse", "+ Add via Browse").replace(/^\+\s*/, ""),
        "btn-icon-plus"
      )
    );
    searchButton.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("packtracker:open-search", {
          detail: {
            query: "",
            projectType: definition.projectType,
            sourceTab: tab,
            profileId: profile.id,
          },
        })
      );
    });

    const manualButton = createButton(translate("addManually", "+ Add manually"));
    manualButton.replaceChildren(
      createIconLabelContent(
        "+",
        translate("addManually", "+ Add manually").replace(/^\+\s*/, ""),
        "btn-icon-plus"
      )
    );
    manualButton.addEventListener("click", () => {
      const manualType = tab === "mods" ? "mod" : definition.projectType;
      showAddManualModal(profile.id, manualType);
    });

    const updateButton = createButton(translate("updateToVersion", "↻ Update to version"));
    updateButton.replaceChildren(
      createIconLabelContent(
        "\u21bb",
        translate("updateToVersion", "↻ Update to version").replace(/^[^\s]+\s*/, ""),
        "btn-icon-refresh"
      )
    );
    updateButton.addEventListener("click", () => {
      showBulkUpdateModal(profile.id, tab);
    });

    const downloadButton = createButton(resolveDownloadButtonLabel(tab));
    downloadButton.replaceChildren(
      createIconLabelContent(
        "\u2b07",
        resolveDownloadButtonLabel(tab).replace(/^[^\s]+\s*/, ""),
        "btn-icon-download-zip"
      )
    );
    downloadButton.addEventListener("click", async () => {
      downloadButton.disabled = true;
      const originalLabel = resolveDownloadButtonLabel(tab).replace(/^[^\s]+\s*/, "");
      downloadButton.textContent = translate("bundling", "Bundling...");
      try {
        await beginDownloadFlow(profile.id, tab);
      } catch (error) {
        if (typeof namespace.showToast === "function") {
          namespace.showToast(error instanceof Error ? error.message : "ZIP download failed", "danger");
        }
      } finally {
        downloadButton.disabled = false;
        downloadButton.replaceChildren(
          createIconLabelContent(
            "\u2b07",
            originalLabel,
            "btn-icon-download-zip"
          )
        );
      }
    });

    buttons.append(searchButton, manualButton, updateButton, downloadButton, createViewToggle(tab));

    const editLayoutButton = document.createElement("button");
    editLayoutButton.type = "button";
    editLayoutButton.className = isEditing
      ? "btn btn-primary btn-small"
      : "btn btn-small";
    editLayoutButton.replaceChildren(
      createIconLabelContent(
        isEditing ? "\u2713" : "\u270E",
        isEditing ? translate("doneEditing", "Done editing") : translate("editLayout", "Edit layout"),
        isEditing ? "btn-icon-check" : "btn-icon-pencil"
      )
    );
    editLayoutButton.addEventListener("click", () => {
      layoutEditState[tab] = !layoutEditState[tab];
      renderContentPanel();
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
  }

  const downloadButton = createButton(resolveDownloadButtonLabel(tab));
  downloadButton.replaceChildren(
    createIconLabelContent(
      "\u2b07",
      resolveDownloadButtonLabel(tab).replace(/^[^\s]+\s*/, ""),
      "btn-icon-download-zip"
    )
  );
  downloadButton.addEventListener("click", async () => {
    downloadButton.disabled = true;
    const originalLabel = resolveDownloadButtonLabel(tab).replace(/^[^\s]+\s*/, "");
    downloadButton.textContent = translate("bundling", "Bundling...");
    try {
      if (isFavoritesView) {
        await beginVirtualDownloadFlow(profile, tab);
      } else {
        await beginDownloadFlow(profile.id, tab);
      }
    } catch (error) {
      if (typeof namespace.showToast === "function") {
        namespace.showToast(error instanceof Error ? error.message : "ZIP download failed", "danger");
      }
    } finally {
      downloadButton.disabled = false;
      downloadButton.replaceChildren(
        createIconLabelContent(
          "\u2b07",
          originalLabel,
          "btn-icon-download-zip"
        )
      );
    }
  });

  const editLayoutButton = document.createElement("button");
  editLayoutButton.type = "button";
  editLayoutButton.className = isEditing
    ? "btn btn-primary btn-small"
    : "btn btn-small";
  editLayoutButton.replaceChildren(
    createIconLabelContent(
      isEditing ? "\u2713" : "\u270E",
      isEditing ? translate("doneEditing", "Done editing") : translate("editLayout", "Edit layout"),
      isEditing ? "btn-icon-check" : "btn-icon-pencil"
    )
  );
  editLayoutButton.addEventListener("click", () => {
    layoutEditState[tab] = !layoutEditState[tab];
    renderContentPanel();
  });

  if (isFavoritesView) {
    buttons.append(downloadButton, createViewToggle(tab), editLayoutButton);
  }
  actions.append(title, buttons);
  container.appendChild(actions);

  const rawItems = getTabItems(profile, tab);
  const controlsRow = createProfileListControls(tab, rawItems, isEditing, renderContentPanel);
  container.appendChild(controlsRow);

  if (rawItems.length === 0) {
    container.appendChild(isFavoritesView ? createFavoritesEmptyState(definition) : createEmptyState(definition, profile.id));
    return container;
  }

  const items = getVisibleTabItems(rawItems, tab);
  if (items.length === 0) {
    container.appendChild(createNoMatchesPanel());
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
  const itemSource = resolveTrackedItemSource(mod);
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
    resolveSourceLabel(itemSource),
    `Added ${formatRelativeDate(mod.addedAt)}`,
  ]);

  const footer = document.createElement("div");
  footer.className = "mod-card-footer";

  const links = document.createElement("div");
  links.className = "mod-card-links";

  const fileLink = mod.fileUrl || mod.downloadUrl || "";
  const isManual = itemSource === "manual";
  const sourceLabel = isManual ? "Manual" : resolveSourceLabel(itemSource);
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
  const itemSource = resolveTrackedItemSource(item);
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

  if (itemSource === "manual") {
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
  badges.appendChild(createBadge("badge-source", resolveSourceLabel(itemSource)));
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
  const isManual = itemSource === "manual";
  const sourceLabel = isManual ? "Manual" : resolveSourceLabel(itemSource);
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

  const installedKeys = buildInstalledDependencyKeys(profile);
  const dependencyProjects = Array.isArray(mod?.dependencyProjects) ? mod.dependencyProjects : [];

  return mod.dependencies.filter((dependencyId) => {
    const dependencyProject = dependencyProjects.find((entry) => String(entry?.id || "") === String(dependencyId || ""));
    return !isDependencyAlreadyInstalled(installedKeys, dependencyId, dependencyProject);
  });
}

/**
 * Builds normalized lookup sets for installed mods so dependency checks can
 * match across providers by id, slug, and visible project name.
 *
 * @param {object|null} profile - Target profile.
 * @returns {{ids:Set<string>, slugs:Set<string>, names:Set<string>}} Installed dependency keys.
 */
function buildInstalledDependencyKeys(profile) {
  const mods = Array.isArray(profile?.mods) ? profile.mods : [];
  const ids = new Set();
  const slugs = new Set();
  const names = new Set();

  mods.forEach((entry) => {
    [
      entry?.id,
      entry?.projectId,
      entry?.modrinthId,
    ].forEach((value) => {
      const safeValue = String(value || "").trim();
      if (safeValue) {
        ids.add(safeValue);
      }
    });

    const safeSlug = normalizeProjectIdentityValue(entry?.slug || "");
    if (safeSlug) {
      slugs.add(safeSlug);
    }

    const safeName = normalizeProjectIdentityValue(entry?.name || "");
    if (safeName) {
      names.add(safeName);
    }
  });

  return { ids, slugs, names };
}

/**
 * Checks whether one dependency is already satisfied by an installed mod,
 * even when that installed mod came from the other provider.
 *
 * @param {{ids:Set<string>, slugs:Set<string>, names:Set<string>}} installedKeys - Installed lookup sets.
 * @param {string} dependencyId - Raw dependency project id.
 * @param {{id?:string, slug?:string, name?:string}|null} dependencyProject - Optional dependency metadata.
 * @returns {boolean} True when the dependency is already present.
 */
function isDependencyAlreadyInstalled(installedKeys, dependencyId, dependencyProject = null) {
  const safeId = String(dependencyId || "").trim();
  if (safeId && installedKeys.ids.has(safeId)) {
    return true;
  }

  const safeSlug = normalizeProjectIdentityValue(dependencyProject?.slug || "");
  if (safeSlug && installedKeys.slugs.has(safeSlug)) {
    return true;
  }

  const safeName = normalizeProjectIdentityValue(dependencyProject?.name || "");
  if (safeName && installedKeys.names.has(safeName)) {
    return true;
  }

  return false;
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
  textarea.maxLength = 1200;
  textarea.value = mod.notes || "";
  fieldGroup.append(label, textarea);
  attachCharacterCounter(fieldGroup, textarea);

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
  textarea.maxLength = 1200;
  textarea.value = item.notes || "";
  fieldGroup.append(label, textarea);
  attachCharacterCounter(fieldGroup, textarea);

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
  notesInput.maxLength = 1200;
  notesGroup.append(notesLabel, notesInput);
  attachCharacterCounter(notesGroup, notesInput);

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
 * Returns searched and sorted items for the active profile tab.
 *
 * @param {Array<object>} items - Raw tab items.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab id.
 * @returns {Array<object>} Visible item list.
 */
function getVisibleTabItems(items, tab) {
  const controls = profileListControls[tab] || profileListControls.mods;
  const query = String(controls.query || "").trim().toLowerCase();
  const filtered = query
    ? items.filter((item) => {
        const haystack = [
          item.name,
          item.author,
          item.description,
          item.version,
          item.versionNumber,
          item.sourceProfileName,
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : [...items];

  if (controls.sort === "az") {
    return sortItemsByName(filtered, "asc");
  }
  if (controls.sort === "za") {
    return sortItemsByName(filtered, "desc");
  }
  return filtered;
}

/**
 * Creates search and sort controls for the current profile item list.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab id.
 * @param {Array<object>} items - Raw tab items.
 * @param {boolean} isEditing - Whether drag order editing is active.
 * @param {() => void} rerender - Renders the active tab panel.
 * @returns {HTMLDivElement} Toolbar row.
 */
function createProfileListControls(tab, items, isEditing, rerender) {
  const controls = profileListControls[tab] || profileListControls.mods;
  if (isEditing && controls.sort !== "custom") {
    controls.sort = "custom";
    saveProfileListControls();
  }
  if (isEditing && controls.query) {
    controls.query = "";
    saveProfileListControls();
  }

  const row = document.createElement("div");
  row.className = "profile-list-controls";

  const search = document.createElement("input");
  search.type = "search";
  search.className = "profile-list-search";
  search.maxLength = 120;
  search.placeholder = `Search ${resolveTabLabel(tab).toLowerCase()}...`;
  search.value = controls.query || "";
  search.disabled = isEditing;
  search.addEventListener("input", () => {
    controls.query = search.value;
    saveProfileListControls();
    rerender();
    window.requestAnimationFrame(() => {
      const nextSearch = document.querySelector(".profile-list-search");
      if (nextSearch instanceof HTMLInputElement && !nextSearch.disabled) {
        nextSearch.focus();
        nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      }
    });
  });

  const sortSelect = createProfileSortSelect(controls.sort, isEditing, (value) => {
    controls.sort = value;
    saveProfileListControls();
    rerender();
  });

  const meta = document.createElement("div");
  meta.className = "profile-list-count";
  const visibleCount = getVisibleTabItems(items, tab).length;
  meta.textContent = `${visibleCount}/${items.length} ${translate("items", "items")}`;

  row.append(search, sortSelect, meta);
  return row;
}

/**
 * Creates the A-Z/Z-A/custom profile-list sort selector.
 *
 * @param {"custom"|"az"|"za"} selected - Current sort mode.
 * @param {boolean} disabled - Whether sorting is disabled while editing order.
 * @param {(value:"custom"|"az"|"za") => void} onChange - Selection handler.
 * @returns {HTMLDivElement} Sort control.
 */
function createProfileSortSelect(selected, disabled, onChange) {
  const options = [
    { value: "custom", label: "Custom" },
    { value: "az", label: "A to Z" },
    { value: "za", label: "Z to A" },
  ];

  const currentValue = options.some((entry) => entry.value === selected) ? selected : "custom";
  const select = document.createElement("div");
  select.className = disabled ? "filter-select profile-sort-select is-disabled" : "filter-select profile-sort-select";

  const trigger = document.createElement("button");
  trigger.className = "filter-trigger";
  trigger.type = "button";
  trigger.disabled = disabled;
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerValue = document.createElement("span");
  triggerValue.className = "filter-trigger-value";
  triggerValue.textContent = options.find((entry) => entry.value === currentValue)?.label || "Custom";

  const caret = document.createElement("span");
  caret.className = "filter-trigger-caret";
  caret.textContent = "\u25BE";
  trigger.append(triggerValue, caret);

  const menu = document.createElement("div");
  menu.className = "filter-menu";
  menu.setAttribute("role", "listbox");
  let isOpen = false;

  const closeMenu = () => {
    if (!isOpen) {
      return;
    }
    isOpen = false;
    select.classList.remove("is-open");
    select.classList.add("is-closing");
    menu.classList.add("closing");
    trigger.setAttribute("aria-expanded", "false");
    window.removeEventListener("mousedown", handleOutsideClick);
    window.removeEventListener("keydown", handleEscape);
    window.setTimeout(() => {
      select.classList.remove("is-closing");
      menu.classList.remove("closing");
    }, 140);
  };

  function handleOutsideClick(event) {
    if (!select.contains(event.target)) {
      closeMenu();
    }
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  }

  const openMenu = () => {
    if (disabled) {
      return;
    }
    if (isOpen) {
      closeMenu();
      return;
    }
    isOpen = true;
    select.classList.remove("is-closing");
    menu.classList.remove("closing");
    select.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
  };

  options.forEach((optionData) => {
    const option = document.createElement("button");
    option.className = optionData.value === currentValue ? "filter-option active" : "filter-option";
    option.type = "button";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", optionData.value === currentValue ? "true" : "false");
    option.textContent = optionData.label;
    option.addEventListener("click", () => {
      triggerValue.textContent = optionData.label;
      Array.from(menu.children).forEach((child) => {
        const isActive = child === option;
        child.classList.toggle("active", isActive);
        child.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      closeMenu();
      onChange(optionData.value);
    });
    menu.appendChild(option);
  });

  trigger.addEventListener("click", openMenu);
  select.append(trigger, menu);
  return select;
}

/**
 * Sorts items by display name with stable tie-breaking.
 *
 * @param {Array<object>} items - Items to sort.
 * @param {"asc"|"desc"} direction - Sort direction.
 * @returns {Array<object>} Sorted copy.
 */
function sortItemsByName(items, direction) {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...items].sort((left, right) => {
    const byName = String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    if (byName !== 0) {
      return byName * multiplier;
    }
    return String(left.id || "").localeCompare(String(right.id || "")) * multiplier;
  });
}

/**
 * Builds the empty panel for searches with no matching profile items.
 *
 * @returns {HTMLDivElement} Empty match panel.
 */
function createNoMatchesPanel() {
  const panel = document.createElement("div");
  panel.className = "empty-panel";
  panel.textContent = "No matching items.";
  return panel;
}

/**
 * Builds the empty-state UI for a tab with a search shortcut.
 *
 * @param {{label:string, projectType:string}} definition - Tab descriptor.
 * @returns {HTMLDivElement} Empty state element.
 */
function createEmptyState(definition, profileId) {
  const empty = document.createElement("div");
  empty.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-state-icon";
  icon.appendChild(createStateLogoImage());

  const title = document.createElement("div");
  title.className = "empty-state-title";
  title.textContent = definition.key === "mods"
    ? translate("noModsYet", "No mods yet")
    : definition.key === "resourcepacks"
      ? translate("noResourcePacksYet", "No resource packs yet")
      : translate("noShadersYet", "No shaders yet");

  const text = document.createElement("div");
  text.className = "empty-state-text";
  text.textContent = definition.key === "mods"
    ? translate("emptyModsText", "Browse projects or add your first mod manually.")
    : definition.key === "resourcepacks"
      ? translate("emptyResourcePacksText", "Browse projects or add your first resource pack manually.")
      : translate("emptyShadersText", "Browse projects or add your first shader manually.");

  const button = createButton(
    definition.key === "mods"
      ? translate("addMod", "+ Add mod")
      : definition.key === "resourcepacks"
        ? translate("addResourcePack", "+ Add resource pack")
        : translate("addShader", "+ Add shader"),
    "btn-primary"
  );
  const addLabel = definition.key === "mods"
    ? translate("addMod", "+ Add mod")
    : definition.key === "resourcepacks"
      ? translate("addResourcePack", "+ Add resource pack")
      : translate("addShader", "+ Add shader");
  button.replaceChildren(
    createIconLabelContent(
      "+",
      addLabel.replace(/^\+\s*/, ""),
      "btn-icon-plus"
    )
  );
  button.addEventListener("click", () => {
    window.dispatchEvent(
      new CustomEvent("packtracker:open-search", {
        detail: {
          query: "",
          projectType: definition.projectType,
          sourceTab: definition.key,
          profileId,
        },
      })
    );
  });

  empty.append(icon, title, text, button);
  return empty;
}

/**
 * Builds the empty state for Favorites without a misleading add shortcut.
 *
 * @param {{key:string}} definition - Tab descriptor.
 * @returns {HTMLDivElement} Empty favorites state.
 */
function createFavoritesEmptyState(definition) {
  const empty = document.createElement("div");
  empty.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-state-icon";
  icon.appendChild(createStateLogoImage());

  const title = document.createElement("div");
  title.className = "empty-state-title";
  title.textContent = definition.key === "mods"
    ? "No favorite mods yet"
    : definition.key === "resourcepacks"
      ? "No favorite resource packs yet"
      : "No favorite shaders yet";

  const text = document.createElement("div");
  text.className = "empty-state-text";
  text.textContent = "Use the star button on items in a normal profile to add them here.";

  empty.append(icon, title, text);
  return empty;
}

/**
 * Resolves the button label used for tab-specific bulk downloads.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @returns {string} Button label.
 */
function resolveDownloadButtonLabel(tab) {
  return translate("downloadAsZip", "⬇ Download as ZIP");
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
  const updatePreference = resolveUpdateProviderPreference();

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

  const preferenceNote = document.createElement("div");
  preferenceNote.className = "modal-subtitle";
  preferenceNote.textContent = `Provider preference: ${resolveUpdatePreferenceLabel(updatePreference)}.`;

  const preferenceButton = createButton(resolveUpdatePreferenceButtonLabel(), "btn-small");
  preferenceButton.addEventListener("click", () => {
    closeOverlays();
    showUpdateProviderPreferenceModal({
      onClose() {
        showBulkUpdateModal(profileId, tab);
      },
    });
  });

  const preferenceActions = createActionRow();
  preferenceActions.appendChild(preferenceButton);

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
  modal.append(title, subtitle, versionGroup.group, presets, note, preferenceNote, preferenceActions, actions);
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
    row.message = "checking Modrinth and CurseForge...";
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

      applyBulkUpdateToItem(currentItem, candidate.project, candidate.version, tab, candidate.source);
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
 * Finds the best compatible Modrinth or CurseForge version for one item and target Minecraft version.
 *
 * @param {object} item - Stored item.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @param {string} targetVersion - Requested Minecraft version.
 * @param {object} profile - Owning profile.
 * @returns {Promise<{kind:"update", project:object, version:object, message:string}|{kind:"skip", message:string}>} Update candidate.
 */
async function resolveBulkUpdateCandidate(item, tab, targetVersion, profile) {
  const currentSource = resolveTrackedItemSource(item);
  if (currentSource === "manual") {
    return { kind: "skip", message: "Manual item or missing project link" };
  }

  const projectType = tab === "resourcepacks" ? "resourcepack" : tab === "shaders" ? "shader" : "mod";
  const updatePreference = resolveUpdateProviderPreference();
  const preferredSource = updatePreference === "auto" ? currentSource : updatePreference;
  const sourcesToTry = resolveBulkUpdateSources(item, updatePreference, currentSource);
  let bestCandidate = null;
  const fallbackMessages = {};

  for (const source of sourcesToTry) {
    const candidate = await resolveBulkUpdateCandidateForSource(item, tab, targetVersion, profile, projectType, source);
    if (candidate.kind === "update") {
      if (source === preferredSource) {
        return candidate;
      }
      if (!bestCandidate || compareBulkUpdateCandidates(candidate, bestCandidate, preferredSource) < 0) {
        bestCandidate = candidate;
      }
      continue;
    }

    if (candidate.stopFallback && source === preferredSource) {
      return { kind: "skip", message: candidate.message || "Already on the newest compatible version" };
    }
    if (candidate.message) {
      fallbackMessages[source] = candidate.message;
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  return {
    kind: "skip",
    message: fallbackMessages[preferredSource]
      || fallbackMessages[currentSource]
      || fallbackMessages.modrinth
      || fallbackMessages.curseforge
      || "No versions found",
  };
}

/**
 * Resolves one bulk-update candidate from a specific source.
 *
 * @param {object} item - Stored item.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 * @param {string} targetVersion - Requested Minecraft version.
 * @param {object} profile - Owning profile.
 * @param {"mod"|"resourcepack"|"shader"} projectType - Resolved project type.
 * @param {"modrinth"|"curseforge"} source - Candidate source.
 * @param {{allowSameVersion?: boolean}} [options] - Resolution behavior flags.
 * @returns {Promise<{kind:"update", project:object, version:object, message:string, source:string}|{kind:"skip", message:string, stopFallback?:boolean}>} Candidate result.
 */
async function resolveBulkUpdateCandidateForSource(item, tab, targetVersion, profile, projectType, source, options = {}) {
  const currentSource = resolveTrackedItemSource(item);
  const allowSameVersion = options.allowSameVersion === true;
  const project = await resolveBulkUpdateProjectForSource(item, projectType, profile, source);
  if (project?.error) {
    return { kind: "skip", message: project.message || `Could not load ${resolveSourceLabel(source)} project` };
  }

  const projectId = resolveNormalizedProjectId(project, source === resolveTrackedItemSource(item) ? item : {});
  if (!projectId) {
    return { kind: "skip", message: `No ${resolveSourceLabel(source)} match found` };
  }

  let versions = await getVersionsForSource(source, projectId, {
    loader: tab === "mods" && profile.loader !== "vanilla" ? profile.loader : "",
    gameVersion: targetVersion,
  });
  if (versions.error || versions.length === 0) {
    versions = await getVersionsForSource(source, projectId);
  }
  if (versions.error || versions.length === 0) {
    return { kind: "skip", message: `No ${resolveSourceLabel(source)} versions found` };
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
        ? `No ${capitalize(profile.loader)} ${resolveSourceLabel(source)} version for ${targetVersion}`
        : `No ${resolveSourceLabel(source)} version found for ${targetVersion}`,
    };
  }

  const nextVersion = compatibleVersions[0];
  const currentVersion = item.versionNumber || item.version || "";
  if ((nextVersion.version_number || "") === currentVersion) {
    if (allowSameVersion && source !== currentSource) {
      return {
        kind: "update",
        project,
        version: nextVersion,
        source,
        message: `Switched to ${resolveSourceLabel(source)} on ${nextVersion.version_number || targetVersion}`,
      };
    }
    return { kind: "skip", message: `Already on ${targetVersion}`, stopFallback: true };
  }

  return {
    kind: "update",
    project,
    version: nextVersion,
    source,
    message: `Updated via ${resolveSourceLabel(source)} to ${nextVersion.version_number || targetVersion}`,
  };
}

/**
 * Resolves a project on one source, using direct ids for same-source items and name search for cross-source matches.
 *
 * @param {object} item - Stored item.
 * @param {"mod"|"resourcepack"|"shader"} projectType - Resolved project type.
 * @param {object} profile - Owning profile.
 * @param {"modrinth"|"curseforge"} source - Candidate source.
 * @returns {Promise<object>} Project payload or error-like object.
 */
async function resolveBulkUpdateProjectForSource(item, projectType, profile, source) {
  const currentSource = resolveTrackedItemSource(item);
  const directProjectId = source === currentSource ? resolveProjectId(item) : "";
  if (directProjectId) {
    return getProjectForSource(source, directProjectId);
  }

  const queries = Array.from(new Set([
    String(item?.slug || "").trim(),
    String(item?.name || "").trim(),
  ].filter(Boolean)));
  const loader = projectType === "mod" && profile.loader !== "vanilla" ? profile.loader : "";
  let bestProject = null;
  let bestScore = -1;

  for (const query of queries) {
    const response = await searchProjectsForSource(source, {
      query,
      projectType,
      loader,
      gameVersion: profile.mcVersion,
      offset: 0,
    });
    if (response?.error || !Array.isArray(response?.hits) || response.hits.length === 0) {
      continue;
    }

    response.hits.slice(0, 5).forEach((project) => {
      if (source !== currentSource && !isSafeCrossSourceProjectMatch(item, project)) {
        return;
      }
      const score = scoreProjectSearchMatch(item, project);
      if (score > bestScore) {
        bestScore = score;
        bestProject = project;
      }
    });
  }

  return bestProject || { error: true, message: `No ${resolveSourceLabel(source)} match found` };
}

/**
 * Searches projects on the selected source using the shared browse APIs.
 *
 * @param {"modrinth"|"curseforge"} source - Search source.
 * @param {object} options - Search options.
 * @returns {Promise<object>} Search response.
 */
async function searchProjectsForSource(source, options) {
  if (source === "curseforge" && typeof cfSearchProjects === "function") {
    return cfSearchProjects(options);
  }
  return searchProjects(options);
}

/**
 * Scores one searched project against the currently tracked item.
 *
 * @param {object} item - Stored item.
 * @param {object} project - Search result project.
 * @returns {number} Higher is better.
 */
function scoreProjectSearchMatch(item, project) {
  const itemName = normalizeProjectSearchText(item?.name || "");
  const itemSlug = normalizeProjectSearchText(item?.slug || "");
  const projectName = normalizeProjectSearchText(project?.title || project?.name || "");
  const projectSlug = normalizeProjectSearchText(project?.slug || "");
  let score = 0;

  if (itemName && projectName === itemName) {
    score += 400;
  } else if (itemName && (projectName.includes(itemName) || itemName.includes(projectName))) {
    score += 220;
  }

  if (itemSlug && projectSlug === itemSlug) {
    score += 340;
  } else if (itemSlug && projectSlug && (projectSlug.includes(itemSlug) || itemSlug.includes(projectSlug))) {
    score += 180;
  }

  score += Math.min(Number(project?.downloads || project?.follows || 0) / 1000, 80);
  return score;
}

/**
 * Returns true only when a cross-provider search result is a strong enough match
 * to safely replace the tracked project.
 *
 * @param {object} item - Stored tracked item.
 * @param {object} project - Candidate search result.
 * @returns {boolean} True when the match is safe enough to use across providers.
 */
function isSafeCrossSourceProjectMatch(item, project) {
  const itemSlug = normalizeProjectIdentityValue(item?.slug || "");
  const projectSlug = normalizeProjectIdentityValue(project?.slug || "");
  if (itemSlug && projectSlug) {
    return itemSlug === projectSlug;
  }

  const itemName = normalizeProjectIdentityValue(item?.name || "");
  const projectName = normalizeProjectIdentityValue(project?.title || project?.name || "");
  if (itemName && projectName) {
    return itemName === projectName;
  }

  return false;
}

/**
 * Compares two source candidates so the best overall update wins.
 *
 * @param {{source:string, version:object}} left - Candidate A.
 * @param {{source:string, version:object}} right - Candidate B.
 * @param {string} preferredSource - Source already used by the item.
 * @returns {number} Negative when left is better.
 */
function compareBulkUpdateCandidates(left, right, preferredSource) {
  const leftDate = new Date(left?.version?.date_published || 0).getTime();
  const rightDate = new Date(right?.version?.date_published || 0).getTime();
  if (leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  if (left.source === preferredSource && right.source !== preferredSource) {
    return -1;
  }
  if (right.source === preferredSource && left.source !== preferredSource) {
    return 1;
  }
  return 0;
}

/**
 * Returns the ordered source list used for bulk updates.
 *
 * @param {object} item - Stored tracked item.
 * @param {"auto"|"modrinth"|"curseforge"} updatePreference - Saved preference.
 * @returns {Array<"modrinth"|"curseforge">} Ordered source candidates.
 */
function resolveBulkUpdateSources(item, updatePreference, resolvedCurrentSource = "") {
  const currentSource = resolvedCurrentSource || resolveTrackedItemSource(item);
  const orderedSources = updatePreference === "auto"
    ? [currentSource, "modrinth", "curseforge"]
    : [updatePreference, currentSource, "modrinth", "curseforge"];
  return Array.from(new Set(orderedSources)).filter((source) => source === "modrinth" || source === "curseforge");
}

/**
 * Resolves the effective provider currently associated with a tracked item.
 *
 * @param {object} item - Stored tracked item.
 * @returns {"modrinth"|"curseforge"|"manual"} Effective item source.
 */
function resolveTrackedItemSource(item) {
  const explicitSource = String(item?.source || "").trim().toLowerCase();
  const url = String(item?.modrinthUrl || item?.fileUrl || item?.downloadUrl || "").trim().toLowerCase();
  if (url.includes("curseforge.com")) {
    return "curseforge";
  }
  if (url.includes("modrinth.com")) {
    return "modrinth";
  }
  if (explicitSource === "modrinth" || explicitSource === "curseforge" || explicitSource === "manual") {
    return explicitSource;
  }

  return "manual";
}

/**
 * Normalizes text for loose project-name comparisons.
 *
 * @param {string} value - Raw label.
 * @returns {string} Normalized text.
 */
function normalizeProjectSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Normalizes a project label or slug for exact identity checks across providers.
 *
 * @param {string} value - Raw project value.
 * @returns {string} Compact normalized value.
 */
function normalizeProjectIdentityValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Applies a chosen Modrinth version payload back onto a stored item.
 *
 * @param {object} item - Stored item reference.
 * @param {object} project - Resolved Modrinth project.
 * @param {object} version - Chosen Modrinth version.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 */
function applyBulkUpdateToItem(item, project, version, tab, forcedSource = "") {
  const primaryFile = Array.isArray(version?.files)
    ? version.files.find((file) => file.primary) || version.files[0]
    : null;
  const nextProjectId = resolveNormalizedProjectId(project, item);
  const nextSource = forcedSource || project?.source || resolveTrackedItemSource(item) || "modrinth";
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
    return item;
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
  return item;
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

  const suggestedName = `${sanitizeFileName(profile.name)}-${resolveZipFolderName(tab)}.zip`;
  const preparedDownload = typeof prepareDownloadWithPreferences === "function"
    ? await prepareDownloadWithPreferences(suggestedName)
    : null;
  if (preparedDownload?.mode === "cancelled") {
    return;
  }

  await downloadCategoryAsZip(getTabItems(profile, tab), resolveZipFolderName(tab), profile.name, preparedDownload);
}

/**
 * Starts a ZIP download for virtual profiles such as Favorites.
 *
 * @param {object} profile - Virtual profile snapshot.
 * @param {"mods"|"resourcepacks"|"shaders"} tab - Active tab key.
 */
async function beginVirtualDownloadFlow(profile, tab) {
  const suggestedName = `${sanitizeFileName(profile?.name || "favorites")}-${resolveZipFolderName(tab)}.zip`;
  const preparedDownload = typeof prepareDownloadWithPreferences === "function"
    ? await prepareDownloadWithPreferences(suggestedName)
    : null;
  if (preparedDownload?.mode === "cancelled") {
    return;
  }

  await downloadCategoryAsZip(getVisibleTabItems(getTabItems(profile, tab), tab), resolveZipFolderName(tab), profile?.name || "Favorites", preparedDownload);
}

/**
 * Downloads one category as a ZIP bundle while skipping missing/directly duplicated items.
 *
 * @param {Array<object>} items - Items in the active category.
 * @param {string} categoryFolderName - Folder name inside the ZIP.
 * @param {string} profileName - Profile label used in the ZIP filename.
 */
async function downloadCategoryAsZip(items, categoryFolderName, profileName, preparedDownload = null) {
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
  let downloadResult = { mode: "ask" };
  try {
    if (typeof downloadWithPreferences === "function") {
      downloadResult = await downloadWithPreferences(
        objectUrl,
        `${sanitizeFileName(profileName)}-${categoryFolderName}.zip`,
        preparedDownload?.saveHandle ? { saveHandle: preparedDownload.saveHandle } : undefined
      );
    } else {
      await downloadFile(objectUrl, `${sanitizeFileName(profileName)}-${categoryFolderName}.zip`);
    }
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }

  if (withoutUrl.length > 0 && typeof namespace.showToast === "function") {
    namespace.showToast(`${withoutUrl.length} items have no direct download link and were skipped.`, "warning");
  }

  if (downloadResult.mode === "cancelled") {
    return;
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
    row.message = "preparing download...";
    row.fileName = resolved.filename;
    row.sizeLabel = resolved.sizeLabel;
    renderDownloadProgressModal();

    try {
      let downloadResult = { mode: "ask" };
      if (typeof downloadWithPreferences === "function") {
        downloadResult = await downloadWithPreferences(resolved.url, resolved.filename);
      } else {
        await downloadFile(resolved.url, resolved.filename);
      }
      if (downloadResult.mode === "cancelled") {
        row.status = DOWNLOAD_ROW_STATES.QUEUED;
        row.message = "cancelled";
        renderDownloadProgressModal();
        continue;
      }
      row.status = DOWNLOAD_ROW_STATES.DONE;
      row.message = "download sent";
      downloadSession.completed += 1;
      if (typeof namespace.showToast === "function") {
        namespace.showToast(`Download sent for ${resolved.filename}`, "success");
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
 * Starts a direct download for one tracked item using the same target resolution as ZIP bundling.
 *
 * @param {object} item - Stored item.
 * @returns {Promise<boolean>} True when a download was started.
 */
async function startTrackedItemDownload(item) {
  const preparedDownload = typeof prepareDownloadWithPreferences === "function"
    ? await prepareDownloadWithPreferences(resolveTrackedItemSuggestedFileName(item))
    : null;
  if (preparedDownload?.mode === "cancelled") {
    return false;
  }

  const target = await resolveZipDownloadTarget(item);
  if (!target.url) {
    if (typeof namespace.showToast === "function") {
      namespace.showToast(target.message || "No downloadable file found", "warning");
    }
    return false;
  }

  let downloadResult = { mode: "ask" };
  if (typeof downloadWithPreferences === "function") {
    downloadResult = await downloadWithPreferences(
      target.url,
      target.filename,
      preparedDownload?.saveHandle ? { saveHandle: preparedDownload.saveHandle } : undefined
    );
  } else if (typeof downloadFile === "function") {
    await downloadFile(target.url, target.filename);
  } else {
    window.open(target.url, "_blank", "noopener");
  }

  if (downloadResult.mode === "cancelled") {
    return false;
  }

  if (typeof namespace.showToast === "function") {
    namespace.showToast(`Download started for ${item?.name || "item"}`, "success");
  }
  return true;
}

/**
 * Builds a filename suggestion before an item's real download URL has been resolved.
 *
 * @param {object} item - Stored tracked item.
 * @returns {string} Suggested filename.
 */
function resolveTrackedItemSuggestedFileName(item) {
  return String(item?.fileName || item?.versionFileName || "").trim()
    || `${sanitizeFileName(item?.name || item?.slug || "download")}.jar`;
}

/**
 * Switches one tracked item to the alternate supported provider when a match exists.
 *
 * @param {object} item - Stored tracked item.
 * @param {string} profileId - Profile identifier.
 * @param {"mod"|"resourcepack"|"shader"} type - Item type.
 * @param {"modrinth"|"curseforge"} nextSource - Target provider.
 * @returns {Promise<boolean>} True when the item was switched.
 */
async function switchTrackedItemProvider(item, profileId, type, nextSource) {
  const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return false;
  }

  const currentSource = resolveTrackedItemSource(item);
  if (currentSource === nextSource) {
    if (typeof namespace.showToast === "function") {
      namespace.showToast(`${item.name || "Item"} is already using ${resolveSourceLabel(nextSource)}.`, "warning");
    }
    return false;
  }

  const projectType = type === "mod" ? "mod" : type;
  const tab = type === "mod" ? "mods" : type === "resourcepack" ? "resourcepacks" : "shaders";
  const candidate = await resolveBulkUpdateCandidateForSource(
    item,
    tab,
    profile.mcVersion,
    profile,
    projectType,
    nextSource,
    { allowSameVersion: true }
  );
  if (!candidate || candidate.kind !== "update" || !candidate.project || !candidate.version) {
    if (typeof namespace.showToast === "function") {
      namespace.showToast(candidate?.message || `No ${resolveSourceLabel(nextSource)} match found`, "warning");
    }
    return false;
  }

  const updatedItem = applyBulkUpdateToItem(item, candidate.project, candidate.version, tab, candidate.source);
  showCompatibilityWarnings(updatedItem, profile);
  if (typeof notifyStateChanged === "function") {
    notifyStateChanged("switch-provider");
  }
  if (typeof namespace.showToast === "function") {
    namespace.showToast(`Switched ${item.name || "item"} to ${resolveSourceLabel(nextSource)}.`, "success");
  }
  return true;
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

  const dependencyProjects = await resolveDependencyProjectMetadata(
    missingDependencies,
    Array.isArray(mod?.dependencyProjects) ? mod.dependencyProjects : []
  );
  const installedKeys = buildInstalledDependencyKeys(profile);
  const unresolvedDependencies = missingDependencies.filter((dependencyId) => {
    const dependencyProject = dependencyProjects.find((entry) => String(entry?.id || "") === String(dependencyId || ""));
    return !isDependencyAlreadyInstalled(installedKeys, dependencyId, dependencyProject);
  });

  if (unresolvedDependencies.length === 0) {
    if (typeof namespace.showToast === "function") {
      namespace.showToast("All required dependencies are already installed.", "success");
    }
    return;
  }

  const overlay = createModalOverlay();
  const modal = createModalCard();
  modal.classList.add("modal-wide");
  const title = createModalTitle(`Missing dependencies for ${mod.name}`);
  const subtitle = createModalSubtitle("Add the required projects that are not yet tracked in this profile.");
  const list = document.createElement("div");
  list.className = "dependency-list";

  unresolvedDependencies.forEach((dependencyId) => {
    const item = document.createElement("div");
    item.className = "dependency-item";

    const icon = document.createElement("div");
    icon.className = "dependency-icon";
    icon.appendChild(createIconNode(dependencyId, "", 40));

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

    item.append(icon, text, addButton);
    list.appendChild(item);

    const cachedProject = dependencyProjects.find((entry) => String(entry?.id || "") === String(dependencyId || ""));
    if (cachedProject) {
      icon.replaceChildren(createIconNode(
        cachedProject.name || dependencyId,
        cachedProject.iconUrl || "",
        40
      ));
      name.textContent = cachedProject.name || dependencyId;
      meta.textContent = cachedProject.description || dependencyId;
    } else {
      getProject(dependencyId).then((project) => {
        if (!project.error) {
          const normalizedProject = normalizeDependencyProject(project);
          icon.replaceChildren(createIconNode(
            normalizedProject.name || dependencyId,
            normalizedProject.iconUrl || "",
            40
          ));
          name.textContent = normalizedProject.name || dependencyId;
          meta.textContent = normalizedProject.description || dependencyId;
        } else {
          meta.textContent = project.message || "Failed to fetch project details.";
        }
      });
    }
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
 * Resolves dependency project metadata so cross-provider dependency detection can
 * compare names and slugs, not just raw Modrinth ids.
 *
 * @param {Array<string>} dependencyIds - Dependency project ids.
 * @param {Array<object>} cachedProjects - Existing dependency metadata stored on the mod.
 * @returns {Promise<Array<{id:string, slug:string, name:string, description:string, iconUrl:string}>>} Normalized dependency metadata.
 */
async function resolveDependencyProjectMetadata(dependencyIds, cachedProjects = []) {
  const normalizedCached = Array.isArray(cachedProjects)
    ? cachedProjects.map((entry) => normalizeDependencyProject(entry)).filter((entry) => entry.id)
    : [];
  const missingIds = dependencyIds.filter((dependencyId) => {
    const safeId = String(dependencyId || "").trim();
    return safeId && !normalizedCached.some((entry) => entry.id === safeId);
  });

  if (missingIds.length === 0) {
    return normalizedCached;
  }

  let fetchedProjects = [];
  if (typeof getProjects === "function") {
    const response = await getProjects(missingIds);
    if (!response?.error && Array.isArray(response)) {
      fetchedProjects = response;
    }
  }

  if (fetchedProjects.length === 0) {
    const responses = await Promise.all(missingIds.map((dependencyId) => getProject(dependencyId)));
    fetchedProjects = responses.filter((entry) => !entry?.error);
  }

  return [
    ...normalizedCached,
    ...fetchedProjects.map((entry) => normalizeDependencyProject(entry)).filter((entry) => entry.id),
  ];
}

/**
 * Normalizes one dependency project payload into a compact reusable shape.
 *
 * @param {object} project - Raw project payload.
 * @returns {{id:string, slug:string, name:string, description:string, iconUrl:string}} Normalized metadata.
 */
function normalizeDependencyProject(project) {
  return {
    id: String(project?.id || project?.project_id || "").trim(),
    slug: String(project?.slug || "").trim(),
    name: String(project?.title || project?.name || "").trim(),
    description: String(project?.description || "").trim(),
    iconUrl: String(project?.icon_url || project?.iconUrl || "").trim(),
  };
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
  const dependencyProjects = dependencies.error
    ? []
    : Array.isArray(dependencies.projects)
      ? dependencies.projects.map((entry) => normalizeDependencyProject(entry))
      : [];

  const savedItem = addMod(profile.id, mapProjectVersionToMod(project, version, dependencyIds, dependencyProjects));
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

  const downloadItem = createContextItem("Download file", async () => {
    downloadItem.disabled = true;
    downloadItem.textContent = "Preparing...";

    try {
      const started = await startTrackedItemDownload(item);
      if (started) {
        closeContextMenu(root);
      } else {
        downloadItem.disabled = false;
        downloadItem.textContent = "Download file";
      }
    } catch (error) {
      downloadItem.disabled = false;
      downloadItem.textContent = "Download file";
      if (typeof namespace.showToast === "function") {
        namespace.showToast(error instanceof Error ? error.message : "Download failed", "danger");
      }
    }
  });
  menu.appendChild(downloadItem);

  const currentSource = resolveTrackedItemSource(item);
  const alternateSource = currentSource === "curseforge"
    ? "modrinth"
    : currentSource === "modrinth"
      ? "curseforge"
      : "";
  if (alternateSource) {
    const switchLabel = translate("switchToProviderExperimental", "Switch to {source}")
      .replace("{source}", resolveSourceLabel(alternateSource));
    const switchItem = createContextItem(createExperimentalContextLabel(switchLabel), async () => {
      switchItem.disabled = true;
      switchItem.textContent = "Switching...";
      try {
        const switched = await switchTrackedItemProvider(item, profileId, type, alternateSource);
        if (switched) {
          closeContextMenu(root);
        } else {
          switchItem.disabled = false;
          switchItem.replaceChildren(createExperimentalContextLabel(switchLabel));
        }
      } catch (error) {
        switchItem.disabled = false;
        switchItem.replaceChildren(createExperimentalContextLabel(switchLabel));
        if (typeof namespace.showToast === "function") {
          namespace.showToast(error instanceof Error ? error.message : "Provider switch failed", "danger");
        }
      }
    });
    menu.appendChild(switchItem);
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
 * @param {Array<object>} [dependencyProjects] - Optional normalized dependency metadata.
 * @returns {object} Storage-ready mod item.
 */
function mapProjectVersionToMod(project, version, dependencyIds, dependencyProjects = []) {
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
    dependencyProjects: Array.isArray(dependencyProjects)
      ? dependencyProjects.map((entry) => normalizeDependencyProject(entry)).filter((entry) => entry.id)
      : [],
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
 * Opens the update-provider preference modal used by the bulk update toolbar button.
 */
function showUpdateProviderPreferenceModal(options = {}) {
  const overlay = createModalOverlay();
  const modal = createModalCard();
  const title = createModalTitle("Update provider preference");
  const subtitle = createModalSubtitle("Choose which source PackTracker should prefer first when checking for newer compatible versions.");
  const onClose = typeof options.onClose === "function" ? options.onClose : null;

  const list = document.createElement("div");
  list.className = "version-list";
  let selectedValue = resolveUpdateProviderPreference();

  UPDATE_PROVIDER_PREFERENCES.forEach((optionData) => {
    const row = document.createElement("label");
    row.className = "version-item";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "update-provider-preference";
    radio.checked = optionData.value === selectedValue;
    radio.addEventListener("change", () => {
      selectedValue = optionData.value;
    });

    const text = document.createElement("div");
    text.className = "version-item-label";

    const name = document.createElement("div");
    name.className = "version-name";
    name.textContent = optionData.label;

    const meta = document.createElement("div");
    meta.className = "version-meta";
    meta.textContent = optionData.value === "auto"
      ? "Use the current item source first, then try the other provider if needed."
      : `Try ${resolveSourceLabel(optionData.value)} first, then fall back if no compatible match exists.`;

    text.append(name, meta);
    row.append(radio, text);
    list.appendChild(row);
  });

  const actions = createActionRow();
  const cancelButton = createButton("Cancel");
  const saveButton = createButton("Save preference", "btn-primary");
  cancelButton.addEventListener("click", () => {
    closeOverlays();
    if (onClose) {
      onClose();
    }
  });
  saveButton.addEventListener("click", () => {
    if (typeof updateAppSettings === "function") {
      AppState.settings = updateAppSettings({ updateProviderPreference: selectedValue });
    } else {
      AppState.settings = {
        ...(AppState.settings || {}),
        updateProviderPreference: selectedValue,
      };
    }
    if (typeof namespace.showToast === "function") {
      namespace.showToast(`Update preference saved: ${resolveUpdatePreferenceLabel(selectedValue)}.`, "success");
    }
    closeOverlays();
    if (onClose) {
      onClose();
    }
  });
  actions.append(cancelButton, saveButton);

  modal.append(title, subtitle, list, actions);
  overlay.appendChild(modal);
  mountModal(overlay);
}

/**
 * Returns the stored update-provider preference.
 *
 * @returns {"auto"|"modrinth"|"curseforge"} Normalized preference.
 */
function resolveUpdateProviderPreference() {
  const raw = String(AppState.settings?.updateProviderPreference || "auto").trim().toLowerCase();
  return UPDATE_PROVIDER_PREFERENCES.some((entry) => entry.value === raw) ? raw : "auto";
}

/**
 * Formats one saved update-provider preference for button and subtitle labels.
 *
 * @param {"auto"|"modrinth"|"curseforge"} preference - Stored preference.
 * @returns {string} User-facing label.
 */
function resolveUpdatePreferenceLabel(preference) {
  if (preference === "modrinth") {
    return "Prefer Modrinth";
  }
  if (preference === "curseforge") {
    return "Prefer CurseForge";
  }
  return "Auto";
}

/**
 * Builds the toolbar button label for the saved update-provider preference.
 *
 * @returns {string} Toolbar label.
 */
function resolveUpdatePreferenceButtonLabel() {
  return `Source: ${resolveUpdatePreferenceLabel(resolveUpdateProviderPreference())}`;
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
      if (getViewMode(scope) !== mode) {
        animateViewToggleChange(group, button, scope, mode);
      }
    });
    group.appendChild(button);
  });

  queueViewToggleIndicatorUpdate(group);
  return group;
}

/**
 * Animates the profile layout switch before committing the next view mode.
 *
 * @param {HTMLDivElement} toggle - View-toggle wrapper.
 * @param {HTMLButtonElement} nextButton - Newly selected toggle button.
 * @param {"mods"|"resourcepacks"|"shaders"} scope - View-mode scope.
 * @param {"list"|"grid"} nextMode - Next layout mode.
 */
function animateViewToggleChange(toggle, nextButton, scope, nextMode) {
  if (!(toggle instanceof HTMLElement) || !(nextButton instanceof HTMLElement)) {
    return;
  }

  if (toggle.dataset.switching === "true") {
    return;
  }

  toggle.dataset.switching = "true";
  toggle.classList.add("is-switching");
  toggle.querySelectorAll(".view-toggle-btn").forEach((button) => {
    button.classList.toggle("active", button === nextButton);
  });
  updateViewToggleIndicator(toggle);

  window.setTimeout(() => {
    setViewMode(scope, nextMode);
  }, 140);
}

/**
 * Schedules alignment of the active view-toggle pill after layout.
 *
 * @param {HTMLDivElement} toggle - View-toggle wrapper.
 */
function queueViewToggleIndicatorUpdate(toggle) {
  window.requestAnimationFrame(() => {
    updateViewToggleIndicator(toggle);
  });
}

/**
 * Aligns the animated view-toggle pill with the active layout button.
 *
 * @param {HTMLDivElement} toggle - View-toggle wrapper.
 */
function updateViewToggleIndicator(toggle) {
  if (!(toggle instanceof HTMLElement)) {
    return;
  }

  const activeButton = toggle.querySelector(".view-toggle-btn.active");
  if (!(activeButton instanceof HTMLElement)) {
    return;
  }

  toggle.style.setProperty("--view-toggle-left", `${activeButton.offsetLeft}px`);
  toggle.style.setProperty("--view-toggle-width", `${activeButton.offsetWidth}px`);
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
  input.maxLength = resolveTextFieldMaxLength(labelText);
  group.append(label, input);
  attachCharacterCounter(group, input);
  return { group, input };
}

/**
 * Adds a small live character counter to a text field.
 *
 * @param {HTMLElement} group - Field group.
 * @param {HTMLInputElement|HTMLTextAreaElement} input - Input element.
 */
function attachCharacterCounter(group, input) {
  if (!input.maxLength || input.maxLength < 0) {
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = input.tagName === "TEXTAREA" ? "field-counter-wrap field-counter-wrap-textarea" : "field-counter-wrap";
  const counter = document.createElement("span");
  counter.className = "field-counter";
  const update = () => {
    counter.textContent = `${input.value.length}/${input.maxLength}`;
  };
  input.replaceWith(wrapper);
  wrapper.append(input, counter);
  input.addEventListener("input", update);
  update();
}

/**
 * Chooses field-specific text limits that match expected content.
 *
 * @param {string} labelText - Visible field label.
 * @returns {number} Maximum character count.
 */
function resolveTextFieldMaxLength(labelText) {
  const normalized = String(labelText || "").toLowerCase();
  if (normalized.includes("minecraft version")) {
    return 16;
  }
  if (normalized.includes("version")) {
    return 48;
  }
  if (normalized.includes("author")) {
    return 48;
  }
  if (normalized.includes("url")) {
    return 2048;
  }
  if (normalized.includes("name")) {
    return 80;
  }
  return 120;
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
 * Creates the PackTracker logo node for welcome and empty states.
 *
 * @returns {HTMLImageElement} Logo image element.
 */
function createStateLogoImage() {
  const image = document.createElement("img");
  image.className = "state-logo";
  image.src = "./assets/logo.png?v=20260420-1";
  image.alt = "";
  image.draggable = false;
  return image;
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
 * Resolves the localized label for one collection tab.
 *
 * @param {"mods"|"resourcepacks"|"shaders"} tabKey - Tab identifier.
 * @returns {string} User-facing label.
 */
function resolveTabLabel(tabKey) {
  if (tabKey === "resourcepacks") {
    return translate("resourcePacks", "Resource Packs");
  }
  if (tabKey === "shaders") {
    return translate("shaders", "Shaders");
  }
  return translate("mods", "Mods");
}

/**
 * Creates one tab label wrapper for hover animation targeting.
 *
 * @param {string} text - Visible tab text.
 * @returns {HTMLSpanElement} Label span.
 */
function createTabLabel(text) {
  const label = document.createElement("span");
  label.className = "tab-label";
  label.textContent = text;
  return label;
}

/**
 * Creates shared button content with a separately animatable icon span.
 *
 * @param {string} icon - Visible icon.
 * @param {string} label - Visible label.
 * @param {string} iconClass - Extra icon class.
 * @returns {HTMLSpanElement} Content wrapper.
 */
function createIconLabelContent(icon, label, iconClass) {
  const content = document.createElement("span");
  content.className = "btn-content";

  const iconElement = document.createElement("span");
  iconElement.className = iconClass ? `btn-icon ${iconClass}` : "btn-icon";
  iconElement.textContent = icon;

  const labelElement = document.createElement("span");
  labelElement.className = "btn-label";
  labelElement.textContent = label;

  content.append(iconElement, labelElement);
  return content;
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
  if (text instanceof Node) {
    item.appendChild(text);
  } else {
    item.textContent = text;
  }
  item.addEventListener("click", onClick);
  return item;
}

/**
 * Builds a context-menu label with a trailing Experimental tag.
 *
 * @param {string} text - Main action label.
 * @returns {HTMLSpanElement} Label wrapper.
 */
function createExperimentalContextLabel(text) {
  const wrapper = document.createElement("span");
  wrapper.className = "context-menu-item-label";

  const label = document.createElement("span");
  label.textContent = text;

  const tag = document.createElement("span");
  tag.className = "experimental-tag";
  tag.textContent = "Experimental";

  wrapper.append(label, tag);
  return wrapper;
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
