namespace org.ssatguru.babylonjs.vishva.gui {
    import Vector2=BABYLON.Vector2;
    import Vector3=BABYLON.Vector3;
    import Color3=BABYLON.Color3;
    import GroundMesh=BABYLON.GroundMesh;
    import MeshBuilder=BABYLON.MeshBuilder;
    import Tags=BABYLON.Tags;
    import AbstractMesh=BABYLON.AbstractMesh;
    /**
     * Provides a UI to manage Ground Dimensions
     */
    export class GrndDimUI {

        private _vishva: Vishva;
        private _grndID: VInputText;
        private _grndHM: VFileInput;
        private _grndW: VInputNumber;
        private _grndL: VInputNumber;
        private _grndS: VInputNumber;
        private _grndminH: VInputNumber;
        private _grndmaxH: VInputNumber;
        private _grndUVOffset: VInputVector2;
        private _grndUVScale: VInputVector2;
        private _grndFC: VInputVector3;
        private _grndUpdate: HTMLButtonElement;

        constructor(vishva: Vishva) {
            this._vishva=vishva;

            let grnd: GroundMesh=<GroundMesh>vishva.ground;

            this._grndID=new VInputText("grndID",grnd.name);
            this._grndHM=new VFileInput("grndHM",null,"Height Map Image",DialogMgr.centerBottom,this._vishva.vishvaFiles,"\.bmp$|\.png$|\.tga$\.jpg$",true)
            this._grndW=new VInputNumber("grndW",grnd._width);
            this._grndL=new VInputNumber("grndL",grnd._height);
            this._grndS=new VInputNumber("grndS",grnd.subdivisions);
            this._grndminH=new VInputNumber("grndminH");
            this._grndmaxH=new VInputNumber("grndmaxH");
            this._grndUVOffset=new VInputVector2("grndUVOffset",new Vector2(0,0));
            this._grndUVScale=new VInputVector2("grndUVScale",new Vector2(1,1));
            this._grndFC=new VInputVector3("grndFC",new Vector3(0.3,0.59,0.11));
            this._grndUpdate=<HTMLButtonElement>document.getElementById("grndUpdate");
            this._grndUpdate.onclick=() => {this.updateGround();};
        }


        public update() {
            let grnd: GroundMesh=<GroundMesh>this._vishva.ground;
            this._grndID.setValue(grnd.name);
            return true;
        }

        private updateGround() {
            console.log("updateGround");
            let _grnd_old: GroundMesh=<GroundMesh>this._vishva.ground;

            //            _grnd_old.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.PositionKind,true);
            //            _grnd_old.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.NormalKind,true);
            //            console.log(this._grndHM.getValue());
            //            _grnd_old.applyDisplacementMap(
            //                this._grndHM.getValue(),
            //                this._grndminH.getValue(),
            //                this._grndmaxH.getValue(),
            //                () => {console.log("ground updated");},
            //                this._grndUVOffset.getValue(),
            //                this._grndUVScale.getValue()
            //            );
            //
            //            _grnd_old.freezeWorldMatrix();
            //            _grnd_old.checkCollisions=true;
            //            let x=this._vishva.avatar.position.x;
            //            let z=this._vishva.avatar.position.z;
            //
            //            this._vishva.avatar.position.y=_grnd_old.getHeightAtCoordinates(x,z)+5;
            let v: Vector3=this._grndFC.getValue();
            let color: Color3=new Color3(v.x,v.y,v.z);
            MeshBuilder.CreateGroundFromHeightMap("ground",this._grndHM.getValue(),{
                width: this._grndW.getValue(),
                height: this._grndL.getValue(),
                //                width: 10240,
                //                height: 10240,
                minHeight: this._grndminH.getValue(),
                maxHeight: this._grndmaxH.getValue(),
                //                minHeight: 0,
                //                maxHeight: 1000,
                subdivisions: this._grndS.getValue(),
                colorFilter: color,
                updatable: false,
                onReady: (grnd: GroundMesh) => {
                    grnd.material=_grnd_old.material;
                    grnd.checkCollisions=true;
                    grnd.isPickable=false;
                    Tags.AddTagsTo(grnd,"Vishva.ground Vishva.internal");

                    grnd.receiveShadows=true;

                    //HeightmapImpostor doesnot seem to work.
                    //                    if(this.enablePhysics) {
                    //                        grnd.physicsImpostor=new BABYLON.PhysicsImpostor(grnd,BABYLON.PhysicsImpostor.HeightmapImpostor,{mass: 0,restitution: 0.1},this.scene);
                    //                    }
                    grnd.freezeWorldMatrix();
                    this._vishva.ground=grnd;
                    this._vishva.switchEditControl(grnd);
                    this._adjustHts(grnd,_grnd_old);
                    _grnd_old.dispose();


//                    let x=this._vishva.avatar.position.x;
//                    let z=this._vishva.avatar.position.z;
//                    this._vishva.avatar.position.y=grnd.getHeightAtCoordinates(x,z)+1;
//                    this._vishva.spawnPosition.y=grnd.getHeightAtCoordinates(this._vishva.spawnPosition.x,this._vishva.spawnPosition.z)+1;
                }

            },this._vishva.scene);
        }

        private _adjustHts(grnd: GroundMesh,grnd_old: GroundMesh) {
            //all meshes
            let meshes: AbstractMesh[]=this._vishva.scene.meshes;
            for(let mesh of meshes) {
                if(mesh.parent!=null) continue;
                let x=mesh.position.x;
                let y=mesh.position.y;
                let z=mesh.position.z;
                let dy=y-grnd_old.getHeightAtCoordinates(x,z);
                mesh.position.y=grnd.getHeightAtCoordinates(x,z)+dy;
            }
            
            let cam=this._vishva.mainCamera;
            let x=cam.position.x;
            let y=cam.position.y;
            let z=cam.position.z;
            let dy=y-grnd_old.getHeightAtCoordinates(x,z);
            cam.position.y=grnd.getHeightAtCoordinates(x,z)+dy;
            
            this._vishva.spawnPosition.y=grnd.getHeightAtCoordinates(this._vishva.spawnPosition.x,this._vishva.spawnPosition.z)+1;

        }
    }
}