namespace org.ssatguru.babylonjs.vishva.gui {
    import SliderOptions=JQueryUI.SliderOptions;
    import SliderUIParams=JQueryUI.SliderUIParams;
    
    /**
     * provides a ui to manage the environment in the world
     */
    export class EnvironmentUI{
        private  vishva:Vishva;
        envDiag: VDialog;
        /*
         * Create Environment Dialog
         */
        constructor(vishva:Vishva) {
            this.vishva=vishva;

            let sunPos: JQuery=$("#sunPos");
            let light: JQuery=$("#light");
            let shade: JQuery=$("#shade");
            let fog: JQuery=$("#fog");
            let fov: JQuery=$("#fov");

            sunPos.slider(this.sliderOptions(0,180,this.vishva.getSunPos()));
            light.slider(this.sliderOptions(0,100,100*this.vishva.getLight()));
            shade.slider(this.sliderOptions(0,100,100*this.vishva.getShade()));
            fog.slider(this.sliderOptions(0,100,100*this.vishva.getFog()));

            let fogColDiag: ColorPickerDiag=new ColorPickerDiag("fog color","fogCol",this.vishva.getFogColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this.vishva.setFogColor(hex);
            });

            fov.slider(this.sliderOptions(0,180,this.vishva.getFov()));

            let envSnow: HTMLButtonElement=<HTMLButtonElement>document.getElementById("envSnow");
            envSnow.onclick=(e) => {
                this.vishva.toggleSnow();
            };

            let envRain: HTMLButtonElement=<HTMLButtonElement>document.getElementById("envRain");
            envRain.onclick=(e) => {
                //this.showAlertDiag("Sorry. To be implemented");
                this.vishva.toggleRain();
            };

            var skyButton: HTMLButtonElement=<HTMLButtonElement>document.getElementById("skyButton");
            skyButton.onclick=(e) => {
                var foo: HTMLElement=document.getElementById("add-skyboxes");
                foo.click();
                return true;
            };

            var trnButton: HTMLButtonElement=<HTMLButtonElement>document.getElementById("trnButton");
            trnButton.onclick=(e) => {
                DialogMgr.showAlertDiag("Sorry. To be implemneted soon");
                return true;
            };

            let ambColDiag: ColorPickerDiag=new ColorPickerDiag("ambient color","ambCol",this.vishva.getAmbientColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this.vishva.setAmbientColor(hex);
            });

            let trnColDiag: ColorPickerDiag=new ColorPickerDiag("terrain color","trnCol",this.vishva.getGroundColor(),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this.vishva.setGroundColor(hex);
            });

            this.envDiag=new VDialog("envDiv","Environment",DialogMgr.rightCenter,"","",350);
        }
        
        private sliderOptions(min: number,max: number,value: number): SliderOptions {
            var so: SliderOptions={};
            so.min=min;
            so.max=max;
            so.value=value;
            so.slide=(e,ui) => {return this.handleSlide(e,ui)};
            return so;
        }


        private handleSlide(e: Event,ui: SliderUIParams): boolean {
            var slider: string=(<HTMLElement>e.target).id;
            if(slider==="fov") {
                this.vishva.setFov(ui.value);
            } else if(slider==="sunPos") {
                this.vishva.setSunPos(ui.value);
            } else {
                var v: number=ui.value/100;
                if(slider==="light") {
                    this.vishva.setLight(v);
                } else if(slider==="shade") {
                    this.vishva.setShade(v);
                } else if(slider==="fog") {
                    console.log(v);
                    this.vishva.setFog(v/100);
                }
            }
            return true;
        }
        
        public toggle(){
            this.envDiag.toggle();
        }
    }
}