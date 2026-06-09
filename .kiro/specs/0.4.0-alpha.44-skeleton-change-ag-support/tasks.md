# Implementation Plan: skeleton-change-ag-support

## Overview

Extend `Vishva.changeSkeleton()` to support AG-driven skeletons alongside the existing AR-driven path, and add the `AnimUtils.isAGDrivenSkeleton()` helper that the new logic depends on. Tests are co-located with their implementation tasks so errors are caught early.

## Tasks

- [x] 1. Add `AnimUtils.isAGDrivenSkeleton()` to `src/util/AnimUtils.ts`
  - [x] 1.1 Implement `isAGDrivenSkeleton(skel: Skeleton): boolean`
    - Add a new static method to the `AnimUtils` class in `src/util/AnimUtils.ts`
    - Return `false` for `null`/`undefined` input, for `null`/empty `bones` arrays, and when all bones return `null` from `getLinkedTransformNode()`
    - Return `true` when `skel.bones.some(b => b.getLinkedTransformNode() != null)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x]* 1.2 Write property test for `isAGDrivenSkeleton` (Property 1)
    - Create `src/util/AnimUtils.property.test.ts`
    - **Property 1: `isAGDrivenSkeleton` reflects linked TransformNode presence**
    - Use `fc.array(fc.option(fc.constant({ name: 'tn' })))` to generate arrays of nullable linked-TransformNode slots; wrap into mock skeleton with bones whose `getLinkedTransformNode()` returns the generated value
    - Assert `isAGDrivenSkeleton(mock) === mock.bones.some(b => b.getLinkedTransformNode() != null)` for every generated input including `null` skeleton, empty bones, and mixed presence
    - Tag: `// Feature: skeleton-change-ag-support, Property 1: isAGDrivenSkeleton reflects linked TransformNode presence`
    - Minimum 100 iterations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x]* 1.3 Write unit tests for `isAGDrivenSkeleton`
    - Create `src/util/AnimUtils.test.ts`
    - Cover: `null` → `false`, `{ bones: [] }` → `false`, all-null linked TN → `false`, one non-null linked TN → `true`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Rewrite `Vishva.changeSkeleton()` in `src/Vishva.ts`
  - [x] 2.1 Add the `findHostMesh` local helper and the type-mismatch guard
    - Inside the rewritten `changeSkeleton()`, resolve the current skeleton via `AnimUtils.getMeshSkel()` and the replacement skeleton via `scene.getSkeletonByUniqueId()`; return `false` if either is missing
    - Call `AnimUtils.isAGDrivenSkeleton()` on both skeletons; return `false` if their types differ
    - Implement the `findHostMesh(skel)` inner helper that scans `scene.meshes` for the first `AbstractMesh` whose `.skeleton === skel`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_

  - [x]* 2.2 Write property test for the type-mismatch guard (Property 2)
    - Create `src/Vishva.changeSkeleton.property.test.ts`
    - **Property 2: Type-mismatch guard always rejects mismatched pairs**
    - Generate one AR skeleton mock (all bones return `null` from `getLinkedTransformNode()`) and one AG skeleton mock (at least one bone returns non-null); randomly assign one as current and one as replacement via a mock scene
    - Assert the return value is `false` and that no spy on `.skeleton` setter, `.parent` setter, or `.dispose()` was called
    - Tag: `// Feature: skeleton-change-ag-support, Property 2: Type-mismatch guard always rejects mismatched pairs`
    - Minimum 100 iterations
    - _Requirements: 2.3, 2.4_

  - [x]* 2.3 Write property test for `findHostMesh` resolution (Property 4)
    - In `src/Vishva.changeSkeleton.property.test.ts`
    - **Property 4: Host mesh resolution finds the first matching mesh**
    - Use `fc.array(fc.record({ skeleton: fc.option(fc.constant('TARGET')) }))` to produce arrays of mesh-like objects; assert the resolver returns the first element with `.skeleton === target`, or `null` if none
    - Tag: `// Feature: skeleton-change-ag-support, Property 4: Host mesh resolution finds the first matching mesh`
    - Minimum 100 iterations
    - _Requirements: 6.1, 6.2_

  - [x] 2.4 Implement the AR-to-AR swap branch
    - Guard: `this.meshSelected instanceof AbstractMesh` — return `false` if not
    - Reassign `meshSelected.skeleton = replacementSkel`; leave the original skeleton in the scene; return `true`
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 2.5 Implement the AG-to-AG TransformNode swap branch
    - Guard: `this.meshSelected` is NOT `instanceof Mesh` (plain TransformNode case)
    - Call `getChildMeshes(false)` on the selected TransformNode to collect all `instanceof Mesh` descendants; return `false` if none
    - Resolve `hostMesh` via `findHostMesh(replacementSkel)`; return `false` if not found (before any mutations)
    - For each descendant Mesh: set `.skeleton = replacementSkel` and `.parent = hostMesh`
    - Dispose the original TransformNode; dispose the current (original) skeleton
    - Return `true`
    - _Requirements: 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.2_

  - [x]* 2.6 Write property test for AG-to-AG TransformNode Mesh collection (Property 3)
    - In `src/Vishva.changeSkeleton.property.test.ts`
    - **Property 3: AG-to-AG TransformNode swap collects all and only Mesh descendants**
    - Use `fc.letrec` to generate mock TransformNode hierarchies of random depth (1–4) and branching (0–4 children); randomly type each child as `Mesh` or plain `TransformNode`
    - Assert the collected set equals the full set of `Mesh` instances reachable via an independent DFS over the generated tree
    - Tag: `// Feature: skeleton-change-ag-support, Property 3: AG-to-AG TransformNode swap collects all and only Mesh descendants`
    - Minimum 100 iterations
    - _Requirements: 4.1, 4.3_

  - [x] 2.7 Implement the AG-to-AG Mesh swap branch
    - Guard: `this.meshSelected instanceof Mesh`
    - Resolve `hostMesh` via `findHostMesh(replacementSkel)`; return `false` if not found (no mutations)
    - Set `meshSelected.skeleton = replacementSkel` and `meshSelected.parent = hostMesh`
    - Do NOT dispose any TransformNode or skeleton
    - Return `true`
    - _Requirements: 2.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2_

