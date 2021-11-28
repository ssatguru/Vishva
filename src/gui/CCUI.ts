
import { Vishva } from "../Vishva";
import { settingFormHtml, mapFormHTML } from "./CCML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { AnimationGroup, AnimationRange, Vector3 } from "babylonjs";
import { AnimUtils } from "../util/AnimUtils";
import { VInputText } from "./components/VInputText";
import { VInputNumber } from "./components/VInputNumber";
import { ActionData, ActionMap, CCSettings, CharacterController } from "babylonjs-charactercontroller";
import { EventManager } from "../eventing/EventManager";
import { VEvent } from "../eventing/VEvent";
import { VTab } from "./components/VTab";


/**
 * provide ui to manage character controller  settings
 */
export class CCUI {


    private _ccDiag: VDiag;
    private ccElement: HTMLElement;
    private _actions: string[] = ["walk", "walkBack", "walkBackFast", "idle", "idleJump", "run", "runJump", "fall", "turnLeft", "turnLeftFast", "turnRight", "turnRightFast", "strafeLeft", "strafeLeftFast", "strafeRight", "strafeRightFast", "slideBack"];

    private _cc: CharacterController;
    setTab: HTMLDivElement;
    mapTab: HTMLDivElement;

    constructor(cc: CharacterController) {
        this._cc = cc;

        let tab = new VTab("Settings", "Mappings");
        this.ccElement = tab._e;
        Vishva.gui.appendChild(this.ccElement);

        this.setTab = tab.getTabDiv("Settings");
        this.mapTab = tab.getTabDiv("Mappings");

        this.setTab.innerHTML = settingFormHtml;
        this.mapTab.innerHTML = mapFormHTML;

        this._buildSetUI(this.setTab);
        this._buildMapUI(this.mapTab);

        let dboSave: HTMLButtonElement = VButton.create("save", "save");
        let dboCancel: HTMLButtonElement = VButton.create("cancel", "cancel");

        dboSave.style.margin = "1em";
        dboCancel.style.margin = "1em";

        this.ccElement.appendChild(dboSave);
        this.ccElement.appendChild(dboCancel);

        dboSave.onclick = (e) => {
            this._saveCC();
            this._ccDiag.close();
            return true;
        };
        dboCancel.onclick = (e) => {
            this._ccDiag.close();
            return true;
        }


        this._ccDiag = new VDiag(this.ccElement, "Character Controller Settings", VDiag.center, "", "", "12em");
        this._ccDiag.close();

        EventManager.subscribe(VEvent._AVATAR_SWITCHED, () => { this._onAVSwicthed() });
    }

    public _onAVSwicthed() {
        if (this._ccDiag.isOpen()) this._updateUI();
    }

    private _updateUI() {
        this._updateUISet();
        this._updateUIMap();
    }

