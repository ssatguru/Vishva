import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;
import { Vishva } from "../Vishva";
import { DialogMgr } from "./DialogMgr";
import { EnvironmentUI } from "./EnvironmentUI";
import { VTreeDialog } from "./components/VTreeDialog";
import { InternalAssetsUI } from "./InternalAssetsUI";
import { ItemListUI } from "./ItemListUI";
import { SettingsUI } from "./SettingsUI";
import { PropsPanelUI } from "./propspanel/PropsPanelUI";
import { VButton } from "./components/VButton";
import { hlpElement } from "./HelpML";
import { navElement } from "./NavBarML";
import { saveElement } from "./VishvaML";
import { VDiag } from "./components/VDiag";


export class GuiSettings {
    enableToolTips: boolean = true;
}

export class VishvaGUI {

    private _vishva: Vishva;

    local: boolean = true;

    public static LARGE_ICON_SIZE: string = "width:128px;height:128px;";
    public static SMALL_ICON_SIZE: string = "width:64px;height:64px;";
    public guiSettings: GuiSettings;

    private menuBarOn: boolean = true;
    private _vishvaFiles: Array<string | object>;


    public constructor(vishva: Vishva) {
        this._vishva = vishva;
        this._vishvaFiles = Vishva.userAssets;

        //document.body.append(navElement);
        Vishva.gui.append(navElement);

        //document.body.appendChild(saveElement);
        Vishva.gui.append(saveElement);

        //check if vishva got the settings from a scene if loaded
        this.guiSettings = <GuiSettings>this._vishva.getGuiSettings();
        if (this.guiSettings == null) {
            this.guiSettings = new GuiSettings();
        }

        // $(document).tooltip({
        //     open: (event, ui: any) => {
        //         if (!this.guiSettings.enableToolTips) {
        //             ui.tooltip.stop().remove();
        //         }
        //     }
        // });


        //when user is typing into ui inputs we donot want keys influencing editcontrol or av movement
        $("input").on("focus", () => { this._vishva.disableKeys(); });
        $("input").on("blur", () => { this._vishva.enableKeys(); });

        this._buildCuratedAssetsMenu();

        //main navigation menu 
        this._createNavMenu();

        window.addEventListener("resize", (evt) => { return this.onWindowResize(evt) });
    }




    /**
     * resposition all dialogs to their original default postions without this,
     * a window resize could end up moving some dialogs outside the window and
     * thus make them disappear
     * the default position of each dialog will be stored in a new property called "jpo"
     * this would be created whenever/wherever the dialog is defined
     * 
     * @param evt
     */
    resizing: boolean = false;
    private onWindowResize(evt: Event) {

        for (let vdiag of DialogMgr.vdiags) {
            vdiag.reset();
        }

    }

    /**
     * get all directories under a path
     * 
     * @param path 
     * @param files 
     */
    private _getDirs(path: string[], files: Array<string | object>): Array<string> {
        let contents: Array<string | object> = this._getFiles(path, files);
        let dirs: Array<string> = [];
        for (let content of contents) {
            if (content instanceof Object) {
                dirs.push(content["d"])
            }
        }
        return dirs;

    }

    /**
     * get the content of a path
     * @param path  - an array of dir name, where each subsequent dir is a child of the previous. Thus ['a','b'] = 'a\b'
     * @param files 
     */
    private _getFiles(path: string[], files: Array<string | object>): Array<string | object> {
        for (let file of files) {
            if (file instanceof Object) {
                if (file["d"] == path[0]) {
                    if (path.length > 1) {
                        path.splice(0, 1);
                        return this._getFiles(path, file["f"]);
                    } else
                        return file["f"];
                }
            }
        }
        return files;
    }


    private _buildCuratedAssetsMenu() {
        let dirs: Array<string> = this._getDirs(["curated"], this._vishvaFiles);
        let addMenu: HTMLElement = document.getElementById("AddMenu");
        addMenu.style.zIndex = "inherit";
        for (let dir of dirs) {
            let button: HTMLButtonElement = VButton.create(dir, dir);
            addMenu.appendChild(button);
            button.onclick = (e) => {
                if (this._addInternalAssetUI == null) {
                    this._addInternalAssetUI = new InternalAssetsUI(this._vishva);
                }
                this._addInternalAssetUI.toggleAssetDiag("curated", (<HTMLElement>e.target).id);

            };
        }
    }

