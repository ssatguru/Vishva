import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock AnimUtils — needed for AG-driven exclusion tests
// ============================================================================

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
    stripSharedSkeletonAnimations,
    restoreSharedSkeletonAnimations,
    resolveRuntimeRangeEntries,
    RuntimeRangeSharingEntry,
    AnimRangeSharingEntry,
} from "./AnimRangeDedup";

// ============================================================================
// Mock Factories
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
    getAnimationRanges?: () => any[];
    createAnimationRange?: (name: string, from: number, to: number) => void;
}

interface MockMesh {
    skeleton: MockSkeleton | null;
    parent: any;
    getChildren: (predicate?: any, directDescendantsOnly?: boolean) => any[];
}

interface MockScene {
    skeletons: MockSkeleton[];
    meshes: MockMesh[];
    animationGroups: any[];
}

function createBone(name: string, animNames: string[]): MockBone {
    return {
        name,
        animations: animNames.map(n => ({ name: n })),
    };
}

function createSkeleton(id: string, bones: MockBone[]): MockSkeleton {
    const ranges: { name: string; from: number; to: number }[] = [];
    return {
        id,
        name: `skel_${id}`,
        bones,
        getAnimationRanges: () => ranges.map(r => ({ ...r })),
        createAnimationRange: (name: string, from: number, to: number) => {
            ranges.push({ name, from, to });
        },
    };
}

function createMesh(skeleton: MockSkeleton | null): MockMesh {
    return {
        skeleton,
        parent: null,
        getChildren: () => [],
    };
}

function createScene(skeletons: MockSkeleton[], meshes?: MockMesh[]): MockScene {
    return {
        skeletons,
        meshes: meshes || skeletons.map(s => createMesh(s)),
        animationGroups: [],
    };
}

// ============================================================================
// areSkeletonsDuplicates
// ============================================================================

