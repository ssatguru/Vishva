
import { AbstractMesh, TransformNode, Mesh } from "babylonjs";
import { Vishva } from "../Vishva";
import { VTreeDialog } from "./components/VTreeDialog";
import { DialogMgr } from "./DialogMgr";
import { Node } from "babylonjs";
/*
 * provides a user interface which list all nodes in the scene
 */
export class ItemListUI {

    private _vishva: Vishva;
    private _itemsDiag: VTreeDialog;

    //see search() for an explanation of this
    private _donotSearch: boolean = false;

    constructor(vishva: Vishva) {

        this._vishva = vishva;


        this._updateTreeData();

        this._itemsDiag = new VTreeDialog(this._vishva, "Items in Scene", DialogMgr.leftCenter, this.treeData);
        this._itemsDiag.addTreeListener((f, p, l) => {
            let i: number = f.indexOf(",");
            f = f.substring(0, i);
            this._donotSearch = true;
            this._vishva.selectMesh(f);
        });
        this._itemsDiag.addRefreshHandler(() => {
            this._itemsDiag.close();
            this._updateTreeData();
            this._itemsDiag.refresh(this.treeData);
            this._itemsDiag.open();
            return false;
        });
    }

    public toggle() {
        if (!this._itemsDiag.isOpen()) {
            this.open();
        } else {
            this._itemsDiag.close();
        }
    }

    public open() {
        this._itemsDiag.open();
        if (this._vishva.anyMeshSelected()) {
            this.search(Number(this._vishva.meshSelected.uniqueId).toString() + ",");
        }

    }

    public isOPen(): boolean {
        return this._itemsDiag.isOpen();
    }

    public filter(filter: string) {
        this._itemsDiag.filter(filter);
    }

    /**
     * This search method finds, higlights and scrolls to the item in the list.
     * 
     * Note: This search is not done when an item in the itemlist was selected
     * Explanation: Normally when the user selects an item in the world
     * system checks if the item list is open and if open it calls search
     * to find, higlight and scroll to the item in the list.
     * Selecting an item in the item list results in also selecting 
     * an item in the world which results in a call to this search
     * but now we donot want to highlight or scroll 
     * to the item as the item is already higlighted and in view.
     * 
     * @param filter 
     */
    public search(filter: string) {
        if (this._donotSearch) this._donotSearch = false;
        else this._itemsDiag.search(filter);
    }

    treeData: Array<string | object>;
    private _updateTreeData() {
        this.treeData = new Array();


        let nodes: Array<Node> = this._vishva.scene.rootNodes;
        this._addChildren(nodes, this.treeData);
        // let children: Array<Node>;
        // for (let node of nodes) {
        //     children = node.getChildren();
        //     if (children != null) {
        //         let obj: object = {};
        //         obj["d"] = Number(node.uniqueId).toString() + ", " + node.name;
        //         obj["f"] = new Array<string | object>();
        //         this.treeData.push(obj);
        //         this._addChildren(children, obj["f"]);
        //     } else {
        //         this.treeData.push(Number(node.uniqueId).toString() + ", " + node.name);
        //     }
        // }
    }


    private _addChildren(children: Array<Node>, treeData: Array<string | object>) {
        for (let child of children) {

            if (!(child instanceof TransformNode)) continue;
            //if (!(child instanceof Mesh)) continue;
            if (child == this._vishva.ground || child == this._vishva.avatar || child == this._vishva.skybox) continue;
            if (this._vishva.editControl != null && (child == this._vishva.editControl.getRoot())) continue;

            let childs: Array<Node> = child.getChildren();
            if (childs.length > 0) {
                let obj: object = {};
                obj["d"] = Number(child.uniqueId).toString() + ", " + child.name;
                obj["f"] = new Array<string | object>();
                treeData.push(obj);
                this._addChildren(childs, obj["f"]);
            } else {
                treeData.push(Number(child.uniqueId).toString() + ", " + child.name);
            }
        }
    }

}



