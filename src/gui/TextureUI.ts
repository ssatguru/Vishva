import { Vishva } from "../Vishva";

import { VDialog } from "./VDialog";

import { DialogMgr } from "./DialogMgr";

import { VTreeDialog } from "./VTreeDialog";

/**
 * Provides a UI to manage texture of a material
 */
export class TextureUI {

    private _vishva: Vishva;
    private _textureDiag: VDialog;
    private _textureImg: HTMLImageElement;
    private _textIDEle: HTMLElement;
    private _textType: HTMLElement;
    private _textImgSrc: HTMLElement;
    //private _textListDiv: HTMLElement;

    private _matHScale: HTMLInputElement;
    private _matVScale: HTMLInputElement;
    private _matURot: HTMLInputElement;
    private _matVRot: HTMLInputElement;
    private _matWRot: HTMLInputElement;
    private _matHO: HTMLInputElement;
    private _matVO: HTMLInputElement;

    private _matID: string;
    private _matTextImg: HTMLImageElement;
    private _textName: string;
    private _textID: string;

    constructor(vishva: Vishva) {
        this._vishva = vishva;

        this._textureDiag = new VDialog("textureDiag", "Texture", DialogMgr.centerBottom, "auto", "auto", 0, false);

        this._textureImg = <HTMLImageElement>document.getElementById("textImg");
        this._textIDEle = document.getElementById("textID");
        this._textType = document.getElementById("textType");
        this._textImgSrc = document.getElementById("textImgSrc");
        this._matHScale = <HTMLInputElement>document.getElementById("matHScale");
        this._matHScale.onchange = () => {
            this._vishva.setTextHScale(this._textID, Number(this._matHScale.value));
        }
        this._matVScale = <HTMLInputElement>document.getElementById("matVScale");
        this._matVScale.onchange = () => {
            this._vishva.setTextVScale(this._textID, Number(this._matVScale.value));
        }

        this._matURot = <HTMLInputElement>document.getElementById("matURot");
        this._matURot.oninput = () => {
            this._vishva.setTextRot(this._textID, Number(this._matURot.value), "u");
        }
        this._matVRot = <HTMLInputElement>document.getElementById("matVRot");
        this._matVRot.oninput = () => {
            this._vishva.setTextRot(this._textID, Number(this._matVRot.value), "v");
        }
        this._matWRot = <HTMLInputElement>document.getElementById("matWRot");
        this._matWRot.oninput = () => {
            this._vishva.setTextRot(this._textID, Number(this._matWRot.value), "w");
        }

        this._matHO = <HTMLInputElement>document.getElementById("matHO");
        this._matHO.oninput = () => {
            this._vishva.setTextHO(this._textID, Number(this._matHO.value));
        }
        this._matVO = <HTMLInputElement>document.getElementById("matVO");
        this._matVO.oninput = () => {
            this._vishva.setTextVO(this._textID, Number(this._matVO.value));
        }


        let chgTexture: HTMLButtonElement = <HTMLButtonElement>document.getElementById("changeTexture");
        chgTexture.onclick = () => {
            if (this._textListDiag == null) {
                this._textListDiag = new VTreeDialog(this._vishva, "select texture", DialogMgr.center, Vishva.vishvaFiles, "\.jpg$|\.png$|\.tga$|\.bmp$", true);
                this._textListDiag.addTreeListener((f, p, l) => {
                    if (!l) return;
                    let imgsrc: string = this._vishva.vHome + p + f;
                    this._vishva.setTextURL(this._textID, imgsrc);
                    this._textName = imgsrc;
                    this._textImgSrc.innerText = imgsrc;
                    if (imgsrc.indexOf(".tga") >= 0) {
                        imgsrc = this._vishva.TGA_IMAGE;
                    }
                    this._textureImg.src = imgsrc;
                    this._matTextImg.src = imgsrc;
                });

                this._textListDiag.setModal(true);
            }
            this._textListDiag.open();

        }

    }
    private _textListDiag: VTreeDialog;

    public update() {
        this._matHScale.value = this._vishva.getTextHScale(this._textID);
        this._matVScale.value = this._vishva.getTextVScale(this._textID);
        this._matWRot.value = this._vishva.getTextRot(this._textID);
        this._matHO.value = this._vishva.getTextHO(this._textID);
        this._matVO.value = this._vishva.getTextVO(this._textID);
    }

    public open() {
        this._textureDiag.open();
    }
    public isOpen(): boolean {
        return this._textureDiag.isOpen();
    }
    public close() {
        this._textureDiag.close();
    }

    public setParms(textID: string, textName: string, textType: string, matdId: string, matTextImg: HTMLImageElement) {
        this._textID = textID;
        this._textIDEle.innerText = textID;
        this._textName = textName;
        this._textImgSrc.innerText = textName;
        this._textType.innerText = textType;
        this._matID = matdId;
        this._matTextImg = matTextImg;
        this._textureImg.src = this._matTextImg.src;

        this.update();
    }
}