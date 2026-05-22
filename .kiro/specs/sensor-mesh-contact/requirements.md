# Requirements Document

## Introduction

This feature introduces mesh-to-mesh contact detection in the SNA (Sensors & Actuators) system. Currently, the only contact sensor (`SensorContact`) detects when the avatar enters or exits a mesh. This feature renames the existing sensor to `SensorAvContact` (avatar contact) and creates a new `SensorContact` that detects when any non-avatar mesh enters or exits the sensor's mesh. The existing `ItemListUI` is refactored to accept a filter lambda, making it reusable for mesh selection in the SNA properties editor. A new `MeshPickerType` property type is introduced (following the same pattern as `FileInputType`) so that the SNA properties editor automatically renders a mesh selection UI using the refactored `ItemListUI`.

## Glossary

- **SNA_System**: The Sensors & Actuators behavior system in Vishva that detects events (sensors) and performs actions (actuators) via signal emission and subscription.
- **SNAManager**: The singleton manager that registers, creates, serializes, and deserializes all sensors and actuators.
- **SensorAvContact**: The renamed version of the current SensorContact class. Detects when the avatar mesh enters or exits the sensor's mesh using BabylonJS intersection triggers.
- **SensorContact**: The new sensor class that detects when a user-selected non-avatar mesh enters or exits the sensor's mesh using BabylonJS intersection triggers.
- **MeshPickerType**: A new property type class (analogous to `FileInputType`) that stores a mesh identifier and triggers the ItemListUI dialog in the SNA properties editor for mesh selection.
- **ItemListUI**: The existing dialog component that displays all meshes in the scene as a tree structure, allowing the user to select a mesh. Refactored to accept a filter lambda for reusability.
- **SnaUI**: The SNA properties editor that auto-generates forms from sensor/actuator property objects, recognizing special types like `SelectType`, `FileInputType`, `Range`, and the new `MeshPickerType`.
- **Signal**: A named string identifier emitted by sensors and consumed by actuators to trigger behavior chains.
- **Intersection_Trigger**: A BabylonJS ActionManager trigger that fires when one mesh's bounding volume enters or exits another mesh's bounding volume.
- **Owner_Mesh**: The mesh to which a sensor or actuator is attached.
- **Target_Mesh**: The non-avatar mesh selected by the user that the SensorContact monitors for intersection with the Owner_Mesh.
- **VTreeDialog**: A reusable dialog component that displays a tree with search, filter, expand, and collapse controls.
- **VTree**: The tree widget used by VTreeDialog that renders hierarchical data and supports text filtering and selection.
- **Parenthesized_Label**: A tree node label wrapped in parentheses (e.g., `"(42, MyNode)"`) indicating the node is non-selectable and should be rendered greyed out.

## Requirements

### Requirement 1: Rename Existing SensorContact to SensorAvContact

**User Story:** As a developer, I want the existing avatar-contact sensor renamed to SensorAvContact, so that the naming clearly distinguishes avatar-contact detection from mesh-to-mesh contact detection.

#### Acceptance Criteria

1. THE SNA_System SHALL rename the class `SensorContact` to `SensorAvContact` in the source file.
2. THE SNA_System SHALL rename the source file from `SensorContact.ts` to `SensorAvContact.ts`.
3. THE SNA_System SHALL rename the properties class from `SenContactProp` to `SenAvContactProp`.
4. WHEN SensorAvContact registers with SNAManager, THE SNA_System SHALL use the registration name "AvContact" instead of "Contact".
5. THE SNA_System SHALL update the `getName()` method of SensorAvContact to return "AvContact".
6. THE SNA_System SHALL update the side-effect import in `index.ts` from `"./sna/SensorContact"` to `"./sna/SensorAvContact"`.
7. THE SNA_System SHALL update all internal references to the renamed class across the codebase.
8. WHEN a previously saved world contains a serialized sensor with name "Contact", THE SNA_System SHALL deserialize the sensor using SensorAvContact to maintain backward compatibility.

### Requirement 2: Create New SensorContact for Mesh-to-Mesh Detection

**User Story:** As a world builder, I want a sensor that detects when a specific mesh enters or exits another mesh, so that I can create interactions between non-avatar objects in the scene.

#### Acceptance Criteria

1. THE SNA_System SHALL provide a new sensor class named `SensorContact` in a file named `SensorContact.ts`.
2. THE SNA_System SHALL extend `SensorAbstract` for the new SensorContact class.
3. WHEN SensorContact registers with SNAManager, THE SNA_System SHALL use the registration name "Contact".
4. THE SNA_System SHALL provide a properties class `SenContactProp` with fields: `onEnter` (boolean), `onExit` (boolean), and `targetMesh` (MeshPickerType identifying the Target_Mesh).
5. WHEN `onEnter` is enabled and the Target_Mesh enters the Owner_Mesh bounding volume, THE SensorContact SHALL emit the configured signal.
6. WHEN `onExit` is enabled and the Target_Mesh exits the Owner_Mesh bounding volume, THE SensorContact SHALL emit the configured signal.
7. THE SNA_System SHALL register an `OnIntersectionEnterTrigger` action on the Owner_Mesh's ActionManager when `onEnter` is enabled.
8. THE SNA_System SHALL register an `OnIntersectionExitTrigger` action on the Owner_Mesh's ActionManager when `onExit` is enabled.
9. THE SNA_System SHALL add a side-effect import for `"./sna/SensorContact"` in `index.ts`.
10. IF the Target_Mesh identified by the `targetMesh` property does not exist in the scene, THEN THE SensorContact SHALL log a warning and skip action registration.
11. THE SensorContact SHALL resolve the Target_Mesh as an `AbstractMesh` instance because BabylonJS intersection triggers require `AbstractMesh` (not `TransformNode`) for bounding volume calculations.
12. IF the resolved node is a `TransformNode` that is not an `AbstractMesh`, THEN THE SensorContact SHALL log a warning and skip action registration.

