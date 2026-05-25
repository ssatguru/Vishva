# Implementation Plan: IndexedDB Asset Storage

## Overview

Replace in-memory asset storage with IndexedDB-backed storage, introduce structured path preservation in tar archives, and enable direct IndexedDB save/load. Implementation proceeds bottom-up: new AssetStore module first, then modifications to AssetCollector (structured paths), TarUtils (long paths), PathRewriter, AssetResolver, and finally LoadManager/SaveManager integration.

## Tasks

- [x] 1. Create AssetStore module
  - [x] 1.1 Implement AssetStore class with session store operations
    - Create `src/managers/AssetStore.ts`
    - Implement `open()`, `put()`, `putBatch()`, `get()`, `listKeys()`, `clearSession()`
    - Implement static `isAvailable()` check
    - Use database name `VishvaAssetStore` with object store `session` (keyPath: `key`)
    - Handle `QuotaExceededError` during writes with user-facing error message
    - Log and continue on individual non-quota write failures
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.3, 9.1, 9.2_

  - [x] 1.2 Implement AssetStore saved-world store operations
    - Add `saveWorldAsset()`, `saveWorldBatch()`, `getSavedAsset()`, `listSavedKeys()`, `listSavedWorlds()`, `deleteSavedWorld()`
    - Use object store `saved` with keyPath `key` and index on `worldName`
    - Keys follow pattern `{worldName}/{assetPath}`
    - _Requirements: 6.2, 6.3, 10.1, 10.2_

  - [ ]* 1.3 Write property tests for AssetStore round-trip (Property 1)
    - **Property 1: AssetStore Round-Trip**
    - **Validates: Requirements 1.3, 6.2**

  - [ ]* 1.4 Write property tests for no asset loss during ingestion (Property 2)
    - **Property 2: No Asset Loss During Ingestion**
    - **Validates: Requirements 1.1**

  - [ ]* 1.5 Write property tests for session cleanup completeness (Property 3)
    - **Property 3: Session Cleanup Completeness**
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 1.6 Write property tests for asset key enumeration completeness (Property 12)
    - **Property 12: Asset Key Enumeration Completeness**
    - **Validates: Requirements 6.3**

  - [ ]* 1.7 Write property tests for saved world isolation (Property 13)
    - **Property 13: Saved World Isolation**
    - **Validates: Requirements 10.1, 10.2**

  - [ ]* 1.8 Write property tests for session-save independence (Property 14)
    - **Property 14: Session-Save Independence**
    - **Validates: Requirements 3.1, 10.1**

- [x] 2. Checkpoint - Ensure all AssetStore tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Modify AssetCollector for structured paths
  - [x] 3.1 Update AssetCollector to preserve full structured paths for server assets
    - Modify `_generateFilename` so server assets retain their full `vishva/assets/` prefix and directory structure instead of flattening to basename
    - Data URI assets go under `vishva/assets/data/<generated_name>`
    - Blob textures go under `vishva/assets/blob/<generated_name>`
    - Update `_generateEmbeddedFilename` and `_generateBlobFilename` accordingly
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.2 Write property tests for server asset structured path preservation (Property 5)
    - **Property 5: Server Asset Structured Path Preservation**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 3.3 Write property tests for data URI subdirectory placement (Property 6)
    - **Property 6: Data URI Subdirectory Placement**
    - **Validates: Requirements 4.3**

  - [ ]* 3.4 Write property tests for blob texture subdirectory placement (Property 7)
    - **Property 7: Blob Texture Subdirectory Placement**
    - **Validates: Requirements 4.4**

- [x] 4. Modify PathRewriter for structured paths
  - [x] 4.1 Update PathRewriter to use full structured archive paths
    - Change `rewrite()` to map `originalUrl` → full structured path (e.g., `vishva/assets/audio/footstep.ogg`) instead of `assets/<archiveFilename>`
    - _Requirements: 5.1_

  - [ ]* 4.2 Write property tests for path rewriting with structured paths (Property 8)
    - **Property 8: Path Rewriting with Structured Paths**
    - **Validates: Requirements 5.1**

- [x] 5. Extend TarUtils for long path support
  - [x] 5.1 Add UStar prefix field support to createTarArchive and extractTarArchive
    - In `createTarArchive`: when filename exceeds 100 bytes, split into prefix (bytes 345–499, up to 155 bytes) and name (bytes 0–99, up to 100 bytes)
    - In `extractTarArchive`: detect non-empty prefix field and concatenate `prefix + "/" + name` to reconstruct full path
    - Support paths up to 255 bytes total
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 5.2 Write property tests for TAR long path round-trip (Property 10)
    - **Property 10: TAR Long Path Round-Trip**
    - **Validates: Requirements 7.1, 7.2**

