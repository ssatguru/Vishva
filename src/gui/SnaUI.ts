
import { Vector3 } from "babylonjs";
import { Vishva } from "../Vishva";
import { SelectType, FileInputType, Range } from "./VishvaGUI";
import { DialogMgr } from "./DialogMgr";
import { SensorActuator, Sensor, Actuator, SNAproperties } from "../sna/SNA";
import { VTreeDialog } from "./components/VTreeDialog";
import { VInputVector3 } from "./components/VInputVector3";
import { VButton } from "./components/VButton";
import { snaElement } from "./snaML";
import { UIConst } from "./UIConst";
import { VDiag } from "./components/VDiag";
import { GuiUtils } from "./GuiUtils";
/**
 * Provides a UI to manage sensors and actuators
 */
export class SnaUI {

    private _vishva: Vishva;
    private STATE_IND: string = "state";

    sNaDialog: VDiag;
    sensSel: HTMLSelectElement;

    actSel: HTMLSelectElement;

    sensTbl: HTMLTableElement;

    actTbl: HTMLTableElement;


    constructor() {

        this._vishva = Vishva.vishva;
        Vishva.gui.appendChild(snaElement);

        //set the background of tab body to dark color
        let x: HTMLCollectionOf<Element> = snaElement.getElementsByClassName("vtab");
        for (let i = 0; i < x.length; i++) {
            (<HTMLElement>x[i]).style.backgroundColor = Vishva.theme.darkColors.b;
            (<HTMLElement>x[i]).style.color = Vishva.theme.darkColors.f;

        }

        //darken the first tab link - on opening the first one is assumed to be selected
        x = snaElement.getElementsByClassName("vtablink");
        (<HTMLElement>x[0]).style.backgroundColor = Vishva.theme.darkColors.b;
        (<HTMLElement>x[0]).style.color = Vishva.theme.darkColors.f;
        (<HTMLElement>x[0]).style.boxShadow = "0 8px 16px 0 rgba(0, 0, 0, 1)";

        //lighten the others
        for (let i = 1; i < x.length; i++) {
            (<HTMLElement>x[i]).style.backgroundColor = Vishva.theme.lightColors.b;
            (<HTMLElement>x[i]).style.color = Vishva.theme.lightColors.f;
            (<HTMLElement>x[i]).style.boxShadow = "none";

        }

        let y: HTMLCollectionOf<HTMLButtonElement> = snaElement.getElementsByTagName("button");
        for (let i = 0; i < y.length; i++) {
            if (y[i].innerHTML == "add") {
                VButton.styleIt(y[i]);
            }
        }

    }



    public isOpen(): boolean {
        return this.sNaDialog.isOpen();
    }

    public close() {
        this.sNaDialog.close();
    }

    private openTab(btn: HTMLButtonElement, ele: HTMLElement) {

        //display the tab body of the tab clicked and hide the other one
        let x: HTMLCollectionOf<Element> = ele.getElementsByClassName("vtab");
        for (let i = 0; i < x.length; i++) {
            if (x[i].id == btn.value) {
                (<HTMLElement>x[i]).style.display = "block";
            } else
                (<HTMLElement>x[i]).style.display = "none";
        }

        //darken the tab button which was clicked and lighten the others (body of all are dark)
        x = ele.getElementsByClassName("vtablink");
        for (let i = 0; i < x.length; i++) {
            if (x[i] == btn) {
                (<HTMLElement>x[i]).style.backgroundColor = Vishva.theme.darkColors.b;
                (<HTMLElement>x[i]).style.color = Vishva.theme.darkColors.f;
                (<HTMLElement>x[i]).style.boxShadow = "0 8px 16px 0 rgba(0, 0, 0, 1)";
            } else {
                (<HTMLElement>x[i]).style.backgroundColor = Vishva.theme.lightColors.b;
                (<HTMLElement>x[i]).style.color = Vishva.theme.lightColors.f;
                (<HTMLElement>x[i]).style.boxShadow = "none";
            }

        }

    }

    private tabIt(ele: HTMLElement) {
        let btns: HTMLCollectionOf<HTMLButtonElement> = ele.getElementsByTagName("button");
        let l = btns.length
        for (let i = 0; i < l; i++) {
            btns[i].onclick = (e) => this.openTab(<HTMLButtonElement>e.target, ele);
        }
    }

