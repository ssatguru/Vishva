namespace org.ssatguru.babylonjs.vishva.gui {
    import DialogOptions=JQueryUI.DialogOptions;
    import Skeleton=BABYLON.Skeleton;
    import AnimationRange=BABYLON.AnimationRange;
    import Vector3=BABYLON.Vector3;
    /**
     * Provides UI to manage an Item(mesh) properties
     */
    export class ItemPropsUI {
        /**
         * Mesh properties section
         */
        private vishva: Vishva;
        private _vishvaGUI: VishvaGUI;
        private snaUI:SnaUI;
        
        private propsDiag: JQuery=null;
        private fixingDragIssue: boolean=false;
        private activePanel: number=-1;


        constructor(vishva: Vishva,vishvaGUI:VishvaGUI) {
            this.vishva=vishva;
            this._vishvaGUI=vishvaGUI;
        
            let propsAcc: JQuery=$("#propsAcc");

            propsAcc.accordion({
                animate: 100,
                heightStyle: "content",
                collapsible: true,
                activate: () => {
                    this.activePanel=propsAcc.accordion("option","active");
                },
                beforeActivate: (e,ui) => {
                    this.refreshPanel(this.getPanelIndex(ui.newHeader));

                }
            });

            //property dialog box
            this.propsDiag=$("#propsDiag");
            var dos: DialogOptions={
                autoOpen: false,
                resizable: false,
                position: DialogMgr.leftCenter,
                minWidth: 420,
                width: 420,
                // height: "auto",
                height: 650,
                closeOnEscape: false,
                //a) on open set the values of the fields in the active panel.
                //b) also if we switched from another mesh vishav will close open
                //by calling refreshPropsDiag()
                //c) donot bother refreshing values if we are just restarting
                //dialog for height and width re-sizing after drag
                open: (e,ui) => {
                    if(!this.fixingDragIssue) {
                        // refresh the active tab
                        this.activePanel=propsAcc.accordion("option","active");
                        this.refreshPanel(this.activePanel);
                        this.refreshingPropsDiag=false;
                    } else {
                        this.fixingDragIssue=false;
                    }
                },
                closeText: "",
                close: (e,ui) => {
                    if(!this.fixingDragIssue&&!this.refreshingPropsDiag&&(this.snaUI!=null)&&this.snaUI.isOpen()) {
                        this.snaUI.close();
                    }
                },
                //after drag the dialog box doesnot resize
                //force resize by closing and opening
                dragStop: (e,ui) => {
                    this.fixingDragIssue=true;
                    this.propsDiag.dialog("close");
                    this.propsDiag.dialog("open");
                }
            };
            this.propsDiag.dialog(dos);
            this.propsDiag["jpo"]=DialogMgr.leftCenter;
            this._vishvaGUI.dialogs.push(this.propsDiag);
        }
        
        public open(){
            this.propsDiag.dialog("open");
        }
        public isOpen():boolean{
            return this.propsDiag.dialog("isOpen");
        }
        public close(){
            this.propsDiag.dialog("close");
        }
        
        /*
         * called by vishva when editcontrol
         * is switched from another mesh
         */
        refreshingPropsDiag: boolean=false;
        public refreshPropsDiag() {
            if((this.propsDiag===undefined)||(this.propsDiag===null)) return;
            if(this.propsDiag.dialog("isOpen")===true) {
                this.refreshingPropsDiag=true;
                this.propsDiag.dialog("close");
                this.propsDiag.dialog("open");
            }
        }
        //only refresh if general panel is active;
        public refreshGeneralPanel() {
            if(this.activePanel===propertyPanel.General) this.refreshPropsDiag();
        }

        private getPanelIndex(ui: JQuery): number {
            if(ui.text()=="General") return propertyPanel.General;
            if(ui.text()=="Physics") return propertyPanel.Physics;
            if(ui.text()=="Material") return propertyPanel.Material;
            if(ui.text()=="Lights") return propertyPanel.Lights;
            if(ui.text()=="Animations") return propertyPanel.Animations;

        }

        private refreshPanel(panelIndex: number) {
            if(panelIndex===propertyPanel.General) {
                this.updateGeneral();
            } else if(panelIndex===propertyPanel.Lights) {
                this.updateLight();
            } else if(panelIndex===propertyPanel.Animations) {
                this.updateAnimations();
            } else if(panelIndex===propertyPanel.Physics) {
                this.updatePhysics()
            } else if(panelIndex===propertyPanel.Material) {
                this.updateMat();
            }
            //refresh sNaDialog if open
            if(this.snaUI!=null && this.snaUI.isOpen()) {
                this.snaUI.close();
                this.snaUI.show_sNaDiag();
            }
        }

        //meshAnimDiag: JQuery;
        animUIInitialized: boolean=false;
        animSelect: HTMLSelectElement=null;
        animRate: HTMLInputElement;
        animLoop: HTMLInputElement;
        skel: Skeleton;
        animSkelList: HTMLSelectElement;

        private initAnimUI() {
            this.animUIInitialized=true;
            var animSkelChange: HTMLInputElement=<HTMLInputElement>document.getElementById("animSkelChange");
            var animSkelClone: HTMLInputElement=<HTMLInputElement>document.getElementById("animSkelClone");
            var animSkelView: HTMLInputElement=<HTMLInputElement>document.getElementById("animSkelView");
            var animRest: HTMLInputElement=<HTMLInputElement>document.getElementById("animRest");
            var animRangeName: HTMLInputElement=<HTMLInputElement>document.getElementById("animRangeName");
            var animRangeStart: HTMLInputElement=<HTMLInputElement>document.getElementById("animRangeStart");
            var animRangeEnd: HTMLInputElement=<HTMLInputElement>document.getElementById("animRangeEnd");
            var animRangeMake: HTMLButtonElement=<HTMLButtonElement>document.getElementById("animRangeMake");

            this.animSkelList=<HTMLSelectElement>document.getElementById("animSkelList");

            //change the mesh skeleton
            animSkelChange.onclick=(e) => {

                if(this.vishva.changeSkeleton(this.animSkelList.selectedOptions[0].value))
                    this.updateAnimations();
                else DialogMgr.showAlertDiag("Error: unable to switch");
            }
            //clone the selected skeleton and swicth to it
            animSkelClone.onclick=(e) => {

                if(this.vishva.cloneChangeSkeleton(this.animSkelList.selectedOptions[0].value))
                    this.updateAnimations();
                else DialogMgr.showAlertDiag("Error: unable to clone and switch");
            }

            //enable/disable skeleton view
            animSkelView.onclick=(e) => {
                this.vishva.toggleSkelView();
            }

            //show rest pose
            animRest.onclick=(e) => {
                this.vishva.animRest();
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
                this.vishva.createAnimRange(name,ars,are)
                this.refreshAnimSelect();
            }


            //select
            this.animSelect=<HTMLSelectElement>document.getElementById("animList");
            this.animSelect.onchange=(e) => {
                var animName: string=this.animSelect.value;
                if(animName!=null) {
                    var range: AnimationRange=this.skel.getAnimationRange(animName);
                    document.getElementById("animFrom").innerText=(<number>new Number(range.from)).toString();
                    document.getElementById("animTo").innerText=(<number>new Number(range.to)).toString();
                }
                return true;
            };

            //play
            this.animRate=<HTMLInputElement>document.getElementById("animRate");
            this.animLoop=<HTMLInputElement>document.getElementById("animLoop");
            document.getElementById("playAnim").onclick=(e) => {
                if(this.skel==null) return true;
                var animName: string=this.animSelect.value;
                var rate: string=this.animRate.value;
                if(animName!=null) {
                    this.vishva.playAnimation(animName,rate,this.animLoop.checked);
                }
                return true;
            };
            document.getElementById("stopAnim").onclick=(e) => {
                if(this.skel==null) return true;
                this.vishva.stopAnimation();
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

        private updateAnimations() {
            //this.vishva.switchDisabled = true;
            if(!this.animUIInitialized) this.initAnimUI();
            this.skel=this.vishva.getSkeleton();
            var skelName: string;
            if(this.skel==null) {
                skelName="NO SKELETON";
            } else {
                skelName=this.skel.name.trim();
                if(skelName==="") skelName="NO NAME";
                skelName=skelName+" ("+this.skel.id+")";
            }
            document.getElementById("skelName").innerText=skelName;

            this.refreshAnimSelect();
            this.refreshAnimSkelList();
        }
        /**
         * refresh the list of animation ranges
         */
        private refreshAnimSelect() {
            var childs: HTMLCollection=this.animSelect.children;
            var l: number=(<number>childs.length|0);
            for(var i: number=l-1;i>=0;i--) {
                childs[i].remove();
            }

            var range: AnimationRange[]=this.vishva.getAnimationRanges();
            if(range!=null) {
                var animOpt: HTMLOptionElement;
                for(let ar of range) {
                    animOpt=document.createElement("option");
                    animOpt.value=ar.name;
                    animOpt.innerText=ar.name;
                    this.animSelect.appendChild(animOpt);
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
        private refreshAnimSkelList() {
            var childs: HTMLCollection=this.animSkelList.children;
            var l: number=(<number>childs.length|0);
            for(var i: number=l-1;i>=0;i--) {
                childs[i].remove();
            }

            var skels: Skeleton[]=this.vishva.getSkeltons();
            var opt: HTMLOptionElement;
            //NOTE:skel id is not unique
            for(let skel of skels) {
                opt=document.createElement("option");
                opt.value=skel.id+"-"+skel.name;
                opt.innerText=skel.name+" ("+skel.id+")";
                this.animSkelList.appendChild(opt);
            }
        }






        private toString(d: number): string {
            return (<number>new Number(d)).toFixed(2).toString();
        }


        genName: HTMLInputElement;
        genSpace: HTMLSelectElement;

        transRefresh: HTMLElement;
        transBake: HTMLElement;

        genOperTrans: HTMLElement;
        genOperRot: HTMLElement;
        genOperScale: HTMLElement;
        genOperFocus: HTMLElement;

        genLocX: HTMLInputElement;
        genLocY: HTMLInputElement;
        genLocZ: HTMLInputElement;
        genRotX: HTMLInputElement;
        genRotY: HTMLInputElement;
        genRotZ: HTMLInputElement;
        genScaleX: HTMLInputElement;
        genScaleY: HTMLInputElement;
        genScaleZ: HTMLInputElement;


        genSnapTrans: HTMLInputElement;
        genSnapRot: HTMLInputElement;
        genSnapScale: HTMLInputElement;

        genSnapTransValue: HTMLInputElement;
        genSnapRotValue: HTMLInputElement;
        genSnapScaleValue: HTMLInputElement;

        genDisable: HTMLInputElement;
        genColl: HTMLInputElement;
        genVisi: HTMLInputElement;

        private initGeneral() {
            //name
            this.genName=<HTMLInputElement>document.getElementById("genName");
            this.genName.onchange=() => {
                this.vishva.setName(this.genName.value);
            }

            //space
            this.genSpace=<HTMLSelectElement>document.getElementById("genSpace");
            this.genSpace.onchange=() => {
                let err: string=this.vishva.setSpace(this.genSpace.value);
                if(err!==null) {
                    DialogMgr.showAlertDiag(err);
                    this.genSpace.value=this.vishva.getSpace();
                }
            }

            //transforms
            if(this.transRefresh===undefined) {
                this.transRefresh=document.getElementById("transRefresh");
                this.transRefresh.onclick=() => {
                    this.updateTransform();
                    return false;
                }
            }
            if(this.transBake===undefined) {
                this.transBake=document.getElementById("transBake");
                this.transBake.onclick=() => {
                    this.vishva.bakeTransforms();
                    this.updateTransform();
                    return false;
                }
            }

            //edit controls
            this.genOperTrans=document.getElementById("operTrans");
            this.genOperRot=document.getElementById("operRot");
            this.genOperScale=document.getElementById("operScale");
            this.genOperFocus=document.getElementById("operFocus");

            this.genOperTrans.onclick=() => {
                this.vishva.setTransOn();
            }
            this.genOperRot.onclick=() => {
                this.vishva.setRotOn();
            }
            this.genOperScale.onclick=() => {
                this.vishva.setScaleOn();
                if(!this.vishva.isSpaceLocal()) {
                    DialogMgr.showAlertDiag("note that scaling doesnot work with global axis");
                }
            }
            this.genOperFocus.onclick=() => {
                this.vishva.setFocusOnMesh();
            }

            //Translation
            this.genLocX=<HTMLInputElement>document.getElementById("loc.x");
            this.genLocX.onchange=() => {
                this.vishva.setLocation(Number(this.genLocX.value),Number(this.genLocY.value),Number(this.genLocZ.value));
            }
            this.genLocY=<HTMLInputElement>document.getElementById("loc.y");
            this.genLocY.onchange=() => {
                this.vishva.setLocation(Number(this.genLocX.value),Number(this.genLocY.value),Number(this.genLocZ.value));
            }
            this.genLocZ=<HTMLInputElement>document.getElementById("loc.z");
            this.genLocZ.onchange=() => {
                this.vishva.setLocation(Number(this.genLocX.value),Number(this.genLocY.value),Number(this.genLocZ.value));
            }
            //Rotation
            this.genRotX=<HTMLInputElement>document.getElementById("rot.x");
            this.genRotX.onchange=() => {
                this.vishva.setRotation(Number(this.genRotX.value),Number(this.genRotY.value),Number(this.genRotZ.value));
            }
            this.genRotY=<HTMLInputElement>document.getElementById("rot.y");
            this.genRotY.onchange=() => {
                this.vishva.setRotation(Number(this.genRotX.value),Number(this.genRotY.value),Number(this.genRotZ.value));
            }
            this.genRotZ=<HTMLInputElement>document.getElementById("rot.z");
            this.genRotZ.onchange=() => {
                this.vishva.setRotation(Number(this.genRotX.value),Number(this.genRotY.value),Number(this.genRotZ.value));
            }
            //Scale
            this.genScaleX=<HTMLInputElement>document.getElementById("scl.x");
            this.genScaleX.onchange=() => {
                this.vishva.setScale(Number(this.genScaleX.value),Number(this.genScaleY.value),Number(this.genScaleZ.value));
            }
            this.genScaleY=<HTMLInputElement>document.getElementById("scl.y");
            this.genScaleY.onchange=() => {
                this.vishva.setScale(Number(this.genScaleX.value),Number(this.genScaleY.value),Number(this.genScaleZ.value));
            }
            this.genScaleZ=<HTMLInputElement>document.getElementById("scl.z");
            this.genScaleZ.onchange=() => {
                this.vishva.setScale(Number(this.genScaleX.value),Number(this.genScaleY.value),Number(this.genScaleZ.value));
            }

            //Snap CheckBox
            this.genSnapTrans=<HTMLInputElement>document.getElementById("snapTrans");
            this.genSnapTrans.onchange=() => {
                let err: string=this.vishva.snapTrans(this.genSnapTrans.checked);
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                    this.genSnapTrans.checked=false;
                }
            }
            this.genSnapRot=<HTMLInputElement>document.getElementById("snapRot");
            this.genSnapRot.onchange=() => {
                let err: string=this.vishva.snapRot(this.genSnapRot.checked);
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                    this.genSnapRot.checked=false;
                }
            }
            this.genSnapScale=<HTMLInputElement>document.getElementById("snapScale");
            this.genSnapScale.onchange=() => {
                let err: string=this.vishva.snapScale(this.genSnapScale.checked);
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                    this.genSnapScale.checked=false;
                }
            }

            //Snap Values
            this.genSnapTransValue=<HTMLInputElement>document.getElementById("snapTransValue");
            this.genSnapTransValue.onchange=() => {
                this.vishva.setSnapTransValue(Number(this.genSnapTransValue.value));
            }
            this.genSnapRotValue=<HTMLInputElement>document.getElementById("snapRotValue");
            this.genSnapRotValue.onchange=() => {
                this.vishva.setSnapRotValue(Number(this.genSnapRotValue.value));
            }
            this.genSnapScaleValue=<HTMLInputElement>document.getElementById("snapScaleValue");
            this.genSnapScaleValue.onchange=() => {
                this.vishva.setSnapScaleValue(Number(this.genSnapScaleValue.value));
            }

            //
            this.genDisable=<HTMLInputElement>document.getElementById("genDisable");
            this.genDisable.onchange=() => {
                this.vishva.disableIt(this.genDisable.checked);
            }
            this.genColl=<HTMLInputElement>document.getElementById("genColl");
            this.genColl.onchange=() => {
                this.vishva.enableCollision(this.genColl.checked);
            }
            this.genVisi=<HTMLInputElement>document.getElementById("genVisi");
            this.genVisi.onchange=() => {
                this.vishva.makeVisibile(this.genVisi.checked);
            }

            var undo: HTMLElement=document.getElementById("undo");
            var redo: HTMLElement=document.getElementById("redo");


            var parentMesh: HTMLElement=document.getElementById("parentMesh");
            var removeParent: HTMLElement=document.getElementById("removeParent");
            var removeChildren: HTMLElement=document.getElementById("removeChildren");

            var cloneMesh: HTMLElement=document.getElementById("cloneMesh");
            var instMesh: HTMLElement=document.getElementById("instMesh");
            var mergeMesh: HTMLElement=document.getElementById("mergeMesh");
            var subMesh: HTMLElement=document.getElementById("subMesh");
            var interMesh: HTMLElement=document.getElementById("interMesh");
            var downAsset: HTMLElement=document.getElementById("downMesh");
            var delMesh: HTMLElement=document.getElementById("delMesh");

            var swAv: HTMLElement=document.getElementById("swAv");
            var swGnd: HTMLElement=document.getElementById("swGnd");

            var sNa: HTMLElement=document.getElementById("sNa");
            //            var addWater: HTMLElement = document.getElementById("addWater");

            undo.onclick=(e) => {
                this.vishva.undo();
                return false;
            };
            redo.onclick=(e) => {
                this.vishva.redo();
                return false;
            };

            parentMesh.onclick=(e) => {
                var err: string=this.vishva.makeParent();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            removeParent.onclick=(e) => {
                var err: string=this.vishva.removeParent();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            removeChildren.onclick=(e) => {
                var err: string=this.vishva.removeChildren();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };

            cloneMesh.onclick=(e) => {
                var err: string=this.vishva.clone_mesh();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            instMesh.onclick=(e) => {
                var err: string=this.vishva.instance_mesh();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            mergeMesh.onclick=(e) => {
                var err: string=this.vishva.mergeMeshes();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };

            subMesh.onclick=(e) => {
                var err: string=this.vishva.csgOperation("subtract");
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            interMesh.onclick=(e) => {
                var err: string=this.vishva.csgOperation("intersect");
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            downAsset.onclick=(e) => {
                var downloadURL: string=this.vishva.saveAsset();
                if(downloadURL==null) {
                    DialogMgr.showAlertDiag("No Mesh Selected");
                    return true;
                }
                if(this._downloadDialog==null) this._createDownloadDiag();
                this._downloadLink.href=downloadURL;
                this._downloadDialog.dialog("open");
                return false;
            };
            delMesh.onclick=(e) => {
                var err: string=this.vishva.delete_mesh();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };

            swAv.onclick=(e) => {
                var err: string=this.vishva.switchAvatar();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return true;
            };
            swGnd.onclick=(e) => {
                var err: string=this.vishva.switchGround();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return true;
            };

            sNa.onclick=(e) => {
                if (this.snaUI==null){
                    this.snaUI=new SnaUI(this.vishva);
                }
                this.snaUI.show_sNaDiag();
                return true;
            };

            //            addWater.onclick = (e) => {
            //                var err: string = this.vishva.addWater()
            //                 if (err != null) {
            //                    DialogMgr.showAlertDiag(err);
            //                }
            //                return true;
            //            };
        }

        private updateGeneral() {
            if(this.genName===undefined) this.initGeneral();
            this.genName.value=this.vishva.getName();

            this.genSpace.value=this.vishva.getSpace();

            this.updateTransform();

            this.genDisable.checked=this.vishva.isDisabled();
            this.genColl.checked=this.vishva.isCollideable();
            this.genVisi.checked=this.vishva.isVisible();

        }

        private updateTransform() {

            var loc: Vector3=this.vishva.getLocation();
            var rot: Vector3=this.vishva.getRotation();
            var scl: Vector3=this.vishva.getScale();

            (<HTMLInputElement>document.getElementById("loc.x")).value=this.toString(loc.x);
            (<HTMLInputElement>document.getElementById("loc.y")).value=this.toString(loc.y);
            (<HTMLInputElement>document.getElementById("loc.z")).value=this.toString(loc.z);

            (<HTMLInputElement>document.getElementById("rot.x")).value=this.toString(rot.x);
            (<HTMLInputElement>document.getElementById("rot.y")).value=this.toString(rot.y);
            (<HTMLInputElement>document.getElementById("rot.z")).value=this.toString(rot.z);

            (<HTMLInputElement>document.getElementById("scl.x")).value=this.toString(scl.x);
            (<HTMLInputElement>document.getElementById("scl.y")).value=this.toString(scl.y);
            (<HTMLInputElement>document.getElementById("scl.z")).value=this.toString(scl.z);

        }

        lightAtt: HTMLInputElement;
        lightType: HTMLSelectElement;
        lightDiff: ColorPickerDiag;
        lightSpec: ColorPickerDiag;
        lightInten: HTMLInputElement;
        lightRange: HTMLInputElement;
        lightRadius: HTMLInputElement;
        lightAngle: HTMLInputElement;
        lightExp: HTMLInputElement;
        lightGndClr: HTMLInputElement;
        lightDirX: HTMLInputElement;
        lightDirY: HTMLInputElement;
        lightDirZ: HTMLInputElement;

        private initLightUI() {
            this.lightAtt=<HTMLInputElement>document.getElementById("lightAtt");
            this.lightType=<HTMLSelectElement>document.getElementById("lightType");
            this.lightDiff=new ColorPickerDiag("diffuse light","lightDiff","#ffffff",DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this.applyLight();
            });

            this.lightSpec=new ColorPickerDiag("specular light","lightSpec","#ffffff",DialogMgr.centerBottom,(hex,hsv,rgb) => {
                this.applyLight();
            });
            this.lightInten=<HTMLInputElement>document.getElementById("lightInten");
            this.lightRange=<HTMLInputElement>document.getElementById("lightRange");
            this.lightRadius=<HTMLInputElement>document.getElementById("lightAtt");
            this.lightAngle=<HTMLInputElement>document.getElementById("lightAngle");
            this.lightExp=<HTMLInputElement>document.getElementById("lightExp");
            this.lightGndClr=<HTMLInputElement>document.getElementById("lightGndClr");
            this.lightDirX=<HTMLInputElement>document.getElementById("lightDirX");
            this.lightDirY=<HTMLInputElement>document.getElementById("lightDirY");
            this.lightDirZ=<HTMLInputElement>document.getElementById("lightDirZ");

            this.lightAtt.onchange=() => {
                if(!this.lightAtt.checked) {
                    this.vishva.detachLight();
                } else this.applyLight();
            };
            this.lightType.onchange=() => this.applyLight();
            this.lightInten.onchange=() => this.applyLight();
            this.lightRange.onchange=() => this.applyLight();
            this.lightAngle.onchange=() => this.applyLight();
            this.lightExp.onchange=() => this.applyLight();
            this.lightDirX.onchange=() => this.applyLight();
            this.lightDirY.onchange=() => this.applyLight();
            this.lightDirZ.onchange=() => this.applyLight();


        }

        private updateLight() {
            if(this.lightAtt===undefined) this.initLightUI();
            let lightParm: LightParm=this.vishva.getAttachedLight();
            if(lightParm===null) {
                this.lightAtt.checked=false;
                lightParm=new LightParm();
            } else {
                this.lightAtt.checked=true;
            }
            this.lightType.value=lightParm.type;
            this.lightDiff.setColor(lightParm.diffuse.toHexString());
            this.lightSpec.setColor(lightParm.specular.toHexString());
            this.lightInten.value=Number(lightParm.intensity).toString();
            this.lightRange.value=Number(lightParm.range).toString();
            this.lightRadius.value=Number(lightParm.radius).toString();
            //this.lightAngle.value = Number(lightParm.angle * 180 / Math.PI).toString();
            this.lightAngle.value=Number(lightParm.angle).toString();
            this.lightExp.value=Number(lightParm.exponent).toString();
            this.lightGndClr.value=lightParm.gndClr.toHexString();
            this.lightDirX.value=Number(lightParm.direction.x).toString();
            this.lightDirY.value=Number(lightParm.direction.y).toString();
            this.lightDirZ.value=Number(lightParm.direction.z).toString();


        }

        private applyLight() {
            //            if (!this.lightAtt.checked) {
            //                this.vishva.detachLight();
            //                return;
            //            }
            if(!this.lightAtt.checked) return;
            let lightParm: LightParm=new LightParm();
            lightParm.type=this.lightType.value;
            lightParm.diffuse=BABYLON.Color3.FromHexString(this.lightDiff.getColor());
            lightParm.specular=BABYLON.Color3.FromHexString(this.lightSpec.getColor());
            lightParm.intensity=parseFloat(this.lightInten.value);
            lightParm.range=parseFloat(this.lightRange.value);
            lightParm.radius=parseFloat(this.lightRadius.value);
            lightParm.angle=parseFloat(this.lightAngle.value);
            lightParm.direction.x=parseFloat(this.lightDirX.value);
            lightParm.direction.y=parseFloat(this.lightDirY.value);
            lightParm.direction.z=parseFloat(this.lightDirZ.value);
            lightParm.exponent=parseFloat(this.lightExp.value);
            lightParm.gndClr=BABYLON.Color3.FromHexString(this.lightGndClr.value);
            this.vishva.attachAlight(lightParm);

        }

        matName: HTMLLabelElement;
        matVis: HTMLInputElement;
        matVisVal: HTMLElement;
        matColType: HTMLSelectElement;
        matTextType: HTMLSelectElement;
        matColDiag: ColorPickerDiag;
        matTexture: HTMLButtonElement;

        private initMatUI() {

            this.matName=<HTMLLabelElement>document.getElementById("matName");
            this.matName.innerText=this.vishva.getMaterialName();

            this.matVisVal=document.getElementById("matVisVal");
            this.matVis=<HTMLInputElement>document.getElementById("matVis");

            this.matColType=<HTMLSelectElement>document.getElementById("matColType");
            this.matColType.onchange=() => {
                let col: string=this.vishva.getMeshColor(this.matColType.value);
                this.matColDiag.setColor(col);
            }

            this.matTextType=<HTMLSelectElement>document.getElementById("matTextType");;

            this.matColDiag=new ColorPickerDiag("mesh color","matCol",this.vishva.getMeshColor(this.matColType.value),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                let err: string=this.vishva.setMeshColor(this.matColType.value,hex);
                if(err!==null) DialogMgr.showAlertDiag(err);

            });

            this.matVisVal["value"]="1.00";
            this.matVis.oninput=() => {
                this.matVisVal["value"]=Number(this.matVis.value).toFixed(2);
                this.vishva.setMeshVisibility(parseFloat(this.matVis.value));
            }

            this.matTexture=<HTMLButtonElement>document.getElementById("matTexture");
            this.matTexture.onclick=() => {
                console.log("checking texture");
                if(this.textureDiag==null) {
                    this.createTextureDiag();
                }
                this.textureImg.src=this.vishva.getMatTexture(this.matTextType.value);
                console.log(this.textureImg.src);
                this.textureDiag.dialog("open");
            }

        }

        private updateMat() {
            if(this.matVis==undefined) this.initMatUI();
            this.matVis.value=Number(this.vishva.getMeshVisibility()).toString();
            this.matVisVal["value"]=Number(this.matVis.value).toFixed(2);
            this.matColDiag.setColor(this.vishva.getMeshColor(this.matColType.value));
        }
        
        textureDiag: JQuery;
        textureImg: HTMLImageElement;
        private createTextureDiag() {
            this.textureDiag=$("#textureDiag");
            var dos: DialogOptions={
                autoOpen: false,
                resizable: false,
                width: "auto",
                closeOnEscape: false,
                closeText: ""
            };
            this.textureDiag.dialog(dos);
            this.textureDiag["jpo"]=DialogMgr.centerBottom;
            this._vishvaGUI.dialogs.push(this.textureDiag);

            this.textureImg=<HTMLImageElement>document.getElementById("textImg");
            let chgTexture: HTMLButtonElement=<HTMLButtonElement>document.getElementById("changeTexture");
            chgTexture.onclick=() => {
                this.vishva.setMatTexture(this.matTextType.value,textList.value);
            }
            let textList: HTMLSelectElement=<HTMLSelectElement>document.getElementById("textureList");
            var textures: string[]=this.vishva.getTextures();
            var opt: HTMLOptionElement;
            for(let text of textures) {
                opt=document.createElement("option");
                opt.value=text;
                opt.innerText=text;
                textList.appendChild(opt);
            }

        }

        phyEna: HTMLInputElement;
        phyType: HTMLSelectElement;
        phyMass: HTMLInputElement;
        phyResVal: HTMLElement;
        phyRes: HTMLInputElement;
        phyFricVal: HTMLElement;
        phyFric: HTMLInputElement;

        private initPhyUI() {
            this.phyEna=<HTMLInputElement>document.getElementById("phyEna");

            this.phyType=<HTMLSelectElement>document.getElementById("phyType");

            this.phyMass=<HTMLInputElement>document.getElementById("phyMass");

            this.phyRes=<HTMLInputElement>document.getElementById("phyRes");
            this.phyResVal=<HTMLElement>document.getElementById("phyResVal");
            this.phyResVal["value"]="0.0";
            this.phyRes.oninput=() => {
                this.phyResVal["value"]=this.formatValue(this.phyRes.value);
            }

            this.phyFric=<HTMLInputElement>document.getElementById("phyFric");
            this.phyFricVal=<HTMLElement>document.getElementById("phyFricVal");
            this.phyFricVal["value"]="0.0";
            this.phyFric.oninput=() => {
                this.phyFricVal["value"]=this.formatValue(this.phyFric.value);
            }

            let phyApply=<HTMLButtonElement>document.getElementById("phyApply");
            let phyTest=<HTMLButtonElement>document.getElementById("phyTest");
            let phyReset=<HTMLButtonElement>document.getElementById("phyReset");

            phyApply.onclick=(ev) => {
                this.applyPhysics();
                DialogMgr.showAlertDiag("physics applied");
                return false;
            }

            phyTest.onclick=(ev) => {
                this.testPhysics();
                return false;
            }

            phyReset.onclick=(ev) => {
                this.resetPhysics()
                return false;
            }
        }

        private formatValue(val: string) {
            if(val==="1") return "1.0";
            if(val==="0") return "0.0";
            return val;
        }

        private updatePhysics() {

            if(this.phyEna===undefined) this.initPhyUI();

            let phyParms: PhysicsParm=this.vishva.getMeshPickedPhyParms();
            if(phyParms!==null) {
                this.phyEna.setAttribute("checked","true");
                this.phyType.value=Number(phyParms.type).toString();
                this.phyMass.value=Number(phyParms.mass).toString();
                this.phyRes.value=Number(phyParms.restitution).toString();
                this.phyResVal["value"]=this.formatValue(this.phyRes.value);
                this.phyFric.value=Number(phyParms.friction).toString();
                this.phyFricVal["value"]=this.formatValue(this.phyFric.value);
            } else {
                this.phyEna.checked=false;
                //by default lets set the type to "box"
                this.phyType.value="2";
                this.phyMass.value="1";
                this.phyRes.value="0";
                this.phyResVal["value"]="0.0";
                this.phyFric.value="0";
                this.phyFricVal["value"]="0.0";
            }
        }

        private applyPhysics() {
            let phyParms: PhysicsParm;
            if(this.phyEna.checked) {
                phyParms=new PhysicsParm();
                phyParms.type=parseInt(this.phyType.value);
                phyParms.mass=parseFloat(this.phyMass.value);
                phyParms.restitution=parseFloat(this.phyRes.value);
                phyParms.friction=parseFloat(this.phyFric.value);
            } else {
                phyParms=null;
            }
            this.vishva.setMeshPickedPhyParms(phyParms);
        }

        private testPhysics() {
            let phyParms: PhysicsParm;

            phyParms=new PhysicsParm();
            phyParms.type=parseInt(this.phyType.value);
            phyParms.mass=parseFloat(this.phyMass.value);
            phyParms.restitution=parseFloat(this.phyRes.value);
            phyParms.friction=parseFloat(this.phyFric.value);

            this.vishva.testPhysics(phyParms);
        }

        private resetPhysics() {
            this.vishva.resetPhysics();
            /* End of Mesh Properties              */

        }
        
        
        _downloadDialog: JQuery;
        _downloadLink: HTMLAnchorElement;
        private _createDownloadDiag() {
            this._downloadLink=<HTMLAnchorElement>document.getElementById("downloadAssetLink");
            this._downloadDialog=<JQuery>(<any>$("#saveAssetDiv"));
            this._downloadDialog.dialog();
            this._downloadDialog.dialog("close");
        }
    }
    const enum propertyPanel {
        General,
        Physics,
        Material,
        Lights,
        Animations
    }
}


