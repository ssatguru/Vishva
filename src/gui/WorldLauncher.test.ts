// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";

/**
 * Unit tests for WorldLauncher UI (DOM structure and panel behaviors)
 * and storeUploadedWorld logic.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 3.4, 3.5, 4.4, 4.5, 5.2, 5.3, 5.4, 7.1, 7.2
 */

// ─── Mock VTheme ────────────────────────────────────────────────────────────

vi.mock("./components/VTheme", () => ({
    VThemes: {
        CurrentTheme: {
            lightColors: { f: "#000", b: "#f0f0f0" },
            colors: { f: "#fff", b: "#444444" },
            darkColors: { f: "#fff", b: "#303030" },
        },
    },
}));

// ─── Mock FileValidator ─────────────────────────────────────────────────────

vi.mock("../managers/FileValidator", () => ({
    isTarGzFile: (name: string) => /\.tar\.gz$/i.test(name),
}));

// ─── Mock TarUtils ──────────────────────────────────────────────────────────

vi.mock("../managers/TarUtils", () => ({
    extractTarArchive: vi.fn(),
}));

import { WorldLauncher } from "./WorldLauncher";
import { storeUploadedWorld } from "./WorldLauncherLogic";
import { extractTarArchive } from "../managers/TarUtils";

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
 * Wait for async operations to settle (microtasks + macrotasks).
 */
function flushAsync(ms = 50): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

/**
 * Find an element containing specific text content within the overlay.
 */
function findElementWithText(root: Element, text: string): Element | null {
    const all = root.querySelectorAll("*");
    for (const el of Array.from(all)) {
        if (el.textContent && el.textContent.includes(text) && el.children.length === 0) {
            return el;
        }
    }
    return null;
}

// ─── Tests: WorldLauncher DOM Structure ─────────────────────────────────────

describe("WorldLauncher - DOM structure", () => {
    let launcher: WorldLauncher;

    beforeEach(() => {
        document.body.innerHTML = "";
        launcher = new WorldLauncher();
    });

    afterEach(() => {
        launcher.dispose();
        document.body.innerHTML = "";
    });

    it("creates overlay with correct structure (title, three panel buttons, empty world button)", () => {
        const overlay = document.getElementById("worldLauncherOverlay");
        expect(overlay).not.toBeNull();
        expect(overlay!.style.position).toBe("fixed");

        // Title
        const title = overlay!.querySelector("h2");
        expect(title).not.toBeNull();
        expect(title!.textContent).toContain("Vishva");
        expect(title!.textContent).toContain("World Launcher");

        // Three panel buttons
        const buttons = overlay!.querySelectorAll("button");
        const buttonTexts = Array.from(buttons).map(b => b.textContent);
        expect(buttonTexts).toContain("Load from Server");
        expect(buttonTexts).toContain("Load from Browser Storage");
        expect(buttonTexts).toContain("Upload a File");

        // Empty World button
        expect(buttonTexts).toContain("Empty World");
    });

    it("overlay covers the full page", () => {
        const overlay = document.getElementById("worldLauncherOverlay");
        expect(overlay!.style.width).toBe("100%");
        expect(overlay!.style.height).toBe("100%");
        expect(overlay!.style.top).toBe("0px");
        expect(overlay!.style.left).toBe("0px");
        expect(overlay!.style.zIndex).toBe("10000");
    });

    it("dispose removes the overlay from DOM", () => {
        expect(document.getElementById("worldLauncherOverlay")).not.toBeNull();
        launcher.dispose();
        expect(document.getElementById("worldLauncherOverlay")).toBeNull();
    });
});

// ─── Tests: Server Panel Behavior ───────────────────────────────────────────

