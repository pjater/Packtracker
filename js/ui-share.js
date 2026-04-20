(function attachShareModule() {
  const namespace = window.PackTracker;
  const {
    AppState,
    downloadFile,
    downloadCategoryAsZip,
    importSharedProfile,
    setActiveProfile,
    setActiveView,
  } = namespace;

  const SHARE_VIEW_ID = "view-share";
  const MODAL_ROOT_ID = "modal-root";
  const SHARE_TAB_DEFINITIONS = [
    { key: "mods", label: "Mods" },
    { key: "resourcePacks", label: "Resource Packs" },
    { key: "shaders", label: "Shaders" },
  ];

  const shareState = {
    profile: null,
    activeTab: "mods",
  };

  /**
   * Opens the read-only shared-profile page.
   *
   * @param {object} sharedProfile - Parsed shared profile payload.
   */
  function openShareDownloadView(sharedProfile) {
    shareState.profile = normalizeSharedProfileForView(sharedProfile);
    shareState.activeTab = "mods";
    setActiveView("share");
    renderShareView();
  }

  /**
   * Clears the temporary shared-profile page state.
   */
  function closeShareDownloadView() {
    shareState.profile = null;
    shareState.activeTab = "mods";
  }

  /**
   * Renders the dedicated read-only share view.
   */
  function renderShareView() {
    const root = document.getElementById(SHARE_VIEW_ID);
    if (!root) {
      return;
    }

    root.replaceChildren();
    if (AppState.activeView !== "share" || !shareState.profile) {
      return;
    }

    const profile = shareState.profile;
    const wrapper = document.createElement("div");
    wrapper.className = "share-view";

    const header = document.createElement("div");
    header.className = "profile-header share-header";

    const heading = document.createElement("div");
    heading.className = "share-header-top";

    const titleWrap = document.createElement("div");
    titleWrap.className = "share-title-wrap";

    const title = document.createElement("div");
    title.className = "profile-title";
    title.textContent = profile.name;

    const meta = document.createElement("div");
    meta.className = "profile-heading";
    meta.append(
      createMetaBadge("badge-source", "Shared profile"),
      createMetaBadge("badge-version", profile.mcVersion || "Unknown"),
      createLoaderBadge(profile.loader || "vanilla")
    );

    const subtitle = document.createElement("div");
    subtitle.className = "share-subtitle";
    subtitle.textContent = `${profile.mods.length} mods • ${profile.resourcePacks.length} resource packs • ${profile.shaders.length} shaders`;

    titleWrap.append(title, meta, subtitle);

    const actions = document.createElement("div");
    actions.className = "profile-header-actions";

    const backButton = createButton("Back to app");
    backButton.addEventListener("click", () => {
      closeShareDownloadView();
      setActiveView("home");
    });

    const zipButton = createButton("⬇ Download as ZIP", "btn-primary");
    zipButton.addEventListener("click", async () => {
      try {
        const tabKey = shareState.activeTab;
        const folderName = resolveFolderName(tabKey);
        await downloadCategoryAsZip(profile[tabKey], folderName, profile.name);
      } catch (error) {
        if (typeof namespace.showToast === "function") {
          namespace.showToast(error instanceof Error ? error.message : "ZIP download failed", "danger");
        }
      }
    });

    actions.append(zipButton, backButton);
    heading.append(titleWrap, actions);
    header.appendChild(heading);

    const tabs = document.createElement("div");
    tabs.className = "tab-bar tabs";
    SHARE_TAB_DEFINITIONS.forEach((definition) => {
      const tabButton = document.createElement("button");
      tabButton.className = definition.key === shareState.activeTab ? "tab active" : "tab";
      tabButton.type = "button";
      tabButton.textContent = definition.label;
      tabButton.addEventListener("click", () => {
        shareState.activeTab = definition.key;
        renderShareView();
      });
      tabs.appendChild(tabButton);
    });

    const panel = document.createElement("div");
    panel.className = "tab-content tab-panel";

    const items = Array.isArray(profile[shareState.activeTab]) ? profile[shareState.activeTab] : [];
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-panel";
      empty.textContent = "This shared profile has no items in the current tab.";
      panel.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "share-list";
      items.forEach((item) => {
        list.appendChild(renderShareItem(item));
      });
      panel.appendChild(list);
    }

    const footer = document.createElement("div");
    footer.className = "share-footer";

    const importButton = createButton("Import to my profiles", "btn-primary");
    importButton.addEventListener("click", () => {
      const importedProfile = importSharedProfile(profile);
      closeShareDownloadView();
      setActiveProfile(importedProfile.id);
      setActiveView("home");
    });

    footer.appendChild(importButton);
    wrapper.append(header, tabs, panel, footer);
    root.appendChild(wrapper);
  }

  /**
   * Opens the share-import decision modal.
   *
   * @param {object} sharedProfile - Parsed shared profile payload.
   */
  function showShareImportModal(sharedProfile) {
    const profile = normalizeSharedProfileForView(sharedProfile);
    const root = document.getElementById(MODAL_ROOT_ID);
    if (!root) {
      return;
    }

    root.replaceChildren();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal";

    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = "Import shared profile";

    const subtitle = document.createElement("div");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = "You can import this pack into your own library or open a read-only download page first.";

    const summary = document.createElement("div");
    summary.className = "share-summary";
    summary.append(
      createSummaryRow("Profile", profile.name),
      createSummaryRow("Minecraft", profile.mcVersion || "Unknown"),
      createSummaryRow("Loader", capitalize(profile.loader || "vanilla")),
      createSummaryRow("Contents", `${profile.mods.length} mods, ${profile.resourcePacks.length} resource packs, ${profile.shaders.length} shaders`)
    );

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancelButton = createButton("Cancel");
    cancelButton.addEventListener("click", closeModal);

    const downloadOnlyButton = createButton("Download only");
    downloadOnlyButton.addEventListener("click", () => {
      closeModal();
      openShareDownloadView(profile);
    });

    const importButton = createButton("Import profile", "btn-primary");
    importButton.addEventListener("click", () => {
      const importedProfile = importSharedProfile(profile);
      closeModal();
      setActiveProfile(importedProfile.id);
      setActiveView("home");
    });

    actions.append(cancelButton, downloadOnlyButton, importButton);
    modal.append(title, subtitle, summary, actions);
    overlay.appendChild(modal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });
    root.appendChild(overlay);
  }

  /**
   * Builds one read-only item row inside the share view.
   *
   * @param {object} item - Shared item.
   * @returns {HTMLDivElement} Item row.
   */
  function renderShareItem(item) {
    const row = document.createElement("div");
    row.className = "share-item";

    const info = document.createElement("div");
    info.className = "share-item-info";

    const name = document.createElement("div");
    name.className = "share-item-name";
    name.textContent = item.name || item.slug || "Unknown item";

    const meta = document.createElement("div");
    meta.className = "share-item-meta";
    meta.textContent = [
      item.versionNumber || item.versionId || "Unknown version",
      capitalize(item.source || "manual"),
    ].filter(Boolean).join(" • ");

    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "share-item-actions";

    const downloadButton = createButton("Download");
    const fileUrl = String(item.fileUrl || "");
    if (!fileUrl) {
      downloadButton.disabled = true;
      downloadButton.textContent = "No link";
    } else {
      downloadButton.addEventListener("click", () => {
        void downloadFile(fileUrl, item.fileName || "");
      });
    }

    actions.appendChild(downloadButton);
    row.append(info, actions);
    return row;
  }

  /**
   * Normalizes the parsed share payload for the read-only view.
   *
   * @param {object} profile - Parsed shared profile.
   * @returns {object} Normalized read-only profile.
   */
  function normalizeSharedProfileForView(profile) {
    const normalized = profile || {};
    return {
      ...normalized,
      loader: String(normalized.loader || "vanilla").toLowerCase(),
      shareId: String(normalized.shareId || `share:${normalized.name || "profile"}:${normalized.mcVersion || ""}`),
      mods: Array.isArray(normalized.mods) ? normalized.mods : [],
      resourcePacks: Array.isArray(normalized.resourcePacks) ? normalized.resourcePacks : [],
      shaders: Array.isArray(normalized.shaders) ? normalized.shaders : [],
    };
  }

  /**
   * Creates a single share-summary key/value row.
   *
   * @param {string} label - Row label.
   * @param {string} value - Row value.
   * @returns {HTMLDivElement} Row element.
   */
  function createSummaryRow(label, value) {
    const row = document.createElement("div");
    row.className = "share-summary-row";

    const key = document.createElement("span");
    key.className = "share-summary-label";
    key.textContent = label;

    const text = document.createElement("span");
    text.className = "share-summary-value";
    text.textContent = value;

    row.append(key, text);
    return row;
  }

  /**
   * Maps one share tab key to the ZIP folder label.
   *
   * @param {"mods"|"resourcePacks"|"shaders"} tabKey - Active share tab.
   * @returns {string} Folder label.
   */
  function resolveFolderName(tabKey) {
    if (tabKey === "resourcePacks") {
      return "resourcepacks";
    }
    if (tabKey === "shaders") {
      return "shaders";
    }
    return "mods";
  }

  /**
   * Creates a standard button used inside share UI.
   *
   * @param {string} text - Button label.
   * @param {string} [modifier] - Optional class suffixes.
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
   * Creates one generic badge for the share header.
   *
   * @param {string} modifier - Badge modifier class.
   * @param {string} text - Badge label.
   * @returns {HTMLSpanElement} Badge element.
   */
  function createMetaBadge(modifier, text) {
    const badge = document.createElement("span");
    badge.className = `badge ${modifier}`;
    badge.textContent = text;
    return badge;
  }

  /**
   * Creates a loader badge matching the main app styles.
   *
   * @param {string} loader - Loader identifier.
   * @returns {HTMLSpanElement} Loader badge.
   */
  function createLoaderBadge(loader) {
    if (loader === "neoforge") {
      return createMetaBadge("badge-neoforge", "NeoForge");
    }
    if (loader === "forge") {
      return createMetaBadge("badge-forge", "Forge");
    }
    if (loader === "fabric") {
      return createMetaBadge("badge-fabric", "Fabric");
    }
    return createMetaBadge("badge-vanilla", "Vanilla");
  }

  /**
   * Capitalizes the first letter of a short label.
   *
   * @param {string} value - Raw label.
   * @returns {string} Capitalized label.
   */
  function capitalize(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  /**
   * Closes the shared modal root.
   */
  function closeModal() {
    const root = document.getElementById(MODAL_ROOT_ID);
    if (root) {
      if (typeof namespace.dismissRootChildren === "function") {
        namespace.dismissRootChildren(root);
      } else {
        root.replaceChildren();
      }
    }
  }

  Object.assign(namespace, {
    showShareImportModal,
    openShareDownloadView,
    closeShareDownloadView,
    renderShareView,
  });
})();
