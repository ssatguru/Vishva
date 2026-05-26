import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { AssetResolver } from "./AssetResolver.js";
import { AssetStore } from "./AssetStore.js";

/**
 * Bug Condition Exploration Test / Expected Behavior Verification
 *
 * Property 1: Blob URLs Are Reverse-Mapped to Original Paths at Save Time
 *
 * This test simulates the full save pipeline:
 * 1. resolveAssetPaths() mutates the object (blob URLs appear — runtime use)
 * 2. reverseAllBlobUrls() is called on the same object (simulating what SaveManager does at save time)
 * 3. Assert no blob URLs remain — all asset references are vishva/assets/ paths
 *
 * With the fix in place, this test PASSES — confirming the expected behavior is satisfied.
 *
 * **Validates: Requirements 2.1, 2.3**
 */

// Mock the babylonjs module
vi.mock("babylonjs", () => {
    return {
        Tools: {
            LoadFile: vi.fn(),
            PreprocessUrl: (url: string) => url,
        },
    };
});

// Mock URL.createObjectURL and URL.revokeObjectURL for Node environment
let blobCounter = 0;
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
    blobCounter = 0;
    globalThis.Blob = class Blob {
        parts: any[];
        options: any;
        constructor(parts: any[], options?: any) {
            this.parts = parts;
            this.options = options;
        }
    } as any;
    globalThis.URL = globalThis.URL || ({} as any);
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
    mockCreateObjectURL.mockReset();
    mockRevokeObjectURL.mockReset();
    // Each call returns a unique blob URL
    mockCreateObjectURL.mockImplementation(() => {
        blobCounter++;
        return `blob:http://localhost:8080/${blobCounter}-fake-blob-id`;
    });
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
 * Helper: deep-traverse an object tree and collect all string values
 * that start with "blob:" — these represent the bug condition.
 */
function collectBlobUrls(obj: any): string[] {
    const blobUrls: string[] = [];
    if (obj === null || obj === undefined) return blobUrls;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            if (typeof item === "string" && item.startsWith("blob:")) {
                blobUrls.push(item);
            } else if (typeof item === "object" && item !== null) {
                blobUrls.push(...collectBlobUrls(item));
            }
        }
    } else if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === "string" && value.startsWith("blob:")) {
                blobUrls.push(value);
            } else if (typeof value === "object" && value !== null) {
                blobUrls.push(...collectBlobUrls(value));
            }
        }
    }
    return blobUrls;
}

/**
 * Helper: deep-traverse an object tree and collect all string values
 * that start with "vishva/assets/" — these are correct asset paths.
 */
function collectAssetPaths(obj: any): string[] {
    const paths: string[] = [];
    if (obj === null || obj === undefined) return paths;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            if (typeof item === "string" && item.startsWith("vishva/assets/")) {
                paths.push(item);
            } else if (typeof item === "object" && item !== null) {
                paths.push(...collectAssetPaths(item));
            }
        }
    } else if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === "string" && value.startsWith("vishva/assets/")) {
                paths.push(value);
            } else if (typeof value === "object" && value !== null) {
                paths.push(...collectAssetPaths(value));
            }
        }
    }
    return paths;
}

describe("Property 1: Bug Condition — Blob URLs Leak Into Serialized SNA Properties After Load-Save Cycle", () => {
    // Concrete asset paths that represent real SNA actuator file references
    const testAssets = new Map<string, Uint8Array>([
        ["vishva/assets/html/intro.html", new Uint8Array([60, 104, 49, 62, 72, 105, 60, 47, 104, 49, 62])], // <h1>Hi</h1>
        ["vishva/assets/audio/ambient.ogg", new Uint8Array([79, 103, 103, 83])], // OggS header stub
    ]);

    // Generator for SNA property objects containing asset paths
    // Simulates ActDialogParm.htmlFile and ActSoundParm.soundFile structures
    const snaPropertyWithAssetsArb = fc.record({
        name: fc.constantFrom("ActuatorDialog", "ActuatorSound"),
        properties: fc.constantFrom(
            // Dialog actuator with HTML file reference
            {
                htmlFile: { type: "FileInputType", value: "vishva/assets/html/intro.html" },
                title: { type: "string", value: "Welcome" },
                width: { type: "number", value: 400 },
            },
            // Sound actuator with audio file reference
            {
                soundFile: { type: "FileInputType", value: "vishva/assets/audio/ambient.ogg" },
                loop: { type: "boolean", value: true },
                volume: { type: "number", value: 0.8 },
            },
            // Both asset types in one actuator
            {
                htmlFile: { type: "FileInputType", value: "vishva/assets/html/intro.html" },
                soundFile: { type: "FileInputType", value: "vishva/assets/audio/ambient.ogg" },
                autoPlay: { type: "boolean", value: false },
            }
        ),
    });

    // Generator for VishvaSerialized-like objects with SNA properties
    const vishvaSerializedWithSnasArb = fc
        .array(snaPropertyWithAssetsArb, { minLength: 1, maxLength: 5 })
        .map((snas) => ({
            snas: snas.map((sna, idx) => ({
                meshName: `mesh_${idx}`,
                meshId: `id_${idx}`,
                sensors: [],
                actuators: [sna],
            })),
        }));

    it("after resolveAssetPaths(), serialized SNA properties SHALL NOT contain blob URLs — all asset references SHALL be vishva/assets/ paths", async () => {
        await fc.assert(
            fc.asyncProperty(
                vishvaSerializedWithSnasArb,
                async (vishvaSerialized) => {
                    // Step 1: Populate an AssetStore session with test assets
                    const store = createMockStore(testAssets);

                    // Step 2: Create AssetResolver, activate it, call resolveAssetPaths()
                    const resolver = new AssetResolver();
                    await resolver.activate(store);
                    resolver.resolveAssetPaths(vishvaSerialized);

                    // Step 3: Simulate the full save pipeline — SaveManager calls
                    // reverseAllBlobUrls() on the serialized SNA data at save time
                    // to restore original paths before writing to Vishva.json
                    resolver.reverseAllBlobUrls(vishvaSerialized);

                    // Step 4: Read back the property values
                    // This simulates what the save pipeline produces after reversal
                    const serializedOutput = vishvaSerialized;

                    // Step 5: Assert that ALL asset references are vishva/assets/ paths
                    // and NO blob URLs exist in the serialized output
                    const blobUrls = collectBlobUrls(serializedOutput.snas);
                    const assetPaths = collectAssetPaths(serializedOutput.snas);

                    // The expected behavior: no blob URLs in serialized output
                    expect(blobUrls).toHaveLength(0);
                    // And original asset paths should still be present
                    expect(assetPaths.length).toBeGreaterThan(0);

                    // Clean up
                    resolver.deactivate();
                }
            ),
            { numRuns: 50 }
        );
    });
});
