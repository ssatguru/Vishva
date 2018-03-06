namespace org.ssatguru.babylonjs.vishva {

    import AnimationRange = BABYLON.AnimationRange;
    import Animatable=BABYLON.Animatable;
    import Mesh = BABYLON.Mesh;
    import SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
    import Skeleton = BABYLON.Skeleton;
    import Scene = BABYLON.Scene;
    import Tags = BABYLON.Tags;
    import Vector3 = BABYLON.Vector3;
    
    export class AvAnimatorProp extends ActProperties {
        position:Vector3 = new Vector3(0,0,0);
        rotation:Vector3 = new Vector3(0,0,0);
        child:boolean=true;
        animationRange: SelectType = new SelectType();
        rate: number = 1;
     }
    
    /**
     * this actuator will play animation on the Avatar
     */
    export class ActuatorAvAnimator extends ActuatorAbstract {
        public constructor(mesh: Mesh, parms: AvAnimatorProp) {
            
            if (parms != null) {
                super(mesh, parms);
            } else {
                super(mesh, new AvAnimatorProp());
            }
            var prop: AvAnimatorProp = <AvAnimatorProp>this.properties;
            var scene: Scene = this.mesh.getScene();
            let avMesh = scene.getMeshesByTags("Vishva.avatar" )[0];
            var skel: Skeleton = avMesh.skeleton;
            if (skel != null) {
                var getAnimationRanges: Function = <Function>skel["getAnimationRanges"];
                var ranges: AnimationRange[] = <AnimationRange[]>getAnimationRanges.call(skel);
                var animNames: string[] = new Array(ranges.length);
                var i: number = 0;
                for (var index160 = 0; index160 < ranges.length; index160++) {
                    var range = ranges[index160];
                    {
                        animNames[i] = range.name;
                        i++;
                    }
                }
                prop.animationRange.values = animNames;
            } else {
                prop.animationRange.values = [""];
            }
        }
        private anim:Animatable;
        private avMesh:Mesh;
        public actuate() {
            let prop: AvAnimatorProp = <AvAnimatorProp>this.properties;
            this.avMesh=SNAManager.getSNAManager().getAV();
            let skel: Skeleton = this.avMesh.skeleton;
            if (skel != null) {
                SNAManager.getSNAManager().disableAV();
                
                if (prop.child){
                    this.avMesh.parent=this.mesh;
                    this.avMesh.position=prop.position;
                    
                }else{
                    this.mesh.position.addToRef(prop.position,this.avMesh.position);
                }
                this.avMesh.rotation=prop.rotation;
                this.anim=skel.beginAnimation(prop.animationRange.value,prop.loop, prop.rate, () => { return this.onActuateEnd() });
            }
        }

        public stop() {
            this.anim.stop();
            this.avMesh.parent=null;
            SNAManager.getSNAManager().enableAV();
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "AvAnimator";
        }

        public onPropertiesChange() {
            let p: AvAnimatorProp=<AvAnimatorProp>this.properties;
            console.log(p.position);
            if (this.properties.autoStart) {
                var started: boolean=this.start(this.properties.signalId);
            }
        }

        public cleanUp() {
            this.properties.loop = false;
        }
    }
    
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("AvAnimator", org.ssatguru.babylonjs.vishva.ActuatorAvAnimator);