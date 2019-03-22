import {VDialog} from "./VDialog";
import JQueryPositionOptions=JQueryUI.JQueryPositionOptions;
import {ColorPicker} from "./colorpicker/colorpicker";

/**
 * adds a two input box and a color dialog box inside the element whose id is passed
 */
export class ColorPickerDiag {
    //input box to show or input the color hex value
    inner0: string="<input class='colorInputValue' title='enter color in hex #hhhhhh'  type='text' style='width:100%;height:32px;border-width:1px;border-style:solid;' ></input>";
    //input bos to show the color
    inner1: string="<input class='colorInput' type='text' style='width:100%;height:32px;border-width:1px;border-style:solid;cursor: pointer' readonly></input>";
    //the div which would be used to create a dialog box cotaining the color picker
    inner2: string="<div class='colorDiag' style='align-content: center'><div  class='colorPicker cp-fancy'></div></div>";


    colorInputValue: HTMLInputElement;
    colorInput: HTMLInputElement;
    //diag:JQuery;
    vDiag: VDialog;
    cp: ColorPicker;
    hexColor: string;

    constructor(title: string,diagSelector: string,initialColor: string,jpo: JQueryPositionOptions,f: (p1: any,p2: any,p3: RGB) => void) {
        this.hexColor=initialColor;

        //concat inner0,inner1 and inner2 togather and insert as html in the element passed
        let colorEle: HTMLElement=document.getElementById(diagSelector);
        colorEle.innerHTML=this.inner0.concat(this.inner1).concat(this.inner2);

        this.colorInputValue=<HTMLInputElement>colorEle.getElementsByClassName("colorInputValue")[0];
        this.colorInputValue.value=this.hexColor;

        //TODO - check for valid value, allow hsv and rgb too
        this.colorInputValue.onchange=() => {
            console.log("blur = changing color value");
            this.hexColor=this.colorInputValue.value;
            this.colorInput.style.backgroundColor=this.hexColor;
            this.cp.setHex(this.hexColor);
            f(this.hexColor,null,null);
        }

        this.colorInput=<HTMLInputElement>colorEle.getElementsByClassName("colorInput")[0];
        this.colorInput.style.backgroundColor=this.hexColor;


        this.colorInput.onclick=() => {
            //this.diag.dialog("open");
            this.vDiag.open();
            this.cp.setHex(this.hexColor);
        }

        let colorDiag: HTMLDivElement=<HTMLDivElement>colorEle.getElementsByClassName("colorDiag")[0];
        let colorPicker: HTMLElement=<HTMLElement>colorDiag.getElementsByClassName("colorPicker")[0];

        this.cp=new ColorPicker(colorPicker,(hex: any,hsv: any,rgb: RGB) => {
            this.hexColor=hex;
            this.colorInput.style.backgroundColor=hex;
            this.colorInputValue.value=hex;
            f(hex,hsv,rgb);
        });

        this.vDiag=new VDialog(colorDiag,title,jpo);
    }

    public open(hex: string) {
        this.vDiag.open();
        this.setColor(hex);
    }

    public setColor(hex: string) {
        this.hexColor=hex;
        this.cp.setHex(hex);
        this.colorInput.style.backgroundColor=hex;
        this.colorInputValue.value=hex;
    }

    public getColor(): string {
        return this.hexColor;
    }

}

// declare class ColorPicker {
//     public constructor(e: HTMLElement,f: (p1: string,hsv: string,p3: RGB) => void);

//     public setRgb(rgb: RGB);

//     public setHex(hex: string);
// }

class RGB {
    r: number;

    g: number;

    b: number;

    constructor() {
        this.r=0;
        this.g=0;
        this.b=0;
    }
}

