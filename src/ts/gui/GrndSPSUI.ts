namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector3=BABYLON.Vector3;
    import Vector2=BABYLON.Vector2;
    /**
     * Provides a UI to manage GroundSPS
     */
    export class GrndSPSUI {
        
        private _vishva: Vishva;
        private _grndSPS: GroundSPS;
        private _ready: boolean=false;

        private _spsList: VInputSelect;
        private _spsName:HTMLElement;
        private _spsMesh:HTMLElement;
        private spsSeed: VInputNumber;
        private spsStep: VInputNumber;
        private sprdMin: VInputVector2;
        private sprdMax: VInputVector2;
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
            this._vishva=vishva;

            let genSPSParms: HTMLElement=document.getElementById("genSPSParms");
            genSPSParms.onclick=() => {
                if(this._updateUI()) {
                    this._ready=true;
                } else {
                    this._ready=false;
                };
                genSPS.disabled=!this._ready;
            }
            let genSPS: HTMLButtonElement=<HTMLButtonElement>document.getElementById("genSPS");
            genSPS.disabled=this._ready;
            genSPS.onclick=() => {
                if(this._updateSpreadParms()) {
                    this._ready=true;
                } else {
                    this._ready=false;
                };
                genSPS.disabled=!this._ready;
            }
            this._spsList=new VInputSelect("spsList",this._vishva.getGrndSPSList());
            this._spsList.onSelect=(id: string) => {
                this._updateUI(id);
            }
            
            this._spsName=document.getElementById("spsName");
            this._spsMesh=document.getElementById("spsMesh");
            this.spsSeed=new VInputNumber("spsSeed");
            this.spsStep=new VInputNumber("spsStep");
            this.sprdMin=new VInputVector2("sprdMin");
            this.sprdMax=new VInputVector2("sprdMax");
            this.posMin=new VInputVector3("posMin");
            this.posMax=new VInputVector3("posMax");
            this.sclMin=new VInputVector3("sclMin");
            this.sclMax=new VInputVector3("sclMax");
            this.rotMin=new VInputVector3("rotMin");
            this.rotMax=new VInputVector3("rotMax");
            this.posRange=new VRange("posRange",0,1,0.1,0.5);
            this.sclRange=new VRange("sclRange",0,1,0.1,0.5);
            this.rotRange=new VRange("rotRange",0,180,1,5);
        }


        private _updateUI(gSPSid?: string): boolean {
            let sdo: SpreadDtls;
            if(gSPSid) {
                let gs: GroundSPS;
                gs=this._vishva.getGrndSPSbyID(gSPSid);
                if(gs==null) {
                    DialogMgr.showAlertDiag("could not find gound sps with id : "+gSPSid);
                    return;
                }
                sdo=gs.getSpreadDtls();
                this._grndSPS=gs;
            } else {
                let gs: GroundSPS|string=this._vishva.createGrndSPS();
                if(!(gs instanceof Object)) {
                    DialogMgr.showAlertDiag(gs);
                    return false;
                } else {
                    sdo=(<GroundSPS>gs).getSpreadDtls();
                    this._grndSPS=<GroundSPS>gs;
                }
            }
            this._spsName.innerText=this._grndSPS.name +"("+this._grndSPS.id+")";
            this._spsMesh.innerText=this._grndSPS.mesh.name +"("+this._grndSPS.mesh.id+")";
            this.spsSeed.setValue(sdo.seed);
            this.spsStep.setValue(sdo.step);
            this.sprdMin.setValue(sdo.sprdMin);
            this.sprdMax.setValue(sdo.sprdMax);
            this.posMin.setValue(sdo.posMin);
            this.posMax.setValue(sdo.posMax);
            this.sclMin.setValue(sdo.sclMin);
            this.sclMax.setValue(sdo.sclMax);
            this.rotMin.setValue(sdo.rotMin);
            this.rotMax.setValue(sdo.rotMax);
            this.posRange.setValue(sdo.posRange);
            this.sclRange.setValue(sdo.sclRange);
            this.rotRange.setValue(sdo.rotRange);
            return true;
        }

        private _updateSpreadParms(): boolean {
            let smax:Vector2=this.sprdMax.getValue();
            let smin:Vector2=this.sprdMin.getValue();
            if (smax.x<=smin.x){
                DialogMgr.showAlertDiag("upper cormer x cannot be less than or equal to lower corner x");
                return false;
            }
            if (smax.y<=smin.y){
                DialogMgr.showAlertDiag("upper cormer y cannot be less than or equal to lower corner y");
                return false;
            }
            let sdo: SpreadDtls=this._grndSPS.getSpreadDtls();
            sdo.seed=this.spsSeed.getValue();
            sdo.step=this.spsStep.getValue();
            sdo.sprdMin=this.sprdMin.getValue();
            sdo.sprdMax=this.sprdMax.getValue();
            sdo.posMin=this.posMin.getValue();
            sdo.posMax=this.posMax.getValue();
            sdo.sclMin=this.sclMin.getValue();
            sdo.sclMax=this.sclMax.getValue();
            sdo.rotMin=this.rotMin.getValue();
            sdo.rotMax=this.rotMax.getValue();
            sdo.posRange=this.posRange.getValue();
            sdo.sclRange=this.sclRange.getValue();
            sdo.rotRange=this.rotRange.getValue();
            this._grndSPS.setSpreadDtls(sdo);
            this._grndSPS.generate();
            this._vishva.updateSPSArray(this._grndSPS);
            return true;
        }
    }
}