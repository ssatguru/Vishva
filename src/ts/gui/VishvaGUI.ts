namespace org.ssatguru.babylonjs.vishva.gui {

    import AnimationRange=BABYLON.AnimationRange;
    import ColorPickerDiag=org.ssatguru.babylonjs.vishva.gui.ColorPickerDiag;
    import Skeleton=BABYLON.Skeleton;
    import Vector3=BABYLON.Vector3;
    import DialogButtonOptions=JQueryUI.DialogButtonOptions;
    import DialogOptions=JQueryUI.DialogOptions;
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;


    export class VishvaGUI {

        private vishva: Vishva;

        local: boolean=true;

        downloadLink: HTMLAnchorElement;

        private static LARGE_ICON_SIZE: string="width:128px;height:128px;";

        private static SMALL_ICON_SIZE: string="width:64px;height:64px;";

        private menuBarOn: boolean=true;

        private STATE_IND: string="state";

        public constructor(vishva: Vishva) {
            this.vishva=vishva;

            this.setSettings();

            $(document).tooltip({
                open: (event,ui: any) => {
                    if(!this._settingDiag.enableToolTips) {
                        ui.tooltip.stop().remove();
                    }
                }
            });


            //when user is typing into ui inputs we donot want keys influencing editcontrol or av movement
            $("input").on("focus",() => {this.vishva.disableKeys();});
            $("input").on("blur",() => {this.vishva.enableKeys();});

            this.createJPOs();

            //need to do add menu before main navigation menu
            //the content of add menu is not static
            //it changes based on the asset.js file
            this.createAddMenu();

            //main navigation menu 
            this.createNavMenu();

            this.createDownloadDiag();
            //this.createUploadDiag();


            DialogMgr.createAlertDiag();

            this.create_sNaDiag();
            this.createEditSensDiag();
            this.createEditActDiag();
            window.addEventListener("resize",(evt) => {return this.onWindowResize(evt)});
        }

        private centerBottom: JQueryPositionOptions;
        private leftCenter: JQueryPositionOptions;
        private rightCenter: JQueryPositionOptions;
        private rightTop: JQueryPositionOptions;

        private createJPOs() {
            this.centerBottom={
                at: "center bottom",
                my: "center bottom",
                of: window
            };
            this.leftCenter={
                at: "left center",
                my: "left center",
                of: window
            };
            this.rightCenter={
                at: "right center",
                my: "right center",
                of: window
            };
            this.rightTop={
                at: "right top",
                my: "right top",
                of: window
            };
        }

        /**
         * this array will be used store all dialogs whose position needs to be
         * reset on window resize
         */
        public dialogs: Array<JQuery>=new Array<JQuery>();

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

            for(let jq of this.dialogs) {
                let jpo: JQueryPositionOptions=<JQueryPositionOptions>jq["jpo"];
                if(jpo!=null) {
                    jq.dialog("option","position",jpo);
                    var open: boolean=<boolean><any>jq.dialog("isOpen");
                    if(open) {
                        jq.dialog("close");
                        jq.dialog("open");
                    }
                }
            }

            for(let diag of DialogMgr.dialogs) {
                diag.position();
                if(diag.isOpen()) {
                    diag.close();
                    diag.open();
                }
            }
        }


        //skyboxesDiag: JQuery;

        private createAddMenu() {
            var assetTypes: string[]=Object.keys(this.vishva.assets);
            var addMenu: HTMLUListElement=<HTMLUListElement>document.getElementById("AddMenu");
            addMenu.style.visibility="visible";
            var f: (p1: MouseEvent) => any=(e) => {return this.onAddMenuItemClick(e)};
            for(let assetType of assetTypes) {
                if(assetType==="sounds") {
                    continue;
                }
                var li: HTMLLIElement=document.createElement("li");
                li.id="add-"+assetType;
                li.innerText=assetType;
                li.onclick=f;
                addMenu.appendChild(li);
            }
        }

        private onAddMenuItemClick(e: MouseEvent): any {
            var li: HTMLLIElement=<HTMLLIElement>e.target;
            var jq: JQuery=<JQuery>li["diag"];
            if(jq==null) {
                var assetType: string=li.innerHTML;
                jq=this.createAssetDiag(assetType);
                li["diag"]=jq;
            }
            jq.dialog("open");
            return true;
        }

        private createAssetDiag(assetType: string): JQuery {
            var div: HTMLDivElement=document.createElement("div");
            div.id=assetType+"Div";
            div.setAttribute("title",assetType);
            var table: HTMLTableElement=document.createElement("table");
            table.id=assetType+"Tbl";
            var items: Array<string>=<Array<string>>this.vishva.assets[assetType];
            this.updateAssetTable(table,assetType,items);
            div.appendChild(table);
            document.body.appendChild(div);

            var jq: JQuery=<JQuery>(<any>$("#"+div.id));
            var dos: DialogOptions={
                autoOpen: false,
                resizable: true,
                position: this.centerBottom,
                width: (<any>"95%"),
                height: (<any>"auto"),
                closeText: "",
                closeOnEscape: false
            };
            jq.dialog(dos);
            jq["jpo"]=this.centerBottom;
            this.dialogs.push(jq);
            return jq;
        }

        private updateAssetTable(tbl: HTMLTableElement,assetType: string,items: Array<string>) {
            if(tbl.rows.length>0) {
                return;
            }
            var f: (p1: MouseEvent) => any=(e) => {return this.onAssetImgClick(e)};
            var row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
            for(let item of items) {
                let img: HTMLImageElement=document.createElement("img");
                img.id=item;
                //img.src = "vishva/assets/" + assetType + "/" + item + "/" + item + ".jpg";
                let name: string=item.split(".")[0];
                img.src="vishva/assets/"+assetType+"/"+name+"/"+name+".jpg";
                img.setAttribute("style",VishvaGUI.SMALL_ICON_SIZE+"cursor:pointer;");
                img.className=assetType;
                img.onclick=f;
                var cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                cell.appendChild(img);
            }
            var row2: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
            for(let item of items) {
                let cell: HTMLTableCellElement=<HTMLTableCellElement>row2.insertCell();
                cell.innerText=item;
            }
        }

        private onAssetImgClick(e: Event): any {
            var i: HTMLImageElement=<HTMLImageElement>e.target;
            if(i.className==="skyboxes") {
                this.vishva.setSky(i.id);
            } else if(i.className==="primitives") {
                this.vishva.addPrim(i.id);
            } else if(i.className==="water") {
                this.vishva.createWater();
            } else {
                this.vishva.loadAsset(i.className,i.id);
            }
            return true;
        }


        downloadDialog: JQuery;
        private createDownloadDiag() {
            this.downloadLink=<HTMLAnchorElement>document.getElementById("downloadLink");
            this.downloadDialog=<JQuery>(<any>$("#saveDiv"));
            this.downloadDialog.dialog();
            this.downloadDialog.dialog("close");
        }

        loadDialog: JQuery;

        private createUploadDiag() {
            var loadFileInput: HTMLInputElement=<HTMLInputElement>document.getElementById("loadFileInput");
            var loadFileOk: HTMLButtonElement=<HTMLButtonElement>document.getElementById("loadFileOk");
            loadFileOk.onclick=((loadFileInput) => {
                return (e) => {
                    var fl: FileList=loadFileInput.files;
                    if(fl.length===0) {
                        alert("no file slected");
                        return null;
                    }
                    var file: File=null;
                    for(var index165=0;index165<fl.length;index165++) {
                        var f=fl[index165];
                        {
                            file=f;
                        }
                    }
                    this.vishva.loadAssetFile(file);
                    this.loadDialog.dialog("close");
                    return true;
                }
            })(loadFileInput);
            this.loadDialog=<JQuery>(<any>$("#loadDiv"));
            this.loadDialog.dialog();
            this.loadDialog.dialog("close");
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
            var sNaDetails: JQuery=$("#sNaDetails");
            sNaDetails.tabs();


            //dialog box
            this.sNaDialog=$("#sNaDiag");
            var dos: DialogOptions={};
            dos.autoOpen=false;
            dos.modal=false;
            dos.resizable=false;
            dos.width="auto";
            dos.height="auto";
            dos.title="Sensors and Actuators";
            dos.closeOnEscape=false;
            dos.closeText="";
            dos.dragStop=(e,ui) => {
                /* required as jquery dialog's size does not re-adjust to content after it has been dragged 
                 Thus if the size of sensors tab is different from the size of actuators tab  then the content of
                 actuator tab is cutoff if its size is greater
                 so we close and open for it to recalculate the sizes.
                 */
                this.sNaDialog.dialog("close");
                this.sNaDialog.dialog("open");
            }
            this.sNaDialog.dialog(dos);

            this.sensSel=<HTMLSelectElement>document.getElementById("sensSel");
            this.actSel=<HTMLSelectElement>document.getElementById("actSel");
            var sensors: string[]=this.vishva.getSensorList();
            var actuators: string[]=this.vishva.getActuatorList();

            for(let sensor of sensors) {
                var opt: HTMLOptionElement=<HTMLOptionElement>document.createElement("option");
                opt.value=sensor;
                opt.innerHTML=sensor;
                this.sensSel.add(opt);
            }

            for(let actuator of actuators) {
                var opt: HTMLOptionElement=<HTMLOptionElement>document.createElement("option");
                opt.value=actuator;
                opt.innerHTML=actuator;
                this.actSel.add(opt);
            }

            this.sensTbl=<HTMLTableElement>document.getElementById("sensTbl");
            this.actTbl=<HTMLTableElement>document.getElementById("actTbl");
        }

        public show_sNaDiag() {
            var sens: Array<SensorActuator>=<Array<SensorActuator>>this.vishva.getSensors();
            if(sens==null) {
                DialogMgr.showAlertDiag("no mesh selected");
                return;
            }
            var acts: Array<SensorActuator>=this.vishva.getActuators();
            if(acts==null) {
                DialogMgr.showAlertDiag("no mesh selected");
                return;
            }

            //this.vishva.switchDisabled=true;
            this.updateSensActTbl(sens,this.sensTbl);
            this.updateSensActTbl(acts,this.actTbl);
            var addSens: HTMLElement=document.getElementById("addSens");
            addSens.onclick=(e) => {
                var s: HTMLOptionElement=<HTMLOptionElement>this.sensSel.item(this.sensSel.selectedIndex);
                var sensor: string=s.value;
                this.vishva.addSensorbyName(sensor);
                this.updateSensActTbl(this.vishva.getSensors(),this.sensTbl);
                this.sNaDialog.dialog("close");
                this.sNaDialog.dialog("open");
                return true;
            };
            var addAct: HTMLElement=document.getElementById("addAct");
            addAct.onclick=(e) => {
                var a: HTMLOptionElement=<HTMLOptionElement>this.actSel.item(this.actSel.selectedIndex);
                var actuator: string=a.value;
                this.vishva.addActuaorByName(actuator);
                this.updateSensActTbl(this.vishva.getActuators(),this.actTbl);
                this.sNaDialog.dialog("close");
                this.sNaDialog.dialog("open");
                return true;
            };
            console.log("opening sna ");
            this.sNaDialog.dialog("open");
        }
        /*
         * fill up the sensor and actuator tables
         * with a list of sensors and actuators
         */
        private updateSensActTbl(sensAct: Array<SensorActuator>,tbl: HTMLTableElement) {
            let l: number=tbl.rows.length;
            for(var i: number=l-1;i>0;i--) {
                tbl.deleteRow(i);
            }
            l=sensAct.length;
            for(var i: number=0;i<l;i++) {
                var row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
                var cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                cell.innerHTML=sensAct[i].getName();
                cell=<HTMLTableCellElement>row.insertCell();
                cell.innerHTML=sensAct[i].getProperties().signalId;
                cell=<HTMLTableCellElement>row.insertCell();
                var editBut: HTMLButtonElement=<HTMLButtonElement>document.createElement("BUTTON");
                editBut.innerHTML="edit";
                var jq: JQuery=<JQuery>(<any>$(editBut));
                jq.button();
                var d: number=i;
                editBut.id=d.toString();
                editBut["sa"]=sensAct[i];
                cell.appendChild(editBut);
                editBut.onclick=(e) => {
                    var el: HTMLElement=<HTMLElement>e.currentTarget;
                    var sa: SensorActuator=<SensorActuator>el["sa"];
                    if(sa.getType()==="SENSOR") {
                        this.showEditSensDiag(<Sensor>sa);
                    } else {
                        this.showEditActDiag(<Actuator>sa);
                    }
                    return true;
                };
                cell=<HTMLTableCellElement>row.insertCell();
                var delBut: HTMLButtonElement=<HTMLButtonElement>document.createElement("BUTTON");
                delBut.innerHTML="del";
                var jq2: JQuery=<JQuery>(<any>$(delBut));
                jq2.button();
                delBut.id=d.toString();
                delBut["row"]=row;
                delBut["sa"]=sensAct[i];
                cell.appendChild(delBut);
                delBut.onclick=(e) => {
                    var el: HTMLElement=<HTMLElement>e.currentTarget;
                    var r: HTMLTableRowElement=<HTMLTableRowElement>el["row"];
                    tbl.deleteRow(r.rowIndex);
                    this.vishva.removeSensorActuator(<SensorActuator>el["sa"]);
                    return true;
                };
            }
        }
        editSensDiag: JQuery;
        private createEditSensDiag() {
            this.editSensDiag=$("#editSensDiag");
            var dos: DialogOptions={};
            dos.autoOpen=false;
            dos.modal=true;
            dos.resizable=false;
            dos.width="auto";
            dos.title="Edit Sensor";
            dos.closeText="";
            dos.closeOnEscape=false;
            dos.open=() => {
                this.vishva.disableKeys();
            }
            dos.close=() => {
                this.vishva.enableKeys();
            }
            this.editSensDiag.dialog(dos);
        }
        /*
        * show a dialog box to edit sensor properties
        * dynamically creates an appropriate form.
        * 
        */
        private showEditSensDiag(sensor: Sensor) {

            var sensNameEle: HTMLLabelElement=<HTMLLabelElement>document.getElementById("editSensDiag.sensName");
            sensNameEle.innerHTML=sensor.getName();

            this.editSensDiag.dialog("open");

            var parmDiv: HTMLElement=document.getElementById("editSensDiag.parms");
            var node: Node=parmDiv.firstChild;
            if(node!=null) parmDiv.removeChild(node);
            console.log(sensor.getProperties());
            var tbl: HTMLTableElement=this.formCreate(sensor.getProperties(),parmDiv.id);
            parmDiv.appendChild(tbl);

            var dbo: DialogButtonOptions={};
            dbo.text="save";
            dbo.click=(e) => {
                this.formRead(sensor.getProperties(),parmDiv.id);
                sensor.handlePropertiesChange()
                this.updateSensActTbl(this.vishva.getSensors(),this.sensTbl);
                this.editSensDiag.dialog("close");
                return true;
            };

            var dbos: DialogButtonOptions[]=[dbo];
            this.editSensDiag.dialog("option","buttons",dbos);

        }

        editActDiag: JQuery;
        private createEditActDiag() {
            this.editActDiag=<JQuery>(<any>$("#editActDiag"));
            var dos: DialogOptions={};
            dos.autoOpen=false;
            dos.modal=true;
            dos.resizable=false;
            dos.width="auto";
            dos.title="Edit Actuator";
            dos.closeText="";
            dos.closeOnEscape=false;
            dos.open=(e,ui) => {
                this.vishva.disableKeys();
            }
            dos.close=(e,ui) => {
                this.vishva.enableKeys();
            }
            this.editActDiag.dialog(dos);
        }

        /*
         * show a dialog box to edit actuator properties
         * dynamically creates an appropriate form.
         * 
         */
        private showEditActDiag(actuator: Actuator) {

            var actNameEle: HTMLLabelElement=<HTMLLabelElement>document.getElementById("editActDiag.actName");
            actNameEle.innerHTML=actuator.getName();

            this.editActDiag.dialog("open");

            var parmDiv: HTMLElement=document.getElementById("editActDiag.parms");
            var node: Node=parmDiv.firstChild;
            if(node!=null) {
                parmDiv.removeChild(node);
            }
            if(actuator.getName()==="Sound") {
                var prop: ActSoundProp=<ActSoundProp>actuator.getProperties();
                prop.soundFile.values=this.vishva.getSoundFiles();
            }
            var tbl: HTMLTableElement=this.formCreate(actuator.getProperties(),parmDiv.id);
            parmDiv.appendChild(tbl);
            var dbo: DialogButtonOptions={};
            dbo.text="save";
            dbo.click=(e) => {
                this.formRead(actuator.getProperties(),parmDiv.id);
                actuator.handlePropertiesChange();
                this.updateSensActTbl(this.vishva.getActuators(),this.actTbl);
                this.editActDiag.dialog("close");
                return true;
            };
            var dbos: DialogButtonOptions[]=[dbo];

            this.editActDiag.dialog("option","buttons",dbos);
        }
        /*
         * auto generate forms based on properties
         */
        private formCreate(snaP: SNAproperties,idPrefix: string): HTMLTableElement {
            idPrefix=idPrefix+".";
            var tbl: HTMLTableElement=document.createElement("table");
            var keys: string[]=Object.keys(snaP);
            for(var index168=0;index168<keys.length;index168++) {
                var key=keys[index168];
                {
                    if(key.split("_")[0]===this.STATE_IND) continue;
                    var row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
                    var cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                    cell.innerHTML=key;
                    cell=<HTMLTableCellElement>row.insertCell();
                    var t: string=typeof snaP[key];
                    if((t==="object")&&((<Object>snaP[key])["type"]==="SelectType")) {
                        var keyValue: SelectType=<SelectType>snaP[key];
                        var options: string[]=keyValue.values;
                        var sel: HTMLSelectElement=document.createElement("select");
                        sel.id=idPrefix+key;
                        for(var index169=0;index169<options.length;index169++) {
                            var option=options[index169];
                            {
                                var opt: HTMLOptionElement=document.createElement("option");
                                if(option===keyValue.value) {
                                    opt.selected=true;
                                }
                                opt.innerText=option;
                                sel.add(opt);
                            }
                        }
                        cell.appendChild(sel);
                    } else {
                        var inp: HTMLInputElement=document.createElement("input");
                        inp.id=idPrefix+key;
                        inp.className="ui-widget-content ui-corner-all";
                        inp.value=<string>snaP[key];
                        if((t==="object")&&((<Object>snaP[key])["type"]==="Range")) {
                            var r: Range=<Range>snaP[key];
                            inp.type="range";
                            inp.max=(<number>new Number(r.max)).toString();
                            inp.min=(<number>new Number(r.min)).toString();
                            inp.step=(<number>new Number(r.step)).toString();
                            inp.value=(<number>new Number(r.value)).toString();
                        } else if((t==="string")||(t==="number")) {
                            inp.type="text";
                            inp.value=<string>snaP[key];
                        } else if(t==="boolean") {
                            var check: boolean=<boolean>snaP[key];
                            inp.type="checkbox";
                            if(check) inp.setAttribute("checked","true");
                        }
                        cell.appendChild(inp);
                    }
                }
            }
            return tbl;
        }

        private formRead(snaP: SNAproperties,idPrefix: string) {
            idPrefix=idPrefix+".";
            var keys: string[]=Object.keys(snaP);
            for(var index170=0;index170<keys.length;index170++) {
                var key=keys[index170];
                {
                    if(key.split("_")[0]===this.STATE_IND) continue;
                    var t: string=typeof snaP[key];
                    if((t==="object")&&((<Object>snaP[key])["type"]==="SelectType")) {
                        var s: SelectType=<SelectType>snaP[key];
                        var sel: HTMLSelectElement=<HTMLSelectElement>document.getElementById(idPrefix+key);
                        s.value=sel.value;
                    } else {
                        var ie: HTMLInputElement=<HTMLInputElement>document.getElementById(idPrefix+key);
                        if((t==="object")&&((<Object>snaP[key])["type"]==="Range")) {
                            var r: Range=<Range>snaP[key];
                            r.value=parseFloat(ie.value);
                        } else if((t==="string")||(t==="number")) {
                            if(t==="number") {
                                var v: number=parseFloat(ie.value);
                                if(isNaN(v)) snaP[key]=0; else snaP[key]=v;
                            } else {
                                snaP[key]=ie.value;
                            }
                        } else if(t==="boolean") {
                            snaP[key]=ie.checked;
                        }
                    }
                }
            }
        }

        /**
         * Mesh properties section
         */

        public showPropDiag() {
            if(!this.vishva.anyMeshSelected()) {
                DialogMgr.showAlertDiag("no mesh selected")
                return;
            }
            if(this._itemProps==null) {
                this._itemProps=new ItemProps(this.vishva,this.sNaDialog,this);
            }
            this._itemProps.open();
            return true;
        }
        
    
        /*
         * called by vishva when editcontrol
         * is removed from mesh
         */
        public handeEditControlClose() {
            if(this._items!=null) {
                this._items.clearPrevItem();
            }
            if(this._itemProps!=null)this._itemProps.close();
        }

        
        /*
         * called by vishva when editcontrol
         * is switched from another mesh
         */
        public refreshPropsDiag() {
            if(this._itemProps!=null) this._itemProps.refreshPropsDiag();
        }
        
        //called when user has changed transforms using editcontrol
        public handleTransChange() {
            if(this._itemProps!=null) this._itemProps.refreshGeneralPanel();
        }
      


        /**
         * End of Mesh Properties section
         */


        /**
         * Main Navigation Menu Section
         */

        firstTime: boolean=true;

        addMenuOn: boolean=false;

        private _items: Items;
        private _environment: Environment;
        private _settingDiag: Settings;
        private _itemProps:ItemProps;

        private createNavMenu() {

            //button to show navigation menu
            let showNavMenu: HTMLButtonElement=<HTMLButtonElement>document.getElementById("showNavMenu");
            showNavMenu.style.visibility="visible";

            //navigation menu sliding setup
            document.getElementById("navMenubar").style.visibility="visible";
            let navMenuBar: JQuery=$("#navMenubar");
            let jpo: JQueryPositionOptions={
                my: "left center",
                at: "right center",
                of: showNavMenu
            };
            navMenuBar.position(jpo);
            navMenuBar.show(null);
            showNavMenu.onclick=(e) => {
                if(this.menuBarOn) {
                    navMenuBar.hide("slide",100);
                } else {
                    navMenuBar.show("slide",100);
                }
                this.menuBarOn=!this.menuBarOn;
                return true;
            };

            //add menu sliding setup
            var slideDown: any=JSON.parse("{\"direction\":\"up\"}");
            var navAdd: HTMLElement=document.getElementById("navAdd");
            var addMenu: JQuery=$("#AddMenu");
            addMenu.menu();
            addMenu.hide(null);
            navAdd.onclick=(e) => {
                if(this.firstTime) {
                    var jpo: JQueryPositionOptions={
                        my: "left top",
                        at: "left bottom",
                        of: navAdd
                    };
                    addMenu.menu().position(jpo);
                    this.firstTime=false;
                }
                if(this.addMenuOn) {
                    addMenu.menu().hide("slide",slideDown,100);
                } else {
                    addMenu.show("slide",slideDown,100);
                }
                this.addMenuOn=!this.addMenuOn;
                $(document).one("click",(jqe) => {
                    if(this.addMenuOn) {
                        addMenu.menu().hide("slide",slideDown,100);
                        this.addMenuOn=false;
                    }
                    return true;
                });
                e.cancelBubble=true;
                return true;
            };

            var downWorld: HTMLElement=document.getElementById("downWorld");
            downWorld.onclick=(e) => {
                var downloadURL: string=this.vishva.saveWorld();
                if(downloadURL==null) return true;
                this.downloadLink.href=downloadURL;
                this.downloadDialog.dialog("open");
                return false;
            };

            let navItems: HTMLElement=document.getElementById("navItems");
            navItems.onclick=(e) => {
                if(this._items==null) {
                    this._items=new Items(this.vishva);
                }
                this._items.toggle();
                return false;
            }


            var navEnv: HTMLElement=document.getElementById("navEnv");
            navEnv.onclick=(e) => {
                if(this._environment==null) {
                    this._environment=new Environment(this.vishva);
                }
                this._environment.toggle();
                return false;
            };

            var navEdit: HTMLElement=document.getElementById("navEdit");
            navEdit.onclick=(e) => {
                if((this._itemProps!=null)&&(this._itemProps.isOpen())) {
                    this._itemProps.close();
                } else {
                    this.showPropDiag();
                }
                return false;
            };
            
//            navEdit.onclick=(e) => {
//                if((this.propsDiag!=null)&&(this.propsDiag.dialog("isOpen")===true)) {
//                    this.closePropDiag();
//                } else {
//                    this.showPropDiag();
//                }
//                return true;
//            };

            var navSettings: HTMLElement=document.getElementById("navSettings");
            navSettings.onclick=(e) => {
                this._settingDiag.toggle();
                return false;
            };

            let helpLink: HTMLElement=document.getElementById("helpLink");
            let helpDiag: VDialog=null;
            helpLink.onclick=(e) => {
                if(helpDiag==null) {
                    helpDiag=new VDialog("helpDiv","Help",DialogMgr.center,"","",500);
                }
                helpDiag.toggle();
                return true;
            };

            var debugLink: HTMLElement=document.getElementById("debugLink");
            debugLink.onclick=(e) => {
                this.vishva.toggleDebug();
                return true;
            };
        }
       
        public getSettings() {
            let guiSettings=new GuiSettings();
            guiSettings.enableToolTips=this._settingDiag.enableToolTips;
            return guiSettings;
        }

        private setSettings() {
            if(this._settingDiag==null) {
                this._settingDiag=new Settings(this.vishva,this);
            }
            let guiSettings: GuiSettings=<GuiSettings>this.vishva.getGuiSettings();
            if(guiSettings!==null)
                this._settingDiag.enableToolTips=guiSettings.enableToolTips;
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
        public constructor(e: HTMLElement,f: (p1: any,p2: any,p3: RGB) => void);

        public setRgb(rgb: RGB);
    }

    export class RGB {
        r: number;

        g: number;

        b: number;

        constructor() {
            this.r=0;
            this.g=0;
            this.b=0;
        }
    }

    export class Range {
        public type: string="Range";

        public min: number;

        public max: number;

        public value: number;

        public step: number;

        public constructor(min: number,max: number,value: number,step: number) {
            this.min=0;
            this.max=0;
            this.value=0;
            this.step=0;
            this.min=min;
            this.max=max;
            this.value=value;
            this.step=step;
        }
    }

    export class SelectType {
        public type: string="SelectType";

        public values: string[];

        public value: string;

        constructor() {
        }
    }
}

