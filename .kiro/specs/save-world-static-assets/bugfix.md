# Bugfix Requirements Document

## Introduction

The "Save World" standalone archive export pipeline correctly handles embedded textures (base64String from GLB imports) and blob URL textures (created by AssetResolver during archive load), but fails to include static assets served directly from the web server. All server-served static assets (textures, audio, models, environment files) are loaded from the `vishva/assets` folder. When the scene is serialized, these assets retain their server-relative URLs (e.g., `vishva/assets/curated/skyboxes/TropicalSunnyDay/TropicalSunnyDay_px.jpg`).

The current `AssetCollector` scans specific fields in the serialized scene JSON (textures[].name, materials[].*.name, etc.) but misses:
1. **CubeTexture `files` arrays** — BabylonJS serializes CubeTextures with a `files` array containing 6 individual face file paths, but `_scanMaterials` only collects `value.name` (the unfetchable base path)
2. **VishvaSerialized sound/asset references** — assets referenced in the Vishva metadata (e.g., avatar footstep sounds) are not scanned

A simpler and more robust approach is to scan the entire serialized output for any string value starting with the server asset path prefix (`vishva/assets`) and treat those as static assets to fetch and archive.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a world containing a CubeTexture skybox is saved as a standalone archive THEN the system collects only the base path from the texture's `name` field (e.g., `vishva/assets/curated/skyboxes/TropicalSunnyDay/TropicalSunnyDay`), which is not a fetchable file, and the fetch silently fails with a 404

1.2 WHEN a material's nested texture object contains a `files` array with individual face file URLs (as serialized by BabylonJS for CubeTextures with `isCube: true`) THEN the system does not scan the `files` array, so the 6 face image files are never collected for archiving

1.3 WHEN the VishvaSerialized metadata contains references to server-served assets (e.g., avatar footstep sound at `vishva/assets/audio/footstep_carpet_000.ogg`) THEN the system does not scan VishvaSerialized for asset URLs, so these files are never collected for archiving

1.4 WHEN the fetch of a server-served asset fails (e.g., 404 for a CubeTexture base path that is not a real file) THEN the system silently skips the asset with only a `console.warn`, resulting in an incomplete archive with no user-visible indication of missing assets

### Expected Behavior (Correct)

2.1 WHEN a world is saved as a standalone archive THEN the system SHALL scan the entire serialized output (both Scene.babylon and Vishva.json) for any string value starting with the server asset path prefix (e.g., `vishva/assets`) and collect all such URLs as static assets to fetch and include in the archive

2.2 WHEN static assets with server-relative URLs are collected THEN the system SHALL resolve them against the application base URL, fetch their binary data, and include them in the `assets/` folder of the tar archive

2.3 WHEN static assets are archived THEN the system SHALL rewrite all occurrences of the original server-relative URL in the serialized output to the corresponding `assets/<filename>` archive-relative path

2.4 WHEN the fetch of a server-served asset fails THEN the system SHALL report the failure to the user (via progress UI or a summary after save) so they are aware the archive may be incomplete, while still completing the save of remaining assets

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a world containing only embedded textures (base64String from GLB imports) is saved THEN the system SHALL CONTINUE TO extract, decode, and include them as separate files in the archive

3.2 WHEN a world loaded from a previous archive is re-saved THEN the system SHALL CONTINUE TO carry forward assets from the loaded archive (`_loadedAssetMap`) that are still referenced in the scene

3.3 WHEN a world containing blob URL textures (created by AssetResolver during archive load) is saved THEN the system SHALL CONTINUE TO fetch blob URLs and include their binary data in the archive

3.4 WHEN textures have already been rewritten to archive-relative paths (starting with `assets/`) THEN the system SHALL CONTINUE TO skip them during external asset collection to avoid double-processing

3.5 WHEN a world with no external assets is saved THEN the system SHALL CONTINUE TO produce a valid tar archive containing `Vishva.json` and `Scene.babylon` without errors

3.6 WHEN floating point numbers are serialized in the scene JSON THEN the system SHALL CONTINUE TO round them to 4 decimal places for file size reduction

3.7 WHEN non-fetchable base paths are encountered (e.g., CubeTexture base path without extension) THEN the system SHALL NOT attempt to fetch them if the individual file URLs from the `files` array are already being collected
