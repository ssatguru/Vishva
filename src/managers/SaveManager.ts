import {
    AbstractMesh, BaseTexture, Camera, Engine, InstancedMesh, Material, Mesh, MultiMaterial,
    Quaternion, Scene, SceneSerializer, Skeleton, StandardMaterial, Tags, Texture, TransformNode, Vector3
} from "babylonjs";
import { VishvaSerialized, ObjectIdMap, MeshMetadata } from "../VishvaSerialized";
import { SNAManager, SNAserialized } from "../sna/SNA";
import { DialogMgr } from "../gui/DialogMgr";
import { AssetCollector, AssetEntry, BlobTextureEntry, EmbeddedTextureEntry } from "./AssetCollector";
import { PathRewriter } from "./PathRewriter";

export class SaveManager {
    private vishva: any;

    constructor(vishva: any) {
        this.vishva = vishva;
    }

    public saveAsset(): string {
        if (!this.vishva.isMeshSelected) {
            return null;
        }
        let p: Vector3 = this.vishva.meshSelected.position.clone();
        let re: Vector3 = this.vishva.meshSelected.rotation.clone();
        let rq: Quaternion = this.vishva.meshSelected.rotationQuaternion.clone();

        this.vishva.meshSelected.position = Vector3.Zero();
        this.vishva.meshSelected.rotation = Vector3.Zero();
        var meshObj: any = SceneSerializer.SerializeMesh(this.vishva.meshSelected, false, true);
        meshObj.useRightHandedSystem = this.vishva.scene.useRightHandedSystem;

        this.vishva.meshSelected.position = p;
        this.vishva.meshSelected.rotation = re;
        this.vishva.meshSelected.rotationQuaternion = rq;

        var meshString: string = SaveManager._stringifyWithPrecision(meshObj, 1);
        var file: File = new File([meshString], "AssetFile.babylon");
        return URL.createObjectURL(file);
    }

    public async saveWorld(): Promise<string> {
        if (this.vishva.editControl != null) {
            DialogMgr.showAlertDiag("cannot save during edit");
            return null;
        }

        if (!this.vishva.isFocusOnAv) {
            DialogMgr.showAlertDiag("cannot save. focus is not on avatar. press esc to switch focus to avatar and try again");
            return null;
        }

        this.vishva.progressManager.show("Saving World", "Preparing scene...");
        await this.vishva.progressManager.update(undefined, 0);

        const zipBlob = await this._getWorldZipBlob();
        
        await this.vishva.progressManager.update(undefined, 100);
        
        // Hide progress after a short delay
        setTimeout(() => {
            this.vishva.progressManager.hide();
        }, 500);
        
        return URL.createObjectURL(zipBlob);
    }

