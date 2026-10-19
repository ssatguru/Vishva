/**
 * XR Locomotion Sub-Mode State Machine (pure)
 *
 * A BabylonJS-free state machine for the in-session navigation sub-mode. The
 * viewer is either in `firstPerson` (teleport + controller pointers) or
 * `thirdPerson` (point-at-target, avatar walks there) mode.
 *
 * The single guard rule: a transition into `firstPerson` is permitted only
 * when the caller supplies `canFirstPerson === true` (derived elsewhere from
 * the active CharacterController's `noFirstPerson` setting). A transition into
 * `thirdPerson` is always permitted and is never reported as blocked.
 *
 * No BabylonJS dependency — this module is unit- and property-testable without
 * a scene or headset.
 */

/** The in-session navigation sub-mode. */
export type LocomotionMode = "firstPerson" | "thirdPerson";

/** Default deadzone applied to raw thumbstick axes in {@link mapSticksToIntent}. */
export const DEFAULT_STICK_DEADZONE = 0.15;

/**
 * Raw thumbstick axis values sampled from the WebXR motion controllers.
 *
 * - `leftX` / `leftY`: left stick, drives translation (strafe + forward/back).
 *
 * The RIGHT stick is NOT part of this interface. It no longer maps to a
 * CharacterController action — it directly manipulates the follow
 * ArcRotateCamera (orbit `alpha`/`beta` and dolly `radius`) inside XRManager,
 * so it never passes through this pure mapper.
 *
 * Values are the raw gamepad axes in roughly [-1, 1]; no deadzone has been
 * applied yet — {@link mapSticksToIntent} owns that.
 */
export interface StickInput {
    leftX: number;
    leftY: number;
}

/**
 * The set of continuous CharacterController action intents derived from the
 * sticks. Each flag is "should this action currently be active". The XRManager
 * edge-triggers the CharacterController from these (calling `cc.walk(true)` on
 * a false→true transition, `cc.walk(false)` on true→false), rather than every
 * frame.
 *
 * Only one direction per axis is ever true at a time (a stick can't be pushed
 * both left and right simultaneously), which keeps the CharacterController from
 * receiving contradictory start/stop calls.
 */
export interface MoveIntent {
    walk: boolean;
    walkBack: boolean;
    strafeLeft: boolean;
    strafeRight: boolean;
}

/** A MoveIntent with every action inactive — the resting/deadzone state. */
export function neutralMoveIntent(): MoveIntent {
    return {
        walk: false,
        walkBack: false,
        strafeLeft: false,
        strafeRight: false,
    };
}

/**
 * Map raw LEFT thumbstick axes to CharacterController translation intents
 * (pure).
 *
 * This mapper is now LEFT-stick ONLY. It produces the four translation flags
 * (walk / walkBack / strafeLeft / strafeRight). The RIGHT stick no longer
 * participates: camera orbit (`alpha`/`beta`) and dolly (`radius`) are applied
 * directly against the follow ArcRotateCamera inside XRManager and never pass
 * through here.
 *
 * Deadzone: any axis whose absolute value is <= `deadzone` is treated as 0, so
 * small resting drift on a physical stick never nudges the avatar.
 *
 * LEFT-STICK DOMINANT-AXIS RULE (why this exists):
 *
 * Physical thumbsticks bleed onto the off-axis when pushed hard — pulling the
 * stick "straight back" realistically produces something like x=0.3, y=0.9
 * rather than a clean x=0. If forward/back and strafe were evaluated
 * independently (as they once were), that bleed would light up BOTH walkBack
 * AND strafeRight, so the avatar drifts sideways when the user only meant to
 * back up. The movement model uses discrete walk/strafe animations that don't
 * blend, so engaging both a forward/back and a lateral direction at once is
 * never desirable.
 *
 * To fix this, the LEFT stick uses dominant-axis selection: only ONE of
 * {forward/back} vs {strafe} may be active per call. We compare the raw
 * magnitudes `Math.abs(leftY)` and `Math.abs(leftX)`; the larger wins and the
 * loser is forced off entirely. Ties (equal magnitudes) resolve to Y, so
 * forward/back wins a tie. The deadzone still gates the winner: if the winning
 * axis is itself within the deadzone (e.g. both axes tiny at rest), no action
 * fires — a resting stick stays neutral.
 *
 * Sign conventions (documented deliberately — they are easy to get wrong):
 *
 * - Left stick Y — forward/back. WebXR/gamepad thumbstick Y is NEGATIVE when
 *   the stick is pushed forward/up and POSITIVE when pulled back/down. So a
 *   value past the deadzone in the negative direction (`leftY < -deadzone`)
 *   means "walk forward"; past the deadzone positive (`leftY > deadzone`) means
 *   "walk backward". This is the opposite of screen-Y intuition, hence the
 *   explicit handling here.
 * - Left stick X — strafe. Positive X is to the right (`leftX > deadzone` =>
 *   strafeRight), negative X is to the left (`leftX < -deadzone` =>
 *   strafeLeft). This matches the standard gamepad convention (X grows right).
 *
 * Because each axis maps to at most one direction (the value can't be both
 * above +deadzone and below -deadzone), the two opposing flags of any axis are
 * never simultaneously true; and the dominant-axis rule additionally guarantees
 * the left stick never lights a forward/back AND a strafe flag together.
 *
 * No BabylonJS dependency — unit- and property-testable without a scene.
 */
