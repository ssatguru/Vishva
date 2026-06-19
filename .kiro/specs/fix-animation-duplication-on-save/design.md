# Fix Animation Duplication on Save — Bugfix Design

## Overview

When a character's animations are copied via `linkAnimationsToSkeleton` and the source character is later deleted, stale sharing metadata (`RuntimeRangeSharingEntry` / `RuntimeSharingEntry`) persists in `Vishva._animationRangeSharing` and `Vishva._animationSharing`. On save, this stale metadata causes `resolveRuntimeRangeEntries()` and `resolveRuntimeEntries()` to produce entries referencing disposed skeletons/meshes. On load, the restore logic either doubles animations (first cycle) or strips them all (second cycle).

The fix adds cleanup functions to `AnimGroupDedup` and `AnimRangeDedup` that purge entries referencing a given skeleton or mesh, and calls them from `Vishva.deleteTheMesh()` before disposal. When the deleted character was the source of a sharing relationship, the sharing character is promoted to "owner" (its entry is removed from the sharing list).

## Glossary

- **Bug_Condition (C)**: The condition where `_animationRangeSharing` or `_animationSharing` contains entries referencing a skeleton/mesh that has been disposed (deleted from scene)
- **Property (P)**: After deletion, no sharing entry references the deleted skeleton/mesh; animations on remaining characters are preserved correctly across save/load cycles
- **Preservation**: Existing dedup behavior when all characters remain in the scene, or when non-source characters are deleted
- **`_animationRangeSharing`**: `RuntimeRangeSharingEntry[]` on `Vishva` — tracks skeleton-level bone animation sharing (skeleton references)
- **`_animationSharing`**: `RuntimeSharingEntry[]` on `Vishva` — tracks animation group sharing (mesh/node references)
- **`resolveRuntimeRangeEntries()`**: Converts `RuntimeRangeSharingEntry[]` to serializable `AnimRangeSharingEntry[]` at save time
- **`resolveRuntimeEntries()`**: Converts `RuntimeSharingEntry[]` to serializable `AnimationSharingEntry[]` at save time
- **`deleteTheMesh()`**: Method in `Vishva.ts` that removes SNAs, shadow caster refs, SPS, then calls `mesh.dispose()`

## Bug Details

### Bug Condition

The bug manifests when a user copies animations from Character B to Character A via `linkAnimationsToSkeleton`, then deletes Character B. The deletion disposes B's skeleton and mesh, but `_animationRangeSharing` and `_animationSharing` still hold `RuntimeRangeSharingEntry` / `RuntimeSharingEntry` objects whose `sourceSkeleton` or `sourceMesh` fields reference the now-disposed objects.

**Formal Specification:**
```
FUNCTION isBugCondition(state)
  INPUT: state of type { animationRangeSharing: RuntimeRangeSharingEntry[], animationSharing: RuntimeSharingEntry[], scene: Scene }
  OUTPUT: boolean

  FOR EACH entry IN state.animationRangeSharing DO
    IF entry.sourceSkeleton is disposed OR entry.skeleton is disposed THEN
      RETURN true
    END IF
    IF scene.skeletons does NOT contain entry.sourceSkeleton THEN
      RETURN true
    END IF
    IF scene.skeletons does NOT contain entry.skeleton THEN
      RETURN true
    END IF
  END FOR

  FOR EACH entry IN state.animationSharing DO
    IF entry.sourceMesh is disposed OR entry.mesh is disposed THEN
      RETURN true
    END IF
  END FOR

  RETURN false
END FUNCTION
```

### Examples

