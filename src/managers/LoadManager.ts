import {
    AbstractMesh, AnimationGroup, AnimationRange, AssetContainer, AssetsManager, BoundingInfo,
    InstancedMesh, IParticleSystem, Material, Matrix, Mesh, MultiMaterial, Quaternion, Scene,
    SceneLoader, Skeleton, StandardMaterial, Tags, TextFileAssetTask, Tools, TransformNode, Vector3, VertexBuffer, Color3
} from "babylonjs";
import { VishvaSerialized, ObjectIdMap, MeshMetadataMap } from "../VishvaSerialized";
import { RuntimeSharingEntry, getRootMesh } from "../util/AnimGroupDedup";
import { SNAManager } from "../sna/SNA";
import { VEvent } from "../eventing/VEvent";
import { EventManager } from "../eventing/EventManager";
import { AssetResolver } from "./AssetResolver";
import { AssetStore } from "./AssetStore";
import { extractTarArchive } from "./TarUtils";
import { isTarGzFile, isJsonWorldFile } from "./FileValidator";

declare var curatedConfig: Object;

export class LoadManager {
    private vishva: any;

    constructor(vishva: any) {
        this.vishva = vishva;
    }

    public sceneLoad1(scenePath: string, sceneFile: string, scene: Scene) {
        // Check if the file is a compressed gzip file
        const isCompressedFile = sceneFile.toLowerCase().endsWith('.gz');
        
        if (isCompressedFile) {
            // Load as compressed gzip file
            this.loadZipWorld(scenePath, sceneFile, scene);
        } else {
            // Load as traditional single file
            var am: AssetsManager = new AssetsManager(scene);
            var task: TextFileAssetTask = am.addTextFileTask("sceneLoader", scenePath + sceneFile);
            task.onSuccess = (tsk) => {
                try {
                    this.loadVishvaPart(tsk);
                } catch (e) {
                    console.log(e);
                    alert("scene parsing failed ");
                }
            };
            task.onError = (tsk, msg, exp) => {
                console.log(msg, exp);
                alert("scene load failed ");
            };
            am.load();
        }
    }

