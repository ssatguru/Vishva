namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    /**
     * Provides a UI to add item to the world
     */
    export class AddItemUI {

        private _vishva: Vishva;
        private _addItemsDiag: VDialog;

        constructor(vishva: Vishva) {
            this._vishva=vishva;
            this._updateAddItemsTable();
            this._addItemsDiag=new VDialog("addItemsDiv","Add items",DialogMgr.leftCenter);
        }
        
        public toggle(){
            if (this._addItemsDiag.isOpen()){
                this._addItemsDiag.close();
            }else{
                this._addItemsDiag.open();
            }
        }

        private _updateAddItemsTable() {
            let tbl: HTMLTableElement=<HTMLTableElement>document.getElementById("addItemTable");
            tbl.onclick=(e) => {return this._onAssetTypeClick(e)};
            let l: number=tbl.rows.length;
            for(var i: number=l-1;i>=0;i--) {
                tbl.deleteRow(i);
            }

            var assetTypes: string[]=Object.keys(this._vishva.assets);
            for(let assetType of assetTypes) {
                if(assetType==="sounds") {
                    continue;
                }
                let row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
                let cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                cell.innerText=assetType;
            }
        }
        
        private _assetDiagMap:Object = {};
        private _onAssetTypeClick(e: MouseEvent) {
            let cell: HTMLTableCellElement=<HTMLTableCellElement>e.target;
            if(!(cell instanceof HTMLTableCellElement)) return;
            let assetType: string=cell.innerHTML;
            let assetDialog:VDialog = this._assetDiagMap[assetType]
            if (assetDialog==null){
                assetDialog=this._createAssetDiag(assetType);
                this._assetDiagMap[assetType]=assetDialog;
            }
            assetDialog.open();
            return true;
        }
        
        private _createAssetDiag(assetType: string): VDialog {
            let div: HTMLDivElement=document.createElement("div");
            div.id=assetType+"Div";
            div.setAttribute("title",assetType);
            let table: HTMLTableElement=document.createElement("table");
            table.id=assetType+"Tbl";
            let items: Array<string>=<Array<string>>this._vishva.assets[assetType];
            this._updateAssetTable(table,assetType,items);
            div.appendChild(table);
            document.body.appendChild(div);

            let assetDiag: VDialog=new VDialog(div.id,assetType,DialogMgr.centerBottom,"95%","auto");
            return assetDiag;
        }

        private _updateAssetTable(tbl: HTMLTableElement,assetType: string,items: Array<string>) {
            if(tbl.rows.length>0) {
                return;
            }
            var f: (p1: MouseEvent) => any=(e) => {return this._onAssetImgClick(e)};
            var row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
            for(let item of items) {
                let img: HTMLImageElement=document.createElement("img");
                img.id=item;
                //img.src = "vishva/assets/" + assetType + "/" + item + "/" + item + ".jpg";
                let name: string=item.split(".")[0];
                img.src="vishva/assets/"+assetType+"/"+name+"/"+name+".jpg";
                img.setAttribute("style",VishvaGUI.SMALL_ICON_SIZE+"cursor:pointer;");
                img.className=assetType;
                img.onclick=f;
                var cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                cell.appendChild(img);
            }
            var row2: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
            for(let item of items) {
                let cell: HTMLTableCellElement=<HTMLTableCellElement>row2.insertCell();
                cell.innerText=item;
            }
        }

        private _onAssetImgClick(e: Event): any {
            var i: HTMLImageElement=<HTMLImageElement>e.target;
            if(i.className==="skyboxes") {
                this._vishva.setSky(i.id);
            } else if(i.className==="primitives") {
                this._vishva.addPrim(i.id);
            } else if(i.className==="water") {
                this._vishva.createWater();
            } else {
                this._vishva.loadAsset(i.className,i.id);
            }
            return true;
        }
    }
}