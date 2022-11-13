import { Material, AbstractMesh, Scene, TransformNode, MultiMaterial, StandardMaterial, Color3, Texture, BaseTexture } from "babylonjs";
import { Vishva } from "../../Vishva";
import { ColorPickerFld } from "../ColorPickerFld";
import { DialogMgr } from "../DialogMgr";
import { TextureUI } from "../TextureUI";
import { MaterialListUI } from "../MaterialListUI";
import { GuiUtils } from "../GuiUtils";
import { VDiag } from "../components/VDiag";


/**
 * Provides UI to manage a mesh material
 * TODO : Make provision to assign new material. Currently one can only alter the material
 */
export class MaterialUI {

    private _vishva: Vishva;
    private _scene: Scene;
    private _mesh: TransformNode;

    private _matIDs: HTMLSelectElement;
    private _matName: HTMLElement;
    private _matCount: HTMLLabelElement;
    private _matVis: HTMLInputElement;
    private _matVisVal: HTMLElement;
    private _matType: HTMLElement;
    private _matBF: HTMLInputElement;
    private _matColType: HTMLSelectElement;
    private _matColDiag: ColorPickerFld;
    private _matTextType: HTMLSelectElement;
    private _matTextImg: HTMLImageElement;
    private _matClone: HTMLElement;
    private _matReplace: HTMLElement;
    private _matCreateText: HTMLElement;
    private _matRemText: HTMLElement;

    public _textureUI: TextureUI;
    private _materialListUI: MaterialListUI;
    private _textID: string;
    private _textName: string;




    constructor(vishva: Vishva) {
        this._vishva = vishva;
        this._scene = vishva.scene;
        this._mesh = vishva.meshSelected;

        //visibility
        this._matVis = <HTMLInputElement>document.getElementById("matVis");
        this._matVisVal = document.getElementById("matVisVal");
        this._matVisVal["value"] = "1.00";
        this._matVis.oninput = () => {
            this._matVisVal["value"] = Number(this._matVis.value).toFixed(2);
            this._setMeshVisibility(parseFloat(this._matVis.value));
        }

        //material details
        this._matCount = <HTMLLabelElement>document.getElementById("matCount");
        this._matIDs = <HTMLSelectElement>document.getElementById("matIDs");
        this._matIDs.onchange = () => {
            this._updateMatDetails();
        }

        this._matName = <HTMLSelectElement>document.getElementById("matName");
        this._matType = <HTMLSelectElement>document.getElementById("matType");
        this._matBF = <HTMLInputElement>document.getElementById("matBF");
        this._matBF.onchange = () => {
            this._setMaterialBFC(this._matIDs.value, this._matBF.checked);
        }
        this._matClone = <HTMLSelectElement>document.getElementById("matClone");
        this._matClone.onclick = () => {
            this._cloneMaterial(this._matIDs.value);
            this.update();
        }

        this._matReplace = <HTMLSelectElement>document.getElementById("matReplace");
        this._matReplace.onclick = () => {
            if (!(this._mesh instanceof AbstractMesh)) return false;
            let mesh: AbstractMesh = this._mesh;
            if (this._materialListUI == null) {
                this._materialListUI = new MaterialListUI(this._vishva.scene, (mat: Material) => {
                    mesh.material = mat;
                    this.update();
                });
            }
            this._materialListUI.toggle();
            this.update();
            return false;
        }

        //material color
        this._matColType = <HTMLSelectElement>document.getElementById("matColType");
        this._matColType.onchange = () => {
            let col: string = this._getMeshColor(this._matIDs.value, this._matColType.value);
            this._matColDiag.setColor(col);
        }
        this._matColDiag = new ColorPickerFld("mesh color", "matCol", this._getMeshColor(this._matIDs.value, this._matColType.value), VDiag.centerBottom, (hex, hsv, rgb) => {
            let err: string = this._setMeshColor(this._matIDs.value, this._matColType.value, hex);
            if (err !== null) DialogMgr.showAlertDiag(err);

        });

        //material texture
        this._matTextType = <HTMLSelectElement>document.getElementById("matTextType");
        this._matTextType.onchange = () => {
            let dtls: Array<string> = this._getMatTexture(this._matIDs.value, this._matTextType.value);
            if (dtls == null) {
                this._textID = null;
                this._textName = Vishva.NO_TEXTURE;
            } else {
                this._textID = dtls[0];
                this._textName = dtls[1];
            }
            this._matTextImg.src = this._textName;
            if (this._textName.indexOf(".tga") >= 0) {
                this._matTextImg.src = Vishva.TGA_IMAGE;
            } else {
                this._matTextImg.src = this._textName;
            }
            if (this._textID == null) {
                this._matCreateText.setAttribute("style", "display:block");
                this._matRemText.setAttribute("style", "display:none");
            } else {
                this._matCreateText.setAttribute("style", "display:none");
                this._matRemText.setAttribute("style", "display:block");
            }
        }

        this._matTextImg = <HTMLImageElement>document.getElementById("matTextImg");
        this._matTextImg.onclick = () => {
            if (this._textID == null) {
                return;
            }
            if (this._textureUI == null) {
                this._textureUI = new TextureUI(this._vishva);
            }
            this._textureUI.setParms(this._textID, this._textName, this._matTextType.value, this._matIDs.value, this._matTextImg);
            this._textureUI.open();
        }

        this._matCreateText = document.getElementById("matCreateText");
        this._matCreateText.onclick = () => {
            this._matCreateText.setAttribute("style", "display:none");
            this._matRemText.setAttribute("style", "display:block");
            this._textID = this._createText();
            this._textName = "";
            this._setMatTexture(this._matIDs.value, this._matTextType.value, this._textID);
            if (this._textureUI == null) {
                this._textureUI = new TextureUI(this._vishva);
            }
            this._textureUI.setParms(this._textID, this._textName, this._matTextType.value, this._matIDs.value, this._matTextImg);
            this._textureUI.open();

        }

        this._matRemText = document.getElementById("matRemText");
        this._matRemText.onclick = () => {
            this._matCreateText.setAttribute("style", "display:block");
            this._matRemText.setAttribute("style", "display:none");
            this._removeMatTexture(this._matIDs.value, this._matTextType.value);
            this._textID = null;
            this._textName = Vishva.NO_TEXTURE;
            this._matTextImg.src = this._textName;
        }

        this.update();
    }

