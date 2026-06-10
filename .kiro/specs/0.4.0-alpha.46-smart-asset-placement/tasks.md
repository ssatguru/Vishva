# Implementation Plan: Smart Asset Placement

## Overview

This plan implements the Smart Asset Placement system by extracting placement logic from `LoadManager` into a pure `PlacementCalculator` class, defining the supporting data structures (`PlacementContext`, `PlacementResult`), and refactoring `LoadManager.positionAsset` to use the new calculator with mode-based dispatch (camera-direction, ground-raycast, cursor). Property-based tests validate the mathematical correctness of the calculator, and integration tests verify orchestration in `LoadManager`.

## Tasks

- [x] 1. Create PlacementCalculator module with data structures and core interfaces
  - [x] 1.1 Create `src/managers/PlacementCalculator.ts` with `PlacementContext` interface, `PlacementResult` interface, `PlacementMode` type, and `PlacementCalculator` class skeleton (constants + empty method stubs)
    - Define `PlacementMode` type: `'camera-direction' | 'ground-raycast' | 'cursor'`
    - Define `PlacementContext` interface with all fields from design (cameraPosition, cameraDirection, cameraTarget, avatarPosition, avatarForward, isFocusOnAv, groundMesh, pickPoint, boundingBox)
    - Define `PlacementResult` interface (position, rotationY, usedFallback)
    - Define `PlacementCalculator` class with static constants (PLACEMENT_DISTANCE=2, RAY_MAX_DISTANCE=100, FALLBACK_DISTANCE=2, HORIZONTAL_EPSILON=0.001)
    - Add method stubs for: `computeCameraDirectionPlacement`, `computeGroundRaycastPlacement`, `computeCursorPlacement`, `computeFallbackPosition`, `computeGroundAlignment`, `computeClosestCorner`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 5.1_

- [x] 2. Implement PlacementCalculator methods
  - [x] 2.1 Implement `computeFallbackPosition` and `computeGroundAlignment`
    - `computeFallbackPosition`: returns cameraPosition + (cameraDirection × FALLBACK_DISTANCE), computes Y rotation to face camera, sets usedFallback=true
    - `computeGroundAlignment`: given bounding box and groundY, returns vertical offset so BB min Y aligns with groundY
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.4_

  - [x] 2.2 Implement `computeClosestCorner`
    - Determine horizontal quadrant of direction vector (sign of X and Z components)
    - Q1 (+X, +Z) → use min X, min Z corner; Q2 (−X, +Z) → use max X, min Z corner; Q3 (−X, −Z) → use max X, max Z corner; Q4 (+X, −Z) → use min X, max Z corner
    - Return corner Vector3 with min Y for ground alignment
    - _Requirements: 1.2_

  - [x] 2.3 Implement `computeCameraDirectionPlacement`
    - Project camera forward onto XZ plane (zero out Y, normalize)
    - If XZ magnitude < HORIZONTAL_EPSILON, fall back to avatarForward direction
    - Check if projected direction points from avatar toward camera; if so, reverse it
    - Compute placement point: avatarPosition + projectedDirection × PLACEMENT_DISTANCE
    - Use `computeClosestCorner` to determine which BB corner to position at placement point
    - Apply `computeGroundAlignment` for vertical positioning using avatar Y as ground Y
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.4 Implement `computeGroundRaycastPlacement`
    - Accept `groundHitPoint: Vector3 | null` parameter
    - If groundHitPoint is not null: place asset at hit point, apply `computeGroundAlignment`, set usedFallback=false
    - If groundHitPoint is null: delegate to `computeFallbackPosition`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.5 Implement `computeCursorPlacement`
    - If ctx.pickPoint is not null: place asset at pickPoint, apply `computeGroundAlignment`, set usedFallback=false
    - If ctx.pickPoint is null: delegate to `computeFallbackPosition`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 2.6 Write property test: Camera-direction distance and direction correctness
    - **Property 1: Camera-direction placement produces correct distance and direction**
    - Generate random camera forward vectors and avatar positions
    - Assert placement point is exactly 2 units from avatar on XZ plane
    - Assert direction matches XZ-projected camera forward (or reversed if pointing toward camera)
    - Assert avatar forward is used when camera is vertical
    - **Validates: Requirements 1.1, 1.3, 1.4**

  - [x] 2.7 Write property test: Bounding-box corner quadrant selection
    - **Property 2: Bounding-box corner selection matches placement quadrant**
    - Generate random bounding boxes and direction vectors
    - Assert correct corner is selected based on horizontal quadrant of direction
    - **Validates: Requirements 1.2**

  - [x] 2.8 Write property test: Ground alignment
    - **Property 3: Ground alignment places bounding-box minimum Y at ground surface**
    - Generate random bounding boxes (including zero-height) and ground Y values
    - Assert that after adjustment, BB min Y equals ground Y
    - **Validates: Requirements 2.2, 3.1, 5.1, 5.4**

  - [x] 2.9 Write property test: Fallback position computation
    - **Property 5: Fallback position is exactly 2 units along camera direction with no ground adjustment**
    - Generate random camera positions and normalized directions
    - Assert fallback position equals cameraPosition + cameraDirection × 2
    - Assert usedFallback is true and no vertical BB adjustment is applied
    - **Validates: Requirements 2.3, 3.2, 3.5, 4.1, 4.2, 5.2**

  - [x] 2.10 Write property test: Fallback face-camera rotation
    - **Property 6: Fallback rotation orients asset toward camera**
    - Generate random fallback positions and camera positions
    - Assert computed Y rotation makes asset forward (−Z) point toward camera in XZ plane
    - **Validates: Requirements 4.3**

