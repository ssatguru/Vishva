/**
 * NavBar Enter-VR / Enter-AR button-state model (Vishva-local).
 *
 * WebXR capability detection itself lives in the CharacterController library
 * (`detectXRSupport` → `XRSupportState`). This module owns only Vishva's purely
 * presentational mapping from that capability state to the NavBar button
 * visibility/enabled model — a concept the library does not (and should not)
 * expose. Kept as a tiny standalone module so both `VishvaGUI` and the NavBar
 * tests import the same real implementation.
 */

import type { XRSupportState } from "babylonjs-charactercontroller";

/** Visibility/enabled model for the two Enter_XR NavBar buttons. */
export interface XRButtonState {
    vr: { visible: boolean; enabled: boolean };
    ar: { visible: boolean; enabled: boolean };
}

/**
 * Pure mapping from capability state to button-state model. A mode's button is
 * visible AND enabled if and only if that mode is supported; otherwise it is
 * `{ visible: false, enabled: false }`.
 */
export function computeXRButtonState(support: XRSupportState): XRButtonState {
    return {
        vr: { visible: support.vrSupported, enabled: support.vrSupported },
        ar: { visible: support.arSupported, enabled: support.arSupported },
    };
}
