
import { Vishva } from "../Vishva";
import { DialogMgr } from "./DialogMgr";
import { VishvaGUI } from "./VishvaGUI";
import { VDiag } from "./components/VDiag";

/**
 * Provides a UI to add items from Internal and Currated Assets to the world
 */
export class InternalAssetsUI {

    private _vishva: Vishva;
    private _assetDiagMap: Object = {};
    //private _vishvaFiles: Array<string | object>;

    constructor(vishva: Vishva) {
        this._vishva = vishva;
        //this._vishvaFiles = Vishva.userAssets;
    }

    /**
     * turns the asset disalog on or off
     * if first time and the asset dialog is not present then it creates one
     * @param topFolder -  internal, curated
     * @param assetCat - asset category
     *   for internal - one of primitives, particles (maybe), avatar (maybe)
     *   for curated - a folder under curated folder
     */

    public toggleAssetDiag(topFolder: string, assetCat: string) {
        let assetDialog: VDiag = this._assetDiagMap[assetCat]
        if (assetDialog == null) {
            assetDialog = this._createAssetDiag(topFolder, assetCat);
            if (assetDialog == null) {
                DialogMgr.showAlertDiag("no assets found for this");
                return;
            }
            this._assetDiagMap[assetCat] = assetDialog;
        } else {
            if (assetDialog.isShown()) {
                assetDialog.hide();
            } else {
                assetDialog.show();
            }
        }
    }

    /**
     * creates a dialog containing a table of asset pictures 
     * @param topFolder 
     * @param assetCat 
     */
    private _createAssetDiag(topFolder: string, assetCat: string): VDiag {
        //get the list of items in the internal or curated folder
        let fileList: Array<string | object>;
        if (topFolder == "internal") {
            fileList = Vishva.internalAssets;
        } else {
            fileList = Vishva.userAssets;
        }
        let items: Array<string | object> = this._getFiles([topFolder, assetCat], fileList);
        if (items == null) {
            return null;
        }

        // For curated assets, include:
        //   1. Subfolders that have a thumbnail.png inside them (existing behaviour)
        //   2. Flat image files with a double extension like "Bush_Common_Flowers.gltf.png"
        //      — the image itself is the thumbnail, and the corresponding asset file is loaded on click
        if (topFolder !== "internal") {
            items = items.filter(item => {
                if (item instanceof Object) {
                    // Subfolder: keep only those with a thumbnail.png
                    let files: Array<string | object> = item["f"];
                    if (!files) return false;
                    return files.some(f => typeof f === "string" && f === "thumbnail.png");
                } else if (typeof item === "string") {
                    // Flat file: keep double-extension asset-image files, e.g. "Name.gltf.png"
                    return InternalAssetsUI._isDoubleExtAssetImage(item);
                }
                return false;
            });
            if (items.length === 0) {
                return null;
            }
        }

        //create a table to display the asset pictures
        let table: HTMLTableElement = document.createElement("table");
        table.id = assetCat + "Tbl";
        table.className = "withBorder";

        //populate that table
        this._updateAssetTable(topFolder, table, assetCat, items);

        //add the table to a dialog box.
        let div: HTMLDivElement = document.createElement("div");
        div.id = assetCat + "Div";
        div.appendChild(table);
        div.style.overflow = "auto";
        document.body.appendChild(div);

        let assetDiag: VDiag = new VDiag(div, assetCat, VDiag.leftBottom, "auto", "auto");
        return assetDiag;
    }


