(function attachDownloadCacheModule() {
  const namespace = (window.PackTracker = window.PackTracker || {});
  const STORAGE_KEY = "packtracker_dl_cache_v1";

  /**
   * Marks one item version as downloaded for a specific profile id.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} itemSlug - Stable item slug.
   * @param {string} versionId - Version identifier.
   */
  function markDownloaded(profileId, itemSlug, versionId) {
    const safeProfileId = String(profileId || "").trim();
    const safeSlug = String(itemSlug || "").trim();
    const safeVersionId = String(versionId || "").trim();
    if (!safeProfileId || !safeSlug || !safeVersionId) {
      return;
    }

    const entries = readEntries().filter((entry) => !matchesEntry(entry, safeProfileId, safeSlug, safeVersionId));
    entries.push({
      profileId: safeProfileId,
      itemSlug: safeSlug,
      versionId: safeVersionId,
      downloadedAt: Date.now(),
    });
    writeEntries(entries);
  }

  /**
   * Checks whether a specific item version was already downloaded for one profile.
   *
   * @param {string} profileId - Profile identifier.
   * @param {string} itemSlug - Stable item slug.
   * @param {string} versionId - Version identifier.
   * @returns {boolean} True when the item/version was recorded before.
   */
  function wasDownloaded(profileId, itemSlug, versionId) {
    const safeProfileId = String(profileId || "").trim();
    const safeSlug = String(itemSlug || "").trim();
    const safeVersionId = String(versionId || "").trim();
    if (!safeProfileId || !safeSlug || !safeVersionId) {
      return false;
    }

    return readEntries().some((entry) => matchesEntry(entry, safeProfileId, safeSlug, safeVersionId));
  }

  /**
   * Removes cached download history for one profile id.
   *
   * @param {string} profileId - Profile identifier.
   */
  function clearDownloadCache(profileId) {
    const safeProfileId = String(profileId || "").trim();
    if (!safeProfileId) {
      return;
    }

    writeEntries(readEntries().filter((entry) => entry.profileId !== safeProfileId));
  }

  /**
   * Prunes download-cache entries older than the requested amount of days.
   *
   * @param {number} maxAgeDays - Maximum age in days.
   */
  function pruneOldEntries(maxAgeDays = 30) {
    const maxAgeMs = Math.max(1, Number(maxAgeDays || 30)) * 86400000;
    const cutoff = Date.now() - maxAgeMs;
    writeEntries(readEntries().filter((entry) => Number(entry?.downloadedAt || 0) >= cutoff));
  }

  /**
   * Reads and validates the persisted entry list.
   *
   * @returns {Array<object>} Stored cache entries.
   */
  function readEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((entry) => (
          typeof entry?.profileId === "string"
          && typeof entry?.itemSlug === "string"
          && typeof entry?.versionId === "string"
          && typeof entry?.downloadedAt === "number"
        ))
        : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Persists the full cache entry list.
   *
   * @param {Array<object>} entries - Next cache contents.
   */
  function writeEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(entries) ? entries : []));
    } catch (error) {
      console.warn("PackTracker: failed to persist download cache", error);
    }
  }

  /**
   * Compares one cache row against the requested identity fields.
   *
   * @param {object} entry - Stored cache entry.
   * @param {string} profileId - Profile identifier.
   * @param {string} itemSlug - Stable item slug.
   * @param {string} versionId - Version identifier.
   * @returns {boolean} True when the entry matches all identity fields.
   */
  function matchesEntry(entry, profileId, itemSlug, versionId) {
    return entry?.profileId === profileId
      && entry?.itemSlug === itemSlug
      && entry?.versionId === versionId;
  }

  Object.assign(namespace, {
    markDownloaded,
    wasDownloaded,
    clearDownloadCache,
    pruneOldEntries,
  });
})();
