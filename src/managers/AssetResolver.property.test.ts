import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
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

/**
 * Feature: indexeddb-asset-storage, Property 8: Asset Resolver Request Routing
 *
 * For any asset with a structured path key and an AssetStore, a file request through
 * the Asset Resolver SHALL be intercepted and served from the store if and only if
 * the structured path exists as a key in the store; otherwise, the request SHALL
 * pass through to the original file loading mechanism.
 *
 * **Validates: Requirements 2.1, 5.2**
 */
describe("Property 8: Asset Resolver Request Routing (structured paths)", () => {
    // Generator for valid path segments
    const pathSegmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,12}$/);

    // Generator for valid asset filenames
    const filenameArb = fc
        .tuple(
            fc.stringMatching(/^[a-z][a-z0-9_-]{0,12}$/),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg", ".mp3")
        )
        .map(([name, ext]) => name + ext);

    // Generator for structured path keys (vishva/assets/<subdir>/<filename>)
    const structuredPathArb = fc
        .tuple(
            fc.array(pathSegmentArb, { minLength: 1, maxLength: 3 }),
            filenameArb
        )
        .map(([dirs, filename]) => `vishva/assets/${dirs.join("/")}/${filename}`);

    // Generator for random binary data (small, for asset content)
    const binaryDataArb = fc.uint8Array({ minLength: 1, maxLength: 64 });

    // Generator for an asset map with structured path keys
    const assetMapArb = fc
        .array(fc.tuple(structuredPathArb, binaryDataArb), { minLength: 1, maxLength: 10 })
        .map((entries) => {
            const map = new Map<string, Uint8Array>();
            for (const [path, data] of entries) {
                map.set(path, data);
            }
            return map;
        })
        .filter((map) => map.size >= 1);

    it("intercepts request if and only if the structured path exists in the store", async () => {
        const babylonjs = await import("babylonjs");
        const mockTools = babylonjs.Tools as any;

        await fc.assert(
            fc.asyncProperty(
                assetMapArb,
                structuredPathArb,
                fc.boolean(),
                async (assetMap, requestPath, useMatchingPath) => {
                    // Determine whether we'll request a path that's in the map or not
                    const assetPaths = [...assetMap.keys()];

                    let targetPath: string;
                    if (useMatchingPath && assetPaths.length > 0) {
                        // Pick a path that IS in the map
                        targetPath = assetPaths[0];
                    } else {
                        // Use the generated path which may or may not be in the map
                        targetPath = requestPath;
                    }

                    const shouldIntercept = assetMap.has(targetPath);

                    // Set up mocks
                    mockCreateObjectURL.mockReset();
                    const originalLoadFile = vi.fn();
                    mockTools.LoadFile = originalLoadFile;
                    mockCreateObjectURL.mockReturnValue("blob:http://localhost/fake-url");

                    // Activate the resolver with mock store
                    const store = createMockStore(assetMap);
                    const resolver = new AssetResolver();
                    await resolver.activate(store);

                    // Make the request
                    const onSuccess = vi.fn();
                    mockTools.LoadFile(targetPath, onSuccess);

                    if (shouldIntercept) {
                        // Interception occurred: a Blob URL was created
                        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
                        // Original LoadFile was called with the blob URL (not the original URL)
                        expect(originalLoadFile).toHaveBeenCalledWith(
                            "blob:http://localhost/fake-url",
                            onSuccess,
                            undefined,
                            undefined,
                            undefined,
                            undefined
                        );
                    } else {
                        // No interception: no Blob URL created
                        expect(mockCreateObjectURL).not.toHaveBeenCalled();
                        // Original LoadFile was called with the original URL
                        expect(originalLoadFile).toHaveBeenCalledWith(
                            targetPath,
                            onSuccess,
                            undefined,
                            undefined,
                            undefined,
                            undefined
                        );
                    }

                    // Clean up
                    resolver.deactivate();
                }
            ),
            { numRuns: 100 }
        );
    });
});
