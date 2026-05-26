# Requirements Document

## Introduction

This feature replaces the current in-memory asset storage approach (where all decompressed assets from a `.tar.gz` world archive are held in a `Map<string, Uint8Array>` for the entire session) with an IndexedDB-backed storage system that serves assets on-demand. It also replaces the flat `assets/` folder structure in archives with a structured path layout that preserves the server's directory hierarchy (e.g., `vishva/assets/audio/footstep.ogg`).

The two changes work together: structured paths in the archive become structured keys in IndexedDB, making the system more predictable, collision-free, and memory-efficient.

## Glossary

- **Asset_Store**: The IndexedDB-backed storage module responsible for persisting individual asset binary data keyed by their structured path
- **Asset_Resolver**: The module that intercepts BabylonJS file requests and serves matching assets from the Asset_Store via IndexedDB reads and Blob URLs
- **Asset_Collector**: The module that collects assets referenced by the scene for archiving, generating archive filenames from original URLs
- **Path_Rewriter**: The module that rewrites asset URLs in serialized scene JSON to archive-relative paths
- **Load_Manager**: The module responsible for fetching, decompressing, and extracting world archives, then storing assets into the Asset_Store
- **Save_Manager**: The module responsible for re-saving worlds, reading assets back from the Asset_Store for inclusion in the archive
- **Structured_Path**: An archive path that preserves directory hierarchy under `vishva/assets/` (e.g., `vishva/assets/audio/footstep.ogg`, `vishva/assets/textures/ground.jpg`) rather than flattening to a single directory
- **World_Session**: The period from when a world archive is loaded until a different world is loaded or the page is closed
- **TAR_Archive**: The tar-formatted file (gzip-compressed) used to package world data and assets

## Requirements

### Requirement 1: IndexedDB Asset Ingestion on World Load

**User Story:** As a user loading a large world, I want assets to be stored in IndexedDB after extraction so that they do not consume JavaScript heap memory for the entire session.

#### Acceptance Criteria

1. WHEN a world archive is fetched and decompressed, THE Load_Manager SHALL store each extracted asset individually in the Asset_Store keyed by its archive path
2. WHEN all assets have been stored in the Asset_Store, THE Load_Manager SHALL release the in-memory tar data and asset map from the JavaScript heap
3. WHEN an asset is stored in the Asset_Store, THE Asset_Store SHALL persist the asset's binary data and its structured path key in an IndexedDB object store
4. IF an IndexedDB write fails for an asset, THEN THE Asset_Store SHALL log the error and continue storing remaining assets

### Requirement 2: On-Demand Asset Serving from IndexedDB

**User Story:** As a user interacting with a loaded world, I want assets to be fetched from IndexedDB on demand so that only actively-used assets consume heap memory.

#### Acceptance Criteria

1. WHEN BabylonJS requests an asset via Tools.PreprocessUrl or Tools.LoadFile, THE Asset_Resolver SHALL read the asset from the Asset_Store and return a Blob URL
2. WHEN the Asset_Resolver creates a Blob URL for an asset, THE Asset_Resolver SHALL track the Blob URL for later revocation

### Requirement 3: Asset Store Cleanup

**User Story:** As a user navigating between worlds, I want the previous world's assets to be cleaned up so that storage does not grow unbounded.

#### Acceptance Criteria

1. WHEN a new world is loaded, THE Asset_Store SHALL delete all assets belonging to the previous World_Session from IndexedDB
2. WHEN the Asset_Resolver is deactivated, THE Asset_Resolver SHALL revoke all outstanding Blob URLs
3. WHEN the Asset_Store deletes session assets, THE Asset_Store SHALL remove the entire object store contents for the previous session

### Requirement 4: Structured Path Preservation in Archive

**User Story:** As a developer, I want assets in the archive to preserve their server directory structure so that filename collisions are eliminated and debugging is easier.

#### Acceptance Criteria

1. WHEN the Asset_Collector generates an archive filename for a server asset, THE Asset_Collector SHALL preserve the full relative path including the `vishva/assets/` prefix (e.g., `vishva/assets/audio/footstep.ogg` remains `vishva/assets/audio/footstep.ogg` in the archive)
2. THE Asset_Collector SHALL store all structured asset paths under the `vishva/assets/` prefix in the archive
3. WHEN the Asset_Collector generates an archive filename for a data URI asset, THE Asset_Collector SHALL place the generated filename in a `data/` subdirectory (e.g., `vishva/assets/data/data_asset.png`)
4. WHEN the Asset_Collector generates an archive filename for a blob texture, THE Asset_Collector SHALL place the generated filename in a `blob/` subdirectory (e.g., `vishva/assets/blob/texture_0.jpg`)

### Requirement 5: Path Rewriting with Structured Paths

