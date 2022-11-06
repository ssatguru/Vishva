
/**
 * Creates an expandable/collapsible tree
 */
export class VTree {

    private _treeEle: HTMLElement;
    private _treeData: Array<string | object>;
    private _filter: string;
    private _vtree: HTMLUListElement;
    private _open: boolean;

    private _closeIcon: string = "material-icons-outlined c";
    private _openIcon: string = "material-icons-outlined o";
    private _leafIcon: string = "material-icons-outlined";

    private _closeIconTxt: string = "arrow_right";
    private _openIconTxt: string = "arrow_drop_down";
    private _fileIconTxt: string = "remove";

    constructor(treeEle: string | HTMLDivElement, treeData: Array<string | object>, filter?: string, open = false) {
        if (treeEle instanceof HTMLDivElement) {
            this._treeEle = treeEle;
        } else {
            this._treeEle = document.getElementById(treeEle);
        }
        if (this._treeEle == null) {
            console.error("Unable to locate element " + treeEle);
            return;
        }

        this._treeData = treeData;
        this._filter = filter;
        this._open = open;

        //delete any existing tree
        //let childULs: NodeListOf<HTMLUListElement>=this._treeEle.getElementsByTagName("ul");
        let childULs: HTMLCollectionOf<HTMLUListElement> = this._treeEle.getElementsByTagName("ul");
        for (let i = 0; i < childULs.length; i++) {
            if (childULs.item(i).id == "vtree") {
                this._treeEle.removeChild(childULs.item(i));
            }
        }

        //create a new one
        this._create();
    }

    private _clickListener: (leaf: string, path: string, isLeaf: boolean) => void = null;
    public addClickListener(clickListener: (leaf: string, path: string, isLeaf: boolean) => void = null) {
        this._clickListener = clickListener;
    }

    public refresh(treeData: Array<string | object>, filter?: string) {
        this._treeEle.removeChild(this._vtree);
        this._treeData = treeData;
        if (filter != null)
            this._filter = filter;
        this._create();
    }

    public filter(filter: string) {
        if (filter.length == 0) {
            this._showAll();
            return;
        }
        this._hideAll();
        //let lis: NodeListOf<Element>=this._vtree.getElementsByClassName("treeFile");
        let lis: HTMLCollectionOf<Element> = this._vtree.getElementsByClassName("treeFile");
        for (let i = 0; i < lis.length; i++) {
            let t: string = lis.item(i).childNodes[1].textContent;
            if (t.indexOf(filter) >= 0) {
                (<HTMLElement>lis.item(i)).style.display = "block";
                this._openParent(lis.item(i));
            }
        }
    }

    public search(search: string) {
        console.log("searching for ", search);
        this._showAll();
        let lis: NodeListOf<Element> = this._vtree.querySelectorAll(".treeFile, .treeFolderOpen");
        for (let i = 0; i < lis.length; i++) {
            let t: string = lis.item(i).childNodes[1].textContent;
            if (t.indexOf(search) >= 0) {
                this._highLight(<HTMLElement>lis.item(i).childNodes[1]);
                lis.item(i).scrollIntoView();
            }
        }
    }

    private _hideAll() {
        //let lis: NodeListOf<HTMLElement>=this._vtree.getElementsByTagName("li");
        let lis: HTMLCollectionOf<HTMLElement> = this._vtree.getElementsByTagName("li");
        for (let i = 0; i < lis.length; i++) {
            lis.item(i).style.display = "none";
        }
    }

