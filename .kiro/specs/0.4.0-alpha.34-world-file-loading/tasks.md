# Implementation Plan: World File Loading

## Overview

This plan implements the ability to load Vishva world files (`.tar.gz` archives) from the user's local filesystem via the existing upload button or drag-and-drop onto the scene canvas. The implementation adds a pure file extension validator utility, extends `LoadManager` with local file loading and archive validation methods, modifies `UploadUI` and the drag-and-drop handler to route `.tar.gz` files to the world loading pipeline, and updates the upload button tooltip.

## Tasks

- [ ] 1. Create FileValidator utility module
  - [x] 1.1 Create `src/managers/FileValidator.ts` with `isTarGzFile` and `normalizeTarGzExtension` functions
    - `isTarGzFile(filename: string): boolean` — returns true iff filename ends with `.tar.gz` (case-insensitive)
    - `normalizeTarGzExtension(filename: string): string | null` — returns filename with lowercase `.tar.gz` extension, or null if not a tar.gz file
    - Must not match `.gz`-only or `.tar`-only filenames
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 1.2 Write property tests for FileValidator (`src/managers/FileValidator.property.test.ts`)
    - **Property 1: File extension detection is a biconditional**
    - **Validates: Requirements 1.2, 3.1, 5.1, 5.2, 5.3**
    - **Property 5: Extension normalization round-trip consistency**
    - **Validates: Requirements 5.4**

- [ ] 2. Add world archive validation to LoadManager
  - [x] 2.1 Implement `validateWorldArchive` method in `src/managers/LoadManager.ts`
    - Accepts a `Map<string, Uint8Array>` (extracted tar contents)
    - Returns `{ valid: true }` if map contains both `Vishva.json` and `Scene.babylon` keys
    - Returns `{ valid: false, error: string }` with descriptive message if either is missing
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.2 Write property tests for archive validation (`src/managers/WorldLoading.property.test.ts`)
    - **Property 2: Archive validation is a biconditional on required entries**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
    - **Property 3: Tar.gz round-trip preserves all files**
    - **Validates: Requirements 4.1, 4.2**
    - **Property 4: Corrupted data produces a decompression error**
    - **Validates: Requirements 3.6**

- [ ] 3. Implement `loadWorldFromFile` method in LoadManager
  - [x] 3.1 Add `loadWorldFromFile(file: File): Promise<void>` to `src/managers/LoadManager.ts`
    - Read the File as ArrayBuffer
    - Decompress gzip using existing `_decompressGzip` method
    - Extract TAR using existing `_extractTarArchive` method
    - Call `validateWorldArchive` — show error alert and return early if invalid
    - Build asset map from `assets/` entries
    - Activate `AssetResolver` with asset map
    - Call `loadVishvaPartFromObjects` with parsed Vishva.json and Scene.babylon
    - Show progress via `ProgressManager` at each stage (decompressing, extracting, validating, loading)
    - On any error: hide progress, show alert with error message, do not mutate scene
    - _Requirements: 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Modify UploadUI to route world files
  - [x] 5.1 Update `_onFilesSelected` in `src/gui/UploadUI.ts` to detect `.tar.gz` files
    - Import `isTarGzFile` from `FileValidator`
    - If the selected file(s) include a `.tar.gz` file, call `loadManager.loadWorldFromFile(file)` for the first `.tar.gz` file
    - If no `.tar.gz` file is found, fall through to existing `processDroppedFiles` behavior
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 5.2 Update `_onFolderSelected` in `src/gui/UploadUI.ts` with same routing logic
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 6. Modify drag-and-drop handler to route world files
  - [x] 6.1 Update `setupDragAndDrop` drop handler in `src/managers/LoadManager.ts`
    - Import `isTarGzFile` from `FileValidator`
    - In the drop event handler, check if any dropped file is a `.tar.gz` file
    - If yes, call `loadWorldFromFile` for the first `.tar.gz` file instead of `processDroppedFiles`
    - If no `.tar.gz` file, fall through to existing asset drop behavior
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 6.2 Add visual drag feedback for `.tar.gz` files in `setupDragAndDrop`
    - On `dragenter`: if dragged items include a `.tar.gz` file, add a CSS class (e.g., `world-drop-target`) to the canvas
    - On `dragleave`: remove the CSS class
    - On `drop`: remove the CSS class
    - Add minimal CSS for the visual indicator (e.g., border highlight or overlay tint)
    - _Requirements: 2.3_

- [ ] 7. Update NavBar tooltip
  - [x] 7.1 Change the upload button tooltip in `src/gui/NavBarML.ts`
    - Change `title="upload file to scene"` to `title="load assets or world"`
    - _Requirements: 1.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The project uses TypeScript with Vitest + fast-check for testing
- Run tests with: `npm test`
- The design reuses existing `_decompressGzip`, `_extractTarArchive`, and `loadVishvaPartFromObjects` methods from LoadManager
- `AssetResolver` activation/deactivation pattern is already established in the server-based world loading path
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
