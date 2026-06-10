# Requirements Document

## Introduction

Smart Asset Placement replaces the current fixed "in front of avatar" positioning strategy for newly loaded assets. Instead of always placing assets relative to the avatar's forward direction, the system uses camera orientation and user interaction context to determine optimal placement. This produces more intuitive results: assets land where the user is looking or where they explicitly drop them. All placed assets are rotated to face the camera for immediate visual feedback.

## Glossary

- **Placement_System**: The subsystem within LoadManager responsible for computing the world-space position and orientation where a newly loaded asset is placed in the scene.
- **Camera**: The active ArcRotateCamera used as the third-person camera orbiting the avatar.
- **Avatar**: The controllable character mesh managed by AvManager and CharacterController.
- **Ground**: The mesh tagged as "Vishva.ground" that represents the walkable surface in the scene.
- **Camera_Direction**: The normalized forward direction obtained from `camera.getForwardRay().direction`.
- **Avatar_Focus**: The existing `isFocusOnAv` boolean maintained by Vishva, which is true when the camera is orbiting the avatar and false when focus has been moved to another mesh or to free-look mode.
- **Ground_Ray**: A ray cast from the Camera position in the Camera_Direction, tested for intersection with the Ground mesh.
- **Pick_Point**: The world-space coordinate where a cursor-based ray intersects the Ground mesh during a drag-and-drop operation.
- **Fallback_Position**: A position computed in front of the Camera such that the entire asset bounding box is visible, used when the Ground is not visible, not intersected, or too far away.
- **Asset_Dialog_Load**: An asset load triggered by clicking an asset thumbnail in the internal asset browser (InternalAssetsUI) or curated asset dialog.
- **Drag_Drop_Load**: An asset load triggered by dragging and dropping an asset thumbnail from the asset dialog onto the canvas, or by dragging and dropping a file from outside the browser onto the canvas.
- **Far_Ground**: A condition where the ground intersection distance exceeds 5× the asset's bounding box height, indicating the ground is too far for useful placement.

## Requirements

### Requirement 1: Camera-Direction Placement When Avatar Is In Focus

**User Story:** As a scene editor, I want newly loaded assets to appear in the direction the camera is pointing (relative to the avatar) and face toward me, so that assets land where I am looking and I can immediately see their front face.

#### Acceptance Criteria

1. WHILE the Camera is in Avatar_Focus state, WHEN an Asset_Dialog_Load occurs, THE Placement_System SHALL compute a placement direction by projecting the Camera's forward vector onto the horizontal (XZ) plane and normalizing it, then determine the placement point at a distance of 2 metres from the Avatar position along that projected direction.
2. WHILE the Camera is in Avatar_Focus state, WHEN an Asset_Dialog_Load occurs, THE Placement_System SHALL position the asset so that its bounding-box corner closest to the Avatar (determined by the horizontal quadrant of the placement direction) is placed at the computed placement point, with the asset's lowest bounding-box Y coordinate aligned to the Ground elevation (Y coordinate of the Avatar position) at that location.
3. WHILE the Camera is in Avatar_Focus state, WHEN the Camera's forward vector projected onto the horizontal plane points from the Avatar toward the Camera (i.e., the camera is behind the Avatar looking toward it), THE Placement_System SHALL reverse the projected direction so that the asset is placed in front of the Avatar (on the far side from the Camera) along that reversed direction at the same 2-metre offset.
4. IF the Camera's forward vector is vertical (perpendicular to the XZ plane) such that the horizontal projection has a magnitude less than 0.001, THEN THE Placement_System SHALL fall back to placing the asset using the Avatar's world-space forward direction at the same 2-metre offset.
5. WHEN a camera-direction placement is computed, THE Placement_System SHALL rotate the asset around the Y-axis so that its forward face points toward the Camera position in the XZ plane.

### Requirement 2: Ground Ray-Cast Placement When Avatar Is Not In Focus

**User Story:** As a scene editor, I want assets to be placed where the camera ray hits the ground when I am not focused on the avatar, so that I can place assets at nearby ground locations without moving the avatar.

#### Acceptance Criteria

1. WHILE the Camera is not in Avatar_Focus state, WHEN an Asset_Dialog_Load occurs, THE Placement_System SHALL cast a Ground_Ray from the Camera position in the Camera_Direction toward the Ground mesh, with a maximum ray distance of 100 units.
2. WHILE the Camera is not in Avatar_Focus state, WHEN the Ground_Ray intersects the Ground mesh and the intersection distance is at most 5 times the asset's bounding box height, THE Placement_System SHALL place the asset at the closest intersection point with the asset's lowest bounding-box point resting on the Ground surface and SHALL rotate the asset to face the Camera.
3. WHILE the Camera is not in Avatar_Focus state, IF the Ground_Ray does not intersect the Ground mesh, the Ground mesh is not present in the scene, or the intersection distance exceeds 5 times the asset's bounding box height (Far_Ground condition), THEN THE Placement_System SHALL place the asset at the Fallback_Position in front of the Camera.

