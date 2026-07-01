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
    clearProfiles,
    duplicateProfile,
    updateProfile,
    updateAppSettings,
    isButtonVisible,
  } = namespace;

  const PROFILE_LIST_ID = "profile-list";
  const MODAL_ROOT_ID = "modal-root";
  const CONTEXT_ROOT_ID = "context-menu-root";
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
  const SCROLL_DOWN_CONTROL_ID = "scroll-down-control";
  const SCROLL_DOWN_REVEAL_THRESHOLD = 72;
  const SCROLL_DOWN_NEAR_BOTTOM_THRESHOLD = 96;
  const SCROLL_DOWN_MIN_DISTANCE = 140;
  const SCROLL_DOWN_REVEAL_DELAY_MS = 500;
  const scrollDownControlState = {
    button: null,
    target: null,
    baselineScrollTop: 0,
    hasUserScrolled: false,
    scrollEventSeen: false,
    smartRevealReady: false,
    revealTimerId: null,
    hideTimerId: null,
    renderedVisible: false,
    hiding: false,
    observer: null,
    resizeHandler: null,
    scrollHandler: null,
    contextMenuCloseTimerId: null,
    syncQueued: false,
    initialized: false,
  };
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

    const clearButton = document.createElement("button");
    clearButton.className = "btn btn-danger btn-small";
    clearButton.type = "button";
    clearButton.appendChild(createIconLabelContent("🗑", translate("clearProfiles", "Clear profiles"), "btn-icon-trash"));
    clearButton.disabled = profiles.length === 0;
    clearButton.addEventListener("click", showClearProfilesConfirmModal);

    if (typeof isButtonVisible !== "function" || isButtonVisible("clearProfiles")) {
      orderBar.appendChild(clearButton);
    }
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
    settingsButton.setAttribute("aria-label", `${translate("settings", "Settings")} ${profile.name}`);
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
    count.textContent = `${countProfileItems(profile)} ${translate("items", "items")}`;

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
    const addonDefaults = typeof namespace.getAddonProfileDefaults === "function"
      ? namespace.getAddonProfileDefaults()
      : {};
    showProfileFormModal({
      title: translate("newProfileModalTitle", "New profile"),
      submitLabel: translate("saveProfile", "Save profile"),
      initialValues: {
        name: addonDefaults.name || "",
        mcVersion: addonDefaults.mcVersion || getLatestMinecraftVersion(),
        loader: addonDefaults.loader || "fabric",
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

    const title = createModalTitle(translate("profileSettings", "Profile settings"));
    const subtitle = createModalSubtitle(translate("profileSettingsBody", "Update the name, Minecraft version, and loader for this profile."));

    const nameGroup = createInputGroup(translate("profileName", "Profile name"), "text", profile.name);
    const versionGroup = createMinecraftVersionGroup(translate("minecraftVersion", "Minecraft version"), profile.mcVersion || getLatestMinecraftVersion());
    const loaderGroup = createSelectGroup(translate("loader", "Loader"), LOADERS, profile.loader, (loader) => capitalize(loader === "neoforge" ? "NeoForge" : loader));

    const secondaryActions = document.createElement("div");
    secondaryActions.className = "profile-settings-actions";

    const duplicateButton = createButton(translate("duplicateProfile", "Duplicate profile"));
    duplicateButton.addEventListener("click", () => {
      showDuplicateModal(profileId);
      closeSidebarOverlays();
    });

    const deleteButton = createButton(translate("deleteProfile", "Delete profile"), "btn-danger");
    deleteButton.addEventListener("click", () => {
      showDeleteConfirmModal(profileId, profile.name);
    });

    secondaryActions.append(duplicateButton, deleteButton);

    const actions = createActionRow();
    const cancelButton = createButton(translate("cancel", "Cancel"));
    const saveButton = createButton(translate("saveProfile", "Save profile"), "btn-primary");
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
    const addonTemplates = typeof namespace.getAddonProfileTemplates === "function"
      ? namespace.getAddonProfileTemplates()
      : [];
    const overlay = createModalOverlay();
    const modal = createModalCard();
    modal.classList.add("modal-profile-form");
    modal.dataset.addonTemplateCount = String(addonTemplates.length);
    const body = createModalBody();
    const title = createModalTitle(config.title);
    const subtitle = createModalSubtitle(translate("createProfileModalBody", "Create a profile for a specific Minecraft setup."));
    const nameGroup = createInputGroup(translate("profileName", "Profile name"), "text", config.initialValues.name, {
      placeholder: config.defaultName || DEFAULT_PROFILE_NAME,
    });
    const versionGroup = createMinecraftVersionGroup(translate("minecraftVersion", "Minecraft version"), config.initialValues.mcVersion || getLatestMinecraftVersion(), {
      autoDefault: !config.initialValues.mcVersion,
    });
    const loaderGroup = createSelectGroup(translate("loader", "Loader"), LOADERS, config.initialValues.loader, (loader) => capitalize(loader === "neoforge" ? "NeoForge" : loader));

    const actions = createActionRow();
    const cancelButton = createButton(translate("cancel", "Cancel"));
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
    const title = createModalTitle(translate("deleteProfileConfirmTitle", "Delete profile?"));
    const subtitle = createModalSubtitle(
      translate("deleteProfileConfirmBody", "Are you sure you want to delete '{name}'? This cannot be undone.")
        .replace("{name}", profileName)
    );
    const actions = createActionRow();
    const cancelButton = createButton(translate("cancel", "Cancel"));
    const deleteButton = createButton(translate("deleteProfile", "Delete profile"), "btn-danger");
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
   * Opens a confirmation modal for clearing all profiles.
   */
  function showClearProfilesConfirmModal() {
    if (AppState.activeProfileId === FAVORITES_PROFILE_ID) {
      setActiveProfile(null);
    }

    const overlay = createModalOverlay();
    const modal = createModalCard();
    const body = createModalBody();
    const title = createModalTitle(translate("clearProfilesTitle", "Clear profiles?"));
    const subtitle = createModalSubtitle(
      translate("clearProfilesBody", "This removes every profile from PackTracker. This cannot be undone.")
    );
    const actions = createActionRow();
    const cancelButton = createButton(translate("cancel", "Cancel"));
    const clearButton = createButton(translate("clearProfiles", "Clear profiles"), "btn-danger");
    cancelButton.addEventListener("click", closeSidebarOverlays);
    clearButton.addEventListener("click", () => {
      if (typeof clearProfiles === "function") {
        clearProfiles();
      }
      closeSidebarOverlays();
      setActiveView("home");
    });
    actions.append(cancelButton, clearButton);
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
    input.maxLength = options.maxLength || resolveProfileInputMaxLength(label);

    group.append(labelElement, input);
    attachCharacterCounter(group, input);
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
    input.maxLength = 16;
    input.dataset.autoDefault = options.autoDefault ? "true" : "false";
    input.dataset.autoDefaultValue = initialValue;

    const listId = `mc-version-options-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    input.setAttribute("list", listId);

    const datalist = document.createElement("datalist");
    datalist.id = listId;
    renderMinecraftVersionOptions(datalist);
    void hydrateMinecraftVersions(datalist, input);

    group.append(labelElement, input, datalist);
    attachCharacterCounter(group, input);
    return {
      group,
      getValue() {
        return input.value.trim();
      },
    };
  }

  /**
   * Adds a live character counter to a sidebar form field.
   *
   * @param {HTMLElement} group - Field group.
   * @param {HTMLInputElement} input - Input element.
   */
  function attachCharacterCounter(group, input) {
    if (!input.maxLength || input.maxLength < 0) {
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "field-counter-wrap";
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
   * Chooses limits for profile form text fields.
   *
   * @param {string} label - Field label.
   * @returns {number} Maximum character count.
   */
  function resolveProfileInputMaxLength(label) {
    const normalized = String(label || "").toLowerCase();
    if (normalized.includes("profile name")) {
      return 48;
    }
    if (normalized.includes("version")) {
      return 16;
    }
    return 80;
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
      return total + countProfileItems(profile, true);
    }, 0);
  }

  /**
   * Counts tracked items in one profile, optionally only starred entries.
   *
   * @param {object} profile - Profile to inspect.
   * @param {boolean} starredOnly - Limit the count to starred items.
   * @returns {number} Matching tracked item total.
   */
  function countProfileItems(profile, starredOnly = false) {
    const filterItems = (items) => {
      if (!Array.isArray(items)) {
        return 0;
      }
      return starredOnly ? items.filter((item) => item.starred).length : items.length;
    };

    return filterItems(profile?.mods)
      + filterItems(profile?.resourcePacks)
      + filterItems(profile?.shaders);
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

  /**
   * Synchronizes the floating scroll-to-bottom control with the active page or modal.
   *
   * @returns {void}
   */
  function syncScrollDownButton(resetBaseline = false) {
    if (!scrollDownControlState.initialized) {
      initializeScrollDownButtonManager();
    }
    if (resetBaseline && scrollDownControlState.target) {
      scrollDownControlState.baselineScrollTop = scrollDownControlState.target.scrollTop;
      scrollDownControlState.hasUserScrolled = false;
      scrollDownControlState.scrollEventSeen = false;
      scrollDownControlState.smartRevealReady = false;
      clearScrollDownRevealTimer();
      clearScrollDownHideTimer();
      scrollDownControlState.renderedVisible = false;
      scrollDownControlState.hiding = false;
    }
    scheduleScrollDownButtonSync();
  }

  function initializeScrollDownButtonManager() {
    if (scrollDownControlState.initialized || typeof document === "undefined") {
      return;
    }

    scrollDownControlState.initialized = true;
    const existingButtons = Array.from(document.querySelectorAll(`#${SCROLL_DOWN_CONTROL_ID}`));
    scrollDownControlState.button = existingButtons[0] || createScrollDownButton();
    existingButtons.slice(1).forEach((button) => button.remove());
    if (!scrollDownControlState.button.isConnected) {
      document.body.appendChild(scrollDownControlState.button);
    }

    scrollDownControlState.resizeHandler = () => {
      scheduleScrollDownButtonSync();
    };
    window.addEventListener("resize", scrollDownControlState.resizeHandler);

    if (typeof MutationObserver === "function") {
      scrollDownControlState.observer = new MutationObserver(() => {
        scheduleScrollDownButtonSync();
      });
      scrollDownControlState.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    scrollDownControlState.button.addEventListener("click", () => {
      const target = scrollDownControlState.target;
      if (!target) {
        return;
      }

      const behavior = shouldReduceMotion() ? "auto" : "smooth";
      target.scrollTo({
        top: target.scrollHeight,
        behavior,
      });
    });

    scrollDownControlState.button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openScrollDownContextMenu(event.clientX, event.clientY);
    });

    scheduleScrollDownButtonSync();
  }

  function scheduleScrollDownButtonSync() {
    if (scrollDownControlState.syncQueued) {
      return;
    }

    scrollDownControlState.syncQueued = true;
    window.requestAnimationFrame(() => {
      scrollDownControlState.syncQueued = false;
      updateScrollDownButton();
    });
  }

  function updateScrollDownButton() {
    const button = scrollDownControlState.button;
    if (!button) {
      return;
    }

    const mode = normalizeScrollDownButtonMode(AppState.settings?.scrollDownButton);
    const target = mode === "never" ? null : findScrollDownTarget();
    const host = target ? getScrollDownHostElement(target) : document.body;

    if (button.parentElement !== host) {
      host.appendChild(button);
    }
    button.classList.toggle("is-embedded", host !== document.body);

    if (target !== scrollDownControlState.target) {
      if (scrollDownControlState.target) {
        scrollDownControlState.target.removeEventListener("scroll", scrollDownControlState.scrollHandler);
      }
      scrollDownControlState.target = target;
      scrollDownControlState.baselineScrollTop = target ? target.scrollTop : 0;
      scrollDownControlState.hasUserScrolled = false;
      scrollDownControlState.scrollEventSeen = false;
      scrollDownControlState.smartRevealReady = false;
      clearScrollDownRevealTimer();
      clearScrollDownHideTimer();
      scrollDownControlState.renderedVisible = false;
      scrollDownControlState.hiding = false;
      if (target) {
        scrollDownControlState.scrollHandler = () => {
          scrollDownControlState.scrollEventSeen = true;
          scrollDownControlState.hasUserScrolled = true;
          scheduleScrollDownButtonSync();
        };
        target.addEventListener("scroll", scrollDownControlState.scrollHandler, { passive: true });
      }
    }

    const visible = shouldShowScrollDownButton(target, mode);
    button.setAttribute("aria-hidden", visible ? "false" : "true");
    button.tabIndex = visible ? 0 : -1;
    syncScrollDownVisibility(button, visible);
    button.setAttribute("aria-label", translate("scrollToBottom", "Scroll to bottom"));
    button.title = translate("scrollToBottom", "Scroll to bottom");
    if (visible && target && host === document.body) {
      const anchor = getScrollDownAnchorElement(target);
      const rect = anchor.getBoundingClientRect();
      const centerX = clamp(
        rect.left + (rect.width / 2),
        28,
        Math.max(28, window.innerWidth - 28)
      );
      button.style.setProperty("--scroll-down-left", `${centerX}px`);
    }
  }

  function shouldShowScrollDownButton(target, mode) {
    if (!target || mode === "never") {
      clearScrollDownRevealTimer();
      return false;
    }

    if (!isScrollableElement(target)) {
      clearScrollDownRevealTimer();
      return false;
    }

    if (mode === "always") {
      clearScrollDownRevealTimer();
      return true;
    }

    if (!scrollDownControlState.scrollEventSeen || !scrollDownControlState.hasUserScrolled) {
      clearScrollDownRevealTimer();
      return false;
    }

    const scrolledPastBaseline = Math.abs(target.scrollTop - scrollDownControlState.baselineScrollTop) >= SCROLL_DOWN_REVEAL_THRESHOLD;
    const nearTop = target.scrollTop <= SCROLL_DOWN_REVEAL_THRESHOLD;
    const nearBottom = target.scrollHeight - target.clientHeight - target.scrollTop <= SCROLL_DOWN_NEAR_BOTTOM_THRESHOLD;
    const eligible = (target.scrollHeight - target.clientHeight) > SCROLL_DOWN_MIN_DISTANCE
      && scrolledPastBaseline
      && !nearTop
      && !nearBottom;

    if (!eligible) {
      scrollDownControlState.smartRevealReady = false;
      clearScrollDownRevealTimer();
      return false;
    }

    if (!scrollDownControlState.smartRevealReady) {
      scheduleScrollDownRevealTimer();
      return false;
    }

    return true;
  }

  function findScrollDownTarget() {
    const activeSettingsOverlay = document.querySelector("#modal-root .settings-overlay");
    if (activeSettingsOverlay) {
      return null;
    }

    const modalCandidates = Array.from(document.querySelectorAll("#modal-root .modal-body, #modal-root .modal"));
    const visibleModalTarget = [...modalCandidates].reverse().find((element) => isScrollableElement(element));
    if (visibleModalTarget) {
      return visibleModalTarget;
    }

    const main = document.getElementById("main");
    return isScrollableElement(main) ? main : null;
  }

  function getScrollDownHostElement(target) {
    if (!(target instanceof HTMLElement)) {
      return document.body;
    }

    const modalBody = target.closest(".modal-body");
    if (modalBody instanceof HTMLElement) {
      return modalBody;
    }

    const modal = target.closest(".modal");
    if (modal instanceof HTMLElement) {
      return modal;
    }

    return document.body;
  }

  function getScrollDownAnchorElement(target) {
    if (!(target instanceof HTMLElement)) {
      return document.body;
    }

    return target.classList.contains("modal")
      ? target
      : target.closest(".modal") || target.closest(".modal-overlay") || target;
  }

  function isScrollableElement(element) {
    if (!element || !element.isConnected) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return element.scrollHeight - element.clientHeight > 24;
  }

  function normalizeScrollDownButtonMode(value) {
    const safeValue = String(value || "smart").trim().toLowerCase();
    return ["always", "smart", "never"].includes(safeValue) ? safeValue : "smart";
  }

  function syncScrollDownVisibility(button, visible) {
    if (!button) {
      return;
    }

    if (visible) {
      clearScrollDownHideTimer();
      scrollDownControlState.hiding = false;
      if (!scrollDownControlState.renderedVisible) {
        button.classList.remove("is-hiding");
        button.classList.add("is-visible");
        scrollDownControlState.renderedVisible = true;
      }
      return;
    }

    if (!scrollDownControlState.renderedVisible && !scrollDownControlState.hiding) {
      button.classList.remove("is-visible", "is-hiding");
      return;
    }

    if (scrollDownControlState.hiding) {
      return;
    }

    button.classList.remove("is-visible");
    button.classList.add("is-hiding");
    scrollDownControlState.hiding = true;
    clearScrollDownHideTimer();
    if (typeof window !== "undefined") {
      scrollDownControlState.hideTimerId = window.setTimeout(() => {
        scrollDownControlState.hideTimerId = null;
        scrollDownControlState.hiding = false;
        scrollDownControlState.renderedVisible = false;
        button.classList.remove("is-hiding");
      }, 220);
    }
  }

  function scheduleScrollDownRevealTimer() {
    if (scrollDownControlState.revealTimerId || typeof window === "undefined") {
      return;
    }

    scrollDownControlState.revealTimerId = window.setTimeout(() => {
      scrollDownControlState.revealTimerId = null;
      scrollDownControlState.smartRevealReady = true;
      scheduleScrollDownButtonSync();
    }, SCROLL_DOWN_REVEAL_DELAY_MS);
  }

  function clearScrollDownRevealTimer() {
    if (!scrollDownControlState.revealTimerId || typeof window === "undefined") {
      return;
    }

    window.clearTimeout(scrollDownControlState.revealTimerId);
    scrollDownControlState.revealTimerId = null;
  }

  function clearScrollDownHideTimer() {
    if (!scrollDownControlState.hideTimerId || typeof window === "undefined") {
      return;
    }

    window.clearTimeout(scrollDownControlState.hideTimerId);
    scrollDownControlState.hideTimerId = null;
  }

  function shouldReduceMotion() {
    return document.documentElement.dataset.reduceMotion === "true";
  }

  function createScrollDownButton() {
    const button = document.createElement("button");
    button.id = SCROLL_DOWN_CONTROL_ID;
    button.className = "icon-btn scroll-down-control";
    button.type = "button";
    const icon = document.createElement("img");
    icon.className = "scroll-down-icon";
    icon.src = "./assets/arrow down.png?v=20260518-2";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    button.tabIndex = -1;
    return button;
  }

  function openScrollDownContextMenu(x, y) {
    const root = getContextMenuRoot();
    if (!root) {
      return;
    }

    closeScrollDownContextMenu(root);

    const target = scrollDownControlState.target || findScrollDownTarget();
    const anchor = scrollDownControlState.button?.getBoundingClientRect?.();
    const anchorRect = anchor || { left: x, top: y, width: 36, height: 36 };
    const finalWidth = 232;
    const finalHeight = 160;
    const finalLeft = clamp(anchorRect.left, 12, Math.max(12, window.innerWidth - finalWidth - 12));
    const finalTop = clamp(anchorRect.top - finalHeight - 10, 12, Math.max(12, window.innerHeight - finalHeight - 12));
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = `${finalLeft}px`;
    menu.style.top = `${finalTop}px`;

    menu.append(
      createScrollDownMenuItem("To the top", () => {
        if (target) {
          target.scrollTo({
            top: 0,
            behavior: shouldReduceMotion() ? "auto" : "smooth",
          });
        }
        closeScrollDownContextMenu(root);
      }),
      createScrollDownMenuItem("To the bottom", () => {
        if (target) {
          target.scrollTo({
            top: target.scrollHeight,
            behavior: shouldReduceMotion() ? "auto" : "smooth",
          });
        }
        closeScrollDownContextMenu(root);
      }),
      createScrollDownMenuItem("Disable", () => {
        if (typeof updateAppSettings === "function") {
          AppState.settings = updateAppSettings({ scrollDownButton: "never" });
        } else {
          AppState.settings = {
            ...(AppState.settings || {}),
            scrollDownButton: "never",
          };
        }
        if (typeof syncScrollDownButton === "function") {
          syncScrollDownButton(true);
        }
        closeScrollDownContextMenu(root);
      }, true)
    );

    root.appendChild(menu);
    document.addEventListener("click", handleScrollDownContextMenuDocumentClick);
    root.addEventListener("keydown", handleScrollDownContextMenuKeydown);
    window.addEventListener("resize", handleScrollDownContextMenuOutsideClick, { once: true });
    window.addEventListener("scroll", handleScrollDownContextMenuOutsideClick, { once: true, capture: true });
  }

  function getContextMenuRoot() {
    return document.getElementById(CONTEXT_ROOT_ID);
  }

  function closeScrollDownContextMenu(root = getContextMenuRoot()) {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    if (scrollDownControlState.contextMenuCloseTimerId) {
      window.clearTimeout(scrollDownControlState.contextMenuCloseTimerId);
      scrollDownControlState.contextMenuCloseTimerId = null;
    }

    const menu = root.querySelector(".context-menu");
    if (!(menu instanceof HTMLElement)) {
      root.replaceChildren();
      document.removeEventListener("click", handleScrollDownContextMenuDocumentClick);
      root.removeEventListener("keydown", handleScrollDownContextMenuKeydown);
      return;
    }

    if (menu.classList.contains("closing")) {
      return;
    }

    menu.classList.add("closing");
    scrollDownControlState.contextMenuCloseTimerId = window.setTimeout(() => {
      scrollDownControlState.contextMenuCloseTimerId = null;
      if (menu.parentElement === root) {
        root.replaceChildren();
      }
      document.removeEventListener("click", handleScrollDownContextMenuDocumentClick);
      root.removeEventListener("keydown", handleScrollDownContextMenuKeydown);
    }, 120);
  }

  function handleScrollDownContextMenuDocumentClick(event) {
    const root = getContextMenuRoot();
    if (!root) {
      return;
    }

    const menu = root.querySelector(".context-menu");
    if (!(menu instanceof HTMLElement)) {
      closeScrollDownContextMenu(root);
      return;
    }

    if (menu.contains(event.target)) {
      return;
    }

    closeScrollDownContextMenu(root);
  }

  function handleScrollDownContextMenuOutsideClick(event) {
    const root = getContextMenuRoot();
    if (!root) {
      return;
    }

    const menu = root.querySelector(".context-menu");
    if (menu && !menu.contains(event.target)) {
      closeScrollDownContextMenu(root);
    }
  }

  function handleScrollDownContextMenuKeydown(event) {
    if (event.key === "Escape") {
      closeScrollDownContextMenu();
    }
  }

  function createScrollDownMenuItem(label, onClick, danger = false) {
    const item = document.createElement("button");
    item.className = danger ? "context-menu-item danger" : "context-menu-item";
    item.type = "button";
    item.textContent = label;
    item.addEventListener("click", onClick);
    return item;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  Object.assign(namespace, {
    renderSidebar,
    renderProfileItem,
    showNewProfileModal,
    showDuplicateModal,
    showProfileSettingsModal,
    showClearProfilesConfirmModal,
    closeSidebarOverlays,
    syncScrollDownButton,
  });
})();
