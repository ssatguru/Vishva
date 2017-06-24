namespace org.ssatguru.babylonjs.vishva.gui {
    import AnimationRange = BABYLON.AnimationRange;
    import ColorPickerDiag = org.ssatguru.babylonjs.vishva.gui.ColorPickerDiag;
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

        private menuBarOn: boolean = true;

        private STATE_IND: string = "state";

        public constructor(vishva: Vishva) {
            this.vishva = vishva;
            this.setSettings();

            $(document).tooltip({
                open: (event, ui: any) => {
                    if (!this.enableToolTips) {
                        ui.tooltip.stop().remove();
                    }
                }
            });


            //when user is typing into ui inputs we donot want keys influencing editcontrol or av movement
            $("input").on("focus", () => { this.vishva.disableKeys(); });
            $("input").on("blur", () => { this.vishva.enableKeys(); });

            this.createJPOs();

            //need to do add menu before main navigation menu
            //the content of add menu is not static
            //it changes based on the asset.js file
            this.createAddMenu();

            //main navigation menu 
            this.createNavMenu();

            this.createDownloadDiag();
            //this.createUploadDiag();

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
            this.centerBottom = {
                at: "center bottom",
                my: "center bottom",
                of: window
            };
            this.leftCenter = {
                at: "left center",
                my: "left center",
                of: window
            };
            this.rightCenter = {
                at: "right center",
                my: "right center",
                of: window
            };
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
         * the default position of each dialog will be stored in a new property called "jpo"
         * this would be created whenever/wherever the dialog is defined
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

        private createAddMenu() {
            var assetTypes: string[] = Object.keys(this.vishva.assets);
            var addMenu: HTMLUListElement = <HTMLUListElement>document.getElementById("AddMenu");
            addMenu.style.visibility = "visible";
            var f: (p1: MouseEvent) => any = (e) => { return this.onAddMenuItemClick(e) };
            for (let assetType of assetTypes) {
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
            var dos: DialogOptions = {
                autoOpen: false,
                resizable: true,
                position: this.centerBottom,
                width: (<any>"100%"),
                height: (<any>"auto"),
                closeText: "",
                closeOnEscape: false
            };
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
            } else if (i.className === "water") {
                this.vishva.createWater();
            } else {
                this.vishva.loadAsset(i.className, i.id);
            }
            return true;
        }

        envDiag: JQuery;
        /*
         * Create Environment Dialog
         */
        private createEnvDiag() {

            let sunPos: JQuery = $("#sunPos");
            let light: JQuery = $("#light");
            let shade: JQuery = $("#shade");
            let fog: JQuery = $("#fog");
            let fov: JQuery = $("#fov");

            sunPos.slider(this.sliderOptions(0, 180, this.vishva.getSunPos()));
            light.slider(this.sliderOptions(0, 100, 100 * this.vishva.getLight()));
            shade.slider(this.sliderOptions(0, 100, 100 * this.vishva.getShade()));
            fog.slider(this.sliderOptions(0, 100, 1000 * this.vishva.getFog()));
            fov.slider(this.sliderOptions(0, 180, this.vishva.getFov()));

            let envSnow: HTMLButtonElement = <HTMLButtonElement>document.getElementById("envSnow");
            envSnow.onclick = (e) => {
                this.vishva.toggleSnow();
            };

            let envRain: HTMLButtonElement = <HTMLButtonElement>document.getElementById("envRain");
            envRain.onclick = (e) => {
                //this.showAlertDiag("Sorry. To be implemented");
                this.vishva.toggleRain();
            };

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
            
            let trnCol:HTMLElement = document.getElementById("trnCol");
            let trnColDiag: ColorPickerDiag = new ColorPickerDiag("terrain color", "trnColDiag", "trnColCP", this.centerBottom,(hex,hsv,rgb)=>{
                trnCol.style.backgroundColor = hex;
                this.vishva.setGroundColor(hex);
            });
            let trnColor:string = this.vishva.getGroundColor();
            trnColDiag.setColor(trnColor);
            trnCol.style.backgroundColor = trnColor;
            
            trnCol.onclick =() =>{
                let trnColor:string = this.vishva.getGroundColor();
                trnColDiag.open(trnColor);
            }

//            var colorEle: HTMLElement = document.getElementById("color-picker");
//            var cp: ColorPicker = new ColorPicker(colorEle, (hex, hsv, rgb) => { return this.colorPickerHandler(hex, hsv, rgb) });
//            var setRGB: Function = <Function>cp["setRgb"];
//            var color: number[] = this.vishva.getGroundColor();
//            if (color != null) {
//                var rgb: RGB = new RGB();
//                rgb.r = color[0];
//                rgb.g = color[1];
//                rgb.b = color[2];
//                cp.setRgb(rgb);
//            }

            this.envDiag = $("#envDiv");
            var dos: DialogOptions = {
                autoOpen: false,
                resizable: false,
                position: this.rightCenter,
                minWidth: 350,
                height: "auto",
                closeText: "",
                closeOnEscape: false
            };
            this.envDiag.dialog(dos);
            this.envDiag["jpo"] = this.rightCenter;
            this.dialogs.push(this.envDiag);
        }
        /*
         * Create Setting Dialog
         */
        settingDiag: JQuery;
        camCol: JQuery;
        autoEditMenu: JQuery;
        showToolTips: JQuery;
        //TODO persist this setting
        enableToolTips: boolean = true;
        showInvis: JQuery;
        showDisa: JQuery;
        snapper: JQuery;

        private createSettingDiag() {

            this.settingDiag = $("#settingDiag");
            this.camCol = $("#camCol");
            this.autoEditMenu = $("#autoEditMenu");
            this.showToolTips = $("#showToolTips");
            this.showInvis = $("#showInvis");
            this.showDisa = $("#showDisa");
            this.snapper = $("#snapper");

            let dos: DialogOptions = {
                autoOpen: false,
                resizable: false,
                position: this.rightCenter,
                minWidth: 350,
                height: (<any>"auto"),
                closeText: "",
                closeOnEscape: false
            };
            this.settingDiag.dialog(dos);
            this.settingDiag["jpo"] = this.rightCenter;
            this.dialogs.push(this.settingDiag);

            let dboSave: DialogButtonOptions = {};
            dboSave.text = "save";
            dboSave.click = (e) => {

                this.vishva.enableCameraCollision(this.camCol.prop("checked"));

                this.vishva.enableAutoEditMenu(this.autoEditMenu.prop("checked"));

                this.enableToolTips = this.showToolTips.prop("checked");


                if (this.showInvis.prop("checked")) {
                    this.vishva.showAllInvisibles();
                } else {
                    this.vishva.hideAllInvisibles();
                }
                if (this.showDisa.prop("checked")) {
                    this.vishva.showAllDisabled();
                } else {
                    this.vishva.hideAllDisabled()
                }

                let err: string = this.vishva.snapper(this.snapper.prop("checked"));
                if (err != null) {
                    this.showAlertDiag(err);
                    return false;
                }

                this.settingDiag.dialog("close");
                //this.showAlertDiag("Saved");
                return true;
            };

            let dboCancel: DialogButtonOptions = {};
            dboCancel.text = "Cancel";
            dboCancel.click = (e) => {
                this.settingDiag.dialog("close");
                return true;
            }


            let dbos: DialogButtonOptions[] = [dboSave, dboCancel];

            this.settingDiag.dialog("option", "buttons", dbos);
        }

        private updateSettings() {

            this.camCol.prop("checked", this.vishva.isCameraCollisionOn());

            this.autoEditMenu.prop("checked", this.vishva.isAutoEditMenuOn());

            this.showToolTips.prop("checked", this.enableToolTips);

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
            this.helpDiag = $("#helpDiv");
            var dos: DialogOptions = {
                autoOpen: false,
                resizable: false,
                width: 500,
                closeOnEscape: false,
                closeText: ""
            };
            this.helpDiag.dialog(dos);
        }

        sNaDialog: JQuery;

        sensSel: HTMLSelectElement;

        actSel: HTMLSelectElement;

        sensTbl: HTMLTableElement;

        actTbl: HTMLTableElement;

        /*
         * A dialog box to show the list of available sensors 
         * actuators, each in seperate tabs
         */
        private create_sNaDiag() {

            //tabs
            var sNaDetails: JQuery = $("#sNaDetails");
            sNaDetails.tabs();


            //dialog box
            this.sNaDialog = $("#sNaDiag");
            var dos: DialogOptions = {};
            dos.autoOpen = false;
            dos.modal = false;
            dos.resizable = false;
            dos.width = "auto";
            dos.height = "auto";
            dos.title = "Sensors and Actuators";
            dos.closeOnEscape = false;
            dos.closeText = "";
            dos.close = (e, ui) => {
                this.vishva.switchDisabled = false;
            };
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

            this.sensSel = <HTMLSelectElement>document.getElementById("sensSel");
            this.actSel = <HTMLSelectElement>document.getElementById("actSel");
            var sensors: string[] = this.vishva.getSensorList();
            var actuators: string[] = this.vishva.getActuatorList();

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
        /*
         * fill up the sensor and actuator tables
         * with a list of sensors and actuators
         */
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
            var editSensDiag: JQuery = $("#editSensDiag");
            var dos: DialogOptions = {};
            dos.autoOpen = false;
            dos.modal = true;
            dos.resizable = false;
            dos.width = "auto";
            dos.title = "Edit Sensor";
            dos.closeText = "";
            dos.closeOnEscape = false;
            editSensDiag.dialog(dos);
        }
        /*
        * show a dialog box to edit sensor properties
        * dynamically creates an appropriate form.
        * 
        */
        private showEditSensDiag(sensor: Sensor) {

            this.vishva.disableKeys();

            var sensNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editSensDiag.sensName");
            sensNameEle.innerHTML = sensor.getName();

            var editSensDiag: JQuery = <JQuery>(<any>$("#editSensDiag"));
            editSensDiag.dialog("open");

            var parmDiv: HTMLElement = document.getElementById("editSensDiag.parms");
            var node: Node = parmDiv.firstChild;
            if (node != null) parmDiv.removeChild(node);
            console.log(sensor.getProperties());
            var tbl: HTMLTableElement = this.formCreate(sensor.getProperties(), parmDiv.id);
            parmDiv.appendChild(tbl);

            var dbo: DialogButtonOptions = {};
            dbo.text = "save";
            dbo.click = (e) => {
                this.formRead(sensor.getProperties(), parmDiv.id);
                sensor.processUpdateGeneric()
                this.updateSensActTbl(this.vishva.getSensors(), this.sensTbl);
                editSensDiag.dialog("close");
                this.vishva.enableKeys();
                return true;
            };

            var dbos: DialogButtonOptions[] = [dbo];
            editSensDiag.dialog("option", "buttons", dbos);
        }

        private createEditActDiag() {
            var editActDiag: JQuery = <JQuery>(<any>$("#editActDiag"));
            var dos: DialogOptions = {};
            dos.autoOpen = false;
            dos.modal = true;
            dos.resizable = false;
            dos.width = "auto";
            dos.title = "Edit Actuator";
            dos.closeText = "";
            dos.closeOnEscape = false;
            editActDiag.dialog(dos);
        }

        /*
         * show a dialog box to edit actuator properties
         * dynamically creates an appropriate form.
         * 
         */
        private showEditActDiag(actuator: Actuator) {

            this.vishva.disableKeys();

            var actNameEle: HTMLLabelElement = <HTMLLabelElement>document.getElementById("editActDiag.actName");
            actNameEle.innerHTML = actuator.getName();

            var editActDiag: JQuery = $("#editActDiag");
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
            var dbo: DialogButtonOptions = {};
            dbo.text = "save";
            dbo.click = (e) => {
                this.formRead(actuator.getProperties(), parmDiv.id);
                actuator.processUpdateGeneric();
                this.updateSensActTbl(this.vishva.getActuators(), this.actTbl);
                editActDiag.dialog("close");
                this.vishva.enableKeys();
                return true;
            };
            var dbos: DialogButtonOptions[] = [dbo];

            editActDiag.dialog("option", "buttons", dbos);
        }
        /*
         * auto generate forms based on properties
         */
        private formCreate(snaP: SNAproperties, idPrefix: string): HTMLTableElement {
            idPrefix = idPrefix + ".";
            var tbl: HTMLTableElement = document.createElement("table");
            var keys: string[] = Object.keys(snaP);
            for (var index168 = 0; index168 < keys.length; index168++) {
                var key = keys[index168];
                {
                    if (key.split("_")[0] === this.STATE_IND) continue;
                    var row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
                    var cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
                    cell.innerHTML = key;
                    cell = <HTMLTableCellElement>row.insertCell();
                    var t: string = typeof snaP[key];
                    if ((t === "object") && ((<Object>snaP[key])["type"] === "SelectType")) {
                        var keyValue: SelectType = <SelectType>snaP[key];
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
                        inp.value = <string>snaP[key];
                        if ((t === "object") && ((<Object>snaP[key])["type"] === "Range")) {
                            var r: Range = <Range>snaP[key];
                            inp.type = "range";
                            inp.max = (<number>new Number(r.max)).toString();
                            inp.min = (<number>new Number(r.min)).toString();
                            inp.step = (<number>new Number(r.step)).toString();
                            inp.value = (<number>new Number(r.value)).toString();
                        } else if ((t === "string") || (t === "number")) {
                            inp.type = "text";
                            inp.value = <string>snaP[key];
                        } else if (t === "boolean") {
                            var check: boolean = <boolean>snaP[key];
                            inp.type = "checkbox";
                            if (check) inp.setAttribute("checked", "true");
                        }
                        cell.appendChild(inp);
                    }
                }
            }
            return tbl;
        }

        private formRead(snaP: SNAproperties, idPrefix: string) {
            idPrefix = idPrefix + ".";
            var keys: string[] = Object.keys(snaP);
            for (var index170 = 0; index170 < keys.length; index170++) {
                var key = keys[index170];
                {
                    if (key.split("_")[0] === this.STATE_IND) continue;
                    var t: string = typeof snaP[key];
                    if ((t === "object") && ((<Object>snaP[key])["type"] === "SelectType")) {
                        var s: SelectType = <SelectType>snaP[key];
                        var sel: HTMLSelectElement = <HTMLSelectElement>document.getElementById(idPrefix + key);
                        s.value = sel.value;
                    } else {
                        var ie: HTMLInputElement = <HTMLInputElement>document.getElementById(idPrefix + key);
                        if ((t === "object") && ((<Object>snaP[key])["type"] === "Range")) {
                            var r: Range = <Range>snaP[key];
                            r.value = parseFloat(ie.value);
                        } else if ((t === "string") || (t === "number")) {
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
        }

        /**
         * Mesh properties section
         */

        public showPropDiag(): boolean {

            if (this.propsDiag != null) {
                if (this.propsDiag.dialog("isOpen")) return true;
            }

            if (!this.vishva.anyMeshSelected()) {
                this.showAlertDiag("no mesh selected")
                return;
            }
            if (this.propsDiag == null) {
                this.createPropsDiag();
            }
            this.propsDiag.dialog("open");
            return true;

        }

        public closePropDiag() {
            this.propsDiag.dialog("close");
        }


        private propsDiag: JQuery = null;

        private fixingDragIssue: boolean = false;
        private createPropsDiag() {

            //property tabs
            let propsAcc = $("#propsAcc");

            //            propsTabs.tabs({
            //                //everytime we switch tabs, close open to re-adjust size
            //                activate: (e, ui) => {
            //                    //this.fixingDragIssue = true;
            //                    //this.propsDiag.dialog("close");
            //                    //this.propsDiag.dialog("open");
            //                },
            //
            //                beforeActivate: (e, ui) => {
            //                    this.vishva.switchDisabled = false;
            //                    this.vishva.enableKeys();
            //                    this.refreshTab(ui.newTab.index());
            //                }
            //            });
            //            
            propsAcc.accordion({
                animate: 100,
                heightStyle: "content",
                collapsible: true,
                beforeActivate: (e, ui) => {
                    this.vishva.switchDisabled = false;
                    //TODO remove this.vishva.enableKeys();
                    this.refreshPanel(this.getPanelIndex(ui.newHeader));

                }
            });

            //property dialog box
            this.propsDiag = $("#propsDiag");
            var dos: DialogOptions = {
                autoOpen: false,
                resizable: false,
                position: this.leftCenter,
                minWidth: 420,
                width: 420,
                // height: "auto",
                height: 650,
                closeOnEscape: false,
                //a) on open set the values of the fields in the active panel.
                //b) also if we switched from another mesh vishav will close open
                //by calling refreshPropsDiag()
                //c) donot bother refreshing values if we are just restarting
                //dialog for height and width re-sizing after drag
                open: (e, ui) => {
                    if (!this.fixingDragIssue) {
                        // refresh the active tab
                        let activePanel = propsAcc.accordion("option", "active");
                        this.refreshPanel(activePanel);
                    } else {
                        this.fixingDragIssue = false;
                    }
                },
                closeText: "",
                close: (e, ui) => {
                    this.vishva.switchDisabled = false;
                    //TODO remove this.vishva.enableKeys();
                },
                //after drag the dialog box doesnot resize
                //force resize by closing and opening
                dragStop: (e, ui) => {
                    this.fixingDragIssue = true;
                    this.propsDiag.dialog("close");
                    this.propsDiag.dialog("open");
                }
            };
            this.propsDiag.dialog(dos);
            this.propsDiag["jpo"] = this.leftCenter;
            this.dialogs.push(this.propsDiag);
        }
        /*
         * also called by vishva when editcontrol
         * is removed from mesh
         */
        public closePropsDiag() {
            if ((this.propsDiag === undefined) || (this.propsDiag === null)) return;
            this.propsDiag.dialog("close");
        }
        /*
         * called by vishva when editcontrol
         * is switched from another mesh
         */
        public refreshPropsDiag() {
            if ((this.propsDiag === undefined) || (this.propsDiag === null)) return;
            if (this.propsDiag.dialog("isOpen") === true) {
                this.propsDiag.dialog("close");
                this.propsDiag.dialog("open");
            }
        }

        private getPanelIndex(ui: JQuery): number {
            if (ui.text() == "General") return propertyPanel.General;
            if (ui.text() == "Physics") return propertyPanel.Physics;
            if (ui.text() == "Material") return propertyPanel.Material;
            if (ui.text() == "Lights") return propertyPanel.Lights;
            if (ui.text() == "Animations") return propertyPanel.Animations;

        }

        private refreshPanel(panelIndex: number) {
            if (panelIndex === propertyPanel.General) {
                this.updateGeneral();
            } else if (panelIndex === propertyPanel.Lights) {
                this.updateLight();
            } else if (panelIndex === propertyPanel.Animations) {
                this.updateAnimations();
            } else if (panelIndex === propertyPanel.Physics) {
                this.updatePhysics()
            } else if (panelIndex === propertyPanel.Material) {
                this.updateMat();
            }
        }

        meshAnimDiag: JQuery;
        animSelect: HTMLSelectElement = null;
        animRate: HTMLInputElement;
        animLoop: HTMLInputElement;
        skel: Skeleton;

        private initAnimUI() {
            var animSkelView: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelView");
            var animRest: HTMLInputElement = <HTMLInputElement>document.getElementById("animRest");
            var animRangeName: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeName");
            var animRangeStart: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeStart");
            var animRangeEnd: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeEnd");
            var animRangeMake: HTMLButtonElement = <HTMLButtonElement>document.getElementById("animRangeMake");
            
            //enable/disable skeleton view
            animSkelView.onclick = (e) => {
                this.vishva.toggleSkelView();
            }
            
            //show rest pose
            animRest.onclick = (e) => {
                this.vishva.animRest();
            }

            //create
            animRangeMake.onclick = (e) => {

                var name = animRangeName.value;
                var ars: number = parseInt(animRangeStart.value);
                if (isNaN(ars)) {
                    this.showAlertDiag("from frame is not a number")
                }
                var are: number = parseInt(animRangeEnd.value);
                if (isNaN(are)) {
                    this.showAlertDiag("to frame is not a number")
                }
                this.vishva.createAnimRange(name, ars, are)
                this.refreshAnimSelect();
            }


            //select
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

            //play
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
        }

        private createAnimDiag() {
            this.initAnimUI();
            this.meshAnimDiag = $("#meshAnimDiag");
            var dos: DialogOptions = {};
            dos.autoOpen = false;
            dos.modal = false;
            dos.resizable = false;
            dos.width = "auto";
            dos.height = (<any>"auto");
            dos.closeOnEscape = false;
            dos.closeText = "";
            dos.close = (e, ui) => {
                this.vishva.switchDisabled = false;
            };
            this.meshAnimDiag.dialog(dos);
        }

        private updateAnimations() {
            this.vishva.switchDisabled = true;
            this.initAnimUI();
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

            this.refreshAnimSelect();
            //            var childs: HTMLCollection = this.animSelect.children;
            //            var l: number = (<number>childs.length | 0);
            //            for (var i: number = l - 1; i >= 0; i--) {
            //                childs[i].remove();
            //            }
            //            if (skelName != null) {
            //                var range: AnimationRange[] = this.vishva.getAnimationRanges();
            //                var animOpt: HTMLOptionElement;
            //                for (var index171 = 0; index171 < range.length; index171++) {
            //                    var ar = range[index171];
            //                    {
            //                        animOpt = document.createElement("option");
            //                        animOpt.value = ar.name;
            //                        animOpt.innerText = ar.name;
            //                        this.animSelect.appendChild(animOpt);
            //                    }
            //                }
            //                if (range[0] != null) {
            //                    document.getElementById("animFrom").innerText = (<number>new Number(range[0].from)).toString();
            //                    document.getElementById("animTo").innerText = (<number>new Number(range[0].to)).toString();
            //                }
            //            }
        }

        private refreshAnimSelect() {
            var childs: HTMLCollection = this.animSelect.children;
            var l: number = (<number>childs.length | 0);
            for (var i: number = l - 1; i >= 0; i--) {
                childs[i].remove();
            }

            var range: AnimationRange[] = this.vishva.getAnimationRanges();
            if (range === null) return;

            var animOpt: HTMLOptionElement;
            for (let ar of range) {
                animOpt = document.createElement("option");
                animOpt.value = ar.name;
                animOpt.innerText = ar.name;
                this.animSelect.appendChild(animOpt);
            }

            if (range[0] != null) {
                document.getElementById("animFrom").innerText = (<number>new Number(range[0].from)).toString();
                document.getElementById("animTo").innerText = (<number>new Number(range[0].to)).toString();
            }

        }






        private toString(d: number): string {
            return (<number>new Number(d)).toFixed(2).toString();
        }


        genName: HTMLInputElement;
        genSpace: HTMLSelectElement;

        transRefresh: HTMLElement;
        transBake: HTMLElement;

        genOperTrans: HTMLElement;
        genOperRot: HTMLElement;
        genOperScale: HTMLElement;
        genOperFocus: HTMLElement;

        genSnapTrans: HTMLInputElement;
        genSnapRot: HTMLInputElement;
        genSnapScale: HTMLInputElement;

        genSnapTransValue: HTMLInputElement;
        genSnapRotValue: HTMLInputElement;
        genSnapScaleValue: HTMLInputElement;

        genDisable: HTMLInputElement;
        genColl: HTMLInputElement;
        genVisi: HTMLInputElement;

        private initGeneral() {
            //name
            this.genName = <HTMLInputElement>document.getElementById("genName");
            //TODO remove
            //            this.genName.onfocus = () => {
            //                this.vishva.disableKeys();
            //            }
            //            this.genName.onblur = () => {
            //                this.vishva.enableKeys();
            //            }
            this.genName.onchange = () => {
                this.vishva.setName(this.genName.value);
            }

            //space
            this.genSpace = <HTMLSelectElement>document.getElementById("genSpace");
            this.genSpace.onchange = () => {
                let err: string = this.vishva.setSpace(this.genSpace.value);
                if (err !== null) {
                    this.showAlertDiag(err);
                    this.genSpace.value = this.vishva.getSpace();
                }
            }

            //transforms
            if (this.transRefresh === undefined) {
                this.transRefresh = document.getElementById("transRefresh");
                this.transRefresh.onclick = () => {
                    this.updateTransform();
                    return false;
                }
            }
            if (this.transBake === undefined) {
                this.transBake = document.getElementById("transBake");
                this.transBake.onclick = () => {
                    this.vishva.bakeTransforms();
                    this.updateTransform();
                    return false;
                }
            }

            //edit controls
            this.genOperTrans = document.getElementById("operTrans");
            this.genOperRot = document.getElementById("operRot");
            this.genOperScale = document.getElementById("operScale");
            this.genOperFocus = document.getElementById("operFocus");

            this.genOperTrans.onclick = () => {
                this.vishva.setTransOn();
            }
            this.genOperRot.onclick = () => {
                this.vishva.setRotOn();
            }
            this.genOperScale.onclick = () => {
                this.vishva.setScaleOn();
                if (!this.vishva.isSpaceLocal()) {
                    this.showAlertDiag("note that scaling doesnot work with global axis");
                }
            }
            this.genOperFocus.onclick = () => {
                this.vishva.setFocusOnMesh();
            }



            //Snap CheckBox
            this.genSnapTrans = <HTMLInputElement>document.getElementById("snapTrans");
            this.genSnapTrans.onchange = () => {
                let err: string = this.vishva.snapTrans(this.genSnapTrans.checked);
                if (err != null) {
                    this.showAlertDiag(err);
                    this.genSnapTrans.checked = false;
                }
            }
            this.genSnapRot = <HTMLInputElement>document.getElementById("snapRot");
            this.genSnapRot.onchange = () => {
                let err: string = this.vishva.snapRot(this.genSnapRot.checked);
                if (err != null) {
                    this.showAlertDiag(err);
                    this.genSnapRot.checked = false;
                }
            }
            this.genSnapScale = <HTMLInputElement>document.getElementById("snapScale");
            this.genSnapScale.onchange = () => {
                let err: string = this.vishva.snapScale(this.genSnapScale.checked);
                if (err != null) {
                    this.showAlertDiag(err);
                    this.genSnapScale.checked = false;
                }
            }

            //Snap Values
            this.genSnapTransValue = <HTMLInputElement>document.getElementById("snapTransValue");
            this.genSnapTransValue.onchange = () => {
                this.vishva.setSnapTransValue(Number(this.genSnapTransValue.value));
            }
            this.genSnapRotValue = <HTMLInputElement>document.getElementById("snapRotValue");
            this.genSnapRotValue.onchange = () => {
                this.vishva.setSnapRotValue(Number(this.genSnapRotValue.value));
            }
            this.genSnapScaleValue = <HTMLInputElement>document.getElementById("snapScaleValue");
            this.genSnapScaleValue.onchange = () => {
                this.vishva.setSnapScaleValue(Number(this.genSnapScaleValue.value));
            }

            //
            this.genDisable = <HTMLInputElement>document.getElementById("genDisable");
            this.genDisable.onchange = () => {
                this.vishva.disableIt(this.genDisable.checked);
            }
            this.genColl = <HTMLInputElement>document.getElementById("genColl");
            this.genColl.onchange = () => {
                this.vishva.enableCollision(this.genColl.checked);
            }
            this.genVisi = <HTMLInputElement>document.getElementById("genVisi");
            this.genVisi.onchange = () => {
                this.vishva.makeVisibile(this.genVisi.checked);
            }

            var undo: HTMLElement = document.getElementById("undo");
            var redo: HTMLElement = document.getElementById("redo");


            var parentMesh: HTMLElement = document.getElementById("parentMesh");
            var removeParent: HTMLElement = document.getElementById("removeParent");
            var removeChildren: HTMLElement = document.getElementById("removeChildren");

            var cloneMesh: HTMLElement = document.getElementById("cloneMesh");
            var instMesh: HTMLElement = document.getElementById("instMesh");
            var mergeMesh: HTMLElement = document.getElementById("mergeMesh");
            var subMesh: HTMLElement = document.getElementById("subMesh");
            var interMesh: HTMLElement = document.getElementById("interMesh");
            var downAsset: HTMLElement = document.getElementById("downMesh");
            var delMesh: HTMLElement = document.getElementById("delMesh");

            var swAv: HTMLElement = document.getElementById("swAv");
            var swGnd: HTMLElement = document.getElementById("swGnd");

            var sNa: HTMLElement = document.getElementById("sNa");

            undo.onclick = (e) => {
                this.vishva.undo();
                return false;
            };
            redo.onclick = (e) => {
                this.vishva.redo();
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

            cloneMesh.onclick = (e) => {
                var err: string = this.vishva.clone_mesh();
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
            mergeMesh.onclick = (e) => {
                var err: string = this.vishva.mergeMeshes();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };

            subMesh.onclick = (e) => {
                var err: string = this.vishva.csgOperation("subtract");
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
            interMesh.onclick = (e) => {
                var err: string = this.vishva.csgOperation("intersect");
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };
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
            delMesh.onclick = (e) => {
                var err: string = this.vishva.delete_mesh();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return false;
            };

            swAv.onclick = (e) => {
                var err: string = this.vishva.switchAvatar();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return true;
            };
            swGnd.onclick = (e) => {
                var err: string = this.vishva.switchGround();
                if (err != null) {
                    this.showAlertDiag(err);
                }
                return true;
            };

            sNa.onclick = (e) => {
                this.show_sNaDiag();
                return true;
            };
        }

        private updateGeneral() {
            if (this.genName === undefined) this.initGeneral();
            this.genName.value = this.vishva.getName();

            this.genSpace.value = this.vishva.getSpace();

            this.updateTransform();

            this.genDisable.checked = this.vishva.isDisabled();
            this.genColl.checked = this.vishva.isCollideable();
            this.genVisi.checked = this.vishva.isVisible();

        }

        private updateTransform() {

            var loc: Vector3 = this.vishva.getLocation();
            var rot: Vector3 = this.vishva.getRotation();
            var scl: Vector3 = this.vishva.getScale();

            (<HTMLInputElement>document.getElementById("loc.x")).value = this.toString(loc.x);
            (<HTMLInputElement>document.getElementById("loc.y")).value = this.toString(loc.y);
            (<HTMLInputElement>document.getElementById("loc.z")).value = this.toString(loc.z);

            (<HTMLInputElement>document.getElementById("rot.x")).value = this.toString(rot.x);
            (<HTMLInputElement>document.getElementById("rot.y")).value = this.toString(rot.y);
            (<HTMLInputElement>document.getElementById("rot.z")).value = this.toString(rot.z);

            (<HTMLInputElement>document.getElementById("scl.x")).value = this.toString(scl.x);
            (<HTMLInputElement>document.getElementById("scl.y")).value = this.toString(scl.y);
            (<HTMLInputElement>document.getElementById("scl.z")).value = this.toString(scl.z);

        }

        lightAtt: HTMLInputElement;
        lightType: HTMLSelectElement;
        lightDiff: HTMLInputElement;
        lightSpec: HTMLInputElement;
        lightInten: HTMLInputElement;
        lightRange: HTMLInputElement;
        lightRadius: HTMLInputElement;
        lightAngle: HTMLInputElement;
        lightExp: HTMLInputElement;
        lightGndClr: HTMLInputElement;
        lightDirX: HTMLInputElement;
        lightDirY: HTMLInputElement;
        lightDirZ: HTMLInputElement;

        private initLightUI() {
            this.lightAtt = <HTMLInputElement>document.getElementById("lightAtt");
            this.lightType = <HTMLSelectElement>document.getElementById("lightType");
            this.lightDiff = <HTMLInputElement>document.getElementById("lightDiff");
            this.lightSpec = <HTMLInputElement>document.getElementById("lightSpec");
            this.lightInten = <HTMLInputElement>document.getElementById("lightInten");
            this.lightRange = <HTMLInputElement>document.getElementById("lightRange");
            this.lightRadius = <HTMLInputElement>document.getElementById("lightAtt");
            this.lightAngle = <HTMLInputElement>document.getElementById("lightAngle");
            this.lightExp = <HTMLInputElement>document.getElementById("lightExp");
            this.lightGndClr = <HTMLInputElement>document.getElementById("lightGndClr");
            this.lightDirX = <HTMLInputElement>document.getElementById("lightDirX");
            this.lightDirY = <HTMLInputElement>document.getElementById("lightDirY");
            this.lightDirZ = <HTMLInputElement>document.getElementById("lightDirZ");
            let lightApply: HTMLButtonElement = <HTMLButtonElement>document.getElementById("lightApply");
            lightApply.onclick = () => {
                this.applyLight();
                this.showAlertDiag("light applied");
            }

        }

        private updateLight() {
            console.log("updateLight");
            if (this.lightAtt === undefined) this.initLightUI();
            let lightParm: LightParm = this.vishva.getAttachedLight();
            if (lightParm === null) {
                this.lightAtt.checked = false;
                lightParm = new LightParm();
            } else {
                this.lightAtt.checked = true;
            }
            this.lightType.value = lightParm.type;
            this.lightDiff.value = lightParm.diffuse.toHexString();
            this.lightSpec.value = lightParm.specular.toHexString();
            this.lightInten.value = Number(lightParm.intensity).toString();
            this.lightRange.value = Number(lightParm.range).toString();
            this.lightRadius.value = Number(lightParm.radius).toString();
            //this.lightAngle.value = Number(lightParm.angle * 180 / Math.PI).toString();
            this.lightAngle.value = Number(lightParm.angle).toString();
            this.lightExp.value = Number(lightParm.exponent).toString();
            this.lightGndClr.value = lightParm.gndClr.toHexString();
            this.lightDirX.value = Number(lightParm.direction.x).toString();
            this.lightDirY.value = Number(lightParm.direction.y).toString();
            this.lightDirZ.value = Number(lightParm.direction.z).toString();


        }

        private applyLight() {
            if (!this.lightAtt.checked) {
                this.vishva.detachLight();
                return;
            }
            let lightParm: LightParm = new LightParm();
            lightParm.type = this.lightType.value;
            lightParm.diffuse = BABYLON.Color3.FromHexString(this.lightDiff.value);
            lightParm.specular = BABYLON.Color3.FromHexString(this.lightSpec.value);
            lightParm.intensity = parseFloat(this.lightInten.value);
            lightParm.range = parseFloat(this.lightRange.value);
            lightParm.radius = parseFloat(this.lightRadius.value);
            lightParm.angle = parseFloat(this.lightAngle.value);
            lightParm.direction.x = parseFloat(this.lightDirX.value);
            lightParm.direction.y = parseFloat(this.lightDirY.value);
            lightParm.direction.z = parseFloat(this.lightDirZ.value);
            lightParm.exponent = parseFloat(this.lightExp.value);
            lightParm.gndClr = BABYLON.Color3.FromHexString(this.lightGndClr.value);
            this.vishva.attachAlight(lightParm);

        }
        matVis:HTMLInputElement;
        matVisVal: HTMLElement;
        
        matColType:HTMLSelectElement;
        matCol:HTMLElement;
        matColDiag:org.ssatguru.babylonjs.vishva.gui.ColorPickerDiag;
        private initMatUI(){
            
            this.matVisVal = document.getElementById("matVisVal");
            this.matVis = <HTMLInputElement>document.getElementById("matVis");
            
            this.matColType = <HTMLSelectElement>document.getElementById("matColType");
           
            this.matCol = document.getElementById("matCol");
            this.matColDiag = new ColorPickerDiag("mesh color","matColDiag", "matColCP", this.centerBottom,(hex,hsv,rgb)=>{
                this.matCol.style.background=hex;
                this.vishva.setMeshColor(this.matColType.value,hex);
            })
             this.matColType.onchange = () =>{
                let col:string = this.vishva.getMeshColor(this.matColType.value);
                this.matCol.style.background = col
                this.matColDiag.setColor(col);
            }
            
            this.matCol.onclick = () =>{
                this.matColDiag.open(this.vishva.getMeshColor(this.matColType.value));
            }
            
            this.matVisVal["value"] = "1.00";
            this.matVis.oninput = () =>{
                this.matVisVal["value"] = Number(this.matVis.value).toFixed(2);
                this.vishva.setMeshVisibility(parseFloat(this.matVis.value));
            }
            
            
        }
        
        private updateMat(){
            if (this.matVis == undefined) this.initMatUI();
            this.matVis.value = Number(this.vishva.getMeshVisibility()).toString();
            this.matVisVal["value"] = Number(this.matVis.value).toFixed(2);
            this.matCol.style.background = this.vishva.getMeshColor(this.matColType.value);
            
        }

        phyEna: HTMLInputElement;
        phyType: HTMLSelectElement;
        phyMass: HTMLInputElement;
        phyResVal: HTMLElement;
        phyRes: HTMLInputElement;
        phyFricVal: HTMLElement;
        phyFric: HTMLInputElement;

        private initPhyUI() {
            this.phyEna = <HTMLInputElement>document.getElementById("phyEna");

            this.phyType = <HTMLSelectElement>document.getElementById("phyType");

            this.phyMass = <HTMLInputElement>document.getElementById("phyMass");

            this.phyRes = <HTMLInputElement>document.getElementById("phyRes");
            this.phyResVal = <HTMLElement>document.getElementById("phyResVal");
            this.phyResVal["value"] = "0.0";
            this.phyRes.oninput = () => {
                this.phyResVal["value"] = this.formatValue(this.phyRes.value);
            }

            this.phyFric = <HTMLInputElement>document.getElementById("phyFric");
            this.phyFricVal = <HTMLElement>document.getElementById("phyFricVal");
            this.phyFricVal["value"] = "0.0";
            this.phyFric.oninput = () => {
                this.phyFricVal["value"] = this.formatValue(this.phyFric.value);
            }

            let phyApply = <HTMLButtonElement>document.getElementById("phyApply");
            let phyTest = <HTMLButtonElement>document.getElementById("phyTest");
            let phyReset = <HTMLButtonElement>document.getElementById("phyReset");

            phyApply.onclick = (ev) => {
                this.applyPhysics();
                this.showAlertDiag("physics applied");
                return false;
            }

            phyTest.onclick = (ev) => {
                this.testPhysics();
                return false;
            }
            
            phyReset.onclick = (ev) => {
                this.resetPhysics()
                return false;
            }
        }

        private formatValue(val: string) {
            if (val === "1") return "1.0";
            if (val === "0") return "0.0";
            return val;
        }

        private updatePhysics() {

            if (this.phyEna === undefined) this.initPhyUI();

            let phyParms: PhysicsParm = this.vishva.getMeshPickedPhyParms();
            if (phyParms !== null) {
                this.phyEna.setAttribute("checked", "true");
                this.phyType.value = Number(phyParms.type).toString();
                this.phyMass.value = Number(phyParms.mass).toString();
                this.phyRes.value = Number(phyParms.restitution).toString();
                this.phyResVal["value"] = this.formatValue(this.phyRes.value);
                this.phyFric.value = Number(phyParms.friction).toString();
                this.phyFricVal["value"] = this.formatValue(this.phyFric.value);
            } else {
                this.phyEna.checked = false;
                //by default lets set the type to "box"
                this.phyType.value = "2";
                this.phyMass.value = "1";
                this.phyRes.value = "0";
                this.phyResVal["value"] = "0.0";
                this.phyFric.value = "0";
                this.phyFricVal["value"] = "0.0";
            }
        }

        private applyPhysics() {
            let phyParms: PhysicsParm;
            if (this.phyEna.checked) {
                phyParms = new PhysicsParm();
                phyParms.type = parseInt(this.phyType.value);
                phyParms.mass = parseFloat(this.phyMass.value);
                phyParms.restitution = parseFloat(this.phyRes.value);
                phyParms.friction = parseFloat(this.phyFric.value);
            } else {
                phyParms = null;
            }
            this.vishva.setMeshPickedPhyParms(phyParms);
        }

        private testPhysics() {
            let phyParms: PhysicsParm;

            phyParms = new PhysicsParm();
            phyParms.type = parseInt(this.phyType.value);
            phyParms.mass = parseFloat(this.phyMass.value);
            phyParms.restitution = parseFloat(this.phyRes.value);
            phyParms.friction = parseFloat(this.phyFric.value);

            this.vishva.testPhysics(phyParms);
        }
        
        private resetPhysics(){
            this.vishva.resetPhysics();
        }

        //        meshT        ran        sDiag: JQuery;
        //
        //        private cr        eateTransDiag() {
        //            this.meshTransDiag = $("        #meshTransDiag");
        //            var dos: Di        alogOptions = {};
        //            dos.        autoOpen = false;
        //            d        os.modal = false;
        //            dos.r        esizable = false;
        //            do        s.width = "auto";
        //            dos.height         = (<any>"auto");
        //            dos.close        OnEscape = false;
        //            dos.clo        se = (e, ui) => {
        //                this.vishva.switch        Disabled = false;        
        //            };
        //            this.meshTrans        Diag.dialog(dos);
        //        }

        /**
         * End of Mesh Properties section
         */


        alertDialog: JQuery;

        alertDiv: HTMLElement;

        private createAlertDiag() {
            this.alertDiv = document.getElementById("alertDiv");
            this.alertDialog = $("#alertDiv");
            var dos: DialogOptions = {
                title: "Info",
                autoOpen: false,
                width: "auto",
                minWidth: 200,
                height: "auto",
                closeText: "",
                closeOnEscape: false
            };
            this.alertDialog.dialog(dos);
        }

        private showAlertDiag(msg: string) {
            this.alertDiv.innerHTML = "<h3>" + msg + "</h3>";
            this.alertDialog.dialog("open");
        }

        private sliderOptions(min: number, max: number, value: number): SliderOptions {
            var so: SliderOptions = {};
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



//        private colorPickerHandler(hex: any, hsv: any, rgb: RGB) {
//            var colors: number[] = [rgb.r, rgb.g, rgb.b];
//            this.vishva.setGroundColor(colors);
//        }

        /**
         * Main Navigation Menu Section
         */

        firstTime: boolean = true;

        addMenuOn: boolean = false;

        private createNavMenu() {

            //button to show navigation menu
            let showNavMenu: HTMLButtonElement = <HTMLButtonElement>document.getElementById("showNavMenu");
            showNavMenu.style.visibility = "visible";

            //navigation menu sliding setup
            document.getElementById("navMenubar").style.visibility = "visible";
            let navMenuBar: JQuery = $("#navMenubar");
            let jpo: JQueryPositionOptions = {
                my: "left center",
                at: "right center",
                of: showNavMenu
            };
            navMenuBar.position(jpo);
            navMenuBar.show(null);
            showNavMenu.onclick = (e) => {
                if (this.menuBarOn) {
                    navMenuBar.hide("slide", 100);
                } else {
                    navMenuBar.show("slide", 100);
                }
                this.menuBarOn = !this.menuBarOn;
                return true;
            };

            //add menu sliding setup
            var slideDown: any = JSON.parse("{\"direction\":\"up\"}");
            var navAdd: HTMLElement = document.getElementById("navAdd");
            var addMenu: JQuery = $("#AddMenu");
            addMenu.menu();
            addMenu.hide(null);
            navAdd.onclick = (e) => {
                if (this.firstTime) {
                    var jpo: JQueryPositionOptions = {
                        my: "left top",
                        at: "left bottom",
                        of: navAdd
                    };
                    addMenu.menu().position(jpo);
                    this.firstTime = false;
                }
                if (this.addMenuOn) {
                    addMenu.menu().hide("slide", slideDown, 100);
                } else {
                    addMenu.show("slide", slideDown, 100);
                }
                this.addMenuOn = !this.addMenuOn;
                $(document).one("click", (jqe) => {
                    if (this.addMenuOn) {
                        addMenu.menu().hide("slide", slideDown, 100);
                        this.addMenuOn = false;
                    }
                    return true;
                });
                e.cancelBubble = true;
                return true;
            };

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
                if (this.envDiag == undefined) {
                    this.createEnvDiag();
                }
                this.toggleDiag(this.envDiag);
                return false;
            };

            var navEdit: HTMLElement = document.getElementById("navEdit");
            navEdit.onclick = (e) => {
                if ((this.propsDiag != null) && (this.propsDiag.dialog("isOpen") === true)) {
                    this.closePropDiag();
                } else {
                    this.showPropDiag();
                }
                return true;
            };

            var navSettings: HTMLElement = document.getElementById("navSettings");
            navSettings.onclick = (e) => {
                if (this.settingDiag == undefined) {
                    this.createSettingDiag();
                }
                if (this.settingDiag.dialog("isOpen") === false) {
                    this.updateSettings();
                    this.settingDiag.dialog("open");
                } else {
                    this.settingDiag.dialog("close");
                }

                return false;
            };

            var helpLink: HTMLElement = document.getElementById("helpLink");
            helpLink.onclick = (e) => {
                this.toggleDiag(this.helpDiag);
                return true;
            };

            var debugLink: HTMLElement = document.getElementById("debugLink");
            debugLink.onclick = (e) => {
                this.vishva.toggleDebug();
                return true;
            };
        }
        /*
         * open diag if close
         * close diag if open
         */
        private toggleDiag(diag: JQuery) {
            if (diag.dialog("isOpen") === false) {
                diag.dialog("open");
            } else {
                diag.dialog("close");
            }
        }

        public getSettings() {
            let guiSettings = new GuiSettings();
            guiSettings.enableToolTips = this.enableToolTips;
            return guiSettings;
        }

        private setSettings() {
            let guiSettings: GuiSettings = <GuiSettings>this.vishva.getGuiSettings();
            if (guiSettings !== null)
                this.enableToolTips = guiSettings.enableToolTips;
        }

    }

    export class GuiSettings {
        enableToolTips: boolean;
    }

    const enum propertyPanel {
        General,
        Physics,
        Material,
        Lights,
        Animations
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

