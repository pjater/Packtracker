(function attachMainModule() {
  const {
    AppState,
    getActiveProfile,
    getViewMode,
    isFavoritesProfileId,
    setActiveTab,
    setActiveProfile,
    setActiveView,
    setBrowseContext,
    setData,
    setSearchSource,
    setSearchState,
    setViewMode,
    subscribe,
    exportBackup,
    loadAppSettings,
    updateAppSettings,
    resetAppSettings,
    recordAppVisit,
    normalizeData,
    normalizeAppSettings,
    normalizeButtonVisibility,
    initializeAddonRuntime,
    refreshAddonRuntime,
    getAddonRuntimeState,
    getAddonMarketplaceEntries,
    installBundledAddon,
    removeAddon,
    setAddonEnabled,
    updateAddonConfig,
    importCustomAddonFile,
    setMarketplaceEnabled,
    setCustomAddonsExperimental,
    parseShareLink,
    importBackup,
    loadData,
    renderSidebar,
    showNewProfileModal,
    showClearProfilesConfirmModal,
    renderProfileView,
    focusSearchInput,
    renderSearchPage,
    renderShareView,
    requestBrowseSearch,
    showShareImportModal,
    chooseDefaultDownloadDirectory,
    clearDefaultDownloadDirectory,
    clearProfiles,
    syncScrollDownButton,
    toggleLayoutEditMode,
    clearActiveTabItems,
    showClearActiveTabItemsModal,
    eventToKeybindCombo,
    matchesKeybindEvent,
    normalizeKeybindCombo,
    initializeCloudAuth,
    refreshCloudSessionState,
    hasSupabaseConfig,
    loadCloudBootstrap,
    importLocalStateToCloud,
    signUpCloudAccount,
    signInCloudAccount,
    signOutCloudAccount,
    listAdminAccounts,
    isButtonVisible,
  } = window.PackTracker;

  const HOME_VIEW_ID = "view-home";
  const SEARCH_VIEW_ID = "view-search";
  const SHARE_VIEW_ID = "view-share";
  const APP_ROOT_ID = "app";
  const MODAL_ROOT_ID = "modal-root";
  const CONTEXT_ROOT_ID = "context-menu-root";
  const TOAST_ROOT_ID = "toast-root";
  const LOCAL_MODE_BACKUP_KEY = "packtracker_signed_out_snapshot_v1";
  const CLOUD_IMPORT_DISMISS_PREFIX = "packtracker_cloud_import_dismissed_";
  const PAGE_ENTER_CLASS = "page-enter";
  const PAGE_EXIT_CLASS = "page-exit";
  const PAGE_EXIT_MS = 120;
  const PAGE_ENTER_MS = 240;
  const RELEASE_NOTES = {
    version: "2026.08.07",
    title: "PackTracker update",
    bullets: [
      "Added UI style options in Visual settings, including Blur and Glassy modes.",
      "Added compact update-result icons with expandable More/Less logs.",
      "Added an Advanced setting to choose compact update results or full logs by default.",
      "Improved update progress with a large rounded progress circle and stable item status rows.",
      "Fixed flickering in update progress, scan results, and the floating scroll-to-bottom button.",
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
  const UI_STYLES = [
    { value: "packtracker", label: "Standaard (PackTracker)" },
    { value: "blur", label: "Blur" },
    { value: "glassy", label: "Glassy" },
  ];
  const FONT_STYLES = [
    { value: "default", label: "Default" },
    { value: "manrope", label: "Manrope" },
    { value: "poppins", label: "Poppins" },
    { value: "serif", label: "Merriweather" },
    { value: "monospace", label: "Monospace" },
  ];
  const DOWNLOAD_BEHAVIORS = [
    { value: "browser", labelKey: "browserDownload", label: "Browser download" },
    { value: "ask", labelKey: "askBrowserEachTime", label: "Ask each time" },
    { value: "default", labelKey: "saveDirectlyToDefaultFolder", label: "Save directly to default folder" },
  ];
  const SCROLL_DOWN_BUTTON_MODES = [
    { value: "always", labelKey: "always", label: "Always" },
    { value: "smart", labelKey: "smart", label: "Smart" },
    { value: "never", labelKey: "never", label: "Never" },
  ];
  const UPDATE_PROGRESS_DISPLAY_OPTIONS = [
    { value: "icons", label: "Status icons" },
    { value: "logs", label: "Full logs" },
  ];
  const BUTTON_VISIBILITY_OPTIONS = [
    { value: "show", labelKey: "show", label: "Show" },
    { value: "hide", labelKey: "hide", label: "Hide" },
  ];
  const BUTTON_VISIBILITY_DEFINITIONS = [
    { key: "clearProfiles", labelKey: "buttonClearProfiles", fallback: "Clear profiles button" },
    { key: "addManual", labelKey: "buttonAddManual", fallback: "Add manual button" },
    { key: "updateContent", labelKey: "buttonUpdateContent", fallback: "Update content button" },
    { key: "downloadZip", labelKey: "buttonDownloadZip", fallback: "Download ZIP button" },
    { key: "clearItems", labelKey: "buttonClearItems", fallback: "Clear items button" },
    { key: "shareProfile", labelKey: "buttonShareProfile", fallback: "Share profile button" },
    { key: "scanMinecraftFolder", labelKey: "buttonScanMinecraftFolder", fallback: "Scan Minecraft folder button" },
    { key: "exportBackup", labelKey: "buttonExportBackup", fallback: "Export backup button" },
    { key: "importBackup", labelKey: "buttonImportBackup", fallback: "Import backup button" },
  ];
  const KEYBIND_ACTION_DEFINITIONS = [
    { key: "openSearch", label: "Open search", description: "Open the browse page and focus search.", defaultCombo: "Ctrl+K" },
    { key: "openSettings", label: "Open settings", description: "Open the settings window.", defaultCombo: "Ctrl+Comma" },
    { key: "newProfile", label: "New profile", description: "Create a new profile.", defaultCombo: "Ctrl+N" },
    { key: "modsTab", label: "Mods tab", description: "Jump straight to the Mods tab.", defaultCombo: "Alt+1" },
    { key: "resourcePacksTab", label: "Resource packs tab", description: "Jump straight to the Resource Packs tab.", defaultCombo: "Alt+2" },
    { key: "shadersTab", label: "Shaders tab", description: "Jump straight to the Shaders tab.", defaultCombo: "Alt+3" },
    { key: "toggleLayoutEdit", label: "Toggle edit layout", description: "Toggle drag-reorder mode for the current tab.", defaultCombo: "Ctrl+E" },
    { key: "clearItems", label: "Clear items", description: "Clear every item from the current tab.", defaultCombo: "Ctrl+Shift+Delete" },
    { key: "clearProfiles", label: "Clear profiles", description: "Remove every saved profile.", defaultCombo: "Ctrl+Shift+Backspace" },
    { key: "toggleViewMode", label: "Toggle list/grid", description: "Switch the current tab between list and grid mode.", defaultCombo: "Ctrl+Shift+V" },
  ];
  const TRANSLATIONS = {
    en: {
      installApp: "Install app",
      exportBackup: "Export backup",
      importBackup: "Import backup",
      account: "Account",
      signIn: "Sign in",
      signUp: "Sign up",
      signOut: "Sign out",
      emailAddress: "Email address",
      password: "Password",
      signedInAs: "Signed in as",
      localMode: "Local mode",
      cloudMode: "Cloud mode",
      adminAccounts: "Admin accounts",
      openAdminAccounts: "Open admin accounts",
      accountCreatedAt: "Created",
      accountRole: "Role",
      accountSetupRequired: "Supabase is not configured yet. Add the project URL and anon key before using accounts.",
      accountCreateHelp: "Create an email/password account stored in Supabase, not just in this browser.",
      accountLoginHelp: "Sign in to load your cloud-synced profiles, items, and settings.",
      accountSignedOutHelp: "When signed out, PackTracker keeps working in local-only mode.",
      accountSignedInHelp: "Changes now sync to your hosted PackTracker account.",
      accountMissingFields: "Enter both email and password.",
      accountCreatedSuccess: "Account created. You can sign in now.",
      accountSignedInSuccess: "Signed in.",
      accountSignedOutSuccess: "Signed out.",
      accountLoadFailed: "Could not load cloud account data.",
      localImportToCloudTitle: "Import local data to this account?",
      localImportToCloudBody: "This account has no cloud profiles yet, but this browser already has local PackTracker data. Import it once into your account?",
      importLocalData: "Import local data",
      keepCloudEmpty: "Keep cloud empty",
      localDataImported: "Local PackTracker data was imported to your account.",
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
      keybinds: "Keybinds",
      buttons: "Buttons",
      advanced: "Advanced",
      updates: "Updates",
      extra: "Extra",
      about: "About",
      onboarding: "Welcome to PackTracker",
      onboardingBody: "PackTracker helps you organize Minecraft mods, resource packs, and shaders per profile.",
      onboardingNext: "Next",
      onboardingSkip: "Skip",
      onboardingFinish: "Finish",
      language: "Language",
      theme: "Theme",
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
      updateToVersion: "↻ Update content",
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
      generalSettingsIntro: "Choose language and other app-wide behavior settings.",
      visualSettingsIntro: "Adjust theme, accent color, motion, blur, and other appearance settings for PackTracker.",
      keybindsSettingsIntro: "Set the keyboard shortcuts that control common PackTracker actions.",
      buttonsSettingsIntro: "Choose which command buttons are shown in PackTracker.",
      advancedSettingsIntro: "Control startup and download behavior for more advanced PackTracker usage.",
      show: "Show",
      hide: "Hide",
      buttonClearProfiles: "Clear profiles button",
      buttonAddManual: "Add manual button",
      buttonUpdateContent: "Update content button",
      buttonDownloadZip: "Download ZIP button",
      buttonClearItems: "Clear items button",
      buttonShareProfile: "Share profile button",
      buttonScanMinecraftFolder: "Scan Minecraft folder button",
      buttonExportBackup: "Export backup button",
      buttonImportBackup: "Import backup button",
      defaultDownloadFolder: "Default download folder",
      downloadsFolderHintEmpty: "No default folder selected yet. Pick a normal folder or subfolder, not the Windows Downloads root.",
      currentFolderPrefix: "Current folder:",
      chooseFolder: "Choose folder",
      clearFolder: "Clear folder",
      downloadBehavior: "Download behavior",
      browserDownload: "Browser download",
      downloadBehaviorDefaultHelp: "PackTracker will try to save files directly into the chosen folder when the browser allows it.",
      downloadBehaviorAskHelp: "PackTracker will ask where to save direct downloads when the browser allows it.",
      downloadBehaviorBrowserHelp: "PackTracker will use the browser's normal download flow without extra save prompts. This is the quietest option.",
      scrollDownButton: "Scroll-to-bottom button",
      scrollDownButtonHelp: "Shows a floating button that jumps to the bottom of long lists and version pickers.",
      scrollDownButtonAlwaysHelp: "Always show the button when a page or modal can scroll further.",
      scrollDownButtonSmartHelp: "Show the button after you scroll a bit on long pages, whether that movement is up or down.",
      scrollDownButtonNeverHelp: "Never show the floating bottom button.",
      confirmItemRemoval: "Confirm item removal",
      confirmItemRemovalHelp: "Show a 'Are you sure?' popup before removing one item from a list.",
      askBrowserEachTime: "Ask each time",
      switchToProviderExperimental: "Switch to {source}",
      saveDirectlyToDefaultFolder: "Save directly to default folder",
      resetAllSettings: "Reset all settings",
      resetSettingsHelp: "This resets language, theme, update prompts, and download preferences.",
      resetSettingsConfirmTitle: "Reset all settings?",
      resetSettingsConfirmBody: "This will reset language, theme, update prompts, and default download behavior. The first-run tutorial will stay completed.",
      startupBootScreen: "Startup boot screen",
      startupBootScreenHelp: "Shows a short PackTracker splash screen when the app opens.",
      enabled: "Enabled",
      cancel: "Cancel",
      saveVisualSettings: "Save visual settings",
      visualSettingsSaved: "Visual settings saved.",
      saveKeybinds: "Save keybinds",
      keybindsSaved: "Keybinds saved.",
      resetKeybinds: "Reset to default",
      accentColor: "Accent color",
      custom: "Custom",
      resetToDefault: "Reset to default",
      keybindComboPlaceholder: "Press keys...",
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
      projectSources: "Project sources",
      projectSourcesBody: "Open the main Minecraft project directories in a new tab.",
      aboutPackTracker: "About PackTracker",
      openGitHub: "Open GitHub",
      openSettings: "Open settings",
      createProfileNow: "Create profile now",
      reset: "Reset",
      allChangesSaved: "All changes saved",
      unsavedChanges: "Unsaved changes",
      createProfile: "Create a profile",
      createProfileBody: "Start by making one Minecraft profile for the version and loader you actually want to use.",
      browseScanUpdate: "Browse, scan, and update",
      browseScanUpdateBody: "After that you can browse projects, scan an existing mods folder, and update tracked content later from the profile view.",
      newProfileModalTitle: "New profile",
      saveProfile: "Save profile",
      profileSettings: "Profile settings",
      profileSettingsBody: "Update the name, Minecraft version, and loader for this profile.",
      profileName: "Profile name",
      minecraftVersion: "Minecraft version",
      loader: "Loader",
      duplicateProfile: "Duplicate profile",
      deleteProfile: "Delete profile",
      createProfileModalBody: "Create a profile for a specific Minecraft setup.",
      deleteProfileConfirmTitle: "Delete profile?",
      deleteProfileConfirmBody: "Are you sure you want to delete '{name}'? This cannot be undone.",
      experimental: "Experimental",
      scanResults: "Scan Results",
      scanCouldNotOpenFolder: "Could not open the selected folder.",
      scanFoundSuffix: "found",
      closeScanResults: "Close scan results",
      scanExperimentalBody: "Scan results may be incomplete or inaccurate. It is safer to add items manually or double-check everything before adding it to your profile.",
      scanProviderPreferenceSet: "Scan provider preference set to",
      adding: "Adding...",
      addAllFound: "Add All Found",
      added: "Added",
      matchFound: "Match found",
      tracked: "Tracked",
      notFound: "Not found",
      searching: "Searching...",
      searchAction: "Search",
      sharedProfile: "Shared profile",
      unknown: "Unknown",
      modsLower: "mods",
      resourcePacksLower: "resource packs",
      shadersLower: "shaders",
      backToApp: "Back to app",
      zipDownloadFailed: "ZIP download failed",
      sharedProfileEmptyTab: "This shared profile has no items in the current tab.",
      importToMyProfiles: "Import to my profiles",
      importSharedProfile: "Import shared profile",
      importSharedProfileBody: "You can import this pack into your own library or open a read-only download page first.",
      profile: "Profile",
      minecraft: "Minecraft",
      contents: "Contents",
      downloadOnly: "Download only",
      importProfile: "Import profile",
      noLink: "No link",
      download: "Download",
      downloadFailed: "Download failed",
      addToProfile: "+ Add to profile",
      notThisOne: "Not this one",
      openProjectPage: "Open project page",
      notes: "Notes",
      save: "Save",
      add: "Add",
      noMatchingItems: "No matching items.",
      favoritesHelpText: "Use the star button on items in a normal profile to add them here.",
      closeUpdateProgress: "Close update progress",
      closeDownloads: "Close downloads",
      fetchingModrinthDetails: "Fetching Modrinth details...",
      preparing: "Preparing...",
      downloadFile: "Download file",
      switching: "Switching...",
      by: "by",
      unknownAuthor: "Unknown author",
      noDescriptionProvided: "No description provided.",
      changeVersion: "Change version",
      pickVersion: "Pick version",
      updateToSelected: "Update to selected",
      noVersionsAvailable: "No versions available",
      noInstallableVersionsBody: "{source} did not return any installable versions for this project.",
      thisItem: "this item",
      addItemToProfile: "Add {item} to {profile}",
      changeVersionForItem: "Change version for {item}",
      chooseSourceVersionForProfile: "Choose a {source} version for {loader} {version}.",
      anyVersion: "any version",
      unknownVersion: "Unknown version",
      recommended: "Recommended",
      released: "released",
      addSelectedVersion: "Add selected version",
      updateCollectionToMinecraftVersion: "Update {collection} to a Minecraft version",
      bulkUpdateBody: "PackTracker will try to find the newest compatible tracked version for every visible item. If it cannot find one, it will tell you why.",
      targetMinecraftVersion: "Target Minecraft version",
      modsMatchedAgainstBody: "Mods will be matched against {loader} and the target Minecraft version.",
      packsMatchedAgainstBody: "Resource packs and shaders will be matched against the chosen Minecraft version when possible.",
      providerPreference: "Provider preference",
      startUpdate: "Start update",
      missingDependenciesFor: "Missing dependencies for {name}",
      unavailable: "Unavailable",
      failedToFetchProjectDetails: "Failed to fetch project details.",
      editNotes: "Edit notes",
      providerSwitchFailed: "Provider switch failed",
      deleteThing: "Delete {name}?",
      confirmRemoveTrackedItemBody: "This removes the item from the current list. This cannot be undone.",
      deleteProfileItemsBody: "This removes the profile and every tracked item from PackTracker.",
      delete: "Delete",
      containsMods: "Contains {count} mods",
      updateProviderPreference: "Update provider preference",
      updateProviderPreferenceBody: "Choose which source PackTracker should prefer first when checking for newer compatible versions.",
      updateProviderAutoBody: "Use the current item source first, then try the other provider if needed.",
      updateProviderSpecificBody: "Try {source} first, then fall back if no compatible match exists.",
      savePreference: "Save preference",
      updatePreferenceSaved: "Update preference saved",
      shareLinkCopied: "Share link copied!",
      shareLinkCopyFailed: "Could not copy share link",
      addFlowNotReady: "Add flow is not ready yet. Please try again.",
      appAlreadyInstalled: "PackTracker is already installed as an app.",
      appInstallNotAvailable: "App install is not available yet in this browser. Try Chrome or Edge over HTTPS.",
      importFailed: "Import failed",
      unknownStartupError: "Unknown startup error.",
      defaultDownloadFolderSet: "Default download folder set to {name}.",
      couldNotChooseDefaultFolder: "Could not choose a default folder.",
      couldNotClearDefaultFolder: "Could not clear the default folder.",
      currentRelease: "Current release: {version}",
      aboutPackTrackerBody: "PackTracker is made by Pjater, and this web app can also be installed like an app in supported browsers.",
      viewingRelease: "You're viewing release {version}.",
      stepOf: "Step {current} of {total}",
      invalidShareLink: "Invalid share link",
      appInstalled: "PackTracker installed as an app.",
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
      language: "语言",
      theme: "主题",
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
      updateToVersion: "↻ 更新内容",
      editLayout: "编辑布局",
      doneEditing: "完成编辑",
      noModsYet: "还没有模组",
      noResourcePacksYet: "还没有材质包",
      noShadersYet: "还没有着色器",
      mods: "模组",
      resourcePacks: "资源包",
      shaders: "着色器",
      projectSources: "项目来源",
      projectSourcesBody: "在新标签页中打开主要的 Minecraft 项目目录。",
      aboutPackTracker: "关于 PackTracker",
      openGitHub: "打开 GitHub",
      openSettings: "打开设置",
      createProfileNow: "立即创建配置",
      reset: "重置",
      allChangesSaved: "所有更改已保存",
      unsavedChanges: "有未保存的更改",
      createProfile: "创建配置",
      createProfileBody: "先为你实际想使用的版本和加载器创建一个 Minecraft 配置。",
      browseScanUpdate: "浏览、扫描和更新",
      browseScanUpdateBody: "之后你可以浏览项目、扫描已有的 mods 文件夹，并稍后在配置页面更新已跟踪的内容。",
      newProfileModalTitle: "新建配置",
      saveProfile: "保存配置",
      profileSettings: "配置设置",
      profileSettingsBody: "更新此配置的名称、Minecraft 版本和加载器。",
      profileName: "配置名称",
      minecraftVersion: "Minecraft 版本",
      loader: "加载器",
      duplicateProfile: "复制配置",
      deleteProfile: "删除配置",
      createProfileModalBody: "为特定的 Minecraft 配置创建一个档案。",
      deleteProfileConfirmTitle: "删除配置？",
      deleteProfileConfirmBody: "确定要删除“{name}”吗？此操作无法撤销。",
      experimental: "实验性",
      scanResults: "扫描结果",
      scanCouldNotOpenFolder: "无法打开所选文件夹。",
      scanFoundSuffix: "已找到",
      closeScanResults: "关闭扫描结果",
      scanExperimentalBody: "扫描结果可能不完整或不准确。更安全的做法是手动添加项目，或在添加到配置前仔细核对。",
      scanProviderPreferenceSet: "扫描来源偏好已设为",
      adding: "添加中...",
      addAllFound: "添加全部找到的项目",
      added: "已添加",
      matchFound: "找到匹配项",
      tracked: "已跟踪",
      notFound: "未找到",
      searching: "搜索中...",
      searchAction: "搜索",
      sharedProfile: "共享配置",
      unknown: "未知",
      modsLower: "模组",
      resourcePacksLower: "资源包",
      shadersLower: "着色器",
      backToApp: "返回应用",
      zipDownloadFailed: "ZIP 下载失败",
      sharedProfileEmptyTab: "这个共享配置在当前标签中没有项目。",
      importToMyProfiles: "导入到我的配置",
      importSharedProfile: "导入共享配置",
      importSharedProfileBody: "你可以将这个包导入到自己的库中，或先打开只读下载页面。",
      profile: "配置",
      minecraft: "Minecraft",
      contents: "内容",
      downloadOnly: "仅下载",
      importProfile: "导入配置",
      noLink: "无链接",
      download: "下载",
      downloadFailed: "下载失败",
      addToProfile: "+ 添加到配置",
      notThisOne: "不是这个",
      openProjectPage: "打开项目页面",
      notes: "备注",
      save: "保存",
      add: "添加",
      noMatchingItems: "没有匹配的项目。",
      favoritesHelpText: "在普通配置中的项目上使用星标按钮即可把它们加到这里。",
      closeUpdateProgress: "关闭更新进度",
      closeDownloads: "关闭下载列表",
      fetchingModrinthDetails: "正在获取 Modrinth 详情...",
      preparing: "准备中...",
      downloadFile: "下载文件",
      switching: "切换中...",
      by: "作者",
      unknownAuthor: "未知作者",
      noDescriptionProvided: "没有提供描述。",
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
      language: "भाषा",
      theme: "थीम",
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
      updateToVersion: "↻ सामग्री अपडेट करें",
      editLayout: "लेआउट संपादित करें",
      doneEditing: "संपादन पूरा",
      noModsYet: "अभी कोई mod नहीं",
      noResourcePacksYet: "अभी कोई resource pack नहीं",
      noShadersYet: "अभी कोई shader नहीं",
      mods: "मॉड्स",
      resourcePacks: "रिसोर्स पैक्स",
      shaders: "शेडर्स",
      projectSources: "प्रोजेक्ट स्रोत",
      projectSourcesBody: "मुख्य Minecraft प्रोजेक्ट डायरेक्टरी को नए टैब में खोलें।",
      aboutPackTracker: "PackTracker के बारे में",
      openGitHub: "GitHub खोलें",
      openSettings: "सेटिंग्स खोलें",
      createProfileNow: "अभी प्रोफाइल बनाएं",
      reset: "रीसेट",
      allChangesSaved: "सभी बदलाव सहेजे गए",
      unsavedChanges: "बदलाव अभी सहेजे नहीं गए",
      createProfile: "प्रोफाइल बनाएं",
      createProfileBody: "जिस वर्शन और लोडर का आप सच में उपयोग करना चाहते हैं, उसके लिए पहले एक Minecraft प्रोफाइल बनाएं।",
      browseScanUpdate: "ब्राउज़, स्कैन और अपडेट",
      browseScanUpdateBody: "इसके बाद आप प्रोजेक्ट ब्राउज़ कर सकते हैं, मौजूदा mods फ़ोल्डर को स्कैन कर सकते हैं और बाद में प्रोफाइल व्यू से ट्रैक की गई सामग्री अपडेट कर सकते हैं।",
      newProfileModalTitle: "नया प्रोफाइल",
      saveProfile: "प्रोफाइल सहेजें",
      profileSettings: "प्रोफाइल सेटिंग्स",
      profileSettingsBody: "इस प्रोफाइल का नाम, Minecraft वर्शन और लोडर अपडेट करें।",
      profileName: "प्रोफाइल नाम",
      minecraftVersion: "Minecraft वर्शन",
      loader: "लोडर",
      duplicateProfile: "प्रोफाइल की कॉपी बनाएं",
      deleteProfile: "प्रोफाइल हटाएं",
      createProfileModalBody: "किसी खास Minecraft सेटअप के लिए प्रोफाइल बनाएं।",
      deleteProfileConfirmTitle: "प्रोफाइल हटाएं?",
      deleteProfileConfirmBody: "क्या आप वाकई '{name}' को हटाना चाहते हैं? यह वापस नहीं आएगा।",
      experimental: "प्रयोगात्मक",
      scanResults: "स्कैन परिणाम",
      scanCouldNotOpenFolder: "चुना गया फ़ोल्डर नहीं खुल सका।",
      scanFoundSuffix: "मिले",
      closeScanResults: "स्कैन परिणाम बंद करें",
      scanExperimentalBody: "स्कैन परिणाम अधूरे या गलत हो सकते हैं। प्रोफाइल में जोड़ने से पहले चीज़ों को मैन्युअली जोड़ना या दोबारा जांचना अधिक सुरक्षित है।",
      scanProviderPreferenceSet: "स्कैन प्रोवाइडर पसंद सेट की गई:",
      adding: "जोड़ रहा है...",
      addAllFound: "मिले हुए सभी जोड़ें",
      added: "जोड़ दिया गया",
      matchFound: "मिलान मिला",
      tracked: "ट्रैक किया गया",
      notFound: "नहीं मिला",
      searching: "खोज रहा है...",
      searchAction: "खोजें",
      sharedProfile: "शेयर किया गया प्रोफाइल",
      unknown: "अज्ञात",
      modsLower: "mods",
      resourcePacksLower: "resource packs",
      shadersLower: "shaders",
      backToApp: "ऐप पर वापस जाएँ",
      zipDownloadFailed: "ZIP डाउनलोड विफल हुआ",
      sharedProfileEmptyTab: "इस साझा प्रोफाइल में मौजूदा टैब पर कोई आइटम नहीं है।",
      importToMyProfiles: "मेरे प्रोफाइल में आयात करें",
      importSharedProfile: "साझा प्रोफाइल आयात करें",
      importSharedProfileBody: "आप इस पैक को अपनी लाइब्रेरी में आयात कर सकते हैं या पहले सिर्फ-पढ़ने वाला डाउनलोड पेज खोल सकते हैं।",
      profile: "प्रोफाइल",
      minecraft: "Minecraft",
      contents: "सामग्री",
      downloadOnly: "सिर्फ डाउनलोड",
      importProfile: "प्रोफाइल आयात करें",
      noLink: "कोई लिंक नहीं",
      download: "डाउनलोड",
      downloadFailed: "डाउनलोड विफल हुआ",
      addToProfile: "+ प्रोफाइल में जोड़ें",
      notThisOne: "यह वाला नहीं",
      openProjectPage: "प्रोजेक्ट पेज खोलें",
      notes: "नोट्स",
      save: "सहेजें",
      add: "जोड़ें",
      noMatchingItems: "कोई मेल खाते आइटम नहीं मिले।",
      favoritesHelpText: "यहाँ जोड़ने के लिए सामान्य प्रोफाइल में आइटम पर स्टार बटन का उपयोग करें।",
      closeUpdateProgress: "अपडेट प्रगति बंद करें",
      closeDownloads: "डाउनलोड बंद करें",
      fetchingModrinthDetails: "Modrinth विवरण लोड हो रहा है...",
      preparing: "तैयार कर रहा है...",
      downloadFile: "फ़ाइल डाउनलोड करें",
      switching: "बदल रहा है...",
      by: "द्वारा",
      unknownAuthor: "अज्ञात लेखक",
      noDescriptionProvided: "कोई विवरण उपलब्ध नहीं है।",
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
      language: "Idioma",
      theme: "Tema",
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
      updateToVersion: "↻ Actualizar contenido",
      editLayout: "Editar diseño",
      doneEditing: "Terminar edición",
      noModsYet: "Aún no hay mods",
      noResourcePacksYet: "Aún no hay resource packs",
      noShadersYet: "Aún no hay shaders",
      mods: "Mods",
      resourcePacks: "Resource Packs",
      shaders: "Shaders",
      projectSources: "Fuentes del proyecto",
      projectSourcesBody: "Abre los directorios principales de proyectos de Minecraft en una pestaña nueva.",
      aboutPackTracker: "Acerca de PackTracker",
      openGitHub: "Abrir GitHub",
      openSettings: "Abrir ajustes",
      createProfileNow: "Crear perfil ahora",
      reset: "Restablecer",
      allChangesSaved: "Todos los cambios están guardados",
      unsavedChanges: "Hay cambios sin guardar",
      createProfile: "Crear perfil",
      createProfileBody: "Empieza creando un perfil de Minecraft para la versión y el loader que realmente quieres usar.",
      browseScanUpdate: "Explorar, escanear y actualizar",
      browseScanUpdateBody: "Después puedes explorar proyectos, escanear una carpeta de mods existente y actualizar más tarde el contenido seguido desde la vista del perfil.",
      newProfileModalTitle: "Nuevo perfil",
      saveProfile: "Guardar perfil",
      profileSettings: "Ajustes del perfil",
      profileSettingsBody: "Actualiza el nombre, la versión de Minecraft y el loader de este perfil.",
      profileName: "Nombre del perfil",
      minecraftVersion: "Versión de Minecraft",
      loader: "Loader",
      duplicateProfile: "Duplicar perfil",
      deleteProfile: "Eliminar perfil",
      createProfileModalBody: "Crea un perfil para una configuración específica de Minecraft.",
      deleteProfileConfirmTitle: "¿Eliminar perfil?",
      deleteProfileConfirmBody: "¿Seguro que quieres eliminar '{name}'? Esto no se puede deshacer.",
      experimental: "Experimental",
      scanResults: "Resultados del escaneo",
      scanCouldNotOpenFolder: "No se pudo abrir la carpeta seleccionada.",
      scanFoundSuffix: "encontrados",
      closeScanResults: "Cerrar resultados del escaneo",
      scanExperimentalBody: "Los resultados del escaneo pueden estar incompletos o ser inexactos. Es más seguro añadir los elementos manualmente o revisar todo antes de añadirlo a tu perfil.",
      scanProviderPreferenceSet: "La preferencia del proveedor de escaneo se estableció en",
      adding: "Añadiendo...",
      addAllFound: "Añadir todo lo encontrado",
      added: "Añadido",
      matchFound: "Coincidencia encontrada",
      tracked: "Seguido",
      notFound: "No encontrado",
      searching: "Buscando...",
      searchAction: "Buscar",
      sharedProfile: "Perfil compartido",
      unknown: "Desconocido",
      modsLower: "mods",
      resourcePacksLower: "resource packs",
      shadersLower: "shaders",
      backToApp: "Volver a la app",
      zipDownloadFailed: "Falló la descarga ZIP",
      sharedProfileEmptyTab: "Este perfil compartido no tiene elementos en la pestaña actual.",
      importToMyProfiles: "Importar a mis perfiles",
      importSharedProfile: "Importar perfil compartido",
      importSharedProfileBody: "Puedes importar este pack a tu biblioteca o abrir primero una página de descarga de solo lectura.",
      profile: "Perfil",
      minecraft: "Minecraft",
      contents: "Contenido",
      downloadOnly: "Solo descargar",
      importProfile: "Importar perfil",
      noLink: "Sin enlace",
      download: "Descargar",
      downloadFailed: "Descarga fallida",
      addToProfile: "+ Añadir al perfil",
      notThisOne: "No es este",
      openProjectPage: "Abrir página del proyecto",
      notes: "Notas",
      save: "Guardar",
      add: "Añadir",
      noMatchingItems: "No hay elementos coincidentes.",
      favoritesHelpText: "Usa el botón de estrella en elementos de un perfil normal para añadirlos aquí.",
      closeUpdateProgress: "Cerrar progreso de actualización",
      closeDownloads: "Cerrar descargas",
      fetchingModrinthDetails: "Obteniendo detalles de Modrinth...",
      preparing: "Preparando...",
      downloadFile: "Descargar archivo",
      switching: "Cambiando...",
      by: "por",
      unknownAuthor: "Autor desconocido",
      noDescriptionProvided: "No se proporcionó descripción.",
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
      language: "اللغة",
      theme: "السمة",
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
      updateToVersion: "↻ تحديث المحتوى",
      editLayout: "تعديل التخطيط",
      doneEditing: "إنهاء التحرير",
      noModsYet: "لا توجد مودات بعد",
      noResourcePacksYet: "لا توجد حزم موارد بعد",
      noShadersYet: "لا توجد شيدر بعد",
      mods: "المودات",
      resourcePacks: "حزم الموارد",
      shaders: "الشيدر",
      projectSources: "مصادر المشاريع",
      projectSourcesBody: "افتح مجلدات مشاريع Minecraft الرئيسية في علامة تبويب جديدة.",
      aboutPackTracker: "حول PackTracker",
      openGitHub: "فتح GitHub",
      openSettings: "فتح الإعدادات",
      createProfileNow: "أنشئ ملفًا الآن",
      reset: "إعادة تعيين",
      allChangesSaved: "تم حفظ كل التغييرات",
      unsavedChanges: "هناك تغييرات غير محفوظة",
      createProfile: "إنشاء ملف",
      createProfileBody: "ابدأ بإنشاء ملف Minecraft للإصدار والمحمّل اللذين تريد استخدامهما فعلاً.",
      browseScanUpdate: "تصفح وافحص وحدّث",
      browseScanUpdateBody: "بعد ذلك يمكنك تصفح المشاريع وفحص مجلد mods موجود وتحديث المحتوى المتعقّب لاحقًا من عرض الملف.",
      newProfileModalTitle: "ملف جديد",
      saveProfile: "حفظ الملف",
      profileSettings: "إعدادات الملف",
      profileSettingsBody: "حدّث الاسم وإصدار Minecraft والمحمّل لهذا الملف.",
      profileName: "اسم الملف",
      minecraftVersion: "إصدار Minecraft",
      loader: "المحمّل",
      duplicateProfile: "نسخ الملف",
      deleteProfile: "حذف الملف",
      createProfileModalBody: "أنشئ ملفًا لإعداد Minecraft محدد.",
      deleteProfileConfirmTitle: "حذف الملف؟",
      deleteProfileConfirmBody: "هل أنت متأكد أنك تريد حذف '{name}'؟ لا يمكن التراجع عن هذا.",
      experimental: "تجريبي",
      scanResults: "نتائج الفحص",
      scanCouldNotOpenFolder: "تعذر فتح المجلد المحدد.",
      scanFoundSuffix: "تم العثور عليها",
      closeScanResults: "إغلاق نتائج الفحص",
      scanExperimentalBody: "قد تكون نتائج الفحص غير مكتملة أو غير دقيقة. من الأفضل إضافة العناصر يدويًا أو مراجعة كل شيء قبل إضافته إلى ملفك.",
      scanProviderPreferenceSet: "تم تعيين تفضيل مزود الفحص إلى",
      adding: "جارٍ الإضافة...",
      addAllFound: "إضافة كل ما تم العثور عليه",
      added: "تمت الإضافة",
      matchFound: "تم العثور على تطابق",
      tracked: "متتبع",
      notFound: "غير موجود",
      searching: "جارٍ البحث...",
      searchAction: "بحث",
      sharedProfile: "ملف مشترك",
      unknown: "غير معروف",
      modsLower: "مودات",
      resourcePacksLower: "حزم موارد",
      shadersLower: "شيدر",
      backToApp: "العودة إلى التطبيق",
      zipDownloadFailed: "فشل تنزيل ZIP",
      sharedProfileEmptyTab: "لا يحتوي هذا الملف المشترك على عناصر في التبويب الحالي.",
      importToMyProfiles: "استيراد إلى ملفاتي",
      importSharedProfile: "استيراد ملف مشترك",
      importSharedProfileBody: "يمكنك استيراد هذه الحزمة إلى مكتبتك أو فتح صفحة تنزيل للقراءة فقط أولاً.",
      profile: "الملف",
      minecraft: "Minecraft",
      contents: "المحتويات",
      downloadOnly: "تنزيل فقط",
      importProfile: "استيراد الملف",
      noLink: "لا يوجد رابط",
      download: "تنزيل",
      downloadFailed: "فشل التنزيل",
      addToProfile: "+ إضافة إلى الملف",
      notThisOne: "ليس هذا",
      openProjectPage: "فتح صفحة المشروع",
      notes: "ملاحظات",
      save: "حفظ",
      add: "إضافة",
      noMatchingItems: "لا توجد عناصر مطابقة.",
      favoritesHelpText: "استخدم زر النجمة على العناصر في ملف عادي لإضافتها هنا.",
      closeUpdateProgress: "إغلاق تقدم التحديث",
      closeDownloads: "إغلاق التنزيلات",
      fetchingModrinthDetails: "جارٍ جلب تفاصيل Modrinth...",
      preparing: "جارٍ التحضير...",
      downloadFile: "تنزيل الملف",
      switching: "جارٍ التبديل...",
      by: "بواسطة",
      unknownAuthor: "مؤلف غير معروف",
      noDescriptionProvided: "لا يوجد وصف متاح.",
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
  let keybindSettingsDraft = null;
  let keybindCaptureState = null;
  let bootScreenStartedAt = 0;
  let bootScreenDismissed = false;
  const BOOT_SCREEN_MIN_MS = 1000;
  const VISUAL_SETTINGS_KEYS = [
    "theme",
    "uiStyle",
    "accentColor",
    "blurStrength",
    "uiScale",
    "reduceMotion",
    "showBootScreen",
    "fontStyle",
    "highContrast",
    "roundedCorners",
  ];
  const KEYBIND_SETTINGS_KEYS = KEYBIND_ACTION_DEFINITIONS.map((entry) => entry.key);
  const ACCENT_COLOR_PRESETS = ["#1ad969", "#38bdf8", "#f59e47", "#ff4a6e", "#a78bfa", "#f2f2f2"];
  let activeAddonConfigId = "";
  let addonConfigDrafts = {};
  let signedOutSnapshot = null;

  document.addEventListener("DOMContentLoaded", () => {
    bootScreenStartedAt = performance.now();
    registerStandaloneAppSupport();
    void initializeApp();
  });

  /**
   * Boots the PackTracker application from persisted storage and wires UI events.
   */
  async function initializeApp() {
    try {
      const initialLocalSettings = typeof loadAppSettings === "function"
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
          showBootScreen: true,
          defaultDownloadDirectoryName: "",
          downloadBehavior: "browser",
          scrollDownButton: "smart",
          seenReleaseNotesVersion: "",
          onboardingCompleted: false,
          visitCount: 0,
          firstOpenedAt: 0,
          lastOpenedAt: 0,
        };
      AppState.settings = initialLocalSettings;
      signedOutSnapshot = loadPersistedSignedOutSnapshot() || {
        data: normalizeData(typeof loadData === "function" ? await loadData() : { version: 2, profiles: [] }),
        settings: normalizeAppSettings(initialLocalSettings),
      };
      persistSignedOutSnapshot(signedOutSnapshot);

      if (typeof initializeCloudAuth === "function") {
        await initializeCloudAuth();
      }

      AppState.settings = typeof recordAppVisit === "function"
        ? recordAppVisit()
        : initialLocalSettings;
      if (typeof initializeAddonRuntime === "function") {
        initializeAddonRuntime();
      }
      applyThemePreference();
      applyLocalizedShellText();

      let data = signedOutSnapshot.data;
      const cloudBootstrap = AppState.auth?.signedIn && typeof loadCloudBootstrap === "function"
        ? await loadCloudBootstrap()
        : null;
      if (cloudBootstrap?.settings) {
        AppState.settings = normalizeAppSettings(cloudBootstrap.settings);
      }
      if (cloudBootstrap?.data) {
        data = normalizeData(cloudBootstrap.data);
      }

      cacheSignedInStateLocally(data, AppState.settings);
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
      await maybeOfferCloudImport(cloudBootstrap);
      handleFirstRunPrompts();
    } catch (error) {
      console.error("PackTracker failed to initialize", error);
      renderFatalState(error);
    } finally {
      void dismissBootScreen();
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
      if (typeof syncScrollDownButton === "function") {
        syncScrollDownButton(true);
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
    const accountButton = document.getElementById("account-button");

    installAppButton?.addEventListener("click", async () => {
      if (isStandaloneAppMode()) {
        showToast(t("appAlreadyInstalled", "PackTracker is already installed as an app."), "success");
        syncInstallButtonVisibility();
        return;
      }

      if (!deferredInstallPrompt) {
        showToast(t("appInstallNotAvailable", "App install is not available yet in this browser. Try Chrome or Edge over HTTPS."), "warning");
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
    if (accountButton) {
      accountButton.disabled = true;
      accountButton.setAttribute("aria-disabled", "true");
      accountButton.classList.add("account-button-disabled");
    }

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
        showToast(t("importFailed", "Import failed"), "danger");
      } finally {
        importInput.value = "";
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeTransientUi();
        return;
      }

      if (handleGlobalKeybindShortcut(event)) {
        event.preventDefault();
        return;
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
      if (typeof window.PackTracker.setBrowseTargetProfile === "function") {
        window.PackTracker.setBrowseTargetProfile(detail.profileId || AppState.activeProfileId || "");
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
   * Handles app-level keyboard shortcuts when no modal or text field is active.
   *
   * @param {KeyboardEvent} event - Keyboard event.
   * @returns {boolean} True when a shortcut was handled.
   */
  function handleGlobalKeybindShortcut(event) {
    if (!(event instanceof KeyboardEvent)) {
      return false;
    }
    if (event.defaultPrevented || isEditableKeyboardTarget(event.target) || hasActiveModalOverlay()) {
      return false;
    }

    const settings = AppState.settings || {};
    const keybinds = settings.keybinds || {};
    const activeTab = AppState.activeTab || "mods";

    const shortcutHandlers = [
      {
        key: "openSearch",
        run() {
          setActiveView("search");
          window.setTimeout(() => {
            focusSearchInput();
            if (typeof requestBrowseSearch === "function") {
              requestBrowseSearch();
            }
          }, 0);
        },
      },
      {
        key: "openSettings",
        run() {
          showSettingsModal("general");
        },
      },
      {
        key: "newProfile",
        run() {
          showNewProfileModal();
        },
      },
      {
        key: "modsTab",
        run() {
          setActiveView("home");
          setActiveTab("mods");
        },
      },
      {
        key: "resourcePacksTab",
        run() {
          setActiveView("home");
          setActiveTab("resourcepacks");
        },
      },
      {
        key: "shadersTab",
        run() {
          setActiveView("home");
          setActiveTab("shaders");
        },
      },
      {
        key: "toggleLayoutEdit",
        run() {
          if (AppState.activeView !== "home") {
            return;
          }
          if (typeof toggleLayoutEditMode === "function") {
            toggleLayoutEditMode(activeTab);
          }
        },
      },
      {
        key: "clearItems",
        run() {
          if (AppState.activeView !== "home") {
            return;
          }
          if (typeof showClearActiveTabItemsModal === "function") {
            showClearActiveTabItemsModal(activeTab);
          }
        },
      },
      {
        key: "clearProfiles",
        run() {
          if (typeof showClearProfilesConfirmModal === "function") {
            showClearProfilesConfirmModal();
          }
        },
      },
      {
        key: "toggleViewMode",
        run() {
          if (AppState.activeView !== "home" && AppState.activeView !== "search") {
            return;
          }
          const scope = AppState.activeView === "search" ? "browse" : activeTab;
          const nextMode = getViewMode(scope) === "grid" ? "list" : "grid";
          setViewMode(scope, nextMode);
        },
      },
    ];

    for (const shortcut of shortcutHandlers) {
      const combo = keybinds[shortcut.key];
      if (combo && matchesKeybindEvent(event, combo)) {
        shortcut.run();
        return true;
      }
    }

    return false;
  }

  /**
   * Returns true when the event target is an editable input-like element.
   *
   * @param {EventTarget|null} target - Keyboard event target.
   * @returns {boolean} Editable-target flag.
   */
  function isEditableKeyboardTarget(target) {
    const element = target instanceof HTMLElement ? target : null;
    if (!element) {
      return false;
    }

    if (element.isContentEditable) {
      return true;
    }

    const tagName = element.tagName;
    return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
  }

  /**
   * Returns true when any app modal is currently open.
   *
   * @returns {boolean} Modal-open flag.
   */
  function hasActiveModalOverlay() {
    return Boolean(document.querySelector("#modal-root .modal-overlay"));
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
    const addonRuntime = typeof refreshAddonRuntime === "function"
      ? refreshAddonRuntime()
      : { visualTokens: {} };
    const storedTheme = settings.theme || "dark";
    const resolvedTheme = storedTheme === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : storedTheme;
    const accentColor = settings.accentColor || "#1ad969";
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.uiStyle = settings.uiStyle || "packtracker";
    root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
    root.dataset.contrast = settings.highContrast ? "high" : "normal";
    root.dataset.fontStyle = settings.fontStyle || "default";
    root.lang = settings.language || "en";
    root.dir = settings.language === "ar" ? "rtl" : "ltr";
    root.style.setProperty("--color-accent", accentColor);
    root.style.setProperty("--color-accent-dim", withAlpha(accentColor, 0.16));
    root.style.setProperty("--color-accent-rgb", toRgbTriplet(accentColor));
    root.style.setProperty("--brand-logo-hue", `${getLogoHueRotation(accentColor)}deg`);
    root.style.setProperty("--brand-logo-saturation", "1.15");
    root.style.setProperty("--brand-logo-brightness", "1.02");
    root.style.setProperty("--visual-blur", `${Math.max(0, Number(settings.blurStrength || 0))}px`);
    root.style.setProperty("--ui-scale", `${Math.max(0.75, Math.min(1.25, Number(settings.uiScale || 100) / 100))}`);
    root.style.setProperty("--font-body", settings.fontStyle === "monospace"
      ? "\"IBM Plex Mono\", \"Cascadia Mono\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace"
      : settings.fontStyle === "manrope"
        ? "'Manrope', 'Nunito', sans-serif"
        : settings.fontStyle === "poppins"
          ? "'Poppins', 'Nunito', sans-serif"
          : settings.fontStyle === "serif"
            ? "'Merriweather', Georgia, serif"
            : "'Nunito', sans-serif");
    const roundedCorners = Math.max(0, Number(settings.roundedCorners ?? 12));
    root.style.setProperty("--radius-control", `${Math.max(0, roundedCorners - 4)}px`);
    root.style.setProperty("--radius-inline", `${Math.max(0, roundedCorners - 2)}px`);
    root.style.setProperty("--radius-card", `${roundedCorners}px`);
    root.style.setProperty("--radius-panel", `${roundedCorners + 2}px`);
    root.style.setProperty("--radius-badge", `${Math.max(0, roundedCorners + 8)}px`);
    root.style.setProperty("--radius-round", `${Math.max(0, roundedCorners + 6)}px`);
    root.style.setProperty("--addon-panel-tint", addonRuntime.visualTokens?.panelTint || "transparent");
    root.style.setProperty("--addon-panel-outline", addonRuntime.visualTokens?.panelOutline || "transparent");
    root.style.setProperty("--addon-card-glow", addonRuntime.visualTokens?.cardGlow || "transparent");
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
    const accountButton = document.getElementById("account-button");

    if (installAppButton) {
      setIconLabelContent(installAppButton, "⬇", t("installApp", "Install app"), "btn-icon-arrow-down");
    }
    if (exportButton) {
      setIconLabelContent(exportButton, "⤓", t("exportBackup", "Export backup"), "btn-icon-arrow-down");
      exportButton.classList.toggle("hidden", typeof isButtonVisible === "function" && !isButtonVisible("exportBackup"));
    }
    if (importLabel) {
      setIconLabelContent(importLabel, "⤴", t("importBackup", "Import backup"), "btn-icon-arrow-up");
      importLabel.classList.toggle("hidden", typeof isButtonVisible === "function" && !isButtonVisible("importBackup"));
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
    if (accountButton) {
      setIconLabelContent(accountButton, "👤", t("account", "Account"), "");
      accountButton.disabled = true;
      accountButton.setAttribute("aria-disabled", "true");
      accountButton.classList.add("account-button-disabled");
      accountButton.title = t("accountUnavailable", "Account unavailable");
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

  function persistSignedOutSnapshot(snapshot) {
    try {
      localStorage.setItem(LOCAL_MODE_BACKUP_KEY, JSON.stringify({
        data: normalizeData(snapshot?.data || { version: 2, profiles: [] }),
        settings: normalizeAppSettings(snapshot?.settings || AppState.settings || {}),
      }));
    } catch (error) {
      console.warn("PackTracker: failed to persist signed-out snapshot", error);
    }
  }

  function updateSignedOutSnapshotCache(patch = {}) {
    signedOutSnapshot = {
      data: normalizeData(patch.data || signedOutSnapshot?.data || { version: 2, profiles: [] }),
      settings: normalizeAppSettings(patch.settings || signedOutSnapshot?.settings || AppState.settings || {}),
    };
    persistSignedOutSnapshot(signedOutSnapshot);
  }

  function loadPersistedSignedOutSnapshot() {
    try {
      const raw = localStorage.getItem(LOCAL_MODE_BACKUP_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return {
        data: normalizeData(parsed?.data || { version: 2, profiles: [] }),
        settings: normalizeAppSettings(parsed?.settings || {}),
      };
    } catch (error) {
      console.warn("PackTracker: failed to read signed-out snapshot", error);
      return null;
    }
  }

  function cacheSignedInStateLocally(data, settings) {
    if (typeof window.PackTracker.persistNormalizedData === "function") {
      window.PackTracker.persistNormalizedData(normalizeData(data || { version: 2, profiles: [] }));
    }
    if (typeof window.PackTracker.cacheAppSettingsLocally === "function") {
      window.PackTracker.cacheAppSettingsLocally(normalizeAppSettings(settings || AppState.settings || {}));
    }
  }

  function getCloudImportDismissKey() {
    return `${CLOUD_IMPORT_DISMISS_PREFIX}${AppState.auth?.user?.id || "anonymous"}`;
  }

  async function maybeOfferCloudImport(cloudBootstrap) {
    if (!AppState.auth?.signedIn || !cloudBootstrap?.cloudEmpty) {
      return;
    }
    if (!signedOutSnapshot?.data?.profiles?.length) {
      return;
    }
    if (localStorage.getItem(getCloudImportDismissKey()) === "true") {
      return;
    }

    showCloudImportPrompt();
  }

  function showCloudImportPrompt() {
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
    title.textContent = t("localImportToCloudTitle", "Import local data to this account?");

    const subtitle = document.createElement("div");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = t("localImportToCloudBody", "This account has no cloud profiles yet, but this browser already has local PackTracker data. Import it once into your account?");

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const skipButton = document.createElement("button");
    skipButton.className = "btn";
    skipButton.type = "button";
    skipButton.textContent = t("keepCloudEmpty", "Keep cloud empty");
    skipButton.addEventListener("click", () => {
      localStorage.setItem(getCloudImportDismissKey(), "true");
      dismissRootChildren(modalRoot);
    });

    const importButton = document.createElement("button");
    importButton.className = "btn btn-primary";
    importButton.type = "button";
    importButton.textContent = t("importLocalData", "Import local data");
    importButton.addEventListener("click", async () => {
      importButton.disabled = true;
      skipButton.disabled = true;
      try {
        await importLocalStateToCloud(signedOutSnapshot.data, signedOutSnapshot.settings);
        cacheSignedInStateLocally(signedOutSnapshot.data, signedOutSnapshot.settings);
        if (typeof setData === "function") {
          setData(normalizeData(signedOutSnapshot.data));
        } else {
          AppState.data = normalizeData(signedOutSnapshot.data);
        }
        AppState.settings = normalizeAppSettings(signedOutSnapshot.settings);
        if (signedOutSnapshot.data.profiles.length > 0) {
          setActiveProfile(signedOutSnapshot.data.profiles[0].id);
        }
        localStorage.setItem(getCloudImportDismissKey(), "true");
        showToast(t("localDataImported", "Local PackTracker data was imported to your account."), "success");
        dismissRootChildren(modalRoot);
      } catch (error) {
        importButton.disabled = false;
        skipButton.disabled = false;
        showToast(error instanceof Error ? error.message : t("accountLoadFailed", "Could not load cloud account data."), "danger");
      }
    });

    actions.append(skipButton, importButton);
    body.append(title, subtitle, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    modalRoot.replaceChildren(overlay);
  }

  async function hydrateSignedInAppState(allowMigrationPrompt = true) {
    const cloudBootstrap = await loadCloudBootstrap();
    const nextSettings = cloudBootstrap?.settings
      ? normalizeAppSettings(cloudBootstrap.settings)
      : normalizeAppSettings(AppState.settings || {});
    const nextData = cloudBootstrap?.data
      ? normalizeData(cloudBootstrap.data)
      : normalizeData({ version: 2, profiles: [] });

    AppState.settings = nextSettings;
    cacheSignedInStateLocally(nextData, nextSettings);
    if (typeof setData === "function") {
      setData(nextData);
    } else {
      AppState.data = nextData;
    }
    if (nextData.profiles.length > 0) {
      setActiveProfile(nextData.profiles[0].id);
    } else {
      setActiveProfile(null);
    }
    setActiveView("home");
    renderApp();
    if (allowMigrationPrompt) {
      await maybeOfferCloudImport(cloudBootstrap);
    }
  }

  function restoreSignedOutSnapshotToApp() {
    const nextSnapshot = signedOutSnapshot || {
      data: normalizeData({ version: 2, profiles: [] }),
      settings: normalizeAppSettings(AppState.settings || {}),
    };
    AppState.settings = normalizeAppSettings(nextSnapshot.settings);
    cacheSignedInStateLocally(nextSnapshot.data, nextSnapshot.settings);
    if (typeof setData === "function") {
      setData(normalizeData(nextSnapshot.data));
    } else {
      AppState.data = normalizeData(nextSnapshot.data);
    }
    if (nextSnapshot.data.profiles.length > 0) {
      setActiveProfile(nextSnapshot.data.profiles[0].id);
    } else {
      setActiveProfile(null);
    }
    setActiveView("home");
    renderApp();
  }

  function showAccountModal() {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        dismissRootChildren(modalRoot);
      }
    });

    const modal = document.createElement("div");
    modal.className = "modal";

    const body = document.createElement("div");
    body.className = "modal-body";

    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = t("account", "Account");

    const subtitle = document.createElement("div");
    subtitle.className = "modal-subtitle";

    if (!hasSupabaseConfig()) {
      subtitle.textContent = t("accountSetupRequired", "Supabase is not configured yet. Add the project URL and anon key before using accounts.");
      body.append(title, subtitle);
      modal.appendChild(body);
      overlay.appendChild(modal);
      modalRoot.replaceChildren(overlay);
      return;
    }

    if (!AppState.auth?.signedIn) {
      subtitle.textContent = t("accountSignedOutHelp", "When signed out, PackTracker keeps working in local-only mode.");

      const emailInput = document.createElement("input");
      emailInput.type = "email";
      emailInput.placeholder = t("emailAddress", "Email address");

      const passwordInput = document.createElement("input");
      passwordInput.type = "password";
      passwordInput.placeholder = t("password", "Password");

      const hint = document.createElement("div");
      hint.className = "settings-field-help";
      hint.textContent = t("accountCreateHelp", "Create an email/password account stored in Supabase, not just in this browser.");

      const actions = document.createElement("div");
      actions.className = "modal-actions";

      const signUpButton = document.createElement("button");
      signUpButton.className = "btn";
      signUpButton.type = "button";
      signUpButton.textContent = t("signUp", "Sign up");

      const signInButton = document.createElement("button");
      signInButton.className = "btn btn-primary";
      signInButton.type = "button";
      signInButton.textContent = t("signIn", "Sign in");

      const runAuthAction = async (action) => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) {
          showToast(t("accountMissingFields", "Enter both email and password."), "warning");
          return;
        }

        signUpButton.disabled = true;
        signInButton.disabled = true;
        try {
          if (action === "signup") {
            await signUpCloudAccount(email, password);
            await refreshCloudSessionState();
            if (AppState.auth?.signedIn) {
              await hydrateSignedInAppState(true);
              showToast(t("accountSignedInSuccess", "Signed in."), "success");
              dismissRootChildren(modalRoot);
              return;
            }
            showToast(t("accountCreatedSuccess", "Account created. You can sign in now."), "success");
          } else {
            await signInCloudAccount(email, password);
            await refreshCloudSessionState();
            await hydrateSignedInAppState(true);
            showToast(t("accountSignedInSuccess", "Signed in."), "success");
            dismissRootChildren(modalRoot);
            return;
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : t("accountLoadFailed", "Could not load cloud account data."), "danger");
        } finally {
          signUpButton.disabled = false;
          signInButton.disabled = false;
        }
      };

      signUpButton.addEventListener("click", () => {
        void runAuthAction("signup");
      });
      signInButton.addEventListener("click", () => {
        void runAuthAction("signin");
      });

      actions.append(signUpButton, signInButton);
      body.append(title, subtitle, emailInput, passwordInput, hint, actions);
      modal.appendChild(body);
      overlay.appendChild(modal);
      modalRoot.replaceChildren(overlay);
      return;
    }

    subtitle.textContent = t("accountSignedInHelp", "Changes now sync to your hosted PackTracker account.");

    const signedInAs = document.createElement("div");
    signedInAs.className = "settings-field-help";
    signedInAs.textContent = `${t("signedInAs", "Signed in as")}: ${AppState.auth.user?.email || ""}`;

    const createdAt = document.createElement("div");
    createdAt.className = "settings-field-help";
    createdAt.textContent = `${t("accountCreatedAt", "Created")}: ${formatDateTime(AppState.auth.profile?.created_at)}`;

    const role = document.createElement("div");
    role.className = "settings-field-help";
    role.textContent = `${t("accountRole", "Role")}: ${AppState.auth.role || "user"}`;

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    if (AppState.auth.role === "admin") {
      const adminButton = document.createElement("button");
      adminButton.className = "btn";
      adminButton.type = "button";
      adminButton.textContent = t("openAdminAccounts", "Open admin accounts");
      adminButton.addEventListener("click", () => {
        void showAdminAccountsModal();
      });
      actions.appendChild(adminButton);
    }

    const signOutButton = document.createElement("button");
    signOutButton.className = "btn btn-danger";
    signOutButton.type = "button";
    signOutButton.textContent = t("signOut", "Sign out");
    signOutButton.addEventListener("click", async () => {
      try {
        await signOutCloudAccount();
        await refreshCloudSessionState();
        restoreSignedOutSnapshotToApp();
        dismissRootChildren(modalRoot);
        showToast(t("accountSignedOutSuccess", "Signed out."), "success");
      } catch (error) {
        showToast(error instanceof Error ? error.message : t("accountLoadFailed", "Could not load cloud account data."), "danger");
      }
    });

    actions.appendChild(signOutButton);
    body.append(title, subtitle, signedInAs, createdAt, role, actions);
    modal.appendChild(body);
    overlay.appendChild(modal);
    modalRoot.replaceChildren(overlay);
  }

  async function showAdminAccountsModal() {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      return;
    }

    try {
      const accounts = await listAdminAccounts();
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          dismissRootChildren(modalRoot);
        }
      });

      const modal = document.createElement("div");
      modal.className = "modal modal-wide";

      const body = document.createElement("div");
      body.className = "modal-body";

      const title = document.createElement("div");
      title.className = "modal-title";
      title.textContent = t("adminAccounts", "Admin accounts");

      const list = document.createElement("div");
      list.className = "settings-panel";

      accounts.forEach((account) => {
        const card = document.createElement("div");
        card.className = "settings-info-card";
        const email = document.createElement("div");
        email.className = "settings-card-title";
        email.textContent = account.email || account.userId;
        const meta = document.createElement("div");
        meta.className = "settings-field-help";
        meta.textContent = `${t("accountCreatedAt", "Created")}: ${formatDateTime(account.createdAt)} • ${t("accountRole", "Role")}: ${account.role || "user"}`;
        card.append(email, meta);
        list.appendChild(card);
      });

      body.append(title, list);
      modal.appendChild(body);
      overlay.appendChild(modal);
      modalRoot.replaceChildren(overlay);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("accountLoadFailed", "Could not load cloud account data."), "danger");
    }
  }

  function formatDateTime(value) {
    if (!value) {
      return "Unknown";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toLocaleString();
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
        keybindSettingsDraft = null;
        activeAddonConfigId = "";
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
    subtitle.textContent = error instanceof Error ? error.message : t("unknownStartupError", "Unknown startup error.");

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
   * @param {"general"|"visual"|"keybinds"|"buttons"|"advanced"|"addons"|"updates"|"extra"|"about"} initialTab - First visible settings tab.
   */
  function showSettingsModal(initialTab = "general") {
    const modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      return;
    }

    const activeTab = ["general", "visual", "keybinds", "buttons", "advanced", "addons", "updates", "extra", "about"].includes(initialTab) ? initialTab : "general";
    const settings = AppState.settings || {};
    if (!visualSettingsDraft) {
      visualSettingsDraft = createVisualSettingsDraft(settings);
    }
    if (!keybindSettingsDraft) {
      keybindSettingsDraft = createKeybindSettingsDraft(settings);
    }
    stopKeybindCapture();
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
    if (typeof syncScrollDownButton === "function") {
      syncScrollDownButton(true);
    }
  }

  /**
   * Closes the settings modal and clears any unsaved visual-settings draft.
   */
  function closeSettingsModal() {
    visualSettingsDraft = null;
    keybindSettingsDraft = null;
    activeAddonConfigId = "";
    addonConfigDrafts = {};
    stopKeybindCapture();
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
      { key: "keybinds", label: t("keybinds", "Keybinds") },
      { key: "buttons", label: t("buttons", "Buttons") },
      { key: "advanced", label: t("advanced", "Advanced") },
      { key: "addons", label: `🔒 ${t("addons", "Addons")}`, locked: true },
      { key: "updates", label: t("updates", "Updates") },
      { key: "extra", label: t("extra", "Extra") },
      { key: "about", label: t("about", "About") },
    ].forEach((entry) => {
      const button = document.createElement("button");
      button.className = entry.key === activeTab ? "settings-tab active" : "settings-tab";
      button.classList.toggle("locked", Boolean(entry.locked));
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
          : activeTab === "keybinds"
          ? renderKeybindSettingsPanel(keybindSettingsDraft)
          : activeTab === "buttons"
          ? renderButtonsSettingsPanel(settings)
          : activeTab === "advanced"
            ? renderAdvancedSettingsPanel(settings)
            : activeTab === "addons"
              ? renderAddonsSettingsPanel(settings)
          : activeTab === "updates"
            ? renderUpdatesSettingsPanel()
            : activeTab === "extra"
              ? renderExtraSettingsPanel()
              : renderAboutSettingsPanel()
    );

    if (closeButton) {
      closeButton.textContent = t("close", "Close");
    }
  }

  /**
   * Renders the general settings panel with language and essential behavior settings.
   *
   * @param {object} settings - Current settings snapshot.
   * @returns {HTMLDivElement} Settings panel element.
   */
  function renderGeneralSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = t("generalSettingsIntro", "Choose language and other app-wide behavior settings.");
    panel.appendChild(intro);

    const languageGroup = createSettingsField(t("language", "Language"), { experimental: true });
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

    const resetGroup = createSettingsField(t("resetAllSettings", "Reset all settings"));
    const resetHelp = document.createElement("div");
    resetHelp.className = "settings-field-help";
    resetHelp.textContent = t("resetSettingsHelp", "This resets language, theme, keybinds, update prompts, and download preferences.");
    const resetButton = createSettingsActionButton(t("resetAllSettings", "Reset all settings"), "btn-danger");
    resetButton.addEventListener("click", () => {
      showResetSettingsConfirmModal();
    });
    resetGroup.append(resetHelp, resetButton);

    panel.append(languageGroup, resetGroup);
    return panel;
  }

  /**
   * Renders show/hide controls for optional command buttons.
   *
   * @param {object} settings - Current settings snapshot.
   * @returns {HTMLDivElement} Settings panel element.
   */
  function renderButtonsSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = t("buttonsSettingsIntro", "Choose which command buttons are shown in PackTracker.");
    panel.appendChild(intro);

    const currentVisibility = typeof normalizeButtonVisibility === "function"
      ? normalizeButtonVisibility(settings.buttonVisibility)
      : {};

    BUTTON_VISIBILITY_DEFINITIONS.forEach((definition) => {
      const group = createSettingsField(t(definition.labelKey, definition.fallback));
      const select = createSettingsDropdown(BUTTON_VISIBILITY_OPTIONS, currentVisibility[definition.key] || "show", (value) => {
        const nextVisibility = {
          ...currentVisibility,
          [definition.key]: value,
        };
        AppState.settings = typeof updateAppSettings === "function"
          ? updateAppSettings({ buttonVisibility: nextVisibility })
          : {
              ...(AppState.settings || {}),
              buttonVisibility: nextVisibility,
            };
        applyLocalizedShellText();
        renderApp();
        showSettingsModal("buttons");
      });
      group.appendChild(select);
      panel.appendChild(group);
    });

    return panel;
  }

  /**
   * Renders advanced settings such as startup and download behavior.
   *
   * @param {object} settings - Current settings snapshot.
   * @returns {HTMLDivElement} Settings panel element.
   */
  function renderAdvancedSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = t("advancedSettingsIntro", "Control startup and download behavior for more advanced PackTracker usage.");
    panel.appendChild(intro);

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
        showToast(t("defaultDownloadFolderSet", "Default download folder set to {name}.").replace("{name}", result.name), "success");
        showSettingsModal("advanced");
      } catch (error) {
        showToast(error instanceof Error ? error.message : t("couldNotChooseDefaultFolder", "Could not choose a default folder."), "danger");
      }
    });
    const clearFolderButton = createSettingsActionButton(t("clearFolder", "Clear folder"));
    clearFolderButton.addEventListener("click", async () => {
      try {
        await clearDefaultDownloadDirectory();
        AppState.settings = typeof updateAppSettings === "function"
          ? updateAppSettings({ defaultDownloadDirectoryName: "", downloadBehavior: "browser" })
          : AppState.settings;
        showSettingsModal("advanced");
      } catch (error) {
        showToast(error instanceof Error ? error.message : t("couldNotClearDefaultFolder", "Could not clear the default folder."), "danger");
      }
    });
    downloadsActions.append(pickFolderButton, clearFolderButton);
    downloadsGroup.append(downloadsHint, downloadsActions);

    const behaviorGroup = createSettingsField(t("downloadBehavior", "Download behavior"));
    const behaviorSelect = createSettingsDropdown(DOWNLOAD_BEHAVIORS, settings.downloadBehavior || "browser", (value) => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings({ downloadBehavior: value })
        : AppState.settings;
      showSettingsModal("advanced");
    });
    const behaviorHelp = document.createElement("div");
    behaviorHelp.className = "settings-field-help";
    behaviorHelp.textContent = (settings.downloadBehavior || "browser") === "default"
      ? t("downloadBehaviorDefaultHelp", "PackTracker will try to save files directly into the chosen folder when the browser allows it.")
      : (settings.downloadBehavior || "browser") === "ask"
        ? t("downloadBehaviorAskHelp", "PackTracker will ask where to save direct downloads when the browser allows it.")
        : t("downloadBehaviorBrowserHelp", "PackTracker will use the browser's normal download flow without extra save prompts. This is the quietest option.");
    behaviorGroup.append(behaviorSelect, behaviorHelp);

    const scrollDownGroup = createSettingsField(t("scrollDownButton", "Scroll-to-bottom button"));
    const scrollDownSelect = createSettingsDropdown(SCROLL_DOWN_BUTTON_MODES, settings.scrollDownButton || "smart", (value) => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings({ scrollDownButton: value })
        : AppState.settings;
      showSettingsModal("advanced");
    });
    const scrollDownHelp = document.createElement("div");
    scrollDownHelp.className = "settings-field-help";
    scrollDownHelp.textContent = t("scrollDownButtonHelp", "Shows a floating button that jumps to the bottom of long lists and version pickers.");
    const scrollDownModeHelp = document.createElement("div");
    scrollDownModeHelp.className = "settings-field-help";
    scrollDownModeHelp.textContent = (settings.scrollDownButton || "smart") === "always"
      ? t("scrollDownButtonAlwaysHelp", "Always show the button when a page or modal can scroll further.")
      : (settings.scrollDownButton || "smart") === "never"
        ? t("scrollDownButtonNeverHelp", "Never show the floating bottom button.")
        : t("scrollDownButtonSmartHelp", "Show the button only after you scroll down a bit on long pages.");
    scrollDownGroup.append(scrollDownHelp, scrollDownSelect, scrollDownModeHelp);

    const updateProgressGroup = createSettingsField("Update result display");
    const updateProgressSelect = createSettingsDropdown(UPDATE_PROGRESS_DISPLAY_OPTIONS, settings.updateProgressDisplay || "icons", (value) => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings({ updateProgressDisplay: value })
        : AppState.settings;
      showSettingsModal("advanced");
    });
    const updateProgressHelp = document.createElement("div");
    updateProgressHelp.className = "settings-field-help";
    updateProgressHelp.textContent = "Choose whether updated items show compact status icons or full update logs by default.";
    updateProgressGroup.append(updateProgressSelect, updateProgressHelp);

    const confirmRemovalGroup = createSettingsField(t("confirmItemRemoval", "Confirm item removal"));
    confirmRemovalGroup.appendChild(createSettingsToggleControl({
      checked: Boolean(settings.confirmItemRemoval),
      label: t("confirmItemRemovalHelp", "Show a 'Are you sure?' popup before removing one item from a list."),
      toggleLabel: t("enabled", "Enabled"),
      onChange(value) {
        AppState.settings = typeof updateAppSettings === "function"
          ? updateAppSettings({ confirmItemRemoval: value })
          : AppState.settings;
      },
    }));

    panel.append(downloadsGroup, behaviorGroup, scrollDownGroup, updateProgressGroup, confirmRemovalGroup);
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

    const themeGroup = createSettingsField(t("theme", "Theme"));
    const themeHelp = document.createElement("div");
    themeHelp.className = "settings-field-help";
    themeHelp.textContent = t("themeDescription", "Choose whether the app follows a light, dark, or system appearance.");
    const themeSelect = createSettingsDropdown(THEMES, settings.theme || "dark", (value) => {
      updateVisualSettingsDraft({ theme: value });
    });
    themeGroup.append(themeSelect, themeHelp);

    const styleGroup = createSettingsField("Style", { experimental: true });
    const styleSelect = createSettingsDropdown(UI_STYLES, settings.uiStyle || "packtracker", (value) => {
      updateVisualSettingsDraft({ uiStyle: value });
    });
    styleGroup.appendChild(styleSelect);

    const accentGroup = createSettingsField(t("accentColor", "Accent color"));
    accentGroup.appendChild(createAccentColorPicker(settings.accentColor || "#1ad969"));

    const blurGroup = createSettingsField(t("blurEffects", "Blur effects"));
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

    const scaleGroup = createSettingsField(t("appScale", "App scale"));
    scaleGroup.appendChild(createSettingsRangeControl({
      min: 75,
      max: 125,
      step: 5,
      value: settings.uiScale ?? 100,
      helpText: t("appScaleHelp", "Adjust how large the interface feels. It snaps in 5% steps."),
      formatValue(value) {
        return `${value}%`;
      },
      onInput(value) {
        updateVisualSettingsDraft({ uiScale: value });
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

    const bootGroup = createSettingsField(t("startupBootScreen", "Startup boot screen"));
    bootGroup.appendChild(createSettingsToggleControl({
      checked: settings.showBootScreen !== false,
      label: t("startupBootScreenHelp", "Shows a short PackTracker splash screen when the app opens."),
      toggleLabel: t("enabled", "Enabled"),
      onChange(value) {
        updateVisualSettingsDraft({ showBootScreen: value });
        AppState.settings = typeof updateAppSettings === "function"
          ? updateAppSettings({ showBootScreen: value })
          : {
              ...(AppState.settings || {}),
              showBootScreen: value,
            };
        if (value) {
          delete document.documentElement.dataset.bootScreen;
        } else {
          document.documentElement.dataset.bootScreen = "off";
        }
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

    const cornersGroup = createSettingsField(t("roundedCorners", "Rounded corners"));
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
    const saveStatus = document.createElement("div");
    saveStatus.className = isVisualSettingsDirty() ? "settings-save-status is-dirty" : "settings-save-status";
    saveStatus.dataset.visualSaveStatus = "true";
    saveStatus.textContent = isVisualSettingsDirty()
      ? t("unsavedChanges", "Unsaved changes")
      : t("allChangesSaved", "All changes saved");
    const resetButton = createSettingsActionButton(t("resetToDefault", "Reset to default"));
    resetButton.addEventListener("click", () => {
      visualSettingsDraft = createDefaultVisualSettingsDraft();
      showSettingsModal("visual");
    });
    const saveButton = createSettingsActionButton(t("saveVisualSettings", "Save visual settings"), "btn-primary");
    saveButton.dataset.visualSaveButton = "true";
    saveButton.disabled = !isVisualSettingsDirty();
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
    saveRow.append(saveStatus, resetButton, saveButton);

    panel.append(themeGroup, styleGroup, accentGroup, blurGroup, scaleGroup, motionGroup, bootGroup, fontGroup, contrastGroup, cornersGroup, saveRow);
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
      uiStyle: settings.uiStyle || "packtracker",
      accentColor: settings.accentColor || "#1ad969",
      blurStrength: Number(settings.blurStrength ?? 8),
      uiScale: Number(settings.uiScale ?? 100),
      reduceMotion: Boolean(settings.reduceMotion),
      showBootScreen: settings.showBootScreen !== false,
      fontStyle: settings.fontStyle || "default",
      highContrast: Boolean(settings.highContrast),
      roundedCorners: Number(settings.roundedCorners ?? 12),
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
      uiStyle: "packtracker",
      accentColor: "#1ad969",
      blurStrength: 8,
      uiScale: 100,
      reduceMotion: false,
      showBootScreen: true,
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
    syncVisualSaveIndicator();
  }

  /**
   * Returns true when the visual settings draft differs from saved settings.
   *
   * @returns {boolean} Dirty state.
   */
  function isVisualSettingsDirty() {
    const draft = visualSettingsDraft || createVisualSettingsDraft(AppState.settings || {});
    const saved = createVisualSettingsDraft(AppState.settings || {});
    return VISUAL_SETTINGS_KEYS.some((key) => draft[key] !== saved[key]);
  }

  /**
   * Updates the visual settings save-state indicator without rebuilding the modal.
   */
  function syncVisualSaveIndicator() {
    const dirty = isVisualSettingsDirty();
    const status = document.querySelector("[data-visual-save-status='true']");
    if (status instanceof HTMLElement) {
      status.classList.toggle("is-dirty", dirty);
      status.textContent = dirty ? t("unsavedChanges", "Unsaved changes") : t("allChangesSaved", "All changes saved");
    }
    const saveButton = document.querySelector("[data-visual-save-button='true']");
    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = !dirty;
    }
  }

  /**
   * Creates one mutable copy of the current keybind settings for the settings modal draft.
   *
   * @param {object} settings - Current app settings.
   * @returns {object} Draft keybind settings.
   */
  function createKeybindSettingsDraft(settings) {
    const current = settings && typeof settings === "object" && settings.keybinds && typeof settings.keybinds === "object"
      ? settings.keybinds
      : {};
    const draft = {};
    KEYBIND_ACTION_DEFINITIONS.forEach((entry) => {
      draft[entry.key] = normalizeKeybindCombo(current[entry.key], entry.defaultCombo);
    });
    return draft;
  }

  /**
   * Creates the default keybind settings draft used by the reset action.
   *
   * @returns {object} Default keybind draft.
   */
  function createDefaultKeybindSettingsDraft() {
    return createKeybindSettingsDraft({
      keybinds: KEYBIND_ACTION_DEFINITIONS.reduce((accumulator, entry) => {
        accumulator[entry.key] = entry.defaultCombo;
        return accumulator;
      }, {}),
    });
  }

  /**
   * Updates the in-memory keybind settings draft without saving it yet.
   *
   * @param {object} patch - Partial keybind patch.
   */
  function updateKeybindSettingsDraft(patch) {
    keybindSettingsDraft = {
      ...(keybindSettingsDraft || createKeybindSettingsDraft(AppState.settings || {})),
      ...patch,
    };
    syncKeybindSaveIndicator();
  }

  /**
   * Returns true when the keybind settings draft differs from saved settings.
   *
   * @returns {boolean} Dirty state.
   */
  function isKeybindSettingsDirty() {
    const draft = keybindSettingsDraft || createKeybindSettingsDraft(AppState.settings || {});
    const saved = createKeybindSettingsDraft(AppState.settings || {});
    return KEYBIND_SETTINGS_KEYS.some((key) => draft[key] !== saved[key]);
  }

  /**
   * Updates the keybind settings save-state indicator without rebuilding the modal.
   */
  function syncKeybindSaveIndicator() {
    const dirty = isKeybindSettingsDirty();
    const status = document.querySelector("[data-keybind-save-status='true']");
    if (status instanceof HTMLElement) {
      status.classList.toggle("is-dirty", dirty);
      status.textContent = dirty ? t("unsavedChanges", "Unsaved changes") : t("allChangesSaved", "All changes saved");
    }
    const saveButton = document.querySelector("[data-keybind-save-button='true']");
    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = !dirty;
    }
  }

  /**
   * Renders the keybind settings panel with editable shortcuts.
   *
   * @param {object} settings - Draft keybind settings.
   * @returns {HTMLDivElement} Keybind settings panel.
   */
  function renderKeybindSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = t("keybindsSettingsIntro", "Set the keyboard shortcuts that control common PackTracker actions.");
    panel.appendChild(intro);

    KEYBIND_ACTION_DEFINITIONS.forEach((definition) => {
      const field = createSettingsField(definition.label);
      const help = document.createElement("div");
      help.className = "settings-field-help";
      help.textContent = definition.description;

      const currentValue = settings?.[definition.key] || definition.defaultCombo;
      const button = createSettingsActionButton(currentValue, "btn-small");
      button.classList.add("keybind-record-button");
      button.addEventListener("click", () => {
        startKeybindCapture(definition.key, button);
      });

      field.append(help, button);
      panel.appendChild(field);
    });

    const saveRow = document.createElement("div");
    saveRow.className = "settings-save-row";
    const saveStatus = document.createElement("div");
    saveStatus.className = isKeybindSettingsDirty() ? "settings-save-status is-dirty" : "settings-save-status";
    saveStatus.dataset.keybindSaveStatus = "true";
    saveStatus.textContent = isKeybindSettingsDirty()
      ? t("unsavedChanges", "Unsaved changes")
      : t("allChangesSaved", "All changes saved");
    const resetButton = createSettingsActionButton(t("resetKeybinds", "Reset to default"));
    resetButton.addEventListener("click", () => {
      keybindSettingsDraft = createDefaultKeybindSettingsDraft();
      stopKeybindCapture();
      showSettingsModal("keybinds");
    });
    const saveButton = createSettingsActionButton(t("saveKeybinds", "Save keybinds"), "btn-primary");
    saveButton.dataset.keybindSaveButton = "true";
    saveButton.disabled = !isKeybindSettingsDirty();
    saveButton.addEventListener("click", () => {
      AppState.settings = typeof updateAppSettings === "function"
        ? updateAppSettings({ keybinds: keybindSettingsDraft || settings })
        : AppState.settings;
      renderApp();
      showToast(t("keybindsSaved", "Keybinds saved."), "success");
      keybindSettingsDraft = createKeybindSettingsDraft(AppState.settings || {});
      showSettingsModal("keybinds");
    });
    saveRow.append(saveStatus, resetButton, saveButton);
    panel.appendChild(saveRow);
    return panel;
  }

  /**
   * Starts capture mode for one keybind field.
   *
   * @param {string} actionKey - Keybind action identifier.
   * @param {HTMLButtonElement} button - Record button element.
   */
  function startKeybindCapture(actionKey, button) {
    stopKeybindCapture();
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const originalLabel = button.textContent || t("keybindComboPlaceholder", "Press keys...");
    button.classList.add("is-capturing");
    button.textContent = t("keybindComboPlaceholder", "Press keys...");

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stopKeybindCapture(button, originalLabel);
        return;
      }

      const combo = eventToKeybindCombo(event);
      if (!combo) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      updateKeybindSettingsDraft({ [actionKey]: combo });
      stopKeybindCapture();
      showSettingsModal("keybinds");
    };

    keybindCaptureState = {
      button,
      originalLabel,
      handleKeydown,
    };
    window.addEventListener("keydown", handleKeydown, true);
  }

  /**
   * Stops an active keybind capture session.
   *
   * @param {HTMLButtonElement|null} [button] - Optional button to restore.
   * @param {string} [originalLabel] - Optional original label to restore.
   */
  function stopKeybindCapture(button = null, originalLabel = "") {
    if (keybindCaptureState?.handleKeydown) {
      window.removeEventListener("keydown", keybindCaptureState.handleKeydown, true);
    }
    if (keybindCaptureState?.button instanceof HTMLButtonElement) {
      keybindCaptureState.button.classList.remove("is-capturing");
      if (originalLabel || keybindCaptureState.originalLabel) {
        keybindCaptureState.button.textContent = originalLabel || keybindCaptureState.originalLabel;
      }
    }
    if (button instanceof HTMLButtonElement) {
      button.classList.remove("is-capturing");
      button.textContent = originalLabel || button.textContent || "";
    }
    keybindCaptureState = null;
  }

  /**
   * Builds a custom accent color picker that avoids the browser-native color popup.
   *
   * @param {string} currentColor - Current hex color.
   * @param {{onChange?: (color:string) => void}} [options] - Optional change hook.
   * @returns {HTMLDivElement} Picker wrapper.
   */
  function createAccentColorPicker(currentColor, options = {}) {
    let selectedColor = normalizeDraftAccentColor(currentColor);
    const wrapper = document.createElement("div");
    wrapper.className = "settings-color-control";

    const trigger = document.createElement("button");
    trigger.className = "settings-color-picker";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");

    const preview = document.createElement("span");
    preview.className = "settings-color-preview";
    preview.style.background = selectedColor;
    const label = document.createElement("span");
    label.className = "settings-color-picker-label";
    label.textContent = t("custom", "Custom");
    const value = document.createElement("span");
    value.className = "settings-color-value";
    value.textContent = selectedColor.toUpperCase();
    trigger.append(preview, label, value);

    const popover = document.createElement("div");
    popover.className = "settings-color-popover";

    let hsv = hexToHsv(selectedColor);
    const spectrum = document.createElement("div");
    spectrum.className = "settings-color-spectrum";
    spectrum.style.setProperty("--spectrum-hue", String(hsv.h));
    const spectrumHandle = document.createElement("span");
    spectrumHandle.className = "settings-color-spectrum-handle";
    spectrum.appendChild(spectrumHandle);

    const hueInput = document.createElement("input");
    hueInput.type = "range";
    hueInput.className = "settings-color-hue";
    hueInput.min = "0";
    hueInput.max = "360";
    hueInput.step = "1";
    hueInput.value = String(hsv.h);

    function updateSpectrumHandle() {
      spectrumHandle.style.left = `${Math.round(hsv.s * 100)}%`;
      spectrumHandle.style.top = `${Math.round((1 - hsv.v) * 100)}%`;
    }
    updateSpectrumHandle();

    const swatches = document.createElement("div");
    swatches.className = "settings-color-swatches";
    ACCENT_COLOR_PRESETS.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.className = color.toLowerCase() === selectedColor ? "settings-color-swatch active" : "settings-color-swatch";
      swatch.type = "button";
      swatch.style.background = color;
      swatch.setAttribute("aria-label", color);
      swatch.addEventListener("click", () => {
        applyColor(color);
      });
      swatches.appendChild(swatch);
    });

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.className = "settings-color-hex";
    hexInput.maxLength = 7;
    hexInput.value = selectedColor.toUpperCase();
    hexInput.placeholder = "#1AD969";
    hexInput.addEventListener("input", () => {
      const normalized = normalizeDraftAccentColor(hexInput.value);
      if (normalized) {
        applyColor(normalized, { syncInput: false });
      }
    });
    const hexWrap = document.createElement("div");
    hexWrap.className = "field-counter-wrap";
    const hexCounter = document.createElement("span");
    hexCounter.className = "field-counter";
    const updateHexCounter = () => {
      hexCounter.textContent = `${hexInput.value.length}/${hexInput.maxLength}`;
    };
    hexInput.addEventListener("input", updateHexCounter);
    hexWrap.append(hexInput, hexCounter);
    updateHexCounter();

    function updateFromSpectrum(event) {
      const rect = spectrum.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      hsv = {
        ...hsv,
        s: x,
        v: 1 - y,
      };
      applyColor(hsvToHex(hsv));
    }

    spectrum.addEventListener("pointerdown", (event) => {
      spectrum.setPointerCapture(event.pointerId);
      updateFromSpectrum(event);
    });
    spectrum.addEventListener("pointermove", (event) => {
      if (event.buttons === 1) {
        updateFromSpectrum(event);
      }
    });
    hueInput.addEventListener("input", () => {
      hsv = {
        ...hsv,
        h: Number(hueInput.value || 0),
      };
      spectrum.style.setProperty("--spectrum-hue", String(hsv.h));
      applyColor(hsvToHex(hsv));
    });

    popover.append(spectrum, hueInput, swatches, hexWrap);

    function applyColor(color, behavior = {}) {
      selectedColor = normalizeDraftAccentColor(color) || "#1ad969";
      hsv = hexToHsv(selectedColor);
      hueInput.value = String(hsv.h);
      spectrum.style.setProperty("--spectrum-hue", String(hsv.h));
      updateSpectrumHandle();
      preview.style.background = selectedColor;
      value.textContent = selectedColor.toUpperCase();
      if (behavior.syncInput !== false) {
        hexInput.value = selectedColor.toUpperCase();
        updateHexCounter();
      }
      Array.from(swatches.children).forEach((child) => {
        child.classList.toggle("active", child.getAttribute("aria-label")?.toLowerCase() === selectedColor);
      });
      if (typeof options.onChange === "function") {
        options.onChange(selectedColor);
      } else {
        updateVisualSettingsDraft({ accentColor: selectedColor });
      }
    }

    function closePopover() {
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (popover.parentElement === document.body) {
        popover.remove();
      }
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    }

    function handleOutsideClick(event) {
      if (!wrapper.contains(event.target) && !popover.contains(event.target)) {
        closePopover();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closePopover();
      }
    }

    function positionPopover() {
      positionFloatingSettingsOverlay(trigger, popover, {
        width: 310,
      });
    }

    trigger.addEventListener("click", () => {
      const isOpen = !wrapper.classList.contains("is-open");
      wrapper.classList.toggle("is-open", isOpen);
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        document.body.appendChild(popover);
        positionPopover();
        window.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", positionPopover);
        window.addEventListener("scroll", positionPopover, true);
        hexInput.focus();
        hexInput.select();
      } else {
        closePopover();
      }
    });

    wrapper.append(trigger);
    return wrapper;
  }

  /**
   * Normalizes draft accent colors.
   *
   * @param {string} value - Candidate color.
   * @returns {string} Normalized hex or empty string.
   */
  function normalizeDraftAccentColor(value) {
    const candidate = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toLowerCase() : "";
  }

  /**
   * Converts a hex color to HSV.
   *
   * @param {string} hex - Hex color.
   * @returns {{h:number,s:number,v:number}} HSV color.
   */
  function hexToHsv(hex) {
    const normalized = normalizeDraftAccentColor(hex) || "#1ad969";
    const r = parseInt(normalized.slice(1, 3), 16) / 255;
    const g = parseInt(normalized.slice(3, 5), 16) / 255;
    const b = parseInt(normalized.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * (((b - r) / delta) + 2);
      } else {
        h = 60 * (((r - g) / delta) + 4);
      }
    }
    return {
      h: Math.round(h < 0 ? h + 360 : h),
      s: max === 0 ? 0 : delta / max,
      v: max,
    };
  }

  /**
   * Converts HSV to a hex color.
   *
   * @param {{h:number,s:number,v:number}} hsv - HSV color.
   * @returns {string} Hex color.
   */
  function hsvToHex(hsv) {
    const h = ((Number(hsv.h) || 0) % 360 + 360) % 360;
    const s = Math.min(1, Math.max(0, Number(hsv.s) || 0));
    const v = Math.min(1, Math.max(0, Number(hsv.v) || 0));
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    const [r, g, b] = h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
    return `#${[r, g, b].map((part) => Math.round((part + m) * 255).toString(16).padStart(2, "0")).join("")}`;
  }

  /**
   * Hides the startup boot screen after the first render is ready.
   *
   * @returns {Promise<void>} Resolves after the overlay is removed.
   */
  async function dismissBootScreen() {
    if (bootScreenDismissed) {
      return;
    }

    const bootScreen = document.getElementById("boot-screen");
    if (!bootScreen) {
      bootScreenDismissed = true;
      return;
    }

    if (document.documentElement.dataset.bootScreen === "off" || AppState.settings?.showBootScreen === false) {
      bootScreen.remove();
      bootScreenDismissed = true;
      return;
    }

    const elapsed = Math.max(0, performance.now() - bootScreenStartedAt);
    const remaining = Math.max(0, BOOT_SCREEN_MIN_MS - elapsed);
    if (remaining > 0) {
      await waitForUiDelay(remaining);
    }

    bootScreen.classList.add("leaving");
    await waitForUiDelay(220);
    bootScreen.remove();
    bootScreenDismissed = true;
  }

  /**
   * Waits for a small UI delay.
   *
   * @param {number} ms - Delay duration in milliseconds.
   * @returns {Promise<void>} Resolves after the timeout.
   */
  function waitForUiDelay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
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
    const formatValue = typeof options.formatValue === "function"
      ? options.formatValue
      : (value) => t("previewValuePx", "{value}px").replace("{value}", String(value));

    const valueLabel = document.createElement("div");
    valueLabel.className = "settings-field-help settings-inline-value";
    valueLabel.textContent = formatValue(Number(options.value));
    wrapper.style.setProperty("--range-progress", getRangeProgress(options.value, options.min, options.max));

    input.addEventListener("input", () => {
      const numericValue = Number(input.value);
      valueLabel.textContent = formatValue(numericValue);
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
   * Renders the addon marketplace and custom-addon settings panel.
   *
   * @param {object} settings - Current app settings.
   * @returns {HTMLDivElement} Settings panel element.
   */
  function renderAddonsSettingsPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "settings-panel settings-panel-locked";

    const lockCard = document.createElement("div");
    lockCard.className = "settings-locked-card";
    const lockIcon = document.createElement("div");
    lockIcon.className = "settings-locked-icon";
    lockIcon.textContent = "🔒";
    const lockTitle = document.createElement("div");
    lockTitle.className = "settings-card-title";
    lockTitle.textContent = "Coming soon";
    const lockText = document.createElement("div");
    lockText.className = "settings-field-help";
    lockText.textContent = "Addons settings are locked for now.";
    lockCard.append(lockIcon, lockTitle, lockText);
    panel.appendChild(lockCard);
    return panel;

    const intro = document.createElement("div");
    intro.className = "settings-panel-copy";
    intro.textContent = "Install bundled addons, manage addon configs, and optionally import trusted experimental custom addons.";
    panel.appendChild(intro);

    const addonSettings = settings?.addons || {};
    const addonRuntime = typeof getAddonRuntimeState === "function"
      ? getAddonRuntimeState()
      : { entries: [], statusById: {}, activeAddonIds: [] };
    const allAddonEntries = typeof getAddonMarketplaceEntries === "function"
      ? getAddonMarketplaceEntries()
      : addonRuntime.entries || [];
    const marketplaceEntries = allAddonEntries.filter((entry) => entry.manifest.type === "bundled");
    const installedEntries = allAddonEntries.filter((entry) => entry.status.installed);
    const configuredAddon = allAddonEntries.find((entry) => entry.manifest.id === activeAddonConfigId && entry.status.installed);

    const controlsField = createSettingsField("Addon platform");
    controlsField.append(
      createSettingsToggleControl({
        checked: addonSettings.marketplaceEnabled !== false,
        toggleLabel: "Marketplace enabled",
        label: "Show bundled addon marketplace cards and install actions inside Settings.",
        onChange(value) {
          if (typeof setMarketplaceEnabled === "function") {
            setMarketplaceEnabled(value);
          }
          showSettingsModal("addons");
        },
      }),
      createSettingsToggleControl({
        checked: Boolean(addonSettings.customAddonsExperimental),
        toggleLabel: "Experimental custom addons",
        label: "Allow importing custom JSON addon packages from makers you trust.",
        onChange(value) {
          if (typeof setCustomAddonsExperimental === "function") {
            setCustomAddonsExperimental(value);
          }
          showSettingsModal("addons");
        },
      })
    );
    panel.appendChild(controlsField);

    const marketplaceField = createSettingsField("Marketplace");
    if (addonSettings.marketplaceEnabled === false) {
      const note = document.createElement("div");
      note.className = "settings-field-help";
      note.textContent = "The addon marketplace is currently hidden. Re-enable it above to browse bundled addons.";
      marketplaceField.appendChild(note);
    } else if (marketplaceEntries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "addon-empty-state";
      empty.textContent = "No addon entries are available right now.";
      marketplaceField.appendChild(empty);
    } else {
      const grid = document.createElement("div");
      grid.className = "addon-card-grid";
      marketplaceEntries.forEach((entry) => {
        grid.appendChild(createAddonMarketplaceCard(entry, addonRuntime));
      });
      marketplaceField.appendChild(grid);
    }
    panel.appendChild(marketplaceField);

    const installedField = createSettingsField("Installed");
    if (installedEntries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "addon-empty-state";
      empty.textContent = "No addons are installed yet.";
      installedField.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "addon-installed-list";
      installedEntries
        .sort((left, right) => Number(right.installedAt || 0) - Number(left.installedAt || 0))
        .forEach((entry) => {
          list.appendChild(createInstalledAddonSummary(entry));
        });
      installedField.appendChild(list);
    }
    panel.appendChild(installedField);

    const customField = createSettingsField("Custom addons", { experimental: true });
    if (!addonSettings.customAddonsExperimental) {
      const note = document.createElement("div");
      note.className = "settings-field-help";
      note.textContent = "Enable the experimental toggle above if you want to import custom JSON addon packages.";
      customField.appendChild(note);
    } else {
      const warning = document.createElement("div");
      warning.className = "addon-warning-box";
      warning.textContent = "Only import custom addons from makers you trust. Custom addons stay declarative in v1, but they can still change labels, visuals, and profile defaults.";
      const actions = document.createElement("div");
      actions.className = "settings-inline-actions";
      const importButton = createSettingsActionButton("Import custom addon", "btn-primary");
      importButton.addEventListener("click", async () => {
        try {
          const importedName = await openCustomAddonPicker();
          if (importedName) {
            showToast(`${importedName} imported into the custom addon registry.`, "success");
            showSettingsModal("addons");
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Custom addon import failed.", "danger");
        }
      });
      actions.appendChild(importButton);
      const formatNote = document.createElement("div");
      formatNote.className = "settings-field-help";
      formatNote.textContent = "Expected format: one JSON manifest with metadata, config schema, default config, permissions, and supported hook declarations.";
      customField.append(warning, actions, formatNote);
    }
    panel.appendChild(customField);

    if (configuredAddon) {
      panel.appendChild(renderAddonConfigurationField(configuredAddon));
    }

    return panel;
  }

  /**
   * Builds one marketplace card with addon actions.
   *
   * @param {{manifest: object, status: object, effectiveConfig: object}} entry - Addon entry.
   * @param {object} runtime - Current addon runtime state.
   * @returns {HTMLDivElement} Card element.
   */
  function createAddonMarketplaceCard(entry, runtime) {
    const card = document.createElement("div");
    card.className = "addon-card";

    const header = document.createElement("div");
    header.className = "addon-card-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "addon-card-title-wrap";

    const title = document.createElement("div");
    title.className = "addon-card-title";
    title.textContent = entry.manifest.name;

    const badges = document.createElement("div");
    badges.className = "addon-badge-row";
    badges.append(
      createAddonBadge(entry.manifest.type === "custom" ? "Custom" : "Bundled"),
      createAddonBadge(entry.manifest.category),
      ...(entry.manifest.experimental ? [createExperimentalTag()] : [])
    );

    titleWrap.append(title, badges);
    header.appendChild(titleWrap);
    card.appendChild(header);

    const description = document.createElement("div");
    description.className = "settings-field-help";
    description.textContent = entry.manifest.description || "No description provided.";
    card.appendChild(description);

    const meta = document.createElement("div");
    meta.className = "addon-meta-line";
    meta.textContent = [entry.manifest.version, entry.manifest.author, (entry.manifest.supportedScreens || []).join(", ")].filter(Boolean).join(" • ");
    card.appendChild(meta);

    const statusLine = document.createElement("div");
    statusLine.className = "addon-status-line";
    statusLine.textContent = entry.status.active
      ? "Active now"
      : entry.status.installed
        ? (entry.status.enabled ? "Installed but inactive" : "Installed and disabled")
        : "Not installed";
    card.appendChild(statusLine);

    if ((entry.status.errors || []).length > 0) {
      const issues = document.createElement("div");
      issues.className = "addon-error-list";
      issues.textContent = entry.status.errors.join(" ");
      card.appendChild(issues);
    }

    const permissions = Array.isArray(entry.manifest.permissions) && entry.manifest.permissions.length > 0
      ? document.createElement("div")
      : null;
    if (permissions) {
      permissions.className = "addon-meta-line";
      permissions.textContent = `Permissions: ${entry.manifest.permissions.join(", ")}`;
      card.appendChild(permissions);
    }

    const actions = document.createElement("div");
    actions.className = "settings-inline-actions";
    if (!entry.status.installed) {
      const installButton = createSettingsActionButton("Install", "btn-primary");
      installButton.addEventListener("click", () => {
        try {
          if (typeof installBundledAddon === "function") {
            installBundledAddon(entry.manifest.id);
            activeAddonConfigId = entry.manifest.configSchema?.length ? entry.manifest.id : "";
            showToast(`${entry.manifest.name} installed.`, "success");
            showSettingsModal("addons");
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Addon install failed.", "danger");
        }
      });
      actions.appendChild(installButton);
    } else {
      const toggleButton = createSettingsActionButton(entry.status.enabled ? "Disable" : "Enable", entry.status.enabled ? "" : "btn-primary");
      toggleButton.addEventListener("click", () => {
        try {
          if (typeof setAddonEnabled === "function") {
            setAddonEnabled(entry.manifest.id, !entry.status.enabled);
            showToast(`${entry.manifest.name} ${entry.status.enabled ? "disabled" : "enabled"}.`, "success");
            showSettingsModal("addons");
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Addon state update failed.", "danger");
        }
      });
      actions.appendChild(toggleButton);

      if (entry.manifest.configSchema?.length) {
        const configureButton = createSettingsActionButton(activeAddonConfigId === entry.manifest.id ? "Hide config" : "Configure");
        configureButton.addEventListener("click", () => {
          activeAddonConfigId = activeAddonConfigId === entry.manifest.id ? "" : entry.manifest.id;
          showSettingsModal("addons");
        });
        actions.appendChild(configureButton);
      }

      const removeButton = createSettingsActionButton("Remove", "btn-danger");
      removeButton.addEventListener("click", () => {
        try {
          if (typeof removeAddon === "function") {
            removeAddon(entry.manifest.id);
            if (activeAddonConfigId === entry.manifest.id) {
              activeAddonConfigId = "";
            }
            showToast(`${entry.manifest.name} removed.`, "success");
            showSettingsModal("addons");
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Addon removal failed.", "danger");
        }
      });
      actions.appendChild(removeButton);
    }
    card.appendChild(actions);

    if (runtime?.activeAddonIds?.includes(entry.manifest.id) && entry.manifest.id === "modded-server-presets") {
      const note = document.createElement("div");
      note.className = "addon-meta-line";
      note.textContent = "Built-in template registry is active and can seed new profile defaults.";
      card.appendChild(note);
    }

    return card;
  }

  /**
   * Builds one compact installed-addon summary row.
   *
   * @param {{manifest: object, status: object}} entry - Installed addon entry.
   * @returns {HTMLDivElement} Summary row.
   */
  function createInstalledAddonSummary(entry) {
    const item = document.createElement("div");
    item.className = "addon-installed-item";

    const title = document.createElement("div");
    title.className = "addon-installed-title";
    title.textContent = entry.manifest.name;

    const status = document.createElement("div");
    status.className = "addon-installed-status";
    status.textContent = entry.status.active
      ? "Active"
      : entry.status.enabled
        ? "Enabled, waiting"
        : "Disabled";

    const meta = document.createElement("div");
    meta.className = "settings-field-help";
    meta.textContent = entry.status.errors?.length
      ? entry.status.errors.join(" ")
      : `${entry.manifest.type === "custom" ? "Custom" : "Bundled"} addon${entry.manifest.experimental ? " • Experimental" : ""}`;

    item.append(title, status, meta);
    return item;
  }

  /**
   * Renders the config field area for one installed addon.
   *
   * @param {{manifest: object, effectiveConfig: object}} entry - Configured addon entry.
   * @returns {HTMLDivElement} Settings field.
   */
  function renderAddonConfigurationField(entry) {
    const field = createSettingsField(`Configure ${entry.manifest.name}`, {
      experimental: Boolean(entry.manifest.experimental),
    });
    const usesManualSave = entry.manifest.configSaveMode === "manual";
    const intro = document.createElement("div");
    intro.className = "settings-field-help";
    intro.textContent = usesManualSave
      ? "Changes stay in a draft until you press Save. Use this for visual addons where live partial updates are easier to review in one commit."
      : "Changes save immediately and apply through the addon runtime without a separate Save button.";
    field.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "addon-config-grid";
    entry.manifest.configSchema.forEach((schemaField) => {
      grid.appendChild(createAddonConfigControl(entry, schemaField));
    });
    field.appendChild(grid);

    if (usesManualSave) {
      field.appendChild(createAddonConfigSaveRow(entry));
    }
    return field;
  }

  /**
   * Builds one config control based on an addon schema field.
   *
   * @param {{manifest: object, effectiveConfig: object}} entry - Addon entry.
   * @param {object} schemaField - Config schema field.
   * @returns {HTMLDivElement} Field wrapper.
   */
  function createAddonConfigControl(entry, schemaField) {
    const field = createSettingsField(schemaField.label);
    const currentValue = getAddonConfigWorkingValue(entry, schemaField.key);
    const commit = (value) => {
      if (entry.manifest.configSaveMode === "manual") {
        updateAddonConfigDraft(entry.manifest.id, { [schemaField.key]: value });
        syncAddonConfigSaveRow(entry);
        return;
      }
      if (typeof updateAddonConfig === "function") {
        updateAddonConfig(entry.manifest.id, { [schemaField.key]: value });
      }
    };

    if (schemaField.type === "toggle") {
      field.appendChild(createSettingsToggleControl({
        checked: Boolean(currentValue),
        toggleLabel: "Enabled",
        label: schemaField.description || "Enable or disable this addon behavior.",
        onChange: commit,
      }));
      return field;
    }

    if (schemaField.type === "select") {
      field.appendChild(createSettingsDropdown(schemaField.options || [], String(currentValue || ""), commit));
      if (schemaField.description) {
        const help = document.createElement("div");
        help.className = "settings-field-help";
        help.textContent = schemaField.description;
        field.appendChild(help);
      }
      return field;
    }

    if (schemaField.type === "range") {
      field.appendChild(createSettingsRangeControl({
        min: Number(schemaField.min ?? 0),
        max: Number(schemaField.max ?? 100),
        step: Number(schemaField.step ?? 1),
        value: Number(currentValue ?? schemaField.defaultValue ?? schemaField.min ?? 0),
        helpText: schemaField.description || "Drag to adjust this addon setting.",
        onInput: commit,
        formatValue: (value) => String(value),
      }));
      return field;
    }

    if (schemaField.type === "color") {
      field.appendChild(createAccentColorPicker(String(currentValue || schemaField.defaultValue || "#1ad969"), {
        onChange: commit,
      }));
      if (schemaField.description) {
        const help = document.createElement("div");
        help.className = "settings-field-help";
        help.textContent = schemaField.description;
        field.appendChild(help);
      }
      return field;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.className = "settings-color-hex";
    input.value = String(currentValue || "");
    input.placeholder = schemaField.placeholder || "";
    input.addEventListener("change", () => {
      commit(input.value.trim());
    });
    field.appendChild(input);
    if (schemaField.description) {
      const help = document.createElement("div");
      help.className = "settings-field-help";
      help.textContent = schemaField.description;
      field.appendChild(help);
    }
    return field;
  }

  /**
   * Creates the save/reset actions for addons that use manual config commits.
   *
   * @param {{manifest: object, effectiveConfig: object}} entry - Addon entry.
   * @returns {HTMLDivElement} Save row.
   */
  function createAddonConfigSaveRow(entry) {
    const row = document.createElement("div");
    row.className = "settings-save-row";
    row.dataset.addonConfigId = entry.manifest.id;

    const dirty = isAddonConfigDraftDirty(entry);
    const status = document.createElement("div");
    status.className = dirty ? "settings-save-status is-dirty" : "settings-save-status";
    status.dataset.role = "addon-config-status";
    status.textContent = dirty ? "Unsaved addon changes" : "Addon config saved";

    const resetButton = createSettingsActionButton("Reset");
    resetButton.dataset.role = "addon-config-reset";
    resetButton.disabled = !dirty;
    resetButton.addEventListener("click", () => {
      discardAddonConfigDraft(entry.manifest.id);
      showSettingsModal("addons");
    });

    const saveButton = createSettingsActionButton("Save addon config", "btn-primary");
    saveButton.dataset.role = "addon-config-save";
    saveButton.disabled = !dirty;
    saveButton.addEventListener("click", () => {
      try {
        const draft = getAddonConfigDraft(entry.manifest.id, entry.effectiveConfig);
        if (typeof updateAddonConfig === "function") {
          updateAddonConfig(entry.manifest.id, draft);
          discardAddonConfigDraft(entry.manifest.id);
          showToast(`${entry.manifest.name} settings saved.`, "success");
          showSettingsModal("addons");
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Addon config could not be saved.", "danger");
      }
    });

    row.append(status, resetButton, saveButton);
    return row;
  }

  function getAddonConfigWorkingValue(entry, key) {
    if (entry.manifest.configSaveMode === "manual") {
      const draft = getAddonConfigDraft(entry.manifest.id, entry.effectiveConfig);
      return draft[key];
    }
    return entry.effectiveConfig?.[key];
  }

  function getAddonConfigDraft(addonId, fallbackConfig = {}) {
    if (!addonConfigDrafts[addonId]) {
      addonConfigDrafts[addonId] = { ...(fallbackConfig || {}) };
    }
    return addonConfigDrafts[addonId];
  }

  function updateAddonConfigDraft(addonId, patch) {
    addonConfigDrafts[addonId] = {
      ...getAddonConfigDraft(addonId),
      ...(patch && typeof patch === "object" ? patch : {}),
    };
  }

  function discardAddonConfigDraft(addonId) {
    delete addonConfigDrafts[addonId];
  }

  function isAddonConfigDraftDirty(entry) {
    const draft = getAddonConfigDraft(entry.manifest.id, entry.effectiveConfig);
    return JSON.stringify(draft) !== JSON.stringify(entry.effectiveConfig || {});
  }

  function syncAddonConfigSaveRow(entry) {
    const row = document.querySelector(`.settings-save-row[data-addon-config-id="${entry.manifest.id}"]`);
    if (!(row instanceof HTMLElement)) {
      return;
    }
    const dirty = isAddonConfigDraftDirty(entry);
    const status = row.querySelector('[data-role="addon-config-status"]');
    const resetButton = row.querySelector('[data-role="addon-config-reset"]');
    const saveButton = row.querySelector('[data-role="addon-config-save"]');
    if (status instanceof HTMLElement) {
      status.className = dirty ? "settings-save-status is-dirty" : "settings-save-status";
      status.textContent = dirty ? "Unsaved addon changes" : "Addon config saved";
    }
    if (resetButton instanceof HTMLButtonElement) {
      resetButton.disabled = !dirty;
    }
    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = !dirty;
    }
  }

  /**
   * Opens the custom-addon file picker and imports one selected JSON addon package.
   *
   * @returns {Promise<string>} Imported addon name.
   */
  async function openCustomAddonPicker() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.className = "sr-only";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error("No custom addon file was selected."));
          return;
        }
        try {
          if (typeof importCustomAddonFile !== "function") {
            throw new Error("Custom addon import is unavailable.");
          }
          const runtime = await importCustomAddonFile(file);
          const importedEntry = [...(runtime.entries || [])]
            .reverse()
            .find((entry) => entry.manifest.type === "custom");
          activeAddonConfigId = importedEntry?.manifest?.configSchema?.length ? importedEntry.manifest.id : "";
          resolve(importedEntry?.manifest?.name || file.name);
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      input.click();
    });
  }

  /**
   * Creates a small addon badge chip.
   *
   * @param {string} text - Badge label.
   * @returns {HTMLSpanElement} Badge element.
   */
  function createAddonBadge(text) {
    const badge = document.createElement("span");
    badge.className = "addon-badge";
    badge.textContent = text;
    return badge;
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
   * Computes an approximate hue-rotation that pushes the default green logo toward the chosen accent.
   *
   * @param {string} color - Accent hex color.
   * @returns {number} Hue rotation in degrees.
   */
  function getLogoHueRotation(color) {
    const hue = getHueFromHex(color);
    if (hue === null) {
      return 0;
    }
    const baseHue = 142;
    let rotation = hue - baseHue;
    if (rotation > 180) {
      rotation -= 360;
    } else if (rotation < -180) {
      rotation += 360;
    }
    return rotation;
  }

  /**
   * Extracts the hue channel from a 6-digit hex color.
   *
   * @param {string} color - Hex color like #1ad969.
   * @returns {number|null} Hue in degrees or null when invalid.
   */
  function getHueFromHex(color) {
    const safe = String(color || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
      return null;
    }

    const red = parseInt(safe.slice(0, 2), 16) / 255;
    const green = parseInt(safe.slice(2, 4), 16) / 255;
    const blue = parseInt(safe.slice(4, 6), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    if (delta === 0) {
      return 0;
    }

    let hue;
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
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
    subtitle.textContent = t("currentRelease", "Current release: {version}").replace("{version}", RELEASE_NOTES.version);

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
   * Renders extra external-source shortcuts.
   *
   * @returns {HTMLDivElement} Extra panel.
   */
  function renderExtraSettingsPanel() {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const card = document.createElement("div");
    card.className = "settings-info-card";

    const title = document.createElement("div");
    title.className = "settings-card-title";
    title.textContent = t("projectSources", "Project sources");

    const subtitle = document.createElement("div");
    subtitle.className = "settings-field-help";
    subtitle.textContent = t("projectSourcesBody", "Open the main Minecraft project directories in a new tab.");

    const actions = document.createElement("div");
    actions.className = "settings-inline-actions";

    const modrinthButton = createSettingsExternalLink("Modrinth", "https://modrinth.com/");
    const curseForgeButton = createSettingsExternalLink("CurseForge", "https://www.curseforge.com/minecraft");

    actions.append(modrinthButton, curseForgeButton);
    card.append(title, subtitle, actions);
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
    title.textContent = t("aboutPackTracker", "About PackTracker");

    const paragraphs = [
      "PackTracker is meant to help you keep Minecraft modpacks organized per profile, with tracked mods, resource packs, shaders, updates, scans, and backups in one place.",
      "The app is especially useful when you switch between Minecraft versions, loaders, or different themed packs and want a clearer overview than normal launchers give you.",
      t("aboutPackTrackerBody", "PackTracker is made by Pjater, and this web app can also be installed like an app in supported browsers."),
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
    link.textContent = t("openGitHub", "Open GitHub");
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
    subtitle.textContent = t("viewingRelease", "You're viewing release {version}.").replace("{version}", RELEASE_NOTES.version);

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
    laterButton.textContent = t("openSettings", "Open settings");
    laterButton.addEventListener("click", () => {
      if (options.markSeenOnClose !== false) {
        markReleaseNotesSeen();
      }
      showSettingsModal("updates");
    });
    const closeButton = document.createElement("button");
    closeButton.className = "btn btn-primary";
    closeButton.type = "button";
    closeButton.textContent = t("close", "Close");
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
        title: t("createProfile", "Create a profile"),
        body: t("createProfileBody", "Start by making one Minecraft profile for the version and loader you actually want to use."),
      },
      {
        title: t("browseScanUpdate", "Browse, scan, and update"),
        body: t("browseScanUpdateBody", "After that you can browse projects, scan an existing mods folder, and update tracked content later from the profile view."),
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
      progress.textContent = t("stepOf", "Step {current} of {total}")
        .replace("{current}", String(index + 1))
        .replace("{total}", String(steps.length));

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
        createButton.textContent = t("createProfileNow", "Create profile now");
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
    subtitle.textContent = t("resetSettingsConfirmBody", "This will reset language, theme, keybinds, update prompts, and default download behavior. The first-run tutorial will stay completed.");
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
    confirmButton.textContent = t("reset", "Reset");
    confirmButton.addEventListener("click", async () => {
      try {
        await clearDefaultDownloadDirectory();
      } catch (error) {
        // Ignore handle cleanup failures and still reset the visible settings snapshot.
      }
      visualSettingsDraft = null;
      keybindSettingsDraft = null;
      stopKeybindCapture();
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
    tag.textContent = t("experimental", "Experimental");
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
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
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
        if (menu.parentElement === document.body) {
          menu.remove();
        }
      }, 140);
    }

    function positionMenu() {
      positionFloatingSettingsOverlay(trigger, menu, {
        matchAnchorWidth: true,
      });
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
      document.body.appendChild(menu);
      positionMenu();
      handleOutsideClick = (event) => {
        if (!select.contains(event.target) && !menu.contains(event.target)) {
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
      window.addEventListener("resize", positionMenu);
      window.addEventListener("scroll", positionMenu, true);
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
        Array.from(menu.children).forEach((child) => {
          const isActive = child === option;
          child.classList.toggle("active", isActive);
          child.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        closeMenu();
        onChange(optionData.value);
      });
      menu.appendChild(option);
    });

    trigger.addEventListener("click", openMenu);
    select.append(trigger);
    return select;
  }

  /**
   * Positions a floating settings overlay outside scroll-clipped containers.
   *
   * @param {HTMLElement} anchor - Trigger element.
   * @param {HTMLElement} overlay - Floating panel.
   * @param {{matchAnchorWidth?: boolean, width?: number}} [options] - Position options.
   */
  function positionFloatingSettingsOverlay(anchor, overlay, options = {}) {
    if (!(anchor instanceof HTMLElement) || !(overlay instanceof HTMLElement)) {
      return;
    }

    overlay.classList.add("settings-floating-overlay");
    const rect = anchor.getBoundingClientRect();
    const desiredWidth = options.matchAnchorWidth
      ? rect.width
      : Math.min(options.width || rect.width, window.innerWidth - 24);
    overlay.style.width = `${Math.max(140, desiredWidth)}px`;
    overlay.style.minWidth = `${Math.max(140, rect.width)}px`;
    overlay.style.maxWidth = `${Math.max(140, window.innerWidth - 24)}px`;

    const overlayRect = overlay.getBoundingClientRect();
    const safeLeft = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - overlayRect.width - 12
    );
    const belowTop = rect.bottom + 8;
    const aboveTop = rect.top - overlayRect.height - 8;
    const safeTop = belowTop + overlayRect.height <= window.innerHeight - 12
      ? belowTop
      : Math.max(12, aboveTop);

    overlay.style.left = `${safeLeft}px`;
    overlay.style.top = `${safeTop}px`;
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
   * Creates an external link styled as a settings action button.
   *
   * @param {string} text - Link label.
   * @param {string} href - Destination URL.
   * @returns {HTMLAnchorElement} Link button.
   */
  function createSettingsExternalLink(text, href) {
    const link = document.createElement("a");
    link.className = "btn btn-small";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `${text} ↗`;
    return link;
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
      showToast(error instanceof Error ? error.message : t("invalidShareLink", "Invalid share link"), "danger");
    }
  }

  /**
   * Registers the service worker that makes the web build installable as a standalone app.
   */
  function registerStandaloneAppSupport() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    let hasReloadedForServiceWorker = false;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      syncInstallButtonVisibility();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      syncInstallButtonVisibility();
      showToast(t("appInstalled", "PackTracker installed as an app."), "success");
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloadedForServiceWorker) {
        return;
      }
      hasReloadedForServiceWorker = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=20260429-7").then((registration) => {
        registration.update().catch(() => {});
      }).catch((error) => {
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
    updateSignedOutSnapshotCache,
  });
})();
