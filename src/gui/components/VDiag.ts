import { volumetricLightScatteringPassVertexShader } from "babylonjs/Shaders/volumetricLightScatteringPass.vertex";
import { Vishva } from "../../Vishva";
import { DialogMgr } from "../DialogMgr";
import { UIConst } from "../UIConst";
import { VButton } from "./VButton";



/*
        https://www.columbia.edu/~njn2118/journal/2019/4/26.html
*/
export class VDiag {


        // markup for the dialog box.
        // contains title bar DIV and  body DIV
        ml: string = `
        <div class="bar">
                <div class="title" >Window Title</div>
                <span class="material-icons-outlined vdiag-min" style="display: inline-block;cursor: pointer; ">remove</span>
                <span class="material-icons-outlined vdiag-add" style="display: none;cursor: pointer; ">add</span>
                <span class="material-icons-outlined vdiag-close" style="display: inline-block;cursor: pointer; ">close</span>
        </div>
        <div class="bdy" style="padding:0em;display:grid"></div>`;


        _style: string = ` 
                border-radius: 0.5em;
                overflow:hidden;
                display:grid;
                grid-template-columns:auto;
                grid-template-rows:min-content auto;
                z-index: 2;
                position: absolute;
                border-style:solid;
                border-width:1px;
                scale:100%;
                animation-name:scaleUpAnim;
                animation-duration:0.5s; 
        
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;`;

        _barStyle: string = `
                        display:grid;
                        grid-template-columns: auto min-content min-content min-content ;
                        padding: 0.5em;
                        cursor: move;`;

        _closeStyle: string = `
                        cursor: pointer;
                        justify-self:end;
                        background-color: white;`;

        public static leftTop: string = "leftTop";
        public static leftTop1: string = "leftTop1";
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
        bc: HTMLElement;  //bodycontent
        f: HTMLElement;  //footer
        minIcon: HTMLElement;
        addIcon: HTMLElement;

        mx: number;
        my: number;
        dx: number;
        dy: number;

        isClosed: boolean = false;
        dirty: boolean = false;

        private _onOpen: () => void;
        private _onClose: () => void;
        //whenever the dialog is resized this _onResize function will be called
        // a dialog could be resized by
        // user dragging the boundary, 
        // dialog animation during open,
        // dialog being closed and opened during append operation (done to bring the dialog in front of other components)
        private _onResize: () => void;

        //css animations to play on open and close dialog
        private _oAnim: string = "scaleIn";
        private _cAnim: string = "scaleOut";
        private _oD: string = "0.5s";
        private _cD: string = "0.5s";

        //effects on open and close dialog
        //fade,scale,rotate,newsFlash(scale and rotate)
        private _oEffect: string;
        private _cEffect: string;

