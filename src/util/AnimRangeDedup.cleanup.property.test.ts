import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Bug Condition Exploration Test: Stale Sharing Entries Persist After Deletion
 *
 * This test validates that cleanup functions exist and correctly remove stale
 * entries from sharing arrays after a referenced skeleton/mesh is deleted.
 *
 * On UNFIXED code, this test will FAIL because:
 * - cleanupRangeSharingEntries does not exist in AnimRangeDedup.ts
 * - cleanupGroupSharingEntries does not exist in AnimGroupDedup.ts
 *
 * After the fix is implemented, these functions will exist and the test will PASS.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */

// Import the cleanup functions that DON'T EXIST YET on unfixed code
// This import will cause a compile/runtime error confirming the bug condition
import { cleanupRangeSharingEntries, RuntimeRangeSharingEntry } from "./AnimRangeDedup";
import { cleanupGroupSharingEntries, RuntimeSharingEntry } from "./AnimGroupDedup";

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

/** Arbitrary for unique skeleton IDs */
const arbSkeletonId = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,9}$/);

/** Arbitrary for unique node IDs */
const arbNodeId = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,9}$/);

/**
 * Generates an array of RuntimeRangeSharingEntry objects and a "deletion target" skeleton.
 * Some entries reference the deletion target (as skeleton or sourceSkeleton), others do not.
 */
const arbRangeSharingScenario = fc.record({
    deletedSkeletonId: arbSkeletonId,
    entrySpecs: fc.array(
        fc.record({
            skeletonId: arbSkeletonId,
            sourceSkeletonId: arbSkeletonId,
            /** Whether this entry's skeleton should be the deleted skeleton */
            usesDeletedAsSkeleton: fc.boolean(),
            /** Whether this entry's sourceSkeleton should be the deleted skeleton */
            usesDeletedAsSource: fc.boolean(),
        }),
        { minLength: 1, maxLength: 8 }
    ),
}).map(({ deletedSkeletonId, entrySpecs }) => {
    const deletedSkeleton = createMockSkeleton(deletedSkeletonId);

    const entries: Array<{ skeleton: MockSkeleton; sourceSkeleton: MockSkeleton }> = entrySpecs.map(
        (spec, idx) => {
            const skeleton = spec.usesDeletedAsSkeleton
                ? deletedSkeleton
                : createMockSkeleton(`other_skel_${idx}_${spec.skeletonId}`);
            const sourceSkeleton = spec.usesDeletedAsSource
                ? deletedSkeleton
                : createMockSkeleton(`other_source_${idx}_${spec.sourceSkeletonId}`);
            return { skeleton, sourceSkeleton };
        }
    );

    return { entries, deletedSkeleton, entrySpecs };
});

/**
 * Generates an array of RuntimeSharingEntry objects and a "deletion target" mesh/node.
 * Some entries reference the deletion target (as mesh or sourceMesh), others do not.
 */
const arbGroupSharingScenario = fc.record({
    deletedNodeId: arbNodeId,
    entrySpecs: fc.array(
        fc.record({
            meshId: arbNodeId,
            sourceMeshId: arbNodeId,
            /** Whether this entry's mesh should be the deleted node */
            usesDeletedAsMesh: fc.boolean(),
            /** Whether this entry's sourceMesh should be the deleted node */
            usesDeletedAsSource: fc.boolean(),
        }),
        { minLength: 1, maxLength: 8 }
    ),
}).map(({ deletedNodeId, entrySpecs }) => {
    const deletedMesh = createMockNode(deletedNodeId);

    const entries: Array<{ mesh: MockNode; sourceMesh: MockNode }> = entrySpecs.map(
        (spec, idx) => {
            const mesh = spec.usesDeletedAsMesh
                ? deletedMesh
                : createMockNode(`other_mesh_${idx}_${spec.meshId}`);
            const sourceMesh = spec.usesDeletedAsSource
                ? deletedMesh
                : createMockNode(`other_source_${idx}_${spec.sourceMeshId}`);
            return { mesh, sourceMesh };
        }
    );

    return { entries, deletedMesh, entrySpecs };
});

// ============================================================================
// Property Tests: Bug Condition — Stale Sharing Entries Persist After Deletion
// ============================================================================

