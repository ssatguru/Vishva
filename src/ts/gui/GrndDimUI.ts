namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector2=BABYLON.Vector2;
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
        


        constructor(vishva: Vishva) {
            this._vishva=vishva;
                      
            this._grndID=new VInputText("grndID");
            this._grndHM=new VFileInput("grndHM",null,"Height Map Image",DialogMgr.centerBottom,this._vishva.vishvaFiles,"\.bmp$|\.png$|\.tga$\.jpg$",true)
            this._grndW=new VInputNumber("grndW");
            this._grndL=new VInputNumber("grndL");
            this._grndS=new VInputNumber("grndS");
            this._grndminH=new VInputNumber("grndminH");
            this._grndmaxH=new VInputNumber("grndmaxH");
            let _grndCF: ColorPickerDiag=new ColorPickerDiag("color filter","grndCF",this._vishva.getFogColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                //this._vishva.setFogColor(hex);
            });
            
        }


        private _updateUI(gSPSid?: string): boolean {
            
            return true;
        }

        
    }
}