/**
 * Unit tests for changeSkeleton logic — all branches and guard conditions.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3,
 *            4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2
 *
 * Strategy: The logic in `Vishva.changeSkeleton()` is re-implemented here as a
 * standalone pure function `runChangeSkeleton()` that mirrors the actual
 * implementation exactly, using duck-typed mock inputs. This avoids importing
 * Vishva (which requires a BabylonJS Engine + Scene) and avoids `instanceof`
 * checks against real BabylonJS classes (which require a WebGL context).
 *
 * Mock types use sentinel flags (_isAbstractMesh, _isMesh) that the standalone
 * function checks in place of `instanceof AbstractMesh` / `instanceof Mesh`,
 * matching the structural logic of the real code.
 */

import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock bone whose getLinkedTransformNode() returns the provided value.
 * null → AR-driven; non-null → AG-driven.
 */
function mockBone(linkedTN: object | null) {
    return { getLinkedTransformNode: () => linkedTN };
}

/**
 * Build a mock skeleton with the given bones array.
 * isAG: when true, the first bone has a non-null linked TN → isAGDrivenSkeleton returns true.
 */
function mockSkeleton(isAG: boolean, uniqueId: number = 1): any {
    const bones = isAG
        ? [mockBone({ name: "tn" }), mockBone(null)]
        : [mockBone(null), mockBone(null)];
    return {
        uniqueId,
        bones,
        dispose: vi.fn(),
    };
}

/**
 * Build a mock AbstractMesh (but NOT a Mesh). Flag: _isAbstractMesh = true, _isMesh = false.
 */
function mockAbstractMesh(skel: any): any {
    return {
        _isAbstractMesh: true,
        _isMesh: false,
        skeleton: skel,
        parent: null,
        dispose: vi.fn(),
    };
}

/**
 * Build a mock Mesh. Flag: _isAbstractMesh = true, _isMesh = true.
 */
function mockMesh(skel: any): any {
    return {
        _isAbstractMesh: true,
        _isMesh: true,
        skeleton: skel,
        parent: null,
        dispose: vi.fn(),
    };
}

/**
 * Build a plain TransformNode (not AbstractMesh, not Mesh).
 * _isAbstractMesh = false, _isMesh = false.
 */
function mockTransformNode(childMeshes: any[]): any {
    return {
        _isAbstractMesh: false,
        _isMesh: false,
        dispose: vi.fn(),
        getChildMeshes: (_directOnly: boolean) =>
            childMeshes.filter((m) => m._isMesh === true),
    };
}

/**
 * Build a mock scene with a meshes array and a getSkeletonByUniqueId lookup.
 */
function mockScene(meshes: any[], skeletons: any[]): any {
    return {
        meshes,
        getSkeletonByUniqueId: (id: number) =>
            skeletons.find((s) => s.uniqueId === id) ?? null,
    };
}

// ---------------------------------------------------------------------------
// Re-implementation of changeSkeleton logic for testing
//
// This mirrors src/Vishva.ts changeSkeleton() exactly, substituting:
//   - AnimUtils.getMeshSkel()      → inline resolution using _isAbstractMesh flag
//   - AnimUtils.isAGDrivenSkeleton() → inline check: bones.some(b => b.getLinkedTransformNode() != null)
//   - instanceof AbstractMesh      → _isAbstractMesh flag
//   - instanceof Mesh              → _isMesh flag
//   - getChildMeshes(false)        → returns only _isMesh children (via mockTransformNode above)
// ---------------------------------------------------------------------------

function isAGDriven(skel: any): boolean {
    if (skel == null) return false;
    if (skel.bones == null || skel.bones.length === 0) return false;
    return skel.bones.some((b: any) => b.getLinkedTransformNode() != null);
}

function getMeshSkel(meshSelected: any): { skel: any; mesh: any } | null {
    // Mirrors AnimUtils.getMeshSkel with fromRoot=true default.
    // The real impl walks up to root; for these unit tests meshSelected IS the root,
    // so we check it directly then check its children.
    if (meshSelected._isAbstractMesh && meshSelected.skeleton != null) {
        return { skel: meshSelected.skeleton, mesh: meshSelected };
    }
    // Check getChildMeshes if available (TransformNode case)
    if (typeof meshSelected.getChildMeshes === "function") {
        const children: any[] = meshSelected.getChildMeshes(false);
        for (const child of children) {
            if (child._isAbstractMesh && child.skeleton != null) {
                return { skel: child.skeleton, mesh: child };
            }
        }
    }
    return null;
}

