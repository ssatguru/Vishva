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

        private _genLocX: HTMLInputElement;
        private _genLocY: HTMLInputElement;
        private _genLocZ: HTMLInputElement;
        private _genRotX: HTMLInputElement;
        private _genRotY: HTMLInputElement;
        private _genRotZ: HTMLInputElement;
        private _genScaleX: HTMLInputElement;
        private _genScaleY: HTMLInputElement;
        private _genScaleZ: HTMLInputElement;


        private _genSnapTrans: HTMLInputElement;
        private _genSnapRot: HTMLInputElement;
        private _genSnapScale: HTMLInputElement;

        private _genSnapTransValue: HTMLInputElement;
        private _genSnapRotValue: HTMLInputElement;
        private _genSnapScaleValue: HTMLInputElement;

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

            //Translation
            this._genLocX=<HTMLInputElement>document.getElementById("loc.x");
            this._genLocX.onchange=() => {
                this._vishva.setLocation(Number(this._genLocX.value),Number(this._genLocY.value),Number(this._genLocZ.value));
            }
            this._genLocY=<HTMLInputElement>document.getElementById("loc.y");
            this._genLocY.onchange=() => {
                this._vishva.setLocation(Number(this._genLocX.value),Number(this._genLocY.value),Number(this._genLocZ.value));
            }
            this._genLocZ=<HTMLInputElement>document.getElementById("loc.z");
            this._genLocZ.onchange=() => {
                this._vishva.setLocation(Number(this._genLocX.value),Number(this._genLocY.value),Number(this._genLocZ.value));
            }
            //Rotation
            this._genRotX=<HTMLInputElement>document.getElementById("rot.x");
            this._genRotX.onchange=() => {
                this._vishva.setRotation(Number(this._genRotX.value),Number(this._genRotY.value),Number(this._genRotZ.value));
            }
            this._genRotY=<HTMLInputElement>document.getElementById("rot.y");
            this._genRotY.onchange=() => {
                this._vishva.setRotation(Number(this._genRotX.value),Number(this._genRotY.value),Number(this._genRotZ.value));
            }
            this._genRotZ=<HTMLInputElement>document.getElementById("rot.z");
            this._genRotZ.onchange=() => {
                this._vishva.setRotation(Number(this._genRotX.value),Number(this._genRotY.value),Number(this._genRotZ.value));
            }
            //Scale
            this._genScaleX=<HTMLInputElement>document.getElementById("scl.x");
            this._genScaleX.onchange=() => {
                this._vishva.setScale(Number(this._genScaleX.value),Number(this._genScaleY.value),Number(this._genScaleZ.value));
            }
            this._genScaleY=<HTMLInputElement>document.getElementById("scl.y");
            this._genScaleY.onchange=() => {
                this._vishva.setScale(Number(this._genScaleX.value),Number(this._genScaleY.value),Number(this._genScaleZ.value));
            }
            this._genScaleZ=<HTMLInputElement>document.getElementById("scl.z");
            this._genScaleZ.onchange=() => {
                this._vishva.setScale(Number(this._genScaleX.value),Number(this._genScaleY.value),Number(this._genScaleZ.value));
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
            this._genSnapTransValue=<HTMLInputElement>document.getElementById("snapTransValue");
            this._genSnapTransValue.onchange=() => {
                this._vishva.setSnapTransValue(Number(this._genSnapTransValue.value));
            }
            this._genSnapRotValue=<HTMLInputElement>document.getElementById("snapRotValue");
            this._genSnapRotValue.onchange=() => {
                this._vishva.setSnapRotValue(Number(this._genSnapRotValue.value));
            }
            this._genSnapScaleValue=<HTMLInputElement>document.getElementById("snapScaleValue");
            this._genSnapScaleValue.onchange=() => {
                this._vishva.setSnapScaleValue(Number(this._genSnapScaleValue.value));
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

            var loc: Vector3=this._vishva.getLocation();
            var rot: Vector3=this._vishva.getRotation();
            var scl: Vector3=this._vishva.getScale();

            (<HTMLInputElement>document.getElementById("loc.x")).value=this._toString(loc.x);
            (<HTMLInputElement>document.getElementById("loc.y")).value=this._toString(loc.y);
            (<HTMLInputElement>document.getElementById("loc.z")).value=this._toString(loc.z);

            (<HTMLInputElement>document.getElementById("rot.x")).value=this._toString(rot.x);
            (<HTMLInputElement>document.getElementById("rot.y")).value=this._toString(rot.y);
            (<HTMLInputElement>document.getElementById("rot.z")).value=this._toString(rot.z);

            (<HTMLInputElement>document.getElementById("scl.x")).value=this._toString(scl.x);
            (<HTMLInputElement>document.getElementById("scl.y")).value=this._toString(scl.y);
            (<HTMLInputElement>document.getElementById("scl.z")).value=this._toString(scl.z);

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


