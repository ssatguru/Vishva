import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createTarArchive, extractTarArchive } from "./TarUtils";

/**
 * Feature: standalone-world-archive, Property 7: TAR Binary Data Round-Trip
 *
 * For any set of binary data entries stored in a TAR archive via createTarArchive
 * and then extracted via extractTarArchive, the extracted binary data for each entry
 * SHALL be byte-for-byte identical to the original input data.
 *
 * **Validates: Requirements 4.3**
 */
describe("Property 7: TAR Binary Data Round-Trip", () => {
    // Generator for valid TAR filenames (max 99 chars, ASCII printable, no null bytes)
    const filenameArb = fc
        .tuple(
            fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_.-]{0,20}$/),
            fc.constantFrom(".txt", ".jpg", ".png", ".bin", ".json", ".babylon", ".env", ".glb", ".ogg")
        )
        .map(([name, ext]) => name + ext);

    // Generator for filenames with path prefixes (like "assets/texture.png")
    const pathFilenameArb = fc
        .tuple(
            fc.constantFrom("", "assets/", "data/", "models/meshes/"),
            filenameArb
        )
        .map(([prefix, name]) => {
            const result = prefix + name;
            // Ensure total length <= 99 (TAR filename limit)
            return result.slice(0, 99);
        });

    // Generator for binary data (0 to ~4KB)
    const binaryDataArb = fc.uint8Array({ minLength: 0, maxLength: 4096 });

    // Generator for a single file entry
    const fileEntryArb = fc
        .tuple(pathFilenameArb, binaryDataArb)
        .map(([filename, data]) => ({ filename, data }));

    // Generator for a set of file entries with unique filenames
    const fileSetArb = fc
        .uniqueArray(fileEntryArb, {
            minLength: 1,
            maxLength: 10,
            comparator: (a, b) => a.filename === b.filename
        });

    it("extracted data is byte-for-byte identical to input for each entry", () => {
        fc.assert(
            fc.asyncProperty(fileSetArb, async (files) => {
                // Create TAR archive
                const tarData = await createTarArchive(files);

                // Extract TAR archive
                const extracted = await extractTarArchive(tarData);

                // Verify each input file is present and identical
                expect(extracted.size).toBe(files.length);

                for (const file of files) {
                    const extractedData = extracted.get(file.filename);
                    expect(extractedData).toBeDefined();
                    expect(extractedData!.length).toBe(file.data.length);

                    // Byte-for-byte comparison
                    for (let i = 0; i < file.data.length; i++) {
                        if (extractedData![i] !== file.data[i]) {
                            throw new Error(
                                `Byte mismatch at index ${i} for file "${file.filename}": ` +
                                `expected ${file.data[i]}, got ${extractedData![i]}`
                            );
                        }
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("round-trip preserves empty files (zero-length data)", () => {
        fc.assert(
            fc.asyncProperty(
                fc.uniqueArray(pathFilenameArb, { minLength: 1, maxLength: 5 }),
                async (filenames) => {
                    const files = filenames.map((filename) => ({
                        filename,
                        data: new Uint8Array(0),
                    }));

                    const tarData = await createTarArchive(files);
                    const extracted = await extractTarArchive(tarData);

                    expect(extracted.size).toBe(files.length);
                    for (const file of files) {
                        const extractedData = extracted.get(file.filename);
                        expect(extractedData).toBeDefined();
                        expect(extractedData!.length).toBe(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("round-trip preserves files at 512-byte boundaries (no padding needed)", () => {
        fc.assert(
            fc.asyncProperty(
                fc.uniqueArray(
                    fc.tuple(
                        pathFilenameArb,
                        fc.integer({ min: 1, max: 8 }).map((n) => new Uint8Array(n * 512).fill(0xAB))
                    ).map(([filename, data]) => ({ filename, data })),
                    { minLength: 1, maxLength: 5, comparator: (a, b) => a.filename === b.filename }
                ),
                async (files) => {
                    const tarData = await createTarArchive(files);
                    const extracted = await extractTarArchive(tarData);

                    expect(extracted.size).toBe(files.length);
                    for (const file of files) {
                        const extractedData = extracted.get(file.filename);
                        expect(extractedData).toBeDefined();
                        expect(extractedData!.length).toBe(file.data.length);

                        for (let i = 0; i < file.data.length; i++) {
                            expect(extractedData![i]).toBe(file.data[i]);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("round-trip works with a single file", () => {
        fc.assert(
            fc.asyncProperty(
                pathFilenameArb,
                binaryDataArb,
                async (filename, data) => {
                    const files = [{ filename, data }];

                    const tarData = await createTarArchive(files);
                    const extracted = await extractTarArchive(tarData);

                    expect(extracted.size).toBe(1);
                    const extractedData = extracted.get(filename);
                    expect(extractedData).toBeDefined();
                    expect(extractedData!.length).toBe(data.length);

                    for (let i = 0; i < data.length; i++) {
                        if (extractedData![i] !== data[i]) {
                            throw new Error(
                                `Byte mismatch at index ${i}: expected ${data[i]}, got ${extractedData![i]}`
                            );
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
