namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * Creates an expandable/collapsible tree
     */
    export class VTree{
        
        private _treeEle:HTMLElement;
        private _treeData:Array<string| object>;
        private _filter:string;
        private _vtree:HTMLUListElement;
        private _open:boolean;
        
        constructor( treeEleID:string,treeData:Array<string| object>,filter?:string,open=false){
            
            this._treeEle=document.getElementById(treeEleID);
            if (this._treeEle==null){
                console.error("Unable to locate element " + treeEleID);
                 return;
            }
            
            this._treeData=treeData;
            this._filter=filter;
            this._open=open;
            
            //delete any existing tree
            let childULs:NodeListOf<HTMLUListElement>=this._treeEle.getElementsByTagName("ul");
            for(let i=0;i<childULs.length;i++){
                if (childULs.item(i).id=="vtree"){
                    this._treeEle.removeChild(childULs.item(i));
                }
            }
            
            //create a new one
            this._create();
            
        }
        
        private _clickListener: (leaf:string, path:string) => void=null;
        public addClickListener(clickListener:(leaf:string, path:string) => void=null){
            this._clickListener=clickListener;
        }
        
        public refresh(treeData:Array<string| object>,filter?:string){
            this._treeEle.removeChild(this._vtree);
            this._treeData=treeData;
            this._filter=filter;
            this._create();
        }
        
        public filter(filter:string){
            this.refresh(this._treeData,filter);
        }
        
        private _re:RegExp;
        private _create(){
            if (this._filter !=null){
                try{
                    this._re = new RegExp(this._filter);
                }catch(e){
                    console.error("invalid reqular expression " + this._filter + ". Will ignore");
                    this._re=null;
                }
            }else this._re=null;
            
            this._vtree=document.createElement("ul");
            this._buildUL(this._vtree,this._treeData);
            
            this._vtree.onclick=(e) => {
                return this._treeClick(e);
            }
            this._treeEle.appendChild(this._vtree);
            
        }
        
        private _buildUL(pUL: HTMLUListElement,nodes: Array<string|Object>) {
            let li: HTMLLIElement;
            let span: HTMLSpanElement;
            let txt: Text;
            let ul: HTMLUListElement;
            let icon:string;
            let c1,c2:string;
            if(this._open){
                icon="ui-icon ui-icon-folder-open";
                c1="treeFolderOpen";
                c2="show";
            }else{
                icon="ui-icon ui-icon-folder-collapsed";
                c1="treeFolderClose";
                c2="hide";
            }

            for(let node of nodes) {
                li=document.createElement("li");
                span=document.createElement("span");
                if(typeof node=='object') {
                    li.setAttribute("class",c1);

                    span.setAttribute("class",icon);
                    span.setAttribute("style","display:inline-block");
                    li.appendChild(span);

                    txt=document.createTextNode(node["d"]);
                    li.appendChild(txt);

                    ul=document.createElement("ul");
                    ul.setAttribute("class",c2);
                    li.appendChild(ul);

                    pUL.appendChild(li);

                    this._buildUL(ul,node["f"]);
                } else {
                    if((this._re==null) || (this._re.test(node))) {
                        li.setAttribute("class","treeFile");

                        span.setAttribute("class","ui-icon ui-icon-document");
                        span.setAttribute("style","display:inline-block");
                        li.appendChild(span);

                        txt=document.createTextNode(node);
                        li.appendChild(txt);

                        pUL.appendChild(li);
                    }
                }
            }
        }

        private _treeClick(e: MouseEvent) {
            let ele: HTMLElement=<HTMLElement>e.target;
            let c: string=ele.getAttribute("class");
            let leaf:string=null;
            let path:string="";
            if(c=="treeFolderOpen") {
                ele.setAttribute("class","treeFolderClose");
                ele.firstElementChild.setAttribute("class","ui-icon ui-icon-folder-collapsed");
                ele.lastElementChild.setAttribute("class","hide");
            } else if(c=="treeFolderClose") {
                ele.setAttribute("class","treeFolderOpen");
                ele.firstElementChild.setAttribute("class","ui-icon ui-icon-folder-open");
                ele.lastElementChild.setAttribute("class","show");
            } else if(c=="treeFile") {
                leaf=ele.lastChild.textContent;
                while(ele!=null) {
                    if(ele.parentElement instanceof HTMLLIElement) {
                        path=ele.parentElement.childNodes[1].textContent+"/"+path
                    }
                    if(ele instanceof HTMLDivElement) {
                        ele=null;
                    } else {
                        ele=ele.parentElement;
                    }
                }
            }
            if(leaf!=null&&this._clickListener!=null){
                this._clickListener(leaf,path);
            }
        }
       
    }
}


