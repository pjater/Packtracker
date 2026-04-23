# PackTracker

PackTracker is a browser-based Minecraft profile manager for organizing mods, resource packs, and shaders across multiple profiles.

Live demo: https://packtracker.onrender.com

## Run locally

Clone the repo, then open `index.html` in a browser or serve the folder with any static file server.

## Features

- Profile management with local persistence
- Mod, shader, and resource pack tracking
- Browse/search support for both Modrinth and CurseForge
- Local folder scanning for archive files
- Backup export and import
- Shareable profile links
- Standalone installable app experience through PWA support
- Visual settings for theme, accent color, motion, blur, fonts, and layout polish

## Changelog

### 2026.04.23

- Improved Browse, Scan, and Update flows so PackTracker works more consistently across both Modrinth and CurseForge.
- Added a larger Settings experience with dedicated visual preferences, more font options, accent color controls, and other appearance tuning.
- Refined standalone-app support, downloads, backups, and profile management interactions across the app.

## Browser support

Folder scanning and download-directory features work best in Chrome, Edge, or another Chromium-based browser because they rely on newer browser file APIs. Firefox users can still use the rest of the app, but some file and install flows are more limited there.