describe("WorldLauncher - Server panel", () => {
    let launcher: WorldLauncher;

    beforeEach(() => {
        document.body.innerHTML = "";
        launcher = new WorldLauncher();
    });

    afterEach(() => {
        launcher.dispose();
        document.body.innerHTML = "";
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("shows loading indicator during fetch", async () => {
        // Create a fetch that never resolves (to check loading state)
        let resolveFetch!: (value: any) => void;
        const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });
        vi.stubGlobal("fetch", vi.fn(() => fetchPromise));

        // Click "Load from Server" button
        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const serverBtn = Array.from(buttons).find(b => b.textContent === "Load from Server")!;
        serverBtn.click();

        // Check loading indicator is shown
        const loadingEl = findElementWithText(overlay, "Loading...");
        expect(loadingEl).not.toBeNull();
        expect(loadingEl!.textContent).toBe("Loading...");

        // Cleanup: resolve the fetch to avoid hanging
        resolveFetch(new Response(JSON.stringify([]), { status: 200 }));
    });

    it("shows error on fetch failure", async () => {
        vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Network error"))));

        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const serverBtn = Array.from(buttons).find(b => b.textContent === "Load from Server")!;
        serverBtn.click();

        // Wait for the fetch to reject and DOM to update
        await flushAsync();

        const errorEl = findElementWithText(overlay, "Failed to load server world list");
        expect(errorEl).not.toBeNull();
        expect(errorEl!.textContent).toContain("Network error");
    });

    it("shows error when server returns non-200 status", async () => {
        vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("", { status: 404 }))));

        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const serverBtn = Array.from(buttons).find(b => b.textContent === "Load from Server")!;
        serverBtn.click();

        await flushAsync();

        const errorEl = findElementWithText(overlay, "Failed to load server world list");
        expect(errorEl).not.toBeNull();
    });

    it("displays world list on successful fetch", async () => {
        const worldList = ["fantasy-town.tar.gz", "new-world.tar.gz"];
        vi.stubGlobal("fetch", vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify(worldList), { status: 200 }))
        ));

        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const serverBtn = Array.from(buttons).find(b => b.textContent === "Load from Server")!;
        serverBtn.click();

        await flushAsync();

        // Should display world names (without .tar.gz extension)
        const fantasyEl = findElementWithText(overlay, "fantasy-town");
        const newWorldEl = findElementWithText(overlay, "new-world");
        expect(fantasyEl).not.toBeNull();
        expect(newWorldEl).not.toBeNull();
    });
});

// ─── Tests: Browser Storage Panel Behavior ──────────────────────────────────

describe("WorldLauncher - Browser Storage panel", () => {
    let launcher: WorldLauncher | null = null;

    beforeEach(async () => {
        document.body.innerHTML = "";
        await clearIndexedDB();
    });

    afterEach(async () => {
        if (launcher) {
            launcher.dispose();
            launcher = null;
        }
        document.body.innerHTML = "";
        await clearIndexedDB();
        vi.restoreAllMocks();
    });

    it("shows 'No saved worlds found' when IndexedDB is empty", async () => {
        launcher = new WorldLauncher();
        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const storageBtn = Array.from(buttons).find(b => b.textContent === "Load from Browser Storage")!;
        storageBtn.click();

        // Wait for IndexedDB query to complete
        await flushAsync(100);

        const msgEl = findElementWithText(overlay, "No saved worlds found");
        expect(msgEl).not.toBeNull();
    });

    it("shows error when IndexedDB is unavailable", async () => {
        // Override indexedDB.open to throw
        vi.spyOn(indexedDB, "open").mockImplementation(() => {
            throw new Error("IndexedDB not available");
        });

        launcher = new WorldLauncher();
        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const storageBtn = Array.from(buttons).find(b => b.textContent === "Load from Browser Storage")!;
        storageBtn.click();

        // Wait for error handling
        await flushAsync(100);

        const errorEl = findElementWithText(overlay, "Browser storage is unavailable");
        expect(errorEl).not.toBeNull();
    });

    it("displays saved worlds from IndexedDB", async () => {
        // Pre-populate IndexedDB with some worlds
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open("VishvaWorlds", 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains("worlds")) {
                    db.createObjectStore("worlds", { keyPath: "name" });
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction(["worlds"], "readwrite");
                const store = tx.objectStore("worlds");
                store.put({ name: "myworld", data: new ArrayBuffer(10), timestamp: Date.now() });
                store.put({ name: "testworld", data: new ArrayBuffer(10), timestamp: Date.now() });
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); reject(new Error("Failed to populate")); };
            };
            request.onerror = () => reject(new Error("Failed to open DB"));
        });

        launcher = new WorldLauncher();
        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const storageBtn = Array.from(buttons).find(b => b.textContent === "Load from Browser Storage")!;
        storageBtn.click();

        // Wait for IndexedDB query
        await flushAsync(100);

        const myWorldEl = findElementWithText(overlay, "myworld");
        const testWorldEl = findElementWithText(overlay, "testworld");
        expect(myWorldEl).not.toBeNull();
        expect(testWorldEl).not.toBeNull();
    });
});

