/// <reference path="VDialog.ts"/>
namespace org.ssatguru.babylonjs.vishva.gui {
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;

    export class DialogMgr {

        public static dialogs:Array<VDialog>= new Array();
        
         public static center: JQueryPositionOptions={
            at: "center center",
            my: "center center",
            of: window
        };
        
        public static centerBottom: JQueryPositionOptions={
            at: "center bottom",
            my: "center bottom",
            of: window
        };

        public static leftCenter: JQueryPositionOptions={
            at: "left center",
            my: "left center",
            of: window
        };

        public static rightCenter: JQueryPositionOptions={
            at: "right center",
            my: "right center",
            of: window
        };
        public static rightTop: JQueryPositionOptions={
            at: "right top",
            my: "right top",
            of: window
        };
        
        private static _alertDialog: VDialog;
        private static _alertDiv: HTMLElement= document.getElementById("alertDiv");;
        
        public static createAlertDiag(){
            if (this._alertDialog ==null)
            this._alertDialog=new VDialog("alertDiv","Info",DialogMgr.center,"","",200);
        }
        public static showAlertDiag(msg: string) {
            this._alertDiv.innerHTML="<h3>"+msg+"</h3>";
            this._alertDialog.open();
        }

    }
}


