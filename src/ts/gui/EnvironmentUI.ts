namespace org.ssatguru.babylonjs.vishva.gui {
    import SliderOptions=JQueryUI.SliderOptions;
    import SliderUIParams=JQueryUI.SliderUIParams;
    
    /**
     * provides a ui to manage the environment in the world
     */
    export class EnvironmentUI{
        private _vishva:Vishva;
        private _envDiag: VDialog;
        private _addInternalAssetUI: InternalAssetsUI;
        private _groundUI:GroundUI; 
        /*
         * Create Environment Dialog
         */
        constructor(vishva:Vishva,addInternalAssetUI: InternalAssetsUI) {
            this._vishva=vishva;
            this._addInternalAssetUI=addInternalAssetUI;
            
            let sunPos: JQuery=$("#sunPos");
            let light: JQuery=$("#light");
            let shade: JQuery=$("#shade");
            let fog: JQuery=$("#fog");
            let fov: JQuery=$("#fov");

            sunPos.slider(this._sliderOptions(0,180,this._vishva.getSunPos()));
            light.slider(this._sliderOptions(0,100,100*this._vishva.getLight()));
            shade.slider(this._sliderOptions(0,100,100*this._vishva.getShade()));
            fog.slider(this._sliderOptions(0,100,100*this._vishva.getFog()));

            let fogColDiag: ColorPickerDiag=new ColorPickerDiag("fog color","fogCol",this._vishva.getFogColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this._vishva.setFogColor(hex);
            });

            fov.slider(this._sliderOptions(0,180,this._vishva.getFov()));

            let envSnow: HTMLButtonElement=<HTMLButtonElement>document.getElementById("envSnow");
            envSnow.onclick=(e) => {
                this._vishva.toggleSnow();
            };

            let envRain: HTMLButtonElement=<HTMLButtonElement>document.getElementById("envRain");
            envRain.onclick=(e) => {
                //this.showAlertDiag("Sorry. To be implemented");
                this._vishva.toggleRain();
            };

            var skyButton: HTMLButtonElement=<HTMLButtonElement>document.getElementById("skyButton");
            skyButton.onclick=(e) => {
                this._addInternalAssetUI.toggleAssetDiag("skyboxes");
                return true;
            };

            var trnButton: HTMLButtonElement=<HTMLButtonElement>document.getElementById("trnButton");
            trnButton.onclick=(e) => {
//                if (this._groundUI==null){
//                    this._groundUI=new GroundUI(this._vishva);
//                }
//                this._groundUI.toggle();
                let r =this._vishva.spreadOnGround();
                if (r!=null){
                    DialogMgr.showAlertDiag(r);
                }
                return true;
            };

            let ambColDiag: ColorPickerDiag=new ColorPickerDiag("ambient color","ambCol",this._vishva.getAmbientColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this._vishva.setAmbientColor(hex);
            });

            let trnColDiag: ColorPickerDiag=new ColorPickerDiag("terrain color","trnCol",this._vishva.getGroundColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this._vishva.setGroundColor(hex);
            });

            this._envDiag=new VDialog("envDiv","Environment",DialogMgr.rightCenter,"","",350);
        }
        
        private _sliderOptions(min: number,max: number,value: number): SliderOptions {
            var so: SliderOptions={};
            so.min=min;
            so.max=max;
            so.value=value;
            so.slide=(e,ui) => {return this._handleSlide(e,ui)};
            return so;
        }


        private _handleSlide(e: Event,ui: SliderUIParams): boolean {
            var slider: string=(<HTMLElement>e.target).id;
            if(slider==="fov") {
                this._vishva.setFov(ui.value);
            } else if(slider==="sunPos") {
                this._vishva.setSunPos(ui.value);
            } else {
                var v: number=ui.value/100;
                if(slider==="light") {
                    this._vishva.setLight(v);
                } else if(slider==="shade") {
                    this._vishva.setShade(v);
                } else if(slider==="fog") {
                    console.log(v);
                    this._vishva.setFog(v/100);
                }
            }
            return true;
        }
        
        public toggle(){
            this._envDiag.toggle();
        }
    }
}