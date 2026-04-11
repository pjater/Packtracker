(function attachModrinthModule() {
const namespace = window.PackTracker;
const API_BASE_URL = "https://api.modrinth.com/v2";
const SEARCH_PAGE_SIZE = 20;
const RELEASE_VERSION_LIMIT = 24;
const FALLBACK_GAME_VERSIONS = ["1.21.6", "1.21.5", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4"];

const searchCache = new Map();
const projectCache = new Map();
const versionCache = new Map();
const versionsListCache = new Map();
let gameVersionsCache = null;

/**
 * Searches Modrinth projects using the public search endpoint.
 *
 * @param {{query:string, projectType:string, loader:string, gameVersion:string, offset?:number}} options - Search options.
 * @returns {Promise<object>} Search response or error payload.
 */
async function searchProjects({
  query,
  projectType,
  loader,
  gameVersion,
  offset = 0,
}) {
  const safeQuery = String(query || "").trim();
  const safeType = String(projectType || "mod");
  const safeLoader = String(loader || "").trim().toLowerCase();
  const safeVersion = String(gameVersion || "").trim();
  const facets = buildSearchFacets(safeType, safeLoader, safeVersion);
  const cacheKey = JSON.stringify({
    query: safeQuery,
    projectType: safeType,
    loader: safeLoader,
    gameVersion: safeVersion,
    offset,
  });

  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    query: safeQuery,
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset),
    facets: JSON.stringify(facets),
  });

  if (!safeQuery) {
    params.set("index", "downloads");
  }

  const response = await requestJson(`/search?${params.toString()}`);
  if (!response.error) {
    searchCache.set(cacheKey, response);
  }
  return response;
}

/**
 * Fetches full project details for a single Modrinth project id.
 *
 * @param {string} projectId - Modrinth project identifier.
 * @returns {Promise<object>} Project details or error payload.
 */
async function getProject(projectId) {
  const safeId = String(projectId || "");
  if (!safeId) {
    return createError("Missing project id.");
  }

  if (projectCache.has(safeId)) {
    return projectCache.get(safeId);
  }

  const response = await requestJson(`/project/${encodeURIComponent(safeId)}`);
  if (!response.error) {
    projectCache.set(safeId, response);
  }
  return response;
}

/**
 * Fetches project versions with optional loader and game-version filtering.
 *
 * @param {string} projectId - Modrinth project identifier.
 * @param {{loader?:string, gameVersion?:string}} options - Optional filters.
 * @returns {Promise<Array<object>|object>} Array of versions or error payload.
 */
async function getProjectVersions(projectId, options = {}) {
  const safeId = String(projectId || "");
  if (!safeId) {
    return createError("Missing project id.");
  }

  const loader = String(options.loader || "").trim().toLowerCase();
  const gameVersion = String(options.gameVersion || "").trim();
  const cacheKey = JSON.stringify({ projectId: safeId, loader, gameVersion });
  if (versionsListCache.has(cacheKey)) {
    return versionsListCache.get(cacheKey);
  }

  const params = new URLSearchParams();
  if (loader) {
    params.set("loaders", JSON.stringify([loader]));
  }
  if (gameVersion) {
    params.set("game_versions", JSON.stringify([gameVersion]));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await requestJson(`/project/${encodeURIComponent(safeId)}/version${suffix}`);
  if (!response.error) {
    const versions = Array.isArray(response) ? response : [];
    versions.forEach((version) => {
      if (version?.id) {
        versionCache.set(version.id, version);
      }
    });
    versionsListCache.set(cacheKey, versions);
    return versions;
  }

  return response;
}

/**
 * Fetches a single Modrinth version payload.
 *
 * @param {string} versionId - Modrinth version identifier.
 * @returns {Promise<object>} Version payload or error payload.
 */
async function getVersion(versionId) {
  const safeId = String(versionId || "");
  if (!safeId) {
    return createError("Missing version id.");
  }

  if (versionCache.has(safeId)) {
    return versionCache.get(safeId);
  }

  const response = await requestJson(`/version/${encodeURIComponent(safeId)}`);
  if (!response.error) {
    versionCache.set(safeId, response);
  }
  return response;
}

/**
 * Fetches multiple projects in one request for dependency resolution.
 *
 * @param {Array<string>} projectIds - Modrinth project identifiers.
 * @returns {Promise<Array<object>|object>} Projects array or error payload.
 */
async function getProjects(projectIds) {
  const ids = Array.isArray(projectIds)
    ? projectIds.map((projectId) => String(projectId)).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(ids));
  const cachedProjects = [];
  const missingIds = [];

  uniqueIds.forEach((id) => {
    if (projectCache.has(id)) {
      cachedProjects.push(projectCache.get(id));
    } else {
      missingIds.push(id);
    }
  });

  if (missingIds.length === 0) {
    return cachedProjects;
  }

  const params = new URLSearchParams({
    ids: JSON.stringify(missingIds),
  });
  const response = await requestJson(`/projects?${params.toString()}`);
  if (response.error) {
    return response;
  }

  const fetchedProjects = Array.isArray(response) ? response : [];
  fetchedProjects.forEach((project) => {
    if (project?.id) {
      projectCache.set(project.id, project);
    }
  });
  return [...cachedProjects, ...fetchedProjects];
}

