import { Vishva } from "../../Vishva";
import { VishvaGUI } from "../VishvaGUI";
import { GeneralUI } from "./GeneralUI";
import { AnimationUI } from "./AnimationUI";
import { GrndDimUI } from "./GrndDimUI";
import { GrndSPSUI } from "./GrndSPSUI";
import { LightUI } from "./LightUI";
import { PhysicsUI } from "./PhysicsUI";
import { MaterialUI } from "./MaterialUI";
import { ParentChildUI } from "./ParentChildUI";
import { ppElement } from "./PropsPanelML";
import { genElement } from "./GeneralML";
import { phyElement } from "./PhysicsML";
import { matElement } from "./MaterialML";
import { lightElement } from "./LightsML";
import { animElement } from "./AnimationML";
import { gdElement } from "./GrndDimML";
import { gsElement } from "./GrndSPSML";
import { UIConst } from "../UIConst";
import { VDiag } from "../components/VDiag";
/**
 * Provides UI to manage an Item(mesh) properties
 */
export class PropsPanelUI {

    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;
    //private _snaUI:SnaUI;

    //private _propsDiag: JQuery=null;
    private _propsVDiag: VDiag = null;
    private _propsAcc: HTMLElement = null;
    private _fixingDragIssue: boolean = false;
    private _activePanel: number = -1;

    //panels;
    private _generalUI: GeneralUI;
    private _parentChildUI: ParentChildUI;
    private _lightUI: LightUI;
    private _animationUI: AnimationUI;
    private _physicsUI: PhysicsUI;
    private _materialUI: MaterialUI;
    private _grndSPSUI: GrndSPSUI;
    private _grndDimUI: GrndDimUI;

    constructor(vishva: Vishva, vishvaGUI: VishvaGUI) {
        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;

        //document.body.appendChild(ppElement);
        Vishva.gui.appendChild(ppElement);
        this._propsAcc = document.getElementById("propsAcc");
        document.getElementById("gen").appendChild(genElement);
        document.getElementById("Physics").appendChild(phyElement);
        document.getElementById("Material").appendChild(matElement);
        document.getElementById("Lights").appendChild(lightElement);
        document.getElementById("meshAnimDiag").appendChild(animElement);
        document.getElementById("grndDiv").appendChild(gdElement);
        document.getElementById("grndSPS").appendChild(gsElement);

        let propsAcc: JQuery = $(this._propsAcc);

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

        this._propsVDiag = new VDiag("propsDiag", "mesh properties", VDiag.rightTop, 0, "auto", UIConst._diagWidthS);
        this._propsVDiag.onOpen(() => {
            this._activePanel = propsAcc.accordion("option", "active");
            this.refreshPanel(this._activePanel);
            this.refreshingPropsDiag = false;
        });
        this._propsVDiag.onClose(() => {
            if (this._vishvaGUI.resizing) return;
            if (!this.refreshingPropsDiag) {
                if ((this._generalUI._snaUI != null) && this._generalUI._snaUI.isOpen()) {
                    this._generalUI._snaUI.close();
                }
                if ((this._materialUI != null) && (this._materialUI._textureUI != null) && this._materialUI._textureUI.isOpen()) {
                    this._materialUI._textureUI.close();
                }
                if (this._vishva.isGroundPicked()) {
                    this._vishva.unSelectGrnd();
                }
            }
        });


    }

