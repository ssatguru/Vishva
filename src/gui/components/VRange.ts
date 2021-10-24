
/**
 * provides a ui to input a vector3 value
 */
export class VRange {


    private _r: HTMLInputElement;
    private _v: number;
    public onChange: (n: number) => void;

    constructor(eID: string, min = 0, max = 1, step = 0.01, value = 0) {
        let e: HTMLElement = document.getElementById(eID);
        let d: HTMLInputElement = document.createElement("input");
        d.type = "range";
        e.appendChild(d);

        d.min = min.toString();
        d.max = max.toString();
        d.step = step.toString();
        d.value = value.toString();

        this._r = d;

    }


    public getValue(): number {
        return Number(this._r.value);
    }

    public setValue(n: number) {
        this._r.value = n.toString();
    }

}
