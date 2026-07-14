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
- Visual settings for theme, accent color, motion, blur, fonts, layout polish, and interface scale
- Customizable keybinds for common actions
- Mobile-friendly layouts and long-page helpers like the scroll-to-bottom button
- Clear-all actions for profiles and tab item lists

## Changelog

### 2026.05.18

- Added a dedicated Keybinds settings tab with editable shortcuts and reset/save controls.
- Added an app scale setting in the Visual tab with 5% snap steps from 75% to 125%.
- Added clear-all actions for profiles and for the active tab item list.
- Improved the floating scroll-to-bottom button and its behavior in long pages, popups, and menus.
- Tightened mobile and layout spacing so the app fits better on smaller screens and different ratios.

### 2026.05.10

- Update scan flow and dependencies checker flow were improved so tracking, scanning, and follow-up actions behave more consistently.
- Modpack support was added and expanded across the app.
- Small visual and functional issues were corrected, including cleaner item actions and matching sidebar item counts.

### 2026.04.23

- Improved Browse, Scan, and Update flows so PackTracker works more consistently across both Modrinth and CurseForge.
- Added a larger Settings experience with dedicated visual preferences, more font options, accent color controls, and other appearance tuning.
- Refined standalone-app support, downloads, backups, and profile management interactions across the app.

## Browser support

Folder scanning and download-directory features work best in Chrome, Edge, or another Chromium-based browser because they rely on newer browser file APIs. Firefox users can still use the rest of the app, but some file and install flows are more limited there.
