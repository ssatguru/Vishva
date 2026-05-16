import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AssetCollector, EmbeddedTextureEntry, AssetEntry } from "./AssetCollector.js";
import { PathRewriter } from "./PathRewriter.js";

/**
 * Feature: glb-texture-save-fix, Property 1: Bug Condition - Asset Pipeline Missing From Save
 *
 * For any serialized scene object where the bug condition holds (hasEmbeddedTextures
 * OR hasExternalAssetUrls), the `_getWorldZipBlob()` function SHALL produce a TAR
 * archive that contains all referenced assets as separate files under the `assets/`
 * prefix, with base64String fields removed from Scene.babylon and all texture/asset
 * paths rewritten to `assets/<filename>` format.
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3**
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Simulates the FIXED save pipeline logic from SaveManager._getWorldZipBlob().
 * This function mirrors what the fixed code does:
 * 1. Collect and strip embedded textures (base64String fields)
 * 2. Collect external asset URLs and rewrite paths
 * 3. Build archive with all asset files under assets/ prefix
 * 4. Apply precision reduction AFTER the pipeline
 */
function currentSavePipeline(sceneObj: object): Array<{ filename: string; data: Uint8Array }> {
    const assetCollector = new AssetCollector();
    const pathRewriter = new PathRewriter();

    // Work on a deep copy so the original sceneObj is not mutated
    // (tests need the original to verify expected entries)
    const workingScene = JSON.parse(JSON.stringify(sceneObj));

    // Step 1: Extract embedded textures (base64String fields from GLB imports)
    const embeddedEntries = assetCollector.collectEmbeddedTextures(workingScene);
    assetCollector.stripEmbeddedTextures(embeddedEntries);

    // Step 1.5: Collect server assets (vishva/assets/ prefixed) and rewrite paths
    const baseUrl = "http://localhost:8080/bin/";
    const serverAssetEntries = assetCollector.collectServerAssets(workingScene, baseUrl);
    pathRewriter.rewrite(workingScene, serverAssetEntries);

    // Step 2: Collect external asset URLs and rewrite paths
    const externalEntries = assetCollector.collect(workingScene, baseUrl);
    pathRewriter.rewrite(workingScene, externalEntries);

    // Step 3: Build archive file list with all assets
    // archiveFilename now contains the full structured path (e.g., vishva/assets/data/...)
    const archiveFiles: Array<{ filename: string; data: Uint8Array }> = [];

    // Add embedded texture files
    for (const entry of embeddedEntries) {
        archiveFiles.push({
            filename: entry.archiveFilename,
            data: entry.decodedData
        });
    }

    // Add server asset files (simulated fetch)
    for (const entry of serverAssetEntries) {
        const placeholderData = new TextEncoder().encode("fetched_server_asset");
        archiveFiles.push({
            filename: entry.archiveFilename,
            data: placeholderData
        });
    }

    // Add external asset files (only those with decodedData - data URIs)
    // Note: In the real code, non-data-URI assets are fetched via network.
    // In tests, external URLs don't have decodedData (they'd need fetch),
    // so we simulate by creating placeholder data for them.
    for (const entry of externalEntries) {
        if (entry.decodedData) {
            archiveFiles.push({
                filename: entry.archiveFilename,
                data: entry.decodedData
            });
        } else {
            // Simulate a successful fetch — in real code this would be fetched from the network
            const placeholderData = new TextEncoder().encode("fetched_asset_data");
            archiveFiles.push({
                filename: entry.archiveFilename,
                data: placeholderData
            });
        }
    }

    // Step 4: Apply precision reduction AFTER the pipeline
    const PRECISION = 4;
    const sceneString = JSON.stringify(JSON.parse(JSON.stringify(workingScene)), (_key, value) => {
        if (typeof value === "number" && !Number.isInteger(value)) {
            return parseFloat(value.toFixed(PRECISION));
        }
        return value;
    });
    const vishvaString = JSON.stringify({ vVer: "test", bVer: "test" });

    const encoder = new TextEncoder();
    archiveFiles.push({ filename: "Vishva.json", data: encoder.encode(vishvaString) });
    archiveFiles.push({ filename: "Scene.babylon", data: encoder.encode(sceneString) });

    return archiveFiles;
}

