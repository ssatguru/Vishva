# Requirements Document

## Introduction

This feature extends the **Change Skeleton** operation in Vishva's Animation tab to support animation-group (AG) driven skeletons, in addition to the existing animation-range (AR) driven skeleton support. When the user selects a replacement skeleton from the list and clicks "Switch To", the system must detect which animation-driving mode both skeletons use, reject mismatched swaps, and execute the correct swap logic for each matching pair (AR+AR or AG+AG).

## Glossary

- **Skeleton**: A BabylonJS `Skeleton` object associated with one or more meshes in the scene. Controls mesh deformation via bones.
- **AR-driven Skeleton**: A skeleton whose bones carry keyframe animation data directly (`bone.animations`), played via `AnimationRange`. No bone has a linked `TransformNode`.
- **AG-driven Skeleton**: A skeleton whose animation is driven by `AnimationGroup` objects targeting `TransformNode` nodes linked to bones (`bone.getLinkedTransformNode() != null`). At least one bone has a linked `TransformNode`.
- **Current Skeleton**: The skeleton currently assigned to the selected mesh (or to child meshes of the selected `TransformNode`). Resolved by inspecting the `.skeleton` property of the selected node (if it is an `AbstractMesh`) or its first child `AbstractMesh` (if it is a plain `TransformNode`).
- **Replacement Skeleton**: The skeleton chosen from the skeleton list in the Animation tab UI to swap in.
- **Host Mesh**: The first `AbstractMesh` in `scene.meshes` whose `.skeleton` property references the given skeleton.
- **SkeletonChangeSystem**: The subsystem comprising `Vishva.changeSkeleton()` and the `AnimUtils.isAGDrivenSkeleton()` helper responsible for executing skeleton swaps.
- **AnimUtils**: The utility class in `src/util/AnimUtils.ts` providing static helper methods for animation-related queries.
- **TransformNode**: A BabylonJS `TransformNode` that can be a parent or container for child meshes. May be the selected node when an AG-driven character is selected.

---

## Requirements

### Requirement 1: AG-Driven Skeleton Detection

**User Story:** As a developer working in Vishva, I want the system to reliably detect whether a skeleton is AR-driven or AG-driven, so that the correct swap logic can be applied.

#### Acceptance Criteria

1. THE `AnimUtils` SHALL expose a static method `isAGDrivenSkeleton(skel: Skeleton): boolean` that returns `true` if any bone in the skeleton has a non-null linked `TransformNode` (i.e., `bone.getLinkedTransformNode() != null`), and `false` otherwise.
2. IF `skel` is `null` or `undefined`, THEN `AnimUtils.isAGDrivenSkeleton` SHALL return `false`.
3. IF `skel.bones` is `null`, `undefined`, or an empty array, THEN `AnimUtils.isAGDrivenSkeleton` SHALL return `false`.
4. IF at least one bone in `skel.bones` has `bone.getLinkedTransformNode() != null`, THEN `AnimUtils.isAGDrivenSkeleton` SHALL return `true`, regardless of the state of any other bones.
5. IF all bones in `skel.bones` have `bone.getLinkedTransformNode() == null`, THEN `AnimUtils.isAGDrivenSkeleton` SHALL return `false`.

---

### Requirement 2: Type-Mismatch Guard

**User Story:** As a scene editor user, I want the system to reject skeleton swaps between incompatible types (AR vs AG), so that my characters are not left in a broken animated state.

#### Acceptance Criteria

1. WHEN the user initiates a skeleton change, IF the current skeleton cannot be resolved (e.g. the selected node has no skeleton and no child `AbstractMesh` with a skeleton), THEN THE `SkeletonChangeSystem` SHALL return `false` without modifying any mesh skeletons, transform-node parents, or scene node lists.
2. WHEN the user initiates a skeleton change and the replacement skeleton uniqueId does not correspond to any skeleton in the scene, THE `SkeletonChangeSystem` SHALL return `false` without modifying any mesh skeletons, transform-node parents, or scene node lists.
3. WHEN the user initiates a skeleton change and the current skeleton is AR-driven while the replacement skeleton is AG-driven, THE `SkeletonChangeSystem` SHALL return `false` and SHALL NOT modify any mesh skeletons, transform-node parents, or scene node lists.
4. WHEN the user initiates a skeleton change and the current skeleton is AG-driven while the replacement skeleton is AR-driven, THE `SkeletonChangeSystem` SHALL return `false` and SHALL NOT modify any mesh skeletons, transform-node parents, or scene node lists.
5. WHEN the user initiates a skeleton change and both skeletons are AR-driven, THE `SkeletonChangeSystem` SHALL proceed with the AR-to-AR swap logic (Requirement 3).
6. WHEN the user initiates a skeleton change and both skeletons are AG-driven, THE `SkeletonChangeSystem` SHALL proceed with the appropriate AG-to-AG swap logic (Requirement 4 or 5, depending on the selected node type).

---

### Requirement 3: AR-to-AR Skeleton Swap (Existing Behaviour, Preserved)

**User Story:** As a scene editor user, I want to swap AR-driven skeletons on a selected mesh, so that the character uses a different set of animation ranges without breaking existing behaviour.

#### Acceptance Criteria

