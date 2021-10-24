
import { Vishva } from "../../Vishva";
import { VishvaGUI } from "../VishvaGUI";
import { DialogMgr } from "../DialogMgr";


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
            let il = this._vishvaGUI.showItemList();
            il.open();
            il._highlightSelected();

        }



    }

}



