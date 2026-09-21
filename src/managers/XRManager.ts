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
    Mesh,
    MeshBuilder,
    Nullable,
    Observer,
    Scene,
    SSAO2RenderingPipeline,
    Vector3,
    WebXRAbstractMotionController,
    WebXRCamera,
    WebXRControllerComponent,
    WebXRDefaultExperience,
    WebXRFeatureName,
    WebXRFeaturesManager,
    WebXRInputSource,
    WebXRMotionControllerTeleportation,
    WebXRState,
} from "babylonjs";

// TEMPORARY DEBUG DIAGNOSTICS — babylonjs-gui is imported ONLY for the on-screen
// HUD added to diagnose the intermittent left-stick strafe bug. Remove this
// import together with the HUD methods once the axis bug is resolved.
import { AdvancedDynamicTexture, Button, Control, Rectangle, Slider, StackPanel, TextBlock } from "babylonjs-gui";

import type { Vishva } from "../Vishva";
import { detectXRSupport, XRSupportState } from "./XRSupport";
import {
    DEFAULT_STICK_DEADZONE,
    LocomotionMode,
    MoveIntent,
    mapSticksToIntent,
    neutralMoveIntent,
    XRLocomotion,
} from "./XRLocomotion";

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
    /** Whether the CC had turning OFF before the session (restored on exit). */
    ccTurningOff: boolean;
}

/** Name the SSAO2 pipeline is registered under in `Vishva.loadBabylonjsPart`. */
const SSAO_PIPELINE_NAME = "ssaopipeline";

/**
 * Component id of the A face button on the right WebXR motion controller. In
 * BabylonJS motion controllers, components are keyed by id in
 * `motionController.components` and fetched via `getComponent(id)`.
 */
const TOGGLE_BUTTON_A = "a-button";

/**
 * Component id of the B face button on the right WebXR motion controller. On
 * the RIGHT controller, holding B CONTINUOUSLY DECREASES the follow
 * ArcRotateCamera's `radius` (dollies the camera TOWARD the avatar) each frame
 * while held. B sits in front of A, so "push toward avatar" reads intuitively;
 * the A button (see {@link TOGGLE_BUTTON_A}) INCREASES radius (camera away).
 */
const HEIGHT_BUTTON_UP = "b-button";

/** Component id of the X face button on the left WebXR motion controller. */
const TOGGLE_BUTTON_X = "x-button";

/**
 * Default ALPHA orbit rate (radians per frame at full stick deflection),
 * applied to the follow ArcRotateCamera's `alpha` (azimuth) by
 * {@link XRManager.applyCameraOrbit} from the RIGHT stick's X axis. Used as the
 * initial value of {@link XRManager.alphaRate}, the localStorage-load fallback,
 * and the default value of the in-headset alpha sensitivity slider.
 */
const DEFAULT_ALPHA_RATE = 0.0075;

/**
 * Default BETA orbit rate (radians per frame at full stick deflection), applied
 * to the follow ArcRotateCamera's `beta` (polar angle) by
 * {@link XRManager.applyCameraOrbit} from the RIGHT stick's Y axis. Used as the
 * initial value of {@link XRManager.betaRate}, the localStorage-load fallback,
 * and the default value of the in-headset beta sensitivity slider.
 */
const DEFAULT_BETA_RATE = 0.003;

/**
 * Default RADIUS dolly rate: ArcRotateCamera `radius` units (≈ metres) the
 * follow camera dollies per FRAME while a RIGHT B/A button is HELD. B decreases
 * radius (toward the avatar), A increases it (away). Sampled every frame like
 * the thumbstick (see {@link XRManager.applyButtonDolly}). Used as the initial
 * value of {@link XRManager.radiusRate}, the localStorage-load fallback, and the
 * default value of the in-headset radius sensitivity slider.
 */
const DEFAULT_RADIUS_RATE = 0.05;

/**
 * Upper bound of the in-headset alpha/beta sensitivity sliders (and the
 * localStorage-load range clamp). The minimum is 0 for all three rates.
 */
const MAX_ORBIT_RATE = 0.02;

/**
 * Upper bound of the in-headset radius sensitivity slider (and the
 * localStorage-load range clamp). The minimum is 0.
 */
const MAX_RADIUS_RATE = 0.2;

/** localStorage key persisting the alpha orbit sensitivity rate across sessions. */
const LS_ALPHA_RATE = "vishva.xr.alphaRate";

/** localStorage key persisting the beta orbit sensitivity rate across sessions. */
const LS_BETA_RATE = "vishva.xr.betaRate";

/** localStorage key persisting the radius dolly sensitivity rate across sessions. */
const LS_RADIUS_RATE = "vishva.xr.radiusRate";

/**
 * Component id of the primary thumbstick on a standard WebXR motion controller.
 * Its `axes` ({x, y}) carry the continuous stick position we sample each frame
 * to drive avatar movement (left stick) and rotation (right stick).
 */
const THUMBSTICK_COMPONENT = "xr-standard-thumbstick";

/**
 * Component id of the trigger on a standard WebXR motion controller. On the
 * LEFT controller a rising-edge press makes the avatar jump (permanent feature).
 */
const TRIGGER_COMPONENT = "xr-standard-trigger";

/**
 * Component id of the LEFT controller's Y face button, used to toggle the
 * TEMPORARY debug HUD.
 *
 * The Quest 'menu' button was tried first but its pressed state is reserved by
 * the platform in WebXR and is never reliably delivered to the page, so the HUD
 * toggle never fired. The Y face button is a normal, reliably-reported face
 * button on the LEFT Oculus Touch controller, so the HUD toggle is bound here
 * instead.
 */