describe("areSkeletonsDuplicates", () => {
    it("returns true for identical 3-bone skeletons", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk", "run"]),
            createBone("spine", ["walk", "run"]),
            createBone("head", ["walk", "run"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["walk", "run"]),
            createBone("spine", ["walk", "run"]),
            createBone("head", ["walk", "run"]),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(true);
    });

    it("returns true regardless of bone order", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk"]),
            createBone("spine", ["walk"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("spine", ["walk"]),
            createBone("hip", ["walk"]),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(true);
    });

    it("returns true regardless of animation order within a bone", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["run", "walk", "idle"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["idle", "walk", "run"]),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(true);
    });

    it("returns false for different bone names", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk"]),
            createBone("spine", ["walk"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["walk"]),
            createBone("chest", ["walk"]),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("returns false for different animation names", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk", "run"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["walk", "jump"]),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("returns false when one skeleton has empty animations", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", []),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("returns false when both skeletons have empty animations", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", []),
            createBone("spine", []),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", []),
            createBone("spine", []),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("returns true for single-bone skeletons with same animations", () => {
        const skelA = createSkeleton("a", [createBone("root", ["idle"])]);
        const skelB = createSkeleton("b", [createBone("root", ["idle"])]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(true);
    });

    it("returns false for different bone counts", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk"]),
            createBone("spine", ["walk"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["walk"]),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("uses case-sensitive comparison for bone names", () => {
        const skelA = createSkeleton("a", [createBone("Hip", ["walk"])]);
        const skelB = createSkeleton("b", [createBone("hip", ["walk"])]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("uses case-sensitive comparison for animation names", () => {
        const skelA = createSkeleton("a", [createBone("hip", ["Walk"])]);
        const skelB = createSkeleton("b", [createBone("hip", ["walk"])]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(false);
    });

    it("handles bones with mixed empty and non-empty animations", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk"]),
            createBone("spine", []),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["walk"]),
            createBone("spine", []),
        ]);
        expect(areSkeletonsDuplicates(skelA as any, skelB as any)).toBe(true);
    });
});

// ============================================================================
// deduplicateRangesAtRuntime
// ============================================================================

describe("deduplicateRangesAtRuntime", () => {
    beforeEach(() => {
        agDrivenMeshes.clear();
    });

    it("shares bone Animation references between 2 identical skeletons", () => {
        const skelA = createSkeleton("a", [
            createBone("hip", ["walk", "run"]),
            createBone("spine", ["walk", "run"]),
        ]);
        const skelB = createSkeleton("b", [
            createBone("hip", ["walk", "run"]),
            createBone("spine", ["walk", "run"]),
        ]);
        const scene = createScene([skelA, skelB]);

        const entries = deduplicateRangesAtRuntime(scene as any);

        expect(entries.length).toBe(1);
        expect(entries[0].sourceSkeleton).toBe(skelA);
        expect(entries[0].skeleton).toBe(skelB);

        // Verify bone animations are shared by reference
        for (const bone of skelB.bones) {
            const sourceBone = skelA.bones.find(b => b.name === bone.name)!;
            for (let i = 0; i < bone.animations.length; i++) {
                const sourceAnim = sourceBone.animations.find(
                    a => a.name === bone.animations[i].name
                );
                expect(bone.animations[i]).toBe(sourceAnim);
            }
        }
    });

    it("shares bone Animation references among 3 identical skeletons", () => {
        const skelA = createSkeleton("a", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("b", [createBone("hip", ["walk"])]);
        const skelC = createSkeleton("c", [createBone("hip", ["walk"])]);
        const scene = createScene([skelA, skelB, skelC]);

        const entries = deduplicateRangesAtRuntime(scene as any);

        expect(entries.length).toBe(2);
        // Source is skelA (first in scene order)
        expect(entries[0].sourceSkeleton).toBe(skelA);
        expect(entries[0].skeleton).toBe(skelB);
        expect(entries[1].sourceSkeleton).toBe(skelA);
        expect(entries[1].skeleton).toBe(skelC);

        // Both sharing skeletons reference source's animations
        const sourceAnim = skelA.bones[0].animations[0];
        expect(skelB.bones[0].animations[0]).toBe(sourceAnim);
        expect(skelC.bones[0].animations[0]).toBe(sourceAnim);
    });

    it("handles mixed unique + duplicate skeletons", () => {
        const skelA = createSkeleton("a", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("b", [createBone("hip", ["walk"])]);
        const skelUnique = createSkeleton("u", [createBone("arm", ["wave"])]);
        const scene = createScene([skelA, skelB, skelUnique]);

        const entries = deduplicateRangesAtRuntime(scene as any);

        expect(entries.length).toBe(1);
        expect(entries[0].sourceSkeleton).toBe(skelA);
        expect(entries[0].skeleton).toBe(skelB);

        // Unique skeleton's animations are unchanged
        expect(skelUnique.bones[0].animations[0].name).toBe("wave");
    });

    it("excludes AG-driven skeletons from deduplication", () => {
        const skelA = createSkeleton("a", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("b", [createBone("hip", ["walk"])]);
        const meshA = createMesh(skelA);
        const meshB = createMesh(skelB);

        // Mark meshA as AG-driven
        agDrivenMeshes.add(meshA);

        const scene: MockScene = {
            skeletons: [skelA, skelB],
            meshes: [meshA, meshB],
            animationGroups: [{ targetedAnimations: [] }],
        };

        const entries = deduplicateRangesAtRuntime(scene as any);

        // skelA is AG-driven, so no dedup should happen
        expect(entries.length).toBe(0);
    });

    it("returns empty array for scene with no skeletons", () => {
        const scene: MockScene = {
            skeletons: [],
            meshes: [],
            animationGroups: [],
        };
        const entries = deduplicateRangesAtRuntime(scene as any);
        expect(entries).toEqual([]);
    });

    it("returns empty array for scene with single skeleton", () => {
        const skel = createSkeleton("a", [createBone("hip", ["walk"])]);
        const scene = createScene([skel]);
        const entries = deduplicateRangesAtRuntime(scene as any);
        expect(entries).toEqual([]);
    });

    it("is idempotent — second call returns same entries", () => {
        const skelA = createSkeleton("a", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("b", [createBone("hip", ["walk"])]);
        const scene = createScene([skelA, skelB]);

        const entries1 = deduplicateRangesAtRuntime(scene as any);
        const entries2 = deduplicateRangesAtRuntime(scene as any);

        expect(entries2.length).toBe(entries1.length);
        expect(entries2[0].skeleton).toBe(entries1[0].skeleton);
        expect(entries2[0].sourceSkeleton).toBe(entries1[0].sourceSkeleton);
    });
});

// ============================================================================
// stripSharedSkeletonAnimations
// ============================================================================

describe("stripSharedSkeletonAnimations", () => {
    it("strips bone animations and ranges from sharing skeletons", () => {
        const skelA = createSkeleton("source", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("sharing", [createBone("hip", ["walk"])]);
        const scene = createScene([skelA, skelB]);

        const runtimeEntries: RuntimeRangeSharingEntry[] = [
            { skeleton: skelB as any, sourceSkeleton: skelA as any },
        ];

        const serializedScene = {
            skeletons: [
                {
                    id: "source",
                    bones: [{ name: "hip", animation: { name: "walk" } }],
                    ranges: [{ name: "walk", from: 0, to: 30 }],
                },
                {
                    id: "sharing",
                    bones: [{ name: "hip", animation: { name: "walk" } }],
                    ranges: [{ name: "walk", from: 0, to: 30 }],
                },
            ],
        };

        const count = stripSharedSkeletonAnimations(
            serializedScene, runtimeEntries, scene as any
        );

        expect(count).toBe(1);
        // Source skeleton retains its data
        expect(serializedScene.skeletons[0].bones[0].animation).toBeDefined();
        expect(serializedScene.skeletons[0].ranges).toBeDefined();
        // Sharing skeleton is stripped
        expect(serializedScene.skeletons[1].bones[0]).not.toHaveProperty("animation");
        expect(serializedScene.skeletons[1]).not.toHaveProperty("ranges");
    });

    it("skips missing skeleton IDs and logs warning", () => {
        const skelA = createSkeleton("source", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("missing_id", [createBone("hip", ["walk"])]);
        const scene = createScene([skelA, skelB]);

        const runtimeEntries: RuntimeRangeSharingEntry[] = [
            { skeleton: skelB as any, sourceSkeleton: skelA as any },
        ];

        const serializedScene = {
            skeletons: [
                {
                    id: "source",
                    bones: [{ name: "hip", animation: { name: "walk" } }],
                    ranges: [{ name: "walk", from: 0, to: 30 }],
                },
                // Note: no skeleton with id "missing_id" in serialized scene
                {
                    id: "other",
                    bones: [{ name: "hip", animation: { name: "walk" } }],
                    ranges: [{ name: "walk", from: 0, to: 30 }],
                },
            ],
        };

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const count = stripSharedSkeletonAnimations(
            serializedScene, runtimeEntries, scene as any
        );
        expect(count).toBe(0);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it("returns 0 for empty serialized scene", () => {
        const skelA = createSkeleton("a", [createBone("hip", ["walk"])]);
        const runtimeEntries: RuntimeRangeSharingEntry[] = [
            { skeleton: skelA as any, sourceSkeleton: skelA as any },
        ];

        expect(stripSharedSkeletonAnimations(
            { skeletons: [] }, runtimeEntries, {} as any
        )).toBe(0);
        expect(stripSharedSkeletonAnimations(
            {}, runtimeEntries, {} as any
        )).toBe(0);
        expect(stripSharedSkeletonAnimations(
            null, runtimeEntries, {} as any
        )).toBe(0);
    });

    it("returns 0 for empty runtime entries", () => {
        const serializedScene = {
            skeletons: [{ id: "a", bones: [{ name: "hip", animation: {} }], ranges: [] }],
        };
        expect(stripSharedSkeletonAnimations(
            serializedScene, [], {} as any
        )).toBe(0);
        expect(stripSharedSkeletonAnimations(
            serializedScene, null as any, {} as any
        )).toBe(0);
    });
});

// ============================================================================
// restoreSharedSkeletonAnimations
// ============================================================================

describe("restoreSharedSkeletonAnimations", () => {
    it("restores bone animations by reference and recreates ranges", () => {
        const sourceAnims = [{ name: "walk" }, { name: "run" }];
        const sourceSkel = createSkeleton("source", []);
        sourceSkel.bones = [{ name: "hip", animations: sourceAnims }];
        // Add ranges to source
        (sourceSkel as any).getAnimationRanges = () => [
            { name: "walk", from: 0, to: 30 },
            { name: "run", from: 31, to: 60 },
        ];

        const sharingSkel = createSkeleton("sharing", []);
        sharingSkel.bones = [{ name: "hip", animations: [] }];
        const createdRanges: any[] = [];
        sharingSkel.createAnimationRange = (name, from, to) => {
            createdRanges.push({ name, from, to });
        };

        const scene: MockScene = {
            skeletons: [sourceSkel, sharingSkel],
            meshes: [],
            animationGroups: [],
        };

        const fixFn = vi.fn();
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "sharing", sourceSkeletonId: "source" },
        ];

        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, fixFn as any
        );

        expect(count).toBe(1);
        // Bone animations are shared by reference
        expect(sharingSkel.bones[0].animations).toBe(sourceAnims);
        // Ranges were recreated
        expect(createdRanges).toEqual([
            { name: "walk", from: 0, to: 30 },
            { name: "run", from: 31, to: 60 },
        ]);
        // fixAnimationRanges was called
        expect(fixFn).toHaveBeenCalledWith(sharingSkel);
    });

    it("skips entry when source skeleton is not found", () => {
        const sharingSkel = createSkeleton("sharing", [createBone("hip", [])]);
        const scene: MockScene = {
            skeletons: [sharingSkel],
            meshes: [],
            animationGroups: [],
        };

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "sharing", sourceSkeletonId: "nonexistent" },
        ];

        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, vi.fn() as any
        );

        expect(count).toBe(0);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("source skeleton not found")
        );
        warnSpy.mockRestore();
    });

    it("skips entry when sharing skeleton is not found", () => {
        const sourceSkel = createSkeleton("source", [createBone("hip", ["walk"])]);
        const scene: MockScene = {
            skeletons: [sourceSkel],
            meshes: [],
            animationGroups: [],
        };

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "nonexistent", sourceSkeletonId: "source" },
        ];

        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, vi.fn() as any
        );

        expect(count).toBe(0);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("sharing skeleton not found")
        );
        warnSpy.mockRestore();
    });

    it("skips bones with name mismatch and logs warning", () => {
        const sourceSkel = createSkeleton("source", []);
        sourceSkel.bones = [
            { name: "hip", animations: [{ name: "walk" }] },
            { name: "extraBone", animations: [{ name: "walk" }] },
        ];
        (sourceSkel as any).getAnimationRanges = () => [];

        const sharingSkel = createSkeleton("sharing", []);
        sharingSkel.bones = [{ name: "hip", animations: [] }];
        sharingSkel.createAnimationRange = vi.fn();

        const scene: MockScene = {
            skeletons: [sourceSkel, sharingSkel],
            meshes: [],
            animationGroups: [],
        };

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "sharing", sourceSkeletonId: "source" },
        ];

        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, vi.fn() as any
        );

        // Still counts as restored because at least one bone matched
        expect(count).toBe(1);
        expect(sharingSkel.bones[0].animations).toBe(sourceSkel.bones[0].animations);
        // Warning logged for the unmatched bone
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("extraBone")
        );
        warnSpy.mockRestore();
    });

    it("calls fixAnimationRanges for each restored skeleton", () => {
        const sourceSkel = createSkeleton("source", []);
        sourceSkel.bones = [{ name: "hip", animations: [{ name: "walk" }] }];
        (sourceSkel as any).getAnimationRanges = () => [
            { name: "walk", from: 0, to: 30 },
        ];

        const sharing1 = createSkeleton("s1", []);
        sharing1.bones = [{ name: "hip", animations: [] }];
        sharing1.createAnimationRange = vi.fn();

        const sharing2 = createSkeleton("s2", []);
        sharing2.bones = [{ name: "hip", animations: [] }];
        sharing2.createAnimationRange = vi.fn();

        const scene: MockScene = {
            skeletons: [sourceSkel, sharing1, sharing2],
            meshes: [],
            animationGroups: [],
        };

        const fixFn = vi.fn();
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "s1", sourceSkeletonId: "source" },
            { skeletonId: "s2", sourceSkeletonId: "source" },
        ];

        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, fixFn as any
        );

        expect(count).toBe(2);
        expect(fixFn).toHaveBeenCalledTimes(2);
        expect(fixFn).toHaveBeenCalledWith(sharing1);
        expect(fixFn).toHaveBeenCalledWith(sharing2);
    });

    it("returns 0 for null/empty entries", () => {
        const scene: MockScene = {
            skeletons: [],
            meshes: [],
            animationGroups: [],
        };
        expect(restoreSharedSkeletonAnimations(
            scene as any, null as any, vi.fn() as any
        )).toBe(0);
        expect(restoreSharedSkeletonAnimations(
            scene as any, [] as any, vi.fn() as any
        )).toBe(0);
        expect(restoreSharedSkeletonAnimations(
            scene as any, undefined as any, vi.fn() as any
        )).toBe(0);
    });

    it("skips entry when source has no bone animations", () => {
        const sourceSkel = createSkeleton("source", []);
        sourceSkel.bones = [{ name: "hip", animations: [] }];
        (sourceSkel as any).getAnimationRanges = () => [];

        const sharingSkel = createSkeleton("sharing", []);
        sharingSkel.bones = [{ name: "hip", animations: [] }];
        sharingSkel.createAnimationRange = vi.fn();

        const scene: MockScene = {
            skeletons: [sourceSkel, sharingSkel],
            meshes: [],
            animationGroups: [],
        };

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "sharing", sourceSkeletonId: "source" },
        ];

        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, vi.fn() as any
        );

        expect(count).toBe(0);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("no bone animations")
        );
        warnSpy.mockRestore();
    });
});

