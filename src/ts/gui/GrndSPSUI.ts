namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector3=BABYLON.Vector3;
    /**
     * Provides a UI to manage GroundSPS
     */
    export class GrndSPSUI{
        private _vishva:Vishva;

        constructor(vishva:Vishva){
            this._vishva=vishva;
            let spsSeed:InputNumber = new InputNumber("spsSeed");
            let spsStep:InputNumber = new InputNumber("spsStep");
            
            let sprdMin:InputVector2= new InputVector2("sprdMin");
            let sprdMax:InputVector2= new InputVector2("sprdMax");
            let posMin:InputVector3= new InputVector3("posMin");
            let posMax:InputVector3= new InputVector3("posMax");
            let sclMin:InputVector3= new InputVector3("sclMin");
            let sclMax:InputVector3= new InputVector3("sclMax");
            let rotMin:InputVector3= new InputVector3("rotMin");
            let rotMax:InputVector3= new InputVector3("rotMax");
        }
        
        public update(){
            
        }
       
    }
}