    private _showAll() {
        //let e: NodeListOf<Element>;
        let e: HTMLCollectionOf<Element>;
        e = this._vtree.getElementsByTagName("li");
        for (let i = 0; i < e.length; i++) {
            (<HTMLElement>e.item(i)).style.display = "block";
        }
        e = this._vtree.getElementsByTagName("ul");
        for (let i = 0; i < e.length; i++) {
            e.item(i).setAttribute("class", "show");
        }
        e = this._vtree.getElementsByClassName("treeFolderClose");
        for (let i = e.length - 1; i >= 0; i--) {
            e.item(i).setAttribute("class", "treeFolderOpen");
        }

        //note: we need to loop twice
        e = this._vtree.getElementsByClassName(this._closeIcon);
        for (let i = e.length - 1; i >= 0; i--) {
            e.item(i).innerHTML = this._openIconTxt;
        }
        e = this._vtree.getElementsByClassName(this._closeIcon);
        for (let i = e.length - 1; i >= 0; i--) {
            e.item(i).setAttribute("class", this._openIcon);
        }

    }

    private _openParent(e: Element) {
        while (e.parentElement != this._vtree) {
            if (e.parentElement instanceof HTMLUListElement) {
                e.parentElement.setAttribute("class", "show");
                e.parentElement.parentElement.setAttribute("class", "treeFolderOpen");
                e.parentElement.parentElement.style.display = "block";
                e.parentElement.parentElement.firstElementChild.setAttribute("class", this._openIcon);
            }
            e = e.parentElement;
        }
    }

