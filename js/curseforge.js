(function attachCurseForgeModule() {
  const namespace = (window.PackTracker = window.PackTracker || {});
  const API_BASE_URL = "https://cfproxy.bmpm.workers.dev/v1";
  const MINECRAFT_GAME_ID = 432;
  const SEARCH_PAGE_SIZE = 20;
  const PROJECT_TYPE_CLASS_IDS = {
    mod: 6,
    resourcepack: 12,
    shader: 6552,
  };
  const PROJECT_TYPE_URL_SEGMENTS = {
    mod: "mc-mods",
    resourcepack: "texture-packs",
    shader: "shaders",
  };
  const LOADER_TYPES = {
    forge: 1,
    fabric: 4,
    quilt: 5,
    neoforge: 6,
  };
  const RELEASE_TYPES = {
    1: "release",
    2: "beta",
    3: "alpha",
  };

  const searchCache = new Map();
  const projectCache = new Map();
  const versionsCache = new Map();
  const versionCache = new Map();

  /**
   * Searches CurseForge projects and normalizes the results to the existing browse-card shape.
   *
   * @param {{query:string, projectType:string, loader:string, gameVersion:string, offset?:number}} options - Search options.
   * @returns {Promise<object>} Normalized search response or error payload.
   */
  async function cfSearchProjects({
    query,
    projectType,
    loader,
    gameVersion,
    offset = 0,
  }) {
    const safeProjectType = normalizeProjectType(projectType);
    const safeQuery = String(query || "").trim();
    const safeLoader = String(loader || "").trim().toLowerCase();
    const safeGameVersion = String(gameVersion || "").trim();
    const cacheKey = JSON.stringify({
      query: safeQuery,
      projectType: safeProjectType,
      loader: safeLoader,
      gameVersion: safeGameVersion,
      offset,
    });

    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey);
    }

    const params = new URLSearchParams({
      gameId: String(MINECRAFT_GAME_ID),
      classId: String(PROJECT_TYPE_CLASS_IDS[safeProjectType]),
      index: String(offset),
      pageSize: String(SEARCH_PAGE_SIZE),
    });

    if (safeQuery) {
      params.set("searchFilter", safeQuery);
    }
    if (safeLoader && LOADER_TYPES[safeLoader]) {
      params.set("modLoaderType", String(LOADER_TYPES[safeLoader]));
    }
    if (safeGameVersion) {
      params.set("gameVersion", safeGameVersion);
    }

    const response = await requestJson(`/mods/search?${params.toString()}`);
    if (response.error) {
      return response;
    }

    const hits = Array.isArray(response?.data)
      ? response.data.map((entry) => normalizeProject(entry, safeProjectType))
      : [];
    const result = {
      hits,
      offset: response?.pagination?.index || offset,
      total_hits: response?.pagination?.totalCount || hits.length,
    };
    searchCache.set(cacheKey, result);
    hits.forEach((project) => {
      if (project?.project_id) {
        projectCache.set(String(project.project_id), project);
      }
    });
    return result;
  }

  /**
   * Fetches one CurseForge project and normalizes it.
   *
   * @param {string|number} projectId - CurseForge project id.
   * @returns {Promise<object>} Normalized project or error payload.
   */
  async function cfGetProject(projectId) {
    const safeProjectId = String(projectId || "");
    if (!safeProjectId) {
      return createError("Missing project id.");
    }

    if (projectCache.has(safeProjectId)) {
      return projectCache.get(safeProjectId);
    }

    const response = await requestJson(`/mods/${encodeURIComponent(safeProjectId)}`);
    if (response.error) {
      return response;
    }

    const project = normalizeProject(
      response?.data || {},
      mapClassIdToProjectType(response?.data?.classId)
    );
    projectCache.set(safeProjectId, project);
    return project;
  }

  /**
   * Fetches project files/versions from CurseForge and normalizes them into the shared version shape.
   *
   * @param {string|number} projectId - CurseForge project id.
   * @param {{loader?:string, gameVersion?:string}} options - Optional filters.
   * @returns {Promise<Array<object>|object>} Normalized versions or error payload.
   */
  async function cfGetProjectVersions(projectId, options = {}) {
    const safeProjectId = String(projectId || "");
    if (!safeProjectId) {
      return createError("Missing project id.");
    }

    const loader = String(options.loader || "").trim().toLowerCase();
    const gameVersion = String(options.gameVersion || "").trim();
    const cacheKey = JSON.stringify({
      projectId: safeProjectId,
      loader,
      gameVersion,
    });

    if (versionsCache.has(cacheKey)) {
      return versionsCache.get(cacheKey);
    }

    const params = new URLSearchParams({
      pageSize: "50",
    });
    if (loader && LOADER_TYPES[loader]) {
      params.set("modLoaderType", String(LOADER_TYPES[loader]));
    }
    if (gameVersion) {
      params.set("gameVersion", gameVersion);
    }

    const response = await requestJson(`/mods/${encodeURIComponent(safeProjectId)}/files?${params.toString()}`);
    if (response.error) {
      return response;
    }

    const versions = Array.isArray(response?.data)
      ? response.data
          .map((file) => normalizeVersion(file))
          .filter((entry) => matchesVersionFilters(entry, { loader, gameVersion }))
      : [];

    versions.forEach((version) => {
      if (version?.id) {
        versionCache.set(version.id, version);
      }
    });

    versionsCache.set(cacheKey, versions);
    return versions;
  }

  /**
   * Fetches one specific CurseForge file/version and normalizes it.
   *
   * @param {string|number} versionId - CurseForge file id.
   * @returns {Promise<object>} Normalized version or error payload.
   */
  async function cfGetVersion(versionId) {
    const safeVersionId = String(versionId || "");
    if (!safeVersionId) {
      return createError("Missing version id.");
    }

    if (versionCache.has(safeVersionId)) {
      return versionCache.get(safeVersionId);
    }

    const response = await requestJson(`/mods/files/${encodeURIComponent(safeVersionId)}`);
    if (response.error) {
      return response;
    }

    const version = normalizeVersion(response?.data || {});
    versionCache.set(safeVersionId, version);
    return version;
  }

  /**
   * Performs a browser-safe JSON request against the anonymous CurseForge proxy.
   *
   * @param {string} path - API path including query string.
   * @returns {Promise<object>} Parsed response or error payload.
   */
  async function requestJson(path) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return createError(`CurseForge request failed (${response.status}).`);
      }

      return await response.json();
    } catch (error) {
      return createError(error instanceof Error ? error.message : "Network request failed.");
    }
  }

  /**
   * Normalizes one CurseForge project payload into the shared card format.
   *
   * @param {object} project - Raw CurseForge project.
   * @param {"mod"|"resourcepack"|"shader"} projectType - Resolved project type.
   * @returns {object} Normalized project.
   */
  function normalizeProject(project, projectType) {
    const safeProjectType = normalizeProjectType(projectType);
    const categories = Array.isArray(project?.categories)
      ? project.categories
          .map((category) => category?.slug || category?.name)
          .filter(Boolean)
      : [];
    const latestIndexes = [
      ...(Array.isArray(project?.latestFilesIndexes) ? project.latestFilesIndexes : []),
      ...(Array.isArray(project?.latestEarlyAccessFilesIndexes) ? project.latestEarlyAccessFilesIndexes : []),
    ];
    const versions = Array.from(
      new Set(
        latestIndexes
          .map((entry) => entry?.gameVersion)
          .filter(isMinecraftVersion)
      )
    );
    const loaders = Array.from(
      new Set(
        latestIndexes
          .map((entry) => mapLoaderType(entry?.modLoader))
          .filter(Boolean)
      )
    );
    const author = Array.isArray(project?.authors) && project.authors.length > 0
      ? project.authors.map((entry) => entry?.name).filter(Boolean).join(", ")
      : "Unknown author";
    const projectId = String(project?.id || "");
    const slug = String(project?.slug || projectId);

    return {
      slug,
      title: project?.name || "Unknown project",
      name: project?.name || "Unknown project",
      description: project?.summary || "",
      author,
      icon_url: project?.logo?.thumbnailUrl || project?.logo?.url || "",
      downloads: Number(project?.downloadCount || 0),
      follows: Number(project?.thumbsUpCount || 0),
      project_id: projectId,
      project_type: safeProjectType,
      versions,
      categories,
      display_categories: loaders,
      date_published: project?.dateReleased || project?.dateCreated || "",
      date_modified: project?.dateModified || project?.dateReleased || "",
      source: "curseforge",
      source_url: buildProjectUrl(safeProjectType, slug, projectId),
    };
  }

  /**
   * Normalizes one CurseForge file payload into the shared version shape.
   *
   * @param {object} file - Raw CurseForge file.
   * @returns {object} Normalized version.
   */
  function normalizeVersion(file) {
    const rawVersions = Array.isArray(file?.gameVersions) ? file.gameVersions : [];
    const mcVersions = Array.from(new Set(rawVersions.filter(isMinecraftVersion)));
    const parsedLoaders = Array.from(
      new Set([
        ...extractLoadersFromStrings(rawVersions),
        ...extractLoadersFromStrings(
          Array.isArray(file?.sortableGameVersions)
            ? file.sortableGameVersions.map((entry) => entry?.gameVersionName || entry?.gameVersion)
            : []
        ),
      ])
    );
    const primaryFile = file?.downloadUrl
      ? {
          url: file.downloadUrl,
          filename: file.fileName || `${file.displayName || file.id}.jar`,
          primary: true,
        }
      : null;

    return {
      id: String(file?.id || ""),
      version_number: file?.displayName || file?.fileName || "Unknown version",
      loaders: parsedLoaders,
      game_versions: mcVersions,
      date_published: file?.fileDate || "",
      release_type: RELEASE_TYPES[file?.releaseType] || "release",
      files: primaryFile ? [primaryFile] : [],
    };
  }

  /**
   * Checks whether a normalized version matches optional UI filters.
   *
   * @param {object} version - Normalized version.
   * @param {{loader:string, gameVersion:string}} filters - Active filters.
   * @returns {boolean} True when the version should be kept.
   */
  function matchesVersionFilters(version, filters) {
    const loader = String(filters?.loader || "").trim().toLowerCase();
    const gameVersion = String(filters?.gameVersion || "").trim();
    const matchesLoader = !loader
      || !Array.isArray(version?.loaders)
      || version.loaders.length === 0
      || version.loaders.includes(loader);
    const matchesGameVersion = !gameVersion
      || !Array.isArray(version?.game_versions)
      || version.game_versions.length === 0
      || version.game_versions.includes(gameVersion);
    return matchesLoader && matchesGameVersion;
  }

  /**
   * Converts a CurseForge class id into the app's project-type label.
   *
   * @param {number} classId - Raw CurseForge class id.
   * @returns {"mod"|"resourcepack"|"shader"} Project type.
   */
  function mapClassIdToProjectType(classId) {
    const numericClassId = Number(classId || 0);
    if (numericClassId === PROJECT_TYPE_CLASS_IDS.resourcepack) {
      return "resourcepack";
    }
    if (numericClassId === PROJECT_TYPE_CLASS_IDS.shader) {
      return "shader";
    }
    return "mod";
  }

  /**
   * Converts a CurseForge modLoaderType enum into the shared loader label.
   *
   * @param {number} value - CurseForge modLoaderType value.
   * @returns {string} Shared loader label or empty string.
   */
  function mapLoaderType(value) {
    const numericValue = Number(value || 0);
    if (numericValue === 1) {
      return "forge";
    }
    if (numericValue === 4) {
      return "fabric";
    }
    if (numericValue === 5) {
      return "quilt";
    }
    if (numericValue === 6) {
      return "neoforge";
    }
    return "";
  }

  /**
   * Extracts known loader labels from mixed version strings.
   *
   * @param {Array<string>} values - Mixed version/loader strings.
   * @returns {Array<string>} Shared loader labels.
   */
  function extractLoadersFromStrings(values) {
    return (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter((value) => ["fabric", "forge", "quilt", "neoforge"].includes(value));
  }

  /**
   * Detects whether a string looks like a Minecraft version instead of a loader tag.
   *
   * @param {string} value - Candidate version string.
   * @returns {boolean} True when the string looks like a Minecraft version.
   */
  function isMinecraftVersion(value) {
    return /^\d+\.\d+(\.\d+)?$/.test(String(value || "").trim());
  }

  /**
   * Builds the public CurseForge project URL for one normalized item.
   *
   * @param {"mod"|"resourcepack"|"shader"} projectType - Shared project type.
   * @param {string} slug - Project slug.
   * @param {string} projectId - Project id fallback.
   * @returns {string} Public CurseForge project URL.
   */
  function buildProjectUrl(projectType, slug, projectId) {
    const segment = PROJECT_TYPE_URL_SEGMENTS[normalizeProjectType(projectType)];
    return `https://www.curseforge.com/minecraft/${segment}/${slug || projectId}`;
  }

  /**
   * Normalizes incoming project-type labels.
   *
   * @param {string} projectType - Raw project type.
   * @returns {"mod"|"resourcepack"|"shader"} Safe project type.
   */
  function normalizeProjectType(projectType) {
    if (projectType === "resourcepack" || projectType === "shader") {
      return projectType;
    }
    return "mod";
  }

  /**
   * Creates a consistent error payload for CurseForge wrappers.
   *
   * @param {string} message - Human-readable error message.
   * @returns {{error:true, message:string}} Error payload.
   */
  function createError(message) {
    return {
      error: true,
      message,
    };
  }

  Object.assign(namespace, {
    cfSearchProjects,
    cfGetProject,
    cfGetProjectVersions,
    cfGetVersion,
  });
})();
