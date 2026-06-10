import { describe, it, expect } from 'vitest';
import { PlacementCalculator, PlacementContext, Vector3 } from './PlacementCalculator';

describe('PlacementCalculator', () => {
    const calc = new PlacementCalculator();

    /** Helper: build a minimal PlacementContext for camera-direction mode */
    function makeCameraDirectionCtx(overrides: Partial<PlacementContext> = {}): PlacementContext {
        return {
            mode: 'camera-direction',
            cameraPosition: { x: 0, y: 5, z: -5 },
            cameraDirection: { x: 0, y: 0, z: 1 },
            cameraTarget: { x: 0, y: 0, z: 0 },
            avatarPosition: { x: 0, y: 0, z: 0 },
            avatarForward: { x: 0, y: 0, z: 1 },
            isFocusOnAv: true,
            boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
            ...overrides,
        };
    }

    describe('Camera direction placement at specific angles', () => {
        it('0° (forward +Z): camera behind avatar looking forward places asset in +Z direction', () => {
            // Camera at (0,5,-10), looking roughly toward +Z
            // direction projected to XZ: (0, 1) normalized = (0,1)
            // avatar-to-camera XZ: (0 - 0, -10 - 0) = (0, -10)
            // dot of (0,1) with (0,-10) = -10 < 0 → no reversal
            // Placement: avatar(0,0,0) + (0,0,1)*2 = (0,0,2)
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: 5, z: -10 },
                cameraDirection: { x: 0, y: -0.5, z: 0.866 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBeCloseTo(0, 5);
            expect(result.position.z).toBeCloseTo(2, 5);
            expect(result.position.y).toBeCloseTo(0, 5);
        });

        it('90° (camera to the left, looking +X): places asset in +X direction', () => {
            // Camera at (-10, 5, 0) looking toward +X
            // direction XZ projection: (0.866, 0) → normalized (1, 0)
            // avatar-to-camera XZ: (-10 - 0, 0 - 0) = (-10, 0)
            // dot of (1,0) with (-10,0) = -10 < 0 → no reversal
            // Placement: avatar(0,0,0) + (1,0,0)*2 = (2,0,0)
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: -10, y: 5, z: 0 },
                cameraDirection: { x: 0.866, y: -0.5, z: 0 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBeCloseTo(2, 5);
            expect(result.position.z).toBeCloseTo(0, 5);
        });

        it('180° (camera in front of avatar, looking -Z): places asset in -Z direction', () => {
            // Camera at (0, 5, 10) looking toward -Z
            // direction XZ projection: (0, -0.866) → normalized (0, -1)
            // avatar-to-camera XZ: (0, 10)
            // dot of (0,-1) with (0,10) = -10 < 0 → no reversal
            // Placement: avatar(0,0,0) + (0,0,-1)*2 = (0,0,-2)
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: 5, z: 10 },
                cameraDirection: { x: 0, y: -0.5, z: -0.866 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBeCloseTo(0, 5);
            expect(result.position.z).toBeCloseTo(-2, 5);
        });

        it('270° (camera to the right, looking -X): places asset in -X direction', () => {
            // Camera at (10, 5, 0) looking toward -X
            // direction XZ projection: (-0.866, 0) → normalized (-1, 0)
            // avatar-to-camera XZ: (10, 0)
            // dot of (-1,0) with (10,0) = -10 < 0 → no reversal
            // Placement: avatar(0,0,0) + (-1,0,0)*2 = (-2,0,0)
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 10, y: 5, z: 0 },
                cameraDirection: { x: -0.866, y: -0.5, z: 0 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBeCloseTo(-2, 5);
            expect(result.position.z).toBeCloseTo(0, 5);
        });

        it('reverses direction when camera forward points toward camera from avatar', () => {
            // Camera at (0,5,5), direction pointing toward -Z (back toward avatar)
            // XZ projection of direction: (0, -1)
            // avatar-to-camera XZ: (0, 5)
            // dot of (0,-1) with (0,5) = -5 < 0 → no reversal needed; direction already points away
            // But let's set direction pointing toward camera (+Z when camera is at +Z):
            // Camera at (0,5,5), direction = (0, -0.5, 0.866) → XZ = (0, 0.866) → normalized (0,1)
            // avatar-to-camera: (0, 5)
            // dot of (0,1) with (0,5) = 5 > 0 → REVERSE → (0,-1)
            // Placement: (0,0,0) + (0,0,-1)*2 = (0,0,-2)
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: 5, z: 5 },
                cameraDirection: { x: 0, y: -0.5, z: 0.866 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBeCloseTo(0, 5);
            expect(result.position.z).toBeCloseTo(-2, 5);
        });
    });

    describe('Bounding-box corner selection by quadrant', () => {
        const bb = { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 2, z: 1 } };

        it('Q1 (+X, +Z) direction selects (min.x, min.y, min.z) corner', () => {
            const corner = calc.computeClosestCorner(bb, { x: 1, y: 0, z: 1 });
            expect(corner).toEqual({ x: -1, y: 0, z: -1 });
        });

        it('Q2 (-X, +Z) direction selects (max.x, min.y, min.z) corner', () => {
            const corner = calc.computeClosestCorner(bb, { x: -1, y: 0, z: 1 });
            expect(corner).toEqual({ x: 1, y: 0, z: -1 });
        });

        it('Q3 (-X, -Z) direction selects (max.x, min.y, max.z) corner', () => {
            const corner = calc.computeClosestCorner(bb, { x: -1, y: 0, z: -1 });
            expect(corner).toEqual({ x: 1, y: 0, z: 1 });
        });

        it('Q4 (+X, -Z) direction selects (min.x, min.y, max.z) corner', () => {
            const corner = calc.computeClosestCorner(bb, { x: 1, y: 0, z: -1 });
            expect(corner).toEqual({ x: -1, y: 0, z: 1 });
        });

        it('zero direction components treated as positive (falls to Q1)', () => {
            const corner = calc.computeClosestCorner(bb, { x: 0, y: 0, z: 0 });
            expect(corner).toEqual({ x: -1, y: 0, z: -1 });
        });
    });

    describe('Fallback position computation', () => {
        it('camera at (5,10,3) direction (0,-1,0) produces fallback at (5,8,3)', () => {
            const result = calc.computeFallbackPosition(
                { x: 5, y: 10, z: 3 },
                { x: 0, y: -1, z: 0 }
            );
            expect(result.position).toEqual({ x: 5, y: 8, z: 3 });
            expect(result.usedFallback).toBe(true);
            // rotation: dx = 5-5=0, dz = 3-3=0, atan2(0,0)=0
            expect(result.rotationY).toBe(0);
        });

        it('camera at (0,0,0) direction (0,0,1) produces fallback at (0,0,2) with rotation π', () => {
            const result = calc.computeFallbackPosition(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 }
            );
            expect(result.position).toEqual({ x: 0, y: 0, z: 2 });
            expect(result.usedFallback).toBe(true);
            // rotation: dx = 0-0=0, dz = 0-2=-2, atan2(0,-2)= π
            expect(result.rotationY).toBeCloseTo(Math.PI, 5);
        });

        it('camera at (3,4,5) direction (1,0,0) produces fallback at (5,4,5)', () => {
            const result = calc.computeFallbackPosition(
                { x: 3, y: 4, z: 5 },
                { x: 1, y: 0, z: 0 }
            );
            expect(result.position).toEqual({ x: 5, y: 4, z: 5 });
            expect(result.usedFallback).toBe(true);
            // rotation: dx = 3-5=-2, dz = 5-5=0, atan2(-2,0) = -π/2
            expect(result.rotationY).toBeCloseTo(-Math.PI / 2, 5);
        });
    });

    describe('Edge case: camera perfectly vertical', () => {
        it('vertical camera direction (0,-1,0) uses avatar forward (0,0,1) for placement', () => {
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: 10, z: 0 },
                cameraDirection: { x: 0, y: -1, z: 0 },
                avatarPosition: { x: 0, y: 0, z: 0 },
                avatarForward: { x: 0, y: 0, z: 1 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            // Avatar forward (0,0,1), avatar-to-camera XZ: (0, 0)
            // dot of (0,1) with (0,0) = 0, not > 0, no reversal
            // Placement: (0,0,0) + (0,0,1)*2 = (0,0,2)
            expect(result.position.x).toBeCloseTo(0, 5);
            expect(result.position.z).toBeCloseTo(2, 5);
            expect(result.position.y).toBeCloseTo(0, 5);
        });

        it('vertical camera direction (0,1,0) with avatar forward (-1,0,0) places in -X', () => {
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: -10, z: 0 },
                cameraDirection: { x: 0, y: 1, z: 0 },
                avatarPosition: { x: 5, y: 0, z: 5 },
                avatarForward: { x: -1, y: 0, z: 0 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            // Avatar forward XZ: (-1, 0), normalized = (-1, 0)
            // avatar-to-camera XZ: (0-5, 0-5) = (-5, -5)
            // dot of (-1,0) with (-5,-5) = 5 > 0 → REVERSE → (1, 0)
            // Placement: (5,0,5) + (1,0,0)*2 = (7,0,5)
            expect(result.position.x).toBeCloseTo(7, 5);
            expect(result.position.z).toBeCloseTo(5, 5);
            expect(result.position.y).toBeCloseTo(0, 5);
        });

        it('vertical camera with near-zero XZ (0, -1, 0.0005) still uses avatar forward', () => {
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: 10, z: 0 },
                cameraDirection: { x: 0, y: -1, z: 0.0005 },
                avatarPosition: { x: 0, y: 0, z: 0 },
                avatarForward: { x: 1, y: 0, z: 0 },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            // XZ mag = 0.0005 < 0.001 → use avatar forward (1, 0, 0)
            // avatar-to-camera XZ: (0, 0), dot = 0, no reversal
            // Placement: (0,0,0) + (1,0,0)*2 = (2,0,0)
            expect(result.position.x).toBeCloseTo(2, 5);
            expect(result.position.z).toBeCloseTo(0, 5);
        });
    });

    describe('Edge case: flat bounding box (min Y = max Y)', () => {
        it('BB with min.y = max.y = 5, groundY = 0 → ground alignment offset is -5', () => {
            const bb = { min: { x: 0, y: 5, z: 0 }, max: { x: 2, y: 5, z: 2 } };
            const offset = calc.computeGroundAlignment(bb, 0);
            // offset = groundY - bb.min.y = 0 - 5 = -5
            expect(offset).toBe(-5);
        });

        it('BB with min.y = max.y = 0, groundY = 3 → ground alignment offset is 3', () => {
            const bb = { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 0, z: 1 } };
            const offset = calc.computeGroundAlignment(bb, 3);
            // offset = 3 - 0 = 3
            expect(offset).toBe(3);
        });

        it('flat BB at camera-direction placement correctly uses ground alignment', () => {
            // Flat BB at y=2, avatar at ground y=0
            const ctx = makeCameraDirectionCtx({
                cameraPosition: { x: 0, y: 5, z: -10 },
                cameraDirection: { x: 0, y: -0.5, z: 0.866 },
                avatarPosition: { x: 0, y: 0, z: 0 },
                boundingBox: { min: { x: 0, y: 2, z: 0 }, max: { x: 1, y: 2, z: 1 } },
            });

            const result = calc.computeCameraDirectionPlacement(ctx);
            // Ground alignment: avatarY(0) - bb.min.y(2) = -2
            expect(result.position.y).toBeCloseTo(-2, 5);
        });
    });

    describe('Ground raycast placement', () => {
        it('with hit point places at hit and applies ground alignment', () => {
            const ctx = makeCameraDirectionCtx({
                mode: 'ground-raycast',
                cameraPosition: { x: 10, y: 3, z: 15 }, // close to hit point
                cameraDirection: { x: 0, y: -1, z: 0 },
                boundingBox: { min: { x: -0.5, y: -1, z: -0.5 }, max: { x: 0.5, y: 1, z: 0.5 } },
            });
            const hitPoint: Vector3 = { x: 10, y: 0, z: 15 };

            const result = calc.computeGroundRaycastPlacement(ctx, hitPoint);
            // Distance = 3, assetHeight = 2, 5*2 = 10 > 3 → not far
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBe(10);
            expect(result.position.z).toBe(15);
            // ground alignment: groundY(0) - bb.min.y(-1) = 1
            expect(result.position.y).toBe(1);
        });

        it('without hit point falls back to camera fallback position', () => {
            const ctx = makeCameraDirectionCtx({
                mode: 'ground-raycast',
                cameraPosition: { x: 0, y: 5, z: 0 },
                cameraDirection: { x: 0, y: 0, z: 1 },
            });

            const result = calc.computeGroundRaycastPlacement(ctx, null);
            expect(result.usedFallback).toBe(true);
            expect(result.position).toEqual({ x: 0, y: 5, z: 2 });
        });
    });

    describe('Cursor placement', () => {
        it('with pick point places at pick point with ground alignment', () => {
            const ctx = makeCameraDirectionCtx({
                mode: 'cursor',
                pickPoint: { x: 7, y: 0, z: 3 },
                boundingBox: { min: { x: 0, y: -0.5, z: 0 }, max: { x: 1, y: 1, z: 1 } },
            });

            const result = calc.computeCursorPlacement(ctx);
            expect(result.usedFallback).toBe(false);
            expect(result.position.x).toBe(7);
            expect(result.position.z).toBe(3);
            // ground alignment: pickY(0) - bb.min.y(-0.5) = 0.5
            expect(result.position.y).toBeCloseTo(0.5, 5);
        });

        it('without pick point falls back', () => {
            const ctx = makeCameraDirectionCtx({
                mode: 'cursor',
                pickPoint: null,
                cameraPosition: { x: 1, y: 2, z: 3 },
                cameraDirection: { x: 0, y: 0, z: 1 },
            });

            const result = calc.computeCursorPlacement(ctx);
            expect(result.usedFallback).toBe(true);
            expect(result.position).toEqual({ x: 1, y: 2, z: 5 });
        });
    });
});
