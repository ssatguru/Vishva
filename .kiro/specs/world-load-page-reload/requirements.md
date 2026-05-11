# Requirements Document

## Introduction

This feature replaces the current in-place world loading approach (which causes scene accumulation bugs due to stale WebGL state) with a page-reload strategy. When a user uploads a `.tar.gz` world file via the upload button or drag-and-drop, the application stores the file temporarily in IndexedDB and reloads the page with a special query parameter. On reload, the Vishva constructor detects the flag, retrieves the file from IndexedDB, and loads it through the standard world initialization path — ensuring a clean WebGL context every time.

## Glossary

- **Vishva**: The core 3D world editor class that manages the BabylonJS engine, scene, and all subsystems
- **LoadManager**: The subsystem responsible for loading worlds and assets from server, IndexedDB, and local files
- **UploadUI**: The UI component handling file/folder upload via the navbar upload button
- **IndexedDB_Store**: The browser IndexedDB database (`VishvaWorlds`) used for temporary and persistent world storage
- **World_File**: A `.tar.gz` archive containing `Vishva.json`, `Scene.babylon`, and optionally an `assets/` directory
- **Query_Parameter_Parser**: The `HREFsearch` utility class that reads URL query parameters on page load
- **Page_Reload_Flag**: The special query parameter value `__uploaded` used in the `?world=` parameter to signal that a world should be loaded from IndexedDB
- **Asset_File**: An individual 3D model file (`.glb`, `.gltf`, `.obj`, `.babylon`, etc.) that is appended to the current scene

## Requirements

### Requirement 1: Validate and Store World File in IndexedDB Before Reload

**User Story:** As a user, I want my uploaded world file to be validated immediately and preserved across a page reload, so that I get instant feedback on invalid files and the application can load valid ones into a fresh scene context.

#### Acceptance Criteria

1. WHEN a user uploads a World_File via UploadUI or drag-and-drop, THE LoadManager SHALL decompress the gzip data and scan the tar archive headers to verify that both `Vishva.json` and `Scene.babylon` entries exist
2. IF the archive validation fails (missing required entries, decompression error, or invalid tar format), THEN THE LoadManager SHALL display an error message to the user immediately and SHALL NOT store the file or reload the page
3. WHEN the archive passes validation, THE LoadManager SHALL store the file's raw ArrayBuffer (the original compressed `.tar.gz` data) in IndexedDB_Store under a well-known key (e.g., `__uploaded`)
4. WHEN the IndexedDB_Store write operation completes successfully, THE LoadManager SHALL trigger a page reload with the query parameter `?world=__uploaded`
5. IF the IndexedDB_Store write operation fails, THEN THE LoadManager SHALL display an error message to the user and not reload the page

### Requirement 2: Detect Uploaded World on Page Load

**User Story:** As a user, I want the application to automatically load my uploaded world after the page reloads, so that the experience feels seamless.

#### Acceptance Criteria

1. WHEN the page loads with `?world=__uploaded`, THE Query_Parameter_Parser SHALL pass the value `__uploaded` to the Vishva constructor as the scene file identifier
2. WHEN the Vishva constructor receives `__uploaded` as the scene file, THE Vishva constructor SHALL invoke a dedicated uploaded-world loading path instead of the server-fetch or empty-world paths
3. THE Vishva constructor SHALL treat the `__uploaded` identifier as distinct from both the `empty` keyword and regular server world names

### Requirement 3: Load World from IndexedDB on Startup

**User Story:** As a user, I want the uploaded world to load correctly from browser storage into a clean scene, so that I avoid the scene accumulation bug.

#### Acceptance Criteria

1. WHEN the Vishva constructor invokes the uploaded-world loading path, THE LoadManager SHALL retrieve the stored World_File data from IndexedDB_Store using the `__uploaded` key
2. WHEN the World_File data is retrieved successfully, THE LoadManager SHALL decompress, extract, validate, and load the world using the same pipeline as `loadZipWorld` (decompress gzip → extract tar → validate archive → resolve assets → call `loadVishvaPartFromObjects`)
3. IF the IndexedDB_Store does not contain data for the `__uploaded` key, THEN THE LoadManager SHALL fall back to loading an empty world and display a warning to the user
4. IF the retrieved World_File data fails validation (missing `Vishva.json` or `Scene.babylon`), THEN THE LoadManager SHALL fall back to loading an empty world and display an error message

### Requirement 4: Clean Up IndexedDB After Successful Load

**User Story:** As a user, I want temporary upload data to be cleaned up automatically, so that my browser storage is not consumed by stale uploads.

#### Acceptance Criteria

1. WHEN the uploaded world loads successfully from IndexedDB_Store, THE LoadManager SHALL delete the `__uploaded` entry from IndexedDB_Store
2. WHEN the uploaded world fails to load, THE LoadManager SHALL delete the `__uploaded` entry from IndexedDB_Store to prevent repeated failed load attempts on subsequent page loads
3. THE LoadManager SHALL remove the `?world=__uploaded` query parameter from the browser URL (via `history.replaceState`) after the load attempt completes, so that a manual page refresh loads an empty world instead of re-attempting the upload

### Requirement 5: Preserve Individual Asset Drag-and-Drop Behavior

**User Story:** As a user, I want to continue dragging individual 3D model files onto the canvas to add them to my scene, so that my existing workflow for adding assets is unaffected.

#### Acceptance Criteria

1. WHEN a user drops an Asset_File (non `.tar.gz`) onto the canvas, THE LoadManager SHALL append the asset to the current scene using the existing `loadDroppedAsset` method
2. WHEN a user drops an Asset_File via UploadUI, THE LoadManager SHALL process the asset using the existing `processDroppedFiles` method
3. THE LoadManager SHALL only trigger the page-reload flow for files identified as World_Files (`.tar.gz` archives)

### Requirement 6: Show Progress Feedback During Upload-and-Reload Flow

**User Story:** As a user, I want to see feedback that my world is being saved and the page is reloading, so that I understand the application has not frozen.

#### Acceptance Criteria

1. WHEN a World_File upload triggers the page-reload flow, THE LoadManager SHALL display a progress indicator with a message such as "Preparing world for reload..."
2. WHEN the page reloads and detects `__uploaded`, THE LoadManager SHALL display a progress indicator during the IndexedDB retrieval, decompression, and loading phases
3. THE LoadManager SHALL use the existing `ProgressManager` for all progress feedback in this flow

### Requirement 7: Handle Edge Cases for the Upload Query Parameter

**User Story:** As a user, I want the application to behave predictably even if I manually navigate to `?world=__uploaded` without having uploaded a file.

#### Acceptance Criteria

1. IF a user navigates to `?world=__uploaded` and no data exists in IndexedDB_Store for the `__uploaded` key, THEN THE Vishva constructor SHALL load an empty world
2. WHEN loading an empty world due to missing IndexedDB data, THE Vishva constructor SHALL display a brief warning message indicating no uploaded world was found
3. THE Vishva constructor SHALL clean the URL query parameter via `history.replaceState` regardless of whether the load succeeds or fails
