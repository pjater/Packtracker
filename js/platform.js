(function attachPlatformModule() {
  const namespace = (window.PackTracker = window.PackTracker || {});
  const READ_MODE = "read";
  const READ_WRITE_MODE = "readwrite";
  const LEGACY_DIRECTORY_KIND = "legacy-directory";
  const DEFAULT_SCAN_EXTENSIONS = [".jar"];
  const HANDLE_DB_NAME = "packtracker-platform";
  const HANDLE_STORE_NAME = "handles";
  const DOWNLOAD_DIRECTORY_KEY = "default-download-directory";

  /**
   * Returns false because the web build never runs inside a Tauri runtime.
   *
   * @returns {boolean} Always false.
   */
  function isTauriRuntime() {
    return false;
  }

  /**
   * Checks whether an error came from a missing legacy Tauri bridge.
   *
   * @param {unknown} error - Runtime error candidate.
   * @returns {boolean} True when the error matches a missing runtime message.
   */
  function isRuntimeUnavailableError(error) {
    const message = error instanceof Error ? error.message : String(error || "");
    return /tauri runtime is not available/i.test(message);
  }

  /**
   * Keeps the old command helper callable while making the web-only limitation explicit.
   *
   * @returns {never} Always throws because commands are not available on the web build.
   */
  function invokeCommand() {
    throw new Error("Tauri commands are not available in the web build.");
  }

  /**
   * Prompts the user to choose a folder using the File System Access API.
   * Falls back to a hidden directory input when needed.
   *
   * @param {{mode?: "read"|"readwrite", accept?: Array<string>}} [options] - Picker options.
   * @returns {Promise<FileSystemDirectoryHandle|{kind:string,name:string,files:Array<File>}|null>} Directory handle or null.
   */
  async function pickFolder(options = {}) {
    const mode = options.mode === READ_WRITE_MODE ? READ_WRITE_MODE : READ_MODE;

    if (typeof window.showDirectoryPicker === "function") {
      try {
        return await window.showDirectoryPicker({ mode });
      } catch (error) {
        if (error?.name === "AbortError") {
          return null;
        }
      }
    }

    return pickFolderWithLegacyInput(options.accept || DEFAULT_SCAN_EXTENSIONS);
  }

  /**
   * Always uses the legacy directory input picker to avoid system-folder restrictions.
   *
   * @param {Array<string>} extensions - Allowed file extensions.
   * @returns {Promise<{kind:string,name:string,files:Array<File>}|null>} Legacy directory payload or null.
   */
  async function pickFolderLegacy(extensions) {
    return pickFolderWithLegacyInput(extensions || DEFAULT_SCAN_EXTENSIONS);
  }

  /**
   * Reads files from a selected directory handle filtered by extension.
   *
   * @param {FileSystemDirectoryHandle|{kind:string,files:Array<File>}|null} directoryHandle - Directory handle.
   * @param {Array<string>} extensions - Allowed file extensions.
   * @returns {Promise<Array<{name:string, handle:FileSystemFileHandle|File}>>} Matching files.
   */
  async function readFilesInFolder(directoryHandle, extensions) {
    const allowedExtensions = Array.isArray(extensions) && extensions.length > 0
      ? extensions.map((extension) => String(extension).toLowerCase())
      : DEFAULT_SCAN_EXTENSIONS;

    if (!directoryHandle) {
      return [];
    }

    if (directoryHandle.kind === LEGACY_DIRECTORY_KIND) {
      return directoryHandle.files
        .filter((file) => matchesExtension(file.name, allowedExtensions))
        .map((file) => ({
          name: file.name,
          handle: file,
        }));
    }

    await requestDirectoryPermission(directoryHandle);

    const results = [];
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === "file" && matchesExtension(name, allowedExtensions)) {
        results.push({ name, handle });
      }
    }
    return results;
  }

  /**
   * Reads only `.jar` files from a selected directory.
   *
   * @param {FileSystemDirectoryHandle|{kind:string,files:Array<File>}|null} directoryHandle - Directory handle.
   * @returns {Promise<Array<{name:string, handle:FileSystemFileHandle|File}>>} Matching jar files.
   */
  async function readJarFilesInFolder(directoryHandle) {
    return readFilesInFolder(directoryHandle, DEFAULT_SCAN_EXTENSIONS);
  }

  /**
   * Triggers a normal browser-managed download.
   *
   * @param {string} url - Download URL.
   * @param {string} filename - Suggested filename.
   */
  async function downloadFile(url, filename) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  /**
   * Downloads a file using the current PackTracker preferences when possible.
   *
   * @param {string} url - Download URL or object URL.
   * @param {string} filename - Suggested filename.
   * @returns {Promise<{mode:string, directoryName?:string}>} Download outcome metadata.
   */
  async function downloadWithPreferences(url, filename, options = {}) {
    const settings = namespace.AppState?.settings || {};
    const saveHandle = options && typeof options === "object" ? options.saveHandle || null : null;

    if (saveHandle) {
      await saveFileToHandle(url, saveHandle);
      return { mode: "ask-picker" };
    }

    if (settings.downloadBehavior === "ask" && typeof window.showSaveFilePicker === "function") {
      try {
        await saveFileWithPicker(url, filename);
        return { mode: "ask-picker" };
      } catch (error) {
        if (error?.name === "AbortError") {
          return { mode: "cancelled" };
        }
        throw error;
      }
    }

    if (settings.downloadBehavior === "default") {
      const directoryHandle = await getSavedDownloadDirectoryHandle();
      if (directoryHandle) {
        try {
          await requestHandlePermission(directoryHandle, READ_WRITE_MODE);
          await writeDownloadToDirectory(url, filename, directoryHandle);
          return {
            mode: "default",
            directoryName: directoryHandle.name || "",
          };
        } catch (error) {
          // Fall back to the normal browser download flow when direct writes are blocked.
        }
      }
    }

    await downloadFile(url, filename);
    return { mode: "ask" };
  }

  /**
   * Prepares a save-file picker handle while the current click still has user activation.
   *
   * @param {string} filename - Suggested filename.
   * @returns {Promise<{mode:string, saveHandle?:FileSystemFileHandle}|null>} Prepared save target or null.
   */
  async function prepareDownloadWithPreferences(filename) {
    const settings = namespace.AppState?.settings || {};
    if (settings.downloadBehavior !== "ask" || typeof window.showSaveFilePicker !== "function") {
      return null;
    }

    const safeFilename = String(filename || "").trim() || "download";
    try {
      const saveHandle = await window.showSaveFilePicker({
        suggestedName: safeFilename,
        types: [buildPickerTypeOption(safeFilename)],
      });
      if (!saveHandle) {
        return { mode: "cancelled" };
      }
      return { mode: "ask-picker", saveHandle };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { mode: "cancelled" };
      }
      throw error;
    }
  }

  /**
   * Opens the browser save-file picker and writes one file to the chosen location.
   *
   * @param {string} url - Download URL.
   * @param {string} filename - Suggested filename.
   * @returns {Promise<void>} Resolves when the file is written.
   */
  async function saveFileWithPicker(url, filename) {
    const safeFilename = String(filename || "").trim() || inferFileNameFromUrl(url);
    const handle = await window.showSaveFilePicker({
      suggestedName: safeFilename,
      types: [buildPickerTypeOption(safeFilename)],
    });
    if (!handle) {
      throw new DOMException("Save cancelled", "AbortError");
    }

    await saveFileToHandle(url, handle);
  }

  /**
   * Downloads one URL and writes it into an already chosen file handle.
   *
   * @param {string} url - Download URL.
   * @param {FileSystemFileHandle} handle - Chosen file handle.
   * @returns {Promise<void>} Resolves when the file is written.
   */
  async function saveFileToHandle(url, handle) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}).`);
    }
    const blob = await response.blob();
    await writeBlobToHandle(blob, handle);
  }

  /**
   * Writes one blob into a picked file handle.
   *
   * @param {Blob} blob - File content blob.
   * @param {FileSystemFileHandle} handle - Chosen file handle.
   * @returns {Promise<void>} Resolves when written.
   */
  async function writeBlobToHandle(blob, handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /**
   * Returns a readable directory label for UI copy.
   *
   * @param {FileSystemDirectoryHandle|{kind:string,name:string}|null} directoryHandle - Directory handle.
   * @returns {string} Display label.
   */
  function getDirectoryLabel(directoryHandle) {
    return directoryHandle?.name || "Selected folder";
  }

  /**
   * Prompts the user to choose and persist a preferred download directory.
   *
   * @returns {Promise<{name:string}|null>} Selected directory metadata or null.
   */
  async function chooseDefaultDownloadDirectory() {
    if (typeof window.showDirectoryPicker !== "function") {
      throw new Error("This browser cannot remember a default download folder.");
    }

    let handle;
    try {
      handle = await window.showDirectoryPicker({ mode: READ_WRITE_MODE });
    } catch (error) {
      if (error?.name === "AbortError") {
        return null;
      }

      const message = error instanceof Error ? error.message : String(error || "");
      if (error?.name === "SecurityError" || /not allowed|permission|security|system/i.test(message)) {
        throw new Error("This folder cannot be used as a default download folder by the browser. Choose a normal folder like Downloads\\PackTracker instead of the Downloads root.");
      }
      throw error;
    }
    if (!handle) {
      return null;
    }

    await requestHandlePermission(handle, READ_WRITE_MODE);
    await writeStoredHandle(DOWNLOAD_DIRECTORY_KEY, handle);
    return { name: handle.name || "Selected folder" };
  }

  /**
   * Reads the saved default download directory handle, if one exists.
   *
   * @returns {Promise<FileSystemDirectoryHandle|null>} Saved handle or null.
   */
  async function getSavedDownloadDirectoryHandle() {
    const handle = await readStoredHandle(DOWNLOAD_DIRECTORY_KEY);
    if (!handle) {
      return null;
    }

    try {
      await requestHandlePermission(handle, READ_WRITE_MODE);
      return handle;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clears the persisted default download directory handle.
   *
   * @returns {Promise<void>} Resolves when the handle was removed.
   */
  async function clearDefaultDownloadDirectory() {
    await deleteStoredHandle(DOWNLOAD_DIRECTORY_KEY);
  }

  /**
   * Opens a hidden directory input for browsers without `showDirectoryPicker`.
   *
   * @param {Array<string>} acceptedExtensions - Accepted extension list.
   * @returns {Promise<{kind:string,name:string,files:Array<File>}|null>} Legacy directory payload or null.
   */
  function pickFolderWithLegacyInput(acceptedExtensions) {
    void acceptedExtensions;
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.className = "sr-only";
      input.setAttribute("webkitdirectory", "");

      input.addEventListener(
        "change",
        () => {
          const files = Array.from(input.files || []);
          if (files.length === 0) {
            resolve(null);
            return;
          }

          const firstPath = files[0]?.webkitRelativePath || "";
          resolve({
            kind: LEGACY_DIRECTORY_KIND,
            name: firstPath.split("/")[0] || "Selected folder",
            files,
          });
        },
        { once: true }
      );

      input.click();
    });
  }

  /**
   * Ensures the app has read permission for one File System Access directory handle.
   *
   * @param {FileSystemDirectoryHandle|{kind:string}} directoryHandle - Directory handle candidate.
   * @returns {Promise<void>} Resolves when read permission is available.
   */
  async function requestDirectoryPermission(directoryHandle) {
    if (!directoryHandle || directoryHandle.kind === LEGACY_DIRECTORY_KIND) {
      return;
    }

    if (typeof directoryHandle.queryPermission !== "function") {
      return;
    }

    const options = { mode: READ_MODE };
    let permission = await directoryHandle.queryPermission(options);
    if (permission === "prompt" && typeof directoryHandle.requestPermission === "function") {
      permission = await directoryHandle.requestPermission(options);
    }

    if (permission === "denied") {
      throw new Error("Permission to read this folder was denied.");
    }
  }

  /**
   * Ensures a file or directory handle has the requested permission mode.
   *
   * @param {FileSystemHandle} handle - File System Access handle.
   * @param {"read"|"readwrite"} mode - Permission mode.
   * @returns {Promise<void>} Resolves when access is granted.
   */
  async function requestHandlePermission(handle, mode) {
    if (!handle || typeof handle.queryPermission !== "function") {
      return;
    }

    const options = { mode: mode === READ_WRITE_MODE ? READ_WRITE_MODE : READ_MODE };
    let permission = await handle.queryPermission(options);
    if (permission === "prompt" && typeof handle.requestPermission === "function") {
      permission = await handle.requestPermission(options);
    }
    if (permission === "denied") {
      throw new Error("Permission to access the default download folder was denied.");
    }
  }

  /**
   * Writes one downloaded file into a chosen directory handle.
   *
   * @param {string} url - Download URL.
   * @param {string} filename - Suggested filename.
   * @param {FileSystemDirectoryHandle} directoryHandle - Target directory.
   * @returns {Promise<void>} Resolves when the file has been written.
   */
  async function writeDownloadToDirectory(url, filename, directoryHandle) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}).`);
    }

    const blob = await response.blob();
    const safeFilename = String(filename || "").trim() || inferFileNameFromUrl(url);
    const fileHandle = await directoryHandle.getFileHandle(safeFilename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /**
   * Infers a safe filename from a URL or object URL.
   *
   * @param {string} url - Input URL.
   * @returns {string} Suggested filename.
   */
  function inferFileNameFromUrl(url) {
    try {
      const parsedUrl = new URL(String(url || ""), window.location.href);
      const pathname = parsedUrl.pathname.split("/").filter(Boolean);
      return pathname[pathname.length - 1] || "download";
    } catch (error) {
      return "download";
    }
  }

  /**
   * Returns the visible file extension for picker suggestions.
   *
   * @param {string} filename - Suggested filename.
   * @returns {string} Dot-prefixed extension.
   */
  function resolveFileExtension(filename) {
    const parts = String(filename || "").split(".");
    if (parts.length > 1) {
      return `.${parts[parts.length - 1].toLowerCase()}`;
    }
    return ".bin";
  }

  /**
   * Builds one picker file-type descriptor for the save picker.
   *
   * @param {string} filename - Suggested filename.
   * @returns {{description:string, accept:{"application/octet-stream":Array<string>}}} Picker descriptor.
   */
  function buildPickerTypeOption(filename) {
    return {
      description: "PackTracker download",
      accept: {
        "application/octet-stream": [resolveFileExtension(filename)],
      },
    };
  }

  /**
   * Persists one File System Access handle via IndexedDB.
   *
   * @param {string} key - Storage key.
   * @param {FileSystemDirectoryHandle} handle - Handle to persist.
   * @returns {Promise<void>} Resolves when written.
   */
  async function writeStoredHandle(key, handle) {
    const db = await openHandlesDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not save handle."));
      tx.onabort = () => reject(tx.error || new Error("Could not save handle."));
    });
  }

  /**
   * Reads one stored File System Access handle from IndexedDB.
   *
   * @param {string} key - Storage key.
   * @returns {Promise<FileSystemDirectoryHandle|null>} Stored handle or null.
   */
  async function readStoredHandle(key) {
    const db = await openHandlesDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readonly");
      const request = tx.objectStore(HANDLE_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not read handle."));
    });
  }

  /**
   * Deletes one stored File System Access handle from IndexedDB.
   *
   * @param {string} key - Storage key.
   * @returns {Promise<void>} Resolves when removed.
   */
  async function deleteStoredHandle(key) {
    const db = await openHandlesDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not clear handle."));
      tx.onabort = () => reject(tx.error || new Error("Could not clear handle."));
    });
  }

  /**
   * Opens the IndexedDB store used for persisted file-system handles.
   *
   * @returns {Promise<IDBDatabase>} Open database handle.
   */
  async function openHandlesDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(HANDLE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
          db.createObjectStore(HANDLE_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open handle storage."));
    });
  }

  /**
   * Checks whether a file name matches one of the allowed extensions.
   *
   * @param {string} name - File name.
   * @param {Array<string>} extensions - Allowed extension list.
   * @returns {boolean} True when the file matches.
   */
  function matchesExtension(name, extensions) {
    const normalizedName = String(name || "").toLowerCase();
    return extensions.some((extension) => normalizedName.endsWith(String(extension).toLowerCase()));
  }

  Object.assign(namespace, {
    isTauriRuntime,
    isRuntimeUnavailableError,
    invokeCommand,
    pickFolder,
    pickFolderLegacy,
    readFilesInFolder,
    readJarFilesInFolder,
    requestDirectoryPermission,
    downloadFile,
    downloadWithPreferences,
    prepareDownloadWithPreferences,
    chooseDefaultDownloadDirectory,
    getSavedDownloadDirectoryHandle,
    clearDefaultDownloadDirectory,
    getDirectoryLabel,
  });
})();
