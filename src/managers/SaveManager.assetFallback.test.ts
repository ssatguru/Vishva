// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetStore } from "./AssetStore.js";

vi.mock("../gui/DialogMgr", () => ({
    DialogMgr: { showAlertDiag: vi.fn() },
}));

import { SaveManager } from "./SaveManager.js";

describe("SaveManager server asset fallback", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("uses the loaded session asset if the server file is no longer available", async () => {
        const bytes = new Uint8Array([79, 103, 103, 83]);
        const assetStore = {
            get: vi.fn().mockResolvedValue(bytes),
        } as unknown as AssetStore;
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const saveManager = new SaveManager({});

        const result = await (saveManager as any)._getServerAssetData({
            originalUrl: "vishva/assets/sounds/step.ogg",
            fetchUrl: "https://example.test/vishva/assets/sounds/step.ogg",
            archiveFilename: "vishva/assets/sounds/step.ogg",
        }, assetStore);

        expect(result).toBe(bytes);
        expect(assetStore.get).toHaveBeenCalledWith("vishva/assets/sounds/step.ogg");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fetches the server asset when it is not present in the session", async () => {
        const bytes = new Uint8Array([79, 103, 103, 83]);
        const assetStore = {
            get: vi.fn().mockResolvedValue(null),
        } as unknown as AssetStore;
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: async () => bytes.buffer,
        });
        vi.stubGlobal("fetch", fetchMock);
        const saveManager = new SaveManager({});

        const result = await (saveManager as any)._getServerAssetData({
            originalUrl: "vishva/assets/sounds/step.ogg",
            fetchUrl: "https://example.test/vishva/assets/sounds/step.ogg",
            archiveFilename: "vishva/assets/sounds/step.ogg",
        }, assetStore);

        expect(result).toEqual(bytes);
        expect(fetchMock).toHaveBeenCalledWith("https://example.test/vishva/assets/sounds/step.ogg");
    });
});
