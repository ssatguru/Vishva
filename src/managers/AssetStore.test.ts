import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { AssetStore } from "./AssetStore.js";

/**
 * Unit tests for AssetStore session store operations.
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 3.1, 3.3, 9.1, 9.2
 */

describe("AssetStore - session store operations", () => {
    let store: AssetStore;

    beforeEach(async () => {
        store = new AssetStore();
        await store.open();
    });

    afterEach(() => {
        store.close();
        // Delete the database between tests for isolation
        indexedDB.deleteDatabase("VishvaAssetStore");
    });

    describe("isAvailable()", () => {
        it("returns true when indexedDB is available", () => {
            expect(AssetStore.isAvailable()).toBe(true);
        });
    });

    describe("open()", () => {
        it("opens the database successfully", async () => {
            const newStore = new AssetStore();
            await expect(newStore.open()).resolves.toBeUndefined();
            newStore.close();
        });

        it("creates both session and saved object stores", async () => {
            // Verify by attempting operations on both stores
            await store.put("test-key", new Uint8Array([1, 2, 3]));
            const result = await store.get("test-key");
            expect(result).toEqual(new Uint8Array([1, 2, 3]));
        });
    });

    describe("put() and get()", () => {
        it("stores and retrieves a single asset", async () => {
            const data = new Uint8Array([10, 20, 30, 40, 50]);
            await store.put("vishva/assets/audio/footstep.ogg", data);

            const result = await store.get("vishva/assets/audio/footstep.ogg");
            expect(result).toEqual(data);
        });

        it("returns null for a non-existent key", async () => {
            const result = await store.get("nonexistent/key");
            expect(result).toBeNull();
        });

        it("overwrites existing data with the same key", async () => {
            const data1 = new Uint8Array([1, 2, 3]);
            const data2 = new Uint8Array([4, 5, 6]);

            await store.put("same-key", data1);
            await store.put("same-key", data2);

            const result = await store.get("same-key");
            expect(result).toEqual(data2);
        });

        it("handles empty Uint8Array", async () => {
            const data = new Uint8Array(0);
            await store.put("empty-asset", data);

            const result = await store.get("empty-asset");
            expect(result).toEqual(data);
        });

        it("handles large binary data", async () => {
            const data = new Uint8Array(100_000);
            for (let i = 0; i < data.length; i++) {
                data[i] = i % 256;
            }
            await store.put("large-asset", data);

            const result = await store.get("large-asset");
            expect(result).toEqual(data);
        });
    });

    describe("putBatch()", () => {
        it("stores multiple assets in a single batch", async () => {
            const entries = [
                { key: "vishva/assets/audio/a.ogg", data: new Uint8Array([1]) },
                { key: "vishva/assets/audio/b.ogg", data: new Uint8Array([2]) },
                { key: "vishva/assets/textures/c.jpg", data: new Uint8Array([3]) },
            ];

            await store.putBatch(entries);

            expect(await store.get("vishva/assets/audio/a.ogg")).toEqual(new Uint8Array([1]));
            expect(await store.get("vishva/assets/audio/b.ogg")).toEqual(new Uint8Array([2]));
            expect(await store.get("vishva/assets/textures/c.jpg")).toEqual(new Uint8Array([3]));
        });

        it("handles empty batch", async () => {
            await expect(store.putBatch([])).resolves.toBeUndefined();
        });
    });

    describe("listKeys()", () => {
        it("returns empty array when no assets stored", async () => {
            const keys = await store.listKeys();
            expect(keys).toEqual([]);
        });

        it("returns all stored keys", async () => {
            await store.put("key-a", new Uint8Array([1]));
            await store.put("key-b", new Uint8Array([2]));
            await store.put("key-c", new Uint8Array([3]));

            const keys = await store.listKeys();
            expect(keys.sort()).toEqual(["key-a", "key-b", "key-c"]);
        });

        it("returns keys after putBatch", async () => {
            const entries = [
                { key: "x", data: new Uint8Array([1]) },
                { key: "y", data: new Uint8Array([2]) },
            ];
            await store.putBatch(entries);

            const keys = await store.listKeys();
            expect(keys.sort()).toEqual(["x", "y"]);
        });
    });

    describe("clearSession()", () => {
        it("removes all session assets", async () => {
            await store.put("a", new Uint8Array([1]));
            await store.put("b", new Uint8Array([2]));
            await store.put("c", new Uint8Array([3]));

            await store.clearSession();

            const keys = await store.listKeys();
            expect(keys).toEqual([]);
            expect(await store.get("a")).toBeNull();
            expect(await store.get("b")).toBeNull();
            expect(await store.get("c")).toBeNull();
        });

        it("succeeds when session is already empty", async () => {
            await expect(store.clearSession()).resolves.toBeUndefined();
        });
    });

    describe("close()", () => {
        it("closes the database connection", () => {
            store.close();
            // After close, operations should throw
            expect(() => (store as any)._getDb()).toThrow("database not open");
        });
    });

    describe("error handling", () => {
        it("throws when operations are called before open()", async () => {
            const unopenedStore = new AssetStore();
            await expect(unopenedStore.put("key", new Uint8Array([1]))).rejects.toThrow("database not open");
            await expect(unopenedStore.get("key")).rejects.toThrow("database not open");
            await expect(unopenedStore.listKeys()).rejects.toThrow("database not open");
            await expect(unopenedStore.clearSession()).rejects.toThrow("database not open");
        });
    });
});