    /*
     * A dialog box with two tabs
     * One for sensor , one for actuator
     * Each tab has a drop down.
     * The one in sensor shows all sensors available in Vishva
     * The one in actuator shows all actuators available in Vishva
     */
    private create_sNaDiag() {

        //tabs
        this.tabIt(document.getElementById("sNaDetails"));

        this.sensSel = <HTMLSelectElement>document.getElementById("sensSel");
        this.actSel = <HTMLSelectElement>document.getElementById("actSel");
        var sensors: string[] = this._vishva.getSensorList();
        var actuators: string[] = this._vishva.getActuatorList();

        for (let sensor of sensors) {
            var opt: HTMLOptionElement = <HTMLOptionElement>document.createElement("option");
            opt.value = sensor;
            opt.innerHTML = sensor;
            this.sensSel.add(opt);
        }

        for (let actuator of actuators) {
            var opt: HTMLOptionElement = <HTMLOptionElement>document.createElement("option");
            opt.value = actuator;
            opt.innerHTML = actuator;
            this.actSel.add(opt);
        }

        this.sensTbl = <HTMLTableElement>document.getElementById("sensTbl");
        this.actTbl = <HTMLTableElement>document.getElementById("actTbl");
    }

    public show_sNaDiag() {

        var sens: Array<SensorActuator> = <Array<SensorActuator>>this._vishva.getSensors();
        if (sens == null) {
            DialogMgr.showAlertDiag("no mesh selected");
            return;
        }
        var acts: Array<SensorActuator> = this._vishva.getActuators();
        if (acts == null) {
            DialogMgr.showAlertDiag("no mesh selected");
            return;
        }

        if (this.sNaDialog == null) this.create_sNaDiag();

        //this.vishva.switchDisabled=true;
        this.updateSensActTbl(sens, this.sensTbl);
        this.updateSensActTbl(acts, this.actTbl);
        var addSens: HTMLElement = document.getElementById("addSens");
        addSens.onclick = (e) => {
            var s: HTMLOptionElement = <HTMLOptionElement>this.sensSel.item(this.sensSel.selectedIndex);
            var sensor: string = s.value;
            this._vishva.addSensorbyName(sensor);
            this.updateSensActTbl(this._vishva.getSensors(), this.sensTbl);
            return true;
        };
        var addAct: HTMLElement = document.getElementById("addAct");
        addAct.onclick = (e) => {
            var a: HTMLOptionElement = <HTMLOptionElement>this.actSel.item(this.actSel.selectedIndex);
            var actuator: string = a.value;
            this._vishva.addActuaorByName(actuator);
            this.updateSensActTbl(this._vishva.getActuators(), this.actTbl);
            return true;
        };
        //let sNaDetails = <HTMLElement>document.getElementById("sNaDetails");

        if (this.sNaDialog == null) {
            //this.sNaDialog = new VDiag(sNaDetails, "Sensors and Actuators", VDiag.center, "", "", "19em", false);
            this.sNaDialog = new VDiag(snaElement, "Sensors and Actuators", VDiag.center, "", "", "19em", false);
            this.sNaDialog.setBackGround(Vishva.theme.lightColors.b);
            this.sNaDialog.setForeGround(Vishva.theme.lightColors.f);
        } else this.sNaDialog.open();

    }

    /*
     * fill up the sensor and actuator tables
     * with a list of sensors and actuators
     * attached to the mesh
     */
    private updateSensActTbl(sensAct: Array<SensorActuator>, tbl: HTMLTableElement) {
        let l: number = tbl.rows.length;
        for (var i: number = l - 1; i > 0; i--) {
            tbl.deleteRow(i);
        }
        l = sensAct.length;
        for (var i: number = 0; i < l; i++) {
            var row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
            var cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
            cell.innerHTML = sensAct[i].getName();
            cell = <HTMLTableCellElement>row.insertCell();
            cell.innerHTML = sensAct[i].getProperties().signalId;
            cell = <HTMLTableCellElement>row.insertCell();

            let d: number = i;
            let editBut: HTMLButtonElement = VButton.create(d.toString(), "edit");

            editBut["sa"] = sensAct[i];
            cell.appendChild(editBut);
            editBut.onclick = (e) => {
                var el: HTMLElement = <HTMLElement>e.currentTarget;
                var sa: SensorActuator = <SensorActuator>el["sa"];
                if (sa.getType() === "SENSOR") {
                    this.showEditSensDiag(<Sensor>sa);
                } else {
                    this.showEditActDiag(<Actuator>sa);
                }
                return true;
            };
            cell = <HTMLTableCellElement>row.insertCell();

            let delBut: HTMLButtonElement = VButton.create(d.toString(), "del");

            delBut["row"] = row;
            delBut["sa"] = sensAct[i];
            cell.appendChild(delBut);
            delBut.onclick = (e) => {
                var el: HTMLElement = <HTMLElement>e.currentTarget;
                var r: HTMLTableRowElement = <HTMLTableRowElement>el["row"];
                tbl.deleteRow(r.rowIndex);
                this._vishva.removeSensorActuator(<SensorActuator>el["sa"]);
                return true;
            };
        }
    }


