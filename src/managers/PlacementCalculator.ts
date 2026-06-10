/**
 * Smart Asset Placement Calculator
 *
 * Pure computation module — no BabylonJS dependencies.
 * Operates on plain vector data for testability without scene/DOM mocks.
 */

/** Simple 3D vector type (plain object, NOT BabylonJS Vector3) */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/** Describes how the asset load was triggered */
export type PlacementMode = 'camera-direction' | 'ground-raycast' | 'cursor';

/** Carries the placement mode, camera state, pick point, and ground info */
export interface PlacementContext {
    mode: PlacementMode;

    // Camera state
    cameraPosition: Vector3;
    cameraDirection: Vector3;  // normalized forward vector
    cameraTarget: Vector3;

    // Avatar state (used in camera-direction mode)
    avatarPosition?: Vector3;
    avatarForward?: Vector3;   // avatar's world-space forward direction
    isFocusOnAv: boolean;

    // Ground state
    groundMesh?: { exists: boolean };

    // Cursor pick (used in cursor mode)
    pickPoint?: Vector3 | null;

    // Asset bounding box (post-scaling)
    boundingBox: { min: Vector3; max: Vector3 };
}

/** Output of placement computation */
export interface PlacementResult {
    position: Vector3;          // world-space position for rootMesh
    rotationY?: number;         // optional Y-axis rotation (radians) — used for fallback face-camera
    usedFallback: boolean;      // whether fallback was applied
}

/**
 * Pure-logic placement calculator.
 * Given inputs (vectors, ray hits, bounding boxes), computes final position and Y-rotation.
 */
export class PlacementCalculator {
    static readonly PLACEMENT_DISTANCE = 2;       // metres from avatar
    static readonly RAY_MAX_DISTANCE = 100;       // max ground-ray length
    static readonly FALLBACK_DISTANCE = 2;        // minimum units in front of camera
    static readonly FALLBACK_PADDING = 1.25;      // 25% extra padding so asset doesn't fill the screen
    static readonly HORIZONTAL_EPSILON = 0.001;   // threshold for vertical camera check
    static readonly FAR_GROUND_RATIO = 5;         // if ground distance > ratio × asset height, treat as no ground

    /**
     * Compute placement position for camera-direction mode.
     * Projects camera forward onto XZ plane, reverses if pointing at camera side of avatar.
     */
    computeCameraDirectionPlacement(ctx: PlacementContext): PlacementResult {
        // Default avatar position and forward if not provided
        const avatarPos: Vector3 = ctx.avatarPosition ?? { x: 0, y: 0, z: 0 };
        const avatarFwd: Vector3 = ctx.avatarForward ?? { x: 0, y: 0, z: 1 };

        // Step 1: Project camera forward onto XZ plane
        let projX = ctx.cameraDirection.x;
        let projZ = ctx.cameraDirection.z;

        // Step 2: Compute XZ magnitude
        const mag = Math.sqrt(projX * projX + projZ * projZ);

        // Step 3: If magnitude < HORIZONTAL_EPSILON, fall back to avatar forward (also XZ-projected)
        if (mag < PlacementCalculator.HORIZONTAL_EPSILON) {
            const avFwdMag = Math.sqrt(avatarFwd.x * avatarFwd.x + avatarFwd.z * avatarFwd.z);
            if (avFwdMag < PlacementCalculator.HORIZONTAL_EPSILON) {
                // Ultimate fallback: use +Z direction
                projX = 0;
                projZ = 1;
            } else {
                projX = avatarFwd.x / avFwdMag;
                projZ = avatarFwd.z / avFwdMag;
            }
        } else {
            // Step 4: Normalize the XZ projection
            projX = projX / mag;
            projZ = projZ / mag;
        }

        // Step 5: Check if projected direction points from avatar toward camera
        // Compute vector from avatar to camera (XZ only)
        const camToAvatarX = ctx.cameraPosition.x - avatarPos.x;
        const camToAvatarZ = ctx.cameraPosition.z - avatarPos.z;
        // Dot product of projected direction with avatar-to-camera vector
        const dot = projX * camToAvatarX + projZ * camToAvatarZ;
        // If dot > 0, the projection points toward the camera → reverse it
        if (dot > 0) {
            projX = -projX;
            projZ = -projZ;
        }

        // Step 6: Compute placement point
        const placementPoint: Vector3 = {
            x: avatarPos.x + projX * PlacementCalculator.PLACEMENT_DISTANCE,
            y: avatarPos.y,
            z: avatarPos.z + projZ * PlacementCalculator.PLACEMENT_DISTANCE,
        };

        // Step 7: Compute closest corner based on placement direction
        const corner = this.computeClosestCorner(ctx.boundingBox, { x: projX, y: 0, z: projZ });

        // Step 8: Position mesh so that the corner sits at the placement point
        // If mesh is at position P, then corner in world space = P + corner
        // We want P + corner = placementPoint, so P = placementPoint - corner
        const posX = placementPoint.x - corner.x;
        const posZ = placementPoint.z - corner.z;

        // Step 9: Ground alignment — use avatar's Y as ground Y
        const posY = this.computeGroundAlignment(ctx.boundingBox, avatarPos.y);

        const position: Vector3 = { x: posX, y: posY, z: posZ };

        // Rotate asset to face camera
        const rotationY = this.computeFaceCameraRotation(position, ctx.cameraPosition);

        return { position, rotationY, usedFallback: false };
    }

