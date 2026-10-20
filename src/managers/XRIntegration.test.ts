/**
 * Unit tests for XRIntegration (Vishva-side glue over the CharacterController's
 * WebXR API).
 *
 * Runs in Vitest's node environment with a fully mocked `babylonjs` (only the
 * `WebXRState` enum value is needed at runtime; everything else is a type-only
 * stub). A hand-rolled fake scene exposes `createDefaultXRExperienceAsync`, the
 * post-process pipeline manager, a prePass renderer, and a fake experience whose
 * `onStateChangedObservable` the integration subscribes to. A fake Vishva
 * carries `avManager.cc` (the CharacterController), `arcCamera`, `dr`, and
 * `scene`.
 *
 * Covers plan Tasks 6 (session delegation) and 7 (render-pipeline toggling).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("babylonjs", () => {
    class Noop {}
    return {
        WebXRState: {
            ENTERING_XR: 0,
            IN_XR: 1,
            EXITING_XR: 2,
            NOT_IN_XR: 3,
        },
        // Used by XROptionsHud (pulled in transitively).
        Mesh: { DOUBLESIDE: 2 },
        MeshBuilder: { CreatePlane: () => ({ setEnabled() {}, position: { copyFrom() {} }, dispose() {} }) },
        Vector3: class {
            constructor(public x = 0, public y = 0, public z = 0) {}
            add() { return this; }
            scale() { return this; }
            copyFrom() { return this; }
            static Up() { return new (this as any)(0, 1, 0); }
            static Right() { return new (this as any)(1, 0, 0); }
            static Forward() { return new (this as any)(0, 0, 1); }
            static Zero() { return new (this as any)(0, 0, 0); }
        },
        // Type-only imports — stub classes are sufficient.
        ArcRotateCamera: Noop,
        Camera: Noop,
        Observer: Noop,
        Scene: Noop,
        SSAO2RenderingPipeline: Noop,
        WebXRDefaultExperience: Noop,
        Nullable: undefined,
    };
});

// Mock babylonjs-gui too (pulled in transitively via XROptionsHud). A minimal
// surface is enough; the HUD's GUI construction is defensively guarded anyway.
vi.mock("babylonjs-gui", () => {
    function obs() {
        return { add: (_cb: any) => _cb };
    }
    class Ctl {
        onPointerDownObservable = obs();
        onPointerUpObservable = obs();
        onValueChangedObservable = obs();
    }
    return {
        AdvancedDynamicTexture: { CreateForMesh: () => ({ addControl() {}, dispose() {} }) },
        Button: { CreateSimpleButton: () => new Ctl() },
        Control: {
            HORIZONTAL_ALIGNMENT_LEFT: 0,
            HORIZONTAL_ALIGNMENT_CENTER: 1,
            HORIZONTAL_ALIGNMENT_RIGHT: 2,
            VERTICAL_ALIGNMENT_TOP: 0,
            VERTICAL_ALIGNMENT_BOTTOM: 2,
        },
        Rectangle: class {
            addControl() {}
        },
        Slider: class extends Ctl {},
        StackPanel: class {
            addControl() {}
        },
        TextBlock: class {
            static HORIZONTAL_ALIGNMENT_LEFT = 0;
            static VERTICAL_ALIGNMENT_TOP = 0;
            constructor(public name?: string, public text?: string) {}
        },
    };
});

import { WebXRState } from "babylonjs";
import { XRIntegration } from "./XRIntegration.js";

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

/** A minimal fake BabylonJS Observable tracking add/remove and notifying. */
function createFakeObservable<T>() {
    const handlers: Array<(v: T) => void> = [];
    return {
        liveCount: () => handlers.length,
        add(h: (v: T) => void) {
            handlers.push(h);
            return { _handler: h };
        },
        remove(obs: any) {
            const i = handlers.indexOf(obs?._handler);
            if (i >= 0) {
                handlers.splice(i, 1);
                return true;
            }
            return false;
        },
        notify(v: T) {
            for (const h of [...handlers]) h(v);
        },
    };
}

