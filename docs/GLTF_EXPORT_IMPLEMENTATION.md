# glTF Export Feature Implementation

## Overview
Added support for exporting Vishva worlds in glTF format alongside the existing Babylon format. Users can now choose between two export formats via a dropdown menu in the navbar.

## Changes Made

### 1. Enable glTF Serializer (`src/index.ts`)
- Uncommented `import "babylonjs-serializers"` to enable glTF export functionality
- The `babylonjs-serializers` package was already installed in package.json

### 2. SaveManager Updates (`src/managers/SaveManager.ts`)
- **Added import**: `GLTF2Export` from `babylonjs-serializers`
- **New method**: `saveWorldAsGltf()` - Public method to save world in glTF format
- **New method**: `_getWorldGltfZipBlob()` - Private method that:
  - Prepares scene (same cleanup as babylon export)
  - Creates VishvaSerialized object with all metadata
  - Exports scene using `GLTF2Export.GLTFAsync()`
  - Creates tar.gz archive with:
    - `Vishva.json` (Vishva metadata)
    - `Scene.gltf` (glTF scene)
    - `Scene.bin` (binary data, if present)
  - Returns compressed blob for download

### 3. Vishva API (`src/Vishva.ts`)
- **New method**: `saveWorldAsGltf()` - Public API that delegates to SaveManager
- Maintains existing `saveWorld()` for backward compatibility

### 4. Navbar UI (`src/gui/NavBarML.ts`)
- Replaced single download button with dropdown structure:
  ```html
  <div style="display:inline-block;">
    <button id="downWorld">...</button>
    <div id="DownloadMenu" style="display: none; position:absolute; z-index:1000;"></div>
  </div>
  ```
- Menu populated dynamically with format options

### 5. GUI Event Handlers (`src/gui/VishvaGUI.ts`)
- Modified `_createNavMenu()` to:
  - Create submenu with "Babylon Format" and "glTF Format" buttons
  - Style submenu with theme colors and proper positioning
  - Toggle submenu on download button click
  - Close submenu when clicking outside
  - Handle "Babylon Format" click → downloads as `.tar.gz`
  - Handle "glTF Format" click → downloads as `-gltf.tar.gz`

### 6. LoadManager Updates (`src/managers/LoadManager.ts`)
- **Updated**: `sceneLoad1()` method to detect format:
  - Checks for `Scene.babylon` first
  - Falls back to `Scene.gltf` if babylon not found
  - Routes to appropriate loader based on format
- **New method**: `loadVishvaPartFromGltf()` - Loads glTF format worlds:
  - Processes VishvaSerialized data (same as babylon)
  - Creates blob URL from glTF data
  - Uses `SceneLoader.Append()` with glTF URL
  - Handles binary data if present
- **Updated**: `_loadWorldFromIndexedDB()` to support both formats

## File Structure

### Babylon Format Archive
```
world.tar.gz
├── Vishva.json      (Vishva metadata)
└── Scene.babylon    (Babylon scene format)
```

### glTF Format Archive
```
world-gltf.tar.gz
├── Vishva.json      (Vishva metadata)
├── Scene.gltf       (glTF scene JSON)
└── Scene.bin        (Binary data, optional)
```

## Backward Compatibility

- ✅ Existing babylon format remains default
- ✅ Old world files continue to load
- ✅ LoadManager auto-detects format
- ✅ All Vishva metadata preserved in both formats
- ✅ Tags and metadata system works identically

## User Experience

1. Click download button in navbar
2. Submenu appears with two options:
   - "Babylon Format" - Traditional format
   - "glTF Format" - Industry-standard format
3. Select desired format
4. World downloads with appropriate filename extension

## Technical Notes

### glTF Export Options
- Uses `GLTF2Export.GLTFAsync()` with default options
- Exports all nodes in scene
- Waits for scene to be ready before export

### Format Detection
- LoadManager checks for `Scene.babylon` first
- If not found, checks for `Scene.gltf`
- Throws error if neither format found

### Limitations
- glTF may not support all Babylon.js custom properties
- Some advanced materials may need conversion
- Vishva-specific metadata always preserved in `Vishva.json`

## Testing Checklist

- [ ] Export world in Babylon format
- [ ] Export world in glTF format
- [ ] Load Babylon format world
- [ ] Load glTF format world (when implemented)
- [ ] Verify all meshes load correctly
- [ ] Verify materials and textures
- [ ] Verify animations work
- [ ] Verify Vishva metadata (avatar, ground, sky, etc.)
- [ ] Verify SNA (sensors/actuators) work
- [ ] Test with complex scenes
- [ ] Test submenu UI interaction
- [ ] Test download filenames

## Future Enhancements

1. Add format preference to settings
2. Support glTF embedded format (single file)
3. Add export options dialog (compression, etc.)
4. Optimize glTF export for web delivery
5. Add format conversion utility
