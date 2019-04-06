
import {VDialog} from "./VDialog";
import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;

export class DialogMgr {

    public static dialogs: Array<VDialog> = new Array();

    public static center: JQueryPositionOptions = {
        at: "center center",
        my: "center center",
        //of: window
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static centerBottom: JQueryPositionOptions = {
        at: "center bottom",
        my: "center bottom",
        //of: window
        within: "#vCanvas",
        of: "#vCanvas",
        collision: "fit"
    };

    public static leftCenter: JQueryPositionOptions = {
        at: "left center",
        my: "left center",
        //of: window
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static rightCenter: JQueryPositionOptions = {
        at: "right center",
        my: "right center",
        //of: window
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };
    public static rightTop: JQueryPositionOptions = {
        at: "right top",
        my: "right top",
        //of: window
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    private static _alertDialog: VDialog;
    private static _alertDiv: HTMLElement;

    public static createAlertDiag() {
        if (this._alertDialog == null) {
            this._alertDialog = new VDialog("alertDiv", "Info", this.center, "", "", 200);
            this._alertDiv = document.getElementById("alertDiv");
        }
    }
    
    public static showAlertDiag(msg: string) {
        this._alertDiv.innerHTML = "<h3>" + msg + "</h3>";
        this._alertDialog.open();
    }

}