**User Story:** As a developer, I want path rewriting to use the full structured path so that scene JSON references match the archive layout exactly.

#### Acceptance Criteria

1. WHEN the Path_Rewriter rewrites asset references, THE Path_Rewriter SHALL replace original URLs with the full structured archive path (e.g., `vishva/assets/audio/footstep.ogg`)
2. THE Asset_Resolver SHALL match asset requests using the full structured path rather than basename-only matching

### Requirement 6: Asset Retrieval for Re-Save

**User Story:** As a user re-saving a world, I want the save process to read assets from IndexedDB so that all previously-loaded assets are included in the new archive.

#### Acceptance Criteria

1. WHEN the Save_Manager builds an archive, THE Save_Manager SHALL read carried-forward assets from the Asset_Store instead of an in-memory map
2. WHEN the Save_Manager reads an asset from the Asset_Store for archiving, THE Asset_Store SHALL return the asset's binary data by its structured path key
3. WHEN the Save_Manager needs to enumerate all stored assets, THE Asset_Store SHALL provide a method to list all asset keys for the current World_Session

### Requirement 7: TAR Long Path Support

**User Story:** As a developer, I want the TAR utility to support paths longer than 100 bytes so that deeply nested structured paths are stored correctly.

#### Acceptance Criteria

1. WHEN a file path exceeds 100 bytes, THE TAR_Archive creation utility SHALL use the UStar prefix field (bytes 345–499) to store the directory prefix, keeping the filename portion in bytes 0–99
2. WHEN extracting a TAR_Archive, THE extraction utility SHALL concatenate the UStar prefix field with the filename field to reconstruct the full path
3. THE TAR_Archive utility SHALL support paths up to 255 bytes total (155-byte prefix + 100-byte filename)

### Requirement 8: VishvaSerialized Asset Path Resolution

**User Story:** As a user loading a world with SNA behaviors referencing assets, I want structured asset paths in VishvaSerialized to be resolved to Blob URLs so that sounds and other non-BabylonJS assets load correctly.

#### Acceptance Criteria

1. WHEN the Asset_Resolver resolves asset paths in VishvaSerialized objects, THE Asset_Resolver SHALL match `vishva/assets/`-prefixed strings using the full structured path
2. WHEN a VishvaSerialized asset path is resolved, THE Asset_Resolver SHALL read the asset from the Asset_Store and replace the path with a Blob URL

### Requirement 9: IndexedDB Availability Check

**User Story:** As a user on a browser with restricted storage, I want to be informed if IndexedDB is unavailable so that I understand why the operation cannot proceed.

#### Acceptance Criteria

1. IF IndexedDB is unavailable or the open request fails, THEN THE Asset_Store SHALL inform the user that the operation cannot be completed due to insufficient IndexedDB storage
2. IF IndexedDB storage quota is exceeded during asset ingestion, THEN THE Asset_Store SHALL inform the user that the world is too large for available browser storage

### Requirement 10: Direct IndexedDB Save (Save World in Browser)

**User Story:** As a user clicking "save world in browser", I want assets to be stored directly into IndexedDB without creating an intermediate tar.gz file so that the save is faster and uses less memory.

#### Acceptance Criteria

1. WHEN the user triggers "save world in browser", THE Save_Manager SHALL store each asset directly into the Asset_Store without creating a TAR_Archive as an intermediate step
2. WHEN saving directly to IndexedDB, THE Save_Manager SHALL store the serialized Vishva.json and Scene.babylon alongside the assets in the Asset_Store
3. WHEN saving directly to IndexedDB, THE Save_Manager SHALL collect and fetch any new assets (embedded textures, blob textures, server assets) and store them individually in the Asset_Store
4. WHEN loading a world from IndexedDB, THE Load_Manager SHALL read assets directly from the Asset_Store without decompressing a tar.gz blob

## Known Issues

### Blob URL Leak in VishvaSerialized on Re-Save (Fixed in 0.4.0-alpha.42)

**Spec:** `.kiro/specs/0.4.0-alpha.42-blob-url-resave-fix/`

Requirement 8 (`resolveAssetPaths`) mutates VishvaSerialized in-place, replacing `"vishva/assets/..."` strings with blob URLs for runtime use. However, when the world is subsequently re-saved, the SNA serialization captures these blob URLs verbatim because the original path information was destroyed. This causes:
- Asset references in Vishva.json to contain invalid blob URLs on re-save
- Referenced asset binary data to be silently dropped from the saved archive/IndexedDB entries
- Actuators (e.g., Dialog with HTML files) to fail on subsequent loads

The fix (spec `0.4.0-alpha.42-blob-url-resave-fix`) adds a reverse mapping in AssetResolver to restore original paths at save time and ensures asset binary data is sourced from the session store or active blob URL rather than relying on the server.