describe("Bugfix: fix-animation-duplication-on-save, Property 1: Stale Sharing Entries Persist After Deletion", () => {
    describe("cleanupRangeSharingEntries — skeleton-level cleanup", () => {
        /**
         * Property: After calling cleanupRangeSharingEntries(entries, deletedSkeleton),
         * NO entry in the result references deletedSkeleton as either .skeleton or .sourceSkeleton.
         *
         * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
         */
        it("removes all entries referencing the deleted skeleton", () => {
            fc.assert(
                fc.property(arbRangeSharingScenario, ({ entries, deletedSkeleton }) => {
                    const result = cleanupRangeSharingEntries(
                        entries as any as RuntimeRangeSharingEntry[],
                        deletedSkeleton as any
                    );

                    // No entry in the result should reference the deleted skeleton
                    for (const entry of result) {
                        expect(entry.skeleton).not.toBe(deletedSkeleton);
                        expect(entry.sourceSkeleton).not.toBe(deletedSkeleton);
                    }
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Property: After calling cleanupRangeSharingEntries(entries, deletedSkeleton),
         * ALL entries that did NOT reference deletedSkeleton are preserved unchanged.
         *
         * **Validates: Requirements 1.3, 1.4**
         */
        it("preserves all entries NOT referencing the deleted skeleton", () => {
            fc.assert(
                fc.property(arbRangeSharingScenario, ({ entries, deletedSkeleton }) => {
                    const result = cleanupRangeSharingEntries(
                        entries as any as RuntimeRangeSharingEntry[],
                        deletedSkeleton as any
                    );

                    // Compute expected: entries that don't reference the deleted skeleton
                    const expected = entries.filter(
                        e => e.skeleton !== deletedSkeleton && e.sourceSkeleton !== deletedSkeleton
                    );

                    expect(result.length).toBe(expected.length);

                    // Each preserved entry should be the same reference
                    for (let i = 0; i < expected.length; i++) {
                        expect(result[i].skeleton).toBe(expected[i].skeleton);
                        expect(result[i].sourceSkeleton).toBe(expected[i].sourceSkeleton);
                    }
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Property: cleanupRangeSharingEntries does not mutate the original array.
         *
         * **Validates: Requirements 1.3, 1.4**
         */
        it("does not mutate the original entries array", () => {
            fc.assert(
                fc.property(arbRangeSharingScenario, ({ entries, deletedSkeleton }) => {
                    const originalLength = entries.length;
                    const originalRefs = [...entries];

                    cleanupRangeSharingEntries(
                        entries as any as RuntimeRangeSharingEntry[],
                        deletedSkeleton as any
                    );

                    // Original array should be unchanged
                    expect(entries.length).toBe(originalLength);
                    for (let i = 0; i < originalLength; i++) {
                        expect(entries[i]).toBe(originalRefs[i]);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("returns empty array for null/undefined/empty input", () => {
            const skel = createMockSkeleton("any");
            expect(cleanupRangeSharingEntries(null as any, skel as any)).toEqual([]);
            expect(cleanupRangeSharingEntries(undefined as any, skel as any)).toEqual([]);
            expect(cleanupRangeSharingEntries([] as any, skel as any)).toEqual([]);
        });
    });

    describe("cleanupGroupSharingEntries — mesh/node-level cleanup", () => {
        /**
         * Property: After calling cleanupGroupSharingEntries(entries, deletedMesh),
         * NO entry in the result references deletedMesh as either .mesh or .sourceMesh.
         *
         * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
         */
        it("removes all entries referencing the deleted mesh", () => {
            fc.assert(
                fc.property(arbGroupSharingScenario, ({ entries, deletedMesh }) => {
                    const result = cleanupGroupSharingEntries(
                        entries as any as RuntimeSharingEntry[],
                        deletedMesh as any
                    );

                    // No entry in the result should reference the deleted mesh
                    for (const entry of result) {
                        expect(entry.mesh).not.toBe(deletedMesh);
                        expect(entry.sourceMesh).not.toBe(deletedMesh);
                    }
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Property: After calling cleanupGroupSharingEntries(entries, deletedMesh),
         * ALL entries that did NOT reference deletedMesh are preserved unchanged.
         *
         * **Validates: Requirements 1.3, 1.4**
         */
        it("preserves all entries NOT referencing the deleted mesh", () => {
            fc.assert(
                fc.property(arbGroupSharingScenario, ({ entries, deletedMesh }) => {
                    const result = cleanupGroupSharingEntries(
                        entries as any as RuntimeSharingEntry[],
                        deletedMesh as any
                    );

                    // Compute expected: entries that don't reference the deleted mesh
                    const expected = entries.filter(
                        e => e.mesh !== deletedMesh && e.sourceMesh !== deletedMesh
                    );

                    expect(result.length).toBe(expected.length);

                    // Each preserved entry should be the same reference
                    for (let i = 0; i < expected.length; i++) {
                        expect(result[i].mesh).toBe(expected[i].mesh);
                        expect(result[i].sourceMesh).toBe(expected[i].sourceMesh);
                    }
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Property: cleanupGroupSharingEntries does not mutate the original array.
         *
         * **Validates: Requirements 1.3, 1.4**
         */
        it("does not mutate the original entries array", () => {
            fc.assert(
                fc.property(arbGroupSharingScenario, ({ entries, deletedMesh }) => {
                    const originalLength = entries.length;
                    const originalRefs = [...entries];

                    cleanupGroupSharingEntries(
                        entries as any as RuntimeSharingEntry[],
                        deletedMesh as any
                    );

                    // Original array should be unchanged
                    expect(entries.length).toBe(originalLength);
                    for (let i = 0; i < originalLength; i++) {
                        expect(entries[i]).toBe(originalRefs[i]);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("returns empty array for null/undefined/empty input", () => {
            const mesh = createMockNode("any");
            expect(cleanupGroupSharingEntries(null as any, mesh as any)).toEqual([]);
            expect(cleanupGroupSharingEntries(undefined as any, mesh as any)).toEqual([]);
            expect(cleanupGroupSharingEntries([] as any, mesh as any)).toEqual([]);
        });
    });
});
