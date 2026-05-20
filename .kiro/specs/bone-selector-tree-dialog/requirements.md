# Requirements Document

## Introduction

Replace the current "show bone selector" button behavior (which displays spheres at all bone locations simultaneously) with a VTreeDialog that shows the skeleton's bone hierarchy as a tree. Clicking a bone in the tree creates a single sphere at that bone's location. Clicking a different bone moves the sphere to the new location. This provides a cleaner, more precise bone selection workflow for attaching items to bones.

## Glossary

- **Bone_Selector_Dialog**: A VTreeDialog instance that displays the skeleton bone hierarchy as an interactive tree
- **Bone_Marker**: A single sphere mesh positioned at a selected bone's world-space location, used to visually indicate which bone is currently selected
- **Skeleton_Tree**: The hierarchical representation of a skeleton's bones, where parent bones contain child bones as nested nodes
- **AnimationUI**: The UI controller class that manages the Skeletons & Animations section of the props panel

## Requirements

### Requirement 1: Open Bone Selector Dialog

**User Story:** As a user, I want to click the "show bone selector" button and see a tree dialog showing the skeleton's bone hierarchy, so that I can browse and select individual bones by name.

#### Acceptance Criteria

1. WHEN the "show bone selector" button is clicked, THE AnimationUI SHALL open a Bone_Selector_Dialog displaying the Skeleton_Tree of the currently selected mesh's skeleton, where the Skeleton_Tree is a hierarchical representation with each bone shown as a node labeled by its bone name
2. THE Bone_Selector_Dialog SHALL display bones in their parent-child hierarchy matching the skeleton's bone structure, where root bones appear as top-level nodes and child bones are nested under their respective parent bone nodes
3. WHILE the currently selected mesh has no skeleton, THE AnimationUI SHALL hide the "show bone selector" button
4. WHEN the Bone_Selector_Dialog is already open and the "show bone selector" button is clicked again, THE AnimationUI SHALL close the Bone_Selector_Dialog
5. IF the skeleton contains zero bones, THEN THE Bone_Selector_Dialog SHALL display an empty tree with no bone nodes

### Requirement 2: Build Skeleton Tree Data

**User Story:** As a user, I want the bone tree to accurately reflect the skeleton's hierarchy, so that I can understand the bone structure and find the bone I need.

#### Acceptance Criteria

1. THE Bone_Selector_Dialog SHALL represent each bone as a node displaying the bone's name as provided by the skeleton data
2. THE Bone_Selector_Dialog SHALL nest child bones under their parent bone nodes in the tree, preserving the skeleton's native bone ordering among siblings
3. THE Bone_Selector_Dialog SHALL display root bones (bones with no parent) as top-level nodes
4. WHEN a skeleton has multiple root bones, THE Bone_Selector_Dialog SHALL display all root bones as top-level nodes
5. IF the skeleton contains zero bones, THEN THE Bone_Selector_Dialog SHALL display an empty tree with no nodes
6. WHEN the tree is first built, THE Bone_Selector_Dialog SHALL display the tree in a collapsed state with only root-level nodes visible

### Requirement 3: Create Bone Marker on Selection

**User Story:** As a user, I want to click a bone in the tree and see a sphere appear at that bone's location in the 3D scene, so that I can visually confirm which bone I selected.

#### Acceptance Criteria

1. WHEN a leaf bone is clicked in the Bone_Selector_Dialog, THE AnimationUI SHALL create a single Bone_Marker sphere mesh with a diameter of 0.05 scene units, attached to that bone's position on the skeleton's linked mesh
2. WHEN a non-leaf bone (folder node) text is clicked in the Bone_Selector_Dialog, THE AnimationUI SHALL create a single Bone_Marker sphere mesh with a diameter of 0.05 scene units, attached to that bone's position on the skeleton's linked mesh
3. IF a Bone_Marker already exists from a previous bone selection, THEN THE AnimationUI SHALL remove the previous Bone_Marker before creating the new one, so that at most one Bone_Marker is visible at any time
4. THE Bone_Marker SHALL be rendered at the selected bone's world-space position and SHALL be visually distinct from scene meshes by using a solid emissive color unaffected by scene lighting
5. WHILE the skeleton's linked mesh is animated or transformed, THE Bone_Marker SHALL remain attached to the selected bone and update its position each frame to match the bone's current world-space position

### Requirement 4: Move Bone Marker on Subsequent Selection

**User Story:** As a user, I want the sphere to move to a new bone when I click a different bone in the tree, so that only one bone is highlighted at a time.

#### Acceptance Criteria

1. WHEN a bone is clicked in the Bone_Selector_Dialog and a Bone_Marker already exists attached to a different bone, THE AnimationUI SHALL detach the existing Bone_Marker from the previous bone and attach it to the newly selected bone
2. THE AnimationUI SHALL display at most one Bone_Marker at any time
3. WHEN the Bone_Marker is moved to a new bone, THE Bone_Marker SHALL appear at the new bone's world-space location within the same render frame as the attachment
4. IF the same bone that already has the Bone_Marker attached is clicked again, THEN THE AnimationUI SHALL keep the existing Bone_Marker in place without creating or disposing any mesh

### Requirement 5: Clean Up Bone Marker on Dialog Close

**User Story:** As a user, I want the bone marker sphere to be removed when I close the dialog, so that it does not clutter the scene.

#### Acceptance Criteria

1. WHEN the Bone_Selector_Dialog is closed, THE AnimationUI SHALL dispose of the Bone_Marker mesh and set its internal Bone_Marker reference to null
2. IF no Bone_Marker exists when the Bone_Selector_Dialog is closed, THEN THE AnimationUI SHALL take no action regarding marker cleanup
3. WHEN a different mesh is selected in the scene, THE AnimationUI SHALL dispose of any existing Bone_Marker, set its internal reference to null, and close the Bone_Selector_Dialog
4. WHEN the Bone_Selector_Dialog is closed and reopened, THE AnimationUI SHALL display no Bone_Marker until the user clicks a bone in the tree

### Requirement 6: Remove Hide Bone Selector Button

**User Story:** As a user, I no longer need a separate "hide bone selector" button since the dialog toggle and close handle cleanup.

#### Acceptance Criteria

1. THE AnimationUI SHALL NOT render a "hide bone selector" button in the Skeleton section of the props panel
2. THE AnimationUI SHALL render a "show bone selector" button in the Skeleton section of the props panel
3. WHEN the user clicks the "show bone selector" button, THE AnimationUI SHALL open the Bone Selector Dialog

### Requirement 7: Lock Mesh Selection While Dialog Open

**User Story:** As a user, I want the current mesh selection to remain locked while the bone selector dialog is open, so that I do not accidentally select a different mesh or deselect the current mesh while browsing bones.

#### Acceptance Criteria

1. WHILE the Bone_Selector_Dialog is open, THE AnimationUI SHALL prevent selection of any other mesh in the 3D scene when the user clicks on a different mesh
2. WHILE the Bone_Selector_Dialog is open, THE AnimationUI SHALL prevent deselection of the currently selected mesh when the user clicks on empty space in the 3D scene
3. WHEN the Bone_Selector_Dialog is closed, THE AnimationUI SHALL release the mesh selection lock so that normal mesh selection and deselection behavior resumes
