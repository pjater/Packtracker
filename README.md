# PackTracker

PackTracker is a browser-based Minecraft profile manager for tracking mods, resource packs, and shaders with Modrinth.

Live demo: https://packtracker.onrender.com

## Run locally

Clone the repo, then open `index.html` in a browser or serve the folder with any static file server.

## Features

- Profile management with local persistence
- Modrinth search and add-to-profile flows
- Mod, shader, and resource pack tracking
- Local folder scanning for archive files
- Backup export and import

## Browser support

Folder scanning uses the File System Access API when available, so the best experience is in Chrome, Edge, or another Chromium-based browser. Firefox users can use the rest of the app, and scanning falls back where possible.