    //        constructor_old(vishva: Vishva,vishvaGUI: VishvaGUI) {
    //            this._vishva=vishva;
    //            this._vishvaGUI=vishvaGUI;
    //
    //
    //            this._propsAcc=document.getElementById("propsAcc");
    //            let propsAcc: JQuery=$(this._propsAcc);
    //
    //            propsAcc.accordion({
    //                animate: 100,
    //                heightStyle: "content",
    //                collapsible: true,
    //                activate: () => {
    //                    this._activePanel=propsAcc.accordion("option","active");
    //                },
    //                beforeActivate: (e,ui) => {
    //                    this.refreshPanel(this.getPanelIndex(ui.newHeader));
    //
    //                }
    //            });
    //
    //            //propsAcc.accordion().children('h3:eq(4), div:eq(4)').hide();
    //
    //            //property dialog box
    //            this._propsDiag=$("#propsDiag");
    //            var dos: DialogOptions={
    //                autoOpen: false,
    //                //if resizable is set then height doesnot adjust automatically
    //                resizable: false,
    //                position: DialogMgr.leftCenter,
    //                minWidth: 420,
    //                //width: 420,
    //                height: "auto",
    //                //height: 650,
    //                closeOnEscape: false,
    //                //a) on open set the values of the fields in the active panel.
    //                //   also if we switched from another mesh vishav will close open
    //                //   by calling refreshPropsDiag().
    //                //b) donot bother refreshing values if we are just restarting
    //                //   dialog for height and width re-sizing after drag.
    //                open: (e,ui) => {
    //                    if(!this._fixingDragIssue) {
    //                        // refresh the active tab
    //                        this._activePanel=propsAcc.accordion("option","active");
    //                        this.refreshPanel(this._activePanel);
    //                        this.refreshingPropsDiag=false;
    //                    } else {
    //                        this._fixingDragIssue=false;
    //                    }
    //                },
    //                closeText: "",
    //                close: () => {
    //                    if(this._vishvaGUI.resizing) return;
    //                    if(!this._fixingDragIssue&&!this.refreshingPropsDiag) {
    //                        if((this._generalUI._snaUI!=null)&&this._generalUI._snaUI.isOpen()) {
    //                            this._generalUI._snaUI.close();
    //                        }
    //                        if((this._materialUI!=null)&&(this._materialUI._textureUI!=null)&&this._materialUI._textureUI.isOpen()) {
    //                            this._materialUI._textureUI.close();
    //                        }
    //                        if(this._vishva.isGroundPicked()) {
    //                            this._vishva.unSelectGrnd();
    //                        }
    //                    }
    //                },
    //                //after drag the dialog box doesnot resize
    //                //force resize by closing and opening
    //                dragStop: (e,ui) => {
    //                    this._fixingDragIssue=true;
    //                    this._propsDiag.dialog("close");
    //                    this._propsDiag.dialog("open");
    //                }
    //            };
    //            this._propsDiag.dialog(dos);
    //            this._propsDiag["jpo"]=DialogMgr.leftCenter;
    //            this._vishvaGUI.dialogs.push(this._propsDiag);
    //        }

    public open() {
        let es: HTMLCollectionOf<Element>

        //if ground selected show only ground related tabs or those common to both mesh and ground
        //those common to both mesh and ground will not have a "grnd" or "mesh" class
        if (this._vishva.isGroundPicked()) {

            //hide all non ground related tabs
            es = this._propsAcc.getElementsByClassName("mesh");
            for (let i = 0; i < es.length; i++) {
                (<HTMLElement>es.item(i)).style.display = "none";
            }
            //                es=document.getElementsByCla                ssName("grnd");
            //                                
            //                for(let i=0;i<e                s.length;i++) {
            //                    if(es.item(i)                .tagName=="H3")
            //                        (<HTMLElement>es.item(i)).style.d                isplay="block";
            //                    //TODO : if panel is active th                en open div too
            //                }

            //display all ground related tabs
            es = this._propsAcc.getElementsByTagName("h3");
            console.log("in grnd - h3 found " + es.length);
            for (let i = 0; i < es.length; i++) {
                if (es.item(i).className.indexOf("grnd") >= 0) {
                    (<HTMLElement>es.item(i)).style.display = "block";
                    if (this._activePanel == i) {
                        (<HTMLElement>es.item(i).nextElementSibling).style.display = "block";
                    }
                }
            }
        } else {
            //hide all ground related tabs
            es = this._propsAcc.getElementsByClassName("grnd");
            for (let i = 0; i < es.length; i++) {
                (<HTMLElement>es.item(i)).style.display = "none";
            }
            //                es=document.getElementsByCla                ssName("mesh");
            //                for(let i=0;i<e                s.length;i++) {
            //                    if(es.item(i)                .tagName=="H3")
            //                        (<HTMLElement>es.item(i)).style.d                isplay="block";
            //                }

            //display all mesh related tabs
            es = this._propsAcc.getElementsByTagName("h3");
            for (let i = 0; i < es.length; i++) {
                if (es.item(i).className.indexOf("mesh") >= 0) {
                    (<HTMLElement>es.item(i)).style.display = "block";
                    if (this._activePanel == i) {
                        (<HTMLElement>es.item(i).nextElementSibling).style.display = "block";
                    }
                }
            }
        }
        //this._propsDiag.dialog("open");
        this._propsVDiag.open();
    }

