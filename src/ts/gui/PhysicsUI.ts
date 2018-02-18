namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * Provides UI for Physics tab in mesh properties dialog
     */
    export class PhysicsUI{
        private _vishva:Vishva;
        private _phyEna: HTMLInputElement;
        private _phyType: HTMLSelectElement;
        private _phyMass: HTMLInputElement;
        private _phyResVal: HTMLOutputElement;
        private _phyRes: HTMLInputElement;
        private _phyFricVal: HTMLOutputElement;
        private _phyFric: HTMLInputElement;

        constructor(vishva:Vishva) {
            this._vishva=vishva;
            
            this._phyEna=<HTMLInputElement>document.getElementById("phyEna");

            this._phyType=<HTMLSelectElement>document.getElementById("phyType");

            this._phyMass=<HTMLInputElement>document.getElementById("phyMass");

            this._phyRes=<HTMLInputElement>document.getElementById("phyRes");
            this._phyResVal=<HTMLOutputElement>document.getElementById("phyResVal");
            this._phyResVal.value="0.0";
            this._phyRes.oninput=() => {
                this._phyResVal.value=this._formatValue(this._phyRes.value);
            }

            this._phyFric=<HTMLInputElement>document.getElementById("phyFric");
            this._phyFricVal=<HTMLOutputElement>document.getElementById("phyFricVal");
            let abc: HTMLOutputElement;
            this._phyFricVal.value="0.0";
            this._phyFric.oninput=() => {
                this._phyFricVal.value=this._formatValue(this._phyFric.value);
            }

            let phyApply=<HTMLButtonElement>document.getElementById("phyApply");
            let phyTest=<HTMLButtonElement>document.getElementById("phyTest");
            let phyReset=<HTMLButtonElement>document.getElementById("phyReset");

            phyApply.onclick=(ev) => {
                this._applyPhysics();
                DialogMgr.showAlertDiag("physics applied");
                return false;
            }

            phyTest.onclick=(ev) => {
                this._testPhysics();
                return false;
            }

            phyReset.onclick=(ev) => {
                this._resetPhysics()
                return false;
            }
        }

        private _formatValue(val: string) {
            if(val==="1") return "1.0";
            if(val==="0") return "0.0";
            return val;
        }

        public update() {

            let phyParms: PhysicsParm=this._vishva.getMeshPickedPhyParms();
            if(phyParms!==null) {
                this._phyEna.setAttribute("checked","true");
                this._phyType.value=Number(phyParms.type).toString();
                this._phyMass.value=Number(phyParms.mass).toString();
                this._phyRes.value=Number(phyParms.restitution).toString();
                this._phyResVal["value"]=this._formatValue(this._phyRes.value);
                this._phyFric.value=Number(phyParms.friction).toString();
                this._phyFricVal["value"]=this._formatValue(this._phyFric.value);
            } else {
                this._phyEna.checked=false;
                //by default lets set the type to "box"
                this._phyType.value="2";
                this._phyMass.value="1";
                this._phyRes.value="0";
                this._phyResVal["value"]="0.0";
                this._phyFric.value="0";
                this._phyFricVal["value"]="0.0";
            }
        }

        private _applyPhysics() {
            let phyParms: PhysicsParm;
            if(this._phyEna.checked) {
                phyParms=new PhysicsParm();
                phyParms.type=parseInt(this._phyType.value);
                phyParms.mass=parseFloat(this._phyMass.value);
                phyParms.restitution=parseFloat(this._phyRes.value);
                phyParms.friction=parseFloat(this._phyFric.value);
            } else {
                phyParms=null;
            }
            this._vishva.setMeshPickedPhyParms(phyParms);
        }

        private _testPhysics() {
            let phyParms: PhysicsParm;

            phyParms=new PhysicsParm();
            phyParms.type=parseInt(this._phyType.value);
            phyParms.mass=parseFloat(this._phyMass.value);
            phyParms.restitution=parseFloat(this._phyRes.value);
            phyParms.friction=parseFloat(this._phyFric.value);

            this._vishva.testPhysics(phyParms);
        }

        private _resetPhysics() {
            this._vishva.resetPhysics();
            /* End of Mesh Properties              */

        }
    }
}