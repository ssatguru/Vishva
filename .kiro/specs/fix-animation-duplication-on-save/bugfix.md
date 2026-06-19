# Bugfix Requirements Document

## Introduction

When a user copies animations from one character's skeleton to another (via `linkAnimationsToSkeleton`) and then deletes the source character, the animation dedup system retains stale sharing metadata referencing the deleted skeleton/mesh. On save, this causes incorrect behavior:
- **First save/load cycle**: animations are duplicated (count doubles) because the stale metadata causes the dedup system to not strip the now-sole-owner's animations, while the serializer also serializes them, and then on load the restore logic re-copies them.
- **Second save/load cycle**: all animations are deleted because the now-doubled stale metadata causes the strip logic to remove all animation data.

The bug only manifests when the source character (Character B) is deleted AFTER its animations are copied to the target (Character A). If Character B remains in the scene, the dedup system correctly identifies both characters as sharing and handles the save/load cycle properly.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN animations are copied from Character B's skeleton to Character A's skeleton via `linkAnimationsToSkeleton` AND Character B is subsequently deleted AND the world is saved and loaded THEN the system doubles the animation count on Character A (each animation range and bone animation appears twice)

1.2 WHEN the world from 1.1 is saved a second time and loaded again THEN the system deletes all animations from Character A (zero animations remain)

1.3 WHEN Character B is deleted after `linkAnimationsToSkeleton` THEN the system retains stale `RuntimeRangeSharingEntry` and `RuntimeSharingEntry` objects that reference the disposed skeleton/mesh of Character B

1.4 WHEN the world is saved with stale sharing metadata referencing a deleted source skeleton THEN the system serializes the `animationRangeSharing` entry with an invalid `sourceSkeletonId` pointing to a skeleton that no longer exists in the scene

### Expected Behavior (Correct)

2.1 WHEN animations are copied from Character B's skeleton to Character A's skeleton via `linkAnimationsToSkeleton` AND Character B is subsequently deleted AND the world is saved and loaded THEN the system SHALL preserve the exact animation count on Character A without duplication

2.2 WHEN the world from 2.1 is saved and loaded any number of subsequent times THEN the system SHALL maintain the same animation count and data on Character A across all save/load cycles (idempotent)

2.3 WHEN Character B is deleted after `linkAnimationsToSkeleton` THEN the system SHALL remove all sharing metadata entries that reference Character B's skeleton or mesh from `_animationRangeSharing` and `_animationSharing`

2.4 WHEN the world is saved after the source character has been deleted THEN the system SHALL NOT serialize any `animationRangeSharing` or `animationSharing` entries referencing the deleted character, and SHALL treat Character A's animations as owned (not shared)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN two characters with the same skeleton type both exist in the scene (neither deleted) and the world is saved and loaded THEN the system SHALL CONTINUE TO correctly deduplicate animation groups and bone animations between them, stripping the sharing character's data on save and restoring it on load

3.2 WHEN a character has animations that were NOT copied from another character and the world is saved and loaded THEN the system SHALL CONTINUE TO preserve all animations without any stripping or modification

3.3 WHEN animations are copied via `linkAnimationsToSkeleton` and the source character is NOT deleted THEN the system SHALL CONTINUE TO correctly manage the sharing relationship across save/load cycles without duplication or loss

3.4 WHEN multiple characters share animations and one non-source sharing character is deleted THEN the system SHALL CONTINUE TO maintain the sharing relationship between remaining characters correctly

3.5 WHEN a world is loaded from a legacy save file that has no `animationRangeSharing` metadata THEN the system SHALL CONTINUE TO perform runtime deduplication normally without errors
