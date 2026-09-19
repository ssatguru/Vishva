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
