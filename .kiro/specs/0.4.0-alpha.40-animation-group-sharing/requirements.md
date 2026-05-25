# Requirements Document

## Introduction

This document specifies the requirements for the Animation Group Sharing feature. When multiple characters of the same type exist in a scene, BabylonJS creates separate animation group instances for each, even though they share identical keyframe data. This feature implements a metadata-based sharing system with three phases: runtime deduplication (sharing Animation objects between duplicate groups), save-time stripping (removing animation groups for sharing characters and persisting sharing metadata), and load-time restoration (shallow-cloning source character animation groups for sharing characters using persisted metadata). The result is reduced memory usage at runtime and smaller save files, while maintaining full backward compatibility with legacy saved worlds.

## Glossary

- **Animation_Group**: A BabylonJS `AnimationGroup` object that groups multiple targeted animations together under a single name (e.g., "walk", "run", "idle")
- **Targeted_Animation**: A single entry within an Animation_Group, consisting of an Animation object (keyframe data) and a reference to a target node
- **Animation_Object**: A BabylonJS `Animation` instance containing keyframe data, frame rates, and keys arrays — the actual animation data that can be shared by reference
- **Target_Node_Name**: The `name` property of the node targeted by a Targeted_Animation (e.g., "Hips", "LeftArm") — used for matching across character instances since IDs differ
- **Duplicate_Animation_Groups**: Two Animation_Groups that have the same name AND the same set of (target node name, animation name) pairs across their targeted animations
- **Source_Character**: The character instance whose animation groups are treated as canonical — its groups are preserved during save-time stripping and used as the basis for restoration
- **Sharing_Character**: A character instance whose animation groups are duplicates of the Source_Character's — its groups are stripped at save time and restored at load time
- **Sharing_Metadata**: An `AnimationSharingEntry` recording that a Sharing_Character's root mesh ID shares animations with a Source_Character's root mesh ID
- **AnimationSharingEntry**: A data structure with `meshId` (Sharing_Character root) and `sourceMeshId` (Source_Character root)
- **Runtime_Deduplication**: The process of detecting duplicate Animation_Groups across characters and replacing their Animation_Object references with shared references from the Source_Character's groups
- **Save_Time_Stripping**: The process of removing all animation groups belonging to Sharing_Characters from the serialized scene data, using the Sharing_Metadata to identify them
- **Load_Time_Restoration**: The process of shallow-cloning the Source_Character's animation groups for each Sharing_Character — creating new AnimationGroup and TargetedAnimation objects but sharing the same Animation_Objects
- **Shallow_Clone**: Creating a new AnimationGroup with new TargetedAnimation entries that reference the Source_Character's Animation_Objects (shared by reference, not deep-copied) and target nodes matched by name in the Sharing_Character's hierarchy
- **Character_Hierarchy**: The subtree of nodes rooted at a character's root mesh — target node matching during restoration searches within this subtree only
- **AnimGroupDedup_Module**: The new utility module (`src/util/AnimGroupDedup.ts`) containing functions for duplicate detection, runtime deduplication, save-time stripping, and load-time restoration
- **Serialized_Scene**: The JSON object produced by `SceneSerializer.Serialize()` representing the full scene state
- **SaveManager**: The existing manager responsible for packaging and saving world data
- **LoadManager**: The existing manager responsible for loading and deserializing world data
- **Character_Controller**: The `CharacterController` instance (from `babylonjs-charactercontroller`) that drives avatar or mesh-based character movement and animation

## Requirements

### Requirement 1: Duplicate Detection Logic

**User Story:** As a developer, I want a reliable mechanism to determine whether two animation groups are duplicates, so that runtime deduplication and sharing metadata can be established correctly.

#### Acceptance Criteria

1. WHEN comparing two Animation_Groups, THE AnimGroupDedup_Module SHALL consider them duplicates if and only if they have the same name AND the same set of (Target_Node_Name, animation name) pairs across their targeted animations
2. WHEN comparing targeted animation sets, THE AnimGroupDedup_Module SHALL perform order-independent comparison of (Target_Node_Name, animation name) pairs
3. WHEN two Animation_Groups have the same name but different Target_Node_Names in their targeted animations, THE AnimGroupDedup_Module SHALL NOT consider them duplicates
4. WHEN two Animation_Groups have the same name but different animation names in their targeted animations, THE AnimGroupDedup_Module SHALL NOT consider them duplicates
5. WHEN two Animation_Groups have different names but identical targeted animation sets, THE AnimGroupDedup_Module SHALL NOT consider them duplicates
6. WHEN comparing Target_Node_Names and animation names, THE AnimGroupDedup_Module SHALL use exact string matching

