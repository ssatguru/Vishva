import { Vector2 } from "babylonjs";
import { Vishva } from "../../Vishva";
import { GrndSpread, SpreadDtl } from "../../GrndSpread";
import { VInputNumber } from "../components/VInputNumber";
import { VInputVector2 } from "../components/VInputVector2";
import { VInputVector3 } from "../components/VInputVector3";
import { VRange } from "../components/VRange";
import { DialogMgr } from "../DialogMgr";
import { VInputSelect } from "../components/VInputSelect";
/**
 * Provides a UI to manage GroundSPS
 */
export class GrndSPSUI {

    private _vishva: Vishva;
    private _grndSPS: GrndSpread;
    private _ready: boolean = false;

    private _spsList: VInputSelect;
    private _spsName: HTMLElement;
    private _spsMesh: HTMLElement;
    private _spsSeed: VInputNumber;
    private spsStep: VInputNumber;
    private sprdCon1: VInputVector2;
    private sprdCon2: VInputVector2;
    private posMin: VInputVector3;
    private posMax: VInputVector3;
    private sclMin: VInputVector3;
    private sclMax: VInputVector3;
    private rotMin: VInputVector3;
    private rotMax: VInputVector3;
    private posRange: VRange;
    private sclRange: VRange;
    private rotRange: VRange;



    constructor(vishva: Vishva) {
        this._vishva = vishva;

        let genSPSParms: HTMLElement = document.getElementById("genSPSParms");
        genSPSParms.onclick = () => {
            if (this._updateUI()) {
                this._ready = true;
            } else {
                this._ready = false;
            };
            genSPS.disabled = !this._ready;
        }
        let genSPS: HTMLButtonElement = <HTMLButtonElement>document.getElementById("genSPS");
        genSPS.disabled = this._ready;
        genSPS.onclick = () => {
            //get the parms from UI and then generate 
            if (this._updateSpreadParms()) {
                this._ready = true;
            } else {
                this._ready = false;
            };
            genSPS.disabled = !this._ready;
        }



        this._spsName = document.getElementById("spsName");
        this._spsMesh = document.getElementById("spsMesh");
        this._spsSeed = new VInputNumber("spsSeed");
        this.spsStep = new VInputNumber("spsStep");
        this.sprdCon1 = new VInputVector2("sprdCon1");
        this.sprdCon2 = new VInputVector2("sprdCon2");
        this.posMin = new VInputVector3("posMin");
        this.posMax = new VInputVector3("posMax");
        this.sclMin = new VInputVector3("sclMin");
        this.sclMax = new VInputVector3("sclMax");
        this.rotMin = new VInputVector3("rotMin");
        this.rotMax = new VInputVector3("rotMax");
        this.posRange = new VRange("posRange", 0, 1, 0.1, 0.5);
        this.sclRange = new VRange("sclRange", 0, 1, 0.1, 0.5);
        this.rotRange = new VRange("rotRange", 0, 180, 1, 5);


        let sl = this._vishva.getGrndSPSList();
        sl.push({ id: "new", desc: "generate new one" });
        this._spsList = new VInputSelect("spsList", sl);
        this._spsList.onSelect = (id: string) => {
            console.log("sps selected " + id);
            this._updateUI(id);
        }
        if (sl.length == 1) {
            this._updateUI(sl[0].id);
        }
    }


    //updates UI from SPS
    private _updateUI(gSPSid?: string): boolean {
        let sdo: SpreadDtl;
        if (gSPSid) {
            let gs: GrndSpread;
            gs = this._vishva.getGrndSPSbyID(gSPSid);
            if (gs == null) {
                DialogMgr.showAlertDiag("could not find gound sps with id : " + gSPSid);
                return;
            }
            sdo = gs.getSpreadDtls();
            this._grndSPS = gs;
        } else {
            let gs: GrndSpread | string = this._vishva.createGrndSPS();
            if (!(gs instanceof Object)) {
                DialogMgr.showAlertDiag(gs);
                return false;
            } else {
                sdo = (<GrndSpread>gs).getSpreadDtls();
                this._grndSPS = <GrndSpread>gs;
            }
        }
        this._spsName.innerText = this._grndSPS.name + "(" + this._grndSPS.id + ")";
        this._spsMesh.innerText = this._grndSPS.mesh.name + "(" + this._grndSPS.mesh.id + ")";
        this._spsSeed.setValue(sdo.seed);
        this.spsStep.setValue(sdo.step);
        this.sprdCon1.setValue(sdo.sprdCon1);
        this.sprdCon2.setValue(sdo.sprdCon2);
        this.posMin.setValue(sdo.posMin);
        this.posMax.setValue(sdo.posMax);
        this.sclMin.setValue(sdo.sclMin);
        this.sclMax.setValue(sdo.sclMax);
        this.rotMin.setValue(sdo.rotMin.scale(180 / Math.PI));
        this.rotMax.setValue(sdo.rotMax.scale(180 / Math.PI));
        this.posRange.setValue(sdo.posRange);
        this.sclRange.setValue(sdo.sclRange);
        this.rotRange.setValue(sdo.rotRange * 180 / Math.PI);
        return true;
    }

    //update spread details from UI and generate spread
    private _updateSpreadParms(): boolean {
        let smax: Vector2 = this.sprdCon2.getValue();
        let smin: Vector2 = this.sprdCon1.getValue();
        if (smax.x == smin.x) {
            DialogMgr.showAlertDiag("corners x co-ordinates cannot be the same");
            return false;
        }
        if (smax.y == smin.y) {
            DialogMgr.showAlertDiag("corners y co-ordinates cannot be the same");
            return false;
        }
        let sdo: SpreadDtl = this._grndSPS.getSpreadDtls();
        sdo.seed = this._spsSeed.getValue();
        sdo.step = this.spsStep.getValue();
        sdo.sprdCon1 = this.sprdCon1.getValue();
        sdo.sprdCon2 = this.sprdCon2.getValue();
        sdo.posMin = this.posMin.getValue();
        sdo.posMax = this.posMax.getValue();
        sdo.sclMin = this.sclMin.getValue();
        sdo.sclMax = this.sclMax.getValue();
        sdo.rotMin = this.rotMin.getValue().scale(Math.PI / 180);
        sdo.rotMax = this.rotMax.getValue().scale(Math.PI / 180);
        sdo.posRange = this.posRange.getValue();
        sdo.sclRange = this.sclRange.getValue();
        sdo.rotRange = this.rotRange.getValue() * Math.PI / 180
        this._grndSPS.setSpreadDtls(sdo);
        this._grndSPS.generate();
        this._vishva.updateSPSArray(this._grndSPS);
        return true;
    }
}