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
import { GuiUtils } from "../GuiUtils";
import { VThemes } from "../components/VTheme";
import { InstancedMesh, Mesh, TransformNode } from "babylonjs";
/**
 * Provides UI to manage an Item(mesh) properties
 */
export class PropsPanelUI {

    private _vishva: Vishva;
    private _vishvaGUI: VishvaGUI;

    private _propsVDiag: VDiag = null;
    private _propsAcc: HTMLElement = null;
    private _activeDtl: HTMLDetailsElement = null;

    //panels;
    private _generalUI: GeneralUI;
    private _parentChildUI: ParentChildUI;
    private _lightUI: LightUI;
    private _animationUI: AnimationUI;
    private _physicsUI: PhysicsUI;
    private _materialUI: MaterialUI;
    private _grndSPSUI: GrndSPSUI;
    private _grndDimUI: GrndDimUI;
    private _node: TransformNode

    constructor(vishva: Vishva, vishvaGUI: VishvaGUI, node: TransformNode) {
        this._vishva = vishva;
        this._vishvaGUI = vishvaGUI;
        this._node = node;

        Vishva.gui.appendChild(ppElement);
        this._propsAcc = document.getElementById("propsAcc");
        document.getElementById("gen").appendChild(genElement);
        document.getElementById("Physics").appendChild(phyElement);
        document.getElementById("Material").appendChild(matElement);
        document.getElementById("Lights").appendChild(lightElement);
        document.getElementById("meshAnimDiag").appendChild(animElement);
        document.getElementById("grndDiv").appendChild(gdElement);
        document.getElementById("grndSPS").appendChild(gsElement);


        //set event handler for each summary tag
        let sms: HTMLCollectionOf<HTMLElement> = ppElement.getElementsByTagName("summary");
        for (let i = 0; i < sms.length; i++) {
            sms.item(i).style.backgroundColor = VThemes.CurrentTheme.lightColors.b;
            sms.item(i).style.margin = "0.2em";
            sms.item(i).onclick = (e) => {
                let dtl: HTMLDetailsElement = <HTMLDetailsElement>(<HTMLElement>e.target).parentElement;
                //note the open and closed state change happens after this click event is handled
                if (!dtl.open) {
                    if (this._activeDtl != null) this._activeDtl.open = false;
                    this._activeDtl = dtl;
                    this.refreshPanel(dtl);
                } else {
                    this._activeDtl = null;
                }
            }

        }


        // stop propagation of all input events.
        // this is to prevent key inputs propagating to canvas
        // and modifying nodes there.
        //TODO DO WE STILL NEED THIS
        let inps: HTMLCollectionOf<HTMLInputElement> = ppElement.getElementsByTagName("input");
        for (let i = 0; i < inps.length; i++) {
            GuiUtils.stopPropagation(inps.item(i));

        }

        //on construction open gen tab
        this._activeDtl = <HTMLDetailsElement>document.getElementById("gen");
        this._activeDtl.open = true;

        this._propsVDiag = new VDiag("propsDiag", "mesh properties", VDiag.rightTop, 0, "auto", UIConst._diagWidthS);
        this._propsVDiag.onOpen(() => {
            if (this._activeDtl != null) this.refreshPanel(this._activeDtl);
            this.refreshingPropsDiag = false;
        });
        this._propsVDiag.onClose(() => {
            if (this._vishvaGUI.resizing) return;
            if (!this.refreshingPropsDiag) {
                if ((this._generalUI != null) && (this._generalUI._snaUI != null) && this._generalUI._snaUI.isOpen()) {
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
    roque


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

            es = this._propsAcc.getElementsByClassName("grnd");
            for (let i = 0; i < es.length; i++) {
                (<HTMLElement>es.item(i)).style.display = "";
            }

        } else {
            //hide all ground related tabs
            es = this._propsAcc.getElementsByClassName("grnd");
            for (let i = 0; i < es.length; i++) {
                (<HTMLElement>es.item(i)).style.display = "none";
            }

            es = this._propsAcc.getElementsByClassName("mesh");
            for (let i = 0; i < es.length; i++) {
                (<HTMLElement>es.item(i)).style.display = "";
            }

        }

        this._propsVDiag.open();
    }

    public isOpen(): boolean {
        return this._propsVDiag.isOpen();
    }

    public close() {
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
        if (this._activeDtl != null && this._activeDtl.id === "gen") this.refreshPropsDiag();
    }


    private refreshPanel(dtl: HTMLDetailsElement) {
        if (dtl == null) return;
        if (dtl.id === "gen") {
            if (this._generalUI == null) this._generalUI = new GeneralUI(this._vishva, this._vishvaGUI);
            this._generalUI.update();
        } else if (dtl.id === "Lights") {
            if (this._lightUI == null) this._lightUI = new LightUI(this._vishva);
            this._lightUI.update();
        } else if (dtl.id === "meshAnimDiag") {
            if (this._animationUI == null) this._animationUI = new AnimationUI(this._vishva);
            this._animationUI.update();
        } else if (dtl.id === "Physics") {
            if (this._physicsUI == null) this._physicsUI = new PhysicsUI(this._vishva);
            this._physicsUI.update()
        } else if (dtl.id === "Material") {
            if (this._materialUI == null) this._materialUI = new MaterialUI(this._vishva);
            this._materialUI.setMesh(this._vishva.meshSelected);
            this._materialUI.update();
        } else if (dtl.id === "grndSPS") {
            if (this._grndSPSUI == null) this._grndSPSUI = new GrndSPSUI(this._vishva);
            //this._grndSPSUI.update();
        } else if (dtl.id === "grndDiv") {
            if (this._grndDimUI == null) this._grndDimUI = new GrndDimUI(this._vishva);
            this._grndDimUI.update();
        }
        //refresh sNaDialog if open
        if (this._generalUI != null && this._generalUI._snaUI != null && this._generalUI._snaUI.isOpen()) {
            this._generalUI._snaUI.close();
            this._generalUI._snaUI.show_sNaDiag();
        }
    }


}


