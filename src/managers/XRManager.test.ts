import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";

/**
 * Unit tests for XRManager (BabylonJS-facing XR session lifecycle).
 *
 * These tests run in Vitest's node environment with a fully mocked BabylonJS
 * XR experience / feature manager — no real scene, engine, or headset. The
 * `babylonjs` module is mocked to expose a controllable `WebXRSessionManager`
 * (drives capability detection via `XRSupport.detectXRSupport`) and the
 * `WebXRState` enum. A hand-rolled fake `WebXRDefaultExperience` fires the
 * `onStateChangedObservable` when its `enterXRAsync`/`exitXRAsync` are called,
 * which is exactly how the real manager transitions session state.
 *
 * Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.7
 */

// ---------------------------------------------------------------------------
// BabylonJS mock. XRManager and XRSupport only need a handful of symbols at
// runtime: the WebXRState enum and WebXRSessionManager.IsSessionSupportedAsync.
// Everything else it imports (ArcRotateCamera, Camera, Scene, etc.) is used as
// a type only, so a stub value is enough to satisfy the import.
// ---------------------------------------------------------------------------

/**
 * Controls what `detectXRSupport` reports for the current test. Declared with
 * `vi.hoisted` so it is initialised before the hoisted `vi.mock` factory runs.
 */
const supportFlags = vi.hoisted(() => ({ vr: true, ar: true }));

vi.mock("babylonjs", () => {
    class Noop {}
    return {
        // Mirrors the subset of BabylonJS `WebXRState` the manager compares against.
        WebXRState: {
            ENTERING_XR: 0,
            IN_XR: 1,
            EXITING_XR: 2,
            NOT_IN_XR: 3,
        },
        WebXRSessionManager: {
            IsSessionSupportedAsync: vi.fn(async (mode: string): Promise<boolean> => {
                if (mode === "immersive-vr") return supportFlags.vr;
                if (mode === "immersive-ar") return supportFlags.ar;
                return false;
            }),
        },
        // `WebXRFeatureName.TELEPORTATION` is read as a value by
        // `applyLocomotionMode`, so it must be a real object (not a type stub).
        WebXRFeatureName: {
            TELEPORTATION: "xr-teleportation",
            POINTER_SELECTION: "xr-controller-pointer-selection",
        },
        // Type-only imports — stub classes are sufficient.
        AbstractMesh: Noop,
        ArcRotateCamera: Noop,
        Camera: Noop,
        Observer: Noop,
        Scene: Noop,
        SSAO2RenderingPipeline: Noop,
        Vector3: Noop,
        WebXRCamera: Noop,
        WebXRDefaultExperience: Noop,
        WebXRFeaturesManager: Noop,
        WebXRMotionControllerTeleportation: Noop,
        Nullable: undefined,
    };
});

// Import after the mock is registered so the mocked `babylonjs` is used.
import { WebXRState, WebXRSessionManager, WebXRFeatureName } from "babylonjs";
import { XRManager } from "./XRManager.js";

/**
 * `detectXRSupport` short-circuits to "unsupported" when `navigator.xr` is
 * absent (which it is in the node test environment), never reaching the mocked
 * `WebXRSessionManager`. Install a truthy `navigator.xr` stub so support
 * detection is driven entirely by the mocked session manager / `supportFlags`.
 */
function stubNavigatorXR(): void {
    const g = globalThis as any;
    if (typeof g.navigator === "undefined") {
        g.navigator = {};
    }
    g.navigator.xr = {};
}

// ---------------------------------------------------------------------------
// Fake XR experience: records enter/exit calls and drives the state observer.
// ---------------------------------------------------------------------------

type StateHandler = (state: number) => void;

/**
 * A minimal fake BabylonJS `Observable`. Records every handler added and every
 * handler removed so tests can assert that a session detaches exactly the
 * observers it attached (Requirement 9.4). `notify` invokes all live handlers.
 */
function createFakeObservable<T>() {
    const handlers: Array<(v: T) => void> = [];
    let addCount = 0;
    let removeCount = 0;
    return {
        addCount: () => addCount,
        removeCount: () => removeCount,
        liveCount: () => handlers.length,
        add(h: (v: T) => void) {
            handlers.push(h);
            addCount++;
            return { _handler: h };
        },
        remove(obs: any) {
            const i = handlers.indexOf(obs?._handler);
            if (i >= 0) {
                handlers.splice(i, 1);
                removeCount++;
                return true;
            }
            return false;
        },
        notify(v: T) {
            handlers.slice().forEach((h) => h(v));
        },
    };
}

/**
 * A fake WebXR controller component (A/X face button). `press()` fires the
 * rising edge of a press exactly as BabylonJS would.
 */
function createFakeButtonComponent() {
    const observable = createFakeObservable<any>();
    const component: any = {
        pressed: false,
        changes: { pressed: { current: false, previous: false } },
        onButtonStateChangedObservable: observable,
        press() {
            component.changes = { pressed: { current: true, previous: false } };
            component.pressed = true;
            observable.notify(component);
        },
    };
    return component;
}

/**
 * A fake WebXR input source with a motion-controller-init observable. If
 * `motionController` is supplied it is exposed immediately; otherwise call
 * `initController(mc)` to fire `onMotionControllerInitObservable`, mirroring a
 * controller whose profile loads after connection.
 */
let fakeInputSourceCounter = 0;
function createFakeInputSource(motionController: any = null) {
    const initObservable = createFakeObservable<any>();
    // WebXR-level handedness is the most reliable source the manager reads
    // (`source.inputSource.handedness`), falling back to the motion controller.
    // Mirror the motion controller's handedness onto the WebXR input source so
    // the left-controller detection path runs. `uniqueId` keys the pointer-
    // selection feature's per-controller map used by hideLeftControllerRay.
    const handedness: string | undefined = motionController?.handedness;
    const source: any = {
        uniqueId: `fake-source-${fakeInputSourceCounter++}`,
        inputSource: { handedness },
        motionController,
        onMotionControllerInitObservable: initObservable,
        initController(mc: any) {
            source.motionController = mc;
            // Keep the WebXR-level handedness in sync when the profile loads late.
            if (mc?.handedness !== undefined) {
                source.inputSource = { handedness: mc.handedness };
            }
            initObservable.notify(mc);
        },
    };
    return source;
}

/**
 * A fake WebXR thumbstick component. Exposes a mutable `axes` {x, y} that tests
 * set before firing a frame; the manager reads these directly each frame rather
 * than via an observable, so no state-change plumbing is needed here.
 */
function createFakeThumbstick() {
    return {
        axes: { x: 0, y: 0 } as { x: number; y: number },
        // `pressed` lets tests simulate clicking the stick to request FAST
        // (run) movement (hold-to-go-fast). Defaults to not pressed.
        pressed: false as boolean,
    };
}

/**
 * A fake motion controller exposing an A face button and an
 * `xr-standard-thumbstick`, fetched via `getComponent(id)` — the same shape the
 * manager binds against. `handedness` classifies the stick as move (left) vs
 * turn (right); defaults to "right" for the A-button (right) controller.
 */
function createFakeMotionController(
    buttonId: string = "a-button",
    handedness: string = "right"
) {
    const button = createFakeButtonComponent();
    const thumbstick = createFakeThumbstick();
    // Trigger (LEFT → jump) and y-button (LEFT → toggle debug HUD) buttons, both
    // rising-edge-pressable via createFakeButtonComponent().press(). The `menu`
    // button is kept for the ground-truth component-id capture test (real Quest
    // controllers expose it) but the HUD toggle now binds `y-button` because the
    // Quest 'menu' button's pressed state is unreliable in WebXR.
    const trigger = createFakeButtonComponent();
    const yButton = createFakeButtonComponent();
    const menu = createFakeButtonComponent();
    // The B face button (RIGHT controller → DECREASE arc camera radius = dolly
    // toward the avatar). Always present like y-button/menu so the right
    // controller exposes both a-button and b-button for the dolly binding,
    // regardless of `buttonId`.
    const bButton = createFakeButtonComponent();
    const components: Record<string, any> = {
        [buttonId]: button,
        "xr-standard-thumbstick": thumbstick,
        "xr-standard-trigger": trigger,
        "y-button": yButton,
        "b-button": bButton,
        menu,
    };
    return {
        button,
        thumbstick,
        trigger,
        yButton,
        menu,
        bButton,
        handedness,
        components,
        getComponent: (id: string) => components[id] ?? null,
        // Ground-truth component-id enumeration the diag capture reads. Mirrors
        // BabylonJS motion controllers, which expose `getComponentIds()`.
        getComponentIds: () => Object.keys(components),
        pulse: vi.fn(() => Promise.resolve()),
    };
}

function createFakeExperience() {
    const handlers: StateHandler[] = [];
    const calls = {
        enterMode: [] as string[],
        exitCount: 0,
    };

    // Observable for XR controllers being added to the input. The manager sets
    // up a single persistent handler on this in `bindControllerToggle`; tests
    // fire `notify` to simulate a controller connecting during a session.
    const controllerAddedObservable = createFakeObservable<any>();

    // Records every teleport enable/disable so tests can assert whether the
    // Teleport_Feature is active and which floor meshes were registered. The
    // real WebXRFeaturesManager disposes any prior instance on re-enable; the
    // fake mirrors that by returning a fresh teleport stub per enable.
    const featureOps: Array<{ op: "enable" | "disable"; name: string; options?: any }> = [];
    const featuresManager = {
        enableFeature: vi.fn((name: string, _version: string, options?: any) => {
            featureOps.push({ op: "enable", name, options });
            return { _teleport: true, floorMeshes: options?.floorMeshes };
        }),
        disableFeature: vi.fn((name: string) => {
            featureOps.push({ op: "disable", name });
            return true;
        }),
    };

    // Stand-in xrInput handed to the teleport feature options. Also carries the
    // controller-added observable the manager hooks in `bindControllerToggle`.
    const input = {
        _xrInput: true,
        onControllerAddedObservable: controllerAddedObservable,
    };

    // Fake pointer-selection feature exposing the PRIVATE per-controller map
    // (`_controllers`) the manager reaches into to hide the LEFT controller's
    // laser ray + selection ring (hideLeftControllerRay). The featuresManager
    // has no getEnabledFeature, so the manager falls back to this
    // `experience.pointerSelection` property. Tests register a per-controller
    // entry for a given input source via `registerPointerController` so the
    // hide logic can find and hide it.
    const pointerSelection: any = { _controllers: {} };
    function registerPointerController(source: any) {
        const entry = {
            xrController: source,
            laserPointer: { isVisible: true, setEnabled: vi.fn() },
            selectionMesh: { isVisible: true, setEnabled: vi.fn() },
        };
        pointerSelection._controllers[source.uniqueId] = entry;
        return entry;
    }

    // Stand-in WebXR camera (the camera actually rendered to the headset). The
    // manager mirrors the desktop ArcRotateCamera's transform onto this each
    // frame via `setTransformationFromNonVRCamera`; the spy lets tests assert
    // the follow copy happens with the editor camera and the reference-space
    // reset flag.
    // `position` (starting at origin) lets tests assert the per-frame Y copy in
    // updateXRCameraFollow. The spy does NOT modify position, so after the copy
    // position.y stays 0, and the manager then sets it to the arc camera's Y.
    const camera = {
        setTransformationFromNonVRCamera: vi.fn(),
        position: { x: 0, y: 0, z: 0 },
    };

    const baseExperience = {
        input,
        featuresManager,
        camera,
        onStateChangedObservable: {
            add: (h: StateHandler) => {
                handlers.push(h);
                return { _handler: h }; // stand-in Observer
            },
        },
        enterXRAsync: vi.fn(async (mode: string) => {
            calls.enterMode.push(mode);
            // Real base experience emits IN_XR once the session is active.
            handlers.forEach((h) => h(WebXRState.IN_XR));
        }),
        exitXRAsync: vi.fn(async () => {
            calls.exitCount++;
            // Real base experience emits NOT_IN_XR when the session ends.
            handlers.forEach((h) => h(WebXRState.NOT_IN_XR));
        }),
    };

    // `applyLocomotionMode` reads `experience.input` directly (not via
    // baseExperience), so expose it at the top level too. `pointerSelection`
    // is read by hideLeftControllerRay as the fallback feature resolution.
    return {
        baseExperience,
        input,
        featuresManager,
        featureOps,
        calls,
        controllerAddedObservable,
        camera,
        pointerSelection,
        registerPointerController,
    };
}

