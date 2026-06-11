import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PlacementCalculator, PlacementContext, Vector3 } from './PlacementCalculator';

/**
 * Property 1: Camera-direction placement produces correct distance and direction
 * Validates: Requirements 1.1, 1.3, 1.4
 */
describe('Property 1: Camera-direction placement produces correct distance and direction', () => {
    const calc = new PlacementCalculator();

    // Helper arbitraries
    const arbPosition = fc.tuple(
        fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true })
    ).map(([x, y, z]) => ({ x, y, z }));

    // Non-vertical camera direction (has significant XZ component)
    const arbNonVerticalDir = fc.tuple(
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true })
    ).filter(([x, _y, z]) => x * x + z * z > 0.01)
        .map(([x, y, z]) => {
            const len = Math.sqrt(x * x + y * y + z * z);
            return { x: x / len, y: y / len, z: z / len };
        });

    // Bounding box arbitrary
    const arbBoundingBox = fc.tuple(
        fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 5, noNaN: true, noDefaultInfinity: true })
    ).map(([mx, my, mz, w, h, d]) => ({
        min: { x: mx, y: my, z: mz },
        max: { x: mx + w, y: my + h, z: mz + d }
    }));

    it('placement point is exactly 2 units from avatar on XZ plane', () => {
        fc.assert(fc.property(
            arbPosition, // avatar position
            arbPosition, // camera position
            arbNonVerticalDir, // camera direction
            (avatarPos, camPos, camDir) => {
                // Use a zero-size bounding box at origin so the corner offset is zero
                // This isolates the distance property from corner selection
                const bb = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
                const avatarFwd = { x: 0, y: 0, z: 1 };
                const ctx: PlacementContext = {
                    mode: 'camera-direction',
                    cameraPosition: camPos,
                    cameraDirection: camDir,
                    cameraTarget: { x: camPos.x + camDir.x, y: camPos.y + camDir.y, z: camPos.z + camDir.z },
                    avatarPosition: avatarPos,
                    avatarForward: avatarFwd,
                    isFocusOnAv: true,
                    boundingBox: bb
                };

                const result = calc.computeCameraDirectionPlacement(ctx);
                // With a zero-size BB, position IS the placement point
                const dx = result.position.x - avatarPos.x;
                const dz = result.position.z - avatarPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                expect(dist).toBeCloseTo(2, 4);
            }
        ), { numRuns: 150 });
    });

    it('uses avatar forward when camera is vertical', () => {
        fc.assert(fc.property(
            arbPosition, // avatar position
            arbPosition, // camera position
            fc.float({ min: Math.fround(0.1), max: 10, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: Math.fround(0.1), max: 10, noNaN: true, noDefaultInfinity: true }),
            (avatarPos, camPos, fwdX, fwdZ) => {
                // Use a zero-size BB to isolate distance property
                const bb = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
                // Vertical camera direction (negligible XZ)
                const camDir = { x: 0, y: -1, z: 0 };
                const avFwdLen = Math.sqrt(fwdX * fwdX + fwdZ * fwdZ);
                const avatarFwd = { x: fwdX / avFwdLen, y: 0, z: fwdZ / avFwdLen };

                const ctx: PlacementContext = {
                    mode: 'camera-direction',
                    cameraPosition: camPos,
                    cameraDirection: camDir,
                    cameraTarget: { x: camPos.x, y: camPos.y - 1, z: camPos.z },
                    avatarPosition: avatarPos,
                    avatarForward: avatarFwd,
                    isFocusOnAv: true,
                    boundingBox: bb
                };

                const result = calc.computeCameraDirectionPlacement(ctx);
                expect(result.usedFallback).toBe(false);

                // With zero-size BB, position IS the placement point
                const dx = result.position.x - avatarPos.x;
                const dz = result.position.z - avatarPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                expect(dist).toBeCloseTo(2, 4);
            }
        ), { numRuns: 150 });
    });
});

/**
 * Property 2: Bounding-box corner selection matches placement quadrant
 * Validates: Requirements 1.2
 */