/**
 * Resolves dependency metadata for a specific version using supported version data.
 *
 * @param {string} versionId - Modrinth version identifier.
 * @returns {Promise<{projects:Array<object>, versions:Array<object>, dependencies:Array<object>}|object>} Dependency details or error payload.
 */
async function getDependencies(versionId) {
  const version = await getVersion(versionId);
  if (version.error) {
    return version;
  }

  const dependencies = Array.isArray(version?.dependencies) ? version.dependencies : [];
  const versionIds = dependencies
    .map((dependency) => dependency?.version_id)
    .filter(Boolean);
  const projectIds = dependencies
    .map((dependency) => dependency?.project_id)
    .filter(Boolean);

  const versionResponses = await Promise.all(versionIds.map((dependencyVersionId) => getVersion(dependencyVersionId)));
  const resolvedVersions = versionResponses.filter((entry) => !entry.error);
  resolvedVersions.forEach((resolvedVersion) => {
    if (resolvedVersion?.project_id) {
      projectIds.push(resolvedVersion.project_id);
    }
  });

  const resolvedProjects = await getProjects(projectIds);
  if (resolvedProjects.error) {
    return resolvedProjects;
  }

  return {
    projects: Array.isArray(resolvedProjects) ? resolvedProjects : [],
    versions: resolvedVersions,
    dependencies,
  };
}

/**
 * Fetches release versions for the search filter with a static fallback.
 *
 * @returns {Promise<Array<string>>} Minecraft release versions.
 */
async function getGameVersions() {
  if (gameVersionsCache) {
    return gameVersionsCache;
  }

  const response = await requestJson("/tag/game_version");
  if (response.error) {
    gameVersionsCache = FALLBACK_GAME_VERSIONS;
    return gameVersionsCache;
  }

  const versions = Array.isArray(response)
    ? response
        .filter((entry) => entry?.version_type === "release")
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, RELEASE_VERSION_LIMIT)
        .map((entry) => entry.version)
    : [];

  gameVersionsCache = versions.length > 0 ? versions : FALLBACK_GAME_VERSIONS;
  return gameVersionsCache;
}

/**
 * Performs a JSON request against the Modrinth API with browser-safe headers.
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
      return createError(`Modrinth request failed (${response.status}).`);
    }

    return await response.json();
  } catch (error) {
    return createError(error instanceof Error ? error.message : "Network request failed.");
  }
}

/**
 * Builds the Modrinth search facets array from the current filter state.
 *
 * @param {string} projectType - Project type filter.
 * @param {string} loader - Loader facet filter.
 * @param {string} gameVersion - Game version facet filter.
 * @returns {Array<Array<string>>} Facet matrix.
 */
function buildSearchFacets(projectType, loader, gameVersion) {
  const facets = [[`project_type:${projectType}`]];
  if (loader) {
    facets.push([`categories:${loader}`]);
  }
  if (gameVersion) {
    facets.push([`versions:${gameVersion}`]);
  }
  return facets;
}

/**
 * Creates a consistent error payload for Modrinth wrappers.
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
  searchProjects,
  getProject,
  getProjectVersions,
  getVersion,
  getProjects,
  getDependencies,
  getGameVersions,
});
})();