    public setMesh(node: TransformNode) {
        this._mesh = node;
    }

    public update() {
        //set transparency(visibility)
        this._matVis.value = Number(this._getMeshVisibility()).toString();
        this._matVisVal["value"] = Number(this._matVis.value).toFixed(2);

        let mn: Array<string> = this._getMatIDs();
        if (mn != null) {
            document.getElementById("matDetails").style.display = "";
            this._matCount.innerText = Number(mn.length).toString();
            GuiUtils.PopulateSelect(this._matIDs, mn);
            this._updateMatDetails();
        } else {
            document.getElementById("matDetails").style.display = "none";
        }
    }

    //FYI there is an issue in chrome with reading a table cell value
    //https://stackoverflow.com/questions/52901043/chrome-v70-has-issue-with-innertext-in-td-cells
    //so use this._matIDs.value  to set value but not to get value !!
    private _updateMatDetails() {
        document.getElementById("matDetails").style.display = "";
        this._matName.innerText = this._getMaterialName(this._matIDs.value);
        if (!this._isStdMaterial(this._matIDs.value)) {
            this._matType.innerText = "not StandardMaterial";
            document.getElementById("stdMatDetails").style.display = "none";
        } else {
            document.getElementById("stdMatDetails").style.display = "";
            this._matType.innerText = "StandardMaterial"

            let b: boolean | string = this._getMaterialBFC(this._matIDs.value);
            if (typeof (b) == 'string') {
                DialogMgr.showAlertDiag(b);
            } else this._matBF.checked = b;

            this._matColDiag.setColor(this._getMeshColor(this._matIDs.value, this._matColType.value));
            let dtls: Array<string> = this._getMatTexture(this._matIDs.value, this._matTextType.value);
            this._textID = dtls[0];
            this._textName = dtls[1];
            this._matTextImg.src = this._textName;
            if (this._textName.indexOf(".tga") >= 0) {
                this._matTextImg.src = Vishva.TGA_IMAGE;
            } else {
                this._matTextImg.src = this._textName;
            }
            if (this._textID == null) {
                this._matCreateText.setAttribute("style", "display:block");
                this._matRemText.setAttribute("style", "display:none");
            } else {
                this._matCreateText.setAttribute("style", "display:none");
                this._matRemText.setAttribute("style", "display:block");
            }
            if (this._textureUI != null && this._textureUI.isOpen()) {
                this._textureUI.setParms(this._textID, this._textName, this._matTextType.value, this._matIDs.value, this._matTextImg);
                this._textureUI.close();
                this._textureUI.open();
            }
        }
    }

