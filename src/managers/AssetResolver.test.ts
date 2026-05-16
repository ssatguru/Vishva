import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AssetResolver } from "./AssetResolver.js";
import { AssetStore } from "./AssetStore.js";

// Mock the babylonjs module
vi.mock("babylonjs", () => {
    return {
        Tools: {
            LoadFile: vi.fn(),
        },
    };
});

// Mock URL.createObjectURL and URL.revokeObjectURL for Node environment
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
    globalThis.Blob = class Blob {
        parts: any[];
        constructor(parts: any[]) {
            this.parts = parts;
        }
    } as any;
    globalThis.URL = globalThis.URL || ({} as any);
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
    mockCreateObjectURL.mockReset();
    mockRevokeObjectURL.mockReset();
});

/**
 * Helper: create a mock AssetStore that returns data from a provided map.
 */
function createMockStore(assets: Map<string, Uint8Array>): AssetStore {
    const store = {
        listKeys: vi.fn().mockResolvedValue([...assets.keys()]),
        get: vi.fn().mockImplementation(async (key: string) => assets.get(key) || null),
    } as unknown as AssetStore;
    return store;
}

describe("AssetResolver", () => {
    let resolver: AssetResolver;
    let mockTools: any;

    beforeEach(async () => {
        resolver = new AssetResolver();
        // Get reference to the mocked Tools
        const babylonjs = await import("babylonjs");
        mockTools = babylonjs.Tools;
        // Reset the mock LoadFile to a simple spy
        mockTools.LoadFile = vi.fn();
    });

    afterEach(() => {
        // Ensure cleanup
        resolver.deactivate();
    });

    describe("activate", () => {
        it("overrides Tools.LoadFile", async () => {
            const originalFn = mockTools.LoadFile;
            const store = createMockStore(new Map());

            await resolver.activate(store);

            expect(mockTools.LoadFile).not.toBe(originalFn);
        });

        it("intercepts requests matching structured path assets", async () => {
            const assetData = new Uint8Array([1, 2, 3, 4]);
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/ground.jpg", assetData);

            const store = createMockStore(assets);

            // Store original before activation
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            mockCreateObjectURL.mockReturnValue("blob:http://localhost/fake-blob-url");

            await resolver.activate(store);

            const onSuccess = vi.fn();
            const onProgress = vi.fn();

            // Call the overridden LoadFile with a URL that matches the structured path
            mockTools.LoadFile(
                "vishva/assets/textures/ground.jpg",
                onSuccess,
                onProgress,
                undefined,
                true,
                undefined
            );

            // Should have created a blob URL
            expect(mockCreateObjectURL).toHaveBeenCalled();

            // Should have called original LoadFile with the blob URL
            expect(originalLoadFile).toHaveBeenCalledWith(
                "blob:http://localhost/fake-blob-url",
                onSuccess,
                onProgress,
                undefined,
                true,
                undefined
            );
        });

        it("intercepts requests with full URL containing structured path suffix", async () => {
            const assetData = new Uint8Array([1, 2, 3, 4]);
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/ground.jpg", assetData);

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            mockCreateObjectURL.mockReturnValue("blob:http://localhost/fake-blob-url");

            await resolver.activate(store);

            const onSuccess = vi.fn();

            // Call with a full URL that ends with the structured path
            mockTools.LoadFile(
                "http://localhost:8080/bin/vishva/assets/textures/ground.jpg",
                onSuccess,
                undefined,
                undefined,
                true,
                undefined
            );

            // Should have created a blob URL
            expect(mockCreateObjectURL).toHaveBeenCalled();
        });

        it("passes through non-matching requests to original LoadFile", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/ground.jpg", new Uint8Array([1, 2, 3]));

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            await resolver.activate(store);

            const onSuccess = vi.fn();

            // Call with a URL that does NOT match any asset
            mockTools.LoadFile(
                "http://cdn.example.com/other-file.png",
                onSuccess,
                undefined,
                undefined,
                false,
                undefined
            );

            // Should have called original LoadFile with the original URL
            expect(originalLoadFile).toHaveBeenCalledWith(
                "http://cdn.example.com/other-file.png",
                onSuccess,
                undefined,
                undefined,
                false,
                undefined
            );

            // Should NOT have created a blob URL
            expect(mockCreateObjectURL).not.toHaveBeenCalled();
        });

        it("matches URL with query strings and fragments stripped", async () => {
            const assetData = new Uint8Array([5, 6, 7]);
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/models/model.babylon", assetData);

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;
            mockCreateObjectURL.mockReturnValue("blob:fake");

            await resolver.activate(store);

            mockTools.LoadFile(
                "vishva/assets/models/model.babylon?v=123#section",
                vi.fn()
            );

            // Should intercept because the path matches after stripping query/fragment
            expect(mockCreateObjectURL).toHaveBeenCalled();
        });

        it("does not intercept non-string fileOrUrl arguments", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/data/file.txt", new Uint8Array([1]));

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            await resolver.activate(store);

            // Call with a non-string argument (e.g., File object)
            const fileObj = { name: "file.txt" };
            mockTools.LoadFile(fileObj, vi.fn());

            // Should pass through without interception
            expect(originalLoadFile).toHaveBeenCalledWith(
                fileObj,
                expect.any(Function),
                undefined,
                undefined,
                undefined,
                undefined
            );
            expect(mockCreateObjectURL).not.toHaveBeenCalled();
        });

        it("loads all session keys from AssetStore on activate", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/audio/footstep.ogg", new Uint8Array([1, 2]));
            assets.set("vishva/assets/textures/brick.jpg", new Uint8Array([3, 4]));

            const store = createMockStore(assets);

            await resolver.activate(store);

            expect(store.listKeys).toHaveBeenCalledTimes(1);
            expect(store.get).toHaveBeenCalledTimes(2);
        });
    });

    describe("deactivate", () => {
        it("restores original Tools.LoadFile", async () => {
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            const store = createMockStore(new Map());
            await resolver.activate(store);

            // LoadFile should be overridden
            expect(mockTools.LoadFile).not.toBe(originalLoadFile);

            resolver.deactivate();

            // LoadFile should be restored
            expect(mockTools.LoadFile).toBe(originalLoadFile);
        });

        it("revokes all created Blob URLs", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/a.jpg", new Uint8Array([1]));
            assets.set("vishva/assets/textures/b.jpg", new Uint8Array([2]));

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            mockCreateObjectURL
                .mockReturnValueOnce("blob:url-1")
                .mockReturnValueOnce("blob:url-2");

            await resolver.activate(store);

            // Trigger two interceptions to create blob URLs
            mockTools.LoadFile("vishva/assets/textures/a.jpg", vi.fn());
            mockTools.LoadFile("vishva/assets/textures/b.jpg", vi.fn());

            resolver.deactivate();

            // Both blob URLs should be revoked
            expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url-1");
            expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url-2");
            expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
        });

        it("is safe to call multiple times", async () => {
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            const store = createMockStore(new Map());
            await resolver.activate(store);
            resolver.deactivate();
            resolver.deactivate(); // Should not throw

            expect(mockTools.LoadFile).toBe(originalLoadFile);
        });

        it("clears the assetStore reference", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/a.jpg", new Uint8Array([1]));

            const store = createMockStore(assets);
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;
            mockCreateObjectURL.mockReturnValue("blob:fake");

            await resolver.activate(store);

            // Verify interception works
            mockTools.LoadFile("vishva/assets/textures/a.jpg", vi.fn());
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

            resolver.deactivate();

            // After deactivate, the resolver should not intercept anymore
            // (LoadFile is restored, so this just calls the original)
            mockCreateObjectURL.mockReset();
            mockTools.LoadFile("vishva/assets/textures/a.jpg", vi.fn());
            // originalLoadFile is called directly now (no blob URL creation)
            expect(mockCreateObjectURL).not.toHaveBeenCalled();
        });
    });

    describe("routing logic", () => {
        it("matches by full structured path", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/environment/skybox.env", new Uint8Array([99]));

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;
            mockCreateObjectURL.mockReturnValue("blob:skybox");

            await resolver.activate(store);

            // Exact structured path match
            mockTools.LoadFile("vishva/assets/environment/skybox.env", vi.fn());
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
        });

        it("disambiguates assets with same basename but different paths", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/brick.jpg", new Uint8Array([1, 1, 1]));
            assets.set("vishva/assets/curated/walls/brick.jpg", new Uint8Array([2, 2, 2]));

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            let blobCounter = 0;
            mockCreateObjectURL.mockImplementation(() => `blob:url-${++blobCounter}`);

            await resolver.activate(store);

            // Request first asset by full path
            mockTools.LoadFile("vishva/assets/textures/brick.jpg", vi.fn());
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

            // Request second asset by full path
            mockTools.LoadFile("vishva/assets/curated/walls/brick.jpg", vi.fn());
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);

            // Both should have been intercepted with different blob URLs
            expect(originalLoadFile).toHaveBeenCalledWith(
                "blob:url-1", expect.any(Function), undefined, undefined, undefined, undefined
            );
            expect(originalLoadFile).toHaveBeenCalledWith(
                "blob:url-2", expect.any(Function), undefined, undefined, undefined, undefined
            );
        });

        it("does not match partial path segments", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/textures/ground.jpg", new Uint8Array([1]));

            const store = createMockStore(assets);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            await resolver.activate(store);

            // "ground.jpg.bak" should NOT match
            mockTools.LoadFile("vishva/assets/textures/ground.jpg.bak", vi.fn());
            expect(mockCreateObjectURL).not.toHaveBeenCalled();
        });
    });

    describe("resolveAssetPaths", () => {
        it("resolves vishva/assets/ prefixed strings in objects", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/audio/footstep.ogg", new Uint8Array([1, 2, 3]));

            const store = createMockStore(assets);
            mockCreateObjectURL.mockReturnValue("blob:resolved-url");

            await resolver.activate(store);

            const obj = { sound: "vishva/assets/audio/footstep.ogg", name: "test" };
            resolver.resolveAssetPaths(obj);

            expect(obj.sound).toBe("blob:resolved-url");
            expect(obj.name).toBe("test"); // Non-asset strings unchanged
        });

        it("resolves vishva/assets/ prefixed strings in arrays", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/audio/footstep.ogg", new Uint8Array([1]));

            const store = createMockStore(assets);
            mockCreateObjectURL.mockReturnValue("blob:arr-url");

            await resolver.activate(store);

            const arr = ["vishva/assets/audio/footstep.ogg", "other-string"];
            resolver.resolveAssetPaths(arr);

            expect(arr[0]).toBe("blob:arr-url");
            expect(arr[1]).toBe("other-string");
        });

        it("does not resolve strings without vishva/assets/ prefix", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("vishva/assets/audio/footstep.ogg", new Uint8Array([1]));

            const store = createMockStore(assets);

            await resolver.activate(store);

            const obj = { path: "some/other/path.ogg" };
            resolver.resolveAssetPaths(obj);

            expect(obj.path).toBe("some/other/path.ogg");
        });
    });
});
