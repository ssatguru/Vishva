# Implementation Plan: Animation Range Sharing

## Overview

Implement a metadata-based sharing system for skeleton bone animations (animation ranges) in `src/util/AnimRangeDedup.ts`, mirroring the existing animation group sharing pattern. The system has four phases: runtime deduplication, save-time stripping, load-time restoration, and metadata persistence. Integration points are Vishva.ts, SaveManager.ts, LoadManager.ts, and VishvaSerialized.ts.

## Tasks

- [x] 1. Create AnimRangeDedup module with interfaces and core detection logic
  - [x] 1.1 Create `src/util/AnimRangeDedup.ts` with interfaces and `areSkeletonsDuplicates`
    - Create the new module file
    - Define `AnimRangeSharingEntry` interface with `skeletonId` and `sourceSkeletonId` fields
    - Define `RuntimeRangeSharingEntry` interface with `skeleton` and `sourceSkeleton` Skeleton references
    - Implement `areSkeletonsDuplicates(a: Skeleton, b: Skeleton): boolean` — pure function comparing bone names (order-independent) and per-bone animation names (order-independent), returning false if either skeleton has no bone animations
    - Implement `resolveRuntimeRangeEntries(entries: RuntimeRangeSharingEntry[]): AnimRangeSharingEntry[]` — pure function reading `.id` from Skeleton references
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 9.1, 9.2, 9.4, 9.5, 9.6_

  - [x] 1.2 Write property test for `areSkeletonsDuplicates` (Property 1)
    - **Property 1: Duplicate Detection Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 9.5**
    - Create `src/util/AnimRangeDedup.property.test.ts`
    - Use mock Skeleton/Bone objects with fast-check arbitraries for bone names and animation names
    - Verify: returns true iff both have bone animations, same bone name sets, and same per-bone animation name sets
    - Verify: no mutation of input skeletons

  - [x] 1.3 Write property test for `resolveRuntimeRangeEntries` (Property 7)
    - **Property 7: resolveRuntimeRangeEntries Produces Correct IDs Without Mutation**
    - **Validates: Requirements 6.4, 9.6**
    - Verify: output `skeletonId` equals input `skeleton.id` and `sourceSkeletonId` equals input `sourceSkeleton.id`
    - Verify: no mutation of input Skeleton objects

- [x] 2. Implement runtime deduplication
  - [x] 2.1 Implement `deduplicateRangesAtRuntime` in `src/util/AnimRangeDedup.ts`
    - Compute animation signature for each skeleton (sorted bone names + sorted per-bone animation names)
    - Exclude skeletons driven by animation groups using `AnimUtils.containsAG` check
    - Group skeletons by signature; for each group with 2+ members, designate first (lowest scene index) as source
    - Replace bone Animation references in sharing skeletons with source skeleton's corresponding bone Animation objects (matched by bone name)
    - Return `RuntimeRangeSharingEntry[]` with Skeleton references
    - Handle edge cases: empty scene, no skeletons, no bone animations
    - Ensure idempotence: if references already shared, no additional changes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 10.1, 10.2, 10.3, 12.2, 12.3_

  - [x] 2.2 Write property test for AG-driven skeleton exclusion (Property 2)
    - **Property 2: AG-Driven Skeletons Excluded from Range Dedup**
    - **Validates: Requirements 2.1, 2.7, 11.1, 11.2, 11.5**
    - Verify: skeletons whose mesh hierarchy is targeted by AnimationGroups never appear in returned entries and their bone Animation references are unchanged

  - [x] 2.3 Write property test for runtime dedup sharing behavior (Property 3)
    - **Property 3: Runtime Dedup Shares Bone Animation References While Preserving Structure**
    - **Validates: Requirements 2.3, 2.5, 7.3, 8.2, 10.2, 13.2**
    - Verify: skeleton count unchanged, animation ranges unchanged, sharing skeleton bone animations are `===` source skeleton bone animations, non-duplicate skeletons unchanged

  - [x] 2.4 Write property test for idempotence (Property 4)
    - **Property 4: Runtime Dedup Is Idempotent**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - Verify: second invocation returns same entries as first, no additional reference changes

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement save-time stripping
  - [x] 4.1 Implement `stripSharedSkeletonAnimations` in `src/util/AnimRangeDedup.ts`
    - Accept serialized scene object, `RuntimeRangeSharingEntry[]`, and live Scene
    - For each sharing skeleton in the runtime entries, find its serialized skeleton by matching skeleton ID
    - Remove `animation` field from each bone and remove `ranges` array from the serialized skeleton
    - Never strip source skeletons or skeletons not in the sharing entries
    - Return count of skeletons stripped
    - Handle edge cases: missing skeletons array, empty entries, skeleton ID not found (log warning, skip)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 12.1_

  - [x] 4.2 Write property test for strip correctness (Property 5)
    - **Property 5: Strip Correctness — Sharing Skeletons Stripped, Source and Unique Preserved**
    - **Validates: Requirements 3.2, 3.3, 7.1, 7.2, 7.4**
    - Verify: sharing skeletons have no bone animation data or ranges after strip
    - Verify: source skeletons retain all bone animation data and ranges
    - Verify: unique (non-duplicate) skeletons retain all data

