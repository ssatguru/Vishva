/**
 * XR Capability Detection + Button-State Mapping
 *
 * Two pieces:
 *  - `detectXRSupport`: a thin async probe of WebXR session support. It never
 *    throws — absence of `navigator.xr`, a rejection, or a synchronous throw
 *    from the underlying support query all resolve to `false` for that mode.
 *  - `computeXRButtonState`: a pure mapping from capability booleans to a
 *    NavBar button-state model. No BabylonJS dependency, fully testable.
 */

import { WebXRSessionManager } from "babylonjs";

/** Whether the current device/browser supports each immersive session type. */
export interface XRSupportState {
    vrSupported: boolean;
    arSupported: boolean;
}

/** Visibility/enabled model for the two Enter_XR_Buttons. */
export interface XRButtonState {
    vr: { visible: boolean; enabled: boolean };
    ar: { visible: boolean; enabled: boolean };
}

/**
 * Probe support for a single WebXR session mode. Wrapped so that a missing
 * `navigator.xr`, a rejected promise, or a synchronous throw all resolve to
 * `false` rather than propagating.
 */
async function probeMode(sessionMode: "immersive-vr" | "immersive-ar"): Promise<boolean> {
    try {
        const supported = await WebXRSessionManager.IsSessionSupportedAsync(sessionMode);
        return supported === true;
    } catch {
        return false;
    }
}

/**
 * Thin async probe of XR capabilities. Queries `immersive-vr` and
 * `immersive-ar` support independently. Never throws: unsupported or erroring
 * modes resolve to `false`. If `navigator.xr` is undefined, both are `false`.
 */
export async function detectXRSupport(): Promise<XRSupportState> {
    // Fast path: no WebXR API at all → nothing is supported.
    if (typeof navigator === "undefined" || !(navigator as Navigator).xr) {
        return { vrSupported: false, arSupported: false };
    }

    const [vrSupported, arSupported] = await Promise.all([
        probeMode("immersive-vr"),
        probeMode("immersive-ar"),
    ]);

    return { vrSupported, arSupported };
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
