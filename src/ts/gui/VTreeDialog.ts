namespace org.ssatguru.babylonjs.vishva.gui {
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;
    /**
     * Provides a UI to display a tree
     */
    export class VTreeDialog {

        private _vishva: Vishva;
        private _tree: VTree;
        private _treeDiag: VDialog;
        private _refreshBtn: HTMLElement;

        constructor(vishva: Vishva,diagTitle:string,pos:JQueryPositionOptions,treeData: Array<string|object>,filter?:string,openAll?:boolean) {
            this._vishva=vishva;
            
            this._treeDiag=new VDialog("treeDiag",diagTitle,pos,300);
            this._treeDiag.setResizable(true);
            this._tree=new VTree("tree",treeData,filter,openAll);
            
            let fi: HTMLInputElement=<HTMLInputElement>document.getElementById("srchInp");
            let fb: HTMLElement=document.getElementById("srchBtn");
            fb.onclick=()=>{
                this._tree.filter(fi.value.trim());
            }
            
            let e: HTMLElement=document.getElementById("expandAll");
            let c: HTMLElement=document.getElementById("collapseAll");
            
            e.onclick=()=>{
                this._tree.expandAll();
            }
            c.onclick=()=>{
                this._tree.collapseAll();
            }
            
            this._refreshBtn=document.getElementById("treeRefresh");
            
            
        }
        
        public addTreeListener(treeListener: (leaf: string,path: string,isLeaf: boolean) => void=null){
            this._tree.addClickListener(treeListener);
        }
        
        public addRefreshHandler(refreshHandler:()=>{}){
            this._refreshBtn.onclick=refreshHandler;
        }

        public toggle() {
            if(this._treeDiag.isOpen()) {
                this._treeDiag.close();
            } else {
                this._treeDiag.open();
            }
        }
        
        public setModal(b:boolean){
            this._treeDiag.setModal(b);
        }
        
        public open(){
            this._treeDiag.open();
        }
        public isOpen():boolean{
            return this._treeDiag.isOpen();
        }
        public close(){
            this._treeDiag.close();
        }
        public refresh(treeData:Array<string|object>){
            this._tree.refresh(treeData);
        }
        
    }
}