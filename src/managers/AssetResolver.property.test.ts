import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
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

/**
 * Feature: standalone-world-archive, Property 8: Asset Resolver Request Routing
 *
 * For any asset filename and an asset map, a file request through the Asset Resolver
 * SHALL be intercepted and served from the map if and only if the filename exists as
 * a key in the asset map; otherwise, the request SHALL pass through to the original
 * file loading mechanism.
 *
 * **Validates: Requirements 5.2, 5.4**
 */
describe("Property 8: Asset Resolver Request Routing", () => {
    // Generator for valid asset filenames (e.g., "texture.jpg", "model.babylon")
    const filenameArb = fc
        .tuple(
            fc.stringMatching(/^[a-z][a-z0-9_-]{0,12}$/),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg", ".mp3")
        )
        .map(([name, ext]) => name + ext);

    // Generator for URL path prefixes
    const pathPrefixArb = fc
        .array(fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/), { minLength: 1, maxLength: 4 })
        .map((segments) => segments.join("/"));

    // Generator for a full request URL given a filename
    const requestUrlArb = (filename: string) =>
        fc
            .tuple(
                fc.constantFrom("http://localhost:8080", "http://example.com", "https://cdn.test.io"),
                pathPrefixArb
            )
            .map(([origin, path]) => `${origin}/${path}/${filename}`);

    // Generator for random binary data (small, for asset content)
    const binaryDataArb = fc.uint8Array({ minLength: 1, maxLength: 64 });

    // Generator for an asset map: a set of filenames with random binary data
    const assetMapArb = fc
        .array(fc.tuple(filenameArb, binaryDataArb), { minLength: 1, maxLength: 10 })
        .map((entries) => {
            // Deduplicate by filename
            const map = new Map<string, Uint8Array>();
            for (const [filename, data] of entries) {
                map.set(`assets/${filename}`, data);
            }
            return map;
        })
        .filter((map) => map.size >= 1);

    it("intercepts request if and only if the filename exists in the asset map", async () => {
        const babylonjs = await import("babylonjs");
        const mockTools = babylonjs.Tools as any;

        fc.assert(
            fc.property(
                assetMapArb,
                filenameArb,
                pathPrefixArb,
                fc.boolean(),
                (assetMap, requestFilename, pathPrefix, useMatchingFilename) => {
                    // Determine whether we'll request a filename that's in the map or not
                    const assetFilenames = [...assetMap.keys()].map((key) =>
                        key.replace("assets/", "")
                    );

                    let targetFilename: string;
                    if (useMatchingFilename && assetFilenames.length > 0) {
                        // Pick a filename that IS in the map
                        targetFilename = assetFilenames[0];
                    } else {
                        // Use the generated filename which may or may not be in the map
                        targetFilename = requestFilename;
                    }

                    const requestUrl = `http://example.com/${pathPrefix}/${targetFilename}`;
                    const shouldIntercept = assetMap.has(`assets/${targetFilename}`);

                    // Set up mocks
                    mockCreateObjectURL.mockReset();
                    const originalLoadFile = vi.fn();
                    mockTools.LoadFile = originalLoadFile;
                    mockCreateObjectURL.mockReturnValue("blob:http://localhost/fake-url");

                    // Activate the resolver
                    const resolver = new AssetResolver();
                    resolver.activate(assetMap);

                    // Make the request
                    const onSuccess = vi.fn();
                    mockTools.LoadFile(requestUrl, onSuccess);

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
                            requestUrl,
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
