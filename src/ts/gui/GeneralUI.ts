namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector3=BABYLON.Vector3;

    /**
     * Provides UI for the Genral tab of mesh properties
     */
    export class GeneralUI {

        private _vishva: Vishva;
        private _vishvaGUI: VishvaGUI;
        public _snaUI: SnaUI;
        private _addInternalAssetUI: InternalAssetsUI;

        private _genName: HTMLInputElement;
        private _genSpace: HTMLSelectElement;

        private _transRefresh: HTMLElement;
        private _transBake: HTMLElement;

        private _genOperTrans: HTMLElement;
        private _genOperRot: HTMLElement;
        private _genOperScale: HTMLElement;
        private _genOperFocus: HTMLElement;

       
        private _genLoc:VInputVector3;
        private _genRot:VInputVector3;
        private _genSize:VInputVector3;
        private _genScale:VInputVector3;

        private _genSnapTrans: HTMLInputElement;
        private _genSnapRot: HTMLInputElement;
        private _genSnapScale: HTMLInputElement;

        private _genSnapTransValue: VInputNumber;
        private _genSnapRotValue: VInputNumber;
        private _genSnapScaleValue: VInputNumber;

        private _genDisable: HTMLInputElement;
        private _genColl: HTMLInputElement;
        private _genVisi: HTMLInputElement;

        constructor(vishva: Vishva,vishvaGUI: VishvaGUI) {
            this._vishva=vishva;
            this._vishvaGUI=vishvaGUI;

            //name
            this._genName=<HTMLInputElement>document.getElementById("genName");
            this._genName.onchange=() => {
                this._vishva.setName(this._genName.value);
            }

            //space
            this._genSpace=<HTMLSelectElement>document.getElementById("genSpace");
            this._genSpace.onchange=() => {
                let err: string=this._vishva.setSpace(this._genSpace.value);
                if(err!==null) {
                    DialogMgr.showAlertDiag(err);
                    this._genSpace.value=this._vishva.getSpace();
                }
            }

            //transforms
            if(this._transRefresh===undefined) {
                this._transRefresh=document.getElementById("transRefresh");
                this._transRefresh.onclick=() => {
                    this._updateTransform();
                    return false;
                }
            }
            if(this._transBake===undefined) {
                this._transBake=document.getElementById("transBake");
                this._transBake.onclick=() => {
                    this._vishva.bakeTransforms();
                    this._updateTransform();
                    return false;
                }
            }

            //edit controls
            this._genOperTrans=document.getElementById("operTrans");
            this._genOperRot=document.getElementById("operRot");
            this._genOperScale=document.getElementById("operScale");
            this._genOperFocus=document.getElementById("operFocus");

            this._genOperTrans.onclick=() => {
                this._vishva.setTransOn();
            }
            this._genOperRot.onclick=() => {
                this._vishva.setRotOn();
            }
            this._genOperScale.onclick=() => {
                this._vishva.setScaleOn();
                if(!this._vishva.isSpaceLocal()) {
                    DialogMgr.showAlertDiag("note that scaling doesnot work with global axis");
                }
            }
            this._genOperFocus.onclick=() => {
                this._vishva.setFocusOnMesh();
            }

           
            this._genLoc=new VInputVector3("loc");
            this._genLoc.onChange=(v3)=>{
                this._vishva.setLocation(v3.x,v3.y,v3.z);
                
            }
            
            this._genRot=new VInputVector3("rot");
            this._genRot.onChange=(v3)=>{
                this._vishva.setRotation(v3.x,v3.y,v3.z);
                
            }
            
            this._genScale=new VInputVector3("scale");
            this._genScale.onChange=(v3)=>{
                this._vishva.setScale(v3.x,v3.y,v3.z);
                
            }
            
             //Size
            this._genSize=new VInputVector3("size",Vector3.Zero(),true);
            this._genSize.onChange=(v3)=>{
            }

            //Snap CheckBox
            this._genSnapTrans=<HTMLInputElement>document.getElementById("snapTrans");
            this._genSnapTrans.onchange=() => {
                let err: string=this._vishva.snapTrans(this._genSnapTrans.checked);
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                    this._genSnapTrans.checked=false;
                }
            }
            this._genSnapRot=<HTMLInputElement>document.getElementById("snapRot");
            this._genSnapRot.onchange=() => {
                let err: string=this._vishva.snapRot(this._genSnapRot.checked);
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                    this._genSnapRot.checked=false;
                }
            }
            this._genSnapScale=<HTMLInputElement>document.getElementById("snapScale");
            this._genSnapScale.onchange=() => {
                let err: string=this._vishva.snapScale(this._genSnapScale.checked);
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                    this._genSnapScale.checked=false;
                }
            }

            //Snap Values
            this._genSnapTransValue=new VInputNumber("snapTransValue");
            this._genSnapTransValue.onChange=(n) => {
                this._vishva.setSnapTransValue(n);
            }
            this._genSnapRotValue=new VInputNumber("snapRotValue");
            this._genSnapRotValue.onChange=(n) => {
                this._vishva.setSnapRotValue(n);
            }
            this._genSnapScaleValue=new VInputNumber("snapScaleValue");
            this._genSnapScaleValue.onChange=(n) => {
                this._vishva.setSnapScaleValue(n);
            }

            //
            this._genDisable=<HTMLInputElement>document.getElementById("genDisable");
            this._genDisable.onchange=() => {
                this._vishva.disableIt(this._genDisable.checked);
            }
            this._genColl=<HTMLInputElement>document.getElementById("genColl");
            this._genColl.onchange=() => {
                this._vishva.enableCollision(this._genColl.checked);
            }
            this._genVisi=<HTMLInputElement>document.getElementById("genVisi");
            this._genVisi.onchange=() => {
                this._vishva.makeVisibile(this._genVisi.checked);
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
            var addParticles: HTMLButtonElement=<HTMLButtonElement>document.getElementById("addParticles");


            undo.onclick=(e) => {
                this._vishva.undo();
                return false;
            };
            redo.onclick=(e) => {
                this._vishva.redo();
                return false;
            };

            parentMesh.onclick=(e) => {
                var err: string=this._vishva.makeParent();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            removeParent.onclick=(e) => {
                var err: string=this._vishva.removeParent();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            removeChildren.onclick=(e) => {
                var err: string=this._vishva.removeChildren();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };

            cloneMesh.onclick=(e) => {
                var err: string=this._vishva.clone_mesh();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            instMesh.onclick=(e) => {
                var err: string=this._vishva.instance_mesh();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            mergeMesh.onclick=(e) => {
                var err: string=this._vishva.mergeMeshes();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };

            subMesh.onclick=(e) => {
                var err: string=this._vishva.csgOperation("subtract");
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            interMesh.onclick=(e) => {
                var err: string=this._vishva.csgOperation("intersect");
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };
            downAsset.onclick=(e) => {
                var downloadURL: string=this._vishva.saveAsset();
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
                var err: string=this._vishva.delete_mesh();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return false;
            };

            swAv.onclick=(e) => {
                var err: string=this._vishva.switchAvatar();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return true;
            };
            swGnd.onclick=(e) => {
                var err: string=this._vishva.switchGround();
                if(err!=null) {
                    DialogMgr.showAlertDiag(err);
                }
                return true;
            };

            sNa.onclick=(e) => {
                if(this._snaUI==null) {
                    this._snaUI=new SnaUI(this._vishva,this._vishvaGUI);
                }
                this._snaUI.show_sNaDiag();
                return true;
            };

            //            addWater.onclick = (e) => {
            //                var err: string = this.vishva.addWater()
            //                 if (err != null) {
            //                    DialogMgr.showAlertDiag(err);
            //                }
            //                return true;
            //            };
            
            addParticles.onclick=(e) => {
                if(this._addInternalAssetUI==null) {
                    this._addInternalAssetUI=new InternalAssetsUI(this._vishva);
                }
                this._addInternalAssetUI.toggleAssetDiag("particles");
                return true;
            };

        }

        public update() {

            this._genName.value=this._vishva.getName();

            this._genSpace.value=this._vishva.getSpace();

            this._updateTransform();

            this._genDisable.checked=this._vishva.isDisabled();
            this._genColl.checked=this._vishva.isCollideable();
            this._genVisi.checked=this._vishva.isVisible();

        }

        private _updateTransform() {
            this._genLoc.setValue(this._vishva.getLocation());
            this._genRot.setValue(this._vishva.getRotation());
            this._genScale.setValue(this._vishva.getScale());
            this._genSize.setValue(this._vishva.getSize());
        }

        _downloadDialog: JQuery;
        _downloadLink: HTMLAnchorElement;
        private _createDownloadDiag() {
            this._downloadLink=<HTMLAnchorElement>document.getElementById("downloadAssetLink");
            this._downloadDialog=<JQuery>(<any>$("#saveAssetDiv"));
            this._downloadDialog.dialog();
            this._downloadDialog.dialog("close");
        }

        private _toString(d: number): string {
            return (<number>new Number(d)).toFixed(2).toString();
        }

    }
}


