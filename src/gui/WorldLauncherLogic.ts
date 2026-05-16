/**
 * Pure logic functions for the World Launcher feature.
 * These functions have no DOM or side-effect dependencies (except storeUploadedWorld
 * which uses IndexedDB and Compression Streams API).
 */

import { isTarGzFile } from "../managers/FileValidator";
import { extractTarArchive, createTarArchive } from "../managers/TarUtils";
import { AssetStore } from "../managers/AssetStore";

/**
 * Determines whether the launcher overlay should be displayed.
 * Returns true iff worldParam is null AND defaultWorld is undefined or empty string.
 *
 * @param worldParam - The value of the ?world= query parameter (null if absent)
 * @param defaultWorld - The defaultWorld config variable (undefined if not set)
 */
export function shouldShowLauncher(worldParam: string | null, defaultWorld: string | undefined): boolean {
    return worldParam === null && (defaultWorld === undefined || defaultWorld === "");
}

/**
 * Builds a query string for navigating to a specific world.
 * Returns "?world=<encodedName>" using encodeURIComponent.
 *
 * @param worldName - The world name to encode into the query string
 */
export function buildWorldQueryString(worldName: string): string {
    return "?world=" + encodeURIComponent(worldName);
}

/**
 * Processes a raw list of filenames from the server world index.
 * Filters to .tar.gz and .json entries (case-insensitive), uses the full
 * filename as the display name, and sorts alphabetically.
 *
 * @param filenames - Array of filenames from the server index
 * @returns Sorted array of { display, filename } objects for world files
 */
export function processServerWorldList(filenames: string[]): Array<{ display: string; filename: string }> {
    return filenames
        .filter(f => isTarGzFile(f) || /\.json$/i.test(f))
        .map(f => ({
            display: f,
            filename: f
        }))
        .sort((a, b) => a.display.localeCompare(b.display));
}

/**
 * Reads a file as ArrayBuffer, validates it as a .tar.gz world archive
 * (decompresses gzip, extracts tar, checks for Vishva.json and Scene.babylon),
 * stores in IndexedDB VishvaWorlds/worlds under "__uploaded" key,
 * and returns { success: true } or { success: false, error: string }.
 *
 * @param file - The File object to validate and store
 */
export async function storeUploadedWorld(file: File): Promise<{ success: boolean; error?: string }> {
    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Validate: decompress gzip
        let decompressedData: Uint8Array;
        try {
            const compressedBlob = new Blob([arrayBuffer]);
            decompressedData = await decompressGzip(compressedBlob);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, error: "Not a valid Vishva world file: " + msg };
        }

        // Validate: extract tar
        let files: Map<string, Uint8Array>;
        try {
            files = await extractTarArchive(decompressedData);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, error: "Not a valid Vishva world file: " + msg };
        }

        // Validate: check for required entries
        if (!files.has("Vishva.json")) {
            return { success: false, error: "Not a valid Vishva world file: missing Vishva.json" };
        }
        if (!files.has("Scene.babylon")) {
            return { success: false, error: "Not a valid Vishva world file: missing Scene.babylon" };
        }

        // Store in IndexedDB
        try {
            await storeInIndexedDB("__uploaded", arrayBuffer);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, error: "Failed to store world: " + msg };
        }

        return { success: true };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, error: "Failed to process file: " + msg };
    }
}

/**
 * Compress data using the Compression Streams API (gzip).
 */
export async function compressGzip(data: Uint8Array): Promise<Blob> {
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });

    const compressedStream = stream.pipeThrough(
        new CompressionStream("gzip") as any
    );

    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];

    let result = await reader.read();
    while (!result.done) {
        chunks.push(result.value as Uint8Array);
        result = await reader.read();
    }

    const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const compressedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        compressedData.set(chunk, offset);
        offset += chunk.length;
    }

    return new Blob([compressedData], { type: "application/gzip" });
}

/**
 * Trigger a browser file download for a Blob.
 */
