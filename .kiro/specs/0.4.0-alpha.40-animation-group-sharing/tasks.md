# Implementation Plan: Animation Group Sharing

## Overview

This plan implements a metadata-based animation group sharing system with three phases: runtime deduplication (sharing Animation objects), save-time stripping (removing sharing characters' animation groups from serialized data), and load-time restoration (shallow-cloning source character animation groups for sharing characters). The core logic lives in a new utility module (`src/util/AnimGroupDedup.ts`) with pure/testable functions, integrated into LoadManager (import-time metadata recording), SaveManager (4 save paths), and Vishva.loadBabylonjsPart (load-time restoration + runtime dedup).

## Tasks

- [x] 1. Create AnimGroupDedup utility module with core functions
  - [x] 1.1 Implement `areAnimationGroupsDuplicates`, `getRootMesh`, and `findNodeInHierarchy`
    - Create `src/util/AnimGroupDedup.ts`
    - Export the `AnimationSharingEntry`, `SerializedAnimationGroup`, `SerializedTargetedAnimation`, and `SerializedScene` interfaces
    - Implement `areAnimationGroupsDuplicates(a, b)`: returns true iff `a.name === b.name` AND the set of (target node name, animation name) pairs in `a.targetedAnimations` equals the set in `b.targetedAnimations` (order-independent, exact string matching)
    - Implement `getRootMesh(node)`: walks up the parent chain to find the topmost TransformNode/Mesh
    - Implement `findNodeInHierarchy(root, nodeName)`: recursively searches the subtree of `root` for a node with the given name
    - Handle edge cases: empty or missing `targetedAnimations` arrays treated as empty sets
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4_

  - [x] 1.2 Implement `deduplicateAtRuntime`
    - Accepts a BabylonJS `Scene` object
    - Group animation groups by their signature: name + sorted set of (target node name, animation name) pairs
    - For each set of duplicates: identify the first-found as canonical (source), determine root mesh for each group via `getRootMesh` on the first target node
    - Replace Animation object references in non-canonical groups' `targetedAnimations[].animation` with the canonical group's Animation objects (matched by animation name)
    - Skip targeted animations where no matching animation name exists in the canonical group (log warning)
    - Do NOT remove any AnimationGroup objects from the scene — only share Animation object references
    - Return `AnimationSharingEntry[]` recording which root mesh shares with which source root mesh
    - Handle idempotence: if Animation objects are already shared (same reference), produce the same metadata without additional changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 10.1, 10.2, 11.2_

  - [x] 1.3 Implement `stripSharedAnimationGroups`
    - Accepts a `SerializedScene` object, `AnimationSharingEntry[]`, and a live BabylonJS `Scene`
    - For each sharing entry, determine which serialized animation groups belong to the sharing character by checking if their target node IDs resolve to nodes within that character's hierarchy (using the live scene to map IDs to nodes)
    - Remove those animation groups from `sceneObj.animationGroups`
    - Never remove animation groups belonging to source characters
    - Return the count of removed animation groups
    - Handle missing/undefined/empty `animationGroups` array gracefully (return 0)
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 7.1, 7.2, 7.3, 11.1_

  - [x] 1.4 Implement `restoreSharedAnimationGroups`
    - Accepts a BabylonJS `Scene` and `AnimationSharingEntry[]`
    - For each sharing entry: find the source character's root mesh by ID, find the sharing character's root mesh by ID
    - For each of the source character's animation groups: create a new AnimationGroup with the same name
    - For each targetedAnimation in the source group: find the corresponding node in the sharing character's hierarchy by matching target node name via `findNodeInHierarchy`
    - Create a new TargetedAnimation with target = sharing character's node and animation = source's Animation object (shared reference, NOT cloned)
    - Skip targetedAnimations where the target node cannot be found (log warning)
    - Add the new AnimationGroup to the scene
    - Return the count of animation groups created
    - Handle error cases: source mesh not found, sharing mesh not found, source has no AGs (log warnings, skip)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 8.3, 11.3, 11.4, 11.5_

- [x] 2. Checkpoint - Verify utility module compiles
  - Ensure `npm run build` succeeds with no TypeScript errors, ask the user if questions arise.

- [x] 3. Update VishvaSerialized and LoadManager
  - [x] 3.1 Add `animationSharing` field to VishvaSerialized
    - Import `AnimationSharingEntry` from `./util/AnimGroupDedup`
    - Add `public animationSharing?: AnimationSharingEntry[];` field to the `VishvaSerialized` class
    - _Requirements: 6.1_

  - [x] 3.2 Enhance LoadManager to record sharing metadata on import
    - Import `AnimationSharingEntry`, `areAnimationGroupsDuplicates`, `getRootMesh` from `../util/AnimGroupDedup`
    - In `reuseAnimationGroup`, after finding a matching source AG and sharing Animation objects, determine the root meshes of both the source and destination animation groups' targets
    - Record an `AnimationSharingEntry` with the destination root mesh ID and source root mesh ID
    - After the `reuseAnimationGroup` loop in `onMeshLoaded`, store the collected entries on `this.vishva._animationSharing` (merging with any existing entries, avoiding duplicates)
    - _Requirements: 5.1, 5.2, 6.2_

- [x] 4. Integrate stripping into SaveManager (all 4 save paths)
  - [x] 4.1 Add stripping to `_getWorldZipBlob`
    - Import `stripSharedAnimationGroups` from `../util/AnimGroupDedup`
    - After `SceneSerializer.Serialize` and after `removeSounds`/`removeActuatorTextBarMat`, read sharing metadata from `this.vishva._animationSharing`
    - If sharing metadata exists, call `stripSharedAnimationGroups(sceneObj, sharingEntries, this.vishva.scene)`
    - Log the removed count for debugging
    - Store `vishvaSerialzed.animationSharing = sharingEntries` in the VishvaSerialized object
    - _Requirements: 2.1, 2.4, 6.2_

  - [x] 4.2 Add stripping to `saveWorldAsJson`
    - After `SceneSerializer.Serialize` and cleanup calls, read sharing metadata from `this.vishva._animationSharing`
    - If sharing metadata exists, call `stripSharedAnimationGroups(sceneObj, sharingEntries, this.vishva.scene)`
    - Log the removed count
    - Store `vishvaSerialized.animationSharing = sharingEntries`
    - _Requirements: 2.1, 2.4, 6.2_

  - [x] 4.3 Add stripping to `saveWorldToIndexedDB`
    - After `SceneSerializer.Serialize` and cleanup calls, read sharing metadata from `this.vishva._animationSharing`
    - If sharing metadata exists, call `stripSharedAnimationGroups(sceneObj, sharingEntries, this.vishva.scene)`
    - Log the removed count
    - Store `vishvaSerialzed.animationSharing = sharingEntries`
    - _Requirements: 2.1, 2.4, 6.2_

  - [x] 4.4 Add stripping to `saveWorldToIndexedDBAsJson`
    - After `SceneSerializer.Serialize` and cleanup calls, read sharing metadata from `this.vishva._animationSharing`
    - If sharing metadata exists, call `stripSharedAnimationGroups(sceneObj, sharingEntries, this.vishva.scene)`
    - Log the removed count
    - Store `vishvaSerialized.animationSharing = sharingEntries`
    - _Requirements: 2.1, 2.4, 6.2_

- [x] 5. Integrate restoration into Vishva.loadBabylonjsPart
  - [x] 5.1 Add restoration and runtime dedup before avatar/CC setup
    - Import `restoreSharedAnimationGroups`, `deduplicateAtRuntime` from `./util/AnimGroupDedup`
    - In `loadBabylonjsPart`, after scene objects are found but before avatar setup and meshCC (character controller) initialization:
      - If `vishvaSerialized.animationSharing` exists and has entries, call `restoreSharedAnimationGroups(scene, vishvaSerialized.animationSharing)` and log the created count
      - Then call `deduplicateAtRuntime(scene)` to share Animation objects (handles both restored and legacy saves)
      - Store the returned sharing entries on `this._animationSharing` so SaveManager can access them
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 6.3, 8.1, 8.2, 8.3_

- [x] 6. Checkpoint - Build and integration verification
  - Run `npm run build` to verify the project compiles with no TypeScript errors
  - Run `npm test` to verify all existing tests still pass
  - Ask the user if questions arise.

- [x] 7. Property-based tests for AnimGroupDedup
  - [x] 7.1 Write property test: Duplicate Detection Symmetry
    - Create `src/util/AnimGroupDedup.property.test.ts`
    - **Property 1: Duplicate Detection Symmetry**
    - For any two animation groups A and B, `areAnimationGroupsDuplicates(A, B)` returns the same value as `areAnimationGroupsDuplicates(B, A)`
    - Use fast-check arbitraries to generate mock AnimationGroup-like objects with varying names, target node names, and animation names
    - **Validates: Requirements 1.1, 1.2**

  - [x] 7.2 Write property test: Duplicate Detection Correctness
    - **Property 2: Duplicate Detection Correctness**
    - For any two animation groups A and B, `areAnimationGroupsDuplicates(A, B)` returns true if and only if A.name equals B.name AND the set of (targetNodeName, animationName) pairs in A equals the set in B
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

  - [x] 7.3 Write property test: Runtime Dedup Preserves Animation Group Count
    - **Property 3: Runtime Dedup Preserves Animation Group Count**
    - For any mock scene, after `deduplicateAtRuntime`, the number of AnimationGroup objects in the scene remains unchanged
    - **Validates: Requirements 5.3, 7.3**

  - [x] 7.4 Write property test: Runtime Dedup Shares Animation Objects
    - **Property 4: Runtime Dedup Shares Animation Objects**
    - For any mock scene with duplicate animation groups, after `deduplicateAtRuntime`, corresponding targetedAnimations in duplicate groups reference the same Animation object (`===` identity)
    - **Validates: Requirements 5.1, 5.2**

  - [x] 7.5 Write property test: Strip-Restore Round Trip
    - **Property 5: Strip-Restore Round Trip**
    - For any scene with sharing metadata, stripping then restoring produces animation groups with same names, same animation names, same target node names, and shared Animation object references
    - **Validates: Requirements 2.2, 3.2, 3.3, 3.4, 3.6**

  - [x] 7.6 Write property test: Source Character Preservation
    - **Property 6: Source Character Preservation**
    - For any save operation, source character animation groups are never stripped from the serialized scene
    - **Validates: Requirements 2.3, 7.1, 7.2, 7.3**

  - [x] 7.7 Write property test: Backward Compatibility
    - **Property 7: Backward Compatibility**
    - For any legacy scene (no sharing metadata), loading and running `deduplicateAtRuntime` produces a functional scene with all animation groups intact and Animation objects shared
    - **Validates: Requirements 4.1, 4.2, 5.3**

  - [x] 7.8 Write property test: Idempotence of Runtime Dedup
    - **Property 8: Idempotence of Runtime Dedup**
    - For any scene, applying `deduplicateAtRuntime` twice produces the same sharing entries as applying it once — the second application finds no new duplicates
    - **Validates: Requirements 10.1, 10.2**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Run `npm test` to verify all property tests and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The `AnimationSharingEntry` interface is defined in `AnimGroupDedup.ts` and imported by `VishvaSerialized.ts`
- Sharing metadata is stored on the Vishva instance as `this._animationSharing` (type `AnimationSharingEntry[]`) so both SaveManager and LoadManager can access it
- SaveManager has 4 distinct save paths (`_getWorldZipBlob`, `saveWorldAsJson`, `saveWorldToIndexedDB`, `saveWorldToIndexedDBAsJson`) — all need the stripping call added after `SceneSerializer.Serialize`
- The restoration call in `loadBabylonjsPart` must run after scene deserialization but before `AvManager` and `CharacterController` initialization
- `deduplicateAtRuntime` is always called after restoration (or on legacy loads) to ensure Animation objects are shared for memory savings
- Target node matching uses node **name** (not ID) within a character's subtree, since IDs differ across character instances
- Property tests use mock objects that mimic BabylonJS AnimationGroup/Scene interfaces — they don't require a full BabylonJS runtime

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8"] }
  ]
}
```
