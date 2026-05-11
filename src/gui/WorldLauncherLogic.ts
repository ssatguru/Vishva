/**
 * Pure logic functions for the World Launcher feature.
 * These functions have no DOM or side-effect dependencies (except storeUploadedWorld
 * which uses IndexedDB and Compression Streams API).
 */

import { isTarGzFile } from "../managers/FileValidator";
import { extractTarArchive } from "../managers/TarUtils";

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
 * Filters to only .tar.gz entries (case-insensitive), strips the extension
 * for the display name, and sorts alphabetically by display name.
 *
 * @param filenames - Array of filenames from the server index
 * @returns Sorted array of { display, filename } objects for .tar.gz worlds
 */
export function processServerWorldList(filenames: string[]): Array<{ display: string; filename: string }> {
    return filenames
        .filter(f => isTarGzFile(f))
        .map(f => ({
            display: f.replace(/\.tar\.gz$/i, ""),
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