    public async saveWorldToIndexedDB(worldName?: string): Promise<boolean> {
        if (this.vishva.editControl != null) {
            DialogMgr.showAlertDiag("cannot save during edit");
            return false;
        }

        if (!this.vishva.isFocusOnAv) {
            DialogMgr.showAlertDiag("cannot save. focus is not on avatar. press esc to switch focus to avatar and try again");
            return false;
        }

        this.vishva.progressManager.show("Saving World to Browser", "Preparing scene...");
        await this.vishva.progressManager.update(undefined, 10);

        try {
            // Give the UI time to render the progress bar
            await new Promise(resolve => setTimeout(resolve, 100));

            const zipBlob = await this._getWorldZipBlob();
            
            await this.vishva.progressManager.update("Saving to browser storage...", 95);

            // Save to IndexedDB — use provided name or fall back to existing behavior
            const name = worldName || this.vishva.constructor.worldName || "world";
            await this._saveZipBlobToIndexedDB(name, zipBlob);

            await this.vishva.progressManager.update(undefined, 100);
            
            // Hide progress after a short delay
            setTimeout(() => {
                this.vishva.progressManager.hide();
            }, 500);

            DialogMgr.showAlertDiag(`World saved to browser as "${name}"`);
            return true;
        } catch (error) {
            console.error("Error saving world to IndexedDB:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            DialogMgr.showAlertDiag("Error saving world to browser: " + errorMessage);
            this.vishva.progressManager.hide();
            return false;
        }
    }

    private async _getWorldZipBlob(): Promise<Blob> {
        const assetCollector = new AssetCollector();
        const pathRewriter = new PathRewriter();

        this.removeRedundantCameras();
        this.removeInstancesFromShadow();
        this.renameMeshIds();
        this.cleanupSkels();
        this.resetSkels(this.vishva.scene);
        this.cleanupMats();

        await this.vishva.progressManager.update("Creating world data...", 30);

        // Create VishvaSerialized object
        let vishvaSerialzed = new VishvaSerialized(this.vishva);
        vishvaSerialzed.bVer = Engine.Version;
        vishvaSerialzed.vVer = this.vishva.constructor.version;

        vishvaSerialzed.settings.cameraCollision = this.vishva._cameraCollision;
        vishvaSerialzed.settings.autoEditMenu = this.vishva.autoEditMenu;
        vishvaSerialzed.guiSettings = this.vishva.vishvaGUI.guiSettings;
        vishvaSerialzed.misc.activeCameraTarget = this.vishva.arcCamera.target;
        vishvaSerialzed.misc.skyColor = this.vishva.skyColor;
        vishvaSerialzed.misc.skyBright = this.vishva.skyBright;
        vishvaSerialzed.misc.sceneShadowsEnabled = this.vishva.scene.shadowsEnabled;

        vishvaSerialzed.snas = <SNAserialized[]>SNAManager.getSNAManager().serializeSnAs(this.vishva.scene);

        // NEW: Capture object IDs from special Vishva objects
        vishvaSerialzed.objectIds = new ObjectIdMap();
        if (this.vishva.avatar) vishvaSerialzed.objectIds.avatarId = this.vishva.avatar.id;
        if (this.vishva.avatarSkeleton) vishvaSerialzed.objectIds.skeletonId = this.vishva.avatarSkeleton.id;
        if (this.vishva.skybox) vishvaSerialzed.objectIds.skyboxId = this.vishva.skybox.id;
        if (this.vishva.ground) vishvaSerialzed.objectIds.groundId = this.vishva.ground.id;
        if (this.vishva.sun) vishvaSerialzed.objectIds.sunId = this.vishva.sun.id;
        if (this.vishva.arcCamera) vishvaSerialzed.objectIds.cameraId = this.vishva.arcCamera.id;

        // NEW: Capture spawn point ID if it exists (search for mesh with spawnPoint tag)
        for (let mesh of this.vishva.scene.meshes) {
            if (Tags.HasTags(mesh) && Tags.MatchesQuery(mesh, "Vishva.spawnPoint")) {
                vishvaSerialzed.objectIds.spawnPointId = mesh.id;
                break;
            }
        }

        // NEW: Capture mesh metadata from tags
        vishvaSerialzed.meshMetadata = {};
        for (let mesh of this.vishva.scene.meshes) {
            if (Tags.HasTags(mesh)) {
                const tags = Tags.GetTags(mesh, true).split(" ");
                const metadata = new MeshMetadata();
                metadata.meshId = mesh.id;
                
                for (let tag of tags) {
                    if (tag === "Vishva.prim") metadata.isPrimitive = true;
                    if (tag === "Vishva.internal") metadata.isInternal = true;
                    if (tag === "invisible") metadata.isInvisible = true;
                    if (tag.startsWith("Vishva.uid.")) metadata.vishvaUid = tag;
                }
                
                // Only store metadata if at least one property is set
                if (metadata.isPrimitive || metadata.isInternal || 
                    metadata.isInvisible || metadata.vishvaUid) {
                    vishvaSerialzed.meshMetadata[mesh.id] = metadata;
                }
            }
        }

        await this.vishva.progressManager.update("Serializing scene...", 50);

        // Serialize the scene
        Texture.ForceSerializeBuffers = false;
        let sceneObj: Object = <Object>SceneSerializer.Serialize(this.vishva.scene);
        this.removeSounds(sceneObj);
        this.removeActuatorTextBarMat(sceneObj);

        await this.vishva.progressManager.update("Collecting assets...", 55);

        // Extract embedded textures (base64String fields from GLB imports)
        const embeddedEntries = assetCollector.collectEmbeddedTextures(sceneObj);

        // Re-encode PNG textures as JPEG to reduce file size (when alpha is not needed)
        await this._reencodeEmbeddedTextures(embeddedEntries);

        assetCollector.stripEmbeddedTextures(embeddedEntries);

        // Collect and process blob URL textures (must happen BEFORE collect() to rewrite blob URLs)
        const blobEntries = assetCollector.collectBlobTextures(sceneObj);
        const blobAssetFiles: Array<{ filename: string; data: Uint8Array }> = [];
        for (const entry of blobEntries) {
            try {
                const response = await fetch(entry.blobUrl);
                const arrayBuffer = await response.arrayBuffer();
                blobAssetFiles.push({
                    filename: "assets/" + entry.archiveFilename,
                    data: new Uint8Array(arrayBuffer)
                });
                // Rewrite texture object to reference the archive path
                const archivePath = `assets/${entry.archiveFilename}`;
                entry.textureObj.name = archivePath;
                entry.textureObj.url = archivePath;
            } catch (err) {
                console.warn(`Failed to fetch blob texture "${entry.blobUrl}", skipping:`, err);
            }
        }

        // Collect external asset URLs and rewrite paths to assets/<archiveFilename>
        const baseUrl = window.location.href;
        const externalEntries = assetCollector.collect(sceneObj, baseUrl);
        pathRewriter.rewrite(sceneObj, externalEntries);

        await this.vishva.progressManager.update("Fetching assets...", 65);

        // Fetch binary data for external assets that don't already have decoded data
        const fetchedAssetFiles: Array<{ filename: string; data: Uint8Array }> = [];
        for (const entry of externalEntries) {
            if (entry.decodedData) {
                // Data URI assets are already decoded — skip fetching
                continue;
            }
            try {
                const response = await fetch(entry.fetchUrl);
                const arrayBuffer = await response.arrayBuffer();
                fetchedAssetFiles.push({
                    filename: "assets/" + entry.archiveFilename,
                    data: new Uint8Array(arrayBuffer)
                });
            } catch (err) {
                console.warn(`Failed to fetch asset "${entry.fetchUrl}", skipping:`, err);
            }
        }

        await this.vishva.progressManager.update("Building archive...", 80);

        // Carry forward assets from the loaded archive that are still referenced in the scene.
        // When a world is loaded from an archive, textures keep their "assets/..." names.
        // On re-save, these need their binary data carried forward from the original archive.
        const carryForwardFiles: Array<{ filename: string; data: Uint8Array }> = [];
        const loadedAssetMap: Map<string, Uint8Array> | undefined = this.vishva._loadedAssetMap;
        if (loadedAssetMap && loadedAssetMap.size > 0) {
            // Collect all assets/ references from the scene that need carrying forward
            const referencedAssets = this._collectAssetsReferences(sceneObj);
            const alreadyIncluded = new Set<string>();
            // Track filenames already included from other pipelines
            for (const entry of embeddedEntries) alreadyIncluded.add("assets/" + entry.archiveFilename);
            for (const file of fetchedAssetFiles) alreadyIncluded.add(file.filename);
            for (const file of blobAssetFiles) alreadyIncluded.add(file.filename);
            for (const entry of externalEntries) {
                if (entry.decodedData) alreadyIncluded.add("assets/" + entry.archiveFilename);
            }

            for (const assetPath of referencedAssets) {
                if (alreadyIncluded.has(assetPath)) continue;
                const data = loadedAssetMap.get(assetPath);
                if (data) {
                    carryForwardFiles.push({ filename: assetPath, data });
                }
            }
        }

        // Create separate JSON strings for Vishva and Scene
        // Round floating point numbers to reduce file size (4 decimal places)
        // Precision reduction is applied AFTER the asset pipeline completes
        const vishvaString = SaveManager._stringifyWithPrecision(vishvaSerialzed);
        const sceneString = SaveManager._stringifyWithPrecision(sceneObj);
        
        const vishvaBuffer = new TextEncoder().encode(vishvaString);
        const sceneBuffer = new TextEncoder().encode(sceneString);

        // Build archive file list with all assets
        const archiveFiles: Array<{ filename: string; data: Uint8Array }> = [];

        // Add embedded texture files
        for (const entry of embeddedEntries) {
            archiveFiles.push({
                filename: "assets/" + entry.archiveFilename,
                data: entry.decodedData
            });
        }

        // Add fetched external asset files
        for (const file of fetchedAssetFiles) {
            archiveFiles.push(file);
        }

        // Add fetched blob texture files
        for (const file of blobAssetFiles) {
            archiveFiles.push(file);
        }

        // Add carried-forward assets from the loaded archive
        for (const file of carryForwardFiles) {
            archiveFiles.push(file);
        }

        // Add data URI assets from external entries that have decodedData
        for (const entry of externalEntries) {
            if (entry.decodedData) {
                archiveFiles.push({
                    filename: "assets/" + entry.archiveFilename,
                    data: entry.decodedData
                });
            }
        }

        // Add Vishva.json and Scene.babylon (with precision reduction already applied)
        archiveFiles.push({ filename: "Vishva.json", data: vishvaBuffer });
        archiveFiles.push({ filename: "Scene.babylon", data: sceneBuffer });

        await this.vishva.progressManager.update("Compressing world data...", 90);
        
        // Create TAR archive with all files
        const tarBuffer = await this._createTarArchive(archiveFiles);
        
        // Compress TAR archive using gzip with Compression Streams API
        const gzipBlob = await this._compressWithGzip(tarBuffer);
        
        this.addInstancesToShadow();
        
        return gzipBlob;
    }

    /**
     * Scan the serialized scene object for all string values that start with "assets/".
     * Returns a deduplicated set of asset paths referenced by the scene.
     */
    private _collectAssetsReferences(sceneObj: object): Set<string> {
        const refs = new Set<string>();
        this._findAssetStrings(sceneObj, refs);
        return refs;
    }

    private _findAssetStrings(obj: any, refs: Set<string>): void {
        if (obj === null || obj === undefined) return;
        if (Array.isArray(obj)) {
            for (const item of obj) {
                if (typeof item === "string" && item.startsWith("assets/")) {
                    refs.add(item);
                } else if (typeof item === "object" && item !== null) {
                    this._findAssetStrings(item, refs);
                }
            }
        } else if (typeof obj === "object") {
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                if (typeof value === "string" && value.startsWith("assets/")) {
                    refs.add(value);
                } else if (typeof value === "object" && value !== null) {
                    this._findAssetStrings(value, refs);
                }
            }
        }
    }

