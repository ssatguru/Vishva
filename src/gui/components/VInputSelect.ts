export class VInputSelect {

    private _e: HTMLSelectElement;
    public onSelect: (v: string) => void = null;

    constructor(eId: string, options: Array<{ id: string, desc: string }>) {
        let e: HTMLElement = document.getElementById(eId);
        this._e = document.createElement("select");
        this._e.className = "w3-select";
        this._e.onchange = () => {
            if (this.onSelect != null) {
                this.onSelect(this._e.value);
            }
        }
        e.appendChild(this._e);
        this.populateSelect(options);
    }

    /**
     * populates a html select element with options from the passed string array
     */
    public populateSelect(options: Array<{ id: string, desc: string }>) {
        let childs: HTMLCollection = this._e.children;
        let l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }
        let optEle: HTMLOptionElement;
        for (let option of options) {
            optEle = document.createElement("option");
            optEle.value = option.id;
            optEle.innerText = option.desc;
            this._e.appendChild(optEle);
        }
    }

    public getValue(): string {
        return this._e.value;
    }

    public static styleIt(se: HTMLSelectElement) {
        se.className = "w3-select";
        se.style.width = "auto";

    }


}