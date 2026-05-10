# Implementation Plan: Menu Bar Upload Button

## Overview

Add an "Upload" button to the main navigation bar that provides an alternative file/folder upload mechanism using the HTML `<input type="file">` API. The upload button feeds files directly into the existing `LoadManager.processDroppedFiles()` pipeline, guaranteeing identical behavior to drag-and-drop. A small dropdown menu offers "Upload File(s)" and "Upload Folder" options.

## Tasks

- [x] 1. Make `processDroppedFiles` public in LoadManager
  - [x] 1.1 Change `processDroppedFiles` visibility from `private` to `public` in `src/managers/LoadManager.ts`
    - Change the method signature from `private processDroppedFiles(files: File[])` to `public processDroppedFiles(files: File[])`
    - No logic changes needed — the method already accepts `File[]` and handles format filtering, error alerts, and loading
    - _Requirements: 4.1_

- [x] 2. Add Upload button markup to NavBar
  - [x] 2.1 Add the upload button HTML to `src/gui/NavBarML.ts`
    - Insert a `<button id="uploadAsset" title="upload file to scene"><span class="material-icons-outlined">upload_file</span></button>` element in the `navHTML` template
    - Position it after the `saveWorld` button (logical grouping: download → save → upload)
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Create UploadUI logic module
  - [x] 3.1 Create `src/gui/UploadUI.ts` with the `UploadUI` class
    - Create two hidden `<input type="file">` elements: one for file selection (with `multiple` and `accept` attributes for supported formats), one for folder selection (with `webkitdirectory` attribute)
    - Implement `handleUploadClick()` that shows a small dropdown menu with "Upload File(s)" and "Upload Folder" options (following the same pattern as the curated assets menu in NavBarML)
    - Implement `_onFilesSelected(files: FileList)` that converts `FileList` to `File[]` and calls `LoadManager.processDroppedFiles()`
    - Implement `_onFolderSelected(files: FileList)` that converts `FileList` to `File[]` and calls `LoadManager.processDroppedFiles()`
    - Handle the case where `FileList` is empty (user cancelled) by returning without action
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1_

  - [x] 3.2 Write property test: File format classification is a complete partition
    - **Property 1: File format classification is a complete partition**
    - For any collection of files with arbitrary names, each file is classified as either a model file or a dependency file, with no file unclassified and no file in both categories
    - Use fast-check to generate arbitrary filenames and verify the partition property against the model extensions list
    - **Validates: Requirements 2.2, 2.3, 3.2, 3.4**

  - [x] 3.3 Write property test: Supported format identification is correct and complete
    - **Property 2: Supported format identification is correct and complete**
    - For any filename, it is identified as a supported model file if and only if its lowercase extension is exactly one of: gltf, glb, obj, babylon, stl
    - Use fast-check to generate filenames with known and unknown extensions and verify bidirectional correctness
    - **Validates: Requirements 2.2, 2.3**

- [x] 4. Wire UploadUI into VishvaGUI
  - [x] 4.1 Integrate `UploadUI` in `src/gui/VishvaGUI.ts`
    - Import `UploadUI` and instantiate it in `_createNavMenu()`
    - Wire the `uploadAsset` button's `onclick` to call `uploadUI.handleUploadClick()`
    - Follow the same pattern as other NavBar button handlers (navAllAssets, navCAssets, etc.)
    - _Requirements: 1.1, 2.1_

- [x] 5. Checkpoint - Verify upload button integration
  - Ensure the project compiles without errors (`npm run build`)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Handle browser compatibility for folder upload
  - [x] 6.1 Add `webkitdirectory` support detection in `UploadUI`
    - Check if the browser supports the `webkitdirectory` attribute
    - If not supported, hide or disable the "Upload Folder" option in the dropdown menu
    - _Requirements: 3.1_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the upload button appears in the NavBar with correct icon and tooltip
  - Verify file selection triggers `processDroppedFiles` with the selected files
  - Verify folder selection triggers `processDroppedFiles` with the folder contents

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing `processDroppedFiles` method already handles format validation, error messages, dependency resolution via blob URLs, and asset positioning — no new loading logic is needed
- The `loadDroppedAsset` method is already `public`, only `processDroppedFiles` needs visibility change
- Property tests validate the file classification logic that determines which files are model files vs dependencies
- The dropdown menu pattern (file vs folder choice) follows the existing curated assets menu pattern in the codebase