### Requirement 3: MeshPickerType Property Type

**User Story:** As a developer, I want a reusable property type for selecting meshes in the scene, so that any sensor or actuator can offer mesh selection using the same pattern as `FileInputType` offers file selection.

#### Acceptance Criteria

1. THE SNA_System SHALL provide a `MeshPickerType` class in `VishvaGUI.ts` alongside the existing `FileInputType`, `SelectType`, and `Range` classes.
2. THE MeshPickerType SHALL store a `value` field containing the unique identifier of the selected mesh as a string.
3. THE MeshPickerType SHALL store a `meshName` field containing the display name of the selected mesh.
4. THE MeshPickerType SHALL have a `type` field set to "MeshPickerType" for serialization identification.
5. WHEN the SnaUI `formCreate` method encounters a property of type `MeshPickerType`, THE SnaUI SHALL render a label showing the current mesh name and a "Choose Mesh" button.
6. WHEN the user clicks the "Choose Mesh" button, THE SnaUI SHALL open an ItemListUI instance configured with a filter that marks non-AbstractMesh nodes as non-selectable.
7. THE SnaUI SHALL use the `addTreeListener` method on the ItemListUI to receive the selected mesh's unique identifier and name.
8. WHEN the user selects a mesh from the ItemListUI dialog, THE SnaUI SHALL update the `MeshPickerType` value with the selected mesh's unique identifier and update the label with the mesh name.
9. WHEN the SnaUI `formRead` method processes a `MeshPickerType` property, THE SnaUI SHALL preserve the stored value and meshName without modification.
10. WHEN a world is loaded and the SNAManager `unMarshalProps` method encounters a serialized `MeshPickerType` object, THE SNAManager SHALL reconstruct the `MeshPickerType` instance from the serialized data.

### Requirement 4: Refactor ItemListUI for Reusability

**User Story:** As a developer, I want ItemListUI to accept a filter lambda parameter, so that it can be reused for mesh selection in contexts beyond the world item list.

#### Acceptance Criteria

1. THE ItemListUI constructor SHALL accept an optional `filter` parameter of type `(node: TransformNode) => boolean`.
2. THE ItemListUI SHALL always apply the existing default exclusions (ground, avatar, skybox, editControl) regardless of whether a filter parameter is provided.
3. WHEN a `filter` parameter is provided and the filter returns false for a node that passes the default exclusions, THE ItemListUI SHALL wrap that node's label in parentheses in the tree data (e.g., `"(42, MyNode)"` instead of `"42, MyNode"`).
4. WHEN no `filter` parameter is provided, THE ItemListUI SHALL function identically to its current behavior with no labels wrapped in parentheses.
5. THE ItemListUI SHALL provide an `addTreeListener` method that adds a tree listener to its internal VTreeDialog, overriding the default tree listener.
6. WHEN the `addTreeListener` method is called, THE ItemListUI SHALL use the provided listener for handling tree item selections instead of the default `selectMesh` behavior.

### Requirement 5: VTree Parenthesized Label Rendering

**User Story:** As a developer, I want VTree to render parenthesized labels as greyed-out and non-clickable, so that non-selectable items are visually distinguished and cannot be accidentally selected.

#### Acceptance Criteria

1. WHEN VTree renders a leaf node whose label starts with "(" and ends with ")", THE VTree SHALL apply greyed-out styling to that node.
2. WHEN the user clicks a greyed-out (parenthesized) leaf node, THE VTree SHALL not invoke the click listener.
3. THE VTree SHALL continue to allow expand/collapse of folder nodes regardless of whether their label is parenthesized.
4. WHEN a leaf node label is not parenthesized, THE VTree SHALL render and handle clicks identically to current behavior.

### Requirement 6: Serialization and Deserialization

**User Story:** As a world builder, I want the mesh-to-mesh contact sensor configuration to persist when saving and loading worlds, so that my behavior setups are preserved.

#### Acceptance Criteria

1. WHEN a world is saved, THE SNA_System SHALL serialize the SensorContact properties including the `targetMesh` MeshPickerType, `onEnter`, and `onExit`.
2. WHEN a world is loaded, THE SNA_System SHALL deserialize the SensorContact and resolve the Target_Mesh from the stored `targetMesh.value` identifier.
3. WHEN a world is loaded and the serialized data contains a sensor named "Contact" with a `targetMesh` property, THE SNA_System SHALL instantiate SensorContact.
4. WHEN a world is loaded and the serialized data contains a sensor named "AvContact", THE SNA_System SHALL instantiate SensorAvContact.
5. WHEN a world is loaded and the serialized data contains a sensor named "Contact" without a `targetMesh` property, THE SNA_System SHALL instantiate SensorAvContact for backward compatibility.
