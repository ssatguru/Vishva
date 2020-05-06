
import JQueryPositionOptions = JQueryUI.JQueryPositionOptions;
import { Vishva } from "../../Vishva";
import { VDialog } from "./VDialog";
import { VTree } from "./VTree";
import { VInputText } from "./VInputText";
/**
 * Provides a UI to display a tree
 */
export class VTreeDialog {

    private _vishva: Vishva;
    private _tree: VTree;
    private _treeDiag: VDialog;
    private _refreshHandler: () => void;

    private _diagHtml: string = '<div style="vertical-align:middle">search <span style="padding-right: 1ch;"></span>'
        + '<button ><span class="ui-icon ui-icon-search" title="filter"></span></button>'
        + '</div>'
        + '<hr>'
        + '<div style="height:400px;width:100%;overflow-y:auto;border-style:solid;border-color:white;display:block">'
        + '</div>'
        + '<hr>'
        + '<button><span class="ui-icon ui-icon-plus" title="expand all"></span></button>'
        + '<button><span class="ui-icon ui-icon-minus" title="collapse all"></span></button>'
        + '<button><span class="ui-icon ui-icon-refresh" title="refresh"></span></button>'

    constructor(vishva: Vishva, diagTitle: string, pos: JQueryPositionOptions, treeData: Array<string | object>, filter?: string, openAll?: boolean) {
        this._vishva = vishva;

        let diagDiv: HTMLDivElement = document.createElement("div");
        diagDiv.innerHTML = this._diagHtml;
        document.body.appendChild(diagDiv);

        let treeDiv: HTMLDivElement = diagDiv.getElementsByTagName("div")[1];

        this._treeDiag = new VDialog(diagDiv, diagTitle, pos, 300);
        this._treeDiag.setResizable(true);
        this._tree = new VTree(treeDiv, treeData, filter, openAll);
        //this._treeDiag.onClose((e,ul)=>{this._tree.onClose(e,ul);});

        //let fi: HTMLInputElement=diagDiv.getElementsByTagName("input")[0];
        let fi: VInputText = new VInputText(diagDiv.getElementsByTagName("span")[0]);
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
        $(fb).button();
        $(e).button();
        $(c).button();
        $(r).button();

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
        this._treeDiag.setModal(b);
    }

    public open() {
        this._treeDiag.open();
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


}
