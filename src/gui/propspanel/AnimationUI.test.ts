// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for AnimationUI bone selector behavior.
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 2.6, 3.1, 3.2, 3.4, 5.1, 5.2, 5.3, 5.4, 6.1, 7.1, 7.2, 7.3
 */

// ─── Mock VTreeDialog ───────────────────────────────────────────────────────

let mockTreeDialogInstance: any;
let mockTreeDialogConstructorArgs: any[];

function MockVTreeDialog(...args: any[]) {
    mockTreeDialogConstructorArgs = args;
    mockTreeDialogInstance = {
        open: vi.fn(),
        close: vi.fn(),
        isOpen: vi.fn().mockReturnValue(true),
        addTreeListener: vi.fn(),
        onClose: vi.fn(),
        toggle: vi.fn(),
        refresh: vi.fn(),
    };
    return mockTreeDialogInstance;
}

vi.mock("../components/VTreeDialog", () => ({
    VTreeDialog: MockVTreeDialog,
}));

// ─── Mock babylonjs ─────────────────────────────────────────────────────────

const mockMarkerMesh: any = {
    material: null,
    isPickable: true,
    attachToBone: vi.fn(),
    detachFromBone: vi.fn(),
    dispose: vi.fn(),
};

const mockMaterial: any = {
    emissiveColor: null,
    disableLighting: false,
    dispose: vi.fn(),
};

function MockStandardMaterial(name: string) {
    mockMaterial.emissiveColor = null;
    mockMaterial.disableLighting = false;
    mockMaterial._name = name;
    return mockMaterial;
}

function MockColor3(r: number, g: number, b: number) {
    return { r, g, b };
}

vi.mock("babylonjs", () => ({
    Skeleton: function() {},
    AnimationRange: function() {},
    AnimationGroup: function() {},
    MeshBuilder: {
        CreateSphere: vi.fn().mockImplementation((name: string, opts: any) => {
            mockMarkerMesh.material = null;
            mockMarkerMesh.isPickable = true;
            mockMarkerMesh._createOpts = opts;
            mockMarkerMesh._name = name;
            return mockMarkerMesh;
        }),
    },
    StandardMaterial: MockStandardMaterial,
    Color3: MockColor3,
    Mesh: function() {},
    Bone: function() {},
}));

// ─── Mock AnimUtils ─────────────────────────────────────────────────────────

vi.mock("../../util/AnimUtils", () => ({
    AnimUtils: {
        getMeshSkel: vi.fn().mockReturnValue(null),
        skelDrivenByAG: vi.fn().mockReturnValue(false),
        getMeshAg: vi.fn().mockReturnValue([]),
    },
}));

// ─── Mock DialogMgr ─────────────────────────────────────────────────────────

vi.mock("../DialogMgr", () => ({
    DialogMgr: {
        showAlertDiag: vi.fn(),
    },
}));

// ─── Mock AnimationML ───────────────────────────────────────────────────────

let animElementDiv: HTMLDivElement;