describe('Property 2: Bounding-box corner selection matches placement quadrant', () => {
    const calc = new PlacementCalculator();

    const arbBoundingBox = fc.tuple(
        fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 20, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 20, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 20, noNaN: true, noDefaultInfinity: true })
    ).map(([mx, my, mz, w, h, d]) => ({
        min: { x: mx, y: my, z: mz },
        max: { x: mx + w, y: my + h, z: mz + d }
    }));

    it('selects correct corner for each quadrant', () => {
        fc.assert(fc.property(
            arbBoundingBox,
            fc.float({ min: Math.fround(0.01), max: 10, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: Math.fround(0.01), max: 10, noNaN: true, noDefaultInfinity: true }),
            (bb, px, pz) => {
                // Q1: +X, +Z → min.x, min.y, min.z
                const q1 = calc.computeClosestCorner(bb, { x: px, y: 0, z: pz });
                expect(q1).toEqual({ x: bb.min.x, y: bb.min.y, z: bb.min.z });

                // Q2: -X, +Z → max.x, min.y, min.z
                const q2 = calc.computeClosestCorner(bb, { x: -px, y: 0, z: pz });
                expect(q2).toEqual({ x: bb.max.x, y: bb.min.y, z: bb.min.z });

                // Q3: -X, -Z → max.x, min.y, max.z
                const q3 = calc.computeClosestCorner(bb, { x: -px, y: 0, z: -pz });
                expect(q3).toEqual({ x: bb.max.x, y: bb.min.y, z: bb.max.z });

                // Q4: +X, -Z → min.x, min.y, max.z
                const q4 = calc.computeClosestCorner(bb, { x: px, y: 0, z: -pz });
                expect(q4).toEqual({ x: bb.min.x, y: bb.min.y, z: bb.max.z });
            }
        ), { numRuns: 100 });
    });
});

/**
 * Property 3: Ground alignment places bounding-box minimum Y at ground surface
 * Validates: Requirements 2.2, 3.1, 5.1, 5.4
 */
describe('Property 3: Ground alignment places bounding-box minimum Y at ground surface', () => {
    const calc = new PlacementCalculator();

    it('aligns BB min Y to ground surface for any bounding box', () => {
        fc.assert(fc.property(
            fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: 0.0, max: 50, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
            (minY, height, groundY) => {
                const bb = {
                    min: { x: 0, y: minY, z: 0 },
                    max: { x: 1, y: minY + height, z: 1 }
                };
                const offset = calc.computeGroundAlignment(bb, groundY);
                const worldMinY = offset + bb.min.y;
                expect(worldMinY).toBeCloseTo(groundY, 5);
            }
        ), { numRuns: 200 });
    });

    it('handles zero-height bounding boxes', () => {
        fc.assert(fc.property(
            fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
            (bbY, groundY) => {
                const bb = {
                    min: { x: 0, y: bbY, z: 0 },
                    max: { x: 1, y: bbY, z: 1 }
                };
                const offset = calc.computeGroundAlignment(bb, groundY);
                expect(offset + bb.min.y).toBeCloseTo(groundY, 5);
            }
        ), { numRuns: 100 });
    });
});

/**
 * Property 4: Ground ray-cast intersection lies on ground plane within range
 * Validates: Requirements 2.1
 */
describe('Property 4: Ground ray-cast placement validity', () => {
    const calc = new PlacementCalculator();

    const arbPosition = fc.tuple(
        fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true })
    ).map(([x, y, z]) => ({ x, y, z }));

    const arbNormalizedDir = fc.tuple(
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true })
    ).filter(([x, y, z]) => x * x + y * y + z * z > 0.01)
        .map(([x, y, z]) => {
            const len = Math.sqrt(x * x + y * y + z * z);
            return { x: x / len, y: y / len, z: z / len };
        });

    const arbBoundingBox = fc.tuple(
        fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: 5, noNaN: true, noDefaultInfinity: true })
    ).map(([mx, my, mz, w, h, d]) => ({
        min: { x: mx, y: my, z: mz },
        max: { x: mx + w, y: my + h, z: mz + d }
    }));

    it('places asset at ground hit point with correct alignment when close enough', () => {
        fc.assert(fc.property(
            arbNormalizedDir, arbBoundingBox,
            (camDir, bb) => {
                // Place camera close to ground hit so it's within FAR_GROUND_RATIO
                const assetHeight = bb.max.y - bb.min.y;
                // Ensure hit is within 5 * height by placing camera close to hit point
                const hitPoint = { x: 5, y: 0, z: 5 };
                const camPos = {
                    x: hitPoint.x - camDir.x * 2,
                    y: hitPoint.y - camDir.y * 2,
                    z: hitPoint.z - camDir.z * 2
                };
                const ctx: PlacementContext = {
                    mode: 'ground-raycast',
                    cameraPosition: camPos,
                    cameraDirection: camDir,
                    cameraTarget: { x: camPos.x + camDir.x, y: camPos.y + camDir.y, z: camPos.z + camDir.z },
                    isFocusOnAv: false,
                    boundingBox: bb
                };
                const result = calc.computeGroundRaycastPlacement(ctx, hitPoint);
                // Distance is 2 which should be <= 5 * assetHeight (height >= 0.1)
                if (2 <= 5 * assetHeight) {
                    expect(result.usedFallback).toBe(false);
                    expect(result.position.x).toBeCloseTo(hitPoint.x, 5);
                    expect(result.position.z).toBeCloseTo(hitPoint.z, 5);
                    expect(result.position.y + bb.min.y).toBeCloseTo(hitPoint.y, 5);
                }
            }
        ), { numRuns: 200 });
    });

    it('uses fallback when ground is too far relative to asset height', () => {
        const bb = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }; // height = 1
        const camPos = { x: 0, y: 0, z: 0 };
        const camDir = { x: 0, y: 0, z: 1 };
        // Hit point at distance 10, which is > 5 * 1 (height)
        const hitPoint = { x: 0, y: 0, z: 10 };
        const ctx: PlacementContext = {
            mode: 'ground-raycast',
            cameraPosition: camPos,
            cameraDirection: camDir,
            cameraTarget: { x: 0, y: 0, z: 1 },
            isFocusOnAv: false,
            boundingBox: bb
        };
        const result = calc.computeGroundRaycastPlacement(ctx, hitPoint);
        expect(result.usedFallback).toBe(true);
    });

    it('falls back when no ground hit', () => {
        fc.assert(fc.property(
            arbPosition, arbNormalizedDir, arbBoundingBox,
            (camPos, camDir, bb) => {
                const ctx: PlacementContext = {
                    mode: 'ground-raycast',
                    cameraPosition: camPos,
                    cameraDirection: camDir,
                    cameraTarget: { x: camPos.x + camDir.x, y: camPos.y + camDir.y, z: camPos.z + camDir.z },
                    isFocusOnAv: false,
                    boundingBox: bb
                };
                const result = calc.computeGroundRaycastPlacement(ctx, null);
                expect(result.usedFallback).toBe(true);
                // Distance is max(2, max(w,h,d) * 1.25)
                const w = bb.max.x - bb.min.x;
                const h = bb.max.y - bb.min.y;
                const d = bb.max.z - bb.min.z;
                const dist = Math.max(2, Math.max(w, h, d) * 1.25);
                expect(result.position.x).toBeCloseTo(camPos.x + camDir.x * dist, 4);
                expect(result.position.z).toBeCloseTo(camPos.z + camDir.z * dist, 4);
                // Y includes vertical centering offset
                const bbCenterY = (bb.min.y + bb.max.y) / 2;
                expect(result.position.y).toBeCloseTo(camPos.y + camDir.y * dist - bbCenterY, 4);
            }
        ), { numRuns: 100 });
    });
});