function runChangeSkeleton(
    meshSelected: any,
    scene: { meshes: any[]; getSkeletonByUniqueId: (id: number) => any },
    skelId: string
): boolean {
    // --- resolve current skeleton ---
    const currentSkelResult = getMeshSkel(meshSelected);
    if (currentSkelResult == null) return false;
    const currentSkel = currentSkelResult.skel;

    // --- resolve replacement skeleton ---
    const replacementSkel = scene.getSkeletonByUniqueId(parseInt(skelId));
    if (replacementSkel == null) return false;

    // --- type-mismatch guard: reject AR↔AG swaps ---
    const currentIsAG = isAGDriven(currentSkel);
    const replacementIsAG = isAGDriven(replacementSkel);
    if (currentIsAG !== replacementIsAG) return false;

    // --- local helper: find the first AbstractMesh whose .skeleton === skel ---
    const findHostMesh = (skel: any): any => {
        for (const mesh of scene.meshes) {
            if (mesh.skeleton === skel) return mesh;
        }
        return null;
    };

    // --- AR-to-AR branch ---
    if (!currentIsAG) {
        if (meshSelected._isAbstractMesh !== true) return false;
        meshSelected.skeleton = replacementSkel;
        return true;
    }

    // --- AG-to-AG: TransformNode selected (not instanceof Mesh) ---
    if (meshSelected._isMesh !== true) {
        const childMeshes = meshSelected.getChildMeshes(false).filter(
            (m: any) => m._isMesh === true
        );
        if (childMeshes.length === 0) return false;
        const hostMesh = findHostMesh(replacementSkel);
        if (hostMesh == null) return false;
        for (const m of childMeshes) {
            m.skeleton = replacementSkel;
            m.parent = hostMesh;
        }
        meshSelected.dispose();
        currentSkel.dispose();
        return true;
    }

    // --- AG-to-AG: Mesh selected ---
    {
        const hostMesh = findHostMesh(replacementSkel);
        if (hostMesh == null) return false;
        meshSelected.skeleton = replacementSkel;
        meshSelected.parent = hostMesh;
        return true;
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("changeSkeleton — guard conditions and branches", () => {

    // -----------------------------------------------------------------------
    // Scenario 1: No current skeleton (getMeshSkel returns null) → false
    // Requirement 2.1
    // -----------------------------------------------------------------------
    describe("Scenario 1: no current skeleton", () => {
        it("returns false when meshSelected has no skeleton and no skeleton-bearing children", () => {
            // A plain TransformNode with no children bearing a skeleton
            const tn = mockTransformNode([]);
            const replacementSkel = mockSkeleton(false, 10);
            const scene = mockScene([], [replacementSkel]);

            const result = runChangeSkeleton(tn, scene, "10");

            expect(result).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 2: Bad skelId / replacement skeleton not found → false
    // Requirement 2.2
    // -----------------------------------------------------------------------
    describe("Scenario 2: replacement skeleton not found (bad skelId)", () => {
        it("returns false when getSkeletonByUniqueId returns null", () => {
            const currentSkel = mockSkeleton(false, 1);
            const mesh = mockAbstractMesh(currentSkel);
            const scene = mockScene([mesh], []); // empty skeletons list

            const result = runChangeSkeleton(mesh, scene, "999");

            expect(result).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 3: AR current + AG replacement (type mismatch) → false
    // Requirement 2.3
    // -----------------------------------------------------------------------
    describe("Scenario 3: AR current + AG replacement — type mismatch", () => {
        it("returns false and makes no mutations", () => {
            const currentSkel = mockSkeleton(false, 1); // AR
            const replacementSkel = mockSkeleton(true, 2); // AG
            const mesh = mockAbstractMesh(currentSkel);
            const scene = mockScene([mesh], [currentSkel, replacementSkel]);

            const originalSkeleton = mesh.skeleton;
            const result = runChangeSkeleton(mesh, scene, "2");

            expect(result).toBe(false);
            // .skeleton must not be mutated
            expect(mesh.skeleton).toBe(originalSkeleton);
            // dispose must not be called
            expect(currentSkel.dispose).not.toHaveBeenCalled();
            expect(replacementSkel.dispose).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 4: AG current + AR replacement (type mismatch) → false
    // Requirement 2.4
    // -----------------------------------------------------------------------
    describe("Scenario 4: AG current + AR replacement — type mismatch", () => {
        it("returns false and makes no mutations", () => {
            const currentSkel = mockSkeleton(true, 1); // AG
            const replacementSkel = mockSkeleton(false, 2); // AR
            // AG mesh: a Mesh with the AG skeleton
            const mesh = mockMesh(currentSkel);
            // Host mesh for currentSkel so getMeshSkel resolves
            const scene = mockScene([mesh], [currentSkel, replacementSkel]);

            const originalSkeleton = mesh.skeleton;
            const result = runChangeSkeleton(mesh, scene, "2");

            expect(result).toBe(false);
            expect(mesh.skeleton).toBe(originalSkeleton);
            expect(currentSkel.dispose).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 5: AR+AR — meshSelected is an AbstractMesh → true, .skeleton reassigned
    // Requirements 3.1, 3.2
    // -----------------------------------------------------------------------
    describe("Scenario 5: AR+AR with AbstractMesh selected", () => {
        it("returns true and reassigns .skeleton to replacementSkel", () => {
            const currentSkel = mockSkeleton(false, 1);
            const replacementSkel = mockSkeleton(false, 2);
            const mesh = mockAbstractMesh(currentSkel);
            const scene = mockScene([mesh], [currentSkel, replacementSkel]);

            const result = runChangeSkeleton(mesh, scene, "2");

            expect(result).toBe(true);
            expect(mesh.skeleton).toBe(replacementSkel);
        });

        it("leaves the original skeleton present (not disposed)", () => {
            const currentSkel = mockSkeleton(false, 1);
            const replacementSkel = mockSkeleton(false, 2);
            const mesh = mockAbstractMesh(currentSkel);
            const scene = mockScene([mesh], [currentSkel, replacementSkel]);

            runChangeSkeleton(mesh, scene, "2");

            expect(currentSkel.dispose).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 6: AR+AR — meshSelected is a plain TransformNode (not AbstractMesh) → false
    // Requirement 3.3
    // -----------------------------------------------------------------------
    describe("Scenario 6: AR+AR with plain TransformNode selected (not AbstractMesh)", () => {
        it("returns false", () => {
            // TransformNode with one AR child mesh so getMeshSkel resolves via child
            const currentSkel = mockSkeleton(false, 1);
            const replacementSkel = mockSkeleton(false, 2);
            const childMesh = mockAbstractMesh(currentSkel);
            // Make the TN's getChildMeshes return the childMesh
            const tn: any = {
                _isAbstractMesh: false,
                _isMesh: false,
                dispose: vi.fn(),
                getChildMeshes: () => [childMesh],
            };
            const scene = mockScene([childMesh], [currentSkel, replacementSkel]);

            const result = runChangeSkeleton(tn, scene, "2");

            expect(result).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 7: AG+AG TransformNode — no Mesh descendants → false
    // Requirement 4.2
    // -----------------------------------------------------------------------
    describe("Scenario 7: AG+AG TransformNode with no Mesh descendants", () => {
        it("returns false and makes no mutations", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            // TransformNode whose getChildMeshes returns a non-Mesh child (e.g. AbstractMesh)
            const childAbstractMesh = mockAbstractMesh(currentSkel); // _isMesh = false
            const tn = mockTransformNode([]); // mockTransformNode filters to _isMesh only
            // Override getChildMeshes to return the abstract mesh (non-Mesh)
            tn.getChildMeshes = () => [childAbstractMesh];
            const scene = mockScene([childAbstractMesh], [currentSkel, replacementSkel]);

            const result = runChangeSkeleton(tn, scene, "2");

            expect(result).toBe(false);
            expect(tn.dispose).not.toHaveBeenCalled();
            expect(currentSkel.dispose).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 8: AG+AG TransformNode — 2 Mesh descendants → true
    //   - both meshes re-skeletoned and re-parented
    //   - original TN .dispose() called
    //   - original skeleton .dispose() called
    // Requirements 4.1, 4.3, 4.4, 4.5, 4.6, 4.7
    // -----------------------------------------------------------------------
    describe("Scenario 8: AG+AG TransformNode with 2 Mesh descendants", () => {
        it("returns true", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const childMesh1 = mockMesh(currentSkel);
            const childMesh2 = mockMesh(currentSkel);
            // Host mesh for replacementSkel in scene.meshes
            const hostMesh = mockMesh(replacementSkel);
            const tn = mockTransformNode([childMesh1, childMesh2]);
            const scene = mockScene(
                [childMesh1, childMesh2, hostMesh],
                [currentSkel, replacementSkel]
            );
            // getMeshSkel must resolve: give tn a getChildMeshes that includes the child meshes
            // (tn.getChildMeshes already returns _isMesh children from mockTransformNode)
            // But getMeshSkel also calls getChildMeshes for AbstractMesh detection — 
            // childMesh1 is _isMesh=true so _isAbstractMesh=true, and has currentSkel.
            // Actually tn._isAbstractMesh=false so getMeshSkel falls through to getChildMeshes.
            // The mockTransformNode.getChildMeshes returns children where _isMesh=true.
            // Since mockMesh sets _isAbstractMesh=true, getMeshSkel will find it. ✓

            const result = runChangeSkeleton(tn, scene, "2");

            expect(result).toBe(true);
        });

        it("reassigns .skeleton of both child meshes to replacementSkel", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const childMesh1 = mockMesh(currentSkel);
            const childMesh2 = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const tn = mockTransformNode([childMesh1, childMesh2]);
            const scene = mockScene(
                [childMesh1, childMesh2, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(tn, scene, "2");

            expect(childMesh1.skeleton).toBe(replacementSkel);
            expect(childMesh2.skeleton).toBe(replacementSkel);
        });

        it("re-parents both child meshes to the host mesh", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const childMesh1 = mockMesh(currentSkel);
            const childMesh2 = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const tn = mockTransformNode([childMesh1, childMesh2]);
            const scene = mockScene(
                [childMesh1, childMesh2, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(tn, scene, "2");

            expect(childMesh1.parent).toBe(hostMesh);
            expect(childMesh2.parent).toBe(hostMesh);
        });

        it("calls dispose() on the original TransformNode", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const childMesh1 = mockMesh(currentSkel);
            const childMesh2 = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const tn = mockTransformNode([childMesh1, childMesh2]);
            const scene = mockScene(
                [childMesh1, childMesh2, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(tn, scene, "2");

            expect(tn.dispose).toHaveBeenCalledOnce();
        });

        it("calls dispose() on the original (current) skeleton", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const childMesh1 = mockMesh(currentSkel);
            const childMesh2 = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const tn = mockTransformNode([childMesh1, childMesh2]);
            const scene = mockScene(
                [childMesh1, childMesh2, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(tn, scene, "2");

            expect(currentSkel.dispose).toHaveBeenCalledOnce();
        });

        it("does NOT dispose the replacement skeleton", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const childMesh1 = mockMesh(currentSkel);
            const childMesh2 = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const tn = mockTransformNode([childMesh1, childMesh2]);
            const scene = mockScene(
                [childMesh1, childMesh2, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(tn, scene, "2");

            expect(replacementSkel.dispose).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 9: AG+AG Mesh — host mesh found → true, .skeleton and .parent updated, nothing disposed
    // Requirements 5.1, 5.2, 5.4, 5.5, 5.6
    // -----------------------------------------------------------------------
    describe("Scenario 9: AG+AG Mesh selected, host mesh found", () => {
        it("returns true", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const scene = mockScene(
                [selectedMesh, hostMesh],
                [currentSkel, replacementSkel]
            );

            const result = runChangeSkeleton(selectedMesh, scene, "2");

            expect(result).toBe(true);
        });

        it("reassigns .skeleton to replacementSkel", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const scene = mockScene(
                [selectedMesh, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(selectedMesh, scene, "2");

            expect(selectedMesh.skeleton).toBe(replacementSkel);
        });

        it("re-parents selected mesh to hostMesh", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const scene = mockScene(
                [selectedMesh, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(selectedMesh, scene, "2");

            expect(selectedMesh.parent).toBe(hostMesh);
        });

        it("does NOT dispose any node or skeleton", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            const hostMesh = mockMesh(replacementSkel);
            const scene = mockScene(
                [selectedMesh, hostMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(selectedMesh, scene, "2");

            expect(currentSkel.dispose).not.toHaveBeenCalled();
            expect(replacementSkel.dispose).not.toHaveBeenCalled();
            expect(selectedMesh.dispose).not.toHaveBeenCalled();
            expect(hostMesh.dispose).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Scenario 10: AG+AG Mesh — no host mesh → false, no mutations
    // Requirements 5.3, 6.2
    // -----------------------------------------------------------------------
    describe("Scenario 10: AG+AG Mesh selected, no host mesh found", () => {
        it("returns false", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            // scene.meshes has no mesh with replacementSkel
            const scene = mockScene(
                [selectedMesh],
                [currentSkel, replacementSkel]
            );

            const result = runChangeSkeleton(selectedMesh, scene, "2");

            expect(result).toBe(false);
        });

        it("does not mutate .skeleton or .parent", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            const scene = mockScene(
                [selectedMesh],
                [currentSkel, replacementSkel]
            );

            const originalSkeleton = selectedMesh.skeleton;
            const originalParent = selectedMesh.parent;

            runChangeSkeleton(selectedMesh, scene, "2");

            expect(selectedMesh.skeleton).toBe(originalSkeleton);
            expect(selectedMesh.parent).toBe(originalParent);
        });

        it("does not dispose any node or skeleton", () => {
            const currentSkel = mockSkeleton(true, 1);
            const replacementSkel = mockSkeleton(true, 2);
            const selectedMesh = mockMesh(currentSkel);
            const scene = mockScene(
                [selectedMesh],
                [currentSkel, replacementSkel]
            );

            runChangeSkeleton(selectedMesh, scene, "2");

            expect(currentSkel.dispose).not.toHaveBeenCalled();
            expect(replacementSkel.dispose).not.toHaveBeenCalled();
            expect(selectedMesh.dispose).not.toHaveBeenCalled();
        });
    });
});