/** A fake WebXRDefaultExperience whose state observable the SUT subscribes to. */
function createFakeExperience() {
    const stateObs = createFakeObservable<number>();
    return {
        experience: {
            baseExperience: {
                onStateChangedObservable: stateObs,
            },
        },
        stateObs,
    };
}

/** A fake CharacterController recording the XR calls the integration makes. */
function createFakeCC() {
    let inXR = false;
    let hudToggleCb: (() => void) | null = null;
    return {
        inXR: () => inXR,
        enableXR: vi.fn(async (_exp: unknown) => true),
        enterXR: vi.fn(async (_type: string) => {
            inXR = true;
        }),
        exitXR: vi.fn(async () => {
            inXR = false;
        }),
        isInXR: vi.fn(() => inXR),
        // HUD-toggle registration + a test seam to fire the registered callback.
        onXRHudToggle: vi.fn((cb: () => void) => {
            hudToggleCb = cb;
        }),
        fireHudToggle: () => hudToggleCb?.(),
        // Camera elasticity getter/setter used by the HUD-visibility coupling.
        getSettings: vi.fn(() => ({ cameraElastic: true })),
        setCameraElasticity: vi.fn(),
        // XR camera + sensitivity setters the HUD needs (placement + push).
        getXRCamera: vi.fn(() => ({ rigCameras: [] })),
        setXROrbitAlphaRate: vi.fn(),
        setXROrbitBetaRate: vi.fn(),
        setXRDollyRate: vi.fn(),
    };
}

/** A fake SSAO2 pipeline registered under the editor name. */
function createSSAOPipeline() {
    return { name: "ssaopipeline" };
}

/**
 * A fake scene. `withSSAO` controls whether the SSAO pipeline is present in the
 * pipeline manager (so we can exercise both the attached and absent paths).
 */
function createFakeScene(opts: { withSSAO?: boolean; createExperience?: boolean } = {}) {
    const { withSSAO = true, createExperience = true } = opts;
    const fakeExp = createFakeExperience();

    const detach = vi.fn();
    const attach = vi.fn();
    const supportedPipelines = withSSAO ? [createSSAOPipeline()] : [];

    const scene: any = {
        activeCamera: { __kind: "someOtherCamera" },
        prePassRenderer: { samples: 16 },
        postProcessRenderPipelineManager: {
            supportedPipelines,
            detachCamerasFromRenderPipeline: detach,
            attachCamerasToRenderPipeline: attach,
        },
        createDefaultXRExperienceAsync: vi.fn(async (_opts: unknown) => {
            if (!createExperience) {
                throw new Error("XR unsupported");
            }
            return fakeExp.experience;
        }),
    };
    return { scene, fakeExp, detach, attach };
}

/** A fake Vishva carrying the handles XRIntegration reads. */
function createFakeVishva(opts: { withCC?: boolean; withSSAO?: boolean; createExperience?: boolean } = {}) {
    const { withCC = true } = opts;
    const { scene, fakeExp, detach, attach } = createFakeScene(opts);
    const cc = withCC ? createFakeCC() : null;
    const arcCamera = { attachControl: vi.fn(), __kind: "ArcRotateCamera" };
    const dr = { enabled: true };

    const vishva: any = {
        scene,
        arcCamera,
        dr,
        avManager: { cc },
    };
    return { vishva, cc, scene, fakeExp, detach, attach, arcCamera, dr };
}

// ---------------------------------------------------------------------------
// Task 6 — session delegation
// ---------------------------------------------------------------------------

