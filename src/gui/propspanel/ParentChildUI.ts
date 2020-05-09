
import { Vector3 } from "babylonjs";
import { Vishva } from "../../Vishva";
import { VishvaGUI } from "../VishvaGUI";
import { DialogMgr } from "../DialogMgr";
import { SnaUI } from "../SnaUI";
import { InternalAssetsUI } from "../InternalAssetsUI";
import { VInputVector3 } from "../components/VInputVector3";
import { VInputNumber } from "../components/VInputNumber";

/**
 * Provides UI for the Genral tab of mesh properties
 */
export class ParentChildUI {

    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;


    constructor(vishva: Vishva, vishvaGUI: VishvaGUI) {
        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;

        let parentMesh: HTMLElement = document.getElementById("parentMesh");
        let removeParent: HTMLElement = document.getElementById("removeParent");
        let removeChildren: HTMLElement = document.getElementById("removeChildren");
        let showTree: HTMLElement = document.getElementById("showTree");

        parentMesh.onclick = (e) => {
            let err: string = this._vishva.makeParent();
            if (err != null) {
                DialogMgr.showAlertDiag(err);
            }
            return false;
        };
        removeParent.onclick = (e) => {
            let err: string = this._vishva.removeParent();
            if (err != null) {
                DialogMgr.showAlertDiag(err);
            }
            return false;
        };
        removeChildren.onclick = (e) => {
            let err: string = this._vishva.removeChildren();
            if (err != null) {
                DialogMgr.showAlertDiag(err);
            }
            return false;
        };
        showTree.onclick = (e) => {
            let il = this._vishvaGUI.getItemList();
            il.search(Number(this._vishva.meshSelected.uniqueId).toString() + ",");
            il.open();
        }



    }

}



