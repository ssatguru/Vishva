import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";

/**
 * Unit tests for validateWorldFile and loadWorldFromFile (page-reload flow).
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

// ─── Mock BabylonJS and other heavy dependencies before importing LoadManager ───

vi.mock("babylonjs", () => {
    return {
        SceneLoader: {
            ShowLoadingScreen: false,
            Append: vi.fn(),
            ImportMesh: vi.fn(),
            LoadAssetContainer: vi.fn(),
        },
        Vector3: class Vector3 {
            constructor(public x = 0, public y = 0, public z = 0) {}
        },
        Color3: class Color3 {
            constructor(public r = 0, public g = 0, public b = 0) {}
        },
        Tags: { HasTags: vi.fn(() => false), GetTags: vi.fn(() => "") },
        Mesh: class Mesh {},
        AbstractMesh: class AbstractMesh {},
        Material: class Material {},
        StandardMaterial: class StandardMaterial {},
        MultiMaterial: class MultiMaterial {},
        Skeleton: class Skeleton {},
        AnimationGroup: class AnimationGroup {},
        AnimationRange: class AnimationRange {},
        TransformNode: class TransformNode {},
        Matrix: { Identity: () => ({}) },
        Quaternion: { Identity: () => ({}) },
        BoundingInfo: class BoundingInfo {},
        VertexBuffer: {},
        InstancedMesh: class InstancedMesh {},
        Tools: { ToRadians: (d: number) => d * Math.PI / 180 },
        AssetsManager: class AssetsManager {
            tasks: any[] = [];
            addTextFileTask(name: string, url: string) {
                const task = { name, url, onSuccess: null as any, onError: null as any };
                this.tasks.push(task);
                return task;
            }
            load() {}
        },
        AssetContainer: class AssetContainer {},
        Scene: class Scene {},
        IParticleSystem: class IParticleSystem {},
        TextFileAssetTask: class TextFileAssetTask {},
    };
});

vi.mock("../VishvaSerialized", () => ({
    VishvaSerialized: class VishvaSerialized {
        bVer = "";
        vVer = "";
        snas = [];
        settings = { cameraCollision: false, autoEditMenu: false };
        misc = {};
        avSerialized = { settings: { ellipsoid: null, ellipsoidOffset: null } };
        objectIds = null;
        meshMetadata = {};
    },
    ObjectIdMap: class ObjectIdMap {},
    MeshMetadataMap: class MeshMetadataMap {},
}));

vi.mock("../sna/SNA", () => ({
    SNAManager: { getSNAManager: () => ({ removeSNAs: vi.fn() }) },
}));

vi.mock("../eventing/VEvent", () => ({ VEvent: {} }));
vi.mock("../eventing/EventManager", () => ({ EventManager: { publish: vi.fn() } }));
vi.mock("./AssetResolver", () => ({
    AssetResolver: class AssetResolver {
        activate() {}
        deactivate() {}
    },
}));
vi.mock("./FileValidator", () => ({
    isTarGzFile: (name: string) => /\.tar\.gz$/i.test(name),
}));

// Keep TarUtils real so validateWorldFile works end-to-end

import { LoadManager } from "./LoadManager.js";
import { createTarArchive } from "./TarUtils.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compress data with gzip using CompressionStream.
 */
async function gzipCompress(data: Uint8Array): Promise<ArrayBuffer> {
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        },
    });
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    while (!result.done) {
        chunks.push(result.value as Uint8Array);
        result = await reader.read();
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
    }
    return compressed.buffer;
}

/**
 * Create a valid .tar.gz ArrayBuffer containing Vishva.json and Scene.babylon.
 */
async function createValidWorldArchive(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const vishvaData = encoder.encode(JSON.stringify({ vVer: "0.4.0", bVer: "8.0" }));
    const sceneData = encoder.encode(JSON.stringify({ meshes: [], materials: [] }));

    const tarData = await createTarArchive([
        { filename: "Vishva.json", data: vishvaData },
        { filename: "Scene.babylon", data: sceneData },
    ]);

    return gzipCompress(tarData);
}

/**
 * Create an invalid .tar.gz archive that is missing Scene.babylon.
 */
async function createInvalidWorldArchive_MissingScene(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const vishvaData = encoder.encode(JSON.stringify({ vVer: "0.4.0", bVer: "8.0" }));

    const tarData = await createTarArchive([
        { filename: "Vishva.json", data: vishvaData },
    ]);

    return gzipCompress(tarData);
}

/**
 * Create an invalid .tar.gz archive that is missing Vishva.json.
 */
async function createInvalidWorldArchive_MissingVishva(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const sceneData = encoder.encode(JSON.stringify({ meshes: [] }));

    const tarData = await createTarArchive([
        { filename: "Scene.babylon", data: sceneData },
    ]);

    return gzipCompress(tarData);
}

