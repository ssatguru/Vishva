/**
 * Switches lights attached to a mesh on or off.
 * It does so by enabling or disabling lights attached to a mesh.
 */

namespace org.ssatguru.babylonjs.vishva {

    import Mesh=BABYLON.Mesh;
    import Node=BABYLON.Node;
    import Light=BABYLON.Light;
    import SelectType=org.ssatguru.babylonjs.vishva.gui.SelectType;

    export class ActLightProp extends ActProperties {
        switchType: SelectType=new SelectType();

        constructor() {
            super();
            this.switchType.values=["OnSwitch","OffSwitch"];
            this.switchType.value="OnSwitch";
        }
    }

    export class ActuatorLight extends ActuatorAbstract {


        public constructor(mesh: Mesh,prop: ActLightProp) {
            if(prop!=null) {
                super(mesh,prop);
            } else {
                super(mesh,new ActLightProp());
            }
        }

        public actuate() {
            let lights: Light[]=this.getLights(this.mesh);
            if (lights.length == 0){
                console.log("no lights");
                this.onActuateEnd();
                return;
            }
            
            let actLightProp: ActLightProp=<ActLightProp>this.properties;

            let enable: boolean;
            if(actLightProp.switchType.value=="OnSwitch") enable=true;
            else enable=false;

            if(this.properties.toggle) {
                if(!this.properties.notReversed) {
                    enable=!enable;
                }
                this.properties.notReversed=!this.properties.notReversed;
            }

            this.switchLights(lights,enable);
            this.onActuateEnd();

        }

        private switchLights(lights: Light[],enable: boolean) {
            for(let light of lights) {
                    light.setEnabled(enable);
            }
        }
        
        private getLights(mesh: Mesh):Light[]{
            let nodes: Node[]=mesh.getDescendants(false);
            let lights:Light[]=[];
            for(let node of nodes) {
                if(node instanceof Light) {
                    lights.push(node);
                }
            }
            console.log(lights);
            return lights;
        }

        public stop() {
            let actLightProp: ActLightProp=<ActLightProp>this.properties;
            let enable: boolean;
            if(actLightProp.switchType.value=="OnSwitch") enable=true;
            else enable=false;
            this.switchLights(this.getLights(this.mesh),true);
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Light";
        }

        public onPropertiesChange() {
            if(this.properties.autoStart) {
                this.start();
            }
        }

        public cleanUp() {
            this.properties.loop=false;
        }
    }

}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Light",org.ssatguru.babylonjs.vishva.ActuatorLight);