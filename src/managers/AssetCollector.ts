/**
 * AssetCollector — Scans a serialized BabylonJS scene JSON object and produces
 * a deduplicated list of all external asset references with resolved URLs and
 * flattened archive filenames.
 *
 * This is a pure logic component with NO DOM or BabylonJS runtime dependency.
 */

export interface AssetEntry {
    /** Original URL/path as it appears in the scene JSON */
    originalUrl: string;
    /** Absolute URL that can be fetched */
    fetchUrl: string;
    /** Target filename in the assets/ folder (after deduplication) */
    archiveFilename: string;
    /** If this was a data URI, the decoded binary data */
    decodedData?: Uint8Array;
}

/**
 * Represents an embedded texture (base64String field) found in a material's
 * texture object. These need to be extracted to separate files and the
 * base64String field removed from the scene JSON.
 */
export interface EmbeddedTextureEntry {
    /** The data URI from the base64String field */
    dataUri: string;
    /** Decoded binary data */
    decodedData: Uint8Array;
    /** Target filename in the assets/ folder */
    archiveFilename: string;
    /** Reference to the texture object so we can mutate it after extraction */
    textureObj: Record<string, any>;
}

export class AssetCollector {
    /**
     * Scan the serialized scene object and collect all asset references.
     * @param sceneObj The serialized scene JSON object
     * @param baseUrl The base URL for resolving relative paths
     * @returns Deduplicated list of asset entries
     */
    collect(sceneObj: object, baseUrl: string): AssetEntry[] {
        const urls = new Set<string>();
        const scene = sceneObj as Record<string, any>;

        // Scan textures[].name and textures[].url
        this._scanTextureArray(scene["textures"], urls);

        // Scan reflectionTextures[].name
        this._scanTextureArray(scene["reflectionTextures"], urls);

        // Scan materials[].* for nested texture references (excluding base64String data URIs)
        this._scanMaterials(scene["materials"], urls);

        // Scan particleSystems[].textureName
        this._scanParticleSystems(scene["particleSystems"], urls);

        // Scan meshes[].delayLoadingFile
        this._scanMeshes(scene["meshes"], urls);

        // Scan top-level environmentTexture
        if (typeof scene["environmentTexture"] === "string" && scene["environmentTexture"]) {
            urls.add(scene["environmentTexture"]);
        }

        // Scan top-level reflectionTexture.name
        if (scene["reflectionTexture"] && typeof scene["reflectionTexture"]["name"] === "string" && scene["reflectionTexture"]["name"]) {
            urls.add(scene["reflectionTexture"]["name"]);
        }

        // Build deduplicated entries with resolved URLs and archive filenames
        return this._buildEntries(urls, baseUrl);
    }

    /**
     * Collect embedded textures (base64String fields) from materials and top-level textures.
     * These are textures where the binary data is stored inline as a data URI in the
     * serialized scene JSON (common with GLB/GLTF imports).
     *
     * After calling this, use the returned entries to:
     * 1. Save the decoded data as separate files in the archive
     * 2. Call stripEmbeddedTextures() to remove base64String fields and fix URLs
     *
     * @param sceneObj The serialized scene JSON object
     * @returns List of embedded texture entries with decoded data
     */
    collectEmbeddedTextures(sceneObj: object): EmbeddedTextureEntry[] {
        const entries: EmbeddedTextureEntry[] = [];
        const scene = sceneObj as Record<string, any>;
        const usedFilenames = new Map<string, number>();

        // Scan materials for texture objects with base64String
        this._scanMaterialsForEmbedded(scene["materials"], entries, usedFilenames);

        // Scan top-level textures array for base64String
        this._scanTextureArrayForEmbedded(scene["textures"], entries, usedFilenames);

        // Scan reflectionTextures array
        this._scanTextureArrayForEmbedded(scene["reflectionTextures"], entries, usedFilenames);

        return entries;
    }

    /**
     * Strip base64String fields from texture objects that were extracted,
     * and update their name/url to point to the archive path.
     * Must be called AFTER collectEmbeddedTextures and AFTER the entries are saved.
     *
     * @param entries The embedded texture entries returned by collectEmbeddedTextures
     */
    stripEmbeddedTextures(entries: EmbeddedTextureEntry[]): void {
        for (const entry of entries) {
            const tex = entry.textureObj;
            // Remove the base64String field
            delete tex.base64String;
            // Set name and url to the archive-relative path
            const archivePath = `assets/${entry.archiveFilename}`;
            tex.name = archivePath;
            tex.url = archivePath;
        }
    }

