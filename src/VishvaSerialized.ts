import { Vector3, AnimationGroup, Scene, Tags, Sound, ISoundOptions } from "babylonjs";
import { ActionData, ActionMap, CCSettings } from "babylonjs-charactercontroller";
import { Color4 } from "babylonjs/Maths/math.color";
import { GrndSpread_Serializeable } from "./GrndSpread";
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
    public avSerialized: AvSerialized;

    public constructor(vishva: Vishva) {
        this.settings = new SettingsSerialized();
        this.misc = new MiscSerialized();
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