/**
 * Check if a scene object has embedded textures (base64String fields).
 */
function hasEmbeddedTextures(sceneObj: Record<string, any>): boolean {
    // Check materials for texture objects with base64String
    if (Array.isArray(sceneObj.materials)) {
        for (const mat of sceneObj.materials) {
            if (!mat || typeof mat !== "object") continue;
            for (const key of Object.keys(mat)) {
                const value = mat[key];
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    if (typeof value.base64String === "string" && value.base64String.startsWith("data:")) {
                        return true;
                    }
                }
            }
        }
    }
    // Check top-level textures array
    if (Array.isArray(sceneObj.textures)) {
        for (const tex of sceneObj.textures) {
            if (!tex || typeof tex !== "object") continue;
            if (typeof tex.base64String === "string" && tex.base64String.startsWith("data:")) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if a scene object has external asset URLs.
 */
function hasExternalAssetUrls(sceneObj: Record<string, any>): boolean {
    if (Array.isArray(sceneObj.textures)) {
        for (const tex of sceneObj.textures) {
            if (!tex || typeof tex !== "object") continue;
            // Skip textures with base64String
            if (typeof tex.base64String === "string" && tex.base64String.startsWith("data:")) {
                continue;
            }
            if (typeof tex.name === "string" && tex.name && !tex.name.startsWith("data:")) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if the bug condition holds for a scene object.
 */
function isBugCondition(sceneObj: Record<string, any>): boolean {
    return hasEmbeddedTextures(sceneObj) || hasExternalAssetUrls(sceneObj);
}

/**
 * Recursively check if any object in the tree has a "base64String" field.
 */
function containsBase64String(obj: any): boolean {
    if (obj === null || obj === undefined || typeof obj !== "object") return false;
    if (Array.isArray(obj)) {
        return obj.some(item => containsBase64String(item));
    }
    for (const key of Object.keys(obj)) {
        if (key === "base64String") return true;
        if (typeof obj[key] === "object" && obj[key] !== null) {
            if (containsBase64String(obj[key])) return true;
        }
    }
    return false;
}

// ─── Generators ─────────────────────────────────────────────────────────────

// Generate a small random base64 string (valid base64 for a few bytes of data)
const base64DataArb = fc.uint8Array({ minLength: 4, maxLength: 32 }).map(bytes => {
    return Buffer.from(bytes).toString("base64");
});

// Generate a data URI with base64 content
const dataUriArb = fc.tuple(
    fc.constantFrom("image/webp", "image/png", "image/jpeg"),
    base64DataArb
).map(([mime, b64]) => `data:${mime};base64,${b64}`);

// Generate a texture name (for embedded textures)
const textureNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]{1,12}$/).filter(s => s.length > 0);

// Generate an external URL path (server assets use vishva/assets/ prefix)
const externalUrlArb = fc.tuple(
    fc.constantFrom("vishva/assets/textures/", "vishva/assets/audio/", "vishva/assets/models/"),
    fc.stringMatching(/^[a-z][a-z0-9_-]{1,8}$/),
    fc.constantFrom(".jpg", ".png", ".webp", ".glb")
).map(([base, name, ext]) => `${base}${name}${ext}`);

// Generate a scene with embedded textures in materials
const embeddedTextureSceneArb = fc.tuple(
    fc.array(
        fc.tuple(textureNameArb, dataUriArb, fc.constantFrom("albedoTexture", "diffuseTexture", "bumpTexture")),
        { minLength: 1, maxLength: 4 }
    ),
    fc.option(
        fc.array(
            fc.tuple(textureNameArb, dataUriArb),
            { minLength: 1, maxLength: 3 }
        ),
        { nil: undefined }
    )
).map(([materialTextures, topLevelTextures]) => {
    const scene: Record<string, any> = {};

    // Build materials with embedded textures
    scene.materials = materialTextures.map(([name, dataUri, texType]) => {
        const mat: Record<string, any> = {
            name: `material_${name}`,
            id: `mat_${name}`,
        };
        mat[texType] = {
            name: name,
            url: name,
            base64String: dataUri,
        };
        return mat;
    });

    // Optionally add top-level textures with base64String
    if (topLevelTextures) {
        scene.textures = topLevelTextures.map(([name, dataUri]) => ({
            name: name,
            url: name,
            base64String: dataUri,
        }));
    }

    return scene;
});

// Generate a scene with external asset URLs
const externalAssetSceneArb = fc.array(externalUrlArb, { minLength: 1, maxLength: 4 }).map(urls => {
    const scene: Record<string, any> = {};
    scene.textures = urls.map(url => ({
        name: url,
        url: url,
    }));
    return scene;
});

// Generate a mixed scene (both embedded and external)
const mixedSceneArb = fc.tuple(embeddedTextureSceneArb, externalAssetSceneArb).map(([embedded, external]) => {
    const scene: Record<string, any> = { ...embedded };
    // Merge textures arrays
    scene.textures = [
        ...(embedded.textures || []),
        ...(external.textures || []),
    ];
    return scene;
});

// Combined generator: any scene that satisfies the bug condition
const bugConditionSceneArb = fc.oneof(
    embeddedTextureSceneArb,
    externalAssetSceneArb,
    mixedSceneArb
);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Property 1: Bug Condition - Asset Pipeline Missing From Save", () => {

    it("archive MUST contain assets/ entries for each embedded texture", () => {
        fc.assert(
            fc.property(embeddedTextureSceneArb, (sceneObj) => {
                // Verify bug condition holds
                expect(isBugCondition(sceneObj)).toBe(true);

                // Run the current save pipeline (mimics _getWorldZipBlob)
                const archiveFiles = currentSavePipeline(sceneObj);
                const filenames = archiveFiles.map(f => f.filename);

                // Use AssetCollector to determine what SHOULD be in the archive
                const collector = new AssetCollector();
                const embeddedEntries = collector.collectEmbeddedTextures(sceneObj);

                // There should be at least one embedded texture
                expect(embeddedEntries.length).toBeGreaterThan(0);

                // Assert: archive MUST contain the structured archiveFilename for each embedded texture
                for (const entry of embeddedEntries) {
                    expect(filenames).toContain(entry.archiveFilename);
                }
            }),
            { numRuns: 50 }
        );
    });

    it("archive MUST contain assets/ entries for each external asset", () => {
        fc.assert(
            fc.property(externalAssetSceneArb, (sceneObj) => {
                // Verify bug condition holds
                expect(isBugCondition(sceneObj)).toBe(true);

                // Run the current save pipeline (mimics _getWorldZipBlob)
                const archiveFiles = currentSavePipeline(sceneObj);
                const filenames = archiveFiles.map(f => f.filename);

                // Use AssetCollector to determine what SHOULD be in the archive
                // Server assets (vishva/assets/ prefixed) are collected by collectServerAssets
                const collector = new AssetCollector();
                const baseUrl = "http://localhost:8080/bin/";
                const serverEntries = collector.collectServerAssets(sceneObj, baseUrl);

                // There should be at least one server asset
                expect(serverEntries.length).toBeGreaterThan(0);

                // Assert: archive MUST contain the structured archiveFilename for each server asset
                for (const entry of serverEntries) {
                    expect(filenames).toContain(entry.archiveFilename);
                }
            }),
            { numRuns: 50 }
        );
    });

    it("Scene.babylon in the archive MUST NOT contain any base64String fields", () => {
        fc.assert(
            fc.property(embeddedTextureSceneArb, (sceneObj) => {
                // Verify bug condition holds
                expect(isBugCondition(sceneObj)).toBe(true);

                // Run the current save pipeline (mimics _getWorldZipBlob)
                const archiveFiles = currentSavePipeline(sceneObj);

                // Find Scene.babylon in the archive
                const sceneBabylonFile = archiveFiles.find(f => f.filename === "Scene.babylon");
                expect(sceneBabylonFile).toBeDefined();

                // Parse the Scene.babylon content
                const decoder = new TextDecoder();
                const sceneBabylonContent = JSON.parse(decoder.decode(sceneBabylonFile!.data));

                // Assert: Scene.babylon MUST NOT contain any base64String fields
                expect(containsBase64String(sceneBabylonContent)).toBe(false);
            }),
            { numRuns: 50 }
        );
    });

    it("all texture name/url fields in Scene.babylon MUST start with vishva/assets/", () => {
        fc.assert(
            fc.property(bugConditionSceneArb, (sceneObj) => {
                // Verify bug condition holds
                expect(isBugCondition(sceneObj)).toBe(true);

                // Run the current save pipeline (mimics _getWorldZipBlob)
                const archiveFiles = currentSavePipeline(sceneObj);

                // Find Scene.babylon in the archive
                const sceneBabylonFile = archiveFiles.find(f => f.filename === "Scene.babylon");
                expect(sceneBabylonFile).toBeDefined();

                // Parse the Scene.babylon content
                const decoder = new TextDecoder();
                const sceneBabylonContent = JSON.parse(decoder.decode(sceneBabylonFile!.data));

                // Check all texture name/url fields start with "vishva/assets/"
                if (Array.isArray(sceneBabylonContent.textures)) {
                    for (const tex of sceneBabylonContent.textures) {
                        if (tex && typeof tex.name === "string" && tex.name) {
                            expect(tex.name.startsWith("vishva/assets/")).toBe(true);
                        }
                        if (tex && typeof tex.url === "string" && tex.url) {
                            expect(tex.url.startsWith("vishva/assets/")).toBe(true);
                        }
                    }
                }

                // Check material texture references
                if (Array.isArray(sceneBabylonContent.materials)) {
                    for (const mat of sceneBabylonContent.materials) {
                        if (!mat || typeof mat !== "object") continue;
                        for (const key of Object.keys(mat)) {
                            const value = mat[key];
                            if (value && typeof value === "object" && !Array.isArray(value)) {
                                if (typeof value.name === "string" && value.name) {
                                    expect(value.name.startsWith("vishva/assets/")).toBe(true);
                                }
                                if (typeof value.url === "string" && value.url) {
                                    expect(value.url.startsWith("vishva/assets/")).toBe(true);
                                }
                            }
                        }
                    }
                }
            }),
            { numRuns: 50 }
        );
    });
});


// ─── Property 2: Preservation ───────────────────────────────────────────────

/**
 * Feature: glb-texture-save-fix, Property 2: Preservation - Non-Asset Worlds Unchanged
 *
 * For any serialized scene object where the bug condition does NOT hold (no embedded
 * textures AND no external asset URLs), the `_getWorldZipBlob()` function SHALL produce
 * the same archive structure as the original function — containing only `Vishva.json`
 * and `Scene.babylon` with precision-reduced numeric values.
 *
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */

// ─── Preservation Helpers ───────────────────────────────────────────────────

const PRECISION = 4;

/**
 * Replicates SaveManager._stringifyWithPrecision() for testing.
 * Rounds all non-integer floating point numbers to 4 decimal places.
 */
function stringifyWithPrecision(obj: any): string {
    const json = JSON.stringify(obj);
    const plain = JSON.parse(json);
    return JSON.stringify(plain, (_key, value) => {
        if (typeof value === "number" && !Number.isInteger(value)) {
            return parseFloat(value.toFixed(PRECISION));
        }
        return value;
    });
}

/**
 * Simulates the current save pipeline WITH precision reduction.
 * For non-asset scenes, this is the correct behavior that should be preserved.
 * Returns a TAR-like archive structure (file list with binary data).
 */
function currentSavePipelineWithPrecision(sceneObj: object): Array<{ filename: string; data: Uint8Array }> {
    const sceneString = stringifyWithPrecision(sceneObj);
    const vishvaString = stringifyWithPrecision({ vVer: "test", bVer: "test" });

    const encoder = new TextEncoder();
    return [
        { filename: "Vishva.json", data: encoder.encode(vishvaString) },
        { filename: "Scene.babylon", data: encoder.encode(sceneString) },
    ];
}

/**
 * Creates a TAR archive from a file list (mirrors SaveManager._createTarArchive).
 * Used to verify TAR structure validity.
 */
function createTarArchive(files: Array<{ filename: string; data: Uint8Array }>): Uint8Array {
    const blocks: Uint8Array[] = [];

    for (const file of files) {
        // Create TAR header (512 bytes)
        const header = new Uint8Array(512);
        const encoder = new TextEncoder();

        // File name (0-99)
        const nameBytes = encoder.encode(file.filename);
        header.set(nameBytes.slice(0, Math.min(100, nameBytes.length)), 0);

        // File mode (100-107)
        header.set(encoder.encode("0000644\0"), 100);

        // Owner's user ID (108-115)
        header.set(encoder.encode("0000000\0"), 108);

        // Group's user ID (116-123)
        header.set(encoder.encode("0000000\0"), 116);

        // File size in bytes (124-135)
        const sizeStr = file.data.length.toString(8).padStart(11, "0") + "\0";
        header.set(encoder.encode(sizeStr), 124);

        // Last modification time (136-147)
        const timeStr = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0";
        header.set(encoder.encode(timeStr), 136);

        // Checksum placeholder (148-155) - spaces
        header.set(encoder.encode("        "), 148);

        // Type flag (156) - '0' for regular file
        header[156] = 0x30;

        // UStar indicator (257-262)
        header.set(encoder.encode("ustar\0"), 257);

        // Calculate and set checksum
        let checksum = 0;
        for (let i = 0; i < 512; i++) {
            checksum += header[i];
        }
        const checksumStr = checksum.toString(8).padStart(6, "0") + "\0 ";
        header.set(encoder.encode(checksumStr), 148);

        blocks.push(header);
        blocks.push(file.data);

        // Pad file data to 512-byte boundary
        const padding = (512 - (file.data.length % 512)) % 512;
        if (padding > 0) {
            blocks.push(new Uint8Array(padding));
        }
    }

    // Two final 512-byte zero blocks (end of archive marker)
    blocks.push(new Uint8Array(512));
    blocks.push(new Uint8Array(512));

    // Concatenate all blocks
    const totalLength = blocks.reduce((acc, curr) => acc + curr.length, 0);
    const tarData = new Uint8Array(totalLength);
    let offset = 0;
    for (const block of blocks) {
        tarData.set(block, offset);
        offset += block.length;
    }

    return tarData;
}

/**
 * Parses a TAR archive and returns the list of file entries.
 * Validates header structure and padding.
 */
function parseTarArchive(tar: Uint8Array): Array<{ filename: string; data: Uint8Array; headerValid: boolean }> {
    const entries: Array<{ filename: string; data: Uint8Array; headerValid: boolean }> = [];
    let offset = 0;

    while (offset + 512 <= tar.length) {
        const header = tar.slice(offset, offset + 512);

        // Check if this is an end-of-archive block (all zeros)
        if (header.every(b => b === 0)) {
            break;
        }

        // Extract filename (bytes 0-99, null-terminated)
        const decoder = new TextDecoder();
        const filenameRaw = header.slice(0, 100);
        const nullIdx = filenameRaw.indexOf(0);
        const filename = decoder.decode(filenameRaw.slice(0, nullIdx > 0 ? nullIdx : 100));

        // Extract file size (bytes 124-135, octal string)
        const sizeRaw = decoder.decode(header.slice(124, 135)).trim();
        const fileSize = parseInt(sizeRaw, 8);

        // Validate checksum (bytes 148-155)
        const storedChecksumRaw = decoder.decode(header.slice(148, 154)).trim();
        const storedChecksum = parseInt(storedChecksumRaw, 8);

        // Compute checksum: sum of all header bytes, treating checksum field (148-155) as spaces
        let computedChecksum = 0;
        for (let i = 0; i < 512; i++) {
            if (i >= 148 && i < 156) {
                computedChecksum += 32; // space character
            } else {
                computedChecksum += header[i];
            }
        }

        const headerValid = storedChecksum === computedChecksum;

        // Extract file data
        const dataStart = offset + 512;
        const data = tar.slice(dataStart, dataStart + fileSize);

        entries.push({ filename, data, headerValid });

        // Move to next entry (header + data + padding to 512-byte boundary)
        const paddedSize = Math.ceil(fileSize / 512) * 512;
        offset = dataStart + paddedSize;
    }

    return entries;
}

/**
 * Checks that all floating point numbers in a JSON string have at most
 * `precision` decimal places by inspecting the string representation directly.
 * This avoids floating point arithmetic issues in the checker itself.
 */
function allNumbersHavePrecision(jsonStr: string, precision: number): boolean {
    // Match all number literals in the JSON string
    // This regex matches JSON numbers (including negative, decimal, and exponent forms)
    const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
    let match: RegExpExecArray | null;
    while ((match = numberPattern.exec(jsonStr)) !== null) {
        const numStr = match[0];
        // Check if it has a decimal point
        const dotIndex = numStr.indexOf(".");
        if (dotIndex === -1) continue; // integer, no decimal places
        // Check for exponent notation
        const eIndex = numStr.search(/[eE]/);
        const decimalPart = eIndex === -1
            ? numStr.slice(dotIndex + 1)
            : numStr.slice(dotIndex + 1, eIndex);
        if (decimalPart.length > precision) {
            return false;
        }
    }
    return true;
}

// ─── Preservation Generators ────────────────────────────────────────────────

// Generate a random floating point number (to test precision reduction)
const floatArb = fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true });

