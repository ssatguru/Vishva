import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AssetCollector } from "./AssetCollector.js";

/**
 * Feature: standalone-world-archive, Property 1: Asset Collection Completeness
 *
 * For any serialized scene JSON object containing asset URL references in texture
 * name fields, material texture references, particle system textureName fields,
 * or environment texture fields, the Asset Collector SHALL return an entry for
 * every unique URL present in the JSON.
 *
 * **Validates: Requirements 1.1**
 */
describe("Property 1: Asset Collection Completeness", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    // Generator for non-empty relative URL paths (the collector skips empty strings)
    const segmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/);
    const urlArb = fc
        .tuple(
            fc.array(segmentArb, { minLength: 1, maxLength: 3 }),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg")
        )
        .map(([segments, ext]) => segments.join("/") + ext);

    // Generator for a scene JSON with random asset URL references across all scanned locations
    const sceneArb = fc
        .record({
            textureNames: fc.array(urlArb, { minLength: 0, maxLength: 5 }),
            textureUrls: fc.array(urlArb, { minLength: 0, maxLength: 5 }),
            materialTextures: fc.array(
                fc.record({
                    diffuse: fc.option(urlArb, { nil: undefined }),
                    bump: fc.option(urlArb, { nil: undefined }),
                    specular: fc.option(urlArb, { nil: undefined }),
                }),
                { minLength: 0, maxLength: 3 }
            ),
            particleTextures: fc.array(urlArb, { minLength: 0, maxLength: 4 }),
            meshFiles: fc.array(urlArb, { minLength: 0, maxLength: 3 }),
            environmentTexture: fc.option(urlArb, { nil: undefined }),
            reflectionTextureName: fc.option(urlArb, { nil: undefined }),
            reflectionTextureNames: fc.array(urlArb, { minLength: 0, maxLength: 3 }),
        })
        .map((data) => {
            const scene: Record<string, any> = {};

            // Build textures array with name and url fields
            const textures: any[] = [];
            for (const name of data.textureNames) {
                textures.push({ name });
            }
            for (const url of data.textureUrls) {
                textures.push({ url });
            }
            if (textures.length > 0) {
                scene.textures = textures;
            }

            // Build materials array with nested texture objects
            if (data.materialTextures.length > 0) {
                scene.materials = data.materialTextures.map((mat) => {
                    const material: Record<string, any> = {};
                    if (mat.diffuse !== undefined) {
                        material.diffuseTexture = { name: mat.diffuse };
                    }
                    if (mat.bump !== undefined) {
                        material.bumpTexture = { name: mat.bump };
                    }
                    if (mat.specular !== undefined) {
                        material.specularTexture = { name: mat.specular };
                    }
                    return material;
                });
            }

            // Build particleSystems array
            if (data.particleTextures.length > 0) {
                scene.particleSystems = data.particleTextures.map((textureName) => ({
                    textureName,
                }));
            }

            // Build meshes array
            if (data.meshFiles.length > 0) {
                scene.meshes = data.meshFiles.map((delayLoadingFile) => ({
                    delayLoadingFile,
                }));
            }

            // Top-level environmentTexture
            if (data.environmentTexture !== undefined) {
                scene.environmentTexture = data.environmentTexture;
            }

            // Top-level reflectionTexture.name
            if (data.reflectionTextureName !== undefined) {
                scene.reflectionTexture = { name: data.reflectionTextureName };
            }

            // reflectionTextures array
            if (data.reflectionTextureNames.length > 0) {
                scene.reflectionTextures = data.reflectionTextureNames.map((name) => ({
                    name,
                }));
            }

            // Collect all unique URLs we placed in the scene
            const allUrls = new Set<string>();
            for (const name of data.textureNames) allUrls.add(name);
            for (const url of data.textureUrls) allUrls.add(url);
            for (const mat of data.materialTextures) {
                if (mat.diffuse !== undefined) allUrls.add(mat.diffuse);
                if (mat.bump !== undefined) allUrls.add(mat.bump);
                if (mat.specular !== undefined) allUrls.add(mat.specular);
            }
            for (const t of data.particleTextures) allUrls.add(t);
            for (const m of data.meshFiles) allUrls.add(m);
            if (data.environmentTexture !== undefined) allUrls.add(data.environmentTexture);
            if (data.reflectionTextureName !== undefined) allUrls.add(data.reflectionTextureName);
            for (const name of data.reflectionTextureNames) allUrls.add(name);

            return { scene, expectedUrls: allUrls };
        });

    it("every unique URL placed in the scene JSON appears in collected entries", () => {
        fc.assert(
            fc.property(sceneArb, ({ scene, expectedUrls }) => {
                const entries = collector.collect(scene, baseUrl);
                const collectedUrls = new Set(entries.map((e) => e.originalUrl));

                // Every URL we placed in the scene must appear in the collected entries
                for (const url of expectedUrls) {
                    expect(collectedUrls.has(url)).toBe(true);
                }
            }),
            { numRuns: 100 }
        );
    });
});


