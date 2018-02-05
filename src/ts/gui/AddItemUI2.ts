namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    /**
     * Provides a UI to add item to the world
     */
    export class AddItemUI2 {

        private _vishva: Vishva;
        private _assetTree: VTree;
        private _assetDiag: VDialog;

        constructor(vishva: Vishva) {
            this._vishva=vishva;
            this._assetTree=new VTree("assetList",this._vishva.vishvaFiles,"\.babylon$|\.glb$");
            this._assetTree.addClickListener((f,p) => {return this.loadAsset(f,p);});
            this._assetDiag=new VDialog("addItemsDiv2","Assets",DialogMgr.leftCenter);
        }

        private loadAsset(file: string,path: string) {
            //console.log(path+file);
            this._vishva.loadAsset2(path,file);
        }

        public toggle() {
            if(this._assetDiag.isOpen()) {
                this._assetDiag.close();
            } else {
                this._assetDiag.open();
            }
        }


    }
}