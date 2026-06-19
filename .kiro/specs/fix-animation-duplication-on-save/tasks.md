# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale Sharing Entries Persist After Deletion
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate stale entries persist in sharing arrays after a referenced skeleton/mesh is "deleted"
  - **Scoped PBT Approach**: Generate arrays of `RuntimeRangeSharingEntry` (using mock Skeleton objects with unique `.id` properties) and a "deletion target" skeleton. The property asserts that after calling `cleanupRangeSharingEntries(entries, deletedSkeleton)`, no entry in the result references `deletedSkeleton` as either `.skeleton` or `.sourceSkeleton`, AND all entries NOT referencing `deletedSkeleton` are preserved unchanged.
  - On unfixed code, `cleanupRangeSharingEntries` does not exist — test will fail (import error or function-not-found)
  - Similarly test `cleanupGroupSharingEntries(entries, deletedMesh)` for `RuntimeSharingEntry[]`
  - Create test file: `src/util/AnimRangeDedup.cleanup.property.test.ts`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — confirms the cleanup functions don't exist yet)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Deletion Dedup Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `resolveRuntimeRangeEntries([{ skeleton: skelA, sourceSkeleton: skelB }])` correctly produces `[{ skeletonId: skelA.id, sourceSkeletonId: skelB.id }]` when both skeletons are valid (not disposed)
  - Observe: `resolveRuntimeEntries([{ mesh: meshA, sourceMesh: meshB }])` correctly produces `[{ meshId: meshA.id, sourceMeshId: meshB.id }]` when both meshes are valid
  - Write property-based test: for all arrays of sharing entries where NO entry references the "deletion target" skeleton/mesh, calling `cleanupRangeSharingEntries(entries, unrelatedSkeleton)` returns the original array unchanged (same length, same entries)
  - Write property-based test: for all arrays of sharing entries where NO entry references the "deletion target" mesh, calling `cleanupGroupSharingEntries(entries, unrelatedMesh)` returns the original array unchanged
  - Write property-based test: existing `resolveRuntimeRangeEntries()` and `resolveRuntimeEntries()` continue to produce correct output for valid (non-disposed) entries
  - Create test file: `src/util/AnimDedup.preservation.property.test.ts`
  - Run tests on UNFIXED code — the resolve functions exist and work correctly; the cleanup functions don't exist yet so preservation tests will also fail initially
  - **EXPECTED OUTCOME**: Resolve function tests PASS; cleanup preservation tests FAIL (cleanup functions don't exist yet)
  - Mark task complete when tests are written, run, and passing/failing status documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement the fix

  - [x] 3.1 Add `cleanupRangeSharingEntries()` to `AnimRangeDedup.ts`
    - Add exported function: `cleanupRangeSharingEntries(entries: RuntimeRangeSharingEntry[], deletedSkeleton: Skeleton): RuntimeRangeSharingEntry[]`
    - Filter out entries where `entry.skeleton === deletedSkeleton` OR `entry.sourceSkeleton === deletedSkeleton`
    - Return the filtered array (do not mutate original)
    - Handle null/undefined/empty entries array → return `[]`
    - _Bug_Condition: isBugCondition(state) where state.animationRangeSharing contains entries referencing disposed skeleton_
    - _Expected_Behavior: After cleanup, no entry references the deleted skeleton; unrelated entries preserved_
    - _Preservation: Entries not referencing the deleted skeleton remain unchanged_
    - _Requirements: 2.3, 2.4_

  - [x] 3.2 Add `cleanupGroupSharingEntries()` to `AnimGroupDedup.ts`
    - Add exported function: `cleanupGroupSharingEntries(entries: RuntimeSharingEntry[], deletedMesh: Node): RuntimeSharingEntry[]`
    - Filter out entries where `entry.mesh === deletedMesh` OR `entry.sourceMesh === deletedMesh`
    - Return the filtered array (do not mutate original)
    - Handle null/undefined/empty entries array → return `[]`
    - _Bug_Condition: isBugCondition(state) where state.animationSharing contains entries referencing disposed mesh_
    - _Expected_Behavior: After cleanup, no entry references the deleted mesh; unrelated entries preserved_
    - _Preservation: Entries not referencing the deleted mesh remain unchanged_
    - _Requirements: 2.3, 2.4_

  - [x] 3.3 Integrate cleanup into `Vishva.deleteTheMesh()`
    - Import `cleanupRangeSharingEntries` from `./util/AnimRangeDedup`
    - Import `cleanupGroupSharingEntries` from `./util/AnimGroupDedup`
    - Import `getRootMesh` from `./util/AnimGroupDedup` (to find root of deleted mesh)
    - Before `mesh.dispose()`, add cleanup logic:
      1. Get the root mesh: `const root = getRootMesh(mesh)`
      2. If `mesh instanceof AbstractMesh && mesh.skeleton`: call `this._animationRangeSharing = cleanupRangeSharingEntries(this._animationRangeSharing, mesh.skeleton)`
      3. Also check children for skeletons (in case root is a TransformNode): iterate `mesh.getChildMeshes()` for any with `.skeleton` and cleanup each
      4. Call `this._animationSharing = cleanupGroupSharingEntries(this._animationSharing, root)`
    - _Bug_Condition: deleteTheMesh called with mesh/skeleton that is referenced in sharing entries_
    - _Expected_Behavior: Sharing arrays purged of all references to the deleted mesh/skeleton before dispose_
    - _Preservation: Meshes not in sharing entries are unaffected; sharing entries for other meshes remain_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stale Sharing Entries Removed
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (cleanup functions exist and remove stale entries)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms cleanup functions work correctly)
    - _Requirements: 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Deletion Dedup Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — resolve functions still work, cleanup with unrelated targets is a no-op)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm test` to execute all property and unit tests
  - Verify no regressions in existing `AnimRangeDedup.property.test.ts` and `AnimGroupDedup.property.test.ts`
  - Verify no TypeScript compile errors
  - Ensure all tests pass, ask the user if questions arise
