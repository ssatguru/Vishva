# Requirements Document

## Introduction

The Spawner feature provides a dedicated mechanism for controlling where the avatar and camera are positioned when a scene/world is loaded. Currently, the avatar and camera positions are captured as part of standard scene serialization at save time, which may result in inconsistent or undesirable starting positions. The Spawner replaces the existing half-baked `spawnPoint` solution with a fully-featured system that supports multiple spawn points, stores complete transform data (position, rotation) for both avatar and camera, and provides a visual arrow-shaped mesh indicator in the scene. When multiple spawners exist, one is randomly selected at load time.

## Glossary

- **Spawner**: A scene object that stores the desired spawn transforms for the avatar and camera, represented visually by a flat arrow-shaped mesh placed at the avatar's feet
- **Spawner_Mesh**: The flat, low-poly arrow-shaped mesh that visually represents a Spawner in the scene, pointing in the avatar's forward direction
- **Spawner_Manager**: The subsystem responsible for creating, serializing, deserializing, and applying Spawner objects
- **Avatar**: The controllable character mesh managed by AvManager and CharacterController
- **Arc_Camera**: The ArcRotateCamera that follows the avatar, managed by Vishva
- **VishvaSerialized**: The custom serialization structure that stores Vishva-specific data alongside the BabylonJS scene serialization
- **NavBar**: The navigation toolbar at the top-left of the editor UI containing action buttons

## Requirements

### Requirement 1: Spawner Creation via NavBar

**User Story:** As a world builder, I want to create a spawner by clicking a button in the NavBar, so that I can define spawn points for the scene.

#### Acceptance Criteria

1. THE NavBar SHALL contain a button with a Material Icons icon and tooltip text "add spawner" for creating a Spawner
2. WHEN the spawner button is clicked and no Spawner_Mesh is currently selected in the edit control, THE Spawner_Manager SHALL create a new Spawner object at the Avatar's current position
3. WHEN the spawner button is clicked and a Spawner_Mesh is currently selected in the edit control, THE Spawner_Manager SHALL update the existing Spawner object's position to the Avatar's current ground-level position and orientation to the Avatar's current forward direction, instead of creating a new one
4. WHEN a new Spawner is created, THE Spawner_Manager SHALL place the Spawner_Mesh at the Avatar's ground-level position, computed as the Avatar mesh position offset downward by the Avatar's ellipsoid height so the mesh sits at foot level
5. WHEN a new Spawner is created, THE Spawner_Manager SHALL orient the Spawner_Mesh to match the Avatar's Y-axis rotation so the mesh points in the Avatar's forward-facing direction
6. WHEN a new Spawner is created or updated, THE Spawner_Manager SHALL select the Spawner_Mesh in the edit control so the user can immediately reposition it

### Requirement 2: Spawner Mesh Appearance and Visibility

**User Story:** As a world builder, I want the spawner to be visually represented as a flat arrow on the ground, so that I can see where spawn points are and which direction they face.

#### Acceptance Criteria

1. THE Spawner_Mesh SHALL be a flat mesh in the shape of an arrow, with a maximum height (Y-axis thickness) of 0.05 units and no more than 20 triangles
2. WHEN the spawner is created, THE Spawner_Mesh SHALL be placed at the Avatar's ground-level position (Y position at the Avatar's feet)
3. THE Spawner_Mesh SHALL use a material color that is not used by any other Vishva internal mesh (ground, skybox, primitives), so that it is visually distinguishable from other editor elements
4. THE Spawner_Mesh arrow SHALL point in the direction the Avatar will face when spawned, so that the world builder can identify spawn orientation
5. THE Spawner_Mesh SHALL be selectable and transformable (translate, rotate, scale) using the existing EditControl system
6. THE Spawner_Mesh SHALL be tagged as a Vishva internal mesh (isInternal metadata and "Vishva.internal" tag) and marked as invisible (isInvisible metadata and "invisible" tag) so it is recognized during serialization
7. WHEN a world is loaded, THE Spawner_Mesh SHALL be invisible and non-pickable by default
8. WHEN the "reveal invisibles" option is selected in the Settings dialog, THE Spawner_Mesh SHALL become visible and pickable, highlighted with the same reveal color used for other invisible meshes
9. WHEN the "reveal invisibles" option is deselected, THE Spawner_Mesh SHALL become invisible and non-pickable again

