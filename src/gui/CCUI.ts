
import { Vishva } from "../Vishva";
import { settingFormHtml, mapFormHTML } from "./CCML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { AnimationGroup, AnimationRange, Sound, Vector3 } from "babylonjs";
import { AnimUtils } from "../util/AnimUtils";
import { VInputText } from "./components/VInputText";
import { VInputNumber } from "./components/VInputNumber";
import { ActionData, ActionMap, CCSettings, CharacterController } from "babylonjs-charactercontroller";
import { EventManager } from "../eventing/EventManager";
import { VEvent } from "../eventing/VEvent";
import { VTab } from "./components/VTab";
import { VFileInput } from "./components/VFileInput";
import { SoundUI } from "./SoundUI";


/**
 * provide ui to manage character controller  settings
 */
export class CCUI {


    private _ccDiag: VDiag;
    private ccElement: HTMLElement;
    private _actions: string[] = ["walk", "walkBack", "walkBackFast", "idle", "idleJump", "preIdleJump", "postIdleJump", "run", "runJump", "preRunJump", "postRunJump", "fall", "turnLeft", "turnLeftFast", "turnRight", "turnRightFast", "strafeLeft", "strafeLeftFast", "strafeRight", "strafeRightFast", "slideBack"];

    private _cc: CharacterController;
    private _onCancelCallback: () => void;
    private _onSaveCallback: () => void;
    private _saved: boolean = false;

    //if animations group were added to av before the cc was created then cc will not know if the av isAG and cc.isAG might return false
    //below is initialized, later on, by checking nodes in av to see if any of them are targetted by any targetted aniamtions in any animation group
    private _avHasAG:boolean = false;

    setTab: HTMLDivElement;
    mapTab: HTMLDivElement;

    constructor(cc: CharacterController, onCancelCallback?: () => void, onSaveCallback?: () => void, modal: boolean = true) {
        this._cc = cc;
        this._onCancelCallback = onCancelCallback;
        this._onSaveCallback = onSaveCallback;

        let tab = new VTab("Settings", "Mappings");
        this.ccElement = tab._e;
        Vishva.gui.appendChild(this.ccElement);

        this.setTab = tab.getTabDiv("Settings");
        this.mapTab = tab.getTabDiv("Mappings");

        this.setTab.innerHTML = settingFormHtml;
        this.mapTab.innerHTML = mapFormHTML;

        this._buildSetUI(this.setTab);
        this._buildMapUI(this.mapTab);
        this._updateUI();

        let dboApply: HTMLButtonElement = VButton.create("apply", "Apply");
        let dboSave: HTMLButtonElement = VButton.create("save", "Save");
        let dboExport: HTMLButtonElement = VButton.create("export", "Export");
        let dboCancel: HTMLButtonElement = VButton.create("cancel", "Cancel");

        dboApply.style.margin = "1em";
        dboSave.style.margin = "1em";
        dboExport.style.margin = "1em";
        dboCancel.style.margin = "1em";

        this.ccElement.appendChild(dboApply);
        this.ccElement.appendChild(dboSave);
        this.ccElement.appendChild(dboExport);
        this.ccElement.appendChild(dboCancel);

        dboApply.onclick = (e) => {
            this._saveCC();
            this._updateUI();
            return true;
        };
        dboExport.onclick = (e) => {
            this._exportCC();
            return true;
        };
        dboSave.onclick = (e) => {
            this._saved = true;
            this._saveCC();
            if (this._onSaveCallback) {
                this._onSaveCallback();
            }
            this._ccDiag.dispose();
            return true;
        };
        dboCancel.onclick = (e) => {
            if (!this._saved && this._onCancelCallback) {
                this._onCancelCallback();
            }
            this._ccDiag.dispose();
            return true;
        }

        this._ccDiag = new VDiag(this.ccElement, "Character Controller Settings", VDiag.centerTop, "", "", "12em", modal);
        this._ccDiag.onHide ( () => {
            if (!this._saved && this._onCancelCallback) {
                this._onCancelCallback();
            }
            this._ccDiag.dispose();
        });

        EventManager.subscribe(VEvent._AVATAR_SWITCHED, () => { this._onAVSwicthed() });

    }

