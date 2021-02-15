import { volumetricLightScatteringPassVertexShader } from "babylonjs/Shaders/volumetricLightScatteringPass.vertex";
import { Vishva } from "../../Vishva";
import { DialogMgr } from "../DialogMgr";
import { VButton } from "./VButton";



/*
        https://www.columbia.edu/~njn2118/journal/2019/4/26.html
*/
export class VDiag {

        ml: string = `
        <div class="bar" >
                <div class="title" style="justify-self:start;">Window Title</div>

                <svg class="vdiag-min" version="1.1"
                        style="cursor: pointer; "
                        width="16" height="16"
                        xmlns="http://www.w3.org/2000/svg">

                        <line x1="4" y1="8"
                        x2="12" y2="8"
                        stroke="white"
                        stroke-width="2"/>
                </svg>

                

                <svg class="close" version="1.1"
                        style="cursor: pointer; "
                        width="16" height="16"
                        xmlns="http://www.w3.org/2000/svg">

                        <line x1="4" y1="4"
                        x2="12" y2="12"
                        stroke="white"
                        stroke-width="2"/>

                        <line x1="4" y1="12"
                        x2="12" y2="4"
                        stroke="white"
                        stroke-width="2"/>
                </svg>
        </div>
        <div class="bdy" style="padding:1em;display:grid"></div>`;



        _style: string = ` 
        display:grid;
        grid-template-columns:auto;
        grid-template-rows:auto max-content;
        z-index: 2;
        position: absolute;
        border-style:solid;
        border-width:1px;
    
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;`;



        _barStyle: string = `
                display:grid;
                grid-template-columns: auto min-content min-content ;
                padding: 1em;
                cursor: move;`;

        _closeStyle: string = `
                cursor: pointer;
                justify-self:end;
                background-color: white;`;


        public static leftTop: string = "leftTop";
        public static leftTop2: string = "leftTop2";
        public static leftCenter: string = "leftCenter";
        public static leftBottom: string = "leftBottom";

        public static centerTop: string = "centerTop";
        public static center: string = "center";
        public static centerBottom: string = "centerBottom";

        public static rightTop: string = "rightTop";
        public static rightCenter: string = "rightCenter";
        public static rightBottom: string = "rightBottom";




        pos: string;
        w: HTMLElement;  //window
        wb: HTMLElement; //window bar
        t: HTMLElement;  //title
        b: HTMLElement;  //body
        f: HTMLElement;  //footer

        mx: number;
        my: number;
        dx: number;
        dy: number;

        isClosed: boolean = false;
        dirty: boolean = false;

        private _onOpen: () => void;
        private _onClose: () => void;


        public reset() {
                if (this.isClosed) {
                        this.dirty = true;
                } else {
                        //this.position(this.pos);
                        this._moveIt(this.w.offsetTop, this.w.offsetLeft);
                }
        }

        public position(pos: string): void {
                switch (pos) {

                        case VDiag.leftTop:
                                this.w.style.top = "0px";
                                this.w.style.left = "0px";
                                this.w.style.bottom = 'auto';
                                this.w.style.right = 'auto';
                                break;
                        case VDiag.leftCenter:
                                this.w.style.top = Math.round((Vishva.gui.offsetHeight - this.w.offsetHeight) / 2) + "px";
                                this.w.style.left = "0px";
                                this.w.style.bottom = "auto";
                                this.w.style.right = "auto";
                                break;
                        case VDiag.leftBottom:
                                this.w.style.top = "auto";
                                this.w.style.left = "0px";
                                this.w.style.bottom = "0px";
                                this.w.style.right = "auto";
                                break;

                        case VDiag.centerTop:
                                this.w.style.top = "0px";
                                this.w.style.left = Math.round((Vishva.gui.offsetWidth - this.w.offsetWidth) / 2) + "px";
                                this.w.style.bottom = "auto";
                                this.w.style.right = "auto";
                                break;
                        case VDiag.center:
                                this.w.style.top = Math.round((Vishva.gui.offsetHeight - this.w.offsetHeight) / 2) + "px";
                                this.w.style.left = Math.round((Vishva.gui.offsetWidth - this.w.offsetWidth) / 2) + "px";
                                this.w.style.bottom = 'auto';
                                this.w.style.right = 'auto';
                                break;
                        case VDiag.centerBottom:
                                this.w.style.top = "auto";
                                this.w.style.left = Math.round((Vishva.gui.offsetWidth - this.w.offsetWidth) / 2) + "px";
                                this.w.style.bottom = "0px";
                                this.w.style.right = "auto";
                                break;

                        case VDiag.rightTop:
                                this.w.style.top = "0px";
                                this.w.style.left = "auto";
                                this.w.style.bottom = "auto";
                                this.w.style.right = "0px";
                                break;
                        case VDiag.rightCenter:
                                this.w.style.top = Math.round((Vishva.gui.offsetHeight - this.w.offsetHeight) / 2) + "px";
                                this.w.style.left = "auto";
                                this.w.style.bottom = "auto";
                                this.w.style.right = "0px";
                                break;
                        case VDiag.rightBottom:
                                this.w.style.top = "auto";
                                this.w.style.left = "auto";
                                this.w.style.bottom = "0px";
                                this.w.style.right = "0px";
                                break;



                }

        }


