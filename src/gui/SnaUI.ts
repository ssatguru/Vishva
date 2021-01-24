
import DialogOptions = JQueryUI.DialogOptions;
import DialogButtonOptions = JQueryUI.DialogButtonOptions;
import { Vector3 } from "babylonjs";
import { Vishva } from "../Vishva";
import { VishvaGUI, SelectType, FileInputType, Range } from "./VishvaGUI";
import { DialogMgr } from "./DialogMgr";
import { SensorActuator, Sensor, Actuator, SNAproperties } from "../sna/SNA";
import { VTreeDialog } from "./components/VTreeDialog";
import { VInputVector3 } from "./components/VInputVector3";
import { VButton } from "./components/VButton";
import { snaElement } from "./snaML";
import { UIConst } from "./UIConst";
/**
 * Provides a UI to manage sensors and actuators
 */
export class SnaUI {

    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;
    private STATE_IND: string = "state";

    sNaDialog: JQuery;

    sensSel: HTMLSelectElement;

    actSel: HTMLSelectElement;

    sensTbl: HTMLTableElement;

    actTbl: HTMLTableElement;


    constructor(vishva: Vishva, vishvaGUI: VishvaGUI) {
        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;
        document.body.appendChild(snaElement);
    }


    public isOpen(): boolean {
        return this.sNaDialog.dialog("isOpen");
    }

    public close() {
        this.sNaDialog.dialog("close");
    }

