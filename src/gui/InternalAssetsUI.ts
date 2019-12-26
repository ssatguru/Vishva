
import AbstractMesh = BABYLON.AbstractMesh;
import { Vishva } from "../Vishva";
import { VDialog } from "./VDialog";
import { DialogMgr } from "./DialogMgr";
import { VishvaGUI } from "./VishvaGUI";
import { InternalTexture } from "babylonjs";

/**
 * Provides a UI to add items from Internal Assets to the world
 */
export class InternalAssetsUI {

    private _vishva: Vishva;
    private _assetDiagMap: Object = {};
    private _vishvaFiles: Array<string | object>;

    constructor(vishva: Vishva) {
        this._vishva = vishva;
        this._vishvaFiles = Vishva.vishvaFiles;
    }

    public toggleAssetDiag(dir: string, assetType: string) {
        let assetDialog: VDialog = this._assetDiagMap[assetType]
        if (assetDialog == null) {
            assetDialog = this._createAssetDiag(dir, assetType);
            this._assetDiagMap[assetType] = assetDialog;
        }
        if (assetDialog.isOpen()) {
            assetDialog.close();
        } else {
            assetDialog.open();
        }
    }

    private _createAssetDiag(dir: string, assetType: string): VDialog {
        console.log("dir " + dir + " assetType " + assetType);

        let div: HTMLDivElement = document.createElement("div");
        div.id = assetType + "Div";
        div.setAttribute("title", assetType);
        let table: HTMLTableElement = document.createElement("table");
        table.id = assetType + "Tbl";

        let items: Array<string | object> = this._getFiles(["assets", dir, assetType], this._vishvaFiles);
        this._updateAssetTable(dir, table, assetType, items);
        div.appendChild(table);
        document.body.appendChild(div);

        let assetDiag: VDialog = new VDialog(div.id, assetType, DialogMgr.centerBottom, "95%", "auto");
        return assetDiag;
    }

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


    private _updateAssetTable(dir, tbl: HTMLTableElement, assetType: string, items: Array<string | object>) {
        if (tbl.rows.length > 0) {
            return;
        }

        var f: (p1: MouseEvent) => any = (e) => { return this._onAssetImgClick(e) };
        var row: HTMLTableRowElement = <HTMLTableRowElement>tbl.insertRow();
        for (let item of items) {
            if (!(item instanceof Object)) continue;
            let img: HTMLImageElement = document.createElement("img");
            let name: string = item["d"];

            if ("skyboxes primitives particles".search(assetType) > -1) {
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

            if (dir == "internal") {
                img.src = "assets/" + dir + "/" + assetType + "/" + name + "/thumbnail.png";
            } else {
                img.src = Vishva.vHome + "/assets/" + dir + "/" + assetType + "/" + name + "/thumbnail.png";
            }
            img.setAttribute("style", VishvaGUI.SMALL_ICON_SIZE + "cursor:pointer;");
            img.className = assetType;
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
}
