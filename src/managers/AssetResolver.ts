/**
 * AssetResolver — Intercepts BabylonJS file requests during scene load and
 * serves matching assets from the extracted archive via Blob URLs.
 *
 * Overrides both Tools.LoadFile (for binary/text files) and Tools.PreprocessUrl
 * (for texture images) so that ALL asset types bundled in the archive are
 * resolved from memory rather than fetched from the server.
 */

import { Tools } from "babylonjs";

export class AssetResolver {
    private blobUrls: string[] = [];
    private assetMap: Map<string, Uint8Array> | null = null;
    private originalLoadFile: typeof Tools.LoadFile | null = null;
    private originalPreprocessUrl: ((url: string) => string) | null = null;

    /**
     * Activate the resolver with extracted archive assets.
     * Overrides Tools.LoadFile and Tools.PreprocessUrl to intercept matching requests.
     * @param assets Map of archive paths (e.g. "assets/ground.jpg") to binary data
     */
    activate(assets: Map<string, Uint8Array>): void {
        this.assetMap = assets;
        this.blobUrls = [];

        // --- Override Tools.PreprocessUrl ---
        // BabylonJS calls this for EVERY URL (including texture images) before loading.
        this.originalPreprocessUrl = Tools.PreprocessUrl;
        const self = this;

        Tools.PreprocessUrl = function (url: string): string {
            if (self.assetMap && self.assetMap.size > 0 && typeof url === "string") {
                const filename = self.extractFilename(url);
                const decodedFilename = decodeURIComponent(filename);

                const assetKey = `assets/${decodedFilename}`;
                const assetKeyRaw = `assets/${filename}`;
                const matchedKey = self.assetMap.has(assetKey) ? assetKey
                    : self.assetMap.has(assetKeyRaw) ? assetKeyRaw
                    : null;

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
                const filename = self.extractFilename(fileOrUrl);
                const decodedFilename = decodeURIComponent(filename);

                const assetKey = `assets/${decodedFilename}`;
                const assetKeyRaw = `assets/${filename}`;
                const matchedKey = self.assetMap.has(assetKey) ? assetKey
                    : self.assetMap.has(assetKeyRaw) ? assetKeyRaw
                    : null;

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
     * Deactivate the resolver and revoke all Blob URLs.
     * Restores original Tools.LoadFile and Tools.PreprocessUrl behavior.
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
        const filename = assetKey.startsWith("assets/") ? assetKey.substring("assets/".length) : assetKey;
        const mimeType = this.getMimeType(filename);
        const blob = new Blob([new Uint8Array(data)], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.push(blobUrl);
        return blobUrl;
    }

    /**
     * Extract the filename from a URL string.
     * Strips path, query strings, and fragments.
     */
    private extractFilename(url: string): string {
        // Remove query string and fragment
        const cleanUrl = url.split("?")[0].split("#")[0];
        // Get the last path segment
        const parts = cleanUrl.split("/");
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
