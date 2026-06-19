import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Preservation Property Tests: Non-Deletion Dedup Behavior Unchanged
 *
 * These tests validate that:
 * 1. Existing resolve functions (resolveRuntimeRangeEntries, resolveRuntimeEntries)
 *    continue to produce correct output for valid (non-disposed) entries — these PASS on unfixed code.
 * 2. New cleanup functions (cleanupRangeSharingEntries, cleanupGroupSharingEntries)
 *    return the original array unchanged when called with a skeleton/mesh that is NOT
 *    referenced by any entry — these FAIL on unfixed code (functions don't exist yet).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import {
    resolveRuntimeRangeEntries,
    RuntimeRangeSharingEntry,
} from "./AnimRangeDedup";

import {
    resolveRuntimeEntries,
    RuntimeSharingEntry,
} from "./AnimGroupDedup";

// These imports WILL FAIL on unfixed code — the functions don't exist yet.
// This is EXPECTED. The cleanup preservation tests will fail at import time.
let cleanupRangeSharingEntries: any;
let cleanupGroupSharingEntries: any;

try {
    // Dynamic import attempt — on unfixed code these exports don't exist
    const rangeModule = await import("./AnimRangeDedup");
    cleanupRangeSharingEntries = (rangeModule as any).cleanupRangeSharingEntries;
} catch {
    cleanupRangeSharingEntries = undefined;
}

try {
    const groupModule = await import("./AnimGroupDedup");
    cleanupGroupSharingEntries = (groupModule as any).cleanupGroupSharingEntries;
} catch {
    cleanupGroupSharingEntries = undefined;
}

// ============================================================================
// Mock Object Interfaces & Factories
// ============================================================================

interface MockSkeleton {
    id: string;
    name: string;
    bones: any[];
}

interface MockNode {
    id: string;
    name: string;
    parent: any;
}

function createMockSkeleton(id: string): MockSkeleton {
    return { id, name: `skel_${id}`, bones: [] };
}

function createMockNode(id: string): MockNode {
    return { id, name: `node_${id}`, parent: null };
}

// ============================================================================
// fast-check Arbitraries
// ============================================================================

/** Alphanumeric string 1-10 chars for IDs */
const arbId = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,9}$/);

/**
 * Generates an array of RuntimeRangeSharingEntry objects (with mock Skeletons).
 * All entries use distinct skeleton objects that are NOT the "unrelated" deletion target.
 */
const arbRangeEntriesWithUnrelated = fc.record({
    unrelatedId: arbId,
    entryIds: fc.array(
        fc.record({
            skeletonId: arbId,
            sourceSkeletonId: arbId,
        }),
        { minLength: 0, maxLength: 6 }
    ),
}).map(({ unrelatedId, entryIds }) => {
    // Create the unrelated skeleton (the "deletion target" that is NOT in any entry)
    const unrelatedSkeleton = createMockSkeleton(`unrelated_${unrelatedId}`);

    // Create entries with distinct skeleton objects (never === unrelatedSkeleton)
    const entries = entryIds.map((spec, idx) => ({
        skeleton: createMockSkeleton(`entry_skel_${idx}_${spec.skeletonId}`),
        sourceSkeleton: createMockSkeleton(`entry_source_${idx}_${spec.sourceSkeletonId}`),
    }));

    return { entries, unrelatedSkeleton };
});

/**
 * Generates an array of RuntimeSharingEntry objects (with mock Nodes).
 * All entries use distinct node objects that are NOT the "unrelated" deletion target.
 */
const arbGroupEntriesWithUnrelated = fc.record({
    unrelatedId: arbId,
    entryIds: fc.array(
        fc.record({
            meshId: arbId,
            sourceMeshId: arbId,
        }),
        { minLength: 0, maxLength: 6 }
    ),
}).map(({ unrelatedId, entryIds }) => {
    // Create the unrelated mesh (the "deletion target" that is NOT in any entry)
    const unrelatedMesh = createMockNode(`unrelated_${unrelatedId}`);

    // Create entries with distinct node objects (never === unrelatedMesh)
    const entries = entryIds.map((spec, idx) => ({
        mesh: createMockNode(`entry_mesh_${idx}_${spec.meshId}`),
        sourceMesh: createMockNode(`entry_source_${idx}_${spec.sourceMeshId}`),
    }));

    return { entries, unrelatedMesh };
});

/**
 * Generates an array of RuntimeRangeSharingEntry objects for resolve testing.
 * Each entry has mock Skeletons with valid .id properties.
 */
const arbRangeEntries = fc.array(
    fc.record({
        skeletonId: arbId,
        sourceSkeletonId: arbId,
    }),
    { minLength: 1, maxLength: 6 }
).map(specs =>
    specs.map((spec, idx) => ({
        skeleton: createMockSkeleton(`skel_${idx}_${spec.skeletonId}`),
        sourceSkeleton: createMockSkeleton(`source_${idx}_${spec.sourceSkeletonId}`),
    }))
);

/**
 * Generates an array of RuntimeSharingEntry objects for resolve testing.
 * Each entry has mock Nodes with valid .id properties.
 */
