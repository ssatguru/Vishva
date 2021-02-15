import { Vishva, LightParm } from "../../Vishva";

import { ColorPickerFld } from "../ColorPickerFld";
import { VDiag } from "../components/VDiag";

import { DialogMgr } from "../DialogMgr";

/**
 * Provides UI for the Light tab in mesh properties dialog
 */
export class LightUI {
    private _vishva: Vishva;
    private _lightAtt: HTMLInputElement;
    private _lightType: HTMLSelectElement;
    private _lightDiff: ColorPickerFld;
    private _lightSpec: ColorPickerFld;
    private _lightInten: HTMLInputElement;
    private _lightRange: HTMLInputElement;
    private _lightRadius: HTMLInputElement;
    private _lightAngle: HTMLInputElement;
    private _lightExp: HTMLInputElement;
    private _lightGndClr: HTMLInputElement;
    private _lightDirX: HTMLInputElement;
    private _lightDirY: HTMLInputElement;
    private _lightDirZ: HTMLInputElement;

    constructor(vishva: Vishva) {
        this._vishva = vishva;

        this._lightAtt = <HTMLInputElement>document.getElementById("lightAtt");
        this._lightType = <HTMLSelectElement>document.getElementById("lightType");
        this._lightDiff = new ColorPickerFld("diffuse light", "lightDiff", "#ffffff", VDiag.centerBottom, (hex, hsv, rgb) => {
            this._applyLight();
        });

        this._lightSpec = new ColorPickerFld("specular light", "lightSpec", "#ffffff", VDiag.centerBottom, (hex, hsv, rgb) => {
            this._applyLight();
        });
        this._lightInten = <HTMLInputElement>document.getElementById("lightInten");
        this._lightRange = <HTMLInputElement>document.getElementById("lightRange");
        this._lightRadius = <HTMLInputElement>document.getElementById("lightAtt");
        this._lightAngle = <HTMLInputElement>document.getElementById("lightAngle");
        this._lightExp = <HTMLInputElement>document.getElementById("lightExp");
        this._lightGndClr = <HTMLInputElement>document.getElementById("lightGndClr");
        this._lightDirX = <HTMLInputElement>document.getElementById("lightDirX");
        this._lightDirY = <HTMLInputElement>document.getElementById("lightDirY");
        this._lightDirZ = <HTMLInputElement>document.getElementById("lightDirZ");

        this._lightAtt.onchange = () => {
            if (!this._lightAtt.checked) {
                this._vishva.detachLight();
            } else this._applyLight();
        };
        this._lightType.onchange = () => this._applyLight();
        this._lightInten.onchange = () => this._applyLight();
        this._lightRange.onchange = () => this._applyLight();
        this._lightAngle.onchange = () => this._applyLight();
        this._lightExp.onchange = () => this._applyLight();
        this._lightDirX.onchange = () => this._applyLight();
        this._lightDirY.onchange = () => this._applyLight();
        this._lightDirZ.onchange = () => this._applyLight();


    }

    public update() {

        let lightParm: LightParm = this._vishva.getAttachedLight();
        if (lightParm === null) {
            this._lightAtt.checked = false;
            lightParm = new LightParm();
        } else {
            this._lightAtt.checked = true;
        }
        this._lightType.value = lightParm.type;
        this._lightDiff.setColor(lightParm.diffuse.toHexString());
        this._lightSpec.setColor(lightParm.specular.toHexString());
        this._lightInten.value = Number(lightParm.intensity).toString();
        this._lightRange.value = Number(lightParm.range).toString();
        this._lightRadius.value = Number(lightParm.radius).toString();
        //this.lightAngle.value = Number(lightParm.angle * 180 / Math.PI).toString();
        this._lightAngle.value = Number(lightParm.angle).toString();
        this._lightExp.value = Number(lightParm.exponent).toString();
        this._lightGndClr.value = lightParm.gndClr.toHexString();
        this._lightDirX.value = Number(lightParm.direction.x).toString();
        this._lightDirY.value = Number(lightParm.direction.y).toString();
        this._lightDirZ.value = Number(lightParm.direction.z).toString();


    }

    private _applyLight() {
        //            if (!this.lightAtt.checked) {
        //                this.vishva.detachLight();
        //                return;
        //            }
        if (!this._lightAtt.checked) return;
        let lightParm: LightParm = new LightParm();
        lightParm.type = this._lightType.value;
        lightParm.diffuse = BABYLON.Color3.FromHexString(this._lightDiff.getColor());
        lightParm.specular = BABYLON.Color3.FromHexString(this._lightSpec.getColor());
        lightParm.intensity = parseFloat(this._lightInten.value);
        lightParm.range = parseFloat(this._lightRange.value);
        lightParm.radius = parseFloat(this._lightRadius.value);
        lightParm.angle = parseFloat(this._lightAngle.value);
        lightParm.direction.x = parseFloat(this._lightDirX.value);
        lightParm.direction.y = parseFloat(this._lightDirY.value);
        lightParm.direction.z = parseFloat(this._lightDirZ.value);
        lightParm.exponent = parseFloat(this._lightExp.value);
        lightParm.gndClr = BABYLON.Color3.FromHexString(this._lightGndClr.value);
        this._vishva.attachAlight(lightParm);

    }
}