    /**
     * Compute placement for ground ray-cast mode.
     * Casts ray from camera in camera direction, returns hit point or fallback.
     * If ground is hit but distance is more than FAR_GROUND_RATIO × asset height,
     * treat as if ground is not visible and use in-front-of-camera placement.
     */
    computeGroundRaycastPlacement(ctx: PlacementContext, groundHitPoint: Vector3 | null): PlacementResult {
        if (groundHitPoint === null) {
            return this.computeFallbackPosition(ctx.cameraPosition, ctx.cameraDirection, ctx.boundingBox);
        }

        // Check if ground is too far relative to asset height
        const assetHeight = ctx.boundingBox.max.y - ctx.boundingBox.min.y;
        const dx = groundHitPoint.x - ctx.cameraPosition.x;
        const dy = groundHitPoint.y - ctx.cameraPosition.y;
        const dz = groundHitPoint.z - ctx.cameraPosition.z;
        const groundDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (assetHeight > 0 && groundDist > PlacementCalculator.FAR_GROUND_RATIO * assetHeight) {
            return this.computeFallbackPosition(ctx.cameraPosition, ctx.cameraDirection, ctx.boundingBox);
        }

        const groundAlignment = this.computeGroundAlignment(ctx.boundingBox, groundHitPoint.y);

        const position: Vector3 = {
            x: groundHitPoint.x,
            y: groundAlignment,
            z: groundHitPoint.z,
        };

        // Rotate asset to face camera
        const rotationY = this.computeFaceCameraRotation(position, ctx.cameraPosition);

        return {
            position,
            rotationY,
            usedFallback: false,
        };
    }

    /**
     * Compute placement for cursor/drag-drop mode.
     * Uses pick point if available, otherwise fallback.
     */
    computeCursorPlacement(ctx: PlacementContext): PlacementResult {
        if (ctx.pickPoint == null) {
            return this.computeFallbackPosition(ctx.cameraPosition, ctx.cameraDirection, ctx.boundingBox);
        }

        const verticalOffset = this.computeGroundAlignment(ctx.boundingBox, ctx.pickPoint.y);
        const position: Vector3 = {
            x: ctx.pickPoint.x,
            y: verticalOffset,
            z: ctx.pickPoint.z,
        };

        // Rotate asset to face camera
        const rotationY = this.computeFaceCameraRotation(position, ctx.cameraPosition);

        return { position, rotationY, usedFallback: false };
    }

    /**
     * Compute the fallback position: place asset in front of camera so it is fully visible.
     * The asset is centered vertically in the camera view.
     * Distance is the max BB dimension × 1.25 (so it doesn't fill the screen), minimum FALLBACK_DISTANCE.
     * Also computes face-camera Y rotation.
     */
    computeFallbackPosition(cameraPosition: Vector3, cameraDirection: Vector3, boundingBox?: { min: Vector3; max: Vector3 }): PlacementResult {
        // Compute distance: ensure the whole bounding box is visible
        let distance = PlacementCalculator.FALLBACK_DISTANCE;
        let verticalOffset = 0;

        if (boundingBox) {
            const width = boundingBox.max.x - boundingBox.min.x;
            const height = boundingBox.max.y - boundingBox.min.y;
            const depth = boundingBox.max.z - boundingBox.min.z;
            // Use the largest dimension with 25% padding
            const maxDim = Math.max(width, height, depth) * PlacementCalculator.FALLBACK_PADDING;
            distance = Math.max(PlacementCalculator.FALLBACK_DISTANCE, maxDim);
            // Center the asset vertically: offset so the BB center Y aligns with camera ray
            const bbCenterY = (boundingBox.min.y + boundingBox.max.y) / 2;
            verticalOffset = -bbCenterY;
        }

        const position: Vector3 = {
            x: cameraPosition.x + cameraDirection.x * distance,
            y: cameraPosition.y + cameraDirection.y * distance + verticalOffset,
            z: cameraPosition.z + cameraDirection.z * distance,
        };

        // Compute Y rotation so asset faces the camera
        const rotationY = this.computeFaceCameraRotation(position, cameraPosition);

        return { position, rotationY, usedFallback: true };
    }

    /**
     * Compute Y-axis rotation so asset faces the camera in the XZ plane.
     */
    computeFaceCameraRotation(assetPosition: Vector3, cameraPosition: Vector3): number {
        const dx = cameraPosition.x - assetPosition.x;
        const dz = cameraPosition.z - assetPosition.z;
        return Math.atan2(dx, dz);
    }

    /**
     * Adjust position so bounding box min Y rests on ground surface.
     * Returns the vertical offset to apply.
     */
    computeGroundAlignment(boundingBox: { min: Vector3; max: Vector3 }, groundY: number): number {
        return groundY - boundingBox.min.y;
    }

    /**
     * Determine which bounding box corner is closest to the avatar based on
     * the horizontal quadrant of the placement direction.
     * Returns the corner vector (with min Y for ground alignment).
     *
     * Quadrant logic (based on signs of direction.x and direction.z):
     *   Q1 (+X, +Z) → (min.x, min.y, min.z)
     *   Q2 (−X, +Z) → (max.x, min.y, min.z)
     *   Q3 (−X, −Z) → (max.x, min.y, max.z)
     *   Q4 (+X, −Z) → (min.x, min.y, max.z)
     *
     * Zero components are treated as positive (fallback to Q1 behavior for that axis).
     */
    computeClosestCorner(boundingBox: { min: Vector3; max: Vector3 }, direction: Vector3): Vector3 {
        // Treat zero as positive for quadrant determination
        const xPositive = direction.x >= 0;
        const zPositive = direction.z >= 0;

        // Select X component: positive direction → min.x, negative direction → max.x
        const cornerX = xPositive ? boundingBox.min.x : boundingBox.max.x;

        // Select Z component: positive direction → min.z, negative direction → max.z
        const cornerZ = zPositive ? boundingBox.min.z : boundingBox.max.z;

        // Always use min.y for ground alignment
        return { x: cornerX, y: boundingBox.min.y, z: cornerZ };
    }
}
