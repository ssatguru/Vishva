/**
 * PathRewriter — Rewrites all asset URLs in a serialized BabylonJS scene JSON
 * from their original paths to archive-relative paths (`assets/<archiveFilename>`).
 *
 * This is a pure logic component with NO DOM or BabylonJS runtime dependency.
 */

import { AssetEntry } from "./AssetCollector.js";

export class PathRewriter {
    /**
     * Rewrite all asset references in the scene object.
     * Mutates the scene object in place.
     * @param sceneObj The serialized scene JSON object (mutated in place)
     * @param assetEntries The collected asset entries with their archive filenames
     */
    rewrite(sceneObj: object, assetEntries: AssetEntry[]): void {
        if (!assetEntries || assetEntries.length === 0) return;

        // Build map from originalUrl → assets/<archiveFilename>
        const urlMap = new Map<string, string>();
        for (const entry of assetEntries) {
            urlMap.set(entry.originalUrl, `assets/${entry.archiveFilename}`);
        }

        // Deep-traverse the scene object and replace matching string values
        this._traverse(sceneObj, urlMap);
    }

    /**
     * Recursively traverse an object/array, replacing any string value
     * that matches a key in the urlMap with the corresponding archive path.
     */
    private _traverse(obj: any, urlMap: Map<string, string>): void {
        if (obj === null || obj === undefined) return;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const value = obj[i];
                if (typeof value === "string") {
                    const replacement = urlMap.get(value);
                    if (replacement !== undefined) {
                        obj[i] = replacement;
                    }
                } else if (typeof value === "object" && value !== null) {
                    this._traverse(value, urlMap);
                }
            }
        } else if (typeof obj === "object") {
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                if (typeof value === "string") {
                    const replacement = urlMap.get(value);
                    if (replacement !== undefined) {
                        obj[key] = replacement;
                    }
                } else if (typeof value === "object" && value !== null) {
                    this._traverse(value, urlMap);
                }
            }
        }
    }
}
