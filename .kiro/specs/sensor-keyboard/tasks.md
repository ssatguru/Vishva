# Implementation Plan: Sensor Keyboard

## Overview

This plan implements a keyboard event sensor for the SNA behavior system. SensorKeyboard detects key presses/releases via ActionManager triggers and emits signals when the configured key combination (key + modifiers) is detected. It supports event type selection (key-down, key-up, or both), optional pointer-on-mesh gating, and edit mode awareness. The implementation follows the same pattern as SensorClick: a properties class + sensor class + self-registration at module scope.

## Tasks

- [x] 1. Create SenKeyboardProp and SensorKeyboard class
  - [x] 1.1 Create SenKeyboardProp properties class
    - Create `src/sna/SensorKeyboard.ts`
    - Define `SenKeyboardProp extends SNAproperties` with fields: `key: SelectType` (58 entries, default `" "`), `ctrl: boolean` (false), `alt: boolean` (false), `shift: boolean` (false), `onKeyDown: boolean` (true), `onKeyUp: boolean` (false), `onlyOnPointerOver: boolean` (false)
    - Populate `key.values` with letters A-Z, digits 0-9, function keys F1-F12, arrow keys, and common keys (Space as `" "`, Enter, Escape, Tab, Backspace, Delete, Home, End, PageUp, PageDown) — 58 entries total
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 8.1, 8.2, 9.1_

  - [x] 1.2 Implement SensorKeyboard class with key event handling
    - Define `SensorKeyboard extends SensorAbstract` in the same file
    - Implement `getName()` returning `"Keyboard"`, `getPropertiesType()` returning `SenKeyboardProp`
    - Implement `onPropertiesChange()`: create ActionManager if needed, register `OnKeyDownTrigger` action when `onKeyDown` is true, register `OnKeyUpTrigger` action when `onKeyUp` is true, push all actions to `this.actions`
    - Implement private `_handleKeyEvent(e)` with guards: repeat filter (`sourceEvent.repeat`), edit mode (`Vishva.vishva.keysDisabled`), active text input element check (INPUT text types, TEXTAREA, SELECT, contentEditable), pointer-over gating (`onlyOnPointerOver && !_pointerOver`), key match (`sourceEvent.key !== props.key.value`), exact modifier match (ctrlKey, altKey, shiftKey)
    - When `onlyOnPointerOver` is true: register `OnPointerOverTrigger` and `OnPointerOutTrigger` actions to track `_pointerOver` state, set `actionManager.hoverCursor = "pointer"`
    - Implement `cleanUp()` to reset `_pointerOver = false`
    - Self-register at module scope: `SNAManager.getSNAManager().addSensor("Keyboard", SensorKeyboard)`
    - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 7.1, 7.2, 7.3, 8.5, 8.6, 8.7, 8.8, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 1.3 Add side-effect import in index.ts
    - Add `import "./sna/SensorKeyboard";` to `src/index.ts` alongside the existing sensor imports
    - _Requirements: 1.2, 1.4_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Write property-based tests for SensorKeyboard
  - [x]* 3.1 Write property test for serialization round-trip
    - **Property 1: Serialization round-trip preserves all properties**
    - Generate random `SenKeyboardProp` instances (random key from 58 values, random booleans for ctrl/alt/shift/onKeyDown/onKeyUp/onlyOnPointerOver), serialize to plain JSON object, run through `unMarshalProps`, assert `key.value`, `key.values`, `ctrl`, `alt`, `shift`, `onKeyDown`, `onKeyUp`, and `onlyOnPointerOver` are all equal to the original
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**

  - [x]* 3.2 Write property test for signal emission key/modifier matching
    - **Property 2: Signal emission requires exact key and modifier match**
    - Generate random key configs and random key events (any key string, any ctrlKey/altKey/shiftKey state, repeat=false), invoke the matching logic, assert signal emission iff sourceEvent.key equals configured key AND all three modifier states match exactly
    - **Validates: Requirements 3.5, 3.6, 3.7, 4.4, 4.5, 4.6**

  - [x]* 3.3 Write property test for guard condition suppression
    - **Property 3: Guard conditions prevent signal emission**
    - Generate random matching events (correct key + correct modifiers) with at least one guard active (keysDisabled=true OR active text input element OR sourceEvent.repeat=true), assert no signal emission
    - **Validates: Requirements 4.7, 7.1, 7.2**

  - [x]* 3.4 Write property test for trigger registration
    - **Property 4: Trigger registration matches event type configuration**
    - Generate random onKeyDown/onKeyUp boolean combinations, invoke `onPropertiesChange()` on a mock mesh, count registered actions by trigger type, assert count matches the number of true values
    - **Validates: Requirements 8.5, 8.6, 8.7, 8.8**

  - [x]* 3.5 Write property test for pointer-over gating
    - **Property 5: Pointer-over gating controls signal emission**
    - Generate random matching events (correct key + correct modifiers, no guard conditions active) with random pointer-over state and onlyOnPointerOver config, assert emission iff `onlyOnPointerOver` is false OR (`onlyOnPointerOver` is true AND pointer is over mesh)
    - **Validates: Requirements 9.3, 9.4, 9.5**

- [x] 4. Write unit tests for SensorKeyboard
  - [x]* 4.1 Write unit tests for SenKeyboardProp defaults and SensorKeyboard registration
    - Verify `SenKeyboardProp` defaults: `key.value === " "`, `key.values.length === 58`, `ctrl === false`, `alt === false`, `shift === false`, `onKeyDown === true`, `onKeyUp === false`, `onlyOnPointerOver === false`
    - Verify `getName()` returns `"Keyboard"`, `getType()` returns `"SENSOR"`
    - Verify SNAManager.getSensorList() includes `"Keyboard"`
    - Verify ActionManager is created if mesh doesn't have one
    - Verify pointer-over actions registered/not registered based on `onlyOnPointerOver`
    - Verify `hoverCursor` set to `"pointer"` when `onlyOnPointerOver` is true
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 8.1, 8.2, 9.1, 9.6, 9.7_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript with the existing project patterns (SensorAbstract, SNAManager, SelectType)
- Serialization compatibility is handled by the existing `unMarshalProps` mechanism which already reconstitutes `SelectType` objects — no changes to SNAManager needed
- The `" "` (space character) is used as the internal key value for Space to match `KeyboardEvent.key` behavior

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "4.1"] }
  ]
}
```
