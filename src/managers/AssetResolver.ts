/**
 * AssetResolver — Intercepts BabylonJS file requests during scene load and
 * serves matching assets from the AssetStore (IndexedDB) via Blob URLs.
 *
 * Overrides both Tools.LoadFile (for binary/text files) and Tools.PreprocessUrl
 * (for texture images) so that ALL asset types bundled in the archive are
 * resolved from IndexedDB rather than fetched from the server.
 *
 * On activate(), all session assets are loaded from IndexedDB into a local map
 * to satisfy the synchronous PreprocessUrl contract. Memory is freed on deactivate().
 */

import { Tools } from "babylonjs";
import { AssetStore } from "./AssetStore.js";

export class AssetResolver {
    private blobUrls: string[] = [];
    private assetStore: AssetStore | null = null;
    private assetMap: Map<string, Uint8Array> | null = null;
    private originalLoadFile: typeof Tools.LoadFile | null = null;
    private originalPreprocessUrl: ((url: string) => string) | null = null;
    /** Reverse map: blobUrl → original vishva/assets/... path. Survives deactivate(). */
    private _reverseMap: Map<string, string> = new Map();

    /**
     * Activate the resolver with an IndexedDB-backed AssetStore.
     * Loads all session assets from IDB into a local map for synchronous access,
     * then overrides Tools.LoadFile and Tools.PreprocessUrl to intercept matching requests.
     * @param store The AssetStore instance (must already be open)
     */
    async activate(store: AssetStore): Promise<void> {
        this.assetStore = store;
        this.blobUrls = [];

        // Pre-load all session assets from IDB into local map for synchronous access
        // (PreprocessUrl is synchronous, so we cannot do async IDB reads there)
        const keys = await store.listKeys();
        const localMap = new Map<string, Uint8Array>();
        for (const key of keys) {
            const data = await store.get(key);
            if (data) {
                localMap.set(key, data);
            }
        }
        this.assetMap = localMap;

        // --- Override Tools.PreprocessUrl ---
        // BabylonJS calls this for EVERY URL (including texture images) before loading.
        this.originalPreprocessUrl = Tools.PreprocessUrl;
        const self = this;

        Tools.PreprocessUrl = function (url: string): string {
            if (self.assetMap && self.assetMap.size > 0 && typeof url === "string") {
                // Full structured path matching: the URL IS the key
                // (e.g., "vishva/assets/audio/footstep.ogg")
                const matchedKey = self._findMatchingKey(url);

                if (matchedKey) {
                    const blobUrl = self.createBlobUrl(matchedKey);
                    if (blobUrl) {
                        return blobUrl;
                    }
                }
            }
            // Fall through to original behavior
            if (self.originalPreprocessUrl) {
                return self.originalPreprocessUrl(url);
            }
            return url;
        };

        // --- Override Tools.LoadFile ---
        // Kept for non-image assets (e.g. .env files, shader includes)
        this.originalLoadFile = Tools.LoadFile;

        (Tools as any).LoadFile = function (
            fileOrUrl: any,
            onSuccess: (data: string | ArrayBuffer, responseURL?: string) => void,
            onProgress?: (data: any) => void,
            offlineProvider?: any,
            useArrayBuffer?: boolean,
            onError?: (request?: any, exception?: any) => void
        ) {
            if (self.assetMap && typeof fileOrUrl === "string") {
                // Full structured path matching
                const matchedKey = self._findMatchingKey(fileOrUrl);

                if (matchedKey) {
                    const blobUrl = self.createBlobUrl(matchedKey);
                    if (blobUrl) {
                        return self.originalLoadFile!(
                            blobUrl,
                            onSuccess,
                            onProgress,
                            offlineProvider,
                            useArrayBuffer,
                            onError
                        );
                    }
                }
            }

            // Fall through to original load behavior for non-matching requests
            return self.originalLoadFile!(
                fileOrUrl,
                onSuccess,
                onProgress,
                offlineProvider,
                useArrayBuffer,
                onError
            );
        };
    }

    /**
     * Resolve all `vishva/assets/`-prefixed string values in an object tree to blob URLs.
     * This handles paths in VishvaSerialized (sounds, SNA actuator assets) that are
     * not loaded through BabylonJS's Tools.LoadFile/PreprocessUrl pipeline.
     *
     * Mutates the object in-place, replacing matching strings with blob URLs.
     * @param obj The object to traverse (typically VishvaSerialized)
     */
    resolveAssetPaths(obj: any): void {
        if (!this.assetMap || this.assetMap.size === 0) return;
        this._resolvePathsRecursive(obj);
    }

