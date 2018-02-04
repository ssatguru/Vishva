namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    /**
     * Provides a UI to add item to the world
     */
    export class AddItemUI2 {

        private _vishva: Vishva;
        private _assetDiag:VTree;

        constructor(vishva: Vishva) {
            this._vishva=vishva;
            if (this._assetDiag==null){
                this._assetDiag=new VTree("addItemsDiv2","assetList",this._vishva.vishvaFiles,"\.babylon$|\.glb$");
                this._assetDiag.addClickListener((f,p)=> {return this.loadAsset(f,p);});
            }
        }
        
        private loadAsset(file:string,path:string){
            console.log(path + file);
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