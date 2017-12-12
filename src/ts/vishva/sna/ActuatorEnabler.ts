

namespace org.ssatguru.babylonjs.vishva {

    import Mesh=BABYLON.Mesh;
    import Node=BABYLON.Node;

    export class ActEnablerProp extends ActProperties {
    }

    export class ActuatorEnabler extends ActuatorAbstract {


        public constructor(mesh: Mesh,prop: ActEnablerProp) {
            if(prop!=null) {
                super(mesh,prop);
            } else {
                super(mesh,new ActEnablerProp());
            }
        }

        public actuate() {
            let enableState: boolean=true;
            if(this.properties.toggle) {
                enableState = this.properties.notReversed;
                this.properties.notReversed=!this.properties.notReversed;
            } 
            this.mesh.setEnabled(enableState);
            this.enableChilds(this.mesh,enableState);
            this.onActuateEnd();

        }

        private enableChilds(mesh: Mesh,enableState: boolean) {
            let nodes: Node[]=mesh.getDescendants(false);
            for(let node of nodes) {
                node.setEnabled(enableState);
            }
        }

        public stop() {
            this.mesh.setEnabled(true);
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Enabler";
        }

        public onPropertiesChange() {
            if(this.properties.autoStart) {
                var started: boolean=this.start();
            }
        }

        public cleanUp() {
            this.properties.loop=false;
        }
    }

}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Enabler",org.ssatguru.babylonjs.vishva.ActuatorEnabler);