
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
            if (assetDialog.isOpen()) {
                assetDialog.close();
            } else {
                assetDialog.open();
            }
        }
    }

    /**
     * creates a dialog containing a table of asset pictures 
     * @param topFolder 
     * @param assetCat 
     */
    private _createAssetDiag(topFolder: string, assetCat: string): VDiag {
        console.log("dir " + topFolder + " assetType " + assetCat);

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

        //create a table to display the asset pictures
        let table: HTMLTableElement = document.createElement("table");
        table.id = assetCat + "Tbl";


        //populate that table
        this._updateAssetTable(topFolder, table, assetCat, items);

        //add the table to a dialog box.
        let div: HTMLDivElement = document.createElement("div");
        div.id = assetCat + "Div";
        div.appendChild(table);
        div.style.overflow = "auto";
        document.body.appendChild(div);


        let assetDiag: VDiag = new VDiag(div, assetCat, VDiag.leftBottom, "80%", "auto");
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
        for (let item of items) {
            if (!(item instanceof Object)) continue;

            let img: HTMLImageElement = document.createElement("img");
            let name: string = item["d"];

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
            img.setAttribute("style", VishvaGUI.LARGE_ICON_SIZE + "cursor:pointer;");
            img.className = assetCat;
            img.onclick = f;
            var cell: HTMLTableCellElement = <HTMLTableCellElement>row.insertCell();
            cell.appendChild(img);
        }
        var row2: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
        for (let item of items) {
            if (!(item instanceof Object)) continue;
            let cell: HTMLTableCellElement = <HTMLTableCellElement>row2.insertCell();
            cell.innerText = item["d"];
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
        } else {
            this._vishva.loadAsset(i.className, i.id);
        }
        return true;
        //this._vishva.createWater();
    }

    /**
     * returns a list of items (files/folders) under a folder
     * @param path list of all parent folders and the folder itself
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