describe("XRIntegration — session delegation (Task 6)", () => {
    it("enter() with no CharacterController is a safe no-op", async () => {
        const { vishva, scene } = createFakeVishva({ withCC: false });
        const xi = new XRIntegration(vishva);

        await expect(xi.enter("vr")).resolves.toBeUndefined();
        // No experience created when there is no CC to drive it.
        expect(scene.createDefaultXRExperienceAsync).not.toHaveBeenCalled();
        expect(xi.getExperience()).toBeNull();
    });

    it("enter() creates the experience once, enables XR, then enters the session", async () => {
        const { vishva, cc, scene, fakeExp } = createFakeVishva();
        const xi = new XRIntegration(vishva);

        await xi.enter("vr");

        expect(scene.createDefaultXRExperienceAsync).toHaveBeenCalledTimes(1);
        expect(cc!.enableXR).toHaveBeenCalledTimes(1);
        expect(cc!.enableXR).toHaveBeenCalledWith(fakeExp.experience);
        expect(cc!.enterXR).toHaveBeenCalledWith("vr");

        // A second enter reuses the same experience (no re-creation).
        await xi.enter("ar");
        expect(scene.createDefaultXRExperienceAsync).toHaveBeenCalledTimes(1);
        expect(cc!.enterXR).toHaveBeenLastCalledWith("ar");
    });

    it("creates the experience with teleportation disabled", async () => {
        const { vishva, scene } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");
        expect(scene.createDefaultXRExperienceAsync).toHaveBeenCalledWith(
            expect.objectContaining({ disableTeleportation: true })
        );
    });

    it("exit() delegates to cc.exitXR()", async () => {
        const { vishva, cc } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");
        await xi.exit();
        expect(cc!.exitXR).toHaveBeenCalledTimes(1);
    });

    it("exit() with no CharacterController is a safe no-op", async () => {
        const { vishva } = createFakeVishva({ withCC: false });
        const xi = new XRIntegration(vishva);
        await expect(xi.exit()).resolves.toBeUndefined();
    });

    it("isInXR() reflects the CharacterController's session state", async () => {
        const { vishva, cc } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        expect(xi.isInXR()).toBe(false);
        await xi.enter("vr");
        expect(xi.isInXR()).toBe(true);
        await xi.exit();
        expect(xi.isInXR()).toBe(false);
        expect(cc!.isInXR).toHaveBeenCalled();
    });

    it("isInXR() is false in an avatar-less world (no CC)", () => {
        const { vishva } = createFakeVishva({ withCC: false });
        const xi = new XRIntegration(vishva);
        expect(xi.isInXR()).toBe(false);
    });

    it("enter() is a no-op when experience creation fails (unsupported env)", async () => {
        const { vishva, cc } = createFakeVishva({ createExperience: false });
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");
        // enableXR/enterXR never called because no experience was created.
        expect(cc!.enableXR).not.toHaveBeenCalled();
        expect(cc!.enterXR).not.toHaveBeenCalled();
        expect(xi.getExperience()).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Task 7 — render-pipeline toggling driven by the experience state observable
// ---------------------------------------------------------------------------

describe("XRIntegration — render-pipeline toggling (Task 7)", () => {
    it("IN_XR disables the depth renderer, detaches SSAO, and records prePass + active camera", async () => {
        const { vishva, scene, fakeExp, detach, dr, arcCamera } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        expect(dr.enabled).toBe(true); // still on before the state fires
        fakeExp.stateObs.notify(WebXRState.IN_XR);

        expect(dr.enabled).toBe(false);
        expect(detach).toHaveBeenCalledWith("ssaopipeline", arcCamera);
        // prePass samples preserved for restore.
        expect(scene.prePassRenderer.samples).toBe(16);
    });

    it("NOT_IN_XR restores depth renderer, re-attaches SSAO, restores prePass, re-activates editor camera", async () => {
        const { vishva, scene, fakeExp, attach, dr, arcCamera } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        fakeExp.stateObs.notify(WebXRState.IN_XR);
        // Simulate the engine changing samples / active camera during the session.
        scene.prePassRenderer.samples = 1;
        scene.activeCamera = { __kind: "xrCamera" };

        fakeExp.stateObs.notify(WebXRState.NOT_IN_XR);

        expect(dr.enabled).toBe(true);
        expect(attach).toHaveBeenCalledWith("ssaopipeline", arcCamera);
        expect(scene.prePassRenderer.samples).toBe(16); // restored from snapshot
        expect(scene.activeCamera).toBe(arcCamera); // editor camera re-activated
        expect(arcCamera.attachControl).toHaveBeenCalledWith(true, false, 2);
    });

    it("toggling is symmetric across IN_XR -> NOT_IN_XR with SSAO absent", async () => {
        const { vishva, fakeExp, detach, attach, dr } = createFakeVishva({ withSSAO: false });
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        fakeExp.stateObs.notify(WebXRState.IN_XR);
        // No SSAO pipeline present -> no detach call, but depth still disabled.
        expect(detach).not.toHaveBeenCalled();
        expect(dr.enabled).toBe(false);

        fakeExp.stateObs.notify(WebXRState.NOT_IN_XR);
        expect(attach).not.toHaveBeenCalled();
        expect(dr.enabled).toBe(true);
    });

    it("dispose() removes the state observer so later transitions do nothing", async () => {
        const { vishva, fakeExp, dr } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        expect(fakeExp.stateObs.liveCount()).toBe(1);
        xi.dispose();
        expect(fakeExp.stateObs.liveCount()).toBe(0);

        // A post-dispose transition must not touch the pipeline.
        dr.enabled = true;
        fakeExp.stateObs.notify(WebXRState.IN_XR);
        expect(dr.enabled).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Task 9 — HUD + left-Y toggle wiring
// ---------------------------------------------------------------------------

describe("XRIntegration — HUD + left-Y toggle (Task 9)", () => {
    it("registers the CC HUD-toggle callback once after enableXR", async () => {
        const { vishva, cc } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");
        expect(cc!.onXRHudToggle).toHaveBeenCalledTimes(1);
        // A second enter must NOT re-register (callback persists across sessions).
        await xi.exit();
        await xi.enter("ar");
        expect(cc!.onXRHudToggle).toHaveBeenCalledTimes(1);
    });

    it("the registered toggle callback flips HUD visibility", async () => {
        const { vishva, cc } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        const hud = (xi as any)._hud as { isVisible(): boolean };
        expect(hud.isVisible()).toBe(false);
        cc!.fireHudToggle(); // LEFT-Y press -> show
        expect(hud.isVisible()).toBe(true);
        cc!.fireHudToggle(); // LEFT-Y press -> hide
        expect(hud.isVisible()).toBe(false);
    });

    it("suppresses CC camera elasticity while the HUD is shown and restores on hide", async () => {
        const { vishva, cc } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        cc!.fireHudToggle(); // show
        expect(cc!.setCameraElasticity).toHaveBeenCalledWith(false);

        cc!.setCameraElasticity.mockClear();
        cc!.fireHudToggle(); // hide -> restore the captured value (true)
        expect(cc!.setCameraElasticity).toHaveBeenCalledWith(true);
    });

    it("hides the HUD on IN_XR (each session starts hidden)", async () => {
        const { vishva, cc, fakeExp } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        const hud = (xi as any)._hud as { isVisible(): boolean };
        cc!.fireHudToggle(); // show it
        expect(hud.isVisible()).toBe(true);

        fakeExp.stateObs.notify(WebXRState.IN_XR); // a (re)entered session
        expect(hud.isVisible()).toBe(false);
    });

    it("hides the HUD and restores elasticity on NOT_IN_XR", async () => {
        const { vishva, cc, fakeExp } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        cc!.fireHudToggle(); // show -> elasticity suppressed
        cc!.setCameraElasticity.mockClear();

        fakeExp.stateObs.notify(WebXRState.NOT_IN_XR);
        const hud = (xi as any)._hud as { isVisible(): boolean };
        expect(hud.isVisible()).toBe(false);
        expect(cc!.setCameraElasticity).toHaveBeenCalledWith(true);
    });

    it("the HUD exit button triggers exit()", async () => {
        const { vishva, cc } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");

        const hud = (xi as any)._hud as { onExit: (() => void) | null };
        expect(typeof hud.onExit).toBe("function");
        hud.onExit!();
        // exit() delegates to cc.exitXR (allow the async microtask to settle).
        await Promise.resolve();
        expect(cc!.exitXR).toHaveBeenCalled();
    });

    it("dispose() tears down the HUD and clears the toggle registration", async () => {
        const { vishva } = createFakeVishva();
        const xi = new XRIntegration(vishva);
        await xi.enter("vr");
        expect((xi as any)._hud).not.toBeNull();
        xi.dispose();
        expect((xi as any)._hud).toBeNull();
        expect((xi as any)._hudToggleRegistered).toBe(false);
    });
});
