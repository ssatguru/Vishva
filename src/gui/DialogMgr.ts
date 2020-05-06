
import { VDialog } from "./components/VDialog";
import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;

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
    private static _alertDiv: HTMLDivElement;

    public static createAlertDiag() {
        if (this._alertDialog == null) {
            this._alertDiv = document.createElement("div");
            this._alertDiv.style.textAlign = "center";
            this._alertDialog = new VDialog(this._alertDiv, "Info", this.center, "", "", 200);
        }
    }

    public static showAlertDiag(msg: string) {
        this._alertDiv.innerHTML = "<h3>" + msg + "</h3>";
        this._alertDialog.open();
    }

}