### Requirement 3: Spawner Data Storage with Relative Transforms

**User Story:** As a world builder, I want the spawner to store avatar and camera transforms relative to the spawner mesh, so that I can adjust the spawn location later by simply moving or rotating the spawner mesh.

#### Acceptance Criteria

1. WHEN a Spawner is created, THE Spawner_Manager SHALL compute and store the Avatar position as a local-space offset from the Spawner_Mesh by transforming the Avatar world position into the Spawner_Mesh's local coordinate system (inverse of Spawner_Mesh world matrix), and store the Avatar rotation as the angular difference between the Avatar world rotation and the Spawner_Mesh world rotation
2. WHEN a Spawner is created, THE Spawner_Manager SHALL store the Arc_Camera target offset as a Vector3 representing the displacement from the Avatar position to the camera target in world space, and store the Arc_Camera alpha, beta, and radius values directly (these are inherently relative to the camera target)
3. WHEN a Spawner is created, THE Spawner_Manager SHALL capture and store the current world position and rotation of the Spawner_Mesh
4. WHEN the Spawner is applied on scene load, THE Spawner_Manager SHALL compute the final Avatar world position by transforming the stored relative position from Spawner_Mesh local space to world space using the Spawner_Mesh's current world matrix, and compute the final Avatar world rotation by combining the Spawner_Mesh world rotation with the stored relative rotation
5. WHEN the Spawner is applied on scene load, THE Spawner_Manager SHALL set the Arc_Camera target to the computed Avatar world position plus the stored target offset, and set the Arc_Camera alpha, beta, and radius to the stored values
6. WHEN the world is saved, THE Spawner_Manager SHALL persist the stored relative transforms without recomputation, so that moving or rotating the Spawner_Mesh in the editor automatically results in correct world positions when the relative transforms are applied against the updated Spawner_Mesh world matrix on next load
7. IF the Spawner_Mesh has non-uniform scale applied, THEN THE Spawner_Manager SHALL apply the scale factor to the stored relative position offset during world-space reconstruction but SHALL NOT modify the stored Avatar rotation

### Requirement 4: Multiple Spawner Support

**User Story:** As a world builder, I want to create multiple spawners in a scene, so that players can start at different locations for variety.

#### Acceptance Criteria

1. THE Spawner_Manager SHALL support creating and storing multiple Spawner objects in a single scene
2. WHEN a new Spawner is created and other Spawner objects already exist in the scene, THE Spawner_Manager SHALL preserve all existing Spawner objects and their stored data unchanged
3. WHEN a Spawner_Mesh is deleted from the scene, THE Spawner_Manager SHALL remove the corresponding Spawner object from its internal collection within the same frame, leaving all remaining Spawner objects and their data unchanged
4. THE Spawner_Manager SHALL detect Spawner_Mesh deletion by subscribing to the BabylonJS mesh onDispose observable
5. WHEN a Spawner_Mesh is deleted and it is the last Spawner in the scene, THE Spawner_Manager SHALL result in an empty spawner collection

### Requirement 5: Spawner Serialization

**User Story:** As a world builder, I want spawners to be saved and loaded with the world, so that spawn points persist across sessions.

#### Acceptance Criteria

