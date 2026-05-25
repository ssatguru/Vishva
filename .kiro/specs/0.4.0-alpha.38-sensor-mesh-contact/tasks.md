# Implementation Plan: Sensor Mesh Contact

## Overview

This plan implements mesh-to-mesh contact detection by renaming the existing avatar sensor, creating a new mesh-to-mesh sensor, adding the MeshPickerType property type, refactoring ItemListUI for reusability, and extending VTree to handle parenthesized labels. Each step builds incrementally on the previous.

## Tasks

- [x] 1. Rename SensorContact to SensorAvContact
  - [x] 1.1 Rename class, properties class, file, and registration
    - Rename `SensorContact` class to `SensorAvContact` in `src/sna/SensorContact.ts`
    - Rename `SenContactProp` to `SenAvContactProp`
    - Change `getName()` to return `"AvContact"`
    - Change registration from `addSensor("Contact", ...)` to `addSensor("AvContact", ...)`
    - Rename file from `SensorContact.ts` to `SensorAvContact.ts`
    - Update the side-effect import in `src/index.ts` from `"./sna/SensorContact"` to `"./sna/SensorAvContact"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Add backward compatibility in SNAManager.unMarshal
  - [x] 2.1 Add name remapping logic in unMarshal
    - In `SNAManager.unMarshal()`, before calling `createSensorByName` for sensors, check if `sna.name === "Contact"` and `sna.properties` does NOT have a `targetMesh` field — if so, remap name to `"AvContact"`
    - _Requirements: 1.8, 6.5_
  - [x] 2.2 Write property test for backward compatibility name resolution
    - **Property 2: Backward compatibility — old Contact sensors deserialize as AvContact**
    - **Property 3: New Contact sensors with targetMesh retain Contact name**
    - **Validates: Requirements 1.8, 6.3, 6.5**

- [x] 3. Create MeshPickerType and new SensorContact
  - [x] 3.1 Add MeshPickerType class to VishvaGUI.ts
    - Add `MeshPickerType` class with `type: "MeshPickerType"`, `value: string`, `meshName: string` fields
    - Add constructor accepting optional `value` and `meshName` parameters
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 3.2 Add MeshPickerType deserialization in SNAManager.unMarshalProps
    - In the `unMarshalProps` method, add a branch for `o["type"] === "MeshPickerType"` that reconstructs a `MeshPickerType` instance
    - _Requirements: 3.10, 6.2_
  - [x] 3.3 Write property test for MeshPickerType serialization round trip
    - **Property 1: MeshPickerType serialization round trip**
    - **Validates: Requirements 3.4, 3.10, 6.1, 6.2**
  - [x] 3.4 Create new SensorContact class for mesh-to-mesh detection
    - Create `src/sna/SensorContact.ts` with `SenContactProp` (onEnter, onExit, targetMesh) and `SensorContact` class
    - Implement `onPropertiesChange()` to resolve target mesh by uniqueId and register intersection triggers
    - Handle error cases: missing mesh, non-AbstractMesh node
    - Register with `SNAManager.getSNAManager().addSensor("Contact", SensorContact)`
    - Add side-effect import `"./sna/SensorContact"` in `src/index.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extend VTree for parenthesized label support
  - [x] 5.1 Implement greyed-out rendering and click suppression for parenthesized labels
    - In `VTree._buildUL()`, detect leaf nodes whose text starts with `(` and ends with `)` — apply greyed-out CSS styling (e.g., `opacity: 0.5; pointer-events: none` or similar)
    - In `VTree._treeClick()`, check if the clicked leaf label is parenthesized — if so, skip invoking `_clickListener`
    - Folder expand/collapse must remain unaffected by parenthesization
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 5.2 Write property test for VTree parenthesized label behavior
    - **Property 5: VTree parenthesized label behavior**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 6. Refactor ItemListUI for reusability
  - [x] 6.1 Add filter parameter and addTreeListener method
    - Add optional `filter?: (node: TransformNode) => boolean` parameter to constructor
    - In `_addChildren()`, always apply default exclusions (ground, avatar, skybox, editControl)
    - For nodes passing default exclusions: if filter is provided and returns false, wrap label in parentheses
    - Add `addTreeListener(listener)` method that calls `this._itemsDiag.addTreeListener(listener)` to override the default tree listener
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.2 Write property test for ItemListUI filter label wrapping
    - **Property 4: ItemListUI filter produces correct label wrapping**
    - **Validates: Requirements 4.2, 4.3**

- [x] 7. Add MeshPickerType handling in SnaUI
  - [x] 7.1 Implement _createMeshPicker in SnaUI.formCreate
    - In `formCreate()`, add a branch for `snaP[key] instanceof MeshPickerType`
    - Create `_createMeshPicker(mpt: MeshPickerType)` method that renders a label (showing meshName or "No mesh chosen") and a "Choose Mesh" button
    - On button click: create an `ItemListUI` with filter `(node) => node instanceof AbstractMesh` and modal=true
    - Call `addTreeListener` on the ItemListUI to capture selection — parse uniqueId from the leaf string, update `mpt.value` and `mpt.meshName`, update the label
    - In `formRead()`, add a branch for `MeshPickerType` that preserves value/meshName without modification
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- The backward compatibility logic in task 2.1 ensures existing saved worlds continue to work after the rename
