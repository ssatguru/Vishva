namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * Provides UI to manage a mesh material
     */
    export class MaterialUI {

        private _vishva: Vishva;

        private _matIDs: HTMLSelectElement;
        private _matID: HTMLSelectElement;
        private _matName: HTMLSelectElement;
        private _matCount: HTMLLabelElement;
        private _matVis: HTMLInputElement;
        private _matVisVal: HTMLElement;
        private _matColType: HTMLSelectElement;
        private _matColDiag: ColorPickerDiag;
        private _matTextType: HTMLSelectElement;
        private _matTextImg: HTMLImageElement;

        private _textureUI: TextureUI;
        private _textID: string;
        private _textName: string;

        constructor(vishva: Vishva) {
            console.log("mataerialUI");
            this._vishva=vishva;

            //visibility
            this._matVis=<HTMLInputElement>document.getElementById("matVis");
            this._matVisVal=document.getElementById("matVisVal");
            this._matVisVal["value"]="1.00";
            this._matVis.oninput=() => {
                this._matVisVal["value"]=Number(this._matVis.value).toFixed(2);
                this._vishva.setMeshVisibility(parseFloat(this._matVis.value));
            }

            //material details
            this._matCount=<HTMLLabelElement>document.getElementById("matCount");
            this._matIDs=<HTMLSelectElement>document.getElementById("matIDs");
            this._matIDs.onchange=() => {
                this._updateMatDetails();
            }

            this._matID=<HTMLSelectElement>document.getElementById("matID");
            this._matName=<HTMLSelectElement>document.getElementById("matName");

            //material color
            this._matColType=<HTMLSelectElement>document.getElementById("matColType");
            this._matColType.onchange=() => {
                let col: string=this._vishva.getMeshColor(this._matID.innerText,this._matColType.value);
                this._matColDiag.setColor(col);
            }
            this._matColDiag=new ColorPickerDiag("mesh color","matCol",this._vishva.getMeshColor(this._matID.innerText,this._matColType.value),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                let err: string=this._vishva.setMeshColor(this._matID.innerText,this._matColType.value,hex);
                if(err!==null) DialogMgr.showAlertDiag(err);

            });

            //material texture
            this._matTextType=<HTMLSelectElement>document.getElementById("matTextType");
            this._matTextType.onchange=() => {
                let dtls: Array<string>=this._vishva.getMatTexture(this._matID.innerText,this._matTextType.value);
                this._textID=dtls[0];
                this._textName=dtls[1];
                this._matTextImg.src=this._textName;
                if(this._textName.indexOf(".tga")>=0) {
                    this._matTextImg.src=this._vishva.TGA_IMAGE;
                } else {
                    this._matTextImg.src=this._textName;
                }
            }

            this._matTextImg=<HTMLImageElement>document.getElementById("matTextImg");
            this._matTextImg.onclick=() => {
                if(this._textureUI==null) {
                    this._textureUI=new TextureUI(this._vishva);
                }
                this._textureUI.setParms(this._textID,this._textName,this._matTextType.value,this._matID.innerText,this._matTextImg);
                this._textureUI.open();
            }

            this.updateMatUI();
        }

        public updateMatUI() {
            //set transparency(visibility)
            this._matVis.value=Number(this._vishva.getMeshVisibility()).toString();
            this._matVisVal["value"]=Number(this._matVis.value).toFixed(2);


            let mn: Array<string>=this._vishva.getMatNames();
            if(mn!=null) {
                this._matCount.innerText=Number(mn.length).toString();
                GuiUtils.PopulateSelect(this._matIDs,mn);
                this._updateMatDetails();
            }
        }

        private _updateMatDetails() {
            this._matID.innerText=this._matIDs.value;
            this._matName.innerText=this._vishva.getMaterialName(this._matIDs.value);
            this._matColDiag.setColor(this._vishva.getMeshColor(this._matIDs.value,this._matColType.value));
            let dtls: Array<string>=this._vishva.getMatTexture(this._matID.innerText,this._matTextType.value);
            this._textID=dtls[0];
            this._textName=dtls[1];
            this._matTextImg.src=this._textName;
            if(this._textName.indexOf(".tga")>=0) {
                this._matTextImg.src=this._vishva.TGA_IMAGE;
            } else {
                this._matTextImg.src=this._textName;
            }
        }



    }
}