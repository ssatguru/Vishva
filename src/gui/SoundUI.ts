
import { Vishva } from "../Vishva";
import { sndElement } from "./SoundML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { VInputNumber } from "./components/VInputNumber";
import { VFileInput } from "./components/VFileInput";
import { VInputSelect } from "./components/VInputSelect";
import { DialogMgr } from "./DialogMgr";
import { ISoundOptions, Sound } from "babylonjs";


/**
 * provide ui to manage sound
 */
export class SoundUI {


    private _sndDiag: VDiag;
    private _snd: Sound;

    private static instance: SoundUI = null;

    constructor(snd: Sound) {

        this._snd = snd;

        if (SoundUI.instance != null) {
            SoundUI.instance.toggle();
            return;

        }
        this._buildUI();
        this._updateUI(this._snd);

        let dboSave: HTMLButtonElement = VButton.create("save", "save");
        let dboCancel: HTMLButtonElement = VButton.create("cancel", "cancel");

        dboSave.style.margin = "1em";
        dboCancel.style.margin = "1em";

        sndElement.appendChild(dboSave);
        sndElement.appendChild(dboCancel);

        dboSave.onclick = (e) => {
            if (this._saveSnd()) this._sndDiag.close();
            return true;
        };

        dboCancel.onclick = (e) => {
            this._sndDiag.close();
            return true;
        }

        this._sndDiag = new VDiag(sndElement, "Sound Settings", VDiag.center, "", "", "12em", false);
        this._sndDiag.close();

        SoundUI.instance = this;

    }


    public toggle() {
        if (!this._sndDiag.isOpen()) {
            this._updateUI(this._snd);
            this._sndDiag.open();
        } else {
            this._sndDiag.close();
        }
    }



    private _buildUI() {
        let form: HTMLFormElement = <HTMLFormElement>sndElement.getElementsByClassName("snd-settings")[0];

        new VFileInput(form.sndFile, null, "Sound files", VDiag.centerBottom, Vishva.userAssets, "\.wav$|\.ogg$", true);
        form.attachToMesh.value = true;
        new VInputSelect(form.distModel, [{ id: "linear", desc: "linear" }, { id: "exponential", desc: "exponential" }, { id: "inverse", desc: "inverse" }]);
        new VInputNumber(form.maxDist, 100);
        new VInputNumber(form.rollOff, 1);
        new VInputNumber(form.refDist, 1);
        new VInputNumber(form.vol, 0.01);
    }

    private _updateUI(snd: Sound) {
        if (snd == null) return;
        let form: HTMLFormElement = <HTMLFormElement>sndElement.getElementsByClassName("snd-settings")[0];
        form.sndFile.value = snd.name;
        form.maxDist.value = snd.maxDistance;
        form.rollOff.value = snd.rolloffFactor;
        form.refDist.value = snd.refDistance;
        form.distModel.value = snd.distanceModel;
        form.vol.value = snd.getVolume();

    }


    private _saveSnd(): boolean {

        let sndOptions: ISoundOptions = {};

        let form: HTMLFormElement = <HTMLFormElement>sndElement.getElementsByClassName("snd-settings")[0];

        if (form["sndFile"].value == "No file chosen") {
            DialogMgr.showAlertDiag("No sound file choosen");
            return false;
        }


        sndOptions.autoplay = false;
        sndOptions.distanceModel = form["distModel"].value;
        sndOptions.loop = false;
        sndOptions.maxDistance = Number(form["maxDist"].value);
        sndOptions.refDistance = Number(form["refDist"].value);
        sndOptions.rolloffFactor = Number(form["rollOff"].value);
        sndOptions.volume = Number(form["vol"].value);
        sndOptions.spatialSound = true;

        if (this._snd != null) {
            this._snd.updateOptions(sndOptions);
        } else
            this._snd = new Sound(form["sndFile"].value, form["sndFile"].value, Vishva.vishva.scene, null, sndOptions);

        return true;

    }

    public getSound(): Sound {
        return this._snd;
    }







}
