/**
 * XR Session Lifecycle Manager (BabylonJS-facing)
 *
 * `XRManager` owns the WebXR session lifecycle for Vishva. It lazily creates a
 * single BabylonJS default XR experience and reuses it across enter/exit
 * cycles, tracks the active session via `WebXRState`, and restores the desktop
 * editor (camera + render pipeline) when a session ends.
 *
 * This module is the skeleton (spec task 4.1): it establishes the session
 * lifecycle, capability guards, pipeline record/restore, and the hook/stub
 * points for locomotion, the in-session toggle, and select routing. The full
 * behaviour of `applyLocomotionMode` (task 7.1), `handleSelect` (task 8.2),
 * `handleToggleRequest` (task 9.1), and cleanup hardening (task 11.1) is
 * implemented by later tasks.
 *
 * Pure logic (capability mapping, locomotion state machine) lives in the
 * BabylonJS-free `XRSupport` and `XRLocomotion` modules and is composed here.
 */

import {
    AbstractMesh,
    ArcRotateCamera,
    Camera,
    Nullable,
    Observer,
    Scene,
    SSAO2RenderingPipeline,
    Vector3,
    WebXRAbstractMotionController,
    WebXRControllerComponent,
    WebXRDefaultExperience,
    WebXRFeatureName,
    WebXRFeaturesManager,
    WebXRInputSource,
    WebXRMotionControllerTeleportation,
    WebXRState,
} from "babylonjs";

import type { Vishva } from "../Vishva";
import { detectXRSupport, XRSupportState } from "./XRSupport";
import { LocomotionMode, XRLocomotion } from "./XRLocomotion";

/** VR or AR immersive session. */
export type XRSessionType = "vr" | "ar";

/**
 * Snapshot of desktop render-pipeline state captured on session start and
 * restored on session end. See Requirements 3.3, 9.1, 9.2.
 */
interface DesktopPipelineSnapshot {
    /** Whether the depth renderer was enabled before the session. */
    depthRendererEnabled: boolean;
    /** Whether the SSAO2 pipeline was attached to the editor camera. */
    ssaoAttached: boolean;
    /** prePass sample count prior to the session, if a prePass renderer exists. */
    prepassSamples?: number;
    /** Editor camera to restore as `scene.activeCamera`. */
    activeCamera: Nullable<Camera>;
}

/**
 * Snapshot of desktop CharacterController / camera-control state captured on
 * session start and restored on session end. See Requirements 9.1, 9.3.
 */
interface DesktopControllerSnapshot {
    /** Whether the active CharacterController was running before the session. */
    ccStarted: boolean;
    /** Whether the CharacterController had keyboard input enabled before. */
    ccKeyboardEnabled: boolean;
}

/** Name the SSAO2 pipeline is registered under in `Vishva.loadBabylonjsPart`. */
const SSAO_PIPELINE_NAME = "ssaopipeline";

/**
 * Component id of the A face button on the right WebXR motion controller. In
 * BabylonJS motion controllers, components are keyed by id in
 * `motionController.components` and fetched via `getComponent(id)`.
 */
const TOGGLE_BUTTON_A = "a-button";

/** Component id of the X face button on the left WebXR motion controller. */
const TOGGLE_BUTTON_X = "x-button";

export class XRManager {
    private vishva: Vishva;

    /** The single, lazily-created XR experience, reused across sessions. */
    private experience: Nullable<WebXRDefaultExperience> = null;

    /** Locomotion sub-mode state machine (pure). */
    private locomotion: XRLocomotion = new XRLocomotion();

    /** True only while an XR session is active. */
    private inXR: boolean = false;

    /** The session type of the active/most-recent session. */
    private sessionType: Nullable<XRSessionType> = null;

    /** Recorded desktop pipeline state, captured on session start. */
    private pipelineSnapshot: Nullable<DesktopPipelineSnapshot> = null;