    /**
     * Load world from gzip compressed TAR archive
     * First tries to load from IndexedDB, then falls back to server.
     * Assets are stored in AssetStore (IndexedDB) rather than held in memory.
     */
    private async loadZipWorld(scenePath: string, sceneFile: string, scene: Scene) {
        try {
            // Show progress
            this.vishva.progressManager.show("Loading World", "Fetching world file from server...");
            await this.vishva.progressManager.update(undefined, 5);

            // Fetch from server
            await this.vishva.progressManager.update("Fetching world file from server...", 10);
            
            const response = await fetch(scenePath + sceneFile);
            if (!response.ok) {
                throw new Error(`Failed to load ${sceneFile}: ${response.statusText}`);
            }
            
            await this.vishva.progressManager.update("Decompressing world file...", 30);
            
            const compressedBlob = await response.blob();
            const decompressedData = await this._decompressGzip(compressedBlob);
            
            await this.vishva.progressManager.update("Extracting world data...", 50);
            
            let files = await this._extractTarArchive(decompressedData);
            
            // Extract Vishva.json and Scene.babylon
            const vishvaData = files.get("Vishva.json");
            const sceneData = files.get("Scene.babylon");
            
            if (!vishvaData) {
                throw new Error("Vishva.json not found in archive");
            }
            if (!sceneData) {
                throw new Error("Scene.babylon not found in archive");
            }
            
            const vishvaText = new TextDecoder().decode(vishvaData);
            const sceneText = new TextDecoder().decode(sceneData);
            const vishvaObj = JSON.parse(vishvaText);
            const sceneObj = JSON.parse(sceneText);
            
            await this.vishva.progressManager.update("Loading scene...", 70);
            
            // Check if archive contains bundled assets (support both formats)
            const hasStructuredAssets = Array.from(files.keys()).some(key => key.startsWith("vishva/assets/"));
            const hasLegacyAssets = Array.from(files.keys()).some(key => key.startsWith("assets/"));
            
            if (hasStructuredAssets || hasLegacyAssets) {
                // Open AssetStore and ingest assets into IndexedDB
                const assetStore = new AssetStore();
                try {
                    await assetStore.open();
                } catch (e) {
                    this.vishva.progressManager.hide();
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    alert(errorMessage);
                    return;
                }
                
                await this.vishva.progressManager.update("Storing assets in browser...", 75);
                
                await assetStore.clearSession();
                
                // Build entries for batch insert, remapping legacy paths to structured format
                const entries: Array<{ key: string; data: Uint8Array }> = [];
                for (const [key, data] of files.entries()) {
                    if (key.startsWith("vishva/assets/")) {
                        entries.push({ key, data });
                    } else if (key.startsWith("assets/")) {
                        // Remap old format: "assets/foo.png" → "vishva/assets/foo.png"
                        const remappedKey = "vishva/" + key;
                        entries.push({ key: remappedKey, data });
                    }
                }
                
                await assetStore.putBatch(entries);
                
                // Release in-memory tar data — assets are now in IndexedDB
                files = null as any;
                
                // Store AssetStore reference for SaveManager
                this.vishva._assetStore = assetStore;
                
                await this.vishva.progressManager.update("Activating asset resolver...", 85);
                
                // Activate AssetResolver with AssetStore (async)
                const assetResolver = new AssetResolver();
                await assetResolver.activate(assetStore);
                
                // Process the loaded data with asset resolver
                this.loadVishvaPartFromObjects(vishvaObj, sceneObj, assetResolver);
            } else {
                // No assets: use existing behavior (backward compatibility)
                this.loadVishvaPartFromObjects(vishvaObj, sceneObj);
            }

            await this.vishva.progressManager.update(undefined, 100);
            
        } catch (e) {
            this.vishva.progressManager.hide();
            console.error("Error loading compressed world:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert("Failed to load world: " + errorMessage);
        }
    }

    /**
     * Validate a .tar.gz world file by decompressing and checking for required entries.
     * Returns { valid: true } or { valid: false, error: string }.
     * This is the lightweight pre-reload validation.
     */
    public async validateWorldFile(data: ArrayBuffer): Promise<{ valid: boolean; error?: string }> {
        try {
            const compressedBlob = new Blob([data]);
            const decompressedData = await this._decompressGzip(compressedBlob);
            const files = await this._extractTarArchive(decompressedData);
            return this.validateWorldArchive(files);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return { valid: false, error: "Not a valid Vishva world file: " + errorMessage };
        }
    }

    /**
     * Validate, store in IndexedDB, and trigger page reload to load the world
     * in a fresh WebGL context.
     */
    public async loadWorldFromFile(file: File): Promise<void> {
        try {
            // Show progress
            this.vishva.progressManager.show("Preparing world for reload...");

            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Validate the world file
            const validation = await this.validateWorldFile(arrayBuffer);
            if (!validation.valid) {
                this.vishva.progressManager.hide();
                alert(validation.error);
                return;
            }

            // Store in IndexedDB
            try {
                await this._storeInIndexedDB("__uploaded", arrayBuffer);
            } catch (e) {
                this.vishva.progressManager.hide();
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert("Failed to save world for reload: " + errorMessage);
                return;
            }

            // Trigger page reload with the __uploaded flag
            window.location.search = "?world=__uploaded";

        } catch (e) {
            this.vishva.progressManager.hide();
            console.error("Error preparing world for reload:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert("Failed to load world: " + errorMessage);
        }
    }

    /**
     * Validate, store a JSON world file in IndexedDB, and trigger page reload.
     * Similar to loadWorldFromFile but for legacy .json scene files.
     */
    public async loadWorldFromJsonFile(file: File): Promise<void> {
        try {
            this.vishva.progressManager.show("Preparing world for reload...");

            const text = await file.text();

            // Basic validation: must be valid JSON with a VishvaSerialized key
            let parsed: any;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                this.vishva.progressManager.hide();
                alert("Not a valid Vishva world file: invalid JSON");
                return;
            }

            if (!parsed["VishvaSerialized"]) {
                this.vishva.progressManager.hide();
                alert("Not a valid Vishva world file: missing VishvaSerialized data");
                return;
            }

            // Store the raw text as ArrayBuffer in IndexedDB
            const encoder = new TextEncoder();
            const arrayBuffer = encoder.encode(text).buffer;

            try {
                await this._storeInIndexedDB("__uploaded_json", arrayBuffer);
            } catch (e) {
                this.vishva.progressManager.hide();
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert("Failed to save world for reload: " + errorMessage);
                return;
            }

            // Trigger page reload with the __uploaded_json flag
            window.location.search = "?world=__uploaded_json";

        } catch (e) {
            this.vishva.progressManager.hide();
            console.error("Error preparing JSON world for reload:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert("Failed to load world: " + errorMessage);
        }
    }

    /**
     * Load a JSON world from IndexedDB after page reload.
     * Called by Vishva constructor when sceneFile === "__uploaded_json".
     * Retrieves the stored JSON text, extracts VishvaSerialized, and loads the scene.
     * Falls back to empty world if data is missing or invalid.
     * Always cleans up IndexedDB entry and URL parameter.
     */
    public async loadUploadedJsonWorld(): Promise<void> {
        this.vishva.progressManager.show("Loading World");
        try {
            const data = await this._getFromIndexedDB("__uploaded_json");

            if (data === null) {
                console.warn("No uploaded JSON world found in storage");
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                return;
            }

            try {
                const text = new TextDecoder().decode(data);
                const sceneObj = JSON.parse(text);

                // Extract VishvaSerialized from the merged JSON
                const vishvaData = sceneObj["VishvaSerialized"];
                if (!vishvaData) {
                    alert("Not a valid Vishva world file: missing VishvaSerialized data");
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                    return;
                }

                // Load using the same path as loadVishvaPartFromObjects
                this.loadVishvaPartFromObjects(vishvaData, sceneObj);
            } catch (e) {
                console.error("Error loading uploaded JSON world:", e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert("Uploaded world data is corrupted: " + errorMessage);
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
            }
        } finally {
            try {
                await this._deleteFromIndexedDB("__uploaded_json");
            } catch (e) {
                console.error("Failed to delete uploaded JSON world from IndexedDB:", e);
            }
            history.replaceState({}, "", window.location.pathname);
        }
    }

    /**
     * Load a world from IndexedDB after page reload.
     * Called by Vishva constructor when sceneFile === "__uploaded".
     * Retrieves, decompresses, extracts, validates, and loads the world.
     * Assets are stored in AssetStore (IndexedDB) rather than held in memory.
     * Falls back to empty world if data is missing or invalid.
     * Always cleans up IndexedDB entry and URL parameter.
     */
    public async loadUploadedWorld(): Promise<void> {
        this.vishva.progressManager.show("Loading World");
        try {
            const data = await this._getFromIndexedDB("__uploaded");

            if (data === null) {
                console.warn("No uploaded world found in storage");
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                return;
            }

            try {
                const compressedBlob = new Blob([data]);
                const decompressedData = await this._decompressGzip(compressedBlob);
                let files = await this._extractTarArchive(decompressedData);

                const validation = this.validateWorldArchive(files);
                if (!validation.valid) {
                    alert(validation.error);
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                    return;
                }

                const vishvaData = files.get("Vishva.json");
                const sceneData = files.get("Scene.babylon");

                const vishvaText = new TextDecoder().decode(vishvaData!);
                const sceneText = new TextDecoder().decode(sceneData!);
                const vishvaObj = JSON.parse(vishvaText);
                const sceneObj = JSON.parse(sceneText);

                // Check for bundled assets (support both old "assets/" and new "vishva/assets/" format)
                const hasStructuredAssets = Array.from(files.keys()).some(key => key.startsWith("vishva/assets/"));
                const hasLegacyAssets = Array.from(files.keys()).some(key => key.startsWith("assets/"));

                if (hasStructuredAssets || hasLegacyAssets) {
                    // Open AssetStore and ingest assets into IndexedDB
                    const assetStore = new AssetStore();
                    try {
                        await assetStore.open();
                    } catch (e) {
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        alert(errorMessage);
                        this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                        return;
                    }
                    
                    await assetStore.clearSession();
                    
                    // Build entries for batch insert, remapping legacy paths to structured format
                    const entries: Array<{ key: string; data: Uint8Array }> = [];
                    for (const [key, fileData] of files.entries()) {
                        if (key.startsWith("vishva/assets/")) {
                            entries.push({ key, data: fileData });
                        } else if (key.startsWith("assets/")) {
                            // Remap old format: "assets/foo.png" → "vishva/assets/foo.png"
                            const remappedKey = "vishva/" + key;
                            entries.push({ key: remappedKey, data: fileData });
                        }
                    }
                    
                    await assetStore.putBatch(entries);
                    
                    // Release in-memory tar data — assets are now in IndexedDB
                    files = null as any;
                    
                    // Store AssetStore reference for SaveManager
                    this.vishva._assetStore = assetStore;
                    
                    // Activate AssetResolver with AssetStore (async)
                    const assetResolver = new AssetResolver();
                    await assetResolver.activate(assetStore);
                    
                    this.loadVishvaPartFromObjects(vishvaObj, sceneObj, assetResolver);
                } else {
                    this.loadVishvaPartFromObjects(vishvaObj, sceneObj);
                }
            } catch (e) {
                console.error("Error loading uploaded world:", e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert("Uploaded world data is corrupted: " + errorMessage);
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
            }
        } finally {
            try {
                await this._deleteFromIndexedDB("__uploaded");
            } catch (e) {
                console.error("Failed to delete uploaded world from IndexedDB:", e);
            }
            history.replaceState({}, "", window.location.pathname);
        }
    }

    /**
     * Load a saved world directly from IndexedDB (no tar.gz decompression needed).
     * Reads assets from the "saved" store, copies them into the "session" store,
     * then activates AssetResolver with the AssetStore reference.
     * @param worldName The name of the saved world to load
     */
    public async loadSavedWorld(worldName: string): Promise<void> {
        this.vishva.progressManager.show("Loading World", "Reading saved world from browser...");
        try {
            // Open AssetStore
            const assetStore = new AssetStore();
            try {
                await assetStore.open();
            } catch (e) {
                this.vishva.progressManager.hide();
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert(errorMessage);
                return;
            }

            // Clear previous session
            await assetStore.clearSession();

            await this.vishva.progressManager.update("Reading saved assets...", 20);

            // Get all saved keys for this world
            const savedKeys = await assetStore.listSavedKeys(worldName);

            // Check if this is a JSON-only world (legacy format stored with __world.json)
            const jsonWorldKey = savedKeys.find(k => k === "__world.json");
            if (jsonWorldKey) {
                const jsonRaw = await assetStore.getSavedAsset(worldName, "__world.json");
                if (!jsonRaw) {
                    this.vishva.progressManager.hide();
                    alert("Saved world data is missing or corrupted");
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                    return;
                }

                const jsonText = new TextDecoder().decode(jsonRaw);
                const sceneObj = JSON.parse(jsonText);
                const vishvaData = sceneObj["VishvaSerialized"];

                if (!vishvaData) {
                    this.vishva.progressManager.hide();
                    alert("Saved world is invalid: missing VishvaSerialized data");
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                    return;
                }

                // Store AssetStore reference for SaveManager
                this.vishva._assetStore = assetStore;

                await this.vishva.progressManager.update("Loading scene...", 90);

                // Load without asset resolver — assets come from server
                this.loadVishvaPartFromObjects(vishvaData, sceneObj);
                return;
            }

            // Separate metadata files from asset files
            const vishvaKey = savedKeys.find(k => k === "Vishva.json");
            const sceneKey = savedKeys.find(k => k === "Scene.babylon");

            if (!vishvaKey || !sceneKey) {
                this.vishva.progressManager.hide();
                alert("Saved world is incomplete: missing Vishva.json or Scene.babylon");
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                return;
            }

            // Read Vishva.json and Scene.babylon from saved store
            const vishvaRaw = await assetStore.getSavedAsset(worldName, "Vishva.json");
            const sceneRaw = await assetStore.getSavedAsset(worldName, "Scene.babylon");

            if (!vishvaRaw || !sceneRaw) {
                this.vishva.progressManager.hide();
                alert("Saved world data is missing or corrupted");
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                return;
            }

            const vishvaText = new TextDecoder().decode(vishvaRaw);
            const sceneText = new TextDecoder().decode(sceneRaw);
            const vishvaObj = JSON.parse(vishvaText);
            const sceneObj = JSON.parse(sceneText);

            await this.vishva.progressManager.update("Copying assets to session...", 50);

            // Copy all asset files from saved store into session store
            const assetKeys = savedKeys.filter(k => k !== "Vishva.json" && k !== "Scene.babylon");
            for (const key of assetKeys) {
                const data = await assetStore.getSavedAsset(worldName, key);
                if (data) {
                    await assetStore.put(key, data);
                }
            }

            await this.vishva.progressManager.update("Activating asset resolver...", 80);

            // Store AssetStore reference for SaveManager
            this.vishva._assetStore = assetStore;

            // Activate AssetResolver with AssetStore
            const assetResolver = new AssetResolver();
            await assetResolver.activate(assetStore);

            await this.vishva.progressManager.update("Loading scene...", 90);

            // Load the world
            this.loadVishvaPartFromObjects(vishvaObj, sceneObj, assetResolver);

        } catch (e) {
            this.vishva.progressManager.hide();
            console.error("Error loading saved world:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert("Failed to load saved world: " + errorMessage);
            this.vishva.loadBabylonjsPart(this.vishva.scene, true);
        }
    }

    /**
     * Store raw ArrayBuffer in IndexedDB under the given key.
     * Uses the existing "VishvaWorlds" database and "worlds" object store.
     */
    private _storeInIndexedDB(key: string, data: ArrayBuffer): Promise<void> {
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
     * Retrieve raw ArrayBuffer from IndexedDB by key.
     * Returns the data field if found, or null if not found.
     */
    private _getFromIndexedDB(key: string): Promise<ArrayBuffer | null> {
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
                    const transaction = db.transaction([storeName], "readonly");
                    const store = transaction.objectStore(storeName);
                    const getRequest = store.get(key);

                    getRequest.onsuccess = () => {
                        db.close();
                        const result = getRequest.result;
                        if (result && result.data) {
                            resolve(result.data);
                        } else {
                            resolve(null);
                        }
                    };

                    getRequest.onerror = () => {
                        db.close();
                        reject(new Error("Failed to retrieve data from IndexedDB"));
                    };
                } catch (e) {
                    db.close();
                    reject(e);
                }
            };
        });
    }

    /**
     * Delete an entry from IndexedDB by key.
     * Resolves on success (no-op if key doesn't exist).
     */
    private _deleteFromIndexedDB(key: string): Promise<void> {
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
                    const deleteRequest = store.delete(key);

                    deleteRequest.onsuccess = () => {
                        db.close();
                        resolve();
                    };

                    deleteRequest.onerror = () => {
                        db.close();
                        reject(new Error("Failed to delete data from IndexedDB"));
                    };
                } catch (e) {
                    db.close();
                    reject(e);
                }
            };
        });
    }

    /**
     * Decompress gzip data using the Compression Streams API
     */
    private async _decompressGzip(compressedBlob: Blob): Promise<Uint8Array> {
        const arrayBuffer = await compressedBlob.arrayBuffer();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(arrayBuffer));
                controller.close();
            }
        });

        const decompressedStream = stream.pipeThrough(
            new DecompressionStream('gzip') as any
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
     * Extract files from TAR archive
     */
    private async _extractTarArchive(tarData: Uint8Array): Promise<Map<string, Uint8Array>> {
        return extractTarArchive(tarData);
    }

    /**
     * Validate that a tar archive contains the required world entries.
     * Returns { valid: true } if the map contains both Vishva.json and Scene.babylon keys.
     * Returns { valid: false, error: string } with a descriptive message if either is missing.
     */
    public validateWorldArchive(files: Map<string, Uint8Array>): { valid: boolean; error?: string } {
        if (!files.has("Vishva.json")) {
            return { valid: false, error: "Not a valid Vishva world file: missing Vishva.json" };
        }
        if (!files.has("Scene.babylon")) {
            return { valid: false, error: "Not a valid Vishva world file: missing Scene.babylon" };
        }
        return { valid: true };
    }

    /**
     * Load Vishva data from separate objects (used for gzip format)
     * @param vishvaData The parsed Vishva.json object
     * @param sceneData The parsed Scene.babylon object
     * @param assetResolver Optional AssetResolver to deactivate after scene load
     */
    private loadVishvaPartFromObjects(vishvaData: any, sceneData: any, assetResolver?: AssetResolver) {
        this.vishva.progressManager.update("Processing vishva data...", 90);
        
        // Resolve assets/ paths in VishvaSerialized to blob URLs before use.
        // This handles sound files and other assets referenced in Vishva.json that
        // are not loaded through BabylonJS's Tools.LoadFile/PreprocessUrl pipeline.
        if (assetResolver) {
            assetResolver.resolveAssetPaths(vishvaData);
        }

        this.vishva.vishvaSerialized = vishvaData;

        this.umarshalVec3(this.vishva.vishvaSerialized);

        if (!this.vishva.vishvaSerialized.avSerialized.settings.ellipsoid) {
            this.vishva.vishvaSerialized.avSerialized.settings.ellipsoid = new Vector3(0.15, 0.8, 0.15);
            this.vishva.vishvaSerialized.avSerialized.settings.ellipsoidOffset = new Vector3(0.0, 0.8, 0.0);
        }

        if (!(this.vishva.vishvaSerialized === undefined)) {
            console.log("world babylon version : " + this.vishva.vishvaSerialized.bVer);
            console.log("world vishva version : " + this.vishva.vishvaSerialized.vVer);

            this.vishva.snas = this.vishva.vishvaSerialized.snas;
            this.vishva._cameraCollision = this.vishva.vishvaSerialized.settings.cameraCollision;
            this.vishva.autoEditMenu = this.vishva.vishvaSerialized.settings.autoEditMenu;
            if (this.vishva.vishvaSerialized.misc.skyColor) {
                this.vishva.skyColor.r = this.vishva.vishvaSerialized.misc.skyColor.r;
                this.vishva.skyColor.g = this.vishva.vishvaSerialized.misc.skyColor.g;
                this.vishva.skyColor.b = this.vishva.vishvaSerialized.misc.skyColor.b;
                this.vishva.skyColor.a = this.vishva.vishvaSerialized.misc.skyColor.a;
            }

            if (typeof this.vishva.vishvaSerialized.misc.skyBright !== "undefined") {
                this.vishva.skyBright = this.vishva.vishvaSerialized.misc.skyBright;
            }

            if (typeof this.vishva.vishvaSerialized.misc.sceneShadowsEnabled !== "undefined") {
                this.vishva.scene.shadowsEnabled = this.vishva.vishvaSerialized.misc.sceneShadowsEnabled;
            }

            // NEW: Store object IDs and metadata for later use in loadBabylonjsPart
            this.vishva._objectIds = this.vishva.vishvaSerialized.objectIds || null;
            this.vishva._meshMetadata = this.vishva.vishvaSerialized.meshMetadata || {};
        } else {
            this.vishva.vishvaSerialized = new VishvaSerialized();
        }

        this.vishva.progressManager.update("Processing scene data...", 95);
        var sceneDataStr: string = "data:" + JSON.stringify(sceneData);
        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.Append("", sceneDataStr, this.vishva.scene, (scene) => { 
            // Deactivate asset resolver AFTER all textures have finished loading.
            // The SceneLoader.Append callback fires when meshes are created, but
            // texture images are still loading asynchronously at this point.
            if (assetResolver) {
                scene.executeWhenReady(() => {
                    assetResolver.deactivate();
                });
            }
            // Hide progress when scene is loaded
            setTimeout(() => {
                this.vishva.progressManager.hide();
            }, 500);
            return this.vishva.loadBabylonjsPart(scene);
        });
    }

    private umarshalVec3(obj: Object): void {
        let keys: string[] = Object.keys(obj);
        for (let key of keys) {
            if (obj[key] instanceof Object) {
                let o: Object = obj[key];
                let ns: string[] = Object.keys(o);
                let l: number = ns.length;
                if ((l == 4) && (ns.indexOf("_x") >= 0) && (ns.indexOf("_y") >= 0) && (ns.indexOf("_z") >= 0) && (ns.indexOf("_isDirty") >= 0)) {
                    obj[key] = new Vector3(o["_x"], o["_y"], o["_z"]);
                } else {
                    this.umarshalVec3(o);
                }
            }
        }
    }

    private loadVishvaPart(tsk: TextFileAssetTask) {
        let tfat: TextFileAssetTask = tsk;
        let foo: Object = <Object>JSON.parse(tfat.text);

        this.vishva.vishvaSerialized = foo["VishvaSerialized"];

        this.umarshalVec3(this.vishva.vishvaSerialized);

        if (!this.vishva.vishvaSerialized.avSerialized.settings.ellipsoid) {
            this.vishva.vishvaSerialized.avSerialized.settings.ellipsoid = new Vector3(0.15, 0.8, 0.15);
            this.vishva.vishvaSerialized.avSerialized.settings.ellipsoidOffset = new Vector3(0.0, 0.8, 0.0);
        }

        if (!(this.vishva.vishvaSerialized === undefined)) {
            console.log("world babylon version : " + this.vishva.vishvaSerialized.bVer);
            console.log("world vishva version : " + this.vishva.vishvaSerialized.vVer);

            this.vishva.snas = this.vishva.vishvaSerialized.snas;
            this.vishva._cameraCollision = this.vishva.vishvaSerialized.settings.cameraCollision;
            this.vishva.autoEditMenu = this.vishva.vishvaSerialized.settings.autoEditMenu;
            if (this.vishva.vishvaSerialized.misc.skyColor) {
                this.vishva.skyColor.r = this.vishva.vishvaSerialized.misc.skyColor.r;
                this.vishva.skyColor.g = this.vishva.vishvaSerialized.misc.skyColor.g;
                this.vishva.skyColor.b = this.vishva.vishvaSerialized.misc.skyColor.b;
                this.vishva.skyColor.a = this.vishva.vishvaSerialized.misc.skyColor.a;
            }

            if (typeof this.vishva.vishvaSerialized.misc.skyBright !== "undefined") {
                this.vishva.skyBright = this.vishva.vishvaSerialized.misc.skyBright;
            }

            if (typeof this.vishva.vishvaSerialized.misc.sceneShadowsEnabled !== "undefined") {
                this.vishva.scene.shadowsEnabled = this.vishva.vishvaSerialized.misc.sceneShadowsEnabled;
            }

            // NEW: Store object IDs and metadata for later use in loadBabylonjsPart
            this.vishva._objectIds = this.vishva.vishvaSerialized.objectIds || null;
            this.vishva._meshMetadata = this.vishva.vishvaSerialized.meshMetadata || {};
        } else {
            this.vishva.vishvaSerialized = new VishvaSerialized();
        }

        var sceneData: string = "data:" + tfat.text;
        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.Append("", sceneData, this.vishva.scene, (scene) => { return this.vishva.loadBabylonjsPart(scene) });
    }

    /**
     * used to load internal/curated assets
     * 
     * @param category 
     * @param asset 
     */
    public loadCurAsset(category: string, asset: string) {
        console.log("loading curated ", category, asset);
        this.vishva.filePath = category;
        this.vishva.file = asset;
        let folder: string = asset.split(".")[0];

        SceneLoader.ImportMesh("",
            this.vishva.constructor.vHome + "assets/curated/" + category + "/" + folder + "/",
            asset,
            this.vishva.scene,
            (meshes, particleSystems, skeletons, animationGroups) => { return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, asset, "curated", category) });
    }

    //used to load assets other than curated asset
    public loadUserAsset(path: string, file: string) {
        console.log("loading loadUserAsset ");
        this.vishva.filePath = path;
        this.vishva.file = file;
        SceneLoader.LoadAssetContainer(
            this.vishva.constructor.vHome + "assets/" + path,
            file,
            this.vishva.scene,
            (assets: AssetContainer) => {
                let meshes = assets.meshes;
                let particleSystems = assets.particleSystems;
                let skeletons = assets.skeletons;
                let animationGroups = assets.animationGroups;
                assets.addAllToScene();
                return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file, "user")
            });
    }

    private reuseAnimationGroup(destAG: AnimationGroup): RuntimeSharingEntry | null {
        let sourceAG = this.vishva.scene.getAnimationGroupByName(destAG.name);
        if (sourceAG && sourceAG !== destAG) {
            for (let destTA of destAG.targetedAnimations) {
                let sourceTA = sourceAG.targetedAnimations.find(srcTA => srcTA.animation.name === destTA.animation.name);
                if (sourceTA) {
                    destTA.animation = sourceTA.animation;
                }
            }

            // Determine root meshes for sharing metadata
            const destFirstTarget = destAG.targetedAnimations?.[0]?.target;
            const sourceFirstTarget = sourceAG.targetedAnimations?.[0]?.target;
            if (destFirstTarget && sourceFirstTarget) {
                const destRoot = getRootMesh(destFirstTarget);
                const sourceRoot = getRootMesh(sourceFirstTarget);
                return {
                    mesh: destRoot,
                    sourceMesh: sourceRoot,
                };
            }
        }
        return null;
    }

    public onMeshLoaded(meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[], file: string, assetType: string, folder?: string) {
        console.log("loading meshes from file " + file + " from folder " + folder + " of type " + assetType + " mesh count " + meshes.length);

        for (let s of skeletons) {
            this.vishva.scene.stopAnimation(s);
        }

        const newSharingEntries: RuntimeSharingEntry[] = [];
        for (let ag of animationGroups) {
            ag.stop();
            const entry = this.reuseAnimationGroup(ag);
            if (entry) {
                newSharingEntries.push(entry);
            }
        }


        // Merge new sharing entries into this.vishva._animationSharing, avoiding duplicates
        if (newSharingEntries.length > 0) {
            if (!this.vishva._animationSharing) {
                this.vishva._animationSharing = [];
            }
            for (const entry of newSharingEntries) {
                const alreadyExists = this.vishva._animationSharing.some(
                    (e: RuntimeSharingEntry) => e.mesh === entry.mesh && e.sourceMesh === entry.sourceMesh
                );
                if (!alreadyExists) {
                    this.vishva._animationSharing.push(entry);
                }
            }
        }

        if (file.split(".")[1] == "obj") {
            this.fixObj(meshes);
        }

        let _rootMeshesCount: number = 0;
        let rootMesh: TransformNode = null;
        let i = 0;
        for (let mesh of meshes) {
            mesh.isPickable = true;
            if (mesh.parent == null) {
                _rootMeshesCount++;
                rootMesh = <Mesh>mesh;
            }
            this.vishva.saveManager.addToShadowCasters(mesh);
            this.vishva.scene.stopAnimation(mesh);
            if (mesh.skeleton != null) {
                this.vishva.scene.stopAnimation(mesh.skeleton);
                this.vishva.avManager.fixAnimationRanges(mesh.skeleton);
            }
        }

        if (_rootMeshesCount > 1) {
            rootMesh = new TransformNode(file, this.vishva.scene, true);
            for (let mesh of meshes) {
                if (mesh.parent == null) {
                    mesh.parent = rootMesh;
                }
            }
        } else {
            if (rootMesh != null) {
                if (rootMesh.name === "__root__") {
                    rootMesh.name = file;
                }
            }
        }

        this.postLoad(meshes, assetType, folder, file);

        let scaling = false;
        let sf: Vector3;
        let scaleNum: number = 1;
        let scaleObj = {};
        if (assetType == "curated" && curatedConfig) {
            if ('scale' in curatedConfig) {
                console.log('scale in curatedConfig');
                scaling = true;
                scaleObj = curatedConfig['scale'];
            }
            if (folder in curatedConfig) {
                if ('scale' in curatedConfig[folder]) {
                    console.log('scale in curatedConfig[folder]');
                    scaling = true;
                    scaleObj = curatedConfig[folder]['scale'];
                }
                if (file in curatedConfig[folder] && 'scale' in curatedConfig[folder][file]) {
                    console.log('scale in curatedConfig[folder][file]');
                    scaling = true;
                    scaleObj = curatedConfig[folder][file]["scale"];
                }
            }
        }
        if (scaling && rootMesh != null) {
            sf = new Vector3();
            sf.x = Number(scaleObj[0]);
            sf.y = Number(scaleObj[1]);
            sf.z = Number(scaleObj[2]);
            rootMesh.scaling.multiplyInPlace(sf);
            //for bounding we will assume, for now, that scaling is same in all three dimensions
            scaleNum = sf.x;
        }
        
        this.postionAsset(rootMesh, scaleNum);

        EventManager.publish(VEvent._WORLD_ITEMS_CHANGED);
    }

    /**
     * used to load user assets
     * 
     * @param path 
     * @param file 
     */
    public loadUserAsset1(path: string, file: string) {
        console.log("loading loadUserAsset1 ");
        this.vishva.filePath = path;
        this.vishva.file = file;
        SceneLoader.ImportMesh("",
            this.vishva.constructor.vHome + "assets/" + path,
            file,
            this.vishva.scene,
            (meshes, particleSystems, skeletons, animationGroups) => { return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file, "user") });
    }

    public loadUserAsset3(path: string, file: string) {
        console.log("loading loadUserAsset3 ");
        this.vishva.filePath = path;
        this.vishva.file = file;
        SceneLoader.Append(
            this.vishva.constructor.vHome + "assets/" + path,
            file,
            this.vishva.scene,
            (scene) => {
                console.log("scene loaded");
            });
    }

    private postionAsset(rootMesh: TransformNode, scaleNum: number) {
        let bb: { max, min } = rootMesh.getHierarchyBoundingVectors()

        // 2 m in front of av. also check if AV is forward facing
        let dist = 2;
        if (this.vishva.avManager.cc.getSettings().faceForward) {
            dist = -2;
        }
        let placementLocal: Vector3 = new Vector3(0, 0, -dist);
        //in global space
        let placementGlobal: Vector3 = Vector3.TransformCoordinates(placementLocal, this.vishva.avatar.getWorldMatrix());

        //vector from av to placementGlobal
        let v: Vector3 = placementGlobal.subtract(this.vishva.avatar.position);
        //now find which co-ordinate quadrant is this v in, that will give the quadrant the AV is facing
        //quadrant 1 to 4 anti clockwise
        let q: number = 0;
        if (v.x >= 0 && v.z >= 0) {
            q = 1;
        } else if (v.x <= 0 && v.z >= 0) {
            q = 2;
        } else if (v.x <= 0 && v.z <= 0) {
            q = 3;
        } else q = 4;

        //now find bounding box corner closest to AV
        //this is the corner which will be placed on placementGlobal
        let corner: Vector3;
        if (q == 1) {
            corner = bb.min;
        } else if (q == 2) {
            corner = new Vector3(bb.max.x, bb.min.y, bb.min.z);
        } else if (q == 3) {
            corner = new Vector3(bb.max.x, bb.min.y, bb.max.z);
        } else corner = new Vector3(bb.min.x, bb.min.y, bb.max.z);

        //now place the bb corner on the placementGobalPoint
        if (rootMesh != null) {
            //rootmesh location wrt corner = - corner vector
            rootMesh.position.subtractInPlace(corner);
            rootMesh.position.addInPlace(placementGlobal);
            
            if (!this.vishva.isMeshSelected) {
                this.vishva.selectForEdit(rootMesh);
            } else {
                this.vishva.switchEditControl(rootMesh);
            }
            this.vishva.rootSelected = true;
            this.vishva.animateMesh(rootMesh);
        }
    }

    private fixObj(meshes: AbstractMesh[]) {
        console.log("fixing obj");
        let s: Vector3;
        for (let mesh of meshes) {
            if (mesh.parent != null) continue;

            s = mesh.scaling;
            s.z = -s.z;
            this.vishva._bakeTransforms(<Mesh>mesh);
        }
    }

    private postLoad(meshes: AbstractMesh[], assetType: string, folder: string, file: string) {
        let reuseMaterials = false;
        if (meshes.length > 0) {
            for (let mesh of meshes) {
                if (!(mesh instanceof Mesh)) continue;
                reuseMaterials = false;
                if (assetType == "curated" && curatedConfig) {
                    if ('collision' in curatedConfig) mesh.checkCollisions = true;
                    if ('reuseMaterial' in curatedConfig) reuseMaterials = true;
                    if (folder in curatedConfig) {
                        if ('collision' in curatedConfig[folder])
                            mesh.checkCollisions = curatedConfig[folder]['collision'];
                        if ('reuseMaterial' in curatedConfig[folder])
                            reuseMaterials = curatedConfig[folder]['reuseMaterial'];
                        if (file in curatedConfig[folder]) {
                            if ('collision' in curatedConfig[folder][file])
                                mesh.checkCollisions = curatedConfig[folder][file]['collision'];
                            if ('reuseMaterial' in curatedConfig[folder][file])
                                reuseMaterials = curatedConfig[folder][file]['reuseMaterial'];
                        }
                    }
                }
                if (reuseMaterials) {
                    this.processMaterial(mesh, m => this.reuseMaterial(m));
                } else {
                    this.processMaterial(mesh, m => this.makeMatIdUnique(m));
                }
                this.processMaterial(mesh, m => this.removeSpecular(m));
            }
        }
    }

    private reuseMaterial(mat: Material): Material {
        let m = this.vishva.scene.getLastMaterialByID(mat.id + "@cur");
        if (m != null) {
            mat.dispose();
            return m;
        } else {
            mat.id = mat.id + "@cur";
            return mat;
        }
    }

    private makeMatIdUnique(mat: Material): Material {
        mat.id = this.vishva.uid(mat.id);
        return mat;
    }

    private removeSpecular(m: Material) {
        if (m instanceof StandardMaterial) {
            m.specularColor = new Color3(0, 0, 0);
        }
        return m;
    }

    private processMaterial(mesh: AbstractMesh, f: (mat: Material) => Material) {
        if (mesh.material != null) {
            if (mesh.material instanceof MultiMaterial) {
                var mm: MultiMaterial = <MultiMaterial>mesh.material;
                var mats: Material[] = mm.subMaterials;
                for (let i = 0; i < mats.length; i++) {
                    mats[i] = f(mats[i]);
                }
            } else {
                mesh.material = f(mesh.material);
            }
        }
    }


    /**
     * Load asset from a dropped file
     * @param file The File object from drag and drop
     */
    /**
     * Load asset from a dropped file
     * @param file The File object from drag and drop
     * @param fileMap Optional map of all dropped files for resolving dependencies
     */
    public loadDroppedAsset(file: File, fileMap?: Map<string, string>) {
        console.log("loading dropped asset: ", file.name);
        
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const supportedFormats = ['gltf', 'glb', 'obj', 'babylon', 'stl'];
        
        if (!supportedFormats.includes(fileExtension || '')) {
            console.error(`Unsupported file format: ${fileExtension}`);
            alert(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
            return;
        }

        this.vishva.filePath = "dropped";
        this.vishva.file = file.name;

        // Create object URL from the file
        const objectURL = URL.createObjectURL(file);

        // Store the file map in the scene for the custom request handler
        if (fileMap) {
            (this.vishva.scene as any)._droppedFileMap = fileMap;
        }

        // Use pluginExtension parameter to specify the file type
        SceneLoader.ImportMesh("",
            objectURL,
            "",
            this.vishva.scene,
            (meshes, particleSystems, skeletons, animationGroups) => {
                // Clean up the object URL after loading
                URL.revokeObjectURL(objectURL);
                
                // Clean up file map URLs
                if (fileMap) {
                    fileMap.forEach(url => URL.revokeObjectURL(url));
                    delete (this.vishva.scene as any)._droppedFileMap;
                }
                
                return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file.name, "dropped");
            },
            undefined,
            (scene, message, exception) => {
                console.error("Error loading dropped file:", message, exception);
                URL.revokeObjectURL(objectURL);
                
                // Clean up file map URLs on error
                if (fileMap) {
                    fileMap.forEach(url => URL.revokeObjectURL(url));
                    delete (this.vishva.scene as any)._droppedFileMap;
                }
                
                alert(`Failed to load ${file.name}: ${message}`);
            },
            "." + fileExtension
        );
    }

    /**
     * Initialize drag and drop handlers on the canvas
     */
    public setupDragAndDrop(canvas: HTMLCanvasElement) {
        // Set up custom file request handler for dropped files
        this.setupCustomFileHandler();
        
        canvas.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }
        });

        canvas.addEventListener('drop', async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            canvas.classList.remove('world-drop-target');

            if (e.dataTransfer && e.dataTransfer.items) {
                const items = Array.from(e.dataTransfer.items);
                const files: File[] = [];
                
                // Collect all files (including from folders if supported)
                for (const item of items) {
                    if (item.kind === 'file') {
                        const file = item.getAsFile();
                        if (file) {
                            files.push(file);
                        }
                        
                        // Try to get folder contents if available
                        const entry = item.webkitGetAsEntry?.();
                        if (entry && entry.isDirectory) {
                            await this.readDirectory(entry as any, files);
                        }
                    }
                }
                
                // Check if any dropped file is a .tar.gz world file
                const worldFile = files.find(f => isTarGzFile(f.name));
                if (worldFile) {
                    this.loadWorldFromFile(worldFile);
                } else {
                    // Check if any dropped file is a .json world file
                    const jsonWorldFile = files.find(f => isJsonWorldFile(f.name));
                    if (jsonWorldFile) {
                        this.loadWorldFromJsonFile(jsonWorldFile);
                    } else {
                        this.processDroppedFiles(files);
                    }
                }
            } else if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                
                // Check if any dropped file is a .tar.gz world file
                const worldFile = files.find(f => isTarGzFile(f.name));
                if (worldFile) {
                    this.loadWorldFromFile(worldFile);
                } else {
                    // Check if any dropped file is a .json world file
                    const jsonWorldFile = files.find(f => isJsonWorldFile(f.name));
                    if (jsonWorldFile) {
                        this.loadWorldFromJsonFile(jsonWorldFile);
                    } else {
                        this.processDroppedFiles(files);
                    }
                }
            }
        });

        canvas.addEventListener('dragenter', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer && e.dataTransfer.items) {
                // During dragenter, filenames aren't available — check MIME types
                // that commonly correspond to .tar.gz files
                const gzipTypes = ['application/gzip', 'application/x-gzip', 'application/x-compressed-tar'];
                const hasWorldFile = Array.from(e.dataTransfer.items).some(
                    item => item.kind === 'file' && gzipTypes.includes(item.type)
                );
                if (hasWorldFile) {
                    canvas.classList.add('world-drop-target');
                }
            }
        });

        canvas.addEventListener('dragleave', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove if leaving the canvas (not entering a child element)
            if (e.relatedTarget === null || !canvas.contains(e.relatedTarget as Node)) {
                canvas.classList.remove('world-drop-target');
            }
        });
    }
    /**
     * Setup custom file handler to intercept file requests for dropped files.
     * Overrides both Tools.LoadFile (for text/binary files like .mtl) and
     * Tools.PreprocessUrl (for texture images like .tga, .png, .jpg) so that
     * ALL dependency files uploaded alongside a model are resolved from blob URLs.
     */
    private setupCustomFileHandler() {
        // Store the original functions
        const originalLoadFile = Tools.LoadFile;
        const originalPreprocessUrl = Tools.PreprocessUrl;
        const self = this;

        // Override Tools.PreprocessUrl to intercept texture/image loading
        // BabylonJS calls this for EVERY URL (including texture images) before loading.
        Tools.PreprocessUrl = function (url: string): string {
            const fileMap = (self.vishva.scene as any)._droppedFileMap as Map<string, string> | undefined;

            if (fileMap && typeof url === 'string') {
                // Extract filename from the URL
                const cleanUrl = url.split('?')[0].split('#')[0];
                const urlParts = cleanUrl.split('/');
                const filename = urlParts[urlParts.length - 1];

                // Check if this file is in our dropped files map
                if (fileMap.has(filename)) {
                    const blobUrl = fileMap.get(filename)!;
                    console.log(`PreprocessUrl intercepted request for ${filename}, using blob URL`);
                    return blobUrl;
                }
            }

            // Fall through to original behavior
            return originalPreprocessUrl(url);
        };

        // Override Tools.LoadFile to intercept text/binary file requests (e.g. .mtl)
        (Tools as any).LoadFile = (
            fileOrUrl: any,
            onSuccess: (data: string | ArrayBuffer, responseURL?: string) => void,
            onProgress?: (data: any) => void,
            offlineProvider?: any,
            useArrayBuffer?: boolean,
            onError?: (request?: any, exception?: any) => void
        ) => {
            // Check if we have a file map in the scene
            const fileMap = (this.vishva.scene as any)._droppedFileMap as Map<string, string> | undefined;

            if (fileMap && typeof fileOrUrl === 'string') {
                // Extract filename from the URL
                const urlParts = fileOrUrl.split('/');
                const filename = urlParts[urlParts.length - 1].split('?')[0].split('#')[0];

                // Check if this file is in our dropped files map
                if (fileMap.has(filename)) {
                    const blobUrl = fileMap.get(filename)!;
                    console.log(`LoadFile intercepted request for ${filename}, using blob URL`);

                    // Use the blob URL instead
                    return originalLoadFile(blobUrl, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError);
                }
            }

            // Fall back to original behavior
            return originalLoadFile(fileOrUrl, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError);
        };
    }



    /**
     * Read all files from a directory entry
     */
    private async readDirectory(dirEntry: any, files: File[]): Promise<void> {
        const reader = dirEntry.createReader();
        
        return new Promise((resolve) => {
            const readEntries = () => {
                reader.readEntries(async (entries: any[]) => {
                    if (entries.length === 0) {
                        resolve();
                        return;
                    }
                    
                    for (const entry of entries) {
                        if (entry.isFile) {
                            const file = await this.getFileFromEntry(entry);
                            if (file) files.push(file);
                        } else if (entry.isDirectory) {
                            await this.readDirectory(entry, files);
                        }
                    }
                    
                    // Continue reading (directories may have more entries)
                    readEntries();
                });
            };
            
            readEntries();
        });
    }

    /**
     * Get File object from FileSystemFileEntry
     */
    private getFileFromEntry(fileEntry: any): Promise<File | null> {
        return new Promise((resolve) => {
            fileEntry.file((file: File) => resolve(file), () => resolve(null));
        });
    }

    /**
     * Process dropped files and load the main asset
     */
    public processDroppedFiles(files: File[]) {
        if (files.length === 0) return;
        
        console.log(`Processing ${files.length} dropped file(s)`);
        
        // Find the main model file(s)
        const modelExtensions = ['gltf', 'glb', 'obj', 'babylon', 'stl'];
        const modelFiles = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ext && modelExtensions.includes(ext);
        });
        
        if (modelFiles.length === 0) {
            alert('No supported 3D model files found. Supported formats: ' + modelExtensions.join(', '));
            return;
        }
        
        // Create a map of all files by name for dependency resolution
        const fileMap = new Map<string, string>();
        files.forEach(file => {
            const objectURL = URL.createObjectURL(file);
            fileMap.set(file.name, objectURL);
            console.log(`Mapped ${file.name} to blob URL`);
        });
        
        // Load each model file with the file map for dependency resolution
        modelFiles.forEach(modelFile => {
            this.loadDroppedAsset(modelFile, fileMap);
        });
    }

}
