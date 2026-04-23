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
        }
        importInput.value = "";
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Import failed", "danger");
        importInput.value = "";
      }
    });
  }

  /**
   * Shows a toast notification (placeholder until implementation).
   * 
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, danger, warning, etc.)
   */
  function showToast(message, type = "info") {
    const root = document.getElementById(TOAST_ROOT_ID);
    if (!root) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    root.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("toast-exit");
      window.setTimeout(() => toast.remove(), 150);
    }, 3000);
  }

  /**
   * Shows the app settings modal.
   * 
   * @param {string} tab - Settings tab (general, visual, updates, about)
   */
  function showSettingsModal(tab = "general") {
    const root = document.getElementById(MODAL_ROOT_ID);
    if (!root) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay closing";
    
    const modal = document.createElement("div");
    modal.className = "modal modal-wide closing";
    
    const body = document.createElement("div");
    body.className = "modal-body";
    
    const title = document.createElement("h2");
    title.className = "modal-title";
    title.textContent = "Settings";
    
    const subtitle = document.createElement("p");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = "Customize PackTracker to your preferences.";
    
    const content = document.createElement("div");
    content.className = "settings-content";
    content.innerHTML = "<p>Settings panel - coming soon</p>";
    
    const actions = document.createElement("div");
    actions.className = "action-row";
    
    const closeButton = document.createElement("button");
    closeButton.className = "btn btn-primary";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => {
      overlay.classList.remove("closing");
      modal.classList.remove("closing");
      window.setTimeout(() => overlay.remove(), 150);
    });
    
    actions.appendChild(closeButton);
    body.append(title, subtitle, content, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    root.appendChild(overlay);
    
    // Trigger animation
    window.requestAnimationFrame(() => {
      overlay.classList.remove("closing");
      modal.classList.remove("closing");
    });
  }

  /**
   * Dismisses root overlay children with fade animation.
   * 
   * @param {HTMLElement} root - Root container
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

  // Initialize app on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
      AppState.settings = typeof loadAppSettings === "function" ? loadAppSettings() : null;
      AppState.data = typeof loadData === "function" ? await loadData() : null;
      if (typeof recordAppVisit === "function") {
        recordAppVisit();
      }
      renderSidebar();
      renderProfileView();
      bindTopLevelEvents();
      handleIncomingShareLink();
    });
  } else {
    AppState.settings = typeof loadAppSettings === "function" ? loadAppSettings() : null;
    (async () => {
      AppState.data = typeof loadData === "function" ? await loadData() : null;
      if (typeof recordAppVisit === "function") {
        recordAppVisit();
      }
      renderSidebar();
      renderProfileView();
      bindTopLevelEvents();
      handleIncomingShareLink();
    })();
  }

  Object.assign(window.PackTracker, {
    dismissRootChildren,
    showToast,
    showSettingsModal,
  });
})();