- [x] 3. Checkpoint - Ensure all PlacementCalculator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor LoadManager to use PlacementCalculator
  - [x] 4.1 Add `buildPlacementContext` method to `LoadManager`
    - Read `vishva.isFocusOnAv` to determine mode
    - Read camera position, direction, and target from the active camera
    - Read avatar position and forward from AvManager/CharacterController
    - Check ground mesh existence
    - Compute bounding box via `getHierarchyBoundingVectors()` after scaling
    - For drop events: extract clientX/clientY and perform scene pick to get pickPoint
    - For dialog loads with drop: use last tracked pointer position
    - Return fully populated `PlacementContext`
    - _Requirements: 1.1, 2.1, 3.3, 3.4_

  - [x] 4.2 Add canvas pointer tracking to `LoadManager`
    - Track `_lastCanvasPointerPosition: { x: number; y: number } | null` on pointermove over canvas
    - Used for dialog-initiated loads where no drop event coordinates exist
    - _Requirements: 3.4_

  - [x] 4.3 Add `pickGround` and `pickGroundAtScreenPoint` helper methods
    - `pickGround(ray)`: cast ray against ground mesh, return hit point or null
    - `pickGroundAtScreenPoint(x, y)`: create picking ray from screen coords, pick ground, return hit point or null
    - Respect RAY_MAX_DISTANCE (100 units) limit
    - _Requirements: 2.1, 3.1, 3.3_

  - [x] 4.4 Refactor `positionAsset` to use `PlacementCalculator`
    - Change signature to accept `loadType: 'dialog' | 'drop'` and optional `dropEvent?: DragEvent`
    - Call `buildPlacementContext` to gather scene state
    - Dispatch based on mode: call appropriate `PlacementCalculator` method
    - For ground-raycast mode: perform ground pick and pass result to calculator
    - Apply `PlacementResult.position` to rootMesh
    - Apply `PlacementResult.rotationY` if present
    - Guard against null rootMesh
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 4.5 Update call sites of `positionAsset` in `LoadManager`
    - Update `onMeshLoaded` (dialog load path) to pass `loadType: 'dialog'`
    - Update drag-and-drop handler to pass `loadType: 'drop'` and the `DragEvent`
    - Ensure backward compatibility: when `PlacementContext` cannot be built (legacy paths), fall back to existing avatar-forward logic
    - _Requirements: 1.1, 2.1, 3.1, 3.3, 3.4_

- [x] 5. Checkpoint - Ensure LoadManager compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Write unit and integration tests
  - [x] 6.1 Write unit tests for PlacementCalculator
    - Create `src/managers/PlacementCalculator.test.ts`
    - Test specific camera angles (0°, 90°, 180°, 270°) confirming placement direction
    - Test known bounding box with known direction confirming exact corner selection
    - Test exact fallback position with specific camera state
    - Test edge case: camera perfectly vertical (XZ magnitude < 0.001)
    - Test edge case: bounding box with min Y = max Y (flat object)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 5.4_

  - [x] 6.2 Write property test: Ground ray-cast intersection validity
    - Create test in `src/managers/PlacementCalculator.property.test.ts`
    - **Property 4: Ground ray-cast intersection lies on ground plane within range**
    - Generate random camera positions and directions where ground plane exists
    - Assert intersection Y equals ground Y and distance ≤ 100 units
    - **Validates: Requirements 2.1**

  - [x] 6.3 Write integration tests for LoadManager placement orchestration
    - Create `src/managers/LoadManager.placement.test.ts`
    - Verify `buildPlacementContext` correctly reads `isFocusOnAv`, camera state, and ground mesh
    - Verify drop event coordinates are correctly extracted
    - Verify last pointer position tracking over canvas
    - Verify `positionAsset` selects correct placement mode based on context
    - _Requirements: 1.1, 2.1, 3.1, 3.3, 3.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `PlacementCalculator` is intentionally free of BabylonJS dependencies — it operates on plain vector data, making it testable without scene/DOM mocks
- All Vector3 operations in the calculator should use basic arithmetic (no dependency on `@babylonjs/core` Vector3 class) or import only the math utilities needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.6", "2.7", "2.8", "2.9", "2.10"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4"] },
    { "id": 6, "tasks": ["4.5"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```