// ============================================================================
// resolveRuntimeRangeEntries
// ============================================================================

describe("resolveRuntimeRangeEntries", () => {
    it("converts runtime entries to serializable entries with correct IDs", () => {
        const skelA = createSkeleton("skel-001", [createBone("hip", ["walk"])]);
        const skelB = createSkeleton("skel-002", [createBone("hip", ["walk"])]);

        const entries: RuntimeRangeSharingEntry[] = [
            { skeleton: skelB as any, sourceSkeleton: skelA as any },
        ];

        const result = resolveRuntimeRangeEntries(entries);

        expect(result).toEqual([
            { skeletonId: "skel-002", sourceSkeletonId: "skel-001" },
        ]);
    });

    it("returns empty array for empty input", () => {
        expect(resolveRuntimeRangeEntries([])).toEqual([]);
    });

    it("returns empty array for null/undefined input", () => {
        expect(resolveRuntimeRangeEntries(null as any)).toEqual([]);
        expect(resolveRuntimeRangeEntries(undefined as any)).toEqual([]);
    });

    it("handles multiple entries", () => {
        const source = createSkeleton("src", [createBone("hip", ["walk"])]);
        const s1 = createSkeleton("s1", [createBone("hip", ["walk"])]);
        const s2 = createSkeleton("s2", [createBone("hip", ["walk"])]);

        const entries: RuntimeRangeSharingEntry[] = [
            { skeleton: s1 as any, sourceSkeleton: source as any },
            { skeleton: s2 as any, sourceSkeleton: source as any },
        ];

        const result = resolveRuntimeRangeEntries(entries);

        expect(result).toEqual([
            { skeletonId: "s1", sourceSkeletonId: "src" },
            { skeletonId: "s2", sourceSkeletonId: "src" },
        ]);
    });
});

