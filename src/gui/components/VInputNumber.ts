
/**
 * provides a ui to input a vector3 value
 */
export class VInputNumber {

    private _inE: HTMLInputElement;
    public onChange: (n: number) => void;

    constructor(eID: string | HTMLElement, value = 0, readOnly = false) {
        let e: HTMLElement;
        if (eID instanceof HTMLElement) {
            e = eID;
        } else e = document.getElementById(eID);
        //let e: HTMLElement=document.getElementById(eID);

        this._inE = document.createElement("input");
        this._inE.type = "text";
        this._inE.value = Number(value).toString();
        this._inE.size = 2;
        this._inE.setAttribute("class", "vinput  w3-input");

        if (readOnly) this._inE.readOnly = true;
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
            let n: number = Number(this._inE.value);
            if (isNaN(n)) this._inE.value = "0";
            e.preventDefault();
            if (this.onChange != null) {
                this.onChange(Number(this._inE.value));
            }
        }
        e.appendChild(this._inE);
    }



    public getValue(): number {
        let n: number = Number(this._inE.value);
        if (isNaN(n)) return 0;
        else return n;
    }
    public setValue(n: number) {
        this._inE.value = Number(n).toFixed(2);
    }

}