    public toggle() {
        if (!this._ccDiag.isOpen()) {
            this._updateUI();
            this._ccDiag.open();
        } else {
            this._ccDiag.close();
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
    private _buildMapUI(mapTab: HTMLElement) {

        let avMap: HTMLElement = <HTMLElement>mapTab.getElementsByClassName("av-map")[0];

        /*
            <label class="av-m">idle
                <input type="text"     class="av-ms" name="idle-speed"        > </input>
                <input type="text"     class="av-at" name="idle-name" readonly> </input>
                <input type="text"     class="av-ms" name="idle-rate"         > </input>
                <input type="checkbox" class="av-ms" name="idle-loop"         > </input>
            </label>

        */
        for (let anim of this._actions) {
            let div = document.createElement("div");
            div.className = "av-m";
            div.innerText = anim;

            let speed = new VInputNumber(null, 1);
            speed._e.name = anim + "-speed";
            speed._e.ondrop = () => { return false };


            let nam = new VInputText();
            nam._e.name = anim + "-name";
            nam._e.classList.add("av-at");
            nam._e.style.width = "6em"
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

    private _buildSetUI(setTab: HTMLElement) {
        let form: HTMLFormElement = <HTMLFormElement>setTab.getElementsByClassName("av-settings")[0];
        new VInputNumber(form.gravity);
        new VInputNumber(form.minSlopeLimit);
        new VInputNumber(form.maxSlopeLimit);
        new VInputNumber(form.stepOffset);
        new VInputNumber(form.x);
        new VInputNumber(form.y);
        new VInputNumber(form.z);
    }

    private _updateUISet() {
        let ccSettings: CCSettings = this._cc.getSettings();
        console.log(ccSettings);
        let form: HTMLFormElement = <HTMLFormElement>this.setTab.getElementsByClassName("av-settings")[0];

        form.faceForward.checked = ccSettings.faceForward;
        form.topDown.checked = ccSettings.topDown;
        form.camerElastic.checked = ccSettings.cameraElastic;
        form.gravity.value = ccSettings.gravity;
        form.keyboard.checked = ccSettings.keyboard;
        form.maxSlopeLimit.value = ccSettings.maxSlopeLimit;
        form.minSlopeLimit.value = ccSettings.minSlopeLimit;
        form.noFirstPerson.checked = ccSettings.noFirstPerson;
        form.stepOffset.value = ccSettings.stepOffset;
        form.turningOff.checked = ccSettings.turningOff;
        form.x.value = ccSettings.cameraTarget.x;
        form.y.value = ccSettings.cameraTarget.y;
        form.z.value = ccSettings.cameraTarget.z;
    }

    private _updateUIMap() {

        //update drag event handlers on target elements
        //and intialize the names to the currently mapped animation names
        let actionMap: ActionMap = this._cc.getActionMap();
        let form: HTMLFormElement = <HTMLFormElement>this.mapTab.getElementsByClassName("av-map-form")[0];
        let actions: string[] = Object.keys(actionMap);
        for (let action of actions) {
            let actData: ActionData = actionMap[action];
            form[action + "-speed"].value = actData.speed === undefined ? "" : actData.speed;

            if ((actData.ag === undefined) && (actData.name === undefined)) {
                form[action + "-name"].value = "";
            } else {
                if (actData.ag !== undefined) {
                    form[action + "-name"].value = actData.ag.name;
                } else {
                    form[action + "-name"].value = actData.name;
                }
            }

            form[action + "-rate"].value = actData.rate === undefined ? "" : actData.rate;
            form[action + "-loop"].checked = actData.loop === undefined ? "" : actData.loop;
        }

        //get the animations on the avatar
        let al = this.ccElement.getElementsByClassName("animList")[0];
        let c = al.getElementsByTagName("div");
        var l: number = (<number>c.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            c[i].remove();
        }

        if (this._cc.isAg()) {
            let groups: AnimationGroup[] = AnimUtils.getMeshAg(this._cc.getAvatar(), this._cc.getScene().animationGroups);
            for (let g of groups) {
                this._draggableDiv(al, g.name);
                this._agByNameMap[g.name] = g;
            }
            this._draggableDiv(al, "-remove-");
        } else {
            if (!this._cc.getSkeleton()) return;
            let ranges: AnimationRange[] = this._cc.getSkeleton().getAnimationRanges();
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

    // update the charecter controller with new settings and action map
    private _saveCC() {
        this._saveCCSet();
        this._saveCCMap();
    }

    private _saveCCSet() {
        let ccSettings: CCSettings = new CCSettings();

        let form: HTMLFormElement = <HTMLFormElement>this.setTab.getElementsByClassName("av-settings")[0];
        ccSettings.cameraElastic = form["camerElastic"].checked;
        ccSettings.topDown = form["topDown"].checked;
        ccSettings.gravity = Number(form["gravity"].value);
        ccSettings.keyboard = form["keyboard"].checked;
        ccSettings.maxSlopeLimit = Number(form["maxSlopeLimit"].value);
        ccSettings.minSlopeLimit = Number(form["minSlopeLimit"].value);
        ccSettings.noFirstPerson = form["noFirstPerson"].checked;
        ccSettings.stepOffset = Number(form["stepOffset"].value);
        ccSettings.cameraTarget = new Vector3(Number(form["x"].value), Number(form["y"].value), Number(form["z"].value));
        ccSettings.turningOff = form["turningOff"].checked;
        ccSettings.faceForward = form["faceForward"].checked;
        console.log(ccSettings);
        this._cc.setSettings(ccSettings);

    }

    private _saveCCMap() {
        let _actMap: ActionMap = new ActionMap();
        let form: HTMLFormElement = <HTMLFormElement>this.mapTab.getElementsByClassName("av-map-form")[0];
        for (let action of this._actions) {

            let val = form[action + "-name"].value;
            if (val == "") continue;

            let data: ActionData = _actMap[action];

            if (this._cc.isAg()) {
                data.ag = this._agByNameMap[val];
            } else {
                data.name = val;
            }

            val = form[action + "-speed"].value;
            data.speed = Number(val);

            val = form[action + "-rate"].value;
            data.rate = Number(val);

            val = form[action + "-loop"].checked;
            data.loop = val;

            data.exist = true;

            _actMap[action] = data;

        }
        console.log(_actMap);
        if (this._cc.isAg()) this._cc.setAnimationGroups(_actMap)
        else this._cc.setAnimationRanges(_actMap);
    }





}
