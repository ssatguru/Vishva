namespace org.ssatguru.babylonjs.vishva.gui {
    /**
     * provides a ui to input a vector3 value
     */
    export class InputNumber {

        private _inE: HTMLInputElement;
        public onChange:(n:number)=>void;

        constructor(eID: string,value=0) {
            let e: HTMLElement=document.getElementById(eID);

            this._inE=document.createElement("input");
            this._inE.type="text";
            this._inE.value=Number(value).toString();
            this._inE.size=2;
            this._inE.style.display="inline-block";
            this._inE.onkeypress=(e)=>{
                e.stopPropagation()
            }
            this._inE.onkeydown=(e)=>{
                e.stopPropagation()
            }
            this._inE.onkeyup=(e)=>{
                e.stopPropagation()
            }
            this._inE.onchange=(e) => {
                let n: number=Number(this._inE.value);
                if(isNaN(n)) this._inE.value="0";
                e.preventDefault();
                if (this.onChange!=null){
                    this.onChange(Number(this._inE.value));
                }
            }
            e.appendChild(this._inE);
        }
        
        

        public getValue(): number {
            let n: number=Number(this._inE.value);
            if(isNaN(n)) return 0;
            else return n;
        }
        public setValue(n:number){
            this._inE.value=Number(n).toString();
        }

    }
}