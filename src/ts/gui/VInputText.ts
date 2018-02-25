namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * provides a ui to input a vector3 value
     */
    export class VInputText {

        private _inE: HTMLInputElement;
        public onChange: (s: string) => void;

        constructor(eID: string|HTMLElement,value="") {
            let e: HTMLElement;
            
            if(eID instanceof HTMLElement) {
                e=eID;
            } else e=document.getElementById(eID);

            this._inE=document.createElement("input");
            this._inE.type="text";

            this._inE.style.display="inline-block";
            this._inE.onkeypress=(e) => {
                e.stopPropagation()
            }
            this._inE.onkeydown=(e) => {
                e.stopPropagation()
            }
            this._inE.onkeyup=(e) => {
                e.stopPropagation()
            }
            this._inE.onchange=(e) => {
                e.preventDefault();
                if(this.onChange!=null) {
                    this.onChange(this._inE.value);
                }
            }
            e.appendChild(this._inE);
        }



        public getValue(): string {
            return this._inE.value;
        }
        public setValue(s: string) {
            this._inE.value=s;
        }

    }
}