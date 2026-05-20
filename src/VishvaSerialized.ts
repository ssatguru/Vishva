import { Vector3, AnimationGroup, Scene, Tags, Sound, ISoundOptions } from "babylonjs";
import { ActionData, ActionMap, CCSettings } from "babylonjs-charactercontroller";
import { Color4 } from "babylonjs/Maths/math.color";
import { GrndSpread_Serializeable } from "./GrndSpread";
import { SpawnerSerialized } from "./managers/spawner/SpawnerSerialized";
import { SNAserialized } from "./sna/SNA";
import { Vishva } from "./Vishva";

export class VishvaSerialized {
    //babylon version
    public bVer: string;
    //vishva version
    public vVer: string;
    public snas: SNAserialized[];
    public settings: SettingsSerialized;
    public guiSettings: Object;
    public misc: MiscSerialized;
    public grndSpreadArray: GrndSpread_Serializeable[];
    public spawners: SpawnerSerialized[] = [];
    public avSerialized: AvSerialized;
    public meshCCs: MeshCCSerialized[];

    // NEW: Object identification map - stores IDs of special Vishva objects
    public objectIds: ObjectIdMap;
    
    // NEW: Mesh metadata - stores metadata previously stored in tags
    public meshMetadata: MeshMetadataMap;

    // Bone attachments - stores which TransformNodes are attached to which bones
    public boneAttachments: BoneAttachmentSerialized[] = [];

    

    public constructor(vishva?: Vishva) {
        this.settings = new SettingsSerialized();
        this.misc = new MiscSerialized();
        if (vishva == null) return;
        this.avSerialized = new AvSerialized(vishva);

        //we donot serialize the sps. 
        //the sps mesh's doNotSerialize property is set to true when the sps is created
        //serializing the sps bloats up the file
        //instead we just serialize the sps properties and recreate the sps when the file
        //is loaded in future
        if (vishva.GrndSpreads != null) {
            this.grndSpreadArray = new Array();
            for (let gSPS of vishva.GrndSpreads) {
                this.grndSpreadArray.push(gSPS.serialize());
            }
        }

        //serialize character controllers attached to meshes
        this.meshCCs = new Array();
        for (let mesh of vishva.scene.meshes) {
            if (mesh["characterController"]) {
                this.meshCCs.push(new MeshCCSerialized(mesh));
            }
        }

    }
}

export class SettingsSerialized {

    public cameraCollision: boolean = true;
    //automatcally open edit menu whenever a mesh is selected
    public autoEditMenu: boolean = false;


}

/*
 * BABYLONJS values not serialized by BABYLONJS but which we need
 */
export class MiscSerialized {
    public activeCameraTarget: Vector3 = Vector3.Zero();
    public skyColor: Color4;
    public skyBright: number;
    public sceneShadowsEnabled: boolean;

}

export class AvSerialized {
    public settings: CCSettings;
    public actionMap: ActionMap;

    constructor(vishva: Vishva) {
        this.settings = vishva.avManager.cc.getSettings();
        if (this.settings.sound)
            this.settings.sound = this.settings.sound.serialize();
        this.actionMap = vishva.avManager.cc.getActionMap();
        let keys = Object.keys(this.actionMap);
        for (let key of keys) {
            let ad: ActionData = this.actionMap[key];
            ad.sound = null;
        }
        this.serializeAG();
    }


    public static deSerializeSound(sndObj: Object): Sound {
        let sndOptions: ISoundOptions = {};
        sndOptions.autoplay = false;
        sndOptions.distanceModel = sndObj["distanceModel"];
        sndOptions.spatialSound = sndObj["spatialSound"];
        sndOptions.maxDistance = sndObj["maxDistance"];
        sndOptions.refDistance = sndObj["refDistance"];
        sndOptions.rolloffFactor = sndObj["rolloffFactor"];
        sndOptions.volume = sndObj["volume"];

        return new Sound(sndObj["name"], sndObj["name"], Vishva.vishva.scene, null, sndOptions);
    }

    //replace any reference to AnimationGroup instance with just the name of the AnimationGroup
    //during de-serialization we will use then name and tag to get animationgroup and re reference it
    public serializeAG() {
        let keys = Object.keys(this.actionMap);
        for (let key of keys) {
            let ad: ActionData = this.actionMap[key];
            if (ad.ag instanceof AnimationGroup) {
                this.actionMap[key]["ag"] = this.actionMap[key]["ag"].name;
            }

        }
    }

