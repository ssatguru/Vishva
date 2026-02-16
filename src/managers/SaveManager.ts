import {
    AbstractMesh, BaseTexture, Camera, Engine, InstancedMesh, Material, Mesh, MultiMaterial,
    Quaternion, Scene, SceneSerializer, Skeleton, StandardMaterial, Texture, TransformNode, Vector3
} from "babylonjs";
import { VishvaSerialized } from "../VishvaSerialized";
import { SNAManager, SNAserialized } from "../sna/SNA";
import { DialogMgr } from "../gui/DialogMgr";
import JSZip from "jszip";

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

        var meshString: string = JSON.stringify(meshObj, null, 1);
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
        this.vishva.progressManager.setProgress(10);

        const zipBlob = await this._getWorldZipBlob();
        
        this.vishva.progressManager.setProgress(100);
        
        // Hide progress after a short delay
        setTimeout(() => {
            this.vishva.progressManager.hide();
        }, 500);
        
        return URL.createObjectURL(zipBlob);
    }

    public async saveWorldToIndexedDB(): Promise<boolean> {
        if (this.vishva.editControl != null) {
            DialogMgr.showAlertDiag("cannot save during edit");
            return false;
        }

        if (!this.vishva.isFocusOnAv) {
            DialogMgr.showAlertDiag("cannot save. focus is not on avatar. press esc to switch focus to avatar and try again");
            return false;
        }

        this.vishva.progressManager.show("Saving World to Browser", "Preparing scene...");
        this.vishva.progressManager.setProgress(10);

        try {
            const zipBlob = await this._getWorldZipBlob();
            
            this.vishva.progressManager.update("Saving to browser storage...", 95);

            // Save to IndexedDB
            const worldName = this.vishva.constructor.worldName || "world";
            await this._saveZipBlobToIndexedDB(worldName, zipBlob);

            this.vishva.progressManager.setProgress(100);
            
            // Hide progress after a short delay
            setTimeout(() => {
                this.vishva.progressManager.hide();
            }, 500);

            DialogMgr.showAlertDiag(`World saved to browser as "${worldName}"`);
            return true;
        } catch (error) {
            console.error("Error saving world to IndexedDB:", error);
            DialogMgr.showAlertDiag("Error saving world to browser: " + error.message);
            this.vishva.progressManager.hide();
            return false;
        }
    }

    private async _getWorldZipBlob(): Promise<Blob> {
        this.removeRedundantCameras();
        this.removeInstancesFromShadow();
        this.renameMeshIds();
        this.cleanupSkels();
        this.resetSkels(this.vishva.scene);
        this.cleanupMats();

        this.vishva.progressManager.update("Creating world data...", 30);

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

        this.vishva.progressManager.update("Serializing scene...", 50);

        // Serialize the scene
        Texture.ForceSerializeBuffers = false;
        let sceneObj: Object = <Object>SceneSerializer.Serialize(this.vishva.scene);
        this.removeSounds(sceneObj);
        this.removeActuatorTextBarMat(sceneObj);

        this.vishva.progressManager.update("Creating JSON files...", 70);

        // Create separate JSON strings
        let vishvaString: string = JSON.stringify(vishvaSerialzed);
        let sceneString: string = JSON.stringify(sceneObj);

        this.vishva.progressManager.update("Creating zip archive...", 85);

        // Create a zip file
        const zip = new JSZip();
        zip.file("Vishva.json", vishvaString);
        zip.file("Scene.babylon", sceneString);

        // Generate the zip file as a blob
        const zipBlob = await zip.generateAsync({ 
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });
        
        this.addInstancesToShadow();
        
        return zipBlob;
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
}
