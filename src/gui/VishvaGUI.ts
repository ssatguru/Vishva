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
import { NavBar } from "./NavBarML";
import { saveElement } from "./VishvaML";
import { VDiag } from "./components/VDiag";
import { TransformNode } from "babylonjs";
import { CCUI } from "./CCUI";
import { SNAManager } from "../sna/SNA";
import { SavePromptUI } from "./SavePromptUI";
import { UploadUI } from "./UploadUI";


export class GuiSettings {
    enableToolTips: boolean = true;
}

export class VishvaGUI {

    private _vishva: Vishva;

    local: boolean = true;

    //LARGE_ICON_SIZE  "width:128px;height:128px;";
    //public static LARGE_ICON_SIZE: string = "width:" + 128/window.devicePixelRatio + "px;height:"+ 128/window.devicePixelRatio +"px;";
    public static LARGE_ICON_SIZE: string = "width:128px;height:128px;";
    public static SMALL_ICON_SIZE: string = "width:64px;height:64px;";
    public guiSettings: GuiSettings;

    private menuBarOn: boolean = true;
    private _vishvaFiles: Array<string | object>;


    public constructor(vishva: Vishva) {
        this._vishva = vishva;
        this._vishvaFiles = Vishva.userAssets;

        Vishva.gui.append(new NavBar().navElement);

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
    private _savePromptUI: SavePromptUI;
    private _uploadUI: UploadUI;
    private _allAssetsVTDiag: VTreeDialog;
    private _items: ItemListUI;
    public showItemList(): ItemListUI {
        if (this._items == null) {
            this._items = new ItemListUI(this._vishva,false);
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
    // private _avUI: CCUI;

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

        // button to navigate to world launcher
        const worldLauncherBtn = document.getElementById("worldLauncher");
        worldLauncherBtn.onclick = (e) => {
            if (this._vishva.isDirty()) {
                if (!confirm("You have unsaved changes. Leave this world?")) {
                    return false;
                }
            }
            window.location.href = window.location.pathname;
            return false;
        };

        // button to download world
        var downWorld: HTMLElement = document.getElementById("downWorld");
        downWorld.onclick = async (e) => {
            if (this._downloadFormatDialog == null) this._createDownloadFormatDiag();
            this._downloadFormatDialog.show();
            return false;
        };

        // button to save world to browser IndexedDB
        var saveWorld: HTMLElement = document.getElementById("saveWorld");
        saveWorld.onclick = (e) => {
            if (this._savePromptUI == null) {
                this._savePromptUI = new SavePromptUI();
            }
            this._savePromptUI.show(Vishva.worldName);
            return false;
        };

        // button to upload file/folder to scene
        this._uploadUI = new UploadUI(this._vishva);
        var uploadAsset: HTMLElement = document.getElementById("uploadAsset");
        uploadAsset.onclick = (e) => {
            this._uploadUI.handleUploadClick();
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
                this._items = new ItemListUI(this._vishva,false);
            } else {
                this._items.toggle();
            }
            return false;
        }

        // button for all assets in inventory 
        var navAllAssets: HTMLElement = document.getElementById("navAllAssets");
        navAllAssets.onclick = (e) => {

            if (this._allAssetsVTDiag == null) {

                this._allAssetsVTDiag = new VTreeDialog(this._vishva, "files", VDiag.leftTop2, Vishva.userAssets, "", false);

                this._allAssetsVTDiag.addTreeListener((f, p, l) => {
                    if (l) {
                        if (f.indexOf(".obj") > 0 || f.indexOf(".babylon") > 0 || f.indexOf(".glb") > 0 || f.indexOf(".gltf") > 0) {
                            this._vishva.loadManager.loadUserAsset(p, f);
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

        // button for character controller
        var navAV: HTMLElement = document.getElementById("navAV");
        navAV.onclick = (e) => {
           new CCUI(this._vishva.avManager.cc);
        }

        // button for environment
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

        // button for babylon inspector
        var pause: HTMLElement = document.getElementById("pauseActuators");
        var pauseIcon:HTMLSpanElement = pause.getElementsByTagName("span")[0];
        pause.onclick = (e) => {
            if (this.isWorldPaused) {
                SNAManager.getSNAManager().resumeSNAs();
                pauseIcon.innerHTML="pause_circle";
            } else {
                SNAManager.getSNAManager().pauseSNAs();
                pauseIcon.innerHTML="play_arrow";
            }
            this.isWorldPaused = !this.isWorldPaused;
            return true;
        };
    }

    isWorldPaused:boolean = false;

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
     * TODO Close all child windows before switching
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
    _downloadFormatDialog: VDiag;

    private _createDownloadFormatDiag() {
        const container = document.createElement("div");
        container.style.padding = "1em";
        container.style.textAlign = "center";

        const msg = document.createElement("p");
        msg.textContent = "Choose download format:";
        container.appendChild(msg);

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.justifyContent = "center";
        btnContainer.style.gap = "1em";
        btnContainer.style.marginTop = "1em";

        const tarBtn = document.createElement("button");
        tarBtn.className = "w3-button w3-round w3-dark-grey";
        tarBtn.textContent = "Archive (.tar.gz)";
        tarBtn.title = "Full world with all assets bundled";
        tarBtn.onclick = async () => {
            this._downloadFormatDialog.hide();
            var downloadURL: string = await this._vishva.saveWorld();
            if (downloadURL == null) return;
            if (this._downloadDialog == null) this._createDownloadDiag();
            this._downloadLink.href = downloadURL;
            this._downloadLink.download = Vishva.worldName.replace(".tar.gz", "").replace(".json", "") + ".tar.gz";
            this._downloadDialog.show();
        };

        const jsonBtn = document.createElement("button");
        jsonBtn.className = "w3-button w3-round w3-dark-grey";
        jsonBtn.textContent = "Scene only (.json)";
        jsonBtn.title = "Scene data without assets (legacy format)";
        jsonBtn.onclick = async () => {
            this._downloadFormatDialog.hide();
            var downloadURL: string = await this._vishva.saveWorldAsJson();
            if (downloadURL == null) return;
            if (this._downloadDialog == null) this._createDownloadDiag();
            this._downloadLink.href = downloadURL;
            this._downloadLink.download = Vishva.worldName.replace(".tar.gz", "").replace(".json", "") + ".json";
            this._downloadDialog.show();
        };

        btnContainer.appendChild(tarBtn);
        btnContainer.appendChild(jsonBtn);
        container.appendChild(btnContainer);

        this._downloadFormatDialog = new VDiag(container, "Download World", VDiag.center, "24em", "auto");
    }

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


