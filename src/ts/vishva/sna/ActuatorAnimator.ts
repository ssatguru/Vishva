namespace org.ssatguru.babylonjs.vishva {

    import AnimationRange = BABYLON.AnimationRange;
    import Mesh = BABYLON.Mesh;
    import SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
    import Skeleton = BABYLON.Skeleton;
    
    export class AnimatorProp extends ActProperties {
        animationRange: SelectType = new SelectType();

        rate: number = 1;

        public unmarshall(obj: Object): AnimatorProp {
            return null;
        }
    }
    
    export class ActuatorAnimator extends ActuatorAbstract {
        public constructor(mesh: Mesh, parms: AnimatorProp) {
            
            if (parms != null) {
                super(mesh, parms);
            } else {
                
                super(mesh, new AnimatorProp());
            }
            var prop: AnimatorProp = <AnimatorProp>this.properties;
            var skel: Skeleton = mesh.skeleton;
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

        public actuate() {
            var prop: AnimatorProp = <AnimatorProp>this.properties;
            if (this.mesh.skeleton != null) {
                this.mesh.skeleton.beginAnimation(prop.animationRange.value, false, prop.rate, () => { return this.onActuateEnd() });
            }
        }

        public stop() {
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Animator";
        }

        public processUpdateSpecific() {
            if (this.properties.autoStart) {
                var started: boolean = this.start();
            }
        }

        public cleanUp() {
            this.properties.loop = false;
        }
    }
    
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Animator", org.ssatguru.babylonjs.vishva.ActuatorAnimator);