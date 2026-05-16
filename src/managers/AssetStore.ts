/**
 * IndexedDB-backed asset storage for Vishva worlds.
 *
 * Provides two object stores:
 * - "session": holds assets for the currently-loaded world (cleared on each new load)
 * - "saved": holds explicitly-saved worlds (persisted until user deletes them)
 *
 * Assets are keyed by their full structured path (e.g., "vishva/assets/audio/footstep.ogg").
 */
export class AssetStore {
    private dbName = "VishvaAssetStore";
    private sessionStoreName = "session";
    private savedStoreName = "saved";
    private db: IDBDatabase | null = null;

    /**
     * Check if IndexedDB is available and accessible.
     */
    static isAvailable(): boolean {
        try {
            return typeof indexedDB !== "undefined" && indexedDB !== null;
        } catch (e) {
            return false;
        }
    }

    /**
     * Open the database connection. Must be called before other operations.
     * Creates both object stores on first run.
     */
    async open(): Promise<void> {
        if (!AssetStore.isAvailable()) {
            throw new Error(
                "Cannot load world: IndexedDB is not available in this browser. Please check your browser settings."
            );
        }

        return new Promise<void>((resolve, reject) => {
            let request: IDBOpenDBRequest;
            try {
                request = indexedDB.open(this.dbName, 1);
            } catch (e) {
                reject(new Error(
                    "Cannot load world: IndexedDB is not available in this browser. Please check your browser settings."
                ));
                return;
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create session store
                if (!db.objectStoreNames.contains(this.sessionStoreName)) {
                    db.createObjectStore(this.sessionStoreName, { keyPath: "key" });
                }

                // Create saved store with worldName index
                if (!db.objectStoreNames.contains(this.savedStoreName)) {
                    const savedStore = db.createObjectStore(this.savedStoreName, { keyPath: "key" });
                    savedStore.createIndex("worldName", "worldName", { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = () => {
                reject(new Error(
                    "Cannot load world: IndexedDB is not available in this browser. Please check your browser settings."
                ));
            };
        });
    }

    // --- Session store operations (active world) ---

    /**
     * Store a single asset in the session store. Key is the structured path.
     */
    async put(key: string, data: Uint8Array): Promise<void> {
        const db = this._getDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.sessionStoreName, "readwrite");
            const store = tx.objectStore(this.sessionStoreName);
            const record = { key, data, timestamp: Date.now() };
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                const error = request.error;
                if (error && error.name === "QuotaExceededError") {
                    reject(new Error(
                        "This world is too large for available browser storage. Try clearing browser data or using a smaller world."
                    ));
                } else {
                    reject(error);
                }
            };
        });
    }

