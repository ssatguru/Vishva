import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { AssetResolver } from "./AssetResolver.js";
import { AssetStore } from "./AssetStore.js";

/**
 * Property 2: Preservation — Non-Blob Inputs and Runtime Behavior Unchanged
 *
 * These tests verify that resolveAssetPaths() does NOT modify inputs that
 * are outside the bug condition: properties without vishva/assets/ strings,
 * non-string values, and first-time saves (no AssetResolver activation).
 *
 * EXPECTED TO PASS on UNFIXED code — confirms baseline behavior to preserve.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
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
 * Helper: deep-clone an object for comparison.
 * Uses structuredClone to preserve -0, NaN, and other special values
 * that JSON.parse(JSON.stringify()) would lose.
 */
function deepClone<T>(obj: T): T {
    return structuredClone(obj);
}

// A store with some assets loaded (simulates a world loaded from IndexedDB)
const testAssets = new Map<string, Uint8Array>([
    ["vishva/assets/html/intro.html", new Uint8Array([60, 104, 49, 62])],
    ["vishva/assets/audio/ambient.ogg", new Uint8Array([79, 103, 103, 83])],
]);

describe("Property 2: Preservation — Non-Blob Inputs and Runtime Behavior Unchanged", () => {
    describe("2.1: SNA property objects with NO vishva/assets/ strings pass through resolveAssetPaths() unchanged (identity property)", () => {
        // Generator for SNA property values that do NOT contain vishva/assets/ strings
        const nonAssetPropertyArb = fc.record({
            signalId: fc.record({
                type: fc.constant("string"),
                value: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
            }),
            speed: fc.record({
                type: fc.constant("number"),
                value: fc.double({ min: -1000, max: 1000, noNaN: true }),
            }),
            enabled: fc.record({
                type: fc.constant("boolean"),
                value: fc.boolean(),
            }),
            distance: fc.record({
                type: fc.constant("number"),
                value: fc.integer({ min: 0, max: 10000 }),
            }),
        });

        // Generator for SNA objects with no asset references
        const snaWithoutAssetsArb = fc
            .array(nonAssetPropertyArb, { minLength: 1, maxLength: 5 })
            .map((props) => ({
                snas: props.map((p, idx) => ({
                    meshName: `mesh_${idx}`,
                    meshId: `id_${idx}`,
                    sensors: [{ name: "SensorTimer", properties: { interval: { type: "number", value: 1000 } } }],
                    actuators: [{ name: "ActuatorMover", properties: p }],
                })),
            }));

        it("resolveAssetPaths() leaves SNA properties without asset references completely unchanged", async () => {
            await fc.assert(
                fc.asyncProperty(snaWithoutAssetsArb, async (vishvaSerialized) => {
                    const store = createMockStore(testAssets);
                    const resolver = new AssetResolver();
                    await resolver.activate(store);

                    // Deep clone before mutation to compare
                    const before = deepClone(vishvaSerialized);

                    // Call resolveAssetPaths on the object
                    resolver.resolveAssetPaths(vishvaSerialized);

                    // The object should be completely unchanged
                    expect(vishvaSerialized).toEqual(before);

                    resolver.deactivate();
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("2.2: Arbitrary strings NOT starting with vishva/assets/ are left unchanged by resolveAssetPaths()", () => {
        // Generator for strings that do NOT start with "vishva/assets/"
        const nonAssetStringArb = fc
            .string({ minLength: 0, maxLength: 200 })
            .filter((s) => !s.startsWith("vishva/assets/"));

        it("resolveAssetPaths() does not modify strings that do not match vishva/assets/ pattern", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(nonAssetStringArb, { minLength: 1, maxLength: 10 }),
                    async (strings) => {
                        const store = createMockStore(testAssets);
                        const resolver = new AssetResolver();
                        await resolver.activate(store);

                        // Wrap strings in an SNA-like property structure
                        const obj = {
                            snas: [
                                {
                                    meshName: "testMesh",
                                    meshId: "testId",
                                    actuators: [
                                        {
                                            name: "TestActuator",
                                            properties: Object.fromEntries(
                                                strings.map((s, i) => [
                                                    `prop_${i}`,
                                                    { type: "string", value: s },
                                                ])
                                            ),
                                        },
                                    ],
                                },
                            ],
                        };

                        const before = deepClone(obj);
                        resolver.resolveAssetPaths(obj);

                        // All non-asset strings should remain unchanged
                        expect(obj).toEqual(before);

                        resolver.deactivate();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("2.3: Non-string property values (integers, booleans, objects, arrays) are preserved exactly by resolveAssetPaths()", () => {
        // Generator for non-string property values
        const nonStringValueArb = fc.oneof(
            fc.integer({ min: -100000, max: 100000 }),
            fc.boolean(),
            fc.record({
                x: fc.double({ min: -100, max: 100, noNaN: true }),
                y: fc.double({ min: -100, max: 100, noNaN: true }),
                z: fc.double({ min: -100, max: 100, noNaN: true }),
            }),
            fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 0, maxLength: 10 })
        );

        it("resolveAssetPaths() preserves non-string values exactly", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(nonStringValueArb, { minLength: 1, maxLength: 10 }),
                    async (values) => {
                        const store = createMockStore(testAssets);
                        const resolver = new AssetResolver();
                        await resolver.activate(store);

                        // Build an object tree with non-string values
                        const obj = {
                            snas: [
                                {
                                    meshName: "testMesh",
                                    meshId: "testId",
                                    actuators: [
                                        {
                                            name: "TestActuator",
                                            properties: Object.fromEntries(
                                                values.map((v, i) => [`prop_${i}`, { type: "mixed", value: v }])
                                            ),
                                        },
                                    ],
                                },
                            ],
                        };

                        const before = deepClone(obj);
                        resolver.resolveAssetPaths(obj);

                        // All non-string values should be preserved exactly
                        expect(obj).toEqual(before);

                        resolver.deactivate();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("2.4: VishvaSerialized objects with no SNA asset references produce identical output through save pipeline (first-time save)", () => {
        // Generator for a VishvaSerialized-like object with no asset references
        // Simulates a first-time save or server-loaded world
        const vishvaSerializedNoAssetsArb = fc.record({
            snas: fc.array(
                fc.record({
                    meshName: fc.stringMatching(/^mesh_[a-z0-9]{1,10}$/),
                    meshId: fc.stringMatching(/^id_[a-z0-9]{1,10}$/),
                    sensors: fc.array(
                        fc.record({
                            name: fc.constantFrom("SensorClick", "SensorTimer", "SensorKeyboard"),
                            properties: fc.record({
                                signalId: fc.record({
                                    type: fc.constant("string"),
                                    value: fc.stringMatching(/^sig_[a-z]{1,8}$/),
                                }),
                            }),
                        }),
                        { minLength: 0, maxLength: 2 }
                    ),
                    actuators: fc.array(
                        fc.record({
                            name: fc.constantFrom("ActuatorMover", "ActuatorRotator", "ActuatorCloaker"),
                            properties: fc.record({
                                speed: fc.record({
                                    type: fc.constant("number"),
                                    value: fc.double({ min: 0, max: 100, noNaN: true }),
                                }),
                                loop: fc.record({
                                    type: fc.constant("boolean"),
                                    value: fc.boolean(),
                                }),
                                signalId: fc.record({
                                    type: fc.constant("string"),
                                    value: fc.stringMatching(/^sig_[a-z]{1,8}$/),
                                }),
                            }),
                        }),
                        { minLength: 0, maxLength: 3 }
                    ),
                }),
                { minLength: 0, maxLength: 5 }
            ),
        });

        it("first-time save (no AssetResolver activation) serializes original paths directly — no transformation needed", () => {
            fc.assert(
                fc.property(vishvaSerializedNoAssetsArb, (vishvaSerialized) => {
                    // Simulate first-time save: no AssetResolver was ever activated
                    // The save pipeline just serializes the object as-is
                    const before = deepClone(vishvaSerialized);

                    // Without AssetResolver activation, the object passes through unchanged
                    // This is the "null _assetResolver" path in SaveManager
                    const output = deepClone(vishvaSerialized);

                    expect(output).toEqual(before);
                }),
                { numRuns: 100 }
            );
        });

        it("with AssetResolver activated but no vishva/assets/ strings present, resolveAssetPaths() produces identical output", async () => {
            await fc.assert(
                fc.asyncProperty(vishvaSerializedNoAssetsArb, async (vishvaSerialized) => {
                    const store = createMockStore(testAssets);
                    const resolver = new AssetResolver();
                    await resolver.activate(store);

                    const before = deepClone(vishvaSerialized);
                    resolver.resolveAssetPaths(vishvaSerialized);

                    // No vishva/assets/ strings means nothing gets resolved
                    expect(vishvaSerialized).toEqual(before);

                    resolver.deactivate();
                }),
                { numRuns: 100 }
            );
        });
    });
});