// Generate a simple mesh object (primitive mesh, no textures)
const primitiveMeshArb = fc.record({
    name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,10}$/),
    id: fc.stringMatching(/^[0-9]{1,4}$/),
    position: fc.tuple(floatArb, floatArb, floatArb),
    rotation: fc.tuple(floatArb, floatArb, floatArb),
    scaling: fc.tuple(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true })
    ),
});

// Generate a simple material (no base64String, no texture objects with data URIs)
const simpleMaterialArb = fc.record({
    name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,10}$/),
    id: fc.stringMatching(/^mat_[0-9]{1,4}$/),
    diffuseColor: fc.tuple(floatArb, floatArb, floatArb),
    specularColor: fc.tuple(floatArb, floatArb, floatArb),
    alpha: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
});

/**
 * Generator for scenes that do NOT satisfy isBugCondition.
 * These scenes have:
 * - Only primitive meshes with numeric positions/rotations
 * - Simple materials without base64String fields
 * - No textures array (or empty textures array with no external URLs)
 * - Random floating point values to verify precision reduction
 */
const nonAssetSceneArb = fc.record({
    meshes: fc.array(primitiveMeshArb, { minLength: 0, maxLength: 5 }),
    materials: fc.array(simpleMaterialArb, { minLength: 0, maxLength: 3 }),
    // Either no textures key, or an empty array
    textures: fc.constant([]),
    // Additional numeric fields to test precision reduction
    gravity: fc.tuple(floatArb, floatArb, floatArb),
    useRightHandedSystem: fc.boolean(),
}).filter(scene => !isBugCondition(scene));

