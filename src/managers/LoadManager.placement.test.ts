import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration tests for LoadManager placement orchestration.
 *
 * Verifies that buildPlacementContext correctly reads scene state,
 * drop event coordinates are extracted, pointer tracking works,
 * and positionAsset selects the correct placement mode.
 *
 * Requirements: 1.1, 2.1, 3.1, 3.3, 3.4
 */

// Mock BabylonJS to avoid importing the real engine
vi.mock("babylonjs", () => {
    class Vector3Mock {
        x: number; y: number; z: number;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        static Forward() { return new Vector3Mock(0, 0, 1); }
        static TransformCoordinates(v: any, _m: any) { return v; }
    }

    class ArcRotateCameraMock {
        position = { x: 0, y: 10, z: -10 };
        target = { x: 0, y: 0, z: 0 };
        getDirection(_v: any) { return new Vector3Mock(0, -0.7, 0.7); }
    }

    return {
        Vector3: Vector3Mock,
        ArcRotateCamera: ArcRotateCameraMock,
        Scene: class Scene {},
        Ray: class Ray {
            origin: any; direction: any; length: number;
            constructor(o: any, d: any, l: number) { this.origin = o; this.direction = d; this.length = l; }
        },
        Matrix: { Identity: () => ({}) },
        SceneLoader: { ShowLoadingScreen: false, Append: vi.fn(), ImportMesh: vi.fn(), LoadAssetContainer: vi.fn() },
        Tags: { HasTags: vi.fn(() => false), GetTags: vi.fn(() => "") },
        AbstractMesh: class AbstractMesh {},
        Mesh: class Mesh {},
        Material: class Material {},
        StandardMaterial: class StandardMaterial {},
        MultiMaterial: class MultiMaterial {},
        Skeleton: class Skeleton {},
        AnimationGroup: class AnimationGroup {},
        TransformNode: class TransformNode {},
        Quaternion: { Identity: () => ({}) },
        BoundingInfo: class BoundingInfo {},
        VertexBuffer: {},
        InstancedMesh: class InstancedMesh {},
        Tools: { ToRadians: (d: number) => d * Math.PI / 180 },
        AssetsManager: class AssetsManager {
            tasks: any[] = [];
            addTextFileTask(name: string, url: string) {
                const task = { name, url, onSuccess: null as any, onError: null as any };
                this.tasks.push(task);
                return task;
            }
            load() {}
        },
        AssetContainer: class AssetContainer {},
        Color3: class Color3 { constructor(public r = 0, public g = 0, public b = 0) {} },
    };
});

// Mock transitive dependencies that reference browser globals
vi.mock("../VishvaSerialized", () => ({
    VishvaSerialized: class VishvaSerialized {},
    ObjectIdMap: class ObjectIdMap {},
    MeshMetadataMap: class MeshMetadataMap {},
}));
vi.mock("../sna/SNA", () => ({
    SNAManager: { getSNAManager: () => ({ removeSNAs: vi.fn() }) },
}));
vi.mock("../eventing/VEvent", () => ({ VEvent: {} }));
vi.mock("../eventing/EventManager", () => ({ EventManager: { publish: vi.fn() } }));
vi.mock("./AssetResolver", () => ({
    AssetResolver: class AssetResolver { activate() {} deactivate() {} },
}));
vi.mock("./AssetStore", () => ({
    AssetStore: class AssetStore { static getStore() { return null; } },
}));
vi.mock("./TarUtils", () => ({ extractTarArchive: vi.fn() }));
vi.mock("./FileValidator", () => ({
    isTarGzFile: (name: string) => /\.tar\.gz$/i.test(name),
    isJsonWorldFile: (name: string) => /\.json$/i.test(name),
}));
vi.mock("../util/AnimGroupDedup", () => ({
    RuntimeSharingEntry: class {},
    getRootMesh: vi.fn(),
}));
vi.mock("../util/AnimRangeDedup", () => ({
    deduplicateRangesAtRuntime: vi.fn(),
}));

import { LoadManager } from "./LoadManager";
import { ArcRotateCamera } from "babylonjs";

/**
 * Creates a minimal mock Vishva object with configurable state.
 */
