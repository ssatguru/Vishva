namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    /*
     * provides a user interface which list all meshes in the scene
     */
    export class ItemsUI {

        private _vishva: Vishva;
        private _itemsDiag: VDialog;
        private _itemTab: string="---- ";

        constructor(vishva: Vishva) {
            console.log("sceneitems");
            this._vishva=vishva;
            let itemsRefresh: HTMLElement=document.getElementById("itemsRefresh");
            itemsRefresh.onclick=() => {
                this._itemsDiag.close();
                this._updateItemsTable();
                this._itemsDiag.open();
            }

            this._itemsDiag=new VDialog("itemsDiv","Items",DialogMgr.leftCenter);
        }

        public toggle() {
            if(!this._itemsDiag.isOpen()) {
                this._updateItemsTable();
                this._itemsDiag.open();
            } else {
                this._itemsDiag.close();
            }
        }


        _prevCell: HTMLTableCellElement=null;
        private _onItemClick(e: MouseEvent) {
            let cell: HTMLTableCellElement=<HTMLTableCellElement>e.target;
            if(!(cell instanceof HTMLTableCellElement)) return;
            if(cell==this._prevCell) return;

            this._vishva.selectMesh(cell.id);
            cell.setAttribute("style","text-decoration: underline");
            if(this._prevCell!=null) {
                this._prevCell.setAttribute("style","text-decoration: none");
            }
            this._prevCell=cell;
        }
        /**
         * can be called when a user unselects a mesh by pressing esc
         */
        public clearPrevItem() {
            if(this._prevCell!=null) {
                this._prevCell.setAttribute("style","text-decoration: none");
                this._prevCell=null;
            }
        }

        private _updateItemsTable() {
            let tbl: HTMLTableElement=<HTMLTableElement>document.getElementById("itemsTable");
            tbl.onclick=(e) => {return this._onItemClick(e)};
            let l: number=tbl.rows.length;
            for(var i: number=l-1;i>=0;i--) {
                tbl.deleteRow(i);
            }
            let items: Array<AbstractMesh>=this._vishva.getMeshList();
            let meshChildMap: any=this._getMeshChildMap(items);
            let childs: Array<AbstractMesh>;
            for(let item of items) {
                if(item.parent==null) {
                    let row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
                    let cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                    cell.innerText=item.name;
                    cell.id=Number(item.uniqueId).toString();
                    childs=meshChildMap[item.uniqueId];
                    if(childs!=null) {
                        this._addChildren(childs,tbl,meshChildMap,this._itemTab);
                    }

                }
            }
        }

        private _addChildren(children: Array<AbstractMesh>,tbl: HTMLTableElement,meshChildMap: any,tab: string) {
            for(let child of children) {
                let row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
                let cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                cell.innerText=tab+child.name;
                cell.id=Number(child.uniqueId).toString();
                let childs: Array<AbstractMesh>=meshChildMap[child.uniqueId];
                if(childs!=null) {
                    this._addChildren(childs,tbl,meshChildMap,tab+this._itemTab);
                }
            }
        }

        private _getMeshChildMap(meshes: Array<AbstractMesh>) {
            let meshChildMap: any={};
            for(let mesh of meshes) {
                if(mesh.parent!=null) {
                    let childs: Array<AbstractMesh>=meshChildMap[mesh.parent.uniqueId];
                    if(childs==null) {
                        childs=new Array();
                        meshChildMap[mesh.parent.uniqueId]=childs;
                    }
                    childs.push(mesh);
                }
            }
            return meshChildMap;
        }

    }
}


