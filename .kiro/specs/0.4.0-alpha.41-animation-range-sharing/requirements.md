# Requirements Document

## Introduction

This document specifies the requirements for the Animation Range Sharing feature. When multiple characters of the same type exist in a scene and use animation ranges (skeleton-based animation, as opposed to animation groups), each character's skeleton carries its own copy of the bone Animation objects containing identical keyframe data. This is redundant and bloats both runtime memory and save files. This feature implements a metadata-based sharing system — mirroring the existing animation group sharing pattern — with four phases: runtime deduplication (sharing Animation object references between duplicate skeletons' bones), save-time stripping (removing bone animation data and ranges from sharing characters' serialized skeletons), load-time restoration (copying Animation objects from the source skeleton's bones to sharing skeletons by reference and recreating animation ranges), and metadata persistence (storing skeleton sharing relationships in VishvaSerialized). The result is reduced memory usage at runtime and smaller save files for scenes with multiple animation-range-based characters of the same type.

## Glossary

- **Animation_Range**: A named frame range stored on a Skeleton, defined by `{name, from, to}`, referencing a segment of the bone animations timeline — accessed via `skeleton.getAnimationRanges()` and played via `skeleton.beginAnimation(name, loop, rate)`
- **Bone_Animation**: A BabylonJS `Animation` object stored in `skeleton.bones[i].animations[]` containing keyframe data for a single bone — the actual animation data that can be shared by reference
- **Skeleton**: A BabylonJS `Skeleton` object that owns bones, bone animations, and animation ranges — the container for animation-range-based character animation
- **Bone**: A BabylonJS `Bone` object within a Skeleton, each having an `animations` array of Animation objects
- **Duplicate_Skeletons**: Two Skeletons whose bone animations are equivalent — they have the same set of bone names, and for each bone name the same set of animation names with identical keyframe data
- **Source_Character**: The character instance whose skeleton's bone animations are treated as canonical — its skeleton data is preserved during save-time stripping and used as the basis for restoration
- **Sharing_Character**: A character instance whose skeleton's bone animations are duplicates of the Source_Character's — its bone animation data and ranges are stripped at save time and restored at load time
- **AnimRangeSharing_Metadata**: A serialized entry recording that a Sharing_Character's skeleton shares bone animations with a Source_Character's skeleton
- **AnimRangeSharingEntry**: A data structure with `skeletonId` (Sharing_Character's skeleton ID) and `sourceSkeletonId` (Source_Character's skeleton ID)
- **Runtime_Deduplication**: The process of detecting skeletons with duplicate bone animations and replacing their Bone_Animation references with shared references from the Source_Character's skeleton bones
- **Save_Time_Stripping**: The process of removing bone animation arrays and animation ranges from Sharing_Characters' serialized skeletons, using the sharing metadata to identify them
- **Load_Time_Restoration**: The process of copying Bone_Animation references from the Source_Character's skeleton bones to the Sharing_Character's skeleton bones (by reference, not deep-copied) and recreating Animation_Ranges
- **AnimRangeDedup_Module**: The new utility module (`src/util/AnimRangeDedup.ts`) containing functions for skeleton duplicate detection, runtime deduplication, save-time stripping, and load-time restoration
- **Serialized_Skeleton**: A JSON object within the serialized scene's `skeletons[]` array, containing `bones[]` (each with an `animation` field) and `ranges[]`
- **Serialized_Scene**: The JSON object produced by `SceneSerializer.Serialize()` representing the full scene state
- **SaveManager**: The existing manager responsible for packaging and saving world data
- **LoadManager**: The existing manager responsible for loading and deserializing world data
- **Character_Controller**: The `CharacterController` instance (from `babylonjs-charactercontroller`) that drives avatar or mesh-based character movement and animation via `skeleton.beginAnimation()`
- **RuntimeRangeSharingEntry**: A runtime data structure holding Skeleton references (not string IDs) for immunity to ID renames — resolved to string IDs at save time
- **VishvaSerialized**: The Vishva-specific metadata object persisted alongside the BabylonJS scene serialization

## Requirements

### Requirement 1: Skeleton Duplicate Detection Logic

**User Story:** As a developer, I want a reliable mechanism to determine whether two skeletons have duplicate bone animations, so that runtime deduplication and sharing metadata can be established correctly.