const arbGroupEntries = fc.array(
    fc.record({
        meshId: arbId,
        sourceMeshId: arbId,
    }),
    { minLength: 1, maxLength: 6 }
).map(specs =>
    specs.map((spec, idx) => ({
        mesh: createMockNode(`mesh_${idx}_${spec.meshId}`),
        sourceMesh: createMockNode(`source_${idx}_${spec.sourceMeshId}`),
    }))
);

// ============================================================================
// Property Tests: Resolve Functions Produce Correct Output (EXISTING FUNCTIONS)
// These tests SHOULD PASS on unfixed code — the resolve functions exist and work.
// ============================================================================

describe("Bugfix: fix-animation-duplication-on-save, Property 2 Preservation: resolveRuntimeRangeEntries produces correct output", () => {
    /**
     * For any array of RuntimeRangeSharingEntry objects with valid (non-disposed) Skeleton
     * references, resolveRuntimeRangeEntries produces an array of the same length where
     * each entry's skeletonId matches the input's skeleton.id and sourceSkeletonId matches
     * the input's sourceSkeleton.id.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    it("maps skeleton.id to skeletonId and sourceSkeleton.id to sourceSkeletonId for all valid entries", () => {
        fc.assert(
            fc.property(arbRangeEntries, (entries) => {
                const result = resolveRuntimeRangeEntries(entries as any as RuntimeRangeSharingEntry[]);

                // Same length
                expect(result.length).toBe(entries.length);

                // Each entry correctly maps IDs
                for (let i = 0; i < entries.length; i++) {
                    expect(result[i].skeletonId).toBe(entries[i].skeleton.id);
                    expect(result[i].sourceSkeletonId).toBe(entries[i].sourceSkeleton.id);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("returns empty array for empty input", () => {
        const result = resolveRuntimeRangeEntries([] as any as RuntimeRangeSharingEntry[]);
        expect(result).toEqual([]);
    });

    it("returns empty array for null/undefined input", () => {
        expect(resolveRuntimeRangeEntries(null as any)).toEqual([]);
        expect(resolveRuntimeRangeEntries(undefined as any)).toEqual([]);
    });

    it("does not mutate input entries", () => {
        fc.assert(
            fc.property(arbRangeEntries, (entries) => {
                const snapshotBefore = entries.map(e => ({
                    skeletonId: e.skeleton.id,
                    sourceSkeletonId: e.sourceSkeleton.id,
                }));

                resolveRuntimeRangeEntries(entries as any as RuntimeRangeSharingEntry[]);

                for (let i = 0; i < entries.length; i++) {
                    expect(entries[i].skeleton.id).toBe(snapshotBefore[i].skeletonId);
                    expect(entries[i].sourceSkeleton.id).toBe(snapshotBefore[i].sourceSkeletonId);
                }
            }),
            { numRuns: 100 }
        );
    });
});

describe("Bugfix: fix-animation-duplication-on-save, Property 2 Preservation: resolveRuntimeEntries produces correct output", () => {
    /**
     * For any array of RuntimeSharingEntry objects with valid (non-disposed) Node
     * references, resolveRuntimeEntries produces an array of the same length where
     * each entry's meshId matches the input's mesh.id and sourceMeshId matches
     * the input's sourceMesh.id.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    it("maps mesh.id to meshId and sourceMesh.id to sourceMeshId for all valid entries", () => {
        fc.assert(
            fc.property(arbGroupEntries, (entries) => {
                const result = resolveRuntimeEntries(entries as any as RuntimeSharingEntry[]);

                // Same length
                expect(result.length).toBe(entries.length);

                // Each entry correctly maps IDs
                for (let i = 0; i < entries.length; i++) {
                    expect(result[i].meshId).toBe(entries[i].mesh.id);
                    expect(result[i].sourceMeshId).toBe(entries[i].sourceMesh.id);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("returns empty array for empty input", () => {
        const result = resolveRuntimeEntries([] as any as RuntimeSharingEntry[]);
        expect(result).toEqual([]);
    });

    it("returns empty array for null/undefined input", () => {
        expect(resolveRuntimeEntries(null as any)).toEqual([]);
        expect(resolveRuntimeEntries(undefined as any)).toEqual([]);
    });

    it("does not mutate input entries", () => {
        fc.assert(
            fc.property(arbGroupEntries, (entries) => {
                const snapshotBefore = entries.map(e => ({
                    meshId: e.mesh.id,
                    sourceMeshId: e.sourceMesh.id,
                }));

                resolveRuntimeEntries(entries as any as RuntimeSharingEntry[]);

                for (let i = 0; i < entries.length; i++) {
                    expect(entries[i].mesh.id).toBe(snapshotBefore[i].meshId);
                    expect(entries[i].sourceMesh.id).toBe(snapshotBefore[i].sourceMeshId);
                }
            }),
            { numRuns: 100 }
        );
    });
});

// ============================================================================
// Property Tests: Cleanup Preservation (NEW FUNCTIONS — WILL FAIL ON UNFIXED CODE)
// These tests validate that cleanup functions are no-ops when the deletion target
// is not referenced by any entry.
// ============================================================================

describe("Bugfix: fix-animation-duplication-on-save, Property 2 Preservation: cleanupRangeSharingEntries with unrelated skeleton", () => {
    /**
     * For all arrays of sharing entries where NO entry references the "deletion target"
     * skeleton, calling cleanupRangeSharingEntries(entries, unrelatedSkeleton) returns
     * the original array unchanged (same length, same entries by reference).
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    it("returns array unchanged when deletion target is not referenced by any entry", () => {
        // Skip if function doesn't exist (expected on unfixed code)
        if (!cleanupRangeSharingEntries) {
            expect.fail(
                "cleanupRangeSharingEntries is not exported from AnimRangeDedup.ts — " +
                "function does not exist yet (expected on unfixed code)"
            );
            return;
        }

        fc.assert(
            fc.property(arbRangeEntriesWithUnrelated, ({ entries, unrelatedSkeleton }) => {
                const result = cleanupRangeSharingEntries(
                    entries as any as RuntimeRangeSharingEntry[],
                    unrelatedSkeleton as any
                );

                // Same length — no entries removed
                expect(result.length).toBe(entries.length);

                // Same entries by reference
                for (let i = 0; i < entries.length; i++) {
                    expect(result[i].skeleton).toBe(entries[i].skeleton);
                    expect(result[i].sourceSkeleton).toBe(entries[i].sourceSkeleton);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("does not mutate the original array when deletion target is unrelated", () => {
        if (!cleanupRangeSharingEntries) {
            expect.fail(
                "cleanupRangeSharingEntries is not exported from AnimRangeDedup.ts — " +
                "function does not exist yet (expected on unfixed code)"
            );
            return;
        }

        fc.assert(
            fc.property(arbRangeEntriesWithUnrelated, ({ entries, unrelatedSkeleton }) => {
                const originalLength = entries.length;
                const originalRefs = [...entries];

                cleanupRangeSharingEntries(
                    entries as any as RuntimeRangeSharingEntry[],
                    unrelatedSkeleton as any
                );

                // Original array not mutated
                expect(entries.length).toBe(originalLength);
                for (let i = 0; i < originalLength; i++) {
                    expect(entries[i]).toBe(originalRefs[i]);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("empty entries array returns empty regardless of deletion target", () => {
        if (!cleanupRangeSharingEntries) {
            expect.fail(
                "cleanupRangeSharingEntries is not exported from AnimRangeDedup.ts — " +
                "function does not exist yet (expected on unfixed code)"
            );
            return;
        }

        const skel = createMockSkeleton("any_target");
        const result = cleanupRangeSharingEntries([] as any, skel as any);
        expect(result).toEqual([]);
    });
});

describe("Bugfix: fix-animation-duplication-on-save, Property 2 Preservation: cleanupGroupSharingEntries with unrelated mesh", () => {
    /**
     * For all arrays of sharing entries where NO entry references the "deletion target"
     * mesh, calling cleanupGroupSharingEntries(entries, unrelatedMesh) returns
     * the original array unchanged (same length, same entries by reference).
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    it("returns array unchanged when deletion target is not referenced by any entry", () => {
        if (!cleanupGroupSharingEntries) {
            expect.fail(
                "cleanupGroupSharingEntries is not exported from AnimGroupDedup.ts — " +
                "function does not exist yet (expected on unfixed code)"
            );
            return;
        }

        fc.assert(
            fc.property(arbGroupEntriesWithUnrelated, ({ entries, unrelatedMesh }) => {
                const result = cleanupGroupSharingEntries(
                    entries as any as RuntimeSharingEntry[],
                    unrelatedMesh as any
                );

                // Same length — no entries removed
                expect(result.length).toBe(entries.length);

                // Same entries by reference
                for (let i = 0; i < entries.length; i++) {
                    expect(result[i].mesh).toBe(entries[i].mesh);
                    expect(result[i].sourceMesh).toBe(entries[i].sourceMesh);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("does not mutate the original array when deletion target is unrelated", () => {
        if (!cleanupGroupSharingEntries) {
            expect.fail(
                "cleanupGroupSharingEntries is not exported from AnimGroupDedup.ts — " +
                "function does not exist yet (expected on unfixed code)"
            );
            return;
        }

        fc.assert(
            fc.property(arbGroupEntriesWithUnrelated, ({ entries, unrelatedMesh }) => {
                const originalLength = entries.length;
                const originalRefs = [...entries];

                cleanupGroupSharingEntries(
                    entries as any as RuntimeSharingEntry[],
                    unrelatedMesh as any
                );

                // Original array not mutated
                expect(entries.length).toBe(originalLength);
                for (let i = 0; i < originalLength; i++) {
                    expect(entries[i]).toBe(originalRefs[i]);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("empty entries array returns empty regardless of deletion target", () => {
        if (!cleanupGroupSharingEntries) {
            expect.fail(
                "cleanupGroupSharingEntries is not exported from AnimGroupDedup.ts — " +
                "function does not exist yet (expected on unfixed code)"
            );
            return;
        }

        const mesh = createMockNode("any_target");
        const result = cleanupGroupSharingEntries([] as any, mesh as any);
        expect(result).toEqual([]);
    });
});
