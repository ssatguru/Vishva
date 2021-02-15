import { Vishva } from "../Vishva";
import SliderOptions = JQueryUI.SliderOptions;
import SliderUIParams = JQueryUI.SliderUIParams;
import { VishvaGUI } from "./VishvaGUI";
import { InternalAssetsUI } from "./InternalAssetsUI";
import { ColorPickerFld } from "./ColorPickerFld";
import { Color4 } from "babylonjs";
import { envElement } from "./EnvironmentML";
import { UIConst } from "./UIConst";
import { VDiag } from "./components/VDiag";

/**
 * provides a ui to manage the environment in the world
 */
export class EnvironmentUI {
    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;
    // private _envDiag: VDialog;
    private _envDiag: VDiag;
    private _addInternalAssetUI: InternalAssetsUI;
    /*
     * Create Environment Dialog
     */
    constructor(vishva: Vishva, addInternalAssetUI: InternalAssetsUI, vishvaGUI: VishvaGUI) {

        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;
        this._addInternalAssetUI = addInternalAssetUI;

        //document.body.appendChild(envElement);
        Vishva.gui.appendChild(envElement);

        let sunPos: JQuery = $("#sunPos");
        let sunPosNS: JQuery = $("#sunPosNS");
        let light: JQuery = $("#light");
        let shade: JQuery = $("#shade");
        let fog: JQuery = $("#fog");
        let fov: JQuery = $("#fov");

        sunPos.slider(this._sliderOptions(0, 180, this._vishva.getSunAlpha()));
        sunPosNS.slider(this._sliderOptions(0, 180, this._vishva.getSunBeta()));
        light.slider(this._sliderOptions(0, 100, 100 * this._vishva.getLight()));
        shade.slider(this._sliderOptions(0, 100, 100 * this._vishva.getShade()));
        fog.slider(this._sliderOptions(0, 100, this._vishva.getFog()));

        let fogColDiag: ColorPickerFld = new ColorPickerFld("fog color", "fogCol", this._vishva.getFogColor(), VDiag.centerBottom, (hex, hsv, rgb) => {
            this._vishva.setFogColor(hex);
        });

        fov.slider(this._sliderOptions(0, 180, this._vishva.getFov()));

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
            this._vishva.scene.clearColor = this._vishva.skyColor;
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

            this._vishva.selectGround();
            vishvaGUI.showPropDiag();
            return true;
        };

        let ambColDiag: ColorPickerFld = new ColorPickerFld("ambient color", "ambCol", this._vishva.getAmbientColor(), VDiag.centerBottom, (hex, hsv, rgb) => {
            this._vishva.setAmbientColor(hex);
        });

        //            
        //            let trnColDiag: ColorPickerDiag=new ColorPickerDiag("terrain color","trnCol",this._vishva.getGroundColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
        //                this._vishva.setGroundColor(hex);
        //            });

        // this._envDiag = new VDialog("envDiv", "Environment", DialogMgr.rightBottom, "", "", UIConst._diagWidth);
        this._envDiag = new VDiag("envDiv", "Environment", VDiag.rightBottom, "34em", "", "34em");

    }

    private _sliderOptions(min: number, max: number, value: number): SliderOptions {
        var so: SliderOptions = {};
        so.min = min;
        so.max = max;
        so.value = value;
        so.slide = (e, ui) => { return this._handleSlide(e, ui) };
        return so;
    }


    private _handleSlide(e: Event, ui: SliderUIParams): boolean {
        var slider: string = (<HTMLElement>e.target).id;
        if (slider === "fov") {
            this._vishva.setFov(ui.value);
        } else if (slider === "sunPos") {
            this._vishva.setSunAlpha(ui.value);
        } else if (slider === "sunPosNS") {
            this._vishva.setSunBeta(ui.value);
        } else {
            var v: number = ui.value;
            if (slider === "light") {
                this._vishva.setLight(v / 100);
            } else if (slider === "shade") {
                this._vishva.setShade(v / 100);
            } else if (slider === "fog") {
                this._vishva.setFog(v);
            }
        }
        return true;
    }

    public toggle() {
        this._envDiag.toggle();
    }
}
