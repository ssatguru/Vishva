# Implementation Plan: Save World Name Prompt

## Overview

This plan implements a modal prompt dialog that appears when the user clicks the "save world to browser" button. The prompt pre-fills the current world name, allows editing, normalizes the `.tar.gz` extension, validates against empty input, and only proceeds with saving if the user confirms a valid name. The implementation follows the project's `*UI.ts` / logic-module convention and leverages the existing `VDiag` modal dialog component.

## Tasks

- [x] 1. Create the pure logic module (`SavePromptLogic.ts`)
  - [x] 1.1 Create `src/gui/SavePromptLogic.ts` with three exported functions
    - Implement `normalizeWorldName(name: string): string` — appends `.tar.gz` if not already present (case-insensitive check)
    - Implement `isValidWorldName(name: string): boolean` — returns `false` for empty or whitespace-only strings
    - Implement `getDefaultWorldName(currentName: string | undefined | null): string` — returns `"empty"` for falsy/empty values, otherwise returns the input
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 1.2, 1.3_

  - [ ]* 1.2 Write property tests for `normalizeWorldName` (Property 1: Extension normalization is idempotent)
    - **Property 1: Extension normalization is idempotent**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Create `src/gui/SavePromptLogic.property.test.ts`
    - Use `fc.string()` to generate arbitrary names
    - Assert `normalizeWorldName(normalizeWorldName(s)) === normalizeWorldName(s)`
    - Assert result always ends with `.tar.gz`

  - [ ]* 1.3 Write property tests for `isValidWorldName` (Property 2: Whitespace-only names are always rejected)
    - **Property 2: Whitespace-only names are always rejected**
    - **Validates: Requirements 6.1**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` to generate whitespace-only strings
    - Assert `isValidWorldName(whitespaceString)` returns `false`

  - [ ]* 1.4 Write property tests for `getDefaultWorldName` (Property 4: Pre-fill reflects current world name)
    - **Property 4: Pre-fill reflects current world name**
    - **Validates: Requirements 1.2, 1.3**
    - Use `fc.option(fc.string())` to generate nullable/undefined/string values
    - Assert non-empty strings return themselves; empty/null/undefined return `"empty"`

  - [ ]* 1.5 Write unit tests for `SavePromptLogic` functions
    - Create `src/gui/SavePromptLogic.test.ts`
    - Test `normalizeWorldName("myworld")` → `"myworld.tar.gz"`
    - Test `normalizeWorldName("myworld.tar.gz")` → `"myworld.tar.gz"`
    - Test `normalizeWorldName("myworld.TAR.GZ")` → `"myworld.TAR.GZ"` (preserved as-is)
    - Test `normalizeWorldName("myworld.tar.GZ")` → `"myworld.tar.GZ"` (mixed case preserved)
    - Test `isValidWorldName("")` → `false`
    - Test `isValidWorldName("   ")` → `false`
    - Test `isValidWorldName("hello")` → `true`
    - Test `getDefaultWorldName(undefined)` → `"empty"`
    - Test `getDefaultWorldName("")` → `"empty"`
    - Test `getDefaultWorldName("myworld")` → `"myworld"`
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 1.2, 1.3_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create the Save Prompt UI (`SavePromptUI.ts`)
  - [x] 3.1 Create `src/gui/SavePromptUI.ts` with the `SavePromptUI` class
    - Import `VDiag`, `VButton`, `Vishva`, `DialogMgr`, and the logic functions from `SavePromptLogic`
    - Create a `VDiag` modal dialog with a text input field and Save/Cancel buttons
    - Implement `show(currentWorldName: string)` method that pre-fills the input using `getDefaultWorldName`
    - Implement `hide()` method that closes the dialog without side effects
    - On Save button click: validate with `isValidWorldName`, show inline error if invalid (dialog stays open), normalize with `normalizeWorldName`, call `SaveManager.saveWorldToIndexedDB(normalizedName)`, update `Vishva.worldName` on success
    - On Cancel button click or dialog close: call `hide()`, no save occurs
    - Clear validation error message when user modifies the input text
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 6.1, 6.2_

- [x] 4. Modify `SaveManager.saveWorldToIndexedDB()` to accept an optional world name parameter
  - [x] 4.1 Update `src/managers/SaveManager.ts` method signature
    - Change `saveWorldToIndexedDB()` to `saveWorldToIndexedDB(worldName?: string)`
    - Use the provided `worldName` parameter if given, otherwise fall back to `this.vishva.constructor.worldName || "world"` (preserving existing behavior)
    - _Requirements: 2.2, 5.1_

- [x] 5. Wire the Save Prompt into the navbar button handler
  - [x] 5.1 Update `src/gui/VishvaGUI.ts` to use `SavePromptUI`
    - Import `SavePromptUI`
    - Add a `_savePromptUI: SavePromptUI` private field
    - Replace the `saveWorld.onclick` handler: instead of directly calling `saveManager.saveWorldToIndexedDB()`, instantiate `SavePromptUI` (lazily) and call `show(Vishva.worldName)`
    - _Requirements: 1.1, 2.2, 4.1, 4.2, 5.1_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Write property test for successful save updating world name (Property 5)
  - [ ]* 7.1 Write property test for save-updates-world-name behavior
    - **Property 5: Successful save updates world name to normalized value**
    - **Validates: Requirements 2.2, 5.1**
    - Add to `src/gui/SavePromptLogic.property.test.ts`
    - Use `fc.string()` filtered to non-whitespace strings
    - Assert that for any valid name, after normalization the result equals `normalizeWorldName(inputValue)`
    - This validates the composition: `normalizeWorldName` applied to a valid input always produces a `.tar.gz`-suffixed string

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The pure logic module (`SavePromptLogic.ts`) is separated from the UI class for testability
- The `SavePromptUI` follows the project's `*UI.ts` convention for logic/event handling
