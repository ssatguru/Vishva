
import { Vishva } from "../Vishva";
import { avHTML } from "./AvatarML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { AvManager } from "../avatar/avatar";
import { AnimationGroup, AnimationRange, Mesh, Node } from "babylonjs";
import { DivideBlock } from "babylonjs/Materials/Node/Blocks/divideBlock";
import { AnimUtils } from "../util/AnimUtils";
import { VInputText } from "./components/VInputText";
import { VInputNumber } from "./components/VInputNumber";
/**
 * provide ui to manage avatar settings
 */
export class AvatarUI {


    private _avDiag: VDiag;
    private _faceFor: HTMLInputElement;
    private _avm: AvManager;
    private avElement: HTMLElement;
    private _anims: string[] = ["walk", "walkBack", "walkBackFast", "idle", "idleJump", "run", "runJump", "fall", "turnLeft", "turnLeftFast", "turnRight", "turnRightFast", "strafeLeft", "strafeLeftFast", "strafeRight", "strafeRightFast", "slideBack"];


    constructor() {
        this._avm = Vishva.vishva.avManager;

        this.avElement = document.createElement("div");
        Vishva.gui.appendChild(this.avElement);
        this.avElement.innerHTML = avHTML;
        this._buildUI();

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

        //this._updateSettings();

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
        let e: HTMLInputElement = <HTMLInputElement>ev.target;
        if (data === "-remove-") data = "";
        //e.innerText = data;
        e.value = data;
    }

    private _onDragOver(ev: DragEvent) {
        ev.preventDefault();
    }
    private _buildUI() {
        let avMap: HTMLElement = document.getElementById("av-map");
        /*
            <label class="av-m">idle
                <input type="text"     class="av-ms" name="idle-speed"        > </input>
                <input type="text"     class="av-at" name="idle-name" readonly> </input>
                <input type="text"     class="av-ms" name="idle-rate"         > </input>
                <input type="checkbox" class="av-ms" name="idle-loop"         > </input>
            </label>

        */
        for (let anim of this._anims) {
            let div = document.createElement("div");
            div.className = "av-m";
            div.innerText = anim;

            let speed = new VInputNumber(null, 1);
            speed._e.name = anim + "-speed";
            speed._e.ondrop = () => { return false };


            let nam = new VInputText();
            nam._e.name = anim + "-name";
            nam._e.classList.add("av-at");
            nam._e.readOnly = true;

            nam._e.ondrop = this._onDrop;
            nam._e.ondragover = this._onDragOver;

            let rate = new VInputNumber(null, 1);
            rate._e.name = anim + "-rate";
            rate._e.ondrop = () => { return false };

            let loop = document.createElement("input");
            loop.type = "checkbox";
            loop.name = anim + "-loop";

            avMap.append(div);
            avMap.append(speed._e);
            avMap.append(nam._e);
            avMap.append(rate._e);
            avMap.append(loop);


        }
    }

    private _updateAnimList() {

        //update drag event handlers on target elements
        //and intialize the names to the currently mapped animation names
        let actionMap: {} = this._avm.cc.getAnimationMap();

        let form = this.avElement.getElementsByTagName("form")[0];
        let actions: string[] = Object.keys(actionMap);
        for (let action of actions) {
            let actData = actionMap[action];
            if (actData["speed"]) form[action + "-speed"].value = actData["speed"];

            if (actData["ag"]) form[action + "-name"].value = actData["ag"].name;
            if (actData["name"]) form[action + "-name"].value = actData["name"];

            if (actData["rate"]) form[action + "-rate"].value = actData["rate"];
            if (actData["loop"]) form[action + "-loop"].checked = actData["loop"];
        }

        //get the animations on the avatar
        let al = this.avElement.getElementsByClassName("animList")[0];
        let c = al.getElementsByTagName("div");
        var l: number = (<number>c.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            c[i].remove();
        }

        if (this._avm.isAg) {
            let groups: AnimationGroup[] = AnimUtils.getMeshAg(this._avm.avatar, this._avm.scene.animationGroups);
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

    private _agByNameMap = {};

    // update the charecter controller with new anim map
    private _updateCC() {
        let _actMap = {};
        let form = this.avElement.getElementsByTagName("form")[0];
        for (let action of this._anims) {

            let val = form[action + "-name"].value;
            if (val == "") continue;

            let data = {};

            if (this._avm.isAg) {
                data["ag"] = this._agByNameMap[val];
            } else {
                data["name"] = val;
            }

            val = form[action + "-speed"].value;
            data["speed"] = Number(val);

            val = form[action + "-rate"].value;
            data["rate"] = Number(val);

            val = form[action + "-loop"].checked;
            data["loop"] = val;

            _actMap[action] = data;

        }
        console.log(_actMap);
        if (this._avm.isAg) this._avm.cc.setAnimationGroups(_actMap)
        else this._avm.cc.setAnimationRanges(_actMap);
    }



}
