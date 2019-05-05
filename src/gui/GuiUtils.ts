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

    public static  createDiv(id?:string):HTMLDivElement{
        let uiRoot:HTMLElement = document.getElementById("gui-items-2");
        let div:HTMLDivElement= document.createElement("div");
        if (id!=null) div.id=id;
        uiRoot.appendChild(div);
        return div;
    }
}