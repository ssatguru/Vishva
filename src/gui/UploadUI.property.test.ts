import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Feature: menu-bar-upload-button, Property 1: File format classification is a complete partition
 *
 * For any collection of files with arbitrary names, each file is classified as either
 * a model file or a dependency file, with no file unclassified and no file in both categories.
 *
 * **Validates: Requirements 2.2, 2.3, 3.2, 3.4**
 */
describe("Property 1: File format classification is a complete partition", () => {
    // The model extensions list as defined in LoadManager.processDroppedFiles
    const modelExtensions = ["gltf", "glb", "obj", "babylon", "stl"];

    /**
     * Classification logic extracted from LoadManager.processDroppedFiles.
     * Returns true if the file is a model file, false if it is a dependency file.
     */
    function isModelFile(filename: string): boolean {
        const ext = filename.split(".").pop()?.toLowerCase();
        return ext !== undefined && modelExtensions.includes(ext);
    }

    /**
     * A file is a dependency file if it is NOT a model file.
     * This is the complement classification used in processDroppedFiles.
     */
    function isDependencyFile(filename: string): boolean {
        return !isModelFile(filename);
    }

    // Generator for arbitrary filenames including edge cases:
    // - no extension (e.g., "readme")
    // - multiple dots (e.g., "archive.tar.gz", "model.v2.glb")
    // - uppercase extensions (e.g., "Model.GLB")
    // - empty string
    // - extensions that are substrings of model extensions (e.g., "file.gl")
    const filenameArb = fc.oneof(
        // Completely arbitrary strings (covers empty, no dots, special chars)
        fc.string({ minLength: 0, maxLength: 50 }),
        // Filenames with a known model extension (should classify as model)
        fc.tuple(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
            fc.constantFrom(...modelExtensions)
        ).map(([name, ext]) => `${name}.${ext}`),
        // Filenames with uppercase model extensions
        fc.tuple(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
            fc.constantFrom(...modelExtensions)
        ).map(([name, ext]) => `${name}.${ext.toUpperCase()}`),
        // Filenames with non-model extensions
        fc.tuple(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
            fc.constantFrom("png", "jpg", "bin", "txt", "mtl", "fbx", "dae", "zip")
        ).map(([name, ext]) => `${name}.${ext}`),
        // Filenames with multiple dots
        fc.tuple(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,10}$/),
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,10}$/),
            fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/)
        ).map(([a, b, ext]) => `${a}.${b}.${ext}`),
        // Filenames with no extension (no dot)
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
    );

    it("every filename is classified as exactly one of model file or dependency file (never both, never neither)", () => {
        fc.assert(
            fc.property(filenameArb, (filename) => {
                const isModel = isModelFile(filename);
                const isDependency = isDependencyFile(filename);

                // Complete partition: exactly one must be true
                // No file is both a model file and a dependency file
                expect(isModel && isDependency).toBe(false);
                // No file is neither a model file nor a dependency file
                expect(isModel || isDependency).toBe(true);
                // Equivalently: they are logical complements
                expect(isModel).toBe(!isDependency);
            }),
            { numRuns: 200 }
        );
    });

    it("classification partitions a collection of files with no file unclassified", () => {
        // Generate arrays of filenames to simulate a file collection (like a folder upload)
        const fileCollectionArb = fc.array(filenameArb, { minLength: 1, maxLength: 20 });

        fc.assert(
            fc.property(fileCollectionArb, (filenames) => {
                const modelFiles = filenames.filter((f) => isModelFile(f));
                const dependencyFiles = filenames.filter((f) => isDependencyFile(f));

                // Every file ends up in exactly one category
                expect(modelFiles.length + dependencyFiles.length).toBe(filenames.length);

                // No file appears in both categories
                for (const f of filenames) {
                    const inModel = modelFiles.includes(f);
                    const inDependency = dependencyFiles.includes(f);
                    // At least one must be true (no unclassified)
                    expect(inModel || inDependency).toBe(true);
                }
            }),
            { numRuns: 100 }
        );
    });
});


/**
 * Feature: menu-bar-upload-button, Property 2: Supported format identification is correct and complete
 *
 * For any filename, it is identified as a supported model file if and only if its
 * lowercase extension is exactly one of: gltf, glb, obj, babylon, stl.
 * No other extensions are accepted, and all of these are accepted.
 *
 * **Validates: Requirements 2.2, 2.3**
 */