1. WHEN the world is saved, THE Spawner_Manager SHALL serialize all Spawner objects as an array property on VishvaSerialized
2. WHEN the world is saved, THE Spawner_Mesh for each Spawner SHALL be serialized as part of the standard BabylonJS scene serialization
3. WHEN a world is loaded, THE Spawner_Manager SHALL deserialize all Spawner objects from the spawner array in VishvaSerialized
4. WHEN a world is loaded, THE Spawner_Manager SHALL re-associate each deserialized Spawner with its corresponding Spawner_Mesh by looking up the stored mesh ID in the loaded scene
5. THE Spawner serialization format SHALL include the spawner mesh ID, relative avatar position, relative avatar rotation, and relative camera parameters (alpha, beta, radius, target offset from avatar)
6. IF a deserialized Spawner references a mesh ID that does not exist in the loaded scene, THEN THE Spawner_Manager SHALL discard that Spawner object and log a warning to the console

### Requirement 6: Spawner Application on Scene Load

**User Story:** As a player, I want to be positioned at a spawner location when a scene loads, so that I have a consistent and intentional starting experience.

#### Acceptance Criteria

1. WHEN a world is loaded and one Spawner exists, THE Spawner_Manager SHALL compute the Avatar world position from the Spawner_Mesh transform combined with the stored relative avatar position and apply it to the Avatar mesh and CharacterController
2. WHEN a world is loaded and one Spawner exists, THE Spawner_Manager SHALL compute the Avatar world rotation from the Spawner_Mesh transform combined with the stored relative avatar rotation and apply it to the Avatar mesh
3. WHEN a world is loaded and one Spawner exists, THE Spawner_Manager SHALL configure the Arc_Camera alpha, beta, and radius using the stored relative camera parameters and set the Arc_Camera target to the computed Avatar world position
4. WHEN a world is loaded and multiple Spawner objects exist, THE Spawner_Manager SHALL select one Spawner using uniform random selection and apply its position, rotation, and camera transforms as specified in criteria 1 through 3
5. WHEN a world is loaded and no Spawner objects exist, THE Spawner_Manager SHALL position the Avatar at coordinates (0, 0.2, 0) using the existing default spawn behavior
6. WHEN a world is loaded, THE Spawner_Manager SHALL apply the spawner transforms only after both the scene meshes and VishvaSerialized data have been fully loaded, parsed, and the Avatar and CharacterController have been initialized
7. IF a Spawner references a Spawner_Mesh that does not exist in the loaded scene, THEN THE Spawner_Manager SHALL discard that Spawner and select from the remaining valid Spawners, or fall back to default spawn behavior if none remain

### Requirement 8: Camera Focus Guard

**User Story:** As a world builder, I want spawner creation and update to be blocked when the camera is not focused on the avatar, so that the spawner always captures the correct avatar-relative transforms.

#### Acceptance Criteria

1. WHEN the spawner button is clicked and the camera is not focused on the avatar (isFocusOnAv is false), THE Spawner_Manager SHALL NOT create a new Spawner and SHALL NOT update an existing Spawner
2. WHEN the spawner button is clicked and the camera is not focused on the avatar, THE system SHALL display an alert dialog informing the user to press Escape to switch focus back to the avatar before creating a spawner
3. WHEN the camera is focused on the avatar (isFocusOnAv is true), THE spawner creation and update operations SHALL proceed normally as specified in Requirement 1

### Requirement 7: Removal of Legacy Spawn Point System

**User Story:** As a developer, I want the old spawnPoint system removed, so that the codebase has a single clear spawn mechanism.

#### Acceptance Criteria

1. THE Spawner_Manager SHALL replace the existing spawnPointId field in ObjectIdMap as the sole spawn mechanism
2. WHEN a world containing a legacy spawnPointId is loaded, THE Spawner_Manager SHALL ignore the legacy spawnPointId if Spawner objects are present in VishvaSerialized
3. WHEN a world containing a legacy spawnPointId is loaded and no Spawner objects are present, THE Spawner_Manager SHALL use the legacy spawn point position as a fallback for backward compatibility
4. THE legacy spawnPoint tag-based search logic SHALL be removed from SaveManager serialization code once the Spawner system is active
