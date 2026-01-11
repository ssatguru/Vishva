/**
 * Switches lights attached to a mesh on or off.
 * It does so by enabling or disabling lights attached to a mesh.
 */
import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh, Node, Light } from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";


export class ActLightProp extends ActProperties {
    switchType: SelectType = new SelectType();

    constructor() {
        super();
        this.switchType.values = ["OnSwitch", "OffSwitch"];
        this.switchType.value = "OnSwitch";
    }
}

export class ActuatorLight extends ActuatorAbstract {

    override init(){}

    override actuate() {
        let lights: Light[] = this.getLights(this.mesh);
        if (lights.length == 0) {
            this.onActuateEnd();
            return;
        }

        let actLightProp: ActLightProp = <ActLightProp>this.properties;

        let enable: boolean;
        if (actLightProp.switchType.value == "OnSwitch") enable = true;
        else enable = false;

        if (this.properties.toggle) {
            if (!this.properties.state_notReversed) {
                enable = !enable;
            }
            this.properties.state_notReversed = !this.properties.state_notReversed;
        }

        this.switchLights(lights, enable);
        this.onActuateEnd();

    }

    private switchLights(lights: Light[], enable: boolean) {
        for (let light of lights) {
            light.setEnabled(enable);
        }
    }

    private getLights(mesh: Mesh): Light[] {
        let nodes: Node[] = mesh.getDescendants(false);
        let lights: Light[] = [];
        for (let node of nodes) {
            if (node instanceof Light) {
                lights.push(node);
            }
        }
        return lights;
    }

    override stop() {
        let actLightProp: ActLightProp = <ActLightProp>this.properties;
        let enable: boolean;
        if (actLightProp.switchType.value == "OnSwitch") enable = true;
        else enable = false;
        this.switchLights(this.getLights(this.mesh), true);
    }

    override isReady(): boolean {
        return true;
    }

    override getName(): string {
        return "Light";
    }

    override getPropertiesType(): typeof ActProperties {
        return ActLightProp;
    }

    override onPropertiesChange() {
        if (this.properties.autoStart) {
            this.start(this.properties.signalId);
        }
    }

    override cleanUp() {
        this.properties.loop = false;
    }
}



SNAManager.getSNAManager().addActuator("Light", ActuatorLight);