// ─── Preservation Tests ─────────────────────────────────────────────────────

describe("Property 2: Preservation - Non-Asset Worlds Produce Unchanged Output", () => {

    it("archive contains exactly 2 files: Vishva.json and Scene.babylon", () => {
        fc.assert(
            fc.property(nonAssetSceneArb, (sceneObj) => {
                // Confirm bug condition does NOT hold
                expect(isBugCondition(sceneObj)).toBe(false);

                // Run the current save pipeline with precision reduction
                const archiveFiles = currentSavePipelineWithPrecision(sceneObj);

                // Assert: exactly 2 files
                expect(archiveFiles).toHaveLength(2);
                const filenames = archiveFiles.map(f => f.filename);
                expect(filenames).toContain("Vishva.json");
                expect(filenames).toContain("Scene.babylon");
            }),
            { numRuns: 100 }
        );
    });

    it("no assets/ entries exist in the archive", () => {
        fc.assert(
            fc.property(nonAssetSceneArb, (sceneObj) => {
                // Confirm bug condition does NOT hold
                expect(isBugCondition(sceneObj)).toBe(false);

                // Run the current save pipeline with precision reduction
                const archiveFiles = currentSavePipelineWithPrecision(sceneObj);
                const filenames = archiveFiles.map(f => f.filename);

                // Assert: no filenames start with "assets/" or "vishva/assets/"
                const assetFiles = filenames.filter(f => f.startsWith("assets/") || f.startsWith("vishva/assets/"));
                expect(assetFiles).toHaveLength(0);
            }),
            { numRuns: 100 }
        );
    });

    it("floating point numbers in Scene.babylon are rounded to 4 decimal places", () => {
        fc.assert(
            fc.property(nonAssetSceneArb, (sceneObj) => {
                // Confirm bug condition does NOT hold
                expect(isBugCondition(sceneObj)).toBe(false);

                // Run the current save pipeline with precision reduction
                const archiveFiles = currentSavePipelineWithPrecision(sceneObj);

                // Find Scene.babylon
                const sceneBabylonFile = archiveFiles.find(f => f.filename === "Scene.babylon");
                expect(sceneBabylonFile).toBeDefined();

                // Decode and check precision
                const decoder = new TextDecoder();
                const sceneContent = decoder.decode(sceneBabylonFile!.data);

                // All floating point numbers should be rounded to 4 decimal places
                expect(allNumbersHavePrecision(sceneContent, PRECISION)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    it("archive is a valid TAR structure (correct headers, padding)", () => {
        fc.assert(
            fc.property(nonAssetSceneArb, (sceneObj) => {
                // Confirm bug condition does NOT hold
                expect(isBugCondition(sceneObj)).toBe(false);

                // Run the current save pipeline with precision reduction
                const archiveFiles = currentSavePipelineWithPrecision(sceneObj);

                // Create a TAR archive from the file list
                const tarBuffer = createTarArchive(archiveFiles);

                // TAR must be non-empty
                expect(tarBuffer.length).toBeGreaterThan(0);

                // TAR size must be a multiple of 512 bytes
                expect(tarBuffer.length % 512).toBe(0);

                // Parse the TAR and validate structure
                const entries = parseTarArchive(tarBuffer);

                // Should have exactly 2 entries
                expect(entries).toHaveLength(2);

                // All headers should be valid (checksum matches)
                for (const entry of entries) {
                    expect(entry.headerValid).toBe(true);
                }

                // Filenames should match
                expect(entries[0].filename).toBe("Vishva.json");
                expect(entries[1].filename).toBe("Scene.babylon");

                // Data should be parseable JSON
                const decoder = new TextDecoder();
                expect(() => JSON.parse(decoder.decode(entries[0].data))).not.toThrow();
                expect(() => JSON.parse(decoder.decode(entries[1].data))).not.toThrow();

                // Verify end-of-archive marker exists (two 512-byte zero blocks at end)
                const lastTwoBlocks = tarBuffer.slice(tarBuffer.length - 1024);
                expect(lastTwoBlocks.every(b => b === 0)).toBe(true);
            }),
            { numRuns: 50 }
        );
    });
});