    public static deSerializeAG(scene: Scene, actionMap: ActionMap): ActionMap {
        let keys = Object.keys(actionMap);
        for (let key of keys) {
            let ad: ActionData = actionMap[key];
            if (actionMap[key]["ag"] != null && actionMap[key]["ag"] != "") {
                actionMap[key]["ag"] = AvSerialized.findAGbyName(scene, actionMap[key]["ag"]);
            }
        }
        return actionMap;
    }

    private static findAGbyTag(scene: Scene, name: string): AnimationGroup {
        let ags: AnimationGroup[] = scene.animationGroups;
        for (let ag of ags) {
            try {
                if (Tags.HasTags(ag)) {
                    if (Tags.MatchesQuery(ag, name)) return ag;
                }
            } catch (e) {
                console.log(e);
            }
        }
        return null;
    }

    private static findAGbyName(scene: Scene, name: string): AnimationGroup {
        let ags: AnimationGroup[] = scene.animationGroups;
        for (let ag of ags) {
            if (ag.name == name) return ag;
        }
        return null;
    }

}



export class MeshCCSerialized {
    public meshId: string;
    public settings: CCSettings;
    public actionMap: ActionMap;
    public originalEllipsoid: Vector3;

    constructor(mesh: any) {
        this.meshId = mesh.id;
        let cc = mesh["characterController"];
        this.settings = cc.getSettings();
        if (this.settings.sound)
            this.settings.sound = this.settings.sound.serialize();
        this.actionMap = cc.getActionMap();
        let keys = Object.keys(this.actionMap);
        for (let key of keys) {
            let ad: ActionData = this.actionMap[key];
            ad.sound = null;
            if (ad.ag instanceof AnimationGroup) {
                this.actionMap[key]["ag"] = this.actionMap[key]["ag"].name;
            }
        }
        if (mesh["_originalEllipsoid"]) {
            this.originalEllipsoid = mesh["_originalEllipsoid"];
        }
    }
}

/**
 * Object identification map
 * Stores IDs of special Vishva objects that were previously identified using tags
 * Replaces tags: Vishva.avatar, Vishva.skeleton, Vishva.sky, Vishva.ground, 
 *                Vishva.spawnPoint, Vishva.sun, Vishva.camera
 */
export class ObjectIdMap {
    public avatarId?: string;          // ID of avatar mesh (was tag "Vishva.avatar")
    public skeletonId?: string;        // ID of avatar skeleton (was tag "Vishva.skeleton")
    public skyboxId?: string;          // ID of skybox mesh (was tag "Vishva.sky")
    public groundId?: string;          // ID of ground mesh (was tag "Vishva.ground")
    public spawnPointId?: string;      // ID of spawn point mesh (was tag "Vishva.spawnPoint")
    public sunId?: string;             // ID of sun light (was tag "Vishva.sun")
    public cameraId?: string;          // ID of main camera (was tag "Vishva.camera")
}

/**
 * Mesh metadata
 * Stores per-mesh metadata that was previously stored in tags
 * Replaces tags: Vishva.prim, Vishva.internal, invisible, Vishva.uid.<timestamp>
 */
export class MeshMetadata {
    public meshId: string;             // The mesh ID this metadata belongs to
    public isPrimitive?: boolean;      // Was tagged "Vishva.prim"
    public isInternal?: boolean;       // Was tagged "Vishva.internal"
    public isInvisible?: boolean;      // Was tagged "invisible"
    public vishvaUid?: string;         // Was tagged "Vishva.uid.<timestamp>"
}

/**
 * Map of mesh IDs to their metadata
 */
export type MeshMetadataMap = { [meshId: string]: MeshMetadata };

/**
 * Serialized bone attachment data.
 * Stores the info needed to re-attach a TransformNode to a bone after scene load.
 */
export class BoneAttachmentSerialized {
    /** ID of the "attacher-" TransformNode */
    public attacherNodeId: string;
    /** Index of the bone in the skeleton's bones array */
    public boneIndex: number;
    /** ID of the mesh whose skeleton owns the bone */
    public skeletonMeshId: string;
}
