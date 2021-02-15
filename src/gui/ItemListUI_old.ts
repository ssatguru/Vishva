
import { AbstractMesh } from "babylonjs";
import { Vishva } from "../Vishva";
import { VTreeDialog } from "./components/VTreeDialog";
import { VDiag } from "./components/VDiag";
/*
 * provides a user interface which list all meshes in the scene
 */
export class ItemListUI_old {

    private _vishva: Vishva;
    private _itemsDiag: VTreeDialog;


    constructor(vishva: Vishva) {

        this._vishva = vishva;


        this._updateTreeData();

        this._itemsDiag = new VTreeDialog(this._vishva, "Items in Scene", VDiag.leftCenter, this.treeData);
        this._itemsDiag.addTreeListener((f, p, l) => {
            let i: number = f.indexOf(",");
            f = f.substring(0, i);
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
            this._itemsDiag.open();
        } else {
            this._itemsDiag.close();
        }
    }

    treeData: Array<string | object>;
    private _updateTreeData() {
        this.treeData = new Array();

        let items: Array<AbstractMesh> = this._vishva.getMeshList();
        // let items: Array<Node> = this._vishva.getNodeList();
        console.log(items);
        this._updateMeshChildMap(items);
        let childs: Array<AbstractMesh>;
        // let childs: Array<Node>;
        for (let item of items) {
            if (item.parent == null) {
                childs = this.meshChildMap[item.uniqueId];
                if (childs != null) {
                    let obj: object = {};
                    obj["d"] = Number(item.uniqueId).toString() + ", " + item.name;
                    obj["f"] = new Array<string | object>();
                    this.treeData.push(obj);
                    this._addChildren(childs, obj["f"]);
                } else {
                    this.treeData.push(Number(item.uniqueId).toString() + ", " + item.name);
                }
            }
        }
    }

    private _addChildren(children: Array<AbstractMesh>, treeData: Array<string | object>) {
        // private _addChildren(children: Array<Node>, treeData: Array<string | object>) {
        for (let child of children) {
            let childs: Array<AbstractMesh> = this.meshChildMap[child.uniqueId];
            // let childs: Array<Node> = this.meshChildMap[child.uniqueId];
            if (childs != null) {
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

    /**
     * for each mesh find all its children
     * Thus for each mesh create an array of child mesh
     */
    meshChildMap: any;
    private _updateMeshChildMap(meshes: Array<AbstractMesh>) {
        // private _updateMeshChildMap(meshes: Array<Node>) {
        this.meshChildMap = {};
        for (let mesh of meshes) {
            if (mesh.parent != null) {
                let childs: Array<AbstractMesh> = this.meshChildMap[mesh.parent.uniqueId];
                // let childs: Array<Node> = this.meshChildMap[mesh.parent.uniqueId];
                if (childs == null) {
                    childs = new Array();
                    this.meshChildMap[mesh.parent.uniqueId] = childs;
                }
                childs.push(mesh);
            }
        }
        console.log(this.meshChildMap);
    }

}



