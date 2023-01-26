declare var userAssets: Array<any>;

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
import { VTheme, VThemes } from "./components/VTheme";
import { TransformNode } from "babylonjs";


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

        Vishva.gui.append(navElement);


        Vishva.gui.append(saveElement);

        //check if vishva got the settings from a scene if loaded
        this.guiSettings = <GuiSettings>this._vishva.getGuiSettings();
        if (this.guiSettings == null) {
            this.guiSettings = new GuiSettings();
        }


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
        let am: HTMLElement = document.getElementById("AddMenu");
        am.style.zIndex = "inherit";
        for (let dir of dirs) {
            let button: HTMLButtonElement = VButton.create(dir, dir);
            button.style.display = "block";
            button.style.margin = "0.2em";
            am.appendChild(button);
            button.onclick = (e) => {
                if (this._addInternalAssetUI == null) {
                    this._addInternalAssetUI = new InternalAssetsUI(this._vishva);
                }
                this._addInternalAssetUI.toggleAssetDiag("curated", (<HTMLElement>e.target).id);
                am.style.display = "none";
            };
        }
    }

    /**
     * Main Navigation Menu Section
     */

    private _addInternalAssetUI: InternalAssetsUI;
    private _allAssetsVTDiag: VTreeDialog;
    private _items: ItemListUI;
    public showItemList(): ItemListUI {
        if (this._items == null) {
            this._items = new ItemListUI(this._vishva);
        }
        return this._items;
    }
    public getItemList() {
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
        showNavMenu.style.display = "inline-block";
        showNavMenu.onclick = (e) => {
            if (nm.style.display == "inline-block") {
                nm.style.display = "none";
            } else {
                nm.style.display = "inline-block";
            }
        }

        //navigation menu 
        let nm = document.getElementById("navMenubar");
        nm.style.visibility = "visible";

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

        // buttons for internal and curated items
        let am = document.getElementById("AddMenu");

        let _navCAssets: HTMLElement = document.getElementById("navCAssets");
        _navCAssets.onclick = (e) => {
            if (am.style.display == "none") {
                am.style.display = "block";
            } else {
                am.style.display = "none";
            }
        }

        // button for all assets in world
        let _navWorldAssets: HTMLElement = document.getElementById("navWorldAssets");
        _navWorldAssets.onclick = (e) => {
            if (this._items == null) {
                this._items = new ItemListUI(this._vishva);
            } else {
                this._items.toggle();
            }
            return false;
        }

        // button for all assets in inventory 
        var navAllAssets: HTMLElement = document.getElementById("navAllAssets");
        navAllAssets.onclick = (e) => {

            if (this._allAssetsVTDiag == null) {

                this._allAssetsVTDiag = new VTreeDialog(this._vishva, "all assets", VDiag.leftTop2, Vishva.userAssets, "", false);

                this._allAssetsVTDiag.addTreeListener((f, p, l) => {
                    if (l) {
                        if (f.indexOf(".obj") > 0 || f.indexOf(".babylon") > 0 || f.indexOf(".glb") > 0 || f.indexOf(".gltf") > 0) {
                            this._vishva.loadUserAsset(p, f);
                        }
                    }
                });

                this._allAssetsVTDiag.addRefreshHandler(() => {
                    let xhttp = new XMLHttpRequest();
                    xhttp.onload = () => {
                        if (xhttp.readyState == 4 && xhttp.status == 200) {
                            eval(xhttp.responseText);
                            Vishva.userAssets = userAssets;
                            this._allAssetsVTDiag.refresh(Vishva.userAssets);
                        }
                    };
                    xhttp.open("GET", "vishva/userAssets.js", true);
                    xhttp.send();
                })

            } else {
                this._allAssetsVTDiag.toggle();
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
                if (!this._vishva.anyMeshSelected()) {
                    DialogMgr.showAlertDiag("no mesh selected")
                    return;
                } else {
                    this.showPropDiag(this._vishva.meshSelected);
                }
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
    public showPropDiag(node: TransformNode) {

        if (this._itemProps == null) {
            this._itemProps = new PropsPanelUI(this._vishva, this, node);
        }
        this._itemProps.open();
        if (this._items != null && this._items.isOpen()) this._items._highlightSelected();
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
        if (this._items != null && this._items.isOpen()) this._items._highlightSelected();
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
        // this._downloadDialog.close();
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


