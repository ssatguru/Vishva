namespace org.ssatguru.babylonjs.vishva.gui {
    import AbstractMesh=BABYLON.AbstractMesh;
    /**
     * Provides a UI to add item to the world
     */
    export class AddItemUI2 {

        private _vishva: Vishva;
        private _addItemsDiag: VDialog;

        constructor(vishva: Vishva) {
            this._vishva=vishva;
            this.updateAddItemsUL();
            this._addItemsDiag=new VDialog("addItemsDiv2","Add items",DialogMgr.leftCenter,300,500);
        }

        public toggle() {
            if(this._addItemsDiag.isOpen()) {
                this._addItemsDiag.close();
            } else {
                this._addItemsDiag.open();
            }
        }

        private updateAddItemsUL() {
            let ul: HTMLUListElement=<HTMLUListElement>document.getElementById("addItemUL");
            let files: Array<string|Object>=this._vishva.vishvaFiles;
            this.buildUL(ul,files);
            
            ul.onclick=(e)=>{
                return this.treeClick(e);
            }
        }

        
        private buildUL(pUL: HTMLUListElement,files: Array<string|Object>) {
            let li: HTMLLIElement;
            let ul: HTMLUListElement;
            for(let file of files) {
                li=document.createElement("li");
                if(typeof file=='object') {
                    li.innerText=file["d"];
                    li.setAttribute("class","treeFolder");
                    pUL.appendChild(li);
                    ul=document.createElement("ul");
                    ul.setAttribute("class","hide");
                    li.appendChild(ul);
                    this.buildUL(ul,file["f"]);
                } else {
                    if (file.indexOf(".babylon")>0||file.indexOf(".obj")>0||file.indexOf(".glb")>0){
                        li.setAttribute("class","treeFile");
                        li.innerText=file;
                        pUL.appendChild(li);
                    }
                }
            }
        }
        
        private treeClick(e:MouseEvent){
            let ele:HTMLElement = <HTMLElement>e.target;
            console.log(ele.firstChild.textContent);
            let c:string=ele.getAttribute("class");
            if (c=="treeFolder"){
                ele.setAttribute("class","treeFolderClose");
                ele.firstElementChild.setAttribute("class","show");
            }else if (c=="treeFolderClose"){
                ele.setAttribute("class","treeFolder");
                ele.firstElementChild.setAttribute("class","hide");
            }else if (c=="treeFile"){
                let file:string=ele.firstChild.textContent;
                let path:string="";
                while(ele != null){
                    if (ele.parentElement instanceof HTMLLIElement){
                        path=ele.parentElement.firstChild.textContent+"/"+path
                    }
                    if(ele instanceof HTMLDivElement){
                        ele=null;
                    }else{
                        ele=ele.parentElement;
                    }
                }
                console.log(path + file);
                this._vishva.loadAsset2(path,file);
            }
        }
    }
}