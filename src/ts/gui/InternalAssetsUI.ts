namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    
    /**
     * Provides a UI to add items from Internal Assets to the world
     */
    export class InternalAssetsUI {

        private _vishva: Vishva;
        private _assetDiagMap: Object={};
        private _vishvaFiles: Array<string|object>;

        constructor(vishva: Vishva) {
            this._vishva=vishva;
            this._vishvaFiles=Vishva.vishvaFiles;
        }

        public toggleAssetDiag(assetType: string) {
            let assetDialog: VDialog=this._assetDiagMap[assetType]
            if(assetDialog==null) {
                assetDialog=this._createAssetDiag(assetType);
                this._assetDiagMap[assetType]=assetDialog;
            }
            if(assetDialog.isOpen()) {
                assetDialog.close();
            } else {
                assetDialog.open();
            }
        }

        private _createAssetDiag(assetType: string): VDialog {
            let div: HTMLDivElement=document.createElement("div");
            div.id=assetType+"Div";
            div.setAttribute("title",assetType);
            let table: HTMLTableElement=document.createElement("table");
            table.id=assetType+"Tbl";
            let items: Array<string|object>=this._getFiles(["internal","assets",assetType],this._vishvaFiles);
            this._updateAssetTable(table,assetType,items);
            div.appendChild(table);
            document.body.appendChild(div);

            let assetDiag: VDialog=new VDialog(div.id,assetType,DialogMgr.centerBottom,"95%","auto");
            return assetDiag;
        }

        private _getFiles(path: string[],files: Array<string|object>): Array<string|object> {
            for(let file of files) {
                if(file instanceof Object) {
                    if(file["d"]==path[0]) {
                        if(path.length>1) {
                            path.splice(0,1);
                            return this._getFiles(path,file["f"]);
                        } else
                            return file["f"];
                    }
                }
            }
            return files;
        }


        private _updateAssetTable(tbl: HTMLTableElement,assetType: string,items: Array<string|object>) {
            if(tbl.rows.length>0) {
                return;
            }
            var f: (p1: MouseEvent) => any=(e) => {return this._onAssetImgClick(e)};
            var row: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
            for(let item of items) {
                let img: HTMLImageElement=document.createElement("img");
                img.id=item["d"];
                let name: string=item["d"];
                img.src="vishva/internal/assets/"+assetType+"/"+name+"/"+name+".jpg";
                img.setAttribute("style",VishvaGUI.SMALL_ICON_SIZE+"cursor:pointer;");
                img.className=assetType;
                img.onclick=f;
                var cell: HTMLTableCellElement=<HTMLTableCellElement>row.insertCell();
                cell.appendChild(img);
            }
            var row2: HTMLTableRowElement=<HTMLTableRowElement>tbl.insertRow();
            for(let item of items) {
                let cell: HTMLTableCellElement=<HTMLTableCellElement>row2.insertCell();
                cell.innerText=item["d"];
            }
        }

        private _onAssetImgClick(e: Event): any {
            var i: HTMLImageElement=<HTMLImageElement>e.target;
            if(i.className==="skyboxes") {
                this._vishva.setSky(i.id);
            } else if(i.className==="primitives") {
                this._vishva.addPrim(i.id);
            } else if(i.className==="particles") {
                //this._vishva.createWater();
                this._vishva.createParticles(i.id);
                console.log("particles clicked " + i.id);
            } else {
                this._vishva.loadAsset(i.className,i.id);
            }
            return true;
        }
    }
}