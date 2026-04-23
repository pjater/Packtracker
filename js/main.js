(function attachMainModule() {
  const {
    AppState,
    setActiveProfile,
    setActiveView,
    setBrowseContext,
    setData,
    setSearchSource,
    setSearchState,
    subscribe,
    exportBackup,
    loadAppSettings,
    updateAppSettings,
    resetAppSettings,
    recordAppVisit,
    parseShareLink,
    importBackup,
    loadData,
    renderSidebar,
    showNewProfileModal,
    renderProfileView,
    focusSearchInput,
    renderSearchPage,
    renderShareView,
    requestBrowseSearch,
    showShareImportModal,
    chooseDefaultDownloadDirectory,
    clearDefaultDownloadDirectory,
  } = window.PackTracker;

  const HOME_VIEW_ID = "view-home";
  const SEARCH_VIEW_ID = "view-search";
  const SHARE_VIEW_ID = "view-share";
  const APP_ROOT_ID = "app";
  const MODAL_ROOT_ID = "modal-root";
  const CONTEXT_ROOT_ID = "context-menu-root";
  const TOAST_ROOT_ID = "toast-root";
  const PAGE_ENTER_CLASS = "page-enter";
  const PAGE_EXIT_CLASS = "page-exit";
  const PAGE_EXIT_MS = 120;
  const PAGE_ENTER_MS = 240;
  const RELEASE_NOTES = {
    version: "2026.04.23",
    title: "PackTracker update",
    bullets: [
      "Browse, scan, and update flows now work more consistently across both Modrinth and CurseForge.",
      "Settings were expanded with a full Visual tab, accent color controls, more fonts, and appearance preferences.",
      "PackTracker can be installed as a standalone app window, with improved downloads, backups, and profile management flows.",
    ],
  };
  const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "zh", label: "Mandarin Chinese" },
    { value: "hi", label: "Hindi" },
    { value: "es", label: "Spanish" },
    { value: "ar", label: "Arabic" },
  ];
  const THEMES = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "System" },
  ];
  const FONT_STYLES = [
    { value: "default", label: "Default" },
    { value: "manrope", label: "Manrope" },
    { value: "poppins", label: "Poppins" },
    { value: "serif", label: "Merriweather" },
    { value: "monospace", label: "Monospace" },
  ];
  const DOWNLOAD_BEHAVIORS = [
    { value: "ask", labelKey: "askBrowserEachTime", label: "Ask each time" },
    { value: "default", labelKey: "saveDirectlyToDefaultFolder", label: "Save directly to default folder" },
  ];
  const TRANSLATIONS = {
    en: {
      installApp: "Install app",
      exportBackup: "Export backup",
      importBackup: "Import backup",
      settings: "Settings",
      profiles: "Profiles",
      newProfile: "＋ New profile",
      noProfilesTitle: "No profiles yet",
      noProfilesBody: "Create your first Minecraft profile and start collecting mods, resource packs, and shaders.",
      browseProjects: "Browse projects",
      importBackupLink: "import a backup",
      welcomeRestorePrefix: "Or ",
      welcomeRestoreSuffix: " to restore a previous session.",
      fatalTitle: "PackTracker could not load",
      general: "General",
      visual: "Visual",
      updates: "Updates",
      about: "About",
      onboarding: "Welcome to PackTracker",
      onboardingBody: "PackTracker helps you organize Minecraft mods, resource packs, and shaders per profile.",
      onboardingNext: "Next",
      onboardingSkip: "Skip",
      onboardingFinish: "Finish",
      languageExperimental: "Language",
      themeExperimental: "Theme",
      editOrder: "Edit order",
      done: "Done",
      favorites: "Favorites",
      starredItems: "Starred items",
      items: "items",
      noProfilesYetShort: "No profiles yet.",
      backToProfiles: "Back to profiles",
      browsePrefix: "Browse",
      searchPlaceholder: "Search mods, resource packs, and shaders...",
      searchingPrefix: "Searching",
      resultsSuffix: "results",
      loadMore: "Load more",
      noResultsYet: "No results yet. Try another search or browse the most popular projects.",
      shareProfile: "Share profile",
      scanMinecraftFolder: "Scan Minecraft Folder",
      starredFromAllProfiles: "Starred {label} from all profiles.",
      manageForThisProfile: "Manage {label} for this profile.",
      addViaBrowse: "+ Add via Browse",
      addManually: "+ Add manually",
      updateToVersion: "↻ Update to version",
      editLayout: "Edit layout",
      doneEditing: "Done editing",
      noModsYet: "No mods yet",
      noResourcePacksYet: "No resource packs yet",
      noShadersYet: "No shaders yet",
      emptyModsText: "Browse projects or add your first mod manually.",
      emptyResourcePacksText: "Browse projects or add your first resource pack manually.",
      emptyShadersText: "Browse projects or add your first shader manually.",
      mods: "Mods",
      resourcePacks: "Resource Packs",
      shaders: "Shaders",
      addMod: "+ Add mod",
      addResourcePack: "+ Add resource pack",
      addShader: "+ Add shader",
      downloadAsZip: "⬇ Download as ZIP",
      settingsIntro: "Choose how PackTracker looks, where downloads go, and how the app behaves on startup.",
      generalSettingsIntro: "Choose language, download preferences, and other app-wide behavior settings.",
      visualSettingsIntro: "Adjust theme, accent color, motion, blur, and other appearance settings for PackTracker.",
      defaultDownloadFolder: "Default download folder",
      downloadsFolderHintEmpty: "No default folder selected yet. Pick a normal folder or subfolder, not the Windows Downloads root.",
      currentFolderPrefix: "Current folder:",
      chooseFolder: "Choose folder",
      clearFolder: "Clear folder",
      downloadBehavior: "Download behavior",
      downloadBehaviorDefaultHelp: "PackTracker will try to save files directly into the chosen folder when the browser allows it.",
      downloadBehaviorAskHelp: "PackTracker will ask where to save direct downloads when the browser allows it. Bulk downloads may still use the browser's standard flow.",
      askBrowserEachTime: "Ask each time",
      switchToProviderExperimental: "Switch to {source}",
      saveDirectlyToDefaultFolder: "Save directly to default folder",
      resetAllSettings: "Reset all settings",
      resetSettingsHelp: "This resets language, theme, update prompts, onboarding state, and download preferences.",
      resetSettingsConfirmTitle: "Reset all settings?",
      resetSettingsConfirmBody: "This will reset language, theme, onboarding, update prompts, and default download behavior.",
      cancel: "Cancel",
      saveVisualSettings: "Save visual settings",
      visualSettingsSaved: "Visual settings saved.",
      accentColor: "Accent color",
      custom: "Custom",
      resetToDefault: "Reset to default",
      blurEffects: "Blur effects",
      reduceMotion: "Reduce motion",
      reduceMotionHelp: "Minimizes movement for performance and accessibility.",
      fontStyle: "Font style",
      contrastMode: "Contrast mode",
      contrastModeHelp: "Increase contrast for better readability.",
      highContrast: "High contrast",
      roundedCorners: "Rounded corners",
      roundedCornersHelp: "Controls how soft or sharp the app corners feel.",
      blurEffectsHelp: "Choose how strong overlay and panel blur should feel.",
      previewValuePx: "{value}px",
      themeDescription: "Choose whether the app follows a light, dark, or system appearance.",
      close: "Close",
    },
    zh: {
      installApp: "安装应用",
      exportBackup: "导出备份",
      importBackup: "导入备份",
      settings: "设置",
      profiles: "配置文件",
      newProfile: "＋ 新建配置",
      noProfilesTitle: "还没有配置文件",
      noProfilesBody: "创建你的第一个 Minecraft 配置，并开始整理模组、材质包和着色器。",
      browseProjects: "浏览项目",
      importBackupLink: "导入备份",
      welcomeRestorePrefix: "或者",
      welcomeRestoreSuffix: "来恢复之前的内容。",
      fatalTitle: "PackTracker 无法加载",
      general: "常规",
      updates: "更新",
      about: "关于",
      onboarding: "欢迎使用 PackTracker",
      onboardingBody: "PackTracker 可以按配置整理 Minecraft 模组、材质包和着色器。",
      onboardingNext: "下一步",
      onboardingSkip: "跳过",
      onboardingFinish: "完成",
      languageExperimental: "语言",
      themeExperimental: "主题",
      editOrder: "编辑顺序",
      done: "完成",
      favorites: "收藏",
      starredItems: "已收藏项目",
      items: "项",
      noProfilesYetShort: "还没有配置文件。",
      backToProfiles: "返回配置文件",
      browsePrefix: "浏览",
      searchPlaceholder: "搜索模组、材质包和着色器...",
      searchingPrefix: "正在搜索",
      resultsSuffix: "个结果",
      loadMore: "加载更多",
      noResultsYet: "还没有结果。试试别的搜索，或者浏览热门项目。",
      shareProfile: "分享配置",
      scanMinecraftFolder: "扫描 Minecraft 文件夹",
      addViaBrowse: "+ 通过浏览添加",
      addManually: "+ 手动添加",
      updateToVersion: "↻ 更新到版本",
      editLayout: "编辑布局",
      doneEditing: "完成编辑",
      noModsYet: "还没有模组",
      noResourcePacksYet: "还没有材质包",
      noShadersYet: "还没有着色器",
      mods: "模组",
      resourcePacks: "资源包",
      shaders: "着色器",
    },
    hi: {
      installApp: "ऐप इंस्टॉल करें",
      exportBackup: "बैकअप निर्यात करें",
      importBackup: "बैकअप आयात करें",
      settings: "सेटिंग्स",
      profiles: "प्रोफाइल",
      newProfile: "＋ नया प्रोफाइल",
      noProfilesTitle: "अभी कोई प्रोफाइल नहीं है",
      noProfilesBody: "अपना पहला Minecraft प्रोफाइल बनाएं और mods, resource packs और shaders इकट्ठा करना शुरू करें।",
      browseProjects: "प्रोजेक्ट ब्राउज़ करें",
      importBackupLink: "बैकअप आयात करें",
      welcomeRestorePrefix: "या ",
      welcomeRestoreSuffix: " करके पिछला सेशन वापस लाएं।",
      fatalTitle: "PackTracker लोड नहीं हो सका",
      general: "जनरल",
      updates: "अपडेट्स",
      about: "अबाउट",
      onboarding: "PackTracker में स्वागत है",
      onboardingBody: "PackTracker आपके Minecraft mods, resource packs और shaders को profile के हिसाब से व्यवस्थित करता है।",
      onboardingNext: "आगे",
      onboardingSkip: "छोड़ें",
      onboardingFinish: "समाप्त",
      languageExperimental: "भाषा",
      themeExperimental: "थीम",
      editOrder: "क्रम बदलें",
      done: "पूर्ण",
      favorites: "फेवरेट्स",
      starredItems: "स्टार किए गए आइटम",
      items: "आइटम",
      noProfilesYetShort: "अभी कोई प्रोफाइल नहीं है।",
      backToProfiles: "प्रोफाइल पर वापस जाएँ",
      browsePrefix: "ब्राउज़",
      searchPlaceholder: "mods, resource packs और shaders खोजें...",
      searchingPrefix: "खोज रहा है",
      resultsSuffix: "परिणाम",
      loadMore: "और लोड करें",
      noResultsYet: "अभी कोई परिणाम नहीं है। दूसरा खोज शब्द आज़माएँ या लोकप्रिय प्रोजेक्ट देखें।",
      shareProfile: "प्रोफाइल शेयर करें",
      scanMinecraftFolder: "Minecraft फ़ोल्डर स्कैन करें",
      addViaBrowse: "+ ब्राउज़ से जोड़ें",
      addManually: "+ मैन्युअली जोड़ें",
      updateToVersion: "↻ संस्करण तक अपडेट",
      editLayout: "लेआउट संपादित करें",
      doneEditing: "संपादन पूरा",
      noModsYet: "अभी कोई mod नहीं",
      noResourcePacksYet: "अभी कोई resource pack नहीं",
      noShadersYet: "अभी कोई shader नहीं",
      mods: "मॉड्स",
      resourcePacks: "रिसोर्स पैक्स",
      shaders: "शेडर्स",
    },
    es: {
      installApp: "Instalar app",
      exportBackup: "Exportar copia",
      importBackup: "Importar copia",
      settings: "Ajustes",
      profiles: "Perfiles",
      newProfile: "＋ Nuevo perfil",
      noProfilesTitle: "Aún no hay perfiles",
      noProfilesBody: "Crea tu primer perfil de Minecraft y empieza a reunir mods, resource packs y shaders.",
      browseProjects: "Explorar proyectos",
      importBackupLink: "importar una copia",
      welcomeRestorePrefix: "O ",
      welcomeRestoreSuffix: " para restaurar una sesión anterior.",
      fatalTitle: "PackTracker no pudo cargarse",
      general: "General",
      updates: "Actualizaciones",
      about: "Acerca de",
      onboarding: "Bienvenido a PackTracker",
      onboardingBody: "PackTracker te ayuda a organizar mods, resource packs y shaders de Minecraft por perfil.",
      onboardingNext: "Siguiente",
      onboardingSkip: "Saltar",
      onboardingFinish: "Terminar",
      languageExperimental: "Idioma",
      themeExperimental: "Tema",
      editOrder: "Editar orden",
      done: "Hecho",
      favorites: "Favoritos",
      starredItems: "Elementos favoritos",
      items: "elementos",
      noProfilesYetShort: "Aún no hay perfiles.",
      backToProfiles: "Volver a perfiles",
      browsePrefix: "Explorar",
      searchPlaceholder: "Buscar mods, resource packs y shaders...",
      searchingPrefix: "Buscando",
      resultsSuffix: "resultados",
      loadMore: "Cargar más",
      noResultsYet: "Todavía no hay resultados. Prueba otra búsqueda o revisa los proyectos más populares.",
      shareProfile: "Compartir perfil",
      scanMinecraftFolder: "Escanear carpeta de Minecraft",
      addViaBrowse: "+ Añadir desde explorar",
      addManually: "+ Añadir manualmente",
      updateToVersion: "↻ Actualizar a versión",
      editLayout: "Editar diseño",
      doneEditing: "Terminar edición",
      noModsYet: "Aún no hay mods",
      noResourcePacksYet: "Aún no hay resource packs",
      noShadersYet: "Aún no hay shaders",
      mods: "Mods",
      resourcePacks: "Resource Packs",
      shaders: "Shaders",
    },
    ar: {
      installApp: "تثبيت التطبيق",
      exportBackup: "تصدير النسخة الاحتياطية",
      importBackup: "استيراد النسخة الاحتياطية",
      settings: "الإعدادات",
      profiles: "الملفات",
      newProfile: "＋ ملف جديد",
      noProfilesTitle: "لا توجد ملفات بعد",
      noProfilesBody: "أنشئ أول ملف Minecraft وابدأ بتنظيم المودات وحزم الموارد والشيدر.",
      browseProjects: "تصفح المشاريع",
      importBackupLink: "استيراد نسخة احتياطية",
      welcomeRestorePrefix: "أو ",
      welcomeRestoreSuffix: " لاستعادة جلسة سابقة.",
      fatalTitle: "تعذر تحميل PackTracker",
      general: "عام",
      updates: "التحديثات",
      about: "حول",
      onboarding: "مرحبًا بك في PackTracker",
      onboardingBody: "يساعدك PackTracker على تنظيم مودات Minecraft وحزم الموارد والشيدر حسب الملف.",
      onboardingNext: "التالي",
      onboardingSkip: "تخطي",
      onboardingFinish: "إنهاء",
      languageExperimental: "اللغة",
      themeExperimental: "السمة",
      editOrder: "تعديل الترتيب",
      done: "تم",
      favorites: "المفضلة",
      starredItems: "العناصر المميزة",
      items: "عناصر",
      noProfilesYetShort: "لا توجد ملفات بعد.",
      backToProfiles: "العودة إلى الملفات",
      browsePrefix: "تصفح",
      searchPlaceholder: "ابحث عن المودات وحزم الموارد والشيدر...",
      searchingPrefix: "جارٍ البحث",
      resultsSuffix: "نتائج",
      loadMore: "تحميل المزيد",
      noResultsYet: "لا توجد نتائج بعد. جرّب بحثًا آخر أو تصفح المشاريع الأكثر شهرة.",
      shareProfile: "مشاركة الملف",
      scanMinecraftFolder: "فحص مجلد Minecraft",
      addViaBrowse: "+ إضافة عبر التصفح",
      addManually: "+ إضافة يدويًا",
      updateToVersion: "↻ التحديث إلى إصدار",
      editLayout: "تعديل التخطيط",
      doneEditing: "إنهاء التحرير",
      noModsYet: "لا توجد مودات بعد",
      noResourcePacksYet: "لا توجد حزم موارد بعد",
      noShadersYet: "لا توجد شيدر بعد",
      mods: "المودات",
      resourcePacks: "حزم الموارد",
      shaders: "الشيدر",
    },
  };
  let deferredInstallPrompt = null;
  const PROJECT_TYPE_TO_TAB = {
    mod: "mods",
    resourcepack: "resourcepacks",
    shader: "shaders",
  };
  const TAB_TO_PROJECT_TYPE = {
    mods: "mod",
    resourcepacks: "resourcepack",
    shaders: "shader",
  };
  let lastVisibleViewId = null;
  let hasHandledFirstRunPrompts = false;
  let visualSettingsDraft = null;

  document.addEventListener("DOMContentLoaded", () => {
    registerStandaloneAppSupport();
    void initializeApp();
  });

  /**
   * Boots the PackTracker application from persisted storage and wires UI events.
   */
  async function initializeApp() {
    try {
      AppState.settings = typeof loadAppSettings === "function"
        ? loadAppSettings()
        : {
          language: "en",
          theme: "dark",
          accentColor: "#1ad969",
          blurStrength: 8,
          reduceMotion: false,
          fontStyle: "default",
          highContrast: false,
          roundedCorners: 12,
          defaultDownloadDirectoryName: "",
          downloadBehavior: "ask",
          seenReleaseNotesVersion: "",
          onboardingCompleted: false,
          visitCount: 0,
          firstOpenedAt: 0,
          lastOpenedAt: 0,
        };
      if (typeof recordAppVisit === "function") {
        AppState.settings = recordAppVisit();
      }
      applyThemePreference();
      applyLocalizedShellText();
      const data = await loadData();
      if (typeof setData === "function") {
        setData(data);
      } else {
        AppState.data = data;
      }

      if (data.profiles.length > 0) {
        setActiveProfile(data.profiles[0].id);
      }

      bindTopLevelEvents();
      window.PackTracker.showToast = showToast;
      subscribe((detail) => {
        const reason = detail?.reason || "update";
        if (reason === "search" || reason === "search-results" || reason === "search-source") {
          if (AppState.activeView === "search") {
            renderSearchPage();
          }
          return;
        }

        renderApp();
      });
      renderApp();
      handleIncomingShareLink();
      handleFirstRunPrompts();
    } catch (error) {
      console.error("PackTracker failed to initialize", error);
      renderFatalState(error);
    }
  }

  /**
   * Renders the current app shell state, including active view visibility.
   */
  function renderApp() {
    try {
      applyThemePreference();
      applyLocalizedShellText();
      renderSidebar();
      syncShellMode();
      toggleViews();

      if (AppState.activeView === "home" && (AppState.data?.profiles || []).length === 0) {
        renderWelcomeState();
      } else if (AppState.activeView === "home") {
        renderProfileView();
      }

      renderSearchPage();
      if (typeof renderShareView === "function") {
        renderShareView();
      }
    } catch (error) {
      console.error("PackTracker failed to render", error);
      renderFatalState(error);
    }
  }

  /**
   * Binds top-level application controls and custom event bridges.
   */
  function bindTopLevelEvents() {
    const installAppButton = document.getElementById("install-app-button");
    const exportButton = document.getElementById("export-button");
    const importInput = document.getElementById("import-input");
    const newProfileButton = document.getElementById("new-profile-button");
    const settingsButton = document.getElementById("settings-button");

    installAppButton?.addEventListener("click", async () => {
      if (isStandaloneAppMode()) {
        showToast("PackTracker is already installed as an app.", "success");
        syncInstallButtonVisibility();
        return;
      }

      if (!deferredInstallPrompt) {
        showToast("App install is not available yet in this browser. Try Chrome or Edge over HTTPS.", "warning");
        return;
      }

      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch (error) {
        // Ignore prompt cancellation.
      }
      deferredInstallPrompt = null;
      syncInstallButtonVisibility();
    });

    exportButton?.addEventListener("click", () => {
      exportBackup(AppState.activeProfileId);
    });
    newProfileButton?.addEventListener("click", showNewProfileModal);
    settingsButton?.addEventListener("click", () => {
      showSettingsModal("general");
    });

    importInput?.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) {
        return;
      }

      try {
        const result = await importBackup(file);
        if (result?.importedProfile?.id) {
          setActiveProfile(result.importedProfile.id);
          setActiveView("home");
        } else {
          const firstProfile = AppState.data?.profiles?.[0];
          if (firstProfile && !AppState.activeProfileId) {
            setActiveProfile(firstProfile.id);
          }
        }
      } catch (error) {
        console.warn("PackTracker: failed to import backup", error);
        showToast("Import failed", "danger");
      } finally {
        importInput.value = "";
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeTransientUi();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setActiveView("search");
        window.setTimeout(() => {
          focusSearchInput();
          if (typeof requestBrowseSearch === "function") {
            requestBrowseSearch();
          }
        }, 0);
      }
    });

    window.addEventListener("packtracker:open-search", (event) => {
      const detail = event.detail || {};
      const defaultTab = detail.sourceTab || PROJECT_TYPE_TO_TAB[detail.projectType] || AppState.browseContext.defaultTab || "mods";
      const projectType = TAB_TO_PROJECT_TYPE[defaultTab] || detail.projectType || AppState.search.projectType;
      if (detail.searchSource && typeof setSearchSource === "function") {
        setSearchSource(detail.searchSource);
      }
      setBrowseContext(defaultTab);
      setSearchState(
        {
          query: detail.query || "",
          projectType,
          results: [],
          offset: 0,
          loading: true,
        },
        { notify: false }
      );
      setActiveView("search");
      window.setTimeout(() => {
        focusSearchInput();
        if (typeof requestBrowseSearch === "function") {
          requestBrowseSearch();
        }
      }, 0);
    });
  }

  /**
   * Toggles the home and search view containers based on current state.
   */
  function toggleViews() {
    const homeView = document.getElementById(HOME_VIEW_ID);
    const searchView = document.getElementById(SEARCH_VIEW_ID);
    const shareView = document.getElementById(SHARE_VIEW_ID);
    if (!homeView || !searchView || !shareView) {
      return;
    }

    const viewsById = {
      [HOME_VIEW_ID]: homeView,
      [SEARCH_VIEW_ID]: searchView,
      [SHARE_VIEW_ID]: shareView,
    };
    const nextVisibleViewId = AppState.activeView === "search"
      ? SEARCH_VIEW_ID
      : AppState.activeView === "share"
        ? SHARE_VIEW_ID
        : HOME_VIEW_ID;
    const nextVisibleView = viewsById[nextVisibleViewId];
    const previousView = lastVisibleViewId ? viewsById[lastVisibleViewId] : null;
    const hiddenViews = Object.entries(viewsById)
      .filter(([id]) => id !== nextVisibleViewId)
      .map(([, view]) => view);

    if (previousView && previousView !== nextVisibleView) {
      previousView.classList.remove("hidden");
      previousView.classList.remove(PAGE_ENTER_CLASS);
      previousView.classList.add(PAGE_EXIT_CLASS);
      window.setTimeout(() => {
        previousView.classList.remove(PAGE_EXIT_CLASS);
        previousView.classList.add("hidden");
      }, PAGE_EXIT_MS);
    } else {
      hiddenViews.forEach((view) => {
        if (view !== nextVisibleView) {
          view.classList.add("hidden");
        }
      });
    }

    if (nextVisibleView) {
      nextVisibleView.classList.remove("hidden");
      nextVisibleView.classList.remove(PAGE_EXIT_CLASS);
      nextVisibleView.classList.add(PAGE_ENTER_CLASS);
      window.setTimeout(() => {
        nextVisibleView.classList.remove(PAGE_ENTER_CLASS);
      }, PAGE_ENTER_MS);
    }

    lastVisibleViewId = nextVisibleViewId;
  }

  /**
   * Adjusts the main shell layout for dedicated share-download mode.
   */
  function syncShellMode() {
    const app = document.getElementById(APP_ROOT_ID);
    if (!app) {
      return;
    }

    app.classList.toggle("share-mode", AppState.activeView === "share");
  }

  /**
   * Resolves one translated UI string from the current language setting.
   *
   * @param {string} key - Translation key.
   * @param {string} fallback - Fallback English string.
   * @returns {string} Translated value or fallback.
   */
  function t(key, fallback) {
    const language = AppState.settings?.language || "en";
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || fallback || key;
  }

  /**
   * Applies the active visual and localization preferences to the document root.
   */
  function applyThemePreference() {
    const settings = AppState.settings || {};
    const storedTheme = settings.theme || "dark";
    const resolvedTheme = storedTheme === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : storedTheme;
    const accentColor = settings.accentColor || "#1ad969";
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
    root.dataset.contrast = settings.highContrast ? "high" : "normal";
    root.dataset.fontStyle = settings.fontStyle || "default";
    root.lang = settings.language || "en";
    root.dir = settings.language === "ar" ? "rtl" : "ltr";
    root.style.setProperty("--color-accent", accentColor);
    root.style.setProperty("--color-accent-dim", withAlpha(accentColor, 0.16));
    root.style.setProperty("--color-accent-rgb", toRgbTriplet(accentColor));
    root.style.setProperty("--visual-blur", `${Math.max(0, Number(settings.blurStrength || 0))}px`);
    root.style.setProperty("--font-body", settings.fontStyle === "monospace"
      ? "\"IBM Plex Mono\", \"Cascadia Mono\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace"
      : settings.fontStyle === "manrope"
        ? "'Manrope', 'Nunito', sans-serif"
        : settings.fontStyle === "poppins"
          ? "'Poppins', 'Nunito', sans-serif"
          : settings.fontStyle === "serif"
            ? "'Merriweather', Georgia, serif"
            : "'Nunito', sans-serif");
    const roundedCorners = Math.max(0, Number(settings.roundedCorners || 12));
    root.style.setProperty("--radius-control", `${Math.max(0, roundedCorners - 4)}px`);
    root.style.setProperty("--radius-card", `${roundedCorners}px`);
    root.style.setProperty("--radius-panel", `${roundedCorners + 2}px`);
  }

  /**
   * Updates static shell labels that live directly in index.html.
   */
  function applyLocalizedShellText() {
    const installAppButton = document.getElementById("install-app-button");
    const exportButton = document.getElementById("export-button");
    const importLabel = document.querySelector("label[for='import-input']");
    const newProfileButton = document.getElementById("new-profile-button");
    const sidebarLabel = document.querySelector(".sidebar-section-label");
    const settingsButton = document.getElementById("settings-button");

    if (installAppButton) {
      setIconLabelContent(installAppButton, "⬇", t("installApp", "Install app"), "btn-icon-arrow-down");
    }
    if (exportButton) {
      setIconLabelContent(exportButton, "⤓", t("exportBackup", "Export backup"), "btn-icon-arrow-down");
    }
    if (importLabel) {
      setIconLabelContent(importLabel, "⤴", t("importBackup", "Import backup"), "btn-icon-arrow-up");
    }
    if (newProfileButton) {
      setIconLabelContent(newProfileButton, "＋", t("newProfile", "＋ New profile").replace(/^＋\s*/, ""), "btn-icon-plus");
    }
    if (sidebarLabel) {
      sidebarLabel.textContent = t("profiles", "Profiles");
    }
    if (settingsButton) {
      setIconLabelContent(settingsButton, "⚙", t("settings", "Settings"), "btn-icon-gear");
    }
  }

  /**
   * Replaces one button or label body with an animatable icon span and plain text label.
   *
   * @param {HTMLElement} element - Target element.
   * @param {string} icon - Visible icon text.
   * @param {string} label - Visible label text.
   * @param {string} iconClass - Additional icon class for animation targeting.
   */
  function setIconLabelContent(element, icon, label, iconClass) {
    element.replaceChildren(createIconLabelContent(icon, label, iconClass));
  }

  /**
   * Creates shared button/label content with a separately animatable icon.
   *
   * @param {string} icon - Visible icon text.
   * @param {string} label - Visible label text.
   * @param {string} iconClass - Additional icon class.
   * @returns {HTMLSpanElement} Content wrapper.
   */
  function createIconLabelContent(icon, label, iconClass) {
    const content = document.createElement("span");
    content.className = "btn-content";

    const iconElement = document.createElement("span");
    iconElement.className = iconClass ? `btn-icon ${iconClass}` : "btn-icon";
    iconElement.textContent = icon;

    const labelElement = document.createElement("span");
    labelElement.className = "btn-label";
    labelElement.textContent = String(label || "");

    content.append(iconElement, labelElement);
    return content;
  }


  /**
   * Opens onboarding or update notes when appropriate for this visit.
   */
  function handleFirstRunPrompts() {
    if (hasHandledFirstRunPrompts) {
      return;
    }
    hasHandledFirstRunPrompts = true;

    if (!AppState.settings?.onboardingCompleted) {
      showOnboardingWizard();
      return;
    }

    if (AppState.settings?.seenReleaseNotesVersion !== RELEASE_NOTES.version) {
      showUpdateModal({ markSeenOnClose: true });
    }
  }

  /**
   * Renders the first-launch welcome state when no profiles exist yet.
   */
  function renderWelcomeState() {
    const homeView = document.getElementById(HOME_VIEW_ID);
    if (!homeView) {
      return;
    }

    homeView.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = "welcome-state";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.appendChild(createStateLogoImage());

    const title = document.createElement("div");
    title.className = "welcome-title";
    title.textContent = t("noProfilesTitle", "No profiles yet");

    const subtitle = document.createElement("div");
    subtitle.className = "welcome-subtitle";
    subtitle.textContent = t("noProfilesBody", "Create your first Minecraft profile and start collecting mods, resource packs, and shaders.");

    const actions = document.createElement("div");
    actions.className = "welcome-actions";

    const createButton = document.createElement("button");
    createButton.className = "btn btn-primary";
    createButton.type = "button";
    createButton.textContent = t("newProfile", "＋ New profile");
    createButton.addEventListener("click", showNewProfileModal);

    const browseButton = document.createElement("button");
    browseButton.className = "btn";
    browseButton.type = "button";
    browseButton.textContent = t("browseProjects", "Browse projects");
    browseButton.addEventListener("click", () => {
      setActiveView("search");
      if (typeof requestBrowseSearch === "function") {
        requestBrowseSearch();
      }
    });

    const restore = document.createElement("div");
    restore.className = "welcome-subtitle";
    restore.append(t("welcomeRestorePrefix", "Or "));

    const importLabel = document.createElement("label");
    importLabel.className = "inline-link";
    importLabel.setAttribute("for", "import-input");
    importLabel.textContent = t("importBackupLink", "import a backup");

    restore.append(importLabel, t("welcomeRestoreSuffix", " to restore a previous session."));
    actions.append(createButton, browseButton);
    wrapper.append(icon, title, subtitle, actions, restore);
    homeView.appendChild(wrapper);
  }

  /**
   * Shows a toast notification in the bottom-right corner.
   *
   * @param {string} message - Toast message.
   * @param {"success"|"danger"|"warning"} [variant] - Visual style.
   */
  function showToast(message, variant = "success") {
    const root = document.getElementById(TOAST_ROOT_ID);
    if (!root || !message) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${variant}`;
    toast.textContent = message;
    root.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("leaving");
      window.setTimeout(() => {
        toast.remove();
      }, 180);
    }, 2200);
  }

  /**
   * Closes shared modals and context menus opened by any module.
   */
  function closeTransientUi() {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    const contextRoot = document.getElementById(CONTEXT_ROOT_ID);
    if (modalRoot) {
      if (modalRoot.querySelector(".settings-overlay")) {
        visualSettingsDraft = null;
      }
      dismissRootChildren(modalRoot);
    }
    if (contextRoot) {
      contextRoot.replaceChildren();
    }
  }

  /**
   * Renders a visible fatal-state message instead of leaving the UI unresponsive.
   *
   * @param {unknown} error - Initialization or render error.
   */
  function renderFatalState(error) {
    const homeView = document.getElementById(HOME_VIEW_ID);
    const searchView = document.getElementById(SEARCH_VIEW_ID);
    const shareView = document.getElementById(SHARE_VIEW_ID);
    if (searchView) {
      searchView.classList.add("hidden");
    }
    if (shareView) {
      shareView.classList.add("hidden");
    }
    if (!homeView) {
      return;
    }

    homeView.classList.remove("hidden");
    homeView.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.className = "welcome-state";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.appendChild(createStateLogoImage());

    const title = document.createElement("div");
    title.className = "welcome-title";
    title.textContent = t("fatalTitle", "PackTracker could not load");

    const subtitle = document.createElement("div");
    subtitle.className = "welcome-subtitle";
    subtitle.textContent = error instanceof Error ? error.message : "Unknown startup error.";

    wrapper.append(icon, title, subtitle);
    homeView.appendChild(wrapper);
  }

  /**
   * Creates the shared PackTracker logo node used in empty and welcome states.
   *
   * @returns {HTMLImageElement} Logo image element.
   */
  function createStateLogoImage() {
    const image = document.createElement("img");
    image.className = "state-logo";
    image.src = "./assets/logo.png?v=20260420-1";
    image.alt = "";
    image.draggable = false;
    return image;
  }

  /**
   * Closes all mounted overlays in one root with a short exit animation.
   *
   * @param {HTMLElement} root - Root containing modal overlays.
   */
  function dismissRootChildren(root) {
    const overlays = Array.from(root.children);
    if (overlays.length === 0) {
      return;
    }

    overlays.forEach((overlay) => {
      overlay.classList.add("closing");
      const modal = overlay.querySelector(".modal");
      if (modal) {
        modal.classList.add("closing");
      }
    });

    window.setTimeout(() => {
      overlays.forEach((overlay) => {
        if (overlay.parentElement === root) {
          overlay.remove();
        }
      });
    }, 150);
  }

  /**
   * Opens the full-screen app settings modal.
   *
   * @param {"general"|"visual"|"updates"|"about"} initialTab - First visible settings tab.
   */
  function showSettingsModal(initialTab = "general") {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      return;
    }

    const activeTab = ["general", "visual", "updates", "about"].includes(initialTab) ? initialTab : "general";
    const settings = AppState.settings || {};
    if (!visualSettingsDraft) {
      visualSettingsDraft = createVisualSettingsDraft(settings);
    }
    let overlay = modalRoot.querySelector(".settings-overlay");
    let nav = overlay ? overlay.querySelector(".settings-nav") : null;
    let content = overlay ? overlay.querySelector(".settings-content") : null;
    let closeButton = overlay ? overlay.querySelector(".settings-footer .btn") : null;

    if (!overlay || !nav || !content) {
      overlay = document.createElement("div");
      overlay.className = "modal-overlay settings-overlay";

      const modal = document.createElement("div");
      modal.className = "modal settings-modal";

      const body = document.createElement("div");
      body.className = "modal-body settings-layout";

      nav = document.createElement("div");
      nav.className = "settings-nav";

      content = document.createElement("div");
      content.className = "settings-content";

      closeButton = document.createElement("button");
      closeButton.className = "btn";
      closeButton.type = "button";
      closeButton.addEventListener("click", closeSettingsModal);

      const footer = document.createElement("div");
      footer.className = "settings-footer";
      footer.appendChild(closeButton);

      body.append(nav, content);
      modal.append(body, footer);
      overlay.appendChild(modal);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          closeSettingsModal();
        }
      });

      modalRoot.replaceChildren(overlay);
    }

    renderSettingsModalFrame({
      nav,
      content,
      closeButton,
      activeTab,
      settings,
    });
  }

  /**
   * Closes the settings modal and clears any unsaved visual-settings draft.
   */
  function closeSettingsModal() {
    visualSettingsDraft = null;
    closeTransientUi();
  }

  /**
   * Refreshes the settings modal navigation and visible panel without recreating the overlay.
   *
   * @param {{nav: HTMLElement, content: HTMLElement, closeButton: HTMLElement|null, activeTab: string, settings: object}} options - Modal render state.
   */
  function renderSettingsModalFrame(options) {
    const { nav, content, closeButton, activeTab, settings } = options;
    nav.replaceChildren();

    const title = document.createElement("div");
    title.className = "settings-title";
    title.textContent = t("settings", "Settings");
    nav.appendChild(title);

    [
      { key: "general", label: t("general", "General") },
      { key: "visual", label: t("visual", "Visual") },
      { key: "updates", label: t("updates", "Updates") },
      { key: "about", label: t("about", "About") },
    ].forEach((entry) => {
      const button = document.createElement("button");
      button.className = entry.key === activeTab ? "settings-tab active" : "settings-tab";
      button.type = "button";
      button.textContent = entry.label;
      button.addEventListener("click", () => {
        showSettingsModal(entry.key);
      });
      nav.appendChild(button);
    });

    content.replaceChildren(
      activeTab === "general"
        ? renderGeneralSettingsPanel(settings)
        : activeTab === "visual"
          ? renderVisualSettingsPanel(visualSettingsDraft)
          : activeTab === "updates"
            ? renderUpdatesSettingsPanel()
            : renderAboutSettingsPanel()
    );

    if (closeButton) {
      closeButton.textContent = t("close", "Close");
    }
  }

  /**
   * Renders the general settings panel with language and download preferences.
   *
   * @param {object} settings - Current settings snapshot.
   * @returns {HTMLDivElement} Settings panel element.
   */
  function renderGeneralSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = t("generalSettingsIntro", "Choose language, download preferences, and other app-wide behavior settings.");
    panel.appendChild(intro);

    const languageGroup = createSettingsField(t("languageExperimental", "Language"), { experimental: true });
    const languageSelect = createSettingsDropdown(LANGUAGES, settings.language || "en", (value) => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings({ language: value })
        : AppState.settings;
      applyThemePreference();
      applyLocalizedShellText();
      renderApp();
      showSettingsModal("general");
    });
    languageGroup.appendChild(languageSelect);

    const downloadsGroup = createSettingsField(t("defaultDownloadFolder", "Default download folder"));
    const downloadsHint = document.createElement("div");
    downloadsHint.className = "settings-field-help";
    downloadsHint.textContent = settings.defaultDownloadDirectoryName
      ? `${t("currentFolderPrefix", "Current folder:")} ${settings.defaultDownloadDirectoryName}`
      : t("downloadsFolderHintEmpty", "No default folder selected yet. Pick a normal folder or subfolder, not the Windows Downloads root.");
    const downloadsActions = document.createElement("div");
    downloadsActions.className = "settings-inline-actions";
    const pickFolderButton = createSettingsActionButton(t("chooseFolder", "Choose folder"));
    pickFolderButton.addEventListener("click", async () => {
      try {
        const result = await chooseDefaultDownloadDirectory();
        if (!result) {
          return;
        }
        AppState.settings = typeof updateAppSettings === "function"
          ? updateAppSettings({ defaultDownloadDirectoryName: result.name || "Selected folder" })
          : AppState.settings;
        showToast(`Default download folder set to ${result.name}.`, "success");
        showSettingsModal("general");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not choose a default folder.", "danger");
      }
    });
    const clearFolderButton = createSettingsActionButton(t("clearFolder", "Clear folder"));
    clearFolderButton.addEventListener("click", async () => {
      try {
        await clearDefaultDownloadDirectory();
        AppState.settings = typeof updateAppSettings === "function"
          ? updateAppSettings({ defaultDownloadDirectoryName: "", downloadBehavior: "ask" })
          : AppState.settings;
        showSettingsModal("general");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not clear the default folder.", "danger");
      }
    });
    downloadsActions.append(pickFolderButton, clearFolderButton);
    downloadsGroup.append(downloadsHint, downloadsActions);

    const behaviorGroup = createSettingsField(t("downloadBehavior", "Download behavior"));
    const behaviorSelect = createSettingsDropdown(DOWNLOAD_BEHAVIORS, settings.downloadBehavior || "ask", (value) => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings({ downloadBehavior: value })
        : AppState.settings;
      showSettingsModal("general");
    });
    const behaviorHelp = document.createElement("div");
    behaviorHelp.className = "settings-field-help";
    behaviorHelp.textContent = (settings.downloadBehavior || "ask") === "default"
      ? t("downloadBehaviorDefaultHelp", "PackTracker will try to save files directly into the chosen folder when the browser allows it.")
      : t("downloadBehaviorAskHelp", "PackTracker will ask where to save direct downloads when the browser allows it. Bulk downloads may still use the browser's standard flow.");
    behaviorGroup.append(behaviorSelect, behaviorHelp);

    const resetGroup = createSettingsField(t("resetAllSettings", "Reset all settings"));
    const resetHelp = document.createElement("div");
    resetHelp.className = "settings-field-help";
    resetHelp.textContent = t("resetSettingsHelp", "This resets language, theme, update prompts, onboarding state, and download preferences.");
    const resetButton = createSettingsActionButton(t("resetAllSettings", "Reset all settings"), "btn-danger");
    resetButton.addEventListener("click", () => {
      showResetSettingsConfirmModal();
    });
    resetGroup.append(resetHelp, resetButton);

    panel.append(languageGroup, downloadsGroup, behaviorGroup, resetGroup);
    return panel;
  }

  /**
   * Renders the visual settings panel with explicit save action.
   *
   * @param {object} settings - Draft visual settings.
   * @returns {HTMLDivElement} Visual settings panel.
   */
  function renderVisualSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = t("visualSettingsIntro", "Adjust theme, accent color, motion, blur, and other appearance settings for PackTracker.");
    panel.appendChild(intro);

    const themeGroup = createSettingsField(t("themeExperimental", "Theme"), { experimental: true });
    const themeHelp = document.createElement("div");
    themeHelp.className = "settings-field-help";
    themeHelp.textContent = t("themeDescription", "Choose whether the app follows a light, dark, or system appearance.");
    const themeSelect = createSettingsDropdown(THEMES, settings.theme || "dark", (value) => {
      updateVisualSettingsDraft({ theme: value });
    });
    themeGroup.append(themeSelect, themeHelp);

    const accentGroup = createSettingsField(t("accentColor", "Accent color"), { experimental: true });
    const accentRow = document.createElement("div");
    accentRow.className = "settings-visual-row";
    const accentPicker = document.createElement("label");
    accentPicker.className = "settings-color-picker";
    const accentPreview = document.createElement("span");
    accentPreview.className = "settings-color-preview";
    accentPreview.style.background = settings.accentColor || "#1ad969";
    const accentInput = document.createElement("input");
    accentInput.type = "color";
    accentInput.className = "settings-color-input";
    accentInput.value = settings.accentColor || "#1ad969";
    accentInput.addEventListener("input", () => {
      updateVisualSettingsDraft({ accentColor: accentInput.value });
      accentPreview.style.background = accentInput.value || "#1ad969";
    });
    const accentValue = document.createElement("div");
    accentValue.className = "settings-field-help settings-inline-value";
    accentValue.textContent = String(settings.accentColor || "#1ad969").toUpperCase();
    accentInput.addEventListener("input", () => {
      accentValue.textContent = String(accentInput.value || "#1ad969").toUpperCase();
    });
    const accentPickerLabel = document.createElement("span");
    accentPickerLabel.className = "settings-color-picker-label";
    accentPickerLabel.textContent = t("custom", "Custom");
    accentPicker.append(accentPreview, accentPickerLabel, accentInput);
    accentRow.append(accentPicker, accentValue);
    accentGroup.appendChild(accentRow);

    const blurGroup = createSettingsField(t("blurEffects", "Blur effects"), { experimental: true });
    blurGroup.appendChild(createSettingsRangeControl({
      min: 0,
      max: 24,
      step: 1,
      value: settings.blurStrength,
      helpText: t("blurEffectsHelp", "Choose how strong overlay and panel blur should feel."),
      onInput(value) {
        updateVisualSettingsDraft({ blurStrength: value });
      },
    }));

    const motionGroup = createSettingsField(t("reduceMotion", "Reduce motion"));
    motionGroup.appendChild(createSettingsToggleControl({
      checked: Boolean(settings.reduceMotion),
      label: t("reduceMotionHelp", "Minimizes movement for performance and accessibility."),
      onChange(value) {
        updateVisualSettingsDraft({ reduceMotion: value });
      },
    }));

    const fontGroup = createSettingsField(t("fontStyle", "Font style"));
    const fontSelect = createSettingsDropdown(FONT_STYLES, settings.fontStyle || "default", (value) => {
      updateVisualSettingsDraft({ fontStyle: value });
    });
    fontGroup.appendChild(fontSelect);

    const contrastGroup = createSettingsField(t("contrastMode", "Contrast mode"));
    contrastGroup.appendChild(createSettingsToggleControl({
      checked: Boolean(settings.highContrast),
      label: t("contrastModeHelp", "Increase contrast for better readability."),
      onChange(value) {
        updateVisualSettingsDraft({ highContrast: value });
      },
      toggleLabel: t("highContrast", "High contrast"),
    }));

    const cornersGroup = createSettingsField(t("roundedCorners", "Rounded corners"), { experimental: true });
    cornersGroup.appendChild(createSettingsRangeControl({
      min: 0,
      max: 20,
      step: 1,
      value: settings.roundedCorners,
      helpText: t("roundedCornersHelp", "Controls how soft or sharp the app corners feel."),
      onInput(value) {
        updateVisualSettingsDraft({ roundedCorners: value });
      },
    }));

    const saveRow = document.createElement("div");
    saveRow.className = "settings-save-row";
    const resetButton = createSettingsActionButton(t("resetToDefault", "Reset to default"));
    resetButton.addEventListener("click", () => {
      visualSettingsDraft = createDefaultVisualSettingsDraft();
      showSettingsModal("visual");
    });
    const saveButton = createSettingsActionButton(t("saveVisualSettings", "Save visual settings"), "btn-primary");
    saveButton.addEventListener("click", () => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings(visualSettingsDraft || settings)
        : AppState.settings;
      applyThemePreference();
      renderApp();
      showToast(t("visualSettingsSaved", "Visual settings saved."), "success");
      visualSettingsDraft = createVisualSettingsDraft(AppState.settings || {});
      showSettingsModal("visual");
    });
    saveRow.append(resetButton, saveButton);

    panel.append(themeGroup, accentGroup, blurGroup, motionGroup, fontGroup, contrastGroup, cornersGroup, saveRow);
    return panel;
  }

  /**
   * Creates one mutable copy of the current visual settings for the settings modal draft.
   *
   * @param {object} settings - Current app settings.
   * @returns {object} Draft visual settings.
   */
  function createVisualSettingsDraft(settings) {
    return {
      theme: settings.theme || "dark",
      accentColor: settings.accentColor || "#1ad969",
      blurStrength: Number(settings.blurStrength || 8),
      reduceMotion: Boolean(settings.reduceMotion),
      fontStyle: settings.fontStyle || "default",
      highContrast: Boolean(settings.highContrast),
      roundedCorners: Number(settings.roundedCorners || 12),
    };
  }

  /**
   * Creates the default visual settings draft used by the reset action.
   *
   * @returns {object} Default visual draft.
   */
  function createDefaultVisualSettingsDraft() {
    return createVisualSettingsDraft({
      theme: "dark",
      accentColor: "#1ad969",
      blurStrength: 8,
      reduceMotion: false,
      fontStyle: "default",
      highContrast: false,
      roundedCorners: 12,
    });
  }

  /**
   * Updates the in-memory visual settings draft without saving it yet.
   *
   * @param {object} patch - Partial visual settings patch.
   */
  function updateVisualSettingsDraft(patch) {
    visualSettingsDraft = {
      ...(visualSettingsDraft || createVisualSettingsDraft(AppState.settings || {})),
      ...patch,
    };
  }

  /**
   * Creates a shared slider row with value readout and helper text.
   *
   * @param {{min:number,max:number,step:number,value:number,helpText:string,onInput:(value:number)=>void}} options - Slider config.
   * @returns {HTMLDivElement} Slider wrapper.
   */
  function createSettingsRangeControl(options) {
    const wrapper = document.createElement("div");
    wrapper.className = "settings-range-control";

    const topRow = document.createElement("div");
    topRow.className = "settings-visual-row";

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(options.min);
    input.max = String(options.max);
    input.step = String(options.step);
    input.value = String(options.value);
    input.className = "settings-range-input";

    const valueLabel = document.createElement("div");
    valueLabel.className = "settings-field-help settings-inline-value";
    valueLabel.textContent = t("previewValuePx", "{value}px").replace("{value}", String(options.value));
    wrapper.style.setProperty("--range-progress", getRangeProgress(options.value, options.min, options.max));

    input.addEventListener("input", () => {
      const numericValue = Number(input.value);
      valueLabel.textContent = t("previewValuePx", "{value}px").replace("{value}", String(numericValue));
      wrapper.style.setProperty("--range-progress", getRangeProgress(numericValue, options.min, options.max));
      options.onInput(numericValue);
    });

    const help = document.createElement("div");
    help.className = "settings-field-help";
    help.textContent = options.helpText;

    topRow.append(input, valueLabel);
    wrapper.append(topRow, help);
    return wrapper;
  }

  /**
   * Creates a shared checkbox-style control used inside the visual settings panel.
   *
   * @param {{checked:boolean,label:string,onChange:(value:boolean)=>void,toggleLabel?:string}} options - Toggle config.
   * @returns {HTMLLabelElement} Toggle wrapper.
   */
  function createSettingsToggleControl(options) {
    const wrapper = document.createElement("label");
    wrapper.className = "settings-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(options.checked);
    input.className = "settings-toggle-input";
    input.addEventListener("change", () => {
      options.onChange(input.checked);
    });

    const switchTrack = document.createElement("span");
    switchTrack.className = "settings-toggle-switch";
    switchTrack.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "settings-toggle-copy";

    const title = document.createElement("span");
    title.className = "settings-toggle-title";
    title.textContent = options.toggleLabel || "Enabled";

    const help = document.createElement("span");
    help.className = "settings-field-help";
    help.textContent = options.label;

    copy.append(title, help);
    wrapper.append(input, switchTrack, copy);
    return wrapper;
  }

  /**
   * Converts one hex color into an rgba string with the requested alpha.
   *
   * @param {string} color - Hex color like #1ad969.
   * @param {number} alpha - Alpha from 0 to 1.
   * @returns {string} Rgba color string.
   */
  function withAlpha(color, alpha) {
    const safe = String(color || "#1ad969").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
      return `rgba(26, 217, 105, ${alpha})`;
    }
    const red = parseInt(safe.slice(0, 2), 16);
    const green = parseInt(safe.slice(2, 4), 16);
    const blue = parseInt(safe.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  /**
   * Converts one hex color into a raw rgb triplet string.
   *
   * @param {string} color - Hex color like #1ad969.
   * @returns {string} Rgb triplet string.
   */
  function toRgbTriplet(color) {
    const safe = String(color || "#1ad969").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
      return "26, 217, 105";
    }
    const red = parseInt(safe.slice(0, 2), 16);
    const green = parseInt(safe.slice(2, 4), 16);
    const blue = parseInt(safe.slice(4, 6), 16);
    return `${red}, ${green}, ${blue}`;
  }

  /**
   * Computes one slider fill percentage for the custom range styling.
   *
   * @param {number} value - Current slider value.
   * @param {number} min - Slider minimum.
   * @param {number} max - Slider maximum.
   * @returns {string} CSS percentage string.
   */
  function getRangeProgress(value, min, max) {
    const range = Math.max(1, Number(max) - Number(min));
    const progress = ((Number(value) - Number(min)) / range) * 100;
    return `${Math.min(100, Math.max(0, progress))}%`;
  }

  /**
   * Renders the updates settings tab.
   *
   * @returns {HTMLDivElement} Updates panel.
   */
  function renderUpdatesSettingsPanel() {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const card = document.createElement("div");
    card.className = "settings-info-card";

    const title = document.createElement("div");
    title.className = "settings-card-title";
    title.textContent = RELEASE_NOTES.title;

    const subtitle = document.createElement("div");
    subtitle.className = "settings-field-help";
    subtitle.textContent = `Current release: ${RELEASE_NOTES.version}`;

    const list = document.createElement("ul");
    list.className = "settings-bullets";
    RELEASE_NOTES.bullets.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      list.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "settings-inline-actions";
    const openButton = createSettingsActionButton("View latest update again");
    openButton.addEventListener("click", () => {
      showUpdateModal({ markSeenOnClose: false });
    });
    actions.appendChild(openButton);

    card.append(title, subtitle, list, actions);
    panel.appendChild(card);
    return panel;
  }

  /**
   * Renders the about settings tab.
   *
   * @returns {HTMLDivElement} About panel.
   */
  function renderAboutSettingsPanel() {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const card = document.createElement("div");
    card.className = "settings-info-card";

    const title = document.createElement("div");
    title.className = "settings-card-title";
    title.textContent = "About PackTracker";

    const paragraphs = [
      "PackTracker is meant to help you keep Minecraft modpacks organized per profile, with tracked mods, resource packs, shaders, updates, scans, and backups in one place.",
      "The app is especially useful when you switch between Minecraft versions, loaders, or different themed packs and want a clearer overview than normal launchers give you.",
      "PackTracker is made by Pjater, and this web app can also be installed like an app in supported browsers.",
    ];
    paragraphs.forEach((entry) => {
      const paragraph = document.createElement("p");
      paragraph.className = "settings-paragraph";
      paragraph.textContent = entry;
      card.appendChild(paragraph);
    });

    const link = document.createElement("a");
    link.className = "btn btn-small";
    link.href = "https://github.com/pjater/Packtracker";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open GitHub";
    card.appendChild(link);

    panel.appendChild(card);
    return panel;
  }

  /**
   * Opens the once-per-release update notes modal.
   *
   * @param {{markSeenOnClose?: boolean}} [options] - Modal behavior options.
   */
  function showUpdateModal(options = {}) {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("div");
    modal.className = "modal update-modal";

    const body = document.createElement("div");
    body.className = "modal-body";

    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = RELEASE_NOTES.title;

    const subtitle = document.createElement("div");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = `You're viewing release ${RELEASE_NOTES.version}.`;

    const list = document.createElement("ul");
    list.className = "settings-bullets";
    RELEASE_NOTES.bullets.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      list.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const laterButton = document.createElement("button");
    laterButton.className = "btn";
    laterButton.type = "button";
    laterButton.textContent = "Open settings";
    laterButton.addEventListener("click", () => {
      if (options.markSeenOnClose !== false) {
        markReleaseNotesSeen();
      }
      showSettingsModal("updates");
    });
    const closeButton = document.createElement("button");
    closeButton.className = "btn btn-primary";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => {
      if (options.markSeenOnClose !== false) {
        markReleaseNotesSeen();
      }
      closeTransientUi();
    });
    actions.append(laterButton, closeButton);

    body.append(title, subtitle, list, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        if (options.markSeenOnClose !== false) {
          markReleaseNotesSeen();
        }
        closeTransientUi();
      }
    });
    modalRoot.replaceChildren(overlay);
  }

  /**
   * Marks the current release-notes version as seen.
   */
  function markReleaseNotesSeen() {
    AppState.settings = typeof updateAppSettings === "function"
      ? updateAppSettings({ seenReleaseNotesVersion: RELEASE_NOTES.version })
      : AppState.settings;
  }

  /**
   * Opens the first-run onboarding wizard.
   */
  function showOnboardingWizard() {
    const steps = [
      {
        title: t("onboarding", "Welcome to PackTracker"),
        body: t("onboardingBody", "PackTracker helps you organize Minecraft mods, resource packs, and shaders per profile."),
      },
      {
        title: "Create a profile",
        body: "Start by making one Minecraft profile for the version and loader you actually want to use.",
      },
      {
        title: "Browse, scan, and update",
        body: "After that you can browse projects, scan an existing mods folder, and update tracked content later from the profile view.",
      },
    ];
    let index = 0;

    const renderStep = () => {
      const modalRoot = document.getElementById(MODAL_ROOT_ID);
      if (!modalRoot) {
        return;
      }

      const step = steps[index];
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      const modal = document.createElement("div");
      modal.className = "modal onboarding-modal";
      const body = document.createElement("div");
      body.className = "modal-body";

      const icon = document.createElement("div");
      icon.className = "welcome-icon onboarding-logo";
      icon.appendChild(createStateLogoImage());

      const title = document.createElement("div");
      title.className = "modal-title";
      title.textContent = step.title;

      const subtitle = document.createElement("div");
      subtitle.className = "modal-subtitle";
      subtitle.textContent = step.body;

      const progress = document.createElement("div");
      progress.className = "settings-field-help";
      progress.textContent = `Step ${index + 1} of ${steps.length}`;

      const actions = document.createElement("div");
      actions.className = "modal-actions";
      const skipButton = document.createElement("button");
      skipButton.className = "btn";
      skipButton.type = "button";
      skipButton.textContent = t("onboardingSkip", "Skip");
      skipButton.addEventListener("click", completeOnboarding);

      if (index === steps.length - 1) {
        const createButton = document.createElement("button");
        createButton.className = "btn";
        createButton.type = "button";
        createButton.textContent = "Create profile now";
        createButton.addEventListener("click", () => {
          completeOnboarding();
          showNewProfileModal();
        });
        const finishButton = document.createElement("button");
        finishButton.className = "btn btn-primary";
        finishButton.type = "button";
        finishButton.textContent = t("onboardingFinish", "Finish");
        finishButton.addEventListener("click", completeOnboarding);
        actions.append(skipButton, createButton, finishButton);
      } else {
        const nextButton = document.createElement("button");
        nextButton.className = "btn btn-primary";
        nextButton.type = "button";
        nextButton.textContent = t("onboardingNext", "Next");
        nextButton.addEventListener("click", () => {
          index += 1;
          renderStep();
        });
        actions.append(skipButton, nextButton);
      }

      body.append(icon, title, subtitle, progress, actions);
      modal.appendChild(body);
      overlay.appendChild(modal);
      modalRoot.replaceChildren(overlay);
    };

    renderStep();
  }

  /**
   * Marks onboarding as completed and closes the onboarding modal.
   */
  function completeOnboarding() {
    AppState.settings = typeof updateAppSettings === "function"
      ? updateAppSettings({ onboardingCompleted: true })
      : AppState.settings;
    closeTransientUi();
    if (AppState.settings?.seenReleaseNotesVersion !== RELEASE_NOTES.version) {
      showUpdateModal({ markSeenOnClose: true });
    }
  }

  /**
   * Opens a confirmation modal before all settings are reset.
   */
  function showResetSettingsConfirmModal() {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("div");
    modal.className = "modal";
    const body = document.createElement("div");
    body.className = "modal-body";
    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = t("resetSettingsConfirmTitle", "Reset all settings?");
    const subtitle = document.createElement("div");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = t("resetSettingsConfirmBody", "This will reset language, theme, onboarding, update prompts, and default download behavior.");
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "btn";
    cancelButton.type = "button";
    cancelButton.textContent = t("cancel", "Cancel");
    cancelButton.addEventListener("click", () => {
      showSettingsModal("general");
    });
    const confirmButton = document.createElement("button");
    confirmButton.className = "btn btn-danger";
    confirmButton.type = "button";
    confirmButton.textContent = "Reset";
    confirmButton.addEventListener("click", async () => {
      try {
        await clearDefaultDownloadDirectory();
      } catch (error) {
        // Ignore handle cleanup failures and still reset the visible settings snapshot.
      }
      visualSettingsDraft = null;
      AppState.settings = typeof resetAppSettings === "function"
        ? resetAppSettings()
        : AppState.settings;
      applyThemePreference();
      applyLocalizedShellText();
      renderApp();
      showSettingsModal("general");
    });
    actions.append(cancelButton, confirmButton);
    body.append(title, subtitle, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    modalRoot.replaceChildren(overlay);
  }

  /**
   * Creates a labeled settings field wrapper.
   *
   * @param {string} labelText - Visible field label.
   * @param {{experimental?: boolean}} [options] - Optional label flags.
   * @returns {HTMLDivElement} Wrapper element.
   */
  function createSettingsField(labelText, options = {}) {
    const field = document.createElement("div");
    field.className = "settings-field";
    const label = document.createElement("div");
    label.className = "settings-field-label";
    label.textContent = labelText;
    if (options.experimental) {
      label.appendChild(createExperimentalTag());
    }
    field.appendChild(label);
    return field;
  }

  /**
   * Creates the shared yellow Experimental tag used across the UI.
   *
   * @returns {HTMLSpanElement} Tag element.
   */
  function createExperimentalTag() {
    const tag = document.createElement("span");
    tag.className = "experimental-tag";
    tag.textContent = "Experimental";
    return tag;
  }

  /**
   * Creates a custom settings dropdown styled like the browse filters.
   *
   * @param {Array<{value:string,label:string}>} options - Select options.
   * @param {string} selectedValue - Current value.
   * @param {(value:string) => void} onChange - Selection handler.
   * @returns {HTMLDivElement} Dropdown wrapper.
   */
  function createSettingsDropdown(options, selectedValue, onChange) {
    const selectedOption = options.find((option) => option.value === selectedValue) || options[0];
    const select = document.createElement("div");
    select.className = "filter-select settings-select";

    const trigger = document.createElement("button");
    trigger.className = "filter-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const triggerValue = document.createElement("span");
    triggerValue.className = "filter-trigger-value";
    triggerValue.textContent = resolveDropdownOptionLabel(selectedOption);

    const caret = document.createElement("span");
    caret.className = "filter-trigger-caret";
    caret.textContent = "▾";
    trigger.append(triggerValue, caret);

    const menu = document.createElement("div");
    menu.className = "filter-menu";
    menu.setAttribute("role", "listbox");

    let isOpen = false;
    let handleOutsideClick = null;
    let handleEscape = null;

    function closeMenu() {
      if (!isOpen) {
        return;
      }

      isOpen = false;
      select.classList.remove("is-open");
      select.classList.add("is-closing");
      menu.classList.add("closing");
      trigger.setAttribute("aria-expanded", "false");
      if (handleOutsideClick) {
        window.removeEventListener("mousedown", handleOutsideClick);
        handleOutsideClick = null;
      }
      if (handleEscape) {
        window.removeEventListener("keydown", handleEscape);
        handleEscape = null;
      }
      window.setTimeout(() => {
        select.classList.remove("is-closing");
        menu.classList.remove("closing");
      }, 140);
    }

    function openMenu() {
      if (isOpen) {
        closeMenu();
        return;
      }

      isOpen = true;
      select.classList.remove("is-closing");
      menu.classList.remove("closing");
      select.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      handleOutsideClick = (event) => {
        if (!select.contains(event.target)) {
          closeMenu();
        }
      };
      handleEscape = (event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      };
      window.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("keydown", handleEscape);
    }

    options.forEach((optionData) => {
      const option = document.createElement("button");
      option.className = optionData.value === selectedValue ? "filter-option active" : "filter-option";
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", optionData.value === selectedValue ? "true" : "false");
      option.textContent = resolveDropdownOptionLabel(optionData);
      option.addEventListener("click", () => {
        triggerValue.textContent = resolveDropdownOptionLabel(optionData);
        closeMenu();
        onChange(optionData.value);
      });
      menu.appendChild(option);
    });

    trigger.addEventListener("click", openMenu);
    select.append(trigger, menu);
    return select;
  }

  /**
   * Resolves the visible label for one dropdown option, including translated settings labels.
   *
   * @param {{label?:string,labelKey?:string,value?:string}|undefined} option - Dropdown option.
   * @returns {string} Visible option label.
   */
  function resolveDropdownOptionLabel(option) {
    if (!option) {
      return "";
    }
    if (option.labelKey) {
      return t(option.labelKey, option.label || option.value || "");
    }
    return option.label || option.value || "";
  }

  /**
   * Creates one small action button for settings panels.
   *
   * @param {string} text - Button label.
   * @param {string} [modifier] - Optional button modifier class.
   * @returns {HTMLButtonElement} Button element.
   */
  function createSettingsActionButton(text, modifier = "") {
    const button = document.createElement("button");
    button.className = modifier ? `btn ${modifier}` : "btn";
    button.type = "button";
    button.textContent = text;
    return button;
  }

  /**
   * Parses and opens an incoming `?share=` URL payload once on app startup.
   */
  function handleIncomingShareLink() {
    if (typeof parseShareLink !== "function" || typeof showShareImportModal !== "function") {
      return;
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has("share")) {
      return;
    }

    try {
      const sharedProfile = parseShareLink(url.toString());
      url.searchParams.delete("share");
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", nextUrl);
      showShareImportModal(sharedProfile);
    } catch (error) {
      url.searchParams.delete("share");
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", nextUrl);
      showToast(error instanceof Error ? error.message : "Invalid share link", "danger");
    }
  }

  /**
   * Registers the service worker that makes the web build installable as a standalone app.
   */
  function registerStandaloneAppSupport() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      syncInstallButtonVisibility();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      syncInstallButtonVisibility();
      showToast("PackTracker installed as an app.", "success");
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=20260423-15").catch((error) => {
        console.warn("PackTracker: service worker registration failed", error);
      });
      syncInstallButtonVisibility();
    }, { once: true });
  }

  /**
   * Shows or hides the explicit install button based on browser install support.
   */
  function syncInstallButtonVisibility() {
    const installAppButton = document.getElementById("install-app-button");
    if (!installAppButton) {
      return;
    }

    const shouldShow = !isStandaloneAppMode() && Boolean(deferredInstallPrompt);
    installAppButton.classList.toggle("hidden", !shouldShow);
  }

  /**
   * Returns true when PackTracker already runs in standalone installed-app mode.
   *
   * @returns {boolean} Standalone display-mode flag.
   */
  function isStandaloneAppMode() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  Object.assign(window.PackTracker, {
    dismissRootChildren,
    t,
    showSettingsModal,
    showUpdateModal,
  });
})();
