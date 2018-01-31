namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * Provides UI to manage a mesh material
     */
    export class MaterialUI{
        
        private _vishva:Vishva;
        
        private _matName: HTMLLabelElement;
        private _matVis: HTMLInputElement;
        private _matVisVal: HTMLElement;
        private _matColType: HTMLSelectElement;
        private _matTextType: HTMLSelectElement;
        private _matColDiag: ColorPickerDiag;
        private _matTexture: HTMLButtonElement;
        
        constructor(vishva:Vishva){
            this._vishva = vishva;
      
            this._matName=<HTMLLabelElement>document.getElementById("matName");
            this._matName.innerText=this._vishva.getMaterialName();

            this._matVisVal=document.getElementById("matVisVal");
            this._matVis=<HTMLInputElement>document.getElementById("matVis");

            this._matColType=<HTMLSelectElement>document.getElementById("matColType");
            this._matColType.onchange=() => {
                let col: string=this._vishva.getMeshColor(this._matColType.value);
                this._matColDiag.setColor(col);
            }

            this._matTextType=<HTMLSelectElement>document.getElementById("matTextType");;

            this._matColDiag=new ColorPickerDiag("mesh color","matCol",this._vishva.getMeshColor(this._matColType.value),DialogMgr.centerBottom,(hex,hsv,rgb) => {
                let err: string=this._vishva.setMeshColor(this._matColType.value,hex);
                if(err!==null) DialogMgr.showAlertDiag(err);

            });

            this._matVisVal["value"]="1.00";
            this._matVis.oninput=() => {
                this._matVisVal["value"]=Number(this._matVis.value).toFixed(2);
                this._vishva.setMeshVisibility(parseFloat(this._matVis.value));
            }

            this._matTexture=<HTMLButtonElement>document.getElementById("matTexture");
            this._matTexture.onclick=() => {
                console.log("checking texture");
                if(this._textureDiag==null) {
                    this._createTextureDiag();
                }
                this._textureImg.src=this._vishva.getMatTexture(this._matTextType.value);
                console.log(this._textureImg.src);
                this._textureDiag.open();
            }

        }

        public updateMat() {
            this._matVis.value=Number(this._vishva.getMeshVisibility()).toString();
            this._matVisVal["value"]=Number(this._matVis.value).toFixed(2);
            this._matColDiag.setColor(this._vishva.getMeshColor(this._matColType.value));
        }
        
        private _textureDiag: VDialog;
        private _textureImg: HTMLImageElement;
        private _createTextureDiag() {
            this._textureDiag=new VDialog("textureDiag","Texture",DialogMgr.centerBottom);
            
            this._textureImg=<HTMLImageElement>document.getElementById("textImg");
            let chgTexture: HTMLButtonElement=<HTMLButtonElement>document.getElementById("changeTexture");
            chgTexture.onclick=() => {
                this._vishva.setMatTexture(this._matTextType.value,textList.value);
            }
            let textList: HTMLSelectElement=<HTMLSelectElement>document.getElementById("textureList");
            var textures: string[]=this._vishva.getTextures();
            var opt: HTMLOptionElement;
            for(let text of textures) {
                opt=document.createElement("option");
                opt.value=text;
                opt.innerText=text;
                textList.appendChild(opt);
            }

        }
        
    }
}