export function mapSticksToIntent(
    input: StickInput,
    deadzone: number = DEFAULT_STICK_DEADZONE
): MoveIntent {
    const intent = neutralMoveIntent();

    // Left stick: dominant-axis selection. Compare raw magnitudes to decide
    // whether the user meant forward/back (Y) or strafe (X); the off-axis is
    // ignored entirely. Ties resolve to Y (forward/back wins).
    if (Math.abs(input.leftY) >= Math.abs(input.leftX)) {
        // Y dominates → forward (negative) / back (positive). See sign note.
        if (input.leftY < -deadzone) {
            intent.walk = true;
        } else if (input.leftY > deadzone) {
            intent.walkBack = true;
        }
    } else {
        // X dominates → strafe right (positive) / left (negative).
        if (input.leftX > deadzone) {
            intent.strafeRight = true;
        } else if (input.leftX < -deadzone) {
            intent.strafeLeft = true;
        }
    }

    return intent;
}

/** Result of a mode transition request. */
export interface ToggleResult {
    /** The resulting mode after the request. */
    mode: LocomotionMode;
    /** Whether the mode actually changed. */
    changed: boolean;
    /** Whether a first-person request was denied (guard blocked it). */
    blocked: boolean;
}

/**
 * Pure state machine for the first/third-person locomotion sub-mode with the
 * `noFirstPerson` guard.
 */
export class XRLocomotion {
    private mode: LocomotionMode;

    constructor(initial: LocomotionMode = "thirdPerson") {
        this.mode = initial;
    }

    /** Current locomotion mode. */
    getMode(): LocomotionMode {
        return this.mode;
    }

    /**
     * Request a specific mode.
     *
     * - Transition to `firstPerson` is allowed only when `canFirstPerson` is
     *   true. When blocked, the mode stays as it was and the result reports
     *   `blocked: true, changed: false`.
     * - Transition to `thirdPerson` is always allowed and never blocked.
     */
    setMode(mode: LocomotionMode, canFirstPerson: boolean): ToggleResult {
        if (mode === "firstPerson" && !canFirstPerson) {
            // Guard denies the first-person request; mode is left untouched.
            return { mode: this.mode, changed: false, blocked: true };
        }

        const changed = this.mode !== mode;
        this.mode = mode;
        return { mode: this.mode, changed, blocked: false };
    }

    /**
     * Toggle between the two modes.
     *
     * - From `thirdPerson`: attempt to go `firstPerson` (allowed only when
     *   `canFirstPerson` is true; otherwise blocked and stays `thirdPerson`).
     * - From `firstPerson`: go `thirdPerson` (always allowed, never blocked).
     */
    toggle(canFirstPerson: boolean): ToggleResult {
        const target: LocomotionMode =
            this.mode === "thirdPerson" ? "firstPerson" : "thirdPerson";
        return this.setMode(target, canFirstPerson);
    }
}
