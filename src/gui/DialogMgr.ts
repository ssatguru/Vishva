
import { VDialog } from "./components/VDialog";
import { UIConst } from "./UIConst";
import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;

export class DialogMgr {

    public static dialogs: Array<VDialog> = new Array();

    public static center: JQueryPositionOptions = {
        my: "center center",
        at: "center center",
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static centerBottom: JQueryPositionOptions = {
        my: "center bottom",
        at: "center bottom",
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static leftTop1: JQueryPositionOptions = {
        my: "left top",
        at: "left top+" + UIConst._buttonHeight,
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static leftTop2: JQueryPositionOptions = {
        my: "left top",
        at: "left+" + UIConst._diagWidth + " top+" + UIConst._buttonHeight,
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static leftBottom: JQueryPositionOptions = {
        my: "left bottom",
        at: "left bottom",
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static rightBottom: JQueryPositionOptions = {
        my: "right bottom",
        at: "right bottom",
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static leftCenter: JQueryPositionOptions = {
        my: "left center",
        at: "left center",
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };

    public static rightCenter: JQueryPositionOptions = {
        my: "right center",
        at: "right center",
        of: "#vCanvas",
        within: "#vCanvas",
        collision: "fit"
    };
    public static rightTop: JQueryPositionOptions = {
        my: "right top",
        at: "right top",
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



