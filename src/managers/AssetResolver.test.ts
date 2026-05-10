import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AssetResolver } from "./AssetResolver.js";

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
            const assets = new Map<string, Uint8Array>();

            resolver.activate(assets);

            expect(mockTools.LoadFile).not.toBe(originalFn);
        });

        it("intercepts requests matching archive assets", async () => {
            const assetData = new Uint8Array([1, 2, 3, 4]);
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/ground.jpg", assetData);

            // Store original before activation
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            mockCreateObjectURL.mockReturnValue("blob:http://localhost/fake-blob-url");

            resolver.activate(assets);

            const onSuccess = vi.fn();
            const onProgress = vi.fn();

            // Call the overridden LoadFile with a URL that matches
            mockTools.LoadFile(
                "http://localhost:8080/bin/assets/ground.jpg",
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

        it("passes through non-matching requests to original LoadFile", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/ground.jpg", new Uint8Array([1, 2, 3]));

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            resolver.activate(assets);

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

        it("extracts filename from URL with path", async () => {
            const assetData = new Uint8Array([10, 20, 30]);
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/texture.png", assetData);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;
            mockCreateObjectURL.mockReturnValue("blob:fake");

            resolver.activate(assets);

            mockTools.LoadFile(
                "http://localhost:8080/some/deep/path/texture.png",
                vi.fn()
            );

            // Should intercept because filename "texture.png" matches "assets/texture.png"
            expect(mockCreateObjectURL).toHaveBeenCalled();
        });

        it("extracts filename stripping query strings and fragments", async () => {
            const assetData = new Uint8Array([5, 6, 7]);
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/model.babylon", assetData);

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;
            mockCreateObjectURL.mockReturnValue("blob:fake");

            resolver.activate(assets);

            mockTools.LoadFile(
                "http://localhost:8080/bin/model.babylon?v=123#section",
                vi.fn()
            );

            // Should intercept because filename "model.babylon" matches
            expect(mockCreateObjectURL).toHaveBeenCalled();
        });

        it("does not intercept non-string fileOrUrl arguments", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/file.txt", new Uint8Array([1]));

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            resolver.activate(assets);

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
    });

    describe("deactivate", () => {
        it("restores original Tools.LoadFile", async () => {
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            const assets = new Map<string, Uint8Array>();
            resolver.activate(assets);

            // LoadFile should be overridden
            expect(mockTools.LoadFile).not.toBe(originalLoadFile);

            resolver.deactivate();

            // LoadFile should be restored
            expect(mockTools.LoadFile).toBe(originalLoadFile);
        });

        it("revokes all created Blob URLs", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/a.jpg", new Uint8Array([1]));
            assets.set("assets/b.jpg", new Uint8Array([2]));

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            mockCreateObjectURL
                .mockReturnValueOnce("blob:url-1")
                .mockReturnValueOnce("blob:url-2");

            resolver.activate(assets);

            // Trigger two interceptions to create blob URLs
            mockTools.LoadFile("http://example.com/a.jpg", vi.fn());
            mockTools.LoadFile("http://example.com/b.jpg", vi.fn());

            resolver.deactivate();

            // Both blob URLs should be revoked
            expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url-1");
            expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url-2");
            expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
        });

        it("is safe to call multiple times", async () => {
            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            const assets = new Map<string, Uint8Array>();
            resolver.activate(assets);
            resolver.deactivate();
            resolver.deactivate(); // Should not throw

            expect(mockTools.LoadFile).toBe(originalLoadFile);
        });
    });

    describe("routing logic", () => {
        it("matches by filename only, ignoring path prefix", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/skybox.env", new Uint8Array([99]));

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;
            mockCreateObjectURL.mockReturnValue("blob:skybox");

            resolver.activate(assets);

            // Different path prefixes, same filename
            mockTools.LoadFile("/completely/different/path/skybox.env", vi.fn());
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

            mockTools.LoadFile("skybox.env", vi.fn());
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
        });

        it("does not match partial filenames", async () => {
            const assets = new Map<string, Uint8Array>();
            assets.set("assets/ground.jpg", new Uint8Array([1]));

            const originalLoadFile = vi.fn();
            mockTools.LoadFile = originalLoadFile;

            resolver.activate(assets);

            // "ground.jpg.bak" should NOT match "assets/ground.jpg"
            mockTools.LoadFile("http://example.com/ground.jpg.bak", vi.fn());
            expect(mockCreateObjectURL).not.toHaveBeenCalled();
        });
    });
});