### Requirement 2: Save-Time Stripping

**User Story:** As a world creator, I want animation groups belonging to sharing characters stripped from the saved scene data, so that save files are smaller and do not contain redundant animation data.

#### Acceptance Criteria

1. WHEN SceneSerializer.Serialize produces a Serialized_Scene, THE SaveManager SHALL strip animation groups belonging to Sharing_Characters before packaging the scene data
2. WHEN stripping animation groups, THE AnimGroupDedup_Module SHALL remove all animation groups whose target nodes belong to a Sharing_Character's Character_Hierarchy
3. THE SaveManager SHALL never strip animation groups belonging to a Source_Character
4. WHEN stripping completes, THE SaveManager SHALL store the Sharing_Metadata as `animationSharing` in VishvaSerialized
5. WHEN the Serialized_Scene has no animationGroups array or an empty array, THE AnimGroupDedup_Module SHALL return zero removals without error
6. WHEN stripping completes, THE AnimGroupDedup_Module SHALL return the count of removed animation groups

### Requirement 3: Load-Time Restoration

**User Story:** As a world creator, I want animation groups restored for sharing characters after loading a deduplicated save, so that all characters have functional animations.

#### Acceptance Criteria

1. WHEN a saved world containing Sharing_Metadata is deserialized, THE System SHALL invoke restoration before avatar and Character_Controller setup
2. WHEN restoring animation groups for a Sharing_Character, THE AnimGroupDedup_Module SHALL create a new AnimationGroup for each of the Source_Character's animation groups with the same name
3. WHEN creating a restored AnimationGroup, THE AnimGroupDedup_Module SHALL create new TargetedAnimation entries where the target node is found by matching Target_Node_Name within the Sharing_Character's Character_Hierarchy
4. WHEN creating restored TargetedAnimation entries, THE AnimGroupDedup_Module SHALL reference the Source_Character's Animation_Objects (shared by reference, not deep-copied)
5. IF a Target_Node_Name from the Source_Character's animation group cannot be found in the Sharing_Character's Character_Hierarchy, THEN THE AnimGroupDedup_Module SHALL skip that TargetedAnimation and log a warning
6. WHEN restoration completes, THE AnimGroupDedup_Module SHALL return the count of animation groups created

### Requirement 4: Backward Compatibility

**User Story:** As a world creator, I want legacy saved worlds (created before this feature) to load correctly, so that existing content is not broken by the new sharing system.

#### Acceptance Criteria

1. WHEN loading a legacy saved world that has no `animationSharing` field in VishvaSerialized, THE System SHALL skip restoration and proceed with normal loading
2. WHEN loading a legacy saved world, THE System SHALL apply Runtime_Deduplication to share Animation_Objects for memory savings
3. WHEN loading a world saved with stripping applied, THE System SHALL first restore animation groups from Sharing_Metadata, then apply Runtime_Deduplication to share Animation_Objects

### Requirement 5: Runtime Deduplication

**User Story:** As a developer, I want duplicate animation groups detected at runtime and their Animation objects shared by reference, so that memory usage is reduced regardless of how the scene was loaded.

#### Acceptance Criteria

1. WHEN Runtime_Deduplication is applied to a scene, THE AnimGroupDedup_Module SHALL identify sets of Duplicate_Animation_Groups
2. WHEN duplicate groups are identified, THE AnimGroupDedup_Module SHALL replace Animation_Object references in Sharing_Characters' targeted animations with the corresponding Animation_Objects from the Source_Character's group (matched by animation name)
3. WHEN Runtime_Deduplication completes, THE AnimGroupDedup_Module SHALL NOT remove any AnimationGroup objects from the scene — only Animation_Object references are shared
4. WHEN Runtime_Deduplication completes, THE AnimGroupDedup_Module SHALL return the Sharing_Metadata entries discovered

### Requirement 6: Sharing Metadata Persistence

