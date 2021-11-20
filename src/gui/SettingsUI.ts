
import { Vishva } from "../Vishva";
import { VishvaGUI } from "./VishvaGUI";
import { DialogMgr } from "./DialogMgr";
import { settingHTML } from "./SettingsML";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
/**
 * provide ui to manage world/user settings/preferences
 */
export class SettingsUI {
    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;

    private _settingDiag: VDiag;
    private _camCol: HTMLInputElement;
    private _autoEditMenu: HTMLInputElement;
    private _showToolTips: HTMLInputElement;
    public enableToolTips: boolean = true;
    private _showInvis: HTMLInputElement;
    private _showDisa: HTMLInputElement;
    private _snapper: HTMLInputElement;

    //TODO pass property dialog instead of VishvaGUI
    constructor(vishvaGUI: VishvaGUI) {
        this._vishva = Vishva.vishva;
        this._vishvaGUI = vishvaGUI;
        this.enableToolTips = vishvaGUI.guiSettings.enableToolTips;

        let div = document.createElement("div");
        Vishva.gui.appendChild(div);
        div.innerHTML = settingHTML;


        let dboSave: HTMLButtonElement = VButton.create("save", "save");
        dboSave.style.margin = "1em";
        dboSave.onclick = (e) => {

            this._vishva.enableCameraCollision(this._camCol.checked);

            this._vishva.enableAutoEditMenu(this._autoEditMenu.checked);

            this._vishvaGUI.guiSettings.enableToolTips = this._showToolTips.checked;


            if (this._showInvis.checked) {
                this._vishva.showAllInvisibles();
            } else {
                this._vishva.hideAllInvisibles();
            }
            if (this._showDisa.checked) {
                this._vishva.showAllDisabled();
            } else {
                this._vishva.hideAllDisabled()
            }

            let err: string = this._vishva.snapper(this._snapper.checked);
            if (err != null) {
                DialogMgr.showAlertDiag(err);
                return false;
            }

            this._settingDiag.close();
            //DialogMgr.showAlertDiag("Saved");
            //refresh the property dialog in case something changed here

            //TODO pass props dialog 
            this._vishvaGUI.refreshPropsDiag();


            return true;
        };

        let dboCancel: HTMLButtonElement = VButton.create("cancel", "cancel");
        //dboCancel.style.marginTop = "1em";
        dboCancel.style.margin = "1em";
        dboCancel.onclick = (e) => {
            this._settingDiag.close();
            return true;
        }
        div.appendChild(dboSave);
        div.appendChild(dboCancel);

        this._camCol = <HTMLInputElement>document.getElementById("camCol");
        this._autoEditMenu = <HTMLInputElement>document.getElementById("autoEditMenu");
        this._showToolTips = <HTMLInputElement>document.getElementById("showToolTips");
        this._showInvis = <HTMLInputElement>document.getElementById("showInvis");
        this._showDisa = <HTMLInputElement>document.getElementById("showDisa");
        this._snapper = <HTMLInputElement>document.getElementById("snapper");

        this._updateSettings();

        this._settingDiag = new VDiag(div, "Settings", VDiag.center, "", "", "24em");
    }

    private _updateSettings() {

        this._camCol.checked = this._vishva.isCameraCollisionOn();

        this._autoEditMenu.checked = this._vishva.isAutoEditMenuOn();

        this._showToolTips.checked = this.enableToolTips;
    }

    public toggle() {
        if (!this._settingDiag.isOpen()) {
            this._updateSettings();
            this._settingDiag.open();
        } else {
            this._settingDiag.close();
        }
    }

}
