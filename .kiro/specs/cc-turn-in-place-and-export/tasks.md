# Implementation Plan: CC Turn In Place and Export

## Overview

Add three features to the Character Controller dialog: a "turnInPlace" checkbox in the Settings form (CCML.ts), an "Apply" button that saves without closing the dialog, and an "Export" button that downloads CC configuration as JSON following the MeshCCSerialized serialization pattern. All changes are confined to CCML.ts and CCUI.ts.

## Tasks

- [x] 1. Add turnInPlace checkbox to Settings form
  - [x] 1.1 Add turnInPlace HTML to CCML.ts settingFormHtml
    - Insert `<label>turn in place</label>` and `<input name="turnInPlace" type="checkbox"/>` immediately after the "turning speed" row in settingFormHtml
    - _Requirements: 1.1_

  - [x] 1.2 Wire turnInPlace read/write in CCUI.ts
    - In `_updateUISet()`: add `form.turnInPlace.checked = this._cc.isTurnInPlace();`
    - In `_saveCCSet()`: add `this._cc.setTurnInPlace(form["turnInPlace"].checked);`
    - _Requirements: 1.2, 1.3_

  - [x] 1.3 Write property test for turnInPlace UI round-trip
    - **Property 1: Turn In Place UI reflects CC state**
    - **Property 2: Turn In Place save round-trip**
    - **Validates: Requirements 1.2, 1.3**

- [x] 2. Add Apply and Export buttons with correct button order
  - [x] 2.1 Refactor button creation in CCUI.ts constructor
    - Replace existing Save/Cancel button creation with four buttons in order: Apply, Save, Export, Cancel
    - Create all buttons via `VButton.create()` with `style.margin = "1em"`
    - Append to `this.ccElement` in order: dboApply, dboSave, dboExport, dboCancel
    - _Requirements: 4.1, 4.2_

  - [x] 2.2 Implement Apply button click handler
    - `dboApply.onclick`: call `this._saveCC()` then `this._updateUI()`, return true
    - Must NOT call `this._ccDiag.dispose()` — dialog stays open
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 Implement Export button click handler
    - `dboExport.onclick`: call `this._exportCC()`, return true
    - _Requirements: 3.1_

  - [x] 2.4 Keep Save and Cancel handlers unchanged
    - Save handler: `_saveCC()` + callback + dispose (existing behavior, just re-placed in new order)
    - Cancel handler: callback + dispose (existing behavior)
    - _Requirements: 4.1_

- [x] 3. Checkpoint - Verify turnInPlace and button order
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement _exportCC() private method
  - [x] 4.1 Add _exportCC() method to CCUI.ts
    - Get settings via `this._cc.getSettings()`
    - Serialize `settings.sound` as `settings.sound.name` (filename string only) when sound exists
    - Get actionMap via `this._cc.getActionMap()`
    - Replace AG instances with `.name` string for each ActionData entry
    - Set `ad.sound = null` for each ActionData entry
    - Build export object `{ settings, actionMap }`
    - Stringify with 2-space indent, create Blob, trigger download as "cc-settings.json"
    - Clean up: remove anchor element, revoke object URL
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Write property test for export serialization
    - **Property 3: Export produces valid structure with correct serialization**
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.6**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are confined to `src/gui/CCML.ts` and `src/gui/CCUI.ts`
- The export follows the existing MeshCCSerialized pattern: AG → .name string, Sound → sound.name filename string
- No new classes or modules are introduced
- Property tests validate universal correctness properties from the design document
- The implementation language is TypeScript (matching the existing codebase)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["1.3", "4.1"] },
    { "id": 3, "tasks": ["4.2"] }
  ]
}
```
