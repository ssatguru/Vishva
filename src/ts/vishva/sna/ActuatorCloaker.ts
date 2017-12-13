

namespace org.ssatguru.babylonjs.vishva {
   
    import Animatable = BABYLON.Animatable;
    import Animation = BABYLON.Animation;
    import Mesh = BABYLON.Mesh;
    
    export class ActCloakerProp extends ActProperties {
        timeToCloak: number = 1;
    }
    
    export class ActuatorCloaker extends ActuatorAbstract {
        a: Animatable;
        s: number;
        e: number;

        public constructor(mesh: Mesh, parms: ActCloakerProp){
            if (parms!=null){
                super(mesh, parms);
            }else{
                super(mesh, new ActCloakerProp());
            }
            this.s=1;
            this.e=0;
        }

        public actuate() {
            var props: ActCloakerProp = <ActCloakerProp>this.properties;
            if (props.toggle) {
                if (props.notReversed) {
                    this.s = 1;
                    this.e = 0;
                } else {
                    this.s = 0;
                    this.e = 1;
                }
                props.notReversed = !props.notReversed;
            } else {
                this.s = 1;
                this.e = 0;
            }

            this.a = Animation.CreateAndStartAnimation("cloaker", this.mesh, "visibility", 60, 60 * props.timeToCloak, this.s, this.e, 0, null, () => { return this.onActuateEnd() });
        }

        public stop() {
            if (this.a != null) {
                this.a.stop();
                window.setTimeout((() => { return this.onActuateEnd() }), 0);
            }
        }
        
        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Cloaker";
        }

        public onPropertiesChange() {
            if (this.properties.autoStart) {
                var started: boolean = this.start(this.properties.signalId);
            }
        }

        public cleanUp() {
            this.properties.loop = false;
        }
    }
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Cloaker", org.ssatguru.babylonjs.vishva.ActuatorCloaker);