    private openTab(btn: HTMLButtonElement, ele: HTMLElement) {
        let x: HTMLCollectionOf<Element> = ele.getElementsByClassName("vtab");
        for (let i = 0; i < x.length; i++) {
            if (x[i].id == btn.value) {
                (<HTMLElement>x[i]).style.display = "block";
            } else
                (<HTMLElement>x[i]).style.display = "none";
        }

        x = ele.getElementsByClassName("vtablink");
        for (let i = 0; i < x.length; i++) {
            if (x[i] == btn) {
                (<HTMLElement>x[i]).classList.toggle("w3-theme-d2", true)
            } else
                (<HTMLElement>x[i]).classList.toggle("w3-theme-d2", false);

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
     * A dialog box to show the list of available sensors 
     * actuators, each in seperate tabs
     */
    private create_sNaDiag() {

        //tabs
        // var sNaDetails: JQuery = $("#sNaDetails");
        // sNaDetails.tabs();
        this.tabIt(document.getElementById("sNaDetails"));

        //dialog box
        this.sNaDialog = $("#sNaDiag");
        var dos: DialogOptions = {};
        dos.autoOpen = false;
        dos.modal = false;
        dos.resizable = false;
        dos.width = UIConst._diagWidth + "px";
        dos.height = "auto";
        dos.title = "Sensors and Actuators";
        dos.closeOnEscape = false;
        dos.closeText = "";
        dos.dragStop = (e, ui) => {
            /* required as jquery dialog's size does not re-adjust to content after it has been dragged 
             Thus if the size of sensors tab is different from the size of actuators tab  then the content of
             actuator tab is cutoff if its size is greater
             so we close and open for it to recalculate the sizes.
             */
            this.sNaDialog.dialog("close");
            this.sNaDialog.dialog("open");
        }
        this.sNaDialog.dialog(dos);
        this.sNaDialog["jpo"] = DialogMgr.center;
        this._vishvaGUI.dialogs.push(this.sNaDialog);

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
            // this.sNaDialog.dialog("close");
            // this.sNaDialog.dialog("open");
            return true;
        };
        var addAct: HTMLElement = document.getElementById("addAct");
        addAct.onclick = (e) => {
            var a: HTMLOptionElement = <HTMLOptionElement>this.actSel.item(this.actSel.selectedIndex);
            var actuator: string = a.value;
            this._vishva.addActuaorByName(actuator);
            this.updateSensActTbl(this._vishva.getActuators(), this.actTbl);
            // this.sNaDialog.dialog("close");
            // this.sNaDialog.dialog("open");
            return true;
        };

        this.sNaDialog.dialog("open");
    }
    /*
     * fill up the sensor and actuator tables
     * with a list of sensors and actuators
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

            // TODO remove, replaced by VButton
            // var delBut: HTMLButtonElement = <HTMLButtonElement>document.createElement("BUTTON");
            // delBut.id = d.toString();
            // delBut.innerHTML = "del";
            // var jq2: JQuery = <JQuery>(<any>$(delBut));
            // jq2.button();

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
    editSensDiag: JQuery;
    private createEditSensDiag() {
        this.editSensDiag = $("#editSensDiag");
        var dos: DialogOptions = {};
        dos.autoOpen = false;
        dos.modal = true;
        dos.resizable = false;
        dos.width = "auto";
        dos.title = "Edit Sensor";
        dos.closeText = "";
        dos.closeOnEscape = false;
        dos.open = () => {
            this._vishva.disableKeys();
        }
        dos.close = () => {
            this._vishva.enableKeys();
        }
        this.editSensDiag.dialog(dos);
    }
    /*
    * show a dialog box to edit sensor properties
    * dynamically creates an appropriate form.
    * 
    */
    private showEditSensDiag(sensor: Sensor) {

        var sensNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editSensDiag.sensName");
        sensNameEle.innerHTML = sensor.getName();

        if (this.editSensDiag == null) this.createEditSensDiag();
        this.editSensDiag.dialog("open");

        var parmDiv: HTMLElement = document.getElementById("editSensDiag.parms");
        var node: Node = parmDiv.firstChild;
        if (node != null) parmDiv.removeChild(node);
        var tbl: HTMLTableElement = this.formCreate(sensor.getProperties());
        parmDiv.appendChild(tbl);

        var dbo: DialogButtonOptions = {};
        dbo.text = "save";
        dbo.click = (e) => {
            this.formRead(sensor.getProperties());
            sensor.handlePropertiesChange()
            this.updateSensActTbl(this._vishva.getSensors(), this.sensTbl);
            this.editSensDiag.dialog("close");
            return true;
        };

        var dbos: DialogButtonOptions[] = [dbo];
        this.editSensDiag.dialog("option", "buttons", dbos);

    }

    editActDiag: JQuery;
    private createEditActDiag() {
        this.editActDiag = <JQuery>(<any>$("#editActDiag"));
        var dos: DialogOptions = {};
        dos.autoOpen = false;
        dos.modal = true;
        dos.resizable = false;
        dos.width = "auto";
        dos.title = "Edit Actuator";
        dos.closeText = "";
        dos.closeOnEscape = false;
        dos.open = (e, ui) => {
            this._vishva.disableKeys();
        }
        dos.close = (e, ui) => {
            this._vishva.enableKeys();
        }
        this.editActDiag.dialog(dos);
    }

    /*
     * show a dialog box to edit actuator properties
     * dynamically creates an appropriate form.
     * 
     */
    private showEditActDiag(actuator: Actuator) {

        var actNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editActDiag.actName");
        actNameEle.innerHTML = actuator.getName();

        if (this.editActDiag == null) this.createEditActDiag();
        this.editActDiag.dialog("open");

        var parmDiv: HTMLElement = document.getElementById("editActDiag.parms");
        var node: Node = parmDiv.firstChild;
        if (node != null) {
            parmDiv.removeChild(node);
        }
        var tbl: HTMLTableElement = this.formCreate(actuator.getProperties());
        parmDiv.appendChild(tbl);
        var dbo: DialogButtonOptions = {};
        dbo.text = "save";
        dbo.click = (e) => {
            this.formRead(actuator.getProperties());
            actuator.handlePropertiesChange();
            this.updateSensActTbl(this._vishva.getActuators(), this.actTbl);
            this.editActDiag.dialog("close");
            return true;
        };
        var dbos: DialogButtonOptions[] = [dbo];

        this.editActDiag.dialog("option", "buttons", dbos);
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
                    inp.className = "ui-widget-content ui-corner-all";
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
                inp.className = "ui-widget-content ui-corner-all";
                inp.value = <string>snaP[key];
                if ((t === "string") || (t === "number")) {
                    inp.type = "text";
                    inp.value = <string>snaP[key];
                } else if (t === "boolean") {
                    let check: boolean = <boolean>snaP[key];
                    inp.type = "checkbox";
                    if (check) inp.setAttribute("checked", "true");
                }
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
                this._assetTDiag = new VTreeDialog(this._vishva, fit.title, DialogMgr.centerBottom, Vishva.userAssets, fit.filter, fit.openAll);
            }
            this._assetTDiag.addTreeListener((f, p, l) => {
                if (l) {
                    if (fit.filter.indexOf(f.substring(f.length - 4)) >= 0) {
                        fibL.textContent = p + f
                        fit.value = fibL.textContent;

                    }
                }
            })


            this._assetTDiag.toggle();
        }
        let div: HTMLDivElement = document.createElement("div");
        div.appendChild(fibL);
        div.appendChild(document.createElement("br"));
        div.appendChild(fib);
        return div;
    }
}
