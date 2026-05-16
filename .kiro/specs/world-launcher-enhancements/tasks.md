# Implementation Plan: World Launcher Enhancements

## Overview

This plan implements three enhancements to the Vishva World Launcher: a navbar icon for quick access, a delete action for saved worlds, and an export-as-tar.gz action. The implementation builds on existing infrastructure (`NavBarML`, `WorldLauncher`, `AssetStore`, `TarUtils`) and follows the project's vanilla DOM + W3.CSS patterns. Tasks are ordered so that shared logic is built first, then UI wiring, then integration.

## Tasks

- [x] 1. Add World Launcher navbar button
  - [x] 1.1 Add World Launcher button markup to NavBarML.ts
    - Insert a new `<button id="worldLauncher" title="world launcher">` with `<span class="material-icons-outlined">public</span>` as the first child of `#navMenubar`, before the download world button
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Wire navbar button click handler in VishvaGUI.ts
    - In `_createNavMenu()`, add an `onclick` handler for `#worldLauncher` that checks `this._vishva.isDirty()` and shows a `confirm()` dialog if there are unsaved changes, then navigates to `window.location.pathname` (stripping all query params) to trigger a full page reload showing the World Launcher
    - _Requirements: 1.3, 1.4_

  - [ ]* 1.3 Write property test for navigation URL stripping (Property 1)
    - **Property 1: Navigation strips all query parameters**
    - **Validates: Requirements 1.3**
    - Generate random URL paths + query strings, assert the navigation target equals `window.location.pathname` with no query string or fragment

- [x] 2. Implement delete saved world logic
  - [x] 2.1 Add `deleteWorldFromStore` function in WorldLauncherLogic.ts
    - Create an exported async function that opens an `AssetStore`, calls `store.deleteSavedWorld(worldName)`, and closes the store in a `finally` block
    - _Requirements: 2.3_

  - [x] 2.2 Add delete button and `_deleteWorld` handler in WorldLauncher.ts
    - Refactor the browser storage panel world rows to use a flex container with: a clickable name span (loads world), an export button, and a delete button (red `delete` icon, `e.stopPropagation()` to prevent load)
    - Implement `_deleteWorld(worldName, row, listContainer)` that shows `confirm()` with the world name, calls `deleteWorldFromStore`, removes the row on success, shows empty state if no worlds remain, and shows inline error on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.3 Write property test for delete confirmation world name (Property 2)
    - **Property 2: Delete confirmation and API call use correct world name**
    - **Validates: Requirements 2.2, 2.3**
    - Generate random world name strings, mock confirm and AssetStore, assert the confirmation prompt contains the exact world name and `deleteSavedWorld` is called with that exact name

  - [ ]* 2.4 Write property test for list integrity after deletion (Property 3)
    - **Property 3: List integrity after deletion**
    - **Validates: Requirements 2.4, 2.7**
    - Generate random arrays of world names + index to delete, assert remaining list equals original minus deleted in same order, and empty state shown when list reaches zero

- [x] 3. Checkpoint - Ensure navbar and delete functionality work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement export saved world as tar.gz
  - [x] 4.1 Add `compressGzip` and `triggerDownload` utility functions in WorldLauncherLogic.ts
    - Implement `compressGzip(data: Uint8Array): Promise<Blob>` using the Compression Streams API with `CompressionStream("gzip")`
    - Implement `triggerDownload(blob: Blob, filename: string): void` that creates a temporary anchor element, sets `href` to an object URL, triggers click, then cleans up
    - _Requirements: 3.4, 3.5_

  - [x] 4.2 Add `exportWorldAsTarGz` function in WorldLauncherLogic.ts
    - Implement the full export pipeline: open AssetStore → `listSavedKeys(worldName)` → retrieve each asset via `getSavedAsset` → `createTarArchive(files)` → `compressGzip(tarData)` → `triggerDownload(blob, worldName + ".tar.gz")`
    - Throw descriptive errors at each step (no assets found, archive creation failed, compression failed)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.3 Add export button and `_exportWorld` handler in WorldLauncher.ts
    - Add the export button (download icon) to each world row in the browser storage panel (already part of the row refactor in 2.2, but wire the handler here)
    - Implement `_exportWorld(worldName, exportBtn, row)` that disables the button during export, calls `exportWorldAsTarGz`, shows inline error on failure, and re-enables the button in a `finally` block
    - _Requirements: 3.1, 3.6, 3.7, 3.8_

  - [ ]* 4.4 Write property test for export round-trip (Property 4)
    - **Property 4: Export archive round-trip preserves assets**
    - **Validates: Requirements 3.3, 3.4**
    - Generate random arrays of `{filename, data}` pairs, create tar archive, compress with gzip, decompress and extract, assert identical filenames and binary data

  - [ ]* 4.5 Write property test for download filename format (Property 5)
    - **Property 5: Export download filename format**
    - **Validates: Requirements 3.5**
    - Generate random world name strings, assert the triggered download filename equals `${worldName}.tar.gz`

- [x] 5. Implement inline error display and empty state
  - [x] 5.1 Add `_showInlineError` and `_showEmptyState` methods in WorldLauncher.ts
    - Implement `_showInlineError(message: string)` that displays a styled red error div in the browser storage panel content area
    - Implement `_showEmptyState()` that displays a message indicating no saved worlds are available
    - _Requirements: 2.5, 2.7, 3.6_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The design uses TypeScript throughout, matching the project's existing codebase
- The row refactoring in task 2.2 creates the flex container structure that both delete (2.2) and export (4.3) buttons use
- All UI follows existing vanilla DOM + W3.CSS patterns — no framework dependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "4.2", "5.1"] },
    { "id": 2, "tasks": ["2.2", "1.3"] },
    { "id": 3, "tasks": ["4.3", "2.3", "2.4"] },
    { "id": 4, "tasks": ["4.4", "4.5"] }
  ]
}
```