    /**
     * Recorded desktop CharacterController state, captured on session start and
     * restored on session end so the avatar's keyboard-driven desktop control
     * resumes exactly as it was (Requirements 9.1, 9.3).
     */
    private controllerSnapshot: Nullable<DesktopControllerSnapshot> = null;

    /** Observer on the experience's XR state changes. Detached on cleanup. */
    private stateObserver: Nullable<Observer<WebXRState>> = null;

    /**
     * Observer on the XR input's controller-added stream, used to bind the
     * locomotion-toggle button on each controller as it initializes. Detached
     * on cleanup (hardened in task 11.1).
     */
    private controllerAddedObserver: Nullable<Observer<WebXRInputSource>> = null;

    /**
     * Per-source observers on the motion-controller-init stream, tracked so they
     * can be detached when the session ends. Without tracking, each enter/exit
     * cycle would leave these init handlers attached and a subsequent session
     * would add duplicates, accumulating handlers (Requirement 9.4).
     */
    private motionControllerInitObservers: Array<{
        source: WebXRInputSource;
        observer: Nullable<Observer<WebXRAbstractMotionController>>;
    }> = [];

    /**
     * Per-controller observers on the toggle button's state-change stream,
     * tracked so they can be detached when the session ends. One entry per
     * bound controller component.
     */
    private toggleButtonObservers: Array<{
        component: WebXRControllerComponent;
        observer: Nullable<Observer<WebXRControllerComponent>>;
    }> = [];

    /**
     * The motion controller whose button last requested a toggle, used to
     * deliver a haptic pulse as lightweight feedback on a blocked first-person
     * request (Requirement 7.4).
     */
    private lastToggleController: Nullable<WebXRAbstractMotionController> = null;

    /**
     * The teleportation feature while it is enabled (first-person mode), or
     * null when teleport is not active (third-person mode / before any session).
     */
    private teleportation: Nullable<WebXRMotionControllerTeleportation> = null;

    constructor(vishva: Vishva) {
        this.vishva = vishva;
    }

    /** Returns true only while an XR session is active (Requirement 3.4). */
    isInXR(): boolean {
        return this.inXR;
    }

    /** Enter an immersive VR session (Requirements 2.4, 3.1, 3.5). */
    async enterVR(): Promise<void> {
        return this.enter("vr");
    }

    /** Enter an immersive AR session (Requirements 2.5, 3.1, 3.5). */
    async enterAR(): Promise<void> {
        return this.enter("ar");
    }

    /**
     * Exit the active XR session. Idempotent: if no session is active this is a
     * no-op that leaves desktop state untouched (Requirement 3.7).
     */
    async exitXR(): Promise<void> {
        if (!this.inXR || this.experience === null) {
            // No active session — nothing to tear down, desktop untouched.
            return;
        }
        await this.experience.baseExperience.exitXRAsync();
        // Desktop restoration runs from the WebXRState change handler
        // (onSessionEnd), which also fires on unexpected session termination.
    }

    /**
     * Shared entry for VR/AR. Guards against unsupported modes via `XRSupport`;
     * an unsupported request is a no-op that leaves desktop state unchanged
     * (Requirements 3.5, 2.6). Otherwise creates/reuses the experience and
     * enters the immersive session for the requested mode.
     */
    private async enter(type: XRSessionType): Promise<void> {
        const support: XRSupportState = await detectXRSupport();
        const supported = type === "vr" ? support.vrSupported : support.arSupported;
        if (!supported) {
            // Decline to start a session; desktop is left exactly as-is.
            return;
        }

        const experience = await this.ensureExperience();

        const sessionMode: XRSessionMode =
            type === "vr" ? "immersive-vr" : "immersive-ar";
        const referenceSpaceType: XRReferenceSpaceType = "local-floor";

        this.sessionType = type;
        await experience.baseExperience.enterXRAsync(sessionMode, referenceSpaceType);
        // Session start side-effects run from the WebXRState change handler.
    }