- Character A copies animations from Character B. B is deleted. `_animationRangeSharing` has `{ skeleton: A.skel, sourceSkeleton: B.skel(disposed) }`. On save, `resolveRuntimeRangeEntries()` reads `B.skel.id` from the disposed object → invalid/stale ID is serialized. On load, restore fails or double-applies.
- Same scenario with animation groups: `_animationSharing` has `{ mesh: A.root, sourceMesh: B.root(disposed) }`. On save, `resolveRuntimeEntries()` reads `B.root.id` → stale. On load, `restoreSharedAnimationGroups()` can't find source → skips or errors.
- Second save/load cycle: doubled metadata from first cycle causes `stripSharedSkeletonAnimations()` to strip A's own bone data → all animations lost.
- Edge case: Character A copies from B, Character C also copies from B. B is deleted. Both entries become stale. Both A and C should become independent owners.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Two characters of the same type both in the scene → dedup works normally, strip/restore cycle is correct
- A character with non-shared animations → no stripping or modification on save
- Source character NOT deleted → sharing relationship managed correctly across save/load
- Non-source sharing character deleted → remaining characters maintain correct relationship
- Legacy saves without `animationRangeSharing` → runtime dedup still works

**Scope:**
All deletion cases where the deleted mesh/skeleton is NOT referenced in any sharing entry should be completely unaffected. This includes:
- Deleting primitive meshes
- Deleting non-animated characters
- Deleting characters that were never a source or target of `linkAnimationsToSkeleton`

## Hypothesized Root Cause

Based on code analysis, the root cause is clear:

1. **No cleanup in `deleteTheMesh()`**: The method disposes the mesh but never removes entries from `_animationRangeSharing` or `_animationSharing`. These arrays retain references to disposed objects.

2. **`resolveRuntimeRangeEntries()` reads `.id` from disposed skeletons**: BabylonJS Skeleton objects retain their `.id` property after disposal, but the skeleton is no longer in `scene.skeletons`. The serialized `sourceSkeletonId` points to a skeleton that won't exist on load.

3. **No "promotion to owner" logic**: When the source of a sharing relationship is deleted, the sharing character should become an independent owner (its animations are already in memory). Instead, the stale metadata persists and confuses the save/load pipeline.

4. **Double-application on first load**: The stale entry causes `restoreSharedSkeletonAnimations()` to either find no source (skip) or find a wrong skeleton. If it skips, the sharing character's animations were never stripped (since at save time, `stripSharedSkeletonAnimations` tried to strip using the stale skeleton ID and may have failed to match). The net effect depends on timing — but the result is animation duplication or complete loss.

## Correctness Properties

Property 1: Bug Condition - Stale Sharing Entries Removed on Deletion

_For any_ scene state where a mesh/skeleton referenced in `_animationRangeSharing` or `_animationSharing` is deleted via `deleteTheMesh()`, the cleanup functions SHALL remove all entries that reference the deleted skeleton or mesh, ensuring no disposed references remain in the sharing arrays after deletion.

**Validates: Requirements 2.3, 2.4**

Property 2: Preservation - Non-Deletion Dedup Behavior Unchanged

_For any_ scene where no mesh referenced in the sharing arrays is deleted, the `cleanupSharingEntries` functions (when called with a non-referenced skeleton/mesh) SHALL produce no change to `_animationRangeSharing` or `_animationSharing`, preserving the existing dedup behavior identically.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `src/util/AnimRangeDedup.ts`

**New Function**: `cleanupRangeSharingEntries(entries, skeleton)`

**Specific Changes**:
1. **Add `cleanupRangeSharingEntries()` function**: Accepts the `RuntimeRangeSharingEntry[]` and a `Skeleton` being deleted. Returns a new array with all entries referencing that skeleton (as either `skeleton` or `sourceSkeleton`) removed.
   - If the deleted skeleton is the `sourceSkeleton`, the entry is removed (the sharing character becomes an independent owner)
   - If the deleted skeleton is the `skeleton` (the sharing character itself), the entry is removed

---

**File**: `src/util/AnimGroupDedup.ts`

**New Function**: `cleanupGroupSharingEntries(entries, mesh)`

**Specific Changes**:
2. **Add `cleanupGroupSharingEntries()` function**: Accepts the `RuntimeSharingEntry[]` and a `Node` (root mesh) being deleted. Returns a new array with all entries referencing that node (as either `mesh` or `sourceMesh`) removed.
   - Same logic as above: if deleted node is `sourceMesh`, sharing characters become owners; if `mesh`, entry is removed

---

**File**: `src/Vishva.ts`