    editSensDiag: VDiag;
    private createEditSensDiag() {
        this.editSensDiag = new VDiag(document.getElementById("editSensDiag"), "Edit Sensor", VDiag.center, "auto", "auto", "auto", true);
        this.editSensDiag.onOpen = () => {
            this._vishva.disableKeys();
        }
        this.editSensDiag.onClose = () => {
            this._vishva.enableKeys();
        }
        let saveButton = this.editSensDiag.addButton("save");

        saveButton.onclick = (e) => {
            let sen = this.editSensDiag["s"];
            this.formRead(sen.getProperties());
            sen.handlePropertiesChange()
            this.updateSensActTbl(this._vishva.getSensors(), this.sensTbl);
            this.editSensDiag.close();
            return true;
        }

    }

    /*
    * shows a dialog box to edit sensor properties
    * dynamically creates an appropriate form.
    * 
    */
    private showEditSensDiag(sensor: Sensor) {

        //var sensNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editSensDiag.sensName");
        //sensNameEle.innerHTML = sensor.getName();

        if (this.editSensDiag == null) {
            this.createEditSensDiag();
        } else this.editSensDiag.open();

        //attach reference to the sensor so that
        //the save button click handler can retrieve it
        this.editSensDiag["s"] = sensor;
        this.editSensDiag.setTitle(sensor.getName() + " Sensor")

        var parmDiv: HTMLElement = document.getElementById("editSensDiag.parms");
        var node: Node = parmDiv.firstChild;
        if (node != null) parmDiv.removeChild(node);
        var tbl: HTMLTableElement = this.formCreate(sensor.getProperties());
        parmDiv.appendChild(tbl);

    }

    editActDiag: VDiag;
    private createEditActDiag() {
        this.editActDiag = new VDiag(document.getElementById("editActDiag"), "Edit Actuator", VDiag.centerTop, "auto", "auto");
        this.editActDiag.onOpen = () => {
            this._vishva.disableKeys();
        }
        this.editActDiag.onClose = () => {
            this._vishva.enableKeys();
        }
        let saveButton = this.editActDiag.addButton("save");
        saveButton.onclick = (e) => {
            let act = this.editActDiag["a"];
            this.formRead(act.getProperties());
            act.handlePropertiesChange();
            this.updateSensActTbl(this._vishva.getActuators(), this.actTbl);
            this.editActDiag.close();
            return true;
        }

    }