    /**
     * Lazily create the single default XR experience and cache it for reuse
     * across sessions (Requirement 3.1). Teleportation is disabled at creation
     * because it is managed manually per locomotion mode; pointer selection is
     * left enabled so SNA click interaction works in XR.
     */
    private async ensureExperience(): Promise<WebXRDefaultExperience> {
        if (this.experience !== null) {
            return this.experience;
        }

        const scene: Scene = this.vishva.scene;
        const experience = await scene.createDefaultXRExperienceAsync({
            // Teleport is enabled/disabled per-mode by applyLocomotionMode.
            disableTeleportation: true,
            // Pointer selection stays enabled (default) for SNA interaction.
        });

        // Track session start/end from XR state transitions. This also catches
        // unexpected termination (e.g. headset removed), so desktop restore
        // always runs.
        this.stateObserver = experience.baseExperience.onStateChangedObservable.add(
            (state: WebXRState) => {
                if (state === WebXRState.IN_XR) {
                    this.onSessionStart(this.sessionType ?? "vr");
                } else if (state === WebXRState.NOT_IN_XR) {
                    this.onSessionEnd();
                }
            }
        );

        // Bind the in-session locomotion-toggle button on every controller as it
        // initializes (Requirement 7.1). Set up once on the reused experience so
        // the toggle works across repeated enter/exit cycles (Requirement 7.5).
        this.bindControllerToggle(experience);

        this.experience = experience;
        return experience;
    }

    /**
     * Runs when a session becomes active. Disables the desktop render pipeline
     * for XR stability, then sets and applies the default locomotion mode
     * (Requirements 3.2, 5.4, 5.5). Locomotion feature wiring is completed by
     * later tasks.
     */
    private onSessionStart(type: XRSessionType): void {
        this.inXR = true;
        this.sessionType = type;

        this.disableDesktopPipeline();
        this.disableDesktopController();

        // Default locomotion: first-person when permitted, third-person when the
        // active CharacterController has noFirstPerson set. Feature application
        // is a stub here and completed in later tasks.
        const canFirstPerson = this.canFirstPerson();
        const defaultMode: LocomotionMode = canFirstPerson
            ? "firstPerson"
            : "thirdPerson";
        this.locomotion.setMode(defaultMode, canFirstPerson);
        this.applyLocomotionMode(this.locomotion.getMode());
    }

    /**
     * Runs when a session ends (explicit exit or unexpected termination).
     * Restores the desktop editor state and tears down every observer/listener
     * the session added so repeated enter/exit cycles do not accumulate
     * handlers (Requirements 3.3, 3.6, 9.1, 9.2, 9.3, 9.4). Guarded on `inXR`
     * so a stray NOT_IN_XR transition (or a second exit) is a safe no-op.
     */
    private onSessionEnd(): void {
        if (!this.inXR) {
            return;
        }
        this.inXR = false;
        // The features manager tears down features when the session ends; drop
        // our reference so the next session re-applies locomotion cleanly.
        this.teleportation = null;
        // Detach the per-session controller observers so repeated enter/exit
        // cycles don't accumulate handlers (Requirement 9.4). The toggle-button
        // observers and the per-source motion-controller-init observers are both
        // added while a session runs (controllers are re-added and re-bound on
        // the next session via the persistent onControllerAddedObservable hook).
        this.detachToggleButtonObservers();
        this.detachMotionControllerInitObservers();
        this.lastToggleController = null;
        this.restoreDesktopPipeline();
        this.restoreDesktopController();
    }

    /**
     * Derive whether first-person locomotion is permitted from the active
     * CharacterController's `noFirstPerson` setting (Requirement 7.2). Defaults
     * to permitted when the setting cannot be read.
     */
    private canFirstPerson(): boolean {
        const cc = this.vishva.avManager?.cc;
        const noFirstPerson = cc?.getSettings?.()?.noFirstPerson;
        return !noFirstPerson;
    }

