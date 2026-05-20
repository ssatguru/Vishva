# Implementation Plan: Bone Selector Tree Dialog

## Overview

Replace the "show all bone markers" behavior with a VTreeDialog-based bone selector. The implementation modifies AnimationML (remove "hide bone selector" button), AnimationUI (add dialog management, bone tree building, marker lifecycle, mesh selection lock), and adds an `onClose` method to VTreeDialog for cleanup registration. While the dialog is open, mesh selection is locked via `Vishva.switchDisabled` to prevent accidental mesh switching or deselection. Property-based tests validate tree structure correctness and single-marker invariant.

## Tasks

- [x] 1. Remove "hide bone selector" button and add onClose support to VTreeDialog
  - [x] 1.1 Remove the "hide bone selector" button from AnimationML.ts
    - Delete the `<button id="animDBS">hide bone selector</button>` element from the `animHTML` template string
    - _Requirements: 6.1, 6.2_

  - [x] 1.2 Add `onClose` method to VTreeDialog
    - Add a public `onClose(f: () => void)` method that delegates to `this._treeDiag.onHide(f)`
    - This allows AnimationUI to register cleanup logic when the bone selector dialog is closed
    - _Requirements: 5.1_

- [x] 2. Implement bone tree building logic in AnimationUI
  - [x] 2.1 Add private fields and imports to AnimationUI
    - Add imports for `VTreeDialog`, `MeshBuilder`, `StandardMaterial`, `Color3`, `Mesh`, `Bone` from babylonjs
    - Add private fields: `_boneSelectorDialog: VTreeDialog | null`, `_boneMarker: Mesh | null`, `_selectedBoneIndex: number`
    - _Requirements: 1.1, 3.1_

  - [x] 2.2 Implement `_buildBoneTreeData` method
    - Find root bones (bones with no parent or parent index === -1)
    - Recursively build tree nodes: bones with children become `{ d: boneName, f: [...childNodes] }`, leaf bones become plain strings
    - Return array of root-level nodes preserving sibling order from `bone.children`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 2.3 Write property test: Tree structure preserves skeleton hierarchy
    - **Property 1: Tree structure preserves skeleton hierarchy**
    - Generate arbitrary skeleton structures (random depth, branching, bone names) using fast-check
    - Mock Skeleton and Bone objects with generated hierarchy
    - Assert: every bone appears exactly once, root bones at top level, children nested under parents in correct order
    - **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 3. Implement bone marker creation and movement
  - [x] 3.1 Implement `_onBoneSelected` callback method
    - Look up the bone by name in `this._skel.bones`
    - If same bone already selected (`_selectedBoneIndex` matches), return early (no-op)
    - If `_boneMarker` is null, create a new sphere (diameter 0.05, emissive green, `disableLighting=true`, `isPickable=false`) and attach to bone via `attachToBone(bone, skelMesh)`
    - If `_boneMarker` exists, call `detachFromBone()` then `attachToBone(newBone, skelMesh)`
    - Update `_selectedBoneIndex` to the new bone's index
    - Wrap `attachToBone` in try-catch for safety
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Implement `_disposeBoneMarker` method
    - If `_boneMarker` is null, return (no-op)
    - Call `detachFromBone()`, dispose material, dispose mesh
    - Set `_boneMarker = null` and `_selectedBoneIndex = -1`
    - _Requirements: 5.1, 5.2_

  - [x]* 3.3 Write property test: Single-marker invariant
    - **Property 2: Bone selection state machine maintains single-marker invariant**
    - Generate random skeleton and random sequence of bone selection indices
    - Simulate selection state machine (create, move, same-bone no-op)
    - After each selection, assert: exactly one marker reference, attached to correct bone
    - **Validates: Requirements 3.3, 4.1, 4.2, 4.4**