- [x] 3. Checkpoint — Ensure all tests pass
  - Run `npm test` and verify all tests pass; ask the user if any questions arise.

- [x] 4. Add unit tests for `changeSkeleton` scenarios
  - [x] 4.1 Add unit tests covering all `changeSkeleton` branches and guard conditions
    - Add to `src/Vishva.changeSkeleton.property.test.ts` (or a dedicated `src/Vishva.changeSkeleton.test.ts`)
    - Cover: no current skeleton → `false`; bad skelId → `false`; AR+AR with `AbstractMesh` → `true` + `.skeleton` reassigned; AR+AR with plain TransformNode → `false`; AG+AG TransformNode with no Mesh descendants → `false`; AG+AG TransformNode with 2 meshes → `true`, both re-skeletoned and re-parented, original TN disposed, original skeleton disposed; AG+AG Mesh with host found → `true`, `.skeleton` and `.parent` updated, nothing disposed; AG+AG Mesh with no host → `false`, no mutations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2_

  - [x]* 4.2 Add `changeSkeleton` integration tests to `AnimationUI.test.ts`
    - Add to the existing `src/gui/propspanel/AnimationUI.test.ts`
    - Verify `animSkelChange.onclick` calls `this._vishva.changeSkeleton(selectedOption.value)` with the selected skeleton's uniqueId string
    - Verify `this.update()` is called on `true` return and `DialogMgr.showAlertDiag("Error: unable to switch")` is called on `false` return
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Final checkpoint — Ensure all tests pass
  - Run `npm test` and verify all tests pass; ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster implementation
- Property tests use `fast-check 4.7.0` and `vitest 4.1.5` per project config
- `getChildMeshes(false)` returns all descendant meshes (not just direct children) — this is the correct call for the TransformNode AG branch
- `findHostMesh` is a local inner function inside `changeSkeleton`, not a method on `AnimUtils`
- All `false` returns in `changeSkeleton` must happen before any scene mutations to avoid partial state
- `AnimationUI` needs no changes — `changeSkeleton()` signature is unchanged and `this.update()` / `showAlertDiag` are already wired up

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "2.6"] },
    { "id": 4, "tasks": ["2.7"] },
    { "id": 5, "tasks": ["3"] },
    { "id": 6, "tasks": ["4.1", "4.2"] },
    { "id": 7, "tasks": ["5"] }
  ]
}
```
