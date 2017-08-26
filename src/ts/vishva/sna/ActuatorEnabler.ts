

namespace org.ssatguru.babylonjs.vishva {

    import Mesh = BABYLON.Mesh;

    export class ActEnablerProp extends ActProperties {
        public unmarshall(obj: Object): ActEnablerProp {
            return null;
        }
    }
    
    export class ActuatorEnabler extends ActuatorAbstract {


        public constructor(mesh: Mesh, prop: ActEnablerProp) {
            if (prop!=null){
                super(mesh, prop);
            }else{
                super(mesh, new ActEnablerProp());
            }
        }

        public actuate() {
            let enable :boolean = false;
            if (this.properties.toggle) {
                if (this.properties.state_toggle) {
                    enable = true
                } else {
                    enable = false;
                    }
                this.properties.state_toggle = !this.properties.state_toggle;
            } else {
                enable =true;
                }
            this.mesh.setEnabled(enable);
            this.onActuateEnd();

        }

        public stop() {
            this.mesh.setEnabled(false)
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Enabler";
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

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Enabler", org.ssatguru.babylonjs.vishva.ActuatorEnabler);