#### Acceptance Criteria

1. WHEN comparing two Skeletons, THE AnimRangeDedup_Module SHALL consider them duplicates if and only if they have the same set of bone names AND for each bone name the same set of animation names (derived from `bone.animations[i].name`)
2. WHEN comparing bone animation sets, THE AnimRangeDedup_Module SHALL perform order-independent comparison of bone names and animation names within each bone, treating multiple animations with the same name on a single bone as a single entry in the set
3. WHEN two Skeletons have different bone names, THE AnimRangeDedup_Module SHALL NOT consider them duplicates
4. WHEN two Skeletons have the same bone names but different animation names on any bone, THE AnimRangeDedup_Module SHALL NOT consider them duplicates
5. WHEN comparing bone names and animation names, THE AnimRangeDedup_Module SHALL use exact case-sensitive string matching with no trimming or normalization
6. WHEN a Skeleton has no bone animations (empty or missing animations arrays on all bones), THE AnimRangeDedup_Module SHALL treat it as having an empty animation signature and NOT consider it a candidate for sharing
7. WHEN a Skeleton has at least one bone with a non-empty animations array, THE AnimRangeDedup_Module SHALL treat it as a candidate for sharing and include bones with empty animations arrays in the comparison (those bones contribute zero animation names to their set)

### Requirement 2: Runtime Deduplication

**User Story:** As a developer, I want duplicate skeletons detected at runtime and their bone Animation objects shared by reference, so that memory usage is reduced regardless of how the scene was loaded.

#### Acceptance Criteria