    /**
     * creates a table of one row with the row containing picture of each asset in the asset category 
     * 
     * @param topFolder 
     * @param tbl 
     * @param assetCat 
     * @param items 
     */
    private _updateAssetTable(topFolder: string, tbl: HTMLTableElement, assetCat: string, items: Array<string | object>) {
        if (tbl.rows.length > 0) {
            return;
        }

        var f: (p1: MouseEvent) => any = (e) => { return this._onAssetImgClick(e) };
        var row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
        var row2: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();

        for (let item of items) {
            let img: HTMLImageElement = document.createElement("img");
            let label: string;

            if (typeof item === "string" && InternalAssetsUI._isDoubleExtAssetImage(item)) {
                // Flat double-extension file: e.g. "Bush_Common_Flowers.gltf.png"
                // img.id = the actual asset filename ("Bush_Common_Flowers.gltf")
                // thumbnail = the image file itself
                const assetFileName = item.slice(0, item.lastIndexOf(".")); // strip trailing .png
                img.id = assetFileName;
                img.src = Vishva.vHome + "assets/" + topFolder + "/" + assetCat + "/" + item;
                label = assetFileName.split(".")[0]; // display name without any extension
                img.className = assetCat + "_flat"; // distinct class to route click differently
            } else if (item instanceof Object) {
                let name: string = item["d"];
                label = name;

                //check if special type of categories
                if ("skyboxes primitives particles".search(assetCat) > -1) {
                    img.id = name;
                } else {
                    let files: Array<string | object> = item["f"];
                    for (let file of files) {
                        if (!(file instanceof Object)) {
                            if (file.search(name) > -1 && this._isAsset(file)) {
                                img.id = file;
                                break;
                            }
                        }
                    }
                }
                let imgURL = "assets/" + topFolder + "/" + assetCat + "/" + name + "/thumbnail.png";
                if (topFolder == "internal") {
                    img.src = Vishva.vBinHome + imgURL;
                } else {
                    img.src = Vishva.vHome + imgURL;
                }
                img.className = assetCat;
            } else {
                continue;
            }

            img.setAttribute("style", VishvaGUI.LARGE_ICON_SIZE + "cursor:pointer;");
            img.onclick = f;
            img.title = label;
            img.draggable = true;
            img.addEventListener('dragstart', (ev: DragEvent) => {
                if (ev.dataTransfer) {
                    ev.dataTransfer.setData('vishva/asset', JSON.stringify({ className: img.className, id: img.id }));
                    ev.dataTransfer.effectAllowed = 'copy';
                }
            });

            var cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
            cell.appendChild(img);

            var cell2: HTMLTableCellElement = <HTMLTableCellElement>row2.insertCell();
            cell2.innerText = label;
            cell2.style.textAlign = "center";
        }
    }
    private _isAsset(fileName: String): boolean {
        let ft = fileName.split(".")[1];
        if (ft != null) {
            if ("babylon glb gltf obj".search(ft) > -1) return true;
        }
        return false;
    }

    private _onAssetImgClick(e: Event): any {
        var i: HTMLImageElement = <HTMLImageElement>e.target;
        if (i.className === "skyboxes") {
            this._vishva.setSky(i.id);
        } else if (i.className === "primitives") {
            this._vishva.addPrim(i.id);
        } else if (i.className === "particles") {
            this._vishva.createParticles(i.id);
        } else if (i.className.endsWith("_flat")) {
            // Double-extension flat asset: className is "<assetCat>_flat", id is the asset filename (e.g. "Bush_Common_Flowers.gltf")
            const category = i.className.slice(0, -"_flat".length);
            this._vishva.loadManager.loadCurAsset(category, i.id, true);
        } else {
            this._vishva.loadManager.loadCurAsset(i.className, i.id);
        }
        return true;
    }

    /**
     * Returns true if the filename has a double extension where the inner extension
     * is a known 3D asset type and the outer extension is an image type.
     * e.g. "Bush_Common_Flowers.gltf.png" → true
     */
    private static _isDoubleExtAssetImage(fileName: string): boolean {
        const parts = fileName.split(".");
        if (parts.length < 3) return false;
        const imgExt = parts[parts.length - 1].toLowerCase();
        const assetExt = parts[parts.length - 2].toLowerCase();
        const imageExts = ["png", "jpg", "jpeg", "webp"];
        const assetExts = ["gltf", "glb", "babylon", "obj"];
        return imageExts.includes(imgExt) && assetExts.includes(assetExt);
    }

    /**
     * returns a list of items (files/folders) under a folder
     * @param path list of all parent folders and the folder itself (a full path to the folder)
     * @param fileList all the files in vishva
     */
    private _getFiles(path: string[], fileList: Array<string | object>): Array<string | object> {
        for (let file of fileList) {
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
        return null;
    }
}