        //called during window resize
        public reset() {
                if (this.isClosed) {
                        this.dirty = true;
                } else {
                        //during game we want the dialog box to snap to its original intended  postion.
                        //during editing we do not want the dialog box to move until pushed by windows border
                        if (this._type === "g") {
                                this.position(this.pos);
                        } else {
                                this.w.style.maxHeight =  Number(Vishva.gui.offsetHeight - 1).toString()+"px";
                                this._moveIt(this.w.offsetTop, this.w.offsetLeft);
                        }
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
                        case VDiag.leftTop1:
                                this.w.style.top = UIConst._buttonHeight + "px";
                                this.w.style.left = "0px";
                                this.w.style.bottom = 'auto';
                                this.w.style.right = 'auto';
                                break;
                        case VDiag.leftTop2:
                                this.w.style.top = UIConst._buttonHeight + "px";
                                this.w.style.left = UIConst._diagWidthS;
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

        /**
         * This _moveIt method is responsible for adjusting 
         * the position of a dialog window (this.w) to ensure it stays within the 
         * visible boundaries of the parent GUI container (Vishva.gui). 
         * It takes two parameters, t (top position) and l (left position), 
         * which represent the desired new position of the dialog. 
         * The function modifies these values to prevent the dialog from overflowing 
         * outside the GUI container.
         */

        private _moveIt(t: number, l: number) {
                //Clamp the Top Position (t):
                //-1 is to prevent vertical scroll bar from showing up
                t = Math.min(t, Vishva.gui.offsetHeight - 1 - this.w.offsetHeight);
                t = Math.max(t, Vishva.gui.offsetTop);
                //Clamp the Left Position (l):
                l = Math.min(l, Vishva.gui.offsetWidth - this.w.offsetWidth);
                l = Math.max(l, Vishva.gui.offsetLeft);
                //Set the New Position of the Dialog:
                this.w.style.top = t + 'px';
                this.w.style.left = l + 'px';
                this.w.style.bottom = 'auto';
                this.w.style.right = 'auto';
        }


        private onMouseDown = (e: MouseEvent) => {

                //bring to front when clicked
                //we donot want animation during drags
                this.w.parentNode.appendChild(this.w);
                if (this._onResize != null) this._onResize();

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

                if (!this.isClosed) {
                        return;
                }

                this.isClosed = false;

                //bring to front when opened
                this.w.parentNode.appendChild(this.w);


                //open animation
                this.w.style.animationName = this._oAnim;
                this.w.style.animationDuration = this._oD;
                this.w.style.display = 'grid';
                if (this._onResize != null) this._onResize();


                if (this.dirty) {
                        this.dirty = false;
                        this.position(this.pos);
                }

        }

        public isOpen(): boolean {
                return !this.isClosed;
        }

        private _closeit = () => {
                this.close(true);
        }

        //note we are not really closing it, just hiding it
        //resources are still being consumed
        public close = (anim?: boolean) => {
                if (this.isClosed) return;
                this.isClosed = true;

                //do not do animation if caller doesnot want it
                //sometime after creating dialog caller maynot want to show it mmediately
                //playing animation will force a display and then set display to none at animationend event
                if (anim == undefined || anim === true) {
                        this.w.style.animationDuration = this._cD;
                        this.w.style.animationName = this._cAnim;
                        this.w.classList.toggle("dummy");
                } else {
                        this.w.style.display = "none";
                }

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

        public onResize(f: () => void) {
                this._onResize = f;
        }


        // public toggleBody1 = () => {
        //         let s = this.b.getAttribute("style");
        //         if (s.indexOf("display:none;") >= 0) {
        //                 this.b.setAttribute("style", s.replace("display:none;", ""));
        //                 this._moveIt(this.w.offsetTop, this.w.offsetLeft);
        //         } else {
        //                 this.b.setAttribute("style", s + "display:none;");
        //         }

        // }
        /**
         * if the height of the window is explicitly set, disabling the body
         * leaves a vacant body in the window.
         * The window height doesnot change on its own and need to be changed
         * manually
         */
        _savHt: string;
        public toggleBody_old = () => {
                if (this.b.style.display == "none") {
                        this.b.style.display = "grid";
                        this.w.style.height = this._savHt;
                        this.minIcon.style.display = "inline-block";
                        this.addIcon.style.display = "none";
                } else {
                        this.b.style.display = "none";
                        this._savHt = this.w.style.height;
                        this.w.style.height = "auto";
                        this.minIcon.style.display = "none";
                        this.addIcon.style.display = "inline-block";
                }
        }

        _minimized: boolean;
        public toggleBody = () => {
                if (this._minimized) {
                        this._minimized = false;
                        this.b.style.height = this._savHt;
                        this.minIcon.style.display = "inline-block";
                        this.addIcon.style.display = "none";
                        //when expanding call _moveIt. _moveIt adjusts the positions of the window in case it spills outside the screen
                        this._moveIt(this.w.offsetTop, this.w.offsetLeft);
                } else {
                        this._minimized = true;
                        this._savHt = this.w.style.height;
                        this.b.style.height = "0px";
                        this.minIcon.style.display = "none";
                        this.addIcon.style.display = "inline-block";
                }
        }

        public setEffects(openEffect: string, openDuration?: string, closeEffect?: string, closeDuration?: string) {
                this._oEffect = openEffect;
                this._cEffect = closeEffect;

                switch (openEffect) {
                        case "fade": {
                                this._oAnim = "fadeIn";
                                this._cAnim = "fadeOut";
                                break;
                        }
                        case "scale": {
                                this._oAnim = "scaleIn";
                                this._cAnim = "scaleOut";
                                break;
                        }
                        case "rotate": {
                                this._oAnim = "rotateIn";
                                this._cAnim = "rotateOut";
                                break;
                        }
                        case "newsFlash": {
                                this._oAnim = "nfIn";
                                this._cAnim = "nfOut";
                                break;
                        }
                        //this.w.style.animationName = this._oAnim;
                }
                if (openDuration !== undefined) {
                        this._oD = openDuration;
                        //this.w.style.animationDuration = this._oD;
                }
                if (closeEffect !== undefined) {
                        switch (closeEffect) {
                                case "fade": {
                                        this._cAnim = "fadeOut";
                                        break;
                                }
                                case "scale": {
                                        this._cAnim = "scaleOut";
                                        break;
                                }
                                case "rotate": {
                                        this._cAnim = "rotateOut";
                                        break;
                                }
                                case "newsFlash": {
                                        this._cAnim = "nfOut";
                                        break;
                                }
                        }
                }
                if (closeDuration !== undefined) {
                        this._cD = closeDuration;
                }

        }

        public hideTitleBar() {
                this.wb.style.display = "none";
        }
        public showTitleBar() {
                this.wb.setAttribute("style", this._barStyle);
                this.wb.style.backgroundColor = Vishva.theme.colors.b;
                this.wb.style.color = Vishva.theme.colors.f;
        }

        public setTitle(title: string) {
                this.t.innerText = title;
        }

        public setSize(w: string, h: string) {
                this.w.style.width = w;
                this.w.style.height = h;
        }

        public addButton(txt: string): HTMLButtonElement {
                if (this.f == null) {
                        this.f = document.createElement('div');
                        this.b.appendChild(this.f);
                        this.b.style.gridTemplateRows = "auto min-content";
                }

                let button: HTMLButtonElement = VButton.create(txt, txt);
                button.style.marginTop = "1em";
                button.style.marginRight = "0.5em";
                button.style.marginBottom = "0.5em";
                button.style.float = "right";
                this.f.appendChild(button);

                return button;

        }

        public setBackGround(col: string) {
                this.b.style.backgroundColor = col;
        }

        public setForeGround(col: string) {
                this.b.style.color = col;
        }

        public setBorder(col: string) {
                this.w.style.borderColor = col;
        }

        //

        //type: "g" for game use  or "e" for editor use
        private _type: string = "e";
        public setType(type: string) {
                this._type = type;
        }

        constructor(id: string | HTMLElement, title: string, pos: string, width: string | number = 0, height?: string | number, minWidth: string = "0px", modal = false) {

                if (id instanceof HTMLElement) {
                        this.bc = id;
                } else {
                        this.bc = document.getElementById(id);
                }

                this.pos = pos;

                if (height == null || height == "") height = "auto";

                this.w = document.createElement("div");
                this.w.innerHTML = this.ml;
                Vishva.gui.appendChild(this.w);

                // diag window ===========================================
                this.w.setAttribute("style", this._style);
                this.w.style.maxHeight =  Number(Vishva.gui.offsetHeight - 1).toString()+"px";
                this.w.style.overflow = "auto";
                this.w.style.width = <string>width;
                this.w.style.minWidth = minWidth;
                // this.w.style.color = Vishva.theme.darkColors.f;
                // this.w.style.backgroundColor == Vishva.theme.darkColors.b;
                this.w.style.borderColor = Vishva.theme.lightColors.b;

                //open animation
                this.w.style.animationName = this._oAnim;
                this.w.style.animationDuration = this._oD;

                //at the end of open animation change the name to a non existent animation
                //during events like drag or bring forward the dialogs are closed and opened again
                //we donot want these animations to play during those events
                this.w.addEventListener("animationend", (e) => {
                        if (e.animationName == this._oAnim) {
                                (<HTMLElement>e.target).style.animationName = "dummy";
                                if (this._onOpen != null) this._onOpen();
                        }
                });

                this.w.addEventListener("animationend", (e) => {
                        if (e.animationName == this._cAnim) {
                                (<HTMLElement>e.target).style.animationName = this._oAnim;
                                (<HTMLElement>e.target).style.animationDuration = this._oD;
                                (<HTMLElement>e.target).style.display = "none";
                        }
                });

                // diag title bar ===========================================
                this.wb = <HTMLElement>this.w.getElementsByClassName('bar')[0];
                this.showTitleBar();
                //this.wb.onmousedown = this.onMouseDown;
                //this.wb.ondblclick = () => this.position(this.pos);

                this.t = <HTMLElement>this.w.getElementsByClassName('title')[0];
                this.t.innerText = title;
                this.t.onmousedown = this.onMouseDown;
                this.t.ondblclick = () => this.position(this.pos);

                this.minIcon = <HTMLElement>this.w.getElementsByClassName('vdiag-min')[0];
                this.minIcon.addEventListener('click', this.toggleBody);

                this.addIcon = <HTMLElement>this.w.getElementsByClassName('vdiag-add')[0];
                this.addIcon.addEventListener('click', this.toggleBody);

                let closeIcon: HTMLElement = <HTMLElement>this.w.getElementsByClassName('vdiag-close')[0];
                closeIcon.addEventListener('click', this._closeit);

                //diag body ===========================================
                this.b = <HTMLElement>this.w.getElementsByClassName('bdy')[0];
                this.b.appendChild(this.bc);
                this.b.style.color = Vishva.theme.darkColors.f;
                this.b.style.backgroundColor = Vishva.theme.darkColors.b;

                this.b.style.overflow = "auto";
                this.b.style.height = "inherit";

                this.position(pos);
                DialogMgr.vdiags.push(this);

                //should we close the dialog after creation
                //return a closed dialog to the caller and then
                //let the caller call open() to then open it?


        }

}