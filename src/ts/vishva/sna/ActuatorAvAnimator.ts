namespace org.ssatguru.babylonjs.vishva {

    import AnimationRange=BABYLON.AnimationRange;
    import Animatable=BABYLON.Animatable;
    import AbstractMesh=BABYLON.AbstractMesh;
    import ArcRotateCamera=BABYLON.ArcRotateCamera;
    import Mesh=BABYLON.Mesh;
    import SelectType=org.ssatguru.babylonjs.vishva.gui.SelectType;
    import Skeleton=BABYLON.Skeleton;
    import Scene=BABYLON.Scene;
    import Tags=BABYLON.Tags;
    import Vector3=BABYLON.Vector3;

    export class AvAnimatorProp extends ActProperties {
        changeTrans: boolean=true;
        position: Vector3=new Vector3(0,0,0);
        rotation: Vector3=new Vector3(0,0,0);
        makeChild: boolean=true;
        focusOnAV: boolean=true;
        focusPosition: Vector3=new Vector3(0,0,0);
        animationRange: SelectType=new SelectType();
        rate: number=1;
    }

    /**
     * this actuator will play animation on the Avatar.
     * On receiving a signal this will "capture" the AV
     * To "release" the av send a disable signal.
     * One will have to send an enable signal eventually to make it
     * effective one more time.
     * One way to handle this would be to set the signal id and the signalEnable
     * to the same signal.
     * This way the same signal would enable and start it 
     */
    export class ActuatorAvAnimator extends ActuatorAbstract {
        
        public constructor(mesh: Mesh,parms: AvAnimatorProp) {

            if(parms!=null) {
                super(mesh,parms);
            } else {
                super(mesh,new AvAnimatorProp());
            }

            this._sp=new Vector3(0,0,0);
            this._sr=new Vector3(0,0,0);
            this._sct=new Vector3(0,0,0);
            this._scp=new Vector3(0,0,0);

            var prop: AvAnimatorProp=<AvAnimatorProp>this.properties;
            var scene: Scene=this.mesh.getScene();
            let avMesh=scene.getMeshesByTags("Vishva.avatar")[0];
            var skel: Skeleton=avMesh.skeleton;
            if(skel!=null) {
                var ranges: AnimationRange[]=skel.getAnimationRanges();
                var animNames: string[]=new Array(ranges.length);
                var i: number=0;
                for(let range of ranges) {
                    animNames[i]=range.name;
                    i++;
                }
                prop.animationRange.values=animNames;
            } else {
                prop.animationRange.values=[""];
            }
        }
        private anim: Animatable;
        private avMesh: Mesh;
        //save AV position, rotation
        private _sp: Vector3;
        private _sr: Vector3;
        //save camera target and postion
        private _sct: Vector3;
        private _scp: Vector3;
        public actuate() {
            let prop: AvAnimatorProp=<AvAnimatorProp>this.properties;
            this.avMesh=SNAManager.getSNAManager().getAV();
            let skel: Skeleton=this.avMesh.skeleton;
            if(skel!=null) {
                SNAManager.getSNAManager().disableAV();

                this._sp.copyFrom(this.avMesh.position);
                this._sr.copyFrom(this.avMesh.rotation);

                if(prop.makeChild) {
                    this.avMesh.parent=this.mesh;
                    if(prop.changeTrans) {
                        this.avMesh.position.copyFrom(prop.position);
                        this.avMesh.rotation.copyFrom(prop.rotation);
                    } else {
                        this.avMesh.position.subtractInPlace(this.mesh.position);
                    }
                } else {
                    if(prop.changeTrans) {
                        this.mesh.position.addToRef(prop.position,this.avMesh.position);
                        this.avMesh.rotation.copyFrom(prop.rotation);
                    }
                }
                if(prop.focusOnAV) {
                    let camera: ArcRotateCamera=SNAManager.getSNAManager().getCamera();
                    this._scp.copyFrom(camera.position);
                    this._sct.copyFrom(camera.target);
                    camera.setTarget(this.avMesh);
                    //camera.target.copyFrom(this.avMesh.position);
                }

                this.anim=skel.beginAnimation(prop.animationRange.value,prop.loop,prop.rate,() => {return this.onActuateEnd()});
            }
        }

        public stop() {
            let prop: AvAnimatorProp=<AvAnimatorProp>this.properties;
            //anim would be null if user deletes the actuator without it ever being actuated
            if(this.anim!=null) this.anim.stop();
            this.avMesh.parent=null;
            this.avMesh.position.copyFrom(this._sp);
            this.avMesh.rotation.copyFrom(this._sr);
            if(prop.focusOnAV) {
                let camera: ArcRotateCamera=SNAManager.getSNAManager().getCamera();
                camera.setPosition(this._scp.clone());
                camera.setTarget(this._sct.clone());
            }
            SNAManager.getSNAManager().enableAV();
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "AvAnimator";
        }

        public onPropertiesChange() {
            if(this.properties.autoStart) {
                this.start(this.properties.signalId);
            }
        }

        public cleanUp() {
            this.properties.loop=false;
        }
    }

}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("AvAnimator",org.ssatguru.babylonjs.vishva.ActuatorAvAnimator);