    public expandAll() {
        //let nl: NodeListOf<Element>;
        let nl: HTMLCollectionOf<Element>;
        //NOTE 
        //the for loop is descending.
        //This is because NodeListAll returned by getElementsByClassName is "live"
        //If the class is changed then the list of elements also change immediately
        //so for example the e.length will keep change with each itertaion in the loop

        nl = this._vtree.getElementsByClassName("treeFolderClose");
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).setAttribute("class", "treeFolderOpen");
        }

        nl = this._vtree.getElementsByClassName("hide");
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).setAttribute("class", "show");
        }

        //note: we need to loop twice
        nl = this._vtree.getElementsByClassName(this._closeIcon);
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).innerHTML = this._openIconTxt;
        }
        nl = this._vtree.getElementsByClassName(this._closeIcon);
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).setAttribute("class", this._openIcon);
        }


    }

    public collapseAll() {
        //let nl: NodeListOf<Element>;
        let nl: HTMLCollectionOf<Element>;
        //NOTE 
        //the for loop is descending.
        //This is because NodeListAll returned by getElementsByClassName is "live"
        //If the class is changed then the list of elements also change immediately
        //so for example the e.length will keep change with each itertaion in the loop

        nl = this._vtree.getElementsByClassName("treeFolderOpen");
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).setAttribute("class", "treeFolderClose");
        }

        nl = this._vtree.getElementsByClassName("show");
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).setAttribute("class", "hide");
        }

        //note: we need to loop twice
        nl = this._vtree.getElementsByClassName(this._openIcon);
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).innerHTML = this._closeIconTxt;
        }
        nl = this._vtree.getElementsByClassName(this._openIcon);
        for (let i = nl.length - 1; i >= 0; i--) {
            nl.item(i).setAttribute("class", this._closeIcon);
        }
    }

    private _re: RegExp;
    private _create() {
        if (this._filter != null) {
            try {
                this._re = new RegExp(this._filter);
            } catch (e) {
                console.error("invalid reqular expression " + this._filter + ". Will ignore");
                this._re = null;
            }
        } else this._re = null;

        this._vtree = document.createElement("ul");
        this._buildUL(this._vtree, this._treeData);

        this._vtree.onclick = (e) => {
            return this._treeClick(e);
        }
        this._treeEle.appendChild(this._vtree);

    }
    /**
     * <ul>
     *      <li> file class
     *          <span> icon
     *          <span> text
     *      <li> folder class
     *          <span> icon
     *          <span> text
     *          <ul>  show/hide class
     *              <li>...
     *          </ul>
     *      ...
     * </ul>
     * 
     * @param pUL 
     * @param nodes 
     */
    private _buildUL(pUL: HTMLUListElement, nodes: Array<string | Object>) {
        let li: HTMLLIElement;
        let span: HTMLSpanElement;
        //let txt: Text;
        let txt: HTMLSpanElement;
        let ul: HTMLUListElement;
        let icon: string;
        let c1, c2, t: string;
        if (this._open) {
            icon = this._openIcon;
            c1 = "treeFolderOpen";
            c2 = "show";
            t = this._openIconTxt;
        } else {
            icon = this._closeIcon;
            c1 = "treeFolderClose";
            c2 = "hide";
            t = this._closeIconTxt;
        }

        for (let node of nodes) {
            li = document.createElement("li");
            span = document.createElement("span");
            if (typeof node == 'object') {
                li.setAttribute("class", c1);

                span.setAttribute("class", icon);
                span.style.display = "inline-block";
                span.innerText = t;
                li.appendChild(span);

                //txt=document.createTextNode(node["d"]);
                txt = document.createElement("span");
                txt.className = "txt";
                txt.innerText = node["d"];
                li.appendChild(txt);

                ul = document.createElement("ul");
                ul.setAttribute("class", c2);
                li.appendChild(ul);

                pUL.appendChild(li);

                this._buildUL(ul, node["f"]);
            } else {
                li.setAttribute("class", "treeFile");
                if ((this._re != null) && (!this._re.test(node))) {
                    li.style.display = "none";
                }

                span.setAttribute("class", this._leafIcon);
                span.style.display = "inline-block";
                span.innerText = this._fileIconTxt;
                li.appendChild(span);

                //txt=document.createTextNode(node);
                txt = document.createElement("span");
                txt.className = "txt";
                txt.innerText = node;
                li.appendChild(txt);

                pUL.appendChild(li);

            }
        }
    }

    public onClose(e: Event, ui: Object) {
        if (this.prevEle != null) {
            this.prevEle.style.backgroundColor = "transparent";
            this.prevEle.style.color = "white";
        }
    }

    prevEle: HTMLElement = null;
    private _treeClick(e: MouseEvent) {
        let icon: boolean = false;
        let ele: HTMLElement = <HTMLElement>e.target;
        let pe: HTMLElement = ele.parentElement;
        if (ele instanceof HTMLSpanElement) {
            if (ele.className != "txt") {
                icon = true;
            }
        } else {
            return;
        }
        let c: string = pe.getAttribute("class");
        //if icon clicked then just expand/collapse
        //else find what was clicked and pass that on
        if (icon) {
            if (c == "treeFolderOpen") {
                pe.setAttribute("class", "treeFolderClose");
                pe.firstElementChild.setAttribute("class", this._closeIcon);
                pe.firstElementChild.innerHTML = this._closeIconTxt;
                pe.lastElementChild.setAttribute("class", "hide");
            } else if (c == "treeFolderClose") {
                pe.setAttribute("class", "treeFolderOpen");
                pe.firstElementChild.setAttribute("class", this._openIcon);
                pe.firstElementChild.innerHTML = this._openIconTxt;
                pe.lastElementChild.setAttribute("class", "show");
            }
        } else {
            ele.style.backgroundColor = "white";
            ele.style.color = "black";
            if (this.prevEle != null) {
                this.prevEle.style.backgroundColor = "transparent";
                this.prevEle.style.color = "white";
            }
            this.prevEle = ele;

            let node: string = null;
            let path: string = "";
            let isLeaf: boolean = false;
            if (c == "treeFile") {
                isLeaf = true;
            }
            //node=ele.childNodes[1].textContent;
            node = ele.innerText;
            while (pe != null) {
                if (pe.parentElement instanceof HTMLLIElement) {
                    path = pe.parentElement.childNodes[1].textContent + "/" + path
                }
                if (pe instanceof HTMLDivElement) {
                    pe = null;
                } else {
                    pe = pe.parentElement;

                }
            }
            if (this._clickListener != null) {
                this._clickListener(node, path, isLeaf);
            }
        }
    }

    private _highLight(ele: HTMLElement) {
        if (this.prevEle != null) {
            this.prevEle.style.backgroundColor = "transparent";
            this.prevEle.style.color = "white";
        }
        this.prevEle = ele;
        ele.style.backgroundColor = "white";
        ele.style.color = "black";

    }

}