    /**
     * Apply the feature configuration for the given locomotion mode.
     *
     * - First-person (Requirements 5.1, 5.2): enable the Teleport_Feature with
     *   the walkable ground registered as a teleportation floor. The
     *   Pointer_Selection_Feature stays enabled (it is on by default at
     *   experience creation) so SNA click interaction and controller pointers
     *   keep working.
     * - Third-person (Requirement 5.3): the Teleport_Feature must NOT be active,
     *   so it is disabled. Pointer selection remains enabled for SNA
     *   interaction; the select-to-move path is armed by a later task.
     *
     * Pointer selection is never toggled here — it must be available in both
     * modes.
     */
    private applyLocomotionMode(mode: LocomotionMode): void {
        const featuresManager = this.getFeaturesManager();
        if (featuresManager === null) {
            // No experience yet (e.g. no active session) — nothing to configure.
            return;
        }

        if (mode === "firstPerson") {
            this.enableTeleportation(featuresManager);
        } else {
            this.disableTeleportation(featuresManager);
        }
    }

    /**
     * Enable the Teleport_Feature and register the walkable ground as a
     * teleportation floor (Requirements 5.1, 5.2). Idempotent: re-enabling
     * refreshes the registered floor meshes for the current scene.
     */
    private enableTeleportation(featuresManager: WebXRFeaturesManager): void {
        const experience = this.experience;
        if (experience === null) {
            return;
        }

        const floorMeshes = this.getWalkableGroundMeshes();

        // enableFeature is safe to call repeatedly; the manager disposes any
        // prior instance and constructs a fresh one with these options. This
        // also refreshes the floor meshes if the scene's ground changed.
        this.teleportation = featuresManager.enableFeature(
            WebXRFeatureName.TELEPORTATION,
            "stable",
            {
                xrInput: experience.input,
                floorMeshes,
            }
        ) as WebXRMotionControllerTeleportation;
    }

    /**
     * Disable the Teleport_Feature so teleportation is not active in
     * third-person mode (Requirement 5.3). Idempotent — a no-op when teleport
     * was never enabled.
     */
    private disableTeleportation(featuresManager: WebXRFeaturesManager): void {
        if (this.teleportation === null) {
            return;
        }
        featuresManager.disableFeature(WebXRFeatureName.TELEPORTATION);
        this.teleportation = null;
    }

    /**
     * The BabylonJS WebXR features manager for the active experience, or null
     * when no experience exists yet.
     */
    private getFeaturesManager(): Nullable<WebXRFeaturesManager> {
        return this.experience?.baseExperience?.featuresManager ?? null;
    }

    /**
     * Collect the walkable ground meshes to register as teleportation floors
     * (Requirement 5.2). Vishva tracks a single ground mesh via `Vishva.ground`;
     * when absent (e.g. an empty world with no ground), no floor is registered
     * and teleportation still initializes without crashing (rotation-only).
     */
    private getWalkableGroundMeshes(): AbstractMesh[] {
        const ground = this.vishva.ground as Nullable<AbstractMesh>;
        return ground ? [ground] : [];
    }

    /**
     * Bind the locomotion-toggle button on each controller (Requirements 7.1,
     * 7.5). When a controller is added and its motion controller initializes,
     * we hook the A/X face button and route a fresh press to
     * `handleToggleRequest`. Binding lives on the reused experience so the
     * toggle keeps working across enter/exit cycles.
     */
    private bindControllerToggle(experience: WebXRDefaultExperience): void {
        const input = experience.input;
        if (!input || !input.onControllerAddedObservable) {
            return;
        }

        this.controllerAddedObserver = input.onControllerAddedObservable.add(
            (source: WebXRInputSource) => {
                // The motion controller may already be initialized or arrive
                // later; handle both by binding on init.
                if (source.motionController) {
                    this.bindMotionController(source.motionController);
                }
                // Track the init observer per source so it can be detached on
                // session end — otherwise each enter/exit cycle would leave the
                // handler attached and accumulate duplicates (Requirement 9.4).
                const observer = source.onMotionControllerInitObservable.add(
                    (motionController: WebXRAbstractMotionController) => {
                        this.bindMotionController(motionController);
                    }
                );
                this.motionControllerInitObservers.push({ source, observer });
            }
        );
    }