        private onMouseMove = (e: MouseEvent) => {
                this.dx = this.mx - e.clientX;
                this.dy = this.my - e.clientY;
                this.mx = e.clientX;
                this.my = e.clientY;
                let t = this.w.offsetTop - this.dy;
                let l = this.w.offsetLeft - this.dx;
                this._moveIt(t, l);

        }

        private _moveIt(t: number, l: number) {
                t = Math.min(t, Vishva.gui.offsetHeight - this.w.offsetHeight);
                l = Math.min(l, Vishva.gui.offsetWidth - this.w.offsetWidth);
                t = Math.max(t, Vishva.gui.offsetTop);
                l = Math.max(l, Vishva.gui.offsetLeft);
                this.w.style.top = t + 'px';
                this.w.style.left = l + 'px';
                this.w.style.bottom = 'auto';
                this.w.style.right = 'auto';

        }

        private onMouseDown = (e: MouseEvent) => {

                this.mx = e.clientX;
                this.my = e.clientY;

                document.addEventListener("mousemove", this.onMouseMove);
                document.addEventListener("mouseup", this.onMouseUp);
        }

        private onMouseUp = () => {
                document.removeEventListener("mousemove", this.onMouseMove);
                document.removeEventListener("mouseup", this.onMouseUp);
        }

        private closeWindow = () => {
                this.toggle();
        }

        public toggle() {
                if (this.isClosed) {
                        this.open();
                } else {
                        this.close();
                }
        }

        public open() {
                if (!this.isClosed) return;
                this.isClosed = false;
                this.w.style.display = '';
                if (this.dirty) {
                        this.dirty = false;
                        this.position(this.pos);
                }
                if (this._onOpen != null) this._onOpen();
        }

        public isOpen(): boolean {
                return !this.isClosed;

        }

        public close() {
                if (this.isClosed) return;
                this.isClosed = true;
                this.w.style.display = 'none';
                if (this._onClose != null) this._onClose();
        }

        public onClose(f: () => void) {
                this._onClose = f;
                if (this.isClosed) {
                        // f could be null if trying to remove handlers
                        if (f != null) this._onClose();
                }
        }

        public onOpen(f: () => void) {
                this._onOpen = f;
                if (this.isOpen) {
                        // f could be null if trying to remove handlers
                        if (f != null) this._onOpen();
                }
        }

        public toggleBody = () => {
                let s = this.b.getAttribute("style");
                if (s.indexOf("display:none;") >= 0) {
                        this.b.setAttribute("style", s.replace("display:none;", ""));
                        this._moveIt(this.w.offsetTop, this.w.offsetLeft);
                } else {
                        this.b.setAttribute("style", s + "display:none;");
                }

        }

        public setShowEffect(option: {}) {
                //TODO
        }

        public setHideEffect(option: {}) {
                //TODO
        }

        public hideTitleBar() {
                this.wb.style.display = "none";
        }
        public showTitleBar() {
                this.wb.setAttribute("style", this._barStyle);
                this.wb.style.backgroundColor = Vishva.theme.darkColors.b;
                this.wb.style.color = Vishva.theme.darkColors.f;
        }

        public setTitle(title: string) {
                this.t.innerText = title;
        }

        public setSize(w: number, h: number) {
                this.w.style.width = w + "px";
                this.w.style.height = h + "px";
        }

        public addButton(txt: string): HTMLButtonElement {
                if (this.f == null) {
                        this.f = document.createElement('div');
                        this.b.appendChild(this.f);
                }

                let button: HTMLButtonElement = VButton.create(txt, txt);
                button.style.marginTop = "1em";
                button.style.marginRight = "1em";
                this.f.appendChild(button);

                return button;

        }
        //
        constructor(id: string | HTMLDivElement, title: string, pos: string, width: string | number = 0, height?: string | number, minWidth: string = "0px", modal = false) {

                let bc: HTMLElement;
                if (id instanceof HTMLDivElement) {
                        bc = id;
                } else {
                        bc = document.getElementById(id);
                }

                this.pos = pos;

                if (height == null || height == "") height = "auto";

                this.w = document.createElement("div");
                this.w.innerHTML = this.ml;
                Vishva.gui.appendChild(this.w);

                this.w.setAttribute("style", this._style);
                this.w.style.height = <string>height;
                this.w.style.width = <string>width;
                this.w.style.minWidth = minWidth;
                this.w.style.color = Vishva.theme.colors.f;
                this.w.style.backgroundColor == Vishva.theme.colors.b;
                this.w.style.borderColor = Vishva.theme.lightColors.b;


                this.wb = <HTMLElement>this.w.getElementsByClassName('bar')[0];
                this.showTitleBar();
                this.wb.onmousedown = this.onMouseDown;
                this.wb.ondblclick = () => this.position(this.pos);


                this.t = <HTMLElement>this.w.getElementsByClassName('title')[0];
                this.t.innerText = title;

                let closeButton: HTMLElement = <HTMLElement>this.w.getElementsByClassName('close')[0];
                closeButton.addEventListener('click', this.closeWindow);

                this.b = <HTMLElement>this.w.getElementsByClassName('bdy')[0];
                this.b.appendChild(bc);
                this.b.style.color = Vishva.theme.colors.f;
                this.b.style.backgroundColor = Vishva.theme.colors.b;

                let minBut: HTMLElement = <HTMLElement>this.w.getElementsByClassName('vdiag-min')[0];
                minBut.addEventListener('click', this.toggleBody);

                this.position(pos);
                DialogMgr.vdiags.push(this);


        }

}