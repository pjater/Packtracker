(function attachPlatformModule() {
  const namespace = (window.PackTracker = window.PackTracker || {});
  const READ_MODE = "read";
  const READ_WRITE_MODE = "readwrite";
  const LEGACY_DIRECTORY_KIND = "legacy-directory";
  const DEFAULT_SCAN_EXTENSIONS = [".jar"];

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
        throw error;
      }
    }

    return pickFolderWithLegacyInput(options.accept || DEFAULT_SCAN_EXTENSIONS);
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
   * Returns a readable directory label for UI copy.
   *
   * @param {FileSystemDirectoryHandle|{kind:string,name:string}|null} directoryHandle - Directory handle.
   * @returns {string} Display label.
   */
  function getDirectoryLabel(directoryHandle) {
    return directoryHandle?.name || "Selected folder";
  }

  /**
   * Opens a hidden directory input for browsers without `showDirectoryPicker`.
   *
   * @param {Array<string>} acceptedExtensions - File extensions used for filtering.
   * @returns {Promise<{kind:string,name:string,files:Array<File>}|null>} Legacy directory payload or null.
   */
  function pickFolderWithLegacyInput(acceptedExtensions) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.className = "sr-only";
      input.setAttribute("webkitdirectory", "");
      if (Array.isArray(acceptedExtensions) && acceptedExtensions.length > 0) {
        input.accept = acceptedExtensions.join(",");
      }

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
    readFilesInFolder,
    readJarFilesInFolder,
    downloadFile,
    getDirectoryLabel,
  });
})();
