namespace org.ssatguru.babylonjs.vishva.gui{
    import DialogOptions = JQueryUI.DialogOptions;
    import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;
    export class ColorPickerDiag{
        
        inner1:string ="<input class='colorInput' type='text' style='width:100%;height:32px;border-width:1px;border-style:solid;cursor: pointer' readonly></input>";
        inner2:string ="<div class='colorDiag' style='align-content: center'><div  class='colorPicker cp-fancy'></div></div>";
        colorInput:HTMLInputElement;
        diag:JQuery;
        cp: ColorPicker; 
        hexColor:string;
        
        constructor(title:string, diagSelector:string, initialColor:string, jpo:JQueryPositionOptions, f: (p1: any, p2: any, p3: RGB) => void){
            this.hexColor = initialColor;
            
            let colorEle: HTMLElement = document.getElementById(diagSelector);
            colorEle.innerHTML = this.inner1.concat(this.inner2);
            
            this.colorInput = <HTMLInputElement>colorEle.getElementsByClassName("colorInput")[0];
            this.colorInput.style.backgroundColor = this.hexColor;
            this.colorInput.value=this.hexColor;
            this.colorInput.onclick =()=>{
                this.diag.dialog("open");
                this.cp.setHex(this.hexColor);
            }
            
            let colorDiag:HTMLElement = <HTMLElement>colorEle.getElementsByClassName("colorDiag")[0];
            let colorPicker:HTMLElement = <HTMLElement> colorDiag.getElementsByClassName("colorPicker")[0];
            
            this.cp = new ColorPicker(colorPicker, (hex: any, hsv: any, rgb: RGB)=>{
                this.hexColor = hex;
                this.colorInput.style.backgroundColor = hex;
                this.colorInput.value=hex;
                f(hex,hsv,rgb);
            });
            
            
            var dos: DialogOptions = {
                autoOpen: false,
                resizable: false,
                position: jpo,
                //minWidth: 350,
                height: "auto",
                closeText: "",
                closeOnEscape: false,
                title:title
            };
            
            this.diag = $(colorDiag);
            this.diag.dialog(dos);
            this.diag["jpo"] = jpo;
        }
        
        public open(hex:string){
            this.diag.dialog("open");
            this.setColor(hex);
        }
        
        public setColor(hex:string){
            this.hexColor=hex;
            this.cp.setHex(hex);
            this.colorInput.style.backgroundColor = hex;
            this.colorInput.value=hex;
        }
        
        public getColor():string{
            return this.hexColor;
        }
        
    }
    
    declare class ColorPicker {
        public constructor(e: HTMLElement, f: (p1: string, hsv: string, p3: RGB) => void);

        public setRgb(rgb: RGB);
        
        public setHex(hex:string);
    }

    class RGB {
        r: number;

        g: number;

        b: number;
        
        constructor() {
            this.r = 0;
            this.g = 0;
            this.b = 0;
        }
    }
}