    private _scanMaterialsForEmbedded(
        materials: any[] | undefined,
        entries: EmbeddedTextureEntry[],
        usedFilenames: Map<string, number>
    ): void {
        if (!Array.isArray(materials)) return;
        for (const mat of materials) {
            if (!mat || typeof mat !== "object") continue;
            for (const key of Object.keys(mat)) {
                const value = mat[key];
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    if (typeof value.base64String === "string" && value.base64String.startsWith("data:")) {
                        const dataUri = value.base64String;
                        const decodedData = this._decodeDataUri(dataUri);
                        // Use the texture's name field for a meaningful filename, falling back to material+key
                        const texName = typeof value.name === "string" && value.name
                            ? value.name
                            : `${mat.name || "mat"}_${key}`;
                        const archiveFilename = this._generateEmbeddedFilename(texName, dataUri, usedFilenames);
                        entries.push({ dataUri, decodedData, archiveFilename, textureObj: value });
                    }
                }
            }
        }
    }

    private _scanTextureArrayForEmbedded(
        textures: any[] | undefined,
        entries: EmbeddedTextureEntry[],
        usedFilenames: Map<string, number>
    ): void {
        if (!Array.isArray(textures)) return;
        for (const tex of textures) {
            if (!tex || typeof tex !== "object") continue;
            if (typeof tex.base64String === "string" && tex.base64String.startsWith("data:")) {
                const dataUri = tex.base64String;
                const decodedData = this._decodeDataUri(dataUri);
                const texName = typeof tex.name === "string" && tex.name
                    ? tex.name
                    : "texture";
                const archiveFilename = this._generateEmbeddedFilename(texName, dataUri, usedFilenames);
                entries.push({ dataUri, decodedData, archiveFilename, textureObj: tex });
            }
        }
    }

    /**
     * Generate a filename for an embedded texture based on its name and MIME type.
     */
    private _generateEmbeddedFilename(
        texName: string,
        dataUri: string,
        usedFilenames: Map<string, number>
    ): string {
        // Extract extension from the data URI MIME type
        const mimeMatch = dataUri.match(/^data:([^;,]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const ext = this._mimeToExtension(mimeType);

        // Clean up the texture name to make a valid filename
        // Strip any existing path prefix (e.g., "assets/")
        let cleanName = texName.replace(/^assets\//, "");
        // Remove any existing extension
        const dotIdx = cleanName.lastIndexOf(".");
        if (dotIdx > 0) {
            cleanName = cleanName.substring(0, dotIdx);
        }
        // Replace invalid filename characters with underscores
        cleanName = cleanName.replace(/[^a-zA-Z0-9_\-() ]/g, "_");
        // Trim and ensure non-empty
        cleanName = cleanName.trim() || "embedded_texture";

        const basename = `${cleanName}${ext}`;
        return this._disambiguateFilename(basename, usedFilenames);
    }

    private _scanTextureArray(textures: any[] | undefined, urls: Set<string>): void {
        if (!Array.isArray(textures)) return;
        for (const tex of textures) {
            if (!tex || typeof tex !== "object") continue;
            // Skip textures that have base64String — they'll be handled by collectEmbeddedTextures
            if (typeof tex.base64String === "string" && tex.base64String.startsWith("data:")) {
                continue;
            }
            if (typeof tex.name === "string" && tex.name && !tex.name.startsWith("assets/")) {
                urls.add(tex.name);
            }
            if (typeof tex.url === "string" && tex.url && !tex.url.startsWith("assets/")) {
                urls.add(tex.url);
            }
        }
    }

    private _scanMaterials(materials: any[] | undefined, urls: Set<string>): void {
        if (!Array.isArray(materials)) return;
        for (const mat of materials) {
            if (!mat || typeof mat !== "object") continue;
            // Scan all properties of the material for nested texture objects with a .name field
            for (const key of Object.keys(mat)) {
                const value = mat[key];
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    // Skip textures that have base64String — they'll be handled by collectEmbeddedTextures
                    if (typeof value.base64String === "string" && value.base64String.startsWith("data:")) {
                        continue;
                    }
                    if (typeof value.name === "string" && value.name && !value.name.startsWith("assets/")) {
                        urls.add(value.name);
                    }
                }
            }
        }
    }

    private _scanParticleSystems(particleSystems: any[] | undefined, urls: Set<string>): void {
        if (!Array.isArray(particleSystems)) return;
        for (const ps of particleSystems) {
            if (!ps || typeof ps !== "object") continue;
            if (typeof ps.textureName === "string" && ps.textureName) {
                urls.add(ps.textureName);
            }
        }
    }

    private _scanMeshes(meshes: any[] | undefined, urls: Set<string>): void {
        if (!Array.isArray(meshes)) return;
        for (const mesh of meshes) {
            if (!mesh || typeof mesh !== "object") continue;
            if (typeof mesh.delayLoadingFile === "string" && mesh.delayLoadingFile) {
                urls.add(mesh.delayLoadingFile);
            }
        }
    }

    private _buildEntries(urls: Set<string>, baseUrl: string): AssetEntry[] {
        const entries: AssetEntry[] = [];
        const usedFilenames = new Map<string, number>(); // basename -> count of times used

        for (const originalUrl of urls) {
            const isDataUri = originalUrl.startsWith("data:");

            let fetchUrl: string;
            let decodedData: Uint8Array | undefined;
            let archiveFilename: string;

            if (isDataUri) {
                fetchUrl = originalUrl; // data URIs are self-contained
                decodedData = this._decodeDataUri(originalUrl);
                archiveFilename = this._generateDataUriFilename(originalUrl, usedFilenames);
            } else {
                fetchUrl = this._resolveUrl(originalUrl, baseUrl);
                archiveFilename = this._generateFilename(originalUrl, usedFilenames);
            }

            const entry: AssetEntry = {
                originalUrl,
                fetchUrl,
                archiveFilename,
            };

            if (decodedData) {
                entry.decodedData = decodedData;
            }

            entries.push(entry);
        }

        return entries;
    }

    private _resolveUrl(relativePath: string, baseUrl: string): string {
        try {
            return new URL(relativePath, baseUrl).href;
        } catch {
            // If URL resolution fails, return the path as-is joined with base
            return baseUrl.replace(/\/$/, "") + "/" + relativePath.replace(/^\//, "");
        }
    }

    private _decodeDataUri(dataUri: string): Uint8Array {
        // Format: data:[<mediatype>][;base64],<data>
        const commaIndex = dataUri.indexOf(",");
        if (commaIndex === -1) {
            return new Uint8Array(0);
        }

        const meta = dataUri.substring(0, commaIndex);
        const data = dataUri.substring(commaIndex + 1);

        if (meta.includes(";base64")) {
            return this._base64ToUint8Array(data);
        } else {
            // URL-encoded data
            const decoded = decodeURIComponent(data);
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            return bytes;
        }
    }

    private _base64ToUint8Array(base64: string): Uint8Array {
        // Use atob for browser or Buffer for Node.js
        if (typeof atob === "function") {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } else {
            // Node.js fallback (for testing with vitest)
            const buffer = Buffer.from(base64, "base64");
            return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
    }

    private _generateFilename(originalUrl: string, usedFilenames: Map<string, number>): string {
        // Strip query strings and fragments
        let cleanUrl = originalUrl.split("?")[0].split("#")[0];

        // Extract basename (last segment after /)
        const segments = cleanUrl.split("/");
        let basename = segments[segments.length - 1] || "asset";

        // Ensure we have a valid filename
        if (!basename || basename.trim() === "") {
            basename = "asset";
        }

        return this._disambiguateFilename(basename, usedFilenames);
    }

    private _generateDataUriFilename(dataUri: string, usedFilenames: Map<string, number>): string {
        // Extract MIME type to determine extension
        const mimeMatch = dataUri.match(/^data:([^;,]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

        const ext = this._mimeToExtension(mimeType);
        const basename = `data_asset${ext}`;

        return this._disambiguateFilename(basename, usedFilenames);
    }

    private _disambiguateFilename(basename: string, usedFilenames: Map<string, number>): string {
        const count = usedFilenames.get(basename);
        if (count === undefined) {
            // First use of this basename
            usedFilenames.set(basename, 1);
            return basename;
        } else {
            // Collision — append numeric suffix before extension
            const dotIndex = basename.lastIndexOf(".");
            let name: string;
            let ext: string;
            if (dotIndex > 0) {
                name = basename.substring(0, dotIndex);
                ext = basename.substring(dotIndex);
            } else {
                name = basename;
                ext = "";
            }

            const suffix = count;
            usedFilenames.set(basename, count + 1);
            const disambiguated = `${name}_${suffix}${ext}`;
            return disambiguated;
        }
    }

    private _mimeToExtension(mimeType: string): string {
        const map: Record<string, string> = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/bmp": ".bmp",
            "image/svg+xml": ".svg",
            "image/tiff": ".tiff",
            "audio/ogg": ".ogg",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "video/mp4": ".mp4",
            "application/octet-stream": ".bin",
            "model/gltf-binary": ".glb",
            "model/gltf+json": ".gltf",
        };
        return map[mimeType] || ".bin";
    }
}
