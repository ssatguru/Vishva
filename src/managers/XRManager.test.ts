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
function createFakeInputSource(motionController: any = null) {
    const initObservable = createFakeObservable<any>();
    const source: any = {
        motionController,
        onMotionControllerInitObservable: initObservable,
        initController(mc: any) {
            source.motionController = mc;
            initObservable.notify(mc);
        },
    };
    return source;
}

/**
 * A fake motion controller exposing an A face button by default, fetched via
 * `getComponent(id)` — the same shape the manager binds against.
 */
function createFakeMotionController(buttonId: string = "a-button") {
    const button = createFakeButtonComponent();
    return {
        button,
        components: { [buttonId]: button },
        getComponent: (id: string) => (id === buttonId ? button : null),
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

    const baseExperience = {
        input,
        featuresManager,
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
    // baseExperience), so expose it at the top level too.
    return {
        baseExperience,
        input,
        featuresManager,
        featureOps,
        calls,
        controllerAddedObservable,
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

    const arcCamera = { name: "Editor_Camera" };

    const dr = { enabled: true }; // depth renderer starts enabled

    const scene: any = {
        activeCamera: arcCamera,
        postProcessRenderPipelineManager,
        prePassRenderer: { samples: 4 },
        createDefaultXRExperienceAsync: vi.fn(async () => fakeExperience),
    };

    // `moveTo` / `start` are spies so the third-person select-to-move property
    // test can observe whether the CharacterController was driven and with what
    // target. `getSettings` supplies the noFirstPerson flag used to derive the
    // default locomotion mode.
    const cc = {
        getSettings: () => ({ noFirstPerson: opts.noFirstPerson ?? false }),
        start: vi.fn(),
        moveTo: vi.fn(),
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
    // First-person locomotion: teleport feature + default-mode derivation.
    // Validates: Requirements 5.3, 5.4, 5.5 (task 7.2)
    // -----------------------------------------------------------------------
    describe("locomotion mode / teleport feature on session start (Req 5.3, 5.4, 5.5)", () => {
        /** All feature ops recorded for the teleport feature only. */
        function teleportOps(featureOps: Array<{ op: string; name: string; options?: any }>) {
            return featureOps.filter((o) => o.name === WebXRFeatureName.TELEPORTATION);
        }

        it("enables the Teleport_Feature in first-person mode (noFirstPerson false) — Req 5.4", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            const ops = teleportOps(fakeExperience.featureOps);
            // Default mode is first-person, so teleport is enabled exactly once
            // and never disabled during startup.
            expect(ops).toHaveLength(1);
            expect(ops[0].op).toBe("enable");
            expect(fakeExperience.featuresManager.enableFeature).toHaveBeenCalledWith(
                WebXRFeatureName.TELEPORTATION,
                "stable",
                expect.objectContaining({ xrInput: fakeExperience.input })
            );
        });

        it("registers the walkable ground as a teleportation floor mesh — Req 5.2/5.4", async () => {
            const { vishva, fakeExperience, ground } = createFakeVishva({
                noFirstPerson: false,
            });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            const ops = teleportOps(fakeExperience.featureOps);
            expect(ops).toHaveLength(1);
            // The scene's walkable ground is passed as the teleport floor mesh.
            expect(ops[0].options.floorMeshes).toEqual([ground]);
        });

        it("does NOT activate the Teleport_Feature in third-person mode (noFirstPerson true) — Req 5.3, 5.5", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: true });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            // Default mode derives to third-person, so teleport is never enabled.
            const ops = teleportOps(fakeExperience.featureOps);
            expect(ops.some((o) => o.op === "enable")).toBe(false);
            expect(fakeExperience.featuresManager.enableFeature).not.toHaveBeenCalledWith(
                WebXRFeatureName.TELEPORTATION,
                expect.anything(),
                expect.anything()
            );
        });

        it("default locomotion mode derives from noFirstPerson: AR session, first-person permitted — Req 5.4", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            await manager.enterAR();

            const ops = teleportOps(fakeExperience.featureOps);
            expect(ops).toHaveLength(1);
            expect(ops[0].op).toBe("enable");
        });

        it("default locomotion mode derives from noFirstPerson: AR session, first-person not permitted — Req 5.5", async () => {
            const { vishva, fakeExperience } = createFakeVishva({ noFirstPerson: true });
            const manager = new XRManager(vishva);

            await manager.enterAR();

            const ops = teleportOps(fakeExperience.featureOps);
            expect(ops.some((o) => o.op === "enable")).toBe(false);
        });

        it("initializes teleport without a floor mesh when the scene has no ground — Req 5.2", async () => {
            const { vishva, fakeExperience } = createFakeVishva({
                noFirstPerson: false,
                ground: null,
            });
            const manager = new XRManager(vishva);

            await manager.enterVR();

            const ops = teleportOps(fakeExperience.featureOps);
            // Teleport still enables (rotation-only) with an empty floor list.
            expect(ops).toHaveLength(1);
            expect(ops[0].op).toBe("enable");
            expect(ops[0].options.floorMeshes).toEqual([]);
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
    // toggle changes the mode (not blocked), the active features are
    // reconfigured to match the resulting mode: the Teleport_Feature is enabled
    // for First_Person_Mode and disabled for Third_Person_Mode.
    //
    // The manager derives `canFirstPerson` internally from
    // `cc.getSettings().noFirstPerson`; there is no public getter for that
    // derived value, so the property is observed through its effects on the
    // pure XRLocomotion state machine (the resulting mode) and on the teleport
    // feature reconfiguration (`handleToggleRequest` → `applyLocomotionMode` →
    // enable/disable Teleport_Feature). `handleToggleRequest` is the internal
    // toggle router bound to a controller button (task 9.1); it is exercised
    // directly here, mirroring how Property 4 drives `handleSelect`.
    //
    // Session-start default mode derives from `noFirstPerson` (task 7.1):
    //   noFirstPerson=false → default firstPerson (teleport enabled at start)
    //   noFirstPerson=true  → default thirdPerson (teleport not enabled)
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
                    const { manager, locomotion, fakeExperience } =
                        await enteredManager(noFirstPerson);

                    // Startup default: firstPerson when permitted, else thirdPerson.
                    const startMode = locomotion.getMode();
                    expect(startMode).toBe(
                        noFirstPerson ? "thirdPerson" : "firstPerson"
                    );

                    // Feature ops accumulated during startup; only inspect
                    // what the toggle itself adds.
                    const opsBeforeToggle = teleportOps(
                        fakeExperience.featureOps
                    ).length;

                    // A toggle from thirdPerson targets firstPerson (the only
                    // case the guard can block). From firstPerson it targets
                    // thirdPerson (never blocked).
                    (manager as any).handleToggleRequest();

                    const modeAfter = locomotion.getMode();

                    if (startMode === "thirdPerson") {
                        // We only reach thirdPerson at startup when noFirstPerson
                        // is true. The toggle targets firstPerson, so
                        // canFirstPerson = !noFirstPerson = false → blocked:
                        // mode unchanged and no teleport reconfig.
                        expect(noFirstPerson).toBe(true);
                        expect(modeAfter).toBe("thirdPerson");
                        expect(teleportOps(fakeExperience.featureOps).length).toBe(
                            opsBeforeToggle
                        );
                    } else {
                        // startMode firstPerson ⇒ noFirstPerson false ⇒
                        // canFirstPerson = true throughout. Toggle targets
                        // thirdPerson (never blocked) and reconfigures teleport
                        // to disabled to match the resulting mode (Req 7.3).
                        expect(noFirstPerson).toBe(false);
                        expect(modeAfter).toBe("thirdPerson");
                        const ops = teleportOps(fakeExperience.featureOps);
                        expect(ops[ops.length - 1].op).toBe("disable");
                    }
                }),
                { numRuns: 50 }
            );
        });

        it("permitted toggle (noFirstPerson=false) flips firstPerson → thirdPerson and reconfigures features to match", async () => {
            const { manager, locomotion, fakeExperience } = await enteredManager(
                false
            );

            // Startup default is firstPerson (teleport enabled once).
            expect(locomotion.getMode()).toBe("firstPerson");
            let ops = teleportOps(fakeExperience.featureOps);
            expect(ops).toHaveLength(1);
            expect(ops[0].op).toBe("enable");

            // Toggle → thirdPerson (changed): teleport disabled to match.
            (manager as any).handleToggleRequest();
            expect(locomotion.getMode()).toBe("thirdPerson");
            ops = teleportOps(fakeExperience.featureOps);
            expect(ops[ops.length - 1].op).toBe("disable");

            // Toggle again → firstPerson (changed, still permitted): teleport
            // re-enabled to match. Confirms repeated activation (Req 7.5) and
            // that reconfig tracks the resulting mode (Req 7.3).
            (manager as any).handleToggleRequest();
            expect(locomotion.getMode()).toBe("firstPerson");
            ops = teleportOps(fakeExperience.featureOps);
            expect(ops[ops.length - 1].op).toBe("enable");
        });

        it("blocked toggle (noFirstPerson=true) stays thirdPerson and does not enable teleport", async () => {
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

        it("binds the A button (right controller) and toggles on press", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const aButton = createFakeComponent();
            const trigger = createFakeComponent();
            const mc = createFakeMotionController({
                "a-button": aButton,
                "xr-standard-trigger": trigger,
            });

            const toggleSpy = vi.spyOn(manager as any, "handleToggleRequest");
            (manager as any).bindMotionController(mc);

            aButton.press();

            expect(toggleSpy).toHaveBeenCalledTimes(1);
            // The requesting controller is remembered for haptic feedback.
            expect((manager as any).lastToggleController).toBe(mc);
        });

        it("binds the X button (left controller) and toggles on press", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const xButton = createFakeComponent();
            const mc = createFakeMotionController({
                "x-button": xButton,
                "xr-standard-trigger": createFakeComponent(),
            });

            const toggleSpy = vi.spyOn(manager as any, "handleToggleRequest");
            (manager as any).bindMotionController(mc);

            xButton.press();

            expect(toggleSpy).toHaveBeenCalledTimes(1);
        });

        it("does NOT bind the trigger: pressing the trigger never toggles", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const aButton = createFakeComponent();
            const trigger = createFakeComponent();
            const mc = createFakeMotionController({
                "a-button": aButton,
                "xr-standard-trigger": trigger,
            });

            const toggleSpy = vi.spyOn(manager as any, "handleToggleRequest");
            (manager as any).bindMotionController(mc);

            // Pressing the trigger must not request a toggle — it is reserved
            // for select (point-to-move / SNA click).
            trigger.press();
            expect(toggleSpy).not.toHaveBeenCalled();

            // The A button remains the sole toggle control.
            aButton.press();
            expect(toggleSpy).toHaveBeenCalledTimes(1);
        });

        it("binds no toggle when neither A nor X face button exists (no trigger fallback)", () => {
            const { vishva } = createFakeVishva({ noFirstPerson: false });
            const manager = new XRManager(vishva);

            const trigger = createFakeComponent();
            const mc = createFakeMotionController({
                "xr-standard-trigger": trigger,
                "xr-standard-squeeze": createFakeComponent(),
            });

            const toggleSpy = vi.spyOn(manager as any, "handleToggleRequest");
            (manager as any).bindMotionController(mc);

            // No face button present → nothing bound, so no observer is tracked.
            expect((manager as any).toggleButtonObservers).toHaveLength(0);

            // Pressing the trigger (or squeeze) must not fall back to a toggle.
            trigger.press();
            expect(toggleSpy).not.toHaveBeenCalled();
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
            const mc = createFakeMotionController("a-button");
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

            const toggleSpy = vi.spyOn(manager as any, "handleToggleRequest");

            // While in session, a press requests a toggle.
            mc.button.press();
            expect(toggleSpy).toHaveBeenCalledTimes(1);

            await manager.exitXR();

            // After exit the observer is detached, so a further press is inert —
            // no accumulated handler drives a stale toggle.
            mc.button.press();
            expect(toggleSpy).toHaveBeenCalledTimes(1);
        });
    });
});
