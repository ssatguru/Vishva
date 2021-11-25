
/**
 * provides a ui to input a vector3 value
 */
export class VInputNumber {

    public _e: HTMLInputElement;
    public onChange: (n: number) => void;

    constructor(eID: string | HTMLElement, value = 0, readOnly = false) {

        this._e = document.createElement("input");
        this._e.type = "text";
        this._e.value = Number(value).toString();
        this._e.size = 2;
        this._e.setAttribute("class", "vinput  w3-input");

        if (readOnly) this._e.readOnly = true;
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
            let n: number = Number(this._e.value);
            if (isNaN(n)) this._e.value = "0";
            e.preventDefault();
            if (this.onChange != null) {
                this.onChange(Number(this._e.value));
            }
        }

        if (eID != null) {
            let e: HTMLElement;
            if (eID instanceof HTMLElement) {
                e = eID;
            } else e = document.getElementById(eID);
            e.appendChild(this._e);
        }
    }



    public getValue(): number {
        let n: number = Number(this._e.value);
        if (isNaN(n)) return 0;
        else return n;
    }
    public setValue(n: number) {
        this._e.value = Number(n).toFixed(2);
    }

}