- [x] 4. Implement dialog toggle, mesh selection lock, and cleanup lifecycle
  - [x] 4.1 Implement `_toggleBoneSelectorDialog` method
    - If dialog exists and is open, close it and return (toggle off)
    - If dialog is null, create a new `VTreeDialog` with bone tree data, title "Bone Selector", non-modal, collapsed state (`openAll=false`)
    - Register `_onBoneSelected` as tree listener via `addTreeListener`
    - Register cleanup handler via `onClose` that calls `_disposeBoneMarker()` and `_unlockMeshSelection()`
    - Call `_lockMeshSelection()` after opening the dialog
    - Open the dialog
    - _Requirements: 1.1, 1.2, 1.4, 2.6, 5.1, 5.4, 6.3, 7.1, 7.2, 7.3_

  - [x] 4.2 Implement `_lockMeshSelection` and `_unlockMeshSelection` methods
    - `_lockMeshSelection()`: set `this._vishva.switchDisabled = true` to prevent selection of other meshes and deselection of the current mesh while the dialog is open
    - `_unlockMeshSelection()`: set `this._vishva.switchDisabled = false` to restore normal mesh selection behavior when the dialog closes
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.3 Wire the "show bone selector" button to `_toggleBoneSelectorDialog`
    - Replace the existing `animSBS.onclick` handler (which calls `_vishva._addBoneSelectors`) with a call to `this._toggleBoneSelectorDialog()`
    - Remove the `animDBS` element reference and its onclick handler
    - _Requirements: 1.1, 6.1, 6.2, 6.3_

  - [x] 4.4 Add cleanup on mesh deselection in `update()` method
    - At the start of `update()`, call `_disposeBoneMarker()` and close the dialog if open
    - This ensures marker, dialog, and mesh selection lock are cleaned up when a different mesh is selected
    - _Requirements: 5.3, 7.3_

  - [x] 4.5 Hide "show bone selector" button when no skeleton
    - The button is inside `.skelFound` which is already hidden when `_skel` is null — verify this covers requirement 1.3
    - If the button needs additional hiding logic, add it
    - _Requirements: 1.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Write unit tests for bone selector dialog
  - [x] 6.1 Write unit tests for AnimationUI bone selector behavior
    - Test dialog opens on button click (mock VTreeDialog)
    - Test dialog toggles on second click
    - Test button hidden when no skeleton (via skelFound display)
    - Test tree built with `openAll=false`
    - Test marker created with correct properties (diameter 0.05, emissive green, non-pickable)
    - Test non-leaf bone click creates marker
    - Test marker disposed on dialog close
    - Test no-op when no marker on close
    - Test cleanup on mesh deselection
    - Test clean state after reopen
    - Test "hide bone selector" button absent from DOM
    - Test mesh selection locked when dialog opens — `switchDisabled` set to true (Req 7.1)
    - Test selecting another mesh blocked while dialog open — `switchEditControl` is no-op (Req 7.1)
    - Test deselection blocked while dialog open — escape key does not deselect (Req 7.2)
    - Test mesh selection unlocked when dialog closes — `switchDisabled` set to false (Req 7.3)
    - Test lock released on all close paths: close button, toggle, and programmatic close via `update()` (Req 7.3)
    - _Requirements: 1.1, 1.3, 1.4, 2.6, 3.1, 3.2, 3.4, 5.1, 5.2, 5.3, 5.4, 6.1, 7.1, 7.2, 7.3_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The VTreeDialog is reused as-is except for the addition of `onClose` (a thin delegation to VDiag.onHide)
- The existing `_addBoneSelectors` / `_delBoneSelectors` methods in Vishva.ts are left intact (used by attach-to-bone workflow) but no longer called from the bone selector button
- The mesh selection lock uses the existing `Vishva.switchDisabled` property — no new infrastructure needed
- The lock is always released in the `onHide` callback, ensuring it cannot get stuck regardless of how the dialog is closed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 5, "tasks": ["6.1"] }
  ]
}
```