    public _onAVSwicthed() {
        if (this._ccDiag.isShown()) this._updateUI();
    }

    private _updateUI() {
        this._updateUISet();
        this._updateUIMap();
    }

    //TODO remove - we now dispose, not hide, when closed
    public toggle() {
        if (!this._ccDiag.isShown()) {
            this._updateUI();
            this._ccDiag.show();
        } else {
            this._ccDiag.hide();
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

    _sndUI: SoundUI;

    private _buildSetUI(setTab: HTMLElement) {
        let form: HTMLFormElement = <HTMLFormElement>setTab.getElementsByClassName("av-settings")[0];
        new VInputNumber(form.elasticSteps);
        new VInputNumber(form.turningSpeed);
        new VInputNumber(form.rotationSpeed);
        new VInputNumber(form.gravity);
        new VInputNumber(form.minSlopeLimit);
        new VInputNumber(form.maxSlopeLimit);
        new VInputNumber(form.stepOffset);
        new VInputNumber(form.animBlend);
        new VInputNumber(form.x);
        new VInputNumber(form.y);
        new VInputNumber(form.z);
        new VInputNumber(form.ex);
        new VInputNumber(form.ey);
        new VInputNumber(form.ez);
        new VInputNumber(form.eox);
        new VInputNumber(form.eoy);
        new VInputNumber(form.eoz);
        new SoundUI(this._cc.getSettings().sound);
        this._sndUI = SoundUI.getInstance();
        (<HTMLButtonElement>form.stepSnd).onclick = () => {
            this._sndUI.toggle();
        }

    }

    private _updateUISet() {
        let ccSettings: CCSettings = this._cc.getSettings();

        let form: HTMLFormElement = <HTMLFormElement>this.setTab.getElementsByClassName("av-settings")[0];

        form.faceForward.checked = ccSettings.faceForward;
        form.topDown.checked = ccSettings.topDown;
        form.camerElastic.checked = ccSettings.cameraElastic;
        form.elasticSteps.value = ccSettings.elasticSteps;
        form.makeInvisible.checked = ccSettings.makeInvisble;
        form.gravity.value = ccSettings.gravity;
        form.keyboard.checked = ccSettings.keyboard;
        form.maxSlopeLimit.value = ccSettings.maxSlopeLimit;
        form.minSlopeLimit.value = ccSettings.minSlopeLimit;
        form.noFirstPerson.checked = ccSettings.noFirstPerson;
        form.stepOffset.value = ccSettings.stepOffset;
        form.animBlend.value = ccSettings.animBlend;
        form.turningOff.checked = ccSettings.turningOff;
        form.turningSpeed.value = ccSettings.smoothTurnSpeed;
        form.turnInPlace.checked = this._cc.isTurnInPlace();

        // rotation speed is stored in actionMap turnLeft/turnRight speed (radians), display as degrees
        let actionMap: ActionMap = this._cc.getActionMap();
        let turnSpeedRad = actionMap.turnLeft.speed || 0;
        form.rotationSpeed.value = Math.round(turnSpeedRad * 180 / Math.PI);

        form.x.value = ccSettings.cameraTarget.x;
        form.y.value = ccSettings.cameraTarget.y;
        form.z.value = ccSettings.cameraTarget.z;
        form.ex.value = ccSettings.ellipsoid.x;
        form.ey.value = ccSettings.ellipsoid.y;
        form.ez.value = ccSettings.ellipsoid.z;
        form.eox.value = ccSettings.ellipsoidOffset.x;
        form.eoy.value = ccSettings.ellipsoidOffset.y;
        form.eoz.value = ccSettings.ellipsoidOffset.z;
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
        
        //if animations group were added to av before the cc was created then cc will not know if the av isAG
        //so check nodes in av to see if they are targetted by any targetted aniamtions in any animation group
        if (this._cc.isAg())
        {
            this._avHasAG = true
        }
        else
        {
            if (AnimUtils.containsAG(this._cc.getAvatar(),Vishva.vishva.scene.animationGroups, true))
            {
                this._avHasAG = true;
            }
            else this._avHasAG = false;
        }
        if (this._avHasAG) {
            console.debug("in CCUI, getting all AGs");
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
        this._saveCCMap();
        this._saveCCSet();
    }

    private _saveCCSet() {
        // let ccSettings: CCSettings = new CCSettings();
        let ccSettings: CCSettings = this._cc.getSettings();

        let form: HTMLFormElement = <HTMLFormElement>this.setTab.getElementsByClassName("av-settings")[0];
        ccSettings.cameraElastic = form["camerElastic"].checked;
        ccSettings.elasticSteps = form["elasticSteps"].value;
        ccSettings.makeInvisble = form["makeInvisible"].checked;
        ccSettings.topDown = form["topDown"].checked;
        ccSettings.gravity = Number(form["gravity"].value);
        ccSettings.keyboard = form["keyboard"].checked;
        ccSettings.maxSlopeLimit = Number(form["maxSlopeLimit"].value);
        ccSettings.minSlopeLimit = Number(form["minSlopeLimit"].value);
        ccSettings.noFirstPerson = form["noFirstPerson"].checked;
        ccSettings.stepOffset = Number(form["stepOffset"].value);
        ccSettings.cameraTarget = new Vector3(Number(form["x"].value), Number(form["y"].value), Number(form["z"].value));
        ccSettings.turningOff = form["turningOff"].checked;
        ccSettings.smoothTurnSpeed = Number(form["turningSpeed"].value);
        ccSettings.faceForward = form["faceForward"].checked;
        ccSettings.sound = this._sndUI.getSound();
        ccSettings.animBlend = Number(form["animBlend"].value);
        ccSettings.ellipsoid = new Vector3(Number(form["ex"].value), Number(form["ey"].value), Number(form["ez"].value));
        ccSettings.ellipsoidOffset = new Vector3(Number(form["eox"].value), Number(form["eoy"].value), Number(form["eoz"].value));

        this._cc.setSettings(ccSettings);
        this._cc.setTurnInPlace(form["turnInPlace"].checked);
        this._cc.setTurnSpeed(Number(form["rotationSpeed"].value));
        this._cc.enableBlending(Number(form["animBlend"].value));

        if (form["elipsoid"].checked) {
            this._cc.showEllipsoid(true);
        }else{
            this._cc.showEllipsoid(false);
        }

    }

    private _saveCCMap() {
        let _actMap: ActionMap = new ActionMap();
        let form: HTMLFormElement = <HTMLFormElement>this.mapTab.getElementsByClassName("av-map-form")[0];
        for (let action of this._actions) {

            let val = form[action + "-name"].value;
            if (val == "") continue;

            let data: ActionData = _actMap[action];

            if (this._cc.isAg() || this._avHasAG) {
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

        //Note : setAnimationGroups will set cc.isAg() to true if not already
        if (this._cc.isAg() || this._avHasAG) this._cc.setAnimationGroups(_actMap)
        else this._cc.setAnimationRanges(_actMap);
    }

    private _exportCC() {
        // 1. Capture settings (clone via getSettings)
        let settings: CCSettings = this._cc.getSettings();

        // 2. Serialize sound as filename string only
        if (settings.sound) {
            (settings as any).sound = settings.sound.name;
        }

        // 3. Capture action map
        let actionMap: ActionMap = this._cc.getActionMap();

        // 4. Replace AG instances with name strings, null out sounds
        let keys = Object.keys(actionMap);
        for (let key of keys) {
            let ad: ActionData = actionMap[key];
            ad.sound = null;
            if (ad.ag instanceof AnimationGroup) {
                actionMap[key]["ag"] = actionMap[key]["ag"].name;
            }
        }

        // 5. Build export object
        let exportObj = {
            settings: settings,
            actionMap: actionMap
        };

        // 6. Trigger download
        let json = JSON.stringify(exportObj, null, 2);
        let blob = new Blob([json], { type: "application/json" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = "cc-settings.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }




}
