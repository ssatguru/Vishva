namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * Creates an expandable/collapsible tree
     */
    export class VTree {

        private _treeEle: HTMLElement;
        private _treeData: Array<string|object>;
        private _filter: string;
        private _vtree: HTMLUListElement;
        private _open: boolean;

        //        private _closeIcon:string="ui-icon ui-icon-circle-triangle-e";
        //        private _openIcon:string="ui-icon ui-icon-circle-triangle-s";
        //        private _leafIcon:string="ui-icon ui-icon-blank";
        //        
        private _closeIcon: string="ui-icon ui-icon-folder-collapsed";
        private _openIcon: string="ui-icon ui-icon-folder-open";
        private _leafIcon: string="ui-icon ui-icon-document";

        constructor(treeEleID: string,treeData: Array<string|object>,filter?: string,open=false) {

            this._treeEle=document.getElementById(treeEleID);
            if(this._treeEle==null) {
                console.error("Unable to locate element "+treeEleID);
                return;
            }

            this._treeData=treeData;
            this._filter=filter;
            this._open=open;

            //delete any existing tree
            let childULs: NodeListOf<HTMLUListElement>=this._treeEle.getElementsByTagName("ul");
            for(let i=0;i<childULs.length;i++) {
                if(childULs.item(i).id=="vtree") {
                    this._treeEle.removeChild(childULs.item(i));
                }
            }

            //create a new one
            this._create();

        }

        private _clickListener: (leaf: string,path: string,isLeaf: boolean) => void=null;
        public addClickListener(clickListener: (leaf: string,path: string,isLeaf: boolean) => void=null) {
            this._clickListener=clickListener;
        }

        public refresh(treeData: Array<string|object>,filter?: string) {
            this._treeEle.removeChild(this._vtree);
            this._treeData=treeData;
            this._filter=filter;
            this._create();
        }

        public filter(filter: string) {
            this._hideAll();
            let lis: NodeListOf<Element>=this._vtree.getElementsByClassName("treeFile");
            for(let i=0;i<lis.length;i++) {
                let t: string=lis.item(i).childNodes[1].textContent;
                if(filter.length==0||t.indexOf(filter)>=0) {
                    lis.item(i).setAttribute("style","display:block");
                    this._openParent(lis.item(i));
                }
            }
        }
        private _hideAll(){
            let lis: NodeListOf<Element>=this._vtree.getElementsByTagName("li");
             for(let i=0;i<lis.length;i++) {
                 lis.item(i).setAttribute("style","display:none");
             }
        }
        private _openParent(e:Element){
            while (e.parentElement!=this._vtree){
                if(e.parentElement instanceof HTMLUListElement){
                    e.parentElement.setAttribute("class","show");
                    e.parentElement.parentElement.setAttribute("class","treeFolderOpen");
                    e.parentElement.parentElement.setAttribute("style","display:block");
                    e.parentElement.parentElement.firstElementChild.setAttribute("class",this._openIcon);
                }
                e=e.parentElement;
            }
        }


        public expandAll() {
            let nl: NodeListOf<Element>;
            let a: Array<Element>;

            //NOTE 
            //NodeListAll is being converted to array.
            //This is because the list of elements returned by getElementsByClassName is "live"
            //If the class is changed then the list of elements also change immediately
            //so for example the e.length will keep change with each itertaion in the loop

            nl=this._vtree.getElementsByClassName("treeFolderClose");
            a=[].slice.call(nl);
            for(let e of a) {
                e.setAttribute("class","treeFolderOpen");
            }


            nl=this._vtree.getElementsByClassName("hide");
            a=[].slice.call(nl);
            for(let e of a) {
                e.setAttribute("class","show");
            }

            nl=this._vtree.getElementsByClassName(this._closeIcon);
            a=[].slice.call(nl);
            for(let e of a) {
                e.setAttribute("class",this._openIcon);
            }

        }
        
        public collapseAll() {
            let nl: NodeListOf<Element>;
            let a: Array<Element>;

            //NOTE 
            //NodeListAll is being converted to array.
            //This is because the list of elements returned by getElementsByClassName is "live"
            //If the class is changed then the list of elements also change immediately
            //so for example the e.length will keep change with each itertaion in the loop

            nl=this._vtree.getElementsByClassName("treeFolderOpen");
            a=[].slice.call(nl);
            for(let e of a) {
                e.setAttribute("class","treeFolderClose");
            }

            nl=this._vtree.getElementsByClassName("show");
            a=[].slice.call(nl);
            for(let e of a) {
                e.setAttribute("class","hide");
            }

            nl=this._vtree.getElementsByClassName(this._openIcon);
            a=[].slice.call(nl);
            for(let e of a) {
                e.setAttribute("class",this._closeIcon);
            }
        }

        private _re: RegExp;
        private _create() {
            if(this._filter!=null) {
                try {
                    this._re=new RegExp(this._filter);
                } catch(e) {
                    console.error("invalid reqular expression "+this._filter+". Will ignore");
                    this._re=null;
                }
            } else this._re=null;

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
            let icon: string;
            let c1,c2: string;
            if(this._open) {
                icon=this._openIcon;
                c1="treeFolderOpen";
                c2="show";
            } else {
                icon=this._closeIcon;
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
                    li.setAttribute("class","treeFile");
                    if((this._re!=null)&&(!this._re.test(node))) {
                        li.setAttribute("style","display:none;");
                    }

                    span.setAttribute("class",this._leafIcon);
                    span.setAttribute("style","display:inline-block");
                    li.appendChild(span);

                    txt=document.createTextNode(node);
                    li.appendChild(txt);

                    pUL.appendChild(li);

                }
            }
        }

        private _treeClick(e: MouseEvent) {
            let span: boolean=false;
            let ele: HTMLElement=<HTMLElement>e.target;
            if(ele instanceof HTMLSpanElement) {
                span=true;
                ele=ele.parentElement;
            }
            let c: string=ele.getAttribute("class");
            //if icon clicked then just expand/collapse
            //else find what was clicked and pass that on
            if(span) {
                if(c=="treeFolderOpen") {
                    ele.setAttribute("class","treeFolderClose");
                    ele.firstElementChild.setAttribute("class",this._closeIcon);
                    ele.lastElementChild.setAttribute("class","hide");
                } else if(c=="treeFolderClose") {
                    ele.setAttribute("class","treeFolderOpen");
                    ele.firstElementChild.setAttribute("class",this._openIcon);
                    ele.lastElementChild.setAttribute("class","show");
                }
            } else {
                let node: string=null;
                let path: string="";
                let isLeaf: boolean=false;
                if(c=="treeFile") {
                    isLeaf=true;
                }
                node=ele.childNodes[1].textContent;
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

                if(this._clickListener!=null) {
                    this._clickListener(node,path,isLeaf);
                }
            }
        }

    }
}


