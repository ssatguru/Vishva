import { Vishva } from "../Vishva";
import SliderOptions = JQueryUI.SliderOptions;
import SliderUIParams = JQueryUI.SliderUIParams;
import { VishvaGUI } from "./VishvaGUI";
import { VDialog } from "./components/VDialog";
import { InternalAssetsUI } from "./InternalAssetsUI";
import { ColorPickerDiag } from "./ColorPickerDiag";
import { DialogMgr } from "./DialogMgr";
import { Color4 } from "babylonjs";
import { envElement } from "./EnvironmentML";

/**
 * provides a ui to manage the environment in the world
 */
export class EnvironmentUI {
    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;
    private _envDiag: VDialog;
    private _addInternalAssetUI: InternalAssetsUI;
    /*
     * Create Environment Dialog
     */
    constructor(vishva: Vishva, addInternalAssetUI: InternalAssetsUI, vishvaGUI: VishvaGUI) {
        console.log("creating env ui");
        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;
        this._addInternalAssetUI = addInternalAssetUI;

        document.body.appendChild(envElement);


        let sunPos: JQuery = $("#sunPos");
        let light: JQuery = $("#light");
        let shade: JQuery = $("#shade");
        let fog: JQuery = $("#fog");
        let fov: JQuery = $("#fov");

        sunPos.slider(this._sliderOptions(0, 180, this._vishva.getSunPos()));
        light.slider(this._sliderOptions(0, 100, 100 * this._vishva.getLight()));
        shade.slider(this._sliderOptions(0, 100, 100 * this._vishva.getShade()));
        fog.slider(this._sliderOptions(0, 100, this._vishva.getFog()));

        let fogColDiag: ColorPickerDiag = new ColorPickerDiag("fog color", "fogCol", this._vishva.getFogColor(), DialogMgr.centerBottom, (hex, hsv, rgb) => {
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

        let skyColDiag: ColorPickerDiag = new ColorPickerDiag("sky color", "skyCol", this._vishva.skyColor.toHexString().substr(0, 7), DialogMgr.centerBottom, (hex, hsv, rgb) => {
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

        let ambColDiag: ColorPickerDiag = new ColorPickerDiag("ambient color", "ambCol", this._vishva.getAmbientColor(), DialogMgr.centerBottom, (hex, hsv, rgb) => {
            this._vishva.setAmbientColor(hex);
        });

        //            
        //            let trnColDiag: ColorPickerDiag=new ColorPickerDiag("terrain color","trnCol",this._vishva.getGroundColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
        //                this._vishva.setGroundColor(hex);
        //            });

        this._envDiag = new VDialog("envDiv", "Environment", DialogMgr.rightCenter, "", "", 350);
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
            this._vishva.setSunPos(ui.value);
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
