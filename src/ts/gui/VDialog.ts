namespace org.ssatguru.babylonjs.vishva.gui{
    
    import DialogOptions=JQueryUI.DialogOptions;
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;
    import DialogButtonOptions=JQueryUI.DialogButtonOptions;
    
    export class VDialog{
        
        private _diag:JQuery;
        public jpo:JQueryPositionOptions;
        
        constructor(id: string|HTMLDivElement,title:string,jpo:JQueryPositionOptions,width?:string|number,height?:string|number,minWidth=0){
            if (width==null  || width=="") width="auto";
            if (height==null || height=="") height="auto";
            
            if (id instanceof HTMLDivElement){
                this._diag = $(id);
            }else{
                this._diag = $("#" +id);
            }
            
            var dos: DialogOptions={
                title:title,
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
        
        public onClose(f:(e:Event,ui:object)=>void){
            this._diag.on("dialogclose",f);
        }
        
        public setModal(b:boolean){
            this._diag.dialog("option","modal",b);
        }
        
        public setResizable(b:boolean){
            this._diag.dialog("option","resizable",b);
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