    public isOpen(): boolean {
        //return this._propsDiag.dialog("isOpen");
        return this._propsVDiag.isOpen();
    }

    public close() {
        //this._propsDiag.dialog("close");
        this._propsVDiag.close();
    }

    /*
     * called by vishva when editcontrol
     * is switched from another mesh
     */
    refreshingPropsDiag: boolean = false;
    public refreshPropsDiag() {
        if ((this._propsVDiag === undefined) || (this._propsVDiag === null)) return;
        if (this._propsVDiag.isOpen()) {
            this.refreshingPropsDiag = true;
            this.close();
            this.open();
        }
    }
    //only refresh if general panel is active;
    public refreshGeneralPanel() {
        if (this._activePanel === propertyPanel.General) this.refreshPropsDiag();
    }

    private getPanelIndex(ui: JQuery): number {
        if (ui.text() == "General") return propertyPanel.General;
        // if (ui.text() == "Parent Child") return propertyPanel.ParentChild;
        if (ui.text() == "Ground Dimensions") return propertyPanel.GrndDim;
        if (ui.text() == "Physics") return propertyPanel.Physics;
        if (ui.text() == "Material") return propertyPanel.Material;
        if (ui.text() == "Lights") return propertyPanel.Lights;
        if (ui.text() == "Animations") return propertyPanel.Animations;
        if (ui.text() == "Ground SPS") return propertyPanel.GrndSPS;
    }


    private refreshPanel(panelIndex: number) {
        if (panelIndex === propertyPanel.General) {
            if (this._generalUI == null) this._generalUI = new GeneralUI(this._vishva, this._vishvaGUI);
            this._generalUI.update();
        } else if (panelIndex === propertyPanel.Lights) {
            if (this._lightUI == null) this._lightUI = new LightUI(this._vishva);
            this._lightUI.update();
        } else if (panelIndex === propertyPanel.Animations) {
            if (this._animationUI == null) this._animationUI = new AnimationUI(this._vishva);
            this._animationUI.update();
        } else if (panelIndex === propertyPanel.Physics) {
            if (this._physicsUI == null) this._physicsUI = new PhysicsUI(this._vishva);
            this._physicsUI.update()
        } else if (panelIndex === propertyPanel.Material) {
            if (this._materialUI == null) this._materialUI = new MaterialUI(this._vishva);
            this._materialUI.update();
        } else if (panelIndex === propertyPanel.GrndSPS) {
            if (this._grndSPSUI == null) this._grndSPSUI = new GrndSPSUI(this._vishva);
            //this._grndSPSUI.update();
        } else if (panelIndex === propertyPanel.GrndDim) {
            if (this._grndDimUI == null) this._grndDimUI = new GrndDimUI(this._vishva);
            this._grndDimUI.update();
        }
        //refresh sNaDialog if open
        if (this._generalUI._snaUI != null && this._generalUI._snaUI.isOpen()) {
            this._generalUI._snaUI.close();
            this._generalUI._snaUI.show_sNaDiag();
        }
    }
}
const enum propertyPanel {
    General,
    GrndDim,
    Physics,
    Material,
    Lights,
    Animations,
    GrndSPS
}

