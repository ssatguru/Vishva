import {
    AbstractMesh, AnimationGroup, AnimationRange, ArcRotateCamera, AssetContainer, AssetsManager, BoundingInfo,
    InstancedMesh, IParticleSystem, Material, Matrix, Mesh, MultiMaterial, Quaternion, Ray, Scene,
    SceneLoader, Skeleton, StandardMaterial, Tags, TextFileAssetTask, Tools, TransformNode, Vector3, VertexBuffer, Color3
} from "babylonjs";
import { PlacementCalculator, PlacementContext, PlacementMode, Vector3 as PlacementVector3 } from "./PlacementCalculator";
import { VishvaSerialized, ObjectIdMap, MeshMetadataMap } from "../VishvaSerialized";
import { RuntimeSharingEntry, getRootMesh } from "../util/AnimGroupDedup";
import { deduplicateRangesAtRuntime } from "../util/AnimRangeDedup";
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
    private _lastCanvasPointerPosition: { x: number; y: number } | null = null;
    public _pendingDropEvent: DragEvent | null = null;

    constructor(vishva: any) {
        this.vishva = vishva;
    }

    // ─── IndexedDB helpers (shared "VishvaWorlds" / "worlds" store) ─────────

    private static readonly DB_NAME = "VishvaWorlds";
    private static readonly STORE_NAME = "worlds";

    /**
     * Open the VishvaWorlds IndexedDB, creating the object store if needed.
     */
    private _openWorldsDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(LoadManager.DB_NAME, 1);

            request.onerror = () => reject(new Error("Failed to open IndexedDB"));

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(LoadManager.STORE_NAME)) {
                    db.createObjectStore(LoadManager.STORE_NAME, { keyPath: "name" });
                }
            };

            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Store raw ArrayBuffer in IndexedDB under the given key.
     */
    private async _storeInIndexedDB(key: string, data: ArrayBuffer): Promise<void> {
        const db = await this._openWorldsDB();
        try {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction([LoadManager.STORE_NAME], "readwrite");
                const store = transaction.objectStore(LoadManager.STORE_NAME);
                const putRequest = store.put({ name: key, data: data, timestamp: Date.now() });
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(new Error("Failed to store data in IndexedDB"));
            });
        } finally {
            db.close();
        }
    }

    /**
     * Retrieve raw ArrayBuffer from IndexedDB by key.
     * Returns the data field if found, or null if not found.
     */
    private async _getFromIndexedDB(key: string): Promise<ArrayBuffer | null> {
        const db = await this._openWorldsDB();
        try {
            return await new Promise<ArrayBuffer | null>((resolve, reject) => {
                const transaction = db.transaction([LoadManager.STORE_NAME], "readonly");
                const store = transaction.objectStore(LoadManager.STORE_NAME);
                const getRequest = store.get(key);
                getRequest.onsuccess = () => {
                    const result = getRequest.result;
                    resolve(result && result.data ? result.data : null);
                };
                getRequest.onerror = () => reject(new Error("Failed to retrieve data from IndexedDB"));
            });
        } finally {
            db.close();
        }
    }

    /**
     * Delete an entry from IndexedDB by key.
     * Resolves on success (no-op if key doesn't exist).
     */
    private async _deleteFromIndexedDB(key: string): Promise<void> {
        const db = await this._openWorldsDB();
        try {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction([LoadManager.STORE_NAME], "readwrite");
                const store = transaction.objectStore(LoadManager.STORE_NAME);
                const deleteRequest = store.delete(key);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(new Error("Failed to delete data from IndexedDB"));
            });
        } finally {
            db.close();
        }
    }

    // ─── Shared archive asset ingestion ─────────────────────────────────────

    /**
     * Ingest archive assets into AssetStore and activate an AssetResolver.
     * Handles both "vishva/assets/" (structured) and "assets/" (legacy) prefixes.
     * Returns the activated AssetResolver, or null if the archive had no assets.
     */
    private async _ingestArchiveAssets(files: Map<string, Uint8Array>): Promise<AssetResolver | null> {
        const hasStructuredAssets = Array.from(files.keys()).some(key => key.startsWith("vishva/assets/"));
        const hasLegacyAssets = Array.from(files.keys()).some(key => key.startsWith("assets/"));

        if (!hasStructuredAssets && !hasLegacyAssets) {
            return null;
        }

        const assetStore = new AssetStore();
        await assetStore.open();

        await assetStore.clearSession();

        // Build entries for batch insert, remapping legacy paths to structured format
        const entries: Array<{ key: string; data: Uint8Array }> = [];
        for (const [key, data] of files.entries()) {
            if (key.startsWith("vishva/assets/")) {
                entries.push({ key, data });
            } else if (key.startsWith("assets/")) {
                // Remap old format: "assets/foo.png" → "vishva/assets/foo.png"
                entries.push({ key: "vishva/" + key, data });
            }
        }

        await assetStore.putBatch(entries);

        // Store AssetStore reference for SaveManager
        this.vishva._assetStore = assetStore;

        // Activate AssetResolver with AssetStore (async)
        const assetResolver = new AssetResolver();
        await assetResolver.activate(assetStore);

        return assetResolver;
    }

    // ─── Shared VishvaSerialized application ────────────────────────────────

    /**
     * Apply VishvaSerialized settings to the Vishva instance.
     * Shared by both the legacy single-file loader and the archive loader.
     */
    private applyVishvaSettings(vishvaSerialized: any): void {
        this.umarshalVec3(vishvaSerialized);

        if (!vishvaSerialized.avSerialized.settings.ellipsoid) {
            vishvaSerialized.avSerialized.settings.ellipsoid = new Vector3(0.15, 0.8, 0.15);
            vishvaSerialized.avSerialized.settings.ellipsoidOffset = new Vector3(0.0, 0.8, 0.0);
        }

        this.vishva.vishvaSerialized = vishvaSerialized;

        if (vishvaSerialized !== undefined) {
            console.log("world babylon version : " + vishvaSerialized.bVer);
            console.log("world vishva version : " + vishvaSerialized.vVer);

            this.vishva.snas = vishvaSerialized.snas;
            this.vishva._cameraCollision = vishvaSerialized.settings.cameraCollision;
            this.vishva.autoEditMenu = vishvaSerialized.settings.autoEditMenu;
            if (vishvaSerialized.misc.skyColor) {
                this.vishva.skyColor.r = vishvaSerialized.misc.skyColor.r;
                this.vishva.skyColor.g = vishvaSerialized.misc.skyColor.g;
                this.vishva.skyColor.b = vishvaSerialized.misc.skyColor.b;
                this.vishva.skyColor.a = vishvaSerialized.misc.skyColor.a;
            }

            if (typeof vishvaSerialized.misc.skyBright !== "undefined") {
                this.vishva.skyBright = vishvaSerialized.misc.skyBright;
            }

            if (typeof vishvaSerialized.misc.sceneShadowsEnabled !== "undefined") {
                this.vishva.scene.shadowsEnabled = vishvaSerialized.misc.sceneShadowsEnabled;
            }

            this.vishva._objectIds = vishvaSerialized.objectIds || null;
            this.vishva._meshMetadata = vishvaSerialized.meshMetadata || {};
        } else {
            this.vishva.vishvaSerialized = new VishvaSerialized();
        }
    }

    // ─── Decompression / extraction utilities ───────────────────────────────

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
     * Decompress and extract a tar.gz buffer, returning the file map.
     */
    private async _decompressAndExtract(data: ArrayBuffer | Blob): Promise<Map<string, Uint8Array>> {
        const blob = data instanceof Blob ? data : new Blob([data]);
        const decompressedData = await this._decompressGzip(blob);
        return this._extractTarArchive(decompressedData);
    }

    /**
     * Validate that a tar archive contains the required world entries.
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
     * Parse Vishva.json and Scene.babylon from an archive file map.
     */
    private _parseWorldFiles(files: Map<string, Uint8Array>): { vishvaObj: any; sceneObj: any } {
        const vishvaData = files.get("Vishva.json");
        const sceneData = files.get("Scene.babylon");

        if (!vishvaData) throw new Error("Vishva.json not found in archive");
        if (!sceneData) throw new Error("Scene.babylon not found in archive");

        const vishvaObj = JSON.parse(new TextDecoder().decode(vishvaData));
        const sceneObj = JSON.parse(new TextDecoder().decode(sceneData));
        return { vishvaObj, sceneObj };
    }

    // ─── Drop event file routing ────────────────────────────────────────────

    /**
     * Route dropped files to the appropriate loader:
     * tar.gz → loadWorldFromFile, .json world → loadWorldFromJsonFile, else → processDroppedFiles
     */
    private routeDroppedFiles(files: File[]): void {
        const worldFile = files.find(f => isTarGzFile(f.name));
        if (worldFile) {
            this.loadWorldFromFile(worldFile);
            return;
        }

        const jsonWorldFile = files.find(f => isJsonWorldFile(f.name));
        if (jsonWorldFile) {
            this.loadWorldFromJsonFile(jsonWorldFile);
            return;
        }

        this.processDroppedFiles(files);
    }

    // ─── World loading entry points ─────────────────────────────────────────

    public sceneLoad1(scenePath: string, sceneFile: string, scene: Scene) {
        console.debug("sceneLoad1");
        const isCompressedFile = sceneFile.toLowerCase().endsWith('.gz');
        
        if (isCompressedFile) {
            this.loadZipWorld(scenePath, sceneFile, scene);
        } else {
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
     * Load world from gzip compressed TAR archive.
     * Assets are stored in AssetStore (IndexedDB) rather than held in memory.
     */
    private async loadZipWorld(scenePath: string, sceneFile: string, scene: Scene) {
        console.debug("loadZipWorld");
        try {
            this.vishva.progressManager.show("Loading World", "Fetching world file from server...");
            await this.vishva.progressManager.update(undefined, 5);

            await this.vishva.progressManager.update("Fetching world file from server...", 10);
            
            const response = await fetch(scenePath + sceneFile);
            if (!response.ok) {
                throw new Error(`Failed to load ${sceneFile}: ${response.statusText}`);
            }
            
            await this.vishva.progressManager.update("Decompressing world file...", 30);
            
            const compressedBlob = await response.blob();

            await this.vishva.progressManager.update("Extracting world data...", 50);
            
            let files = await this._decompressAndExtract(compressedBlob);
            
            const { vishvaObj, sceneObj } = this._parseWorldFiles(files);
            
            await this.vishva.progressManager.update("Loading scene...", 70);
            
            try {
                await this.vishva.progressManager.update("Storing assets in browser...", 75);
                const assetResolver = await this._ingestArchiveAssets(files);
                files = null as any; // Release in-memory tar data

                await this.vishva.progressManager.update("Activating asset resolver...", 85);
                this.loadVishvaPartFromObjects(vishvaObj, sceneObj, assetResolver);
            } catch (e) {
                this.vishva.progressManager.hide();
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert(errorMessage);
                return;
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
     */
    public async validateWorldFile(data: ArrayBuffer): Promise<{ valid: boolean; error?: string }> {
        try {
            const files = await this._decompressAndExtract(data);
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
            this.vishva.progressManager.show("Preparing world for reload...");

            const arrayBuffer = await file.arrayBuffer();

            const validation = await this.validateWorldFile(arrayBuffer);
            if (!validation.valid) {
                this.vishva.progressManager.hide();
                alert(validation.error);
                return;
            }

            try {
                await this._storeInIndexedDB("__uploaded", arrayBuffer);
            } catch (e) {
                this.vishva.progressManager.hide();
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert("Failed to save world for reload: " + errorMessage);
                return;
            }

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
     */
    public async loadWorldFromJsonFile(file: File): Promise<void> {
        try {
            this.vishva.progressManager.show("Preparing world for reload...");

            const text = await file.text();

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

                const vishvaData = sceneObj["VishvaSerialized"];
                if (!vishvaData) {
                    alert("Not a valid Vishva world file: missing VishvaSerialized data");
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                    return;
                }

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
                let files = await this._decompressAndExtract(data);

                const validation = this.validateWorldArchive(files);
                if (!validation.valid) {
                    alert(validation.error);
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                    return;
                }

                const { vishvaObj, sceneObj } = this._parseWorldFiles(files);

                try {
                    const assetResolver = await this._ingestArchiveAssets(files);
                    files = null as any;
                    this.loadVishvaPartFromObjects(vishvaObj, sceneObj, assetResolver);
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    alert(errorMessage);
                    this.vishva.loadBabylonjsPart(this.vishva.scene, true);
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
     */
    public async loadSavedWorld(worldName: string): Promise<void> {
        this.vishva.progressManager.show("Loading World", "Reading saved world from browser...");
        try {
            const assetStore = new AssetStore();
            try {
                await assetStore.open();
            } catch (e) {
                this.vishva.progressManager.hide();
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert(errorMessage);
                return;
            }

            await assetStore.clearSession();

            await this.vishva.progressManager.update("Reading saved assets...", 20);

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

                this.vishva._assetStore = assetStore;

                await this.vishva.progressManager.update("Loading scene...", 90);
                this.loadVishvaPartFromObjects(vishvaData, sceneObj);
                return;
            }

            // Full world format with separate Vishva.json + Scene.babylon + assets
            const vishvaKey = savedKeys.find(k => k === "Vishva.json");
            const sceneKey = savedKeys.find(k => k === "Scene.babylon");

            if (!vishvaKey || !sceneKey) {
                this.vishva.progressManager.hide();
                alert("Saved world is incomplete: missing Vishva.json or Scene.babylon");
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                return;
            }

            const vishvaRaw = await assetStore.getSavedAsset(worldName, "Vishva.json");
            const sceneRaw = await assetStore.getSavedAsset(worldName, "Scene.babylon");

            if (!vishvaRaw || !sceneRaw) {
                this.vishva.progressManager.hide();
                alert("Saved world data is missing or corrupted");
                this.vishva.loadBabylonjsPart(this.vishva.scene, true);
                return;
            }

            const vishvaObj = JSON.parse(new TextDecoder().decode(vishvaRaw));
            const sceneObj = JSON.parse(new TextDecoder().decode(sceneRaw));

            await this.vishva.progressManager.update("Copying assets to session...", 50);

            const assetKeys = savedKeys.filter(k => k !== "Vishva.json" && k !== "Scene.babylon");
            for (const key of assetKeys) {
                const data = await assetStore.getSavedAsset(worldName, key);
                if (data) {
                    await assetStore.put(key, data);
                }
            }

            await this.vishva.progressManager.update("Activating asset resolver...", 80);

            this.vishva._assetStore = assetStore;

            const assetResolver = new AssetResolver();
            await assetResolver.activate(assetStore);

            await this.vishva.progressManager.update("Loading scene...", 90);

            this.loadVishvaPartFromObjects(vishvaObj, sceneObj, assetResolver);

        } catch (e) {
            this.vishva.progressManager.hide();
            console.error("Error loading saved world:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert("Failed to load saved world: " + errorMessage);
            this.vishva.loadBabylonjsPart(this.vishva.scene, true);
        }
    }

    // ─── Core scene loading ─────────────────────────────────────────────────

    /**
     * Load Vishva data from separate objects (archive format or pre-parsed).
     * @param vishvaData The parsed Vishva.json object
     * @param sceneData The parsed Scene.babylon object
     * @param assetResolver Optional AssetResolver to deactivate after scene load (null = no resolver)
     */
    private loadVishvaPartFromObjects(vishvaData: any, sceneData: any, assetResolver?: AssetResolver | null) {
        this.vishva.progressManager.update("Processing vishva data...", 90);
        
        // Resolve assets/ paths in VishvaSerialized to blob URLs before use.
        if (assetResolver) {
            assetResolver.resolveAssetPaths(vishvaData);
            this.vishva._assetResolver = assetResolver;
        }

        this.applyVishvaSettings(vishvaData);

        this.vishva.progressManager.update("Processing scene data...", 95);
        var sceneDataStr: string = "data:" + JSON.stringify(sceneData);
        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.Append("", sceneDataStr, this.vishva.scene, (scene) => { 
            // Deactivate asset resolver AFTER all textures have finished loading.
            if (assetResolver) {
                scene.executeWhenReady(() => {
                    assetResolver.deactivate();
                });
            }
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

    /**
     * Legacy single-file loader (non-archive format).
     * Parses the combined JSON (Scene + VishvaSerialized) from a TextFileAssetTask.
     */
    private loadVishvaPart(tsk: TextFileAssetTask) {
        let tfat: TextFileAssetTask = tsk;
        let foo: Object = <Object>JSON.parse(tfat.text);

        const vishvaSerialized = foo["VishvaSerialized"];
        this.applyVishvaSettings(vishvaSerialized);

        var sceneData: string = "data:" + tfat.text;
        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.Append("", sceneData, this.vishva.scene, (scene) => { return this.vishva.loadBabylonjsPart(scene) });
    }

    // ─── Asset loading (curated / user / dropped) ───────────────────────────

    /**
     * Load internal/curated assets.
     * @param flat  if true the asset sits directly in the category folder (no subfolder)
     */
    public loadCurAsset(category: string, asset: string, flat: boolean = false) {
        console.log("loading curated ", category, asset);
        this.vishva.filePath = category;
        this.vishva.file = asset;

        const basePath = this.vishva.constructor.vHome + "assets/curated/" + category + "/";
        const assetPath = flat ? basePath : basePath + asset.split(".")[0] + "/";

        SceneLoader.ImportMesh("",
            assetPath,
            asset,
            this.vishva.scene,
            (meshes, particleSystems, skeletons, animationGroups) => { return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, asset, "curated", category) });
    }

    /**
     * Load user asset via LoadAssetContainer (adds all to scene).
     */
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

    /**
     * Load user asset via ImportMesh.
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

    /**
     * Load user asset via Append (scene-level merge).
     */
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

    /**
     * Load asset from a dropped file.
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

        const objectURL = URL.createObjectURL(file);

        if (fileMap) {
            (this.vishva.scene as any)._droppedFileMap = fileMap;
        }

        SceneLoader.ImportMesh("",
            objectURL,
            "",
            this.vishva.scene,
            (meshes, particleSystems, skeletons, animationGroups) => {
                URL.revokeObjectURL(objectURL);
                
                if (fileMap) {
                    fileMap.forEach(url => URL.revokeObjectURL(url));
                    delete (this.vishva.scene as any)._droppedFileMap;
                }
                
                return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file.name, "dropped", undefined, 'drop');
            },
            undefined,
            (scene, message, exception) => {
                console.error("Error loading dropped file:", message, exception);
                URL.revokeObjectURL(objectURL);
                
                if (fileMap) {
                    fileMap.forEach(url => URL.revokeObjectURL(url));
                    delete (this.vishva.scene as any)._droppedFileMap;
                }
                
                alert(`Failed to load ${file.name}: ${message}`);
            },
            "." + fileExtension
        );
    }

    // ─── Mesh post-load processing ──────────────────────────────────────────

    private reuseAnimationGroup(destAG: AnimationGroup): RuntimeSharingEntry | null {
        let sourceAG = this.vishva.scene.getAnimationGroupByName(destAG.name);
        if (sourceAG && sourceAG !== destAG) {
            for (let destTA of destAG.targetedAnimations) {
                let sourceTA = sourceAG.targetedAnimations.find(srcTA => srcTA.animation.name === destTA.animation.name);
                if (sourceTA) {
                    destTA.animation = sourceTA.animation;
                }
            }

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

    public onMeshLoaded(meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[], file: string, assetType: string, folder?: string, loadType?: 'dialog' | 'drop', dropEvent?: DragEvent) {
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

        // Deduplicate skeleton bone animations (animation ranges) for newly loaded assets.
        this.vishva._animationRangeSharing = deduplicateRangesAtRuntime(this.vishva.scene);

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
            this.vishva.rootSelected = true;
        } else {
            if (rootMesh != null) {
                 this.vishva.rootSelected = true;
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
            scaleNum = sf.x;
        }
        
        // Check if this load was triggered by an internal asset drag-and-drop
        const effectiveLoadType = this._pendingDropEvent ? 'drop' : (loadType || 'dialog');
        const effectiveDropEvent = this._pendingDropEvent || dropEvent;
        this._pendingDropEvent = null;
        
        this.postionAsset(rootMesh, scaleNum, effectiveLoadType, effectiveDropEvent);

        EventManager.publish(VEvent._WORLD_ITEMS_CHANGED);
    }

    // ─── Placement ──────────────────────────────────────────────────────────

    /**
     * Cast a ray against the ground mesh and return the hit point or null.
     */
    private pickGround(ray: Ray): PlacementVector3 | null {
        if (!this.vishva.ground) return null;

        const hit = this.vishva.ground.intersects(ray, false);
        if (hit.hit && hit.distance <= PlacementCalculator.RAY_MAX_DISTANCE && hit.pickedPoint) {
            return { x: hit.pickedPoint.x, y: hit.pickedPoint.y, z: hit.pickedPoint.z };
        }
        return null;
    }

    /**
     * Create a picking ray from screen coordinates and pick the ground mesh.
     */
    private pickGroundAtScreenPoint(x: number, y: number): PlacementVector3 | null {
        if (!this.vishva.ground) return null;

        const scene: Scene = this.vishva.scene;
        const canvas = scene.getEngine().getRenderingCanvas();
        let canvasX = x;
        let canvasY = y;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            canvasX = x - rect.left;
            canvasY = y - rect.top;
        }
        const ray = scene.createPickingRay(canvasX, canvasY, Matrix.Identity(), scene.activeCamera);
        return this.pickGround(ray);
    }

    /**
     * Build a PlacementContext from current scene state for use by PlacementCalculator.
     */
    private buildPlacementContext(rootMesh: TransformNode, loadType: 'dialog' | 'drop', dropEvent?: DragEvent): PlacementContext {
        let mode: PlacementMode;
        if (loadType === 'drop') {
            mode = 'cursor';
        } else if (this.vishva.isFocusOnAv === true) {
            mode = 'camera-direction';
        } else {
            mode = 'ground-raycast';
        }

        const camera = this.vishva.scene.activeCamera;
        const camWorldPos = camera.globalPosition || camera.position;
        const cameraPosition: PlacementVector3 = {
            x: camWorldPos.x,
            y: camWorldPos.y,
            z: camWorldPos.z
        };

        const forwardDir = camera.getForwardRay().direction;
        const cameraDirection: PlacementVector3 = {
            x: forwardDir.x,
            y: forwardDir.y,
            z: forwardDir.z
        };

        let cameraTarget: PlacementVector3;
        if (camera instanceof ArcRotateCamera) {
            const t = camera.target;
            cameraTarget = { x: t.x, y: t.y, z: t.z };
        } else {
            cameraTarget = {
                x: cameraPosition.x + cameraDirection.x,
                y: cameraPosition.y + cameraDirection.y,
                z: cameraPosition.z + cameraDirection.z
            };
        }

        let avatarPosition: PlacementVector3 | undefined;
        let avatarForward: PlacementVector3 | undefined;
        if (this.vishva.avatar) {
            const avPos = this.vishva.avatar.position;
            avatarPosition = { x: avPos.x, y: avPos.y, z: avPos.z };

            let dist = 1;
            if (this.vishva.avManager.cc.getSettings().faceForward) {
                dist = -1;
            }
            const fwd = this.vishva.avatar.getDirection(new Vector3(0, 0, dist));
            avatarForward = { x: fwd.x, y: fwd.y, z: fwd.z };
        }

        const groundExists = this.vishva.ground != null;

        const bb = rootMesh.getHierarchyBoundingVectors();
        const boundingBox = {
            min: { x: bb.min.x, y: bb.min.y, z: bb.min.z } as PlacementVector3,
            max: { x: bb.max.x, y: bb.max.y, z: bb.max.z } as PlacementVector3
        };

        let pickPoint: PlacementVector3 | null | undefined;
        if (mode === 'cursor') {
            if (dropEvent) {
                pickPoint = this.pickGroundAtScreenPoint(dropEvent.clientX, dropEvent.clientY);
            } else if (this._lastCanvasPointerPosition) {
                pickPoint = this.pickGroundAtScreenPoint(
                    this._lastCanvasPointerPosition.x,
                    this._lastCanvasPointerPosition.y
                );
            } else {
                pickPoint = null;
            }
        }

        return {
            mode,
            cameraPosition,
            cameraDirection,
            cameraTarget,
            avatarPosition,
            avatarForward,
            isFocusOnAv: this.vishva.isFocusOnAv === true,
            groundMesh: { exists: groundExists },
            pickPoint,
            boundingBox
        };
    }

    public postionAsset(rootMesh: TransformNode, scaleNum: number, loadType: 'dialog' | 'drop' = 'dialog', dropEvent?: DragEvent) {
        if (rootMesh == null) return;

        const ctx = this.buildPlacementContext(rootMesh, loadType, dropEvent);

        const calc = new PlacementCalculator();
        let result;

        switch (ctx.mode) {
            case 'camera-direction':
                result = calc.computeCameraDirectionPlacement(ctx);
                break;
            case 'ground-raycast': {
                const ray = new Ray(
                    new Vector3(ctx.cameraPosition.x, ctx.cameraPosition.y, ctx.cameraPosition.z),
                    new Vector3(ctx.cameraDirection.x, ctx.cameraDirection.y, ctx.cameraDirection.z),
                    PlacementCalculator.RAY_MAX_DISTANCE
                );
                const hitPoint = this.pickGround(ray);
                result = calc.computeGroundRaycastPlacement(ctx, hitPoint);
                break;
            }
            case 'cursor':
                result = calc.computeCursorPlacement(ctx);
                break;
        }

        rootMesh.position = new Vector3(result.position.x, result.position.y, result.position.z);

        if (!this.vishva.isMeshSelected) {
            this.vishva.selectForEdit(rootMesh);
        } else {
            this.vishva.switchEditControl(rootMesh);
        }
        this.vishva.rootSelected = true;
        this.vishva.animateMesh(rootMesh);
    }

    // ─── Material & mesh post-processing ────────────────────────────────────

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

    private postLoad(meshes: AbstractMesh[], assetType: string, folder: string, file: string)
    {
        let reuseMaterials = false;
        let removeMat: Material[] = [];
        if (meshes.length > 0)
        {
            for (let mesh of meshes)
            {
                if (!(mesh instanceof Mesh)) continue;
                reuseMaterials = false;
                if (assetType == "curated" && curatedConfig)
                {
                    if ('collision' in curatedConfig) mesh.checkCollisions = <boolean> curatedConfig.collision;
                    if ('reuseMaterial' in curatedConfig) reuseMaterials = <boolean>curatedConfig.reuseMaterial;
                    if (folder in curatedConfig)
                    {
                        if ('collision' in curatedConfig[folder])
                            mesh.checkCollisions = curatedConfig[folder]['collision'];
                        if ('reuseMaterial' in curatedConfig[folder])
                            reuseMaterials = curatedConfig[folder]['reuseMaterial'];
                        if (file in curatedConfig[folder])
                        {
                            if ('collision' in curatedConfig[folder][file])
                                mesh.checkCollisions = curatedConfig[folder][file]['collision'];
                            if ('reuseMaterial' in curatedConfig[folder][file])
                                reuseMaterials = curatedConfig[folder][file]['reuseMaterial'];
                        }
                    }
                }
                if (reuseMaterials)
                {
                    this.processMaterial(mesh, removeMat, m => this.reuseMaterial(m));
                } else
                {
                    this.processMaterial(mesh, removeMat, m => this.makeMatIdUnique(m));
                }
                this.processMaterial(mesh, removeMat, m => this.removeSpecular(m));
            }
        }
        if (removeMat.length > 0)
        {
            removeMat.forEach(mat =>
            {
                this.vishva.scene.removeMaterial(mat);
                mat.dispose();
            })
        }
    }

    private processMaterial(mesh: AbstractMesh, removeMat:Material[], f: (mat: Material) => Material) {
        if (mesh.material != null) {
            if (mesh.material instanceof MultiMaterial) {
                var mm: MultiMaterial = <MultiMaterial>mesh.material;
                var mats: Material[] = mm.subMaterials;
                for (let i = 0; i < mats.length; i++) {
                    let m = f(mats[i]);
                    if (mats[i] !== m){
                        removeMat.push(mats[i]);
                        mats[i] = m;
                    }
                }
            } else {
                mesh.material = f(mesh.material);
            }
        }
    }

    private reuseMaterial(mat: Material): Material
    {
        let checkFor = mat.id;
        if (!mat.id.endsWith("@cur")) checkFor = mat.id + "@cur";
        let m = this.vishva.scene.getLastMaterialById(checkFor, true);
        if (m != null)
        {
            return m;
        } else
        {
            mat.id=checkFor;
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

    // ─── Drag and drop ──────────────────────────────────────────────────────

    /**
     * Initialize drag and drop handlers on the canvas
     */
    public setupDragAndDrop(canvas: HTMLCanvasElement) {
        canvas.addEventListener('pointermove', (e: PointerEvent) => {
            this._lastCanvasPointerPosition = { x: e.clientX, y: e.clientY };
        });

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

            // Check if this is an internal asset drag from the asset dialog
            if (e.dataTransfer && e.dataTransfer.getData('vishva/asset')) {
                const assetData = JSON.parse(e.dataTransfer.getData('vishva/asset'));
                this._lastCanvasPointerPosition = { x: e.clientX, y: e.clientY };
                this._pendingDropEvent = e;
                const className: string = assetData.className;
                const id: string = assetData.id;
                if (className === "skyboxes") {
                    this.vishva.setSky(id);
                } else if (className === "primitives") {
                    this.vishva.addPrim(id);
                } else if (className === "particles") {
                    this.vishva.createParticles(id);
                } else if (className.endsWith("_flat")) {
                    const category = className.slice(0, -"_flat".length);
                    this.loadCurAsset(category, id, true);
                } else {
                    this.loadCurAsset(className, id);
                }
                return;
            }

            if (e.dataTransfer && e.dataTransfer.items) {
                const items = Array.from(e.dataTransfer.items);
                const files: File[] = [];
                
                for (const item of items) {
                    if (item.kind === 'file') {
                        const file = item.getAsFile();
                        if (file) {
                            files.push(file);
                        }
                        
                        const entry = item.webkitGetAsEntry?.();
                        if (entry && entry.isDirectory) {
                            await this.readDirectory(entry as any, files);
                        }
                    }
                }
                
                if (files.length === 0) return;
                
                this.routeDroppedFiles(files);
            } else if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                this.routeDroppedFiles(files);
            }
        });

        canvas.addEventListener('dragenter', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer && e.dataTransfer.items) {
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
            if (e.relatedTarget === null || !canvas.contains(e.relatedTarget as Node)) {
                canvas.classList.remove('world-drop-target');
            }
        });
    }

    /**
     * Setup custom file handler to intercept file requests for dropped files.
     */
    private setupCustomFileHandler() {
        const originalLoadFile = Tools.LoadFile;
        const originalPreprocessUrl = Tools.PreprocessUrl;
        const self = this;

        Tools.PreprocessUrl = function (url: string): string {
            const fileMap = (self.vishva.scene as any)._droppedFileMap as Map<string, string> | undefined;

            if (fileMap && typeof url === 'string') {
                const cleanUrl = url.split('?')[0].split('#')[0];
                const urlParts = cleanUrl.split('/');
                const filename = urlParts[urlParts.length - 1];

                if (fileMap.has(filename)) {
                    const blobUrl = fileMap.get(filename)!;
                    console.log(`PreprocessUrl intercepted request for ${filename}, using blob URL`);
                    return blobUrl;
                }
            }

            return originalPreprocessUrl(url);
        };

        (Tools as any).LoadFile = (
            fileOrUrl: any,
            onSuccess: (data: string | ArrayBuffer, responseURL?: string) => void,
            onProgress?: (data: any) => void,
            offlineProvider?: any,
            useArrayBuffer?: boolean,
            onError?: (request?: any, exception?: any) => void
        ) => {
            const fileMap = (this.vishva.scene as any)._droppedFileMap as Map<string, string> | undefined;

            if (fileMap && typeof fileOrUrl === 'string') {
                const urlParts = fileOrUrl.split('/');
                const filename = urlParts[urlParts.length - 1].split('?')[0].split('#')[0];

                if (fileMap.has(filename)) {
                    const blobUrl = fileMap.get(filename)!;
                    console.log(`LoadFile intercepted request for ${filename}, using blob URL`);
                    return originalLoadFile(blobUrl, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError);
                }
            }

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
        
        const modelExtensions = ['gltf', 'glb', 'obj', 'babylon', 'stl'];
        const modelFiles = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ext && modelExtensions.includes(ext);
        });
        
        if (modelFiles.length === 0) {
            alert('No supported 3D model files found. Supported formats: ' + modelExtensions.join(', '));
            return;
        }
        
        const fileMap = new Map<string, string>();
        files.forEach(file => {
            const objectURL = URL.createObjectURL(file);
            fileMap.set(file.name, objectURL);
            console.log(`Mapped ${file.name} to blob URL`);
        });
        
        modelFiles.forEach(modelFile => {
            this.loadDroppedAsset(modelFile, fileMap);
        });
    }

}