    /**
     * Bind the toggle handler to a single motion controller's A/X face button.
     * Fires `handleToggleRequest` on the rising edge of a press (Requirement
     * 7.1) and remembers the controller so blocked toggles can pulse it for
     * haptic feedback (Requirement 7.4).
     *
     * The A/X face button is looked up by component id: `a-button` on the right
     * controller, `x-button` on the left. The trigger is deliberately NOT bound
     * — it is reserved for select (point-to-move and SNA click), so a
     * trigger-driven select is never conflated with a locomotion toggle
     * (Requirement 7.1). If the connected controller profile exposes neither an
     * `a-button` nor an `x-button` component, no toggle button is bound for that
     * controller (no fallback to the trigger or any other button).
     */
    private bindMotionController(
        motionController: WebXRAbstractMotionController
    ): void {
        // Look up the A/X face button by id. The right controller exposes
        // `a-button`, the left exposes `x-button`; a given controller has at
        // most one of them.
        const component =
            motionController.getComponent?.(TOGGLE_BUTTON_A) ??
            motionController.getComponent?.(TOGGLE_BUTTON_X);

        if (!component) {
            // Neither face button present on this controller — do not bind a
            // toggle (never fall back to the trigger or any other button).
            return;
        }

        const observer = component.onButtonStateChangedObservable.add(
            (comp: WebXRControllerComponent) => {
                // Only react to the rising edge of a press (pressed changed from
                // false → true), so a single button press requests one toggle.
                if (comp.changes?.pressed && comp.changes.pressed.current === true) {
                    this.lastToggleController = motionController;
                    this.handleToggleRequest();
                }
            }
        );

        this.toggleButtonObservers.push({ component, observer });
    }

    /**
     * Detach all per-controller toggle-button observers registered during the
     * session and clear the tracking list. Safe to call when none are present.
     */
    private detachToggleButtonObservers(): void {
        for (const entry of this.toggleButtonObservers) {
            if (entry.observer) {
                entry.component.onButtonStateChangedObservable.remove(entry.observer);
            }
        }
        this.toggleButtonObservers = [];
    }

    /**
     * Detach all per-source motion-controller-init observers registered during
     * the session and clear the tracking list. Safe to call when none are
     * present. Keeps the persistent `onControllerAddedObservable` hook in place
     * so the next session re-binds controllers cleanly (Requirement 9.4).
     */
    private detachMotionControllerInitObservers(): void {
        for (const entry of this.motionControllerInitObservers) {
            if (entry.observer) {
                entry.source.onMotionControllerInitObservable.remove(entry.observer);
            }
        }
        this.motionControllerInitObservers = [];
    }

    /**
     * Request an in-session locomotion toggle from a controller button.
     *
     * Derives `canFirstPerson` as the negation of the active
     * CharacterController's `noFirstPerson` (Requirement 7.2) and drives the
     * pure `XRLocomotion` state machine. When the toggle changes the mode, the
     * active features are reconfigured to match (Requirement 7.3). When a
     * first-person request is blocked (`noFirstPerson` true), the mode stays
     * third-person and lightweight feedback is emitted — a log plus a haptic
     * pulse on the requesting controller (Requirement 7.4). The toggle may be
     * activated repeatedly within a session (Requirement 7.5).
     */
    private handleToggleRequest(): void {
        const canFirstPerson = this.canFirstPerson();
        const result = this.locomotion.toggle(canFirstPerson);

        if (result.changed) {
            // Reconfigure teleport / point-to-move to match the new sub-mode.
            this.applyLocomotionMode(result.mode);
            return;
        }

        if (result.blocked) {
            // First-person denied by the noFirstPerson guard — stay third-person
            // and give the user a lightweight cue.
            this.emitToggleBlockedFeedback();
        }
    }