**User Story:** As a developer, I want sharing relationships persisted in VishvaSerialized, so that save-time stripping and load-time restoration can operate correctly across save/load cycles.

#### Acceptance Criteria

1. THE VishvaSerialized class SHALL include an optional `animationSharing` field of type `AnimationSharingEntry[]`
2. WHEN saving a world with active sharing relationships, THE SaveManager SHALL populate `animationSharing` with one entry per Sharing_Character recording its root mesh ID and the Source_Character's root mesh ID
3. WHEN loading a world, THE System SHALL read `animationSharing` from VishvaSerialized to drive Load_Time_Restoration

### Requirement 7: Preservation of Unique Animation Groups

**User Story:** As a world creator, I want animation groups that are genuinely different to never be affected by sharing, so that customized or unique animations are preserved.

#### Acceptance Criteria

1. THE AnimGroupDedup_Module SHALL never strip an Animation_Group that has a unique name across the entire scene
2. THE AnimGroupDedup_Module SHALL never strip an Animation_Group whose set of (Target_Node_Name, animation name) pairs differs from all other groups with the same name
3. WHEN Runtime_Deduplication or Save_Time_Stripping is applied, THE AnimGroupDedup_Module SHALL preserve all Animation_Groups that do not match the duplicate criteria

### Requirement 8: Character Controller Compatibility

**User Story:** As a world creator, I want avatar and mesh-based character controllers to continue working after restoration and runtime deduplication, so that characters animate correctly in the loaded world.

#### Acceptance Criteria

1. WHEN Load_Time_Restoration creates animation groups for Sharing_Characters, THE System SHALL ensure that Character_Controller instances can find and use those groups by name
2. WHEN Runtime_Deduplication shares Animation_Objects, THE System SHALL ensure that all Character_Controller animation playback remains functional
3. WHEN restoration and deduplication run before Character_Controller setup, THE System SHALL ensure that subsequent Character_Controller initialization finds the correct animation groups

### Requirement 9: Utility Module Design

**User Story:** As a developer, I want the sharing logic in a standalone utility module, so that the logic is testable in isolation.

#### Acceptance Criteria

1. THE AnimGroupDedup_Module SHALL be located at `src/util/AnimGroupDedup.ts`
2. THE AnimGroupDedup_Module SHALL export `areAnimationGroupsDuplicates`, `deduplicateAtRuntime`, `stripSharedAnimationGroups`, and `restoreSharedAnimationGroups` as named exports
3. THE AnimGroupDedup_Module SHALL export `findNodeInHierarchy` and `getRootMesh` as utility functions
4. THE AnimGroupDedup_Module SHALL implement `areAnimationGroupsDuplicates` as a pure function with no side effects

### Requirement 10: Idempotence

**User Story:** As a developer, I want runtime deduplication to be idempotent, so that applying it multiple times produces the same result as applying it once.

#### Acceptance Criteria

1. WHEN Runtime_Deduplication is applied to a scene where Animation_Objects are already shared, THE AnimGroupDedup_Module SHALL produce the same Sharing_Metadata with no additional changes
2. WHEN Runtime_Deduplication is applied to a scene with no Duplicate_Animation_Groups, THE AnimGroupDedup_Module SHALL make no changes and return an empty Sharing_Metadata array

### Requirement 11: Error Handling

**User Story:** As a developer, I want the sharing system to handle edge cases gracefully, so that malformed or unexpected data does not crash the application.

#### Acceptance Criteria

1. WHEN the Serialized_Scene has a missing or undefined animationGroups field, THE AnimGroupDedup_Module SHALL return early with zero removals and no error
2. WHEN an Animation_Group has an empty or missing targetedAnimations array, THE AnimGroupDedup_Module SHALL treat it as having an empty set of (Target_Node_Name, animation name) pairs
3. IF a Source_Character's root mesh cannot be found in the scene during restoration, THEN THE AnimGroupDedup_Module SHALL skip that Sharing_Metadata entry and log a warning
4. IF a Sharing_Character's root mesh cannot be found in the scene during restoration, THEN THE AnimGroupDedup_Module SHALL skip that Sharing_Metadata entry and log a warning
5. IF a Source_Character has no animation groups during restoration, THEN THE AnimGroupDedup_Module SHALL skip that entry and log a warning
