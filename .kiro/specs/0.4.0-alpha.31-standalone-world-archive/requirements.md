# Requirements Document

## Introduction

This feature makes saved Vishva world archives fully self-contained by bundling all referenced assets (textures, meshes, sounds, etc.) directly into the archive's `assets/` folder. Currently, the serialized `Scene.babylon` file references assets via server-relative paths (e.g., `bin/assets/internal/textures/...` or `vishva/assets/...`), creating a dependency on the server's file system. With this feature, the archive will include all necessary asset files and the scene will reference them via relative paths within the archive. On load, assets will be served from the archive rather than fetched from the server.

## Glossary

- **Archive**: The gzip-compressed TAR file (`.gz`) that stores the world data, consisting of `Vishva.json`, `Scene.babylon`, and an `assets/` folder
- **Asset**: Any external file referenced by the scene — textures (PNG, JPG, HDR, env), mesh files (`.babylon`, `.glb`, `.gltf`), sound files (`.ogg`, `.mp3`, `.wav`), or other binary resources
- **Scene_Serializer**: The BabylonJS `SceneSerializer` that produces the `Scene.babylon` JSON containing all scene object definitions and their asset references
- **Asset_Collector**: The component responsible for scanning the serialized scene JSON and collecting all referenced external asset URLs
- **Path_Rewriter**: The component responsible for rewriting asset URLs in the serialized scene JSON from server-relative paths to archive-relative paths (prefixed with `assets/`)
- **Asset_Resolver**: The component responsible for intercepting asset requests during scene load and serving asset data from the archive instead of fetching from the server
- **TAR_Archive**: The uncompressed TAR container within the gzip file that holds all world files in a directory structure
- **SaveManager**: The existing class (`src/managers/SaveManager.ts`) responsible for serializing and saving the world
- **LoadManager**: The existing class (`src/managers/LoadManager.ts`) responsible for loading and deserializing the world

## Requirements

### Requirement 1: Collect Referenced Assets During Save

**User Story:** As a world creator, I want all assets referenced by my scene to be identified during save, so that they can be bundled into the archive.

#### Acceptance Criteria

1. WHEN the SaveManager serializes the scene, THE Asset_Collector SHALL scan the serialized scene JSON and identify all external asset URLs referenced by textures, materials, meshes, particle systems, and sound objects
2. WHEN an asset URL is identified, THE Asset_Collector SHALL resolve the URL to an absolute fetch-able path using the current page origin and known asset base paths
3. IF an asset URL points to a data URI or is already embedded as base64, THEN THE Asset_Collector SHALL decode it to binary format and store the resulting binary data in the `assets/` folder, replacing the inline data URI in the scene JSON with the corresponding archive-relative path
4. THE Asset_Collector SHALL produce a deduplicated list of asset entries, each containing the original URL and the resolved fetch path

### Requirement 2: Fetch and Bundle Assets Into Archive

**User Story:** As a world creator, I want all referenced assets to be downloaded and stored in the archive, so that the archive is self-contained.

#### Acceptance Criteria

1. WHEN the Asset_Collector produces the list of referenced assets, THE SaveManager SHALL fetch each asset's binary data from the resolved path
2. WHEN an asset is fetched successfully, THE SaveManager SHALL store the asset binary data in the TAR_Archive under the `assets/` directory using a flattened filename derived from the original path
3. IF an asset fetch fails, THEN THE SaveManager SHALL log a warning with the failed URL and continue saving the remaining assets without aborting the save operation
4. THE SaveManager SHALL report progress to the ProgressManager as assets are fetched, indicating the number of assets processed out of the total

### Requirement 3: Rewrite Asset Paths in Scene JSON

**User Story:** As a world creator, I want asset references in the saved scene to point to the archive's `assets/` folder, so that the scene does not depend on external servers.

#### Acceptance Criteria

1. WHEN assets are collected and stored in the archive, THE Path_Rewriter SHALL replace each original asset URL in the serialized scene JSON with the corresponding archive-relative path (e.g., `assets/<filename>`)
2. THE Path_Rewriter SHALL handle asset URLs that appear in texture `name` fields, material texture references, particle system texture references, and any other serialized properties that contain file paths
3. WHEN two different original URLs resolve to the same flattened filename, THE Path_Rewriter SHALL disambiguate by appending a numeric suffix to the filename (e.g., `assets/texture_1.png`, `assets/texture_2.png`)
4. THE Path_Rewriter SHALL NOT leave any data URIs or base64-embedded content in the scene JSON — all such references SHALL be converted to archive-relative paths pointing to the decoded binary files in `assets/`

### Requirement 4: Store Assets in TAR Archive Structure

**User Story:** As a world creator, I want the archive to contain an `assets/` folder with all bundled assets, so that the archive is organized and self-contained.

#### Acceptance Criteria

1. THE SaveManager SHALL include all collected asset files in the TAR_Archive under the path prefix `assets/` (e.g., `assets/ground.jpg`, `assets/skybox.env`)
2. THE TAR_Archive SHALL contain the following structure: `Vishva.json` at root, `Scene.babylon` at root, and all asset files under `assets/`
3. THE SaveManager SHALL store asset files as binary data in the TAR_Archive without any encoding transformation

### Requirement 5: Resolve Assets From Archive During Load

**User Story:** As a world consumer, I want the scene to load its assets from the archive's `assets/` folder, so that the world works without access to the original server.

#### Acceptance Criteria

1. WHEN a compressed world archive is loaded, THE LoadManager SHALL extract all files from the TAR_Archive including those in the `assets/` directory
2. WHEN the scene is loaded via SceneLoader, THE Asset_Resolver SHALL intercept asset file requests and serve matching files from the extracted archive `assets/` folder
3. WHEN an asset request matches a file in the archive's `assets/` folder, THE Asset_Resolver SHALL provide the asset data as a Blob URL to the scene loader
4. WHEN an asset request does not match any file in the archive, THE Asset_Resolver SHALL fall back to the default network fetch behavior
5. WHEN the scene has finished loading, THE Asset_Resolver SHALL revoke all created Blob URLs to free memory

### Requirement 6: Backward Compatibility With Legacy Archives

**User Story:** As a world consumer, I want to load older world archives that do not contain bundled assets, so that existing saved worlds continue to work.

#### Acceptance Criteria

1. WHEN a loaded archive does not contain an `assets/` directory, THE LoadManager SHALL load the scene using the existing server-based asset resolution behavior
2. THE LoadManager SHALL detect the presence of bundled assets by checking for files with the `assets/` path prefix in the extracted TAR_Archive
3. IF the archive contains no `assets/` entries, THEN THE Asset_Resolver SHALL not be activated and all asset requests SHALL use default network fetch behavior

### Requirement 7: Handle IndexedDB Save and Load With Assets

**User Story:** As a world creator, I want worlds saved to browser storage to also be self-contained, so that they load correctly without server access.

#### Acceptance Criteria

1. WHEN a world is saved to IndexedDB, THE SaveManager SHALL save the complete archive including the `assets/` folder
2. WHEN a world is loaded from IndexedDB, THE LoadManager SHALL extract and serve assets from the archive's `assets/` folder using the same Asset_Resolver mechanism as server-loaded archives
