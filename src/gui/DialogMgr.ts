
import { VDiag } from "./components/VDiag";

export class DialogMgr {

    public static vdiags: Array<VDiag> = new Array();
    private static _alertDialog: VDiag;
    private static _alertDiv: HTMLDivElement;

    public static createAlertDiag() {
        if (this._alertDialog == null) {
            this._alertDiv = document.createElement("div");
            this._alertDiv.style.textAlign = "center";
            this._alertDialog = new VDiag(this._alertDiv, "Info", VDiag.center, "", "", "12em");
        }
    }

    public static showAlertDiag(msg: string) {
        if (this._alertDialog == null) DialogMgr.createAlertDiag();
        this._alertDiv.innerHTML = msg;
        this._alertDialog.open();
    }

}



