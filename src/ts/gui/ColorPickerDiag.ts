/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace org.ssatguru.babylonjs.vishva.gui{
    import DialogOptions = JQueryUI.DialogOptions;
    import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;
    export class ColorPickerDiag{
        diag:JQuery;
        cp: ColorPicker; 
        constructor(title:string, diagSelector:string, colorSelector:string,jpo:JQueryPositionOptions,f: (p1: any, p2: any, p3: RGB) => void){
            this.diag = $("#" + diagSelector);
            let colorEle: HTMLElement = document.getElementById(colorSelector);
            this.cp = new ColorPicker(colorEle, f);
            
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
            this.diag.dialog(dos);
            this.diag["jpo"] = jpo;
        }
        
        public open(){
            this.diag.dialog("open");
        }
        
        public setColor(hex:string){
            this.cp.setHex(hex);
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
