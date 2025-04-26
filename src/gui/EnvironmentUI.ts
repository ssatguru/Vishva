import { Vishva } from "../Vishva";
import { VishvaGUI } from "./VishvaGUI";
import { InternalAssetsUI } from "./InternalAssetsUI";
import { ColorPickerFld } from "./ColorPickerFld";
import { Color4 } from "babylonjs";
import { envElement } from "./EnvironmentML";
import { UIConst } from "./UIConst";
import { VDiag } from "./components/VDiag";
import { CCUI } from "./CCUI";

/**
 * provides a ui to manage the environment in the world
 */
export class EnvironmentUI {
    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;
    private _envDiag: VDiag;
    private _addInternalAssetUI: InternalAssetsUI;
    /*
     * Create Environment Dialog
     */
    constructor(vishva: Vishva, addInternalAssetUI: InternalAssetsUI, vishvaGUI: VishvaGUI) {

        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;
        this._addInternalAssetUI = addInternalAssetUI;

        Vishva.gui.appendChild(envElement);

        let sunElevation: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("sunElev")[0];
        let sunAzimuth: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("sunAzim")[0];

        let sunBright: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("sunBright")[0];
        let sceneBright: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("sceneBright")[0];
        let skyBright: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("skyBright")[0];
        let shade: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("shade")[0];
        let shadows: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("shadows")[0];
        let fog: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("fog")[0];
        let fov: HTMLInputElement = <HTMLInputElement>envElement.getElementsByClassName("fov")[0];

        //elevation 0 to 90  from the xz plane
        sunElevation.min = "0";
        sunElevation.max = "900";
        sunElevation.value = (10 * this._vishva.getSunElevation()).toString();
        sunElevation.oninput = (ev) => {
            this._vishva.setSunElevation(Number((<HTMLInputElement>ev.target).value));
        }


        //azimuth - 0 to 360 ,clockwise from n
        sunAzimuth.min = "0";
        sunAzimuth.max = "3600";
        sunAzimuth.value = (10 * this._vishva.getSunAzimuth()).toString();
        sunAzimuth.oninput = (ev) => {
            this._vishva.setSunAzimuth(Number((<HTMLInputElement>ev.target).value));
        }

        sunBright.min = "0";
        sunBright.max = "1000";
        sunBright.value = (500 * this._vishva.getSunBright()).toString();
        sunBright.oninput = (ev) => {
            this._vishva.setSunBright(Number((<HTMLInputElement>ev.target).value) / 500);
        }

        sceneBright.min = "0";
        sceneBright.max = "1000";
        sceneBright.value = (500 * this._vishva.getSceneBright()).toString();
        sceneBright.oninput = (ev) => {
            this._vishva.setSceneBright(Number((<HTMLInputElement>ev.target).value) / 500);
        }

        skyBright.min = "0";
        skyBright.max = "100";
        skyBright.value = (100 * this._vishva.getSkyBright()).toString();
        skyBright.oninput = (ev) => {
            this._vishva.setSkyBright(Number((<HTMLInputElement>ev.target).value) / 100);
        }

        shade.min = "0";
        shade.max = "100";
        shade.value = (100 * this._vishva.getShade()).toString();
        shade.oninput = (ev) => {
            this._vishva.setShade(Number((<HTMLInputElement>ev.target).value) / 100);
        }


        shadows.checked = this._vishva.scene.shadowsEnabled;
        shadows.oninput = (ev) => {
            this._vishva.scene.shadowsEnabled = (<HTMLInputElement>ev.target).checked;
        }


        fog.min = "0";
        fog.max = "100";
        fog.value = this._vishva.getFog().toString();
        fog.oninput = (ev) => {
            this._vishva.setFog(Number((<HTMLInputElement>ev.target).value));
        }

        let fogColDiag: ColorPickerFld = new ColorPickerFld("fog color", "fogCol", this._vishva.getFogColor(), VDiag.centerBottom, (hex, hsv, rgb) => {
            this._vishva.setFogColor(hex);
        });

        let ambColDiag: ColorPickerFld = new ColorPickerFld("ambient color", "ambCol", this._vishva.getAmbientColor(), VDiag.centerBottom, (hex, hsv, rgb) => {
            this._vishva.setAmbientColor(hex);
        });

        fov.min = "0";
        fov.max = "180";
        fov.value = this._vishva.getFov().toString();
        fov.oninput = (ev) => {
            this._vishva.setFov((<HTMLInputElement>ev.target).value);
        }

        let envSnow: HTMLButtonElement = <HTMLButtonElement>document.getElementById("envSnow");
        envSnow.onclick = (e) => {
            this._vishva.toggleSnow();
        };

        let envRain: HTMLButtonElement = <HTMLButtonElement>document.getElementById("envRain");
        envRain.onclick = (e) => {
            //this.showAlertDiag("Sorry. To be implemented");
            this._vishva.toggleRain();
        };

        var skyButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("skyButton");

        skyButton.onclick = (e) => {
            this._addInternalAssetUI.toggleAssetDiag("curated", "skyboxes");
            return true;
        };

        let skyColDiag: ColorPickerFld = new ColorPickerFld("sky color", "skyCol", this._vishva.skyColor.toHexString().substr(0, 7), VDiag.centerBottom, (hex, hsv, rgb) => {
            this._vishva.skyColor = Color4.FromHexString(hex + "ff");
            this._vishva.scene.clearColor = this._vishva.skyColor.scale(this._vishva.sun.intensity);
        });


        let envSea: HTMLButtonElement = <HTMLButtonElement>document.getElementById("envSea");
        envSea.onclick = (e) => {
            if (this._vishva.waterMesh == null || this._vishva.waterMesh.isDisposed()) {
                this._vishva.createWater();
            }
        };

        var trnButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("trnButton");
        trnButton.onclick = (e) => {

            //                if (this._groundUI2==null){
            //                    this._groundUI2=new GroundUI2(this._vishva,this._vishvaGUI);
            //                }
            //                this._groundUI2.toggle();

            //                let r =this._vishva.spreadOnGround();
            //                if (r!=null){
            //                    DialogMgr.showAlertDiag(r);
            //                }

            if (this._vishva.selectGround()) vishvaGUI.showPropDiag(this._vishva.meshSelected);
            return true;
        };

        //            
        //            let trnColDiag: ColorPickerDiag=new ColorPickerDiag("terrain color","trnCol",this._vishva.getGroundColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
        //                this._vishva.setGroundColor(hex);
        //            });

        this._envDiag = new VDiag("envDiv", "Environment", VDiag.rightBottom, "24em", "", "24em");

    }


    public toggle() {
        this._envDiag.toggle();
    }
}
