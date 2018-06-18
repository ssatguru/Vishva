namespace org.ssatguru.babylonjs.vishva.gui {
    
    import Skeleton=BABYLON.Skeleton;
    import AnimationRange=BABYLON.AnimationRange;
    
    /**
     * Provides UI for the Animation (Skeleton) tab of mesh properties
     */
    export class AnimationUI {
        
        private _vishva:Vishva;
        
        private _animSelect: HTMLSelectElement=null;
        private _animRate: HTMLInputElement;
        private _animLoop: HTMLInputElement;
        private _skel: Skeleton;
        private _animSkelList: HTMLSelectElement;

       constructor(vishva:Vishva) {
           this._vishva=vishva;
           
            var animSkelChange: HTMLInputElement=<HTMLInputElement>document.getElementById("animSkelChange");
            var animSkelClone: HTMLInputElement=<HTMLInputElement>document.getElementById("animSkelClone");
            var animSkelView: HTMLInputElement=<HTMLInputElement>document.getElementById("animSkelView");
            var animRest: HTMLInputElement=<HTMLInputElement>document.getElementById("animRest");
            var animRangeName: HTMLInputElement=<HTMLInputElement>document.getElementById("animRangeName");
            var animRangeStart: HTMLInputElement=<HTMLInputElement>document.getElementById("animRangeStart");
            var animRangeEnd: HTMLInputElement=<HTMLInputElement>document.getElementById("animRangeEnd");
            var animRangeMake: HTMLButtonElement=<HTMLButtonElement>document.getElementById("animRangeMake");

            this._animSkelList=<HTMLSelectElement>document.getElementById("animSkelList");

            //change the mesh skeleton
            animSkelChange.onclick=(e) => {

                if(this._vishva.changeSkeleton(this._animSkelList.selectedOptions[0].value))
                    this.update();
                else DialogMgr.showAlertDiag("Error: unable to switch");
            }
            //clone the selected skeleton and swicth to it
            animSkelClone.onclick=(e) => {

                if(this._vishva.cloneChangeSkeleton(this._animSkelList.selectedOptions[0].value))
                    this.update();
                else DialogMgr.showAlertDiag("Error: unable to clone and switch");
            }

            //enable/disable skeleton view
            animSkelView.onclick=(e) => {
                this._vishva.toggleSkelView();
            }

            //show rest pose
            animRest.onclick=(e) => {
                this._vishva.animRest();
            }

            //create
            animRangeMake.onclick=(e) => {

                var name=animRangeName.value;
                var ars: number=parseInt(animRangeStart.value);
                if(isNaN(ars)) {
                    DialogMgr.showAlertDiag("from frame is not a number")
                }
                var are: number=parseInt(animRangeEnd.value);
                if(isNaN(are)) {
                    DialogMgr.showAlertDiag("to frame is not a number")
                }
                this._vishva.createAnimRange(name,ars,are)
                this._refreshAnimSelect();
            }


            //select
            this._animSelect=<HTMLSelectElement>document.getElementById("animList");
            this._animSelect.onchange=(e) => {
                var animName: string=this._animSelect.value;
                if(animName!=null) {
                    var range: AnimationRange=this._skel.getAnimationRange(animName);
                    document.getElementById("animFrom").innerText=(<number>new Number(range.from)).toString();
                    document.getElementById("animTo").innerText=(<number>new Number(range.to)).toString();
                }
                return true;
            };

            //play
            this._animRate=<HTMLInputElement>document.getElementById("animRate");
            this._animLoop=<HTMLInputElement>document.getElementById("animLoop");
            document.getElementById("playAnim").onclick=(e) => {
                if(this._skel==null) return true;
                let animName: string=this._animSelect.value;
                let rate: string=this._animRate.value;
                if(animName!=null) {
                    this._vishva.playAnimation(animName,rate,this._animLoop.checked);
                }
                return true;
            };
             document.getElementById("stopAnim").onclick=(e) => {
                if(this._skel==null) return true;
                this._vishva.stopAnimation();
                return true;
            };
            document.getElementById("delAnim").onclick=(e) => {
                if(this._skel==null) return true;
                let animName: string=this._animSelect.value;
                this._vishva.delAnimRange(animName);
                this._refreshAnimSelect();
                return true;
            };
           
            
        }

        //        private createAnimDiag() {
        //            this.initAnimUI();
        //            this.meshAnimDiag = $("#meshAnimDiag");
        //            var dos: DialogOptions = {};
        //            dos.autoOpen = false;
        //            dos.modal = false;
        //            dos.resizable = false;
        //            dos.width = "auto";
        //            dos.height = (<any>"auto");
        //            dos.closeOnEscape = false;
        //            dos.closeText = "";
        //            dos.close = (e, ui) => {
        //                this.vishva.switchDisabled = false;
        //            };
        //            this.meshAnimDiag.dialog(dos);
        //        }

        public update() {
            //this.vishva.switchDisabled = true;
            this._skel=this._vishva.getSkeleton();
            var skelName: string;
            if(this._skel==null) {
                skelName="NO SKELETON";
            } else {
                skelName=this._skel.name.trim();
                if(skelName==="") skelName="NO NAME";
                skelName=skelName+" ("+this._skel.id+")";
            }
            document.getElementById("skelName").innerText=skelName;

            this._refreshAnimSelect();
            this._refreshAnimSkelList();
        }
        /**
         * refresh the list of animation ranges
         */
        private _refreshAnimSelect() {
            var childs: HTMLCollection=this._animSelect.children;
            var l: number=(<number>childs.length|0);
            for(var i: number=l-1;i>=0;i--) {
                childs[i].remove();
            }

            var range: AnimationRange[]=this._vishva.getAnimationRanges();
            if(range!=null) {
                var animOpt: HTMLOptionElement;
                for(let ar of range) {
                    //if a range is deleted using skeleton.deleteAnimationRange , it shows up as null !!
                    if (ar==null ) continue;
                    animOpt=document.createElement("option");
                    animOpt.value=ar.name;
                    animOpt.innerText=ar.name;
                    this._animSelect.appendChild(animOpt);
                }

                if(range[0]!=null) {
                    document.getElementById("animFrom").innerText=(<number>new Number(range[0].from)).toString();
                    document.getElementById("animTo").innerText=(<number>new Number(range[0].to)).toString();
                } else {
                    document.getElementById("animFrom").innerText="";
                    document.getElementById("animTo").innerText="";
                }
            } else {
                document.getElementById("animFrom").innerText="";
                document.getElementById("animTo").innerText="";
            }
        }

        /**
         * refresh list of skeletons shown in animation tab
         */
        private _refreshAnimSkelList() {
            var childs: HTMLCollection=this._animSkelList.children;
            var l: number=(<number>childs.length|0);
            for(var i: number=l-1;i>=0;i--) {
                childs[i].remove();
            }

            var skels: Skeleton[]=this._vishva.getSkeltons();
            var opt: HTMLOptionElement;
            //NOTE:skel id is not unique
            for(let skel of skels) {
                opt=document.createElement("option");
                opt.value=skel.id+"-"+skel.name;
                opt.innerText=skel.name+" ("+skel.id+")";
                this._animSkelList.appendChild(opt);
            }
        }
    }
}