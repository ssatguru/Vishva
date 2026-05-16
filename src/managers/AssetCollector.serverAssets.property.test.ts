import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AssetCollector } from "./AssetCollector.js";

/**
 * Feature: save-world-static-assets, Property 1: Bug Condition — Server Asset Collection Incompleteness
 *
 * This test encodes the EXPECTED behavior: all `vishva/`-prefixed strings found anywhere
 * in a serialized scene object or VishvaSerialized object MUST appear in the collected
 * entries' `originalUrl` values.
 *
 * On UNFIXED code, this test WILL FAIL because:
 * - `_scanMaterials` only reads `value.name` from nested texture objects — it never
 *   iterates into `files` arrays (CubeTexture face URLs)
 * - VishvaSerialized is never passed to `collect()` at all
 *
 * Failure confirms the bug exists. After the fix, this test will pass.
 *
 * **Validates: Requirements 1.1, 1.2, 2.1**
 */

// Generator for vishva/ asset paths with valid extensions
const extensionArb = fc.constantFrom(".jpg", ".png", ".ogg", ".env", ".babylon", ".glb", ".hdr");
const pathSegmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,9}$/);

const vishvaPathArb = fc
    .tuple(
        fc.array(pathSegmentArb, { minLength: 1, maxLength: 3 }),
        extensionArb
    )
    .map(([segments, ext]) => `vishva/assets/${segments.join("/")}${ext}`);

describe("Property 1: Bug Condition — Server Asset Collection Incompleteness", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    /**
     * Case 1: CubeTexture files array in materials
     *
     * BabylonJS serializes CubeTextures with a `files` array containing 6 face URLs.
     * The current `_scanMaterials` only reads `value.name` — it never iterates into arrays.
     * This means `vishva/`-prefixed strings in `files` arrays are never collected.
     */
    it("Case 1: vishva/ paths in materials[].reflectionTexture.files are collected", () => {
        fc.assert(
            fc.property(
                // Generate 6 unique face URLs for a CubeTexture (px, nx, py, ny, pz, nz)
                fc.tuple(
                    vishvaPathArb, vishvaPathArb, vishvaPathArb,
                    vishvaPathArb, vishvaPathArb, vishvaPathArb
                ),
                (faceUrls) => {
                    const scene = {
                        materials: [
                            {
                                name: "skyboxMaterial",
                                reflectionTexture: {
                                    name: "vishva/assets/curated/skyboxes/TropicalSunnyDay/TropicalSunnyDay",
                                    isCube: true,
                                    files: [...faceUrls],
                                },
                            },
                        ],
                    };

                    const entries = collector.collectServerAssets(scene, baseUrl);
                    const collectedUrls = new Set(entries.map((e) => e.originalUrl));

                    // All 6 face URLs from the files array must be collected
                    for (const faceUrl of faceUrls) {
                        expect(collectedUrls.has(faceUrl)).toBe(true);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Case 2: Deeply nested arrays containing vishva/-prefixed strings
     *
     * CubeTextures with isCube: true have a `files` array of 6 face URLs nested
     * inside a material's texture property. The current field-specific scanner
     * never recurses into arrays within texture objects.
     */
    it("Case 2: vishva/ paths in deeply nested arrays (CubeTexture files) are collected", () => {
        fc.assert(
            fc.property(
                fc.array(vishvaPathArb, { minLength: 1, maxLength: 6 }),
                (vishvaPaths) => {
                    // Place vishva/ paths in a deeply nested structure:
                    // materials[0].emissiveTexture.files[...]
                    const scene = {
                        materials: [
                            {
                                name: "mat1",
                                emissiveTexture: {
                                    name: "some-base-path",
                                    isCube: true,
                                    files: [...vishvaPaths],
                                },
                            },
                        ],
                    };

                    const entries = collector.collectServerAssets(scene, baseUrl);
                    const collectedUrls = new Set(entries.map((e) => e.originalUrl));

                    // All vishva/ paths from the nested files array must be collected
                    for (const path of vishvaPaths) {
                        expect(collectedUrls.has(path)).toBe(true);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Case 3: VishvaSerialized-like object with vishva/-prefixed strings
     *
     * VishvaSerialized contains sound references and other asset paths that are
     * never passed to `collect()` at all. Even if we pass the VishvaSerialized
     * object to `collect()`, the field-specific scanning won't find strings in
     * arbitrary nested locations like `avSerialized.settings.sound.name`.
     */
    it("Case 3: vishva/ paths in VishvaSerialized-like nested objects are collected", () => {
        fc.assert(
            fc.property(
                vishvaPathArb,
                vishvaPathArb,
                (soundPath, otherAssetPath) => {
                    // Simulate a VishvaSerialized object structure passed to collectServerAssets()
                    const vishvaSerialized = {
                        avSerialized: {
                            settings: {
                                sound: {
                                    name: soundPath,
                                },
                            },
                        },
                        snas: [
                            {
                                actuator: {
                                    props: {
                                        soundFile: {
                                            value: otherAssetPath,
                                        },
                                    },
                                },
                            },
                        ],
                    };

                    // collectServerAssets() does deep-traversal and finds all vishva/ paths
                    const entries = collector.collectServerAssets(vishvaSerialized, baseUrl);
                    const collectedUrls = new Set(entries.map((e) => e.originalUrl));

                    // Both vishva/ paths must be collected
                    expect(collectedUrls.has(soundPath)).toBe(true);
                    expect(collectedUrls.has(otherAssetPath)).toBe(true);
                }
            ),
            { numRuns: 50 }
        );
    });
});
