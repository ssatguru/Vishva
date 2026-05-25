# Implementation Plan: World Launcher Chooser

## Overview

Add a launcher/chooser UI that appears when no `?world=` query parameter is provided and no `defaultWorld` config is set. The implementation creates pure logic functions in `WorldLauncherLogic.ts`, a DOM-based UI class in `WorldLauncher.ts`, modifies `index.ts` to branch between launcher and Vishva instantiation, and adds a static `index.json` file listing server worlds. Property-based tests validate the three correctness properties from the design.

## Tasks

- [x] 1. Create `WorldLauncherLogic.ts` with pure functions
  - [x] 1.1 Implement `shouldShowLauncher(worldParam, defaultWorld)` function
    - Create `src/gui/WorldLauncherLogic.ts`
    - Export a pure function that returns `true` iff `worldParam` is null AND `defaultWorld` is undefined or empty string
    - No DOM or side-effect dependencies
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Implement `buildWorldQueryString(worldName)` function
    - Export a pure function that returns `"?world=<encodedName>"` using `encodeURIComponent`
    - Handle any non-empty string input
    - _Requirements: 3.3, 4.3, 7.2_

  - [x] 1.3 Implement `processServerWorldList(filenames)` function
    - Export a pure function that filters to only `.tar.gz` entries (case-insensitive)
    - Return `Array<{ display: string; filename: string }>` sorted alphabetically by display name
    - Strip the `.tar.gz` extension for the `display` field
    - _Requirements: 3.2_

  - [x] 1.4 Implement `storeUploadedWorld(file)` async function
    - Export an async function that reads the file as ArrayBuffer, validates it as a `.tar.gz` world archive (reusing validation logic from `LoadManager.validateWorldFile`), stores in IndexedDB `VishvaWorlds`/`worlds` under `"__uploaded"` key, and returns `{ success: true }` or `{ success: false, error: string }`
    - Reuse the validate+store pattern from the `world-load-page-reload` feature
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 2. Checkpoint - Ensure logic functions compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Write property-based tests for correctness properties
  - [x]* 3.1 Write property test for launcher display decision (Property 1)
    - **Property 1: Launcher display decision is a complete partition**
    - Generate random strings for `worldParam` (string | null) and `defaultWorld` (string | undefined)
    - Verify `shouldShowLauncher` returns `true` iff `worldParam` is null AND `defaultWorld` is undefined or empty string
    - **Validates: Requirements 1.1, 1.2, 1.3, 6.2**

  - [x]* 3.2 Write property test for server world list processing (Property 2)
    - **Property 2: Server world list processing preserves all .tar.gz entries**
    - Generate random arrays of filenames (mix of `.tar.gz` and non-`.tar.gz`)
    - Verify output contains exactly the `.tar.gz` entries, sorted alphabetically by display name, with correct `filename` fields matching originals
    - **Validates: Requirements 3.2**

  - [x]* 3.3 Write property test for world query string round-trip (Property 3)
    - **Property 3: World query string construction produces valid reload URLs**
    - Generate random non-empty world name strings
    - Verify `buildWorldQueryString(name)` parsed back via `URLSearchParams` yields the original name
    - **Validates: Requirements 3.3, 4.3, 7.2**

- [x] 4. Create `WorldLauncher.ts` UI class
  - [x] 4.1 Implement the `WorldLauncher` class with overlay DOM structure
    - Create `src/gui/WorldLauncher.ts`
    - Constructor creates a full-page overlay `div` with dark background covering the canvas area
    - Add a title element identifying the application
    - Add three chooser panel buttons: "Load from Server", "Load from Browser Storage", "Upload a File"
    - Add an "Empty World" button
    - Use W3.CSS classes for styling (`w3-modal`, `w3-card`, `w3-button`, `w3-container`, etc.)
    - Append overlay to `document.body`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.3, 7.1_

  - [x] 4.2 Implement "Load from Server" panel behavior
    - When user clicks the server panel, fetch `vishva/worlds/index.json`
    - Show a loading indicator while fetching
    - On success, call `processServerWorldList` and display each world as a clickable item
    - On click, call `buildWorldQueryString` and set `window.location.search`
    - On fetch failure, display an inline error message in the panel
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.3 Implement "Load from Browser Storage" panel behavior
    - When user clicks the browser storage panel, open IndexedDB `VishvaWorlds` database and query all entries from `worlds` store
    - Display each world name as a clickable item
    - On click, call `buildWorldQueryString` and set `window.location.search`
    - If no entries found, display "No saved worlds found" message
    - If IndexedDB access fails, display "Browser storage is unavailable" error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.4 Implement "Upload a File" panel behavior
    - When user clicks the upload panel, show a file input accepting `.tar.gz` files
    - On file selection, call `storeUploadedWorld(file)` from `WorldLauncherLogic`
    - On success, set `window.location.search` to `"?world=__uploaded"`
    - On failure, display the error message inline without reloading
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.5 Implement "Empty World" button behavior
    - On click, set `window.location.search` to `buildWorldQueryString("empty")`
    - _Requirements: 7.1, 7.2_

  - [x] 4.6 Add `dispose()` method
    - Remove the overlay element from the DOM
    - _Requirements: 6.1_

- [x] 5. Modify `index.ts` to integrate the launcher
  - [x] 5.1 Add launcher branch in `main()` function
    - Import `shouldShowLauncher` from `WorldLauncherLogic` and `WorldLauncher` from `WorldLauncher`
    - After checking `search.getParm("world")` and `defaultWorld`, if no world is determined, call `shouldShowLauncher` and if true, instantiate `new WorldLauncher()` and `return` (do not instantiate Vishva)
    - Existing paths for `?world=` present or `defaultWorld` set remain unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Create `vishva/worlds/index.json` static file
  - [x] 6.1 Create the server world index file
    - Create `vishva/worlds/index.json` with an array of available world filenames
    - Include existing worlds from the `vishva/worlds/` directory
    - _Requirements: 3.1, 3.2_

- [x] 7. Checkpoint - Ensure full integration works and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write unit tests for WorldLauncher UI
  - [x] 8.1 Write unit tests for DOM structure and panel behaviors
    - Test that launcher creates overlay with correct structure (title, three panels, empty world button)
    - Test that server panel shows loading indicator during fetch
    - Test that server panel shows error on fetch failure
    - Test that browser panel shows "no saved worlds" when IndexedDB is empty
    - Test that browser panel shows error when IndexedDB is unavailable
    - Test that upload panel shows error for invalid file without reloading
    - Test that empty world button triggers reload with `?world=empty`
    - _Requirements: 2.1, 2.2, 2.3, 3.4, 3.5, 4.4, 4.5, 5.4, 7.1, 7.2_

  - [x] 8.2 Write unit tests for `storeUploadedWorld`
    - Test that valid `.tar.gz` file is stored in IndexedDB and returns success
    - Test that invalid file returns `{ success: false, error: "..." }` without storing
    - Test that IndexedDB write failure returns appropriate error
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The launcher is completely decoupled from Vishva — it runs before Vishva is instantiated
- All test files follow the project convention: `src/gui/WorldLauncher.property.test.ts` and `src/gui/WorldLauncher.test.ts`
- The existing `VishvaWorlds` IndexedDB database and `worlds` object store are reused — no schema migration needed
- W3.CSS classes are used for styling consistent with the existing editor UI
