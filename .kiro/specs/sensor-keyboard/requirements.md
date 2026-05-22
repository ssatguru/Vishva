# Requirements Document

## Introduction

SensorKeyboard is a new sensor for the Vishva 3D editor's SNA (Sensor & Actuator) behavior system. It detects keyboard key presses and/or releases using the mesh's ActionManager (via `ActionManager.OnKeyDownTrigger` and `ActionManager.OnKeyUpTrigger`) and emits signals when the configured key (with optional modifier keys) is detected. The sensor supports optional pointer-on-mesh gating, where keyboard events are only processed when the pointer is hovering over the mesh. This sensor follows the same architectural patterns as SensorClick and SensorContact, extending SensorAbstract and self-registering with SNAManager.

## Glossary

- **SNA_System**: The Sensor & Actuator behavior system that enables dynamic interactions in the 3D scene. Sensors detect events and emit signals; actuators respond to those signals by performing actions.
- **SNAManager**: The singleton manager that registers, creates, and manages all sensors and actuators in the system.
- **SensorAbstract**: The abstract base class that all sensors extend, providing common lifecycle management, signal emission, and action registration.
- **SensorKeyboard**: The new keyboard sensor that detects keyboard key press and/or release events via ActionManager triggers and emits a signal when the configured key combination is detected.
- **ActionManager**: The BabylonJS ActionManager attached to a mesh that handles event triggers including `OnKeyDownTrigger` (raised when a key is pressed) and `OnKeyUpTrigger` (raised when a key is released).
- **Key_Selector**: A dropdown UI control that allows the user to select which keyboard key the sensor listens for.
- **Modifier_Keys**: The Ctrl, Alt, and Shift keys that can be optionally required in combination with the selected key.
- **SelectType**: A UI property type used in the SNA system that renders as a dropdown select element in the sensor edit dialog.
- **Signal**: A named string identifier emitted by a sensor that actuators can subscribe to and respond to.
- **Pointer_Over**: The state where the user's mouse/pointer cursor is hovering over the mesh in the 3D scene.
- **Hand_Pointer**: A CSS cursor style ("pointer") that indicates the mesh is interactive, shown when the pointer hovers over the mesh.

## Requirements

### Requirement 1: Sensor Registration

**User Story:** As a developer, I want SensorKeyboard to be registered with SNAManager at import time, so that it appears in the sensor selection dropdown and can be attached to meshes.

#### Acceptance Criteria

1. WHEN the SensorKeyboard module is imported via side-effect import in index.ts, THE SensorKeyboard SHALL call SNAManager.getSNAManager().addSensor() with the name "Keyboard" and the SensorKeyboard class at module scope
2. WHEN the application has finished loading, THE SNAManager.getSensorList() SHALL return a list that includes the string "Keyboard"
3. WHEN SNAManager.createSensorByName is called with "Keyboard", a mesh, and a properties object, THE SNAManager SHALL return a new instance of SensorKeyboard that extends SensorAbstract
4. THE SensorKeyboard module SHALL be imported exactly once as a side-effect import in src/index.ts, following the same pattern as the existing SensorClick import

### Requirement 2: Key Selection Property

**User Story:** As a scene designer, I want to select which keyboard key the sensor listens for, so that I can trigger different behaviors with different keys.

#### Acceptance Criteria

1. THE SensorKeyboard SHALL provide a key property of type SelectType whose values array contains all keys enumerated in criterion 2, using standard KeyboardEvent.key value strings
2. THE SensorKeyboard key property SHALL include letter keys (A through Z), digit keys (0 through 9), function keys (F1 through F12), arrow keys (ArrowUp, ArrowDown, ArrowLeft, ArrowRight), and common keys (Space, Enter, Escape, Tab, Backspace, Delete, Home, End, PageUp, PageDown), totaling 58 entries
3. IF no key value has been previously configured, THEN THE SensorKeyboard SHALL default the key property value to "Space"
4. WHEN the user opens the sensor edit dialog for a SensorKeyboard, THE SNA_System SHALL display the key property as a dropdown element showing the currently selected key value
5. WHEN the user selects a different key from the dropdown, THE SensorKeyboard SHALL update its key property value to the newly selected KeyboardEvent.key string and invoke onPropertiesChange to reconfigure the listened key

### Requirement 3: Modifier Key Properties

**User Story:** As a scene designer, I want to optionally require modifier keys (Ctrl, Alt, Shift) in combination with the selected key, so that I can create more specific keyboard shortcuts without conflicting with simple key presses.

#### Acceptance Criteria

