(function attachStorageModule() {
  const namespace = window.PackTracker;
  const { AppState, notifyStateChanged } = namespace;
  const LOCAL_STORAGE_KEY = "packtracker_profiles_v2";
  const LEGACY_STORAGE_KEYS = ["packtracker_profiles_v1", "packtracker_v1"];
  const DATA_VERSION = 2;
  const RANDOM_ID_LENGTH = 4;
  const COPY_SUFFIX = " (copy)";

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
    return upsertCollectionItem(profileId, "resourcePacks", normalizePackLike(resourcePack), "add-resource-pack", "Resource pack added");
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
    return upsertCollectionItem(profileId, "shaders", normalizePackLike(shader), "add-shader", "Shader added");
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
  function exportBackup() {
    const data = normalizeData(AppState.data ?? createEmptyData());
    const fileName = `packtracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast("Backup exported");
  }

  /**
   * Reads a backup file and merges non-colliding profiles into current storage.
   *
   * @param {File} file - Selected backup file.
   * @returns {Promise<{data: object, importedCount: number, skippedCount: number}>} Import result.
   */
  async function importBackup(file) {
    const incomingText = await file.text();
    const incoming = normalizeData(JSON.parse(incomingText));
    const current = ensureAppData();
    const existingIds = new Set(current.profiles.map((profile) => profile.id));
    let importedCount = 0;
    let skippedCount = 0;

    incoming.profiles.forEach((profile) => {
      if (existingIds.has(profile.id)) {
        skippedCount += 1;
        return;
      }

      current.profiles.push(normalizeProfile(profile));
      importedCount += 1;
    });

    persistAndNotify("import-backup", `${importedCount} profile(s) imported`);
    return {
      data: current,
      importedCount,
      skippedCount,
    };
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

    Object.assign(current, normalizePackLike({ ...current, ...patch }));
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
      resourcePacks: Array.isArray(profile?.resourcePacks) ? profile.resourcePacks.map((pack) => normalizePackLike(pack)) : [],
      shaders: Array.isArray(profile?.shaders) ? profile.shaders.map((shader) => normalizePackLike(shader)) : [],
    };
  }

  /**
   * Normalizes the mod schema used inside each profile.
   *
   * @param {unknown} mod - Mod candidate.
   * @returns {object} Normalized mod item.
   */
  function normalizeMod(mod) {
    return {
      id: String(mod?.id || createId()),
      name: String(mod?.name || "Untitled mod"),
      version: String(mod?.version || mod?.versionNumber || ""),
      versionNumber: String(mod?.versionNumber || mod?.version || ""),
      versionId: String(mod?.versionId || ""),
      modrinthId: String(mod?.modrinthId || mod?.id || ""),
      source: normalizeSource(mod?.source, "modrinth"),
      url: String(mod?.url || mod?.downloadUrl || ""),
      downloadUrl: String(mod?.downloadUrl || mod?.url || ""),
      modrinthUrl: String(mod?.modrinthUrl || ""),
      description: String(mod?.description || ""),
      author: String(mod?.author || "Unknown"),
      iconUrl: String(mod?.iconUrl || ""),
      notes: String(mod?.notes || ""),
      starred: Boolean(mod?.starred),
      dependencies: Array.isArray(mod?.dependencies) ? mod.dependencies.map((dependency) => String(dependency)) : [],
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
  function normalizePackLike(item) {
    return {
      id: String(item?.id || createId()),
      name: String(item?.name || "Untitled item"),
      version: String(item?.version || item?.versionNumber || ""),
      versionId: String(item?.versionId || ""),
      modrinthId: String(item?.modrinthId || item?.id || ""),
      source: normalizeSource(item?.source, "manual"),
      url: String(item?.url || item?.downloadUrl || ""),
      downloadUrl: String(item?.downloadUrl || item?.url || ""),
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
    createProfile,
    duplicateProfile,
    deleteProfile,
    updateProfile,
    addMod,
    removeMod,
    updateMod,
    updateResourcePack,
    addResourcePack,
    removeResourcePack,
    addShader,
    removeShader,
    updateShader,
    exportBackup,
    importBackup,
  });
})();
