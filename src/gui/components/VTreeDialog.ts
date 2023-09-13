
import { Vishva } from "../../Vishva";
import { VTree } from "./VTree";
import { VInputText } from "./VInputText";
import { VButton } from "./VButton";
import { UIConst } from "../UIConst";
import { VDiag } from "./VDiag";

/**
 * Provides a UI to display a tree
 */
export class VTreeDialog {

    private _vishva: Vishva;
    private _tree: VTree;
    private _treeDiag: VDiag;
    private _refreshHandler: () => void;

    private _diagHtml: string = `
        <div>
            <div style="padding:.25em;">
                <span style="vertical-align:middle;"></span>
                <button title="filter"><span class="material-icons-outlined">search</span></button>
                <button title="expand"><span class="material-icons-outlined">add</span></button>
                <button title="collapse"><span class="material-icons-outlined">remove</span></button>
                <button title="refresh"><span class="material-icons-outlined">refresh</span></button>
            </div>
        </div>
        <div style="height:32em; width:100%; margin-top:1em; margin-bottom:1em; padding-right:1em; overflow:auto;display:block">
        </div>
        `;

    constructor(vishva: Vishva, diagTitle: string, pos: string, treeData: Array<string | object>, filter?: string, openAll?: boolean) {
        this._vishva = vishva;

        let diagDiv: HTMLDivElement = document.createElement("div");
        diagDiv.style.cssText = "overflow-y:hidden;display:block;width:100%;margin:0px:padding:0px";
        diagDiv.innerHTML = this._diagHtml;
        VButton.styleThem(diagDiv.getElementsByTagName("button"));
        document.body.appendChild(diagDiv);

        let treeDiv: HTMLDivElement = <HTMLDivElement>diagDiv.lastElementChild;//.getElementsByTagName("div")[1];
        this._treeDiag = new VDiag(diagDiv, diagTitle, pos, UIConst._diagWidth);
        //this._treeDiag.setResizable(true);
        this._tree = new VTree(treeDiv, treeData, filter, openAll);
        //this._treeDiag.onClose((e,ul)=>{this._tree.onClose(e,ul);});

        let fi: VInputText = new VInputText();
        fi.appendTo(diagDiv.getElementsByTagName("span")[0]);
        let btns: HTMLCollectionOf<HTMLButtonElement> = diagDiv.getElementsByTagName("button");
        let fb: HTMLButtonElement = btns.item(0);
        let e: HTMLButtonElement = btns.item(1);
        let c: HTMLButtonElement = btns.item(2);
        let r: HTMLButtonElement = btns.item(3);


        fi.onChange = () => {
            this._tree.filter(fi.getValue().trim());
        }
        fb.onclick = () => {
            this._tree.filter(fi.getValue().trim());
        }
        e.onclick = () => {
            this._tree.expandAll();
        }
        c.onclick = () => {
            this._tree.collapseAll();
        }
        r.onclick = () => {
            this._refreshHandler();
        }


    }

    public addTreeListener(treeListener: (leaf: string, path: string, isLeaf: boolean) => void = null) {
        this._tree.addClickListener(treeListener);
    }

    public addRefreshHandler(refreshHandler: () => void) {
        this._refreshHandler = refreshHandler;
    }

    public toggle() {
        if (this._treeDiag.isOpen()) {
            this._treeDiag.close();
        } else {
            this._treeDiag.open();
        }
    }

    public setModal(b: boolean) {
        //this._treeDiag.setModal(b);
    }

    public open() {
        this._treeDiag.open();
    }

    public onOpen(f: () => void) {
        this._treeDiag.onOpen(f);
    }

    public isOpen(): boolean {
        return this._treeDiag.isOpen();
    }
    public close() {
        this._treeDiag.close();
    }
    public refresh(treeData: Array<string | object>) {
        this._tree.refresh(treeData);
    }
    public filter(filter: string) {
        this._tree.filter(filter);
    }
    public search(filter: string) {
        this._tree.search(filter);
    }


}