1. WHEN both the current skeleton and the replacement skeleton are AR-driven, THE `SkeletonChangeSystem` SHALL reassign the selected `AbstractMesh`'s `.skeleton` property to the replacement skeleton, leaving the original skeleton present and unmodified in the scene.
2. WHEN the AR-to-AR swap completes successfully, THE `SkeletonChangeSystem` SHALL return `true`.
3. IF the selected node is not an `AbstractMesh` instance, THEN THE `SkeletonChangeSystem` SHALL return `false`, and the selected node's type, its children's `.skeleton` values, and scene node lists SHALL remain unchanged.
4. IF `getSkeletonByUniqueId` returns `null` for the given uniqueId, THEN THE `SkeletonChangeSystem` SHALL return `false` without modifying any mesh skeletons or scene node lists.

---

### Requirement 4: AG-to-AG Skeleton Swap — TransformNode Selected Mesh

**User Story:** As a scene editor user, I want to swap AG-driven skeletons when the selected node is a root `TransformNode`, so that the character's visual meshes are re-parented to the replacement character's hierarchy.

#### Acceptance Criteria

1. WHEN both skeletons are AG-driven AND the selected node is a `TransformNode` that is NOT an `instanceof Mesh`, THE `SkeletonChangeSystem` SHALL collect all descendants (direct and indirect children) of the selected `TransformNode` that are `instanceof Mesh`.
2. IF the selected `TransformNode` has no `Mesh` descendants, THEN THE `SkeletonChangeSystem` SHALL return `false` without modifying any mesh skeletons, transform-node parents, or scene node lists.
3. WHEN processing an AG-to-AG swap in the `TransformNode` case, FOR EACH descendant `Mesh` (regardless of its current `.skeleton` value), THE `SkeletonChangeSystem` SHALL reassign that mesh's `.skeleton` property to the replacement skeleton.
4. WHEN processing an AG-to-AG swap in the `TransformNode` case, FOR EACH descendant `Mesh`, THE `SkeletonChangeSystem` SHALL re-parent that mesh under the replacement skeleton's host mesh by setting its `.parent` to the host mesh, preserving the mesh's existing local (relative) transform without decomposing or recomputing world-space coordinates.
5. WHEN all descendant meshes have been reassigned and re-parented, THE `SkeletonChangeSystem` SHALL dispose the original `TransformNode` (including any remaining non-mesh children) and remove it from the scene.
6. WHEN all descendant meshes have been reassigned and re-parented, THE `SkeletonChangeSystem` SHALL dispose the skeleton that was previously assigned to those child meshes (the current skeleton) and remove it from the scene.
7. WHEN the AG-to-AG swap in the `TransformNode` case completes successfully, THE `SkeletonChangeSystem` SHALL return `true`.

---

### Requirement 5: AG-to-AG Skeleton Swap — Mesh Selected Node

**User Story:** As a scene editor user, I want to swap AG-driven skeletons when the selected node is already a `Mesh` (e.g. an `InstancedMesh` or plain `Mesh`), so that the mesh adopts the replacement skeleton without deleting any scene nodes.

#### Acceptance Criteria

1. WHEN both skeletons are AG-driven AND the selected node is an `instanceof Mesh`, THE `SkeletonChangeSystem` SHALL reassign the selected mesh's `.skeleton` property to the replacement skeleton.
2. WHEN both skeletons are AG-driven AND the selected node is an `instanceof Mesh`, THE `SkeletonChangeSystem` SHALL re-parent the selected mesh under the replacement skeleton's host mesh by setting its `.parent` to the host mesh, preserving the mesh's existing local (relative) transform without decomposing or recomputing world-space coordinates.
3. IF the replacement skeleton's host mesh cannot be resolved (Requirement 6, criterion 2), THEN THE `SkeletonChangeSystem` SHALL return `false` before reassigning `.skeleton` or changing any `.parent` reference.
4. IF both skeletons are AG-driven AND the selected node is an `instanceof Mesh` AND the swap succeeds, THEN no `TransformNode` SHALL be disposed or removed from the scene as a result of this operation.
5. IF both skeletons are AG-driven AND the selected node is an `instanceof Mesh` AND the swap succeeds, THEN no `Skeleton` SHALL be disposed or removed from the scene as a result of this operation.
6. WHEN the AG-to-AG swap in the `Mesh` case completes successfully, THE `SkeletonChangeSystem` SHALL return `true`.

---

### Requirement 6: Replacement Skeleton Host Mesh Resolution

**User Story:** As a developer, I want the system to reliably find the host mesh for the replacement skeleton, so that child meshes can be correctly re-parented during an AG swap.

#### Acceptance Criteria

1. WHEN an AG-to-AG skeleton swap is initiated, THE `SkeletonChangeSystem` SHALL determine the replacement skeleton's host mesh by finding the first `AbstractMesh` in `scene.meshes` whose `.skeleton` property strictly references the replacement skeleton object.
2. IF no `AbstractMesh` in `scene.meshes` has a `.skeleton` property that references the replacement skeleton, THEN THE `SkeletonChangeSystem` SHALL return `false` before making any scene modifications, and SHALL NOT modify any mesh skeletons, transform-node parents, or scene node lists.