1. THE SensorKeyboard SHALL provide a boolean property named "ctrl" that defaults to false
2. THE SensorKeyboard SHALL provide a boolean property named "alt" that defaults to false
3. THE SensorKeyboard SHALL provide a boolean property named "shift" that defaults to false
4. WHEN the user opens the sensor edit dialog, THE SNA_System SHALL display each modifier property as a checkbox
5. IF a modifier property is set to true and the corresponding modifier key (ctrlKey, altKey, or shiftKey) is not held when the configured key is pressed or released, THEN THE SensorKeyboard SHALL NOT emit its signal
6. IF a modifier property is set to false and the corresponding modifier key is held when the configured key is pressed or released, THEN THE SensorKeyboard SHALL NOT emit its signal
7. WHEN the configured key event occurs and the held modifier keys match all three modifier property values exactly, THE SensorKeyboard SHALL emit its signal

### Requirement 4: Keyboard Event Detection via ActionManager

**User Story:** As a scene designer, I want the sensor to detect when the configured key combination is pressed or released using the mesh's ActionManager, so that it integrates with BabylonJS's built-in event system consistently with other sensors.

#### Acceptance Criteria

1. WHEN onPropertiesChange is called and the mesh does not have an ActionManager, THE SensorKeyboard SHALL create a new ActionManager on the mesh
2. WHEN the onKeyDown property is true, THE SensorKeyboard SHALL register an ExecuteCodeAction with ActionManager.OnKeyDownTrigger on the mesh's ActionManager to detect key press events
3. WHEN the onKeyUp property is true, THE SensorKeyboard SHALL register an ExecuteCodeAction with ActionManager.OnKeyUpTrigger on the mesh's ActionManager to detect key release events
4. WHEN a key-down trigger fires where the event's sourceEvent.key matches the configured key and the sourceEvent's altKey, ctrlKey, and shiftKey values each match their configured boolean state, THE SensorKeyboard SHALL emit its signal via emitSignal
5. WHEN a key-up trigger fires where the event's sourceEvent.key matches the configured key and the sourceEvent's altKey, ctrlKey, and shiftKey values each match their configured boolean state, THE SensorKeyboard SHALL emit its signal via emitSignal
6. WHEN a key trigger fires where the event's sourceEvent.key matches the configured key but at least one of altKey, ctrlKey, or shiftKey does not match its configured boolean state, THE SensorKeyboard SHALL NOT emit its signal
7. WHEN a key-down trigger fires where sourceEvent.repeat is true, THE SensorKeyboard SHALL NOT emit its signal
8. THE SensorKeyboard SHALL store registered actions in the inherited actions array so that SensorAbstract.removeActions() can properly unregister them
9. WHILE the SNA_System has disabled sensors on the mesh (via SNAManager.snaDisabledList), THE SensorKeyboard SHALL NOT emit its signal

### Requirement 5: Sensor Lifecycle Management

**User Story:** As a scene designer, I want the keyboard sensor to properly manage its ActionManager actions when removed or disposed, so that it does not cause memory leaks or ghost event handling.

#### Acceptance Criteria

1. WHEN the SensorKeyboard is disposed, THE SensorKeyboard SHALL remove its registered actions from the mesh's ActionManager via the inherited removeActions() method, and if no actions remain on the ActionManager, dispose of the ActionManager
2. WHEN the SensorKeyboard properties change, THE SensorKeyboard SHALL remove previously registered actions via the inherited handlePropertiesChange flow and register new actions with the updated configuration
3. WHEN the SensorKeyboard receives its signalDisable signal, THE SensorKeyboard SHALL unregister its actions from the ActionManager so that keyboard triggers no longer fire until it receives its signalEnable signal
4. WHEN the SensorKeyboard receives its signalEnable signal after being disabled, THE SensorKeyboard SHALL re-register its actions with the ActionManager so that keyboard triggers resume firing for matching key events
5. IF the SensorKeyboard is disposed while it is disabled, THEN THE SensorKeyboard SHALL still remove its actions from the mesh's ActionManager

### Requirement 6: Serialization Compatibility

**User Story:** As a scene designer, I want keyboard sensor configurations to be saved and loaded with the world, so that my keyboard-triggered behaviors persist across sessions.

#### Acceptance Criteria

1. THE SensorKeyboard SHALL store its properties (key selection as a SelectType, modifier flags as boolean fields for shift, ctrl, and alt, event type flags onKeyDown and onKeyUp as booleans, and onlyOnPointerOver as a boolean) in an SNAproperties-derived class such that SNAManager.serializeSnAs produces a valid SNAserialized entry with name, type "SENSOR", meshId, and the properties object
2. WHEN a world is loaded containing a serialized SensorKeyboard, THE SNAManager.unMarshal SHALL reconstruct the SensorKeyboard with the saved key SelectType value, all modifier boolean flags, event type flags, and pointer-over flag matching their serialized values
3. IF the serialized SensorKeyboard data references a meshId that cannot be found in the loaded scene, THEN THE SNAManager SHALL log an error and skip reconstruction of that SensorKeyboard without affecting other SNA components
4. FOR ALL valid SensorKeyboard property configurations (any key from the defined SelectType values list combined with any combination of shift, ctrl, alt, onKeyDown, onKeyUp, and onlyOnPointerOver boolean flags), serializing via SNAManager.serializeSnAs then deserializing via SNAManager.unMarshal SHALL produce a sensor whose getProperties() returns property values equal to the original configuration (round-trip property)
5. WHEN SNAManager.unMarshal deserializes a SensorKeyboard, THE system SHALL reconstitute the key SelectType property (restoring both the values list and the selected value) and preserve all boolean flags via the existing unMarshalProps mechanism