    /*
     * shows a dialog box to edit actuator properties
     * dynamically creates an appropriate form.
     * 
     */
    private showEditActDiag(actuator: Actuator) {

        //var actNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editActDiag.actName");
        //actNameEle.innerHTML = actuator.getName();

        if (this.editActDiag == null) {
            this.createEditActDiag();
        } else this.editActDiag.open();

        //attach reference to the actutor so that
        //the save button click handler can retrieve it
        this.editActDiag["a"] = actuator;
        this.editActDiag.setTitle(actuator.getName() + " Actuator")

        var parmDiv: HTMLElement = document.getElementById("editActDiag.parms");
        var node: Node = parmDiv.firstChild;
        if (node != null) {
            parmDiv.removeChild(node);
        }
        var tbl: HTMLTableElement = this.formCreate(actuator.getProperties());
        parmDiv.appendChild(tbl);

    }
    /*
     * auto generate forms based on properties
     */
    //"mapKey2Ele" maps each sna property to a corresponding UI Element which represents it
    mapKey2Ele: Object;
    private formCreate(snaP: SNAproperties): HTMLTableElement {
        this.mapKey2Ele = {};
        let tbl: HTMLTableElement = document.createElement("table");
        let keys: string[] = Object.keys(snaP);
        for (let key of keys) {
            //ignore all properties starting with "state"
            //they were created to handle internal state
            if (key.split("_")[0] === this.STATE_IND) continue;
            let row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();

            //label
            let cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
            cell.innerHTML = key;

            //value
            cell = <HTMLTableCellElement>row.insertCell();
            let t: string = typeof snaP[key];
            if (t === "object") {
                if (snaP[key] instanceof SelectType) {
                    let keyValue: SelectType = <SelectType>snaP[key];
                    let options: string[] = keyValue.values;
                    let sel: HTMLSelectElement = document.createElement("select");
                    this.mapKey2Ele[key] = sel;
                    for (let option of options) {
                        let opt: HTMLOptionElement = document.createElement("option");
                        if (option === keyValue.value) {
                            opt.selected = true;
                        }
                        opt.innerText = option;
                        sel.add(opt);
                    }
                    cell.appendChild(sel);
                } else if (snaP[key] instanceof Vector3) {
                    let v: VInputVector3 = new VInputVector3(cell, snaP[key]);
                    this.mapKey2Ele[key] = v;
                } else if (snaP[key] instanceof FileInputType) {
                    let h: HTMLElement = this._createFileInput(snaP[key]);
                    this.mapKey2Ele[key] = h;
                    cell.appendChild(h);
                } else if (snaP[key] instanceof Range) {
                    let inp: HTMLInputElement = document.createElement("input");
                    this.mapKey2Ele[key] = inp;
                    // inp.className = "ui-widget-content ui-corner-all";
                    inp.value = <string>snaP[key];
                    let r: Range = <Range>snaP[key];
                    inp.type = "range";
                    inp.max = (<number>new Number(r.max)).toString();
                    inp.min = (<number>new Number(r.min)).toString();
                    inp.step = (<number>new Number(r.step)).toString();
                    inp.value = (<number>new Number(r.value)).toString();
                    cell.appendChild(inp);
                }
            } else {
                let inp: HTMLInputElement = document.createElement("input");
                this.mapKey2Ele[key] = inp;
                //inp.id=idPrefix+key;
                inp.className = "vinput w3-input";
                inp.value = <string>snaP[key];
                if ((t === "string") || (t === "number")) {
                    inp.type = "text";
                    inp.value = <string>snaP[key];
                } else if (t === "boolean") {
                    let check: boolean = <boolean>snaP[key];
                    inp.type = "checkbox";
                    if (check) inp.setAttribute("checked", "true");
                }
                GuiUtils.stopPropagation(inp);
                cell.appendChild(inp);
            }
        }
        return tbl;
    }


    private formRead(snaP: SNAproperties) {
        var keys: string[] = Object.keys(snaP);
        for (let key of keys) {
            if (key.split("_")[0] === this.STATE_IND) continue;
            var t: string = typeof snaP[key];
            if (t === "object") {
                if (snaP[key] instanceof SelectType) {
                    var s: SelectType = <SelectType>snaP[key];
                    var sel: HTMLSelectElement = this.mapKey2Ele[key];
                    s.value = sel.value;
                } else if (snaP[key] instanceof Vector3) {
                    let v: VInputVector3 = this.mapKey2Ele[key];
                    snaP[key] = v.getValue();
                } else if (snaP[key] instanceof Range) {
                    let ie: HTMLInputElement = this.mapKey2Ele[key];
                    let r: Range = <Range>snaP[key];
                    r.value = parseFloat(ie.value);
                }
            } else {
                //let ie: HTMLInputElement=<HTMLInputElement>document.getElementById(idPrefix+key);
                let ie: HTMLInputElement = this.mapKey2Ele[key];
                if ((t === "string") || (t === "number")) {
                    if (t === "number") {
                        var v: number = parseFloat(ie.value);
                        if (isNaN(v)) snaP[key] = 0; else snaP[key] = v;
                    } else {
                        snaP[key] = ie.value;
                    }
                } else if (t === "boolean") {
                    snaP[key] = ie.checked;
                }
            }
        }

    }
    private _assetTDiag: VTreeDialog;
    private _createFileInput(fit: FileInputType): HTMLElement {
        let fibL: HTMLLabelElement = document.createElement("label");
        if (fit.value == null) {
            fibL.textContent = "No file chosen";
        } else {
            fibL.textContent = fit.value;
        }

        let fib: HTMLButtonElement = document.createElement("button");
        fib.innerText = "Choose File";

        fib.onclick = (e) => {
            if (this._assetTDiag == null) {
                this._assetTDiag = new VTreeDialog(this._vishva, fit.title, VDiag.centerBottom, Vishva.userAssets, fit.filter, fit.openAll);
            }
            this._assetTDiag.addTreeListener((f, p, l) => {
                if (l) {
                    if (fit.filter.indexOf(f.substring(f.length - 4)) >= 0) {
                        fibL.textContent = p + f
                        fit.value = fibL.textContent;
                    }
                }
            })
            this._assetTDiag.open();
        }
        let div: HTMLDivElement = document.createElement("div");
        div.appendChild(fibL);
        div.appendChild(document.createElement("br"));
        div.appendChild(fib);
        return div;
    }
}
