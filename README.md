# Wz2100-mod-viewer

A lightweight web viewer for Warzone 2100 modding data. It reads the game's JSON stats and renders PIE models directly in the browser.

## Features

- Browse structures and weapons from the base game or uploaded stats.
- Preview PIE models, automatically stacking hard-point bases with their mounted weapons.
- Display build costs for both structures and their weapons, along with combined totals.

Open `index.html` in a modern browser to explore the data.

## Uploading mods

Use the **Upload** button to load a MOD or JSON stats file.
MOD files are stored in Warzone 2100's user directory:

- **Windows:** `Documents\\Warzone 2100 4.5\\mods\\global`
- **Linux:** `~/.local/share/warzone2100-4.5/mods/global`
- **macOS:** `~/Library/Application Support/warzone2100-4.5/mods/global`

Replace `4.5` with your installed game version.
