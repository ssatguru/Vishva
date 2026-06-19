# Implementation Plan: sensor-av-proximity

## Overview

Add an `avProximity` numeric property to `SenClickProp` and `SenKeyboardProp` that gates signal emission based on the avatar's distance from the sensor's mesh. Implementation involves a shared proximity check utility, property additions to both sensor Props classes, and proximity guards inserted before `emitSignal()` calls.

## Tasks

- [x] 1. Create proximity check utility
  - [x] 1.1 Create `src/sna/proximityCheck.ts` with the `shouldEmitByProximity` function
    - Implement the pure function that takes `avProximity`, `meshPosition` (Vector3), and a `getAvatar` function returning Mesh or null
    - Return `true` (emit) when `avProximity <= 0`, avatar is null, or distance <= avProximity
    - Return `false` (suppress) when distance > avProximity
    - Import `Vector3` and `Mesh` from babylonjs
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

  - [ ]* 1.2 Write property test for proximity gating correctness
    - **Property 1: Proximity gating correctness**
    - Generate random avProximity values (negative, zero, positive), random 3D positions, and random avatar presence (null or mock mesh with position)
    - Verify result matches: `avProximity <= 0 || avatar == null || Vector3.Distance(avatarPos, meshPos) <= avProximity`
    - File: `src/sna/proximityCheck.property.test.ts`
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2**

- [x] 2. Add avProximity to SensorClick
  - [x] 2.1 Add `avProximity: number = 0` property to `SenClickProp` in `src/sna/SensorClick.ts`
    - Add the property after the existing `clickType` property
    - _Requirements: 1.1_

  - [x] 2.2 Add proximity guard to SensorClick's `onPropertiesChange()` click handler
    - Import `shouldEmitByProximity` from `./proximityCheck`
    - Inside the `ExecuteCodeAction` callback, after the modifier key guard and before `this.emitSignal(e)`, add the proximity check
    - Use `this.mesh.absolutePosition` for mesh position and `() => SNAManager.getSNAManager().getAV()` for the avatar getter
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2_

- [x] 3. Add avProximity to SensorKeyboard
  - [x] 3.1 Add `avProximity: number = 0` property to `SenKeyboardProp` in `src/sna/SensorKeyboard.ts`
    - Add the property after the existing `onlyOnPointerOver` property
    - _Requirements: 2.1_

  - [x] 3.2 Add proximity guard to SensorKeyboard's `_handleKeyEvent()` method
    - Import `shouldEmitByProximity` from `./proximityCheck`
    - After the modifier key check and before `this.emitSignal()`, add the proximity check
    - Use `this.mesh.absolutePosition` for mesh position and `() => SNAManager.getSNAManager().getAV()` for the avatar getter
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

- [x] 4. Checkpoint - Verify core implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Serialization and unit tests
  - [ ]* 5.1 Write property test for serialization round trip
    - **Property 2: avProximity serialization round trip**
    - Generate random non-negative avProximity values, create SenClickProp and SenKeyboardProp instances, serialize via JSON (stripping state_ keys), verify avProximity is preserved
    - File: `src/sna/proximityCheck.property.test.ts`
    - **Validates: Requirements 4.1, 4.2**

  - [x] 5.2 Write unit tests for proximity check and sensor integration
    - File: `src/sna/proximityCheck.test.ts`
    - Test default property value is 0 for both SenClickProp and SenKeyboardProp
    - Test boundary: distance exactly equals avProximity → emits (returns true)
    - Test boundary: distance is avProximity + epsilon → suppresses (returns false)
    - Test legacy deserialization without avProximity field → defaults to 0
    - _Requirements: 1.1, 2.1, 4.3_

  - [ ]* 5.3 Write property tests for UI numeric input handling
    - **Property 3: UI numeric input preserves valid values**
    - Generate random non-negative finite number strings, verify parseFloat produces the exact numeric value
    - **Property 4: UI invalid input normalizes to zero**
    - Generate non-numeric strings and negative numeric strings, verify result is 0
    - File: `src/sna/proximityCheck.property.test.ts`
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No changes needed to `SnaUI.ts` — formCreate auto-generates the numeric input field, and formRead already handles parseFloat with NaN→0 fallback
- No changes needed to `SNA.ts` — serialization/deserialization handles plain numbers automatically
- Legacy saves missing the `avProximity` field will use the default value of 0 from the class constructor

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2"] },
    { "id": 2, "tasks": ["5.1", "5.2", "5.3"] }
  ]
}
```