/**
 * Feature: standalone-world-archive, Property 2: URL Resolution Correctness
 *
 * For any relative asset path and base URL, the resolved absolute URL SHALL be
 * a valid URL that combines the base URL with the relative path according to
 * standard URL resolution rules (equivalent to `new URL(relativePath, baseUrl).href`).
 *
 * **Validates: Requirements 1.2**
 */
describe("Property 2: URL Resolution Correctness", () => {
    const collector = new AssetCollector();

    // Generator for valid URL path segments (alphanumeric with hyphens/underscores)
    const pathSegmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,9}$/);

    // Generator for file extensions
    const extensionArb = fc.constantFrom(
        ".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg", ".mp3", ".wav", ".bin"
    );

    // Generator for relative paths like "path/to/file.ext"
    const relativePathArb = fc
        .tuple(
            fc.array(pathSegmentArb, { minLength: 1, maxLength: 4 }),
            extensionArb
        )
        .map(([segments, ext]) => segments.join("/") + ext);

    // Generator for valid base URLs ending with "/"
    const baseUrlArb = fc
        .tuple(
            fc.constantFrom("http", "https"),
            pathSegmentArb,
            fc.constantFrom(".com", ".org", ".net", ".io"),
            fc.array(pathSegmentArb, { minLength: 0, maxLength: 3 })
        )
        .map(([protocol, domain, tld, pathSegments]) => {
            const path = pathSegments.length > 0 ? "/" + pathSegments.join("/") + "/" : "/";
            return `${protocol}://${domain}${tld}${path}`;
        });

    it("resolved fetchUrl matches standard URL resolution (new URL(rel, base).href)", () => {
        fc.assert(
            fc.property(relativePathArb, baseUrlArb, (relativePath, baseUrl) => {
                // Create a minimal scene with the relative path as a texture name
                const scene = {
                    textures: [{ name: relativePath }],
                };

                const entries = collector.collect(scene, baseUrl);

                // Should have exactly one entry
                expect(entries.length).toBe(1);

                // The fetchUrl should match standard URL resolution
                const expectedUrl = new URL(relativePath, baseUrl).href;
                expect(entries[0].fetchUrl).toBe(expectedUrl);
            }),
            { numRuns: 100 }
        );
    });
});


/**
 * Feature: standalone-world-archive, Property 3: Data URI Decode Round-Trip
 *
 * For any binary data, encoding it as a base64 data URI and then passing it through
 * the Asset Collector's decode logic SHALL produce binary output identical to the
 * original input.
 *
 * **Validates: Requirements 1.3**
 */