- [x] 5. Implement load-time restoration
  - [x] 5.1 Implement `restoreSharedSkeletonAnimations` in `src/util/AnimRangeDedup.ts`
    - Accept Scene, `AnimRangeSharingEntry[]`, and `fixAnimationRanges` callback
    - For each entry, find source and sharing skeletons by ID in the scene
    - Copy bone `animations` arrays by reference from source to sharing skeleton (matched by bone name)
    - Recreate animation ranges on sharing skeleton from source skeleton's ranges using `skeleton.createAnimationRange(name, from, to)`
    - Apply `fixAnimationRanges` to the restored skeleton
    - Return count of skeletons restored
    - Handle edge cases: null/empty entries, skeleton not found, source has no bone animations, bone name mismatch (log warning, skip)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.3, 5.4, 12.4, 12.5, 12.6, 12.7, 13.1_

  - [x] 5.2 Write property test for restoration (Property 6)
    - **Property 6: Restoration Copies Bone Animations by Reference and Recreates Ranges**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
    - Verify: sharing skeleton bone animations are `===` source skeleton bone animations (by bone name)
    - Verify: sharing skeleton has same animation range names/values as source (after fixAnimationRanges)
    - Verify: unmatched bone names are skipped without error

  - [x] 5.3 Write property test for fixAnimationRanges application (Property 8)
    - **Property 8: fixAnimationRanges Applied to Restored Skeletons**
    - **Validates: Requirements 13.1, 13.2**
    - Verify: `fixAnimationRanges` is called for each restored skeleton
    - Verify: animation range `from` values are incremented by 1 compared to source

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate with VishvaSerialized and Vishva
  - [x] 7.1 Add `animationRangeSharing` field to `src/VishvaSerialized.ts`
    - Import `AnimRangeSharingEntry` from `./util/AnimRangeDedup`
    - Add optional `animationRangeSharing?: AnimRangeSharingEntry[]` field to `VishvaSerialized` class
    - _Requirements: 6.1_

  - [x] 7.2 Add `_animationRangeSharing` field to `src/Vishva.ts`
    - Import `RuntimeRangeSharingEntry` from `./util/AnimRangeDedup`
    - Add `_animationRangeSharing: RuntimeRangeSharingEntry[] = []` field to the Vishva class
    - _Requirements: 6.4_

- [x] 8. Integrate with SaveManager
  - [x] 8.1 Add animation range stripping to all save methods in `src/managers/SaveManager.ts`
    - Import `stripSharedSkeletonAnimations` and `resolveRuntimeRangeEntries` from `../util/AnimRangeDedup`
    - In `saveWorldAsJson`, `saveWorldToIndexedDB`, `saveWorldToIndexedDBAsJson`, and `_getWorldZipBlob`: after animation group stripping, invoke `stripSharedSkeletonAnimations` using `this.vishva._animationRangeSharing`
    - Store resolved entries in `vishvaSerialized.animationRangeSharing` via `resolveRuntimeRangeEntries`
    - Log stripped count with `[SaveManager]` prefix
    - _Requirements: 3.1, 3.4, 6.2, 11.3_

- [x] 9. Integrate with LoadManager and Vishva load sequence
  - [x] 9.1 Add animation range restoration and dedup to `src/Vishva.ts` `loadBabylonjsPart`
    - Import `restoreSharedSkeletonAnimations` and `deduplicateRangesAtRuntime` from `./util/AnimRangeDedup`
    - After AG restore and AG dedup, check if `vishvaSerialized.animationRangeSharing` is present and non-empty
    - If present: call `restoreSharedSkeletonAnimations(scene, entries, fixAnimationRanges)`
    - Then always call `deduplicateRangesAtRuntime(scene)` and store result in `this._animationRangeSharing`
    - Ensure this happens BEFORE `AvManager` creation and `CharacterController.start()`
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 8.1, 8.2, 8.3, 8.4, 11.4, 13.3_

  - [x] 9.2 Add runtime dedup to `src/managers/LoadManager.ts` `onMeshLoaded`
    - Import `deduplicateRangesAtRuntime` from `../util/AnimRangeDedup`
    - After loading a new asset with skeletons, run `deduplicateRangesAtRuntime(scene)` and **replace** (not append to) `this.vishva._animationRangeSharing` with the result
    - Since `deduplicateRangesAtRuntime` is idempotent and returns the complete set of sharing relationships for the entire scene, replacing prevents duplicate entries from accumulating across save/load cycles
    - _Requirements: 2.1, 2.6_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Write unit tests
  - [x] 11.1 Write unit tests in `src/util/AnimRangeDedup.test.ts`
    - Test `areSkeletonsDuplicates` with specific examples: identical 3-bone skeletons, different bone names, different animation names, empty animations, single-bone skeletons
    - Test `deduplicateRangesAtRuntime` with 2 identical skeletons, 3 identical skeletons, mixed unique + duplicate, AG-driven exclusion
    - Test `stripSharedSkeletonAnimations` with valid entries, missing skeleton IDs, empty scene
    - Test `restoreSharedSkeletonAnimations` with valid entries, missing source/sharing skeleton, bone name mismatch, fixAnimationRanges integration
    - Test `resolveRuntimeRangeEntries` with valid entries, empty array
    - Test error handling: null inputs, undefined fields, empty arrays
    - _Requirements: 1.1–1.7, 2.1–2.7, 3.1–3.7, 4.1–4.6, 5.1–5.4, 6.1–6.5, 7.1–7.4, 9.1–9.6, 10.1–10.3, 11.1–11.5, 12.1–12.7, 13.1–13.3_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation mirrors the existing `AnimGroupDedup.ts` patterns for architectural consistency
- Execution order on load: AG restore → AG dedup → Range restore → Range dedup → AvManager

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "7.1", "7.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "8.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "9.1", "9.2"] },
    { "id": 5, "tasks": ["11.1"] }
  ]
}
```