/**
 * Unit tests for AssetStore saved-world store operations.
 *
 * Validates: Requirements 6.2, 6.3, 10.1, 10.2
 */

describe("AssetStore - saved-world store operations", () => {
    let store: AssetStore;

    beforeEach(async () => {
        store = new AssetStore();
        await store.open();
    });

    afterEach(() => {
        store.close();
        indexedDB.deleteDatabase("VishvaAssetStore");
    });

    describe("saveWorldAsset() + getSavedAsset() round-trip", () => {
        it("stores and retrieves a single saved asset", async () => {
            const data = new Uint8Array([10, 20, 30, 40, 50]);
            await store.saveWorldAsset("my-world", "vishva/assets/audio/footstep.ogg", data);

            const result = await store.getSavedAsset("my-world", "vishva/assets/audio/footstep.ogg");
            expect(result).toEqual(data);
        });

        it("returns null for a non-existent saved asset", async () => {
            const result = await store.getSavedAsset("my-world", "nonexistent/key");
            expect(result).toBeNull();
        });

        it("returns null for wrong world name", async () => {
            const data = new Uint8Array([1, 2, 3]);
            await store.saveWorldAsset("world-a", "vishva/assets/test.ogg", data);

            const result = await store.getSavedAsset("world-b", "vishva/assets/test.ogg");
            expect(result).toBeNull();
        });

        it("handles empty Uint8Array", async () => {
            const data = new Uint8Array(0);
            await store.saveWorldAsset("my-world", "empty-asset", data);

            const result = await store.getSavedAsset("my-world", "empty-asset");
            expect(result).toEqual(data);
        });

        it("overwrites existing data with the same key", async () => {
            const data1 = new Uint8Array([1, 2, 3]);
            const data2 = new Uint8Array([4, 5, 6]);

            await store.saveWorldAsset("my-world", "same-key", data1);
            await store.saveWorldAsset("my-world", "same-key", data2);

            const result = await store.getSavedAsset("my-world", "same-key");
            expect(result).toEqual(data2);
        });
    });

    describe("saveWorldBatch()", () => {
        it("stores all entries in a single batch", async () => {
            const entries = [
                { key: "vishva/assets/audio/a.ogg", data: new Uint8Array([1]) },
                { key: "vishva/assets/audio/b.ogg", data: new Uint8Array([2]) },
                { key: "vishva/assets/textures/c.jpg", data: new Uint8Array([3]) },
            ];

            await store.saveWorldBatch("my-world", entries);

            expect(await store.getSavedAsset("my-world", "vishva/assets/audio/a.ogg")).toEqual(new Uint8Array([1]));
            expect(await store.getSavedAsset("my-world", "vishva/assets/audio/b.ogg")).toEqual(new Uint8Array([2]));
            expect(await store.getSavedAsset("my-world", "vishva/assets/textures/c.jpg")).toEqual(new Uint8Array([3]));
        });

        it("handles empty batch", async () => {
            await expect(store.saveWorldBatch("my-world", [])).resolves.toBeUndefined();
        });

        it("stores Vishva.json and Scene.babylon alongside assets", async () => {
            const vishvaJson = new Uint8Array([123, 34, 110, 97, 109, 101, 34, 125]); // {"name"}
            const sceneBabylon = new Uint8Array([123, 34, 115, 99, 101, 110, 101, 34, 125]); // {"scene"}

            const entries = [
                { key: "vishva/assets/audio/a.ogg", data: new Uint8Array([1]) },
                { key: "Vishva.json", data: vishvaJson },
                { key: "Scene.babylon", data: sceneBabylon },
            ];

            await store.saveWorldBatch("my-world", entries);

            expect(await store.getSavedAsset("my-world", "Vishva.json")).toEqual(vishvaJson);
            expect(await store.getSavedAsset("my-world", "Scene.babylon")).toEqual(sceneBabylon);
            expect(await store.getSavedAsset("my-world", "vishva/assets/audio/a.ogg")).toEqual(new Uint8Array([1]));
        });
    });

    describe("listSavedKeys()", () => {
        it("returns correct keys for a world (without worldName prefix)", async () => {
            const entries = [
                { key: "vishva/assets/audio/a.ogg", data: new Uint8Array([1]) },
                { key: "vishva/assets/textures/b.jpg", data: new Uint8Array([2]) },
                { key: "Vishva.json", data: new Uint8Array([3]) },
            ];
            await store.saveWorldBatch("my-world", entries);

            const keys = await store.listSavedKeys("my-world");
            expect(keys.sort()).toEqual(["Vishva.json", "vishva/assets/audio/a.ogg", "vishva/assets/textures/b.jpg"]);
        });

        it("returns empty array for non-existent world", async () => {
            const keys = await store.listSavedKeys("nonexistent-world");
            expect(keys).toEqual([]);
        });

        it("only returns keys for the specified world", async () => {
            await store.saveWorldAsset("world-a", "asset1.ogg", new Uint8Array([1]));
            await store.saveWorldAsset("world-a", "asset2.ogg", new Uint8Array([2]));
            await store.saveWorldAsset("world-b", "asset3.ogg", new Uint8Array([3]));

            const keysA = await store.listSavedKeys("world-a");
            expect(keysA.sort()).toEqual(["asset1.ogg", "asset2.ogg"]);

            const keysB = await store.listSavedKeys("world-b");
            expect(keysB).toEqual(["asset3.ogg"]);
        });
    });

    describe("listSavedWorlds()", () => {
        it("returns unique world names", async () => {
            await store.saveWorldAsset("world-a", "asset1.ogg", new Uint8Array([1]));
            await store.saveWorldAsset("world-a", "asset2.ogg", new Uint8Array([2]));
            await store.saveWorldAsset("world-b", "asset3.ogg", new Uint8Array([3]));
            await store.saveWorldAsset("world-c", "asset4.ogg", new Uint8Array([4]));

            const worlds = await store.listSavedWorlds();
            expect(worlds.sort()).toEqual(["world-a", "world-b", "world-c"]);
        });

        it("returns empty array when no worlds saved", async () => {
            const worlds = await store.listSavedWorlds();
            expect(worlds).toEqual([]);
        });

        it("does not include deleted worlds", async () => {
            await store.saveWorldAsset("world-a", "asset1.ogg", new Uint8Array([1]));
            await store.saveWorldAsset("world-b", "asset2.ogg", new Uint8Array([2]));

            await store.deleteSavedWorld("world-a");

            const worlds = await store.listSavedWorlds();
            expect(worlds).toEqual(["world-b"]);
        });
    });

    describe("deleteSavedWorld()", () => {
        it("removes all assets for a world", async () => {
            await store.saveWorldAsset("my-world", "asset1.ogg", new Uint8Array([1]));
            await store.saveWorldAsset("my-world", "asset2.ogg", new Uint8Array([2]));
            await store.saveWorldAsset("my-world", "asset3.ogg", new Uint8Array([3]));

            await store.deleteSavedWorld("my-world");

            expect(await store.getSavedAsset("my-world", "asset1.ogg")).toBeNull();
            expect(await store.getSavedAsset("my-world", "asset2.ogg")).toBeNull();
            expect(await store.getSavedAsset("my-world", "asset3.ogg")).toBeNull();
            expect(await store.listSavedKeys("my-world")).toEqual([]);
        });

        it("succeeds when world does not exist", async () => {
            await expect(store.deleteSavedWorld("nonexistent")).resolves.toBeUndefined();
        });
    });

    describe("isolation: saving to one world doesn't affect another", () => {
        it("worlds are independent", async () => {
            await store.saveWorldAsset("world-a", "shared-name.ogg", new Uint8Array([1, 2, 3]));
            await store.saveWorldAsset("world-b", "shared-name.ogg", new Uint8Array([4, 5, 6]));

            expect(await store.getSavedAsset("world-a", "shared-name.ogg")).toEqual(new Uint8Array([1, 2, 3]));
            expect(await store.getSavedAsset("world-b", "shared-name.ogg")).toEqual(new Uint8Array([4, 5, 6]));
        });

        it("deleting one world does not affect another", async () => {
            await store.saveWorldAsset("world-a", "asset1.ogg", new Uint8Array([1]));
            await store.saveWorldAsset("world-b", "asset2.ogg", new Uint8Array([2]));

            await store.deleteSavedWorld("world-a");

            expect(await store.getSavedAsset("world-a", "asset1.ogg")).toBeNull();
            expect(await store.getSavedAsset("world-b", "asset2.ogg")).toEqual(new Uint8Array([2]));
        });

        it("listing keys for one world is unaffected by another world's operations", async () => {
            await store.saveWorldAsset("world-a", "a1.ogg", new Uint8Array([1]));
            await store.saveWorldAsset("world-a", "a2.ogg", new Uint8Array([2]));
            await store.saveWorldAsset("world-b", "b1.ogg", new Uint8Array([3]));

            // Save more to world-b
            await store.saveWorldAsset("world-b", "b2.ogg", new Uint8Array([4]));

            // world-a keys should be unchanged
            const keysA = await store.listSavedKeys("world-a");
            expect(keysA.sort()).toEqual(["a1.ogg", "a2.ogg"]);
        });
    });

    describe("isolation: session operations don't affect saved store and vice versa", () => {
        it("session put does not appear in saved store", async () => {
            await store.put("vishva/assets/audio/footstep.ogg", new Uint8Array([1, 2, 3]));

            const savedResult = await store.getSavedAsset("any-world", "vishva/assets/audio/footstep.ogg");
            expect(savedResult).toBeNull();

            const savedWorlds = await store.listSavedWorlds();
            expect(savedWorlds).toEqual([]);
        });

        it("saved store does not appear in session listKeys", async () => {
            await store.saveWorldAsset("my-world", "vishva/assets/audio/footstep.ogg", new Uint8Array([1, 2, 3]));

            const sessionKeys = await store.listKeys();
            expect(sessionKeys).toEqual([]);

            const sessionResult = await store.get("my-world/vishva/assets/audio/footstep.ogg");
            expect(sessionResult).toBeNull();
        });

        it("clearSession does not affect saved store", async () => {
            await store.put("session-asset", new Uint8Array([1]));
            await store.saveWorldAsset("my-world", "saved-asset", new Uint8Array([2]));

            await store.clearSession();

            // Session should be empty
            expect(await store.get("session-asset")).toBeNull();
            // Saved should be intact
            expect(await store.getSavedAsset("my-world", "saved-asset")).toEqual(new Uint8Array([2]));
        });

        it("deleteSavedWorld does not affect session store", async () => {
            await store.put("session-asset", new Uint8Array([1]));
            await store.saveWorldAsset("my-world", "saved-asset", new Uint8Array([2]));

            await store.deleteSavedWorld("my-world");

            // Session should be intact
            expect(await store.get("session-asset")).toEqual(new Uint8Array([1]));
            // Saved should be gone
            expect(await store.getSavedAsset("my-world", "saved-asset")).toBeNull();
        });
    });
});
