namespace org.ssatguru.babylonjs.vishva {
    import AnimationRange = BABYLON.AnimationRange;

    import Skeleton = BABYLON.Skeleton;

    import Vector3 = BABYLON.Vector3;

    import DialogButtonOptions = JQueryUI.DialogButtonOptions;

    import DialogOptions = JQueryUI.DialogOptions;

    import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;

    import SliderOptions = JQueryUI.SliderOptions;

    import SliderUIParams = JQueryUI.SliderUIParams;

    export class VishvaGUI {
        
        private vishva: Vishva;

        local: boolean = true;

        downloadLink: HTMLAnchorElement;

        private static LARGE_ICON_SIZE: string = "width:128px;height:128px;";

        private static SMALL_ICON_SIZE: string = "width:64px;height:64px;";

        private menuBarOn: boolean = false;

        private STATE_IND: string = "state";

        public constructor(vishva: Vishva) {
            this.vishva = vishva;
            var showMenu: HTMLButtonElement = <HTMLButtonElement>document.getElementById("showMenu");
            showMenu.style.visibility = "visible";
            document.getElementById("menubar").style.visibility = "visible";
            var menuBar: JQuery = <JQuery>(<any>$("#menubar"));
            var jpo: JQueryPositionOptions = <JQueryPositionOptions>Object.defineProperty({
                my: "left center",
                at: "right center",
                of: showMenu
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.JQueryPositionOptions"] });
            menuBar.position(jpo);
            menuBar.hide(null);
            showMenu.onclick = ((menuBar) => {
                return (e) => {
                    if (this.menuBarOn) {
                        menuBar.hide("slide");
                    } else {
                        menuBar.show("slide");
                    }
                    this.menuBarOn = !this.menuBarOn;
                    return true;
                }
            })(menuBar);
            this.createJPOs();
            this.updateAddMenu();
            this.setNavMenu();
            this.setEditMenu();
            this.createEditDiag();
            this.createEnvDiag();
            this.createDownloadDiag();
            this.createUploadDiag();
            this.createHelpDiag();
            this.createAlertDiag();
            this.create_sNaDiag();
            this.createEditSensDiag();
            this.createEditActDiag();
            window.addEventListener("resize", (evt) => { return this.onWindowResize(evt) });
        }

        private centerBottom: JQueryPositionOptions;

        private leftCenter: JQueryPositionOptions;

        private rightCenter: JQueryPositionOptions;

        private createJPOs() {
            this.centerBottom = <JQueryPositionOptions>Object.defineProperty({
                at: "center bottom",
                my: "center bottom",
                of: window
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.JQueryPositionOptions"] });
            this.leftCenter = <JQueryPositionOptions>Object.defineProperty({
                at: "left center",
                my: "left center",
                of: window
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.JQueryPositionOptions"] });
            this.rightCenter = <JQueryPositionOptions>Object.defineProperty({
                at: "right center",
                my: "right center",
                of: window
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.JQueryPositionOptions"] });
        }

        /**
         * this array will be used store all dialogs whose position needs to be
         * reset on window resize
         */
        private dialogs: Array<JQuery> = new Array<JQuery>();

        /**
         * resposition all dialogs to their original default postions without this,
         * a window resize could end up moving some dialogs outside the window and
         * thus make them disappear
         * 
         * @param evt
         */
        private onWindowResize(evt: Event) {
            for (var index161 = 0; index161 < this.dialogs.length; index161++) {
                var jq = this.dialogs[index161];
                {
                    var jpo: JQueryPositionOptions = <JQueryPositionOptions>jq["jpo"];
                    if (jpo != null) {
                        jq.dialog("option", "position", jpo);
                        var open: boolean = <boolean><any>jq.dialog("isOpen");
                        if (open) {
                            jq.dialog("close");
                            jq.dialog("open");
                        }
                    }
                }
            }
        }

        skyboxesDiag: JQuery;

        private updateAddMenu() {
            var assetTypes: string[] = Object.keys(this.vishva.assets);
            var addMenu: HTMLUListElement = <HTMLUListElement>document.getElementById("AddMenu");
            addMenu.style.visibility = "visible";
            var f: (p1: MouseEvent) => any = (e) => { return this.onAddMenuItemClick(e) };
            for (var index162 = 0; index162 < assetTypes.length; index162++) {
                var assetType = assetTypes[index162];
                {
                    if (assetType === "sounds") {
                        continue;
                    }
                    var li: HTMLLIElement = document.createElement("li");
                    li.id = "add-" + assetType;
                    li.innerText = assetType;
                    li.onclick = f;
                    addMenu.appendChild(li);
                }
            }
        }

        private onAddMenuItemClick(e: MouseEvent): any {
            var li: HTMLLIElement = <HTMLLIElement>e.target;
            var jq: JQuery = <JQuery>li["diag"];
            if (jq == null) {
                var assetType: string = li.innerHTML;
                jq = this.createAssetDiag(assetType);
                li["diag"] = jq;
            }
            jq.dialog("open");
            return true;
        }

        private createAssetDiag(assetType: string): JQuery {
            var div: HTMLDivElement = document.createElement("div");
            div.id = assetType + "Div";
            div.setAttribute("title", assetType);
            var table: HTMLTableElement = document.createElement("table");
            table.id = assetType + "Tbl";
            var items: Array<string> = <Array<string>>this.vishva.assets[assetType];
            this.updateAssetTable(table, assetType, items);
            div.appendChild(table);
            document.body.appendChild(div);
            var jq: JQuery = <JQuery>(<any>$("#" + div.id));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({
                autoOpen: false,
                resizable: true,
                position: this.centerBottom,
                width: (<any>"100%"),
                height: (<any>"auto")
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            jq.dialog(dos);
            jq["jpo"] = this.centerBottom;
            this.dialogs.push(jq);
            return jq;
        }

        private updateAssetTable(tbl: HTMLTableElement, assetType: string, items: Array<string>) {
            if (tbl.rows.length > 0) {
                return;
            }
            var f: (p1: MouseEvent) => any = (e) => { return this.onAssetImgClick(e) };
            var row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
            for (var index163 = 0; index163 < items.length; index163++) {
                var item = items[index163];
                {
                    var img: HTMLImageElement = document.createElement("img");
                    img.id = item;
                    img.src = "vishva/assets/" + assetType + "/" + item + "/" + item + ".jpg";
                    img.setAttribute("style", VishvaGUI.SMALL_ICON_SIZE + "cursor:pointer;");
                    img.className = assetType;
                    img.onclick = f;
                    var cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
                    cell.appendChild(img);
                }
            }
            var row2: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
            for (var index164 = 0; index164 < items.length; index164++) {
                var item = items[index164];
                {
                    var cell: HTMLTableCellElement = <HTMLTableCellElement>row2.insertCell();
                    cell.innerText = item;
                }
            }
        }

        private onAssetImgClick(e: Event): any {
            var i: HTMLImageElement = <HTMLImageElement>e.target;
            if (i.className === "skyboxes") {
                this.vishva.setSky(i.id);
            } else if (i.className === "primitives") {
                this.vishva.addPrim(i.id);
            } else {
                this.vishva.loadAsset(i.className, i.id);
            }
            return true;
        }

        editDialog: JQuery;

        private createEditDiag() {
            var editMenu: JQuery = <JQuery>(<any>$("#editMenu"));
            editMenu.menu();
            var em: JQuery = <JQuery><any>editMenu;
            em.unbind("keydown");
            this.editDialog = <JQuery>(<any>$("#editDiv"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({
                autoOpen: false,
                resizable: false,
                position: this.leftCenter,
                width: (<any>"auto"),
                height: (<any>"auto")
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            this.editDialog.dialog(dos);
            this.editDialog["jpo"] = this.leftCenter;
            this.dialogs.push(this.editDialog);
        }

        localAxis: HTMLElement = document.getElementById("local");

        snapTrans: HTMLElement = document.getElementById("snapTrans");
        snapRot: HTMLElement = document.getElementById("snapRot");
        snapper: HTMLElement = document.getElementById("snapper");

        public showEditMenu(): boolean {
            var alreadyOpen: boolean = <boolean>(<any>this.editDialog.dialog("isOpen"));
            if (alreadyOpen) return alreadyOpen;
            if (this.vishva.isSpaceLocal()) {
                this.local = true;
                this.localAxis.innerHTML = "Switch to Global Axis";
            } else {
                this.local = false;
                this.localAxis.innerHTML = "Switch to Local Axis";
            }
            if (this.vishva.isSnapperOn()) {
                this.snapper.innerHTML = "Snapper Off";
            } else {
                this.snapper.innerHTML = "Snapper On";
            }
            if (this.vishva.isSnapTransOn()) {
                this.snapTrans.innerHTML = "Snap Translate Off";
            } else {
                this.snapTrans.innerHTML = "Snap Translate On";
            }
            if (this.vishva.isSnapRotOn()) {
                this.snapRot.innerHTML = "Snap Rotate Off";
            } else {
                this.snapRot.innerHTML = "Snap Rotate On";
            }
            this.editDialog.dialog("open");
            return false;
        }

        public closeEditMenu() {
            this.editDialog.dialog("close");
        }

        envDiag: JQuery;

        private createEnvDiag() {
            //var sunPos: JQuery = <JQuery>(<any>$("#sunPos"));
            var sunPos: JQuery = $("#sunPos");
            var light: JQuery = <JQuery>(<any>$("#light"));
            var shade: JQuery = <JQuery>(<any>$("#shade"));
            var fog: JQuery = <JQuery>(<any>$("#fog"));
            var fov: JQuery = <JQuery>(<any>$("#fov"));
            sunPos.slider(this.sliderOptions(0, 180, this.vishva.getSunPos()));
            light.slider(this.sliderOptions(0, 100, 100 * this.vishva.getLight()));
            shade.slider(this.sliderOptions(0, 100, 100 * this.vishva.getShade()));
            fog.slider(this.sliderOptions(0, 100, 1000 * this.vishva.getFog()));
            fov.slider(this.sliderOptions(0, 180, this.vishva.getFov()));
            var skyButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("skyButton");
            skyButton.onclick = (e) => {
                var foo: HTMLElement = document.getElementById("add-skyboxes");
                foo.click();
                return true;
            };
            var trnButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("trnButton");
            trnButton.onclick = (e) => {
                this.showAlertDiag("Sorry. To be implemneted soon");
                return true;
            };
            var colorEle: HTMLElement = document.getElementById("color-picker");
            var cp: ColorPicker = new ColorPicker(colorEle, (hex, hsv, rgb) => { return this.colorPickerHandler(hex, hsv, rgb) });
            var setRGB: Function = <Function>cp["setRgb"];
            var color: number[] = this.vishva.getGroundColor();
            if (color != null) {
                var rgb: RGB = new RGB();
                rgb.r = color[0];
                rgb.g = color[1];
                rgb.b = color[2];
                cp.setRgb(rgb);
            }
            this.envDiag = <JQuery>(<any>$("#envDiv"));
            var dos1: DialogOptions = <DialogOptions>Object.defineProperty({
                autoOpen: false,
                resizable: false,
                position: this.rightCenter,
                minWidth: 350,
                height: (<any>"auto")
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            this.envDiag.dialog(dos1);
            this.envDiag["jpo"] = this.rightCenter;
            this.dialogs.push(this.envDiag);
        }

        downloadDialog: JQuery;

        private createDownloadDiag() {
            this.downloadLink = <HTMLAnchorElement>document.getElementById("downloadLink");
            this.downloadDialog = <JQuery>(<any>$("#saveDiv"));
            this.downloadDialog.dialog();
            this.downloadDialog.dialog("close");
        }

        loadDialog: JQuery;

        private createUploadDiag() {
            var loadFileInput: HTMLInputElement = <HTMLInputElement>document.getElementById("loadFileInput");
            var loadFileOk: HTMLButtonElement = <HTMLButtonElement>document.getElementById("loadFileOk");
            loadFileOk.onclick = ((loadFileInput) => {
                return (e) => {
                    var fl: FileList = loadFileInput.files;
                    if (fl.length === 0) {
                        alert("no file slected");
                        return null;
                    }
                    var file: File = null;
                    for (var index165 = 0; index165 < fl.length; index165++) {
                        var f = fl[index165];
                        {
                            file = f;
                        }
                    }
                    this.vishva.loadAssetFile(file);
                    this.loadDialog.dialog("close");
                    return true;
                }
            })(loadFileInput);
            this.loadDialog = <JQuery>(<any>$("#loadDiv"));
            this.loadDialog.dialog();
            this.loadDialog.dialog("close");
        }

        helpDiag: JQuery;

        private createHelpDiag() {
            var obj: any = $("#helpDiv");
            this.helpDiag = <JQuery>obj;
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({
                autoOpen: false,
                resizable: false,
                width: 500
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            this.helpDiag.dialog(dos);
        }

        sNaDialog: JQuery;

        sensSel: HTMLSelectElement;

        actSel: HTMLSelectElement;

        sensTbl: HTMLTableElement;

        actTbl: HTMLTableElement;

        private create_sNaDiag() {
            var sNaDetails: JQuery = <JQuery>(<any>$("#sNaDetails"));
            sNaDetails.tabs();
            this.sNaDialog = <JQuery>(<any>$("#sNaDiag"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            dos.autoOpen = false;
            dos.modal = false;
            dos.resizable = false;
            dos.width = "auto";
            dos.title = "Sensors and Actuators";
            dos.close = (e, ui) => {
                this.vishva.switchDisabled = false;
            };
            this.sNaDialog.dialog(dos);
            this.sensSel = <HTMLSelectElement>document.getElementById("sensSel");
            this.actSel = <HTMLSelectElement>document.getElementById("actSel");
            var sensors: string[] = this.vishva.getSensorList();
            var actuators: string[] = this.vishva.getActuatorList();
            for (var index166 = 0; index166 < sensors.length; index166++) {
                var sensor = sensors[index166];
                {
                    var opt: HTMLOptionElement = <HTMLOptionElement>document.createElement("option");
                    opt.value = sensor;
                    opt.innerHTML = sensor;
                    this.sensSel.add(opt);
                }
            }
            for (var index167 = 0; index167 < actuators.length; index167++) {
                var actuator = actuators[index167];
                {
                    var opt: HTMLOptionElement = <HTMLOptionElement>document.createElement("option");
                    opt.value = actuator;
                    opt.innerHTML = actuator;
                    this.actSel.add(opt);
                }
            }
            this.sensTbl = <HTMLTableElement>document.getElementById("sensTbl");
            this.actTbl = <HTMLTableElement>document.getElementById("actTbl");
        }

        private show_sNaDiag() {
            var sens: Array<SensorActuator> = <Array<SensorActuator>>this.vishva.getSensors();
            if (sens == null) {
                this.showAlertDiag("no mesh selected");
                return;
            }
            var acts: Array<SensorActuator> = this.vishva.getActuators();
            if (acts == null) {
                this.showAlertDiag("no mesh selected");
                return;
            }
            this.vishva.switchDisabled = true;
            this.updateSensActTbl(sens, this.sensTbl);
            this.updateSensActTbl(acts, this.actTbl);
            var addSens: HTMLElement = document.getElementById("addSens");
            addSens.onclick = (e) => {
                var s: HTMLOptionElement = <HTMLOptionElement>this.sensSel.item(this.sensSel.selectedIndex);
                var sensor: string = s.value;
                this.vishva.addSensorbyName(sensor);
                this.updateSensActTbl(this.vishva.getSensors(), this.sensTbl);
                this.sNaDialog.dialog("close");
                this.sNaDialog.dialog("open");
                return true;
            };
            var addAct: HTMLElement = document.getElementById("addAct");
            addAct.onclick = (e) => {
                var a: HTMLOptionElement = <HTMLOptionElement>this.actSel.item(this.actSel.selectedIndex);
                var actuator: string = a.value;
                this.vishva.addActuaorByName(actuator);
                this.updateSensActTbl(this.vishva.getActuators(), this.actTbl);
                this.sNaDialog.dialog("close");
                this.sNaDialog.dialog("open");
                return true;
            };
            this.sNaDialog.dialog("open");
        }

        private updateSensActTbl(sensAct: Array<SensorActuator>, tbl: HTMLTableElement) {
            var l: number = tbl.rows.length;
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
                var editBut: HTMLButtonElement = <HTMLButtonElement>document.createElement("BUTTON");
                editBut.innerHTML = "edit";
                var jq: JQuery = <JQuery>(<any>$(editBut));
                jq.button();
                var d: number = i;
                editBut.id = d.toString();
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
                var delBut: HTMLButtonElement = <HTMLButtonElement>document.createElement("BUTTON");
                delBut.innerHTML = "del";
                var jq2: JQuery = <JQuery>(<any>$(delBut));
                jq2.button();
                delBut.id = d.toString();
                delBut["row"] = row;
                delBut["sa"] = sensAct[i];
                cell.appendChild(delBut);
                delBut.onclick = (e) => {
                    var el: HTMLElement = <HTMLElement>e.currentTarget;
                    var r: HTMLTableRowElement = <HTMLTableRowElement>el["row"];
                    tbl.deleteRow(r.rowIndex);
                    this.vishva.removeSensorActuator(<SensorActuator>el["sa"]);
                    return true;
                };
            }
        }

        private createEditSensDiag() {
            var editSensDiag: JQuery = <JQuery>(<any>$("#editSensDiag"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            dos.autoOpen = false;
            dos.modal = true;
            dos.resizable = false;
            dos.width = "auto";
            dos.title = "Edit Sensor";
            editSensDiag.dialog(dos);
        }

        private showEditSensDiag(sensor: Sensor) {
            var sensNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editSensDiag.sensName");
            sensNameEle.innerHTML = sensor.getName();
            var editSensDiag: JQuery = <JQuery>(<any>$("#editSensDiag"));
            editSensDiag.dialog("open");
            var parmDiv: HTMLElement = document.getElementById("editSensDiag.parms");
            var node: Node = parmDiv.firstChild;
            if (node != null) parmDiv.removeChild(node);
            var tbl: HTMLTableElement = this.formCreate(sensor.getProperties(), parmDiv.id);
            parmDiv.appendChild(tbl);
            var dbo: DialogButtonOptions = <DialogButtonOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogButtonOptions"] });
            dbo.text = "save";
            dbo.click = ((editSensDiag, parmDiv) => {
                return (e) => {
                    this.formRead(sensor.getProperties(), parmDiv.id);
                    this.updateSensActTbl(this.vishva.getSensors(), this.sensTbl);
                    editSensDiag.dialog("close");
                    return true;
                }
            })(editSensDiag, parmDiv);
            var dbos: DialogButtonOptions[] = [dbo];
            editSensDiag.dialog("option", "buttons", dbos);
        }

        private createEditActDiag() {
            var editActDiag: JQuery = <JQuery>(<any>$("#editActDiag"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            dos.autoOpen = false;
            dos.modal = true;
            dos.resizable = false;
            dos.width = "auto";
            dos.title = "Edit Actuator";
            editActDiag.dialog(dos);
        }

        private showEditActDiag(actuator: Actuator) {
            var actNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editActDiag.actName");
            actNameEle.innerHTML = actuator.getName();
            var editActDiag: JQuery = <JQuery>(<any>$("#editActDiag"));
            editActDiag.dialog("open");
            var parmDiv: HTMLElement = document.getElementById("editActDiag.parms");
            var node: Node = parmDiv.firstChild;
            if (node != null) {
                parmDiv.removeChild(node);
            }
            if (actuator.getName() === "Sound") {
                var prop: ActSoundProp = <ActSoundProp>actuator.getProperties();
                prop.soundFile.values = this.vishva.getSoundFiles();
            }
            var tbl: HTMLTableElement = this.formCreate(actuator.getProperties(), parmDiv.id);
            parmDiv.appendChild(tbl);
            var dbo: DialogButtonOptions = <DialogButtonOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogButtonOptions"] });
            dbo.text = "save";
            dbo.click = ((parmDiv, editActDiag) => {
                return (e) => {
                    this.formRead(actuator.getProperties(), parmDiv.id);
                    actuator.processUpdateGeneric();
                    this.updateSensActTbl(this.vishva.getActuators(), this.actTbl);
                    editActDiag.dialog("close");
                    return true;
                }
            })(parmDiv, editActDiag);
            var dbos: DialogButtonOptions[] = [dbo];
            editActDiag.dialog("option", "buttons", dbos);
        }
        /*
         * auto generate forms based on properties
         */
        private formCreate(snap: SNAproperties, idPrefix: string): HTMLTableElement {
            idPrefix = idPrefix + ".";
            var tbl: HTMLTableElement = document.createElement("table");
            var keys: string[] = Object.keys(snap);
            for (var index168 = 0; index168 < keys.length; index168++) {
                var key = keys[index168];
                {
                    if (key.split("_")[0] === this.STATE_IND) continue;
                    var row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
                    var cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
                    cell.innerHTML = key;
                    cell = <HTMLTableCellElement>row.insertCell();
                    var t: string = typeof snap[key];
                    if ((t === "object") && ((<Object>snap[key])["type"] === "SelectType")) {
                        console.log("is of type SelectType");
                        var keyValue: SelectType = <SelectType>snap[key];
                        var options: string[] = keyValue.values;
                        var sel: HTMLSelectElement = document.createElement("select");
                        sel.id = idPrefix + key;
                        for (var index169 = 0; index169 < options.length; index169++) {
                            var option = options[index169];
                            {
                                var opt: HTMLOptionElement = document.createElement("option");
                                if (option === keyValue.value) {
                                    opt.selected = true;
                                }
                                opt.innerText = option;
                                sel.add(opt);
                            }
                        }
                        cell.appendChild(sel);
                    } else {
                        var inp: HTMLInputElement = document.createElement("input");
                        inp.id = idPrefix + key;
                        inp.className = "ui-widget-content ui-corner-all";
                        inp.value = <string>snap[key];
                        if ((t === "object") && ((<Object>snap[key])["type"] === "Range")) {
                            var r: Range = <Range>snap[key];
                            inp.type = "range";
                            inp.max = (<number>new Number(r.max)).toString();
                            inp.min = (<number>new Number(r.min)).toString();
                            inp.step = (<number>new Number(r.step)).toString();
                            inp.value = (<number>new Number(r.value)).toString();
                        } else if ((t === "string") || (t === "number")) {
                            inp.type = "text";
                            inp.value = <string>snap[key];
                        } else if (t === "boolean") {
                            var check: boolean = <boolean>snap[key];
                            inp.type = "checkbox";
                            if (check) inp.setAttribute("checked", "true");
                        }
                        cell.appendChild(inp);
                    }
                }
            }
            return tbl;
        }

        private formRead(snap: SNAproperties, idPrefix: string) {
            idPrefix = idPrefix + ".";
            var keys: string[] = Object.keys(snap);
            for (var index170 = 0; index170 < keys.length; index170++) {
                var key = keys[index170];
                {
                    if (key.split("_")[0] === this.STATE_IND) continue;
                    var t: string = typeof snap[key];
                    if ((t === "object") && ((<Object>snap[key])["type"] === "SelectType")) {
                        var s: SelectType = <SelectType>snap[key];
                        var sel: HTMLSelectElement = <HTMLSelectElement>document.getElementById(idPrefix + key);
                        s.value = sel.value;
                    } else {
                        var ie: HTMLInputElement = <HTMLInputElement>document.getElementById(idPrefix + key);
                        if ((t === "object") && ((<Object>snap[key])["type"] === "Range")) {
                            var r: Range = <Range>snap[key];
                            r.value = parseFloat(ie.value);
                        } else if ((t === "string") || (t === "number")) {
                            if (t === "number") {
                                var v: number = parseFloat(ie.value);
                                if (isNaN(v)) snap[key] = 0; else snap[key] = v;
                            } else {
                                snap[key] = ie.value;
                            }
                        } else if (t === "boolean") {
                            snap[key] = ie.checked;
                        }
                    }
                }
            }
        }

        meshAnimDiag: JQuery;

        animSelect: HTMLSelectElement;

        animRate: HTMLInputElement;

        animLoop: HTMLInputElement;

        skel: Skeleton;

        private createAnimDiag() {
            this.animSelect = <HTMLSelectElement>document.getElementById("animList");
            this.animSelect.onchange = (e) => {
                var animName: string = this.animSelect.value;
                if (animName != null) {
                    var range: AnimationRange = this.skel.getAnimationRange(animName);
                    document.getElementById("animFrom").innerText = (<number>new Number(range.from)).toString();
                    document.getElementById("animTo").innerText = (<number>new Number(range.to)).toString();
                }
                return true;
            };
            this.animRate = <HTMLInputElement>document.getElementById("animRate");
            this.animLoop = <HTMLInputElement>document.getElementById("animLoop");
            document.getElementById("playAnim").onclick = (e) => {
                if (this.skel == null) return true;
                var animName: string = this.animSelect.value;
                var rate: string = this.animRate.value;
                if (animName != null) {
                    this.vishva.playAnimation(animName, rate, this.animLoop.checked);
                }
                return true;
            };
            document.getElementById("stopAnim").onclick = (e) => {
                if (this.skel == null) return true;
                this.vishva.stopAnimation();
                return true;
            };
            this.meshAnimDiag = <JQuery>(<any>$("#meshAnimDiag"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            dos.autoOpen = false;
            dos.modal = false;
            dos.resizable = false;
            dos.width = "auto";
            dos.height = (<any>"auto");
            dos.close = (e, ui) => {
                this.vishva.switchDisabled = false;
            };
            this.meshAnimDiag.dialog(dos);
        }

        private updateAnimations() {
            this.skel = this.vishva.getSkeleton();
            var skelName: string;
            if (this.skel == null) {
                document.getElementById("skelName").innerText = "no skeleton";
                return;
            } else {
                skelName = this.skel.name;
                if (skelName.trim() === "") skelName = "no name";
            }
            document.getElementById("skelName").innerText = skelName;
            var childs: HTMLCollection = this.animSelect.children;
            var l: number = (<number>childs.length | 0);
            for (var i: number = l - 1; i >= 0; i--) {
                childs[i].remove();
            }
            if (skelName != null) {
                var range: AnimationRange[] = this.vishva.getAnimationRanges();
                var animOpt: HTMLOptionElement;
                for (var index171 = 0; index171 < range.length; index171++) {
                    var ar = range[index171];
                    {
                        animOpt = document.createElement("option");
                        animOpt.value = ar.name;
                        animOpt.innerText = ar.name;
                        this.animSelect.appendChild(animOpt);
                    }
                }
                if (range[0] != null) {
                    document.getElementById("animFrom").innerText = (<number>new Number(range[0].from)).toString();
                    document.getElementById("animTo").innerText = (<number>new Number(range[0].to)).toString();
                }
            }
        }

        meshTransDiag: JQuery;

        private createTransDiag() {
            this.meshTransDiag = <JQuery>(<any>$("#meshTransDiag"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            dos.autoOpen = false;
            dos.modal = false;
            dos.resizable = false;
            dos.width = "auto";
            dos.height = (<any>"auto");
            dos.close = (e, ui) => {
                this.vishva.switchDisabled = false;
            };
            this.meshTransDiag.dialog(dos);
        }

        private updateTransform() {
            var loc: Vector3 = this.vishva.getLocation();
            var rot: Vector3 = this.vishva.getRoation();
            var scl: Vector3 = this.vishva.getScale();
            document.getElementById("loc.x").innerText = this.toString(loc.x);
            document.getElementById("loc.y").innerText = this.toString(loc.y);
            document.getElementById("loc.z").innerText = this.toString(loc.z);
            document.getElementById("rot.x").innerText = this.toString(rot.x);
            document.getElementById("rot.y").innerText = this.toString(rot.y);
            document.getElementById("rot.z").innerText = this.toString(rot.z);
            document.getElementById("scl.x").innerText = this.toString(scl.x);
            document.getElementById("scl.y").innerText = this.toString(scl.y);
            document.getElementById("scl.z").innerText = this.toString(scl.z);
        }

        private toString(d: number): string {
            return (<number>new Number(d)).toFixed(2).toString();
        }

        alertDialog: JQuery;

        alertDiv: HTMLElement;

        private createAlertDiag() {
            this.alertDiv = document.getElementById("alertDiv");
            this.alertDialog = <JQuery>(<any>$("#alertDiv"));
            var dos: DialogOptions = <DialogOptions>Object.defineProperty({
                title: "Information",
                autoOpen: false,
                width: (<any>"auto"),
                height: (<any>"auto")
            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.DialogEvents", "def.jqueryui.jqueryui.DialogOptions"] });
            this.alertDialog.dialog(dos);
        }

        private showAlertDiag(msg: string) {
            this.alertDiv.innerHTML = msg;
            this.alertDialog.dialog("open");
        }

        private sliderOptions(min: number, max: number, value: number): SliderOptions {
            var so: SliderOptions = <SliderOptions>Object.defineProperty({

            }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.SliderEvents", "def.jqueryui.jqueryui.SliderOptions"] });
            so.min = min;
            so.max = max;
            so.value = value;
            so.slide = (e, ui) => { return this.handleSlide(e, ui) };
            return so;
        }

        private handleSlide(e: Event, ui: SliderUIParams): boolean {
            var slider: string = (<HTMLElement>e.target).id;
            if (slider === "fov") {
                this.vishva.setFov(ui.value);
            } else if (slider === "sunPos") {
                this.vishva.setSunPos(ui.value);
            } else {
                var v: number = ui.value / 100;
                if (slider === "light") {
                    this.vishva.setLight(v);
                } else if (slider === "shade") {
                    this.vishva.setShade(v);
                } else if (slider === "fog") {
                    this.vishva.setFog(v / 10);
                }
            }
            return true;
        }

        private colorPickerHandler(hex: any, hsv: any, rgb: RGB) {
            var colors: number[] = [rgb.r, rgb.g, rgb.b];
            this.vishva.setGroundColor(colors);
        }

        firstTime: boolean = true;

        addMenuOn: boolean = false;

        private setNavMenu() {
            var slideDown: any = JSON.parse("{\"direction\":\"up\"}");
            var navAdd: HTMLElement = document.getElementById("navAdd");
            var addMenu: JQuery = <JQuery>(<any>$("#AddMenu"));
            addMenu.menu();
            addMenu.hide(null);
            navAdd.onclick = ((addMenu, navAdd, slideDown) => {
                return (e) => {
                    if (this.firstTime) {
                        var jpo: JQueryPositionOptions = <JQueryPositionOptions>Object.defineProperty({
                            my: "left top",
                            at: "left bottom",
                            of: navAdd
                        }, '__interfaces', { configurable: true, value: ["def.jqueryui.jqueryui.JQueryPositionOptions"] });
                        addMenu.menu().position(jpo);
                        this.firstTime = false;
                    }
                    if (this.addMenuOn) {
                        addMenu.menu().hide("slide", slideDown);
                    } else {
                        addMenu.show("slide", slideDown);
                    }
                    this.addMenuOn = !this.addMenuOn;
                    $(document).one("click", (jqe) => {
                        if (this.addMenuOn) {
                            addMenu.menu().hide("slide", slideDown);
                            this.addMenuOn = false;
                        }
                        return true;
                    });
                    e.cancelBubble = true;
                    return true;
                }
            })(addMenu, navAdd, slideDown);
            
            var downWorld: HTMLElement = document.getElementById("downWorld");
            downWorld.onclick = (e) => {
                var downloadURL: string = this.vishva.saveWorld();
                if (downloadURL == null) return true;
                this.downloadLink.href = downloadURL;
                this.downloadDialog.dialog("open");
                return false;
            };
            var navEnv: HTMLElement = document.getElementById("navEnv");
            navEnv.onclick = (e) => {
                this.envDiag = <JQuery>(<any>$("#envDiv"));
                this.envDiag.dialog("open");
                return false;
            };
            var navEdit: HTMLElement = document.getElementById("navEdit");
            navEdit.onclick = (e) => {
                this.showEditMenu();
                return true;
            };
            var helpLink: HTMLElement = document.getElementById("helpLink");
            helpLink.onclick = (e) => {
                this.helpDiag.dialog("open");
                return true;
            };
            var debugLink: HTMLElement = document.getElementById("debugLink");
            debugLink.onclick = (e) => {
                this.vishva.toggleDebug();
                return true;
            };
        }

        private setEditMenu() {
            var swAv: HTMLElement = document.getElementById("swAv");
            var swGnd: HTMLElement = document.getElementById("swGnd");
            
            var instMesh: HTMLElement = document.getElementById("instMesh");
            var parentMesh: HTMLElement = document.getElementById("parentMesh");
            var removeParent: HTMLElement = document.getElementById("removeParent");
            var removeChildren: HTMLElement = document.getElementById("removeChildren");
            var cloneMesh: HTMLElement = document.getElementById("cloneMesh");
            var delMesh: HTMLElement = document.getElementById("delMesh");
            var visMesh: HTMLElement = document.getElementById("visMesh");
            var showInvis: HTMLElement = document.getElementById("showInvis");
            var hideInvis: HTMLElement = document.getElementById("hideInvis");
            var togCol: HTMLElement = document.getElementById("togCol");
            let togEna: HTMLElement = document.getElementById("togEna");
            let showDisa: HTMLElement = document.getElementById("showDisa");
            let hideDisa: HTMLElement = document.getElementById("hideDisa");
            
            var attLight: HTMLElement = document.getElementById("attLight");
            var addWater: HTMLElement = document.getElementById("addWater");
            
            var undo: HTMLElement = document.getElementById("undo");
            var redo: HTMLElement = document.getElementById("redo");
            var sNa: HTMLElement = document.getElementById("sNa");
            var meshAnims: HTMLElement = document.getElementById("meshAnims");
            var meshMat: HTMLElement = document.getElementById("meshMat");
            var meshTrans: HTMLElement = document.getElementById("meshTrans");
            swGnd.onclick = (e) => {
                var err: string = this.vishva.switchGround();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return true;
            };
            swAv.onclick = (e) => {
                var err: string = this.vishva.switch_avatar();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return true;
            };
            var downAsset: HTMLElement = document.getElementById("downMesh");
            downAsset.onclick = (e) => {
                var downloadURL: string = this.vishva.saveAsset();
                if (downloadURL == null) {
                    this.showAlertDiag("No Mesh Selected");
                    return true;
                }
                this.downloadLink.href = downloadURL;
                var env: JQuery = <JQuery>(<any>$("#saveDiv"));
                env.dialog("open");
                return false;
            };
            parentMesh.onclick = (e) => {
                var err: string = this.vishva.makeParent();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            removeParent.onclick = (e) => {
                var err: string = this.vishva.removeParent();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            removeChildren.onclick = (e) => {
                var err: string = this.vishva.removeChildren();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            instMesh.onclick = (e) => {
                var err: string = this.vishva.instance_mesh();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            cloneMesh.onclick = (e) => {
                var err: string = this.vishva.clone_mesh();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            delMesh.onclick = (e) => {
                var err: string = this.vishva.delete_mesh();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            visMesh.onclick = (e) => {
                var err: string = this.vishva.toggleMeshVisibility();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            showInvis.onclick = (e) => {
                this.vishva.showAllInvisibles();
                return false;
            };
            hideInvis.onclick = (e) => {
                this.vishva.hideAllInvisibles();
                return false;
            };
            
            togCol.onclick = (e) => {
                var err: string = this.vishva.toggleCollision();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
             togEna.onclick = (e) => {
                var err: string = this.vishva.toggleEnable();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            showDisa.onclick = (e) => {
                this.vishva.showAllDisabled();
                return false;
            };
            hideDisa.onclick = (e) => {
                this.vishva.hideAllDisabled();
                return false;
            };
            attLight.onclick = (e) => {
                var err: string = this.vishva.attachLight();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            
             addWater.onclick = (e) => {
                     this.vishva.createWater();
//                var err: string = this.vishva.addWater();
//                if (err != null) {
//                    this.showAlertDiag(err);
//                }
//                return false;
            };
            
            undo.onclick = (e) => {
                this.vishva.undo();
                return false;
            };
            redo.onclick = (e) => {
                this.vishva.redo();
                return false;
            };
            this.snapper.onclick = (e) => {
                this.vishva.snapper();
                if (this.vishva.isSnapperOn()) {
                    (<HTMLElement>e.currentTarget).innerHTML = "Snapper Off";
                } else {
                    (<HTMLElement>e.currentTarget).innerHTML = "Snapper On";
                }
                return false;
            }
            this.snapTrans.onclick = (e) => {
                this.vishva.snapTrans();
                if (this.vishva.isSnapTransOn()) {
                    (<HTMLElement>e.currentTarget).innerHTML = "Snap Translate Off";
                } else {
                    (<HTMLElement>e.currentTarget).innerHTML = "Snap Translate On";
                }
                return false;
            }
            this.snapRot.onclick = (e) => {
                this.vishva.snapRot();
                if (this.vishva.isSnapRotOn()) {
                    (<HTMLElement>e.currentTarget).innerHTML = "Snap Rotate Off";
                } else {
                    (<HTMLElement>e.currentTarget).innerHTML = "Snap Rotate On";
                }
                return false;
            }
            this.localAxis.onclick = (e) => {
                this.local = !this.local;
                if (this.local) {
                    (<HTMLElement>e.currentTarget).innerHTML = "Switch to Global Axis";
                } else {
                    (<HTMLElement>e.currentTarget).innerHTML = "Switch to Local Axis";
                }
                this.vishva.setSpaceLocal(this.local);
                return true;
            };
            sNa.onclick = (e) => {
                this.show_sNaDiag();
                return true;
            };
            meshMat.onclick = (e) => {
                this.showAlertDiag("to be implemented");
                return true;
            };
            meshAnims.onclick = (e) => {
                if (!this.vishva.anyMeshSelected()) {
                    this.showAlertDiag("no mesh selected");
                    return true;
                }
                if (this.meshAnimDiag == null) {
                    this.createAnimDiag();
                }
                this.vishva.switchDisabled = true;
                this.updateAnimations();
                this.meshAnimDiag.dialog("open");
                return true;
            };
            meshTrans.onclick = (e) => {
                if (!this.vishva.anyMeshSelected()) {
                    this.showAlertDiag("no mesh selected");
                    return true;
                }
                if (this.meshTransDiag == null) {
                    this.createTransDiag();
                }
                this.vishva.switchDisabled = true;
                this.updateTransform();
                this.meshTransDiag.dialog("open");
                return true;
            };
        }
    }

    export declare class ColorPicker {
        public constructor(e: HTMLElement, f: (p1: any, p2: any, p3: RGB) => void);

        public setRgb(rgb: RGB);
    }

    export class RGB {
        r: number;

        g: number;

        b: number;

        constructor() {
            this.r = 0;
            this.g = 0;
            this.b = 0;
        }
    }

    export class Range {
        public type: string = "Range";

        public min: number;

        public max: number;

        public value: number;

        public step: number;

        public constructor(min: number, max: number, value: number, step: number) {
            this.min = 0;
            this.max = 0;
            this.value = 0;
            this.step = 0;
            this.min = min;
            this.max = max;
            this.value = value;
            this.step = step;
        }
    }

    export class SelectType {
        public type: string = "SelectType";

        public values: string[];

        public value: string;

        constructor() {
        }
    }
}