/**
 * Property 5: Fallback position is exactly 2 units along camera direction with no ground adjustment
 * Validates: Requirements 2.3, 3.2, 3.5, 4.1, 4.2, 5.2
 */
describe('Property 5: Fallback position places asset in front of camera centered vertically', () => {
    const calc = new PlacementCalculator();

    const arbPosition = fc.tuple(
        fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true })
    ).map(([x, y, z]) => ({ x, y, z }));

    const arbNormalizedDir = fc.tuple(
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true })
    ).filter(([x, y, z]) => x * x + y * y + z * z > 0.01)
        .map(([x, y, z]) => {
            const len = Math.sqrt(x * x + y * y + z * z);
            return { x: x / len, y: y / len, z: z / len };
        });

    it('without bounding box: position equals cameraPosition + cameraDirection × 2', () => {
        fc.assert(fc.property(arbPosition, arbNormalizedDir, (camPos, camDir) => {
            const result = calc.computeFallbackPosition(camPos, camDir);
            expect(result.position.x).toBeCloseTo(camPos.x + camDir.x * 2, 5);
            expect(result.position.y).toBeCloseTo(camPos.y + camDir.y * 2, 5);
            expect(result.position.z).toBeCloseTo(camPos.z + camDir.z * 2, 5);
            expect(result.usedFallback).toBe(true);
            expect(result.rotationY).toBeUndefined();
        }), { numRuns: 200 });
    });

    it('with bounding box: distance is max(2, maxDim*1.25) and asset is vertically centered', () => {
        const arbBB = fc.tuple(
            fc.float({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: Math.fround(0.1), max: 10, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: Math.fround(0.1), max: 10, noNaN: true, noDefaultInfinity: true }),
            fc.float({ min: Math.fround(0.1), max: 10, noNaN: true, noDefaultInfinity: true })
        ).map(([minY, w, h, d]) => ({
            min: { x: 0, y: minY, z: 0 },
            max: { x: w, y: minY + h, z: d }
        }));

        fc.assert(fc.property(arbPosition, arbNormalizedDir, arbBB, (camPos, camDir, bb) => {
            const result = calc.computeFallbackPosition(camPos, camDir, bb);
            const w = bb.max.x - bb.min.x;
            const h = bb.max.y - bb.min.y;
            const d = bb.max.z - bb.min.z;
            const maxDim = Math.max(w, h, d) * 1.25;
            const dist = Math.max(2, maxDim);
            const bbCenterY = (bb.min.y + bb.max.y) / 2;

            expect(result.position.x).toBeCloseTo(camPos.x + camDir.x * dist, 4);
            expect(result.position.z).toBeCloseTo(camPos.z + camDir.z * dist, 4);
            expect(result.position.y).toBeCloseTo(camPos.y + camDir.y * dist - bbCenterY, 4);
            expect(result.usedFallback).toBe(true);
        }), { numRuns: 200 });
    });
});