    private async _createTarArchive(files: Array<{ filename: string; data: Uint8Array }>): Promise<Uint8Array> {
        const blocks: Uint8Array[] = [];
        
        for (const file of files) {
            // Create TAR header (512 bytes)
            const header = new Uint8Array(512);
            const headerView = new DataView(header.buffer);
            const encoder = new TextEncoder();
            
            // File name (0-99)
            const nameBytes = encoder.encode(file.filename);
            header.set(nameBytes.slice(0, Math.min(100, nameBytes.length)), 0);
            
            // File mode (100-107) - default: 644 (octal)
            const modeStr = "0000644\0";
            header.set(encoder.encode(modeStr), 100);
            
            // Owner's user ID (108-115) - 0
            const uidStr = "0000000\0";
            header.set(encoder.encode(uidStr), 108);
            
            // Group's user ID (116-123) - 0
            const gidStr = "0000000\0";
            header.set(encoder.encode(gidStr), 116);
            
            // File size in bytes (124-135)
            const sizeStr = file.data.length.toString(8).padStart(11, '0') + '\0';
            header.set(encoder.encode(sizeStr), 124);
            
            // Last modification time (136-147)
            const timeStr = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
            header.set(encoder.encode(timeStr), 136);
            
            // Checksum (148-155) - initially all spaces
            header.set(encoder.encode('        '), 148);
            
            // Type flag (156) - '0' for regular file
            header[156] = 0x30; // '0'
            
            // Link name (157-256) - empty
            
            // UStar indicator (257-262)
            header.set(encoder.encode('ustar\0'), 257);
            
            // Calculate and set checksum
            let checksum = 0;
            for (let i = 0; i < 512; i++) {
                checksum += header[i];
            }
            const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
            header.set(encoder.encode(checksumStr), 148);
            
            blocks.push(header);
            blocks.push(file.data);
            
            // Pad file data to 512-byte boundary
            const padding = (512 - (file.data.length % 512)) % 512;
            if (padding > 0) {
                blocks.push(new Uint8Array(padding));
            }
        }
        
        // Add two final 512-byte zero blocks to mark end of archive
        blocks.push(new Uint8Array(512));
        blocks.push(new Uint8Array(512));
        
        // Concatenate all blocks
        const totalLength = blocks.reduce((acc, curr) => acc + curr.length, 0);
        const tarData = new Uint8Array(totalLength);
        let offset = 0;
        for (const block of blocks) {
            tarData.set(block, offset);
            offset += block.length;
        }
        
        return tarData;
    }

