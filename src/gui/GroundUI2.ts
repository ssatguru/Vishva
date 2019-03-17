import DialogOptions = JQueryUI.DialogOptions;
import Skeleton = BABYLON.Skeleton;
import AnimationRange = BABYLON.AnimationRange;
import Vector3 = BABYLON.Vector3;
import { Vishva } from "../Vishva";
import { VishvaGUI } from "./VishvaGUI";
import { DialogMgr } from "./DialogMgr";
import { GeneralUI } from "./GeneralUI";
import { LightUI } from "./LightUI";
import { MaterialUI } from "./MaterialUI";
/**
 * Provides UI to manage an Item(mesh) properties
 */
export class GroundUI2 {

    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;
    //private _snaUI:SnaUI;

    private _grndDiag: JQuery = null;
    private _fixingDragIssue: boolean = false;
    private _activePanel: number = -1;


    constructor(vishva: Vishva, vishvaGUI: VishvaGUI) {
        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;

        let propsAcc: JQuery = $("#grndAcc");

        propsAcc.accordion({
            animate: 100,
            heightStyle: "content",
            collapsible: true,
            activate: () => {
                this._activePanel = propsAcc.accordion("option", "active");
            },
            beforeActivate: (e, ui) => {
                this.refreshPanel(this.getPanelIndex(ui.newHeader));

            }
        });

        //property dialog box
        this._grndDiag = $("#grndDiag");
        var dos: DialogOptions = {
            autoOpen: false,
            resizable: false,
            position: DialogMgr.leftCenter,
            minWidth: 420,
            width: 420,
            // height: "auto",
            height: 650,
            closeOnEscape: false,
            //a) on open set the values of the fields in the active panel.
            //b) also if we switched from another mesh vishav will close open
            //by calling refreshPropsDiag()
            //c) donot bother refreshing values if we are just restarting
            //dialog for height and width re-sizing after drag
            open: (e, ui) => {
                if (!this._fixingDragIssue) {
                    // refresh the active tab
                    this._activePanel = propsAcc.accordion("option", "active");
                    this.refreshPanel(this._activePanel);
                } else {
                    this._fixingDragIssue = false;
                }
            },
            closeText: "",
            close: () => {
                if (this._vishvaGUI.resizing) return;
                if (!this._fixingDragIssue) {
                    if ((this._materialUI != null) && (this._materialUI._textureUI != null) && this._materialUI._textureUI.isOpen()) {
                        this._materialUI._textureUI.close();
                    }
                }
            },
            //after drag the dialog box doesnot resize
            //force resize by closing and opening
            dragStop: (e, ui) => {
                this._fixingDragIssue = true;
                this._grndDiag.dialog("close");
                this._grndDiag.dialog("open");
            }
        };
        this._grndDiag.dialog(dos);
        this._grndDiag["jpo"] = DialogMgr.leftCenter;
        this._vishvaGUI.dialogs.push(this._grndDiag);
    }

    public open() {
        this._grndDiag.dialog("open");
    }
    public isOpen(): boolean {
        return this._grndDiag.dialog("isOpen");
    }
    public close() {
        this._grndDiag.dialog("close");
    }


    public toggle() {
        console.log("toggling");
        if (this.isOpen()) this.close();
        else this.open();
    }


    private getPanelIndex(ui: JQuery): number {
        if (ui.text() == "General") return grndPanel.General;
        if (ui.text() == "Material") return grndPanel.Material;
        if (ui.text() == "SPS") return grndPanel.SPS;

    }

    private _generalUI: GeneralUI;
    private _SPSUI: LightUI;
    private _materialUI: MaterialUI;
    private refreshPanel(panelIndex: number) {
        if (panelIndex === grndPanel.General) {
            if (this._generalUI == null) this._generalUI = new GeneralUI(this._vishva, this._vishvaGUI);
            this._generalUI.update();
        } else if (panelIndex === grndPanel.SPS) {
            if (this._SPSUI == null) this._SPSUI = new LightUI(this._vishva);
            this._SPSUI.update();
        } else if (panelIndex === grndPanel.Material) {
            if (this._materialUI == null) this._materialUI = new MaterialUI(this._vishva);
            this._materialUI.update();
        }
        //refresh sNaDialog if open
        if (this._generalUI._snaUI != null && this._generalUI._snaUI.isOpen()) {
            this._generalUI._snaUI.close();
            this._generalUI._snaUI.show_sNaDiag();
        }
    }
}
const enum grndPanel {
    General,
    Material,
    SPS
}



