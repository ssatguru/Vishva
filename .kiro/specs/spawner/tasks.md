# Implementation Plan: Spawner

## Overview

Implement a Spawner system that provides dedicated avatar/camera placement when a scene loads. The system supports multiple spawn points with relative transforms, visual arrow-shaped mesh indicators, serialization via VishvaSerialized, and random selection at load time. It replaces the legacy `spawnPointId` mechanism.

## Tasks

- [x] 1. Set up spawner module structure and interfaces
  - [x] 1.1 Create spawner interfaces and types
    - Create `src/managers/spawner/Spawner.ts` with the `Spawner` interface
    - Create `src/managers/spawner/SpawnerSerialized.ts` with the `SpawnerSerialized` interface
    - Create `src/managers/spawner/SpawnResult.ts` with the `SpawnResult` interface
    - _Requirements: 3.1, 3.2, 5.5_

  - [x] 1.2 Create SpawnerMeshFactory
    - Create `src/managers/spawner/SpawnerMeshFactory.ts` with a static `createArrowMesh` method
    - Build a flat arrow-shaped mesh using VertexData with ≤20 triangles and ≤0.05 Y-axis thickness
    - Apply a unique material color not used by other Vishva internal meshes
    - Set mesh metadata: `isInternal: true`, `isInvisible: true`, and tags `"Vishva.internal"` and `"invisible"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 2. Implement SpawnerManager core logic
  - [x] 2.1 Create SpawnerManager class with creation and update methods
    - Create `src/managers/spawner/SpawnerManager.ts`
    - Implement `createSpawner()`: compute ground-level position (avatar position minus ellipsoid height), orient mesh to avatar Y rotation, compute relative transforms (inverse world matrix for position, rotation difference for Y), store camera params and target offset
    - Implement `updateSpawner()`: reposition existing spawner mesh to current avatar ground-level position and orientation, recompute relative transforms
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3_

  - [x] 2.2 Implement spawn transform computation
    - Implement `computeSpawnTransform()`: transform relative avatar position from local to world space via spawner mesh world matrix, combine spawner mesh Y rotation with relative rotation, compute camera target from avatar position plus stored offset, handle non-uniform scale on position but not rotation
    - _Requirements: 3.4, 3.5, 3.7, 6.1, 6.2, 6.3_

  - [x] 2.3 Implement collection management and random selection
    - Implement `getSpawners()`, `removeSpawner()`, `selectRandom()`, `dispose()`
    - Subscribe to mesh `onDispose` observable in `createSpawner` to auto-remove spawner when mesh is deleted
    - `selectRandom()` returns a uniformly random spawner from the collection, or null if empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.4_

  - [ ]* 2.4 Write property test: Avatar position round-trip (Property 1)
    - **Property 1: Avatar position round-trip**
    - Generate random Vector3 positions, Y rotations, and world matrices; verify world→local→world produces original values within floating-point tolerance
    - **Validates: Requirements 3.1, 3.4, 6.1, 6.2**

  - [ ]* 2.5 Write property test: Camera parameter round-trip (Property 2)
    - **Property 2: Camera parameter round-trip**
    - Generate random alpha, beta, radius, target, and avatar positions; verify storing offset and reconstructing produces original values
    - **Validates: Requirements 3.2, 3.5, 6.3**

  - [ ]* 2.6 Write property test: Ground-level placement with correct orientation (Property 4)
    - **Property 4: Ground-level placement with correct orientation**
    - Generate random avatar positions (y > 0), ellipsoid heights, and Y rotations; verify mesh placed at (x, y - ellipsoidHeight, z) with matching Y rotation
    - **Validates: Requirements 1.4, 1.5, 2.2, 2.4**

  - [ ]* 2.7 Write property test: Non-uniform scale preserves rotation (Property 5)
    - **Property 5: Non-uniform scale preserves rotation**
    - Generate random non-uniform scale vectors and relative transforms; verify scale applies to position but rotation is unaffected by scale
    - **Validates: Requirements 3.7**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement serialization and deserialization
  - [x] 4.1 Implement serialize and deserialize methods
    - Implement `serialize()`: convert each spawner to `SpawnerSerialized` format with mesh ID, relative position/rotation, and camera params
    - Implement `deserialize()`: reconstruct spawners from serialized data, look up meshes by ID, discard spawners with missing mesh IDs and log console warning
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.2 Add spawners field to VishvaSerialized
    - Add `spawners: SpawnerSerialized[]` field to `VishvaSerialized` class in `src/VishvaSerialized.ts`
    - Initialize to empty array by default
    - _Requirements: 5.1, 5.2_

  - [ ]* 4.3 Write property test: Spawner serialization round-trip (Property 3)
    - **Property 3: Spawner serialization round-trip**
    - Generate random SpawnerSerialized objects; verify serialize→deserialize produces equivalent data
    - **Validates: Requirements 3.6, 5.1, 5.3, 5.5**

  - [ ]* 4.4 Write property test: Collection addition preserves existing spawners (Property 6)
    - **Property 6: Collection addition preserves existing spawners**
    - Generate random spawner collections, add one, verify all originals unchanged and size is N+1
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 4.5 Write property test: Collection deletion removes exactly one (Property 7)
    - **Property 7: Collection deletion removes exactly one**
    - Generate random collections, remove one, verify size is N-1 and remaining spawners unchanged
    - **Validates: Requirements 4.3, 4.5**

  - [ ]* 4.6 Write property test: Random selection always returns a valid member (Property 8)
    - **Property 8: Random selection always returns a valid member**
    - Generate random non-empty collections; verify selectRandom returns a member of the collection
    - **Validates: Requirements 6.4**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate with Vishva, SaveManager, and LoadManager
  - [x] 6.1 Integrate SpawnerManager into Vishva
    - Add `spawnerManager: SpawnerManager` field to `Vishva` class
    - Instantiate SpawnerManager during `loadBabylonjsPart` scene initialization
    - Wire spawner serialization into the save flow: include `spawnerManager.serialize()` output in VishvaSerialized when saving
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Integrate spawner deserialization and application into LoadManager
    - During scene load (in `sceneLoad4` flow after avatar and CharacterController are initialized), call `spawnerManager.deserialize()` with spawner data from VishvaSerialized
    - After deserialization, call `selectRandom()` and `computeSpawnTransform()` to get spawn position/rotation
    - Apply computed transforms to avatar mesh, CharacterController, and ArcRotateCamera
    - If no valid spawners exist, fall back to default spawn position (0, 0.2, 0)
    - _Requirements: 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 6.3 Implement legacy spawnPointId handling
    - When loading a world with `spawnPointId` and spawner objects present: ignore legacy spawnPointId
    - When loading a world with `spawnPointId` and no spawner objects: use legacy spawn point position as fallback
    - Remove legacy spawnPoint tag-based search logic from SaveManager serialization code
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Implement NavBar UI and camera focus guard
  - [x] 7.1 Add spawner button to NavBar
    - Add button markup in `NavBarML.ts` with Material Icons icon `my_location` and tooltip "add spawner"
    - _Requirements: 1.1_

  - [x] 7.2 Wire NavBar button click handler with camera focus guard
    - In `VishvaGUI._createNavMenu()`, add click handler for the spawner button
    - Check `Vishva.vishva.isFocusOnAv`: if false, show alert dialog ("cannot create spawner. focus is not on avatar. press esc to switch focus to avatar and try again") and return early
    - If a Spawner_Mesh is currently selected in EditControl, call `updateSpawner()` on that spawner
    - Otherwise, call `createSpawner()` with current avatar and camera state
    - After create/update, select the Spawner_Mesh in EditControl
    - _Requirements: 1.2, 1.3, 1.6, 8.1, 8.2, 8.3_

  - [x] 7.3 Implement spawner mesh visibility with reveal-invisibles system
    - Ensure spawner meshes are invisible and non-pickable by default on load
    - When "reveal invisibles" is toggled on, spawner meshes become visible and pickable with reveal highlight color
    - When "reveal invisibles" is toggled off, spawner meshes return to invisible and non-pickable
    - _Requirements: 2.5, 2.7, 2.8, 2.9_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Write unit tests for integration scenarios
  - [x] 9.1 Write unit tests for SpawnerManager
    - Test spawner creation blocked when isFocusOnAv is false
    - Test spawner update blocked when isFocusOnAv is false
    - Test spawner mesh geometry: ≤20 triangles, ≤0.05 Y thickness
    - Test spawner mesh metadata: isInternal and isInvisible set correctly
    - Test legacy fallback: world with spawnPointId and no spawners uses legacy position
    - Test legacy override: world with both uses spawner system
    - Test invalid mesh ID during deserialization: spawner discarded with console warning
    - Test default spawn when no spawners exist: avatar at (0, 0.2, 0)
    - _Requirements: 1.2, 1.3, 2.1, 2.6, 5.6, 6.5, 7.2, 7.3, 8.1, 8.2_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The spawner module lives in `src/managers/spawner/` following the project's existing directory structure pattern
- Property test file: `src/managers/spawner/SpawnerManager.property.test.ts`
- Unit test file: `src/managers/spawner/SpawnerManager.test.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "2.7"] },
    { "id": 5, "tasks": ["4.1", "4.2"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5", "4.6"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3"] },
    { "id": 9, "tasks": ["7.1"] },
    { "id": 10, "tasks": ["7.2", "7.3"] },
    { "id": 11, "tasks": ["9.1"] }
  ]
}
```
