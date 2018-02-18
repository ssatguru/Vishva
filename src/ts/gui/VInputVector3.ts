namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector3=BABYLON.Vector3;
    /**
     * provides a ui to input a vector3 value
     */
    export class VInputVector3{

        private _v:Vector3;
        private _x:VInputNumber;
        private _y:VInputNumber;
        private _z:VInputNumber;
        
        constructor (v3eID :string,v?:Vector3){
            if (v){
                this._v=v.clone();
            }else{
                this._v=new Vector3(0,0,0)
            }
            
            this._x=new VInputNumber(v3eID,this._v.x);
            this._x.onChange=(n)=>{
                this._v.x=n;
            }
            this._y=new VInputNumber(v3eID,this._v.y);
            this._y.onChange=(n)=>{
                this._v.y=n;
            }
            this._z=new VInputNumber(v3eID,this._v.z);
            this._z.onChange=(n)=>{
                this._v.z=n;
            }
        }
        
        public getValue():Vector3{
            return this._v;
        }
        
        public setValue(v:Vector3){
            
            this._v.x=v.x;
            this._v.y=v.y;
            this._v.z=v.z;
            
            this._x.setValue(v.x);
            this._y.setValue(v.y);
            this._z.setValue(v.z);
            
        }
        
        
    }
}