    private _cloneMaterial(id: string) {
        if (!(this._mesh instanceof AbstractMesh)) return;
        let mat: Material = this._scene.getMaterialById(id);
        if (mat == null) return null;
        if (this._mesh.material instanceof MultiMaterial) {
            let mm: MultiMaterial = this._mesh.material;
            this._mesh.material = mm.clone(mat.name + "Clone", true);
        } else {
            this._mesh.material = mat.clone(mat.name + "Clone");
        }
    }

    //back face culling
    private _setMaterialBFC(id: string, b: boolean): string {
        let mat: Material = this._scene.getMaterialById(id);
        if (mat == null) return null;
        mat.backFaceCulling = b;
    }
    //back face culling
    private _getMaterialBFC(id: string): boolean | string {
        let mat: Material = this._scene.getMaterialById(id);
        if (mat == null) return "material not found";
        return mat.backFaceCulling;
    }

    private _getMeshColor(matId: string, colType: string): string {

        let sm: StandardMaterial = <StandardMaterial>this._scene.getMaterialById(matId);
        if (sm == null) return null;

        if (!(sm instanceof StandardMaterial)) {
            return "#000000";;
        }

        if (colType === "diffuse") {
            if (sm.diffuseColor !== undefined) return sm.diffuseColor.toHexString();
            else return "#000000";
        } else if (colType === "emissive") {
            if (sm.emissiveColor !== undefined) return sm.emissiveColor.toHexString();
            else return "#000000";
        } else if (colType === "specular") {
            if (sm.specularColor !== undefined) return sm.specularColor.toHexString();
            else return "#000000";
        } else if (colType === "ambient") {
            if (sm.ambientColor !== undefined) return sm.ambientColor.toHexString();
            else return "#000000";
        } else {
            console.error("invalid color type [" + colType + "]");
            return null;
        }

    }

    private _setMeshColor(matId: string, colType: string, hex: string): string {
        let sm: StandardMaterial = <StandardMaterial>this._scene.getMaterialByID(matId);
        if (sm == null) return "material not found";
        let col: Color3 = Color3.FromHexString(hex);
        if (colType === "diffuse")
            sm.diffuseColor = col;
        else if (colType === "emissive")
            sm.emissiveColor = col;
        else if (colType === "specular")
            sm.specularColor = col;
        else if (colType === "ambient")
            sm.ambientColor = col;
        else {
            return "invalid color type [" + colType + "]";
        }
        return null;
    }

    private _getTextureByID(id: String): BaseTexture {
        let ts: BaseTexture[] = this._scene.textures;
        for (let t of ts) {
            if (t.uid == id) return t;
        }
        return null;
    }

    private _createText(): string {
        let text: Texture = new Texture("", this._scene);
        return text.uid;

    }

    /**
     * returns an array containing 2 elements - texture id and texture name
     */