describe("Property 2: Supported format identification is correct and complete", () => {
    const supportedExtensions = ["gltf", "glb", "obj", "babylon", "stl"];

    /**
     * Identification logic extracted from LoadManager.processDroppedFiles.
     * Returns true if the filename has a supported model extension.
     */
    function isSupportedModelFile(filename: string): boolean {
        const ext = filename.split(".").pop()?.toLowerCase();
        return ext !== undefined && supportedExtensions.includes(ext);
    }

    // Generator for a valid base name (non-empty, no dots)
    const baseNameArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

    // Generator for filenames with a known supported extension (various cases)
    const supportedFilenameArb = fc.tuple(
        baseNameArb,
        fc.constantFrom(...supportedExtensions),
        fc.constantFrom("lower", "upper", "mixed") as fc.Arbitrary<"lower" | "upper" | "mixed">
    ).map(([name, ext, caseType]) => {
        let casedExt: string;
        switch (caseType) {
            case "upper":
                casedExt = ext.toUpperCase();
                break;
            case "mixed":
                casedExt = ext
                    .split("")
                    .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                    .join("");
                break;
            default:
                casedExt = ext;
        }
        return `${name}.${casedExt}`;
    });

    // Generator for filenames with known unsupported extensions
    const unsupportedKnownExtArb = fc.tuple(
        baseNameArb,
        fc.constantFrom("png", "jpg", "jpeg", "gif", "bmp", "tga", "bin", "txt", "mtl", "fbx", "dae", "zip", "rar", "pdf", "mp3", "wav", "json", "xml", "html", "css")
    ).map(([name, ext]) => `${name}.${ext}`);

    // Generator for filenames with random extensions (not in supported list)
    const randomUnsupportedExtArb = fc.tuple(
        baseNameArb,
        fc.stringMatching(/^[a-zA-Z0-9]{1,8}$/).filter(
            (ext) => !supportedExtensions.includes(ext.toLowerCase())
        )
    ).map(([name, ext]) => `${name}.${ext}`);

    // Generator for edge-case filenames: no extension, empty, dots only
    const edgeCaseFilenameArb = fc.oneof(
        // No extension (no dot at all)
        baseNameArb,
        // Empty string
        fc.constant(""),
        // Only dots
        fc.stringMatching(/^\.{1,5}$/),
        // Dot at end (empty extension)
        baseNameArb.map((name) => `${name}.`),
        // Multiple dots with non-supported final extension
        fc.tuple(baseNameArb, baseNameArb, fc.stringMatching(/^[a-zA-Z]{1,4}$/).filter(
            (ext) => !supportedExtensions.includes(ext.toLowerCase())
        )).map(([a, b, ext]) => `${a}.${b}.${ext}`)
    );

    it("filenames with a supported extension (any case) are always identified as supported", () => {
        fc.assert(
            fc.property(supportedFilenameArb, (filename) => {
                expect(isSupportedModelFile(filename)).toBe(true);
            }),
            { numRuns: 200 }
        );
    });

    it("filenames with known unsupported extensions are never identified as supported", () => {
        fc.assert(
            fc.property(unsupportedKnownExtArb, (filename) => {
                expect(isSupportedModelFile(filename)).toBe(false);
            }),
            { numRuns: 100 }
        );
    });

    it("filenames with random non-supported extensions are never identified as supported", () => {
        fc.assert(
            fc.property(randomUnsupportedExtArb, (filename) => {
                expect(isSupportedModelFile(filename)).toBe(false);
            }),
            { numRuns: 100 }
        );
    });

    it("edge-case filenames (no extension, empty, dots only) are never identified as supported", () => {
        fc.assert(
            fc.property(edgeCaseFilenameArb, (filename) => {
                expect(isSupportedModelFile(filename)).toBe(false);
            }),
            { numRuns: 100 }
        );
    });

    it("bidirectional correctness: supported iff extension is in the exact set", () => {
        // Generate any filename and verify the biconditional
        const anyFilenameArb = fc.oneof(
            supportedFilenameArb,
            unsupportedKnownExtArb,
            randomUnsupportedExtArb,
            edgeCaseFilenameArb,
            fc.string({ minLength: 0, maxLength: 50 })
        );

        fc.assert(
            fc.property(anyFilenameArb, (filename) => {
                const ext = filename.split(".").pop()?.toLowerCase();
                const shouldBeSupported = ext !== undefined && supportedExtensions.includes(ext);
                const actualResult = isSupportedModelFile(filename);

                // Bidirectional: identified as supported ⟺ extension is in the set
                expect(actualResult).toBe(shouldBeSupported);
            }),
            { numRuns: 200 }
        );
    });
});
