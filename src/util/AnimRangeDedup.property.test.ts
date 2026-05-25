import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ============================================================================
// Mock AnimUtils — needed for Property 2 (AG-driven skeleton exclusion).
// The mock is hoisted but only affects deduplicateRangesAtRuntime; pure functions
// (areSkeletonsDuplicates, resolveRuntimeRangeEntries) do not call AnimUtils.
// ============================================================================

/** Set of mesh references that should be treated as AG-driven */
const agDrivenMeshes = new Set<any>();

vi.mock("./AnimUtils", () => ({
    AnimUtils: {
        containsAG: (mesh: any, _ags: any[], _fromRoot: boolean) => {
            return agDrivenMeshes.has(mesh);
        },
    },
}));

import {
    areSkeletonsDuplicates,
    deduplicateRangesAtRuntime,
    resolveRuntimeRangeEntries,
    stripSharedSkeletonAnimations,
    restoreSharedSkeletonAnimations,
    RuntimeRangeSharingEntry,
    AnimRangeSharingEntry,
} from "./AnimRangeDedup";

// ============================================================================
// Helper: Create a mock skeleton from a spec (for Property 1)
// ============================================================================

function createMockSkeletonFromSpec(spec: { name: string; animNames: string[] }[]): MockSkeleton {
    return {
        id: "test",
        name: "test",
        bones: spec.map(s => createMockBone(s.name, s.animNames)),
    };
}

// ============================================================================
// Mock Object Interfaces & Factories
// ============================================================================

interface MockAnimation {
    name: string;
    [key: string]: any;
}

interface MockBone {
    name: string;
    animations: MockAnimation[];
}

interface MockSkeleton {
    id: string;
    name: string;
    bones: MockBone[];
}

function createMockBone(name: string, animNames: string[]): MockBone {
    return {
        name,
        animations: animNames.map(n => ({ name: n })),
    };
}

function createMockSkeleton(id: string, name: string, bones: MockBone[]): MockSkeleton {
    return { id, name, bones };
}

// ============================================================================
// fast-check Arbitraries
// ============================================================================

/** Alphanumeric string 1-15 chars for bone names */
const arbBoneName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,14}$/);

/** Alphanumeric string 1-15 chars for animation names */
const arbAnimName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,14}$/);

/** Alphanumeric string 1-10 chars for skeleton IDs */
const arbSkeletonId = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,9}$/);

/** Mock skeleton spec: array of {boneName, animationNames[]} */
const arbSkeletonSpec = fc.array(
    fc.record({
        name: arbBoneName,
        animNames: fc.array(arbAnimName, { minLength: 0, maxLength: 4 }),
    }),
    { minLength: 1, maxLength: 10 }
);

/**
 * Arbitrary for a RuntimeRangeSharingEntry with mock Skeleton objects.
 * Each skeleton has a unique ID and some bones with animations.
 */
const arbRuntimeEntry = fc.record({
    skeletonId: arbSkeletonId,
    sourceSkeletonId: arbSkeletonId,
    skeletonBones: arbSkeletonSpec,
    sourceSkeletonBones: arbSkeletonSpec,
}).map(({ skeletonId, sourceSkeletonId, skeletonBones, sourceSkeletonBones }) => {
    const skeleton = createMockSkeleton(
        skeletonId,
        `skel_${skeletonId}`,
        skeletonBones.map(b => createMockBone(b.name, b.animNames))
    );
    const sourceSkeleton = createMockSkeleton(
        sourceSkeletonId,
        `skel_${sourceSkeletonId}`,
        sourceSkeletonBones.map(b => createMockBone(b.name, b.animNames))
    );
    return { skeleton, sourceSkeleton } as { skeleton: MockSkeleton; sourceSkeleton: MockSkeleton };
});

/** Arbitrary for an array of RuntimeRangeSharingEntry (1-5 entries) */
const arbRuntimeEntries = fc.array(arbRuntimeEntry, { minLength: 1, maxLength: 5 });

// ============================================================================
// Property Tests
// ============================================================================

