namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    /*
     * provides a user interface which list all meshes in the scene
     */
    export class ItemListUI {

        private _vishva: Vishva;
        private _itemsDiag: VTreeDialog;


        constructor(vishva: Vishva) {

            this._vishva=vishva;


            this._updateTreeData();

            this._itemsDiag=new VTreeDialog(this._vishva,"Items in Scene",DialogMgr.leftCenter,this.treeData);
            this._itemsDiag.addTreeListener((f,p,l) => {
                let i: number=f.indexOf(",");
                f=f.substring(0,i);
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
            if(!this._itemsDiag.isOpen()) {
                this._itemsDiag.open();
            } else {
                this._itemsDiag.close();
            }
        }

        treeData: Array<string|object>;
        private _updateTreeData() {
            this.treeData=new Array();

            let items: Array<AbstractMesh>=this._vishva.getMeshList();
            this._updateMeshChildMap(items);
            let childs: Array<AbstractMesh>;
            for(let item of items) {
                if(item.parent==null) {
                    childs=this.meshChildMap[item.uniqueId];
                    if(childs!=null) {
                        let obj: object={};
                        obj["d"]=Number(item.uniqueId).toString()+", "+item.name;
                        obj["f"]=new Array<string|object>();
                        this.treeData.push(obj);
                        this._addChildren(childs,obj["f"]);
                    } else {
                        this.treeData.push(Number(item.uniqueId).toString()+", "+item.name);
                    }
                }
            }
        }

        private _addChildren(children: Array<AbstractMesh>,treeData: Array<string|object>) {
            for(let child of children) {
                let childs: Array<AbstractMesh>=this.meshChildMap[child.uniqueId];
                if(childs!=null) {
                    let obj: object={};
                    obj["d"]=Number(child.parent.uniqueId).toString()+", "+child.parent.name;
                    obj["f"]=new Array<string|object>();
                    treeData.push(obj);
                    this._addChildren(childs,obj["f"]);
                } else {
                    treeData.push(Number(child.uniqueId).toString()+", "+child.name);
                }
            }
        }

        meshChildMap: any;
        private _updateMeshChildMap(meshes: Array<AbstractMesh>) {
            this.meshChildMap={};
            for(let mesh of meshes) {
                if(mesh.parent!=null) {
                    let childs: Array<AbstractMesh>=this.meshChildMap[mesh.parent.uniqueId];
                    if(childs==null) {
                        childs=new Array();
                        this.meshChildMap[mesh.parent.uniqueId]=childs;
                    }
                    childs.push(mesh);
                }
            }
        }

    }
}


