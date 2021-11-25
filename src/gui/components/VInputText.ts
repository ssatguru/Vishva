import { UIConst } from "../UIConst";

/**
 * provides a ui to input a vector3 value
 */
export class VInputText {

    public _e: HTMLInputElement;
    public onChange: (s: string) => void;

    constructor(value = "") {
        this._e = document.createElement("input");
        this._e.type = "text";
        this._e.setAttribute("class", "vinput w3-input");
        // this._inE.style.display = "inline-block";
        // this._inE.style.backgroundColor = "#655870";
        // this._inE.style.color = "White"
        // this._inE.style.border = "1px solid black"
        // this._inE.style.outline = "none"
        //this._inE.style.height = UIConst._buttonHeight.toString() + "px";
        // this._inE.style.borderRadius = "10px";

        this._e.onkeypress = (e) => {
            e.stopPropagation()
        }
        this._e.onkeydown = (e) => {
            e.stopPropagation()
        }
        this._e.onkeyup = (e) => {
            e.stopPropagation()
        }
        this._e.onchange = (e) => {
            e.preventDefault();
            if (this.onChange != null) {
                this.onChange(this._e.value);
            }
        }
    }



    public getValue(): string {
        return this._e.value;
    }
    public setValue(s: string) {
        this._e.value = s;
    }

    public appendTo(eID: string | HTMLElement) {
        let e: HTMLElement;

        if (eID instanceof HTMLElement) {
            e = eID;
        } else e = document.getElementById(eID);

        e.appendChild(this._e);
    }

    public setStyle(style: string) {
        this._e.style.cssText = style;
    }

    public setHint(hint: string) {
        this._e.setAttribute("title", hint);
    }

}
