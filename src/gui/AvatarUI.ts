
import { Vishva } from "../Vishva";
import { avHTML } from "./AvatarML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { AvManager } from "../avatar/avatar";
/**
 * provide ui to manage avatar settings
 */
export class AvatarUI {


    private _avDiag: VDiag;
    private _faceFor: HTMLInputElement;
    private _avm: AvManager;


    constructor() {
        this._avm = Vishva.vishva.avManager;

        let div = document.createElement("div");
        Vishva.gui.appendChild(div);
        div.innerHTML = avHTML;


        let dboSave: HTMLButtonElement = VButton.create("save", "save");
        let dboCancel: HTMLButtonElement = VButton.create("cancel", "cancel");

        dboSave.style.margin = "1em";
        dboCancel.style.margin = "1em";

        div.appendChild(dboSave);
        div.appendChild(dboCancel);

        dboSave.onclick = (e) => {

            this._avm.setFaceForward(this._faceFor.checked);
            this._avDiag.close();
            return true;
        };
        dboCancel.onclick = (e) => {
            this._avDiag.close();
            return true;
        }


        this._faceFor = <HTMLInputElement>div.getElementsByClassName("faceFor")[0];


        this._updateSettings();

        this._avDiag = new VDiag(div, "Avatar Settings", VDiag.center, "", "", "24em");
        this._avDiag.close();
    }

    private _updateSettings() {
        this._faceFor.checked = this._avm.getFaceForward();
    }

    public toggle() {
        if (!this._avDiag.isOpen()) {
            this._updateSettings();
            this._avDiag.open();
        } else {
            this._avDiag.close();
        }
    }

}
