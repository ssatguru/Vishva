import { ColorPicker } from "./colorpicker/colorpicker";
import { VDiag } from "./components/VDiag";

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
        <div class='w3-cell-row' style="width:100%">
            <input type='text' class='colorInputValue w3-input w3-cell vinput'  style='width:60%;min-width:4em' title='enter color in hex #hhhhhh'></input>
            <input type='text' class='colorInput w3-input w3-cell vinput' style='cursor: pointer;width:20%'  readonly></input>
        </div>
         <!-- <div class='colorDiag' style='justify-self: center;'> -->
            <div  class='colorPicker' style='display:grid;grid-template-columns:auto auto;align-items:center;grid-gap:0.75em;padding:0.5em'></div>
        <!-- </div> -->
    </div>
    `;
    colorInputValue: HTMLInputElement;
    colorInput: HTMLInputElement;

    //vDiag: VDialog;
    vDiag: VDiag = null;
    cp: ColorPicker = null;
    hexColor: string;

    constructor(title: string, diagSelector: string, initialColor: string, pos: string, f: (p1: any, p2: any, p3: RGB) => void) {
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

        // let colorDiag: HTMLDivElement = <HTMLDivElement>colorEle.getElementsByClassName("colorDiag")[0];
        // let colorPicker: HTMLElement = <HTMLElement>colorDiag.getElementsByClassName("colorPicker")[0];

        let colorPicker: HTMLElement = <HTMLElement>colorEle.getElementsByClassName("colorPicker")[0];

        this.colorInput.onclick = () => {
            if (this.vDiag == null) {
                this.cp = new ColorPicker(colorPicker, (hex: any, hsv: any, rgb: RGB) => {
                    this.hexColor = hex;
                    this.colorInput.style.backgroundColor = hex;
                    this.colorInputValue.value = hex;
                    f(hex, hsv, rgb);
                });

                // this.vDiag = new VDiag(colorDiag, title, pos, 0, "auto", "19em");
                this.vDiag = new VDiag(colorPicker, title, pos, 0, "auto", "19em");
            } else {
                this.vDiag.toggle();
            }
            this.cp.setHex(this.hexColor);
        }




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

