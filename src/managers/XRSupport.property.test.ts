import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeXRButtonState, XRSupportState } from "./XRSupport";

/**
 * Feature: webxr-support, Property 1: Capability mapping reflects support exactly
 *
 * For any {vr, ar} booleans, computeXRButtonState marks a mode's button as
 * visible+enabled iff that mode is supported, and never enables a button for
 * an unsupported mode.
 *
 * Validates: Requirements 1.4, 2.2, 2.3, 2.6
 */
describe("Property 1: Capability mapping reflects support exactly", () => {
    it("button enabled iff supported; never enabled for unsupported", () => {
        fc.assert(
            fc.property(fc.boolean(), fc.boolean(), (vr, ar) => {
                const support: XRSupportState = { vrSupported: vr, arSupported: ar };
                const state = computeXRButtonState(support);

                // Enabled/visible exactly mirror support for each mode.
                expect(state.vr.enabled).toBe(vr);
                expect(state.vr.visible).toBe(vr);
                expect(state.ar.enabled).toBe(ar);
                expect(state.ar.visible).toBe(ar);

                // Never enabled for an unsupported mode.
                if (!vr) {
                    expect(state.vr.enabled).toBe(false);
                }
                if (!ar) {
                    expect(state.ar.enabled).toBe(false);
                }
            }),
            { numRuns: 100 }
        );
    });
});
