# Implementation Plan: World Load Page Reload

## Overview

Replace the current in-place world loading in `LoadManager.loadWorldFromFile` with a page-reload strategy. The implementation adds IndexedDB helper methods, a pre-reload validation+store+reload flow, a post-reload retrieval+load flow, and modifies the Vishva constructor to route `__uploaded` to the new path. Property-based tests validate correctness properties from the design.

## Tasks

- [x] 1. Add IndexedDB helper methods to LoadManager
  - [x] 1.1 Implement `_storeInIndexedDB(key, data)` private method
    - Open the existing `VishvaWorlds` database with `worlds` object store (keyPath: `"name"`)
    - Store an object `{ name: key, data: data, timestamp: Date.now() }` using a put transaction
    - Return a Promise that resolves on success or rejects on error
    - _Requirements: 1.3, 1.5_

  - [x] 1.2 Implement `_getFromIndexedDB(key)` private method
    - Open the `VishvaWorlds` database and retrieve the entry by key from the `worlds` store
    - Return the `data` field (ArrayBuffer) if found, or `null` if not found
    - _Requirements: 3.1, 3.3_

  - [x] 1.3 Implement `_deleteFromIndexedDB(key)` private method
    - Open the `VishvaWorlds` database and delete the entry by key from the `worlds` store
    - Return a Promise that resolves on success (no-op if key doesn't exist)
    - _Requirements: 4.1, 4.2_

  - [ ]* 1.4 Write unit tests for IndexedDB helper methods
    - Use `fake-indexeddb` to test store, get, and delete operations
    - Test that `_getFromIndexedDB` returns null for missing keys
    - Test that `_deleteFromIndexedDB` succeeds even if key doesn't exist
    - _Requirements: 1.3, 1.5, 3.1, 3.3, 4.1, 4.2_

- [x] 2. Implement `validateWorldFile` method and refactor `loadWorldFromFile` for pre-reload flow
  - [x] 2.1 Add public `validateWorldFile(data: ArrayBuffer)` method
    - Decompress the gzip data using `_decompressGzip`
    - Extract tar headers using `_extractTarArchive`
    - Call `validateWorldArchive` on the extracted file map
    - Return `{ valid: true }` or `{ valid: false, error: string }`
    - Catch decompression/extraction errors and return `{ valid: false, error }` with descriptive message
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Rewrite `loadWorldFromFile(file: File)` to use page-reload strategy
    - Show progress via `ProgressManager.show("Preparing world for reload...")`
    - Read file as ArrayBuffer
    - Call `validateWorldFile(arrayBuffer)` — if invalid, show error alert and return
    - Call `_storeInIndexedDB("__uploaded", arrayBuffer)` — if fails, show error alert and return
    - Trigger page reload: `window.location.search = "?world=__uploaded"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1_

  - [ ]* 2.3 Write property test for archive validation correctness (Property 1)
    - **Property 1: Archive validation correctness**
    - Generate random `Map<string, Uint8Array>` with varying key sets
    - Verify `validateWorldArchive` returns `{ valid: true }` iff both `Vishva.json` and `Scene.babylon` keys are present
    - **Validates: Requirements 1.1, 3.4**

  - [x] 2.4 Write unit tests for `validateWorldFile` and the new `loadWorldFromFile` flow
    - Test that invalid archives (missing entries) produce error without storing or reloading
    - Test that valid archives trigger IndexedDB store and page reload
    - Test that IndexedDB write failure shows error and does not reload
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement `loadUploadedWorld` method for post-reload loading
  - [x] 3.1 Add public `loadUploadedWorld()` method to LoadManager
    - Show progress via `ProgressManager.show("Loading World")`
    - Call `_getFromIndexedDB("__uploaded")` to retrieve stored data
    - If null: fall back to empty world (`this.vishva.loadBabylonjsPart(this.vishva.scene, true)`), display warning, clean up URL
    - If found: decompress gzip → extract tar → validate archive → resolve assets → call `loadVishvaPartFromObjects`
    - Use a `finally` block to always: delete IndexedDB entry via `_deleteFromIndexedDB("__uploaded")` and clean URL via `history.replaceState({}, "", window.location.pathname)`
    - Handle errors (decompression failure, validation failure, parse errors) by falling back to empty world with error alert
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 6.2_

  - [x] 3.2 Write unit tests for `loadUploadedWorld`
    - Test successful load path: retrieves, decompresses, loads, cleans up
    - Test missing data path: falls back to empty world, shows warning, cleans URL
    - Test corrupted data path: falls back to empty world, shows error, cleans up
    - Test that IndexedDB entry is always deleted (success and failure)
    - Test that URL parameter is always cleaned
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modify Vishva constructor to route `__uploaded` to `loadUploadedWorld`
  - [x] 5.1 Add `__uploaded` branch in Vishva constructor
    - In `src/Vishva.ts`, change the existing `if/else` block to add an `else if (sceneFile == "__uploaded")` branch
    - This branch calls `this.loadManager.loadUploadedWorld()`
    - Existing `"empty"` and server-load paths remain unchanged
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 5.2 Write property test for scene file routing partition (Property 2)
    - **Property 2: Scene file routing is a complete partition**
    - Generate random strings including `"empty"`, `"__uploaded"`, and arbitrary values
    - Verify that each string maps to exactly one of three routing outcomes
    - Extract routing logic into a pure testable function if needed
    - **Validates: Requirements 2.2, 2.3**

- [ ] 6. Write remaining property-based tests
  - [ ]* 6.1 Write property test for tar archive round-trip (Property 3)
    - **Property 3: Tar archive round-trip preserves file contents**
    - Generate random sets of `{ filename, data }` pairs
    - Verify `extractTarArchive(await createTarArchive(files))` produces a map with all original filenames and byte-identical data
    - **Validates: Requirements 3.2**

  - [ ]* 6.2 Write property test for file type classification (Property 4)
    - **Property 4: File type classification partitions world files from asset files**
    - Generate random filename strings with various extensions
    - Verify `isTarGzFile` returns `true` iff filename ends with `.tar.gz` (case-insensitive)
    - **Validates: Requirements 5.1, 5.3**

- [x] 7. Verify asset drag-and-drop is unaffected
  - [x] 7.1 Confirm drag-and-drop routing for non-world files is unchanged
    - Verify that `setupDragAndDrop` still routes non-`.tar.gz` files to `loadDroppedAsset`
    - Verify that `.tar.gz` files dropped on canvas now go through the new `loadWorldFromFile` (page-reload flow)
    - No code changes expected — just verify the existing routing works with the new `loadWorldFromFile` internals
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 7.2 Write integration test for drag-and-drop routing
    - Test that `.tar.gz` triggers page-reload flow
    - Test that `.glb`, `.gltf`, `.obj`, `.babylon` files continue to use `loadDroppedAsset`
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `VishvaWorlds` IndexedDB database and `worlds` object store are reused — no schema migration needed
- All test files should be placed in `src/managers/` following the `*.property.test.ts` and `*.test.ts` naming conventions