describe("Property 3: Data URI Decode Round-Trip", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    it("decoding a base64 data URI produces byte-for-byte identical output to the original binary data", () => {
        fc.assert(
            fc.property(
                fc.uint8Array({ minLength: 0, maxLength: 1024 }),
                (originalData) => {
                    // Encode the binary data as a base64 data URI
                    const base64Encoded = Buffer.from(originalData).toString("base64");
                    const dataUri = `data:image/png;base64,${base64Encoded}`;

                    // Create a scene JSON with the data URI as a texture name
                    const scene = {
                        textures: [{ name: dataUri }],
                    };

                    // Run AssetCollector.collect() on the scene
                    const entries = collector.collect(scene, baseUrl);

                    // Should have exactly one entry
                    expect(entries.length).toBe(1);

                    // The entry should have decodedData
                    expect(entries[0].decodedData).toBeDefined();

                    // The decoded data should be byte-for-byte identical to the original
                    const decoded = entries[0].decodedData!;
                    expect(decoded.length).toBe(originalData.length);

                    for (let i = 0; i < originalData.length; i++) {
                        expect(decoded[i]).toBe(originalData[i]);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});


/**
 * Feature: standalone-world-archive, Property 4: Asset Entry Deduplication
 *
 * For any serialized scene JSON containing duplicate asset URLs (the same URL
 * appearing multiple times), the Asset Collector SHALL produce a list where each
 * unique URL appears exactly once.
 *
 * **Validates: Requirements 1.4**
 */
describe("Property 4: Asset Entry Deduplication", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    // Generator for non-empty relative URL paths (the collector skips empty strings)
    const segmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/);
    const urlArb = fc
        .tuple(
            fc.array(segmentArb, { minLength: 1, maxLength: 3 }),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg")
        )
        .map(([segments, ext]) => segments.join("/") + ext);

    // Generator for a set of unique URLs that will each be placed in MULTIPLE array-based locations.
    // We only use array-based fields (textures, materials, particleSystems, meshes, reflectionTextures)
    // to avoid overwrite issues with singular fields like environmentTexture/reflectionTexture.
    const duplicatedSceneArb = fc
        .array(urlArb, { minLength: 1, maxLength: 8 })
        .chain((urls) => {
            // Deduplicate the generated URLs to get a known set of unique URLs
            const uniqueUrls = [...new Set(urls)];

            // For each unique URL, decide which scene locations to place it in
            // Each URL will appear in at least 2 locations to test deduplication across fields
            const placementsArb = fc.tuple(
                ...uniqueUrls.map(() =>
                    fc.subarray(
                        [
                            "textureName",
                            "textureUrl",
                            "materialDiffuse",
                            "materialBump",
                            "materialSpecular",
                            "particleSystem",
                            "meshFile",
                            "reflectionTextures",
                        ] as const,
                        { minLength: 2, maxLength: 6 }
                    )
                )
            );

            return placementsArb.map((allPlacements) => {
                return { uniqueUrls, allPlacements };
            });
        })
        .map(({ uniqueUrls, allPlacements }) => {
            const scene: Record<string, any> = {};
            const textures: any[] = [];
            const materials: any[] = [];
            const particleSystems: any[] = [];
            const meshes: any[] = [];
            const reflectionTextures: any[] = [];

            for (let i = 0; i < uniqueUrls.length; i++) {
                const url = uniqueUrls[i];
                const placements = allPlacements[i];

                for (const placement of placements) {
                    switch (placement) {
                        case "textureName":
                            textures.push({ name: url });
                            break;
                        case "textureUrl":
                            textures.push({ url });
                            break;
                        case "materialDiffuse":
                            materials.push({ diffuseTexture: { name: url } });
                            break;
                        case "materialBump":
                            materials.push({ bumpTexture: { name: url } });
                            break;
                        case "materialSpecular":
                            materials.push({ specularTexture: { name: url } });
                            break;
                        case "particleSystem":
                            particleSystems.push({ textureName: url });
                            break;
                        case "meshFile":
                            meshes.push({ delayLoadingFile: url });
                            break;
                        case "reflectionTextures":
                            reflectionTextures.push({ name: url });
                            break;
                    }
                }
            }

            if (textures.length > 0) scene.textures = textures;
            if (materials.length > 0) scene.materials = materials;
            if (particleSystems.length > 0) scene.particleSystems = particleSystems;
            if (meshes.length > 0) scene.meshes = meshes;
            if (reflectionTextures.length > 0) scene.reflectionTextures = reflectionTextures;

            return { scene, expectedUniqueUrls: uniqueUrls };
        });

    it("each unique URL appears exactly once in collected entries regardless of how many times it appears in the scene", () => {
        fc.assert(
            fc.property(duplicatedSceneArb, ({ scene, expectedUniqueUrls }) => {
                const entries = collector.collect(scene, baseUrl);
                const collectedUrls = entries.map((e) => e.originalUrl);

                // The number of entries should equal the number of unique URLs
                expect(entries.length).toBe(expectedUniqueUrls.length);

                // Each unique URL should appear exactly once
                for (const url of expectedUniqueUrls) {
                    const count = collectedUrls.filter((u) => u === url).length;
                    expect(count).toBe(1);
                }

                // No duplicates in collected entries
                const collectedUrlSet = new Set(collectedUrls);
                expect(collectedUrlSet.size).toBe(collectedUrls.length);
            }),
            { numRuns: 100 }
        );
    });
});


/**
 * Feature: standalone-world-archive, Property 6: Filename Disambiguation Uniqueness
 *
 * For any set of asset URLs (where multiple URLs may share the same basename),
 * the Asset Collector's filename generation SHALL produce archive filenames that
 * are all unique (no two entries share the same archiveFilename).
 *
 * **Validates: Requirements 3.3**
 */
describe("Property 6: Filename Disambiguation Uniqueness", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    // Generator for a valid filename with extension
    const filenameArb = fc
        .tuple(
            fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg")
        )
        .map(([name, ext]) => name + ext);

    // Generator for a unique directory prefix segment
    const dirSegmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,7}$/);

    // Generator for sets of URLs that share the same basename but have different directory prefixes.
    // This forces filename collisions that the disambiguator must resolve.
    const collidingUrlSetArb = fc
        .tuple(
            // Generate 1-3 shared basenames
            fc.array(filenameArb, { minLength: 1, maxLength: 3 }),
            // Generate directory prefixes (enough to create multiple URLs per basename)
            fc.array(
                fc.array(dirSegmentArb, { minLength: 1, maxLength: 3 }),
                { minLength: 2, maxLength: 6 }
            )
        )
        .map(([basenames, dirPrefixes]) => {
            // For each basename, create URLs with different directory prefixes
            const urls: string[] = [];
            for (const basename of basenames) {
                for (const dirParts of dirPrefixes) {
                    const url = dirParts.join("/") + "/" + basename;
                    urls.push(url);
                }
            }
            // Deduplicate URLs (in case dir prefixes happen to be identical)
            return [...new Set(urls)];
        })
        // Ensure we have at least 2 URLs to make the test meaningful
        .filter((urls) => urls.length >= 2);

    it("all archiveFilenames are unique even when URLs share the same basename", () => {
        fc.assert(
            fc.property(collidingUrlSetArb, (urls) => {
                // Build a scene with all URLs as texture names
                const scene = {
                    textures: urls.map((url) => ({ name: url })),
                };

                const entries = collector.collect(scene, baseUrl);

                // All entries should have unique archiveFilenames
                const archiveFilenames = entries.map((e) => e.archiveFilename);
                const uniqueFilenames = new Set(archiveFilenames);

                expect(uniqueFilenames.size).toBe(archiveFilenames.length);
            }),
            { numRuns: 100 }
        );
    });
});
