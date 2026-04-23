(function attachSidebarModule() {
  const namespace = window.PackTracker;
  const {
    AppState,
    FAVORITES_PROFILE_ID,
    getGameVersions,
    notifyStateChanged,
    saveData,
    setActiveProfile,
    setActiveView,
    createProfile,
    deleteProfile,
    duplicateProfile,
    updateProfile,
  } = namespace;

  const PROFILE_LIST_ID = "profile-list";
  const MODAL_ROOT_ID = "modal-root";
  const LOADERS = ["fabric", "forge", "neoforge"];
  const COMMON_MC_VERSIONS = [
    "1.21.11", "1.21.10", "1.21.9", "1.21.8", "1.21.7", "1.21.6", "1.21.5", "1.21.4", "1.21.3", "1.21.1",
    "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1",
    "1.19.4", "1.19.3", "1.19.2",
    "1.18.2",
    "1.17.1",
    "1.16.5",
    "1.12.2",
  ];
  let cachedMinecraftVersions = [...COMMON_MC_VERSIONS];
  let sidebarEditMode = false;
  let sidebarDragHandle = null;
  const DEFAULT_PROFILE_NAME = "New profile";
  const DEFAULT_MC_VERSION = "1.21.1";

  function translate(key, fallback) {
    return typeof namespace.t === "function" ? namespace.t(key, fallback) : fallback;
  }

  /**
   * Renders the complete sidebar profile list from current state.
   */
  function renderSidebar() {
    const container = document.getElementById(PROFILE_LIST_ID);
    if (!container) {
      return;
    }

    if (sidebarDragHandle) {
      sidebarDragHandle.destroy();
      sidebarDragHandle = null;
    }

    container.replaceChildren();
    const profiles = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];

    const orderBar = document.createElement("div");
    orderBar.className = "sidebar-order-bar";

    const orderButton = document.createElement("button");
    orderButton.className = sidebarEditMode
      ? "btn btn-primary btn-small"
      : "btn btn-small";
    orderButton.type = "button";
    orderButton.replaceChildren(
      createIconLabelContent(
        sidebarEditMode ? "\u2713" : "\u270E",
        sidebarEditMode ? translate("done", "Done") : translate("editOrder", "Edit order"),
        sidebarEditMode ? "btn-icon-check" : "btn-icon-pencil"
      )
    );
    orderButton.addEventListener("click", () => {
      sidebarEditMode = !sidebarEditMode;
      renderSidebar();
    });
    orderBar.appendChild(orderButton);
    container.appendChild(orderBar);

    if (profiles.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-panel";
      empty.textContent = translate("noProfilesYetShort", "No profiles yet.");
      container.appendChild(empty);
    } else {
      profiles.forEach((profile) => {
        container.appendChild(renderProfileItem(profile));
      });
    }

    container.appendChild(renderFavoritesItem());

    if (sidebarEditMode && typeof namespace.enableDragOrder === "function") {
      sidebarDragHandle = namespace.enableDragOrder(container, (fromIndex, toIndex) => {
        const profileItems = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];
        if (!Array.isArray(profileItems)) {
          return;
        }

        const moved = profileItems.splice(fromIndex, 1)[0];
        if (!moved) {
          return;
        }
        profileItems.splice(toIndex, 0, moved);

        if (typeof saveData === "function") {
          AppState.data = saveData(AppState.data);
        }
        if (typeof notifyStateChanged === "function") {
          notifyStateChanged("reorder-profiles");
        }
      });
    }
  }

  /**
   * Builds the fixed sidebar entry that opens the aggregated favorites view.
   *
   * @returns {HTMLDivElement} Favorites row.
   */
  function renderFavoritesItem() {
    const item = document.createElement("div");
    item.className = "profile-item favorites-item";
    if (AppState.activeProfileId === FAVORITES_PROFILE_ID) {
      item.classList.add("active");
    }

    const header = document.createElement("div");
    header.className = "profile-item-header";

    const name = document.createElement("div");
    name.className = "profile-item-name";
    name.textContent = `\u2605 ${translate("favorites", "Favorites")}`;

    header.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "profile-item-meta";

    const label = document.createElement("span");
    label.className = "badge";
    label.textContent = translate("starredItems", "Starred items");
    meta.appendChild(label);

    const count = document.createElement("div");
    count.className = "profile-item-count";
    count.textContent = `${countStarredItems()} ${translate("items", "items")}`;

    item.append(header, meta, count);
    if (sidebarEditMode) {
      item.classList.add("is-layout-disabled");
    } else {
      item.addEventListener("click", () => {
        setActiveProfile(FAVORITES_PROFILE_ID);
        setActiveView("home");
      });
    }

    return item;
  }

  /**
   * Builds one profile row with selection and settings access.
   *
   * @param {object} profile - Profile to render.
   * @returns {HTMLDivElement} Profile row element.
   */
  function renderProfileItem(profile) {
    const item = document.createElement("div");
    item.className = "profile-item";
    item.dataset.profileId = profile.id;

    if (sidebarEditMode) {
      item.setAttribute("data-drag-item", "");
      item.classList.add("is-reorder-mode");

      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.textContent = "\u283F";
      handle.setAttribute("aria-hidden", "true");

      const name = document.createElement("div");
      name.className = "profile-item-name";
      name.textContent = `\uD83D\uDCE6 ${profile.name}`;

      item.append(handle, name);
      return item;
    }

    if (profile.id === AppState.activeProfileId) {
      item.classList.add("active");
    }

    const header = document.createElement("div");
    header.className = "profile-item-header";

    const name = document.createElement("div");
    name.className = "profile-item-name";
    name.textContent = `\uD83D\uDCE6 ${profile.name}`;

    const settingsButton = document.createElement("button");
    settingsButton.className = "icon-btn profile-settings-btn";
    settingsButton.type = "button";
    settingsButton.setAttribute("aria-label", `Settings for ${profile.name}`);
    settingsButton.appendChild(createIconOnlyContent("\u2699", "btn-icon-gear"));
    settingsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      showProfileSettingsModal(profile.id);
    });

    const actions = document.createElement("div");
    actions.className = "profile-item-actions";
    actions.append(settingsButton);

    header.append(name, actions);

    const meta = document.createElement("div");
    meta.className = "profile-item-meta";
    meta.append(
      createLoaderBadge(profile.loader),
      createVersionBadge(profile.mcVersion)
    );

    const count = document.createElement("div");
    count.className = "profile-item-count";
    count.textContent = `${profile.mods.length} ${translate("mods", "mods").toLowerCase()}`;

    item.append(header, meta, count);
    item.addEventListener("click", () => {
      setActiveProfile(profile.id);
      setActiveView("home");
    });

    return item;
  }

  /**
   * Opens the new-profile modal and creates a record on submit.
   */
  function showNewProfileModal() {
    showProfileFormModal({
      title: "New profile",
      submitLabel: "Save profile",
      initialValues: {
        name: "",
        mcVersion: getLatestMinecraftVersion(),
        loader: "fabric",
      },
      onSubmit(values) {
        const profile = createProfile(values);
        setActiveProfile(profile.id);
        setActiveView("home");
      },
    });
  }

  /**
   * Opens a duplicate modal that lets the user rename the copy before saving.
   *
   * @param {string} profileId - Source profile identifier.
   */
  function showDuplicateModal(profileId) {
    const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }

    const duplicate = duplicateProfile(profileId);
    if (!duplicate) {
      return;
    }

    updateProfile(duplicate.id, { name: `${profile.name} (copy)` });
    setActiveProfile(duplicate.id);
    setActiveView("home");
  }

  /**
   * Shows the profile settings modal with save, duplicate, and delete actions.
   *
   * @param {string} profileId - Profile identifier.
   */
  function showProfileSettingsModal(profileId) {
    const profile = AppState.data?.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }

    const overlay = createModalOverlay();
    const modal = createModalCard();
    modal.classList.add("modal-wide", "modal-profile-form");
    const body = createModalBody();

    const title = createModalTitle("Profile settings");
    const subtitle = createModalSubtitle("Update the name, Minecraft version, and loader for this profile.");

    const nameGroup = createInputGroup("Profile name", "text", profile.name);
    const versionGroup = createMinecraftVersionGroup("Minecraft version", profile.mcVersion || getLatestMinecraftVersion());
    const loaderGroup = createSelectGroup("Loader", LOADERS, profile.loader, (loader) => capitalize(loader === "neoforge" ? "NeoForge" : loader));

    const secondaryActions = document.createElement("div");
    secondaryActions.className = "profile-settings-actions";

    const duplicateButton = createButton("Duplicate profile");
    duplicateButton.addEventListener("click", () => {
      showDuplicateModal(profileId);
      closeSidebarOverlays();
    });

    const deleteButton = createButton("Delete profile", "btn-danger");
    deleteButton.addEventListener("click", () => {
      showDeleteConfirmModal(profileId, profile.name);
    });

    secondaryActions.append(duplicateButton, deleteButton);

    const actions = createActionRow();
    const cancelButton = createButton("Cancel");
    const saveButton = createButton("Save profile", "btn-primary");
    cancelButton.addEventListener("click", closeSidebarOverlays);
    saveButton.addEventListener("click", () => {
      updateProfile(profileId, {
        name: nameGroup.input.value.trim() || profile.name,
        mcVersion: versionGroup.getValue() || getLatestMinecraftVersion(),
        loader: loaderGroup.getValue(),
      });
      closeSidebarOverlays();
    });

    actions.append(cancelButton, saveButton);
    body.append(title, subtitle, nameGroup.group, versionGroup.group, loaderGroup.group, secondaryActions, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    mountModalOverlay(overlay);
  }

  /**
   * Clears sidebar-owned overlays such as modals.
   */
  function closeSidebarOverlays() {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (modalRoot) {
      if (typeof namespace.dismissRootChildren === "function") {
        namespace.dismissRootChildren(modalRoot);
      } else {
        modalRoot.replaceChildren();
      }
    }
  }

  /**
   * Opens the shared profile form modal for create flows.
   *
   * @param {{title:string, submitLabel:string, initialValues:object, onSubmit:(values:object)=>void}} config - Form modal configuration.
   */
  function showProfileFormModal(config) {
    const overlay = createModalOverlay();
    const modal = createModalCard();
    modal.classList.add("modal-profile-form");
    const body = createModalBody();
    const title = createModalTitle(config.title);
    const subtitle = createModalSubtitle("Create a profile for a specific Minecraft setup.");
    const nameGroup = createInputGroup("Profile name", "text", config.initialValues.name, {
      placeholder: config.defaultName || DEFAULT_PROFILE_NAME,
    });
    const versionGroup = createMinecraftVersionGroup("Minecraft version", config.initialValues.mcVersion || getLatestMinecraftVersion(), {
      autoDefault: !config.initialValues.mcVersion,
    });
    const loaderGroup = createSelectGroup("Loader", LOADERS, config.initialValues.loader, (loader) => capitalize(loader === "neoforge" ? "NeoForge" : loader));

    const actions = createActionRow();
    const cancelButton = createButton("Cancel");
    const submitButton = createButton(config.submitLabel, "btn-primary");
    cancelButton.addEventListener("click", closeSidebarOverlays);
    submitButton.addEventListener("click", () => {
      const fallbackName = config.defaultName || DEFAULT_PROFILE_NAME;
      config.onSubmit({
        name: nameGroup.input.value.trim() || fallbackName,
        mcVersion: versionGroup.getValue() || getLatestMinecraftVersion(),
        loader: loaderGroup.getValue(),
      });
      closeSidebarOverlays();
    });

    actions.append(cancelButton, submitButton);
    body.append(title, subtitle, nameGroup.group, versionGroup.group, loaderGroup.group, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    mountModalOverlay(overlay);
  }

  /**
   * Opens a delete confirmation modal for a profile.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} profileName - Visible profile name.
   */
  function showDeleteConfirmModal(profileId, profileName) {
    const overlay = createModalOverlay();
    const modal = createModalCard();
    const body = createModalBody();
    const title = createModalTitle("Delete profile?");
    const subtitle = createModalSubtitle(`Are you sure you want to delete '${profileName}'? This cannot be undone.`);
    const actions = createActionRow();
    const cancelButton = createButton("Cancel");
    const deleteButton = createButton("Delete profile", "btn-danger");
    cancelButton.addEventListener("click", closeSidebarOverlays);
    deleteButton.addEventListener("click", () => {
      deleteProfile(profileId);
      closeSidebarOverlays();
    });
    actions.append(cancelButton, deleteButton);
    body.append(title, subtitle, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    mountModalOverlay(overlay);
  }

  /**
   * Adds a modal overlay to the shared modal root and wires outside-click closing.
   *
   * @param {HTMLDivElement} overlay - Modal overlay element.
   */
  function mountModalOverlay(overlay) {
    const root = document.getElementById(MODAL_ROOT_ID);
    if (!root) {
      return;
    }

    root.replaceChildren();
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeSidebarOverlays();
      }
    });
    root.appendChild(overlay);
  }

  /**
   * Creates a shared modal overlay element.
   *
   * @returns {HTMLDivElement} Modal overlay.
   */
  function createModalOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    return overlay;
  }

  /**
   * Creates a shared modal card element.
   *
   * @returns {HTMLDivElement} Modal card.
   */
  function createModalCard() {
    const modal = document.createElement("div");
    modal.className = "modal";
    return modal;
  }

  /**
   * Creates the shared scrollable modal body container.
   *
   * @returns {HTMLDivElement} Modal body.
   */
  function createModalBody() {
    const body = document.createElement("div");
    body.className = "modal-body";
    return body;
  }

  /**
   * Creates a modal title element.
   *
   * @param {string} text - Modal title.
   * @returns {HTMLDivElement} Title element.
   */
  function createModalTitle(text) {
    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = text;
    return title;
  }

  /**
   * Creates a modal subtitle element.
   *
   * @param {string} text - Subtitle text.
   * @returns {HTMLDivElement} Subtitle element.
   */
  function createModalSubtitle(text) {
    const subtitle = document.createElement("div");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = text;
    return subtitle;
  }

  /**
   * Creates an input field wrapped in the app's standard form-group markup.
   *
   * @param {string} label - Field label.
   * @param {string} type - Input type.
   * @param {string} value - Initial field value.
   * @param {{placeholder?: string}} [options] - Optional input configuration.
   * @returns {{group: HTMLDivElement, input: HTMLInputElement}} Wrapped field references.
   */
  function createInputGroup(label, type, value, options = {}) {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelElement = document.createElement("label");
    labelElement.className = "form-label";
    labelElement.textContent = label;

    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    input.placeholder = options.placeholder || "";

    group.append(labelElement, input);
    return { group, input };
  }

  /**
   * Creates a Minecraft-version input with suggestions while still allowing manual values.
   *
   * @param {string} label - Visible field label.
   * @param {string} value - Initial version value.
   * @param {{autoDefault?: boolean}} [options] - Optional version-input behavior.
   * @returns {{group: HTMLDivElement, getValue: () => string}} Wrapped field references.
   */
  function createMinecraftVersionGroup(label, value, options = {}) {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelElement = document.createElement("label");
    labelElement.className = "form-label";
    labelElement.textContent = label;

    const input = document.createElement("input");
    const initialValue = String(value || getLatestMinecraftVersion());
    input.type = "text";
    input.value = initialValue;
    input.placeholder = getLatestMinecraftVersion();
    input.dataset.autoDefault = options.autoDefault ? "true" : "false";
    input.dataset.autoDefaultValue = initialValue;

    const listId = `mc-version-options-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    input.setAttribute("list", listId);

    const datalist = document.createElement("datalist");
    datalist.id = listId;
    renderMinecraftVersionOptions(datalist);
    void hydrateMinecraftVersions(datalist, input);

    group.append(labelElement, input, datalist);
    return {
      group,
      getValue() {
        return input.value.trim();
      },
    };
  }

  /**
   * Creates a custom-styled select group using the shared dropdown styling.
   *
   * @param {string} label - Visible field label.
   * @param {Array<string>} options - Selectable values.
   * @param {string} currentValue - Initial value.
   * @param {(value:string) => string} [formatLabel] - Optional label formatter.
   * @returns {{group: HTMLDivElement, getValue: () => string}} Wrapped field references.
   */
  function createSelectGroup(label, options, currentValue, formatLabel) {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelElement = document.createElement("label");
    labelElement.className = "form-label";
    labelElement.textContent = label;

    const select = document.createElement("div");
    select.className = "filter-select";

    const trigger = document.createElement("button");
    trigger.className = "filter-trigger";
    trigger.type = "button";

    const valueElement = document.createElement("span");
    valueElement.className = "filter-trigger-value";

    const caret = document.createElement("span");
    caret.className = "filter-trigger-caret";
    caret.textContent = "\u25BE";

    trigger.append(valueElement, caret);

    const menu = document.createElement("div");
    menu.className = "filter-menu";

    const state = {
      value: currentValue,
    };
    let closeTimer = 0;

    /**
     * Closes the select menu.
     */
    function closeMenu() {
      if (!select.classList.contains("is-open")) {
        return;
      }

      select.classList.remove("is-open");
      select.classList.add("is-closing");
      menu.classList.add("closing");
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        select.classList.remove("is-closing");
        menu.classList.remove("closing");
      }, 100);
    }

    /**
     * Closes the menu when clicking outside.
     *
     * @param {MouseEvent} event - Pointer event.
     */
    function handleOutsideClick(event) {
      if (!select.contains(event.target)) {
        closeMenu();
      }
    }

    /**
     * Closes the menu on Escape.
     *
     * @param {KeyboardEvent} event - Keyboard event.
     */
    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    /**
     * Re-renders the selected label and option states.
     */
    function refreshOptions() {
      valueElement.textContent = formatLabel ? formatLabel(state.value) : state.value;
      Array.from(menu.children).forEach((child) => {
        child.classList.toggle("active", child.dataset.value === state.value);
      });
    }

    options.forEach((optionValue) => {
      const option = document.createElement("button");
      option.className = "filter-option";
      option.type = "button";
      option.dataset.value = optionValue;
      option.textContent = formatLabel ? formatLabel(optionValue) : optionValue;
      option.addEventListener("click", () => {
        state.value = optionValue;
        refreshOptions();
        closeMenu();
      });
      menu.appendChild(option);
    });

    refreshOptions();
    trigger.addEventListener("click", () => {
      if (select.classList.contains("is-open")) {
        closeMenu();
        return;
      }

      window.clearTimeout(closeTimer);
      select.classList.remove("is-closing");
      menu.classList.remove("closing");
      select.classList.add("is-open");
      window.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("keydown", handleEscape);
    });

    select.append(trigger, menu);
    group.append(labelElement, select);

    return {
      group,
      getValue() {
        return state.value;
      },
    };
  }

  /**
   * Refreshes one datalist with the currently cached Minecraft-version suggestions.
   *
   * @param {HTMLDataListElement} datalist - Target datalist.
   */
  function renderMinecraftVersionOptions(datalist) {
    datalist.replaceChildren();
    getSortedMinecraftVersions(cachedMinecraftVersions).forEach((version) => {
      const option = document.createElement("option");
      option.value = version;
      datalist.appendChild(option);
    });
  }

  /**
   * Loads more Minecraft versions from the Modrinth tag list and merges them into local suggestions.
   *
   * @param {HTMLDataListElement} datalist - Target datalist to refresh.
   * @param {HTMLInputElement} [input] - Optional linked input to keep on the newest default.
   */
  async function hydrateMinecraftVersions(datalist, input) {
    if (typeof getGameVersions !== "function") {
      return;
    }

    try {
      const fetchedVersions = await getGameVersions();
      if (!Array.isArray(fetchedVersions) || fetchedVersions.length === 0) {
        return;
      }

      const previousLatest = getLatestMinecraftVersion();
      cachedMinecraftVersions = getSortedMinecraftVersions([...fetchedVersions, ...cachedMinecraftVersions]);
      renderMinecraftVersionOptions(datalist);
      const latestVersion = getLatestMinecraftVersion();
      if (
        input instanceof HTMLInputElement
        && input.dataset.autoDefault === "true"
        && (!input.value.trim() || input.value.trim() === input.dataset.autoDefaultValue || input.value.trim() === previousLatest)
      ) {
        input.value = latestVersion;
        input.placeholder = latestVersion;
        input.dataset.autoDefaultValue = latestVersion;
      } else if (input instanceof HTMLInputElement) {
        input.placeholder = latestVersion;
      }
    } catch (error) {
      // Keep the local fallback list when Modrinth tags are unavailable.
    }
  }

  /**
   * Returns Minecraft versions sorted from newest to oldest.
   *
   * @param {Array<string>} versions - Raw version list.
   * @returns {Array<string>} Sorted and deduplicated versions.
   */
  function getSortedMinecraftVersions(versions) {
    return Array.from(new Set((Array.isArray(versions) ? versions : []).filter(Boolean)))
      .sort(compareMinecraftVersionsDesc);
  }

  /**
   * Compares two stable release version labels in descending order.
   *
   * @param {string} left - Left version.
   * @param {string} right - Right version.
   * @returns {number} Sort order.
   */
  function compareMinecraftVersionsDesc(left, right) {
    const leftParts = String(left || "").split(".").map((part) => Number.parseInt(part, 10) || 0);
    const rightParts = String(right || "").split(".").map((part) => Number.parseInt(part, 10) || 0);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
      const difference = (rightParts[index] || 0) - (leftParts[index] || 0);
      if (difference !== 0) {
        return difference;
      }
    }

    return 0;
  }

  /**
   * Returns the newest known Minecraft version for profile defaults.
   *
   * @returns {string} Latest known version label.
   */
  function getLatestMinecraftVersion() {
    return getSortedMinecraftVersions(cachedMinecraftVersions)[0] || DEFAULT_MC_VERSION;
  }

  /**
   * Creates a standard button with optional modifier class.
   *
   * @param {string} text - Button text.
   * @param {string} [modifier] - Optional modifier class name.
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
   * Creates the footer action row used by sidebar modals.
   *
   * @returns {HTMLDivElement} Action row element.
   */
  function createActionRow() {
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    return actions;
  }

  /**
   * Creates a loader badge element using the shared badge styles.
   *
   * @param {string} loader - Profile loader.
   * @returns {HTMLSpanElement} Badge element.
   */
  function createLoaderBadge(loader) {
    const badge = document.createElement("span");
    const safeLoader = LOADERS.includes(loader) ? loader : "fabric";
    const loaderClass = safeLoader === "neoforge" ? "neo" : safeLoader;
    badge.className = `badge ${loaderClass}`;
    badge.textContent = safeLoader === "neoforge" ? "NeoForge" : capitalize(safeLoader);
    return badge;
  }

  /**
   * Creates a Minecraft version badge element.
   *
   * @param {string} version - Minecraft version label.
   * @returns {HTMLSpanElement} Badge element.
   */
  function createVersionBadge(version) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = version || "Unknown";
    return badge;
  }

  /**
   * Capitalizes the first letter of a loader label.
   *
   * @param {string} value - Loader label.
   * @returns {string} Capitalized label.
   */
  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * Counts all starred items across every saved profile.
   *
   * @returns {number} Starred item count.
   */
  function countStarredItems() {
    const profiles = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];
    return profiles.reduce((total, profile) => {
      return total
        + profile.mods.filter((item) => item.starred).length
        + profile.resourcePacks.filter((item) => item.starred).length
        + profile.shaders.filter((item) => item.starred).length;
    }, 0);
  }

  /**
   * Creates shared button content with an icon span that can be animated independently.
   *
   * @param {string} icon - Visible icon text.
   * @param {string} label - Visible label text.
   * @param {string} iconClass - Extra icon class.
   * @returns {HTMLSpanElement} Wrapper.
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
   * Creates a single animatable icon wrapper for icon-only buttons.
   *
   * @param {string} icon - Visible icon.
   * @param {string} iconClass - Extra icon class.
   * @returns {HTMLSpanElement} Icon wrapper.
   */
  function createIconOnlyContent(icon, iconClass) {
    const iconElement = document.createElement("span");
    iconElement.className = iconClass ? `btn-icon ${iconClass}` : "btn-icon";
    iconElement.textContent = icon;
    return iconElement;
  }

  Object.assign(namespace, {
    renderSidebar,
    renderProfileItem,
    showNewProfileModal,
    showDuplicateModal,
    showProfileSettingsModal,
    closeSidebarOverlays,
  });
})();