    /**
     * Lightweight feedback for a blocked first-person toggle (Requirement 7.4):
     * a console log plus, when available, a short haptic pulse on the controller
     * that requested the toggle. Never throws if haptics are unavailable.
     */
    private emitToggleBlockedFeedback(): void {
        console.log(
            "[XR] First-person locomotion is disabled for this avatar " +
                "(noFirstPerson); staying in third-person."
        );

        const controller = this.lastToggleController;
        // `pulse` returns a promise; ignore rejections (no haptic actuator).
        controller?.pulse?.(0.5, 100)?.catch?.(() => {
            /* haptics unavailable — feedback is best-effort */
        });
    }

    /**
     * Route a controller select. In Third_Person_Mode a select that ray-picks a
     * valid scene point drives the avatar there via Vishva's shared
     * click-to-move (`moveAvatarTo`), which places the marker and calls
     * `CharacterController.moveTo` (Requirements 6.1, 6.4). Before moving, the
     * active CharacterController is started so the avatar animates and moves
     * (Requirement 6.2). No keyboard input is involved (Requirement 6.5).
     *
     * When the select produces no valid pick point (`pickedPoint` is null), no
     * move is issued (Requirement 6.3). Selects in First_Person_Mode are not a
     * locomotion action here — teleport handles movement — so they are ignored
     * by this path. SNA click behaviour is unaffected: it fires through scene
     * picking regardless of locomotion mode.
     */
    private handleSelect(pickedPoint: Nullable<Vector3>): void {
        // Locomotion-by-select only applies in third-person; first-person moves
        // via the Teleport_Feature.
        if (this.locomotion.getMode() !== "thirdPerson") {
            return;
        }

        // No valid pick → nothing to move toward (Requirement 6.3).
        if (pickedPoint === null || pickedPoint === undefined) {
            return;
        }

        // Ensure the CharacterController is started so the avatar animates and
        // moves toward the target (Requirement 6.2). `start()` is safe to call
        // when already running.
        const cc = this.vishva.avManager?.cc;
        cc?.start?.();

        // Reuse the shared click-to-move (marker + cc.moveTo) so desktop and XR
        // third-person locomotion stay in sync (Requirements 6.1, 6.4).
        this.vishva.moveAvatarTo(pickedPoint);
    }