    private async _compressWithGzip(data: Uint8Array): Promise<Blob> {
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(data);
                controller.close();
            }
        });

        const compressedStream = stream.pipeThrough(
            new CompressionStream('gzip') as any
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

        return new Blob([compressedData], { type: 'application/gzip' });
    }

    private _saveZipBlobToIndexedDB(worldName: string, zipBlob: Blob): Promise<void> {
        return new Promise((resolve, reject) => {
            const dbName = "VishvaWorlds";
            const storeName = "worlds";
            
            const request = indexedDB.open(dbName, 1);

            request.onerror = () => {
                reject(new Error("Failed to open IndexedDB"));
            };

            request.onsuccess = () => {
                const db = request.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(storeName)) {
                    db.close();
                    const upgradeRequest = indexedDB.open(dbName, db.version + 1);
                    
                    upgradeRequest.onupgradeneeded = (event) => {
                        const upgradeDb = (event.target as IDBOpenDBRequest).result;
                        if (!upgradeDb.objectStoreNames.contains(storeName)) {
                            upgradeDb.createObjectStore(storeName, { keyPath: "name" });
                        }
                    };

                    upgradeRequest.onsuccess = () => {
                        this._saveWorldToStore(upgradeRequest.result, worldName, zipBlob, resolve, reject);
                    };

                    upgradeRequest.onerror = () => {
                        reject(new Error("Failed to upgrade IndexedDB"));
                    };
                } else {
                    this._saveWorldToStore(db, worldName, zipBlob, resolve, reject);
                }
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "name" });
                }
            };
        });
    }

    private _saveWorldToStore(
        db: IDBDatabase,
        worldName: string,
        zipBlob: Blob,
        resolve: () => void,
        reject: (error: Error) => void
    ): void {
        const transaction = db.transaction(["worlds"], "readwrite");
        const store = transaction.objectStore("worlds");

        const worldData = {
            name: worldName,
            data: zipBlob,
            timestamp: new Date().toISOString()
        };

        const putRequest = store.put(worldData);

        putRequest.onsuccess = () => {
            db.close();
            resolve();
        };

        putRequest.onerror = () => {
            db.close();
            reject(new Error("Failed to save world to IndexedDB"));
        };
    }

    private removeRedundantCameras() {
        let cameras: Camera[] = this.vishva.scene.cameras;
        let l = cameras.length;
        for (let i = l - 1; i >= 0; i--) {
            if (cameras[i].name == "") {
                cameras[i].dispose();
            }
        }
    }

    private removeInstancesFromShadow() {
        var meshes: AbstractMesh[] = this.vishva.scene.meshes;
        for (let mesh of meshes) {
            if (mesh != null && mesh instanceof InstancedMesh) {
                this.removeFromShadowCasters(mesh);
            }
        }
    }

    public removeFromShadowCasters(mesh: AbstractMesh) {
        var shadowMeshes: Array<AbstractMesh> = this.vishva.shadowGenerator.getShadowMap().renderList;
        var i: number = shadowMeshes.indexOf(mesh);
        if (i >= 0) {
            shadowMeshes.splice(i, 1);
        }
    }

    public addToShadowCasters(mesh: AbstractMesh) {
        if ((<Mesh>mesh).geometry != null || mesh.isAnInstance) {
            this.vishva.shadowGenerator.getShadowMap().renderList.push(mesh);
            if (mesh instanceof InstancedMesh) {
                mesh.sourceMesh.receiveShadows = this.vishva._recShadowFlag;
            } else {
                mesh.receiveShadows = this.vishva._recShadowFlag;
            }
        }
    }

    private addInstancesToShadow() {
        for (let mesh of this.vishva.scene.meshes) {
            if (mesh != null && mesh instanceof InstancedMesh) {
                this.addToShadowCasters(mesh);
            }
        }
    }

    private renameMeshIds() {
        var i: number = 0;
        for (let mesh of this.vishva.scene.meshes) {
            mesh.id = (<number>new Number(i)).toString();
            i++;
        }
    }

    private resetSkels(scene: Scene) {
        var i: number = 0;
        for (let skel of scene.skeletons) {
            skel.id = (<number>new Number(i)).toString();
            i++;
            skel.returnToRest();
        }
    }

    private removeSounds(sceneObj: Object) {
        var sounds = sceneObj["sounds"];
        if (sounds != null) {
            sceneObj["sounds"] = [];
        }
    }

    private removeActuatorTextBarMat(sceneObj: Object) {
        let materials = sceneObj["materials"];
        if (materials != null) {
            var l = materials.length;
            for (let i = l - 1; i >= 0; i--) {
                if (materials[i]["id"].startsWith("AdvancedDynamicTextureMaterial for ActuatorTextBar")) {
                    materials.splice(i, 1);
                }
            }
        }
    }

    private cleanupMats() {
        var meshes: AbstractMesh[] = this.vishva.scene.meshes;
        var mats: Array<Material> = new Array<Material>();
        var mms: Array<MultiMaterial> = new Array<MultiMaterial>();
        for (let mesh of meshes) {
            if (mesh.material != null) {
                if (mesh.material != null && mesh.material instanceof MultiMaterial) {
                    var mm: MultiMaterial = <MultiMaterial>mesh.material;
                    mms.push(mm);
                    var ms: Material[] = mm.subMaterials;
                    for (let mat of ms) {
                        mats.push(mat);
                    }
                } else {
                    mats.push(mesh.material);
                }
            }
        }

        var allMats: Material[] = this.vishva.scene.materials;
        var l: number = allMats.length;
        for (var i: number = l - 1; i >= 0; i--) {
            if (mats.indexOf(allMats[(<number>i | 0)]) === -1) {
                allMats[(<number>i | 0)].dispose();
            }
        }
        var allMms: MultiMaterial[] = this.vishva.scene.multiMaterials;
        l = allMms.length;
        for (var i: number = l - 1; i >= 0; i--) {
            if (mms.indexOf(allMms[(<number>i | 0)]) === -1) {
                allMms[(<number>i | 0)].dispose();
            }
        }
    }

    private cleanupSkels() {
        var meshes: AbstractMesh[] = this.vishva.scene.meshes;
        var skels: Array<Skeleton> = new Array<Skeleton>();
        for (let mesh of meshes) {
            if (mesh.skeleton != null) {
                skels.push(mesh.skeleton);
            }
        }
        var allSkels: Skeleton[] = this.vishva.scene.skeletons;
        var l: number = allSkels.length;
        for (var i: number = l - 1; i >= 0; i--) {
            if (skels.indexOf(allSkels[(<number>i | 0)]) === -1) {
                allSkels[(<number>i | 0)].dispose();
            }
        }
    }

    /**
     * Re-encode PNG embedded textures as JPEG to reduce file size.
     * Only converts textures that don't require alpha transparency.
     * Modifies entries in-place: updates decodedData and archiveFilename.
     */
    private static readonly JPEG_QUALITY = 0.85;

    private async _reencodeEmbeddedTextures(entries: EmbeddedTextureEntry[]): Promise<void> {
        for (const entry of entries) {
            // Only re-encode PNG textures
            if (!entry.dataUri.startsWith("data:image/png")) {
                continue;
            }

            try {
                const jpegData = await this._pngToJpeg(entry.decodedData);
                if (jpegData && jpegData.length < entry.decodedData.length) {
                    // JPEG is smaller — use it
                    entry.decodedData = jpegData;
                    // Update filename extension from .png to .jpg
                    entry.archiveFilename = entry.archiveFilename.replace(/\.png$/i, ".jpg");
                }
            } catch (err) {
                // If re-encoding fails, keep the original PNG
                console.warn(`Failed to re-encode texture "${entry.archiveFilename}" as JPEG, keeping PNG:`, err);
            }
        }
    }

    /**
     * Convert PNG binary data to JPEG using an offscreen canvas.
     * Returns null if the image has meaningful alpha (transparency).
     */
    private _pngToJpeg(pngData: Uint8Array): Promise<Uint8Array | null> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([pngData.buffer as ArrayBuffer], { type: "image/png" });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);

                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(null);
                    return;
                }

                // Draw image and check for alpha usage
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                if (this._hasAlpha(imageData)) {
                    // Image uses transparency — keep as PNG
                    resolve(null);
                    return;
                }

                // Re-encode as JPEG
                canvas.toBlob(
                    (jpegBlob) => {
                        if (!jpegBlob) {
                            resolve(null);
                            return;
                        }
                        jpegBlob.arrayBuffer().then(buf => {
                            resolve(new Uint8Array(buf));
                        }).catch(() => resolve(null));
                    },
                    "image/jpeg",
                    SaveManager.JPEG_QUALITY
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load PNG image for re-encoding"));
            };

            img.src = url;
        });
    }

    /**
     * Check if an image has any meaningful alpha (non-opaque pixels).
     * Samples pixels to avoid scanning every pixel of large images.
     */
    private _hasAlpha(imageData: ImageData): boolean {
        const data = imageData.data;
        const totalPixels = data.length / 4;

        // For small images, check all pixels
        if (totalPixels <= 4096) {
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] < 250) return true;
            }
            return false;
        }

        // For larger images, sample ~4096 pixels evenly distributed
        const step = Math.max(1, Math.floor(totalPixels / 4096));
        for (let p = 0; p < totalPixels; p += step) {
            if (data[p * 4 + 3] < 250) return true;
        }
        return false;
    }

    /**
     * JSON.stringify with floating point precision control.
     * Rounds all numbers to the specified number of decimal places.
     * Uses a two-pass approach to avoid interactions with toJSON/getters.
     */
    private static readonly PRECISION = 4;

    private static _stringifyWithPrecision(obj: any, space?: number): string {
        const json = JSON.stringify(obj);
        const plain = JSON.parse(json);
        return JSON.stringify(plain, (key, value) => {
            if (typeof value === 'number' && !Number.isInteger(value)) {
                return parseFloat(value.toFixed(SaveManager.PRECISION));
            }
            return value;
        }, space);
    }
}