    /**
     * Main Navigation Menu Section
     */

    private _addInternalAssetUI: InternalAssetsUI;
    private _addAssetTDiag: VTreeDialog;
    private _items: ItemListUI;
    public getItemList(): ItemListUI {
        if (this._items == null) {
            this._items = new ItemListUI(this._vishva);
        }
        return this._items;
    }
    private _environment: EnvironmentUI;
    private _settingsUI: SettingsUI = null;
    private _itemProps: PropsPanelUI;

    private firstTime: boolean = true;
    private addMenuOn: boolean = false;

    private _createNavMenu() {

        //button to show navigation menu - hamburger button
        let showNavMenu: HTMLButtonElement = <HTMLButtonElement>document.getElementById("showNavMenu");
        showNavMenu.style.visibility = "visible";

        //navigation menu sliding setup
        document.getElementById("navMenubar").style.visibility = "visible";
        let navMenuBar: JQuery = $("#navMenubar");
        let jpo: JQueryPositionOptions = {
            my: "left center",
            at: "right+4 center",
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

        // button to download world
        var downWorld: HTMLElement = document.getElementById("downWorld");
        downWorld.onclick = (e) => {
            var downloadURL: string = this._vishva.saveWorld();
            if (downloadURL == null) return true;
            if (this._downloadDialog == null) this._createDownloadDiag();
            this._downloadLink.href = downloadURL;
            this._downloadLink.download = Vishva.worldName + ".js";
            this._downloadDialog.open();
            return false;
        };

        // button for internal and curated items
        //add menu sliding setup
        var slideDown: any = JSON.parse("{\"direction\":\"up\"}");
        var navAdd0: HTMLElement = document.getElementById("navCAssets");
        navAdd0.style.visibility = "visible";
        document.getElementById("AddMenu").style.visibility = "visible";
        var addMenu: JQuery = $("#AddMenu");
        addMenu.hide(null);
        navAdd0.onclick = (e) => {
            if (this.firstTime) {
                var jpo: JQueryPositionOptions = {
                    my: "left top",
                    at: "left bottom+4",
                    of: navAdd0
                };
                addMenu.position(jpo);
                this.firstTime = false;
            }
            if (this.addMenuOn) {
                // addMenu.menu().hide("slide", slideDown, 100);
                addMenu.hide("slide", slideDown, 100);
            } else {
                // addMenu.menu().show("slide", slideDown, 100);
                addMenu.show("slide", slideDown, 100);
            }
            this.addMenuOn = !this.addMenuOn;
            $(document).one("click", (jqe) => {
                if (this.addMenuOn) {
                    // addMenu.menu().hide("slide", slideDown, 100);
                    addMenu.hide("slide", slideDown, 100);
                    this.addMenuOn = false;
                }
                return true;
            });
            e.cancelBubble = true;
            return true;
        };

        // button for all assets in world
        let navItems: HTMLElement = document.getElementById("navItems");
        navItems.onclick = (e) => {
            if (this._items == null) {
                this._items = new ItemListUI(this._vishva);
            } else {
                this._items.toggle();
            }
            return false;
        }

        // button for all assets in inventory 
        var navAdd: HTMLElement = document.getElementById("navAdd");
        navAdd.onclick = (e) => {
            if (this._addAssetTDiag == null) {
                this._addAssetTDiag = new VTreeDialog(this._vishva, "all assets", VDiag.leftTop2, Vishva.userAssets, "\.obj$|\.babylon$|\.glb$|\.gltf$", false);
                this._addAssetTDiag.addTreeListener((f, p, l) => {
                    if (l) {
                        if (f.indexOf(".obj") > 0 || f.indexOf(".babylon") > 0 || f.indexOf(".glb") > 0 || f.indexOf(".gltf") > 0) {
                            this._vishva.loadAsset2(p, f);
                        }
                    }
                })
                this._addAssetTDiag.addRefreshHandler(() => {
                    $.getScript("vishva/vishvaFiles.js", () => {
                        this._addAssetTDiag.refresh(Vishva.userAssets);
                    })
                })
            } else {
                this._addAssetTDiag.toggle();
            }
        }

        // button for all primitives
        var navPrim: HTMLElement = document.getElementById("navPrim");
        navPrim.onclick = () => {
            if (this._addInternalAssetUI == null) {
                this._addInternalAssetUI = new InternalAssetsUI(this._vishva);
            }
            this._addInternalAssetUI.toggleAssetDiag("internal", "primitives");

        }

        // button for all environment
        var navEnv: HTMLElement = document.getElementById("navEnv");
        navEnv.onclick = (e) => {
            if (this._environment == null) {
                if (this._addInternalAssetUI == null) {
                    this._addInternalAssetUI = new InternalAssetsUI(this._vishva);
                }
                this._environment = new EnvironmentUI(this._vishva, this._addInternalAssetUI, this);
            } else
                this._environment.toggle();
            return false;
        };

        // button for edit
        var navEdit: HTMLElement = document.getElementById("navEdit");
        navEdit.onclick = (e) => {
            if ((this._itemProps != null) && (this._itemProps.isOpen())) {
                this._itemProps.close();
            } else {
                this.showPropDiag();
            }
            return false;
        };

        // button for settings
        var navSettings: HTMLElement = document.getElementById("navSettings");
        navSettings.onclick = (e) => {
            if (this._settingsUI == null) {
                this._settingsUI = new SettingsUI(this);
            } else {
                this._settingsUI.toggle();
            }
            return false;
        };

        // button for help
        let helpLink: HTMLElement = document.getElementById("helpLink");
        //let helpDiag: VDialog = null;
        let helpDiag: VDiag = null;
        helpLink.onclick = (e) => {
            if (helpDiag == null) {
                //helpDiag = new VDialog(hlpElement, "Help", DialogMgr.center, "50%", "", 640);
                helpDiag = new VDiag(hlpElement, "Help", VDiag.center, "50%", "", "640px");
            } else
                helpDiag.toggle();
            return true;
        };

        // button for babylon inspector
        var debugLink: HTMLElement = document.getElementById("debugLink");
        debugLink.onclick = (e) => {
            this._vishva.toggleDebug();
            return true;
        };
    }

    /*
     * called by vishva when editcontrol
     * is attached to mesh
     */
    public showPropDiag() {
        if (!this._vishva.anyMeshSelected()) {
            DialogMgr.showAlertDiag("no mesh selected")
            return;
        }
        if (this._itemProps == null) {
            this._itemProps = new PropsPanelUI(this._vishva, this);
        }
        this._itemProps.open();
        if (this._items != null && this._items.isOPen()) this._items.search(Number(this._vishva.meshSelected.uniqueId).toString() + ",");
    }

    /*
     * called by vishva when editcontrol
     * is removed from mesh
     */
    public handeEditControlClose() {
        if (this._itemProps != null) this._itemProps.close();
    }

    /*
     * called by vishva when editcontrol
     * is switched from another mesh
     */
    public refreshPropsDiag() {
        if (this._itemProps != null) this._itemProps.refreshPropsDiag();
        if (this._items != null && this._items.isOPen()) this._items.search(Number(this._vishva.meshSelected.uniqueId).toString() + ",");
    }

    //called when user has changed transforms using editcontrol
    public handleTransChange() {
        if (this._itemProps != null) this._itemProps.refreshGeneralPanel();
    }

    _downloadLink: HTMLAnchorElement;
    _downloadDialog: VDiag;
    private _createDownloadDiag() {
        this._downloadLink = <HTMLAnchorElement>document.getElementById("downloadLink");
        this._downloadDialog = new VDiag(document.getElementById("saveDiv"), "Download World", VDiag.center, "20em", "auto");
        this._downloadDialog.close();
    }

    _loadDialog: JQuery;
    private _createUploadDiag() {
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
                this._vishva.loadAssetFile(file);
                this._loadDialog.dialog("close");
                return true;
            }
        })(loadFileInput);
        this._loadDialog = <JQuery>(<any>$("#loadDiv"));
        this._loadDialog.dialog();
        this._loadDialog.dialog("close");
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

export class FileInputType {
    public type: string = "FileInputType";

    public value: string;

    constructor(public title = "", public filter = "", public openAll = true) {

    }
}


