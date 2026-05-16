import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { shouldShowLauncher, buildWorldQueryString, processServerWorldList } from "./WorldLauncherLogic";

/**
 * Feature: world-launcher-chooser, Property 1: Launcher display decision is a complete partition
 *
 * For any combination of worldParam (string | null) and defaultWorld (string | undefined),
 * shouldShowLauncher returns true if and only if worldParam is null AND defaultWorld is
 * either undefined or the empty string. In all other cases it returns false.
 * No input combination produces an ambiguous result.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 6.2**
 */
describe("Property 1: Launcher display decision is a complete partition", () => {
    // Generator for worldParam: either null or an arbitrary non-null string
    const worldParamArb: fc.Arbitrary<string | null> = fc.oneof(
        fc.constant(null),
        fc.string({ minLength: 0, maxLength: 50 })
    );

    // Generator for defaultWorld: either undefined, empty string, or an arbitrary non-empty string
    const defaultWorldArb: fc.Arbitrary<string | undefined> = fc.oneof(
        fc.constant(undefined),
        fc.constant(""),
        fc.string({ minLength: 1, maxLength: 50 })
    );

    it("returns true iff worldParam is null AND defaultWorld is undefined or empty string", () => {
        fc.assert(
            fc.property(worldParamArb, defaultWorldArb, (worldParam, defaultWorld) => {
                const result = shouldShowLauncher(worldParam, defaultWorld);
                const expected = worldParam === null && (defaultWorld === undefined || defaultWorld === "");
                expect(result).toBe(expected);
            }),
            { numRuns: 200 }
        );
    });

    it("always returns a boolean (never undefined or throws)", () => {
        fc.assert(
            fc.property(worldParamArb, defaultWorldArb, (worldParam, defaultWorld) => {
                const result = shouldShowLauncher(worldParam, defaultWorld);
                expect(typeof result).toBe("boolean");
            }),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: world-launcher-chooser, Property 2: Server world list processing preserves all world file entries
 *
 * For any array of filenames, processServerWorldList returns an entry for every filename
 * that ends with .tar.gz (case-insensitive) or .json (case-insensitive) and excludes all
 * filenames that do not. The returned entries are sorted alphabetically by display name,
 * and each entry's display field is the full filename.
 *
 * **Validates: Requirements 3.2**
 */
describe("Property 2: Server world list processing preserves all world file entries", () => {
    // Generator for a base name (alphanumeric with dashes/underscores)
    const baseNameArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

    // Generator for .tar.gz filenames with various casings
    const tarGzFilenameArb = fc.tuple(
        baseNameArb,
        fc.constantFrom(".tar.gz", ".TAR.GZ", ".Tar.Gz", ".tar.GZ", ".TAR.gz")
    ).map(([name, ext]) => `${name}${ext}`);

    // Generator for .json filenames with various casings
    const jsonFilenameArb = fc.tuple(
        baseNameArb,
        fc.constantFrom(".json", ".JSON", ".Json")
    ).map(([name, ext]) => `${name}${ext}`);

    // Generator for world filenames (either .tar.gz or .json)
    const worldFilenameArb = fc.oneof(tarGzFilenameArb, jsonFilenameArb);

    // Generator for non-world filenames (not .tar.gz and not .json)
    const nonWorldFilenameArb = fc.oneof(
        // Plain filenames with other extensions
        fc.tuple(baseNameArb, fc.constantFrom(".txt", ".zip", ".gz", ".tar", ".png", ".babylon"))
            .map(([name, ext]) => `${name}${ext}`),
        // Filenames with no extension
        baseNameArb,
        // Filenames that partially match but aren't .tar.gz
        baseNameArb.map(name => `${name}.tar`),
        baseNameArb.map(name => `${name}.gz`)
    );

    // Generator for mixed arrays of filenames
    const filenameArrayArb = fc.array(
        fc.oneof(worldFilenameArb, nonWorldFilenameArb),
        { minLength: 0, maxLength: 30 }
    );

    it("output contains exactly the .tar.gz and .json entries from input", () => {
        fc.assert(
            fc.property(filenameArrayArb, (filenames) => {
                const result = processServerWorldList(filenames);

                // Count expected world entries (case-insensitive)
                const expectedWorlds = filenames.filter(f => /\.tar\.gz$/i.test(f) || /\.json$/i.test(f));

                // Result should have exactly as many entries as world files in input
                expect(result.length).toBe(expectedWorlds.length);

                // Every result filename should be from the original world set
                for (const entry of result) {
                    expect(expectedWorlds).toContain(entry.filename);
                }

                // Every world input should appear in the result
                for (const f of expectedWorlds) {
                    expect(result.some(entry => entry.filename === f)).toBe(true);
                }
            }),
            { numRuns: 200 }
        );
    });

    it("output is sorted alphabetically by display name", () => {
        fc.assert(
            fc.property(filenameArrayArb, (filenames) => {
                const result = processServerWorldList(filenames);

                for (let i = 1; i < result.length; i++) {
                    expect(result[i - 1].display.localeCompare(result[i].display)).toBeLessThanOrEqual(0);
                }
            }),
            { numRuns: 200 }
        );
    });

    it("display name is the full filename", () => {
        fc.assert(
            fc.property(fc.array(worldFilenameArb, { minLength: 1, maxLength: 20 }), (filenames) => {
                const result = processServerWorldList(filenames);

                for (const entry of result) {
                    expect(entry.display).toBe(entry.filename);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("non-world entries are never included in output", () => {
        fc.assert(
            fc.property(fc.array(nonWorldFilenameArb, { minLength: 1, maxLength: 20 }), (filenames) => {
                const result = processServerWorldList(filenames);
                expect(result.length).toBe(0);
            }),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: world-launcher-chooser, Property 3: World query string construction produces valid reload URLs
 *
 * For any non-empty world name string, buildWorldQueryString returns a string of the form
 * "?world=<encodedName>" where <encodedName> is the URI-encoded world name. Parsing the
 * returned query string back extracts the original world name.
 *
 * **Validates: Requirements 3.3, 4.3, 7.2**
 */
describe("Property 3: World query string construction produces valid reload URLs", () => {
    // Generator for non-empty world name strings including special characters
    const worldNameArb = fc.oneof(
        // Simple alphanumeric names
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,30}$/),
        // Names with spaces and special characters
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.length > 0),
        // Names with unicode characters (emoji, CJK, etc.)
        fc.constantFrom("世界", "мир", "🌍world", "café", "naïve", "日本語テスト"),
        // Names that look like URL components
        fc.constantFrom("my world", "hello&goodbye", "test=value", "path/to/world", "world#1", "100%done")
    );

    it("round-trips through URLSearchParams to recover the original name", () => {
        fc.assert(
            fc.property(worldNameArb, (worldName) => {
                const queryString = buildWorldQueryString(worldName);

                // Parse the query string back
                const params = new URLSearchParams(queryString.substring(1)); // strip leading '?'
                const recovered = params.get("world");

                expect(recovered).toBe(worldName);
            }),
            { numRuns: 200 }
        );
    });

    it("always starts with '?world='", () => {
        fc.assert(
            fc.property(worldNameArb, (worldName) => {
                const queryString = buildWorldQueryString(worldName);
                expect(queryString.startsWith("?world=")).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    it("produces a string that is a valid URL query component", () => {
        fc.assert(
            fc.property(worldNameArb, (worldName) => {
                const queryString = buildWorldQueryString(worldName);

                // Should be parseable as a URL without throwing
                const url = new URL("http://example.com/" + queryString);
                expect(url.searchParams.get("world")).toBe(worldName);
            }),
            { numRuns: 100 }
        );
    });
});