**Function**: `deleteTheMesh(mesh)`

**Specific Changes**:
3. **Import cleanup functions** at the top of the file
4. **Call cleanup before `mesh.dispose()`**: Before the mesh is disposed, determine its skeleton (if any) and root mesh, then call both cleanup functions to purge stale entries from `_animationRangeSharing` and `_animationSharing`
5. **Handle hierarchy**: The deleted mesh might be a child — find the root to match against `RuntimeSharingEntry.mesh` / `RuntimeSharingEntry.sourceMesh`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, write a test that demonstrates the bug condition on unfixed code (stale entries persist after deletion), then verify the fix removes them correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that after simulating deletion, stale entries remain in the sharing arrays.

**Test Plan**: Create mock sharing entries with skeleton/mesh references, simulate what happens when one is "deleted" (no cleanup called), and verify that `resolveRuntimeRangeEntries()` produces entries with IDs that would be invalid on load.

**Test Cases**:
1. **Stale Source Skeleton**: Create entries where `sourceSkeleton` is a skeleton that gets "deleted" — verify entries persist with stale refs (will fail on unfixed code because no cleanup exists)
2. **Stale Sharing Skeleton**: Create entries where `skeleton` itself is deleted — verify entries persist
3. **Stale Source Mesh (AG)**: Same for `_animationSharing` with mesh references
4. **Multiple stale entries**: Delete a source that multiple characters share from — all entries stale

**Expected Counterexamples**:
- After deletion, `_animationRangeSharing.length` is unchanged (entries not cleaned up)
- `resolveRuntimeRangeEntries()` returns entries with IDs of disposed skeletons

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (a referenced skeleton/mesh is deleted), the cleanup functions produce correct results.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition(state) DO
  result := cleanupRangeSharingEntries(state.animationRangeSharing, deletedSkeleton)
  ASSERT no entry in result references deletedSkeleton
  ASSERT entries NOT referencing deletedSkeleton are preserved
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (the deleted skeleton/mesh is not in any sharing entry), the cleanup functions return the original array unchanged.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition(state) DO
  result := cleanupRangeSharingEntries(state.animationRangeSharing, unrelatedSkeleton)
  ASSERT result is identical to state.animationRangeSharing
END FOR
```

**Testing Approach**: Property-based testing is recommended because:
- It generates many combinations of sharing entries and deletion targets
- It catches edge cases (empty arrays, single entries, all entries referencing the deleted skeleton)
- It provides strong guarantees that unrelated entries are never modified

**Test Plan**: Observe behavior on UNFIXED code (no cleanup → entries persist), then write property-based tests that assert cleanup correctness.

**Test Cases**:
1. **Unrelated Deletion Preservation**: Delete a skeleton not in any entry → array unchanged
2. **Non-animated Mesh Preservation**: Delete a mesh with no skeleton → sharing arrays unchanged
3. **Multi-character Preservation**: Delete sharing character (not source) → source and other sharers' entries remain correct

### Unit Tests

- Test `cleanupRangeSharingEntries` with source skeleton deleted → entry removed
- Test `cleanupRangeSharingEntries` with sharing skeleton deleted → entry removed
- Test `cleanupGroupSharingEntries` with source mesh deleted → entry removed
- Test `cleanupGroupSharingEntries` with sharing mesh deleted → entry removed
- Test with empty arrays → returns empty
- Test with multiple entries, only some referencing deleted → correct subset removed

### Property-Based Tests

- Generate random arrays of `RuntimeRangeSharingEntry` (mock skeletons with unique IDs) and random "deletion target" → verify all entries referencing target are removed, others preserved
- Generate random arrays of `RuntimeSharingEntry` (mock meshes) and random deletion target → same property
- Generate arrays where no entry references the deletion target → verify array is returned unchanged (preservation)

### Integration Tests

- Full `deleteTheMesh()` flow: create sharing entries, delete source mesh, verify arrays are cleaned
- Save/load round-trip after deletion: verify no stale metadata in serialized output
- Multiple deletions in sequence: verify correct state after each
