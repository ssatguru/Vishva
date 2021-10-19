import { ColorPicker } from "./colorpicker/colorpicker";
import { VDiag } from "./components/VDiag";
import { VInputText } from "./components/VInputText";

/**
 * adds a two input box and a color dialog box inside the element whose id is passed
 */
export class ColorPickerFld {

    // input box to show or enter the color hex value
    // input box to show the color
    // the div which would be used to create a dialog box cotaining the color picker
    // note width 70%,20% not 70%,30% = 100%- to prevent color box wrapping to next line. firefox is more finicky, had to go from 70,20 to 60,20
    // 
    ih: string = `
    <div>
        <div class='colorFlds w3-cell-row' style="width:100%">
            <input type='text' class='colorInput w3-input w3-cell vinput' style='cursor: pointer;width:20%'  readonly></input>
        </div>
        <div  class='colorPicker' style='display:grid;grid-template-columns:auto auto;align-items:center;grid-gap:0.75em;padding:0.5em'></div>
    </div>
    `;
    //colorInputValue: HTMLInputElement;
    colorInputValue: VInputText;
    colorInput: HTMLInputElement;

    //vDiag: VDialog;
    vDiag: VDiag = null;
    cp: ColorPicker = null;
    hexColor: string;
    private _chgHandler: (p1: any, p2: any, p3: RGB) => void;

    constructor(title: string, diagSelector: string, initialColor: string, pos: string, f: (p1: any, p2: any, p3: RGB) => void) {

        this._chgHandler = f;
        this.hexColor = initialColor;

        let colorEle: HTMLElement = document.getElementById(diagSelector);
        colorEle.innerHTML = this.ih;

        this.colorInputValue = new VInputText();
        this.colorInputValue.setStyle("width:60%;min-width:4em");
        this.colorInputValue.setHint("enter color in hex #hhhhhh");
        this.colorInputValue.appendTo(<HTMLElement>colorEle.getElementsByClassName("colorFlds")[0]);

        this.colorInputValue.setValue(this.hexColor);
        //TODO - check for valid value, allow hsv and rgb too
        this.colorInputValue.onChange = (color) => {
            this.hexColor = color;
            this.colorInput.style.backgroundColor = this.hexColor;
            if (this.cp != null) this.cp.setHex(this.hexColor);
            this._chgHandler(this.hexColor, null, null);
        }

        this.colorInput = <HTMLInputElement>colorEle.getElementsByClassName("colorInput")[0];
        this.colorInput.style.backgroundColor = this.hexColor;

        let colorPicker: HTMLElement = <HTMLElement>colorEle.getElementsByClassName("colorPicker")[0];

        this.colorInput.onclick = () => {
            if (this.vDiag == null) {
                this._createCPdiag(colorPicker, title, pos);
            } else {
                this.vDiag.toggle();
            }
            this.cp.setHex(this.hexColor);
        }

    }

    private _createCPdiag(colorPicker: HTMLElement, title: string, pos: string) {
        this.cp = new ColorPicker(colorPicker, (hex: any, hsv: any, rgb: RGB) => {
            this.hexColor = hex;
            this.colorInput.style.backgroundColor = hex;
            this.colorInputValue.setValue(hex);
            this._chgHandler(hex, hsv, rgb);
        });
        this.vDiag = new VDiag(colorPicker, title, pos, 0, "auto", "19em");
    }

    // public open(hex: string) {
    //     this.vDiag.open();
    //     this.setColor(hex);
    // }

    public setColor(hex: string) {
        this.hexColor = hex;
        // if color picker is open then set the color there too
        if (this.cp != null) this.cp.setHex(hex);
        this.colorInput.style.backgroundColor = hex;
        this.colorInputValue.setValue(hex);
    }

    public getColor(): string {
        return this.hexColor;
    }

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