const TOGGLE_HUD_BUTTON = "y-button";

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
     * TEMPORARY DEBUG DIAGNOSTICS: per-controller observers on the LEFT
     * controller's "y-button" state-change stream, tracked so they can be
     * detached when the session ends (mirrors {@link toggleButtonObservers}).
     * The y-button toggles the debug HUD ({@link toggleDiagHud}); remove this
     * array together with the rest of the HUD once the axis bug is resolved.
     * (The Quest 'menu' button is reserved in WebXR and unreliable, so the
     * y-button drives the toggle instead.)
     */
    private menuButtonObservers: Array<{
        component: WebXRControllerComponent;
        observer: Nullable<Observer<WebXRControllerComponent>>;
    }> = [];

    /**
     * Per-controller observers on the LEFT controller's trigger
     * (`xr-standard-trigger`) state-change stream, tracked so they can be
     * detached when the session ends (mirrors {@link toggleButtonObservers}).
     * A rising-edge trigger press makes the avatar jump — a PERMANENT feature.
     */
    private triggerButtonObservers: Array<{
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
     *
     * Retained only for the legacy teleport teardown path. Stick locomotion has
     * replaced teleport as the movement mechanism, so this is never populated by
     * the active flow anymore (see {@link applyLocomotionMode}); it stays here so
     * a stray previously-enabled feature can still be disabled defensively.
     */
    private teleportation: Nullable<WebXRMotionControllerTeleportation> = null;

    /**
     * The left thumbstick component (translation) once a left controller's
     * motion controller has initialised, or null when no left stick is bound.
     * Sampled every frame by {@link sampleSticks} while in session.
     */
    private leftStick: Nullable<WebXRControllerComponent> = null;

    /**
     * The right thumbstick component (rotation) once a right controller's motion
     * controller has initialised, or null when no right stick is bound.
     */
    private rightStick: Nullable<WebXRControllerComponent> = null;

    /**
     * The LEFT controller's WebXR input source, remembered when a left
     * controller is added so its pointer-selection laser ray can be hidden.
     *
     * The left trigger is now the jump button, so the left controller's
     * selection ray is misleading and must be hidden (a PERMANENT UX fix — the
     * RIGHT controller keeps its ray for SNA clicks and the Exit XR HUD button).
     * The laser mesh is created asynchronously, so hiding may need to be retried
     * over the first few render frames; this field lets the per-frame sampler
     * re-attempt the hide until it succeeds. Reset to null on session
     * start/end.
     */
    private leftInputSource: Nullable<WebXRInputSource> = null;

    /**
     * Whether the LEFT controller's pointer-selection laser ray + selection ring
     * have been successfully hidden. Starts false each session; once
     * {@link hideLeftControllerRay} finds and hides the left controller's per-
     * controller pointer entry it is set true so the per-frame retry stops.
     * Reset to false on session start/end.
     */
    private leftRayHidden: boolean = false;

    /**
     * Whether the pointer-selection meshes (laser + selection ring) have had
     * their `renderingGroupId` raised above the HUD plane's group. The HUD
     * plane draws at group 1, which would otherwise hide the RIGHT controller's
     * selection ring behind the panel when the ray hits a HUD button. Raising
     * the ring/laser to group 2 makes them draw ON TOP of the HUD. Starts false
     * each session; once {@link raiseRightSelectionRingRenderingGroup} raises at
     * least one controller's meshes it is set true so the per-frame retry stops.
     * Reset to false on session start/end.
     */
    private rightRingRaised: boolean = false;

    /**
     * Whether the LEFT X-button dolly toggle is currently in its "dollied to
     * avatar" state. When true, the follow ArcRotateCamera's radius has been
     * driven to its lower limit by an X-button press and the previous radius is
     * remembered in {@link xDollySavedRadius} for restore on the next press.
     * Reset to false on session start/end.
     */
    private xDollyActive: boolean = false;

    /**
     * The follow ArcRotateCamera's `.radius` captured at the moment the LEFT
     * X-button dollied the camera to the avatar, restored on the next X-button
     * press. Null when not dollied-in-by-X. Reset to null on session start/end.
     */
    private xDollySavedRadius: Nullable<number> = null;

    /**
     * The RIGHT controller's B face-button component once bound (see
     * {@link bindRightControllerHeightButtons}), or null when no right
     * controller is bound. Holding it DECREASES the follow ArcRotateCamera's
     * `radius` (dolly TOWARD the avatar) continuously each frame — its live
     * `.pressed` state is sampled by {@link applyButtonDolly}. Reset to null on
     * session start/end.
     */
    private radiusDownButton: Nullable<WebXRControllerComponent> = null;

    /**
     * The RIGHT controller's A face-button component once bound (see
     * {@link bindRightControllerHeightButtons}), or null when no right
     * controller is bound. Holding it INCREASES the follow ArcRotateCamera's
     * `radius` (dolly AWAY from the avatar) continuously each frame — its live
     * `.pressed` state is sampled by {@link applyButtonDolly}. Reset to null on
     * session start/end.
     */
    private radiusUpButton: Nullable<WebXRControllerComponent> = null;

    /* ---------------------------------------------------------------------
     * TEMPORARY DEBUG DIAGNOSTICS
     *
     * The fields below back an on-screen HUD used to diagnose the intermittent
     * left-thumbstick strafe bug on the Quest 3 (console logs are not visible
     * inside the headset). They are NOT production state — remove them, the
     * babylonjs-gui import, and the createDiagHud/updateDiagHud/disposeDiagHud
     * methods once the axis bug is resolved.
     * ------------------------------------------------------------------- */

    /** The ADT (bound to the world-space plane) hosting the debug HUD, or null when not created. */
    private diagTexture: Nullable<any> = null;

    /** The HUD TextBlock refreshed each frame, or null when not created. */
    private diagText: Nullable<any> = null;

    /**
     * The world-space plane mesh that hosts the HUD ADT, shared by BOTH modes.
     * It is a top-level scene mesh (NOT parented). In DEBUG mode it is head-
     * locked via per-frame placement in {@link updateDiagHudPlacement}, which
     * repositions and reorients it from the live WebXR camera pose each frame; in
     * OPTIONS mode it is world-locked — placed once via
     * {@link placeOptionsPanelInFront} and then left fixed. Parenting to the
     * WebXR camera was dropped because it follows head position but not head
     * rotation and the camera transform is rewritten every frame. Null when not
     * created.
     * TEMPORARY DEBUG state — removed together with the rest of the HUD.
     */
    private diagPlane: Nullable<any> = null;

    /**
     * Handedness reported by the motion controller whose thumbstick was bound
     * to {@link leftStick}, captured at bind time. "" until a left stick binds.
     * Displayed on the debug HUD to reveal mis-classified handedness.
     */
    private leftHandedness: string = "";

    /**
     * Handedness reported by the motion controller whose thumbstick was bound
     * to {@link rightStick}, captured at bind time. "" until a right stick binds.
     */
    private rightHandedness: string = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: ground-truth capture of EVERY controller
     * added during the session — its reported handedness and the full list of
     * component ids it exposes. Populated in {@link bindMotionController} for
     * both controllers (not just the left/right-classified sticks), so the HUD
     * can reveal exactly what the hardware (e.g. a Quest 3) exposes and how it
     * classifies handedness. Cleared on session start/end. Remove together with
     * the rest of the HUD once the button/handedness bug is resolved.
     */
    private diagControllers: Array<{ handedness: string; componentIds: string[] }> = [];

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the LEFT controller's trigger component once
     * bound (see {@link bindLeftControllerButtons}), or null if never bound. The
     * HUD reads its live `.pressed` state each frame; a null value ("unbound")
     * is itself the key diagnostic (the LEFT-only binding never happened).
     */
    private diagTriggerComponent: Nullable<any> = null;

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the LEFT controller's y-button (HUD-toggle)
     * component once bound (see {@link bindLeftControllerButtons}), or null if
     * never bound. The HUD reads its live `.pressed` state each frame.
     */
    private diagMenuComponent: Nullable<any> = null;

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: whether the trigger reported pressed on the
     * previous sampled frame (rising-edge bookkeeping for the HUD, not used by
     * movement logic).
     */
    private diagLastTriggerPressed = false;

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: whether the menu button reported pressed on
     * the previous sampled frame.
     */
    private diagLastMenuPressed = false;

    /** TEMPORARY DEBUG DIAGNOSTICS: count of LEFT-trigger rising-edge jumps fired. */
    private diagJumpCount = 0;

    /** TEMPORARY DEBUG DIAGNOSTICS: count of LEFT-menu rising-edge toggles fired. */
    private diagMenuCount = 0;

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the last computed head world-position rendered
     * onto the HUD ("x,y,z", 2 decimals), or "" until a finite pose is resolved.
     * Set each frame by {@link updateDiagHudPlacement} and read by
     * {@link updateDiagHud}. Remove with the rest of the HUD.
     */
    private diagHeadPosStr = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the last computed panel world-position rendered
     * onto the HUD ("x,y,z", 2 decimals), or "" until a finite placement is
     * computed. Remove with the rest of the HUD.
     */
    private diagPanelPosStr = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: which pose-resolution path produced the panel
     * placement this frame — one of "rig+front", "base+front",
     * "getDirection-fallback", or "none" (no usable head pose; plane left where
     * it is). Read by {@link updateDiagHud}. Remove with the rest of the HUD.
     */
    private diagPlacementSrc = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the follow ArcRotateCamera's `.radius` this
     * frame ("?" when unavailable), set in {@link updateDiagHud} and shown on
     * the HUD so we can confirm on-device whether the camera radius is
     * oscillating (the back-and-forth jerk). Remove with the rest of the HUD.
     */
    private diagCamRadiusStr = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the follow ArcRotateCamera's alpha/beta this
     * frame ("a/b", 2 decimals; "?" when unavailable), set in
     * {@link updateDiagHud} so we can watch the orbit angles while the avatar
     * walks backward. Remove with the rest of the HUD.
     */
    private diagCamAnglesStr = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the avatar's world position this frame
     * ("x,y,z", 2 decimals; "n/a" when there is no avatar), set in
     * {@link updateDiagHud}. Remove with the rest of the HUD.
     */
    private diagAvatarPosStr = "";

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: the Euclidean distance from the avatar to the
     * arc (follow) camera position this frame (3 decimals; "n/a" when either is
     * missing), set in {@link updateDiagHud} so we can watch the avatar drift
     * toward the camera during the back-and-forth jerk. Remove with the HUD.
     */
    private diagAvToCamStr = "";

    /**
     * The MoveIntent applied to the CharacterController on the previous frame.
     * The per-frame sampler diffs the freshly-computed intent against this and
     * only calls the CharacterController for actions whose boolean changed, so
     * the CC is edge-triggered rather than spammed every frame.
     */
    private lastIntent: MoveIntent = neutralMoveIntent();

    /**
     * Whether the "fast" (run) speed flag was active on the previous frame, used
     * alongside {@link lastIntent} to edge-trigger the CharacterController when
     * the SAME movement direction switches between its normal and fast variant.
     *
     * Fast is HOLD-to-go-fast: it is true only while the LEFT thumbstick is
     * clicked (`leftStick.pressed === true`) AND there is movement intent. When
     * the fast flag flips for an active direction, the previous-speed method is
     * turned off and the new-speed method turned on so the CC never has both a
     * normal and fast variant of the same direction active at once.
     */
    private lastFast: boolean = false;

    /* ---------------------------------------------------------------------
     * HUD OPTIONS PANEL / DEBUG DIAGNOSTICS
     *
     * Whether the HUD options panel is currently shown. The HUD is a reusable
     * in-headset options panel (Exit XR + Debug buttons, room for future
     * options) and now starts HIDDEN on session entry — it is shown only when
     * the user presses the LEFT controller's "y-button" (see toggleDiagHud).
     * Starting hidden avoids placing the world-locked panel against the
     * transient, unsettled head pose during the first post-entry frames (which
     * caused a brief placement "flash"); by the time Y is pressed the head pose
     * is fully settled. The Quest 'menu' button is reserved in WebXR and
     * unreliable, so the y-button drives the toggle instead. While hidden,
     * sampleSticks skips the per-frame HUD text refresh (movement logic is
     * unaffected).
     * ------------------------------------------------------------------- */
    private diagVisible: boolean = false;

    /**
     * Whether the (temporary) diagnostic text content of the HUD panel is
     * enabled. Debug is OFF by default so the panel shows a clean reusable
     * options surface; the "Debug" button on the panel toggles this, and only
     * while it is true does the per-frame diagnostic computation + text build
     * run (see sampleSticks). Reset to false on every session start/end so each
     * session begins with debug off. The HUD panel itself is a permanent
     * reusable options panel; only the diagnostic text it can show is the
     * temporary debug content gated by this flag.
     */
    private debugEnabled: boolean = false;

    /**
     * Which of the two mutually-exclusive HUD modes is currently displayed on
     * the shared plane/ADT:
     *
     * - `"options"` (default): a WORLD-LOCKED options panel placed ONCE in front
     *   of the viewer when summoned and then FIXED in world space (point-and-
     *   click friendly). Shows the Exit XR + Debug buttons (room for future
     *   option sliders); the diagnostic text is hidden and debug computation is
     *   off. This is the reusable options-panel foundation.
     * - `"debug"`: the TEMPORARY head-locked debug readout — the plane is
     *   repositioned in front of the head every frame (see
     *   {@link updateDiagHudPlacement}) and shows the live diagnostic text plus a
     *   "Close" button that returns to options mode.
     *
     * Exactly one mode's content is visible while the HUD is shown. Reset to
     * `"options"` on every session start/end and whenever the HUD is (re-)shown
     * by the left Y button.
     */
    private hudMode: "options" | "debug" = "options";

    /**
     * When true, the one-time world-lock of the OPTIONS panel is still pending:
     * the render observer places the panel ONCE on the first frame that yields
     * a VALID head pose, then clears this flag to freeze it world-locked.
     *
     * Set true when entering options mode (see {@link applyHudMode}); consumed
     * in the per-frame render observer (see {@link startStickSampler}). Reset to
     * false on session start/end.
     *
     * NOTE: There is a known, not-yet-root-caused issue where placing the panel
     * against the head pose at/just-after XR entry grounds it low (the pose
     * reads grounded / y≈0 right after entry). The current mitigation is that
     * the HUD starts hidden and is only shown on Y-press — by which point the
     * head pose has settled — so a single deferred placement works. TODO:
     * root-cause why the immediate post-entry head pose reads grounded
     * (suspected interaction with updateXRCameraFollow's
     * setTransformationFromNonVRCamera grounding the base camera, plus rig-pose
     * settling timing).
     */
    private optionsPlacementPending: boolean = false;

    /**
     * Reference to the OPTIONS-mode "Exit XR" GUI button, captured in
     * {@link createDiagHud} so {@link applyHudMode} can flip its `.isVisible`
     * per mode. Null when the HUD/GUI was never built (e.g. mocked test env),
     * so all visibility flips are guarded.
     */
    private exitBtnRef: Nullable<any> = null;

    /**
     * Reference to the OPTIONS-mode "Debug" GUI button (switches to debug mode),
     * captured in {@link createDiagHud}. Null when the GUI was never built.
     */
    private debugBtnRef: Nullable<any> = null;

    /**
     * Reference to the DEBUG-mode "Close" GUI button (returns to options mode),
     * captured in {@link createDiagHud}. Null when the GUI was never built.
     */
    private closeBtnRef: Nullable<any> = null;

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: captured CC camera elasticity/springback state
     * while the debug HUD is shown, or null when the HUD is hidden (nothing to
     * restore). The debug HUD plane is pickable and sits between the follow
     * camera and the avatar, so it obstructs the CharacterController's per-frame
     * camera-obstruction ray; that makes the CC's elasticity spring pull the XR
     * camera forward (a visible jerk). We therefore disable elasticity ONLY
     * while the HUD is visible and restore it when the HUD is hidden or the
     * session ends. Remove this together with the rest of the debug HUD.
     */
    private hudElasticitySnapshot: Nullable<{ elastic: boolean; springback: boolean }> = null;

    /**
     * Deadzone applied to raw thumbstick axes before mapping to intents. Small
     * resting drift within this band is treated as no input.
     */
    private stickDeadzone: number = DEFAULT_STICK_DEADZONE;

    /* ---------------------------------------------------------------------
     * ORBIT / DOLLY SENSITIVITY RATES (user-tunable via the OPTIONS HUD)
     *
     * These three rates were formerly module-level constants; they are now
     * instance fields so the in-headset OPTIONS panel sliders can adjust them
     * live and persist the chosen values to localStorage across sessions. Each
     * is initialized from its DEFAULT_* constant and overridden by a valid,
     * in-range persisted value when {@link loadSensitivityFromStorage} runs on
     * session start.
     * ------------------------------------------------------------------- */

    /**
     * ALPHA orbit rate (radians per frame at full stick deflection) applied to
     * the follow ArcRotateCamera's `alpha` by {@link applyCameraOrbit} from the
     * RIGHT stick's X axis. Adjustable live via the OPTIONS HUD alpha slider
     * (range 0…{@link MAX_ORBIT_RATE}) and persisted to localStorage.
     */
    private alphaRate: number = DEFAULT_ALPHA_RATE;

    /**
     * BETA orbit rate (radians per frame at full stick deflection) applied to
     * the follow ArcRotateCamera's `beta` by {@link applyCameraOrbit} from the
     * RIGHT stick's Y axis. Adjustable live via the OPTIONS HUD beta slider
     * (range 0…{@link MAX_ORBIT_RATE}) and persisted to localStorage.
     */
    private betaRate: number = DEFAULT_BETA_RATE;

    /**
     * RADIUS dolly rate (ArcRotateCamera `radius` units per frame while a RIGHT
     * B/A button is held) applied by {@link applyButtonDolly}. Adjustable live
     * via the OPTIONS HUD radius slider (range 0…{@link MAX_RADIUS_RATE}) and
     * persisted to localStorage.
     */
    private radiusRate: number = DEFAULT_RADIUS_RATE;

    /**
     * OPTIONS-mode alpha sensitivity Slider control, captured in
     * {@link createDiagHud} so {@link applyHudMode} can flip its `.isVisible`
     * per mode and re-sync its `.value` from {@link alphaRate}. Null when the
     * GUI was never built (e.g. mocked test env), so all access is guarded.
     */
    private alphaSliderRef: Nullable<any> = null;

    /** OPTIONS-mode beta sensitivity Slider control (see {@link alphaSliderRef}). */
    private betaSliderRef: Nullable<any> = null;

    /** OPTIONS-mode radius sensitivity Slider control (see {@link alphaSliderRef}). */
    private radiusSliderRef: Nullable<any> = null;

    /**
     * OPTIONS-mode alpha slider label TextBlock (shows "alpha: <value>").
     * Captured in {@link createDiagHud}; its text and visibility are updated
     * alongside {@link alphaSliderRef}. Null when the GUI was never built.
     */
    private alphaLabelRef: Nullable<any> = null;

    /** OPTIONS-mode beta slider label TextBlock (see {@link alphaLabelRef}). */
    private betaLabelRef: Nullable<any> = null;

    /** OPTIONS-mode radius slider label TextBlock (see {@link alphaLabelRef}). */
    private radiusLabelRef: Nullable<any> = null;

    /**
     * The per-frame sampler observer on `scene.onBeforeRenderObservable`. Reads
     * the sticks and edge-triggers the CharacterController. Registered on
     * session start and detached on session end so repeated enter/exit cycles do
     * not accumulate render callbacks (Requirement 9.4).
     */
    private renderObserver: Nullable<Observer<Scene>> = null;

    constructor(vishva: Vishva) {
        this.vishva = vishva;
    }

    /**
     * Load the three orbit/dolly sensitivity rates ({@link alphaRate},
     * {@link betaRate}, {@link radiusRate}) from localStorage, overriding the
     * defaults with any previously-persisted values.
     *
     * For each rate the stored string is parsed as a finite float and applied
     * ONLY when it is a finite number within the slider's valid range (0…max);
     * an absent, unparseable, or out-of-range value leaves the current default
     * untouched. The whole operation is guarded: localStorage may be absent
     * (the mocked test/node env) or throw (private-mode / disabled storage), so
     * a `typeof localStorage` check gates the access and any throw is swallowed.
     * Called at the start of {@link onSessionStart} so the sliders initialize to
     * the persisted values each session.
     */
    private loadSensitivityFromStorage(): void {
        if (typeof localStorage === "undefined") {
            return;
        }
        try {
            const read = (key: string, current: number, max: number): number => {
                const raw = localStorage.getItem(key);
                if (raw === null) {
                    return current;
                }
                const parsed = parseFloat(raw);
                if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
                    return current;
                }
                return parsed;
            };
            this.alphaRate = read(LS_ALPHA_RATE, this.alphaRate, MAX_ORBIT_RATE);
            this.betaRate = read(LS_BETA_RATE, this.betaRate, MAX_ORBIT_RATE);
            this.radiusRate = read(LS_RADIUS_RATE, this.radiusRate, MAX_RADIUS_RATE);
        } catch {
            // localStorage unavailable/threw — keep whatever defaults are set.
        }
    }

    /**
     * Persist the three current orbit/dolly sensitivity rates to localStorage so
     * they survive across sessions and page reloads. Called by each OPTIONS HUD
     * slider's onValueChanged handler after it writes the field. Guarded by a
     * `typeof localStorage` check + try/catch so it is a safe no-op in the
     * mocked test/node env or when storage is disabled/throws.
     */
    private saveSensitivityToStorage(): void {
        if (typeof localStorage === "undefined") {
            return;
        }
        try {
            localStorage.setItem(LS_ALPHA_RATE, String(this.alphaRate));
            localStorage.setItem(LS_BETA_RATE, String(this.betaRate));
            localStorage.setItem(LS_RADIUS_RATE, String(this.radiusRate));
        } catch {
            // localStorage unavailable/threw — persistence is best-effort.
        }
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

        // Load the persisted orbit/dolly sensitivity rates BEFORE the HUD is
        // built so the OPTIONS-panel sliders initialize to the stored values.
        // Re-read every session so a change made in another tab/session (or a
        // previous session's slider edit) is picked up. Guarded — no-op when
        // localStorage is absent (defaults stand).
        this.loadSensitivityFromStorage();

        this.disableDesktopPipeline();
        // Keep the CharacterController running (only quiesce its keyboard) so it
        // drives movement, animation, ground-following and the avatar-coupled
        // camera during the XR session (behavior c / Requirement 9.3).
        this.disableDesktopController();

        // Reset the edge-trigger baseline so the first sampled frame starts from
        // a clean neutral intent rather than a stale one from a prior session.
        this.lastIntent = neutralMoveIntent();
        // Reset the fast-speed baseline too, so a stale "fast" from a prior
        // session never leaks into the first frame's edge-trigger.
        this.lastFast = false;
        // Reset the LEFT-controller ray-hiding state so the per-frame retry
        // re-runs for the controllers added in THIS session (the left trigger is
        // jump, so its selection ray is hidden — see hideLeftControllerRay).
        this.leftInputSource = null;
        this.leftRayHidden = false;
        // Reset the right selection-ring raise state so the per-frame retry
        // re-raises the ring/laser above the HUD for THIS session's controllers.
        this.rightRingRaised = false;
        // Reset the LEFT X-button dolly toggle so a stale dollied-in state /
        // saved radius from a prior session never leaks into this one.
        this.xDollyActive = false;
        this.xDollySavedRadius = null;
        // Reset the RIGHT B/A continuous-dolly button captures so stale
        // components from a prior session never leak into this one; they are
        // re-captured when this session's right controller is bound.
        this.radiusDownButton = null;
        this.radiusUpButton = null;

        // Each session starts in OPTIONS mode with debug OFF so the HUD panel
        // shows a clean, world-locked options surface; the panel's Debug button
        // switches to the head-locked debug readout.
        this.hudMode = "options";
        this.debugEnabled = false;
        // The HUD now starts HIDDEN each session and is shown only when the user
        // presses the left Y button (toggleDiagHud). Force it hidden here so a
        // re-entered session always starts hidden regardless of prior state.
        this.diagVisible = false;
        // Clean slate for the deferred one-time options world-lock;
        // createDiagHud → applyHudMode (options branch) sets pending true once
        // the HUD is built.
        this.optionsPlacementPending = false;

        // TEMPORARY DEBUG DIAGNOSTICS: start each session with a clean capture so
        // stale controller dumps / counters from a prior session don't linger.
        this.diagControllers = [];
        this.diagTriggerComponent = null;
        this.diagMenuComponent = null;
        this.diagLastTriggerPressed = false;
        this.diagLastMenuPressed = false;
        this.diagJumpCount = 0;
        this.diagMenuCount = 0;
        // TEMPORARY DEBUG DIAGNOSTICS: clear the HUD placement diagnostics so a
        // stale head/panel position or path from a prior session doesn't linger.
        this.diagHeadPosStr = "";
        this.diagPanelPosStr = "";
        this.diagPlacementSrc = "";
        this.diagCamRadiusStr = "";
        // TEMPORARY DEBUG DIAGNOSTICS: clear the camera/avatar diagnostics so a
        // stale readout from a prior session doesn't linger.
        this.diagCamAnglesStr = "";
        this.diagAvatarPosStr = "";
        this.diagAvToCamStr = "";

        // Default locomotion: first-person when permitted, third-person when the
        // active CharacterController has noFirstPerson set. With stick locomotion
        // the mode only affects camera coupling (see applyLocomotionMode); stick
        // move/turn works identically in both.
        const canFirstPerson = this.canFirstPerson();
        const defaultMode: LocomotionMode = canFirstPerson
            ? "firstPerson"
            : "thirdPerson";
        this.locomotion.setMode(defaultMode, canFirstPerson);
        this.applyLocomotionMode(this.locomotion.getMode());

        // Start the per-frame stick sampler that reads the thumbsticks and
        // edge-triggers the CharacterController.
        this.startStickSampler();

        // TEMPORARY DEBUG DIAGNOSTICS: create the in-headset HUD so the raw stick
        // axes / derived intent are visible while diagnosing the strafe bug. The
        // HUD is built (ready) but starts HIDDEN, so we do NOT disable camera
        // elasticity here — elasticity stays normal until the user presses the
        // left Y button (toggleDiagHud's show branch disables it while the HUD
        // is actually shown, and restores it when hidden / on session end).
        this.createDiagHud();
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
        // Before tearing down input, ensure the avatar isn't left moving: push a
        // neutral intent so any stick action currently active is stopped on the
        // CharacterController (otherwise a mid-move exit would leave the avatar
        // walking on the desktop).
        this.stopAllMovement();
        // The features manager tears down features when the session ends; drop
        // our reference so the next session re-applies locomotion cleanly.
        this.teleportation = null;
        // Detach the per-frame stick sampler so repeated enter/exit cycles don't
        // accumulate render callbacks (Requirement 9.4).
        this.stopStickSampler();
        // Clear the bound stick components; the next session re-binds them via
        // the persistent onControllerAddedObservable hook.
        this.leftStick = null;
        this.rightStick = null;
        // Clear the LEFT-controller ray-hiding state so the next session starts
        // clean and re-hides the (re-added) left controller's selection ray.
        this.leftInputSource = null;
        this.leftRayHidden = false;
        // Clear the right selection-ring raise state so the next session re-runs
        // the per-frame raise for its (re-added) controllers.
        this.rightRingRaised = false;
        // Clear the LEFT X-button dolly toggle so the next session starts clean.
        this.xDollyActive = false;
        this.xDollySavedRadius = null;
        this.lastIntent = neutralMoveIntent();
        this.lastFast = false;
        // Detach the per-session controller observers so repeated enter/exit
        // cycles don't accumulate handlers (Requirement 9.4). The toggle-button
        // observers and the per-source motion-controller-init observers are both
        // added while a session runs (controllers are re-added and re-bound on
        // the next session via the persistent onControllerAddedObservable hook).
        this.detachToggleButtonObservers();
        this.detachMotionControllerInitObservers();
        // Detach the LEFT-controller trigger (jump) observers — permanent
        // feature — and the y-button (debug HUD toggle) observers, mirroring
        // the toggle-button teardown so cycles don't accumulate handlers.
        this.detachTriggerButtonObservers();
        // Clear the RIGHT-controller B/A continuous-dolly button captures so the
        // next session re-captures them via the persistent controller-added
        // hook (no observers to detach — the dolly is sampled per-frame).
        this.radiusDownButton = null;
        this.radiusUpButton = null;
        // TEMPORARY DEBUG DIAGNOSTICS: detach the y-button HUD-toggle
        // observers; remove together with the rest of the HUD.
        this.detachMenuButtonObservers();
        this.lastToggleController = null;
        // TEMPORARY DEBUG DIAGNOSTICS: clear the ground-truth controller capture
        // and live-button references so a fresh session starts clean.
        this.diagControllers = [];
        this.diagTriggerComponent = null;
        this.diagMenuComponent = null;
        this.diagLastTriggerPressed = false;
        this.diagLastMenuPressed = false;
        this.diagJumpCount = 0;
        this.diagMenuCount = 0;
        // TEMPORARY DEBUG DIAGNOSTICS: clear the HUD placement diagnostics so the
        // next session starts with a clean head/panel/path readout.
        this.diagHeadPosStr = "";
        this.diagPanelPosStr = "";
        this.diagPlacementSrc = "";
        this.diagCamRadiusStr = "";
        // TEMPORARY DEBUG DIAGNOSTICS: clear the camera/avatar diagnostics so the
        // next session starts with a clean readout.
        this.diagCamAnglesStr = "";
        this.diagAvatarPosStr = "";
        this.diagAvToCamStr = "";
        // Reset the HUD back to OPTIONS mode with debug OFF so the next session
        // starts with a clean, world-locked options panel.
        this.hudMode = "options";
        this.debugEnabled = false;
        // The HUD starts HIDDEN each session; reset the flag here too so a
        // re-entered session always begins hidden regardless of prior state.
        this.diagVisible = false;
        // Clear the deferred options world-lock so a stale pending flag from
        // this session never leaks into the next.
        this.optionsPlacementPending = false;
        // TEMPORARY DEBUG DIAGNOSTICS: if the session ends while the HUD is still
        // showing, restore the CC camera elasticity the HUD had disabled (leaves
        // hudElasticitySnapshot null). No-op when the HUD was already hidden.
        this.restoreCameraElasticityAfterHud();
        // TEMPORARY DEBUG DIAGNOSTICS: tear down the in-headset HUD so it is not
        // left dangling after the session ends.
        this.disposeDiagHud();
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
     * Apply the locomotion-mode configuration.
     *
     * Stick locomotion has REPLACED the old teleport (first-person) and
     * point-to-move (third-person) movement models: both modes now move and
     * rotate the avatar through the CharacterController via the thumbsticks. The
     * first/third-person distinction therefore only affects CAMERA COUPLING, and
     * that coupling is delegated to the CharacterController's own camera handling
     * rather than rewritten here each frame:
     *
     * - First-person: the CC frames the camera at the avatar (allowed to enter
     *   first person) — `setNoFirstPerson(false)`.
     * - Third-person: the CC keeps the camera offset behind/above the avatar and
     *   orbits it on turn — `setNoFirstPerson(true)`.
     *
     * The Teleport_Feature is never enabled (movement is stick-driven), and any
     * teleport left over from a legacy path is disabled defensively. Pointer
     * selection is left untouched — it stays enabled (its experience default) in
     * both modes so SNA click interaction keeps working (Requirement 5.x / SNA).
     */
    private applyLocomotionMode(mode: LocomotionMode): void {
        const featuresManager = this.getFeaturesManager();
        if (featuresManager !== null) {
            // Stick locomotion replaces teleport: make sure teleport is never
            // active regardless of mode.
            this.disableTeleportation(featuresManager);
        }

        // Adjust CharacterController camera coupling for the chosen mode via its
        // public API instead of hand-editing transforms. `setNoFirstPerson`
        // controls whether the CC will pull the camera all the way in to the
        // avatar (first-person) or hold it at the third-person offset.
        const cc = this.vishva.avManager?.cc;
        cc?.setNoFirstPerson?.(mode !== "firstPerson");
    }

    /**
     * Disable the Teleport_Feature so teleportation is never active — stick
     * locomotion has replaced teleport as the movement mechanism. Idempotent: a
     * no-op when teleport was never enabled. Kept so any teleport left over from
     * a legacy path can be torn down defensively on mode application.
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
                // If this is the LEFT controller, remember its input source and
                // hide its pointer-selection laser ray (the left trigger is now
                // jump, so its selection ray is misleading — PERMANENT UX fix,
                // right controller keeps its ray for SNA clicks / Exit XR). The
                // laser mesh is created asynchronously, so this first attempt may
                // no-op; the per-frame sampler retries until it succeeds.
                this.rememberLeftControllerAndHideRay(source);
                // Track the init observer per source so it can be detached on
                // session end — otherwise each enter/exit cycle would leave the
                // handler attached and accumulate duplicates (Requirement 9.4).
                const observer = source.onMotionControllerInitObservable.add(
                    (motionController: WebXRAbstractMotionController) => {
                        this.bindMotionController(motionController);
                        // Handedness is reliably known once the motion controller
                        // initialises; re-attempt the left-ray hide now that the
                        // controller (and, ideally, its laser mesh) exists.
                        this.rememberLeftControllerAndHideRay(source);
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
        // TEMPORARY DEBUG DIAGNOSTICS: capture ground-truth for EVERY controller
        // (handedness + component ids) before any classification, so the HUD can
        // reveal what the hardware actually exposes.
        this.captureDiagController(motionController);

        // Bind the thumbstick for stick locomotion first (independent of the
        // face-button toggle; a controller may have a stick but no A/X button).
        this.bindMotionControllerSticks(motionController);

        // Bind the LEFT controller's trigger (jump — permanent) and y-button
        // (debug HUD toggle — temporary). No-op on the right controller.
        this.bindLeftControllerButtons(motionController);

        // Capture the RIGHT controller's B/A face-button components for the
        // per-frame continuous XR-camera dolly (B toward the avatar, A away).
        // No-op on the left controller.
        this.bindRightControllerHeightButtons(motionController);

        // Bind the LEFT controller's X face button (dolly-to-avatar toggle).
        // The right controller's A/B buttons are OWNED by
        // bindRightControllerHeightButtons above, so the generic binding here is
        // LEFT-only: the x-button → toggleXDolly. The RIGHT a-button no longer
        // has any binding here (it means "height down" and is handled above), so
        // there is no a-button branch — avoiding a double-bind.
        const xComponent = motionController.getComponent?.(TOGGLE_BUTTON_X);
        if (xComponent) {
            // LEFT X-button → dolly-to-avatar toggle.
            const observer = xComponent.onButtonStateChangedObservable.add(
                (comp: WebXRControllerComponent) => {
                    // Rising edge only (false → true), so one press = one toggle.
                    if (
                        comp.changes?.pressed &&
                        comp.changes.pressed.current === true
                    ) {
                        this.lastToggleController = motionController;
                        this.toggleXDolly();
                    }
                }
            );
            this.toggleButtonObservers.push({ component: xComponent, observer });
        }
    }

    /**
     * Capture the RIGHT controller's B and A face-button components so the
     * per-frame sampler ({@link applyButtonDolly}) can read their live
     * `.pressed` state and CONTINUOUSLY dolly the follow ArcRotateCamera's
     * `radius` (distance from the avatar) while a button is HELD. This is the
     * continuous replacement for the former per-press dolly; orbit (alpha/beta)
     * lives on the RIGHT thumbstick (see {@link applyCameraOrbit}).
     *
     * - B button (`b-button`): held → DECREASES `radius` each frame (camera
     *   moves TOWARD the avatar). B sits in front of A, so "push toward avatar"
     *   reads intuitively. Stored in {@link radiusDownButton}.
     * - A button (`a-button`): held → INCREASES `radius` each frame (camera
     *   moves AWAY from the avatar). Stored in {@link radiusUpButton}.
     *
     * No observers are added here — the dolly is sampled every frame from the
     * stored components (see {@link applyButtonDolly}), so there is nothing to
     * detach on session end (the captures are just cleared). Only the RIGHT
     * controller is wired (handedness "right"); the left controller is a no-op
     * here (its A/X region exposes the x-button handled elsewhere). Every access
     * is defensively guarded so a controller lacking either component, or a
     * mocked test environment, never throws.
     */
    private bindRightControllerHeightButtons(
        motionController: WebXRAbstractMotionController
    ): void {
        const handedness = (motionController as any)?.handedness as
            | string
            | undefined;
        if (handedness !== "right") {
            // Only the RIGHT controller carries the B/A dolly buttons.
            return;
        }

        // Capture the B/A components; the per-frame sampler reads their live
        // `.pressed` state (B → toward avatar, A → away).
        this.radiusDownButton =
            motionController.getComponent?.(HEIGHT_BUTTON_UP) ?? null;
        this.radiusUpButton =
            motionController.getComponent?.(TOGGLE_BUTTON_A) ?? null;
    }

    /**
     * Per-frame continuous dolly driven by the RIGHT controller's B/A buttons.
     * Called each frame from {@link sampleSticks} (alongside
     * {@link applyCameraOrbit}). Reads the live `.pressed` state of the captured
     * {@link radiusDownButton} (B) and {@link radiusUpButton} (A):
     *
     * - B held → DECREASE the follow ArcRotateCamera's `radius` by
     *   {@link radiusRate} (dolly TOWARD the avatar).
     * - A held → INCREASE `radius` by {@link radiusRate} (dolly AWAY).
     * - neither, or BOTH, held → no change.
     *
     * After a change, `radius` is clamped to the camera's
     * `lowerRadiusLimit`/`upperRadiusLimit` (when present) and the arc camera's
     * world matrix is recomputed so `.position` reflects the new radius THIS
     * frame (the follow copy in {@link updateXRCameraFollow} reads the arc
     * position). A no-op when not in session or when there is no usable arc
     * camera. Every access is guarded so a missing arc camera / non-numeric
     * radius / mocked test environment (no `computeWorldMatrix`) is a safe
     * no-op.
     */
    private applyButtonDolly(): void {
        if (!this.inXR) {
            return;
        }
        try {
            const arc: any = this.vishva.arcCamera;
            if (!arc || typeof arc.radius !== "number") {
                return;
            }
            const down = this.radiusDownButton?.pressed === true;
            const up = this.radiusUpButton?.pressed === true;
            if (down) {
                // B held → dolly toward the avatar. Rate is the user-tunable
                // instance field (OPTIONS HUD slider, persisted to localStorage).
                arc.radius -= this.radiusRate;
            } else if (up) {
                // A held → dolly away from the avatar.
                arc.radius += this.radiusRate;
            }
            // Clamp to the camera's configured limits when present, so the dolly
            // never pushes the radius outside the CC's expected range.
            const lo = arc.lowerRadiusLimit;
            const hi = arc.upperRadiusLimit;
            if (typeof lo === "number") arc.radius = Math.max(lo, arc.radius);
            if (typeof hi === "number") arc.radius = Math.min(hi, arc.radius);
            // Only rebuild the world matrix when a button actually drove a
            // change this frame; a radius change doesn't move the
            // ArcRotateCamera until its matrix rebuilds, and the follow copy
            // reads the updated `.position`. Guarded for the mocked test env.
            if (down || up) {
                if (typeof arc.computeWorldMatrix === "function") {
                    arc.computeWorldMatrix(true);
                }
            }
        } catch {
            // Never throw from the per-frame dolly over a mocked/odd camera.
        }
    }

    /**
     * Clamp the follow ArcRotateCamera's `beta` into the camera's own
     * lower/upper beta limits when present, else a safe range that avoids the
     * exact poles (0.05 and π−0.05) so we never hit the gimbal singularity.
     * Guarded for a missing arc camera / non-numeric beta.
     */
    private clampBeta(): void {
        const arc = this.vishva.arcCamera as any;
        if (!arc || typeof arc.beta !== "number") {
            return;
        }
        const lo =
            typeof arc.lowerBetaLimit === "number" ? arc.lowerBetaLimit : 0.05;
        const hi =
            typeof arc.upperBetaLimit === "number"
                ? arc.upperBetaLimit
                : Math.PI - 0.05;
        arc.beta = Math.max(lo, Math.min(hi, arc.beta));
    }

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: record a ground-truth dump of a single motion
     * controller — its reported handedness and the list of component ids it
     * exposes — into {@link diagControllers} for display on the HUD.
     *
     * Component ids are read from `getComponentIds()` when available, else from
     * the keys of the `components` record. Every access is guarded and the whole
     * body is wrapped in try/catch so a controller shape that differs from what
     * we expect (or a mocked test environment) never throws. Remove together
     * with the rest of the HUD once the button/handedness bug is resolved.
     */
    private captureDiagController(
        motionController: WebXRAbstractMotionController
    ): void {
        try {
            const mc = motionController as any;
            const handedness: string = mc?.handedness ?? "undefined";
            let componentIds: string[] = [];
            if (typeof mc?.getComponentIds === "function") {
                componentIds = mc.getComponentIds() ?? [];
            } else if (mc?.components) {
                componentIds = Object.keys(mc.components);
            }
            this.diagControllers.push({ handedness, componentIds });
        } catch {
            // Debug capture only — never let it break controller binding.
        }
    }

    /**
     * Bind the LEFT controller's trigger and y-button.
     *
     * Handedness classifies the controller ("left" vs "right"), exactly as
     * {@link bindMotionControllerSticks} does. Only the LEFT controller is
     * wired here:
     *
     * - Trigger (`xr-standard-trigger`): a rising-edge press makes the avatar
     *   jump via `cc.jump()`. PERMANENT feature; observers tracked in
     *   {@link triggerButtonObservers} and detached on session end.
     * - Y face button (`y-button`): a rising-edge press toggles the debug HUD
     *   via {@link toggleDiagHud}. TEMPORARY DEBUG DIAGNOSTICS; observers tracked
     *   in {@link menuButtonObservers} and detached on session end. (The Quest
     *   'menu' button is reserved in WebXR and its pressed state is unreliable,
     *   so the y-button is used instead.)
     *
     * Every access is defensively guarded so a controller lacking either
     * component, or a mocked test environment, never throws.
     */
    private bindLeftControllerButtons(
        motionController: WebXRAbstractMotionController
    ): void {
        const handedness = (motionController as any)?.handedness as
            | string
            | undefined;
        if (handedness !== "left") {
            // Only the LEFT controller carries jump (trigger) and the debug HUD
            // toggle (y-button). Right controller: nothing to bind here.
            return;
        }

        // PERMANENT: LEFT trigger → jump on the rising edge of a press.
        const trigger = motionController.getComponent?.(TRIGGER_COMPONENT);
        if (trigger) {
            // TEMPORARY DEBUG DIAGNOSTICS: remember the trigger component so the
            // HUD can show its live `.pressed` state each frame ("unbound" when
            // this never runs — itself a key diagnostic).
            this.diagTriggerComponent = trigger;
            const triggerObserver = trigger.onButtonStateChangedObservable.add(
                (comp: WebXRControllerComponent) => {
                    if (
                        comp.changes?.pressed &&
                        comp.changes.pressed.current === true
                    ) {
                        // TEMPORARY DEBUG DIAGNOSTICS: count rising-edge jumps.
                        this.diagJumpCount++;
                        this.vishva.avManager?.cc?.jump?.();
                    }
                }
            );
            this.triggerButtonObservers.push({
                component: trigger,
                observer: triggerObserver,
            });
        }

        // TEMPORARY DEBUG DIAGNOSTICS: LEFT y-button → toggle the debug HUD on
        // the rising edge of a press. The Quest 'menu' button is reserved in
        // WebXR (its pressed state never reaches the page), so the reliably-
        // reported y-button drives the toggle instead. Remove together with the
        // rest of the HUD.
        const hudToggle = motionController.getComponent?.(TOGGLE_HUD_BUTTON);
        if (hudToggle) {
            // TEMPORARY DEBUG DIAGNOSTICS: remember the y-button component so the
            // HUD can show its live `.pressed` state each frame.
            this.diagMenuComponent = hudToggle;
            const hudToggleObserver = hudToggle.onButtonStateChangedObservable.add(
                (comp: WebXRControllerComponent) => {
                    if (
                        comp.changes?.pressed &&
                        comp.changes.pressed.current === true
                    ) {
                        // TEMPORARY DEBUG DIAGNOSTICS: count rising-edge toggles.
                        this.diagMenuCount++;
                        this.toggleDiagHud();
                    }
                }
            );
            this.menuButtonObservers.push({
                component: hudToggle,
                observer: hudToggleObserver,
            });
        }
    }

    /**
     * Bind the thumbstick of a single motion controller for stick locomotion.
     *
     * The stick is fetched by component id (`xr-standard-thumbstick`); if the
     * connected controller profile does not expose one, this is a no-op (we do
     * not fall back to any other component). The controller is classified as
     * "left" (translation) or "right" (camera orbit) by its handedness so the
     * correct stick drives move vs camera:
     *
     * - handedness "left"  → left stick (walk / walkBack / strafe).
     * - handedness "right" → right stick (camera orbit: alpha/beta).
     * - handedness "none" or missing → sensible default: the first unbound slot
     *   is filled left-first, then right, so a single unhanded controller still
     *   drives movement.
     *
     * Unlike the toggle button, the stick is NOT read from its state-change
     * observable (which fires irregularly); instead its `axes` are sampled every
     * frame in {@link sampleSticks}. We therefore only need to remember the
     * component here — no per-stick observer to track.
     */
    private bindMotionControllerSticks(
        motionController: WebXRAbstractMotionController
    ): void {
        const stick = motionController.getComponent?.(THUMBSTICK_COMPONENT);
        if (!stick) {
            // No thumbstick on this controller profile — skip (no fallback).
            return;
        }

        const handedness = (motionController as any)?.handedness as
            | string
            | undefined;

        if (handedness === "left") {
            this.leftStick = stick;
            // TEMPORARY DEBUG DIAGNOSTICS: record which controller's handedness
            // classified this stick, for the in-headset HUD.
            this.leftHandedness = handedness;
        } else if (handedness === "right") {
            this.rightStick = stick;
            this.rightHandedness = handedness;
        } else {
            // Unknown/"none" handedness: fill left first (movement is the more
            // essential control), then right.
            const label = handedness ?? "none";
            if (this.leftStick === null) {
                this.leftStick = stick;
                this.leftHandedness = label;
            } else if (this.rightStick === null) {
                this.rightStick = stick;
                this.rightHandedness = label;
            }
        }
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
     * Detach all per-controller LEFT-trigger (jump) observers registered during
     * the session and clear the tracking list. Safe to call when none are
     * present. Mirrors {@link detachToggleButtonObservers}.
     */
    private detachTriggerButtonObservers(): void {
        for (const entry of this.triggerButtonObservers) {
            if (entry.observer) {
                entry.component.onButtonStateChangedObservable.remove(entry.observer);
            }
        }
        this.triggerButtonObservers = [];
    }

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: detach all per-controller y-button
     * (HUD-toggle) observers registered during the session and clear the
     * tracking list. Safe to call when none are present. Mirrors
     * {@link detachToggleButtonObservers}. Remove together with the rest of the
     * HUD once the axis bug is resolved.
     */
    private detachMenuButtonObservers(): void {
        for (const entry of this.menuButtonObservers) {
            if (entry.observer) {
                entry.component.onButtonStateChangedObservable.remove(entry.observer);
            }
        }
        this.menuButtonObservers = [];
    }

    /**
     * If the just-added controller is the LEFT one, remember its WebXR input
     * source and make a best-effort attempt to hide its pointer-selection laser
     * ray + selection ring.
     *
     * PERMANENT UX FIX: the left trigger is now the jump button, so the left
     * controller's selection ray is misleading and must be hidden. The RIGHT
     * controller keeps its ray so SNA clicks and the Exit XR HUD button still
     * work.
     *
     * Handedness is read from `source.inputSource.handedness` (the WebXR-level
     * value, the most reliable source) and falls back to the motion
     * controller's `handedness` when the WebXR field is absent (e.g. a mocked
     * test environment). When the controller is the left one, the input source
     * is stored on {@link leftInputSource} and {@link hideLeftControllerRay} is
     * invoked once. Because the laser mesh is created asynchronously AFTER the
     * controller is added, this first attempt often no-ops; the per-frame
     * sampler then retries via {@link retryHideLeftControllerRay} until it
     * succeeds. Every access is guarded so it never throws.
     */
    private rememberLeftControllerAndHideRay(source: WebXRInputSource): void {
        const handedness =
            (source as any)?.inputSource?.handedness ??
            (source as any)?.motionController?.handedness;
        if (handedness !== "left") {
            return;
        }
        this.leftInputSource = source;
        // Best-effort: the laser mesh may not exist yet, in which case this is a
        // no-op and the per-frame retry takes over.
        this.hideLeftControllerRay();
    }

    /**
     * Per-frame retry hook for {@link hideLeftControllerRay}, called from the
     * render sampler. A no-op once {@link leftRayHidden} is true (the ray has
     * been hidden) or when no left controller has been seen yet
     * ({@link leftInputSource} is null), so it stops retrying as soon as it
     * succeeds and never runs work it doesn't need to.
     */
    private retryHideLeftControllerRay(): void {
        if (this.leftRayHidden || this.leftInputSource === null) {
            return;
        }
        this.hideLeftControllerRay();
    }

    /**
     * Hide the LEFT controller's pointer-selection laser ray and its selection
     * ring — a PERMANENT UX FIX, not a debug aid.
     *
     * The left trigger drives jump, so the left controller's selection ray is
     * misleading; the RIGHT controller keeps its ray for SNA clicks and the
     * Exit XR HUD button.
     *
     * BabylonJS v8 exposes no public per-controller detach for pointer
     * selection, so we reach into the feature's PRIVATE per-controller map to
     * hide just the left controller's meshes:
     *   1. Return early if already hidden or no left controller is known.
     *   2. Resolve the pointer-selection feature via the features manager
     *      ({@link WebXRFeatureName.POINTER_SELECTION}) with a fallback to the
     *      experience's `pointerSelection` property. Return if none.
     *   3. Read the private `_controllers` map; return if absent.
     *   4. Find this left controller's entry — first by its `uniqueId` key, then
     *      by scanning `Object.values(map)` for an entry whose `xrController`
     *      is our left input source.
     *   5. Hide the entry's `laserPointer` and `selectionMesh` (set
     *      `isVisible = false` and call `setEnabled(false)`), then mark
     *      {@link leftRayHidden} true so the per-frame retry stops.
     *
     * Every optional/private access is fully guarded and the whole body is
     * wrapped in try/catch, so it is a safe no-op if the feature, the map, or
     * the entry shape differs from what we expect (e.g. the mocked test
     * environment, which has no `pointerSelection` / `_controllers`).
     */
    private hideLeftControllerRay(): void {
        if (this.leftRayHidden || this.leftInputSource === null) {
            return;
        }
        try {
            // Resolve the pointer-selection feature: prefer the features manager
            // lookup, fall back to the experience's own property.
            const feature =
                (this.getFeaturesManager() as any)?.getEnabledFeature?.(
                    WebXRFeatureName.POINTER_SELECTION
                ) ?? (this.experience as any)?.pointerSelection;
            if (!feature) {
                return;
            }

            // Private per-controller map, keyed by controller uniqueId; each
            // entry holds that controller's laserPointer + selectionMesh.
            const map = (feature as any)._controllers;
            if (!map) {
                return;
            }

            // Find the left controller's entry: by uniqueId key first, then by
            // scanning for the entry whose xrController is our left source.
            const uid = (this.leftInputSource as any)?.uniqueId;
            let entry: any = uid !== undefined ? map[uid] : undefined;
            if (!entry) {
                for (const candidate of Object.values(map)) {
                    if (
                        candidate &&
                        (candidate as any).xrController === this.leftInputSource
                    ) {
                        entry = candidate;
                        break;
                    }
                }
            }
            if (!entry) {
                // Laser mesh / entry not created yet — leave leftRayHidden false
                // so the per-frame retry tries again next frame.
                return;
            }

            // Hide both the laser ray and the selection ring, guarding each.
            for (const mesh of [entry.laserPointer, entry.selectionMesh]) {
                if (mesh) {
                    mesh.isVisible = false;
                    mesh.setEnabled?.(false);
                }
            }
            this.leftRayHidden = true;
        } catch {
            // Never throw from a UX hardening hook (e.g. a mocked test env with
            // an unexpected feature/map shape) — treat as a no-op.
        }
    }

    /**
     * Per-frame retry hook for {@link raiseRightSelectionRingRenderingGroup},
     * called from the render sampler. A no-op once {@link rightRingRaised} is
     * true (the ring/laser have been raised), so it stops retrying as soon as it
     * succeeds. The pointer-selection meshes are created asynchronously after
     * the controllers are added, so this may need to run over the first few
     * frames before the per-controller entries exist.
     */
    private retryRaiseRightSelectionRing(): void {
        if (this.rightRingRaised) {
            return;
        }
        this.raiseRightSelectionRingRenderingGroup();
    }

    /**
     * Raise the pointer-selection meshes' `renderingGroupId` above the HUD plane
     * so the selection ring (and laser) draw ON TOP of the panel.
     *
     * WHY: the debug/options HUD plane draws at `renderingGroupId = 1`, which is
     * higher than the pointer-selection meshes' default group (0). When the
     * RIGHT controller's ray hits a HUD button, the selection ring is drawn
     * behind the panel and the user can't see where they're pointing. Setting
     * the ring + laser to group 2 (HIGHER than the HUD's 1) makes them render
     * over the HUD.
     *
     * BabylonJS v8 exposes the per-controller `laserPointer` / `selectionMesh`
     * only through the pointer-selection feature's PRIVATE `_controllers` map
     * (same access pattern as {@link hideLeftControllerRay}). The simplest
     * robust approach is to iterate ALL entries and raise both meshes to group 2
     * when present — the LEFT controller's meshes are hidden anyway
     * (`isVisible = false`), so raising its group is harmless. We only mark
     * {@link rightRingRaised} true once at least one entry was actually raised,
     * so the per-frame retry keeps trying until the meshes exist.
     *
     * Every optional/private access is fully guarded and the whole body is
     * wrapped in try/catch, so it is a safe no-op if the feature, the map, or
     * the entry shape differs from what we expect (e.g. the mocked test env).
     */
    private raiseRightSelectionRingRenderingGroup(): void {
        if (this.rightRingRaised) {
            return;
        }
        try {
            const feature =
                (this.getFeaturesManager() as any)?.getEnabledFeature?.(
                    WebXRFeatureName.POINTER_SELECTION
                ) ?? (this.experience as any)?.pointerSelection;
            if (!feature) {
                return;
            }

            const map = (feature as any)._controllers;
            if (!map) {
                return;
            }

            // Group HIGHER than the HUD plane's 1, so the ring/laser draw on top.
            const RING_RENDERING_GROUP = 2;

            let raisedAny = false;
            for (const entry of Object.values(map)) {
                if (!entry) {
                    continue;
                }
                const e = entry as any;
                for (const mesh of [e.selectionMesh, e.laserPointer]) {
                    if (mesh) {
                        mesh.renderingGroupId = RING_RENDERING_GROUP;
                        raisedAny = true;
                    }
                }
            }

            if (raisedAny) {
                // At least one controller's meshes were raised — stop retrying.
                this.rightRingRaised = true;
            }
        } catch {
            // Never throw from a UX hardening hook (e.g. a mocked test env with
            // an unexpected feature/map shape) — treat as a no-op.
        }
    }

    /**
     * Register the per-frame stick sampler on `scene.onBeforeRenderObservable`.
     * Idempotent: if a sampler is already registered it is left in place. The
     * observer is detached on session end (Requirement 9.4).
     */
    private startStickSampler(): void {
        if (this.renderObserver !== null) {
            return;
        }
        const scene = this.vishva.scene;
        this.renderObserver = scene.onBeforeRenderObservable.add(() => {
            // Order matters: sample the sticks FIRST so the CharacterController
            // moves/orbits the desktop ArcRotateCamera this frame, THEN copy that
            // freshly-updated transform onto the (rendered) WebXR camera. Doing
            // it in this order keeps the headset view following/orbiting the
            // avatar within the same frame rather than one frame behind.
            this.sampleSticks();
            // Place/position the HUD panel FIRST, from the TRUE head pose, BEFORE
            // updateXRCameraFollow overwrites the XR camera. WHY the ordering
            // matters: updateXRCameraFollow calls
            // setTransformationFromNonVRCamera(arcCamera, true), which OVERWRITES
            // the WebXR camera transform with the grounded ArcRotateCamera follow
            // pose (position.y forced toward 0). positionPlaneInFront reads the
            // head pose from the rig/base camera, so if placement ran AFTER the
            // follow copy it would anchor to that grounded pose → the panel sits
            // low and appears to "move down" on entry, decoupled from the true
            // head height. Running placement here — before the follow copy — lets
            // it read the frame's real head pose (the XR system updates the rig
            // each frame from the device; the follow copy is what clobbers it).
            //
            // Head-lock the panel by placing + orienting it from the live camera
            // pose. Per-frame head-locking runs ONLY in DEBUG mode; the OPTIONS
            // panel is world-locked (placed once when summoned, then left fixed).
            // Skip when the HUD is hidden to save work; the method's own guards
            // handle the null/absent-camera cases.
            if (this.diagVisible && this.hudMode === "debug") {
                this.updateDiagHudPlacement();
            }
            // One-time world-lock of the OPTIONS panel. applyHudMode sets
            // optionsPlacementPending on entering options mode instead of placing
            // synchronously; the render loop then places the panel ONCE on the
            // first frame that yields a valid head pose and clears the flag to
            // freeze it world-locked. positionPlaneInFront records
            // diagPlacementSrc = "none" when no usable/finite pose was obtained,
            // so we only clear pending on a real placement. Guarded on diagPlane
            // + inXR so it's a safe no-op in the mocked test env (plane null →
            // skipped; src stays "none" → pending harmlessly persists). This
            // ALSO runs before updateXRCameraFollow for the same reason as the
            // debug block above: it must read the true head pose, not the
            // grounded follow pose.
            //
            // NOTE: There is a known, not-yet-root-caused issue where placing the
            // panel against the head pose at/just-after XR entry grounds it low
            // (the pose reads grounded / y≈0 right after entry). The mitigation
            // is that the HUD starts hidden and is only shown on Y-press (settled
            // pose), so this single deferred placement works. TODO: root-cause
            // why the immediate post-entry head pose reads grounded (suspected
            // interaction with updateXRCameraFollow's
            // setTransformationFromNonVRCamera grounding the base camera, plus
            // rig-pose settling timing).
            if (
                this.diagVisible &&
                this.hudMode === "options" &&
                this.optionsPlacementPending &&
                this.diagPlane !== null &&
                this.inXR
            ) {
                this.placeOptionsPanelInFront();
                if (this.diagPlacementSrc !== "none") {
                    this.optionsPlacementPending = false;
                }
            }
            // THEN copy the freshly-updated ArcRotateCamera transform onto the
            // (rendered) WebXR camera. Sampling the sticks first and copying here
            // keeps the headset view following/orbiting the avatar within the
            // same frame rather than one frame behind. This overwrites the XR
            // camera pose, which is why the HUD placement above runs first.
            this.updateXRCameraFollow();
            // Retry hiding the LEFT controller's selection ray until it succeeds.
            // The laser mesh is created asynchronously after the controller is
            // added, so the initial hide attempts (on add / motion-controller
            // init) may find no mesh yet; keep retrying each frame until the per-
            // controller pointer entry is found and hidden.
            this.retryHideLeftControllerRay();
            // Raise the RIGHT controller's selection ring/laser above the HUD
            // plane so the pick circle is visible over the panel buttons. Like
            // the ray-hide, the meshes are created asynchronously, so retry each
            // frame until they exist and are raised.
            this.retryRaiseRightSelectionRing();
        });
    }

    /**
     * Detach the per-frame stick sampler. Safe to call when none is registered.
     */
    private stopStickSampler(): void {
        if (this.renderObserver === null) {
            return;
        }
        this.vishva.scene.onBeforeRenderObservable.remove(this.renderObserver);
        this.renderObserver = null;
    }

    /**
     * Sample the bound thumbsticks and edge-trigger the CharacterController.
     *
     * Runs every frame while a session is active. It:
     *   1. Reads the left stick axes (translation) and the right stick axes
     *      (camera orbit), defaulting missing sticks/axes to 0.
     *   2. Maps the LEFT axes to a {@link MoveIntent} via the pure
     *      `mapSticksToIntent`, applying the deadzone.
     *   3. For each translation action whose boolean changed vs the previous
     *      frame, calls the matching CharacterController method with the new
     *      value. The CC methods are only invoked on change (false→true /
     *      true→false), never every frame.
     *   4. Applies the RIGHT stick directly to the follow ArcRotateCamera's
     *      alpha/beta orbit via {@link applyCameraOrbit} (no CC involvement).
     *
     * A no-op when not in session or when there is no CharacterController (an
     * avatar-less world).
     */
    private sampleSticks(): void {
        if (!this.inXR) {
            return;
        }
        const cc = this.vishva.avManager?.cc;
        if (!cc) {
            return;
        }

        const leftAxes = this.leftStick?.axes;
        const rightAxes = this.rightStick?.axes;

        // Capture the exact raw values sampled this frame so the debug HUD shows
        // what was actually fed into the intent mapping.
        const leftX = leftAxes?.x ?? 0;
        const leftY = leftAxes?.y ?? 0;
        const rightX = rightAxes?.x ?? 0;
        const rightY = rightAxes?.y ?? 0;

        // The pure mapper is LEFT-stick only now — it produces the translation
        // intent (walk/strafe). The RIGHT stick is applied directly below.
        const intent = mapSticksToIntent(
            {
                leftX,
                leftY,
            },
            this.stickDeadzone
        );

        // HOLD-to-go-fast: while the LEFT thumbstick is clicked, the active
        // movement direction runs its fast variant. The fast decision lives
        // entirely here in the manager (mapSticksToIntent is unaware of it).
        const fast = this.leftStick?.pressed === true;

        this.applyIntent(cc, intent, fast);

        // RIGHT-stick camera ORBIT: adjust the follow ArcRotateCamera's
        // alpha/beta directly (NOT a CC action). Both axes act simultaneously
        // (no dominant-axis gating). The avatar is NOT rotated — the stick only
        // moves the camera.
        this.applyCameraOrbit(rightX, rightY);

        // RIGHT B/A CONTINUOUS DOLLY: while a RIGHT face button is HELD, dolly
        // the follow ArcRotateCamera's radius each frame (B toward the avatar,
        // A away). Sampled here every frame like the thumbstick orbit above.
        this.applyButtonDolly();

        // TEMPORARY DEBUG DIAGNOSTICS: refresh the in-headset HUD with the raw
        // axes and derived intent sampled this frame — only while the HUD panel
        // is shown AND debug is enabled, so the (relatively expensive)
        // diagnostic computation + text build never runs when debug is off or
        // the panel is hidden. Movement logic above is NOT gated on either.
        if (this.diagVisible && this.debugEnabled) {
            this.updateDiagHud(intent, { leftX, leftY, rightX, rightY });
        }
    }

    /**
     * Edge-trigger the CharacterController from a freshly-computed MoveIntent
     * plus a `fast` (run) flag, diffing against {@link lastIntent} /
     * {@link lastFast}. Only actions whose (active, fast) state changed are
     * pushed to the CC, then the intent + fast flag become the new baseline.
     *
     * FAST (hold-to-go-fast) MODEL: each of the four LEFT-stick movement
     * directions has a NORMAL method and a FAST method:
     *   - walk        → run           (fast forward)
     *   - walkBack    → walkBackFast
     *   - strafeLeft  → strafeLeftFast
     *   - strafeRight → strafeRightFast
     * For each direction, {@link applyMovementDirection} emits the minimal
     * correct on/off calls when the (active, fast) pair changes, so switching
     * normal↔fast for the SAME direction cleanly stops the old CC method and
     * starts the new one (never both on at once).
     *
     * The RIGHT stick is no longer part of the intent: it orbits the camera
     * directly (see {@link applyCameraOrbit}), so there is no turn edge-trigger
     * here anymore.
     */
    private applyIntent(cc: any, intent: MoveIntent, fast: boolean): void {
        const prev = this.lastIntent;
        const wasFast = this.lastFast;

        // Four LEFT-stick movement directions, each with its normal + fast CC
        // method. Emit the minimal correct calls per direction.
        this.applyMovementDirection(
            (b: boolean) => cc.walk?.(b),
            (b: boolean) => cc.run?.(b),
            prev.walk,
            wasFast,
            intent.walk,
            fast
        );
        this.applyMovementDirection(
            (b: boolean) => cc.walkBack?.(b),
            (b: boolean) => cc.walkBackFast?.(b),
            prev.walkBack,
            wasFast,
            intent.walkBack,
            fast
        );
        this.applyMovementDirection(
            (b: boolean) => cc.strafeLeft?.(b),
            (b: boolean) => cc.strafeLeftFast?.(b),
            prev.strafeLeft,
            wasFast,
            intent.strafeLeft,
            fast
        );
        this.applyMovementDirection(
            (b: boolean) => cc.strafeRight?.(b),
            (b: boolean) => cc.strafeRightFast?.(b),
            prev.strafeRight,
            wasFast,
            intent.strafeRight,
            fast
        );

        this.lastIntent = intent;
        this.lastFast = fast;
    }

    /**
     * Apply the RIGHT-stick camera ORBIT to the follow ArcRotateCamera's
     * `alpha` (orbit around) and `beta` (orbit up/down) each frame.
     *
     * DOMINANT-AXIS gating: only ONE of alpha OR beta changes per frame, chosen
     * by the larger RAW axis magnitude — mirroring the LEFT stick's rule. This
     * prevents a simultaneous two-axis orbit (moving alpha and beta together on
     * a diagonal push), which is nausea-inducing. Ties resolve to X (alpha),
     * matching the left-stick convention (`>=`). Each axis is still deadzoned
     * (`|v| <= stickDeadzone` → treated as 0), and the deadzone gates the
     * winner: a dominant-but-tiny axis (within the deadzone) does nothing. The
     * motion is analog: the rate is scaled by the raw axis magnitude, so a
     * gentle push orbits slowly and a full push orbits fast.
     *
     * Sign conventions:
     *   - X (`rightX`): `alpha += alphaRate * rightX`. Positive X orbits one
     *     way; if it feels reversed on-device, flip the sign here (one line).
     *   - Y (`rightY`): WebXR stick Y is NEGATIVE when pushed forward. Forward
     *     should swing the camera UP = DECREASE beta. `beta += betaRate *
     *     rightY` does exactly that: rightY < 0 (forward) decreases beta, rightY
     *     > 0 (back) increases it. `beta` is then clamped via {@link clampBeta}.
     *
     * After changing alpha/beta the arc camera's world matrix is recomputed so
     * `.position` (and its Y, read by {@link updateXRCameraFollow}) is current
     * THIS frame. The avatar is NOT rotated by this — the stick only moves the
     * camera. Fully guarded: a missing arc camera, non-numeric alpha/beta, or a
     * mocked test env (no `computeWorldMatrix`) is a safe no-op.
     */
    private applyCameraOrbit(rightX: number, rightY: number): void {
        try {
            const arc: any = this.vishva.arcCamera;
            if (!arc) {
                return;
            }

            const dz = this.stickDeadzone;
            // Per-axis deadzone, then DOMINANT-AXIS gating (one of alpha vs beta
            // per frame). See the method doc: ties resolve to X (alpha).
            const x = Math.abs(rightX) > dz ? rightX : 0;
            const y = Math.abs(rightY) > dz ? rightY : 0;

            // Orbit rates (radians per frame at full stick deflection). Analog:
            // scaled by the raw axis value for finer control. Sourced from the
            // user-tunable instance fields (set live by the OPTIONS HUD sliders
            // and persisted to localStorage); default to DEFAULT_ALPHA_RATE /
            // DEFAULT_BETA_RATE.
            const alphaRate = this.alphaRate;
            const betaRate = this.betaRate;

            // Pick ONE axis by larger RAW magnitude; ties (>=) go to X (alpha).
            if (Math.abs(rightX) >= Math.abs(rightY)) {
                // X dominates → apply ONLY alpha (leave beta untouched). The
                // deadzoned `x` gates it, so a dominant-but-tiny push does
                // nothing. Positive X orbits one way; flip the sign if reversed
                // on-device.
                if (typeof arc.alpha === "number" && x !== 0) {
                    arc.alpha += alphaRate * x;
                }
            } else {
                // Y dominates → apply ONLY beta (leave alpha untouched). Forward
                // (y < 0) decreases beta (camera swings up); back (y > 0)
                // increases it. Analog via the raw axis value, then clamp. The
                // deadzoned `y` gates it.
                if (typeof arc.beta === "number" && y !== 0) {
                    arc.beta += betaRate * y;
                    this.clampBeta();
                }
            }

            // Recompute so the arc position (and its Y, used by the follow copy)
            // reflects the new alpha/beta this frame. Guarded for the mock env.
            if (typeof arc.computeWorldMatrix === "function") {
                arc.computeWorldMatrix(true);
            }
        } catch {
            // Never throw from the per-frame sampler over a mocked/odd camera.
        }
    }

    /**
     * Emit the minimal correct on/off CC calls for a SINGLE movement direction
     * whose (active, fast) state may have changed between frames.
     *
     * A direction is modelled as two mutually-exclusive methods: `normal` and
     * `fast`. The effective state is:
     *   - inactive             → neither method on
     *   - active + not fast     → normal on
     *   - active + fast         → fast on
     *
     * Given the previous state (`wasActive`, `wasFast`) and the current state
     * (`isActive`, `isFast`), this turns OFF whichever method was on if it is no
     * longer the desired one, and turns ON the desired method if it is not
     * already on. Concretely:
     *   - active→inactive: turn off the previously-on method (per `wasFast`).
     *   - inactive→active: turn on the desired method (per `isFast`).
     *   - active→active with the fast flag flipped: turn off the previous-speed
     *     method and turn on the new-speed method.
     *   - active→active with the fast flag unchanged: no calls (already correct,
     *     edge-triggered).
     */
    private applyMovementDirection(
        normal: (b: boolean) => void,
        fast: (b: boolean) => void,
        wasActive: boolean,
        wasFast: boolean,
        isActive: boolean,
        isFast: boolean
    ): void {
        // Which method (if any) was ON before, and which should be ON now.
        const prevOn: "none" | "normal" | "fast" = !wasActive
            ? "none"
            : wasFast
            ? "fast"
            : "normal";
        const nextOn: "none" | "normal" | "fast" = !isActive
            ? "none"
            : isFast
            ? "fast"
            : "normal";

        if (prevOn === nextOn) {
            // No change — already in the correct state (edge-triggered).
            return;
        }

        // Turn OFF the previously-on method, if any.
        if (prevOn === "normal") normal(false);
        else if (prevOn === "fast") fast(false);

        // Turn ON the newly-desired method, if any.
        if (nextOn === "normal") normal(true);
        else if (nextOn === "fast") fast(true);
    }

    /**
     * The active session's WebXR camera (the camera actually rendered to the
     * headset), or null when there is no experience yet. This is the camera we
     * must drive to make the headset view follow the avatar — the desktop
     * ArcRotateCamera the CharacterController updates is NOT the rendered camera
     * during a session.
     */
    private getXRCamera(): Nullable<WebXRCamera> {
        return this.experience?.baseExperience?.camera ?? null;
    }

    /**
     * Copy the desktop ArcRotateCamera's transform onto the rendered WebXR
     * camera each frame so the headset view follows and orbits the avatar.
     *
     * WHY this exists: the CharacterController drives `vishva.arcCamera` to
     * follow/orbit the avatar (the desktop editor camera). But during an XR
     * session the ACTIVE, rendered camera is the WebXR camera — not the
     * ArcRotateCamera — so the CC's follow/orbit never reaches the headset on
     * its own. Rather than reimplement the CC's (already-correct) follow math,
     * we mirror the ArcRotateCamera's resulting transform onto the XR camera.
     *
     * HOW: BabylonJS's `WebXRCamera.setTransformationFromNonVRCamera(other,
     * resetToBaseReferenceSpace)` decomposes `other`'s world matrix into the XR
     * camera's position + rotation, then FORCES `position.y = 0` and rebuilds
     * the rotation from the Y-euler (yaw) ONLY — pitch/roll are dropped because
     * the headset owns those. That yaw-only + grounded-Y behavior is exactly the
     * follow-and-heading we want: the ArcRotateCamera supplies where to be and
     * which way to face, while the headset keeps controlling look pitch/roll and
     * true head height.
     *
     * HEIGHT (via beta): because the copy forces `position.y = 0` every frame,
     * the arc (follow) camera's ACTUAL Y — which reflects its `beta` polar angle
     * — is copied onto the XR camera's Y AFTER the copy on EVERY frame,
     * otherwise the height would be zeroed each frame. The RIGHT thumbstick
     * changes `alpha`/`beta` (see {@link applyCameraOrbit}) to orbit the camera,
     * and this copy propagates the resulting height into XR.
     *
     * This mirrors the ArcRotateCamera's transform onto the WebXR camera EVERY
     * frame. An earlier per-frame gate (only re-sync when the ArcRotateCamera
     * pose changed) was added to avoid a head-rotation wobble, but that wobble
     * was actually caused by CharacterController camera elasticity (now disabled
     * while the HUD is shown), not by the per-frame re-base. The gate never
     * fixed the wobble and it caused an empty-world dolly bug. The unconditional
     * per-frame copy is simpler and also fixes the dolly case: a radius change
     * is always reflected without any special handling.
     *
     * Defensively guarded so it never throws: a no-op when not in session, when
     * the experience / XR camera is unavailable, when the editor camera is
     * missing, or when the method itself is absent (e.g. in the mocked test
     * environment where the fake camera may not provide it). Because it rides on
     * the same render observer detached in `onSessionEnd`, no extra teardown is
     * needed — and the `!this.inXR` guard makes any stray post-exit tick inert.
     */
    private updateXRCameraFollow(): void {
        if (!this.inXR) {
            return;
        }
        const xrCamera = this.getXRCamera();
        const arcCamera = this.vishva.arcCamera;
        if (!xrCamera || !arcCamera) {
            return;
        }
        // Optional-chain the method itself so an XR camera stub without it (test
        // env) is a safe no-op rather than a throw.
        xrCamera.setTransformationFromNonVRCamera?.(arcCamera, true);
        // Copy the arc (follow) camera's ACTUAL Y onto the XR camera EACH FRAME:
        // the copy above passes `true` for `forceRefresh`, which forces the XR
        // camera's position.y to 0, so without this the height (driven by the
        // arc camera's beta) would be wiped every frame. Guarded for the mocked
        // test env (fake XR / arc camera may have no position).
        const arcY = (arcCamera as any)?.position?.y;
        if (
            xrCamera.position &&
            typeof xrCamera.position.y === "number" &&
            typeof arcY === "number"
        ) {
            xrCamera.position.y = arcY;
        }
    }

    /**
     * Push a neutral intent so any currently-active stick action is stopped on
     * the CharacterController. Called on session end so a mid-move exit does not
     * leave the avatar walking/turning on the desktop.
     */
    private stopAllMovement(): void {
        const cc = this.vishva.avManager?.cc;
        if (cc) {
            // Apply a neutral intent with fast=false through the same path so
            // whichever method was on (normal OR fast) gets its off call, and
            // the fast baseline is cleared to false.
            this.applyIntent(cc, neutralMoveIntent(), false);
        }
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
     * Toggle the LEFT X-button "dolly to avatar" state on the follow
     * ArcRotateCamera.
     *
     * On each rising-edge press this flips between two states:
     *   - NOT dollied-in-by-X → remember the current radius in
     *     {@link xDollySavedRadius}, set {@link xDollyActive} true, and snap the
     *     radius to `lowerRadiusLimit` (fall back to 0 when no limit is set) —
     *     moving the camera all the way in to the avatar, as if fully dollied
     *     forward. Whether that yields first-person is the CharacterController's
     *     decision (radius + setNoFirstPerson); we only move the radius.
     *   - Dollied-in-by-X → restore the radius to the REMEMBERED value (the one
     *     captured at press time, not a fixed default), clear
     *     {@link xDollyActive}, and forget the saved value.
     *
     * Fully guarded: a no-op when there is no arc camera or when `.radius` is
     * not a number (e.g. the mocked test env's `{ name: "Editor_Camera" }`
     * fake), so it never throws.
     */
    private toggleXDolly(): void {
        try {
            const arc: any = this.vishva.arcCamera;
            if (!arc || typeof arc.radius !== "number") {
                // No usable follow camera radius — guarded no-op.
                return;
            }

            if (!this.xDollyActive) {
                // Dolly in: remember the current radius, then snap to the avatar.
                this.xDollySavedRadius = arc.radius;
                this.xDollyActive = true;
                arc.radius =
                    typeof arc.lowerRadiusLimit === "number"
                        ? arc.lowerRadiusLimit
                        : 0;
            } else {
                // Restore: put the radius back to the value captured at press.
                if (typeof this.xDollySavedRadius === "number") {
                    arc.radius = this.xDollySavedRadius;
                }
                this.xDollyActive = false;
                this.xDollySavedRadius = null;
            }
        } catch {
            // Never throw from a button handler over a mocked/odd camera.
        }
    }

    /**
     * Legacy point-to-move select router. This is NO LONGER wired into the
     * active locomotion flow — stick locomotion has replaced point-to-move as
     * the third-person movement mechanism, so no controller select is routed
     * here during a session. The method is retained (and still unit-tested for
     * its pick-guard contract) as a reusable helper, but it is not the movement
     * path anymore.
     *
     * When invoked in Third_Person_Mode with a valid pick point it drives the
     * avatar there via Vishva's shared click-to-move (`moveAvatarTo`), which
     * places the marker and calls `CharacterController.moveTo`. A null/undefined
     * pick issues no move. SNA click behaviour is unaffected either way: it
     * fires through scene picking regardless of locomotion mode.
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
        // Capture whether the CC currently has turning OFF so it can be restored
        // exactly on exit. During the session turning is forced ON (see below)
        // so the right thumbstick can rotate the avatar.
        const ccTurningOff =
            typeof cc.isTurningOff === "function" ? cc.isTurningOff() : false;

        // There is no public getter for the CC's running state; infer it from
        // whether keyboard input was enabled (desktop avatar control implies a
        // started, keyboard-driven CC). Restoration re-runs start()/enableKeyBoard
        // with this recorded value, which is idempotent when already applied.
        //
        // NOTE: entering XR does NOT touch camera elasticity. Elasticity is now
        // toggled with the debug HUD's visibility (see
        // disableCameraElasticityForHud / restoreCameraElasticityAfterHud),
        // because it is the HUD plane that obstructs the CC's camera ray.
        this.controllerSnapshot = {
            ccStarted: ccKeyboardEnabled,
            ccKeyboardEnabled,
            ccTurningOff,
        };

        // Disable ONLY keyboard-driven desktop locomotion so window key events
        // don't double-drive the avatar while the XR sticks own movement. The
        // CharacterController itself is kept RUNNING (start(), not stop()) so it
        // continues to drive movement, animation, ground-following and the
        // avatar-coupled camera in response to the stick-triggered walk/turn
        // calls (behavior c / Requirement 9.3). start() is idempotent.
        cc.enableKeyBoard?.(false);
        cc.start?.();
        // Force turning ON for the duration of the session so the right
        // thumbstick can rotate the avatar even if the user had turning off on
        // the desktop. The prior value is restored on exit.
        cc.setTurningOff?.(false);
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
        // Restore the turning-off state the CC had before the session (turning
        // was forced ON while in XR — see disableDesktopController).
        cc.setTurningOff?.(snapshot.ccTurningOff);
    }

    /** Look up the SSAO2 pipeline by its registered name, or null if absent. */
    private getSSAOPipeline(): Nullable<SSAO2RenderingPipeline> {
        const manager = this.vishva.scene.postProcessRenderPipelineManager;
        const pipeline = manager.supportedPipelines.find(
            (p) => p.name === SSAO_PIPELINE_NAME
        );
        return (pipeline as SSAO2RenderingPipeline) ?? null;
    }

    /* =====================================================================
     * TEMPORARY DEBUG DIAGNOSTICS — IN-HEADSET HUD
     *
     * Everything below (createDiagHud / updateDiagHud / disposeDiagHud) exists
     * ONLY to diagnose the intermittent left-thumbstick strafe bug on the Quest
     * 3, where console logs are not visible. A world-space babylonjs-gui plane
     * (ADT-textured mesh parented to the WebXR camera ~2m ahead) renders in the
     * headset and follows the view, so the raw sampled axes and the derived
     * MoveIntent can be observed live. A fullscreen ADT was tried first but
     * renders at zero depth per-eye and cannot be focused on in VR — hence the
     * plane.
     *
     * This is a debug aid, NOT production behaviour. Remove this whole block,
     * the babylonjs-gui import, the diag* fields, and the createDiagHud() /
     * updateDiagHud() / disposeDiagHud() call sites once the axis bug is fixed.
     *
     * Every babylonjs-gui call and optional field access here is defensively
     * guarded so the HUD never throws — in particular so it silently no-ops in
     * the node test environment (where babylonjs is mocked and GUI construction
     * may not behave like a real browser).
     * =================================================================== */

    /**
     * Create the diagnostic HUD as a world-space plane textured with a GUI ADT.
     *
     * The plane hosts TWO mutually-exclusive modes (see {@link hudMode}): a
     * WORLD-LOCKED options panel (placed once in front of the viewer via
     * {@link placeOptionsPanelInFront}) and a HEAD-LOCKED debug readout
     * (repositioned each frame via {@link updateDiagHudPlacement}). It is a
     * top-level scene mesh sitting at a focusable depth inside the headset (a
     * fullscreen ADT renders at zero depth per-eye and cannot be focused on in
     * VR). It draws on top (renderingGroupId 1). It is PICKABLE (unlike a plain
     * overlay) because it hosts clickable GUI buttons (Exit XR / Debug / Close)
     * that the XR pointer ray must be able to hit in both modes.
     *
     * Idempotent: a no-op when the HUD already exists. The whole body is wrapped
     * in a try/catch so a failure to construct the plane/GUI (e.g. under the
     * mocked test environment) silently leaves the HUD absent rather than
     * throwing — the HUD is a debug aid and must never affect session behaviour.
     */
    /**
     * Flip the HUD options panel's visibility.
     *
     * Bound to the LEFT controller's "y-button" (see
     * {@link bindLeftControllerButtons}). The panel now starts HIDDEN on session
     * entry, so the first y-button press SHOWS it and the next hides it again.
     * Toggles {@link diagVisible} and shows or hides the HUD plane accordingly.
     *
     * The show/hide ordering is deliberate to avoid a camera spring-forward
     * glitch: the pickable HUD plane obstructs the CharacterController's
     * per-frame camera-obstruction ray. When HIDING we FIRST make the plane
     * non-pickable and disable it (fully removing it from the obstruction path),
     * THEN restore elasticity — otherwise re-enabling elasticity while the plane
     * is still in the ray lurches the camera forward. When SHOWING we enable +
     * re-pick the plane (so the Exit/Debug buttons remain clickable) BEFORE
     * disabling elasticity. Every access is guarded so it never throws when the
     * plane was never created (e.g. mocked test environment).
     */
    /**
     * TEMPORARY DEBUG DIAGNOSTICS: disable the CharacterController's camera
     * elasticity/springback while the debug HUD is shown.
     *
     * WHY: the debug HUD plane is pickable and sits between the follow camera
     * and the avatar, so it obstructs the CC's per-frame camera-obstruction ray.
     * That makes the CC's elasticity spring pull the XR camera forward (a
     * visible back-and-forth jerk). Disabling elasticity only while the HUD is
     * visible removes the jerk without permanently altering the CC. Idempotent
     * and fully guarded so the mocked test env never throws. Remove together
     * with the rest of the debug HUD.
     */
    private disableCameraElasticityForHud(): void {
        // Already disabled (snapshot held) — nothing to do (idempotent).
        if (this.hudElasticitySnapshot !== null) {
            return;
        }
        const cc = this.vishva.avManager?.cc;
        if (!cc) {
            return;
        }
        // Capture the current elasticity/springback so it can be restored when
        // the HUD is hidden or the session ends.
        const settings = cc.getSettings?.();
        const elastic = settings?.cameraElastic ?? false;
        const springback =
            typeof cc.isCameraElasticSpringback === "function"
                ? cc.isCameraElasticSpringback()
                : settings?.springback ?? false;
        this.hudElasticitySnapshot = { elastic, springback };

        // Disable the per-frame camera-radius spring while the HUD obstructs the
        // camera ray (guarded — the CC / mocked env may lack these methods).
        cc.setCameraElasticity?.(false);
        cc.setCameraElasticSpringback?.(false);
    }

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: restore the CC's camera elasticity/springback
     * captured in {@link disableCameraElasticityForHud} once the debug HUD is
     * hidden (or the session ends). A no-op when no state was captured. Fully
     * guarded so the mocked test env never throws. Remove with the rest of the
     * debug HUD.
     */
    private restoreCameraElasticityAfterHud(): void {
        // Nothing captured — HUD wasn't disabling elasticity.
        if (this.hudElasticitySnapshot === null) {
            return;
        }
        const cc = this.vishva.avManager?.cc;
        if (cc) {
            cc.setCameraElasticity?.(this.hudElasticitySnapshot.elastic);
            cc.setCameraElasticSpringback?.(this.hudElasticitySnapshot.springback);
        }
        this.hudElasticitySnapshot = null;
    }

    private toggleDiagHud(): void {
        // Elasticity is disabled exactly while the HUD options panel is visible
        // (the pickable HUD plane obstructs the CC's camera-obstruction ray).
        //
        // HIDE ordering matters: re-enabling elasticity while the plane is still
        // enabled/pickable lets the CC obstruction ray hit the plane and spring
        // the camera forward (a visible lurch). So when HIDING we FIRST fully
        // remove the plane from the obstruction path (non-pickable + disabled),
        // THEN restore elasticity. When SHOWING we enable + re-pick the plane
        // (so the Exit/Debug buttons work) BEFORE disabling elasticity.
        if (this.diagVisible) {
            // Was visible → hide.
            this.diagVisible = false;
            if (this.diagPlane) {
                this.diagPlane.isPickable = false;
                this.diagPlane.setEnabled?.(false);
            }
            this.restoreCameraElasticityAfterHud();
            // Leave hudMode as-is; the next show resets it to "options".
        } else {
            // Was hidden → show. Always return to OPTIONS mode and re-summon the
            // panel world-locked in front of the current view.
            this.hudMode = "options";
            this.diagVisible = true;
            if (this.diagPlane) {
                this.diagPlane.setEnabled?.(true);
                this.diagPlane.isPickable = true;
            }
            this.disableCameraElasticityForHud();
            // Apply the options mode: show the options controls, hide Close/text,
            // and world-lock the panel in front of the viewer now.
            this.applyHudMode();
        }
    }

    /**
     * Apply the current {@link hudMode} to the shared HUD plane/ADT: toggle
     * which controls + text are shown and manage the placement model.
     *
     * - `"options"`: show Exit XR + Debug buttons, hide the Close button, clear
     *   the diagnostic text, turn debug computation OFF, and DEFER the one-time
     *   world-lock by setting {@link optionsPlacementPending} true. The render
     *   loop then places the panel (via {@link placeOptionsPanelInFront}) on the
     *   first frame with a valid head pose, avoiding a stale-pose placement at
     *   session start. The reusable options surface.
     * - `"debug"`: hide Exit XR + Debug, show the Close button, turn debug
     *   computation ON (so sampleSticks builds the diagnostic text), and leave
     *   placement to the per-frame head-lock (which runs because
     *   `hudMode === "debug"`).
     *
     * `this.debugEnabled` is set BEFORE any GUI reference is touched so it takes
     * effect even in the mocked test env where all button refs are null (the
     * control-visibility flips and placement then no-op safely). Every access is
     * guarded so this never throws when the HUD/GUI was never built.
     */
    private applyHudMode(): void {
        if (this.hudMode === "debug") {
            // Debug computation ON first (plain field write — works even when
            // refs are null in the mocked env).
            this.debugEnabled = true;
            // Hide options controls, show Close.
            if (this.exitBtnRef) {
                this.exitBtnRef.isVisible = false;
            }
            if (this.debugBtnRef) {
                this.debugBtnRef.isVisible = false;
            }
            if (this.closeBtnRef) {
                this.closeBtnRef.isVisible = true;
            }
            // Hide the OPTIONS-mode sensitivity sliders + labels (mutually
            // exclusive with the debug readout). Guarded — null in mocked env.
            this.setSensitivitySlidersVisible(false);
            // Placement is handled by the per-frame head-lock in the render
            // observer (runs because hudMode === "debug").
        } else {
            // OPTIONS mode: debug computation OFF first.
            this.debugEnabled = false;
            // Clear any stale diagnostic text so it doesn't linger on the panel.
            if (this.diagText) {
                this.diagText.text = "";
            }
            // Show options controls, hide Close.
            if (this.exitBtnRef) {
                this.exitBtnRef.isVisible = true;
            }
            if (this.debugBtnRef) {
                this.debugBtnRef.isVisible = true;
            }
            if (this.closeBtnRef) {
                this.closeBtnRef.isVisible = false;
            }
            // Show the sensitivity sliders and re-sync their values + labels from
            // the current fields (in case localStorage / another session changed
            // them since the sliders were built). Guarded — null in mocked env.
            this.syncSensitivitySlidersFromFields();
            this.setSensitivitySlidersVisible(true);
            // Defer the one-time world-lock to the next valid-pose render frame
            // instead of placing NOW. The render loop places the panel once and
            // clears the pending flag. Because the HUD is only shown on Y-press
            // (settled pose), a single deferred placement is enough.
            this.optionsPlacementPending = true;
        }
    }

    /**
     * Show or hide the three OPTIONS-mode sensitivity sliders and their labels
     * together. Every ref access is guarded so this is a safe no-op when the
     * GUI was never built (mocked test env → all refs null).
     */
    private setSensitivitySlidersVisible(visible: boolean): void {
        if (this.alphaSliderRef) this.alphaSliderRef.isVisible = visible;
        if (this.betaSliderRef) this.betaSliderRef.isVisible = visible;
        if (this.radiusSliderRef) this.radiusSliderRef.isVisible = visible;
        if (this.alphaLabelRef) this.alphaLabelRef.isVisible = visible;
        if (this.betaLabelRef) this.betaLabelRef.isVisible = visible;
        if (this.radiusLabelRef) this.radiusLabelRef.isVisible = visible;
    }

    /**
     * Re-sync each sensitivity slider's `.value` and its label text from the
     * current instance-field rate, so the OPTIONS panel reflects any value
     * changed via localStorage or another session when it is (re-)shown. Guarded
     * per ref (null in the mocked env). Setting `.value` fires the slider's
     * onValueChanged handler, which re-writes the same field and re-persists —
     * a harmless round-trip.
     */
    private syncSensitivitySlidersFromFields(): void {
        if (this.alphaSliderRef) this.alphaSliderRef.value = this.alphaRate;
        if (this.betaSliderRef) this.betaSliderRef.value = this.betaRate;
        if (this.radiusSliderRef) this.radiusSliderRef.value = this.radiusRate;
        if (this.alphaLabelRef) this.alphaLabelRef.text = `alpha: ${this.alphaRate.toFixed(4)}`;
        if (this.betaLabelRef) this.betaLabelRef.text = `beta: ${this.betaRate.toFixed(4)}`;
        if (this.radiusLabelRef) this.radiusLabelRef.text = `radius: ${this.radiusRate.toFixed(4)}`;
    }

    private createDiagHud(): void {
        if (this.diagPlane !== null || this.diagTexture !== null) {
            return;
        }
        try {
            // A world-space plane hosts the HUD so it renders at a focusable
            // depth in VR. Sized in meters (1.4 x 1.4) — a comfortable panel
            // head-locked ahead of the viewer (placement handled per-frame).
            // DOUBLESIDE so the text is visible regardless of which face ends up
            // toward the viewer, which also makes the per-frame lookAt facing
            // direction ambiguity harmless.
            const plane = MeshBuilder.CreatePlane(
                "xrDiagPlane",
                { width: 1.4, height: 1.4, sideOrientation: Mesh.DOUBLESIDE },
                this.vishva.scene
            );

            // The panel is HEAD-LOCKED via per-frame placement (see
            // {@link updateDiagHudPlacement}), NOT by parenting. Parenting to the
            // WebXR camera (experience.baseExperience.camera) follows head
            // POSITION but NOT head ROTATION — the rotation is applied to the rig
            // cameras, not the base node — and updateXRCameraFollow rewrites the
            // XR camera transform every frame via setTransformationFromNonVRCamera,
            // so a parented panel moves when you walk but does not rotate when you
            // look around. Instead the plane stays a top-level scene mesh (no
            // parent) and is repositioned + reoriented each frame from the live
            // camera pose (position + getDirection). It is created at the origin
            // here; the first render frame moves it into place.
            //
            // NOTE: a BabylonJS plane's visible normal is -Z while lookAt aims
            // +Z at the target; the plane is DOUBLESIDE so either face renders.
            // If the text appears MIRRORED/backwards in-headset, flip it by
            // rotating 180° about local Y:
            //   plane.rotate(Axis.Y, Math.PI, Space.LOCAL)
            // (import Axis/Space from babylonjs if that line is added). Not added
            // preemptively since it can't be verified in a headset here.

            // The HUD hosts a clickable Exit XR button, so the plane MUST be
            // pickable for the XR pointer-selection ray to hit the GUI control.
            // It sits above eye level, so it won't interfere much with
            // ground/scene picking — acceptable for a debug HUD.
            plane.isPickable = true;
            plane.renderingGroupId = 1;

            // Start HIDDEN: diagVisible now starts false, so the plane is
            // disabled on build and the panel does NOT appear on session entry.
            // The left Y button (toggleDiagHud) shows it later, once the head
            // pose has settled. diagVisible tracks this state.
            plane.setEnabled?.(this.diagVisible);

            // Texture the plane with a GUI ADT (mesh mode, not fullscreen). A
            // taller 1024x1024 texture (was 1024x768) gives room for the extra
            // diagnostic lines plus the Exit button.
            const adt = AdvancedDynamicTexture.CreateForMesh(
                plane,
                1024,
                1024,
                false
            );

            // A semi-transparent dark panel filling the texture so the white
            // text stays readable over any scene.
            const panel = new Rectangle("xrDiagPanel");
            panel.width = 1;
            panel.height = 1;
            panel.thickness = 0;
            panel.background = "black";
            panel.alpha = 0.3;
            panel.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;
            panel.verticalAlignment = Rectangle.VERTICAL_ALIGNMENT_TOP;

            const text = new TextBlock("xrDiagText");
            text.color = "white";
            // Smaller font (34, was 48) so the ~14 diagnostic lines fit in the
            // 1024x1024 texture without clipping.
            text.fontSize = 34;
            text.textWrapping = true;
            text.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
            text.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
            text.paddingLeft = "40px";
            text.paddingTop = "40px";
            // Diagnostic text is EMPTY by default — it is the temporary debug
            // content, gated behind the panel's Debug button (debugEnabled).
            text.text = "";

            panel.addControl(text);
            adt.addControl(panel);

            // ---------------------------------------------------------------
            // OPTIONS-mode SENSITIVITY SLIDERS (permanent reusable-panel content)
            //
            // Three labeled sliders — alpha, beta, radius — let the user tune the
            // orbit/dolly rates live in-headset. They live in a vertical
            // StackPanel anchored TOP-CENTER so they sit in the upper/middle area
            // of the panel and never overlap the Exit/Debug buttons pinned to the
            // bottom. Each slider's onValueChanged handler writes the matching
            // instance field, updates its label, and persists to localStorage.
            // These are OPTIONS-mode controls: applyHudMode toggles their
            // visibility and re-syncs their values from the fields.
            // ---------------------------------------------------------------
            const sliderStack = new StackPanel("xrSensitivityStack");
            sliderStack.isVertical = true;
            sliderStack.width = 0.7;
            sliderStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            sliderStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            sliderStack.paddingTop = "60px";

            /**
             * Build one label + slider pair, wire the onValueChanged handler,
             * add both to the StackPanel, and return the pair so createDiagHud
             * can store the refs.
             */
            const buildSensitivitySlider = (
                name: string,
                min: number,
                max: number,
                initial: number,
                assign: (v: number) => void
            ): { label: TextBlock; slider: Slider } => {
                const label = new TextBlock(
                    `xr${name}Label`,
                    `${name}: ${initial.toFixed(4)}`
                );
                label.color = "white";
                label.fontSize = 34;
                label.height = "50px";
                label.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
                sliderStack.addControl(label);

                const slider = new Slider(`xr${name}Slider`);
                slider.minimum = min;
                slider.maximum = max;
                slider.value = initial;
                slider.width = 0.6;
                // Taller overall so the slider is easy to hit in VR.
                slider.height = "70px";
                // Bigger, round thumb (knob) that stays fully within the track.
                slider.thumbWidth = "60px";
                slider.isThumbCircle = true;
                slider.isThumbClamped = true;
                // Track visibility: filled portion + thumb are lightgreen, the
                // unfilled track is a mid-dark gray that reads clearly against
                // the semi-transparent black panel, with a white border so the
                // start/end of the track are obvious.
                slider.color = "lightgreen";
                slider.background = "#444444";
                slider.borderColor = "white";
                // Extra bottom padding so the three taller stacked pairs don't crowd.
                slider.paddingBottom = "40px";
                // Color-on-pick: turn the fill/thumb yellow while dragging, back
                // to lightgreen on release.
                slider.onPointerDownObservable.add(() => {
                    slider.color = "yellow";
                });
                slider.onPointerUpObservable.add(() => {
                    slider.color = "lightgreen";
                });
                slider.onValueChangedObservable.add((v: number) => {
                    assign(v);
                    label.text = `${name}: ${v.toFixed(4)}`;
                    this.saveSensitivityToStorage();
                });
                sliderStack.addControl(slider);

                return { label, slider };
            };

            const alphaPair = buildSensitivitySlider(
                "alpha",
                0,
                MAX_ORBIT_RATE,
                this.alphaRate,
                (v) => {
                    this.alphaRate = v;
                }
            );
            const betaPair = buildSensitivitySlider(
                "beta",
                0,
                MAX_ORBIT_RATE,
                this.betaRate,
                (v) => {
                    this.betaRate = v;
                }
            );
            const radiusPair = buildSensitivitySlider(
                "radius",
                0,
                MAX_RADIUS_RATE,
                this.radiusRate,
                (v) => {
                    this.radiusRate = v;
                }
            );

            adt.addControl(sliderStack);

            // TEMPORARY DEBUG DIAGNOSTICS: a clickable "Exit XR" button pinned to
            // the bottom of the panel. It is added directly to the ADT (NOT to
            // the semi-transparent Rectangle) so it sits on top and stays
            // clickable. The XR pointer-selection ray + trigger (already working
            // for SNA clicks) fires onPointerUp, which ends the session.
            const exitBtn = Button.CreateSimpleButton("xrExitBtn", "Exit XR");
            exitBtn.width = 0.35;
            exitBtn.height = "120px";
            exitBtn.color = "white";
            exitBtn.background = "darkred";
            exitBtn.fontSize = 40;
            exitBtn.cornerRadius = 10;
            exitBtn.thickness = 2;
            exitBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            exitBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            exitBtn.paddingLeft = "120px";
            exitBtn.paddingBottom = "40px";
            exitBtn.onPointerUpObservable.add(() => {
                this.exitXR().catch(() => {
                    /* best-effort exit — ignore errors */
                });
            });
            adt.addControl(exitBtn);

            // An OPTIONS-mode "Debug" button pinned bottom-right, side by side
            // with Exit XR. Pressing it SWITCHES the HUD into debug mode (the
            // head-locked live diagnostic readout): applyHudMode hides the
            // options controls, shows the Close button, and turns the diagnostic
            // computation on. It is only visible in options mode.
            const debugBtn = Button.CreateSimpleButton("xrDebugBtn", "Debug");
            debugBtn.width = 0.35;
            debugBtn.height = "120px";
            debugBtn.color = "white";
            debugBtn.background = "darkslategray";
            debugBtn.fontSize = 40;
            debugBtn.cornerRadius = 10;
            debugBtn.thickness = 2;
            debugBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            debugBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            debugBtn.paddingRight = "120px";
            debugBtn.paddingBottom = "40px";
            debugBtn.onPointerUpObservable.add(() => {
                this.hudMode = "debug";
                this.applyHudMode();
            });
            adt.addControl(debugBtn);

            // A DEBUG-mode "Close" button pinned bottom-right (styled like
            // Debug). Pressing it returns the HUD to OPTIONS mode: applyHudMode
            // shows the options controls, hides Close, clears the diagnostic
            // text, and world-locks the options panel in front of the viewer
            // again. Starts hidden — options mode is the initial mode.
            const closeBtn = Button.CreateSimpleButton("xrCloseBtn", "Close");
            closeBtn.width = 0.35;
            closeBtn.height = "120px";
            closeBtn.color = "white";
            closeBtn.background = "darkslategray";
            closeBtn.fontSize = 40;
            closeBtn.cornerRadius = 10;
            closeBtn.thickness = 2;
            closeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            closeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            closeBtn.paddingRight = "120px";
            closeBtn.paddingBottom = "40px";
            closeBtn.isVisible = false;
            closeBtn.onPointerUpObservable.add(() => {
                this.hudMode = "options";
                this.applyHudMode();
            });
            adt.addControl(closeBtn);

            this.diagPlane = plane;
            this.diagTexture = adt;
            this.diagText = text;
            // Capture the control refs so applyHudMode can flip their visibility
            // per mode (guarded — null when GUI construction failed).
            this.exitBtnRef = exitBtn;
            this.debugBtnRef = debugBtn;
            this.closeBtnRef = closeBtn;
            // Capture the sensitivity slider + label refs so applyHudMode can
            // show/hide them per mode and re-sync their values from the fields.
            this.alphaSliderRef = alphaPair.slider;
            this.betaSliderRef = betaPair.slider;
            this.radiusSliderRef = radiusPair.slider;
            this.alphaLabelRef = alphaPair.label;
            this.betaLabelRef = betaPair.label;
            this.radiusLabelRef = radiusPair.label;

            // The HUD now starts HIDDEN (diagVisible === false), so the plane is
            // disabled and we must NOT world-lock/place it at build time —
            // placing it against the transient post-entry head pose is exactly
            // the "flash" we're avoiding. Only apply the (options) mode now if
            // the HUD is somehow already visible; otherwise skip. When the user
            // presses the left Y button, toggleDiagHud's show branch sets
            // options mode, reveals the plane, disables elasticity, and calls
            // applyHudMode() to place the panel against a settled pose.
            if (this.diagVisible) {
                this.applyHudMode();
            }
        } catch {
            // Plane/GUI construction failed (e.g. mocked test env) — leave the
            // HUD absent. Debug aid only, never fatal.
            this.diagTexture = null;
            this.diagText = null;
            this.diagPlane = null;
            this.exitBtnRef = null;
            this.debugBtnRef = null;
            this.closeBtnRef = null;
            this.alphaSliderRef = null;
            this.betaSliderRef = null;
            this.radiusSliderRef = null;
            this.alphaLabelRef = null;
            this.betaLabelRef = null;
            this.radiusLabelRef = null;
        }
    }

    /**
     * TEMPORARY DEBUG DIAGNOSTICS: head-lock the debug HUD plane by positioning
     * and orienting it from the TRUE LIVE head pose every frame.
     *
     * WHY read the RIG camera, not the base camera: `updateXRCameraFollow` calls
     * `xrCamera.setTransformationFromNonVRCamera(arcCamera, true)`, which
     * OVERWRITES the base WebXR camera's position/rotationQuaternion with the
     * third-person ArcRotateCamera follow pose (and forces position.y = 0). To
     * avoid reading that grounded follow pose, this placement runs in the render
     * loop BEFORE {@link updateXRCameraFollow} (order each frame: sampleSticks →
     * updateDiagHudPlacement → updateXRCameraFollow), so the camera still holds
     * the true head pose when we read it. Even so, we read the RIG (per-eye)
     * cameras rather than the base node: the base node (`this.getXRCamera()` =
     * `experience.baseExperience.camera`) is the one the follow copy overwrites,
     * whereas the rig cameras always carry the true live head transform. Reading
     * the rig is what keeps the HUD from appearing behind the user, vertically
     * centered, or failing to track head rotation.
     *
     * The actual head pose is carried by the base camera's RIG cameras (the
     * per-eye cameras) — the headset render looks correct precisely because those
     * rig cameras still reflect the true head transform. So we read the head pose
     * from `rigCameras[0]` (using one eye is fine for HUD placement; the eye
     * offset is negligible), falling back to the base camera only when no rig
     * camera exists (before the first XR frame or in the mocked test env).
     *
     * ROBUSTNESS: instead of hand-decomposing a world matrix (a prior version
     * did, and a bad/NaN result flung the panel out of view so the HUD vanished),
     * this uses high-level, sign-safe camera APIs:
     *   - `computeWorldMatrix(true)` to force the transform current,
     *   - `getFrontPosition(DISTANCE)` for a world-space point directly in front
     *     of the head (the anchor — no forward-sign mistakes),
     *   - `getDirection(Up/Right)` for the offset basis,
     *   - `globalPosition`/`position` for the head position.
     * Every computed position is checked with `Number.isFinite`; if any component
     * is non-finite the plane is LEFT WHERE IT IS this frame (never moved to NaN),
     * so the HUD can't disappear. When no usable pose is obtained the path is
     * recorded as "none" and the plane is simply not moved.
     *
     * Called from the per-frame render observer (see {@link startStickSampler})
     * BEFORE {@link updateXRCameraFollow}, so it reads this frame's TRUE head
     * pose — the follow copy in updateXRCameraFollow would otherwise ground the
     * XR camera (position.y → 0) and the panel would drop. Every access is
     * guarded and the body is wrapped in
     * try/catch so it silently no-ops in the mocked test environment (where the
     * fake camera/plane lacks rigCameras/computeWorldMatrix/getFrontPosition/
     * getDirection/globalPosition/position/lookAt → src stays "none", nothing is
     * moved, nothing throws) — the HUD is a debug aid and must never affect
     * session behaviour or throw. Remove together with the rest of the HUD once
     * the axis bug is resolved.
     */
    private updateDiagHudPlacement(): void {
        // Debug mode head-lock: recompute the front placement every frame.
        this.positionPlaneInFront();
    }

    /**
     * Place the OPTIONS panel ONCE in front of the current view and then leave
     * it FIXED in world space.
     *
     * The options panel is WORLD-LOCKED (point-and-click friendly): it is
     * summoned in front of the viewer when the HUD is shown or when switching
     * back from debug mode, and then it stays put — it is NOT repositioned per
     * frame (only the debug readout head-locks). This calls the shared
     * {@link positionPlaneInFront} front-placement helper exactly once. Fully
     * guarded so it is a safe no-op in the mocked test environment (plane null →
     * nothing happens, nothing throws).
     */
    private placeOptionsPanelInFront(): void {
        this.positionPlaneInFront();
    }

    /**
     * Shared front-placement: position the HUD plane at a world-space point in
     * front of the live head pose and orient it to face the head.
     *
     * This is the single source of the "compute front placement, set plane
     * position + lookAt" math used by BOTH modes:
     *   - {@link updateDiagHudPlacement} (debug) calls it every frame → head-lock.
     *   - {@link placeOptionsPanelInFront} (options) calls it once → world-lock.
     *
     * The placement/robustness is unchanged from the previous head-lock
     * implementation: read the RIG (eye) camera for the TRUE live head pose,
     * `computeWorldMatrix(true)`, `getFrontPosition(DISTANCE)` + up/right offset,
     * `getDirection` fallback, finite guards on every computed position, and a
     * "none" fallback that leaves the plane where it is. DISTANCE/LEFT_OFFSET are
     * shared; the vertical UP_OFFSET is per-mode — options mode is centered at
     * eye level (0), debug mode sits slightly down (-0.5).
     */
    private positionPlaneInFront(): void {
        if (!this.inXR || this.diagPlane === null) {
            return;
        }
        // TEMPORARY DEBUG DIAGNOSTICS: assume "no usable pose" until we prove
        // otherwise. If we bail early (or the pose is non-finite) the plane is
        // simply not moved and the HUD reports "none".
        this.diagPlacementSrc = "none";
        try {
            const cam = this.getXRCamera();
            if (!cam) {
                return;
            }

            // Read the pose from the active RIG (eye) camera — it carries the
            // TRUE live head pose. This runs BEFORE updateXRCameraFollow's
            // setTransformationFromNonVRCamera clobbers the base camera with the
            // grounded follow pose, and the rig cameras carry the true head
            // transform regardless. Fall back to the base camera only when no rig
            // camera exists (pre-first-frame / tests).
            const rig = (cam as any).rigCameras;
            const usingRig = Array.isArray(rig) && rig.length > 0;
            const headCam: any = usingRig ? rig[0] : cam;
            if (!headCam) {
                return;
            }

            // Small helper: a value is a finite Vector3 only when x/y/z are all
            // finite numbers. Used to reject NaN/undefined poses that would fling
            // the panel out of view.
            const isFiniteVec = (v: any): boolean =>
                !!v &&
                Number.isFinite(v.x) &&
                Number.isFinite(v.y) &&
                Number.isFinite(v.z);

            // Force the head camera's world matrix current so getFrontPosition /
            // getDirection / globalPosition reflect THIS frame's transform.
            if (typeof headCam.computeWorldMatrix === "function") {
                headCam.computeWorldMatrix(true);
            }

            // Head world position: prefer globalPosition when finite, else the
            // local position. Guarded — a non-finite head pose disables the
            // lookAt() below (we never orient toward NaN).
            let headPos: any = headCam.globalPosition;
            if (!isFiniteVec(headPos)) {
                headPos = headCam.position;
            }

            // Placement constants (world-space meters — the plane is a top-level
            // scene mesh, not parented). Kept modest so a slight error still
            // leaves the panel on-screen rather than out of view.
            const DISTANCE = 3; // meters ahead of the head.
            // Options panel is centered at eye level (0) so it appears directly
            // ahead on entry; the head-locked debug panel sits slightly DOWN
            // (-0.5) so it doesn't block the forward view while it head-locks.
            const UP_OFFSET = this.hudMode === "options" ? 0 : -0.5;
            const LEFT_OFFSET = 0; // centered horizontally — panel sits directly ahead (toggle off with the left Y button if it's in the way).

            // Preferred anchor: a world-space point DISTANCE meters directly in
            // front of the head. getFrontPosition avoids forward-sign mistakes.
            let pos: any = null;
            if (typeof headCam.getFrontPosition === "function") {
                const frontPoint = headCam.getFrontPosition(DISTANCE);
                // Offset basis: prefer the camera's own up/right, else world axes.
                let up: any;
                let right: any;
                if (typeof headCam.getDirection === "function") {
                    up = headCam.getDirection(Vector3.Up());
                    right = headCam.getDirection(Vector3.Right());
                } else {
                    up = Vector3.Up();
                    right = Vector3.Right();
                }
                if (isFiniteVec(frontPoint) && isFiniteVec(up) && isFiniteVec(right)) {
                    pos = frontPoint
                        .add(up.scale(UP_OFFSET))
                        .add(right.scale(-LEFT_OFFSET));
                    this.diagPlacementSrc = usingRig ? "rig+front" : "base+front";
                }
            } else if (
                typeof headCam.getDirection === "function" &&
                isFiniteVec(headPos)
            ) {
                // Fallback: build the anchor from head position + forward*DISTANCE
                // and the up/right offset, all via getDirection.
                const forward = headCam.getDirection(Vector3.Forward());
                const up = headCam.getDirection(Vector3.Up());
                const right = headCam.getDirection(Vector3.Right());
                if (isFiniteVec(forward) && isFiniteVec(up) && isFiniteVec(right)) {
                    pos = headPos
                        .add(forward.scale(DISTANCE))
                        .add(up.scale(UP_OFFSET))
                        .add(right.scale(-LEFT_OFFSET));
                    this.diagPlacementSrc = "getDirection-fallback";
                }
            }

            // No usable pose was produced (test env / partial camera): leave the
            // plane exactly where it is (src stays "none"), never fling to NaN.
            if (pos === null) {
                return;
            }

            // CRITICAL finite guard: if the computed position is non-finite, do
            // NOT move the plane this frame — a NaN position would make the HUD
            // vanish. Leave it at its last good position instead.
            if (!isFiniteVec(pos)) {
                return;
            }

            // Apply the placement.
            this.diagPlane.position.copyFrom(pos);

            // Orient to FACE the head each frame (only toward a finite head pose).
            // Since the plane is DOUBLESIDE, facing-direction ambiguity is
            // harmless; if text is mirrored in-headset, a 180° local-Y flip fixes
            // it (see createDiagHud note).
            if (isFiniteVec(headPos) && typeof this.diagPlane.lookAt === "function") {
                this.diagPlane.lookAt(headPos);
            }

            // TEMPORARY DEBUG DIAGNOSTICS: stash the resolved head + panel
            // positions so the HUD text can show them for on-device debugging.
            if (isFiniteVec(headPos)) {
                this.diagHeadPosStr =
                    `${headPos.x.toFixed(2)},${headPos.y.toFixed(2)},${headPos.z.toFixed(2)}`;
            }
            this.diagPanelPosStr =
                `${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)}`;
        } catch {
            // Safe no-op: HUD placement must never throw (debug aid only).
        }
    }

    /**
     * Refresh the diagnostic HUD text with the snapshot sampled this frame.
     *
     * Called every frame from {@link sampleSticks}. Shows, one field per line:
     *   - which handedness classified each bound stick (or "none"),
     *   - the raw left/right axes exactly as sampled,
     *   - the active deadzone,
     *   - the derived MoveIntent (comma-separated active actions, or "none"),
     *   - the avatar's Y rotation (radians),
     *   - the WebXR camera's Y euler (yaw) derived from its rotationQuaternion,
     *   - ONE line per controller in {@link diagControllers}: its ground-truth
     *     handedness and the REAL component ids the hardware exposes,
     *   - the trigger's bound/pressed state and jump count,
     *   - the menu's bound/pressed state and toggle count,
     *   - the left stick's live pressed state,
     *   - the resolved head position + pose-resolution path, and
     *   - the panel position applied this frame (see updateDiagHudPlacement).
     *
     * The entire body is guarded so it never throws when the HUD text is
     * absent, the avatar is null, or the camera / its quaternion is missing.
     */
    private updateDiagHud(
        intent: MoveIntent,
        raw: { leftX: number; leftY: number; rightX: number; rightY: number }
    ): void {
        const text = this.diagText;
        if (!text) {
            return;
        }
        try {
            const f = (n: number): string =>
                typeof n === "number" && isFinite(n) ? n.toFixed(3) : "?";

            // Active MoveIntent actions, in a stable order.
            const active: string[] = [];
            if (intent.walk) active.push("walk");
            if (intent.walkBack) active.push("walkBack");
            if (intent.strafeLeft) active.push("strafeLeft");
            if (intent.strafeRight) active.push("strafeRight");
            const intentStr = active.length > 0 ? active.join(", ") : "none";

            // TEMPORARY DEBUG DIAGNOSTICS: camera/avatar diagnostics captured
            // each frame so we can watch the back-and-forth jerk live — the
            // follow camera's radius + orbit angles, the avatar's world
            // position, and the avatar→camera distance (does the avatar drift
            // toward the camera as it walks backward?). All access is guarded so
            // the block is a safe no-op in the mocked test env where arc/avatar/
            // positions may be missing; strings become "?"/"n/a", never throw.
            try {
                const arc = this.vishva.arcCamera;
                const r = arc?.radius;
                this.diagCamRadiusStr =
                    typeof r === "number" && isFinite(r) ? r.toFixed(3) : "?";
                const a = arc?.alpha;
                const b = arc?.beta;
                this.diagCamAnglesStr =
                    typeof a === "number" && typeof b === "number"
                        ? `${a.toFixed(2)}/${b.toFixed(2)}`
                        : "?";
                const av = this.vishva.avatar?.position;
                this.diagAvatarPosStr = av
                    ? `${av.x.toFixed(2)},${av.y.toFixed(2)},${av.z.toFixed(2)}`
                    : "n/a";
                // Compute the avatar→camera distance manually (do NOT rely on
                // Vector3.subtract in case of a mock) when both positions expose
                // x/y/z; otherwise "n/a".
                const camPos = arc?.position;
                if (
                    av &&
                    camPos &&
                    typeof av.x === "number" &&
                    typeof camPos.x === "number"
                ) {
                    const dx = camPos.x - av.x;
                    const dy = camPos.y - av.y;
                    const dz = camPos.z - av.z;
                    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    this.diagAvToCamStr = isFinite(d) ? d.toFixed(3) : "?";
                } else {
                    this.diagAvToCamStr = "n/a";
                }
            } catch {
                // Never let the debug diagnostics break the render loop.
            }
            const camRStr = this.diagCamRadiusStr || "?";
            const camAnglesStr = this.diagCamAnglesStr || "?";
            const avatarPosStr = this.diagAvatarPosStr || "?";

            text.text =
                `a/b: ${camAnglesStr}  camR: ${camRStr}\n` +
                `L axes: x=${f(raw.leftX)} y=${f(raw.leftY)}\n` +
                `R axes: x=${f(raw.rightX)} y=${f(raw.rightY)}\n` +
                `intent: ${intentStr}\n` +
                `avPos: ${avatarPosStr}`;
        } catch {
            // Never let the debug HUD break the render loop.
        }
    }

    /**
     * Dispose the diagnostic HUD, releasing its GUI texture and the world-space
     * plane mesh. Safe to call when the HUD was never created or construction
     * failed. Called on session end. Disposes the ADT first, then the plane.
     */
    private disposeDiagHud(): void {
        try {
            this.diagTexture?.dispose?.();
        } catch {
            // Best-effort teardown; ignore disposal errors.
        }
        try {
            this.diagPlane?.dispose?.();
        } catch {
            // Best-effort teardown; ignore disposal errors.
        }
        this.diagTexture = null;
        this.diagText = null;
        this.diagPlane = null;
        this.exitBtnRef = null;
        this.debugBtnRef = null;
        this.closeBtnRef = null;
    }
}
