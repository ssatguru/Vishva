/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
namespace org.ssatguru.babylonjs.vishva.gui {
    import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;

    export class DialogMgr {

        public static dialogs:Array<VDialog>= new Array();
        
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
        };;


    }
}


