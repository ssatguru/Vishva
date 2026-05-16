import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AssetCollector } from "./AssetCollector.js";

/**
 * Feature: blob-texture-load-fix, Property 1: Bug Condition
 * Blob URLs Produce Mangled Filenames in AssetCollector
 *
 * Bug Condition: isBugCondition(input) returns true when
 *   textureEntry.name STARTS_WITH "blob:" OR textureEntry.url STARTS_WITH "blob:"
 *   AND no base64String field
 *   AND name does not start with "assets/"
 *
 * This test encodes the EXPECTED behavior after the fix:
 * - collect() should NOT return any entries where originalUrl starts with "blob:"
 * - collectBlobTextures() should return entries with clean archiveFilename values
 *
 * On UNFIXED code, this test MUST FAIL because:
 * - collect() currently includes blob URLs and produces mangled filenames
 * - collectBlobTextures() does not exist yet
 *
 * **Validates: Requirements 1.2, 1.3, 2.1**
 */
describe("Property 1: Bug Condition - Blob URLs Produce Mangled Filenames in AssetCollector", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    // Generator for random UUIDs using stringMatching (fast-check v4 compatible)
    const uuidArb = fc.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    // Generator for blob URL origins
    const blobOriginArb = fc.constantFrom(
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "https://example.com",
        "http://localhost"
    );

    // Generator for blob URLs: blob:<origin>/<uuid>
    const blobUrlArb = fc
        .tuple(blobOriginArb, uuidArb)
        .map(([origin, uuid]) => `blob:${origin}/${uuid}`);

    // Generator for scene objects containing textures with blob URLs
    const blobTextureSceneArb = fc
        .record({
            blobTextureNames: fc.array(blobUrlArb, { minLength: 1, maxLength: 5 }),
            blobTextureUrls: fc.array(blobUrlArb, { minLength: 0, maxLength: 3 }),
            blobMaterialTextures: fc.array(blobUrlArb, { minLength: 0, maxLength: 3 }),
        })
        .map((data) => {
            const scene: Record<string, any> = {};

            // Build textures array with blob URL name fields
            const textures: any[] = [];
            for (const name of data.blobTextureNames) {
                textures.push({ name });
            }
            for (const url of data.blobTextureUrls) {
                textures.push({ url });
            }
            scene.textures = textures;

            // Build materials with blob URL texture references
            if (data.blobMaterialTextures.length > 0) {
                scene.materials = data.blobMaterialTextures.map((blobUrl) => ({
                    diffuseTexture: { name: blobUrl },
                }));
            }

            // Collect all blob URLs placed in the scene
            const allBlobUrls = new Set<string>([
                ...data.blobTextureNames,
                ...data.blobTextureUrls,
                ...data.blobMaterialTextures,
            ]);

            return { scene, allBlobUrls };
        });

    it("collect() should NOT return any entries where originalUrl starts with 'blob:'", () => {
        fc.assert(
            fc.property(blobTextureSceneArb, ({ scene, allBlobUrls }) => {
                const entries = collector.collect(scene, baseUrl);

                // EXPECTED BEHAVIOR (after fix): No entry should have an originalUrl starting with "blob:"
                // ON UNFIXED CODE: This will FAIL because blob URLs are currently collected as regular URLs
                const blobEntries = entries.filter((e) => e.originalUrl.startsWith("blob:"));
                expect(blobEntries.length).toBe(0);
            }),
            { numRuns: 100 }
        );
    });

    it("collectBlobTextures() should return entries with clean archiveFilename values", () => {
        fc.assert(
            fc.property(blobTextureSceneArb, ({ scene, allBlobUrls }) => {
                // EXPECTED BEHAVIOR (after fix): collectBlobTextures() exists and returns clean entries
                // ON UNFIXED CODE: This will FAIL because collectBlobTextures() does not exist
                expect(typeof (collector as any).collectBlobTextures).toBe("function");

                const blobEntries = (collector as any).collectBlobTextures(scene);

                // Should return at least one entry for scenes with blob URLs
                expect(blobEntries.length).toBeGreaterThan(0);

                for (const entry of blobEntries) {
                    // archiveFilename should be under vishva/assets/blob/ prefix
                    expect(entry.archiveFilename).toMatch(/^vishva\/assets\/blob\//);
                    // archiveFilename should NOT contain http/localhost artifacts
                    expect(entry.archiveFilename).not.toMatch(/http/i);
                    expect(entry.archiveFilename).not.toMatch(/localhost/i);
                    expect(entry.archiveFilename).not.toMatch(/127\.0\.0\.1/i);

                    // blobUrl should start with "blob:"
                    expect(entry.blobUrl.startsWith("blob:")).toBe(true);

                    // archiveFilename should be non-empty
                    expect(entry.archiveFilename.length).toBeGreaterThan(0);
                }
            }),
            { numRuns: 100 }
        );
    });
});


