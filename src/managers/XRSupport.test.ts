import { describe, it, expect, vi, afterEach } from "vitest";

// Mock the babylonjs WebXRSessionManager so detectXRSupport can be exercised
// without a real WebXR-capable environment.
vi.mock("babylonjs", () => {
    return {
        WebXRSessionManager: {
            IsSessionSupportedAsync: vi.fn(),
        },
    };
});

import { WebXRSessionManager } from "babylonjs";
import {
    detectXRSupport,
    computeXRButtonState,
    XRSupportState,
} from "./XRSupport";

const isSupportedMock = WebXRSessionManager.IsSessionSupportedAsync as unknown as ReturnType<typeof vi.fn>;

describe("computeXRButtonState", () => {
    it("both supported → both buttons visible and enabled", () => {
        const state: XRSupportState = { vrSupported: true, arSupported: true };
        expect(computeXRButtonState(state)).toEqual({
            vr: { visible: true, enabled: true },
            ar: { visible: true, enabled: true },
        });
    });

    it("VR-only → VR button on, AR button off", () => {
        const state: XRSupportState = { vrSupported: true, arSupported: false };
        expect(computeXRButtonState(state)).toEqual({
            vr: { visible: true, enabled: true },
            ar: { visible: false, enabled: false },
        });
    });

    it("AR-only → AR button on, VR button off", () => {
        const state: XRSupportState = { vrSupported: false, arSupported: true };
        expect(computeXRButtonState(state)).toEqual({
            vr: { visible: false, enabled: false },
            ar: { visible: true, enabled: true },
        });
    });

    it("none supported → both buttons off", () => {
        const state: XRSupportState = { vrSupported: false, arSupported: false };
        expect(computeXRButtonState(state)).toEqual({
            vr: { visible: false, enabled: false },
            ar: { visible: false, enabled: false },
        });
    });
});

describe("detectXRSupport", () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
        vi.clearAllMocks();
        // Restore navigator to its original value between tests.
        Object.defineProperty(globalThis, "navigator", {
            value: originalNavigator,
            configurable: true,
            writable: true,
        });
    });

    /** Replace globalThis.navigator with a controlled stub. */
    function setNavigator(value: unknown): void {
        Object.defineProperty(globalThis, "navigator", {
            value,
            configurable: true,
            writable: true,
        });
    }

    it("resolves to all-false when navigator.xr is absent (no throw)", async () => {
        setNavigator({}); // navigator present but no `xr`
        const result = await detectXRSupport();
        expect(result).toEqual({ vrSupported: false, arSupported: false });
        // Probe should short-circuit; support query never consulted.
        expect(isSupportedMock).not.toHaveBeenCalled();
    });

    it("resolves without throwing when a support query rejects", async () => {
        setNavigator({ xr: {} });
        isSupportedMock.mockRejectedValue(new Error("boom"));

        // Must not throw.
        const result = await detectXRSupport();
        expect(result).toEqual({ vrSupported: false, arSupported: false });
    });

    it("treats a synchronous throw from the query as unsupported", async () => {
        setNavigator({ xr: {} });
        isSupportedMock.mockImplementation(() => {
            throw new Error("sync boom");
        });

        const result = await detectXRSupport();
        expect(result).toEqual({ vrSupported: false, arSupported: false });
    });

    it("reports per-mode support based on the query results", async () => {
        setNavigator({ xr: {} });
        isSupportedMock.mockImplementation(async (mode: string) => mode === "immersive-vr");

        const result = await detectXRSupport();
        expect(result).toEqual({ vrSupported: true, arSupported: false });
    });
});
