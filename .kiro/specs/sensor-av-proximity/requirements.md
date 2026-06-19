# Requirements Document

## Introduction

This feature adds an `avProximity` property to the SensorClick and SensorKeyboard sensors in the SNA behavior system. The property defines a maximum distance between the Avatar and the sensor's mesh — if the Avatar is farther than this distance, the sensor suppresses signal emission. When set to zero, proximity checking is disabled and the sensor always emits normally.

## Glossary

- **Sensor**: An SNA component that detects events (clicks, keyboard input, contact, etc.) and emits signals to connected Actuators.
- **SensorClick**: A Sensor that detects pointer/click events on the mesh it is attached to.
- **SensorKeyboard**: A Sensor that detects keyboard key presses, optionally gated by pointer-over state on its mesh.
- **Avatar**: The player-controlled character mesh, managed by AvManager and accessible via `Vishva.vishva.avatar`.
- **Mesh**: A 3D object in the BabylonJS scene that a Sensor is attached to.
- **avProximity**: A numeric property specifying the maximum allowed distance between the Avatar and the Sensor's mesh for the Sensor to emit a signal.
- **Signal**: A named event emitted by a Sensor, routed by SNAManager to subscribed Actuators.
- **SNAproperties**: The base class for serializable sensor/actuator configuration properties.
- **SnaUI**: The editor panel that renders editable fields for sensor/actuator properties.

## Requirements

### Requirement 1: avProximity Property on SensorClick

**User Story:** As a world designer, I want to configure a maximum activation distance on click sensors, so that clicking a mesh only triggers its behavior when the avatar is nearby.

#### Acceptance Criteria

1. THE SenClickProp class SHALL include a numeric `avProximity` property with a default value of zero, representing the maximum activation distance in world units, accepting values from 0 to 1000.
2. WHEN a click event occurs on the SensorClick mesh AND `avProximity` is greater than zero AND the Euclidean distance between the Avatar's absolute position and the Mesh's absolute position is greater than `avProximity`, THE SensorClick SHALL NOT emit a signal.
3. WHEN a click event occurs on the SensorClick mesh AND `avProximity` is greater than zero AND the Euclidean distance between the Avatar's absolute position and the Mesh's absolute position is less than or equal to `avProximity`, THE SensorClick SHALL emit a signal.
4. WHEN a click event occurs on the SensorClick mesh AND `avProximity` is equal to zero, THE SensorClick SHALL emit a signal regardless of distance.
5. IF a click event occurs on the SensorClick mesh AND `avProximity` is greater than zero AND no avatar mesh is present in the scene, THEN THE SensorClick SHALL emit the signal as if the proximity check passed.

### Requirement 2: avProximity Property on SensorKeyboard

**User Story:** As a world designer, I want to configure a maximum activation distance on keyboard sensors, so that key presses only trigger behavior when the avatar is near the sensor's mesh.

#### Acceptance Criteria

1. THE SenKeyboardProp class SHALL include a numeric `avProximity` property with a default value of zero and a minimum accepted value of zero.
2. WHEN a keyboard event matches the configured key AND `avProximity` is greater than zero AND the Euclidean distance between the Avatar position and the Mesh position in 3D world space is greater than `avProximity`, THE SensorKeyboard SHALL NOT emit a signal.
3. WHEN a keyboard event matches the configured key AND `avProximity` is greater than zero AND the Euclidean distance between the Avatar position and the Mesh position in 3D world space is less than or equal to `avProximity`, THE SensorKeyboard SHALL emit a signal.
4. WHEN a keyboard event matches the configured key AND `avProximity` is equal to zero, THE SensorKeyboard SHALL emit a signal regardless of distance.
5. IF `avProximity` is set to a value less than zero, THEN THE SenKeyboardProp class SHALL treat the value as zero.

### Requirement 3: Distance Calculation

**User Story:** As a world designer, I want the proximity check to use world-space positions, so that the behavior is consistent regardless of mesh hierarchy or parenting.

#### Acceptance Criteria

1. WHEN performing a proximity check, THE Sensor SHALL compute the Euclidean distance in BabylonJS world units between the Avatar's absolute world position and the Mesh's absolute world position.
2. IF the Avatar is not present in the scene (null), THEN THE Sensor SHALL emit the signal without performing a proximity check.

### Requirement 4: Serialization and Deserialization

**User Story:** As a world designer, I want the avProximity value to persist when I save and load a world, so that my proximity settings are preserved.

#### Acceptance Criteria

1. WHEN the SNA system serializes SensorClick or SensorKeyboard properties, THE Serializer SHALL include the `avProximity` value as a numeric field in the serialized output.
2. WHEN the SNA system deserializes SensorClick or SensorKeyboard properties that contain an `avProximity` field, THE Deserializer SHALL restore the `avProximity` value from the serialized data and the resulting sensor SHALL use the restored value for proximity checks.
3. WHEN deserializing a legacy save that does not contain an `avProximity` field, THE Deserializer SHALL treat the missing value as zero (proximity check disabled), and the sensor SHALL emit signals regardless of avatar distance.
4. WHEN the SNA system serializes an `avProximity` value of zero, THE Serializer SHALL include the zero value in the serialized output (not omit it).

### Requirement 5: UI Editability

**User Story:** As a world designer, I want to see and edit the avProximity value in the sensor properties panel, so that I can configure proximity without editing code.

#### Acceptance Criteria

1. WHEN the SnaUI renders properties for SensorClick or SensorKeyboard, THE SnaUI SHALL display an editable numeric input field labeled `avProximity` showing the current property value.
2. WHEN the user enters a valid numeric value greater than or equal to zero in the `avProximity` field and saves, THE SnaUI SHALL update the sensor's `avProximity` property to the entered value and invoke `handlePropertiesChange()`.
3. IF the user enters a non-numeric value in the `avProximity` field and saves, THEN THE SnaUI SHALL set the sensor's `avProximity` property to zero.
4. IF the user enters a negative numeric value in the `avProximity` field and saves, THEN THE SnaUI SHALL treat the value as zero.
