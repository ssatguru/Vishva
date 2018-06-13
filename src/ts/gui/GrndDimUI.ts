namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector2=BABYLON.Vector2;
    import GroundMesh=BABYLON.GroundMesh;
    /**
     * Provides a UI to manage Ground Dimensions
     */
    export class GrndDimUI {
        
        private _vishva: Vishva;
        private _grndID: VInputText;
        private _grndHM:VFileInput;
        private _grndW: VInputNumber;
        private _grndL: VInputNumber;
        private _grndS: VInputNumber;
        private _grndminH: VInputNumber;
        private _grndmaxH: VInputNumber;
        private _grndUVOffset: VInputVector2;
        private _grndUVScale: VInputVector2;
        private _grndUpdate: HTMLButtonElement;

        constructor(vishva: Vishva) {
            this._vishva=vishva;
            
            let grnd: GroundMesh=<GroundMesh>vishva.ground;
                      
            this._grndID=new VInputText("grndID",grnd.name);
            this._grndHM=new VFileInput("grndHM",null,"Height Map Image",DialogMgr.centerBottom,this._vishva.vishvaFiles,"\.bmp$|\.png$|\.tga$\.jpg$",true)
            this._grndW=new VInputNumber("grndW",grnd._width);
            this._grndL=new VInputNumber("grndL",grnd._height);
            this._grndS=new VInputNumber("grndS",grnd.subdivisions);
            this._grndminH=new VInputNumber("grndminH");
            this._grndmaxH=new VInputNumber("grndmaxH");
            this._grndUVOffset=new VInputVector2("grndUVOffset", new Vector2(0,0));
            this._grndUVScale=new VInputVector2("grndUVScale", new Vector2(1,1));
            this._grndUpdate=<HTMLButtonElement>document.getElementById("grndUpdate");
            this._grndUpdate.onclick=()=>{this.updateGround();};
        }


        public update() {
            let grnd: GroundMesh=<GroundMesh>this._vishva.ground;
            this._grndID.setValue(grnd.name);
            return true;
        }
        
        private updateGround(){
            console.log("updateGround");
            let grnd: GroundMesh=<GroundMesh>this._vishva.ground;
            grnd.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.PositionKind, true);
            grnd.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.NormalKind, true);
            console.log(this._grndHM.getValue());
            grnd.applyDisplacementMap(
                this._grndHM.getValue(),
                this._grndminH.getValue(),
                this._grndmaxH.getValue(),
                ()=>{console.log("ground updated");},
                this._grndUVOffset.getValue(),
                this._grndUVScale.getValue()
            );
        }

        
    }
}