- [x] 6. Checkpoint - Ensure all collector, rewriter, and tar tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Modify AssetResolver to use AssetStore
  - [x] 7.1 Refactor AssetResolver to read from AssetStore instead of in-memory Map
    - Change `activate()` signature to accept `AssetStore` instead of `Map<string, Uint8Array>`
    - In `Tools.PreprocessUrl` override: read asset from `AssetStore.get(key)` using full structured path matching
    - In `Tools.LoadFile` override: read asset from `AssetStore.get(key)` using full structured path matching
    - Track created Blob URLs for revocation on `deactivate()`
    - Fall through to original BabylonJS behavior if asset not found in store
    - _Requirements: 2.1, 2.2, 3.2, 5.2_

  - [x] 7.2 Update resolveAssetPaths to use AssetStore with structured paths
    - Match `vishva/assets/`-prefixed strings using full structured path
    - Read asset from AssetStore and replace path with Blob URL
    - _Requirements: 8.1, 8.2_

  - [ ]* 7.3 Write property tests for Blob URL tracking invariant (Property 4)
    - **Property 4: Blob URL Tracking Invariant**
    - **Validates: Requirements 2.2, 3.2**

  - [ ]* 7.4 Write property tests for full-path matching disambiguation (Property 9)
    - **Property 9: Full-Path Matching Disambiguation**
    - **Validates: Requirements 5.2**

  - [ ]* 7.5 Write property tests for VishvaSerialized structured path resolution (Property 11)
    - **Property 11: VishvaSerialized Structured Path Resolution**
    - **Validates: Requirements 8.1, 8.2**

- [x] 8. Checkpoint - Ensure all AssetResolver tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Modify LoadManager for IndexedDB ingestion
  - [x] 9.1 Update loadZipWorld to store assets in AssetStore after extraction
    - After extracting tar archive, call `AssetStore.clearSession()` then `AssetStore.putBatch()` for all `vishva/assets/` entries
    - Release in-memory tar data and asset map after ingestion
    - Pass `AssetStore` reference to `AssetResolver.activate()` instead of in-memory map
    - Remove `this.vishva._loadedAssetMap` usage
    - _Requirements: 1.1, 1.2_

  - [x] 9.2 Update loadUploadedWorld to use AssetStore
    - Same pattern as loadZipWorld: store assets in AssetStore, activate resolver with store reference
    - _Requirements: 1.1, 1.2_

  - [x] 9.3 Implement direct IndexedDB load for saved worlds
    - Add method to load a saved world by reading assets from the `saved` store
    - Copy saved world assets into session store (or read directly)
    - Activate AssetResolver with AssetStore reference
    - _Requirements: 10.4_

- [x] 10. Modify SaveManager for IndexedDB-backed save
  - [x] 10.1 Update _getWorldZipBlob to read carried-forward assets from AssetStore
    - Replace `this.vishva._loadedAssetMap` reads with `AssetStore.listKeys()` and `AssetStore.get(key)`
    - Build tar archive files from AssetStore session data
    - Use structured paths (`vishva/assets/...`) as archive filenames
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 10.2 Implement direct IndexedDB save (saveWorldToIndexedDB rewrite)
    - Collect all referenced assets via AssetCollector
    - For each asset: check session store first, fetch from server if not present
    - Store all assets individually via `AssetStore.saveWorldBatch(worldName, entries)`
    - Store serialized Vishva.json and Scene.babylon alongside assets
    - Do NOT create intermediate tar.gz
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 11. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Wire everything together and update existing tests
  - [x] 12.1 Update existing property tests and unit tests for new structured path format
    - Update `AssetCollector.property.test.ts` expectations for `vishva/assets/` prefix
    - Update `PathRewriter.property.test.ts` expectations for full structured paths
    - Update `SaveManager.property.test.ts` for AssetStore integration
    - Update `TarRoundTrip.property.test.ts` for long path support
    - _Requirements: 4.1, 4.2, 5.1, 7.1_

  - [ ]* 12.2 Write unit tests for error handling scenarios
    - Test IndexedDB unavailability error message (Requirement 9.1)
    - Test quota exceeded error handling (Requirement 9.2)
    - Test memory release after ingestion (Requirement 1.2)
    - Test direct IDB save stores Vishva.json + Scene.babylon (Requirement 10.2)
    - _Requirements: 9.1, 9.2, 1.2, 10.2_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Use `fake-indexeddb` (already in devDependencies) for IDB mocking in tests
- Use `fast-check` (already in devDependencies) for property-based tests
- All property test files use `*.property.test.ts` naming convention
- The AssetStore property tests should go in `src/managers/AssetStore.property.test.ts`
- The updated AssetResolver property tests should go in `src/managers/AssetResolver.indexeddb.property.test.ts`
- The updated AssetCollector property tests should go in `src/managers/AssetCollector.structuredPaths.property.test.ts`
- The TAR long path tests should go in `src/managers/TarRoundTrip.longPaths.property.test.ts`
- The PathRewriter structured path tests should go in `src/managers/PathRewriter.structuredPaths.property.test.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["1.7", "1.8", "3.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "4.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "7.5"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 7, "tasks": ["10.1", "10.2"] },
    { "id": 8, "tasks": ["12.1", "12.2"] }
  ]
}
```
