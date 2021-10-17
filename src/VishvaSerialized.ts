/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import { Vector3 } from "babylonjs";
import { Color4 } from "babylonjs/Maths/math.color";
import { GroundSPSserialized } from "./GroundSPS";
import { SNAserialized } from "./sna/SNA";

export class VishvaSerialized {
    //babylon version
    public bVer: string;
    //vishva version
    public vVer: string;
    public snas: SNAserialized[];
    public settings: SettingsSerialized;
    public guiSettings: Object;
    public misc: MiscSerialized;
    public groundSPSserializeds: GroundSPSserialized[];

    public constructor() {
        this.settings = new SettingsSerialized();
        this.misc = new MiscSerialized();

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

}