/**
 * Feature: blob-texture-load-fix, Property 2: Preservation
 * Non-Blob-URL Asset Collection Unchanged
 *
 * For any serialized scene containing textures whose name/url fields are NOT blob URLs
 * (regular relative paths, absolute HTTP URLs, data URIs, or already-archived assets/ paths),
 * the fixed save pipeline SHALL produce exactly the same AssetEntry[] results, the same
 * archive filenames, and the same scene JSON rewrites as the original unfixed code.
 *
 * Observation-first methodology:
 * - Relative URL textures (e.g., textures/ground.jpg) → collected with archiveFilename = basename, fetchUrl = resolved against baseUrl
 * - Absolute HTTP/HTTPS URL textures (e.g., http://example.com/tex.png) → collected with archiveFilename = basename, fetchUrl = the absolute URL itself
 * - assets/-prefixed textures → SKIPPED (not collected)
 * - Textures with base64String field → SKIPPED by collect(), handled by collectEmbeddedTextures()
 * - Data URI textures (e.g., data:image/png;base64,...) → collected with decodedData and generated filename
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */
describe("Property 2: Preservation - Non-Blob-URL Asset Collection Unchanged", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    // --- Generators for non-blob URL patterns ---

    // Generator for valid filename segments (alphanumeric with hyphens/underscores)
    const segmentArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,9}$/);

    // Generator for file extensions
    const extensionArb = fc.constantFrom(
        ".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg", ".mp3", ".bin"
    );

    // Generator for relative URL paths (e.g., "textures/ground.jpg", "models/tree.glb")
    const relativeUrlArb = fc
        .tuple(
            fc.array(segmentArb, { minLength: 1, maxLength: 3 }),
            extensionArb
        )
        .map(([segments, ext]) => segments.join("/") + ext);

    // Generator for absolute HTTP/HTTPS URLs (e.g., "http://example.com/tex.png")
    const absoluteUrlArb = fc
        .tuple(
            fc.constantFrom("http", "https"),
            segmentArb,
            fc.constantFrom(".com", ".org", ".net", ".io"),
            fc.array(segmentArb, { minLength: 1, maxLength: 3 }),
            extensionArb
        )
        .map(([protocol, domain, tld, pathSegments, ext]) =>
            `${protocol}://${domain}${tld}/${pathSegments.join("/")}${ext}`
        );

    // Generator for assets/-prefixed paths (these should be SKIPPED)
    const assetsPrefixedArb = fc
        .tuple(segmentArb, extensionArb)
        .map(([name, ext]) => `assets/${name}${ext}`);

    // Generator for data URIs (small base64 payloads)
    const dataUriArb = fc
        .tuple(
            fc.constantFrom("image/png", "image/jpeg", "image/gif", "application/octet-stream"),
            fc.uint8Array({ minLength: 1, maxLength: 64 })
        )
        .map(([mime, data]) => {
            const base64 = Buffer.from(data).toString("base64");
            return `data:${mime};base64,${base64}`;
        });

    // Generator for textures with base64String field (handled by collectEmbeddedTextures, skipped by collect)
    const embeddedTextureArb = fc
        .tuple(
            segmentArb,
            extensionArb,
            fc.uint8Array({ minLength: 1, maxLength: 64 })
        )
        .map(([name, ext, data]) => {
            const base64 = Buffer.from(data).toString("base64");
            return {
                name: `${name}${ext}`,
                base64String: `data:image/png;base64,${base64}`,
            };
        });

    // --- Preservation Test: Relative URL textures ---

    it("relative URL textures are collected with correct archiveFilename (basename) and fetchUrl (resolved)", () => {
        fc.assert(
            fc.property(
                fc.array(relativeUrlArb, { minLength: 1, maxLength: 5 }),
                (urls) => {
                    // Deduplicate inputs to avoid confusion with dedup logic
                    const uniqueUrls = [...new Set(urls)];
                    const scene = {
                        textures: uniqueUrls.map((name) => ({ name })),
                    };

                    const entries = collector.collect(scene, baseUrl);

                    // Should have one entry per unique URL
                    expect(entries.length).toBe(uniqueUrls.length);

                    for (const entry of entries) {
                        // originalUrl should be the relative path as-is
                        expect(uniqueUrls).toContain(entry.originalUrl);

                        // fetchUrl should be resolved against baseUrl
                        const expectedFetchUrl = new URL(entry.originalUrl, baseUrl).href;
                        expect(entry.fetchUrl).toBe(expectedFetchUrl);

                        // archiveFilename should be the basename (last path segment)
                        const segments = entry.originalUrl.split("/");
                        const expectedBasename = segments[segments.length - 1];
                        // Account for disambiguation suffixes when basenames collide
                        expect(entry.archiveFilename).toMatch(
                            new RegExp(`^${expectedBasename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "(_\\d+)?\\.")}$`)
                        );

                        // Should NOT have decodedData (not a data URI)
                        expect(entry.decodedData).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    // --- Preservation Test: Absolute HTTP/HTTPS URL textures ---

    it("absolute HTTP/HTTPS URL textures are collected with correct archiveFilename and fetchUrl", () => {
        fc.assert(
            fc.property(
                fc.array(absoluteUrlArb, { minLength: 1, maxLength: 5 }),
                (urls) => {
                    const uniqueUrls = [...new Set(urls)];
                    const scene = {
                        textures: uniqueUrls.map((name) => ({ name })),
                    };

                    const entries = collector.collect(scene, baseUrl);

                    expect(entries.length).toBe(uniqueUrls.length);

                    for (const entry of entries) {
                        expect(uniqueUrls).toContain(entry.originalUrl);

                        // For absolute URLs, fetchUrl should be the absolute URL itself
                        // (new URL(absoluteUrl, baseUrl) returns the absolute URL)
                        const expectedFetchUrl = new URL(entry.originalUrl, baseUrl).href;
                        expect(entry.fetchUrl).toBe(expectedFetchUrl);

                        // archiveFilename should be the basename of the URL path
                        const urlObj = new URL(entry.originalUrl);
                        const pathSegments = urlObj.pathname.split("/");
                        const expectedBasename = pathSegments[pathSegments.length - 1];
                        // Account for disambiguation
                        expect(entry.archiveFilename.startsWith(expectedBasename.split(".")[0])).toBe(true);

                        // Should NOT have decodedData
                        expect(entry.decodedData).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    // --- Preservation Test: assets/-prefixed textures are SKIPPED ---

    it("assets/-prefixed textures are skipped and not collected", () => {
        fc.assert(
            fc.property(
                fc.array(assetsPrefixedArb, { minLength: 1, maxLength: 5 }),
                (assetUrls) => {
                    const scene = {
                        textures: assetUrls.map((name) => ({ name })),
                    };

                    const entries = collector.collect(scene, baseUrl);

                    // No entries should be collected for assets/-prefixed URLs
                    expect(entries.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    // --- Preservation Test: Textures with base64String are skipped by collect() ---

    it("textures with base64String field are skipped by collect()", () => {
        fc.assert(
            fc.property(
                fc.array(embeddedTextureArb, { minLength: 1, maxLength: 5 }),
                (embeddedTextures) => {
                    const scene = {
                        textures: embeddedTextures,
                    };

                    const entries = collector.collect(scene, baseUrl);

                    // collect() should skip textures that have base64String
                    expect(entries.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    // --- Preservation Test: collectEmbeddedTextures() handles base64String textures correctly ---

    it("collectEmbeddedTextures() returns correct entries for base64String textures", () => {
        fc.assert(
            fc.property(
                fc.array(embeddedTextureArb, { minLength: 1, maxLength: 5 }),
                (embeddedTextures) => {
                    const scene = {
                        textures: embeddedTextures,
                    };

                    const embeddedEntries = collector.collectEmbeddedTextures(scene);

                    // Should return one entry per embedded texture
                    expect(embeddedEntries.length).toBe(embeddedTextures.length);

                    for (const entry of embeddedEntries) {
                        // dataUri should be the base64String value
                        expect(entry.dataUri).toMatch(/^data:/);

                        // decodedData should be non-empty
                        expect(entry.decodedData.length).toBeGreaterThan(0);

                        // archiveFilename should be under vishva/assets/data/ prefix
                        expect(entry.archiveFilename.length).toBeGreaterThan(0);
                        expect(entry.archiveFilename).toMatch(/^vishva\/assets\/data\//);

                        // textureObj should reference one of the input textures
                        expect(entry.textureObj).toBeDefined();
                        expect(typeof entry.textureObj.base64String).toBe("string");
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    // --- Preservation Test: Data URI textures are collected with decodedData ---

    it("data URI textures are collected with decodedData and generated filename", () => {
        fc.assert(
            fc.property(
                fc.array(dataUriArb, { minLength: 1, maxLength: 3 }),
                (dataUris) => {
                    const uniqueUris = [...new Set(dataUris)];
                    const scene = {
                        textures: uniqueUris.map((name) => ({ name })),
                    };

                    const entries = collector.collect(scene, baseUrl);

                    expect(entries.length).toBe(uniqueUris.length);

                    for (const entry of entries) {
                        // originalUrl should be the data URI
                        expect(entry.originalUrl.startsWith("data:")).toBe(true);

                        // Should have decodedData
                        expect(entry.decodedData).toBeDefined();
                        expect(entry.decodedData!.length).toBeGreaterThan(0);

                        // archiveFilename should be under vishva/assets/data/ with data_asset pattern
                        expect(entry.archiveFilename).toMatch(/^vishva\/assets\/data\/data_asset/);
                        expect(entry.archiveFilename).toMatch(/\.\w+$/);

                        // fetchUrl for data URIs is the data URI itself
                        expect(entry.fetchUrl).toBe(entry.originalUrl);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    // --- Preservation Test: Mixed non-blob scene produces consistent results ---

    it("mixed non-blob scene (relative + absolute + assets/ + embedded) produces correct separation", () => {
        fc.assert(
            fc.property(
                fc.record({
                    relativeUrls: fc.array(relativeUrlArb, { minLength: 1, maxLength: 3 }),
                    absoluteUrls: fc.array(absoluteUrlArb, { minLength: 0, maxLength: 2 }),
                    assetsUrls: fc.array(assetsPrefixedArb, { minLength: 0, maxLength: 2 }),
                    embeddedTextures: fc.array(embeddedTextureArb, { minLength: 0, maxLength: 2 }),
                }),
                ({ relativeUrls, absoluteUrls, assetsUrls, embeddedTextures }) => {
                    // Build a scene with all types mixed together
                    const textures: any[] = [
                        ...relativeUrls.map((name) => ({ name })),
                        ...absoluteUrls.map((name) => ({ name })),
                        ...assetsUrls.map((name) => ({ name })),
                        ...embeddedTextures,
                    ];

                    const scene = { textures };

                    // collect() should include relative + absolute URLs, skip assets/ and embedded
                    const entries = collector.collect(scene, baseUrl);
                    const collectedOriginalUrls = new Set(entries.map((e) => e.originalUrl));

                    // All unique relative URLs should be collected
                    for (const url of new Set(relativeUrls)) {
                        expect(collectedOriginalUrls.has(url)).toBe(true);
                    }

                    // All unique absolute URLs should be collected
                    for (const url of new Set(absoluteUrls)) {
                        expect(collectedOriginalUrls.has(url)).toBe(true);
                    }

                    // assets/-prefixed URLs should NOT be collected
                    for (const url of assetsUrls) {
                        expect(collectedOriginalUrls.has(url)).toBe(false);
                    }

                    // Embedded textures (with base64String) should NOT be in collect() results
                    for (const tex of embeddedTextures) {
                        // The name field of embedded textures should not appear in collect results
                        // because they have base64String and are skipped
                        const nameInResults = entries.some((e) => e.originalUrl === tex.name);
                        expect(nameInResults).toBe(false);
                    }

                    // collectEmbeddedTextures() should handle the embedded ones
                    const embeddedEntries = collector.collectEmbeddedTextures(scene);
                    expect(embeddedEntries.length).toBe(embeddedTextures.length);
                }
            ),
            { numRuns: 100 }
        );
    });
});
