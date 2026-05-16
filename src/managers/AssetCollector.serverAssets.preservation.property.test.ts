import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AssetCollector } from "./AssetCollector.js";
import { PathRewriter } from "./PathRewriter.js";

/**
 * Feature: save-world-static-assets, Property 2: Preservation — Non-Server-Asset Behavior Unchanged
 *
 * These tests capture baseline behavior that MUST remain unchanged after the fix.
 * They verify that inputs NOT containing `vishva/`-prefixed server asset strings
 * are handled identically before and after the fix.
 *
 * All tests PASS on UNFIXED code (confirms baseline behavior to preserve).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

// --- Generators ---

// Generator for base64 data URI strings (embedded textures)
const mimeTypeArb = fc.constantFrom("image/png", "image/jpeg", "image/gif", "audio/ogg");
const base64DataArb = fc.uint8Array({ minLength: 1, maxLength: 64 }).map((data) => {
    const base64 = Buffer.from(data).toString("base64");
    return base64;
});
const dataUriArb = fc.tuple(mimeTypeArb, base64DataArb).map(
    ([mime, data]) => `data:${mime};base64,${data}`
);

// Generator for blob URL strings
const uuidArb = fc.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const blobUrlArb = uuidArb.map((uuid) => `blob:http://localhost:8080/${uuid}`);

// Generator for already-archived paths (assets/ prefix)
const filenameSegmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/);
const extensionArb = fc.constantFrom(".jpg", ".png", ".ogg", ".env", ".babylon", ".glb");
const archivedPathArb = fc.tuple(filenameSegmentArb, extensionArb).map(
    ([name, ext]) => `assets/${name}${ext}`
);

// Generator for non-vishva/ paths (regular external assets that DON'T start with vishva/)
const nonVishvaPathArb = fc
    .tuple(
        fc.array(filenameSegmentArb, { minLength: 1, maxLength: 3 }),
        extensionArb
    )
    .map(([segments, ext]) => segments.join("/") + ext)
    // Ensure it doesn't accidentally start with "vishva/" or "assets/" or "data:" or "blob:"
    .filter(
        (path) =>
            !path.startsWith("vishva/") &&
            !path.startsWith("assets/") &&
            !path.startsWith("data:") &&
            !path.startsWith("blob:")
    );

describe("Property 2: Preservation — Non-Server-Asset Behavior Unchanged", () => {
    const collector = new AssetCollector();
    const rewriter = new PathRewriter();
    const baseUrl = "http://localhost:8080/bin/";

    /**
     * Property 2a: For all scene objects containing ONLY embedded textures (base64String
     * data URIs), blob URLs, already-archived paths (assets/ prefix), or plain non-URL
     * strings — collect() returns NO entries for blob URLs, already-archived paths, or
     * non-vishva strings that don't match known scanned fields.
     *
     * This confirms that the existing collect() correctly skips:
     * - blob URLs (handled by collectBlobTextures)
     * - already-archived paths (assets/ prefix)
     * - embedded textures produce entries with decodedData (not server fetches)
     *
     * After the fix, collectServerAssets() on these same inputs should return empty.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    describe("Property 2a: Non-server-asset inputs produce no server-asset-like entries", () => {
        // Generator for scenes with ONLY non-server-asset content
        const nonServerAssetSceneArb = fc
            .record({
                embeddedTextures: fc.array(dataUriArb, { minLength: 0, maxLength: 3 }),
                blobTextures: fc.array(blobUrlArb, { minLength: 0, maxLength: 3 }),
                archivedPaths: fc.array(archivedPathArb, { minLength: 0, maxLength: 3 }),
                plainStrings: fc.array(
                    fc.constantFrom("", "some-random-text", "123", "no-url-here"),
                    { minLength: 0, maxLength: 2 }
                ),
            })
            .map((data) => {
                const scene: Record<string, any> = {};

                // Place embedded textures in textures[] with base64String field
                if (data.embeddedTextures.length > 0) {
                    scene.textures = data.embeddedTextures.map((dataUri) => ({
                        name: "embedded_tex",
                        base64String: dataUri,
                    }));
                }

                // Place blob URLs in textures[] (these are skipped by collect, handled by collectBlobTextures)
                if (data.blobTextures.length > 0) {
                    const blobTextures = data.blobTextures.map((blobUrl) => ({
                        name: blobUrl,
                        url: blobUrl,
                    }));
                    scene.textures = [...(scene.textures || []), ...blobTextures];
                }

                // Place already-archived paths in materials (these are skipped by collect)
                if (data.archivedPaths.length > 0) {
                    scene.materials = data.archivedPaths.map((path) => ({
                        diffuseTexture: { name: path },
                    }));
                }

                return scene;
            });

        it("collect() returns no entries with vishva/ prefix for non-server-asset scenes", () => {
            fc.assert(
                fc.property(nonServerAssetSceneArb, (scene) => {
                    const entries = collector.collect(scene, baseUrl);

                    // None of the collected entries should have a vishva/ prefixed originalUrl
                    // (because we didn't put any vishva/ strings in the scene)
                    for (const entry of entries) {
                        expect(entry.originalUrl.startsWith("vishva/")).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("collect() skips blob URLs entirely", () => {
            fc.assert(
                fc.property(
                    fc.array(blobUrlArb, { minLength: 1, maxLength: 5 }),
                    (blobUrls) => {
                        const scene = {
                            textures: blobUrls.map((url) => ({ name: url, url })),
                        };

                        const entries = collector.collect(scene, baseUrl);

                        // No blob URLs should appear in collected entries
                        for (const entry of entries) {
                            expect(entry.originalUrl.startsWith("blob:")).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("collect() skips already-archived paths (assets/ prefix)", () => {
            fc.assert(
                fc.property(
                    fc.array(archivedPathArb, { minLength: 1, maxLength: 5 }),
                    (archivedPaths) => {
                        const scene = {
                            textures: archivedPaths.map((path) => ({ name: path })),
                            materials: archivedPaths.map((path) => ({
                                diffuseTexture: { name: path },
                            })),
                        };

                        const entries = collector.collect(scene, baseUrl);

                        // No assets/ prefixed paths should appear in collected entries
                        for (const entry of entries) {
                            expect(entry.originalUrl.startsWith("assets/")).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("collect() on a scene with no external assets returns empty array", () => {
            fc.assert(
                fc.property(
                    fc.array(dataUriArb, { minLength: 0, maxLength: 3 }),
                    (dataUris) => {
                        // Scene with only embedded textures (base64String) — collect() skips these
                        const scene: Record<string, any> = {};
                        if (dataUris.length > 0) {
                            scene.textures = dataUris.map((uri) => ({
                                name: "embedded",
                                base64String: uri,
                            }));
                        }

                        const entries = collector.collect(scene, baseUrl);

                        // Embedded textures with base64String are skipped by collect()
                        // (they're handled by collectEmbeddedTextures instead)
                        expect(entries.length).toBe(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 2b: For all scene objects with no vishva/-prefixed strings, the existing
     * collect() method returns the same results (stable behavior).
     *
     * We generate scenes with textures[].name, materials[].*.name, particleSystems[].textureName
     * using non-vishva/ paths and verify collect() returns entries for all of them consistently.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    describe("Property 2b: collect() behavior unchanged for non-vishva/ scenes", () => {
        // Generator for scenes with non-vishva/ paths in known scanned fields
        const nonVishvaSceneArb = fc
            .record({
                textureNames: fc.array(nonVishvaPathArb, { minLength: 0, maxLength: 4 }),
                materialTextures: fc.array(
                    fc.record({
                        diffuse: fc.option(nonVishvaPathArb, { nil: undefined }),
                        bump: fc.option(nonVishvaPathArb, { nil: undefined }),
                    }),
                    { minLength: 0, maxLength: 3 }
                ),
                particleTextures: fc.array(nonVishvaPathArb, { minLength: 0, maxLength: 3 }),
            })
            .map((data) => {
                const scene: Record<string, any> = {};
                const expectedUrls = new Set<string>();

                // Build textures array
                if (data.textureNames.length > 0) {
                    scene.textures = data.textureNames.map((name) => ({ name }));
                    for (const name of data.textureNames) expectedUrls.add(name);
                }

                // Build materials array
                if (data.materialTextures.length > 0) {
                    scene.materials = data.materialTextures.map((mat) => {
                        const material: Record<string, any> = { name: "mat" };
                        if (mat.diffuse !== undefined) {
                            material.diffuseTexture = { name: mat.diffuse };
                            expectedUrls.add(mat.diffuse);
                        }
                        if (mat.bump !== undefined) {
                            material.bumpTexture = { name: mat.bump };
                            expectedUrls.add(mat.bump);
                        }
                        return material;
                    });
                }

                // Build particleSystems array
                if (data.particleTextures.length > 0) {
                    scene.particleSystems = data.particleTextures.map((textureName) => ({
                        textureName,
                    }));
                    for (const t of data.particleTextures) expectedUrls.add(t);
                }

                return { scene, expectedUrls };
            });

        it("collect() returns entries for all non-vishva/ paths in known fields", () => {
            fc.assert(
                fc.property(nonVishvaSceneArb, ({ scene, expectedUrls }) => {
                    const entries = collector.collect(scene, baseUrl);
                    const collectedUrls = new Set(entries.map((e) => e.originalUrl));

                    // Every non-vishva/ URL placed in known fields must be collected
                    for (const url of expectedUrls) {
                        expect(collectedUrls.has(url)).toBe(true);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("collect() called twice on the same scene returns identical results", () => {
            fc.assert(
                fc.property(nonVishvaSceneArb, ({ scene }) => {
                    const entries1 = collector.collect(scene, baseUrl);
                    const entries2 = collector.collect(scene, baseUrl);

                    // Same number of entries
                    expect(entries1.length).toBe(entries2.length);

                    // Same originalUrls in same order
                    for (let i = 0; i < entries1.length; i++) {
                        expect(entries1[i].originalUrl).toBe(entries2[i].originalUrl);
                        expect(entries1[i].fetchUrl).toBe(entries2[i].fetchUrl);
                        expect(entries1[i].archiveFilename).toBe(entries2[i].archiveFilename);
                    }
                }),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 2c: For all scene objects, PathRewriter.rewrite() with an empty entries
     * list leaves the object unchanged (deep equality).
     *
     * This ensures that calling rewrite() with no entries to rewrite is a no-op,
     * preserving the original object structure exactly.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    describe("Property 2c: PathRewriter.rewrite() with empty entries is a no-op", () => {
        // Generator for arbitrary scene-like objects with various value types
        const leafValueArb = fc.oneof(
            { weight: 3, arbitrary: fc.string() },
            { weight: 2, arbitrary: nonVishvaPathArb },
            { weight: 1, arbitrary: dataUriArb },
            { weight: 1, arbitrary: blobUrlArb },
            { weight: 1, arbitrary: archivedPathArb },
            // Use integer to avoid -0/NaN/Infinity issues with JSON round-trip
            { weight: 2, arbitrary: fc.integer({ min: -10000, max: 10000 }) },
            { weight: 1, arbitrary: fc.boolean() },
            { weight: 1, arbitrary: fc.constant(null) }
        );

        // Generate nested objects up to depth 3
        const nestedObjectArb: fc.Arbitrary<Record<string, any>> = fc.dictionary(
            fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
            fc.oneof(
                { weight: 3, arbitrary: leafValueArb },
                {
                    weight: 1,
                    arbitrary: fc.array(leafValueArb, { minLength: 0, maxLength: 4 }),
                },
                {
                    weight: 1,
                    arbitrary: fc.dictionary(
                        fc.stringMatching(/^[a-z][a-z0-9]{0,4}$/),
                        leafValueArb,
                        { minKeys: 0, maxKeys: 3 }
                    ),
                }
            ),
            { minKeys: 1, maxKeys: 6 }
        );

        it("rewrite() with empty entries list does not modify the object", () => {
            fc.assert(
                fc.property(nestedObjectArb, (obj) => {
                    // Deep clone the object to compare after rewrite
                    const original = JSON.parse(JSON.stringify(obj));

                    // Call rewrite with empty entries
                    rewriter.rewrite(obj, []);

                    // Object should be unchanged (deep equality)
                    expect(obj).toEqual(original);
                }),
                { numRuns: 100 }
            );
        });

        it("rewrite() with undefined entries does not modify the object", () => {
            fc.assert(
                fc.property(nestedObjectArb, (obj) => {
                    // Deep clone the object to compare after rewrite
                    const original = JSON.parse(JSON.stringify(obj));

                    // Call rewrite with undefined/null entries (edge case)
                    rewriter.rewrite(obj, undefined as any);

                    // Object should be unchanged (deep equality)
                    expect(obj).toEqual(original);
                }),
                { numRuns: 100 }
            );
        });

        it("rewrite() with entries that don't match any strings in the object leaves it unchanged", () => {
            fc.assert(
                fc.property(
                    nestedObjectArb,
                    fc.array(nonVishvaPathArb, { minLength: 1, maxLength: 3 }),
                    (obj, nonMatchingPaths) => {
                        // Deep clone the object to compare after rewrite
                        const original = JSON.parse(JSON.stringify(obj));

                        // Create entries with URLs that definitely don't exist in the object
                        // by using a unique prefix
                        const entries = nonMatchingPaths.map((path, i) => ({
                            originalUrl: `__nonexistent_prefix__/${path}`,
                            fetchUrl: `http://localhost:8080/bin/__nonexistent_prefix__/${path}`,
                            archiveFilename: `asset_${i}.bin`,
                        }));

                        rewriter.rewrite(obj, entries);

                        // Object should be unchanged since no strings matched
                        expect(obj).toEqual(original);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
