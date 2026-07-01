(function attachAuthCloudModule() {
  const namespace = window.PackTracker || {};
  const {
    AppState,
    notifyStateChanged,
    normalizeData,
    normalizeAppSettings,
    createDefaultAppSettings,
    createEmptyData,
    persistNormalizedData,
    cacheAppSettingsLocally,
  } = namespace;

  const CLOUD_SYNC_DEBOUNCE_MS = 320;
  const CONFIG_PLACEHOLDER_PATTERN = /^%[A-Z0-9_]+%$/;
  let supabaseClient = null;
  let authInitialized = false;
  let authSubscription = null;
  let syncTimerId = null;
  let syncChain = Promise.resolve();

  function createDefaultAuthState() {
    return {
      ready: false,
      enabled: false,
      signedIn: false,
      user: null,
      role: "",
      profile: null,
      lastError: "",
      cloudDataLoaded: false,
      cloudDataEmpty: false,
    };
  }

  function ensureAuthState() {
    if (!AppState.auth || typeof AppState.auth !== "object") {
      AppState.auth = createDefaultAuthState();
    }
    return AppState.auth;
  }

  function setAuthState(patch, reason = "auth") {
    AppState.auth = {
      ...createDefaultAuthState(),
      ...ensureAuthState(),
      ...patch,
    };
    if (typeof notifyStateChanged === "function") {
      notifyStateChanged(reason);
    }
  }

  function sanitizeConfigValue(value) {
    const safeValue = String(value || "").trim();
    if (!safeValue || CONFIG_PLACEHOLDER_PATTERN.test(safeValue)) {
      return "";
    }
    return safeValue;
  }

  function readMetaConfig(name) {
    return sanitizeConfigValue(document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "");
  }

  function readSupabaseConfig() {
    const globalConfig = window.PACKTRACKER_SUPABASE_CONFIG || window.__PACKTRACKER_SUPABASE__ || {};
    const url = sanitizeConfigValue(globalConfig.url || globalConfig.supabaseUrl || readMetaConfig("packtracker-supabase-url"));
    const anonKey = sanitizeConfigValue(globalConfig.anonKey || globalConfig.supabaseAnonKey || readMetaConfig("packtracker-supabase-anon-key"));
    return {
      url,
      anonKey,
    };
  }

  async function initializeCloudAuth() {
    if (authInitialized) {
      return ensureAuthState();
    }
    authInitialized = true;

    const config = readSupabaseConfig();
    if (!window.supabase?.createClient || !config.url || !config.anonKey) {
      setAuthState({
        ready: true,
        enabled: false,
        signedIn: false,
        lastError: "",
      }, "auth-init");
      return AppState.auth;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      setAuthState({
        ready: true,
        enabled: true,
        signedIn: false,
        lastError: error.message || "Could not restore account session.",
      }, "auth-init");
      return AppState.auth;
    }

    await hydrateSessionState(data?.session || null, "auth-init");

    const subscriptionResult = supabaseClient.auth.onAuthStateChange((_event, session) => {
      void hydrateSessionState(session, "auth-session");
    });
    authSubscription = subscriptionResult?.data?.subscription || null;
    return AppState.auth;
  }

  async function refreshCloudSessionState(reason = "auth-refresh") {
    if (!supabaseClient) {
      return ensureAuthState();
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      setAuthState({
        ready: true,
        enabled: true,
        signedIn: false,
        lastError: error.message || "Could not refresh account session.",
      }, reason);
      return AppState.auth;
    }

    return hydrateSessionState(data?.session || null, reason);
  }

  async function hydrateSessionState(session, reason = "auth") {
    if (!session?.user) {
      setAuthState({
        ready: true,
        enabled: Boolean(supabaseClient),
        signedIn: false,
        user: null,
        role: "",
        profile: null,
      }, reason);
      return AppState.auth;
    }

    const [role, profile] = await Promise.all([
      fetchCurrentUserRole(session.user.id),
      fetchOwnAccountProfile(session.user.id),
    ]);

    setAuthState({
      ready: true,
      enabled: true,
      signedIn: true,
      user: {
        id: session.user.id,
        email: session.user.email || "",
      },
      role,
      profile,
      lastError: "",
    }, reason);
    return AppState.auth;
  }

  async function fetchCurrentUserRole(userId) {
    if (!supabaseClient || !userId) {
      return "";
    }

    const { data, error } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("PackTracker: failed to load account role", error);
      return "";
    }

    return String(data?.role || "").trim().toLowerCase();
  }

  async function fetchOwnAccountProfile(userId) {
    if (!supabaseClient || !userId) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from("account_profiles")
      .select("user_id, email, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("PackTracker: failed to load account profile", error);
      return null;
    }

    return data || null;
  }

  function hasSupabaseConfig() {
    return Boolean(supabaseClient);
  }

  function hasActiveCloudUser() {
    return Boolean(supabaseClient && AppState.auth?.signedIn && AppState.auth?.user?.id);
  }

  function isSignedInToCloud() {
    return Boolean(hasActiveCloudUser() && AppState.auth?.cloudDataLoaded);
  }

  function scheduleCloudSync() {
    if (!isSignedInToCloud()) {
      return;
    }

    if (syncTimerId && typeof window !== "undefined") {
      window.clearTimeout(syncTimerId);
    }

    if (typeof window === "undefined") {
      void queueCloudSync();
      return;
    }

    syncTimerId = window.setTimeout(() => {
      syncTimerId = null;
      void queueCloudSync();
    }, CLOUD_SYNC_DEBOUNCE_MS);
  }

  function queueCloudSync() {
    syncChain = syncChain
      .catch(() => {})
      .then(() => persistCloudBundle(AppState.data || createEmptyData(), AppState.settings || createDefaultAppSettings()));
    return syncChain;
  }

  async function persistCloudBundle(data, settings) {
    if (!hasActiveCloudUser()) {
      return;
    }

    const userId = AppState.auth.user.id;
    const normalizedData = normalizeData(data || createEmptyData());
    const normalizedSettings = normalizeAppSettings(settings || createDefaultAppSettings());
    const profileRows = [];
    const itemRows = [];

    (Array.isArray(normalizedData.profiles) ? normalizedData.profiles : []).forEach((profile, profileIndex) => {
      profileRows.push({
        id: String(profile.id),
        user_id: userId,
        name: String(profile.name || "New profile"),
        mc_version: String(profile.mcVersion || ""),
        loader: String(profile.loader || "fabric"),
        loader_version: String(profile.loaderVersion || ""),
        created_at_ms: Number(profile.createdAt || Date.now()) || Date.now(),
        profile_order: profileIndex,
      });

      [
        ["mod", Array.isArray(profile.mods) ? profile.mods : []],
        ["resourcepack", Array.isArray(profile.resourcePacks) ? profile.resourcePacks : []],
        ["shader", Array.isArray(profile.shaders) ? profile.shaders : []],
      ].forEach(([itemType, items]) => {
        items.forEach((item, itemIndex) => {
          itemRows.push({
            id: String(item.id),
            profile_id: String(profile.id),
            user_id: userId,
            item_type: itemType,
            sort_order: itemIndex,
            payload: item,
          });
        });
      });
    });

    const [{ data: existingProfiles, error: profilesReadError }, { data: existingItems, error: itemsReadError }] = await Promise.all([
      supabaseClient.from("profiles").select("id").eq("user_id", userId),
      supabaseClient.from("profile_items").select("id").eq("user_id", userId),
    ]);

    if (profilesReadError) {
      throw new Error(profilesReadError.message || "Could not read existing cloud profiles.");
    }
    if (itemsReadError) {
      throw new Error(itemsReadError.message || "Could not read existing cloud items.");
    }

    const nextProfileIds = new Set(profileRows.map((entry) => entry.id));
    const nextItemIds = new Set(itemRows.map((entry) => entry.id));
    const staleProfileIds = (existingProfiles || []).map((entry) => String(entry.id || "")).filter((id) => id && !nextProfileIds.has(id));
    const staleItemIds = (existingItems || []).map((entry) => String(entry.id || "")).filter((id) => id && !nextItemIds.has(id));

    if (staleItemIds.length > 0) {
      const { error } = await supabaseClient.from("profile_items").delete().in("id", staleItemIds);
      if (error) {
        throw new Error(error.message || "Could not remove stale cloud items.");
      }
    }

    if (staleProfileIds.length > 0) {
      const { error } = await supabaseClient.from("profiles").delete().in("id", staleProfileIds);
      if (error) {
        throw new Error(error.message || "Could not remove stale cloud profiles.");
      }
    }

    if (profileRows.length > 0) {
      const { error } = await supabaseClient.from("profiles").upsert(profileRows, { onConflict: "id" });
      if (error) {
        throw new Error(error.message || "Could not save cloud profiles.");
      }
    }

    if (itemRows.length > 0) {
      const { error } = await supabaseClient.from("profile_items").upsert(itemRows, { onConflict: "id" });
      if (error) {
        throw new Error(error.message || "Could not save cloud items.");
      }
    }

    const { error: settingsError } = await supabaseClient
      .from("user_settings")
      .upsert({
        user_id: userId,
        settings: normalizedSettings,
      }, { onConflict: "user_id" });

    if (settingsError) {
      throw new Error(settingsError.message || "Could not save cloud settings.");
    }

    setAuthState({
      cloudDataLoaded: true,
      cloudDataEmpty: profileRows.length === 0 && itemRows.length === 0,
      lastError: "",
    }, "auth-sync");
  }

  async function loadCloudBootstrap() {
    if (!isSignedInToCloud()) {
      return null;
    }

    const userId = AppState.auth.user.id;
    const [{ data: profiles, error: profilesError }, { data: items, error: itemsError }, { data: settingsRow, error: settingsError }] = await Promise.all([
      supabaseClient
        .from("profiles")
        .select("id, name, mc_version, loader, loader_version, created_at_ms, profile_order")
        .eq("user_id", userId)
        .order("profile_order", { ascending: true }),
      supabaseClient
        .from("profile_items")
        .select("id, profile_id, item_type, sort_order, payload")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabaseClient
        .from("user_settings")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (profilesError) {
      throw new Error(profilesError.message || "Could not load cloud profiles.");
    }
    if (itemsError) {
      throw new Error(itemsError.message || "Could not load cloud items.");
    }
    if (settingsError) {
      throw new Error(settingsError.message || "Could not load cloud settings.");
    }

    const nextData = buildLocalDataFromCloud(profiles || [], items || []);
    const nextSettings = settingsRow?.settings ? normalizeAppSettings(settingsRow.settings) : null;
    setAuthState({
      cloudDataLoaded: true,
      cloudDataEmpty: nextData.profiles.length === 0,
      lastError: "",
    }, "auth-cloud-load");
    return {
      data: nextData,
      settings: nextSettings,
      cloudEmpty: nextData.profiles.length === 0,
    };
  }

  function buildLocalDataFromCloud(profiles, items) {
    const profileMap = new Map();
    (Array.isArray(profiles) ? profiles : []).forEach((profile) => {
      profileMap.set(String(profile.id), {
        id: String(profile.id),
        name: String(profile.name || "New profile"),
        mcVersion: String(profile.mc_version || ""),
        loader: String(profile.loader || "fabric"),
        loaderVersion: String(profile.loader_version || ""),
        createdAt: Number(profile.created_at_ms || Date.now()) || Date.now(),
        mods: [],
        resourcePacks: [],
        shaders: [],
      });
    });

    (Array.isArray(items) ? items : []).forEach((item) => {
      const profile = profileMap.get(String(item.profile_id || ""));
      if (!profile) {
        return;
      }
      const payload = item?.payload && typeof item.payload === "object"
        ? { ...item.payload }
        : {};
      if (item.item_type === "mod") {
        profile.mods.push(payload);
      } else if (item.item_type === "resourcepack") {
        profile.resourcePacks.push(payload);
      } else if (item.item_type === "shader") {
        profile.shaders.push(payload);
      }
    });

    return normalizeData({
      version: 2,
      profiles: Array.from(profileMap.values()),
    });
  }

  async function importLocalStateToCloud(localData, localSettings) {
    await persistCloudBundle(localData, localSettings);
    persistNormalizedData(normalizeData(localData));
    cacheAppSettingsLocally(normalizeAppSettings(localSettings));
  }

  async function signUpCloudAccount(email, password) {
    if (!supabaseClient) {
      throw new Error("Supabase is not configured yet.");
    }

    const { error } = await supabaseClient.auth.signUp({
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    if (error) {
      throw new Error(error.message || "Could not create account.");
    }
  }

  async function signInCloudAccount(email, password) {
    if (!supabaseClient) {
      throw new Error("Supabase is not configured yet.");
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    if (error) {
      throw new Error(error.message || "Could not sign in.");
    }
  }

  async function signOutCloudAccount() {
    if (!supabaseClient) {
      return;
    }

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw new Error(error.message || "Could not sign out.");
    }
  }

  async function listAdminAccounts() {
    if (!supabaseClient) {
      throw new Error("Supabase is not configured yet.");
    }
    if (AppState.auth?.role !== "admin") {
      throw new Error("Admin access is required.");
    }

    const [{ data: accounts, error: accountsError }, { data: roles, error: rolesError }] = await Promise.all([
      supabaseClient
        .from("account_profiles")
        .select("user_id, email, created_at")
        .order("created_at", { ascending: false }),
      supabaseClient
        .from("user_roles")
        .select("user_id, role"),
    ]);

    if (accountsError) {
      throw new Error(accountsError.message || "Could not load accounts.");
    }
    if (rolesError) {
      throw new Error(rolesError.message || "Could not load account roles.");
    }

    const roleMap = new Map((roles || []).map((entry) => [String(entry.user_id || ""), String(entry.role || "")]));
    return (accounts || []).map((entry) => ({
      userId: String(entry.user_id || ""),
      email: String(entry.email || ""),
      createdAt: String(entry.created_at || ""),
      role: roleMap.get(String(entry.user_id || "")) || "",
    }));
  }

  Object.assign(namespace, {
    initializeCloudAuth,
    refreshCloudSessionState,
    hasSupabaseConfig,
    isSignedInToCloud,
    loadCloudBootstrap,
    scheduleCloudSync,
    importLocalStateToCloud,
    signUpCloudAccount,
    signInCloudAccount,
    signOutCloudAccount,
    listAdminAccounts,
  });
})();