// ---------------------------------------------------------------------------
// Fake Vishva surface. Only the members XRManager actually reads are provided:
//   scene.createDefaultXRExperienceAsync, scene.postProcessRenderPipelineManager,
//   scene.prePassRenderer, scene.activeCamera, arcCamera, dr, avManager?.cc.
// A pipeline-manager spy lets us assert SSAO detach/attach ordering.
// ---------------------------------------------------------------------------

function createFakeVishva(opts: { noFirstPerson?: boolean; ground?: any } = {}) {
    const fakeExperience = createFakeExperience();

    const ssaoPipeline = { name: "ssaopipeline" };

    const pipelineOps: string[] = [];
    const postProcessRenderPipelineManager = {
        supportedPipelines: [ssaoPipeline],
        detachCamerasFromRenderPipeline: vi.fn((name: string) => {
            pipelineOps.push(`detach:${name}`);
        }),
        attachCamerasToRenderPipeline: vi.fn((name: string) => {
            pipelineOps.push(`attach:${name}`);
        }),
    };

    // Same identity used across the desktop-restore tests (scene.activeCamera ===
    // arcCamera), now with numeric radius + limits so the RIGHT B/A dolly and
    // the LEFT X-button dolly toggle are actually exercised (a bare
    // `{ name: "Editor_Camera" }` with no radius makes both guarded no-ops).
    const arcCamera = {
        name: "Editor_Camera",
        radius: 5,
        lowerRadiusLimit: 1,
        upperRadiusLimit: 100,
        // `alpha` (azimuth) and `beta` (polar angle) are driven by the RIGHT
        // thumbstick orbit (applyCameraOrbit): X changes alpha, forward Y
        // decreases beta / back Y increases it. Dominant-axis gating means only
        // one of alpha/beta changes per frame (ties→alpha). Beta limits let the
        // clamp be exercised. The fake has no
        // `computeWorldMatrix`, so an angle change does NOT move `.position`
        // here — tests assert on `alpha`/`beta` directly.
        alpha: 0,
        beta: 1.2,
        lowerBetaLimit: 0.1,
        upperBetaLimit: 2.0,
        // `position` with y=1.6 is copied onto the XR camera each frame by
        // updateXRCameraFollow. Adding this field keeps the object identity
        // (scene.activeCamera === arcCamera assertions hold).
        position: { x: 0, y: 1.6, z: -5 },
    };

    const dr = { enabled: true }; // depth renderer starts enabled

    // The per-frame stick sampler registers on this. Tests fire `notify()` to
    // drive one "frame" and assert the CharacterController was edge-triggered.
    const onBeforeRenderObservable = createFakeObservable<any>();

    const scene: any = {
        activeCamera: arcCamera,
        postProcessRenderPipelineManager,
        prePassRenderer: { samples: 4 },
        onBeforeRenderObservable,
        createDefaultXRExperienceAsync: vi.fn(async () => fakeExperience),
    };

    // Spies for every CharacterController method the manager drives. The
    // continuous-action methods (walk/walkBack/strafe*/turn*) are edge-triggered
    // by the per-frame stick sampler; start/stop/enableKeyBoard/isKeyBoardEnabled
    // participate in the desktop-controller quiesce/restore path; getSettings
    // supplies the noFirstPerson flag used to derive the default locomotion mode.
    let ccKeyboardEnabled = true;
    const cc = {
        // getSettings supplies the noFirstPerson flag (default locomotion mode)
        // and the current camera elasticity/springback, which the debug HUD
        // reads before disabling elasticity while the HUD is shown.
        getSettings: () => ({
            noFirstPerson: opts.noFirstPerson ?? false,
            cameraElastic: true,
            springback: true,
        }),
        setNoFirstPerson: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        moveTo: vi.fn(),
        walk: vi.fn(),
        walkBack: vi.fn(),
        strafeLeft: vi.fn(),
        strafeRight: vi.fn(),
        run: vi.fn(),
        walkBackFast: vi.fn(),
        strafeLeftFast: vi.fn(),
        strafeRightFast: vi.fn(),
        jump: vi.fn(),
        turnLeft: vi.fn(),
        turnRight: vi.fn(),
        enableKeyBoard: vi.fn((b: boolean) => {
            ccKeyboardEnabled = b;
        }),
        isKeyBoardEnabled: vi.fn(() => ccKeyboardEnabled),
        // Turning state — the manager forces turning ON (setTurningOff(false))
        // for the session and restores the prior value on exit. Default: turning
        // was OFF before the session (isTurningOff → true).
        isTurningOff: vi.fn(() => true),
        setTurningOff: vi.fn(),
        // Camera elasticity spies — the debug HUD disables elasticity while it
        // is shown and restores it when hidden / on session end.
        setCameraElasticity: vi.fn(),
        setCameraElasticSpringback: vi.fn(),
        isCameraElasticSpringback: vi.fn(() => true),
    };

    // The walkable ground mesh registered as a teleportation floor. Defaults to
    // a stub ground so first-person teleport registers a floor; pass
    // `ground: null` to exercise the no-ground path.
    const ground =
        opts.ground === undefined ? { name: "ground" } : opts.ground;

    // Mirror the real `Vishva.moveAvatarTo`: it delegates to `cc.moveTo(target)`
    // (plus a marker it manages). Keeping the delegation faithful lets the
    // third-person property test assert on `cc.moveTo` end-to-end through the
    // same path desktop click-to-move uses.
    const moveAvatarTo = vi.fn((target: any) => {
        cc.moveTo(target, { onComplete: () => {} });
    });

    const vishva: any = {
        scene,
        arcCamera,
        dr,
        ground,
        avManager: { cc },
        moveAvatarTo,
    };

    return {
        vishva,
        scene,
        arcCamera,
        dr,
        pipelineOps,
        fakeExperience,
        ground,
        cc,
        moveAvatarTo,
        onBeforeRenderObservable,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("XRManager", () => {
    beforeEach(() => {
        supportFlags.vr = true;
        supportFlags.ar = true;
        stubNavigatorXR();
        (WebXRSessionManager.IsSessionSupportedAsync as any).mockClear();
    });

    describe("isInXR() session-state tracking (Req 3.4)", () => {
        it("is false initially, true after enter, false after exit", async () => {
            const { vishva } = createFakeVishva();
            const manager = new XRManager(vishva);

            expect(manager.isInXR()).toBe(false);

            await manager.enterVR();
            expect(manager.isInXR()).toBe(true);

            await manager.exitXR();
            expect(manager.isInXR()).toBe(false);
        });

        it("tracks AR sessions the same way", async () => {
            const { vishva } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterAR();
            expect(manager.isInXR()).toBe(true);

            await manager.exitXR();
            expect(manager.isInXR()).toBe(false);
        });
    });

    describe("enter → exit → enter cycle restores expected state (Req 3.6)", () => {
        it("returns to an active session after a full cycle without reuse issues", async () => {
            const { vishva, scene, fakeExperience } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();
            expect(manager.isInXR()).toBe(true);

            await manager.exitXR();
            expect(manager.isInXR()).toBe(false);

            await manager.enterVR();
            expect(manager.isInXR()).toBe(true);

            // Experience is created once and reused across the cycle (Req 3.1).
            expect(scene.createDefaultXRExperienceAsync).toHaveBeenCalledTimes(1);
            // Two enters, one exit so far.
            expect(fakeExperience.baseExperience.enterXRAsync).toHaveBeenCalledTimes(2);
            expect(fakeExperience.baseExperience.exitXRAsync).toHaveBeenCalledTimes(1);
        });

        it("restores desktop pipeline state consistently across cycles", async () => {
            const { vishva, scene, arcCamera, dr } = createFakeVishva();
            const manager = new XRManager(vishva);

            // enter → pipeline disabled
            await manager.enterVR();
            expect(dr.enabled).toBe(false);

            // exit → pipeline restored, editor camera reactivated
            await manager.exitXR();
            expect(dr.enabled).toBe(true);
            expect(scene.activeCamera).toBe(arcCamera);
            expect(scene.prePassRenderer.samples).toBe(4);

            // second enter → disabled again
            await manager.enterVR();
            expect(dr.enabled).toBe(false);

            // second exit → restored again (state not corrupted by first cycle)
            await manager.exitXR();
            expect(dr.enabled).toBe(true);
            expect(scene.activeCamera).toBe(arcCamera);
        });
    });

    describe("pipeline disable-on-enter then restore-on-exit ordering (Req 3.2, 3.3)", () => {
        it("detaches SSAO on enter and re-attaches it on exit, in that order", async () => {
            const { vishva, pipelineOps } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();
            expect(pipelineOps).toEqual(["detach:ssaopipeline"]);

            await manager.exitXR();
            expect(pipelineOps).toEqual([
                "detach:ssaopipeline",
                "attach:ssaopipeline",
            ]);
        });

        it("disables depth renderer on enter and restores its prior enabled state on exit", async () => {
            const { vishva, dr } = createFakeVishva();
            const manager = new XRManager(vishva);

            expect(dr.enabled).toBe(true);
            await manager.enterVR();
            expect(dr.enabled).toBe(false);
            await manager.exitXR();
            expect(dr.enabled).toBe(true);
        });

        it("restores Editor_Camera as the active camera on exit (Req 3.3)", async () => {
            const { vishva, scene, arcCamera } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();
            await manager.exitXR();

            expect(scene.activeCamera).toBe(arcCamera);
        });
    });

    describe("unsupported-mode enter is a no-op (Req 3.5)", () => {
        it("does not start a VR session or touch desktop state when VR is unsupported", async () => {
            supportFlags.vr = false;
            const { vishva, scene, arcCamera, dr, pipelineOps } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();

            expect(manager.isInXR()).toBe(false);
            // Experience never created; desktop untouched.
            expect(scene.createDefaultXRExperienceAsync).not.toHaveBeenCalled();
            expect(dr.enabled).toBe(true);
            expect(scene.activeCamera).toBe(arcCamera);
            expect(pipelineOps).toEqual([]);
        });

        it("does not start an AR session when AR is unsupported", async () => {
            supportFlags.ar = false;
            const { vishva, scene } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterAR();

            expect(manager.isInXR()).toBe(false);
            expect(scene.createDefaultXRExperienceAsync).not.toHaveBeenCalled();
        });
    });

    describe("exitXR is idempotent when no session is active (Req 3.7)", () => {
        it("is a no-op when never entered", async () => {
            const { vishva, scene, arcCamera, dr, pipelineOps } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.exitXR();

            expect(manager.isInXR()).toBe(false);
            // Nothing torn down: no experience, desktop unchanged.
            expect(scene.createDefaultXRExperienceAsync).not.toHaveBeenCalled();
            expect(dr.enabled).toBe(true);
            expect(scene.activeCamera).toBe(arcCamera);
            expect(pipelineOps).toEqual([]);
        });

        it("does not re-run teardown on a second exit after a real exit", async () => {
            const { vishva, fakeExperience, pipelineOps } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();
            await manager.exitXR();

            const opsAfterFirstExit = [...pipelineOps];
            const exitCallsAfterFirst =
                fakeExperience.baseExperience.exitXRAsync.mock.calls.length;

            // Second exit with no active session must be a no-op.
            await manager.exitXR();

            expect(manager.isInXR()).toBe(false);
            expect(pipelineOps).toEqual(opsAfterFirstExit);
            expect(
                fakeExperience.baseExperience.exitXRAsync.mock.calls.length
            ).toBe(exitCallsAfterFirst);
        });
    });

    // -----------------------------------------------------------------------
    // Locomotion mode on session start — stick locomotion has REPLACED teleport.
    //
    // Movement is now stick-driven through the CharacterController in BOTH
    // first- and third-person; the mode only selects camera coupling (via
    // cc.setNoFirstPerson). These tests assert that the Teleport_Feature is
    // NEVER enabled anymore (regardless of noFirstPerson) and that the default
    // mode still derives from noFirstPerson and drives camera coupling.
    //
    // Validates: Requirements 5.3, 5.4, 5.5 (behavior change: stick locomotion)
    // -----------------------------------------------------------------------
    describe("locomotion mode on session start — stick locomotion replaces teleport", () => {
        /** All feature ops recorded for the teleport feature only. */
        function teleportOps(featureOps: Array<{ op: string; name: string; options?: any }>) {
            return featureOps.filter((o) => o.name === WebXRFeatureName.TELEPORTATION);
        }

        it("NEVER enables the Teleport_Feature in first-person mode (noFirstPerson false)", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            // Teleport is no longer the movement mechanism, so it is never enabled.
            const ops = teleportOps(fakeExperience.featureOps);
            expect(ops.some((o) => o.op === "enable")).toBe(false);
            expect(fakeExperience.featuresManager.enableFeature).not.toHaveBeenCalledWith(
                WebXRFeatureName.TELEPORTATION,
                expect.anything(),
                expect.anything()
            );
        });

        it("NEVER enables the Teleport_Feature in third-person mode (noFirstPerson true)", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: true });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            const ops = teleportOps(fakeExperience.featureOps);
            expect(ops.some((o) => o.op === "enable")).toBe(false);
        });

        it("default locomotion mode derives from noFirstPerson: first-person permitted → camera coupled to first person", async () => {
            const { vishva, cc } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            expect((manager as any).locomotion.getMode()).toBe("firstPerson");
            // Camera coupling for first-person: cc.setNoFirstPerson(false).
            expect(cc.setNoFirstPerson).toHaveBeenCalledWith(false);
        });

        it("default locomotion mode derives from noFirstPerson: first-person not permitted → third-person camera coupling", async () => {
            const { vishva, cc } = createFakeVishva({ noFirstPerson: true });
            const manager = new XRManager(vishva);

            await manager.enterAR();

            expect((manager as any).locomotion.getMode()).toBe("thirdPerson");
            // Third-person camera coupling: cc.setNoFirstPerson(true).
            expect(cc.setNoFirstPerson).toHaveBeenCalledWith(true);
        });

        it("keeps the CharacterController RUNNING (started) during the session but disables its keyboard", async () => {
            const { vishva, cc } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            // CC is kept driving movement/animation/camera; only keyboard is off.
            expect(cc.start).toHaveBeenCalled();
            expect(cc.stop).not.toHaveBeenCalled();
            expect(cc.enableKeyBoard).toHaveBeenCalledWith(false);
        });

        it("pointer selection is left enabled (never disabled) so SNA click interaction keeps working", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            // Pointer selection is the experience default and is never toggled by
            // the manager, in either mode.
            const pointerOps = fakeExperience.featureOps.filter(
                (o) => o.name === WebXRFeatureName.POINTER_SELECTION
            );
            expect(pointerOps).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // Stick locomotion: per-frame sampler drives the CharacterController.
    //
    // Movement (left stick) and rotation (right stick) are sampled every frame
    // and edge-trigger the CC (call on false→true / true→false only). The CC
    // keeps driving the avatar-coupled camera (behavior c).
    // -----------------------------------------------------------------------
    describe("stick locomotion drives the CharacterController", () => {
        /**
         * Enter a session, then connect a left (move) and right (turn)
         * controller so both thumbsticks are bound. Returns the sticks so tests
         * can set axes before firing a frame.
         */
        async function enteredWithSticks(noFirstPerson = false) {
            const built = createFakeVishva({ noFirstPerson });
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const rightMc = createFakeMotionController("a-button", "right");
            const leftSource = createFakeInputSource(leftMc);
            const rightSource = createFakeInputSource(rightMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            return { manager, leftMc, rightMc, ...built };
        }

        /** Fire one render frame so the sampler reads the sticks. */
        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("pushing the left stick FORWARD calls cc.walk(true), releasing calls cc.walk(false)", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            // Forward = negative Y (WebXR sign convention).
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.walk).toHaveBeenCalledWith(true);
            expect(cc.walk).toHaveBeenCalledTimes(1);

            // Holding forward another frame must NOT re-call (edge-triggered).
            frame(built);
            expect(cc.walk).toHaveBeenCalledTimes(1);

            // Release → back to neutral → walk(false) once.
            leftMc.thumbstick.axes = { x: 0, y: 0 };
            frame(built);
            expect(cc.walk).toHaveBeenLastCalledWith(false);
            expect(cc.walk).toHaveBeenCalledTimes(2);
        });

        it("pulling the left stick BACK calls cc.walkBack(true)", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.axes = { x: 0, y: 1 };
            frame(built);
            expect(cc.walkBack).toHaveBeenCalledWith(true);
            expect(cc.walk).not.toHaveBeenCalled();
        });

        it("left stick X strafes: positive → strafeRight, negative → strafeLeft", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            expect(cc.strafeRight).toHaveBeenCalledWith(true);

            leftMc.thumbstick.axes = { x: -1, y: 0 };
            frame(built);
            // strafeRight released, strafeLeft engaged.
            expect(cc.strafeRight).toHaveBeenLastCalledWith(false);
            expect(cc.strafeLeft).toHaveBeenCalledWith(true);
        });

        it("right stick orbits the camera and does NOT rotate the avatar (no cc.turn*)", async () => {
            const built = await enteredWithSticks();
            const { cc, rightMc, arcCamera } = built;

            const startAlpha = arcCamera.alpha;
            rightMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            // Camera alpha changed; the avatar was never turned.
            expect(arcCamera.alpha).not.toBe(startAlpha);
            expect(cc.turnLeft).not.toHaveBeenCalled();
            expect(cc.turnRight).not.toHaveBeenCalled();
        });

        it("a stick within the deadzone does not drive the CC", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc, rightMc } = built;

            leftMc.thumbstick.axes = { x: 0.1, y: -0.1 };
            rightMc.thumbstick.axes = { x: 0.05, y: 0 };
            frame(built);

            expect(cc.walk).not.toHaveBeenCalled();
            expect(cc.walkBack).not.toHaveBeenCalled();
            expect(cc.strafeLeft).not.toHaveBeenCalled();
            expect(cc.strafeRight).not.toHaveBeenCalled();
            expect(cc.turnLeft).not.toHaveBeenCalled();
            expect(cc.turnRight).not.toHaveBeenCalled();
        });

        it("stops any active movement on session exit (mid-move exit doesn't leave the avatar walking)", async () => {
            const built = await enteredWithSticks();
            const { manager, cc, leftMc } = built;

            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.walk).toHaveBeenLastCalledWith(true);

            await manager.exitXR();
            // Exit pushes a neutral intent, stopping the active walk.
            expect(cc.walk).toHaveBeenLastCalledWith(false);
        });

        it("does not drive the CC after exit (render sampler detached)", async () => {
            const built = await enteredWithSticks();
            const { manager, cc, leftMc } = built;

            await manager.exitXR();

            const callsAfterExit = cc.walk.mock.calls.length;
            // A stale frame after exit must be inert — the sampler was detached.
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.walk.mock.calls.length).toBe(callsAfterExit);
        });

        it("detaches the render sampler on exit (no accumulation across cycles)", async () => {
            const built = await enteredWithSticks();
            const { manager, onBeforeRenderObservable } = built;

            // One live sampler during the session.
            expect(onBeforeRenderObservable.liveCount()).toBe(1);

            await manager.exitXR();
            // Detached on exit: nothing left registered.
            expect(onBeforeRenderObservable.removeCount()).toBe(
                onBeforeRenderObservable.addCount()
            );
            expect(onBeforeRenderObservable.liveCount()).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // RIGHT-stick camera ORBIT (alpha/beta) + LEFT X-button dolly-to-avatar
    // toggle.
    //
    // The RIGHT stick orbits the follow ArcRotateCamera around the avatar:
    // X changes `alpha`, forward Y (negative) DECREASES `beta` (camera up),
    // back Y (positive) INCREASES it (camera down), clamped to the beta limits.
    // Both axes act simultaneously (no dominant-axis gating). Radius (dolly) is
    // on the RIGHT B/A buttons now, not the stick. The LEFT X-button toggles
    // between "dollied to the avatar" (radius = lowerRadiusLimit, previous
    // radius remembered) and "restored" (radius = remembered value).
    // -----------------------------------------------------------------------
    describe("right-stick camera orbit + left X-button dolly toggle", () => {
        async function enteredWithSticks(noFirstPerson = false) {
            const built = createFakeVishva({ noFirstPerson });
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const rightMc = createFakeMotionController("a-button", "right");
            const leftSource = createFakeInputSource(leftMc);
            const rightSource = createFakeInputSource(rightMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            return { manager, leftMc, rightMc, ...built };
        }

        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("right stick X changes alpha (deadzone respected) and never turns the avatar", async () => {
            const built = await enteredWithSticks();
            const { rightMc, arcCamera, cc } = built;

            // Within the deadzone → alpha unchanged.
            const start = arcCamera.alpha;
            rightMc.thumbstick.axes = { x: 0.05, y: 0 };
            frame(built);
            expect(arcCamera.alpha).toBe(start);

            // Beyond the deadzone → alpha moves by ~ALPHA_RATE (0.0075) * axis.
            rightMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            expect(arcCamera.alpha).toBeCloseTo(start + 0.0075, 6);

            // The avatar was never rotated.
            expect(cc.turnLeft).not.toHaveBeenCalled();
            expect(cc.turnRight).not.toHaveBeenCalled();
        });

        it("right stick Y changes beta: forward (negative) decreases, back (positive) increases, clamped", async () => {
            const built = await enteredWithSticks();
            const { rightMc, arcCamera } = built;

            const start = arcCamera.beta; // 1.2
            // x=0 so Y dominates. Forward = negative Y → beta decreases by
            // ~BETA_RATE (0.003) * axis.
            rightMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(arcCamera.beta).toBeCloseTo(start - 0.003, 6);
            // Many frames clamp at the lower beta limit (never below). At
            // BETA_RATE 0.003, the ~1.1 range needs well over 500 frames, so
            // use a generous count to guarantee the clamp is reached.
            for (let i = 0; i < 2000; i++) frame(built);
            expect(arcCamera.beta).toBe(arcCamera.lowerBetaLimit); // 0.1

            // Back = positive Y → beta increases, clamped at the upper limit.
            rightMc.thumbstick.axes = { x: 0, y: 1 };
            for (let i = 0; i < 2000; i++) frame(built);
            expect(arcCamera.beta).toBe(arcCamera.upperBetaLimit); // 2.0
        });

        it("right stick uses DOMINANT-AXIS gating: only one of alpha/beta changes per frame (ties→alpha)", async () => {
            const built = await enteredWithSticks();
            const { rightMc, arcCamera } = built;

            // |x| > |y| → X dominates: alpha changes, beta stays put.
            let startAlpha = arcCamera.alpha;
            let startBeta = arcCamera.beta;
            rightMc.thumbstick.axes = { x: 0.9, y: 0.3 };
            frame(built);
            expect(arcCamera.alpha).toBeCloseTo(startAlpha + 0.0075 * 0.9, 6);
            expect(arcCamera.beta).toBe(startBeta); // exactly unchanged

            // |y| > |x| → Y dominates: beta changes, alpha stays put.
            startAlpha = arcCamera.alpha;
            startBeta = arcCamera.beta;
            rightMc.thumbstick.axes = { x: 0.3, y: -0.9 };
            frame(built);
            expect(arcCamera.alpha).toBe(startAlpha); // exactly unchanged
            expect(arcCamera.beta).toBeCloseTo(startBeta + 0.003 * -0.9, 6);
            expect(arcCamera.beta).toBeLessThan(startBeta); // forward → down

            // Tie (|x| === |y|) → X wins (>=): alpha changes, beta unchanged.
            startAlpha = arcCamera.alpha;
            startBeta = arcCamera.beta;
            rightMc.thumbstick.axes = { x: 0.9, y: -0.9 };
            frame(built);
            expect(arcCamera.alpha).toBeCloseTo(startAlpha + 0.0075 * 0.9, 6);
            expect(arcCamera.beta).toBe(startBeta); // exactly unchanged
        });

        it("RIGHT B held decreases radius by RADIUS_RATE per frame (continuous, clamped at lowerRadiusLimit)", async () => {
            const built = await enteredWithSticks();
            const { rightMc, arcCamera } = built;

            const start = arcCamera.radius; // 5

            // Hold B (set live pressed state) → each frame dollies toward avatar.
            rightMc.bButton.pressed = true;
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(start - 0.05, 6);
            // Continuous: another frame while held decreases again.
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(start - 0.1, 6);

            // Release → firing a frame leaves radius unchanged.
            rightMc.bButton.pressed = false;
            const held = arcCamera.radius;
            frame(built);
            expect(arcCamera.radius).toBe(held);

            // Hold B for many frames → clamps at the lower radius limit.
            rightMc.bButton.pressed = true;
            for (let i = 0; i < 500; i++) frame(built);
            expect(arcCamera.radius).toBe(arcCamera.lowerRadiusLimit); // 1
        });

        it("RIGHT A held increases radius by RADIUS_RATE per frame (continuous, clamped at upperRadiusLimit)", async () => {
            const built = await enteredWithSticks();
            const { rightMc, arcCamera } = built;

            const start = arcCamera.radius; // 5

            // Hold A (a-button) → each frame dollies away.
            rightMc.button.pressed = true;
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(start + 0.05, 6);
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(start + 0.1, 6);

            // Release → firing a frame leaves radius unchanged.
            rightMc.button.pressed = false;
            const held = arcCamera.radius;
            frame(built);
            expect(arcCamera.radius).toBe(held);

            // Hold A for many frames → clamps at the upper radius limit.
            rightMc.button.pressed = true;
            for (let i = 0; i < 5000; i++) frame(built);
            expect(arcCamera.radius).toBe(arcCamera.upperRadiusLimit); // 100
        });

        it("RIGHT A/B held change radius but do NOT touch beta", async () => {
            const built = await enteredWithSticks();
            const { rightMc, arcCamera } = built;

            const startBeta = arcCamera.beta;
            rightMc.bButton.pressed = true;
            frame(built);
            rightMc.bButton.pressed = false;
            rightMc.button.pressed = true;
            frame(built);
            expect(arcCamera.beta).toBe(startBeta);
        });

        it("left x-button press toggles dolly: first press snaps to lowerRadiusLimit and remembers, second press restores", async () => {
            const built = await enteredWithSticks();
            const { leftMc, arcCamera } = built;

            const original = arcCamera.radius; // 5

            // First press → dolly to the avatar (lowerRadiusLimit), remember old.
            leftMc.button.press();
            expect(arcCamera.radius).toBe(arcCamera.lowerRadiusLimit); // 1
            expect((built.manager as any).xDollyActive).toBe(true);
            expect((built.manager as any).xDollySavedRadius).toBe(original);

            // Second press → restore the remembered radius.
            leftMc.button.press();
            expect(arcCamera.radius).toBe(original); // 5
            expect((built.manager as any).xDollyActive).toBe(false);
            expect((built.manager as any).xDollySavedRadius).toBe(null);
        });

        it("cc.walk / strafe (left stick) still work", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.walk).toHaveBeenLastCalledWith(true);

            leftMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            expect(cc.walk).toHaveBeenLastCalledWith(false);
            expect(cc.strafeRight).toHaveBeenLastCalledWith(true);
        });
    });

    // -----------------------------------------------------------------------
    // CHANGE A: force CharacterController turning ON during the session.
    //
    // On session enter the manager forces turning ON (setTurningOff(false)) so
    // the right thumbstick can rotate the avatar even when the user had turning
    // OFF on the desktop; on exit it restores the captured prior value.
    // -----------------------------------------------------------------------
    describe("forces CC turning ON during the session and restores on exit", () => {
        it("calls cc.setTurningOff(false) on enter and restores the prior value on exit", async () => {
            const { vishva, cc } = createFakeVishva();
            // Prior desktop state: turning was OFF (isTurningOff → true).
            const manager = new XRManager(vishva);

            await manager.enterVR();
            // Turning forced ON for the session.
            expect(cc.setTurningOff).toHaveBeenCalledWith(false);

            await manager.exitXR();
            // Prior value (true = turning off) restored on exit.
            expect(cc.setTurningOff).toHaveBeenLastCalledWith(true);
        });

        it("restores turning ON when it was ON before (captured false)", async () => {
            const { vishva, cc } = createFakeVishva();
            // Prior desktop state: turning was ON (isTurningOff → false).
            cc.isTurningOff.mockReturnValue(false);
            const manager = new XRManager(vishva);

            await manager.enterVR();
            expect(cc.setTurningOff).toHaveBeenCalledWith(false);

            await manager.exitXR();
            // Restored to false (turning stays ON).
            expect(cc.setTurningOff).toHaveBeenLastCalledWith(false);
        });
    });

    // -----------------------------------------------------------------------
    // CHANGE B: per-frame Y copy from the arc (follow) camera onto the XR camera.
    //
    // updateXRCameraFollow's copy forces the XR camera position.y = 0 each
    // frame, then the manager sets it to the arc camera's ACTUAL Y (driven by
    // beta). The fake copy spy does NOT modify position, so after a frame the XR
    // camera's position.y equals the arc camera's Y (1.6).
    // -----------------------------------------------------------------------
    describe("per-frame Y copy from the arc camera onto the XR camera", () => {
        it("copies the arc camera's Y onto the XR camera Y after the follow copy each frame", async () => {
            const { vishva, fakeExperience, onBeforeRenderObservable, arcCamera } =
                createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();

            const xrCam = fakeExperience.baseExperience.camera;
            expect(xrCam.position.y).toBe(0); // starts at 0

            // One frame: follow copy runs (spy leaves position.y at 0), then the
            // manager copies the arc camera's Y (1.6) onto it.
            onBeforeRenderObservable.notify({});

            expect(xrCam.setTransformationFromNonVRCamera).toHaveBeenCalled();
            expect(xrCam.position.y).toBe(arcCamera.position.y); // 1.6
            expect(xrCam.position.y).toBe(1.6);
        });
    });

    // -----------------------------------------------------------------------
    // CHANGE C: RIGHT controller B/A buttons CONTINUOUSLY dolly the arc camera
    // (radius) while held.
    //
    // Holding B decreases radius by RADIUS_RATE (0.05) per frame → camera toward
    // the avatar; holding A increases radius by RADIUS_RATE per frame → camera
    // away, clamped to the camera's [lowerRadiusLimit, upperRadiusLimit] =
    // [1, 100]. Only the RIGHT controller is wired: the manager captures the B/A
    // components (radiusDownButton/radiusUpButton) and samples their live
    // `.pressed` state each frame (no per-press observers). Beta is NOT touched
    // by these buttons (orbit lives on the right stick).
    // -----------------------------------------------------------------------
    describe("RIGHT controller B/A buttons dolly the arc camera (radius)", () => {
        /** Enter and connect a RIGHT controller so B/A dolly buttons are captured. */
        async function enteredWithRightController() {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const rightMc = createFakeMotionController("a-button", "right");
            const rightSource = createFakeInputSource(rightMc);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            return { manager, rightMc, ...built };
        }

        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("holding B decreases radius by RADIUS_RATE per frame, holding A increases it", async () => {
            const built = await enteredWithRightController();
            const { rightMc, arcCamera } = built;

            const start = arcCamera.radius; // 5

            // Hold B → each frame dollies toward avatar.
            rightMc.bButton.pressed = true;
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(start - 0.05, 6);
            rightMc.bButton.pressed = false;

            // Hold A → each frame dollies away.
            const afterB = arcCamera.radius;
            rightMc.button.pressed = true;
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(afterB + 0.05, 6);
        });

        it("captures the B/A components on the RIGHT controller (radiusDownButton/radiusUpButton set)", async () => {
            const { manager, rightMc } = await enteredWithRightController();

            expect((manager as any).radiusDownButton).toBe(rightMc.bButton);
            expect((manager as any).radiusUpButton).toBe(rightMc.button);
        });

        it("clamps radius within [lowerRadiusLimit, upperRadiusLimit] = [1, 100]", async () => {
            const built = await enteredWithRightController();
            const { rightMc, arcCamera } = built;

            // Hold B for many frames → clamp at the lower limit.
            rightMc.bButton.pressed = true;
            for (let i = 0; i < 500; i++) frame(built);
            expect(arcCamera.radius).toBe(arcCamera.lowerRadiusLimit); // 1
            rightMc.bButton.pressed = false;

            // Hold A for many frames → clamp at the upper limit.
            rightMc.button.pressed = true;
            for (let i = 0; i < 5000; i++) frame(built);
            expect(arcCamera.radius).toBe(arcCamera.upperRadiusLimit); // 100
        });

        it("does NOT capture B/A dolly buttons on the LEFT controller", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);

            const withFrame = { ...built };
            const start = built.arcCamera.radius;
            // Holding the LEFT controller's b-button must not dolly (never captured).
            leftMc.bButton.pressed = true;
            withFrame.onBeforeRenderObservable.notify({});
            expect(built.arcCamera.radius).toBe(start);
            // No B/A components were captured for the left controller.
            expect((manager as any).radiusDownButton).toBe(null);
            expect((manager as any).radiusUpButton).toBe(null);
        });

        it("LEFT x-button still toggles the dolly; RIGHT a-button held does NOT touch beta", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const rightMc = createFakeMotionController("a-button", "right");
            built.fakeExperience.controllerAddedObservable.notify(
                createFakeInputSource(leftMc)
            );
            built.fakeExperience.controllerAddedObservable.notify(
                createFakeInputSource(rightMc)
            );

            const dollySpy = vi.spyOn(manager as any, "toggleXDolly");

            const betaStart = built.arcCamera.beta;
            const radiusStart = built.arcCamera.radius;

            // RIGHT a-button held → radius (dolly away) only, never a toggle, never beta.
            rightMc.button.pressed = true;
            built.onBeforeRenderObservable.notify({});
            expect(dollySpy).not.toHaveBeenCalled();
            expect(built.arcCamera.beta).toBe(betaStart);
            expect(built.arcCamera.radius).toBeCloseTo(radiusStart + 0.05, 6);
            rightMc.button.pressed = false;

            // LEFT x-button → dolly toggle still works.
            leftMc.button.press();
            expect(dollySpy).toHaveBeenCalledTimes(1);
        });

        it("clears the captured B/A components on session exit", async () => {
            const { manager, rightMc } = await enteredWithRightController();

            // Captured while the session runs.
            expect((manager as any).radiusDownButton).toBe(rightMc.bButton);
            expect((manager as any).radiusUpButton).toBe(rightMc.button);

            await manager.exitXR();

            // Cleared on exit — nothing carried forward to the next session.
            expect((manager as any).radiusDownButton).toBe(null);
            expect((manager as any).radiusUpButton).toBe(null);
        });
    });

    // -----------------------------------------------------------------------
    // RIGHT controller selection ring/laser rendering-group raise.
    //
    // The HUD plane draws at renderingGroupId 1, which hides the pointer-
    // selection ring behind it when the ray hits a HUD button. The manager
    // raises the pointer-selection meshes to renderingGroupId 2 (over the HUD)
    // each frame until at least one controller's meshes exist, mirroring the
    // left-ray hide retry.
    // -----------------------------------------------------------------------
    describe("raises the right selection ring above the HUD", () => {
        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("sets renderingGroupId=2 on the right controller's selection/laser meshes, left stays hidden", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // A LEFT controller (its ray is hidden) and a RIGHT controller (its
            // ring/laser are raised above the HUD).
            const leftMc = createFakeMotionController("x-button", "left");
            const rightMc = createFakeMotionController("a-button", "right");
            const leftSource = createFakeInputSource(leftMc);
            const rightSource = createFakeInputSource(rightMc);
            // Give the right source a WebXR-level right handedness for realism.
            (rightSource as any).inputSource = { handedness: "right" };
            (leftSource as any).inputSource = { handedness: "left" };
            built.fakeExperience.controllerAddedObservable.notify(leftSource);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            // Register per-controller pointer entries (created asynchronously in
            // the real feature) so the raise/hide logic can find them.
            const leftEntry =
                built.fakeExperience.registerPointerController(leftSource);
            const rightEntry =
                built.fakeExperience.registerPointerController(rightSource);
            // Meshes start at the default rendering group.
            leftEntry.selectionMesh.renderingGroupId = 0;
            leftEntry.laserPointer.renderingGroupId = 0;
            rightEntry.selectionMesh.renderingGroupId = 0;
            rightEntry.laserPointer.renderingGroupId = 0;

            // A frame runs the per-frame retries (ring raise + left ray hide).
            frame(built);

            // Right controller's ring + laser raised above the HUD (group 2).
            expect(rightEntry.selectionMesh.renderingGroupId).toBe(2);
            expect(rightEntry.laserPointer.renderingGroupId).toBe(2);
            // The left controller's ray is hidden (harmless if also raised).
            expect(leftEntry.laserPointer.isVisible).toBe(false);
            expect(leftEntry.selectionMesh.isVisible).toBe(false);
            // The raise flag latches so the retry stops.
            expect((manager as any).rightRingRaised).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Feature: webxr-support, Property 4: Third-person move requires a valid pick
    //
    // For any XR_Select in Third_Person_Mode, CharacterController.moveTo SHALL
    // be invoked with the picked point when the pick has a hit point, and SHALL
    // NOT be invoked when the pick has no hit point.
    //
    // The manager is put into genuine third-person mode by entering a session
    // with noFirstPerson=true (the default locomotion then derives to
    // thirdPerson). `handleSelect(pickedPoint)` is the internal select router
    // (task 8.2); it is exercised directly here with a mocked CC/pick path. The
    // fake `Vishva.moveAvatarTo` faithfully delegates to `cc.moveTo`, so the
    // assertion covers the full handleSelect → moveAvatarTo → cc.moveTo path.
    //
    // Validates: Requirements 6.1, 6.3
    // -----------------------------------------------------------------------
    describe("Property 4: Third-person move requires a valid pick (Req 6.1, 6.3)", () => {
        /**
         * A stand-in picked point. The manager treats it opaquely (only a
         * null/undefined check), so a plain object with coordinates is enough
         * and avoids depending on the mocked Vector3 stub.
         */
        const arbPickedPoint = fc.record({
            x: fc.double({ min: -1e4, max: 1e4, noNaN: true }),
            y: fc.double({ min: -1e4, max: 1e4, noNaN: true }),
            z: fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        });

        /** A "miss" pick supplies no valid point. */
        const arbMissPoint = fc.constantFrom<null | undefined>(null, undefined);

        /**
         * Enter a third-person session and return the manager plus the fake CC.
         * noFirstPerson=true forces the default locomotion mode to thirdPerson,
         * which is the mode Property 4 governs.
         */
        async function thirdPersonManager() {
            const built = createFakeVishva({ noFirstPerson: true });
            const manager = new XRManager(built.vishva);
            await manager.enterAR();
            return { manager, ...built };
        }

        it("invokes CharacterController.moveTo with the picked point when the pick has a hit point", async () => {
            await fc.assert(
                fc.asyncProperty(arbPickedPoint, async (point) => {
                    const { manager, cc, moveAvatarTo } = await thirdPersonManager();

                    // Drive the internal third-person select router with a valid
                    // pick (task 8.2 handleSelect signature: Nullable<Vector3>).
                    (manager as any).handleSelect(point);

                    // moveTo is invoked exactly once with the picked point.
                    expect(moveAvatarTo).toHaveBeenCalledTimes(1);
                    expect(moveAvatarTo).toHaveBeenCalledWith(point);
                    expect(cc.moveTo).toHaveBeenCalledTimes(1);
                    expect(cc.moveTo.mock.calls[0][0]).toBe(point);
                }),
                { numRuns: 100 }
            );
        });

        it("does NOT invoke moveTo when the pick has no hit point", async () => {
            await fc.assert(
                fc.asyncProperty(arbMissPoint, async (missPoint) => {
                    const { manager, cc, moveAvatarTo } = await thirdPersonManager();

                    (manager as any).handleSelect(missPoint as any);

                    // A miss must not drive the avatar.
                    expect(moveAvatarTo).not.toHaveBeenCalled();
                    expect(cc.moveTo).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });

        it("moves on hits and never moves on misses across an interleaved sequence", async () => {
            const arbSelect = fc.oneof(
                arbPickedPoint.map((p) => ({ hit: true as const, point: p })),
                arbMissPoint.map((p) => ({ hit: false as const, point: p }))
            );

            await fc.assert(
                fc.asyncProperty(
                    fc.array(arbSelect, { minLength: 1, maxLength: 25 }),
                    async (selects) => {
                        const { manager, cc, moveAvatarTo } = await thirdPersonManager();

                        const expectedHits = selects.filter((s) => s.hit);

                        for (const s of selects) {
                            (manager as any).handleSelect(s.point as any);
                        }

                        // moveTo fired exactly once per valid-pick select, with
                        // the corresponding picked point, in order.
                        expect(moveAvatarTo).toHaveBeenCalledTimes(expectedHits.length);
                        expect(cc.moveTo).toHaveBeenCalledTimes(expectedHits.length);
                        expectedHits.forEach((s, i) => {
                            expect(moveAvatarTo.mock.calls[i][0]).toBe(s.point);
                            expect(cc.moveTo.mock.calls[i][0]).toBe(s.point);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // -----------------------------------------------------------------------
    // Feature: webxr-support, Property 5: Toggle capability derives from noFirstPerson
    //
    // For any value of the active Character_Controller's `noFirstPerson`, a
    // toggle request SHALL pass `canFirstPerson` equal to the negation of
    // `noFirstPerson`, so that a blocked toggle occurs exactly when
    // `noFirstPerson` is true and the requested mode is `firstPerson`. When the
    // toggle changes the mode (not blocked), the CAMERA COUPLING is reconfigured
    // to match the resulting mode via `cc.setNoFirstPerson` — first-person =>
    // setNoFirstPerson(false), third-person => setNoFirstPerson(true). (Stick
    // locomotion has replaced teleport, so the Teleport_Feature is never enabled
    // by a toggle anymore.)
    //
    // The manager derives `canFirstPerson` internally from
    // `cc.getSettings().noFirstPerson`; there is no public getter for that
    // derived value, so the property is observed through its effects on the pure
    // XRLocomotion state machine (the resulting mode) and on the camera-coupling
    // reconfiguration (`handleToggleRequest` → `applyLocomotionMode` →
    // `cc.setNoFirstPerson`). `handleToggleRequest` is the internal toggle router
    // bound to a controller button; it is exercised directly here, mirroring how
    // Property 4 drives `handleSelect`.
    //
    // Session-start default mode derives from `noFirstPerson`:
    //   noFirstPerson=false → default firstPerson (camera coupled to first person)
    //   noFirstPerson=true  → default thirdPerson (third-person camera coupling)
    //
    // Validates: Requirements 7.2, 7.3, 7.4
    // -----------------------------------------------------------------------
    describe("Property 5: Toggle capability derives from noFirstPerson (Req 7.2, 7.3, 7.4)", () => {
        /** All feature ops recorded for the teleport feature only. */
        function teleportOps(
            featureOps: Array<{ op: string; name: string; options?: any }>
        ) {
            return featureOps.filter((o) => o.name === WebXRFeatureName.TELEPORTATION);
        }

        /** The last `setNoFirstPerson` argument, or undefined if never called. */
        function lastNoFirstPerson(cc: { setNoFirstPerson: any }) {
            const calls = cc.setNoFirstPerson.mock.calls;
            return calls.length ? calls[calls.length - 1][0] : undefined;
        }

        /**
         * Enter a session with the given `noFirstPerson`, then read the pure
         * locomotion state machine's mode after startup so tests can reason
         * about the mode a toggle will target.
         */
        async function enteredManager(noFirstPerson: boolean) {
            const built = createFakeVishva({ noFirstPerson });
            const manager = new XRManager(built.vishva);
            await manager.enterVR();
            const locomotion = (manager as any).locomotion as {
                getMode(): "firstPerson" | "thirdPerson";
            };
            return { manager, locomotion, ...built };
        }

        it("passes canFirstPerson = !noFirstPerson: a first-person-target toggle is blocked iff noFirstPerson is true", async () => {
            await fc.assert(
                fc.asyncProperty(fc.boolean(), async (noFirstPerson) => {
                    const { manager, locomotion, cc } =
                        await enteredManager(noFirstPerson);

                    // Startup default: firstPerson when permitted, else thirdPerson.
                    const startMode = locomotion.getMode();
                    expect(startMode).toBe(
                        noFirstPerson ? "thirdPerson" : "firstPerson"
                    );

                    const couplingCallsBefore = cc.setNoFirstPerson.mock.calls.length;

                    // A toggle from thirdPerson targets firstPerson (the only
                    // case the guard can block). From firstPerson it targets
                    // thirdPerson (never blocked).
                    (manager as any).handleToggleRequest();

                    const modeAfter = locomotion.getMode();

                    if (startMode === "thirdPerson") {
                        // Reached only when noFirstPerson is true. Toggle targets
                        // firstPerson, canFirstPerson=false → blocked: mode
                        // unchanged and no camera-coupling reconfig.
                        expect(noFirstPerson).toBe(true);
                        expect(modeAfter).toBe("thirdPerson");
                        expect(cc.setNoFirstPerson.mock.calls.length).toBe(
                            couplingCallsBefore
                        );
                    } else {
                        // startMode firstPerson ⇒ noFirstPerson false ⇒
                        // canFirstPerson true. Toggle targets thirdPerson (never
                        // blocked) and reconfigures camera coupling to match:
                        // setNoFirstPerson(true) (Req 7.3).
                        expect(noFirstPerson).toBe(false);
                        expect(modeAfter).toBe("thirdPerson");
                        expect(lastNoFirstPerson(cc)).toBe(true);
                    }
                }),
                { numRuns: 50 }
            );
        });

        it("permitted toggle (noFirstPerson=false) flips firstPerson → thirdPerson and reconfigures camera coupling to match", async () => {
            const { manager, locomotion, cc, fakeExperience } = await enteredManager(
                false
            );

            // Startup default is firstPerson: coupling set to first-person.
            expect(locomotion.getMode()).toBe("firstPerson");
            expect(lastNoFirstPerson(cc)).toBe(false);

            // Toggle → thirdPerson (changed): coupling set to third-person.
            (manager as any).handleToggleRequest();
            expect(locomotion.getMode()).toBe("thirdPerson");
            expect(lastNoFirstPerson(cc)).toBe(true);

            // Toggle again → firstPerson (changed, still permitted): coupling
            // back to first-person. Confirms repeated activation (Req 7.5) and
            // that reconfig tracks the resulting mode (Req 7.3).
            (manager as any).handleToggleRequest();
            expect(locomotion.getMode()).toBe("firstPerson");
            expect(lastNoFirstPerson(cc)).toBe(false);

            // Teleport is never enabled by any of these toggles (stick locomotion
            // replaced it).
            expect(
                teleportOps(fakeExperience.featureOps).some((o) => o.op === "enable")
            ).toBe(false);
        });

        it("blocked toggle (noFirstPerson=true) stays thirdPerson and never enables teleport", async () => {
            const { manager, locomotion, fakeExperience } = await enteredManager(
                true
            );

            // Startup default is thirdPerson; teleport never enabled.
            expect(locomotion.getMode()).toBe("thirdPerson");
            expect(
                teleportOps(fakeExperience.featureOps).some((o) => o.op === "enable")
            ).toBe(false);

            // Repeated blocked toggles keep the mode third-person and never
            // enable teleport (Req 7.4, 7.5).
            for (let i = 0; i < 5; i++) {
                (manager as any).handleToggleRequest();
                expect(locomotion.getMode()).toBe("thirdPerson");
            }
            expect(
                teleportOps(fakeExperience.featureOps).some((o) => o.op === "enable")
            ).toBe(false);
        });

        it("blocked toggle emits lightweight feedback via a haptic pulse on the requesting controller (Req 7.4)", async () => {
            const { manager } = await enteredManager(true);

            // Simulate a controller button press having identified the toggle
            // controller (as bindMotionController does before calling
            // handleToggleRequest).
            const pulse = vi.fn(() => Promise.resolve());
            (manager as any).lastToggleController = { pulse };

            (manager as any).handleToggleRequest();

            // Feedback is best-effort: a haptic pulse is attempted on the
            // controller that requested the (blocked) toggle.
            expect(pulse).toHaveBeenCalledTimes(1);
        });
    });

    // -----------------------------------------------------------------------
    // Controller toggle-button binding (task 9.1).
    //
    // The in-XR locomotion toggle is bound to the A/X face button, looked up by
    // component id (`a-button` on the right controller, `x-button` on the left)
    // via `motionController.getComponent(id)`. The trigger
    // (`xr-standard-trigger`) is deliberately NOT bound — it is reserved for
    // select (point-to-move / SNA click). If neither face button exists, no
    // toggle button is bound (no fallback to the trigger or any other button).
    //
    // Validates: Requirements 7.1
    // -----------------------------------------------------------------------
    describe("controller toggle-button binding to A/X face button (Req 7.1)", () => {
        /**
         * A fake WebXR controller component: a rising-edge press is simulated by
         * `press()`, which flips `pressed` to true and notifies subscribers with
         * the `changes.pressed.current === true` shape the manager checks for.
         */
        function createFakeComponent() {
            const observers: Array<(comp: any) => void> = [];
            const component: any = {
                pressed: false,
                changes: { pressed: { current: false, previous: false } },
                onButtonStateChangedObservable: {
                    add: (h: (comp: any) => void) => {
                        observers.push(h);
                        return { _handler: h };
                    },
                    remove: (obs: any) => {
                        const i = observers.indexOf(obs?._handler);
                        if (i >= 0) observers.splice(i, 1);
                    },
                },
                /** Simulate the rising edge of a press. */
                press() {
                    component.changes = {
                        pressed: { current: true, previous: false },
                    };
                    component.pressed = true;
                    observers.forEach((h) => h(component));
                },
            };
            return component;
        }

        /**
         * A fake motion controller exposing components keyed by id, fetched via
         * `getComponent(id)` — exactly how BabylonJS motion controllers expose
         * their button components.
         */
        function createFakeMotionController(components: Record<string, any>) {
            return {
                components,
                getComponent: (id: string) => components[id] ?? null,
                pulse: vi.fn(() => Promise.resolve()),
            };
        }

        it("does NOT bind the A button (right controller): pressing it is a no-op now", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const aButton = createFakeComponent();
            const trigger = createFakeComponent();
            const mc = createFakeMotionController({
                "a-button": aButton,
                "xr-standard-trigger": trigger,
            });

            // The RIGHT a-button dolly binding requires handedness "right"; this
            // fake mc has no handedness, so bindRightControllerHeightButtons
            // early-returns and the generic toggle-binding path leaves a-button
            // unbound (it never drives the dolly-to-avatar toggle).
            const dollySpy = vi.spyOn(manager as any, "toggleXDolly");
            (manager as any).bindMotionController(mc);

            // No toggle-button observer is tracked for the a-button.
            expect((manager as any).toggleButtonObservers).toHaveLength(0);

            aButton.press();
            // The a-button never triggers the dolly-to-avatar toggle.
            expect(dollySpy).not.toHaveBeenCalled();
        });

        it("binds the X button (left controller) and toggles the dolly on press", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const xButton = createFakeComponent();
            const mc = createFakeMotionController({
                "x-button": xButton,
                "xr-standard-trigger": createFakeComponent(),
            });

            // The LEFT X-button now drives the dolly-to-avatar radius toggle.
            const dollySpy = vi.spyOn(manager as any, "toggleXDolly");
            (manager as any).bindMotionController(mc);

            xButton.press();

            expect(dollySpy).toHaveBeenCalledTimes(1);
            // The requesting controller is remembered (for feedback parity).
            expect((manager as any).lastToggleController).toBe(mc);
        });

        it("does NOT bind the trigger: pressing the trigger never toggles the dolly", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const xButton = createFakeComponent();
            const trigger = createFakeComponent();
            const mc = createFakeMotionController({
                "x-button": xButton,
                "xr-standard-trigger": trigger,
            });

            const dollySpy = vi.spyOn(manager as any, "toggleXDolly");
            (manager as any).bindMotionController(mc);

            // Pressing the trigger must not toggle the dolly — it is reserved
            // for jump (left) / select (SNA click).
            trigger.press();
            expect(dollySpy).not.toHaveBeenCalled();

            // The X button remains the sole dolly-toggle control.
            xButton.press();
            expect(dollySpy).toHaveBeenCalledTimes(1);
        });

        it("binds no toggle when neither A nor X face button exists (no trigger fallback)", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const trigger = createFakeComponent();
            const mc = createFakeMotionController({
                "xr-standard-trigger": trigger,
                "xr-standard-squeeze": createFakeComponent(),
            });

            const dollySpy = vi.spyOn(manager as any, "toggleXDolly");
            (manager as any).bindMotionController(mc);

            // No face button present → nothing bound, so no observer is tracked.
            expect((manager as any).toggleButtonObservers).toHaveLength(0);

            // Pressing the trigger (or squeeze) must not fall back to a toggle.
            trigger.press();
            expect(dollySpy).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Cleanup idempotency & observer accounting (task 11.2).
    //
    // Task 11.1 hardened session teardown so that repeated enter/exit cycles do
    // not accumulate handlers: the per-session controller observers (toggle
    // button + motion-controller-init) are detached on session end, while the
    // persistent stateObserver and controllerAddedObserver are created once in
    // ensureExperience and reused. These tests verify:
    //   - exitXR is safe to call twice (with no session, and after a real exit)
    //   - an enter → exit → enter cycle restores desktop state and re-enters
    //     without recreating the experience
    //   - every observer attached during a session is detached on session end,
    //     so cycles do not accumulate handlers (Requirement 9.4)
    //
    // Validates: Requirements 3.7, 9.4
    // -----------------------------------------------------------------------
    describe("cleanup idempotency & observer accounting (Req 3.7, 9.4)", () => {
        /**
         * Drive a controller connecting during the active session: fire the
         * experience's onControllerAddedObservable with a fresh input source
         * whose motion controller exposes an A face button. This mirrors the
         * real flow where the manager binds the toggle button (adding a
         * toggle-button observer) and tracks the motion-controller-init observer
         * per source — both of which must be detached on session end.
         */
        function connectController(fakeExperience: ReturnType<typeof createFakeExperience>) {
            // Use a LEFT x-button controller so a toggle-button observer is
            // actually bound (the x-button drives the dolly toggle). The RIGHT
            // a-button is intentionally unbound now, so it would leave the
            // toggle-observer accounting empty and defeat this test.
            const mc = createFakeMotionController("x-button", "left");
            // Source arrives with no motionController yet, then initializes it,
            // exercising both the immediate-bind path and the init-observable
            // path the manager tracks.
            const source = createFakeInputSource(null);
            fakeExperience.controllerAddedObservable.notify(source);
            source.initController(mc);
            return { source, mc };
        }

        it("double-exit with no active session is safe (no throw, no teardown)", async () => {
            const { vishva, scene, arcCamera, dr, pipelineOps } = createFakeVishva();
            const manager = new XRManager(vishva);

            // Two exits without ever entering must both be safe no-ops.
            await expect(manager.exitXR()).resolves.toBeUndefined();
            await expect(manager.exitXR()).resolves.toBeUndefined();

            expect(manager.isInXR()).toBe(false);
            expect(scene.createDefaultXRExperienceAsync).not.toHaveBeenCalled();
            expect(dr.enabled).toBe(true);
            expect(scene.activeCamera).toBe(arcCamera);
            expect(pipelineOps).toEqual([]);
        });

        it("double-exit after a real exit does not re-run teardown", async () => {
            const { vishva, fakeExperience, dr, pipelineOps } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();
            await manager.exitXR();

            const opsAfterFirstExit = [...pipelineOps];
            const exitCallsAfterFirst =
                fakeExperience.baseExperience.exitXRAsync.mock.calls.length;

            // A second and third exit with no active session must be no-ops.
            await expect(manager.exitXR()).resolves.toBeUndefined();
            await expect(manager.exitXR()).resolves.toBeUndefined();

            expect(manager.isInXR()).toBe(false);
            // Desktop state remains restored and unchanged by the extra exits.
            expect(dr.enabled).toBe(true);
            expect(pipelineOps).toEqual(opsAfterFirstExit);
            expect(
                fakeExperience.baseExperience.exitXRAsync.mock.calls.length
            ).toBe(exitCallsAfterFirst);
        });

        it("enter → exit → enter restores desktop state and re-enters without recreating the experience", async () => {
            const { vishva, scene, arcCamera, dr } = createFakeVishva();
            const manager = new XRManager(vishva);

            // First cycle.
            await manager.enterVR();
            expect(manager.isInXR()).toBe(true);
            expect(dr.enabled).toBe(false);

            await manager.exitXR();
            expect(manager.isInXR()).toBe(false);
            // Desktop fully restored: editor camera active, pipeline back on.
            expect(scene.activeCamera).toBe(arcCamera);
            expect(dr.enabled).toBe(true);
            expect(scene.prePassRenderer.samples).toBe(4);

            // Re-entry works and reuses the same experience (Req 3.1, 3.6).
            await manager.enterVR();
            expect(manager.isInXR()).toBe(true);
            expect(dr.enabled).toBe(false);
            expect(scene.createDefaultXRExperienceAsync).toHaveBeenCalledTimes(1);
        });

        it("detaches every per-session controller observer it attached (count matches)", async () => {
            const { vishva, fakeExperience } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();

            // Connect two controllers mid-session so the manager binds a
            // toggle-button observer per controller and tracks a
            // motion-controller-init observer per source.
            const c1 = connectController(fakeExperience);
            const c2 = connectController(fakeExperience);

            // Two toggle-button observers (one per controller A button) and two
            // motion-controller-init observers (one per source) are now live.
            expect((manager as any).toggleButtonObservers).toHaveLength(2);
            expect((manager as any).motionControllerInitObservers).toHaveLength(2);

            const attachedButtonObs =
                c1.mc.button.onButtonStateChangedObservable.addCount() +
                c2.mc.button.onButtonStateChangedObservable.addCount();
            const attachedInitObs =
                c1.source.onMotionControllerInitObservable.addCount() +
                c2.source.onMotionControllerInitObservable.addCount();
            expect(attachedButtonObs).toBe(2);
            expect(attachedInitObs).toBe(2);

            await manager.exitXR();

            // Session end detaches every observer the session attached: the
            // tracking lists are emptied and each observable's remove count
            // matches its add count, leaving no live handlers behind (Req 9.4).
            expect((manager as any).toggleButtonObservers).toHaveLength(0);
            expect((manager as any).motionControllerInitObservers).toHaveLength(0);

            [c1, c2].forEach(({ source, mc }) => {
                const btn = mc.button.onButtonStateChangedObservable;
                expect(btn.removeCount()).toBe(btn.addCount());
                expect(btn.liveCount()).toBe(0);

                const init = source.onMotionControllerInitObservable;
                expect(init.removeCount()).toBe(init.addCount());
                expect(init.liveCount()).toBe(0);
            });
        });

        it("does not accumulate observers across repeated enter/exit cycles", async () => {
            const { vishva, fakeExperience } = createFakeVishva();
            const manager = new XRManager(vishva);

            for (let cycle = 0; cycle < 3; cycle++) {
                await manager.enterVR();

                const c = connectController(fakeExperience);

                // Exactly one controller's worth of observers is live per cycle;
                // prior cycles left nothing attached.
                expect((manager as any).toggleButtonObservers).toHaveLength(1);
                expect((manager as any).motionControllerInitObservers).toHaveLength(1);

                await manager.exitXR();

                // All per-session observers detached; nothing carried forward.
                expect((manager as any).toggleButtonObservers).toHaveLength(0);
                expect((manager as any).motionControllerInitObservers).toHaveLength(0);
                expect(
                    c.mc.button.onButtonStateChangedObservable.liveCount()
                ).toBe(0);
                expect(
                    c.source.onMotionControllerInitObservable.liveCount()
                ).toBe(0);
            }

            // The experience (and thus its persistent state/controller-added
            // observers) is created once and reused across all three cycles.
            expect(
                (vishva.scene.createDefaultXRExperienceAsync as any).mock.calls.length
            ).toBe(1);
        });

        it("a detached toggle-button observer no longer fires after exit", async () => {
            const { vishva, fakeExperience } = createFakeVishva();
            const manager = new XRManager(vishva);

            await manager.enterVR();
            const { mc } = connectController(fakeExperience);

            const dollySpy = vi.spyOn(manager as any, "toggleXDolly");

            // While in session, an x-button press toggles the dolly.
            mc.button.press();
            expect(dollySpy).toHaveBeenCalledTimes(1);

            await manager.exitXR();

            // After exit the observer is detached, so a further press is inert —
            // no accumulated handler drives a stale toggle.
            mc.button.press();
            expect(dollySpy).toHaveBeenCalledTimes(1);
        });
    });

    // -----------------------------------------------------------------------
    // XR camera follows the avatar (bug fix).
    //
    // The CharacterController drives the desktop ArcRotateCamera to follow and
    // orbit the avatar, but during a session the RENDERED camera is the WebXR
    // camera, not the ArcRotateCamera — so the headset view never followed. The
    // fix mirrors the ArcRotateCamera's transform onto the WebXR camera every
    // frame via `WebXRCamera.setTransformationFromNonVRCamera(other, true)`,
    // riding the same per-frame render observer that samples the sticks (after
    // sampling, so the CC-updated ArcRotateCamera transform is copied same-frame).
    //
    // These tests assert the follow copy happens while in session (with the
    // editor camera and the reference-space reset flag), stops after exit (the
    // observer is detached and the `!inXR` guard makes stray ticks inert), and
    // never throws when the XR camera is unavailable.
    // -----------------------------------------------------------------------
    describe("XR camera follows the avatar each frame", () => {
        /** Fire one render frame so the sampler + camera-follow run. */
        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("copies the ArcRotateCamera transform onto the WebXR camera each frame while in session", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const follow =
                built.fakeExperience.camera.setTransformationFromNonVRCamera;

            // One frame → one follow copy, with the editor camera and the
            // reference-space reset flag (true).
            frame(built);
            expect(follow).toHaveBeenCalledTimes(1);
            expect(follow).toHaveBeenLastCalledWith(built.arcCamera, true);

            // Continuous: another frame copies again (drives follow/orbit every
            // frame so the headset keeps tracking the avatar).
            frame(built);
            expect(follow).toHaveBeenCalledTimes(2);
            expect(follow).toHaveBeenLastCalledWith(built.arcCamera, true);
        });

        it("does NOT copy the transform after exit (guarded by !inXR / detached observer)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const follow =
                built.fakeExperience.camera.setTransformationFromNonVRCamera;

            frame(built);
            const callsBeforeExit = follow.mock.calls.length;
            expect(callsBeforeExit).toBeGreaterThan(0);

            await manager.exitXR();

            // A stale frame after exit must be inert — the render observer was
            // detached and the follow is also guarded by `!inXR`.
            frame(built);
            expect(follow.mock.calls.length).toBe(callsBeforeExit);
        });

        it("does not throw when the WebXR camera is absent", async () => {
            const built = createFakeVishva();
            // Remove the XR camera so the follow must guard against it.
            (built.fakeExperience.baseExperience as any).camera = null;

            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // Firing a frame with no XR camera must be a safe no-op.
            expect(() => frame(built)).not.toThrow();
        });

        it("does not throw when the XR camera lacks setTransformationFromNonVRCamera", async () => {
            const built = createFakeVishva();
            // A camera stub missing the method (e.g. an older/partial mock).
            (built.fakeExperience.baseExperience as any).camera = {};

            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            expect(() => frame(built)).not.toThrow();
        });

        // TEMPORARY DEBUG DIAGNOSTICS: the debug HUD is now head-locked via
        // per-frame placement (updateDiagHudPlacement) instead of parenting to
        // the WebXR camera. The fake camera has no getDirection/position, so the
        // placement path must early-return through its typeof/absence guards.
        // Firing frames after entering a session must therefore be a safe no-op.
        it("does not throw firing frames when the fake camera lacks getDirection (HUD placement is a guarded no-op)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            expect(() => {
                frame(built);
                frame(built);
            }).not.toThrow();
        });
    });

    // -----------------------------------------------------------------------
    // LEFT trigger → jump, LEFT menu → toggle debug HUD.
    //
    // The LEFT controller's trigger (`xr-standard-trigger`) makes the avatar
    // jump on a rising-edge press (permanent feature). The LEFT controller's
    // menu button (`menu`) toggles the TEMPORARY debug HUD. Both are bound only
    // on the LEFT controller (classified by handedness), mirror the toggle-
    // button observer-tracking pattern, and are detached on session end.
    // -----------------------------------------------------------------------
    describe("LEFT trigger jump & menu HUD toggle", () => {
        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("LEFT trigger rising edge calls cc.jump() once", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);

            leftMc.trigger.press();
            expect(built.cc.jump).toHaveBeenCalledTimes(1);
        });

        it("RIGHT trigger does NOT jump (only the left controller jumps)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const rightMc = createFakeMotionController("a-button", "right");
            const rightSource = createFakeInputSource(rightMc);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            rightMc.trigger.press();
            expect(built.cc.jump).not.toHaveBeenCalled();
        });

        it("LEFT y-button rising edge toggles the debug HUD visibility (true, then false)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);

            // The HUD now starts HIDDEN on session entry (avoids the placement
            // flash against the unsettled post-entry head pose). The y-button
            // drives the toggle (the Quest 'menu' button is unreliable in WebXR).
            expect((manager as any).diagVisible).toBe(false);

            // First press → shown.
            leftMc.yButton.press();
            expect((manager as any).diagVisible).toBe(true);

            // Reset the fake's rising-edge state so a second press fires cleanly.
            leftMc.yButton.changes = { pressed: { current: false, previous: true } };
            leftMc.yButton.pressed = false;

            // Second press → hidden again (still toggles either way).
            leftMc.yButton.press();
            expect((manager as any).diagVisible).toBe(false);
        });

        it("showing the debug HUD disables CC camera elasticity, hiding it restores it", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);

            // The HUD now starts HIDDEN, so elasticity is UNTOUCHED on enter —
            // disableCameraElasticityForHud is NOT called at session start.
            expect(built.cc.setCameraElasticity).not.toHaveBeenCalled();
            expect(built.cc.setCameraElasticSpringback).not.toHaveBeenCalled();

            // First press → HUD shown → elasticity/springback disabled while it
            // is visible (toggleDiagHud's show branch calls
            // disableCameraElasticityForHud).
            leftMc.yButton.press();
            expect((manager as any).diagVisible).toBe(true);
            expect(built.cc.setCameraElasticity).toHaveBeenLastCalledWith(false);
            expect(built.cc.setCameraElasticSpringback).toHaveBeenLastCalledWith(false);

            // Reset the fake's rising-edge state so a second press fires cleanly.
            leftMc.yButton.changes = { pressed: { current: false, previous: true } };
            leftMc.yButton.pressed = false;

            // Second press → HUD hidden again → elasticity/springback restored to
            // the original captured state (getSettings → cameraElastic/springback true).
            leftMc.yButton.press();
            expect((manager as any).diagVisible).toBe(false);
            expect(built.cc.setCameraElasticity).toHaveBeenLastCalledWith(true);
            expect(built.cc.setCameraElasticSpringback).toHaveBeenLastCalledWith(true);
        });

        it("the debug HUD starts HIDDEN by default (diagVisible false)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // TEMPORARY DEBUG DIAGNOSTICS: the HUD now starts HIDDEN on session
            // entry so no placement flash occurs; the left Y button shows it.
            expect((manager as any).diagVisible).toBe(false);
        });

        it("debug is OFF by default after entering a session (debugEnabled false)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // The HUD is now a reusable options panel: debug (the diagnostic
            // text content) is gated behind the Debug button and starts off.
            expect((manager as any).debugEnabled).toBe(false);
        });

        it("starts in OPTIONS mode after entering a session (hudMode 'options')", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // The HUD's two-mode model defaults to the world-locked options
            // panel; debug is the head-locked readout switched to via the Debug
            // button.
            expect((manager as any).hudMode).toBe("options");
            expect((manager as any).debugEnabled).toBe(false);
        });

        it("applyHudMode toggles debugEnabled with the mode (debug on, options off)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // Switching to debug mode turns debug computation on. debugEnabled is
            // a plain field write performed BEFORE any GUI ref access, so it takes
            // effect even in the mocked env where the button refs are null.
            (manager as any).hudMode = "debug";
            (manager as any).applyHudMode();
            expect((manager as any).debugEnabled).toBe(true);

            // Switching back to options mode turns it off again.
            (manager as any).hudMode = "options";
            (manager as any).applyHudMode();
            expect((manager as any).debugEnabled).toBe(false);
        });

        it("resets hudMode to 'options' on session end", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // Flip to debug mode mid-session.
            (manager as any).hudMode = "debug";
            (manager as any).applyHudMode();
            expect((manager as any).hudMode).toBe("debug");

            await manager.exitXR();
            // A fresh session must start back in options mode.
            expect((manager as any).hudMode).toBe("options");
        });

        it("defers the one-time world-locked options placement: showing the HUD sets optionsPlacementPending, and frames don't throw or clear it in the mocked env", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            // The HUD now starts HIDDEN, so applyHudMode is NOT called at build:
            // nothing is placed on entry, so optionsPlacementPending stays false.
            expect((manager as any).optionsPlacementPending).toBe(false);

            // Showing the HUD (the left Y button path) enters options mode and
            // DEFERS the one-time world-lock instead of placing synchronously.
            // It flags the placement pending; the render loop then places the
            // panel once on the first valid-pose frame and clears the flag.
            (manager as any).toggleDiagHud();
            expect((manager as any).diagVisible).toBe(true);
            expect((manager as any).optionsPlacementPending).toBe(true);

            // Firing frames in the mocked env never yields a valid head pose
            // (the fake camera lacks getFrontPosition/getDirection), so
            // positionPlaneInFront records diagPlacementSrc "none": placement
            // never succeeds, so the flag stays pending forever — but nothing
            // throws.
            expect(() => {
                built.onBeforeRenderObservable.notify({});
                built.onBeforeRenderObservable.notify({});
            }).not.toThrow();
            expect((manager as any).optionsPlacementPending).toBe(true);
        });

        it("captures ground-truth handedness + component ids for every controller added", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);

            const captured = (manager as any).diagControllers as Array<{
                handedness: string;
                componentIds: string[];
            }>;

            // One entry for the left controller, carrying its reported
            // handedness and the REAL component ids it exposes.
            expect(captured).toHaveLength(1);
            expect(captured[0].handedness).toBe("left");
            expect(captured[0].componentIds).toEqual(
                expect.arrayContaining([
                    "x-button",
                    "xr-standard-thumbstick",
                    "xr-standard-trigger",
                    "menu",
                ])
            );
        });

        it("clears the controller capture on session end", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            built.fakeExperience.controllerAddedObservable.notify(
                createFakeInputSource(leftMc)
            );
            expect((manager as any).diagControllers).toHaveLength(1);

            await manager.exitXR();
            // A fresh session must start with a clean capture.
            expect((manager as any).diagControllers).toHaveLength(0);
        });

        it("detaches the trigger and menu observers on session end (no accumulation)", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);

            // One trigger + one y-button (HUD-toggle) observer tracked while in
            // session. The HUD toggle binds `y-button`, tracked in
            // menuButtonObservers (name kept to minimise churn).
            expect((manager as any).triggerButtonObservers).toHaveLength(1);
            expect((manager as any).menuButtonObservers).toHaveLength(1);

            await manager.exitXR();

            // Both tracking lists emptied; the underlying observables have no
            // live handlers left (Requirement 9.4).
            expect((manager as any).triggerButtonObservers).toHaveLength(0);
            expect((manager as any).menuButtonObservers).toHaveLength(0);

            const trig = leftMc.trigger.onButtonStateChangedObservable;
            expect(trig.removeCount()).toBe(trig.addCount());
            expect(trig.liveCount()).toBe(0);

            const yBtn = leftMc.yButton.onButtonStateChangedObservable;
            expect(yBtn.removeCount()).toBe(yBtn.addCount());
            expect(yBtn.liveCount()).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // CHANGE 2: hide the LEFT controller's pointer-selection laser + selection
    // ring (PERMANENT UX fix — the left trigger is jump, so its ray is
    // misleading; the RIGHT controller keeps its ray for SNA clicks / Exit XR).
    // The laser mesh is created asynchronously, so the hide is retried each
    // frame until it succeeds. Everything is guarded so a fake experience with
    // no pointerSelection / _controllers is a safe no-op.
    // -----------------------------------------------------------------------
    describe("hides the LEFT controller pointer-selection ray", () => {
        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("does NOT throw when the experience has no pointerSelection/_controllers", async () => {
            const built = createFakeVishva();
            // Remove the fake pointer-selection feature so resolution finds none.
            delete (built.fakeExperience as any).pointerSelection;
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);

            // Adding a left controller + firing frames must be a safe no-op.
            expect(() => {
                built.fakeExperience.controllerAddedObservable.notify(leftSource);
                frame(built);
                frame(built);
                frame(built);
            }).not.toThrow();

            // Nothing to hide, so the flag stays false (retry keeps trying but
            // is inert without a feature/map).
            expect((manager as any).leftRayHidden).toBe(false);
        });

        it("hides the left laser + selection ring within a few frames and sets leftRayHidden", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const leftSource = createFakeInputSource(leftMc);

            // Simulate the laser mesh being created asynchronously AFTER the
            // controller is added: register the per-controller pointer entry
            // only now, so the initial hide attempt no-ops and the per-frame
            // retry does the work.
            built.fakeExperience.controllerAddedObservable.notify(leftSource);
            const entry = built.fakeExperience.registerPointerController(leftSource);

            // Not hidden yet (entry only just appeared).
            expect(entry.laserPointer.isVisible).toBe(true);

            // A render frame runs the retry, which now finds and hides the entry.
            frame(built);

            expect(entry.laserPointer.isVisible).toBe(false);
            expect(entry.laserPointer.setEnabled).toHaveBeenCalledWith(false);
            expect(entry.selectionMesh.isVisible).toBe(false);
            expect(entry.selectionMesh.setEnabled).toHaveBeenCalledWith(false);
            expect((manager as any).leftRayHidden).toBe(true);
        });

        it("does NOT hide the RIGHT controller's ray", async () => {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const rightMc = createFakeMotionController("a-button", "right");
            const rightSource = createFakeInputSource(rightMc);
            const rightEntry =
                built.fakeExperience.registerPointerController(rightSource);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            frame(built);
            frame(built);

            // The right controller's ray is untouched (it is not the left one).
            expect(rightEntry.laserPointer.isVisible).toBe(true);
            expect((manager as any).leftRayHidden).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // FAST (run) movement: LEFT thumbstick click + move → per-direction fast
    // variant. Hold-to-go-fast — fast is active only while the stick stays
    // clicked. The fast decision lives in the manager (mapSticksToIntent is
    // unaware of it) and edge-triggers so switching normal↔fast for the SAME
    // direction cleanly stops the old CC method and starts the new one.
    // -----------------------------------------------------------------------
    describe("fast (run) movement via left thumbstick click", () => {
        async function enteredWithSticks() {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const rightMc = createFakeMotionController("a-button", "right");
            built.fakeExperience.controllerAddedObservable.notify(
                createFakeInputSource(leftMc)
            );
            built.fakeExperience.controllerAddedObservable.notify(
                createFakeInputSource(rightMc)
            );
            return { manager, leftMc, rightMc, ...built };
        }

        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("forward + stick pressed → cc.run(true), NOT cc.walk(true)", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.pressed = true;
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);

            expect(cc.run).toHaveBeenCalledWith(true);
            expect(cc.run).toHaveBeenCalledTimes(1);
            expect(cc.walk).not.toHaveBeenCalledWith(true);
        });

        it("releasing the press while still forward switches run → walk", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.pressed = true;
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.run).toHaveBeenLastCalledWith(true);

            // Release the click but keep pushing forward: run turns off, walk on.
            leftMc.thumbstick.pressed = false;
            frame(built);
            expect(cc.run).toHaveBeenLastCalledWith(false);
            expect(cc.walk).toHaveBeenLastCalledWith(true);
        });

        it("back + stick pressed → cc.walkBackFast(true)", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.pressed = true;
            leftMc.thumbstick.axes = { x: 0, y: 1 };
            frame(built);

            expect(cc.walkBackFast).toHaveBeenCalledWith(true);
            expect(cc.walkBack).not.toHaveBeenCalledWith(true);
        });

        it("strafe right / left + stick pressed → strafeRightFast / strafeLeftFast", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.pressed = true;
            leftMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            expect(cc.strafeRightFast).toHaveBeenCalledWith(true);
            expect(cc.strafeRight).not.toHaveBeenCalledWith(true);

            leftMc.thumbstick.axes = { x: -1, y: 0 };
            frame(built);
            // strafeRightFast released, strafeLeftFast engaged.
            expect(cc.strafeRightFast).toHaveBeenLastCalledWith(false);
            expect(cc.strafeLeftFast).toHaveBeenCalledWith(true);
            expect(cc.strafeLeft).not.toHaveBeenCalledWith(true);
        });

        it("holding pressed + forward across frames edge-triggers cc.run(true) only once", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            leftMc.thumbstick.pressed = true;
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            frame(built);
            frame(built);

            expect(cc.run).toHaveBeenCalledTimes(1);
            expect(cc.run).toHaveBeenLastCalledWith(true);
        });

        it("moving WITHOUT the press uses normal methods only (fast never called with true)", async () => {
            const built = await enteredWithSticks();
            const { cc, leftMc } = built;

            // Not pressed.
            leftMc.thumbstick.pressed = false;
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.walk).toHaveBeenCalledWith(true);

            leftMc.thumbstick.axes = { x: 0, y: 1 };
            frame(built);
            expect(cc.walkBack).toHaveBeenCalledWith(true);

            leftMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            expect(cc.strafeRight).toHaveBeenCalledWith(true);

            leftMc.thumbstick.axes = { x: -1, y: 0 };
            frame(built);
            expect(cc.strafeLeft).toHaveBeenCalledWith(true);

            // No fast variant was ever engaged.
            expect(cc.run).not.toHaveBeenCalledWith(true);
            expect(cc.walkBackFast).not.toHaveBeenCalledWith(true);
            expect(cc.strafeRightFast).not.toHaveBeenCalledWith(true);
            expect(cc.strafeLeftFast).not.toHaveBeenCalledWith(true);
        });

        it("stops an active FAST movement on session exit", async () => {
            const built = await enteredWithSticks();
            const { manager, cc, leftMc } = built;

            leftMc.thumbstick.pressed = true;
            leftMc.thumbstick.axes = { x: 0, y: -1 };
            frame(built);
            expect(cc.run).toHaveBeenLastCalledWith(true);

            await manager.exitXR();
            // Neutral intent (fast=false) pushed on exit stops the active run.
            expect(cc.run).toHaveBeenLastCalledWith(false);
        });
    });

    // -----------------------------------------------------------------------
    // OPTIONS-HUD SENSITIVITY RATES: the three orbit/dolly rates are now
    // instance fields (formerly module consts) so the OPTIONS panel sliders can
    // tune them live and persist to localStorage. These tests cover: defaults
    // (no localStorage), localStorage load, that applyCameraOrbit/applyButtonDolly
    // read the FIELD (not a const), and that saveSensitivityToStorage writes the
    // three keys. In the mocked env createDiagHud throws (no real GUI), so the
    // slider refs stay null and the field values are the only observable state.
    // -----------------------------------------------------------------------
    describe("OPTIONS-HUD orbit/dolly sensitivity rates (fields + localStorage)", () => {
        async function enteredWithSticks() {
            const built = createFakeVishva();
            const manager = new XRManager(built.vishva);
            await manager.enterVR();

            const leftMc = createFakeMotionController("x-button", "left");
            const rightMc = createFakeMotionController("a-button", "right");
            const leftSource = createFakeInputSource(leftMc);
            const rightSource = createFakeInputSource(rightMc);
            built.fakeExperience.controllerAddedObservable.notify(leftSource);
            built.fakeExperience.controllerAddedObservable.notify(rightSource);

            return { manager, leftMc, rightMc, ...built };
        }

        function frame(built: { onBeforeRenderObservable: any }) {
            built.onBeforeRenderObservable.notify({});
        }

        it("uses the default rates when localStorage is absent", async () => {
            // The node test env has no `localStorage`, so loadSensitivityFromStorage
            // is a no-op and the fields keep their DEFAULT_* initial values.
            expect(typeof (globalThis as any).localStorage).toBe("undefined");
            const { manager } = await enteredWithSticks();
            expect((manager as any).alphaRate).toBeCloseTo(0.0075, 6);
            expect((manager as any).betaRate).toBeCloseTo(0.003, 6);
            expect((manager as any).radiusRate).toBeCloseTo(0.05, 6);
        });

        it("loads a valid persisted rate from localStorage on session start", async () => {
            const store: Record<string, string> = {
                "vishva.xr.alphaRate": "0.015",
            };
            (globalThis as any).localStorage = {
                getItem: (k: string) => (k in store ? store[k] : null),
                setItem: (k: string, v: string) => {
                    store[k] = v;
                },
            };
            try {
                const { manager } = await enteredWithSticks();
                // Persisted, in-range value wins.
                expect((manager as any).alphaRate).toBeCloseTo(0.015, 6);
                // No stored beta/radius → defaults stand.
                expect((manager as any).betaRate).toBeCloseTo(0.003, 6);
                expect((manager as any).radiusRate).toBeCloseTo(0.05, 6);
            } finally {
                delete (globalThis as any).localStorage;
            }
        });

        it("ignores out-of-range / unparseable persisted values (keeps defaults)", async () => {
            const store: Record<string, string> = {
                "vishva.xr.alphaRate": "999", // above MAX_ORBIT_RATE (0.02)
                "vishva.xr.betaRate": "not-a-number",
                "vishva.xr.radiusRate": "-1", // below 0
            };
            (globalThis as any).localStorage = {
                getItem: (k: string) => (k in store ? store[k] : null),
                setItem: (k: string, v: string) => {
                    store[k] = v;
                },
            };
            try {
                const { manager } = await enteredWithSticks();
                expect((manager as any).alphaRate).toBeCloseTo(0.0075, 6);
                expect((manager as any).betaRate).toBeCloseTo(0.003, 6);
                expect((manager as any).radiusRate).toBeCloseTo(0.05, 6);
            } finally {
                delete (globalThis as any).localStorage;
            }
        });

        it("applyCameraOrbit reads the alphaRate FIELD (changing it changes the orbit step)", async () => {
            const built = await enteredWithSticks();
            const { manager, rightMc, arcCamera } = built;

            (manager as any).alphaRate = 0.02;
            const start = arcCamera.alpha;
            // Full deflection on X → alpha changes by alphaRate * 1.
            rightMc.thumbstick.axes = { x: 1, y: 0 };
            frame(built);
            expect(arcCamera.alpha).toBeCloseTo(start + 0.02, 6);
        });

        it("applyButtonDolly reads the radiusRate FIELD (changing it changes the dolly step)", async () => {
            const built = await enteredWithSticks();
            const { manager, rightMc, arcCamera } = built;

            (manager as any).radiusRate = 0.2;
            const start = arcCamera.radius;
            // Hold B one frame → radius decreases by radiusRate.
            rightMc.bButton.pressed = true;
            frame(built);
            expect(arcCamera.radius).toBeCloseTo(start - 0.2, 6);
        });

        it("saveSensitivityToStorage writes the three rate keys", async () => {
            const setItem = vi.fn();
            (globalThis as any).localStorage = {
                getItem: () => null,
                setItem,
            };
            try {
                const { manager } = await enteredWithSticks();
                (manager as any).alphaRate = 0.01;
                (manager as any).betaRate = 0.004;
                (manager as any).radiusRate = 0.08;
                (manager as any).saveSensitivityToStorage();
                expect(setItem).toHaveBeenCalledWith("vishva.xr.alphaRate", "0.01");
                expect(setItem).toHaveBeenCalledWith("vishva.xr.betaRate", "0.004");
                expect(setItem).toHaveBeenCalledWith("vishva.xr.radiusRate", "0.08");
            } finally {
                delete (globalThis as any).localStorage;
            }
        });
    });
});