/**
 * Create a mock vishva object with a mock progressManager.
 */
function createMockVishva() {
    return {
        progressManager: {
            show: vi.fn(),
            hide: vi.fn(),
            update: vi.fn().mockResolvedValue(undefined),
        },
    };
}

/**
 * Helper to clear the VishvaWorlds IndexedDB database between tests.
 */
async function clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase("VishvaWorlds");
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error("Failed to delete VishvaWorlds DB"));
    });
}

/**
 * Read a value from IndexedDB to verify it was stored.
 */
async function readFromIndexedDB(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("VishvaWorlds", 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains("worlds")) {
                db.createObjectStore("worlds", { keyPath: "name" });
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("worlds")) {
                db.close();
                resolve(null);
                return;
            }
            const tx = db.transaction(["worlds"], "readonly");
            const store = tx.objectStore("worlds");
            const getReq = store.get(key);
            getReq.onsuccess = () => {
                db.close();
                resolve(getReq.result || null);
            };
            getReq.onerror = () => {
                db.close();
                reject(new Error("Failed to read from IndexedDB"));
            };
        };
        request.onerror = () => reject(new Error("Failed to open IndexedDB"));
    });
}

// ─── Tests: validateWorldFile ───────────────────────────────────────────────

describe("LoadManager - validateWorldFile", () => {
    let loadManager: LoadManager;
    let mockVishva: ReturnType<typeof createMockVishva>;

    beforeEach(async () => {
        mockVishva = createMockVishva();
        loadManager = new LoadManager(mockVishva);
        await clearIndexedDB();
    });

    afterEach(async () => {
        await clearIndexedDB();
    });

    it("returns valid: true for a valid .tar.gz archive with both required entries", async () => {
        const archiveBuffer = await createValidWorldArchive();
        const result = await loadManager.validateWorldFile(archiveBuffer);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it("returns valid: false when Scene.babylon is missing", async () => {
        const archiveBuffer = await createInvalidWorldArchive_MissingScene();
        const result = await loadManager.validateWorldFile(archiveBuffer);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Scene.babylon");
    });

    it("returns valid: false when Vishva.json is missing", async () => {
        const archiveBuffer = await createInvalidWorldArchive_MissingVishva();
        const result = await loadManager.validateWorldFile(archiveBuffer);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Vishva.json");
    });

    it("returns valid: false for non-gzip data (decompression error)", async () => {
        const randomData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const result = await loadManager.validateWorldFile(randomData.buffer);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Not a valid Vishva world file");
    });

    it("returns valid: false for empty data", async () => {
        const emptyData = new ArrayBuffer(0);
        const result = await loadManager.validateWorldFile(emptyData);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Not a valid Vishva world file");
    });
});

// ─── Tests: loadWorldFromFile ───────────────────────────────────────────────

describe("LoadManager - loadWorldFromFile", () => {
    let loadManager: LoadManager;
    let mockVishva: ReturnType<typeof createMockVishva>;
    let alertMock: ReturnType<typeof vi.fn>;
    let originalLocation: PropertyDescriptor | undefined;

    beforeEach(async () => {
        mockVishva = createMockVishva();
        loadManager = new LoadManager(mockVishva);
        await clearIndexedDB();

        // Mock alert
        alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);

        // Mock window.location - the code uses `window.location.search = ...`
        const locationObj = { search: "", pathname: "/", href: "http://localhost:8080/" };
        vi.stubGlobal("window", { location: locationObj });
        originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
        Object.defineProperty(globalThis, "location", {
            value: locationObj,
            writable: true,
            configurable: true,
        });
    });

    afterEach(async () => {
        await clearIndexedDB();
        vi.unstubAllGlobals();
        if (originalLocation) {
            Object.defineProperty(globalThis, "location", originalLocation);
        }
    });

    it("shows error and does not store or reload when archive is invalid (missing entries)", async () => {
        const invalidBuffer = await createInvalidWorldArchive_MissingScene();
        const file = new File([invalidBuffer], "world.tar.gz", { type: "application/gzip" });

        await loadManager.loadWorldFromFile(file);

        // Should show error alert about missing Scene.babylon
        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain("Scene.babylon");

        // Should NOT have stored anything in IndexedDB
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();

        // Should NOT have triggered page reload
        expect((globalThis as any).window.location.search).toBe("");

        // Progress should have been shown and hidden
        expect(mockVishva.progressManager.show).toHaveBeenCalled();
        expect(mockVishva.progressManager.hide).toHaveBeenCalled();
    });

    it("shows error and does not store or reload for non-gzip data", async () => {
        const randomData = new Uint8Array([1, 2, 3, 4, 5]);
        const file = new File([randomData], "bad.tar.gz", { type: "application/gzip" });

        await loadManager.loadWorldFromFile(file);

        // Should show error alert
        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain("Not a valid Vishva world file");

        // Should NOT have stored anything in IndexedDB
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();

        // Should NOT have triggered page reload
        expect((globalThis as any).window.location.search).toBe("");
    });

    it("stores in IndexedDB and triggers page reload for valid archive", async () => {
        const validBuffer = await createValidWorldArchive();
        const file = new File([validBuffer], "world.tar.gz", { type: "application/gzip" });

        await loadManager.loadWorldFromFile(file);

        // Should NOT show error alert
        expect(alertMock).not.toHaveBeenCalled();

        // Should have stored data in IndexedDB
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).not.toBeNull();
        expect(stored.name).toBe("__uploaded");
        expect(stored.data).toBeInstanceOf(ArrayBuffer);
        expect(stored.timestamp).toBeTypeOf("number");

        // Should have triggered page reload
        expect((globalThis as any).window.location.search).toBe("?world=__uploaded");

        // Progress should have been shown
        expect(mockVishva.progressManager.show).toHaveBeenCalledWith("Preparing world for reload...");
    });

    it("shows error and does not reload when IndexedDB write fails", async () => {
        const validBuffer = await createValidWorldArchive();
        const file = new File([validBuffer], "world.tar.gz", { type: "application/gzip" });

        // Override _storeInIndexedDB to simulate failure
        (loadManager as any)._storeInIndexedDB = vi.fn().mockRejectedValue(
            new Error("QuotaExceededError: storage full")
        );

        await loadManager.loadWorldFromFile(file);

        // Should show error alert about storage failure
        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain("Failed to save world for reload");
        expect(alertMock.mock.calls[0][0]).toContain("QuotaExceededError");

        // Should NOT have triggered page reload
        expect((globalThis as any).window.location.search).toBe("");

        // Progress should have been hidden
        expect(mockVishva.progressManager.hide).toHaveBeenCalled();
    });

    it("shows progress indicator during the pre-reload flow", async () => {
        const validBuffer = await createValidWorldArchive();
        const file = new File([validBuffer], "world.tar.gz", { type: "application/gzip" });

        await loadManager.loadWorldFromFile(file);

        // Progress should have been shown with the correct message
        expect(mockVishva.progressManager.show).toHaveBeenCalledWith("Preparing world for reload...");
    });
});