function createMockVishva(opts: {
    isFocusOnAv?: boolean;
    cameraPosition?: { x: number; y: number; z: number };
    cameraDirection?: { x: number; y: number; z: number };
    cameraTarget?: { x: number; y: number; z: number };
    avatarPosition?: { x: number; y: number; z: number };
    avatarForward?: { x: number; y: number; z: number };
    hasGround?: boolean;
    groundHitPoint?: { x: number; y: number; z: number } | null;
    faceForward?: boolean;
} = {}) {
    const camPos = opts.cameraPosition ?? { x: 0, y: 10, z: -10 };
    const camDir = opts.cameraDirection ?? { x: 0, y: -0.7, z: 0.7 };
    const camTarget = opts.cameraTarget ?? { x: 0, y: 0, z: 0 };
    const groundHit = opts.groundHitPoint ?? null;

    const camera = Object.create(ArcRotateCamera.prototype);
    camera.position = camPos;
    camera.globalPosition = camPos;
    camera.target = camTarget;
    camera.getDirection = vi.fn(() => camDir);
    // getForwardRay returns a ray with the camera's forward direction
    // For the mock, compute normalized direction from position to target
    const fdx = camTarget.x - camPos.x;
    const fdy = camTarget.y - camPos.y;
    const fdz = camTarget.z - camPos.z;
    const flen = Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz);
    const forwardDir = flen > 0.0001
        ? { x: fdx / flen, y: fdy / flen, z: fdz / flen }
        : { x: 0, y: 0, z: 1 };
    camera.getForwardRay = vi.fn(() => ({ direction: forwardDir }));

    return {
        isFocusOnAv: opts.isFocusOnAv ?? true,
        scene: {
            activeCamera: camera,
            createPickingRay: vi.fn((_x: number, _y: number, _matrix: any, _cam: any) => ({
                origin: camPos,
                direction: camDir,
                length: 100,
            })),
            getEngine: () => ({
                getRenderingCanvas: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) })
            }),
        },
        avatar: {
            position: opts.avatarPosition ?? { x: 0, y: 0, z: 0 },
            getDirection: vi.fn(() => opts.avatarForward ?? { x: 0, y: 0, z: 1 }),
        },
        avManager: {
            cc: { getSettings: () => ({ faceForward: opts.faceForward ?? false }) },
        },
        ground: opts.hasGround !== false ? {
            intersects: vi.fn((_ray: any, _fastCheck: boolean) => {
                if (groundHit) {
                    return { hit: true, pickedPoint: groundHit, distance: 10 };
                }
                return { hit: false, pickedPoint: null, distance: 0 };
            }),
        } : null,
        isMeshSelected: false,
        selectForEdit: vi.fn(),
        switchEditControl: vi.fn(),
        rootSelected: false,
        animateMesh: vi.fn(),
    };
}

/**
 * Creates a mock rootMesh with bounding box.
 */
function createMockRootMesh(bbMin = { x: -0.5, y: 0, z: -0.5 }, bbMax = { x: 0.5, y: 1, z: 0.5 }) {
    return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        getHierarchyBoundingVectors: () => ({
            min: { x: bbMin.x, y: bbMin.y, z: bbMin.z },
            max: { x: bbMax.x, y: bbMax.y, z: bbMax.z },
        }),
    };
}