describe("Feature: animation-range-sharing, Property 7: resolveRuntimeRangeEntries Produces Correct IDs Without Mutation", () => {
    /**
     * For any array of RuntimeRangeSharingEntry objects (each holding Skeleton references
     * with `.id` properties), resolveRuntimeRangeEntries shall return an AnimRangeSharingEntry
     * array where each entry's `skeletonId` equals the corresponding input's `skeleton.id`
     * and `sourceSkeletonId` equals the corresponding input's `sourceSkeleton.id`.
     * The function shall not mutate any input Skeleton object.
     *
     * **Validates: Requirements 6.4, 9.6**
     */
    it("output skeletonId equals input skeleton.id and sourceSkeletonId equals input sourceSkeleton.id", () => {
        fc.assert(
            fc.property(arbRuntimeEntries, (entries) => {
                const result = resolveRuntimeRangeEntries(entries as any as RuntimeRangeSharingEntry[]);

                // Verify correct length
                expect(result.length).toBe(entries.length);

                // Verify each entry maps IDs correctly
                for (let i = 0; i < entries.length; i++) {
                    expect(result[i].skeletonId).toBe(entries[i].skeleton.id);
                    expect(result[i].sourceSkeletonId).toBe(entries[i].sourceSkeleton.id);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("does not mutate input Skeleton objects", () => {
        fc.assert(
            fc.property(arbRuntimeEntries, (entries) => {
                // Deep-copy skeleton state before the call
                const snapshotsBefore = entries.map(e => ({
                    skeletonId: e.skeleton.id,
                    skeletonName: e.skeleton.name,
                    skeletonBones: JSON.parse(JSON.stringify(e.skeleton.bones)),
                    sourceSkeletonId: e.sourceSkeleton.id,
                    sourceSkeletonName: e.sourceSkeleton.name,
                    sourceSkeletonBones: JSON.parse(JSON.stringify(e.sourceSkeleton.bones)),
                }));

                // Call the function
                resolveRuntimeRangeEntries(entries as any as RuntimeRangeSharingEntry[]);

                // Verify no mutation occurred
                for (let i = 0; i < entries.length; i++) {
                    expect(entries[i].skeleton.id).toBe(snapshotsBefore[i].skeletonId);
                    expect(entries[i].skeleton.name).toBe(snapshotsBefore[i].skeletonName);
                    expect(JSON.stringify(entries[i].skeleton.bones)).toBe(
                        JSON.stringify(snapshotsBefore[i].skeletonBones)
                    );
                    expect(entries[i].sourceSkeleton.id).toBe(snapshotsBefore[i].sourceSkeletonId);
                    expect(entries[i].sourceSkeleton.name).toBe(snapshotsBefore[i].sourceSkeletonName);
                    expect(JSON.stringify(entries[i].sourceSkeleton.bones)).toBe(
                        JSON.stringify(snapshotsBefore[i].sourceSkeletonBones)
                    );
                }
            }),
            { numRuns: 100 }
        );
    });

    it("returns empty array for empty input", () => {
        const result = resolveRuntimeRangeEntries([] as any as RuntimeRangeSharingEntry[]);
        expect(result).toEqual([]);
    });
});


// ============================================================================
// Property 1: Duplicate Detection Correctness
// ============================================================================

describe("Feature: animation-range-sharing, Property 1: Duplicate Detection Correctness", () => {
    /**
     * For any two Skeletons A and B, areSkeletonsDuplicates(A, B) returns true if and only if:
     * (1) both have at least one bone with a non-empty animations array,
     * (2) they have the same set of bone names (case-sensitive, order-independent), and
     * (3) for each bone name, they have the same set of animation names (case-sensitive, order-independent).
     * Furthermore, calling the function shall not mutate either input skeleton.
     *
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 9.5**
     */
    it("returns true iff both have bone animations, same bone name sets, and same per-bone animation name sets", () => {
        fc.assert(
            fc.property(arbSkeletonSpec, arbSkeletonSpec, (specA, specB) => {
                const skelA = createMockSkeletonFromSpec(specA);
                const skelB = createMockSkeletonFromSpec(specB);

                const result = areSkeletonsDuplicates(skelA as any, skelB as any);

                // Compute expected result using the same signature logic as the implementation:
                const computeSignature = (spec: { name: string; animNames: string[] }[]): string => {
                    const hasAnyAnim = spec.some(b => b.animNames.length > 0);
                    if (!hasAnyAnim) return "";

                    const boneEntries: string[] = [];
                    for (const bone of spec) {
                        const animNameSet = new Set(bone.animNames);
                        const sorted = Array.from(animNameSet).sort();
                        boneEntries.push(bone.name + "\0" + sorted.join("\0"));
                    }
                    boneEntries.sort();
                    return boneEntries.join("\x01");
                };

                const sigA = computeSignature(specA);
                const sigB = computeSignature(specB);

                const expected = sigA !== "" && sigB !== "" && sigA === sigB;
                expect(result).toBe(expected);
            }),
            { numRuns: 200 }
        );
    });

    it("identical skeletons are always detected as duplicates (when they have animations)", () => {
        fc.assert(
            fc.property(arbSkeletonSpec, (spec) => {
                // Ensure at least one bone has animations
                const hasAnims = spec.some(b => b.animNames.length > 0);
                if (!hasAnims) return; // skip trivial case

                const skelA = createMockSkeletonFromSpec(spec);
                const skelB = createMockSkeletonFromSpec(spec);

                const result = areSkeletonsDuplicates(skelA as any, skelB as any);
                expect(result).toBe(true);
            }),
            { numRuns: 200 }
        );
    });

    it("skeletons with no bone animations are never duplicates", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        name: arbBoneName,
                        animNames: fc.constant([] as string[]),
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                arbSkeletonSpec,
                (emptySpec, otherSpec) => {
                    const skelEmpty = createMockSkeletonFromSpec(emptySpec);
                    const skelOther = createMockSkeletonFromSpec(otherSpec);

                    // Empty skeleton vs any other
                    expect(areSkeletonsDuplicates(skelEmpty as any, skelOther as any)).toBe(false);
                    // Any other vs empty skeleton
                    expect(areSkeletonsDuplicates(skelOther as any, skelEmpty as any)).toBe(false);
                    // Two empty skeletons
                    expect(areSkeletonsDuplicates(skelEmpty as any, skelEmpty as any)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("does not mutate input skeletons", () => {
        fc.assert(
            fc.property(arbSkeletonSpec, arbSkeletonSpec, (specA, specB) => {
                const skelA = createMockSkeletonFromSpec(specA);
                const skelB = createMockSkeletonFromSpec(specB);

                // Deep snapshot before call
                const snapshotA = JSON.stringify(skelA);
                const snapshotB = JSON.stringify(skelB);

                areSkeletonsDuplicates(skelA as any, skelB as any);

                // Verify no mutation
                expect(JSON.stringify(skelA)).toBe(snapshotA);
                expect(JSON.stringify(skelB)).toBe(snapshotB);
            }),
            { numRuns: 100 }
        );
    });
});


// ============================================================================
// Property 4: Runtime Dedup Is Idempotent
// ============================================================================

describe("Feature: animation-range-sharing, Property 4: Runtime Dedup Is Idempotent", () => {
    /**
     * After applying `deduplicateRangesAtRuntime` twice consecutively:
     * 1. The second invocation returns the same RuntimeRangeSharingEntry array
     *    (same skeleton pairs, same order)
     * 2. The second invocation does not change any bone Animation references
     *    beyond what the first already established
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */

    // ─── Mock Scene Factory ───

    interface MockScene {
        skeletons: MockSkeleton[];
        meshes: MockMesh[];
        animationGroups: any[];
    }

    interface MockMesh {
        skeleton: MockSkeleton | null;
        parent: any;
        getChildren: (predicate?: any, directDescendantsOnly?: boolean) => any[];
    }

    function createMockMesh(skeleton: MockSkeleton | null): MockMesh {
        return {
            skeleton,
            parent: null,
            getChildren: () => [],
        };
    }

    /**
     * Creates a mock scene with N duplicate skeletons (same bone/animation structure)
     * and no animation groups. Each skeleton gets a unique ID but identical bone structure.
     */
    function createDuplicateScene(
        skeletonSpec: { name: string; animNames: string[] }[],
        numCopies: number
    ): MockScene {
        const skeletons: MockSkeleton[] = [];
        const meshes: MockMesh[] = [];

        for (let i = 0; i < numCopies; i++) {
            const skel = createMockSkeleton(
                `skel_${i}`,
                `skeleton_${i}`,
                skeletonSpec.map(b => createMockBone(b.name, b.animNames))
            );
            skeletons.push(skel);
            meshes.push(createMockMesh(skel));
        }

        return {
            skeletons,
            meshes,
            animationGroups: [],
        };
    }

    /** Arbitrary for a scene with duplicate skeletons (2-5 copies, 1-8 bones, 1-4 anims per bone) */
    const arbDuplicateScene = fc.record({
        skeletonSpec: fc.array(
            fc.record({
                name: arbBoneName,
                animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 4 }),
            }),
            { minLength: 1, maxLength: 8 }
        ),
        numCopies: fc.integer({ min: 2, max: 5 }),
    });

    it("second invocation returns same entries as first (same skeleton pairs, same order)", () => {
        fc.assert(
            fc.property(arbDuplicateScene, ({ skeletonSpec, numCopies }) => {
                const scene = createDuplicateScene(skeletonSpec, numCopies);

                // First invocation
                const result1 = deduplicateRangesAtRuntime(scene as any);

                // Second invocation
                const result2 = deduplicateRangesAtRuntime(scene as any);

                // Same number of entries
                expect(result2.length).toBe(result1.length);

                // Same skeleton pairs in same order
                for (let i = 0; i < result1.length; i++) {
                    expect(result2[i].skeleton).toBe(result1[i].skeleton);
                    expect(result2[i].sourceSkeleton).toBe(result1[i].sourceSkeleton);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("second invocation does not change any bone Animation references beyond what the first established", () => {
        fc.assert(
            fc.property(arbDuplicateScene, ({ skeletonSpec, numCopies }) => {
                const scene = createDuplicateScene(skeletonSpec, numCopies);

                // First invocation — establishes shared references
                deduplicateRangesAtRuntime(scene as any);

                // Snapshot all bone animation references after first invocation
                const refsAfterFirst = scene.skeletons.map(skel =>
                    skel.bones.map(bone => [...bone.animations])
                );

                // Second invocation — should be a no-op for references
                deduplicateRangesAtRuntime(scene as any);

                // Verify no references changed
                for (let s = 0; s < scene.skeletons.length; s++) {
                    const skel = scene.skeletons[s];
                    for (let b = 0; b < skel.bones.length; b++) {
                        const bone = skel.bones[b];
                        expect(bone.animations.length).toBe(refsAfterFirst[s][b].length);
                        for (let a = 0; a < bone.animations.length; a++) {
                            expect(bone.animations[a]).toBe(refsAfterFirst[s][b][a]);
                        }
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("scene with no duplicate skeletons returns empty array on both invocations", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        name: arbBoneName,
                        animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (boneSpec) => {
                    // Create a scene with a single skeleton (no duplicates possible)
                    const scene = createDuplicateScene(boneSpec, 1);

                    const result1 = deduplicateRangesAtRuntime(scene as any);
                    const result2 = deduplicateRangesAtRuntime(scene as any);

                    expect(result1).toEqual([]);
                    expect(result2).toEqual([]);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================================================
// Property 3: Runtime Dedup Shares Bone Animation References While Preserving Structure
// ============================================================================

// ─── Mock Scene Helpers for Property 3 ───

interface MockAnimationRange {
    name: string;
    from: number;
    to: number;
}

interface MockMesh {
    skeleton: MockSkeleton | null;
    parent: null;
    getChildren: (predicate?: any, directDescendantsOnly?: boolean) => any[];
}

interface MockAnimationGroup {
    targetedAnimations: { target: any; animation: any }[];
}

interface MockScene {
    skeletons: MockSkeleton[];
    meshes: MockMesh[];
    animationGroups: MockAnimationGroup[];
}

/**
 * Creates a mock skeleton with bones and animations from a spec.
 * Each bone gets its own Animation objects (distinct references).
 * Also supports getAnimationRanges() for range preservation checks.
 */
function createMockSkeletonForScene(
    id: string,
    spec: { name: string; animNames: string[] }[],
    ranges?: MockAnimationRange[]
): MockSkeleton {
    const skel: MockSkeleton = {
        id,
        name: `skel_${id}`,
        bones: spec.map(s => ({
            name: s.name,
            animations: s.animNames.map(n => ({ name: n, _id: `${id}_${s.name}_${n}` })),
        })),
    };
    // Attach getAnimationRanges if ranges provided
    (skel as any).getAnimationRanges = () => ranges || [];
    return skel;
}

/**
 * Creates a mock mesh that references a skeleton.
 * The mesh has no parent and no children (not targeted by AGs).
 */
function createMockMesh(skeleton: MockSkeleton | null): MockMesh {
    return {
        skeleton,
        parent: null,
        getChildren: () => [],
    };
}

/**
 * Creates a mock scene with the given skeletons, meshes, and no animation groups.
 * This ensures no skeleton is AG-driven.
 */
function createMockScene(skeletons: MockSkeleton[], meshes: MockMesh[]): MockScene {
    return {
        skeletons,
        meshes,
        animationGroups: [],
    };
}

// ─── Arbitraries for Property 3 ───

/** Skeleton spec with at least one bone having at least one animation (ensures non-empty signature) */
const arbSkeletonSpecWithAnims = fc.array(
    fc.record({
        name: arbBoneName,
        animNames: fc.array(arbAnimName, { minLength: 0, maxLength: 4 }),
    }),
    { minLength: 1, maxLength: 8 }
).filter(spec => spec.some(b => b.animNames.length > 0));

/** Arbitrary for a unique skeleton spec (different from the duplicate spec) */
const arbUniqueSkeletonSpec = fc.array(
    fc.record({
        name: arbBoneName,
        animNames: fc.array(arbAnimName, { minLength: 0, maxLength: 4 }),
    }),
    { minLength: 1, maxLength: 8 }
).filter(spec => spec.some(b => b.animNames.length > 0));

/**
 * Arbitrary for a scene with duplicate skeletons and optionally unique skeletons.
 * - duplicateSpec: the bone/anim structure shared by all duplicate skeletons
 * - numDuplicates: how many skeletons share this structure (2-5)
 * - uniqueSpecs: 0-2 unique skeletons with different structures
 */
const arbSceneWithDuplicates = fc.record({
    duplicateSpec: arbSkeletonSpecWithAnims,
    numDuplicates: fc.integer({ min: 2, max: 5 }),
    uniqueSpecs: fc.array(arbUniqueSkeletonSpec, { minLength: 0, maxLength: 2 }),
    ranges: fc.array(
        fc.record({
            name: arbAnimName,
            from: fc.integer({ min: 0, max: 100 }),
            to: fc.integer({ min: 101, max: 300 }),
        }),
        { minLength: 0, maxLength: 3 }
    ),
});

describe("Feature: animation-range-sharing, Property 3: Runtime Dedup Shares Bone Animation References While Preserving Structure", () => {
    /**
     * For any scene with duplicate skeletons (not AG-driven), after deduplicateRangesAtRuntime:
     * (1) the number of Skeleton objects in the scene is unchanged,
     * (2) each skeleton's animation ranges are unchanged (same names, same from/to values),
     * (3) for each sharing skeleton and each bone name matching the source skeleton, the bone's
     *     Animation objects are the same references (===) as the source skeleton's corresponding
     *     bone's Animation objects, and
     * (4) skeletons with no duplicates have all their bone Animation references unchanged.
     *
     * **Validates: Requirements 2.3, 2.5, 7.3, 8.2, 10.2, 13.2**
     */
    it("skeleton count is unchanged after deduplicateRangesAtRuntime", () => {
        fc.assert(
            fc.property(arbSceneWithDuplicates, ({ duplicateSpec, numDuplicates, uniqueSpecs, ranges }) => {
                // Build duplicate skeletons
                const skeletons: MockSkeleton[] = [];
                const meshes: MockMesh[] = [];

                for (let i = 0; i < numDuplicates; i++) {
                    const skel = createMockSkeletonForScene(`dup_${i}`, duplicateSpec, ranges);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                // Build unique skeletons
                for (let i = 0; i < uniqueSpecs.length; i++) {
                    const skel = createMockSkeletonForScene(`unique_${i}`, uniqueSpecs[i], []);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                const scene = createMockScene(skeletons, meshes);
                const countBefore = scene.skeletons.length;

                deduplicateRangesAtRuntime(scene as any);

                expect(scene.skeletons.length).toBe(countBefore);
            }),
            { numRuns: 100 }
        );
    });

    it("animation ranges are unchanged after deduplicateRangesAtRuntime", () => {
        fc.assert(
            fc.property(arbSceneWithDuplicates, ({ duplicateSpec, numDuplicates, uniqueSpecs, ranges }) => {
                const skeletons: MockSkeleton[] = [];
                const meshes: MockMesh[] = [];

                for (let i = 0; i < numDuplicates; i++) {
                    const skel = createMockSkeletonForScene(`dup_${i}`, duplicateSpec, ranges);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                for (let i = 0; i < uniqueSpecs.length; i++) {
                    const skel = createMockSkeletonForScene(`unique_${i}`, uniqueSpecs[i], []);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                const scene = createMockScene(skeletons, meshes);

                // Snapshot ranges before
                const rangesBefore = scene.skeletons.map(skel =>
                    (skel as any).getAnimationRanges().map((r: MockAnimationRange) => ({
                        name: r.name,
                        from: r.from,
                        to: r.to,
                    }))
                );

                deduplicateRangesAtRuntime(scene as any);

                // Verify ranges unchanged
                for (let i = 0; i < scene.skeletons.length; i++) {
                    const rangesAfter = (scene.skeletons[i] as any).getAnimationRanges().map((r: MockAnimationRange) => ({
                        name: r.name,
                        from: r.from,
                        to: r.to,
                    }));
                    expect(rangesAfter).toEqual(rangesBefore[i]);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("sharing skeleton bone animations are === source skeleton bone animations", () => {
        fc.assert(
            fc.property(arbSceneWithDuplicates, ({ duplicateSpec, numDuplicates, uniqueSpecs, ranges }) => {
                const skeletons: MockSkeleton[] = [];
                const meshes: MockMesh[] = [];

                for (let i = 0; i < numDuplicates; i++) {
                    const skel = createMockSkeletonForScene(`dup_${i}`, duplicateSpec, ranges);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                for (let i = 0; i < uniqueSpecs.length; i++) {
                    const skel = createMockSkeletonForScene(`unique_${i}`, uniqueSpecs[i], []);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                const scene = createMockScene(skeletons, meshes);

                const entries = deduplicateRangesAtRuntime(scene as any);

                // The source is the first duplicate skeleton (lowest scene index)
                const source = skeletons[0];

                // Build source bone animation map: boneName -> animations array
                const sourceBoneAnimMap = new Map<string, any[]>();
                for (const bone of source.bones) {
                    if (bone.animations.length > 0) {
                        sourceBoneAnimMap.set(bone.name, bone.animations);
                    }
                }

                // For each sharing skeleton (index 1..numDuplicates-1), verify bone animations are === source's
                for (let i = 1; i < numDuplicates; i++) {
                    const sharingSkel = skeletons[i];
                    for (const bone of sharingSkel.bones) {
                        const sourceAnims = sourceBoneAnimMap.get(bone.name);
                        if (sourceAnims && bone.animations.length > 0) {
                            // Build source anim-by-name map
                            const sourceAnimByName = new Map<string, any>();
                            for (const anim of sourceAnims) {
                                sourceAnimByName.set(anim.name, anim);
                            }

                            // Each animation in the sharing bone should be === the source's
                            for (const anim of bone.animations) {
                                const sourceAnim = sourceAnimByName.get(anim.name);
                                if (sourceAnim) {
                                    expect(anim).toBe(sourceAnim);
                                }
                            }
                        }
                    }
                }

                // Also verify entries were returned for each sharing skeleton
                expect(entries.length).toBe(numDuplicates - 1);
            }),
            { numRuns: 100 }
        );
    });

    it("non-duplicate skeletons have all bone Animation references unchanged", () => {
        fc.assert(
            fc.property(arbSceneWithDuplicates, ({ duplicateSpec, numDuplicates, uniqueSpecs, ranges }) => {
                const skeletons: MockSkeleton[] = [];
                const meshes: MockMesh[] = [];

                for (let i = 0; i < numDuplicates; i++) {
                    const skel = createMockSkeletonForScene(`dup_${i}`, duplicateSpec, ranges);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                for (let i = 0; i < uniqueSpecs.length; i++) {
                    const skel = createMockSkeletonForScene(`unique_${i}`, uniqueSpecs[i], []);
                    skeletons.push(skel);
                    meshes.push(createMockMesh(skel));
                }

                const scene = createMockScene(skeletons, meshes);

                // Snapshot unique skeleton bone animation references before dedup
                const uniqueAnimRefsBefore: Map<string, any[]>[] = [];
                for (let i = numDuplicates; i < skeletons.length; i++) {
                    const boneAnimMap = new Map<string, any[]>();
                    for (const bone of skeletons[i].bones) {
                        // Store a copy of the references array (not the objects themselves)
                        boneAnimMap.set(bone.name, [...bone.animations]);
                    }
                    uniqueAnimRefsBefore.push(boneAnimMap);
                }

                deduplicateRangesAtRuntime(scene as any);

                // Verify unique skeletons' bone animation references are unchanged
                for (let i = numDuplicates; i < skeletons.length; i++) {
                    const beforeMap = uniqueAnimRefsBefore[i - numDuplicates];
                    for (const bone of skeletons[i].bones) {
                        const beforeAnims = beforeMap.get(bone.name);
                        expect(bone.animations.length).toBe(beforeAnims!.length);
                        for (let j = 0; j < bone.animations.length; j++) {
                            expect(bone.animations[j]).toBe(beforeAnims![j]);
                        }
                    }
                }
            }),
            { numRuns: 100 }
        );
    });
});


// ============================================================================
// Property 2: AG-Driven Skeletons Excluded from Range Dedup
// ============================================================================

describe("Feature: animation-range-sharing, Property 2: AG-Driven Skeletons Excluded from Range Dedup", () => {
    /**
     * For any scene containing skeletons where some are driven by animation groups
     * (their mesh hierarchy is targeted by at least one AnimationGroup),
     * deduplicateRangesAtRuntime shall never include those AG-driven skeletons in the
     * returned RuntimeRangeSharingEntry array, and shall never modify their bone
     * Animation references.
     *
     * **Validates: Requirements 2.1, 2.7, 11.1, 11.2, 11.5**
     */

    beforeEach(() => {
        agDrivenMeshes.clear();
    });

    /**
     * Arbitrary: generates a scene where some skeletons are AG-driven and some are not.
     * All skeletons share the same bone/animation structure (duplicates) to maximize
     * the chance that dedup would incorrectly include AG-driven ones.
     */
    const arbSceneWithAGDriven = fc
        .record({
            boneSpec: fc.array(
                fc.record({
                    name: arbBoneName,
                    animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
                }),
                { minLength: 1, maxLength: 5 }
            ),
            numAGDriven: fc.integer({ min: 1, max: 3 }),
            numNonAGDriven: fc.integer({ min: 1, max: 3 }),
        })
        .map(({ boneSpec, numAGDriven, numNonAGDriven }) => {
            const skeletons: MockSkeleton[] = [];
            const meshes: any[] = [];
            const agDriven: MockSkeleton[] = [];
            const nonAGDriven: MockSkeleton[] = [];

            // Create AG-driven skeletons (with meshes that will be marked as AG-driven)
            for (let i = 0; i < numAGDriven; i++) {
                const skel = createMockSkeleton(
                    `ag_skel_${i}`,
                    `ag_skel_${i}`,
                    boneSpec.map(b => createMockBone(b.name, b.animNames))
                );
                skeletons.push(skel);
                agDriven.push(skel);

                const mesh = { skeleton: skel, name: `ag_mesh_${i}` };
                meshes.push(mesh);
                // Mark this mesh as AG-driven
                agDrivenMeshes.add(mesh);
            }

            // Create non-AG-driven skeletons (same bone structure = duplicates)
            for (let i = 0; i < numNonAGDriven; i++) {
                const skel = createMockSkeleton(
                    `range_skel_${i}`,
                    `range_skel_${i}`,
                    boneSpec.map(b => createMockBone(b.name, b.animNames))
                );
                skeletons.push(skel);
                nonAGDriven.push(skel);

                const mesh = { skeleton: skel, name: `range_mesh_${i}` };
                meshes.push(mesh);
            }

            const scene = {
                skeletons,
                meshes,
                animationGroups: [{ targetedAnimations: [] }], // Non-empty so AG check proceeds
            };

            return { scene, agDriven, nonAGDriven };
        });

    it("AG-driven skeletons never appear in returned RuntimeRangeSharingEntry array", () => {
        fc.assert(
            fc.property(arbSceneWithAGDriven, ({ scene, agDriven }) => {
                agDrivenMeshes.clear();
                // Re-register AG-driven meshes (the set was populated during .map() but
                // fast-check may replay values, so we re-register from the meshes array)
                for (const mesh of scene.meshes) {
                    const skel = mesh.skeleton;
                    if (agDriven.includes(skel)) {
                        agDrivenMeshes.add(mesh);
                    }
                }

                const entries = deduplicateRangesAtRuntime(scene as any);

                // Verify no AG-driven skeleton appears as skeleton or sourceSkeleton
                for (const entry of entries) {
                    for (const agSkel of agDriven) {
                        expect(entry.skeleton).not.toBe(agSkel);
                        expect(entry.sourceSkeleton).not.toBe(agSkel);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("AG-driven skeletons' bone Animation references remain unchanged after dedup", () => {
        fc.assert(
            fc.property(arbSceneWithAGDriven, ({ scene, agDriven }) => {
                agDrivenMeshes.clear();
                // Re-register AG-driven meshes
                for (const mesh of scene.meshes) {
                    const skel = mesh.skeleton;
                    if (agDriven.includes(skel)) {
                        agDrivenMeshes.add(mesh);
                    }
                }

                // Snapshot bone animation references for AG-driven skeletons before dedup
                const snapshots = agDriven.map(skel => ({
                    skel,
                    boneAnims: skel.bones.map(bone => ({
                        boneName: bone.name,
                        animations: [...bone.animations], // shallow copy of the array
                    })),
                }));

                deduplicateRangesAtRuntime(scene as any);

                // Verify bone Animation references are unchanged for AG-driven skeletons
                for (const snapshot of snapshots) {
                    for (let b = 0; b < snapshot.boneAnims.length; b++) {
                        const boneSnapshot = snapshot.boneAnims[b];
                        const currentBone = snapshot.skel.bones[b];
                        expect(currentBone.animations.length).toBe(boneSnapshot.animations.length);
                        for (let a = 0; a < boneSnapshot.animations.length; a++) {
                            // Same object reference — not replaced
                            expect(currentBone.animations[a]).toBe(boneSnapshot.animations[a]);
                        }
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("AG-driven skeletons are excluded even when they have duplicate bone animations with non-AG skeletons", () => {
        fc.assert(
            fc.property(
                fc.record({
                    boneSpec: fc.array(
                        fc.record({
                            name: arbBoneName,
                            animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                }),
                ({ boneSpec }) => {
                    agDrivenMeshes.clear();

                    // Create one AG-driven skeleton and two non-AG skeletons, all with same structure
                    const agSkel = createMockSkeleton(
                        "ag_skel",
                        "ag_skel",
                        boneSpec.map(b => createMockBone(b.name, b.animNames))
                    );
                    const rangeSkel1 = createMockSkeleton(
                        "range_skel_1",
                        "range_skel_1",
                        boneSpec.map(b => createMockBone(b.name, b.animNames))
                    );
                    const rangeSkel2 = createMockSkeleton(
                        "range_skel_2",
                        "range_skel_2",
                        boneSpec.map(b => createMockBone(b.name, b.animNames))
                    );

                    const agMesh = { skeleton: agSkel, name: "ag_mesh" };
                    const rangeMesh1 = { skeleton: rangeSkel1, name: "range_mesh_1" };
                    const rangeMesh2 = { skeleton: rangeSkel2, name: "range_mesh_2" };

                    agDrivenMeshes.add(agMesh);

                    const scene = {
                        skeletons: [agSkel, rangeSkel1, rangeSkel2],
                        meshes: [agMesh, rangeMesh1, rangeMesh2],
                        animationGroups: [{ targetedAnimations: [] }],
                    };

                    const entries = deduplicateRangesAtRuntime(scene as any);

                    // AG skeleton must not appear in any entry
                    for (const entry of entries) {
                        expect(entry.skeleton).not.toBe(agSkel);
                        expect(entry.sourceSkeleton).not.toBe(agSkel);
                    }

                    // Non-AG skeletons with duplicates should still be deduplicated among themselves
                    // (if they have bone animations)
                    const hasAnims = boneSpec.some(b => b.animNames.length > 0);
                    if (hasAnims) {
                        expect(entries.length).toBeGreaterThanOrEqual(1);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================================================
// Property 5: Strip Correctness — Sharing Skeletons Stripped, Source and Unique Preserved
// ============================================================================

describe("Feature: animation-range-sharing, Property 5: Strip Correctness — Sharing Skeletons Stripped, Source and Unique Preserved", () => {
    /**
     * For any serialized scene with sharing metadata, after stripSharedSkeletonAnimations:
     * (1) each sharing skeleton's serialized bones have no `animation` field and the skeleton
     *     has no `ranges` array,
     * (2) each source skeleton's serialized bones retain their `animation` fields and the
     *     skeleton retains its `ranges` array unchanged, and
     * (3) skeletons with no duplicate in the scene retain all their bone animation data and
     *     ranges unchanged.
     *
     * **Validates: Requirements 3.2, 3.3, 7.1, 7.2, 7.4**
     */

    // ─── Helpers for Property 5 ───

    interface SerializedBone {
        name: string;
        animation?: any;
    }

    interface SerializedRange {
        name: string;
        from: number;
        to: number;
    }

    interface SerializedSkeleton {
        id: string;
        name: string;
        bones: SerializedBone[];
        ranges?: SerializedRange[];
    }

    /**
     * Creates a serialized skeleton with bones that have animation data and optional ranges.
     */
    function createSerializedSkeleton(
        id: string,
        boneSpec: { name: string; animNames: string[] }[],
        ranges?: SerializedRange[]
    ): SerializedSkeleton {
        return {
            id,
            name: `skel_${id}`,
            bones: boneSpec.map(b => ({
                name: b.name,
                animation: b.animNames.length > 0
                    ? { name: b.animNames[0], keys: [{ frame: 0, values: [0] }] }
                    : undefined,
            })).map(b => {
                // Only include animation field if there are animations
                if (b.animation === undefined) {
                    const { animation, ...rest } = b;
                    return rest as SerializedBone;
                }
                return b;
            }),
            ranges: ranges && ranges.length > 0 ? ranges : undefined,
        };
    }

    /**
     * Creates a mock RuntimeRangeSharingEntry with skeleton references that have .id matching
     * the serialized skeletons.
     */
    function createMockRuntimeEntry(sharingId: string, sourceId: string): RuntimeRangeSharingEntry {
        return {
            skeleton: { id: sharingId } as any,
            sourceSkeleton: { id: sourceId } as any,
        };
    }

    /** A mock scene (only needs skeletons array for the function) */
    function createMockSceneForStrip(): any {
        return { skeletons: [], meshes: [], animationGroups: [] };
    }

    // ─── Arbitraries for Property 5 ───

    /** Bone spec with at least one bone having animations */
    const arbBoneSpecWithAnims = fc.array(
        fc.record({
            name: arbBoneName,
            animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
        }),
        { minLength: 1, maxLength: 6 }
    );

    /** Arbitrary for ranges */
    const arbRanges = fc.array(
        fc.record({
            name: arbAnimName,
            from: fc.integer({ min: 0, max: 100 }),
            to: fc.integer({ min: 101, max: 300 }),
        }),
        { minLength: 1, maxLength: 4 }
    );

    /** Arbitrary for a unique skeleton bone spec (different structure) */
    const arbUniqueBoneSpec = fc.array(
        fc.record({
            name: arbBoneName,
            animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
        }),
        { minLength: 1, maxLength: 6 }
    );

    /**
     * Arbitrary for a strip scenario:
     * - A source skeleton and 1-3 sharing skeletons (same bone structure)
     * - 0-2 unique skeletons (different bone structure, not in entries)
     */
    const arbStripScenario = fc.record({
        boneSpec: arbBoneSpecWithAnims,
        ranges: arbRanges,
        numSharing: fc.integer({ min: 1, max: 3 }),
        uniqueSpecs: fc.array(
            fc.record({
                boneSpec: arbUniqueBoneSpec,
                ranges: arbRanges,
            }),
            { minLength: 0, maxLength: 2 }
        ),
    });

    it("sharing skeletons have no bone animation data and no ranges after strip", () => {
        fc.assert(
            fc.property(arbStripScenario, ({ boneSpec, ranges, numSharing, uniqueSpecs }) => {
                // Build serialized scene
                const sourceId = "source_0";
                const serializedSkeletons: SerializedSkeleton[] = [];

                // Source skeleton
                serializedSkeletons.push(createSerializedSkeleton(sourceId, boneSpec, ranges));

                // Sharing skeletons
                const sharingIds: string[] = [];
                for (let i = 0; i < numSharing; i++) {
                    const id = `sharing_${i}`;
                    sharingIds.push(id);
                    serializedSkeletons.push(createSerializedSkeleton(id, boneSpec, ranges));
                }

                // Unique skeletons
                for (let i = 0; i < uniqueSpecs.length; i++) {
                    serializedSkeletons.push(
                        createSerializedSkeleton(`unique_${i}`, uniqueSpecs[i].boneSpec, uniqueSpecs[i].ranges)
                    );
                }

                const sceneObj = { skeletons: serializedSkeletons };

                // Build runtime entries (sharing -> source)
                const runtimeEntries = sharingIds.map(id => createMockRuntimeEntry(id, sourceId));

                const mockScene = createMockSceneForStrip();

                // Execute strip
                stripSharedSkeletonAnimations(sceneObj, runtimeEntries, mockScene);

                // Verify: sharing skeletons have no animation on bones and no ranges
                for (const sharingId of sharingIds) {
                    const skel = serializedSkeletons.find(s => s.id === sharingId)!;
                    // No ranges
                    expect(skel.ranges).toBeUndefined();
                    // No animation field on any bone
                    for (const bone of skel.bones) {
                        expect(bone).not.toHaveProperty("animation");
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("source skeletons retain all bone animation data and ranges after strip", () => {
        fc.assert(
            fc.property(arbStripScenario, ({ boneSpec, ranges, numSharing, uniqueSpecs }) => {
                const sourceId = "source_0";
                const serializedSkeletons: SerializedSkeleton[] = [];

                // Source skeleton
                const sourceSkel = createSerializedSkeleton(sourceId, boneSpec, ranges);
                serializedSkeletons.push(sourceSkel);

                // Snapshot source before strip
                const sourceBonesSnapshot = JSON.parse(JSON.stringify(sourceSkel.bones));
                const sourceRangesSnapshot = sourceSkel.ranges
                    ? JSON.parse(JSON.stringify(sourceSkel.ranges))
                    : undefined;

                // Sharing skeletons
                const sharingIds: string[] = [];
                for (let i = 0; i < numSharing; i++) {
                    const id = `sharing_${i}`;
                    sharingIds.push(id);
                    serializedSkeletons.push(createSerializedSkeleton(id, boneSpec, ranges));
                }

                // Unique skeletons
                for (let i = 0; i < uniqueSpecs.length; i++) {
                    serializedSkeletons.push(
                        createSerializedSkeleton(`unique_${i}`, uniqueSpecs[i].boneSpec, uniqueSpecs[i].ranges)
                    );
                }

                const sceneObj = { skeletons: serializedSkeletons };
                const runtimeEntries = sharingIds.map(id => createMockRuntimeEntry(id, sourceId));
                const mockScene = createMockSceneForStrip();

                // Execute strip
                stripSharedSkeletonAnimations(sceneObj, runtimeEntries, mockScene);

                // Verify: source skeleton retains all bone animation data
                const sourceAfter = serializedSkeletons.find(s => s.id === sourceId)!;
                expect(JSON.stringify(sourceAfter.bones)).toBe(JSON.stringify(sourceBonesSnapshot));
                // Verify: source skeleton retains ranges
                if (sourceRangesSnapshot) {
                    expect(sourceAfter.ranges).toBeDefined();
                    expect(JSON.stringify(sourceAfter.ranges)).toBe(JSON.stringify(sourceRangesSnapshot));
                }
            }),
            { numRuns: 100 }
        );
    });

    it("unique skeletons (not in entries) retain all bone animation data and ranges after strip", () => {
        fc.assert(
            fc.property(arbStripScenario, ({ boneSpec, ranges, numSharing, uniqueSpecs }) => {
                const sourceId = "source_0";
                const serializedSkeletons: SerializedSkeleton[] = [];

                // Source skeleton
                serializedSkeletons.push(createSerializedSkeleton(sourceId, boneSpec, ranges));

                // Sharing skeletons
                const sharingIds: string[] = [];
                for (let i = 0; i < numSharing; i++) {
                    const id = `sharing_${i}`;
                    sharingIds.push(id);
                    serializedSkeletons.push(createSerializedSkeleton(id, boneSpec, ranges));
                }

                // Unique skeletons — snapshot before strip
                const uniqueSnapshots: string[] = [];
                for (let i = 0; i < uniqueSpecs.length; i++) {
                    const uniqueSkel = createSerializedSkeleton(
                        `unique_${i}`, uniqueSpecs[i].boneSpec, uniqueSpecs[i].ranges
                    );
                    serializedSkeletons.push(uniqueSkel);
                    uniqueSnapshots.push(JSON.stringify(uniqueSkel));
                }

                const sceneObj = { skeletons: serializedSkeletons };
                const runtimeEntries = sharingIds.map(id => createMockRuntimeEntry(id, sourceId));
                const mockScene = createMockSceneForStrip();

                // Execute strip
                stripSharedSkeletonAnimations(sceneObj, runtimeEntries, mockScene);

                // Verify: unique skeletons are completely unchanged
                for (let i = 0; i < uniqueSpecs.length; i++) {
                    const uniqueSkel = serializedSkeletons.find(s => s.id === `unique_${i}`)!;
                    expect(JSON.stringify(uniqueSkel)).toBe(uniqueSnapshots[i]);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("returns the correct count of stripped skeletons", () => {
        fc.assert(
            fc.property(arbStripScenario, ({ boneSpec, ranges, numSharing, uniqueSpecs }) => {
                const sourceId = "source_0";
                const serializedSkeletons: SerializedSkeleton[] = [];

                serializedSkeletons.push(createSerializedSkeleton(sourceId, boneSpec, ranges));

                const sharingIds: string[] = [];
                for (let i = 0; i < numSharing; i++) {
                    const id = `sharing_${i}`;
                    sharingIds.push(id);
                    serializedSkeletons.push(createSerializedSkeleton(id, boneSpec, ranges));
                }

                for (let i = 0; i < uniqueSpecs.length; i++) {
                    serializedSkeletons.push(
                        createSerializedSkeleton(`unique_${i}`, uniqueSpecs[i].boneSpec, uniqueSpecs[i].ranges)
                    );
                }

                const sceneObj = { skeletons: serializedSkeletons };
                const runtimeEntries = sharingIds.map(id => createMockRuntimeEntry(id, sourceId));
                const mockScene = createMockSceneForStrip();

                const count = stripSharedSkeletonAnimations(sceneObj, runtimeEntries, mockScene);

                expect(count).toBe(numSharing);
            }),
            { numRuns: 100 }
        );
    });
});



// ============================================================================
// Property 8: fixAnimationRanges Applied to Restored Skeletons
// ============================================================================

describe("Feature: animation-range-sharing, Property 8: fixAnimationRanges Applied to Restored Skeletons", () => {
    /**
     * For any restoration operation where the sharing skeleton is not driven by animation
     * groups, restoreSharedSkeletonAnimations shall apply fixAnimationRanges to the restored
     * skeleton, resulting in each animation range's `from` value being incremented by 1
     * compared to the source skeleton's original range values.
     *
     * **Validates: Requirements 13.1, 13.2**
     */

    // ─── Mock Interfaces for Property 8 ───

    interface MockAnimRange {
        name: string;
        from: number;
        to: number;
    }

    interface MockBoneP8 {
        name: string;
        animations: any[];
    }

    interface MockSkeletonP8 {
        id: string;
        name: string;
        bones: MockBoneP8[];
        _ranges: MockAnimRange[];
        getAnimationRanges: () => MockAnimRange[];
        createAnimationRange: (name: string, from: number, to: number) => void;
    }

    interface MockSceneP8 {
        skeletons: MockSkeletonP8[];
    }

    /**
     * Creates a mock skeleton with bones, animations, and animation range support.
     * The skeleton tracks ranges internally and supports getAnimationRanges/createAnimationRange.
     */
    function createMockSkeletonP8(
        id: string,
        boneSpec: { name: string; animNames: string[] }[],
        ranges: MockAnimRange[]
    ): MockSkeletonP8 {
        const skel: MockSkeletonP8 = {
            id,
            name: `skel_${id}`,
            bones: boneSpec.map(b => ({
                name: b.name,
                animations: b.animNames.map(n => ({ name: n, _id: `${id}_${b.name}_${n}` })),
            })),
            _ranges: [...ranges],
            getAnimationRanges() {
                return this._ranges;
            },
            createAnimationRange(name: string, from: number, to: number) {
                this._ranges.push({ name, from, to });
            },
        };
        return skel;
    }

    /**
     * Creates a mock fixAnimationRanges function that:
     * 1. Records which skeletons it was called with
     * 2. Increments each animation range's `from` value by 1 (mimics real behavior)
     */
    function createMockFixAnimationRanges() {
        const calledWith: any[] = [];
        const fn = (skel: any) => {
            calledWith.push(skel);
            // Increment each range's `from` by 1 (Blender exporter workaround)
            for (const range of skel._ranges) {
                range.from = range.from + 1;
            }
        };
        return { fn, calledWith };
    }

    // ─── Arbitraries for Property 8 ───

    /** Bone spec with at least one bone having at least one animation */
    const arbBoneSpecP8 = fc.array(
        fc.record({
            name: arbBoneName,
            animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
        }),
        { minLength: 1, maxLength: 6 }
    );

    /** Animation ranges with distinct names */
    const arbRangesP8 = fc.array(
        fc.record({
            name: arbAnimName,
            from: fc.integer({ min: 0, max: 100 }),
            to: fc.integer({ min: 101, max: 300 }),
        }),
        { minLength: 1, maxLength: 4 }
    );

    /** Scenario: source skeleton + 1-3 sharing skeletons, all with same bone structure */
    const arbRestorationScenario = fc.record({
        boneSpec: arbBoneSpecP8,
        ranges: arbRangesP8,
        numSharing: fc.integer({ min: 1, max: 3 }),
    });

    it("fixAnimationRanges is called once for each successfully restored skeleton", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ boneSpec, ranges, numSharing }) => {
                // Create source skeleton with bone animations and ranges
                const sourceSkel = createMockSkeletonP8("source_0", boneSpec, ranges);

                // Create sharing skeletons (same bone structure, but empty ranges initially)
                const sharingSkeletons: MockSkeletonP8[] = [];
                for (let i = 0; i < numSharing; i++) {
                    // Sharing skeletons have same bones but no animations (stripped)
                    const sharingSkel = createMockSkeletonP8(`sharing_${i}`, boneSpec, []);
                    // Clear animations to simulate stripped state
                    for (const bone of sharingSkel.bones) {
                        bone.animations = [];
                    }
                    sharingSkeletons.push(sharingSkel);
                }

                // Build scene with all skeletons
                const scene: MockSceneP8 = {
                    skeletons: [sourceSkel, ...sharingSkeletons],
                };

                // Build sharing entries
                const sharingEntries = sharingSkeletons.map(s => ({
                    skeletonId: s.id,
                    sourceSkeletonId: sourceSkel.id,
                }));

                // Create mock fixAnimationRanges
                const { fn: mockFix, calledWith } = createMockFixAnimationRanges();

                // Execute restoration
                const restoredCount = restoreSharedSkeletonAnimations(
                    scene as any,
                    sharingEntries,
                    mockFix as any
                );

                // Verify: fixAnimationRanges was called once per restored skeleton
                expect(calledWith.length).toBe(numSharing);
                expect(restoredCount).toBe(numSharing);

                // Verify: each sharing skeleton was passed to fixAnimationRanges
                for (const sharingSkel of sharingSkeletons) {
                    expect(calledWith).toContain(sharingSkel);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("animation range from values are incremented by 1 compared to source after fixAnimationRanges", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ boneSpec, ranges, numSharing }) => {
                // Create source skeleton with bone animations and ranges
                const sourceSkel = createMockSkeletonP8("source_0", boneSpec, ranges);

                // Snapshot source ranges before restoration (these are the original values)
                const sourceRangesBefore = ranges.map(r => ({ name: r.name, from: r.from, to: r.to }));

                // Create sharing skeletons (same bone structure, empty ranges)
                const sharingSkeletons: MockSkeletonP8[] = [];
                for (let i = 0; i < numSharing; i++) {
                    const sharingSkel = createMockSkeletonP8(`sharing_${i}`, boneSpec, []);
                    // Clear animations to simulate stripped state
                    for (const bone of sharingSkel.bones) {
                        bone.animations = [];
                    }
                    sharingSkeletons.push(sharingSkel);
                }

                // Build scene
                const scene: MockSceneP8 = {
                    skeletons: [sourceSkel, ...sharingSkeletons],
                };

                // Build sharing entries
                const sharingEntries = sharingSkeletons.map(s => ({
                    skeletonId: s.id,
                    sourceSkeletonId: sourceSkel.id,
                }));

                // Create mock fixAnimationRanges that increments `from` by 1
                const { fn: mockFix } = createMockFixAnimationRanges();

                // Execute restoration
                restoreSharedSkeletonAnimations(scene as any, sharingEntries, mockFix as any);

                // Verify: each sharing skeleton's animation ranges have `from` incremented by 1
                for (const sharingSkel of sharingSkeletons) {
                    const restoredRanges = sharingSkel.getAnimationRanges();

                    // Should have same number of ranges as source
                    expect(restoredRanges.length).toBe(sourceRangesBefore.length);

                    // Each range's `from` should be source's `from` + 1
                    for (let i = 0; i < sourceRangesBefore.length; i++) {
                        const sourceRange = sourceRangesBefore[i];
                        const restoredRange = restoredRanges.find(r => r.name === sourceRange.name);
                        expect(restoredRange).toBeDefined();
                        expect(restoredRange!.from).toBe(sourceRange.from + 1);
                        // `to` should remain unchanged
                        expect(restoredRange!.to).toBe(sourceRange.to);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("fixAnimationRanges is not called for entries where source skeleton is not found", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ boneSpec, ranges }) => {
                // Create a sharing skeleton but NO source skeleton in the scene
                const sharingSkel = createMockSkeletonP8("sharing_0", boneSpec, []);
                for (const bone of sharingSkel.bones) {
                    bone.animations = [];
                }

                const scene: MockSceneP8 = {
                    skeletons: [sharingSkel],
                };

                // Entry references a source that doesn't exist
                const sharingEntries = [{
                    skeletonId: sharingSkel.id,
                    sourceSkeletonId: "nonexistent_source",
                }];

                const { fn: mockFix, calledWith } = createMockFixAnimationRanges();

                const restoredCount = restoreSharedSkeletonAnimations(
                    scene as any,
                    sharingEntries,
                    mockFix as any
                );

                // fixAnimationRanges should NOT have been called
                expect(calledWith.length).toBe(0);
                expect(restoredCount).toBe(0);
            }),
            { numRuns: 100 }
        );
    });
});


// ============================================================================
// Property 6: Restoration Copies Bone Animations by Reference and Recreates Ranges
// ============================================================================

describe("Feature: animation-range-sharing, Property 6: Restoration Copies Bone Animations by Reference and Recreates Ranges", () => {
    /**
     * For any scene with a source skeleton and a sharing skeleton (identified by
     * AnimRangeSharingEntry), after restoreSharedSkeletonAnimations:
     * (1) for each bone name present in both skeletons, the sharing skeleton's bone
     *     `animations` array contains the same Animation object references (`===`) as
     *     the source skeleton's corresponding bone,
     * (2) the sharing skeleton has the same animation range names with the same from/to
     *     values as the source skeleton (after fixAnimationRanges adjustment — `from` is
     *     incremented by 1), and
     * (3) bones in the source skeleton that have no matching bone name in the sharing
     *     skeleton are skipped without error.
     *
     * **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
     */

    // ─── Mock Helpers for Property 6 ───

    interface P6MockAnimation {
        name: string;
        _uid: string;
    }

    interface P6MockBone {
        name: string;
        animations: P6MockAnimation[];
    }

    interface P6MockAnimationRange {
        name: string;
        from: number;
        to: number;
    }

    interface P6MockSkeleton {
        id: string;
        name: string;
        bones: P6MockBone[];
        _ranges: P6MockAnimationRange[];
        _createdRanges: P6MockAnimationRange[];
        getAnimationRanges: () => P6MockAnimationRange[];
        createAnimationRange: (name: string, from: number, to: number) => void;
    }

    interface P6MockScene {
        skeletons: P6MockSkeleton[];
    }

    function createP6Skeleton(
        id: string,
        boneSpec: { name: string; animNames: string[] }[],
        ranges: P6MockAnimationRange[]
    ): P6MockSkeleton {
        const createdRanges: P6MockAnimationRange[] = [];
        const skel: P6MockSkeleton = {
            id,
            name: `skel_${id}`,
            bones: boneSpec.map(b => ({
                name: b.name,
                animations: b.animNames.map(n => ({ name: n, _uid: `${id}_${b.name}_${n}` })),
            })),
            _ranges: ranges,
            _createdRanges: createdRanges,
            getAnimationRanges: () => [...ranges],
            createAnimationRange: (name: string, from: number, to: number) => {
                createdRanges.push({ name, from, to });
            },
        };
        return skel;
    }

    // ─── Arbitraries for Property 6 ───

    /** Bone spec with at least one bone having animations */
    const arbP6BoneSpec = fc.array(
        fc.record({
            name: arbBoneName,
            animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 4 }),
        }),
        { minLength: 1, maxLength: 8 }
    );

    /** Animation ranges */
    const arbP6Ranges = fc.array(
        fc.record({
            name: arbAnimName,
            from: fc.integer({ min: 0, max: 100 }),
            to: fc.integer({ min: 101, max: 300 }),
        }),
        { minLength: 1, maxLength: 5 }
    );

    /** Extra bone names that exist only in the source (not in sharing skeleton) */
    const arbExtraBones = fc.array(
        fc.record({
            name: arbBoneName,
            animNames: fc.array(arbAnimName, { minLength: 1, maxLength: 3 }),
        }),
        { minLength: 0, maxLength: 3 }
    );

    /**
     * fixAnimationRanges mock: increments each range's `from` by 1.
     * This simulates the Blender exporter fix.
     */
    function mockFixAnimationRanges(skel: any): void {
        for (const range of skel._createdRanges) {
            range.from = range.from + 1;
        }
    }

    /**
     * Arbitrary for a restoration scenario:
     * - A source skeleton with bones and ranges
     * - A sharing skeleton with a subset of the source's bones (possibly all)
     * - Optionally extra bones in the source that don't exist in the sharing skeleton
     */
    const arbRestorationScenario = fc.record({
        sharedBoneSpec: arbP6BoneSpec,
        ranges: arbP6Ranges,
        extraSourceBones: arbExtraBones,
        sourceId: arbSkeletonId,
        sharingId: arbSkeletonId,
    }).filter(({ sourceId, sharingId, sharedBoneSpec, extraSourceBones }) => {
        if (sourceId === sharingId) return false;
        // Ensure no duplicate bone names within shared bones or across shared + extra
        const allNames = [...sharedBoneSpec.map(b => b.name), ...extraSourceBones.map(b => b.name)];
        return new Set(allNames).size === allNames.length;
    });

    it("sharing skeleton bone animations are === source skeleton bone animations (by bone name)", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ sharedBoneSpec, ranges, extraSourceBones, sourceId, sharingId }) => {
                // Source skeleton has shared bones + extra bones
                const sourceBoneSpec = [...sharedBoneSpec, ...extraSourceBones];
                const sourceSkel = createP6Skeleton(sourceId, sourceBoneSpec, ranges);

                // Sharing skeleton has only the shared bones (initially with its own animation objects)
                const sharingSkel = createP6Skeleton(sharingId, sharedBoneSpec, []);

                const scene: P6MockScene = {
                    skeletons: [sourceSkel, sharingSkel],
                };

                const entries: AnimRangeSharingEntry[] = [{
                    skeletonId: sharingId,
                    sourceSkeletonId: sourceId,
                }];

                restoreSharedSkeletonAnimations(scene as any, entries, mockFixAnimationRanges);

                // Verify: for each bone name present in both skeletons, sharing bone's
                // animations array is the same reference as source bone's animations array
                for (const sharingBone of sharingSkel.bones) {
                    const sourceBone = sourceSkel.bones.find(b => b.name === sharingBone.name);
                    if (sourceBone) {
                        // The animations array should be the same reference (===)
                        expect(sharingBone.animations).toBe(sourceBone.animations);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("sharing skeleton has same animation range names/values as source (after fixAnimationRanges)", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ sharedBoneSpec, ranges, extraSourceBones, sourceId, sharingId }) => {
                const sourceBoneSpec = [...sharedBoneSpec, ...extraSourceBones];
                const sourceSkel = createP6Skeleton(sourceId, sourceBoneSpec, ranges);
                const sharingSkel = createP6Skeleton(sharingId, sharedBoneSpec, []);

                const scene: P6MockScene = {
                    skeletons: [sourceSkel, sharingSkel],
                };

                const entries: AnimRangeSharingEntry[] = [{
                    skeletonId: sharingId,
                    sourceSkeletonId: sourceId,
                }];

                restoreSharedSkeletonAnimations(scene as any, entries, mockFixAnimationRanges);

                // After restoration + fixAnimationRanges, the sharing skeleton's created ranges
                // should have the same names as source ranges, with `from` incremented by 1
                // and `to` unchanged.
                const sourceRanges = sourceSkel._ranges;
                const createdRanges = sharingSkel._createdRanges;

                // Same number of ranges
                expect(createdRanges.length).toBe(sourceRanges.length);

                // Same names and adjusted values
                for (let i = 0; i < sourceRanges.length; i++) {
                    const sourceRange = sourceRanges[i];
                    const createdRange = createdRanges.find(r => r.name === sourceRange.name);
                    expect(createdRange).toBeDefined();
                    // After fixAnimationRanges: from is incremented by 1
                    expect(createdRange!.from).toBe(sourceRange.from + 1);
                    // to remains unchanged
                    expect(createdRange!.to).toBe(sourceRange.to);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("unmatched bone names in source are skipped without error", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ sharedBoneSpec, ranges, extraSourceBones, sourceId, sharingId }) => {
                // Ensure there are extra bones in source that don't exist in sharing
                const sourceBoneSpec = [...sharedBoneSpec, ...extraSourceBones];
                const sourceSkel = createP6Skeleton(sourceId, sourceBoneSpec, ranges);
                const sharingSkel = createP6Skeleton(sharingId, sharedBoneSpec, []);

                const scene: P6MockScene = {
                    skeletons: [sourceSkel, sharingSkel],
                };

                const entries: AnimRangeSharingEntry[] = [{
                    skeletonId: sharingId,
                    sourceSkeletonId: sourceId,
                }];

                // Should not throw even when source has bones not in sharing skeleton
                expect(() => {
                    restoreSharedSkeletonAnimations(scene as any, entries, mockFixAnimationRanges);
                }).not.toThrow();

                // Verify the sharing skeleton still only has its original bone names
                const sharingBoneNames = new Set(sharingSkel.bones.map(b => b.name));
                const sharedBoneNames = new Set(sharedBoneSpec.map(b => b.name));
                expect(sharingBoneNames).toEqual(sharedBoneNames);

                // Verify that matched bones still got their animations copied
                for (const sharingBone of sharingSkel.bones) {
                    const sourceBone = sourceSkel.bones.find(b => b.name === sharingBone.name);
                    if (sourceBone) {
                        expect(sharingBone.animations).toBe(sourceBone.animations);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("returns count of 1 for a single successful restoration entry", () => {
        fc.assert(
            fc.property(arbRestorationScenario, ({ sharedBoneSpec, ranges, extraSourceBones, sourceId, sharingId }) => {
                const sourceBoneSpec = [...sharedBoneSpec, ...extraSourceBones];
                const sourceSkel = createP6Skeleton(sourceId, sourceBoneSpec, ranges);
                const sharingSkel = createP6Skeleton(sharingId, sharedBoneSpec, []);

                const scene: P6MockScene = {
                    skeletons: [sourceSkel, sharingSkel],
                };

                const entries: AnimRangeSharingEntry[] = [{
                    skeletonId: sharingId,
                    sourceSkeletonId: sourceId,
                }];

                const count = restoreSharedSkeletonAnimations(scene as any, entries, mockFixAnimationRanges);
                expect(count).toBe(1);
            }),
            { numRuns: 100 }
        );
    });
});