    private _getMatTexture(matId: string, type: string): Array<string> {

        let sm: StandardMaterial = <StandardMaterial>this._scene.getMaterialById(matId);
        if (sm == null) return null;
        let uid: string = null;
        let img: string = null;
        if (type == "diffuse" && sm.diffuseTexture != null) {
            uid = sm.diffuseTexture.uid;
            img = (<Texture>sm.diffuseTexture).url;
        } else if (type == "ambient" && sm.ambientTexture != null) {
            uid = sm.ambientTexture.uid;
            img = (<Texture>sm.ambientTexture).url;
        } else if (type == "opacity" && sm.opacityTexture != null) {
            uid = sm.opacityTexture.uid;
            img = (<Texture>sm.opacityTexture).url;
        } else if (type == "reflection" && sm.reflectionTexture != null) {
            uid = sm.reflectionTexture.uid;
            img = (<Texture>sm.reflectionTexture).url;
        } else if (type == "emissive" && sm.emissiveTexture != null) {
            uid = sm.emissiveTexture.uid;
            img = (<Texture>sm.emissiveTexture).url;
        } else if (type == "specular" && sm.specularTexture != null) {
            uid = sm.specularTexture.uid;
            img = (<Texture>sm.specularTexture).url;
        } else if (type == "bump" && sm.bumpTexture != null) {
            uid = sm.bumpTexture.uid;
            img = (<Texture>sm.bumpTexture).url;
        } else {
            uid = null;
            img = Vishva.NO_TEXTURE;
        }
        //            if (img.indexOf("            .tga")>=0){
        //                img=this            .TGA_IMAGE;
        //            }

        return [uid, img];
    }

    private _setMatTexture(matId: string, type: string, textID: string) {
        let bt: BaseTexture = this._getTextureByID(textID);
        if (bt != null) {
            let sm: StandardMaterial = <StandardMaterial>this._scene.getMaterialById(matId);
            if (sm == null) return;
            if (type == "diffuse") {
                sm.diffuseTexture = bt;
            } else if (type == "ambient") {
                sm.ambientTexture = bt;
            } else if (type == "opacity") {
                sm.opacityTexture = bt;
            } else if (type == "reflection") {
                sm.reflectionTexture = bt;
            } else if (type == "emissive") {
                sm.emissiveTexture = bt;
            } else if (type == "specular") {
                sm.specularTexture = bt;
            } else if (type == "bump") {
                sm.bumpTexture = bt;
            }
        }
    }
    private _removeMatTexture(matId: string, type: string) {
        let sm: StandardMaterial = <StandardMaterial>this._scene.getMaterialById(matId);
        if (sm == null) return;
        if (type == "diffuse") {
            sm.diffuseTexture = null;
        } else if (type == "ambient") {
            sm.ambientTexture = null;
        } else if (type == "opacity") {
            sm.opacityTexture = null;
        } else if (type == "reflection") {
            sm.reflectionTexture = null;
        } else if (type == "emissive") {
            sm.emissiveTexture = null;
        } else if (type == "specular") {
            sm.specularTexture = null;
        } else if (type == "bump") {
            sm.bumpTexture = null;
        }

    }

    private _setMeshVisibility(vis: number) {
        if (!(this._mesh instanceof AbstractMesh)) return;
        this._mesh.visibility = vis;
    }
    private _getMeshVisibility(): number {
        if (!(this._mesh instanceof AbstractMesh)) return;
        return this._mesh.visibility;
    }

    private _getMatIDs(): Array<string> {
        if (!(this._mesh instanceof AbstractMesh) || !this._mesh.material) return null;
        let mn: Array<string> = new Array();
        if (this._mesh.material instanceof MultiMaterial) {
            let mm: MultiMaterial = this._mesh.material;
            for (let m of mm.subMaterials) {
                mn.push(m.id);
            }
            return mn;
        }
        else {
            mn.push(this._mesh.material.id);
            return mn;
        }


    }
    private _getMaterialName(id: string): string {
        let mat: Material = this._scene.getMaterialById(id);
        if (mat == null) return null;
        else return mat.name;
    }
    private _isStdMaterial(id: string): boolean {
        let mat: Material = this._scene.getMaterialById(id);
        if (mat == null) return false;
        if (mat instanceof StandardMaterial) return true;
        else return false;
    }





}