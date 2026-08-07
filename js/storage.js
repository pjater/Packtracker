(function attachStorageModule() {
  const namespace = window.PackTracker;
  const { AppState, notifyStateChanged } = namespace;
  const LOCAL_STORAGE_KEY = "packtracker_profiles_v2";
  const LEGACY_STORAGE_KEYS = ["packtracker_profiles_v1", "packtracker_v1"];
  const SETTINGS_STORAGE_KEY = "packtracker_app_settings_v1";
  const DATA_VERSION = 2;
  const RANDOM_ID_LENGTH = 4;
  const COPY_SUFFIX = " (copy)";
  const SUPPORTED_LANGUAGES = ["en", "zh", "hi", "es", "ar"];
  const SUPPORTED_THEMES = ["dark", "light", "system"];
  const SUPPORTED_UI_STYLES = ["packtracker", "blur", "glassy"];
  const SUPPORTED_DOWNLOAD_BEHAVIORS = ["browser", "ask", "default"];
  const SUPPORTED_SCROLL_DOWN_BUTTON_MODES = ["always", "smart", "never"];
  const SUPPORTED_UPDATE_PROGRESS_DISPLAYS = ["icons", "logs"];
  const SUPPORTED_FONT_STYLES = ["default", "manrope", "poppins", "serif", "monospace"];
  const SUPPORTED_UPDATE_PROVIDER_PREFERENCES = ["auto", "modrinth", "curseforge"];
  const BUTTON_VISIBILITY_KEYS = [
    "clearProfiles",
    "addManual",
    "updateContent",
    "downloadZip",
    "clearItems",
    "shareProfile",
    "scanMinecraftFolder",
    "exportBackup",
    "importBackup",
  ];
  const BUTTON_VISIBILITY_VALUES = ["show", "hide"];
  const DEFAULT_KEYBINDS = {
    openSearch: "Ctrl+K",
    openSettings: "Ctrl+Comma",
    newProfile: "Ctrl+N",
    nextTab: "Ctrl+Tab",
    previousTab: "Ctrl+Shift+Tab",
    toggleLayoutEdit: "Ctrl+E",
    clearItems: "Ctrl+Shift+Delete",
    clearProfiles: "Ctrl+Shift+Backspace",
    toggleViewMode: "Ctrl+Shift+V",
  };

  /**
   * Loads persisted PackTracker data and normalizes the result.
   *
   * @returns {Promise<{version:number, profiles:Array<object>}>} Normalized stored data.
   */
  async function loadData() {
    try {
      return normalizeData(readLegacyLocalData());
    } catch (error) {
      console.warn("PackTracker: failed to load storage", error);
      return createEmptyData();
    }
  }

  /**
   * Loads persisted app-wide preferences from localStorage.
   *
   * @returns {object} Normalized settings payload.
   */
  function loadAppSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return createDefaultAppSettings();
      }
      return normalizeAppSettings(JSON.parse(raw));
    } catch (error) {
      console.warn("PackTracker: failed to load app settings", error);
      return createDefaultAppSettings();
    }
  }

  /**
   * Persists app-wide preferences to localStorage and state.
   *
   * @param {object} settings - Next settings snapshot.
   * @returns {object} Normalized stored settings.
   */
  function saveAppSettings(settings) {
    const normalized = normalizeAppSettings(settings);
    AppState.settings = normalized;
    cacheAppSettingsLocally(normalized);
    if (typeof namespace.updateSignedOutSnapshotCache === "function" && !AppState.auth?.signedIn) {
      namespace.updateSignedOutSnapshotCache({ settings: normalized });
    }
    if (typeof namespace.scheduleCloudSync === "function") {
      namespace.scheduleCloudSync("settings");
    }
    return normalized;
  }

  /**
   * Applies a partial patch to app settings and notifies listeners.
   *
   * @param {object} patch - Partial settings patch.
   * @returns {object} Updated settings snapshot.
   */
  function updateAppSettings(patch) {
    const nextSettings = saveAppSettings({
      ...loadAppSettings(),
      ...patch,
    });
    if (typeof notifyStateChanged === "function") {
      notifyStateChanged("settings");
    }
    return nextSettings;
  }

  /**
   * Resets app settings to defaults.
   *
   * @returns {object} Reset settings snapshot.
   */
  function resetAppSettings() {
    const current = loadAppSettings();
    const reset = saveAppSettings({
      ...createDefaultAppSettings(),
      onboardingCompleted: true,
      firstOpenedAt: Number(current.firstOpenedAt || 0) || Date.now(),
      lastOpenedAt: Number(current.lastOpenedAt || 0) || Date.now(),
      visitCount: Math.max(1, Number(current.visitCount || 0) || 1),
    });
    if (typeof notifyStateChanged === "function") {
      notifyStateChanged("settings-reset");
    }
    return reset;
  }

  /**
   * Records one app visit/open event for update prompts and onboarding logic.
   *
   * @returns {object} Updated settings snapshot.
   */
  function recordAppVisit() {
    const current = loadAppSettings();
    return saveAppSettings({
      ...current,
      visitCount: Number(current.visitCount || 0) + 1,
      lastOpenedAt: Date.now(),
      firstOpenedAt: Number(current.firstOpenedAt || 0) || Date.now(),
    });
  }

  /**
   * Persists PackTracker data through the active persistence adapter.
   *
   * @param {{version:number, profiles:Array<object>}} data - Data to store.
   * @returns {{version:number, profiles:Array<object>}} Saved data snapshot.
   */
  function saveData(data) {
    const normalized = normalizeData(data);
    if (AppState.data === data || AppState.data === null) {
      AppState.data = normalized;
    }
    persistNormalizedData(normalized);
    if (typeof namespace.updateSignedOutSnapshotCache === "function" && !AppState.auth?.signedIn) {
      namespace.updateSignedOutSnapshotCache({ data: normalized });
    }
    if (typeof namespace.scheduleCloudSync === "function") {
      namespace.scheduleCloudSync("data");
    }
    return normalized;
  }

  /**
   * Creates and stores a new profile record.
   *
   * @param {{name?:string, mcVersion?:string, loader?:string, loaderVersion?:string}} fields - User-provided profile fields.
   * @returns {object} Newly created profile.
   */
  function createProfile(fields) {
    const data = ensureAppData();
    const profile = normalizeProfile({
      id: createId(),
      name: fields?.name || "New profile",
      mcVersion: fields?.mcVersion || "1.21.1",
      loader: fields?.loader || "fabric",
      loaderVersion: fields?.loaderVersion || "",
      createdAt: Date.now(),
      mods: [],
      resourcePacks: [],
      shaders: [],
    });

    data.profiles.unshift(profile);
    persistAndNotify("create-profile", "Profile saved");
    return profile;
  }

  /**
   * Creates a deep copy of a profile and appends it to storage.
   *
   * @param {string} id - Source profile id.
   * @returns {object|null} Duplicated profile or null.
   */
  function duplicateProfile(id) {
    const data = ensureAppData();
    const source = data.profiles.find((profile) => profile.id === id);
    if (!source) {
      return null;
    }

    const duplicate = normalizeProfile({
      ...structuredClone(source),
      id: createId(),
      name: `${source.name}${COPY_SUFFIX}`,
      createdAt: Date.now(),
    });

    data.profiles.unshift(duplicate);
    persistAndNotify("duplicate-profile", "Profile duplicated");
    return duplicate;
  }

  /**
   * Deletes a profile from storage by id.
   *
   * @param {string} id - Profile identifier.
   * @returns {boolean} True when a profile was removed.
   */
  function deleteProfile(id) {
    const data = ensureAppData();
    const beforeCount = data.profiles.length;
    data.profiles = data.profiles.filter((profile) => profile.id !== id);

    if (beforeCount === data.profiles.length) {
      return false;
    }

    if (AppState.activeProfileId === id) {
      AppState.activeProfileId = data.profiles[0]?.id ?? null;
    }

    persistAndNotify("delete-profile", "Profile deleted");
    return true;
  }

  /**
   * Removes every profile from storage.
   *
   * @returns {boolean} True when at least one profile was removed.
   */
  function clearProfiles() {
    const data = ensureAppData();
    if (data.profiles.length === 0) {
      return false;
    }

    data.profiles = [];
    AppState.activeProfileId = null;
    persistAndNotify("clear-profiles", "Profiles cleared");
    return true;
  }

  /**
   * Applies a partial update to a profile.
   *
   * @param {string} id - Profile identifier.
   * @param {object} patch - Partial profile patch.
   * @returns {object|null} Updated profile or null.
   */
  function updateProfile(id, patch) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === id);
    if (!profile) {
      return null;
    }

    Object.assign(profile, normalizeProfile({ ...profile, ...patch }));
    persistAndNotify("update-profile", "Profile saved");
    return profile;
  }

  /**
   * Adds or replaces a mod entry for a profile.
   *
   * @param {string} profileId - Profile identifier.
   * @param {object} mod - Mod payload.
   * @returns {object|null} Saved mod entry or null.
   */
  function addMod(profileId, mod) {
    return upsertCollectionItem(profileId, "mods", normalizeMod(mod), "add-mod", "Mod added");
  }

  /**
   * Removes a mod from a profile.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} modId - Mod identifier.
   * @returns {boolean} True when removed.
   */
  function removeMod(profileId, modId) {
    return removeCollectionItem(profileId, "mods", modId, "remove-mod", "Mod removed");
  }

  /**
   * Updates a mod entry in place.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} modId - Mod identifier.
   * @param {object} patch - Partial mod patch.
   * @returns {object|null} Updated mod or null.
   */
  function updateMod(profileId, modId, patch) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return null;
    }

    const current = profile.mods.find((mod) => mod.id === modId);
    if (!current) {
      return null;
    }

    Object.assign(current, normalizeMod({ ...current, ...patch }));
    persistAndNotify("update-mod", "Changes saved");
    return current;
  }

  /**
   * Updates a resource-pack entry in place.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} resourcePackId - Resource pack identifier.
   * @param {object} patch - Partial resource pack patch.
   * @returns {object|null} Updated resource pack or null.
   */
  function updateResourcePack(profileId, resourcePackId, patch) {
    return updatePackLikeItem(profileId, "resourcePacks", resourcePackId, patch, "update-resource-pack", "Changes saved");
  }

  /**
   * Adds or replaces a resource pack entry on a profile.
   *
   * @param {string} profileId - Profile identifier.
   * @param {object} resourcePack - Resource pack payload.
   * @returns {object|null} Saved resource pack or null.
   */
  function addResourcePack(profileId, resourcePack) {
    return upsertCollectionItem(profileId, "resourcePacks", normalizePackLike(resourcePack, "resourcepack"), "add-resource-pack", "Resource pack added");
  }

  /**
   * Removes a resource pack by id.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} rpId - Resource pack identifier.
   * @returns {boolean} True when removed.
   */
  function removeResourcePack(profileId, rpId) {
    return removeCollectionItem(profileId, "resourcePacks", rpId, "remove-resource-pack", "Resource pack removed");
  }

  /**
   * Adds or replaces a shader entry on a profile.
   *
   * @param {string} profileId - Profile identifier.
   * @param {object} shader - Shader payload.
   * @returns {object|null} Saved shader or null.
   */
  function addShader(profileId, shader) {
    return upsertCollectionItem(profileId, "shaders", normalizePackLike(shader, "shader"), "add-shader", "Shader added");
  }

  /**
   * Removes a shader by id.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} shaderId - Shader identifier.
   * @returns {boolean} True when removed.
   */
  function removeShader(profileId, shaderId) {
    return removeCollectionItem(profileId, "shaders", shaderId, "remove-shader", "Shader removed");
  }

  /**
   * Removes every item from one profile collection.
   *
   * @param {string} profileId - Profile identifier.
   * @param {"mods"|"resourcePacks"|"shaders"} collectionKey - Target collection.
   * @returns {boolean} True when at least one item was removed.
   */
  function clearProfileCollection(profileId, collectionKey) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === profileId);
    if (!profile || !Array.isArray(profile[collectionKey]) || profile[collectionKey].length === 0) {
      return false;
    }

    profile[collectionKey] = [];
    persistAndNotify("clear-profile-items", "Items cleared");
    return true;
  }

  /**
   * Updates a shader entry in place.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} shaderId - Shader identifier.
   * @param {object} patch - Partial shader patch.
   * @returns {object|null} Updated shader or null.
   */
  function updateShader(profileId, shaderId, patch) {
    return updatePackLikeItem(profileId, "shaders", shaderId, patch, "update-shader", "Changes saved");
  }

  /**
   * Downloads the current stored data as a JSON backup.
   */
  function exportBackup(profileId) {
    const safeId = String(profileId || "").trim();
    const profiles = Array.isArray(AppState.data?.profiles) ? AppState.data.profiles : [];
    const profile = profiles.find((entry) => entry.id === safeId);

    if (!profile) {
      if (typeof window.PackTracker?.showToast === "function") {
        window.PackTracker.showToast("No active profile to export.", "danger");
      }
      return;
    }

    const payload = {
      version: AppState.data?.version ?? 1,
      profiles: [createPortableProfileExport(profile)],
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const safeName = profile.name.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
    anchor.download = `packtracker-${safeName}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Profile exported");
  }

  /**
   * Creates a profile export that excludes virtual-favorites state.
   *
   * @param {object} profile - Source profile.
   * @returns {object} Portable profile.
   */
  function createPortableProfileExport(profile) {
    const clone = structuredClone(normalizeProfile(profile));
    clone.mods = clone.mods.map(stripFavoriteExportState);
    clone.resourcePacks = clone.resourcePacks.map(stripFavoriteExportState);
    clone.shaders = clone.shaders.map(stripFavoriteExportState);
    return clone;
  }

  /**
   * Removes favorite-only state from exported items.
   *
   * @param {object} item - Stored item.
   * @returns {object} Export item.
   */
  function stripFavoriteExportState(item) {
    const nextItem = { ...item };
    nextItem.starred = false;
    delete nextItem.sourceProfileId;
    delete nextItem.sourceProfileName;
    return nextItem;
  }

  /**
   * Reads a backup file and merges non-colliding profiles into current storage.
   *
   * @param {File} file - Selected backup file.
   * @returns {Promise<{data: object, importedCount: number, skippedCount: number, importedProfile: object|null}>} Import result.
   */
  async function importBackup(file) {
    const incomingText = await file.text();
    const incoming = normalizeData(JSON.parse(incomingText));
    const current = ensureAppData();
    const firstProfile = incoming.profiles[0];
    if (!firstProfile) {
      persistAndNotify("import-backup", "0 profiles imported");
      return { data: current, importedCount: 0, skippedCount: 0, importedProfile: null };
    }

    const importedProfile = normalizeProfile({
      ...firstProfile,
      id: createId(),
      name: `${firstProfile.name || "Profile"} (imported)`,
    });
    current.profiles.push(importedProfile);
    persistAndNotify("import-backup", "Profile imported");
    return { data: current, importedCount: 1, skippedCount: 0, importedProfile };
  }

  /**
   * Creates a shareable URL for one saved profile.
   *
   * @param {string} profileId - Profile identifier.
   * @returns {string} Fully qualified share URL.
   */
  function generateShareLink(profileId) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error("Profile not found.");
    }

    const payload = {
      v: 1,
      name: profile.name,
      mcVersion: profile.mcVersion,
      loader: profile.loader,
      mods: profile.mods.map((item) => serializeShareItem(item)),
      resourcePacks: profile.resourcePacks.map((item) => serializeShareItem(item)),
      shaders: profile.shaders.map((item) => serializeShareItem(item)),
    };
    const encoded = encodeBase64Url(JSON.stringify(payload));
    return `${window.location.origin}${window.location.pathname}?share=${encoded}`;
  }

  /**
   * Parses a shared-profile URL back into a normalized profile-like object.
   *
   * @param {string} url - Input URL containing `?share=...`.
   * @returns {object} Parsed shared profile.
   */
  function parseShareLink(url) {
    let shareUrl;
    try {
      shareUrl = new URL(String(url || ""), window.location.href);
    } catch (error) {
      throw new Error("Invalid share link.");
    }

    const encoded = shareUrl.searchParams.get("share");
    if (!encoded) {
      throw new Error("Missing share payload.");
    }

    let parsed;
    try {
      parsed = JSON.parse(decodeBase64Url(encoded));
    } catch (error) {
      throw new Error("Share payload could not be decoded.");
    }

    if (Number(parsed?.v) !== 1) {
      throw new Error("Unsupported share format.");
    }

    return normalizeSharedProfile(parsed);
  }

  /**
   * Imports a parsed shared profile into local storage as a new saved profile.
   *
   * @param {object} sharedProfile - Parsed shared profile.
   * @returns {object} Imported normalized profile.
   */
  function importSharedProfile(sharedProfile) {
    const data = ensureAppData();
    const normalizedShare = normalizeSharedProfile(sharedProfile);
    const importedProfile = normalizeProfile({
      id: createId(),
      name: `${normalizedShare.name || "Profile"} (imported)`,
      mcVersion: normalizedShare.mcVersion,
      loader: normalizedShare.loader,
      loaderVersion: "",
      createdAt: Date.now(),
      mods: normalizedShare.mods.map((item) => normalizeMod(item)),
      resourcePacks: normalizedShare.resourcePacks.map((item) => normalizePackLike(item, "resourcepack")),
      shaders: normalizedShare.shaders.map((item) => normalizePackLike(item, "shader")),
    });

    data.profiles.unshift(importedProfile);
    persistAndNotify("import-share-profile", "Profile imported");
    return importedProfile;
  }

  /**
   * Builds the default top-level storage structure.
   *
   * @returns {{version:number, profiles:Array<object>}} Empty storage payload.
   */
  function createEmptyData() {
    return {
      version: DATA_VERSION,
      profiles: [],
    };
  }

  /**
   * Creates the default app-settings payload.
   *
   * @returns {object} Default settings object.
   */
  function createDefaultAppSettings() {
    return normalizeAppSettings({
      language: inferDefaultLanguage(),
      theme: "dark",
      uiStyle: "packtracker",
      accentColor: "#1ad969",
      blurStrength: 8,
      uiScale: 100,
      reduceMotion: false,
      fontStyle: "default",
      highContrast: false,
      roundedCorners: 12,
      keybinds: createDefaultKeybinds(),
      updateProviderPreference: "auto",
      showBootScreen: true,
      defaultDownloadDirectoryName: "",
      downloadBehavior: "browser",
      scrollDownButton: "smart",
      updateProgressDisplay: "icons",
      confirmItemRemoval: false,
      buttonVisibility: createDefaultButtonVisibility(),
      seenReleaseNotesVersion: "",
      onboardingCompleted: false,
      visitCount: 0,
      firstOpenedAt: 0,
      lastOpenedAt: 0,
      addons: createDefaultAddonSettings(),
    });
  }

  /**
   * Normalizes the stored app-settings payload.
   *
   * @param {unknown} settings - Raw settings payload.
   * @returns {object} Normalized settings.
   */
  function normalizeAppSettings(settings) {
    const value = settings && typeof settings === "object" ? settings : {};
    return {
      language: normalizeLanguage(value.language),
      theme: normalizeTheme(value.theme),
      uiStyle: normalizeUiStyle(value.uiStyle),
      accentColor: normalizeAccentColor(value.accentColor),
      blurStrength: normalizeBlurStrength(value.blurStrength),
      uiScale: normalizeUiScale(value.uiScale),
      reduceMotion: Boolean(value.reduceMotion),
      fontStyle: normalizeFontStyle(value.fontStyle),
      highContrast: Boolean(value.highContrast),
      roundedCorners: normalizeRoundedCorners(value.roundedCorners),
      keybinds: normalizeKeybinds(value.keybinds),
      updateProviderPreference: normalizeUpdateProviderPreference(value.updateProviderPreference),
      showBootScreen: value.showBootScreen !== false,
      defaultDownloadDirectoryName: String(value.defaultDownloadDirectoryName || "").trim(),
      downloadBehavior: normalizeDownloadBehavior(value.downloadBehavior),
      scrollDownButton: normalizeScrollDownButtonMode(value.scrollDownButton),
      updateProgressDisplay: normalizeUpdateProgressDisplay(value.updateProgressDisplay),
      confirmItemRemoval: Boolean(value.confirmItemRemoval),
      buttonVisibility: normalizeButtonVisibility(value.buttonVisibility),
      seenReleaseNotesVersion: String(value.seenReleaseNotesVersion || "").trim(),
      onboardingCompleted: Boolean(value.onboardingCompleted),
      visitCount: Math.max(0, Number(value.visitCount || 0) || 0),
      firstOpenedAt: Math.max(0, Number(value.firstOpenedAt || 0) || 0),
      lastOpenedAt: Math.max(0, Number(value.lastOpenedAt || 0) || 0),
      addons: normalizeAddonSettings(value.addons),
    };
  }

  /**
   * Creates the default addon settings payload.
   *
   * @returns {{marketplaceEnabled:boolean,customAddonsExperimental:boolean,installed:Array<object>,configById:Record<string, object>,customRegistry:Array<object>}} Default addon settings.
   */
  function createDefaultAddonSettings() {
    return {
      marketplaceEnabled: true,
      customAddonsExperimental: false,
      installed: [],
      configById: {},
      customRegistry: [],
    };
  }

  /**
   * Normalizes the addon settings subtree stored inside app settings.
   *
   * @param {unknown} addons - Raw addon settings payload.
   * @returns {{marketplaceEnabled:boolean,customAddonsExperimental:boolean,installed:Array<object>,configById:Record<string, object>,customRegistry:Array<object>}} Normalized addon settings.
   */
  function normalizeAddonSettings(addons) {
    const value = addons && typeof addons === "object" ? addons : {};
    const installedEntries = Array.isArray(value.installed)
      ? value.installed
        .map((entry) => normalizeAddonInstallRecord(entry))
        .filter((entry) => entry.id)
      : [];
    const seenIds = new Set();
    const installed = installedEntries.filter((entry) => {
      if (seenIds.has(entry.id)) {
        return false;
      }
      seenIds.add(entry.id);
      return true;
    });

    const configById = {};
    if (value.configById && typeof value.configById === "object" && !Array.isArray(value.configById)) {
      Object.entries(value.configById).forEach(([id, config]) => {
        const safeId = String(id || "").trim();
        if (!safeId || !config || typeof config !== "object" || Array.isArray(config)) {
          return;
        }
        configById[safeId] = sanitizeAddonJsonValue(config) || {};
      });
    }

    const customRegistry = Array.isArray(value.customRegistry)
      ? value.customRegistry
        .map((entry) => sanitizeAddonJsonValue(entry))
        .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      : [];

    return {
      marketplaceEnabled: value.marketplaceEnabled !== false,
      customAddonsExperimental: Boolean(value.customAddonsExperimental),
      installed,
      configById,
      customRegistry,
    };
  }

  /**
   * Creates the default show/hide settings for configurable app buttons.
   *
   * @returns {Record<string, "show"|"hide">} Button visibility settings.
   */
  function createDefaultButtonVisibility() {
    return BUTTON_VISIBILITY_KEYS.reduce((settings, key) => {
      settings[key] = "show";
      return settings;
    }, {});
  }

  /**
   * Normalizes stored button visibility settings.
   *
   * @param {unknown} buttonVisibility - Raw visibility payload.
   * @returns {Record<string, "show"|"hide">} Normalized visibility settings.
   */
  function normalizeButtonVisibility(buttonVisibility) {
    const value = buttonVisibility && typeof buttonVisibility === "object" ? buttonVisibility : {};
    return BUTTON_VISIBILITY_KEYS.reduce((settings, key) => {
      const rawValue = String(value[key] || "show").trim().toLowerCase();
      settings[key] = BUTTON_VISIBILITY_VALUES.includes(rawValue) ? rawValue : "show";
      return settings;
    }, {});
  }

  /**
   * Checks whether one configurable button should be rendered.
   *
   * @param {string} key - Button visibility key.
   * @returns {boolean} True when the button is configured as visible.
   */
  function isButtonVisible(key) {
    const visibility = normalizeButtonVisibility(AppState.settings?.buttonVisibility);
    return visibility[key] !== "hide";
  }

  /**
   * Normalizes one installed-addon record.
   *
   * @param {unknown} entry - Raw record.
   * @returns {{id:string,type:"bundled"|"custom",enabled:boolean,installedAt:number}} Normalized install record.
   */
  function normalizeAddonInstallRecord(entry) {
    const value = entry && typeof entry === "object" ? entry : {};
    const type = String(value.type || "bundled").trim().toLowerCase() === "custom" ? "custom" : "bundled";
    return {
      id: String(value.id || "").trim(),
      type,
      enabled: value.enabled !== false,
      installedAt: Math.max(0, Number(value.installedAt || 0) || 0),
    };
  }

  /**
   * Sanitizes one JSON-like addon payload so localStorage only keeps data values.
   *
   * @param {unknown} value - Raw JSON candidate.
   * @param {number} [depth=0] - Current recursion depth.
   * @returns {unknown} Sanitized JSON value.
   */
  function sanitizeAddonJsonValue(value, depth = 0) {
    if (depth > 10) {
      return null;
    }
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => sanitizeAddonJsonValue(entry, depth + 1))
        .filter((entry) => entry !== undefined);
    }
    if (value && typeof value === "object") {
      const output = {};
      Object.entries(value).forEach(([key, nestedValue]) => {
        const sanitized = sanitizeAddonJsonValue(nestedValue, depth + 1);
        if (sanitized !== undefined) {
          output[String(key)] = sanitized;
        }
      });
      return output;
    }
    return undefined;
  }

  /**
   * Ensures there is an in-memory data object ready for mutations.
   *
   * @returns {{version:number, profiles:Array<object>}} Active storage data.
   */
  function ensureAppData() {
    if (!AppState.data) {
      AppState.data = createEmptyData();
    }
    return AppState.data;
  }

  /**
   * Normalizes the language setting to one of the supported codes.
   *
   * @param {unknown} language - Language candidate.
   * @returns {"en"|"zh"|"hi"|"es"|"ar"} Normalized language code.
   */
  function normalizeLanguage(language) {
    const value = String(language || inferDefaultLanguage()).trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(value)) {
      return value;
    }
    return inferDefaultLanguage();
  }

  /**
   * Normalizes the theme setting.
   *
   * @param {unknown} theme - Theme candidate.
   * @returns {"dark"|"light"|"system"} Normalized theme.
   */
  function normalizeTheme(theme) {
    const value = String(theme || "dark").trim().toLowerCase();
    return SUPPORTED_THEMES.includes(value) ? value : "dark";
  }

  /**
   * Normalizes the preferred download behavior.
   *
   * @param {unknown} behavior - Download-behavior candidate.
   * @returns {"ask"|"default"} Normalized behavior value.
   */
  function normalizeDownloadBehavior(behavior) {
    const value = String(behavior || "browser").trim().toLowerCase();
    return SUPPORTED_DOWNLOAD_BEHAVIORS.includes(value) ? value : "browser";
  }

  /**
   * Normalizes the scroll-to-bottom button visibility mode.
   *
   * @param {unknown} mode - Visibility mode candidate.
   * @returns {"always"|"smart"|"never"} Normalized mode.
   */
  function normalizeScrollDownButtonMode(mode) {
    const value = String(mode || "smart").trim().toLowerCase();
    return SUPPORTED_SCROLL_DOWN_BUTTON_MODES.includes(value) ? value : "smart";
  }

  /**
   * Normalizes the configured accent color.
   *
   * @param {unknown} color - Accent color candidate.
   * @returns {string} Safe hex color.
   */
  function normalizeAccentColor(color) {
    const value = String(color || "#1ad969").trim();
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "#1ad969";
  }

  /**
   * Normalizes the configured blur strength.
   *
   * @param {unknown} blurStrength - Blur candidate.
   * @returns {number} Safe blur pixel value.
   */
  function normalizeBlurStrength(blurStrength) {
    const numeric = Number(blurStrength);
    if (!Number.isFinite(numeric)) {
      return 8;
    }
    return Math.min(24, Math.max(0, Math.round(numeric)));
  }

  /**
   * Normalizes the selected interface style.
   *
   * @param {unknown} uiStyle - UI style candidate.
   * @returns {"packtracker"|"blur"|"glassy"} Safe UI style.
   */
  function normalizeUiStyle(uiStyle) {
    const value = String(uiStyle || "packtracker").trim().toLowerCase();
    return SUPPORTED_UI_STYLES.includes(value) ? value : "packtracker";
  }

  /**
   * Normalizes the interface scale setting.
   *
   * @param {unknown} uiScale - Scale candidate.
   * @returns {number} Safe scale percentage.
   */
  function normalizeUiScale(uiScale) {
    const numeric = Number(uiScale);
    if (!Number.isFinite(numeric)) {
      return 100;
    }
    return Math.min(125, Math.max(75, Math.round(numeric / 5) * 5));
  }

  /**
   * Normalizes how bulk-update item results are shown.
   *
   * @param {unknown} display - Display mode candidate.
   * @returns {"icons"|"logs"} Safe update-result display mode.
   */
  function normalizeUpdateProgressDisplay(display) {
    const value = String(display || "icons").trim().toLowerCase();
    return SUPPORTED_UPDATE_PROGRESS_DISPLAYS.includes(value) ? value : "icons";
  }

  /**
   * Normalizes the selected font style.
   *
   * @param {unknown} fontStyle - Font-style candidate.
   * @returns {"default"|"monospace"} Safe font style.
   */
  function normalizeFontStyle(fontStyle) {
    const value = String(fontStyle || "default").trim().toLowerCase();
    return SUPPORTED_FONT_STYLES.includes(value) ? value : "default";
  }

  /**
   * Normalizes the stored update-provider preference.
   *
   * @param {unknown} preference - Raw preference value.
   * @returns {"auto"|"modrinth"|"curseforge"} Normalized preference.
   */
  function normalizeUpdateProviderPreference(preference) {
    const value = String(preference || "auto").trim().toLowerCase();
    return SUPPORTED_UPDATE_PROVIDER_PREFERENCES.includes(value) ? value : "auto";
  }

  /**
   * Normalizes the rounded-corner setting.
   *
   * @param {unknown} roundedCorners - Radius candidate.
   * @returns {number} Safe corner radius.
   */
  function normalizeRoundedCorners(roundedCorners) {
    const numeric = Number(roundedCorners);
    if (!Number.isFinite(numeric)) {
      return 12;
    }
    return Math.min(24, Math.max(0, Math.round(numeric)));
  }

  /**
   * Returns the default keybind map.
   *
   * @returns {Record<string, string>} Default keybinds.
   */
  function createDefaultKeybinds() {
    return { ...DEFAULT_KEYBINDS };
  }

  /**
   * Normalizes a full keybind map.
   *
   * @param {unknown} keybinds - Raw keybind payload.
   * @returns {Record<string, string>} Normalized keybind map.
   */
  function normalizeKeybinds(keybinds) {
    const value = keybinds && typeof keybinds === "object" ? keybinds : {};
    const normalized = {};
    Object.entries(DEFAULT_KEYBINDS).forEach(([action, fallback]) => {
      normalized[action] = normalizeKeybindCombo(value[action], fallback);
    });
    return normalized;
  }

  /**
   * Normalizes one keybind combination string.
   *
   * @param {unknown} combo - Candidate combo string.
   * @param {string} fallback - Fallback value.
   * @returns {string} Normalized combo.
   */
  function normalizeKeybindCombo(combo, fallback = "") {
    const parsed = parseKeybindCombo(combo);
    if (!parsed) {
      return fallback;
    }
    return formatKeybindCombo(parsed);
  }

  /**
   * Parses a stored keybind combination into modifiers and a key token.
   *
   * @param {unknown} combo - Candidate combo string.
   * @returns {{ctrl:boolean,alt:boolean,shift:boolean,meta:boolean,key:string}|null} Parsed combo.
   */
  function parseKeybindCombo(combo) {
    const tokens = String(combo || "")
      .split("+")
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      return null;
    }

    const parsed = {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
      key: "",
    };

    tokens.forEach((token) => {
      const lower = token.toLowerCase();
      if (["ctrl", "control"].includes(lower)) {
        parsed.ctrl = true;
        return;
      }
      if (["alt", "option"].includes(lower)) {
        parsed.alt = true;
        return;
      }
      if (["shift"].includes(lower)) {
        parsed.shift = true;
        return;
      }
      if (["meta", "win", "super", "mod", "cmd", "command"].includes(lower)) {
        parsed.meta = true;
        return;
      }
      parsed.key = normalizeKeyToken(token);
    });

    return parsed.key ? parsed : null;
  }

  /**
   * Converts a parsed keybind into a canonical display string.
   *
   * @param {{ctrl:boolean,alt:boolean,shift:boolean,meta:boolean,key:string}} parsed - Parsed combo.
   * @returns {string} Canonical combo.
   */
  function formatKeybindCombo(parsed) {
    if (!parsed || !parsed.key) {
      return "";
    }

    const parts = [];
    if (parsed.ctrl) {
      parts.push("Ctrl");
    }
    if (parsed.alt) {
      parts.push("Alt");
    }
    if (parsed.shift) {
      parts.push("Shift");
    }
    if (parsed.meta) {
      parts.push("Meta");
    }
    parts.push(parsed.key);
    return parts.join("+");
  }

  /**
   * Converts a keyboard event into a canonical keybind string.
   *
   * @param {KeyboardEvent|{key?:string,code?:string,ctrlKey?:boolean,altKey?:boolean,shiftKey?:boolean,metaKey?:boolean,repeat?:boolean}} event - Keyboard event.
   * @returns {string} Canonical combo or empty string.
   */
  function eventToKeybindCombo(event) {
    if (!event || event.repeat) {
      return "";
    }

    const key = normalizeKeyTokenFromEvent(event);
    if (!key) {
      return "";
    }

    const parsed = {
      ctrl: Boolean(event.ctrlKey),
      alt: Boolean(event.altKey),
      shift: Boolean(event.shiftKey),
      meta: Boolean(event.metaKey),
      key,
    };
    return formatKeybindCombo(parsed);
  }

  /**
   * Returns true when an event matches a stored keybind combo.
   *
   * @param {KeyboardEvent} event - Keyboard event.
   * @param {string} combo - Stored combination.
   * @returns {boolean} Match flag.
   */
  function matchesKeybindEvent(event, combo) {
    const normalizedCombo = normalizeKeybindCombo(combo, "");
    if (!normalizedCombo) {
      return false;
    }
    return eventToKeybindCombo(event) === normalizedCombo;
  }

  /**
   * Normalizes a single key token.
   *
   * @param {string} token - Key token.
   * @returns {string} Canonical key token.
   */
  function normalizeKeyToken(token) {
    const value = String(token || "").trim();
    if (!value) {
      return "";
    }

    const lower = value.toLowerCase();
    const namedTokens = {
      comma: "Comma",
      period: "Period",
      dot: "Period",
      slash: "Slash",
      backslash: "Backslash",
      minus: "Minus",
      equal: "Equal",
      backquote: "Backquote",
      quote: "Quote",
      semicolon: "Semicolon",
      bracketleft: "BracketLeft",
      bracketright: "BracketRight",
      space: "Space",
      tab: "Tab",
      enter: "Enter",
      return: "Enter",
      backspace: "Backspace",
      delete: "Delete",
      del: "Delete",
      escape: "Escape",
      esc: "Escape",
      arrowup: "ArrowUp",
      arrowdown: "ArrowDown",
      arrowleft: "ArrowLeft",
      arrowright: "ArrowRight",
      home: "Home",
      end: "End",
      pageup: "PageUp",
      pagedown: "PageDown",
      insert: "Insert",
    };

    if (namedTokens[lower]) {
      return namedTokens[lower];
    }
    if (/^f\d{1,2}$/i.test(value)) {
      return value.toUpperCase();
    }
    if (/^[a-z]$/i.test(value)) {
      return value.toUpperCase();
    }
    if (/^\d$/.test(value)) {
      return value;
    }
    if (/^digit\d$/i.test(value)) {
      return value.slice(-1);
    }
    return value;
  }

  /**
   * Normalizes a keyboard event's non-modifier key into a canonical token.
   *
   * @param {KeyboardEvent|{key?:string,code?:string}} event - Keyboard event.
   * @returns {string} Canonical key token.
   */
  function normalizeKeyTokenFromEvent(event) {
    const key = String(event?.key || "").trim();
    const code = String(event?.code || "").trim();
    const lower = key.toLowerCase();
    const codeLower = code.toLowerCase();

    if (!key) {
      return "";
    }

    const modifierKeys = ["shift", "control", "alt", "meta"];
    if (modifierKeys.includes(lower)) {
      return "";
    }

    const codeMap = {
      comma: "Comma",
      period: "Period",
      slash: "Slash",
      backslash: "Backslash",
      minus: "Minus",
      equal: "Equal",
      backquote: "Backquote",
      semicolon: "Semicolon",
      quote: "Quote",
      bracketleft: "BracketLeft",
      bracketright: "BracketRight",
      space: "Space",
      tab: "Tab",
      enter: "Enter",
      backspace: "Backspace",
      delete: "Delete",
      escape: "Escape",
      arrowup: "ArrowUp",
      arrowdown: "ArrowDown",
      arrowleft: "ArrowLeft",
      arrowright: "ArrowRight",
      home: "Home",
      end: "End",
      pageup: "PageUp",
      pagedown: "PageDown",
      insert: "Insert",
    };

    if (codeLower.startsWith("key") && code.length === 4) {
      return code.slice(3).toUpperCase();
    }
    if (codeLower.startsWith("digit") && code.length === 6) {
      return code.slice(5);
    }
    if (codeMap[codeLower]) {
      return codeMap[codeLower];
    }

    return normalizeKeyToken(key);
  }

  /**
   * Infers the closest supported UI language from the browser locale.
   *
   * @returns {"en"|"zh"|"hi"|"es"|"ar"} Supported language code.
   */
  function inferDefaultLanguage() {
    const locale = String(window.navigator?.language || "en").toLowerCase();
    if (locale.startsWith("zh")) {
      return "zh";
    }
    if (locale.startsWith("hi")) {
      return "hi";
    }
    if (locale.startsWith("es")) {
      return "es";
    }
    if (locale.startsWith("ar")) {
      return "ar";
    }
    return "en";
  }

  /**
   * Saves the current application data and notifies listeners.
   *
   * @param {string} reason - State update reason.
   * @param {string} toastMessage - Toast text.
   */
  function persistAndNotify(reason, toastMessage) {
    AppState.data = saveData(AppState.data);
    AppState.dirty = false;
    notifyStateChanged(reason);
    showToast(toastMessage);
  }

  /**
   * Inserts or replaces an item within a profile collection.
   *
   * @param {string} profileId - Profile identifier.
   * @param {"mods"|"resourcePacks"|"shaders"} collectionKey - Target collection key.
   * @param {object} item - Normalized item payload.
   * @param {string} reason - Notify reason.
   * @param {string} toastMessage - Toast text.
   * @returns {object|null} Saved item or null.
   */
  function upsertCollectionItem(profileId, collectionKey, item, reason, toastMessage) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return null;
    }

    const collection = profile[collectionKey];
    const existingIndex = collection.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      collection[existingIndex] = item;
    } else {
      collection.unshift(item);
    }

    persistAndNotify(reason, toastMessage);
    return item;
  }

  /**
   * Removes an item from one of the profile collections.
   *
   * @param {string} profileId - Profile identifier.
   * @param {"mods"|"resourcePacks"|"shaders"} collectionKey - Target collection key.
   * @param {string} itemId - Item identifier.
   * @param {string} reason - Notify reason.
   * @param {string} toastMessage - Toast text.
   * @returns {boolean} True when an item was removed.
   */
  function removeCollectionItem(profileId, collectionKey, itemId, reason, toastMessage) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return false;
    }

    const beforeLength = profile[collectionKey].length;
    profile[collectionKey] = profile[collectionKey].filter((entry) => entry.id !== itemId);
    if (beforeLength === profile[collectionKey].length) {
      return false;
    }

    persistAndNotify(reason, toastMessage);
    return true;
  }

  /**
   * Updates a resource-pack or shader item in place.
   *
   * @param {string} profileId - Profile identifier.
   * @param {"resourcePacks"|"shaders"} collectionKey - Target collection.
   * @param {string} itemId - Item identifier.
   * @param {object} patch - Partial item patch.
   * @param {string} reason - Notify reason.
   * @param {string} toastMessage - Toast text.
   * @returns {object|null} Updated item or null.
   */
  function updatePackLikeItem(profileId, collectionKey, itemId, patch, reason, toastMessage) {
    const profile = ensureAppData().profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return null;
    }

    const current = profile[collectionKey].find((item) => item.id === itemId);
    if (!current) {
      return null;
    }

    Object.assign(current, normalizePackLike(
      { ...current, ...patch },
      collectionKey === "shaders" ? "shader" : "resourcepack"
    ));
    persistAndNotify(reason, toastMessage);
    return current;
  }

  /**
   * Normalizes the full storage payload and all nested collections.
   *
   * @param {unknown} data - Parsed storage candidate.
   * @returns {{version:number, profiles:Array<object>}} Normalized data.
   */
  function normalizeData(data) {
    const legacyProfilesKey = "inst" + "allations";
    const sourceProfiles = Array.isArray(data?.profiles)
      ? data.profiles
      : Array.isArray(data?.[legacyProfilesKey])
        ? data[legacyProfilesKey]
        : [];

    return {
      version: DATA_VERSION,
      profiles: sourceProfiles.map((profile) => normalizeProfile(profile)),
    };
  }

  /**
   * Normalizes a profile record and its nested items.
   *
   * @param {unknown} profile - Profile candidate.
   * @returns {object} Normalized profile.
   */
  function normalizeProfile(profile) {
    return {
      id: String(profile?.id || createId()),
      name: String(profile?.name || "New profile"),
      mcVersion: String(profile?.mcVersion || ""),
      loader: normalizeLoader(profile?.loader),
      loaderVersion: String(profile?.loaderVersion || ""),
      createdAt: typeof profile?.createdAt === "number" ? profile.createdAt : Date.now(),
      mods: Array.isArray(profile?.mods) ? profile.mods.map((mod) => normalizeMod(mod)) : [],
      resourcePacks: Array.isArray(profile?.resourcePacks) ? profile.resourcePacks.map((pack) => normalizePackLike(pack, "resourcepack")) : [],
      shaders: Array.isArray(profile?.shaders) ? profile.shaders.map((shader) => normalizePackLike(shader, "shader")) : [],
    };
  }

  /**
   * Normalizes the mod schema used inside each profile.
   *
   * @param {unknown} mod - Mod candidate.
   * @returns {object} Normalized mod item.
   */
  function normalizeMod(mod) {
    const fileUrl = String(mod?.fileUrl || mod?.downloadUrl || mod?.url || "");
    return {
      id: String(mod?.id || createId()),
      projectId: String(mod?.projectId || mod?.modrinthId || mod?.id || ""),
      projectType: String(mod?.projectType || "mod"),
      slug: String(mod?.slug || ""),
      name: String(mod?.name || "Untitled mod"),
      version: String(mod?.version || mod?.versionNumber || ""),
      versionNumber: String(mod?.versionNumber || mod?.version || ""),
      versionId: String(mod?.versionId || ""),
      modrinthId: String(mod?.modrinthId || mod?.projectId || mod?.id || ""),
      source: normalizeSource(mod?.source, "modrinth"),
      fileUrl,
      url: fileUrl,
      downloadUrl: fileUrl,
      modrinthUrl: String(mod?.modrinthUrl || ""),
      description: String(mod?.description || ""),
      author: String(mod?.author || "Unknown"),
      iconUrl: String(mod?.iconUrl || ""),
      notes: String(mod?.notes || ""),
      starred: Boolean(mod?.starred),
      dependencies: Array.isArray(mod?.dependencies) ? mod.dependencies.map((dependency) => String(dependency)) : [],
      dependencyProjects: Array.isArray(mod?.dependencyProjects)
        ? mod.dependencyProjects.map((entry) => ({
            id: String(entry?.id || "").trim(),
            slug: String(entry?.slug || "").trim(),
            name: String(entry?.name || "").trim(),
            description: String(entry?.description || "").trim(),
            iconUrl: String(entry?.iconUrl || entry?.icon_url || "").trim(),
          })).filter((entry) => entry.id)
        : [],
      includedMods: Array.isArray(mod?.includedMods)
        ? mod.includedMods.map((entry) => ({
            id: String(entry?.id || "").trim(),
            projectId: String(entry?.projectId || entry?.id || "").trim(),
            slug: String(entry?.slug || "").trim(),
            name: String(entry?.name || "").trim() || "Unknown mod",
            versionId: String(entry?.versionId || "").trim(),
            versionNumber: String(entry?.versionNumber || entry?.version || "").trim(),
            fileName: String(entry?.fileName || "").trim(),
            source: normalizeSource(entry?.source, "modrinth"),
          })).filter((entry) => entry.name)
        : [],
      mcVersions: Array.isArray(mod?.mcVersions) ? mod.mcVersions.map((version) => String(version)) : [],
      loaders: Array.isArray(mod?.loaders) ? mod.loaders.map((loader) => String(loader).toLowerCase()) : [],
      addedAt: typeof mod?.addedAt === "number" ? mod.addedAt : Date.now(),
    };
  }

  /**
   * Normalizes the shared resource-pack and shader item schema.
   *
   * @param {unknown} item - Pack-like candidate.
   * @returns {object} Normalized pack-like item.
   */
  function normalizePackLike(item, fallbackProjectType = "resourcepack") {
    const fileUrl = String(item?.fileUrl || item?.downloadUrl || item?.url || "");
    return {
      id: String(item?.id || createId()),
      projectId: String(item?.projectId || item?.modrinthId || item?.id || ""),
      projectType: String(item?.projectType || fallbackProjectType),
      slug: String(item?.slug || ""),
      name: String(item?.name || "Untitled item"),
      version: String(item?.version || item?.versionNumber || ""),
      versionNumber: String(item?.versionNumber || item?.version || ""),
      versionId: String(item?.versionId || ""),
      modrinthId: String(item?.modrinthId || item?.projectId || item?.id || ""),
      source: normalizeSource(item?.source, "manual"),
      fileUrl,
      url: fileUrl,
      downloadUrl: fileUrl,
      modrinthUrl: String(item?.modrinthUrl || ""),
      description: String(item?.description || ""),
      author: String(item?.author || "Unknown"),
      iconUrl: String(item?.iconUrl || ""),
      notes: String(item?.notes || ""),
      starred: Boolean(item?.starred),
      dependencies: Array.isArray(item?.dependencies) ? item.dependencies.map((dependency) => String(dependency)) : [],
      addedAt: typeof item?.addedAt === "number" ? item.addedAt : Date.now(),
    };
  }

  /**
   * Builds the compact share-item schema while preserving direct-download metadata.
   *
   * @param {object} item - Stored item.
   * @returns {object} Shared item payload.
   */
  function serializeShareItem(item) {
    const fallbackSlug = buildShareToken(item?.slug || item?.name || item?.projectId || item?.id || "item");
    const fallbackVersionId = String(item?.versionId || item?.id || `${fallbackSlug}-version`);
    return {
      slug: fallbackSlug,
      source: normalizeSource(item?.source, "manual"),
      versionId: fallbackVersionId,
      name: String(item?.name || "Untitled item"),
      versionNumber: String(item?.versionNumber || item?.version || ""),
      projectId: String(item?.projectId || item?.modrinthId || ""),
      projectType: String(item?.projectType || "mod"),
      fileUrl: String(item?.fileUrl || item?.downloadUrl || item?.url || ""),
      fileName: String(item?.fileName || ""),
      iconUrl: String(item?.iconUrl || ""),
      description: String(item?.description || ""),
      author: String(item?.author || "Unknown"),
      modrinthUrl: String(item?.modrinthUrl || ""),
      loaders: Array.isArray(item?.loaders) ? item.loaders.map((loader) => String(loader)) : [],
      mcVersions: Array.isArray(item?.mcVersions) ? item.mcVersions.map((version) => String(version)) : [],
    };
  }

  /**
   * Validates and normalizes the top-level share payload.
   *
   * @param {unknown} profile - Decoded share payload.
   * @returns {object} Normalized shared profile.
   */
  function normalizeSharedProfile(profile) {
    if (!profile || typeof profile !== "object") {
      throw new Error("Invalid share payload.");
    }

    const name = String(profile?.name || "").trim();
    if (!name) {
      throw new Error("Shared profile is missing a name.");
    }

    const loader = normalizeLoader(profile?.loader);
    const mcVersion = String(profile?.mcVersion || "").trim();
    return {
      v: 1,
      shareId: `share:${name}:${mcVersion}:${loader}`,
      name,
      mcVersion,
      loader,
      mods: normalizeSharedItems(profile?.mods, "mod"),
      resourcePacks: normalizeSharedItems(profile?.resourcePacks, "resourcepack"),
      shaders: normalizeSharedItems(profile?.shaders, "shader"),
    };
  }

  /**
   * Normalizes one shared item list and validates required share fields.
   *
   * @param {unknown} items - Raw shared items list.
   * @param {"mod"|"resourcepack"|"shader"} fallbackProjectType - Default project type.
   * @returns {Array<object>} Normalized items.
   */
  function normalizeSharedItems(items, fallbackProjectType) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item) => {
      const name = String(item?.name || "").trim();
      const versionId = String(item?.versionId || "").trim();
      const slug = String(item?.slug || "").trim();
      const source = normalizeSource(item?.source, "manual");

      if (!name || !versionId || !slug || !source) {
        throw new Error("Shared profile contains an invalid item.");
      }

      const normalizedItem = {
        id: createId(),
        projectId: String(item?.projectId || ""),
        projectType: String(item?.projectType || fallbackProjectType),
        slug,
        name,
        version: String(item?.versionNumber || ""),
        versionNumber: String(item?.versionNumber || ""),
        versionId,
        modrinthId: String(item?.projectId || ""),
        source,
        fileUrl: String(item?.fileUrl || ""),
        url: String(item?.fileUrl || ""),
        downloadUrl: String(item?.fileUrl || ""),
        fileName: String(item?.fileName || ""),
        modrinthUrl: String(item?.modrinthUrl || ""),
        description: String(item?.description || ""),
        author: String(item?.author || "Unknown"),
        iconUrl: String(item?.iconUrl || ""),
        loaders: Array.isArray(item?.loaders) ? item.loaders.map((loader) => String(loader).toLowerCase()) : [],
        mcVersions: Array.isArray(item?.mcVersions) ? item.mcVersions.map((version) => String(version)) : [],
        dependencies: [],
        notes: "",
        starred: false,
        addedAt: Date.now(),
      };

      return fallbackProjectType === "mod"
        ? normalizeMod(normalizedItem)
        : normalizePackLike(normalizedItem, fallbackProjectType);
    });
  }

  /**
   * Builds a compact URL-safe fallback token for shared items.
   *
   * @param {string} value - Raw item label.
   * @returns {string} Compact token.
   */
  function buildShareToken(value) {
    return String(value || "item")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  }

  /**
   * Encodes arbitrary UTF-8 text into base64url.
   *
   * @param {string} value - Plain JSON string.
   * @returns {string} Base64url payload.
   */
  function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(String(value || ""));
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  /**
   * Decodes one base64url string into UTF-8 text.
   *
   * @param {string} value - Encoded payload.
   * @returns {string} Decoded text.
   */
  function decodeBase64Url(value) {
    const normalized = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /**
   * Persists a normalized data snapshot through localStorage.
   *
   * @param {{version:number, profiles:Array<object>}} data - Normalized data snapshot.
   */
  function persistNormalizedData(data) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("PackTracker: failed to persist data", error);
    }
  }

  /**
   * Persists one normalized settings snapshot through localStorage only.
   *
   * @param {object} settings - Normalized settings snapshot.
   */
  function cacheAppSettingsLocally(settings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("PackTracker: failed to persist app settings", error);
    }
  }

  /**
   * Reads the latest legacy localStorage payload if present.
   *
   * @returns {unknown} Parsed legacy payload or empty data.
   */
  function readLegacyLocalData() {
    for (const key of [LOCAL_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }
      try {
        return JSON.parse(raw);
      } catch (error) {
        console.warn("PackTracker: invalid localStorage payload", error);
      }
    }
    return createEmptyData();
  }

  /**
   * Normalizes the supported Minecraft loader values.
   *
   * @param {unknown} loader - Loader candidate.
   * @returns {"fabric"|"forge"|"neoforge"|"vanilla"} Normalized loader.
   */
  function normalizeLoader(loader) {
    const value = String(loader || "fabric").toLowerCase();
    if (["fabric", "forge", "neoforge", "vanilla"].includes(value)) {
      return value;
    }
    return "fabric";
  }

  /**
   * Normalizes an item source label.
   *
   * @param {unknown} source - Source candidate.
   * @param {string} fallback - Fallback source.
   * @returns {"modrinth"|"curseforge"|"manual"} Normalized source.
   */
  function normalizeSource(source, fallback) {
    const value = String(source || fallback).toLowerCase();
    if (["modrinth", "curseforge", "manual"].includes(value)) {
      return value;
    }
    return fallback;
  }

  /**
   * Shows a toast when the main app has registered the helper.
   *
   * @param {string} message - Toast message.
   */
  function showToast(message) {
    if (message && typeof namespace.showToast === "function") {
      namespace.showToast(message);
    }
  }

  /**
   * Creates a lightweight profile id from time plus random chars.
   *
   * @returns {string} Generated identifier.
   */
  function createId() {
    return `${Date.now()}${Math.random().toString(36).slice(2, 2 + RANDOM_ID_LENGTH)}`;
  }

  Object.assign(namespace, {
    loadData,
    saveData,
    loadAppSettings,
    saveAppSettings,
    updateAppSettings,
    resetAppSettings,
    recordAppVisit,
    createDefaultKeybinds,
    normalizeKeybinds,
    normalizeKeybindCombo,
    parseKeybindCombo,
    formatKeybindCombo,
    eventToKeybindCombo,
    matchesKeybindEvent,
    createProfile,
    duplicateProfile,
    deleteProfile,
    clearProfiles,
    updateProfile,
    addMod,
    removeMod,
    updateMod,
    updateResourcePack,
    addResourcePack,
    removeResourcePack,
    addShader,
    removeShader,
    clearProfileCollection,
    updateShader,
    exportBackup,
    importBackup,
    generateShareLink,
    parseShareLink,
    importSharedProfile,
    normalizeData,
    normalizeAppSettings,
    normalizeButtonVisibility,
    createDefaultAppSettings,
    createDefaultButtonVisibility,
    BUTTON_VISIBILITY_KEYS,
    createEmptyData,
    readLegacyLocalData,
    persistNormalizedData,
    cacheAppSettingsLocally,
    isButtonVisible,
  });
})();
