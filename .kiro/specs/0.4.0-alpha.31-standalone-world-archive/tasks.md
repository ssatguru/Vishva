# Implementation Plan: Standalone World Archive

## Overview

This plan implements self-contained world archives by adding asset collection, path rewriting, and asset resolution to the existing save/load pipeline. New components (AssetCollector, PathRewriter, AssetResolver) are created in `src/managers/`, then integrated into SaveManager and LoadManager. A test framework (vitest + fast-check) is set up to validate correctness properties.

## Tasks

- [x] 1. Set up test framework (vitest + fast-check)
  - [x] 1.1 Install vitest and fast-check as dev dependencies
    - Add `vitest`, `fast-check`, and `@types/node` to devDependencies
    - Add a `"test"` script to package.json (`vitest --run`)
    - Create `vitest.config.ts` at project root with TypeScript support
    - _Requirements: Testing Strategy (Design)_

- [x] 2. Implement AssetCollector
  - [x] 2.1 Create `src/managers/AssetCollector.ts` with core scanning logic
    - Define `AssetEntry` interface (originalUrl, fetchUrl, archiveFilename, decodedData?)
    - Implement `collect(sceneObj: object, baseUrl: string): AssetEntry[]`
    - Scan `textures[].name`, `textures[].url`, `materials[].*.name` (nested texture refs), `particleSystems[].textureName`, `meshes[].delayLoadingFile`, `environmentTexture`, `reflectionTexture.name`
    - Resolve relative URLs to absolute fetch URLs using baseUrl
    - Detect and decode base64 data URIs to binary Uint8Array
    - Deduplicate entries by originalUrl
    - Generate flattened archive filenames with disambiguation (numeric suffix for collisions)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write property test: Asset Collection Completeness (Property 1)
    - **Property 1: Asset Collection Completeness**
    - Generate random scene JSON objects with texture/material/particle URL references
    - Verify every unique URL in the JSON appears in the collected entries
    - **Validates: Requirements 1.1**

  - [x] 2.3 Write property test: URL Resolution Correctness (Property 2)
    - **Property 2: URL Resolution Correctness**
    - Generate random relative paths and base URLs
    - Verify resolved URL matches standard URL resolution (`new URL(rel, base).href`)
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test: Data URI Decode Round-Trip (Property 3)
    - **Property 3: Data URI Decode Round-Trip**
    - Generate random binary data, encode as base64 data URI, pass through decode logic
    - Verify output is byte-for-byte identical to original
    - **Validates: Requirements 1.3**

  - [x] 2.5 Write property test: Asset Entry Deduplication (Property 4)
    - **Property 4: Asset Entry Deduplication**
    - Generate scene JSON with duplicate URLs (same URL in multiple places)
    - Verify collected entries contain each unique URL exactly once
    - **Validates: Requirements 1.4**

  - [x] 2.6 Write property test: Filename Disambiguation Uniqueness (Property 6)
    - **Property 6: Filename Disambiguation Uniqueness**
    - Generate sets of URLs that share the same basename
    - Verify all generated archiveFilenames are unique
    - **Validates: Requirements 3.3**

- [x] 3. Implement PathRewriter
  - [x] 3.1 Create `src/managers/PathRewriter.ts`
    - Implement `rewrite(sceneObj: object, assetEntries: AssetEntry[]): void`
    - Build map from originalUrl → `assets/<archiveFilename>`
    - Deep-traverse the scene JSON object, replacing any string value matching an original URL with the archive-relative path
    - Handle data URI replacement (replace full data URI strings with archive paths)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Write property test: Path Rewriting Completeness (Property 5)
    - **Property 5: Path Rewriting Completeness**
    - Generate scene JSON with known asset URLs, run PathRewriter
    - Verify no original URL or data URI remains in the output JSON
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement AssetResolver
  - [x] 5.1 Create `src/managers/AssetResolver.ts`
    - Implement `activate(assets: Map<string, Uint8Array>): void` — override BabylonJS `Tools.LoadFile` to intercept requests matching archive assets, serve via Blob URLs
    - Implement `deactivate(): void` — revoke all Blob URLs, restore original `Tools.LoadFile`
    - Track created Blob URLs for cleanup
    - Match requests by extracting filename from URL and checking against `assets/<filename>` in the map
    - Fall through to original load behavior for non-matching requests
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Write property test: Asset Resolver Request Routing (Property 8)
    - **Property 8: Asset Resolver Request Routing**
    - Generate asset maps and request filenames
    - Verify interception occurs if and only if filename exists in the asset map
    - **Validates: Requirements 5.2, 5.4**

- [x] 6. Integrate AssetCollector and PathRewriter into SaveManager
  - [x] 6.1 Add asset fetching logic to SaveManager
    - Implement `fetchAssets(entries: AssetEntry[], onProgress?)` method in SaveManager
    - Fetch binary data for each AssetEntry that doesn't have decodedData
    - Handle fetch failures gracefully (log warning, skip asset, continue)
    - Report progress via ProgressManager (X/Y assets fetched)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 6.2 Modify `_getWorldZipBlob()` to collect, rewrite, and bundle assets
    - After `SceneSerializer.Serialize()`, call `AssetCollector.collect(sceneObj, baseUrl)`
    - Call `PathRewriter.rewrite(sceneObj, assetEntries)`
    - Call `fetchAssets(assetEntries)` to get binary data
    - Include asset files in the TAR archive under `assets/` prefix
    - Update progress messages to reflect new stages (collecting, fetching, rewriting)
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 4.1, 4.2, 4.3_

- [x] 7. Integrate AssetResolver into LoadManager
  - [x] 7.1 Modify `loadZipWorld()` to detect and serve bundled assets
    - After extracting TAR archive, check if any entry starts with `assets/`
    - If assets present: build asset map, activate AssetResolver before SceneLoader.Append
    - In the scene loaded callback: call AssetResolver.deactivate() to revoke Blob URLs
    - If no assets: use existing behavior (backward compatibility)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [x] 7.2 Modify `_loadWorldFromIndexedDB()` to detect and serve bundled assets
    - Same asset detection and resolver activation logic as loadZipWorld
    - Ensure AssetResolver is deactivated after scene load
    - _Requirements: 7.1, 7.2_

  - [x] 7.3 Write property test: Asset Presence Detection (Property 9)
    - **Property 9: Asset Presence Detection**
    - Generate sets of TAR entry names (some with `assets/` prefix, some without)
    - Verify detection returns true iff at least one entry starts with `assets/`
    - **Validates: Requirements 6.2**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. TAR archive round-trip validation
  - [x] 9.1 Write property test: TAR Binary Data Round-Trip (Property 7)
    - **Property 7: TAR Binary Data Round-Trip**
    - Generate random sets of filename/binary-data pairs
    - Create TAR archive via `_createTarArchive`, extract via `_extractTarArchive`
    - Verify extracted data is byte-for-byte identical to input for each entry
    - **Validates: Requirements 4.3**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all new files use `.ts` extension
- New components are pure logic (no DOM/BabylonJS runtime dependency) making them testable in isolation
