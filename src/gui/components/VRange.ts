
/**
 * provides a ui to input a vector3 value
 */
export class VRange {


    private _r: JQuery;
    private _v: number;
    public onChange: (n: number) => void;

    constructor(eID: string, min = 0, max = 1, step = 0.01, value = 0) {
        let e: HTMLElement = document.getElementById(eID);

        let d: HTMLDivElement = document.createElement("div");
        let h: HTMLDivElement = document.createElement("div");
        h.setAttribute("class", "ui-slider-handle");
        d.appendChild(h);
        let hndl: JQuery = $(h);

        e.appendChild(d);

        this._r = $(d);
        this._r.slider({
            min: min,
            max: max,
            step: step,
            value: value,
            create: () => {
                hndl.text(value);
            },
            slide: (e, ui) => {
                hndl.text(ui.value);
            }
        });

    }



    public getValue(): number {
        return this._r.slider("option", "value");
    }
    public setValue(n: number) {
        return this._r.slider("option", "value", n);
    }

}