### Requirement 7: Edit Mode Awareness

**User Story:** As a scene designer, I want the keyboard sensor to not interfere with normal text input in the editor UI, so that typing in input fields does not accidentally trigger sensor signals.

#### Acceptance Criteria

1. WHILE Vishva.vishva.keysDisabled is true (keys disabled state set via disableKeys()), THE SensorKeyboard SHALL NOT emit its signal for any key event
2. WHILE the document's active element (document.activeElement) is an INPUT element with a text-entry type (text, number, password, email, search, url, tel), a TEXTAREA element, a SELECT element, or any element with contentEditable set to "true", THE SensorKeyboard SHALL NOT emit its signal for any key event
3. IF the keys disabled state transitions from true to false while a key monitored by the SensorKeyboard is physically held down, THEN THE SensorKeyboard SHALL NOT emit its signal until that key is released and pressed again

### Requirement 8: Key Down and Key Up Event Selection

**User Story:** As a scene designer, I want to choose whether the sensor triggers on key press, key release, or both, so that I can create behaviors that respond to the specific phase of a key interaction.

#### Acceptance Criteria

1. THE SensorKeyboard SHALL provide a boolean property named "onKeyDown" that defaults to true
2. THE SensorKeyboard SHALL provide a boolean property named "onKeyUp" that defaults to false
3. WHEN the user opens the sensor edit dialog, THE SNA_System SHALL display the onKeyDown property as a checkbox labeled for key press events
4. WHEN the user opens the sensor edit dialog, THE SNA_System SHALL display the onKeyUp property as a checkbox labeled for key release events
5. WHEN onKeyDown is true and onKeyUp is false, THE SensorKeyboard SHALL only register an action for ActionManager.OnKeyDownTrigger and emit signals on key press events
6. WHEN onKeyDown is false and onKeyUp is true, THE SensorKeyboard SHALL only register an action for ActionManager.OnKeyUpTrigger and emit signals on key release events
7. WHEN both onKeyDown and onKeyUp are true, THE SensorKeyboard SHALL register actions for both ActionManager.OnKeyDownTrigger and ActionManager.OnKeyUpTrigger and emit signals on both key press and key release events
8. IF both onKeyDown and onKeyUp are false, THEN THE SensorKeyboard SHALL not register any keyboard trigger actions and SHALL NOT emit any signals

### Requirement 9: Pointer-On-Mesh Gating

**User Story:** As a scene designer, I want to optionally restrict the keyboard sensor to only respond when the pointer is hovering over the mesh, so that I can create spatially-aware keyboard interactions and provide visual feedback that the mesh is interactive.

#### Acceptance Criteria

1. THE SensorKeyboard SHALL provide a boolean property named "onlyOnPointerOver" that defaults to false
2. WHEN the user opens the sensor edit dialog, THE SNA_System SHALL display the onlyOnPointerOver property as a checkbox
3. WHEN onlyOnPointerOver is false, THE SensorKeyboard SHALL emit signals for matching key events regardless of the pointer position relative to the mesh
4. WHEN onlyOnPointerOver is true and the pointer is not hovering over the mesh, THE SensorKeyboard SHALL NOT emit its signal for any key event
5. WHEN onlyOnPointerOver is true and the pointer is hovering over the mesh, THE SensorKeyboard SHALL emit its signal for matching key events
6. WHEN onlyOnPointerOver is true, THE SensorKeyboard SHALL register an ActionManager.OnPointerOverTrigger action to track when the pointer enters the mesh and an ActionManager.OnPointerOutTrigger action to track when the pointer leaves the mesh
7. WHEN onlyOnPointerOver is true, THE SensorKeyboard SHALL set the mesh's default cursor to "pointer" (hand cursor) via scene.hoverCursor or the mesh's actionManager to indicate interactivity when the pointer hovers over the mesh
8. WHEN onlyOnPointerOver transitions from true to false (via property change), THE SensorKeyboard SHALL remove the pointer-over and pointer-out tracking actions and restore the mesh's default cursor behavior
9. WHEN onlyOnPointerOver is true and the pointer leaves the mesh while a monitored key is held down, THE SensorKeyboard SHALL NOT emit any further signals until the pointer re-enters the mesh and the key is pressed again