// ─── Tests: Upload Panel Behavior ───────────────────────────────────────────

describe("WorldLauncher - Upload panel", () => {
    let launcher: WorldLauncher;
    let locationSearch: string;

    beforeEach(() => {
        document.body.innerHTML = "";
        locationSearch = "";
        // Mock window.location.search setter
        Object.defineProperty(window, "location", {
            value: {
                get search() { return locationSearch; },
                set search(val: string) { locationSearch = val; },
                pathname: "/",
                href: "http://localhost/",
            },
            writable: true,
            configurable: true,
        });
        launcher = new WorldLauncher();
    });

    afterEach(() => {
        launcher.dispose();
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    it("shows error for invalid file without reloading", async () => {
        // Mock extractTarArchive to simulate invalid file
        (extractTarArchive as any).mockRejectedValue(new Error("Invalid tar format"));

        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const uploadBtn = Array.from(buttons).find(b => b.textContent === "Upload a File")!;
        uploadBtn.click();

        // Find the file input
        const fileInput = overlay.querySelector("input[type='file']") as HTMLInputElement;
        expect(fileInput).not.toBeNull();

        // Create a fake file that will pass gzip but fail tar extraction
        // Use non-gzip data so decompression fails first
        const invalidData = new Uint8Array([1, 2, 3, 4, 5]);
        const file = new File([invalidData], "bad.tar.gz", { type: "application/gzip" });

        // Simulate file selection
        Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
        fileInput.dispatchEvent(new Event("change"));

        // Wait for async processing
        await flushAsync(200);

        // Should show error message (look for error text)
        const errorEl = findElementWithText(overlay, "Not a valid Vishva world file");
        expect(errorEl).not.toBeNull();

        // Should NOT have triggered page reload
        expect(locationSearch).toBe("");
    });
});

// ─── Tests: Empty World Button ──────────────────────────────────────────────

describe("WorldLauncher - Empty World button", () => {
    let launcher: WorldLauncher;
    let locationSearch: string;

    beforeEach(() => {
        document.body.innerHTML = "";
        locationSearch = "";
        Object.defineProperty(window, "location", {
            value: {
                get search() { return locationSearch; },
                set search(val: string) { locationSearch = val; },
                pathname: "/",
                href: "http://localhost/",
            },
            writable: true,
            configurable: true,
        });
        launcher = new WorldLauncher();
    });

    afterEach(() => {
        launcher.dispose();
        document.body.innerHTML = "";
    });

    it("triggers reload with ?world=empty", () => {
        const overlay = document.getElementById("worldLauncherOverlay")!;
        const buttons = overlay.querySelectorAll("button");
        const emptyBtn = Array.from(buttons).find(b => b.textContent === "Empty World")!;
        expect(emptyBtn).not.toBeNull();

        emptyBtn.click();

        expect(locationSearch).toBe("?world=empty");
    });
});

// ─── Tests: storeUploadedWorld ──────────────────────────────────────────────

describe("storeUploadedWorld", () => {
    beforeEach(async () => {
        await clearIndexedDB();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await clearIndexedDB();
        vi.restoreAllMocks();
    });

    it("valid .tar.gz file is stored in IndexedDB and returns success", async () => {
        // Mock extractTarArchive to return valid entries
        const validMap = new Map<string, Uint8Array>();
        validMap.set("Vishva.json", new TextEncoder().encode("{}"));
        validMap.set("Scene.babylon", new TextEncoder().encode("{}"));
        (extractTarArchive as any).mockResolvedValue(validMap);

        // Create a valid gzip file (the content doesn't matter since extractTarArchive is mocked)
        const dummyData = new Uint8Array([1, 2, 3]);
        const gzipped = await gzipCompress(dummyData);
        const file = new File([gzipped], "world.tar.gz", { type: "application/gzip" });

        const result = await storeUploadedWorld(file);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify it was stored in IndexedDB
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).not.toBeNull();
        expect(stored.name).toBe("__uploaded");
        expect(stored.data).toBeDefined();
        expect(stored.timestamp).toBeTypeOf("number");
    });

    it("invalid file (bad gzip) returns { success: false, error: '...' } without storing", async () => {
        // Non-gzip data will fail decompression
        const invalidData = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
        const file = new File([invalidData], "corrupt.tar.gz", { type: "application/gzip" });

        const result = await storeUploadedWorld(file);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("Not a valid Vishva world file");

        // Verify nothing was stored
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
    });

    it("invalid file (bad tar) returns { success: false, error: '...' } without storing", async () => {
        // Mock extractTarArchive to throw (invalid tar)
        (extractTarArchive as any).mockRejectedValue(new Error("Invalid tar format"));

        // Create a valid gzip file with invalid tar content
        const dummyData = new TextEncoder().encode("not a tar file");
        const gzipped = await gzipCompress(dummyData);
        const file = new File([gzipped], "bad.tar.gz", { type: "application/gzip" });

        const result = await storeUploadedWorld(file);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("Not a valid Vishva world file");

        // Verify nothing was stored in IndexedDB
        const stored = await readFromIndexedDB("__uploaded");
        expect(stored).toBeNull();
    });

    it("returns error when archive is missing Vishva.json", async () => {
        const incompleteMap = new Map<string, Uint8Array>();
        incompleteMap.set("Scene.babylon", new TextEncoder().encode("{}"));
        (extractTarArchive as any).mockResolvedValue(incompleteMap);

        const dummyData = new Uint8Array([1, 2, 3]);
        const gzipped = await gzipCompress(dummyData);
        const file = new File([gzipped], "world.tar.gz", { type: "application/gzip" });

        const result = await storeUploadedWorld(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("missing Vishva.json");
    });

    it("returns error when archive is missing Scene.babylon", async () => {
        const incompleteMap = new Map<string, Uint8Array>();
        incompleteMap.set("Vishva.json", new TextEncoder().encode("{}"));
        (extractTarArchive as any).mockResolvedValue(incompleteMap);

        const dummyData = new Uint8Array([1, 2, 3]);
        const gzipped = await gzipCompress(dummyData);
        const file = new File([gzipped], "world.tar.gz", { type: "application/gzip" });

        const result = await storeUploadedWorld(file);

        expect(result.success).toBe(false);
        expect(result.error).toContain("missing Scene.babylon");
    });

    it("IndexedDB write failure returns appropriate error", async () => {
        // Mock extractTarArchive to return valid entries
        const validMap = new Map<string, Uint8Array>();
        validMap.set("Vishva.json", new TextEncoder().encode("{}"));
        validMap.set("Scene.babylon", new TextEncoder().encode("{}"));
        (extractTarArchive as any).mockResolvedValue(validMap);

        // Mock indexedDB.open to simulate failure on the store operation
        // The storeInIndexedDB function opens the DB, so we intercept it
        const originalOpen = indexedDB.open.bind(indexedDB);
        vi.spyOn(indexedDB, "open").mockImplementation((name: string, version?: number) => {
            if (name === "VishvaWorlds") {
                // Return a request that fires onerror
                const fakeRequest = {
                    result: null,
                    error: new DOMException("QuotaExceededError"),
                    readyState: "done",
                    onsuccess: null as any,
                    onerror: null as any,
                    onupgradeneeded: null as any,
                    onblocked: null as any,
                    transaction: null,
                    source: null,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                } as any;
                // Fire onerror asynchronously
                setTimeout(() => {
                    if (fakeRequest.onerror) {
                        fakeRequest.onerror(new Event("error"));
                    }
                }, 0);
                return fakeRequest;
            }
            return originalOpen(name, version);
        });

        const dummyData = new Uint8Array([1, 2, 3]);
        const gzipped = await gzipCompress(dummyData);
        const file = new File([gzipped], "world.tar.gz", { type: "application/gzip" });

        const result = await storeUploadedWorld(file);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("Failed to store world");
    });
});
