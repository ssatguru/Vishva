
import { Vishva } from "../Vishva";
import { avHTML } from "./AvatarML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { AvManager } from "../avatar/avatar";
import { AnimationGroup, AnimationRange, Mesh, Node } from "babylonjs";
import { DivideBlock } from "babylonjs/Materials/Node/Blocks/divideBlock";
/**
 * provide ui to manage avatar settings
 */
export class AvatarUI {


    private _avDiag: VDiag;
    private _faceFor: HTMLInputElement;
    private _avm: AvManager;
    private avElement: HTMLElement;


    constructor() {
        this._avm = Vishva.vishva.avManager;

        this.avElement = document.createElement("div");
        Vishva.gui.appendChild(this.avElement);
        this.avElement.innerHTML = avHTML;


        let dboSave: HTMLButtonElement = VButton.create("save", "save");
        let dboCancel: HTMLButtonElement = VButton.create("cancel", "cancel");

        dboSave.style.margin = "1em";
        dboCancel.style.margin = "1em";

        this.avElement.appendChild(dboSave);
        this.avElement.appendChild(dboCancel);

        dboSave.onclick = (e) => {
            this._avm.setFaceForward(this._faceFor.checked);
            this._avDiag.close();
            return true;
        };
        dboCancel.onclick = (e) => {
            this._avDiag.close();
            return true;
        }


        this._faceFor = <HTMLInputElement>this.avElement.getElementsByClassName("faceFor")[0];

        this._updateSettings();

        this._avDiag = new VDiag(this.avElement, "Avatar Settings", VDiag.center, "", "", "24em");
        this._avDiag.close();
    }

    private _updateSettings() {
        this._faceFor.checked = this._avm.getFaceForward();
        this._updateAnimList();
    }

    public toggle() {
        if (!this._avDiag.isOpen()) {
            this._updateSettings();
            this._avDiag.open();
        } else {
            this._avDiag.close();
        }
    }

    private _updateAnimList() {
        let al = this.avElement.getElementsByClassName("animList")[0];

        let c = al.children;
        var l: number = (<number>c.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            c[i].remove();
        }

        let hdr = document.createElement("div");
        al.append(hdr);
        if (this._avm.isAg) {
            let groups: AnimationGroup[] = this._avm.scene.animationGroups;
            hdr.innerHTML = "animation groups";
            for (let g of groups) {
                let div = document.createElement("div");
                div.innerHTML = g.name;
                al.append(div);
            }
        } else {
            if (!this._avm.avatarSkeleton) return;
            let ranges: AnimationRange[] = this._avm.avatarSkeleton.getAnimationRanges();
            hdr.innerHTML = "animation ranges";
            for (let r of ranges) {
                let div = document.createElement("div");
                div.innerHTML = r.name;
                al.append(div);
            }
        }



    }



}
