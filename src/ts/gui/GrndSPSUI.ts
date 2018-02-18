namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector3=BABYLON.Vector3;
    /**
     * Provides a UI to manage GroundSPS
     */
    export class GrndSPSUI {
        private _vishva: Vishva;
        private _grndSPS: GroundSPS;
        private _ready:boolean=false;

        spsSeed: VInputNumber;
        spsStep: VInputNumber;
        sprdMin: VInputVector2;
        sprdMax: VInputVector2;
        posMin: VInputVector3;
        posMax: VInputVector3;
        sclMin: VInputVector3;
        sclMax: VInputVector3;
        rotMin: VInputVector3;
        rotMax: VInputVector3;
        posRange: VRange;
        sclRange: VRange;
        rotRange: VRange;



        constructor(vishva: Vishva) {
            this._vishva=vishva;

            let genSPSParms: HTMLElement=document.getElementById("genSPSParms");
            genSPSParms.onclick=() => {
                if (this._updateUI()){
                    this._ready=true;
                }else{
                    this._ready=false;
                };
                genSPS.disabled=!this._ready;
            }
            let genSPS: HTMLButtonElement=<HTMLButtonElement>document.getElementById("genSPS");
            genSPS.disabled=this._ready;
            genSPS.onclick=() => {
                if (this._updateSpreadParms()){
                    this._ready=true;
                }else{
                    this._ready=false;
                };
                genSPS.disabled=!this._ready;
            }
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
        

        private _updateUI():boolean {
            let sdo:SpreadDtls;
            let sd: SpreadDtls|string=this._vishva.getSpreadDtls()
            
            if(!(sd instanceof Object)) {
                DialogMgr.showAlertDiag(sd);
                return false;
            }else{
                sdo=<SpreadDtls>sd;
            }
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
        
        private _updateSpreadParms():boolean {
            console.log("_updateSpreadParms");
            let sdo:SpreadDtls;
            let sd: SpreadDtls|string=this._vishva.getSpreadDtls()
            
            if(!(sd instanceof Object)) {
                DialogMgr.showAlertDiag(sd);
                return false;
            }else{
                sdo=<SpreadDtls>sd;
            }
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
            this._vishva.setSpreadDtls(sdo);
            this._vishva.generateSPS();
            return true;
        }

        public update() {

        }

    }
}