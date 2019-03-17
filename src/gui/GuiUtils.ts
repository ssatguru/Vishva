export class GuiUtils {
    /**
     * populates a html select element with options from the passed string array
     */
    public static PopulateSelect(selectEle: HTMLSelectElement, options: Array<string>) {
        let childs: HTMLCollection = selectEle.children;
        let l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }
        let optEle: HTMLOptionElement;
        for (let option of options) {
            optEle = document.createElement("option");
            optEle.value = option;
            optEle.innerText = option;
            selectEle.appendChild(optEle);
        }

    }
}