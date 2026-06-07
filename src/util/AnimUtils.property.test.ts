// Feature: skeleton-change-ag-support, Property 1: isAGDrivenSkeleton reflects linked TransformNode presence

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AnimUtils } from "./AnimUtils";

/**
 * Property 1: `isAGDrivenSkeleton` reflects linked TransformNode presence
 *
 * For any skeleton object (including null, skeletons with empty bone lists,
 * skeletons with all-null linked TransformNodes, and skeletons with at least
 * one non-null linked TransformNode), `AnimUtils.isAGDrivenSkeleton` SHALL
 * return `true` if and only if at least one bone's `getTransformNode()`
 * is non-null, and `false` in all other cases.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 */
describe("Feature: skeleton-change-ag-support, Property 1: isAGDrivenSkeleton reflects linked TransformNode presence", () => {

    /**
     * Generator: produce arrays of nullable linked-TransformNode slot values.
     * Each element is either null (no linked TN) or { name: 'tn' } (has linked TN).
     * Wrap into a mock skeleton whose bones return these values from getTransformNode().
     */
    const arbTnValues = fc.array(
        fc.option(fc.constant({ name: "tn" }))
    );

    it("isAGDrivenSkeleton(mock) === mock.bones.some(b => b.getTransformNode() != null) for all generated inputs", () => {
        fc.assert(
            fc.property(arbTnValues, (tnValues) => {
                const mock = {
                    bones: tnValues.map((tn) => ({
                        getTransformNode: () => tn,
                    })),
                };

                const result = AnimUtils.isAGDrivenSkeleton(mock as any);
                const expected = mock.bones.some((b) => b.getTransformNode() != null);

                expect(result).toBe(expected);
            }),
            { numRuns: 100 }
        );
    });

    it("returns false for null skeleton", () => {
        expect(AnimUtils.isAGDrivenSkeleton(null as any)).toBe(false);
    });

    it("returns false for skeleton with empty bones array", () => {
        const mock = { bones: [] };
        expect(AnimUtils.isAGDrivenSkeleton(mock as any)).toBe(false);
    });

    it("returns false when all bones have null linked TransformNode", () => {
        fc.assert(
            fc.property(
                fc.array(fc.constant(null), { minLength: 1, maxLength: 10 }),
                (nullValues) => {
                    const mock = {
                        bones: nullValues.map(() => ({
                            getTransformNode: () => null,
                        })),
                    };
                    expect(AnimUtils.isAGDrivenSkeleton(mock as any)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("returns true when at least one bone has a non-null linked TransformNode", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.option(fc.constant({ name: "tn" })),
                    { minLength: 1, maxLength: 10 }
                ).filter((arr) => arr.some((v) => v != null)),
                (tnValues) => {
                    const mock = {
                        bones: tnValues.map((tn) => ({
                            getTransformNode: () => tn,
                        })),
                    };
                    expect(AnimUtils.isAGDrivenSkeleton(mock as any)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
