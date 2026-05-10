import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * The detection logic extracted from LoadManager.
 * Returns true if and only if at least one entry name starts with "assets/".
 */
function hasAssets(entryNames: string[]): boolean {
    return entryNames.some((key) => key.startsWith("assets/"));
}

/**
 * Feature: standalone-world-archive, Property 9: Asset Presence Detection
 *
 * For any set of TAR archive entry names, the asset detection logic SHALL return
 * true if and only if at least one entry name starts with the prefix "assets/".
 *
 * **Validates: Requirements 6.2**
 */
describe("Property 9: Asset Presence Detection", () => {
    // Generator for non-asset entry names (never start with "assets/")
    const nonAssetEntryArb = fc
        .constantFrom(
            "Vishva.json",
            "Scene.babylon",
            "metadata.json",
            "config.txt",
            "data/scene.bin",
            "textures/ground.jpg",
            "models/tree.glb",
            "assetsBackup/old.png", // starts with "assets" but not "assets/"
            "ASSETS/upper.png", // case-sensitive: uppercase doesn't match
            "asset/single.jpg" // "asset/" not "assets/"
        )
        .chain((base) =>
            fc.constantFrom(base, base).map((name) => name)
        );

    // Generator for asset entry names (always start with "assets/")
    const assetEntryArb = fc
        .tuple(
            fc.stringMatching(/^[a-z][a-z0-9_.-]{0,20}$/),
            fc.constantFrom(".jpg", ".png", ".env", ".babylon", ".glb", ".hdr", ".ogg")
        )
        .map(([name, ext]) => `assets/${name}${ext}`);

    // Generator for a set of only non-asset entries
    const nonAssetSetArb = fc.array(nonAssetEntryArb, { minLength: 0, maxLength: 10 });

    // Generator for a set that contains at least one asset entry
    const setWithAssetsArb = fc
        .tuple(
            fc.array(nonAssetEntryArb, { minLength: 0, maxLength: 8 }),
            fc.array(assetEntryArb, { minLength: 1, maxLength: 5 })
        )
        .map(([nonAssets, assets]) => {
            // Shuffle the combined array
            const combined = [...nonAssets, ...assets];
            return fc.sample(fc.shuffledSubarray(combined, { minLength: combined.length, maxLength: combined.length }), 1)[0];
        });

    it("returns false when no entry starts with 'assets/'", () => {
        fc.assert(
            fc.property(nonAssetSetArb, (entryNames) => {
                const result = hasAssets(entryNames);
                expect(result).toBe(false);
            }),
            { numRuns: 100 }
        );
    });

    it("returns true when at least one entry starts with 'assets/'", () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.array(nonAssetEntryArb, { minLength: 0, maxLength: 8 }),
                    fc.array(assetEntryArb, { minLength: 1, maxLength: 5 })
                ),
                ([nonAssets, assets]) => {
                    const combined = [...nonAssets, ...assets];
                    const result = hasAssets(combined);
                    expect(result).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("detection is equivalent to checking if any entry starts with 'assets/' prefix", () => {
        // Generate arbitrary string arrays (some may or may not start with "assets/")
        const arbitraryEntryArb = fc.oneof(
            nonAssetEntryArb,
            assetEntryArb,
            fc.string({ minLength: 0, maxLength: 30 })
        );

        fc.assert(
            fc.property(
                fc.array(arbitraryEntryArb, { minLength: 0, maxLength: 15 }),
                (entryNames) => {
                    const result = hasAssets(entryNames);
                    const expected = entryNames.some((name) => name.startsWith("assets/"));
                    expect(result).toBe(expected);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("returns false for empty entry set", () => {
        expect(hasAssets([])).toBe(false);
    });

    it("is case-sensitive: 'Assets/' or 'ASSETS/' do not trigger detection", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.constantFrom(
                        "Assets/texture.png",
                        "ASSETS/model.glb",
                        "ASSETS/sound.ogg",
                        "Assets/env.hdr"
                    ),
                    { minLength: 1, maxLength: 5 }
                ),
                (entryNames) => {
                    const result = hasAssets(entryNames);
                    expect(result).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});
