import {
    AbstractMesh, AnimationGroup, AnimationRange, AssetContainer, AssetsManager, BoundingInfo,
    InstancedMesh, IParticleSystem, Material, Matrix, Mesh, MultiMaterial, Quaternion, Scene,
    SceneLoader, Skeleton, StandardMaterial, Tags, TextFileAssetTask, Tools, TransformNode, Vector3, VertexBuffer, Color3
} from "babylonjs";
import { VishvaSerialized, ObjectIdMap, MeshMetadataMap } from "../VishvaSerialized";
import { SNAManager } from "../sna/SNA";
import { VEvent } from "../eventing/VEvent";
import { EventManager } from "../eventing/EventManager";

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
     * First tries to load from IndexedDB, then falls back to server
     */
    private async loadZipWorld(scenePath: string, sceneFile: string, scene: Scene) {
        try {
            // Show progress
            this.vishva.progressManager.show("Loading World", "Checking browser storage...");
            await this.vishva.progressManager.update(undefined, 5);
            
            // Try to load from IndexedDB first
            const indexedDBData = await this._loadWorldFromIndexedDB(sceneFile);
            
            if (indexedDBData) {
                const { vishvaData, sceneData } = indexedDBData;
                this.loadVishvaPartFromObjects(vishvaData, sceneData);
                return;
            }

            // If not in IndexedDB, fetch from server
            await this.vishva.progressManager.update("Fetching world file from server...", 10);
            
            const response = await fetch(scenePath + sceneFile);
            if (!response.ok) {
                throw new Error(`Failed to load ${sceneFile}: ${response.statusText}`);
            }
            
            await this.vishva.progressManager.update("Decompressing world file...", 30);
            
            const compressedBlob = await response.blob();
            const decompressedData = await this._decompressGzip(compressedBlob);
            
            await this.vishva.progressManager.update("Extracting world data...", 50);
            
            const files = await this._extractTarArchive(decompressedData);
            
            // Extract Vishva.json and Scene file (babylon or gltf)
            const vishvaData = files.get("Vishva.json");
            let sceneData = files.get("Scene.babylon");
            let isGltf = false;
            
            // Check for glTF format if babylon not found
            if (!sceneData) {
                sceneData = files.get("Scene.gltf");
                if (sceneData) {
                    isGltf = true;
                }
            }
            
            if (!vishvaData) {
                throw new Error("Vishva.json not found in archive");
            }
            if (!sceneData) {
                throw new Error("Scene file (babylon or gltf) not found in archive");
            }
            
            const vishvaText = new TextDecoder().decode(vishvaData);
            const vishvaObj = JSON.parse(vishvaText);
            
            if (isGltf) {
                // For glTF, we need to load it differently
                await this.vishva.progressManager.update("Loading glTF scene...", 70);
                
                // Create a blob from the gltf data - cast to avoid SharedArrayBuffer type issue
                const gltfBlob = new Blob([sceneData as any], { type: 'model/gltf+json' });
                const gltfUrl = URL.createObjectURL(gltfBlob);
                
                // Check if there's a bin file
                const binData = files.get("Scene.bin");
                if (binData) {
                    // We need to handle the bin file reference
                    // For now, we'll use SceneLoader with the blob
                }
                
                await this.vishva.progressManager.update("Parsing glTF data...", 85);
                
                // Load the glTF scene
                this.loadVishvaPartFromGltf(vishvaObj, gltfUrl);
                
                // Clean up the blob URL after loading
                setTimeout(() => URL.revokeObjectURL(gltfUrl), 1000);
            } else {
                // Load babylon format as before
                const sceneText = new TextDecoder().decode(sceneData);
                const sceneObj = JSON.parse(sceneText);
                
                await this.vishva.progressManager.update("Loading scene...", 85);
                
                // Process the loaded data
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
     * Try to load world from IndexedDB
     * Returns { vishvaData, sceneData } if found, null otherwise
     */
    private _loadWorldFromIndexedDB(worldName: string): Promise<{ vishvaData: any; sceneData: any } | null> {
        return new Promise((resolve) => {
            try {
                const dbName = "VishvaWorlds";
                const storeName = "worlds";
                
                const request = indexedDB.open(dbName, 1);

                request.onerror = () => {
                    resolve(null);
                };

                request.onsuccess = () => {
                    const db = request.result;

                    // Check if object store exists
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.close();
                        resolve(null);
                        return;
                    }
                    try {
                        const transaction = db.transaction([storeName], "readonly");
                        const store = transaction.objectStore(storeName);
                        const getRequest = store.get(worldName);

                        getRequest.onsuccess = async () => {
                            const result = getRequest.result;
                            db.close();

                            if (result && result.data) {
                                await this.vishva.progressManager.update("Loading and decompressing from browser storage...", 20);
                                try {
                                    const decompressedData = await this._decompressGzip(result.data);
                                    
                                    await this.vishva.progressManager.update("Extracting world data...", 35);
                                    
                                    const files = await this._extractTarArchive(decompressedData);
                                    
                                    const vishvaData = files.get("Vishva.json");
                                    let sceneData = files.get("Scene.babylon");
                                    
                                    // Check for glTF format if babylon not found
                                    if (!sceneData) {
                                        sceneData = files.get("Scene.gltf");
                                    }
                                    
                                    if (!vishvaData || !sceneData) {
                                        resolve(null);
                                        return;
                                    }
                                    
                                    await this.vishva.progressManager.update("Parsing data...", 40);

                                    const vishvaText = new TextDecoder().decode(vishvaData);
                                    const sceneText = new TextDecoder().decode(sceneData);
                                    const vishvaObj = JSON.parse(vishvaText);
                                    const sceneObj = JSON.parse(sceneText);

                                    resolve({ vishvaData: vishvaObj, sceneData: sceneObj });
                                } catch (e) {
                                    console.error("Error decompressing world from IndexedDB:", e);
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        };

                        getRequest.onerror = () => {
                            db.close();
                            resolve(null);
                        };
                    } catch (e) {
                        console.error("Error accessing IndexedDB:", e);
                        db.close();
                        resolve(null);
                    }
                };

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: "name" });
                    }
                };
            } catch (e) {
                console.error("Error checking IndexedDB:", e);
                resolve(null);
            }
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
        const files = new Map<string, Uint8Array>();
        let offset = 0;

        while (offset < tarData.length) {
            // Check for end of archive (two consecutive 512-byte blocks of zeros)
            if (offset + 512 <= tarData.length) {
                const header = tarData.slice(offset, offset + 512);
                let isAllZeros = true;
                for (let i = 0; i < 512; i++) {
                    if (header[i] !== 0) {
                        isAllZeros = false;
                        break;
                    }
                }
                if (isAllZeros) {
                    // Check the next block too
                    if (offset + 1024 <= tarData.length) {
                        const nextHeader = tarData.slice(offset + 512, offset + 1024);
                        let nextIsAllZeros = true;
                        for (let i = 0; i < 512; i++) {
                            if (nextHeader[i] !== 0) {
                                nextIsAllZeros = false;
                                break;
                            }
                        }
                        if (nextIsAllZeros) {
                            break; // End of archive
                        }
                    }
                }
            }

            if (offset + 512 > tarData.length) break;

            const header = tarData.slice(offset, offset + 512);
            offset += 512;

            // Parse TAR header
            const decoder = new TextDecoder();
            const headerStr = decoder.decode(header);

            // Extract filename (0-99)
            let filenameBytesLen = 0;
            for (let i = 0; i < 100 && header[i] !== 0; i++) {
                filenameBytesLen++;
            }
            const filename = decoder.decode(header.slice(0, filenameBytesLen));

            // Extract file size (124-135)
            const sizeStr = decoder.decode(header.slice(124, 135)).trim();
            const fileSize = parseInt(sizeStr, 8);

            if (isNaN(fileSize) || fileSize < 0) {
                break;
            }

            // Extract file data
            if (offset + fileSize <= tarData.length) {
                const fileData = tarData.slice(offset, offset + fileSize);
                files.set(filename, fileData);
                offset += fileSize;

                // Align to 512-byte boundary
                const padding = (512 - (fileSize % 512)) % 512;
                offset += padding;
            } else {
                break;
            }
        }

        return files;
    }

    /**
     * Load Vishva data from separate objects (used for gzip format)
     */
    private loadVishvaPartFromObjects(vishvaData: any, sceneData: any) {
        this.vishva.progressManager.update("Processing vishva data...", 90);
        
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
            // Hide progress when scene is loaded
            setTimeout(() => {
                this.vishva.progressManager.hide();
            }, 500);
            return this.vishva.loadBabylonjsPart(scene);
        });
    }

    /**
     * Load Vishva data from glTF format
     */
    private loadVishvaPartFromGltf(vishvaData: any, gltfUrl: string) {
        this.vishva.progressManager.update("Processing vishva data...", 90);
        
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

            // Store object IDs and metadata for later use in loadBabylonjsPart
            this.vishva._objectIds = this.vishva.vishvaSerialized.objectIds || null;
            this.vishva._meshMetadata = this.vishva.vishvaSerialized.meshMetadata || {};
        } else {
            this.vishva.vishvaSerialized = new VishvaSerialized();
        }

        this.vishva.progressManager.update("Loading glTF scene...", 95);
        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.Append("", gltfUrl, this.vishva.scene, (scene) => { 
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

    private reuseAnimationGroup(ag: AnimationGroup) {
        let existingAG = this.vishva.scene.getAnimationGroupByName(ag.name);
        if (existingAG && existingAG !== ag) {
            console.log("reusing animation group " + ag.name);
            for (let targetedAnim of ag.targetedAnimations) {
                let existingTargetedAnim = existingAG.targetedAnimations.find(ta => ta.animation.name === targetedAnim.animation.name);
                if (existingTargetedAnim) {
                    targetedAnim.animation = existingTargetedAnim.animation;
                }
            }
        }
    }

    public onMeshLoaded(meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[], file: string, assetType: string, folder?: string) {
        console.log("loading meshes from file " + file + " from folder " + folder + " of type " + assetType + " mesh count " + meshes.length);

        for (let s of skeletons) {
            this.vishva.scene.stopAnimation(s);
        }

        for (let ag of animationGroups) {
            ag.stop();
            this.reuseAnimationGroup(ag);
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
        let placementLocal: Vector3 = new Vector3(0, 0, -(scaleNum * dist));
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
                
                // Process the files
                this.processDroppedFiles(files);
            } else if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                this.processDroppedFiles(files);
            }
        });

        canvas.addEventListener('dragenter', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        });

        canvas.addEventListener('dragleave', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    /**
     * Setup custom file handler to intercept file requests for dropped files
     */
    private setupCustomFileHandler() {
        // Store the original LoadFile function
        const originalLoadFile = Tools.LoadFile;

        // Override Tools.LoadFile to intercept requests
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
                    console.log(`Intercepted request for ${filename}, using blob URL`);

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
    private processDroppedFiles(files: File[]) {
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
