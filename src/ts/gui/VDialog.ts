namespace org.ssatguru.babylonjs.vishva.gui {

    import DialogOptions=JQueryUI.DialogOptions;
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;
    import DialogButtonOptions=JQueryUI.DialogButtonOptions;

    export class VDialog {

        private _diag: JQuery;
        public jpo: JQueryPositionOptions;
        private _height: number|string=0;
        private _minimized: boolean=false;

        constructor(id: string|HTMLDivElement,title: string,jpo: JQueryPositionOptions,width: string|number=0,height?: string|number,minWidth=0,modal=false) {
            //if(width==null||width=="") width="auto";
            if(height==null||height=="") height="auto";
            this._height=height;

            if(id instanceof HTMLDivElement) {
                this._diag=$(id);
            } else {
                this._diag=$("#"+id);
            }

            var dos: DialogOptions={
                title: title,
                autoOpen: false,
                resizable: false,
                position: jpo,
                height: height,
                closeText: "",
                closeOnEscape: false,
                modal: modal
            };
            this._diag.dialog(dos);
            if(minWidth!=0) {
                this._diag.dialog("option","minWidth",minWidth);
            } 
            if (width!=0) {
               this._diag.dialog("option","width",width);
            }
            this.jpo=jpo;
            DialogMgr.dialogs.push(this);

            //$(".satguru").children(".ui-dialog-titlebar").children(".ui-dialog-title").before("<span id='iconhelp' class='ui-icon ui-icon-circle-minus'></span>");
            //$(".satguru .ui-dialog-titlebar .ui-dialog-title").before("<span id='iconhelp' class='ui-icon ui-icon-circle-minus'></span>");
            //this._diag.parent().children(".ui-dialog-titlebar").children(".ui-dialog-title").before("<span id='iconhelp' class='ui-icon ui-icon-circle-minus'></span>");
            //this._diag.siblings(".ui-dialog-titlebar").children(".ui-dialog-title").before("<span id='minimize' class='ui-icon ui-icon-circle-minus'></span>");
            
            let minimizer: JQuery=$("<span id='vdMinimizer' class='ui-icon ui-icon-circle-minus'></span>");
            let titleBar:JQuery=this._diag.parent().children(".ui-dialog-titlebar").children(".ui-dialog-title");
            titleBar.before(minimizer);
            minimizer.click(() => {
                if(this._minimized) this.maximize();
                else this.minimize();
            }
            );
            titleBar.dblclick(() => {this.close()});
            
        }

        public onClose(f: (e: Event,ui: object) => void) {
            this._diag.on("dialogclose",f);
        }

        public setModal(b: boolean) {
            this._diag.dialog("option","modal",b);
        }

        public setResizable(b: boolean) {
            this._diag.dialog("option","resizable",b);
        }


        public open() {
            this._minimized=false;
            this._diag.dialog("open");
        }

        public close() {
            this._minimized=true;
            this._diag.dialog("close");
        }

        public minimize() {
            this._minimized=true;
            this._diag.dialog("option","height",0)
            this._diag.hide();
            
        }

        public maximize() {
            this._minimized=false;
            this._diag.dialog("option","height",this._height)
            this._diag.show();
            
        }

        public isOpen(): boolean {
            return this._diag.dialog("isOpen");
        }

        public toggle() {
            if(this.isOpen()) {
                this.close();
            } else {
                this.open();
            }
        }

        public position() {
            this._diag.dialog("option","position",this.jpo);
        }

        public setButtons(dbos: DialogButtonOptions) {
            this._diag.dialog("option","buttons",dbos);
        }
    }
}
