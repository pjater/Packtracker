(function attachAddonModule() {
  const namespace = window.PackTracker = window.PackTracker || {};
  const { AppState, updateAppSettings } = namespace;
  const SUPPORTED_CONFIG_FIELD_TYPES = ["toggle", "select", "text", "range", "color"];
  const SUPPORTED_HOOK_KEYS = ["visualTokens", "sourceLabels", "profileDefaults", "favoritesActions", "templatePresets"];
  const DEFAULT_SOURCE_LABELS = {
    modrinth: {
      full: "Modrinth",
      compact: "MR",
      icon: "◆",
    },
    curseforge: {
      full: "CurseForge",
      compact: "CF",
      icon: "⬢",
    },
  };
  const BUILT_IN_PROFILE_TEMPLATES = [
    {
      id: "cobblemon",
      name: "Cobblemon Server",
      description: "Fabric 1.21.1 starter preset aimed at Cobblemon servers.",
      mcVersion: "1.21.1",
      loader: "fabric",
      requiredProjects: ["Cobblemon"],
      suggestedProjects: ["Fabric API", "YetAnotherConfigLib"],
      tags: ["server", "modded"],
    },
    {
      id: "donutsmp",
      name: "DonutSMP Voice Starter",
      description: "Fabric 1.21.1 preset for server packs that rely on voice chat and utility mods.",
      mcVersion: "1.21.1",
      loader: "fabric",
      requiredProjects: ["Simple Voice Chat"],
      suggestedProjects: ["Fabric API", "Mod Menu"],
      tags: ["server", "community"],
    },
  ];
  const BUNDLED_ADDONS = [
    {
      id: "source-label-branding",
      name: "Source Label Branding",
      description: "Customize how Modrinth and CurseForge labels appear across PackTracker browse controls.",
      author: "PackTracker",
      version: "1.0.0",
      type: "bundled",
      category: "browse",
      experimental: false,
      supportedScreens: ["search", "settings"],
      permissions: ["ui:source-labels"],
      configSchema: [
        {
          key: "displayMode",
          type: "select",
          label: "Label style",
          description: "Switch between full names, compact badges, or icon-style source labels.",
          options: [
            { value: "full", label: "Full names" },
            { value: "compact", label: "Compact badges" },
            { value: "icon", label: "Icon style" },
          ],
          defaultValue: "compact",
        },
      ],
      defaultConfig: {
        displayMode: "compact",
      },
      entryHooks: {
        sourceLabels: {
          modeConfigKey: "displayMode",
          sources: DEFAULT_SOURCE_LABELS,
        },
      },
    },
    {
      id: "surface-accent-effects",
      name: "Surface Accent Effects",
      description: "Adds addon-controlled tint, outline, and glow layers to PackTracker panels and cards.",
      author: "PackTracker",
      version: "1.0.0",
      type: "bundled",
      category: "visual",
      experimental: false,
      configSaveMode: "manual",
      supportedScreens: ["home", "search", "settings"],
      permissions: ["theme:variables"],
      configSchema: [
        {
          key: "tintEnabled",
          type: "toggle",
          label: "Panel tint",
          description: "Blend a soft accent tint into large surfaces.",
          defaultValue: true,
        },
        {
          key: "tintColor",
          type: "color",
          label: "Tint color",
          description: "Choose the highlight color used for panel tinting.",
          defaultValue: "#1ad969",
        },
        {
          key: "tintStrength",
          type: "range",
          label: "Tint strength",
          description: "Controls how visible the panel tint feels.",
          min: 0,
          max: 24,
          step: 1,
          defaultValue: 12,
        },
        {
          key: "outlineColor",
          type: "color",
          label: "Outline color",
          description: "Color used for addon-driven card outlines.",
          defaultValue: "#38bdf8",
        },
        {
          key: "glowStrength",
          type: "range",
          label: "Glow strength",
          description: "Controls how strong the addon glow is around surfaces.",
          min: 0,
          max: 36,
          step: 1,
          defaultValue: 14,
        },
      ],
      defaultConfig: {
        tintEnabled: true,
        tintColor: "#1ad969",
        tintStrength: 12,
        outlineColor: "#38bdf8",
        glowStrength: 14,
      },
      entryHooks: {
        visualTokens: {
          tintEnabledConfigKey: "tintEnabled",
          tintColorConfigKey: "tintColor",
          tintStrengthConfigKey: "tintStrength",
          outlineColorConfigKey: "outlineColor",
          glowStrengthConfigKey: "glowStrength",
        },
      },
    },
    {
      id: "modded-server-presets",
      name: "Modded Server Presets",
      description: "Registers built-in server templates and can prefill new profile defaults from one preset.",
      author: "PackTracker",
      version: "1.0.0",
      type: "bundled",
      category: "profiles",
      experimental: false,
      supportedScreens: ["home", "settings"],
      permissions: ["profiles:defaults", "profiles:templates"],
      configSchema: [
        {
          key: "featuredTemplate",
          type: "select",
          label: "Default new-profile preset",
          description: "Optionally prefill new profile fields from one built-in server template.",
          options: [
            { value: "none", label: "None" },
            { value: "cobblemon", label: "Cobblemon Server" },
            { value: "donutsmp", label: "DonutSMP Voice Starter" },
          ],
          defaultValue: "none",
        },
      ],
      defaultConfig: {
        featuredTemplate: "none",
      },
      entryHooks: {
        profileDefaults: {
          templateConfigKey: "featuredTemplate",
        },
        templatePresets: BUILT_IN_PROFILE_TEMPLATES,
        favoritesActions: [
          {
            id: "favorites-update-queue",
            label: "Queue favorites updates",
            description: "Reserved addon hook for future favorites update workflows.",
          },
        ],
      },
    },
  ];

  let runtimeState = createEmptyRuntimeState();

  function createEmptyRuntimeState() {
    return {
      entries: [],
      registryById: {},
      statusById: {},
      activeAddonIds: [],
      sourceLabelMode: "full",
      sourceLabels: { ...DEFAULT_SOURCE_LABELS },
      visualTokens: {
        panelTint: "transparent",
        panelOutline: "transparent",
        cardGlow: "transparent",
      },
      profileDefaults: {},
      favoriteActions: [],
      templatePresets: [],
    };
  }

  function initializeAddonRuntime() {
    runtimeState = buildAddonRuntime(AppState.settings || {});
    namespace.AddonRuntime = runtimeState;
    return runtimeState;
  }

  function refreshAddonRuntime() {
    return initializeAddonRuntime();
  }

  function getAddonRuntimeState() {
    if (!runtimeState || !Array.isArray(runtimeState.entries)) {
      return initializeAddonRuntime();
    }
    return runtimeState;
  }

  function buildAddonRuntime(settings) {
    const addonSettings = ensureAddonSettings(settings);
    const runtime = createEmptyRuntimeState();
    const entries = buildRegistryEntries(addonSettings);
    const duplicateIds = findDuplicateIds(entries.map((entry) => entry.manifest.id).filter(Boolean));
    const installedById = new Map(
      addonSettings.installed.map((entry) => [entry.id, entry])
    );

    entries.forEach((entry) => {
      const manifest = entry.manifest;
      if (!manifest.id) {
        return;
      }
      const duplicateError = duplicateIds.has(manifest.id)
        ? [`Duplicate addon id '${manifest.id}' detected.`]
        : [];
      const errors = [...entry.errors, ...duplicateError];
      const installedRecord = installedById.get(manifest.id) || null;
      const effectiveConfig = applyConfigSchemaDefaults(
        manifest.configSchema,
        manifest.defaultConfig,
        addonSettings.configById[manifest.id]
      );
      const status = {
        installed: Boolean(installedRecord),
        enabled: Boolean(installedRecord && installedRecord.enabled !== false),
        active: false,
        type: manifest.type,
        experimental: manifest.experimental,
        valid: errors.length === 0,
        errors,
        warnings: [],
        hasConfig: manifest.configSchema.length > 0,
        effectiveConfig,
      };
      runtime.registryById[manifest.id] = manifest;
      runtime.statusById[manifest.id] = status;
      runtime.entries.push({
        manifest,
        status,
        effectiveConfig,
        installedAt: installedRecord?.installedAt || 0,
      });
    });

    const activeCandidates = runtime.entries
      .filter((entry) => entry.status.installed && entry.status.enabled)
      .sort((left, right) => left.installedAt - right.installedAt);

    activeCandidates.forEach((entry) => {
      if (!entry.status.valid) {
        return;
      }
      try {
        applyAddonHooks(runtime, entry.manifest, entry.effectiveConfig);
        entry.status.active = true;
        runtime.activeAddonIds.push(entry.manifest.id);
      } catch (error) {
        entry.status.errors.push(error instanceof Error ? error.message : "Addon runtime failed.");
        entry.status.active = false;
      }
    });

    return runtime;
  }

  function buildRegistryEntries(addonSettings) {
    const bundledEntries = BUNDLED_ADDONS.map((manifest) => validateAddonManifest(manifest, "bundled"));
    const customEntries = addonSettings.customRegistry.map((manifest) => validateAddonManifest(manifest, "custom"));
    return [...bundledEntries, ...customEntries];
  }

  function validateAddonManifest(candidate, fallbackType) {
    const errors = [];
    const manifest = candidate && typeof candidate === "object" ? candidate : {};
    const configSchema = Array.isArray(manifest.configSchema)
      ? manifest.configSchema.map((field, index) => normalizeConfigField(field, index, errors)).filter(Boolean)
      : [];
    const supportedScreens = Array.isArray(manifest.supportedScreens)
      ? manifest.supportedScreens.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    const permissions = Array.isArray(manifest.permissions)
      ? manifest.permissions.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    const hookEntries = manifest.entryHooks && typeof manifest.entryHooks === "object" && !Array.isArray(manifest.entryHooks)
      ? manifest.entryHooks
      : {};
    const unsupportedHook = Object.keys(hookEntries).find((key) => !SUPPORTED_HOOK_KEYS.includes(key));
    if (unsupportedHook) {
      errors.push(`Unsupported hook '${unsupportedHook}'.`);
    }
    const type = String(manifest.type || fallbackType || "bundled").trim().toLowerCase() === "custom" ? "custom" : "bundled";
    const configSaveMode = String(manifest.configSaveMode || "immediate").trim().toLowerCase() === "manual" ? "manual" : "immediate";
    const id = String(manifest.id || "").trim();
    const name = String(manifest.name || "").trim();
    const version = String(manifest.version || "").trim();
    if (!id) {
      errors.push("Addon id is required.");
    }
    if (!name) {
      errors.push("Addon name is required.");
    }
    if (!version) {
      errors.push("Addon version is required.");
    }

    const normalizedManifest = {
      id,
      name,
      description: String(manifest.description || "").trim(),
      author: String(manifest.author || (type === "custom" ? "Custom addon" : "PackTracker")).trim(),
      version,
      type,
      category: String(manifest.category || "general").trim() || "general",
      configSaveMode,
      experimental: type === "custom" ? true : Boolean(manifest.experimental),
      supportedScreens,
      permissions,
      configSchema,
      defaultConfig: sanitizeJsonValue(manifest.defaultConfig) || {},
      entryHooks: normalizeEntryHooks(hookEntries, errors),
    };

    return {
      manifest: normalizedManifest,
      errors,
    };
  }

  function normalizeEntryHooks(entryHooks, errors) {
    const normalized = {};
    if (entryHooks.sourceLabels) {
      normalized.sourceLabels = {
        modeConfigKey: String(entryHooks.sourceLabels.modeConfigKey || "").trim(),
        sources: normalizeSourceLabelMap(entryHooks.sourceLabels.sources),
      };
    }
    if (entryHooks.visualTokens) {
      normalized.visualTokens = {
        tintEnabledConfigKey: String(entryHooks.visualTokens.tintEnabledConfigKey || "").trim(),
        tintColorConfigKey: String(entryHooks.visualTokens.tintColorConfigKey || "").trim(),
        tintStrengthConfigKey: String(entryHooks.visualTokens.tintStrengthConfigKey || "").trim(),
        outlineColorConfigKey: String(entryHooks.visualTokens.outlineColorConfigKey || "").trim(),
        glowStrengthConfigKey: String(entryHooks.visualTokens.glowStrengthConfigKey || "").trim(),
      };
    }
    if (entryHooks.profileDefaults) {
      normalized.profileDefaults = {
        name: String(entryHooks.profileDefaults.name || "").trim(),
        namePrefix: String(entryHooks.profileDefaults.namePrefix || "").trim(),
        mcVersion: String(entryHooks.profileDefaults.mcVersion || "").trim(),
        loader: normalizeLoader(entryHooks.profileDefaults.loader || ""),
        templateConfigKey: String(entryHooks.profileDefaults.templateConfigKey || "").trim(),
      };
    }
    if (Array.isArray(entryHooks.favoritesActions)) {
      normalized.favoritesActions = entryHooks.favoritesActions
        .map((action) => normalizeFavoriteAction(action))
        .filter((action) => action.id);
    }
    if (Array.isArray(entryHooks.templatePresets)) {
      normalized.templatePresets = entryHooks.templatePresets
        .map((preset) => normalizeTemplatePreset(preset))
        .filter((preset) => preset.id);
    }
    if (errors && normalized.templatePresets && entryHooks.profileDefaults?.templateConfigKey) {
      const configKey = String(entryHooks.profileDefaults.templateConfigKey || "").trim();
      if (configKey && normalized.templatePresets.length === 0) {
        errors.push("Profile defaults refer to a template selector but no template presets were provided.");
      }
    }
    return normalized;
  }

  function normalizeConfigField(field, index, errors) {
    const value = field && typeof field === "object" ? field : {};
    const type = String(value.type || "").trim().toLowerCase();
    const key = String(value.key || "").trim();
    if (!key) {
      errors.push(`Config field ${index + 1} is missing a key.`);
      return null;
    }
    if (!SUPPORTED_CONFIG_FIELD_TYPES.includes(type)) {
      errors.push(`Unsupported config field type '${type || "unknown"}' on '${key}'.`);
      return null;
    }
    const normalized = {
      key,
      type,
      label: String(value.label || key).trim(),
      description: String(value.description || "").trim(),
      min: Number.isFinite(Number(value.min)) ? Number(value.min) : 0,
      max: Number.isFinite(Number(value.max)) ? Number(value.max) : 100,
      step: Number.isFinite(Number(value.step)) ? Number(value.step) : 1,
      defaultValue: sanitizeJsonValue(value.defaultValue),
      placeholder: String(value.placeholder || "").trim(),
      options: [],
    };
    if (type === "select") {
      normalized.options = Array.isArray(value.options)
        ? value.options
          .map((option) => ({
            value: String(option?.value || "").trim(),
            label: String(option?.label || option?.value || "").trim(),
          }))
          .filter((option) => option.value)
        : [];
      if (normalized.options.length === 0) {
        errors.push(`Select config field '${key}' must provide options.`);
      }
    }
    return normalized;
  }

  function normalizeSourceLabelMap(candidate) {
    const sourceMap = candidate && typeof candidate === "object" ? candidate : {};
    return {
      modrinth: normalizeSingleSourceLabels(sourceMap.modrinth, DEFAULT_SOURCE_LABELS.modrinth),
      curseforge: normalizeSingleSourceLabels(sourceMap.curseforge, DEFAULT_SOURCE_LABELS.curseforge),
    };
  }

  function normalizeSingleSourceLabels(candidate, fallback) {
    const value = candidate && typeof candidate === "object" ? candidate : {};
    return {
      full: String(value.full || fallback.full).trim() || fallback.full,
      compact: String(value.compact || fallback.compact).trim() || fallback.compact,
      icon: String(value.icon || fallback.icon).trim() || fallback.icon,
    };
  }

  function normalizeFavoriteAction(action) {
    const value = action && typeof action === "object" ? action : {};
    return {
      id: String(value.id || "").trim(),
      label: String(value.label || "").trim(),
      description: String(value.description || "").trim(),
    };
  }

  function normalizeTemplatePreset(preset) {
    const value = preset && typeof preset === "object" ? preset : {};
    return {
      id: String(value.id || "").trim(),
      name: String(value.name || "").trim(),
      description: String(value.description || "").trim(),
      mcVersion: String(value.mcVersion || "").trim(),
      loader: normalizeLoader(value.loader || ""),
      requiredProjects: Array.isArray(value.requiredProjects) ? value.requiredProjects.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
      suggestedProjects: Array.isArray(value.suggestedProjects) ? value.suggestedProjects.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
      tags: Array.isArray(value.tags) ? value.tags.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
    };
  }

  function applyAddonHooks(runtime, manifest, config) {
    const hooks = manifest.entryHooks || {};
    if (hooks.sourceLabels) {
      runtime.sourceLabelMode = normalizeSourceDisplayMode(config[hooks.sourceLabels.modeConfigKey] || runtime.sourceLabelMode);
      runtime.sourceLabels = {
        modrinth: hooks.sourceLabels.sources?.modrinth || runtime.sourceLabels.modrinth,
        curseforge: hooks.sourceLabels.sources?.curseforge || runtime.sourceLabels.curseforge,
      };
    }
    if (hooks.visualTokens) {
      const tintEnabled = hooks.visualTokens.tintEnabledConfigKey
        ? config[hooks.visualTokens.tintEnabledConfigKey] !== false
        : true;
      const tintColor = normalizeHexColor(config[hooks.visualTokens.tintColorConfigKey]) || "#1ad969";
      const tintStrength = clampNumber(config[hooks.visualTokens.tintStrengthConfigKey], 0, 24, 0);
      const outlineColor = normalizeHexColor(config[hooks.visualTokens.outlineColorConfigKey]) || tintColor;
      const glowStrength = clampNumber(config[hooks.visualTokens.glowStrengthConfigKey], 0, 36, 0);
      runtime.visualTokens.panelTint = tintEnabled ? hexToRgba(tintColor, tintStrength / 100) : "transparent";
      runtime.visualTokens.panelOutline = hexToRgba(outlineColor, 0.22);
      runtime.visualTokens.cardGlow = glowStrength > 0 ? hexToRgba(outlineColor, Math.min(0.24, glowStrength / 100)) : "transparent";
    }
    if (Array.isArray(hooks.templatePresets)) {
      runtime.templatePresets = mergeTemplatePresets(runtime.templatePresets, hooks.templatePresets);
    }
    if (Array.isArray(hooks.favoritesActions)) {
      runtime.favoriteActions = [...runtime.favoriteActions, ...hooks.favoritesActions];
    }
    if (hooks.profileDefaults) {
      const templateConfigKey = hooks.profileDefaults.templateConfigKey;
      if (templateConfigKey) {
        const selectedTemplateId = String(config[templateConfigKey] || "").trim();
        const templateMatch = runtime.templatePresets.find((preset) => preset.id === selectedTemplateId);
        if (templateMatch && selectedTemplateId !== "none") {
          runtime.profileDefaults = {
            ...runtime.profileDefaults,
            name: templateMatch.name,
            mcVersion: templateMatch.mcVersion,
            loader: templateMatch.loader,
          };
        }
      }
      runtime.profileDefaults = {
        ...runtime.profileDefaults,
        ...(hooks.profileDefaults.name ? { name: hooks.profileDefaults.name } : {}),
        ...(hooks.profileDefaults.namePrefix ? { namePrefix: hooks.profileDefaults.namePrefix } : {}),
        ...(hooks.profileDefaults.mcVersion ? { mcVersion: hooks.profileDefaults.mcVersion } : {}),
        ...(hooks.profileDefaults.loader ? { loader: hooks.profileDefaults.loader } : {}),
      };
    }
  }

  function applyConfigSchemaDefaults(schema, defaultConfig, storedConfig) {
    const normalizedDefaults = sanitizeJsonValue(defaultConfig) || {};
    const normalizedStored = sanitizeJsonValue(storedConfig) || {};
    const output = {};
    schema.forEach((field) => {
      const fallback = Object.prototype.hasOwnProperty.call(normalizedDefaults, field.key)
        ? normalizedDefaults[field.key]
        : field.defaultValue;
      output[field.key] = coerceConfigValue(field, normalizedStored[field.key], fallback);
    });
    return output;
  }

  function coerceConfigValue(field, value, fallback) {
    const candidate = value === undefined ? fallback : value;
    if (field.type === "toggle") {
      return Boolean(candidate);
    }
    if (field.type === "color") {
      return normalizeHexColor(candidate) || normalizeHexColor(fallback) || "#1ad969";
    }
    if (field.type === "range") {
      return clampNumber(candidate, field.min, field.max, field.defaultValue ?? field.min);
    }
    if (field.type === "select") {
      const safe = String(candidate ?? fallback ?? "").trim();
      return field.options.some((option) => option.value === safe)
        ? safe
        : (field.options[0]?.value || "");
    }
    return String(candidate ?? fallback ?? "").trim();
  }

  function installBundledAddon(id) {
    const manifest = BUNDLED_ADDONS.find((entry) => entry.id === id);
    if (!manifest) {
      throw new Error("Bundled addon not found.");
    }
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    const alreadyInstalled = addonSettings.installed.some((entry) => entry.id === id);
    const nextInstalled = alreadyInstalled
      ? addonSettings.installed.map((entry) => entry.id === id ? { ...entry, enabled: true } : entry)
      : [...addonSettings.installed, { id, type: "bundled", enabled: true, installedAt: Date.now() }];
    const nextConfigById = {
      ...addonSettings.configById,
      [id]: applyConfigSchemaDefaults(
        validateAddonManifest(manifest, "bundled").manifest.configSchema,
        manifest.defaultConfig,
        addonSettings.configById[id]
      ),
    };
    return writeAddonSettings({
      ...addonSettings,
      installed: nextInstalled,
      configById: nextConfigById,
    });
  }

  function removeAddon(id) {
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    const installRecord = addonSettings.installed.find((entry) => entry.id === id);
    const nextInstalled = addonSettings.installed.filter((entry) => entry.id !== id);
    const nextConfigById = { ...addonSettings.configById };
    delete nextConfigById[id];
    let nextCustomRegistry = addonSettings.customRegistry;
    if (installRecord?.type === "custom" || addonSettings.customRegistry.some((entry) => String(entry?.id || "").trim() === id)) {
      nextCustomRegistry = addonSettings.customRegistry.filter((entry) => String(entry?.id || "").trim() !== id);
    }
    return writeAddonSettings({
      ...addonSettings,
      installed: nextInstalled,
      configById: nextConfigById,
      customRegistry: nextCustomRegistry,
    });
  }

  function setAddonEnabled(id, enabled) {
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    const hasRecord = addonSettings.installed.some((entry) => entry.id === id);
    const nextInstalled = hasRecord
      ? addonSettings.installed.map((entry) => entry.id === id ? { ...entry, enabled: Boolean(enabled) } : entry)
      : [...addonSettings.installed, { id, type: "bundled", enabled: Boolean(enabled), installedAt: Date.now() }];
    return writeAddonSettings({
      ...addonSettings,
      installed: nextInstalled,
    });
  }

  function updateAddonConfig(id, patch) {
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    const currentConfig = addonSettings.configById[id] && typeof addonSettings.configById[id] === "object"
      ? addonSettings.configById[id]
      : {};
    return writeAddonSettings({
      ...addonSettings,
      configById: {
        ...addonSettings.configById,
        [id]: {
          ...currentConfig,
          ...(patch && typeof patch === "object" ? patch : {}),
        },
      },
    });
  }

  async function importCustomAddonFile(file) {
    if (!(file instanceof File)) {
      throw new Error("Choose a JSON addon package first.");
    }
    const raw = await file.text();
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new Error("Custom addon JSON could not be parsed.");
    }
    return importCustomAddonPayload(payload);
  }

  function importCustomAddonPayload(payload) {
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    const parsed = validateAddonManifest({
      ...payload,
      type: "custom",
      experimental: true,
    }, "custom");
    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors.join(" "));
    }
    const duplicateInBundled = BUNDLED_ADDONS.some((entry) => entry.id === parsed.manifest.id);
    const duplicateInCustom = addonSettings.customRegistry.some((entry) => String(entry?.id || "").trim() === parsed.manifest.id);
    if (duplicateInBundled || duplicateInCustom) {
      throw new Error(`Addon id '${parsed.manifest.id}' already exists.`);
    }
    const nextCustomRegistry = [...addonSettings.customRegistry, parsed.manifest];
    const nextInstalled = [...addonSettings.installed, {
      id: parsed.manifest.id,
      type: "custom",
      enabled: false,
      installedAt: Date.now(),
    }];
    const nextConfigById = {
      ...addonSettings.configById,
      [parsed.manifest.id]: applyConfigSchemaDefaults(parsed.manifest.configSchema, parsed.manifest.defaultConfig, {}),
    };
    return writeAddonSettings({
      ...addonSettings,
      customRegistry: nextCustomRegistry,
      installed: nextInstalled,
      configById: nextConfigById,
    });
  }

  function setMarketplaceEnabled(enabled) {
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    return writeAddonSettings({
      ...addonSettings,
      marketplaceEnabled: Boolean(enabled),
    });
  }

  function setCustomAddonsExperimental(enabled) {
    const addonSettings = ensureAddonSettings(AppState.settings || {});
    return writeAddonSettings({
      ...addonSettings,
      customAddonsExperimental: Boolean(enabled),
    });
  }

  function getAddonProfileDefaults() {
    return { ...(getAddonRuntimeState().profileDefaults || {}) };
  }

  function getAddonProfileTemplates() {
    return [...getAddonRuntimeState().templatePresets];
  }

  function getBuiltInProfileTemplateRegistry() {
    return BUILT_IN_PROFILE_TEMPLATES.map((preset) => ({ ...preset }));
  }

  function getAddonMarketplaceEntries() {
    return getAddonRuntimeState().entries.map((entry) => ({
      manifest: entry.manifest,
      status: entry.status,
      effectiveConfig: entry.effectiveConfig,
      installedAt: entry.installedAt,
    }));
  }

  function formatAddonSourceLabel(source, options = {}) {
    const runtime = getAddonRuntimeState();
    const key = String(source || "modrinth").trim().toLowerCase() === "curseforge" ? "curseforge" : "modrinth";
    const labels = runtime.sourceLabels[key] || DEFAULT_SOURCE_LABELS[key];
    const mode = normalizeSourceDisplayMode(options.mode || runtime.sourceLabelMode);
    const baseLabel = labels[mode] || labels.full;
    const label = options.includeArrow ? `${baseLabel} ↗` : baseLabel;
    return {
      label,
      title: labels.full,
    };
  }

  function writeAddonSettings(nextAddonSettings) {
    if (typeof updateAppSettings !== "function") {
      throw new Error("Addon settings cannot be saved right now.");
    }
    AppState.settings = updateAppSettings({
      addons: nextAddonSettings,
    });
    return refreshAddonRuntime();
  }

  function ensureAddonSettings(settings) {
    if (settings?.addons && typeof settings.addons === "object") {
      return settings.addons;
    }
    return {
      marketplaceEnabled: true,
      customAddonsExperimental: false,
      installed: [],
      configById: {},
      customRegistry: [],
    };
  }

  function findDuplicateIds(ids) {
    const seen = new Set();
    const duplicates = new Set();
    ids.forEach((id) => {
      if (seen.has(id)) {
        duplicates.add(id);
        return;
      }
      seen.add(id);
    });
    return duplicates;
  }

  function mergeTemplatePresets(existing, incoming) {
    const next = [...existing];
    incoming.forEach((preset) => {
      if (!next.some((entry) => entry.id === preset.id)) {
        next.push(preset);
      }
    });
    return next;
  }

  function normalizeSourceDisplayMode(value) {
    const safe = String(value || "full").trim().toLowerCase();
    return ["full", "compact", "icon"].includes(safe) ? safe : "full";
  }

  function normalizeLoader(value) {
    const safe = String(value || "").trim().toLowerCase();
    return ["fabric", "forge", "neoforge", "vanilla"].includes(safe) ? safe : "";
  }

  function normalizeHexColor(value) {
    const safe = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(safe) ? safe.toLowerCase() : "";
  }

  function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return Number(fallback);
    }
    return Math.min(Number(max), Math.max(Number(min), numeric));
  }

  function hexToRgba(hex, alpha) {
    const normalized = normalizeHexColor(hex) || "#1ad969";
    const red = parseInt(normalized.slice(1, 3), 16);
    const green = parseInt(normalized.slice(3, 5), 16);
    const blue = parseInt(normalized.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, Number(alpha) || 0))})`;
  }

  function sanitizeJsonValue(value, depth = 0) {
    if (depth > 10) {
      return null;
    }
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => sanitizeJsonValue(entry, depth + 1))
        .filter((entry) => entry !== undefined);
    }
    if (value && typeof value === "object") {
      const output = {};
      Object.entries(value).forEach(([key, nestedValue]) => {
        const sanitized = sanitizeJsonValue(nestedValue, depth + 1);
        if (sanitized !== undefined) {
          output[String(key)] = sanitized;
        }
      });
      return output;
    }
    return undefined;
  }

  Object.assign(namespace, {
    initializeAddonRuntime,
    refreshAddonRuntime,
    getAddonRuntimeState,
    getAddonMarketplaceEntries,
    installBundledAddon,
    removeAddon,
    setAddonEnabled,
    updateAddonConfig,
    importCustomAddonFile,
    importCustomAddonPayload,
    setMarketplaceEnabled,
    setCustomAddonsExperimental,
    getAddonProfileDefaults,
    getAddonProfileTemplates,
    getBuiltInProfileTemplateRegistry,
    formatAddonSourceLabel,
  });
})();
