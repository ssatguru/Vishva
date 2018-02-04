namespace org.ssatguru.babylonjs.vishva.gui {

       
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;


    export class VishvaGUI {

        private _vishva: Vishva;

        local: boolean=true;

        

        public static LARGE_ICON_SIZE: string="width:128px;height:128px;";

        public static SMALL_ICON_SIZE: string="width:64px;height:64px;";

        private menuBarOn: boolean=true;


        public constructor(vishva: Vishva) {
            this._vishva=vishva;

            this.setSettings();

            $(document).tooltip({
                open: (event,ui: any) => {
                    if(!this._settingDiag.enableToolTips) {
                        ui.tooltip.stop().remove();
                    }
                }
            });


            //when user is typing into ui inputs we donot want keys influencing editcontrol or av movement
            $("input").on("focus",() => {this._vishva.disableKeys();});
            $("input").on("blur",() => {this._vishva.enableKeys();});


            //main navigation menu 
            this.createNavMenu();

            DialogMgr.createAlertDiag();

            window.addEventListener("resize",(evt) => {return this.onWindowResize(evt)});
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
        resizing:boolean=false;
        private onWindowResize(evt: Event) {
            for(let jq of this.dialogs) {
                let jpo: JQueryPositionOptions=<JQueryPositionOptions>jq["jpo"];
                if(jpo!=null) {
                    jq.dialog("option","position",jpo);
                    var open: boolean=<boolean><any>jq.dialog("isOpen");
                    if(open) {
                        this.resizing=true;
                        jq.dialog("close");
                        jq.dialog("open");
                        this.resizing=false;
                    }
                }
            }

            for(let diag of DialogMgr.dialogs) {
                diag.position();
                if(diag.isOpen()) {
                    this.resizing=true;
                    diag.close();
                    diag.open();
                    this.resizing=false;
                }
            }
        }
        /**
         * Main Navigation Menu Section
         */

        private _addItemUI:AddItemUI;
        private _addItemUI2:AddItemUI2;
        private _items: ItemsUI;
        private _environment: EnvironmentUI;
        private _settingDiag: SettingsUI;
        private _itemProps:ItemPropsUI;

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
//            var slideDown: any=JSON.parse("{\"direction\":\"up\"}");
//            var navAdd: HTMLElement=document.getElementById("navAdd");
//            var addMenu: JQuery=$("#AddMenu");
//            addMenu.menu();
//            addMenu.hide(null);
//            navAdd.onclick=(e) => {
//                if(this.firstTime) {
//                    var jpo: JQueryPositionOptions={
//                        my: "left top",
//                        at: "left bottom",
//                        of: navAdd
//                    };
//                    addMenu.menu().position(jpo);
//                    this.firstTime=false;
//                }
//                if(this.addMenuOn) {
//                    addMenu.menu().hide("slide",slideDown,100);
//                } else {
//                    addMenu.show("slide",slideDown,100);
//                }
//                this.addMenuOn=!this.addMenuOn;
//                $(document).one("click",(jqe) => {
//                    if(this.addMenuOn) {
//                        addMenu.menu().hide("slide",slideDown,100);
//                        this.addMenuOn=false;
//                    }
//                    return true;
//                });
//                e.cancelBubble=true;
//                return true;
//            };
            
//            var navAdd: HTMLElement=document.getElementById("navAdd");
//            navAdd.onclick=(e) => {
//                if (this._addItemUI == null){
//                    this._addItemUI=new AddItemUI(this._vishva);
//                }
//                this._addItemUI.toggle();
//            }
            
            var navAdd: HTMLElement=document.getElementById("navAdd");
            navAdd.onclick=(e) => {
                if (this._addItemUI2 == null){
                    this._addItemUI2=new AddItemUI2(this._vishva);
                }
                this._addItemUI2.toggle();
            }

            var downWorld: HTMLElement=document.getElementById("downWorld");
            downWorld.onclick=(e) => {
                var downloadURL: string=this._vishva.saveWorld();
                if(downloadURL==null) return true;
                if(this._downloadDialog==null) this._createDownloadDiag();
                this._downloadLink.href=downloadURL;
                this._downloadDialog.dialog("open");
                return false;
            };

            let navItems: HTMLElement=document.getElementById("navItems");
            navItems.onclick=(e) => {
                if(this._items==null) {
                    this._items=new ItemsUI(this._vishva);
                }
                this._items.toggle();
                return false;
            }


            var navEnv: HTMLElement=document.getElementById("navEnv");
            navEnv.onclick=(e) => {
                if(this._environment==null) {
                    this._environment=new EnvironmentUI(this._vishva);
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
                this._vishva.toggleDebug();
                return true;
            };
        }
        
        /*
         * called by vishva when editcontrol
         * is attached to mesh
         */
        public showPropDiag() {
            if(!this._vishva.anyMeshSelected()) {
                DialogMgr.showAlertDiag("no mesh selected")
                return;
            }
            if(this._itemProps==null) {
                this._itemProps=new ItemPropsUI(this._vishva,this);
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
       
        
        public getSettings() {
            let guiSettings=new GuiSettings();
            guiSettings.enableToolTips=this._settingDiag.enableToolTips;
            return guiSettings;
        }

        private setSettings() {
            if(this._settingDiag==null) {
                this._settingDiag=new SettingsUI(this._vishva,this);
            }
            let guiSettings: GuiSettings=<GuiSettings>this._vishva.getGuiSettings();
            if(guiSettings!==null)
                this._settingDiag.enableToolTips=guiSettings.enableToolTips;
        }
        
        _downloadLink: HTMLAnchorElement;
        _downloadDialog: JQuery;
        private _createDownloadDiag() {
            this._downloadLink=<HTMLAnchorElement>document.getElementById("downloadLink");
            this._downloadDialog=<JQuery>(<any>$("#saveDiv"));
            this._downloadDialog.dialog();
            this._downloadDialog.dialog("close");
        }

        _loadDialog: JQuery;
        private _createUploadDiag() {
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
                    this._vishva.loadAssetFile(file);
                    this._loadDialog.dialog("close");
                    return true;
                }
            })(loadFileInput);
            this._loadDialog=<JQuery>(<any>$("#loadDiv"));
            this._loadDialog.dialog();
            this._loadDialog.dialog("close");
        }

    }

    export class GuiSettings {
        enableToolTips: boolean;
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