1. WHEN Runtime_Deduplication is applied to a scene, THE AnimRangeDedup_Module SHALL identify sets of Duplicate_Skeletons among skeletons that are NOT driven by animation groups (i.e., skeletons used with animation ranges)
2. WHEN a set of Duplicate_Skeletons is identified, THE AnimRangeDedup_Module SHALL designate the first skeleton in scene order (lowest index in `scene.skeletons`) as the Source_Character's skeleton and all remaining skeletons in the set as Sharing_Characters' skeletons
3. WHEN duplicate skeletons are identified, THE AnimRangeDedup_Module SHALL replace Bone_Animation references in Sharing_Characters' skeleton bones with the corresponding Bone_Animation objects from the Source_Character's skeleton (matched by bone name and animation name)
4. IF a Bone_Animation in a Sharing_Character's skeleton has no matching animation name in the corresponding bone of the Source_Character's skeleton, THEN THE AnimRangeDedup_Module SHALL skip that Bone_Animation (leaving it unchanged) and log a warning
5. WHEN Runtime_Deduplication completes, THE AnimRangeDedup_Module SHALL NOT remove any Skeleton objects or Animation_Ranges from the scene — only Bone_Animation references are shared
6. WHEN Runtime_Deduplication completes, THE AnimRangeDedup_Module SHALL return the RuntimeRangeSharingEntry array discovered (holding Skeleton references)
7. WHEN a Skeleton is driven by animation groups (its bones' animations are targeted by scene animation groups), THE AnimRangeDedup_Module SHALL exclude it from animation range deduplication

### Requirement 3: Save-Time Stripping

**User Story:** As a world creator, I want bone animation data and ranges stripped from sharing characters' serialized skeletons at save time, so that save files are smaller and do not contain redundant animation data.

#### Acceptance Criteria

1. WHEN SceneSerializer.Serialize produces a Serialized_Scene, THE SaveManager SHALL invoke the AnimRangeDedup_Module to strip bone animation data and ranges from Sharing_Characters' Serialized_Skeletons before the scene object is stringified for saving
2. WHEN stripping a Sharing_Character's Serialized_Skeleton, THE AnimRangeDedup_Module SHALL remove the `animation` field from each bone entry and remove the `ranges` array from the skeleton
3. THE SaveManager SHALL never strip bone animation data or ranges from a Source_Character's Serialized_Skeleton
4. WHEN stripping completes and at least one skeleton was stripped, THE SaveManager SHALL store the AnimRangeSharing_Metadata as `animationRangeSharing` in VishvaSerialized
5. IF the Serialized_Scene has no skeletons array, an empty skeletons array, or the RuntimeRangeSharingEntry array is empty or null, THEN THE AnimRangeDedup_Module SHALL return zero removals without error
6. WHEN stripping completes, THE AnimRangeDedup_Module SHALL return the count of skeletons stripped
7. IF a Sharing_Character's skeleton ID from the RuntimeRangeSharingEntry cannot be matched to any entry in the Serialized_Scene's skeletons array, THEN THE AnimRangeDedup_Module SHALL skip that entry, log a warning, and continue processing remaining entries

### Requirement 4: Load-Time Restoration

**User Story:** As a world creator, I want bone animations and animation ranges restored for sharing characters after loading a deduplicated save, so that all characters have functional skeleton animations.

#### Acceptance Criteria

1. WHEN a saved world containing AnimRangeSharing_Metadata is deserialized, THE System SHALL invoke `restoreSharedSkeletonAnimations` before avatar and Character_Controller setup (i.e., before `AvManager` creation and `CharacterController.start()`)
2. WHEN restoring bone animations for a Sharing_Character's skeleton, THE AnimRangeDedup_Module SHALL assign the `animations` array of each Source_Character skeleton bone to the corresponding bone of the Sharing_Character's skeleton (matched by bone name), replacing any existing animations array on that bone
3. WHEN copying Bone_Animation references, THE AnimRangeDedup_Module SHALL share the Animation objects by reference (not deep-copied), such that `sourceBone.animations[i] === sharingBone.animations[i]` holds true for each copied animation
4. WHEN restoring animation ranges, THE AnimRangeDedup_Module SHALL recreate all Animation_Ranges from the Source_Character's skeleton on the Sharing_Character's skeleton using `skeleton.createAnimationRange(name, from, to)`, overwriting any existing range with the same name
5. IF a bone name from the Source_Character's skeleton cannot be found in the Sharing_Character's skeleton, THEN THE AnimRangeDedup_Module SHALL skip that bone, continue processing remaining bones, and log a warning
6. WHEN restoration completes, THE AnimRangeDedup_Module SHALL return the count of skeletons restored (one per successfully processed AnimRangeSharingEntry where at least one bone was matched)

### Requirement 5: Backward Compatibility

**User Story:** As a world creator, I want legacy saved worlds (created before this feature) to load correctly, so that existing content is not broken by the new sharing system.

#### Acceptance Criteria

1. WHEN loading a saved world whose VishvaSerialized contains no `animationRangeSharing` field or an empty `animationRangeSharing` array, THE System SHALL skip skeleton animation restoration and proceed with the remaining load sequence without error
2. WHEN loading a legacy saved world without `animationRangeSharing`, THE System SHALL apply Runtime_Deduplication so that duplicate skeletons share the same Bone_Animation object references rather than holding independent copies
3. WHEN loading a world saved with stripping applied (VishvaSerialized contains a non-empty `animationRangeSharing` array), THE System SHALL first restore bone animations and ranges for sharing characters, then apply Runtime_Deduplication to share Bone_Animation objects across any remaining duplicates
4. IF an `animationRangeSharing` entry references a `skeletonId` or `sourceSkeletonId` that does not exist in the loaded scene, THEN THE System SHALL skip that entry, log a warning, and continue processing remaining entries without interrupting the load sequence

### Requirement 6: Sharing Metadata Persistence

**User Story:** As a developer, I want sharing relationships persisted in VishvaSerialized, so that save-time stripping and load-time restoration can operate correctly across save/load cycles.

#### Acceptance Criteria

1. THE VishvaSerialized class SHALL include an optional `animationRangeSharing` field of type `AnimRangeSharingEntry[]`, where each entry contains a `skeletonId` (string ID of the sharing character's skeleton) and a `sourceSkeletonId` (string ID of the source character's skeleton)
2. WHEN saving a world with active animation range sharing relationships (i.e., `_animationRangeSharing` contains one or more RuntimeRangeSharingEntry), THE SaveManager SHALL populate `animationRangeSharing` with one entry per sharing character by calling `resolveRuntimeRangeEntries`, which converts each RuntimeRangeSharingEntry's Skeleton references to their current string IDs at save time
3. WHEN loading a world whose VishvaSerialized contains a non-empty `animationRangeSharing` array, THE System SHALL pass the entries to `restoreSharedSkeletonAnimations` to recreate shared bone animations for each sharing character before runtime deduplication runs
4. THE RuntimeRangeSharingEntry SHALL hold Skeleton references (`skeleton: Skeleton` and `sourceSkeleton: Skeleton`) at runtime rather than string IDs, so that sharing metadata remains valid even if skeleton IDs are renamed; conversion to string IDs SHALL occur only at save time via `resolveRuntimeRangeEntries`
5. IF a sharing entry references a `skeletonId` or `sourceSkeletonId` that cannot be found in the scene during load-time restoration, THEN THE System SHALL skip that entry and log a warning, without failing the overall load operation

### Requirement 7: Preservation of Unique Skeletons

**User Story:** As a world creator, I want skeletons that have genuinely different bone animations to never be affected by sharing, so that customized or unique character animations are preserved.

#### Acceptance Criteria

1. THE AnimRangeDedup_Module SHALL never strip bone animations from a Skeleton whose animation signature (set of bone names and per-bone animation names) has no duplicate in the scene
2. THE AnimRangeDedup_Module SHALL never strip bone animations from a Skeleton whose bone names or per-bone animation names differ from all other skeletons in the scene
3. WHEN Runtime_Deduplication is applied, THE AnimRangeDedup_Module SHALL leave the Bone_Animation references unmodified for all Skeletons that do not match the duplicate criteria
4. WHEN Save_Time_Stripping is applied, THE AnimRangeDedup_Module SHALL retain in the serialized scene output all bone animation data and ranges for Skeletons that have no duplicate in the scene

### Requirement 8: Character Controller Compatibility

**User Story:** As a world creator, I want avatar and mesh-based character controllers to continue working after restoration and runtime deduplication, so that characters animate correctly in the loaded world.

#### Acceptance Criteria

1. WHEN Load_Time_Restoration restores bone animations and ranges for Sharing_Characters, THE System SHALL ensure that `skeleton.beginAnimation(name, loop, rate)` works correctly for all restored Animation_Ranges
2. WHEN Runtime_Deduplication shares Bone_Animation objects, THE System SHALL preserve the bone-to-animation bindings such that `skeleton.beginAnimation()` continues to play the correct animation for each range name
3. WHEN restoration and deduplication complete before Character_Controller setup, THE System SHALL ensure that `skeleton.getAnimationRanges()` returns at least 1 AnimationRange and that `skeleton.beginAnimation(name, loop, rate)` starts playback without throwing an error for each range name present on the skeleton
4. WHEN a Character_Controller is initialized on a skeleton that uses AnimationRanges (not AnimationGroups), THE System SHALL ensure that subsequent `CharacterController.start()` finds the correct animation ranges on the skeleton

### Requirement 9: Utility Module Design

**User Story:** As a developer, I want the sharing logic in a standalone utility module, so that the logic is testable in isolation.

#### Acceptance Criteria

1. THE AnimRangeDedup_Module SHALL be located at `src/util/AnimRangeDedup.ts`
2. THE AnimRangeDedup_Module SHALL export `areSkeletonsDuplicates`, `deduplicateRangesAtRuntime`, `stripSharedSkeletonAnimations`, and `restoreSharedSkeletonAnimations` as named exports
3. THE AnimRangeDedup_Module SHALL export `resolveRuntimeRangeEntries` to convert RuntimeRangeSharingEntry array to serializable AnimRangeSharingEntry array at save time
4. THE AnimRangeDedup_Module SHALL export the `AnimRangeSharingEntry` and `RuntimeRangeSharingEntry` interfaces as named type exports
5. THE AnimRangeDedup_Module SHALL implement `areSkeletonsDuplicates` as a pure function with no side effects (no console output, no mutation of inputs)
6. THE AnimRangeDedup_Module SHALL implement `resolveRuntimeRangeEntries` as a pure function that reads `.id` from Skeleton references without mutating them

### Requirement 10: Idempotence

**User Story:** As a developer, I want runtime deduplication to be idempotent, so that applying it multiple times produces the same result as applying it once.

#### Acceptance Criteria

1. WHEN Runtime_Deduplication is applied to a scene where Bone_Animation objects are already shared (same object reference across duplicate skeletons' bones), THE AnimRangeDedup_Module SHALL produce the same RuntimeRangeSharingEntry array with no additional reference replacements
2. WHEN Runtime_Deduplication is applied to a scene with no Duplicate_Skeletons, THE AnimRangeDedup_Module SHALL make no changes to any Bone_Animation references and return an empty array
3. WHEN Runtime_Deduplication is applied twice consecutively to the same scene, THE second invocation SHALL return the same RuntimeRangeSharingEntry array as the first (same skeleton pairs, same order)

### Requirement 11: Coexistence with Animation Group Sharing

**User Story:** As a developer, I want animation range sharing to coexist with animation group sharing, so that scenes with mixed character types (some using animation groups, some using animation ranges) work correctly.

#### Acceptance Criteria

1. WHEN a scene contains both animation-group-based characters and animation-range-based characters, THE System SHALL apply animation group deduplication and animation range deduplication as separate passes where each pass produces the same sharing entries it would produce if the other character type were absent from the scene
2. THE AnimRangeDedup_Module SHALL exclude from range deduplication processing any skeleton where at least one of its bones' Animation objects is targeted by any AnimationGroup in the scene
3. WHEN saving a world where both RuntimeSharingEntry array and RuntimeRangeSharingEntry array are non-empty, THE SaveManager SHALL persist both `animationSharing` and `animationRangeSharing` in VishvaSerialized
4. WHEN loading a world with both `animationSharing` and `animationRangeSharing` present in VishvaSerialized, THE System SHALL restore animation groups first, then restore skeleton bone animations and ranges, then apply animation group runtime deduplication, then apply animation range runtime deduplication in that order
5. IF a skeleton is targeted by both animation groups and has bone animations eligible for range sharing, THEN THE AnimRangeDedup_Module SHALL treat it as animation-group-driven and exclude it from range deduplication processing

### Requirement 12: Error Handling

**User Story:** As a developer, I want the sharing system to handle edge cases gracefully, so that malformed or unexpected data does not crash the application.

#### Acceptance Criteria

1. WHEN the Serialized_Scene has a missing or undefined skeletons field, THE AnimRangeDedup_Module SHALL return early with zero removals and no error
2. WHEN Runtime_Deduplication is applied to a scene with no skeletons (empty or missing skeletons array), THE AnimRangeDedup_Module SHALL return an empty RuntimeRangeSharingEntry array without error
3. WHEN a Skeleton has bones with empty or missing animations arrays, THE AnimRangeDedup_Module SHALL treat those bones as having no animations
4. WHEN the animationRangeSharing array passed to restoration is null, undefined, or empty, THE AnimRangeDedup_Module SHALL return zero restorations without error
5. IF a Source_Character's skeleton cannot be found in the scene during restoration, THEN THE AnimRangeDedup_Module SHALL skip that AnimRangeSharingEntry, log a warning, and continue processing remaining entries
6. IF a Sharing_Character's skeleton cannot be found in the scene during restoration, THEN THE AnimRangeDedup_Module SHALL skip that AnimRangeSharingEntry, log a warning, and continue processing remaining entries
7. IF a Source_Character's skeleton has no bone animations during restoration, THEN THE AnimRangeDedup_Module SHALL skip that entry, log a warning, and continue processing remaining entries

### Requirement 13: FixAnimationRanges Compatibility

**User Story:** As a developer, I want the sharing system to work correctly with the existing `fixAnimationRanges` workaround for Blender exporter bugs, so that restored animation ranges have correct frame offsets.

#### Acceptance Criteria

1. WHEN Load_Time_Restoration recreates Animation_Ranges on a Sharing_Character's skeleton, THE AnimRangeDedup_Module SHALL apply `fixAnimationRanges` to the restored skeleton if the skeleton is not driven by animation groups (determined by `AnimUtils.containsAG`)
2. WHEN Runtime_Deduplication shares Bone_Animation objects, THE AnimRangeDedup_Module SHALL NOT alter any Animation_Range frame values — ranges remain as-is on each skeleton
3. WHEN Load_Time_Restoration applies `fixAnimationRanges` to a restored skeleton, THE System SHALL ensure the fix is applied exactly once — subsequent code paths (LoadManager asset loading, AvManager avatar setup) SHALL NOT re-apply `fixAnimationRanges` to skeletons already fixed during restoration
