namespace org.ssatguru.babylonjs.vishva.gui{
    
    import DialogOptions=JQueryUI.DialogOptions;
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;
    import DialogButtonOptions=JQueryUI.DialogButtonOptions;
    
    export class VDialog{
        
        private _diag:JQuery;
        public jpo:JQueryPositionOptions;
        
        constructor(id:string,title:string,jpo:JQueryPositionOptions,width?:string|number,height?:string|number,minWidth=0){
            if (width==null  || width=="") width="auto";
            if (height==null || height=="") height="auto";
            
            this._diag = $("#" +id);
            
            var dos: DialogOptions={
                autoOpen: false,
                resizable: false,
                position: jpo,
                height: height,
                closeText: "",
                closeOnEscape: false
            };
            this._diag.dialog(dos);
            if (minWidth!=0){
                this._diag.dialog("option","minWidth",minWidth);
            }else{
                this._diag.dialog("option","width",width);
            }
            this.jpo=jpo;
            DialogMgr.dialogs.push(this);
        }
        
        public open(){
            this._diag.dialog("open");
        }
        
        public close(){
            this._diag.dialog("close");
        }
        
        public isOpen():boolean{
            return this._diag.dialog("isOpen");
        }
        
        public toggle(){
            if (this.isOpen()){
                this.close();
            }else{
                this.open();
            }
        }
        
        public position(){
            this._diag.dialog("option","position",this.jpo);
        }
        
        public setButtons(dbos:DialogButtonOptions){
            this._diag.dialog("option","buttons",dbos);
        }
    }
}