vi.mock("./AnimationML", () => {
    // Create a minimal animElement that AnimationUI expects
    animElementDiv = document.createElement("div");
    animElementDiv.innerHTML = `
        <div class="skelFound" style="display:none;">
            <button id="animSkelView">view skeleton</button>
            <button id="animRest">show rest pose</button>
            <button id="animSBS">show bone selector</button>
            <button id="animAttach">attach item to bone</button>
            <button id="animDetach">detach item from bone</button>
        </div>
        <div class="agFound" style="display:none;">
            <select class="agList"></select>
            <label class="agFrom"></label>
            <label class="agTo"></label>
            <input type="text" class="agRate" value="1">
            <input type="checkbox" class="agLoop">
            <button class="agPlay">play</button>
            <button class="agStop">stop</button>
        </div>
        <div class="arFound" style="display:none;">
        </div>
    `;
    document.body.appendChild(animElementDiv);
    return { animElement: animElementDiv };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockVishva(): any {
    return {
        scene: { skeletons: [] },
        switchDisabled: false,
        meshSelected: { name: "testMesh" },
        getMeshSelected: vi.fn().mockReturnValue({ name: "testMesh" }),
        isRootSelected: vi.fn().mockReturnValue(false),
        toggleSkelView: vi.fn(),
        animRest: vi.fn(),
        _addBoneSelectors: vi.fn(),
        _delBoneSelectors: vi.fn(),
        _attach2Bone: vi.fn().mockReturnValue(null),
        _detach4Bone: vi.fn().mockReturnValue(null),
        changeSkeleton: vi.fn().mockReturnValue(false),
        linkAnimationsToSkeleton: vi.fn().mockReturnValue(false),
        cloneSkeleton: vi.fn().mockReturnValue(false),
        createAnimRange: vi.fn(),
        getAnimationRanges: vi.fn().mockReturnValue([]),
        playAnimation: vi.fn(),
        stopAnimation: vi.fn(),
        delAnimRange: vi.fn(),
        switchEditControl: vi.fn(),
        removeEditControl: vi.fn(),
    };
}

function createMockSkeleton(bones: any[]): any {
    return {
        name: "TestSkeleton",
        id: "skel1",
        uniqueId: 1,
        bones: bones,
        getAnimationRange: vi.fn().mockReturnValue(null),
        animations: [],
    };
}

function createMockBone(name: string, parent: any = null, children: any[] = []): any {
    const bone: any = {
        name,
        getParent: vi.fn().mockReturnValue(parent),
        children,
    };
    return bone;
}

function setupDomElements(): void {
    // Create DOM elements that AnimationUI looks up by ID
    const ids = [
        "animSkelView", "animRest", "animSBS", "animAttach", "animDetach",
        "animRangeName", "animRangeStart", "animRangeEnd", "animRangeMake",
        "animSkelList", "animSkelChange", "animSkelLinkAnims", "animSkelClone",
        "animList", "animFrom", "animTo", "animRate", "animLoop",
        "playAnim", "stopAnim", "remAnim", "delAnim", "skelName",
    ];
    for (const id of ids) {
        if (!document.getElementById(id)) {
            let el: HTMLElement;
            if (id === "animSkelList" || id === "animList") {
                el = document.createElement("select");
            } else if (id === "animRate" || id === "animRangeName" || id === "animRangeStart" || id === "animRangeEnd") {
                el = document.createElement("input");
                (el as HTMLInputElement).type = "text";
            } else if (id === "animLoop") {
                el = document.createElement("input");
                (el as HTMLInputElement).type = "checkbox";
            } else if (id === "skelName" || id === "animFrom" || id === "animTo") {
                el = document.createElement("label");
            } else {
                el = document.createElement("button");
            }
            el.id = id;
            document.body.appendChild(el);
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AnimationUI - Bone Selector", () => {
    let mockVishva: any;
    let animUI: any;

    beforeEach(async () => {
        mockTreeDialogInstance = null;
        mockTreeDialogConstructorArgs = [];
        vi.clearAllMocks();

        // Reset mock mesh state
        mockMarkerMesh.material = null;
        mockMarkerMesh.isPickable = true;
        mockMarkerMesh.attachToBone.mockClear();
        mockMarkerMesh.detachFromBone.mockClear();
        mockMarkerMesh.dispose.mockClear();
        mockMaterial.emissiveColor = null;
        mockMaterial.disableLighting = false;
        mockMaterial.dispose.mockClear();

        setupDomElements();
        mockVishva = createMockVishva();

        const { AnimationUI } = await import("./AnimationUI");
        animUI = new AnimationUI(mockVishva);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ─── Requirement 1.1: Dialog opens on button click ──────────────────

    describe("dialog opens on button click", () => {
        it("should open VTreeDialog when 'show bone selector' button is clicked", () => {
            // Set up skeleton
            const rootBone = createMockBone("Root", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Click the button
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // VTreeDialog should have been created
            expect(mockTreeDialogInstance).not.toBeNull();
            expect(mockTreeDialogInstance.open).toHaveBeenCalled();
        });
    });

    // ─── Requirement 1.4: Dialog toggles on second click ────────────────

    describe("dialog toggles on second click", () => {
        it("should close dialog when button is clicked while dialog is open", () => {
            const rootBone = createMockBone("Root", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // First click opens
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // Dialog is now open (isOpen returns true)
            expect(mockTreeDialogInstance.isOpen()).toBe(true);

            // Second click should close
            btn.click();

            expect(mockTreeDialogInstance.close).toHaveBeenCalled();
        });
    });

    // ─── Requirement 1.3: Button hidden when no skeleton ────────────────

    describe("button hidden when no skeleton", () => {
        it("should hide skelFound section when skeleton is null", async () => {
            const { AnimUtils } = await import("../../util/AnimUtils");
            (AnimUtils.getMeshSkel as any).mockReturnValue(null);

            animUI.update();

            const skelFound = (animUI as any)._skelFound as HTMLElement;
            expect(skelFound.style.display).toBe("none");
        });
    });

    // ─── Requirement 2.6: Tree built with openAll=false ─────────────────

    describe("tree built with openAll=false", () => {
        it("should pass openAll=false to VTreeDialog constructor", () => {
            const rootBone = createMockBone("Root", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // VTreeDialog constructor args: (vishva, title, pos, treeData, filter?, openAll?, modal?)
            // openAll is the 6th argument (index 5)
            expect(mockTreeDialogConstructorArgs[5]).toBe(false);
        });
    });

    // ─── Requirement 3.1, 3.4: Marker created with correct properties ───

    describe("marker created with correct properties", () => {
        it("should create sphere with diameter 0.05, emissive green, non-pickable", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Open dialog
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // Get the tree listener callback
            const treeListenerCall = mockTreeDialogInstance.addTreeListener.mock.calls[0];
            const treeListener = treeListenerCall[0];

            // Simulate bone click
            treeListener("Hip", "", true);

            // Verify CreateSphere was called with diameter 0.05
            expect(mockMarkerMesh._createOpts).toEqual({ diameter: 0.05 });
            expect(mockMarkerMesh._name).toBe("boneSelector-marker");

            // Verify material properties
            expect(mockMaterial.emissiveColor).toEqual({ r: 0, g: 1, b: 0 });
            expect(mockMaterial.disableLighting).toBe(true);

            // Verify non-pickable
            expect(mockMarkerMesh.isPickable).toBe(false);
        });
    });

    // ─── Requirement 3.2: Non-leaf bone click creates marker ────────────

    describe("non-leaf bone click creates marker", () => {
        it("should create marker when a non-leaf bone (folder) is clicked", () => {
            const childBone = createMockBone("LeftArm", null, []);
            const rootBone = createMockBone("Spine", null, [childBone]);
            childBone.getParent = vi.fn().mockReturnValue(rootBone);
            const skel = createMockSkeleton([rootBone, childBone]);
            (animUI as any)._skel = skel;
            const skelMesh = { name: "skelMesh" };
            (animUI as any)._skelMesh = skelMesh;

            // Open dialog
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            const treeListener = mockTreeDialogInstance.addTreeListener.mock.calls[0][0];

            // Click non-leaf bone (isLeaf=false)
            treeListener("Spine", "", false);

            // Marker should be created (verify via mock mesh state)
            expect(mockMarkerMesh._createOpts).toEqual({ diameter: 0.05 });
            expect(mockMarkerMesh.attachToBone).toHaveBeenCalledWith(rootBone, skelMesh);
        });
    });

    // ─── Requirement 5.1: Marker disposed on dialog close ───────────────

    describe("marker disposed on dialog close", () => {
        it("should dispose marker when dialog is closed", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Open dialog
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // Select a bone to create marker
            const treeListener = mockTreeDialogInstance.addTreeListener.mock.calls[0][0];
            treeListener("Hip", "", true);

            // Get the onClose callback and invoke it
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            onCloseCallback();

            // Marker should be disposed
            expect(mockMarkerMesh.detachFromBone).toHaveBeenCalled();
            expect(mockMaterial.dispose).toHaveBeenCalled();
            expect(mockMarkerMesh.dispose).toHaveBeenCalled();
        });
    });

    // ─── Requirement 5.2: No-op when no marker on close ────────────────

    describe("no-op when no marker on close", () => {
        it("should not throw when dialog closes with no marker", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Open dialog but don't select any bone
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // Get the onClose callback and invoke it — should not throw
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            expect(() => onCloseCallback()).not.toThrow();

            // Marker dispose should NOT have been called
            expect(mockMarkerMesh.dispose).not.toHaveBeenCalled();
        });
    });

    // ─── Requirement 5.3: Cleanup on mesh deselection ───────────────────

    describe("cleanup on mesh deselection", () => {
        it("should dispose marker and close dialog when update() is called", async () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Open dialog and select a bone
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            const treeListener = mockTreeDialogInstance.addTreeListener.mock.calls[0][0];
            treeListener("Hip", "", true);

            // Now simulate mesh deselection by calling update()
            const { AnimUtils } = await import("../../util/AnimUtils");
            (AnimUtils.getMeshSkel as any).mockReturnValue(null);

            animUI.update();

            // Marker should be disposed
            expect(mockMarkerMesh.detachFromBone).toHaveBeenCalled();
            expect(mockMarkerMesh.dispose).toHaveBeenCalled();

            // Dialog should be closed
            expect(mockTreeDialogInstance.close).toHaveBeenCalled();
        });
    });

    // ─── Requirement 5.4: Clean state after reopen ──────────────────────

    describe("clean state after reopen", () => {
        it("should have no marker when dialog is reopened after close", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Open dialog and select a bone
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            const treeListener = mockTreeDialogInstance.addTreeListener.mock.calls[0][0];
            treeListener("Hip", "", true);

            // Close dialog (invoke onClose callback)
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            onCloseCallback();

            // Verify marker is null after close
            expect((animUI as any)._boneMarker).toBeNull();
            expect((animUI as any)._selectedBoneIndex).toBe(-1);
        });
    });

    // ─── Requirement 6.1: "hide bone selector" button absent from DOM ───

    describe('"hide bone selector" button absent from DOM', () => {
        it("should not have a 'hide bone selector' button in the animation HTML", async () => {
            const { animElement } = await import("./AnimationML");
            const buttons = animElement.querySelectorAll("button");
            const hideBtn = Array.from(buttons).find(
                (b) => b.textContent?.toLowerCase().includes("hide bone selector")
            );
            expect(hideBtn).toBeUndefined();
        });

        it("should not have an element with id 'animDBS' in the DOM", () => {
            const dbs = document.getElementById("animDBS");
            expect(dbs).toBeNull();
        });
    });

    // ─── Requirement 7.1: Mesh selection locked when dialog opens ────────

    describe("mesh selection locked when dialog opens", () => {
        it("should set switchDisabled to true when dialog opens", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            expect(mockVishva.switchDisabled).toBe(false);

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            expect(mockVishva.switchDisabled).toBe(true);
        });

        it("should block switchEditControl when switchDisabled is true (Req 7.1)", () => {
            // This tests the contract: when switchDisabled is true,
            // Vishva.switchEditControl returns early (no-op).
            // We verify AnimationUI sets the flag correctly.
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // switchDisabled is true — Vishva.switchEditControl would be a no-op
            expect(mockVishva.switchDisabled).toBe(true);
        });
    });

    // ─── Requirement 7.2: Deselection blocked while dialog open ─────────

    describe("deselection blocked while dialog open", () => {
        it("should have switchDisabled=true preventing escape key deselection", () => {
            // The escape key handler in Vishva checks switchDisabled before
            // calling removeEditControl. We verify the flag is set.
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();

            // While dialog is open, switchDisabled prevents deselection
            expect(mockVishva.switchDisabled).toBe(true);
        });
    });

    // ─── Requirement 7.3: Mesh selection unlocked when dialog closes ────

    describe("mesh selection unlocked when dialog closes", () => {
        it("should set switchDisabled to false when dialog closes", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            // Open dialog
            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();
            expect(mockVishva.switchDisabled).toBe(true);

            // Close dialog via onClose callback
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            onCloseCallback();

            expect(mockVishva.switchDisabled).toBe(false);
        });
    });

    // ─── Requirement 7.3: Lock released on all close paths ──────────────

    describe("lock released on all close paths", () => {
        it("should unlock on close button (onClose callback)", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();
            expect(mockVishva.switchDisabled).toBe(true);

            // Simulate close button (onClose fires)
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            onCloseCallback();

            expect(mockVishva.switchDisabled).toBe(false);
        });

        it("should unlock on toggle (second button click closes dialog)", () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();
            expect(mockVishva.switchDisabled).toBe(true);

            // Toggle close — the close() call on VTreeDialog triggers onHide which fires onClose callback
            // In the real code, _toggleBoneSelectorDialog calls close() which triggers the onHide callback
            // For this test, we verify close() is called on toggle
            btn.click();
            expect(mockTreeDialogInstance.close).toHaveBeenCalled();

            // Simulate the onClose callback firing (as VDiag.hide triggers onHide)
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            onCloseCallback();

            expect(mockVishva.switchDisabled).toBe(false);
        });

        it("should unlock on programmatic close via update()", async () => {
            const rootBone = createMockBone("Hip", null, []);
            const skel = createMockSkeleton([rootBone]);
            (animUI as any)._skel = skel;
            (animUI as any)._skelMesh = { name: "skelMesh" };

            const btn = document.getElementById("animSBS") as HTMLButtonElement;
            btn.click();
            expect(mockVishva.switchDisabled).toBe(true);

            const { AnimUtils } = await import("../../util/AnimUtils");
            (AnimUtils.getMeshSkel as any).mockReturnValue(null);

            // update() disposes marker and closes dialog directly
            // It calls _disposeBoneMarker() and dialog.close()
            animUI.update();

            // The dialog.close() was called
            expect(mockTreeDialogInstance.close).toHaveBeenCalled();

            // In the real flow, close() triggers onHide which fires the onClose callback
            // Simulate that callback
            const onCloseCallback = mockTreeDialogInstance.onClose.mock.calls[0][0];
            onCloseCallback();

            expect(mockVishva.switchDisabled).toBe(false);
        });
    });
});