// ─── Tests: loadUploadedWorld ───────────────────────────────────────────────

/**
 * Unit tests for loadUploadedWorld (post-reload loading flow).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3
 */
describe("LoadManager - loadUploadedWorld", () => {
    let loadManager: LoadManager;
    let mockVishva: ReturnType<typeof createMockVishva> & {
        loadBabylonjsPart: ReturnType<typeof vi.fn>;
        scene: object;
    };
    let alertMock: ReturnType<typeof vi.fn>;
    let replaceStateSpy: ReturnType<typeof vi.fn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        const base = createMockVishva();
        mockVishva = {
            ...base,
            loadBabylonjsPart: vi.fn(),
            scene: {},
        };
        loadManager = new LoadManager(mockVishva);
        await clearIndexedDB();

        // Mock alert
        alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);

        // Mock history.replaceState to verify URL cleanup
        replaceStateSpy = vi.fn();
        vi.stubGlobal("history", { replaceState: replaceStateSpy });

        // Mock window.location.pathname for URL cleanup
        vi.stubGlobal("window", { location: { pathname: "/app" } });

        // Spy on console.warn and console.error
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(async () => {
        await clearIndexedDB();
        vi.unstubAllGlobals();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it("successful load: retrieves, decompresses, loads world, and cleans up", async () => {
        // Store valid world data in IndexedDB
        const validBuffer = await createValidWorldArchive();
        await (loadManager as any)._storeInIndexedDB("__uploaded", validBuffer);

        // Mock loadVishvaPartFromObjects to verify it's called
        const loadVishvaPartSpy = vi.fn();
        (loadManager as any).loadVishvaPartFromObjects = loadVishvaPartSpy;

        await loadManager.loadUploadedWorld();

        // Should have called loadVishvaPartFromObjects with parsed data
        expect(loadVishvaPartSpy).toHaveBeenCalledTimes(1);
        const [vishvaObj, sceneObj] = loadVishvaPartSpy.mock.calls[0];
        expect(vishvaObj).toHaveProperty("vVer", "0.4.0");
        expect(vishvaObj).toHaveProperty("bVer", "8.0");
        expect(sceneObj).toHaveProperty("meshes");
        expect(sceneObj).toHaveProperty("materials");

        // Should NOT have fallen back to empty world
        expect(mockVishva.loadBabylonjsPart).not.toHaveBeenCalled();

        // Should NOT have shown any error
        expect(alertMock).not.toHaveBeenCalled();

        // IndexedDB entry should be deleted
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();

        // URL should be cleaned
        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");

        // Progress should have been shown
        expect(mockVishva.progressManager.show).toHaveBeenCalledWith("Loading World");
    });

    it("missing data: falls back to empty world, shows warning, cleans URL", async () => {
        // Do NOT store anything in IndexedDB — simulate missing data

        await loadManager.loadUploadedWorld();

        // Should fall back to empty world
        expect(mockVishva.loadBabylonjsPart).toHaveBeenCalledWith(mockVishva.scene, true);

        // Should show console warning about missing data
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining("No uploaded world found")
        );

        // Should NOT show error alert (warning only)
        expect(alertMock).not.toHaveBeenCalled();

        // URL should still be cleaned
        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");

        // IndexedDB should still be clean (delete is a no-op for missing key)
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
    });

    it("corrupted data: falls back to empty world, shows error, cleans up", async () => {
        // Store non-gzip data in IndexedDB to simulate corruption
        const corruptedData = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x02, 0x03, 0x04]);
        await (loadManager as any)._storeInIndexedDB("__uploaded", corruptedData.buffer);

        await loadManager.loadUploadedWorld();

        // Should fall back to empty world
        expect(mockVishva.loadBabylonjsPart).toHaveBeenCalledWith(mockVishva.scene, true);

        // Should show error alert about corrupted data
        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain("corrupted");

        // IndexedDB entry should be deleted (cleanup always happens)
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();

        // URL should be cleaned
        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");
    });

    it("IndexedDB entry is always deleted on success", async () => {
        // Store valid world data
        const validBuffer = await createValidWorldArchive();
        await (loadManager as any)._storeInIndexedDB("__uploaded", validBuffer);

        // Mock loadVishvaPartFromObjects
        (loadManager as any).loadVishvaPartFromObjects = vi.fn();

        await loadManager.loadUploadedWorld();

        // Verify IndexedDB is empty after successful load
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
    });

    it("IndexedDB entry is always deleted on failure (corrupted data)", async () => {
        // Store corrupted data
        const corruptedData = new Uint8Array([0xFF, 0xFE, 0xFD]);
        await (loadManager as any)._storeInIndexedDB("__uploaded", corruptedData.buffer);

        await loadManager.loadUploadedWorld();

        // Verify IndexedDB is empty after failed load
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
    });

    it("IndexedDB entry is always deleted when data is missing", async () => {
        // No data stored — missing case
        await loadManager.loadUploadedWorld();

        // Verify IndexedDB is empty (delete should not throw for missing key)
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
    });

    it("URL parameter is always cleaned on success", async () => {
        const validBuffer = await createValidWorldArchive();
        await (loadManager as any)._storeInIndexedDB("__uploaded", validBuffer);
        (loadManager as any).loadVishvaPartFromObjects = vi.fn();

        await loadManager.loadUploadedWorld();

        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");
    });

    it("URL parameter is always cleaned on failure", async () => {
        // Store corrupted data to trigger failure
        const corruptedData = new Uint8Array([0x00, 0x01, 0x02]);
        await (loadManager as any)._storeInIndexedDB("__uploaded", corruptedData.buffer);

        await loadManager.loadUploadedWorld();

        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");
    });

    it("URL parameter is always cleaned when data is missing", async () => {
        await loadManager.loadUploadedWorld();

        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");
    });

    it("shows progress indicator during post-reload loading", async () => {
        const validBuffer = await createValidWorldArchive();
        await (loadManager as any)._storeInIndexedDB("__uploaded", validBuffer);
        (loadManager as any).loadVishvaPartFromObjects = vi.fn();

        await loadManager.loadUploadedWorld();

        expect(mockVishva.progressManager.show).toHaveBeenCalledWith("Loading World");
    });

    it("handles archive with valid gzip but invalid tar content (validation failure)", async () => {
        // Create a gzip-compressed file that is NOT a valid tar archive
        const encoder = new TextEncoder();
        const notTarData = encoder.encode("this is not a tar file");
        const gzippedInvalidTar = await gzipCompress(notTarData);
        await (loadManager as any)._storeInIndexedDB("__uploaded", gzippedInvalidTar);

        await loadManager.loadUploadedWorld();

        // Should fall back to empty world
        expect(mockVishva.loadBabylonjsPart).toHaveBeenCalledWith(mockVishva.scene, true);

        // Should show error (either alert about corruption or validation error)
        expect(alertMock).toHaveBeenCalled();

        // Cleanup should still happen
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
        expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/app");
    });
});
