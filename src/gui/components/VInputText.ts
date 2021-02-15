import { UIConst } from "../UIConst";

/**
 * provides a ui to input a vector3 value
 */
export class VInputText {

    private _inE: HTMLInputElement;
    public onChange: (s: string) => void;

    constructor(eID: string | HTMLElement, value = "") {
        let e: HTMLElement;

        if (eID instanceof HTMLElement) {
            e = eID;
        } else e = document.getElementById(eID);

        this._inE = document.createElement("input");
        this._inE.type = "text";
        this._inE.setAttribute("class", "vinput w3-input");
        // this._inE.style.display = "inline-block";
        // this._inE.style.backgroundColor = "#655870";
        // this._inE.style.color = "White"
        // this._inE.style.border = "1px solid black"
        // this._inE.style.outline = "none"
        //this._inE.style.height = UIConst._buttonHeight.toString() + "px";
        // this._inE.style.borderRadius = "10px";

        this._inE.onkeypress = (e) => {
            e.stopPropagation()
        }
        this._inE.onkeydown = (e) => {
            e.stopPropagation()
        }
        this._inE.onkeyup = (e) => {
            e.stopPropagation()
        }
        this._inE.onchange = (e) => {
            e.preventDefault();
            if (this.onChange != null) {
                this.onChange(this._inE.value);
            }
        }
        e.appendChild(this._inE);
    }



    public getValue(): string {
        return this._inE.value;
    }
    public setValue(s: string) {
        this._inE.value = s;
    }

}
