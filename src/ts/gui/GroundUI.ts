namespace org.ssatguru.babylonjs.vishva.gui {
    export class GroundUI{
        private _vishva:Vishva;
        private _grndDiag:VDialog;
        
        
        constructor(vishva:Vishva){
            this._vishva=vishva;
            this._grndDiag=new VDialog("grndDiv","Manage Ground",DialogMgr.center,"","",350);
        }
        
        public open(){
            this._grndDiag.open();
        }
        public isOpen():boolean{
            return this._grndDiag.isOpen();
        }
        public close(){
            this._grndDiag.close();
        }
        public toggle(){
            this._grndDiag.toggle();
        }
        
        
    }
}