    private _resolvePathsRecursive(obj: any): void {
        if (obj === null || obj === undefined) return;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const value = obj[i];
                if (typeof value === "string" && value.startsWith("vishva/assets/")) {
                    const blobUrl = this.createBlobUrl(value);
                    if (blobUrl) {
                        this._reverseMap.set(blobUrl, value);
                        obj[i] = blobUrl;
                    }
                } else if (typeof value === "object" && value !== null) {
                    this._resolvePathsRecursive(value);
                }
            }
        } else if (typeof obj === "object") {
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                if (typeof value === "string" && value.startsWith("vishva/assets/")) {
                    const blobUrl = this.createBlobUrl(value);
                    if (blobUrl) {
                        this._reverseMap.set(blobUrl, value);
                        obj[key] = blobUrl;
                    }
                } else if (typeof value === "object" && value !== null) {
                    this._resolvePathsRecursive(value);
                }
            }
        }
    }

    /**
     * Deactivate the resolver and revoke all Blob URLs.
     * Restores original Tools.LoadFile and Tools.PreprocessUrl behavior.
     * NOTE: The _reverseMap is intentionally NOT cleared — it persists for save-time lookup.
     */
    deactivate(): void {
        // Restore original Tools.PreprocessUrl
        if (this.originalPreprocessUrl) {
            Tools.PreprocessUrl = this.originalPreprocessUrl;
            this.originalPreprocessUrl = null;
        }

        // Restore original Tools.LoadFile
        if (this.originalLoadFile) {
            (Tools as any).LoadFile = this.originalLoadFile;
            this.originalLoadFile = null;
        }

        // Revoke all created Blob URLs to free memory
        for (const url of this.blobUrls) {
            URL.revokeObjectURL(url);
        }
        this.blobUrls = [];
        this.assetMap = null;
        this.assetStore = null;
    }

    /**
     * Look up the original vishva/assets/... path for a blob URL produced by resolveAssetPaths().
     * Returns the original path, or null if the blob URL is not recognized.
     */
    reverseBlobUrl(blobUrl: string): string | null {
        return this._reverseMap.get(blobUrl) ?? null;
    }

    /**
     * Deep-traverse an object tree and replace any blob URL strings found in the
     * reverse map with their original vishva/assets/... paths.
     * This is the inverse operation of resolveAssetPaths().
     * Strings NOT in the reverse map (foreign blob URLs, non-blob strings) are left unchanged.
     * Mutates the object in-place.
     * @param obj The object to traverse (typically VishvaSerialized.snas)
     */
    reverseAllBlobUrls(obj: any): void {
        if (this._reverseMap.size === 0) return;
        this._reverseBlobUrlsRecursive(obj);
    }

    private _reverseBlobUrlsRecursive(obj: any): void {
        if (obj === null || obj === undefined) return;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const value = obj[i];
                if (typeof value === "string") {
                    const originalPath = this._reverseMap.get(value);
                    if (originalPath) {
                        obj[i] = originalPath;
                    }
                } else if (typeof value === "object" && value !== null) {
                    this._reverseBlobUrlsRecursive(value);
                }
            }
        } else if (typeof obj === "object") {
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                if (typeof value === "string") {
                    const originalPath = this._reverseMap.get(value);
                    if (originalPath) {
                        obj[key] = originalPath;
                    }
                } else if (typeof value === "object" && value !== null) {
                    this._reverseBlobUrlsRecursive(value);
                }
            }
        }
    }

    /**
     * Find a matching asset key for the given URL.
     * Uses full structured path matching: the URL itself (or a suffix of it)
     * should match a key in the asset map (e.g., "vishva/assets/audio/footstep.ogg").
     */
    private _findMatchingKey(url: string): string | null {
        if (!this.assetMap) return null;

        // Remove query string and fragment
        const cleanUrl = url.split("?")[0].split("#")[0];

        // Direct match: URL is exactly the key (most common case after PathRewriter)
        if (this.assetMap.has(cleanUrl)) {
            return cleanUrl;
        }

        // URL-decoded match
        const decodedUrl = decodeURIComponent(cleanUrl);
        if (decodedUrl !== cleanUrl && this.assetMap.has(decodedUrl)) {
            return decodedUrl;
        }

        // Suffix match: URL ends with the structured path
        // e.g., "http://localhost:8080/bin/vishva/assets/audio/footstep.ogg"
        // should match key "vishva/assets/audio/footstep.ogg"
        for (const key of this.assetMap.keys()) {
            if (cleanUrl.endsWith("/" + key) || cleanUrl === key) {
                return key;
            }
            // Also check decoded
            if (decodedUrl.endsWith("/" + key) || decodedUrl === key) {
                return key;
            }
        }

        return null;
    }

    /**
     * Create a Blob URL for the given asset key on-demand.
     * Returns the blob URL string, or null if the asset is not found.
     */
    private createBlobUrl(assetKey: string): string | null {
        if (!this.assetMap || !this.assetMap.has(assetKey)) {
            return null;
        }
        const data = this.assetMap.get(assetKey)!;
        const filename = this._extractFilenameFromKey(assetKey);
        const mimeType = this.getMimeType(filename);
        const blob = new Blob([new Uint8Array(data)], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.push(blobUrl);
        return blobUrl;
    }

    /**
     * Extract the filename portion from a structured path key.
     * e.g., "vishva/assets/audio/footstep.ogg" → "footstep.ogg"
     */
    private _extractFilenameFromKey(key: string): string {
        const parts = key.split("/");
        return parts[parts.length - 1];
    }

    /**
     * Determine MIME type from filename extension for proper Blob creation.
     */
    private getMimeType(filename: string): string {
        const ext = filename.split(".").pop()?.toLowerCase() || "";
        switch (ext) {
            case "webp": return "image/webp";
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";
            case "bmp": return "image/bmp";
            case "svg": return "image/svg+xml";
            case "tga": return "image/x-tga";
            case "hdr": return "application/octet-stream";
            case "env": return "application/octet-stream";
            case "dds": return "application/octet-stream";
            case "basis": return "application/octet-stream";
            case "ktx": return "image/ktx";
            case "ktx2": return "image/ktx2";
            default: return "application/octet-stream";
        }
    }
}