// ============================================================================
// Error Handling
// ============================================================================

describe("Error handling", () => {
    beforeEach(() => {
        agDrivenMeshes.clear();
    });

    it("deduplicateRangesAtRuntime handles null skeletons array", () => {
        const scene = { skeletons: null, meshes: [], animationGroups: [] };
        const entries = deduplicateRangesAtRuntime(scene as any);
        expect(entries).toEqual([]);
    });

    it("deduplicateRangesAtRuntime handles undefined skeletons", () => {
        const scene = { skeletons: undefined, meshes: [], animationGroups: [] };
        const entries = deduplicateRangesAtRuntime(scene as any);
        expect(entries).toEqual([]);
    });

    it("deduplicateRangesAtRuntime handles skeletons with missing bones", () => {
        const skel: any = { id: "a", name: "a", bones: null };
        const scene = {
            skeletons: [skel],
            meshes: [createMesh(skel)],
            animationGroups: [],
        };
        // Should not throw
        const entries = deduplicateRangesAtRuntime(scene as any);
        expect(entries).toEqual([]);
    });

    it("deduplicateRangesAtRuntime handles bones with missing animations", () => {
        const skel = createSkeleton("a", []);
        skel.bones = [{ name: "hip", animations: undefined as any }];
        const scene = createScene([skel]);
        // Should not throw
        const entries = deduplicateRangesAtRuntime(scene as any);
        expect(entries).toEqual([]);
    });

    it("stripSharedSkeletonAnimations handles undefined sceneObj", () => {
        const entries: RuntimeRangeSharingEntry[] = [
            { skeleton: { id: "a" } as any, sourceSkeleton: { id: "b" } as any },
        ];
        expect(stripSharedSkeletonAnimations(undefined as any, entries, {} as any)).toBe(0);
    });

    it("restoreSharedSkeletonAnimations handles empty scene skeletons", () => {
        const scene: MockScene = {
            skeletons: [],
            meshes: [],
            animationGroups: [],
        };
        const entries: AnimRangeSharingEntry[] = [
            { skeletonId: "a", sourceSkeletonId: "b" },
        ];
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const count = restoreSharedSkeletonAnimations(
            scene as any, entries, vi.fn() as any
        );
        expect(count).toBe(0);
        warnSpy.mockRestore();
    });
});
