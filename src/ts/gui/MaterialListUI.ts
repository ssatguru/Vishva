namespace org.ssatguru.babylonjs.vishva.gui {
    import Scene=BABYLON.Scene;
    import Material=BABYLON.Material;
    import MultiMaterial=BABYLON.MultiMaterial;
    /*
     * provides a user interface which list all materials in the scene
     */
    export class MaterialListUI {

        
        private _scene: Scene;
        private _materialsDiag: VTreeDialog;


        constructor(scene: Scene,matHdlr:(mat:Material)=>void) {
            this._scene=scene;
            this._updateTreeData();
            this._materialsDiag=new VTreeDialog(null,"Materials in Scene",DialogMgr.center,this.treeData);
            this._materialsDiag.addTreeListener((f,p,l) => {
                if (!l) return;
                let i: number=f.indexOf(",");
                f=f.substring(0,i);
                let mat;Material;
                if (p.indexOf("MultiMaterial")==0){
                    mat=this._getMutliMaterialById(f);
                }else{
                    mat=this._scene.getMaterialByID(f);
                }
                matHdlr(mat);
            });
            this._materialsDiag.addRefreshHandler(() => {
                this._materialsDiag.close();
                this._updateTreeData();
                this._materialsDiag.refresh(this.treeData);
                this._materialsDiag.open();
                return false;
            });
        }
        
        private _getMutliMaterialById(id:string){
            let mms: Array<MultiMaterial>=this._scene.multiMaterials;
            let _multiMaterial:MultiMaterial=null;
            for (let mm of mms){
                if (mm.id == id){
                    _multiMaterial=mm;
                    break;
                }
            }
            return _multiMaterial;
        }

        public toggle() {
            if(!this._materialsDiag.isOpen()) {
                this._materialsDiag.open();
            } else {
                this._materialsDiag.close();
            }
        }

        treeData: Array<string|object>;


        private _updateTreeData() {
            this.treeData=new Array();
            let mats: Array<Material>=this._scene.materials;
            for(let mat of mats) {
                this.treeData.push(mat.id+", "+mat.name);
            }
            
            let multiMats: Array<MultiMaterial>=this._scene.multiMaterials;
            let obj: object={};
            obj["d"]="MultiMaterial";
            let mmIds:Array<string> = new Array<string>();
            for (let multiMat of multiMats){
                mmIds.push(multiMat.id+","+multiMat.name);
            }
            obj["f"]=mmIds;
            this.treeData.push(obj);
        }

        //recursively adds children to the array
        private _addChildren(children: Array<Material>,treeData: Array<string|object>) {
            for(let child of children) {
                if(child instanceof BABYLON.MultiMaterial) {
                    let childs: Array<Material>=child.subMaterials;
                    let obj: object={};
                    obj["d"]=child.id +", "+child.name;
                    obj["f"]=new Array<string|object>();
                    treeData.push(obj);
                    this._addChildren(childs,obj["f"]);

                } else {
                    treeData.push(child.id+", "+child.name);
                }
            }



        }
    }


}