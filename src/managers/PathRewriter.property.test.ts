import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { PathRewriter } from "./PathRewriter.js";
import { AssetEntry } from "./AssetCollector.js";

/**
 * Feature: standalone-world-archive, Property 5: Path Rewriting Completeness
 *
 * For any serialized scene JSON and a set of asset entries with original-to-archive
 * filename mappings, after the Path Rewriter processes the JSON, no original asset URL
 * (including data URIs) SHALL remain in the output — every occurrence SHALL be replaced
 * with the corresponding `assets/<archiveFilename>` path.
 *
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */
describe("Property 5: Path Rewriting Completeness", () => {
    const rewriter = new PathRewriter();

    /**
     * Helper: Collect all string values from a nested object/array via deep traversal.
     */
    function collectAllStrings(obj: any): string[] {
        const strings: string[] = [];

        function traverse(value: any): void {
            if (value === null || value === undefined) return;
            if (typeof value === "string") {
                strings.push(value);
            } else if (Array.isArray(value)) {
                for (const item of value) {
                    traverse(item);
                }
            } else if (typeof value === "object") {
                for (const key of Object.keys(value)) {
                    traverse(value[key]);
                }
            }
        }

        traverse(obj);
        return strings;
    }

    // Generator for non-empty relative URL path segments
    const segmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/);

    // Generator for non-empty relative URL paths (simulating real asset URLs)
    const urlArb = fc
        .tuple(
            fc.array(segmentArb, { minLength: 1, maxLength: 3 }),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg")
        )
        .map(([segments, ext]) => segments.join("/") + ext);

    // Generator for data URIs (base64-encoded)
    const dataUriArb = fc
        .tuple(
            fc.constantFrom("image/png", "image/jpeg", "audio/ogg", "application/octet-stream"),
            fc.uint8Array({ minLength: 1, maxLength: 64 })
        )
        .map(([mimeType, data]) => {
            const base64 = Buffer.from(data).toString("base64");
            return `data:${mimeType};base64,${base64}`;
        });

    // Combined generator for either a relative URL or a data URI
    const assetUrlArb = fc.oneof(
        { weight: 3, arbitrary: urlArb },
        { weight: 1, arbitrary: dataUriArb }
    );

    // Generator for archive filenames (unique per entry)
    const archiveFilenameArb = fc
        .tuple(
            fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".ogg")
        )
        .map(([name, ext]) => name + ext);

    // Generator for a scene JSON with asset URLs placed in various locations
    const sceneWithAssetsArb = fc
        .array(
            fc.tuple(assetUrlArb, archiveFilenameArb),
            { minLength: 1, maxLength: 8 }
        )
        // Ensure unique originalUrls and unique archiveFilenames
        .map((pairs) => {
            const seenUrls = new Set<string>();
            const seenFilenames = new Set<string>();
            const uniquePairs: Array<[string, string]> = [];
            for (const [url, filename] of pairs) {
                if (!seenUrls.has(url) && !seenFilenames.has(filename)) {
                    seenUrls.add(url);
                    seenFilenames.add(filename);
                    uniquePairs.push([url, filename]);
                }
            }
            return uniquePairs;
        })
        .filter((pairs) => pairs.length >= 1)
        .chain((pairs) => {
            // For each URL, decide which scene locations to place it in
            const placementsArb = fc.tuple(
                ...pairs.map(() =>
                    fc.subarray(
                        [
                            "textureName",
                            "textureUrl",
                            "materialDiffuse",
                            "materialBump",
                            "particleSystem",
                            "meshFile",
                            "environmentTexture",
                            "reflectionTextureName",
                            "deepNested",
                            "arrayDirect",
                        ] as const,
                        { minLength: 1, maxLength: 5 }
                    )
                )
            );

            return placementsArb.map((allPlacements) => ({ pairs, allPlacements }));
        })
        .map(({ pairs, allPlacements }) => {
            const scene: Record<string, any> = {};
            const textures: any[] = [];
            const materials: any[] = [];
            const particleSystems: any[] = [];
            const meshes: any[] = [];
            const deepObjects: any[] = [];
            const directArrays: string[] = [];

            // Track which singular fields have been used (only one value allowed)
            let envTextureUsed = false;
            let reflectionTextureUsed = false;

            for (let i = 0; i < pairs.length; i++) {
                const [url] = pairs[i];
                const placements = allPlacements[i];

                for (const placement of placements) {
                    switch (placement) {
                        case "textureName":
                            textures.push({ name: url, type: "Texture" });
                            break;
                        case "textureUrl":
                            textures.push({ url, type: "Texture" });
                            break;
                        case "materialDiffuse":
                            materials.push({ diffuseTexture: { name: url } });
                            break;
                        case "materialBump":
                            materials.push({ bumpTexture: { name: url } });
                            break;
                        case "particleSystem":
                            particleSystems.push({ textureName: url });
                            break;
                        case "meshFile":
                            meshes.push({ delayLoadingFile: url });
                            break;
                        case "environmentTexture":
                            if (!envTextureUsed) {
                                scene.environmentTexture = url;
                                envTextureUsed = true;
                            }
                            break;
                        case "reflectionTextureName":
                            if (!reflectionTextureUsed) {
                                scene.reflectionTexture = { name: url };
                                reflectionTextureUsed = true;
                            }
                            break;
                        case "deepNested":
                            deepObjects.push({
                                level1: { level2: { someRef: url } },
                            });
                            break;
                        case "arrayDirect":
                            directArrays.push(url);
                            break;
                    }
                }
            }

            if (textures.length > 0) scene.textures = textures;
            if (materials.length > 0) scene.materials = materials;
            if (particleSystems.length > 0) scene.particleSystems = particleSystems;
            if (meshes.length > 0) scene.meshes = meshes;
            if (deepObjects.length > 0) scene.deepObjects = deepObjects;
            if (directArrays.length > 0) scene.directArrays = directArrays;

            // Build AssetEntry objects
            const assetEntries: AssetEntry[] = pairs.map(([originalUrl, archiveFilename]) => ({
                originalUrl,
                fetchUrl: originalUrl.startsWith("data:")
                    ? originalUrl
                    : `http://localhost:8080/bin/${originalUrl}`,
                archiveFilename,
                ...(originalUrl.startsWith("data:")
                    ? { decodedData: new Uint8Array([1, 2, 3]) }
                    : {}),
            }));

            // Collect the set of original URLs for verification
            const originalUrls = new Set(pairs.map(([url]) => url));

            return { scene, assetEntries, originalUrls };
        });

    it("no original URL or data URI remains in the output after rewriting", () => {
        fc.assert(
            fc.property(sceneWithAssetsArb, ({ scene, assetEntries, originalUrls }) => {
                // Run PathRewriter
                rewriter.rewrite(scene, assetEntries);

                // Deep-traverse the resulting scene and collect all string values
                const allStrings = collectAllStrings(scene);

                // Assert that NO original URL remains anywhere in the output
                for (const str of allStrings) {
                    for (const originalUrl of originalUrls) {
                        expect(str).not.toBe(originalUrl);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("all replaced values start with 'assets/'", () => {
        fc.assert(
            fc.property(sceneWithAssetsArb, ({ scene, assetEntries, originalUrls }) => {
                // Run PathRewriter
                rewriter.rewrite(scene, assetEntries);

                // Build expected replacement map
                const expectedReplacements = new Map<string, string>();
                for (const entry of assetEntries) {
                    expectedReplacements.set(entry.originalUrl, `assets/${entry.archiveFilename}`);
                }

                // Deep-traverse the resulting scene and collect all string values
                const allStrings = collectAllStrings(scene);

                // Every string that was an asset path should now start with "assets/"
                const replacementValues = new Set(expectedReplacements.values());
                for (const str of allStrings) {
                    // If this string is one of the replacement values, verify it starts with "assets/"
                    if (replacementValues.has(str)) {
                        expect(str.startsWith("assets/")).toBe(true);
                    }
                }

                // Verify no original URL remains
                for (const str of allStrings) {
                    expect(originalUrls.has(str)).toBe(false);
                }
            }),
            { numRuns: 100 }
        );
    });
});