### Requirement 3: Drag-and-Drop Cursor Placement

**User Story:** As a scene editor, I want dragged-and-dropped assets to appear exactly where my cursor is pointing on the ground and face toward me, so that I can precisely place assets by dropping them at the desired location.

#### Acceptance Criteria

1. WHEN a Drag_Drop_Load occurs and the cursor Pick_Point intersects the Ground mesh, THE Placement_System SHALL place the asset at the Pick_Point with the asset's lowest bounding-box point (minimum Y of the hierarchy bounding vectors) resting on the Ground surface at the picked coordinates, and SHALL rotate the asset to face the Camera.
2. WHEN a Drag_Drop_Load occurs and the cursor Pick_Point does not intersect the Ground mesh, THE Placement_System SHALL place the asset at the Fallback_Position in front of the active Camera.
3. WHEN a Drag_Drop_Load occurs from outside the browser (file drop), THE Placement_System SHALL use the drop event clientX and clientY coordinates (converted to canvas-relative coordinates) to compute the cursor Pick_Point via scene picking before applying placement rule 1 or 2.
4. WHEN a Drag_Drop_Load occurs from the InternalAssetsUI dialog (thumbnail drag), THE Placement_System SHALL use the drop event clientX and clientY coordinates to compute the cursor Pick_Point via scene picking, load the asset as if it were clicked in the dialog, and apply cursor placement at the drop location.
5. IF the Ground mesh is not present in the scene when a Drag_Drop_Load occurs, THEN THE Placement_System SHALL place the asset at the Fallback_Position.

### Requirement 4: Fallback Position Computation

**User Story:** As a scene editor, I want a consistent fallback placement when the ground is not visible or too far, so that assets are always placed fully visible in front of the camera without filling the entire screen.

#### Acceptance Criteria

1. THE Placement_System SHALL compute the Fallback_Position as a point along the Camera_Direction from the Camera position at a distance determined by the asset's bounding box dimensions.
2. THE Placement_System SHALL compute the fallback distance as the maximum of (a) 2 units and (b) the largest dimension (width, height, or depth) of the asset's bounding box multiplied by 1.25, ensuring the full asset is visible with 25% padding.
3. WHEN the Fallback_Position is used, THE Placement_System SHALL center the asset vertically in the camera view by offsetting the Y position so the bounding box center Y aligns with the camera ray at the fallback distance.
4. WHEN the Fallback_Position is used, THE Placement_System SHALL orient the asset by rotating it around the Y-axis so that the asset's forward face points toward the Camera position.

### Requirement 5: Asset Bounding Box Alignment

**User Story:** As a scene editor, I want placed assets to sit correctly on the ground surface regardless of their bounding box origin, so that assets do not float or sink into the ground.

#### Acceptance Criteria

1. WHEN placing an asset on the Ground, THE Placement_System SHALL compute the asset's hierarchy bounding box after all scaling has been applied, then adjust the asset's vertical position so that the bounding box minimum Y value aligns with the Ground surface Y coordinate at the placement point.
2. WHEN placing an asset at the Fallback_Position, THE Placement_System SHALL center the asset vertically as specified in Requirement 4.3 rather than using ground alignment.
3. THE Placement_System SHALL compute the hierarchy bounding box after scaling is applied to the asset so that the bounding box reflects the asset's final visual extents, including non-uniform scaling across axes.
4. IF the asset's hierarchy bounding box has zero vertical extent (minimum Y equals maximum Y), THEN THE Placement_System SHALL place the asset's transform origin at the Ground surface elevation at the placement point.

### Requirement 6: Face-Camera Orientation

**User Story:** As a scene editor, I want all newly placed assets to face toward the camera so that I immediately see their front face without needing to manually rotate them.

#### Acceptance Criteria

1. WHEN any placement mode (camera-direction, ground-raycast, cursor, or fallback) computes a final position, THE Placement_System SHALL compute a Y-axis rotation using `atan2(cameraX - assetX, cameraZ - assetZ)` so the asset's forward face (-Z local axis) points toward the Camera in the XZ plane.
2. THE Placement_System SHALL apply the computed Y rotation to the asset's rootMesh rotation.