export function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Decompress gzip data using the Compression Streams API.
 * Mirrors LoadManager._decompressGzip.
 */
async function decompressGzip(compressedBlob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await compressedBlob.arrayBuffer();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array(arrayBuffer));
            controller.close();
        }
    });

    const decompressedStream = stream.pipeThrough(
        new DecompressionStream("gzip") as any
    );

    const reader = decompressedStream.getReader();
    const chunks: Uint8Array[] = [];

    let result = await reader.read();
    while (!result.done) {
        chunks.push(result.value as Uint8Array);
        result = await reader.read();
    }

    const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const decompressedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        decompressedData.set(chunk, offset);
        offset += chunk.length;
    }

    return decompressedData;
}

/**
 * Store raw ArrayBuffer in IndexedDB under the given key.
 * Mirrors LoadManager._storeInIndexedDB.
 * Uses "VishvaWorlds" database, "worlds" object store with keyPath "name".
 */
function storeInIndexedDB(key: string, data: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
        const dbName = "VishvaWorlds";
        const storeName = "worlds";

        const request = indexedDB.open(dbName, 1);

        request.onerror = () => {
            reject(new Error("Failed to open IndexedDB"));
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "name" });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            try {
                const transaction = db.transaction([storeName], "readwrite");
                const store = transaction.objectStore(storeName);
                const putRequest = store.put({ name: key, data: data, timestamp: Date.now() });

                putRequest.onsuccess = () => {
                    db.close();
                    resolve();
                };

                putRequest.onerror = () => {
                    db.close();
                    reject(new Error("Failed to store data in IndexedDB"));
                };
            } catch (e) {
                db.close();
                reject(e);
            }
        };
    });
}


/**
 * Delete a saved world from the AssetStore.
 * Opens a new AssetStore connection, deletes, and closes.
 */
export async function deleteWorldFromStore(worldName: string): Promise<void> {
    const store = new AssetStore();
    try {
        await store.open();
        await store.deleteSavedWorld(worldName);
    } finally {
        store.close();
    }
}

/**
 * Export a saved world as a tar.gz file download.
 *
 * Steps:
 * 1. Open AssetStore, list all keys for the world
 * 2. Retrieve each asset's data
 * 3. Build tar archive with TarUtils.createTarArchive
 * 4. Compress with gzip via CompressionStream
 * 5. Trigger browser download as {worldName}.tar.gz
 *
 * @throws Error with descriptive message on failure at any step
 */
export async function exportWorldAsTarGz(worldName: string): Promise<void> {
    const store = new AssetStore();
    try {
        await store.open();

        // Step 1: List all asset keys for this world
        const keys = await store.listSavedKeys(worldName);
        if (keys.length === 0) {
            throw new Error("No assets found for this world");
        }

        // Check if this is a JSON-only world
        if (keys.length === 1 && keys[0] === "__world.json") {
            // Export as plain JSON file
            const data = await store.getSavedAsset(worldName, "__world.json");
            if (!data) {
                throw new Error("World data is missing");
            }
            const blob = new Blob([data as any], { type: "application/json" });
            triggerDownload(blob, `${worldName}.json`);
            return;
        }

        // Step 2: Retrieve all asset data
        const files: Array<{ filename: string; data: Uint8Array }> = [];
        for (const key of keys) {
            const data = await store.getSavedAsset(worldName, key);
            if (data !== null) {
                files.push({ filename: key, data });
            }
        }

        // Step 3: Create tar archive
        let tarData: Uint8Array;
        try {
            tarData = await createTarArchive(files);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error("Archive creation failed: " + msg);
        }

        // Step 4: Compress with gzip
        let gzipBlob: Blob;
        try {
            gzipBlob = await compressGzip(tarData);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error("Compression failed: " + msg);
        }

        // Step 5: Trigger download
        triggerDownload(gzipBlob, `${worldName}.tar.gz`);
    } finally {
        store.close();
    }
}
