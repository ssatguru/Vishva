
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

            this._updateCC();

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

    private _onDragStart(ev: DragEvent) {
        let e: HTMLElement = <HTMLElement>ev.target;
        ev.dataTransfer.setData("text", e.innerText);

    }



    private _onDrop(ev: DragEvent) {
        ev.preventDefault();
        let data = ev.dataTransfer.getData("text");
        let e: HTMLElement = <HTMLElement>ev.target;
        if (data === "-remove-") data = "";
        e.innerText = data;
    }

    private _onDragOver(ev: DragEvent) {
        ev.preventDefault();
    }

    private _updateAnimList() {

        //update drag event handlers on target elemenets
        let at = this.avElement.getElementsByClassName("av-at");

        for (let i = 0; i < at.length; i++) {
            let e: HTMLElement = <HTMLElement>at[i];
            e.ondrop = this._onDrop;
            e.ondragover = this._onDragOver;
        }

        let al = this.avElement.getElementsByClassName("animList")[0];

        let c = al.getElementsByTagName("div");
        var l: number = (<number>c.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            c[i].remove();
        }

        if (this._avm.isAg) {
            let groups: AnimationGroup[] = this._avm.scene.animationGroups;
            for (let g of groups) {
                this._draggableDiv(al, g.name);
                this._agByNameMap[g.name] = g;
            }
            this._draggableDiv(al, "-remove-");
        } else {
            if (!this._avm.avatarSkeleton) return;
            let ranges: AnimationRange[] = this._avm.avatarSkeleton.getAnimationRanges();
            for (let r of ranges) {
                this._draggableDiv(al, r.name);
            }
            this._draggableDiv(al, "-remove-");
        }
    }

    private _draggableDiv(al: Element, t: string) {
        let div = document.createElement("div");

        div.classList.add("av-as");
        div.draggable = true;
        div.ondragstart = this._onDragStart;

        div.innerText = t;
        al.append(div);

    }

    private _agMap = {};
    private _agByNameMap = {};
    private _arMap = {};

    // update the charecter controller with new anim map
    private _updateCC() {
        let at = this.avElement.getElementsByClassName("av-at");
        for (let i = 0; i < at.length; i++) {
            let e: HTMLElement = <HTMLElement>at[i];
            if (e.innerText === "") continue;
            if (this._avm.isAg) {
                if (e.innerText === "") delete this._agMap[e.id];
                else this._agMap[e.id] = this._agByNameMap[e.innerText];
            } else {
                if (e.innerText === "") delete this._arMap[e.id];
                else this._arMap[e.id] = e.innerText;
            }
        }
        if (this._avm.isAg) this._avm.cc.setAnimationGroups(this._agMap)
        else this._avm.cc.setAnimationRanges(this._arMap);
    }



}