describe("LoadManager placement orchestration", () => {

    describe("buildPlacementContext mode selection", () => {

        it("selects 'camera-direction' mode when isFocusOnAv=true and loadType='dialog'", () => {
            const vishva = createMockVishva({ isFocusOnAv: true });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.mode).toBe("camera-direction");
        });

        it("selects 'ground-raycast' mode when isFocusOnAv=false and loadType='dialog'", () => {
            const vishva = createMockVishva({ isFocusOnAv: false });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.mode).toBe("ground-raycast");
        });

        it("selects 'cursor' mode when loadType='drop'", () => {
            const vishva = createMockVishva({ isFocusOnAv: true });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop");

            expect(ctx.mode).toBe("cursor");
        });

        it("selects 'cursor' mode for drop even when isFocusOnAv=false", () => {
            const vishva = createMockVishva({ isFocusOnAv: false });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop");

            expect(ctx.mode).toBe("cursor");
        });
    });

    describe("buildPlacementContext reads camera state", () => {

        it("extracts camera position from scene.activeCamera", () => {
            const vishva = createMockVishva({ cameraPosition: { x: 5, y: 20, z: -15 } });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.cameraPosition).toEqual({ x: 5, y: 20, z: -15 });
        });

        it("computes camera direction from position to target for ArcRotateCamera", () => {
            const vishva = createMockVishva({
                cameraPosition: { x: 0, y: 10, z: -10 },
                cameraTarget: { x: 0, y: 0, z: 0 }
            });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            // Direction = normalize(target - position) = normalize((0,-10,10)) = (0, -0.7071, 0.7071)
            expect(ctx.cameraDirection.x).toBeCloseTo(0, 4);
            expect(ctx.cameraDirection.y).toBeCloseTo(-0.7071, 3);
            expect(ctx.cameraDirection.z).toBeCloseTo(0.7071, 3);
        });

        it("extracts camera target from ArcRotateCamera.target", () => {
            const vishva = createMockVishva({ cameraTarget: { x: 3, y: 1, z: 7 } });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.cameraTarget).toEqual({ x: 3, y: 1, z: 7 });
        });
    });

    describe("buildPlacementContext reads avatar and ground state", () => {

        it("reads isFocusOnAv from vishva", () => {
            const vishva = createMockVishva({ isFocusOnAv: true });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.isFocusOnAv).toBe(true);
        });

        it("reads avatar position", () => {
            const vishva = createMockVishva({ avatarPosition: { x: 10, y: 0.5, z: 10 } });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.avatarPosition).toEqual({ x: 10, y: 0.5, z: 10 });
        });

        it("reports groundMesh.exists=true when ground is present", () => {
            const vishva = createMockVishva({ hasGround: true });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.groundMesh).toEqual({ exists: true });
        });

        it("reports groundMesh.exists=false when ground is null", () => {
            const vishva = createMockVishva({ hasGround: false });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.groundMesh).toEqual({ exists: false });
        });
    });

    describe("drop event coordinate extraction", () => {

        it("uses dropEvent clientX/clientY for scene picking in cursor mode", () => {
            const groundHitPoint = { x: 5, y: 0, z: 8 };
            const vishva = createMockVishva({ hasGround: true, groundHitPoint });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const mockDropEvent = { clientX: 400, clientY: 300 } as DragEvent;
            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop", mockDropEvent);

            // Verify scene.createPickingRay was called with drop coordinates
            expect(vishva.scene.createPickingRay).toHaveBeenCalledWith(
                400, 300, expect.anything(), vishva.scene.activeCamera
            );
            // pickPoint should be the ground hit result
            expect(ctx.pickPoint).toEqual(groundHitPoint);
        });

        it("returns null pickPoint when ground is not present during drop", () => {
            const vishva = createMockVishva({ hasGround: false });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const mockDropEvent = { clientX: 400, clientY: 300 } as DragEvent;
            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop", mockDropEvent);

            expect(ctx.pickPoint).toBeNull();
        });

        it("returns null pickPoint when ground ray misses during drop", () => {
            const vishva = createMockVishva({ hasGround: true, groundHitPoint: null });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            const mockDropEvent = { clientX: 200, clientY: 150 } as DragEvent;
            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop", mockDropEvent);

            expect(ctx.pickPoint).toBeNull();
        });
    });

    describe("last pointer position tracking", () => {

        it("uses _lastCanvasPointerPosition for cursor mode when no dropEvent", () => {
            const groundHitPoint = { x: 12, y: 0, z: 3 };
            const vishva = createMockVishva({ hasGround: true, groundHitPoint });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            // Simulate pointer tracking
            (lm as any)._lastCanvasPointerPosition = { x: 600, y: 450 };

            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop");

            expect(vishva.scene.createPickingRay).toHaveBeenCalledWith(
                600, 450, expect.anything(), vishva.scene.activeCamera
            );
            expect(ctx.pickPoint).toEqual(groundHitPoint);
        });

        it("returns null pickPoint when no dropEvent and no tracked pointer", () => {
            const vishva = createMockVishva({ hasGround: true });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            // _lastCanvasPointerPosition is null by default
            const ctx = (lm as any).buildPlacementContext(rootMesh, "drop");

            expect(ctx.pickPoint).toBeNull();
        });

        it("setupDragAndDrop updates _lastCanvasPointerPosition on pointermove", () => {
            const vishva = createMockVishva();
            const lm = new LoadManager(vishva);

            // Create a mock canvas that captures event listeners
            const listeners: Record<string, Function> = {};
            const mockCanvas = {
                addEventListener: vi.fn((event: string, handler: Function) => {
                    listeners[event] = handler;
                }),
                classList: { add: vi.fn(), remove: vi.fn() },
            } as any;

            lm.setupDragAndDrop(mockCanvas);

            // Simulate a pointermove event
            expect(listeners["pointermove"]).toBeDefined();
            listeners["pointermove"]({ clientX: 123, clientY: 456 });

            expect((lm as any)._lastCanvasPointerPosition).toEqual({ x: 123, y: 456 });
        });
    });

    describe("positionAsset dispatches correct placement mode", () => {

        it("applies camera-direction placement when isFocusOnAv=true and dialog load", () => {
            const vishva = createMockVishva({
                isFocusOnAv: true,
                cameraPosition: { x: 0, y: 5, z: -5 },
                cameraDirection: { x: 0, y: -0.5, z: 0.9 },
                avatarPosition: { x: 0, y: 0, z: 0 },
            });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            (lm as any).postionAsset(rootMesh, 1, "dialog");

            // Should have called selectForEdit or switchEditControl (post-placement logic)
            expect(vishva.selectForEdit).toHaveBeenCalledWith(rootMesh);
            expect(vishva.animateMesh).toHaveBeenCalledWith(rootMesh);
            // Position should be set (camera-direction mode places relative to avatar)
            expect(rootMesh.position.x).toBeDefined();
            expect(rootMesh.position.z).toBeDefined();
        });

        it("applies ground-raycast placement when isFocusOnAv=false and dialog load", () => {
            const groundHit = { x: 10, y: 0, z: 10 };
            const vishva = createMockVishva({
                isFocusOnAv: false,
                hasGround: true,
                groundHitPoint: groundHit,
                cameraPosition: { x: 10, y: 3, z: 10 }, // close to hit point (dist=3, 5*1=5, 3<5)
                cameraTarget: { x: 10, y: 0, z: 10 },
            });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh({ x: -0.5, y: 0, z: -0.5 }, { x: 0.5, y: 1, z: 0.5 });

            (lm as any).postionAsset(rootMesh, 1, "dialog");

            // Should place at ground hit position with BB alignment
            expect(rootMesh.position.x).toBe(groundHit.x);
            expect(rootMesh.position.y).toBe(groundHit.y); // groundY - bbMin.y = 0 - 0 = 0
            expect(rootMesh.position.z).toBe(groundHit.z);
            expect(vishva.selectForEdit).toHaveBeenCalled();
        });

        it("applies cursor placement when loadType='drop' with valid pickPoint", () => {
            const groundHit = { x: 7, y: 0, z: 3 };
            const vishva = createMockVishva({
                isFocusOnAv: true,
                hasGround: true,
                groundHitPoint: groundHit,
            });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh({ x: -1, y: 0, z: -1 }, { x: 1, y: 2, z: 1 });

            const mockDropEvent = { clientX: 500, clientY: 400 } as DragEvent;
            (lm as any).postionAsset(rootMesh, 1, "drop", mockDropEvent);

            // Cursor placement places at pickPoint with ground alignment
            expect(rootMesh.position.x).toBe(groundHit.x);
            expect(rootMesh.position.y).toBe(groundHit.y); // groundY - bbMin.y = 0 - 0 = 0
            expect(rootMesh.position.z).toBe(groundHit.z);
            expect(vishva.selectForEdit).toHaveBeenCalled();
        });

        it("applies fallback placement when ground is not present in ground-raycast mode", () => {
            const vishva = createMockVishva({
                isFocusOnAv: false,
                hasGround: false,
                cameraPosition: { x: 0, y: 10, z: -10 },
                cameraTarget: { x: 0, y: 10, z: 0 }, // direction = normalize(0,0,10) = (0,0,1)
            });
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh();

            (lm as any).postionAsset(rootMesh, 1, "dialog");

            // Fallback: direction=(0,0,1), distance=max(2, assetHeight=1)=2, bbCenterY=0.5
            // position = (0, 10, -10) + (0,0,1)*2 + (0, -0.5, 0) = (0, 9.5, -8)
            expect(rootMesh.position.x).toBe(0);
            expect(rootMesh.position.y).toBeCloseTo(9.5, 4);
            expect(rootMesh.position.z).toBe(-8);
            // No rotation is applied (assets are not rotated on placement)
            expect(rootMesh.rotation.y).toBe(0);
        });

        it("does nothing when rootMesh is null", () => {
            const vishva = createMockVishva();
            const lm = new LoadManager(vishva);

            // Should not throw
            (lm as any).postionAsset(null, 1, "dialog");

            expect(vishva.selectForEdit).not.toHaveBeenCalled();
        });
    });

    describe("bounding box is read correctly", () => {

        it("passes bounding box from getHierarchyBoundingVectors to context", () => {
            const vishva = createMockVishva();
            const lm = new LoadManager(vishva);
            const rootMesh = createMockRootMesh(
                { x: -2, y: -1, z: -3 },
                { x: 2, y: 4, z: 3 }
            );

            const ctx = (lm as any).buildPlacementContext(rootMesh, "dialog");

            expect(ctx.boundingBox.min).toEqual({ x: -2, y: -1, z: -3 });
            expect(ctx.boundingBox.max).toEqual({ x: 2, y: 4, z: 3 });
        });
    });
});