    /**
     * Store multiple assets in the session store in a single transaction.
     * On QuotaExceededError, stops and surfaces error to user.
     * On other individual write failures, logs and continues.
     */
    async putBatch(entries: Array<{ key: string; data: Uint8Array }>): Promise<void> {
        const db = this._getDb();
        const tx = db.transaction(this.sessionStoreName, "readwrite");
        const store = tx.objectStore(this.sessionStoreName);
        let failedCount = 0;

        for (const entry of entries) {
            try {
                await this._putRecord(store, entry);
            } catch (e) {
                if (e instanceof DOMException && e.name === "QuotaExceededError") {
                    throw new Error(
                        "This world is too large for available browser storage. Try clearing browser data or using a smaller world."
                    );
                }
                // Non-quota error: log and continue
                console.warn(`AssetStore: failed to write asset "${entry.key}":`, e);
                failedCount++;
            }
        }

        // Wait for transaction to complete
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => {
                const error = tx.error;
                if (error && error.name === "QuotaExceededError") {
                    reject(new Error(
                        "This world is too large for available browser storage. Try clearing browser data or using a smaller world."
                    ));
                } else {
                    reject(error);
                }
            };
        });

        if (failedCount > 0) {
            console.warn(`AssetStore: ${failedCount} asset(s) failed to store (non-blocking).`);
        }
    }

    /**
     * Retrieve an asset from the session store by its structured path key.
     * Returns null if not found.
     */
    async get(key: string): Promise<Uint8Array | null> {
        const db = this._getDb();
        return new Promise<Uint8Array | null>((resolve, reject) => {
            const tx = db.transaction(this.sessionStoreName, "readonly");
            const store = tx.objectStore(this.sessionStoreName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * List all asset keys in the session store.
     */
    async listKeys(): Promise<string[]> {
        const db = this._getDb();
        return new Promise<string[]>((resolve, reject) => {
            const tx = db.transaction(this.sessionStoreName, "readonly");
            const store = tx.objectStore(this.sessionStoreName);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                resolve(request.result as string[]);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete all assets from the session store (called on new world load).
     */
    async clearSession(): Promise<void> {
        const db = this._getDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.sessionStoreName, "readwrite");
            const store = tx.objectStore(this.sessionStoreName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // --- Saved worlds store operations ---

    /**
     * Save an asset to the saved store, scoped by world name.
     * Key follows pattern: {worldName}/{assetPath}
     */
    async saveWorldAsset(worldName: string, key: string, data: Uint8Array): Promise<void> {
        const db = this._getDb();
        const compositeKey = `${worldName}/${key}`;
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.savedStoreName, "readwrite");
            const store = tx.objectStore(this.savedStoreName);
            const record = { key: compositeKey, worldName, data, timestamp: Date.now() };
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                const error = request.error;
                if (error && error.name === "QuotaExceededError") {
                    reject(new Error(
                        "This world is too large for available browser storage. Try clearing browser data or using a smaller world."
                    ));
                } else {
                    reject(error);
                }
            };
        });
    }

    /**
     * Save multiple assets to the saved store in a single transaction.
     * All entries are scoped by worldName.
     */
    async saveWorldBatch(worldName: string, entries: Array<{ key: string; data: Uint8Array }>): Promise<void> {
        const db = this._getDb();
        const tx = db.transaction(this.savedStoreName, "readwrite");
        const store = tx.objectStore(this.savedStoreName);

        for (const entry of entries) {
            const compositeKey = `${worldName}/${entry.key}`;
            const record = { key: compositeKey, worldName, data: entry.data, timestamp: Date.now() };
            try {
                await this._putSavedRecord(store, record);
            } catch (e) {
                if (e instanceof DOMException && e.name === "QuotaExceededError") {
                    throw new Error(
                        "This world is too large for available browser storage. Try clearing browser data or using a smaller world."
                    );
                }
                console.warn(`AssetStore: failed to write saved asset "${compositeKey}":`, e);
            }
        }

        // Wait for transaction to complete
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => {
                const error = tx.error;
                if (error && error.name === "QuotaExceededError") {
                    reject(new Error(
                        "This world is too large for available browser storage. Try clearing browser data or using a smaller world."
                    ));
                } else {
                    reject(error);
                }
            };
        });
    }

    /**
     * Retrieve an asset from a saved world.
     * Returns null if not found.
     */
    async getSavedAsset(worldName: string, key: string): Promise<Uint8Array | null> {
        const db = this._getDb();
        const compositeKey = `${worldName}/${key}`;
        return new Promise<Uint8Array | null>((resolve, reject) => {
            const tx = db.transaction(this.savedStoreName, "readonly");
            const store = tx.objectStore(this.savedStoreName);
            const request = store.get(compositeKey);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * List all asset keys for a saved world.
     * Returns the asset path portion (without the worldName prefix).
     */
    async listSavedKeys(worldName: string): Promise<string[]> {
        const db = this._getDb();
        return new Promise<string[]>((resolve, reject) => {
            const tx = db.transaction(this.savedStoreName, "readonly");
            const store = tx.objectStore(this.savedStoreName);
            const index = store.index("worldName");
            const request = index.getAllKeys(IDBKeyRange.only(worldName));

            request.onsuccess = () => {
                const keys = request.result as string[];
                // Strip the worldName prefix from each key
                const prefix = `${worldName}/`;
                const assetKeys = keys.map(k => k.substring(prefix.length));
                resolve(assetKeys);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * List all saved world names (unique).
     */
    async listSavedWorlds(): Promise<string[]> {
        const db = this._getDb();
        return new Promise<string[]>((resolve, reject) => {
            const tx = db.transaction(this.savedStoreName, "readonly");
            const store = tx.objectStore(this.savedStoreName);
            const index = store.index("worldName");
            const request = index.openKeyCursor(null, "nextunique");
            const worldNames: string[] = [];

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    worldNames.push(cursor.key as string);
                    cursor.continue();
                } else {
                    resolve(worldNames);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete an entire saved world and all its assets.
     */
    async deleteSavedWorld(worldName: string): Promise<void> {
        const db = this._getDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.savedStoreName, "readwrite");
            const store = tx.objectStore(this.savedStoreName);
            const index = store.index("worldName");
            const request = index.openCursor(IDBKeyRange.only(worldName));

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    // All matching records deleted
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // --- General ---

    /**
     * Close the database connection.
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // --- Private helpers ---

    private _getDb(): IDBDatabase {
        if (!this.db) {
            throw new Error("AssetStore: database not open. Call open() first.");
        }
        return this.db;
    }

    private _putRecord(
        store: IDBObjectStore,
        entry: { key: string; data: Uint8Array }
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const record = { key: entry.key, data: entry.data, timestamp: Date.now() };
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private _putSavedRecord(
        store: IDBObjectStore,
        record: { key: string; worldName: string; data: Uint8Array; timestamp: number }
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
