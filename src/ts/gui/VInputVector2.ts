namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector2=BABYLON.Vector2;
    /**
     * provides a ui to input a vector2 value
     */
    export class VInputVector2{

        private _v:Vector2;
        private _x:VInputNumber;
        private _y:VInputNumber;
        
        constructor (v3eID :string,v?:Vector2,readOnly=false){
            if (v){
                this._v=v.clone();
            }else{
                this._v=new Vector2(0,0);
            }
            
            this._x=new VInputNumber(v3eID,this._v.x,readOnly);
            this._x.onChange=(n)=>{
                this._v.x=n;
            }
            
            this._y=new VInputNumber(v3eID,this._v.y,readOnly);
            this._y.onChange=(n)=>{
                this._v.y=n;
            }
           
        }
        
        public getValue():Vector2{
            return this._v;
        }
        
        public setValue(v:Vector2){
            
            this._v.x=v.x;
            this._v.y=v.y;
            
            this._x.setValue(v.x);
            this._y.setValue(v.y);
            
        }
        
        
    }
}