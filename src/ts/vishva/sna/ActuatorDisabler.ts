namespace org.ssatguru.babylonjs.vishva {

    import Mesh = BABYLON.Mesh;
 
    export class ActDisablerProp extends ActProperties {
        public unmarshall(obj: Object): ActDisablerProp {
            return null;
        }
    }
    
    export class ActuatorDisabler extends ActuatorAbstract {


        public constructor(mesh: Mesh, prop: ActDisablerProp) {
            if (prop!=null){
                super(mesh, prop);
            }else{
                super(mesh, new ActDisablerProp());
            }
        }

        public actuate() {
            let enable :boolean = false;
            if (this.properties.toggle) {
                if (this.properties.state_toggle) {
                    enable = false
                } else {
                    enable = true;
                    }
                this.properties.state_toggle = !this.properties.state_toggle;
            } else {
                enable =false;
                }
            this.mesh.setEnabled(enable);
            this.onActuateEnd();

        }

        public stop() {
            this.mesh.setEnabled(true)
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Disabler";
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

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Disabler", org.ssatguru.babylonjs.vishva.ActuatorDisabler);