    /**
     * Record and disable the desktop render-pipeline additions (SSAO2, prepass,
     * depth renderer) that can destabilise an XR session (Requirement 3.2).
     */
    private disableDesktopPipeline(): void {
        const scene: Scene = this.vishva.scene;
        const arcCamera: Nullable<ArcRotateCamera> = this.vishva.arcCamera;

        const dr = this.vishva.dr;
        const depthRendererEnabled = dr ? dr.enabled : false;

        const ssao = this.getSSAOPipeline();
        const ssaoAttached = ssao !== null && arcCamera !== null;

        const prepass = scene.prePassRenderer;
        const prepassSamples = prepass ? prepass.samples : undefined;

        this.pipelineSnapshot = {
            depthRendererEnabled,
            ssaoAttached,
            prepassSamples,
            activeCamera: scene.activeCamera,
        };

        // Disable depth renderer so it does not run against the XR camera.
        if (dr) {
            dr.enabled = false;
        }

        // Detach SSAO2 from the editor camera for the duration of the session.
        if (ssaoAttached && arcCamera) {
            scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
                SSAO_PIPELINE_NAME,
                arcCamera
            );
        }
    }

    /**
     * Restore the desktop render pipeline recorded in `disableDesktopPipeline`
     * and re-activate the editor camera (Requirements 3.3, 9.1, 9.2).
     */
    private restoreDesktopPipeline(): void {
        const scene: Scene = this.vishva.scene;
        const arcCamera: Nullable<ArcRotateCamera> = this.vishva.arcCamera;
        const snapshot = this.pipelineSnapshot;

        // Re-activate the editor camera and re-attach desktop camera control.
        // BabylonJS detaches the desktop camera's input when the WebXR camera
        // becomes active on session enter; re-attaching here restores mouse /
        // pointer control of the ArcRotateCamera on the canvas (Requirement
        // 9.1). `attachControl(true, false, 2)` mirrors how Vishva attaches the
        // editor camera at scene setup (noPreventDefault=true, right-mouse pan).
        if (arcCamera) {
            scene.activeCamera = arcCamera;
            arcCamera.attachControl?.(true, false, 2);
        }

        if (snapshot) {
            // Restore depth renderer enabled state.
            if (this.vishva.dr) {
                this.vishva.dr.enabled = snapshot.depthRendererEnabled;
            }

            // Re-attach SSAO2 to the editor camera if it was attached before.
            if (snapshot.ssaoAttached && arcCamera) {
                scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
                    SSAO_PIPELINE_NAME,
                    arcCamera
                );
            }

            // Restore prePass sample count.
            if (snapshot.prepassSamples !== undefined && scene.prePassRenderer) {
                scene.prePassRenderer.samples = snapshot.prepassSamples;
            }
        }

        this.pipelineSnapshot = null;
    }

    /**
     * Record and quiesce the desktop CharacterController for the duration of the
     * session (Requirement 9.3). The CC's keyboard listeners are window-level
     * and would otherwise keep driving the avatar from key presses while the
     * user is in XR, so keyboard input is disabled and the controller is stopped
     * on session start. The prior started / keyboard-enabled state is recorded so
     * `restoreDesktopController` can put it back exactly as it was.
     */
    private disableDesktopController(): void {
        const cc = this.vishva.avManager?.cc;
        if (!cc) {
            // No active CharacterController (e.g. an avatar-less world) — nothing
            // to quiesce or restore.
            this.controllerSnapshot = null;
            return;
        }

        const ccKeyboardEnabled = cc.isKeyBoardEnabled?.() ?? false;
        // There is no public getter for the CC's running state; infer it from
        // whether keyboard input was enabled (desktop avatar control implies a
        // started, keyboard-driven CC). Restoration re-runs start()/enableKeyBoard
        // with this recorded value, which is idempotent when already applied.
        this.controllerSnapshot = {
            ccStarted: ccKeyboardEnabled,
            ccKeyboardEnabled,
        };

        // Stop keyboard-driven desktop locomotion while the XR session owns
        // movement (teleport / point-to-move). stop() is safe to call when not
        // running; enableKeyBoard(false) removes the window key listeners.
        cc.enableKeyBoard?.(false);
        cc.stop?.();
    }

    /**
     * Restore the desktop CharacterController recorded in
     * `disableDesktopController` so keyboard-driven desktop control resumes in
     * the same state it had before the session (Requirements 9.1, 9.3). A no-op
     * when no controller state was recorded.
     */
    private restoreDesktopController(): void {
        const snapshot = this.controllerSnapshot;
        this.controllerSnapshot = null;
        if (!snapshot) {
            return;
        }

        const cc = this.vishva.avManager?.cc;
        if (!cc) {
            return;
        }

        // Re-enable keyboard input if it was on, then restart the controller if
        // it was running before the session. Both calls are idempotent.
        cc.enableKeyBoard?.(snapshot.ccKeyboardEnabled);
        if (snapshot.ccStarted) {
            cc.start?.();
        }
    }

    /** Look up the SSAO2 pipeline by its registered name, or null if absent. */
    private getSSAOPipeline(): Nullable<SSAO2RenderingPipeline> {
        const manager = this.vishva.scene.postProcessRenderPipelineManager;
        const pipeline = manager.supportedPipelines.find(
            (p) => p.name === SSAO_PIPELINE_NAME
        );
        return (pipeline as SSAO2RenderingPipeline) ?? null;
    }
}
