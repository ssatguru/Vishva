
import DialogButtonOptions = JQueryUI.DialogButtonOptions;
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
    private _camCol: JQuery;
    private _autoEditMenu: JQuery;
    private _showToolTips: JQuery;
    public enableToolTips: boolean = true;
    private _showInvis: JQuery;
    private _showDisa: JQuery;
    private _snapper: JQuery;

    //TODO pass property dialog instead of VishvaGUI
    constructor(vishvaGUI: VishvaGUI) {
        this._vishva = Vishva.vishva;
        this._vishvaGUI = vishvaGUI;
        this.enableToolTips = vishvaGUI.guiSettings.enableToolTips;

        let div = document.createElement("div");
        Vishva.gui.appendChild(div);
        div.innerHTML = settingHTML;


        let dboSave: HTMLButtonElement = VButton.create("save", "save");
        dboSave.style.marginRight = "1em";
        dboSave.style.marginTop = "1em";
        dboSave.onclick = (e) => {

            this._vishva.enableCameraCollision(this._camCol.prop("checked"));

            this._vishva.enableAutoEditMenu(this._autoEditMenu.prop("checked"));

            this._vishvaGUI.guiSettings.enableToolTips = this._showToolTips.prop("checked");


            if (this._showInvis.prop("checked")) {
                this._vishva.showAllInvisibles();
            } else {
                this._vishva.hideAllInvisibles();
            }
            if (this._showDisa.prop("checked")) {
                this._vishva.showAllDisabled();
            } else {
                this._vishva.hideAllDisabled()
            }

            let err: string = this._vishva.snapper(this._snapper.prop("checked"));
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
        dboCancel.style.marginTop = "1em";
        dboCancel.onclick = (e) => {
            this._settingDiag.close();
            return true;
        }
        div.appendChild(dboSave);
        div.appendChild(dboCancel);

        this._camCol = $("#camCol");
        this._autoEditMenu = $("#autoEditMenu");
        this._showToolTips = $("#showToolTips");
        this._showInvis = $("#showInvis");
        this._showDisa = $("#showDisa");
        this._snapper = $("#snapper");

        this._updateSettings();

        this._settingDiag = new VDiag(div, "Settings", VDiag.center, "", "", "24em");
    }

    private _updateSettings() {

        this._camCol.prop("checked", this._vishva.isCameraCollisionOn());

        this._autoEditMenu.prop("checked", this._vishva.isAutoEditMenuOn());

        this._showToolTips.prop("checked", this.enableToolTips);
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
