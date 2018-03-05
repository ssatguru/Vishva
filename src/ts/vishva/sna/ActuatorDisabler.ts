namespace org.ssatguru.babylonjs.vishva {

    import Mesh=BABYLON.Mesh;
    import Node=BABYLON.Node;
    
    export class ActDisablerProp extends ActProperties {
    }

    export class ActuatorDisabler extends ActuatorAbstract {


        public constructor(mesh: Mesh,prop: ActDisablerProp) {
            if(prop!=null) {
                super(mesh,prop);
            } else {
                super(mesh,new ActDisablerProp());
            }
        }

        public actuate() {
            let enableState: boolean=false;
            if(this.properties.toggle) {
                enableState = !this.properties.state_notReversed;
                this.properties.state_notReversed=!this.properties.state_notReversed;
            } else {
                enableState=false;
            }
            this.mesh.setEnabled(enableState);
            this.disableChilds(this.mesh, enableState);
            this.onActuateEnd();
        }
        
        private disableChilds(mesh:Mesh, enableState:boolean){
            let nodes:Node[]= mesh.getDescendants(false);
            for (let node of nodes){
                node.setEnabled(enableState);
            }
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

        public onPropertiesChange() {
            if(this.properties.autoStart) {
                var started: boolean=this.start(this.properties.signalId);
            }
        }

        public cleanUp() {
            this.properties.loop=false;
        }
    }
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Disabler",org.ssatguru.babylonjs.vishva.ActuatorDisabler);