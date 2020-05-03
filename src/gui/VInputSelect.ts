export class VInputSelect {

    private _s: HTMLSelectElement;
    public onSelect: (v: string) => void = null;

    constructor(eId: string, options: Array<{ id: string, desc: string }>) {
        let e: HTMLElement = document.getElementById(eId);
        this._s = document.createElement("select");
        this._s.className = "w3-select";
        this._s.onchange = () => {
            if (this.onSelect != null) {
                this.onSelect(this._s.value);
            }
        }
        e.appendChild(this._s);
        this.populateSelect(options);
    }
    /**
     * populates a html select element with options from the passed string array
     */
    public populateSelect(options: Array<{ id: string, desc: string }>) {
        let childs: HTMLCollection = this._s.children;
        let l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }
        let optEle: HTMLOptionElement;
        for (let option of options) {
            optEle = document.createElement("option");
            optEle.value = option.id;
            optEle.innerText = option.desc;
            this._s.appendChild(optEle);
        }
    }

    public getValue(): string {
        return this._s.value;
    }


}