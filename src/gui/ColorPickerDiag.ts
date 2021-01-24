import { VDialog } from "./components/VDialog";
import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;
import { ColorPicker } from "./colorpicker/colorpicker";

/**
 * adds a two input box and a color dialog box inside the element whose id is passed
 */
export class ColorPickerDiag {

    // input box to show or enter the color hex value
    // input box to show the color
    // the div which would be used to create a dialog box cotaining the color picker
    ih: string = `
    <div>
        <div class='w3-cell-row' style="width:100%">
            <input type='text' class='colorInputValue w3-input w3-cell'  style='width:25%' title='enter color in hex #hhhhhh'></input>
            <input type='text' class='colorInput w3-input w3-cell' style='cursor: pointer;width:75%'  readonly></input>
        </div>
        <div class='colorDiag' style='align-content: center'><div  class='colorPicker cp-fancy'></div></div>
    </div>
    `;
    colorInputValue: HTMLInputElement;
    colorInput: HTMLInputElement;

    vDiag: VDialog;
    cp: ColorPicker;
    hexColor: string;

    constructor(title: string, diagSelector: string, initialColor: string, jpo: JQueryPositionOptions, f: (p1: any, p2: any, p3: RGB) => void) {
        this.hexColor = initialColor;

        let colorEle: HTMLElement = document.getElementById(diagSelector);
        colorEle.innerHTML = this.ih;

        this.colorInputValue = <HTMLInputElement>colorEle.getElementsByClassName("colorInputValue")[0];
        this.colorInputValue.value = this.hexColor;

        //TODO - check for valid value, allow hsv and rgb too
        this.colorInputValue.onchange = () => {
            this.hexColor = this.colorInputValue.value;
            this.colorInput.style.backgroundColor = this.hexColor;
            this.cp.setHex(this.hexColor);
            f(this.hexColor, null, null);
        }

        this.colorInput = <HTMLInputElement>colorEle.getElementsByClassName("colorInput")[0];
        this.colorInput.style.backgroundColor = this.hexColor;


        this.colorInput.onclick = () => {
            this.vDiag.open();
            this.cp.setHex(this.hexColor);
        }

        let colorDiag: HTMLDivElement = <HTMLDivElement>colorEle.getElementsByClassName("colorDiag")[0];
        let colorPicker: HTMLElement = <HTMLElement>colorDiag.getElementsByClassName("colorPicker")[0];

        this.cp = new ColorPicker(colorPicker, (hex: any, hsv: any, rgb: RGB) => {
            this.hexColor = hex;
            this.colorInput.style.backgroundColor = hex;
            this.colorInputValue.value = hex;
            f(hex, hsv, rgb);
        });

        this.vDiag = new VDialog(colorDiag, title, jpo);
    }

    public open(hex: string) {
        this.vDiag.open();
        this.setColor(hex);
    }

    public setColor(hex: string) {
        this.hexColor = hex;
        this.cp.setHex(hex);
        this.colorInput.style.backgroundColor = hex;
        this.colorInputValue.value = hex;
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

