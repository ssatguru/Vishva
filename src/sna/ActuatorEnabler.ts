import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh, Node } from "babylonjs";

export class ActEnablerProp extends ActProperties {
}

export class ActuatorEnabler extends ActuatorAbstract {


    override init(){
    }

    override actuate() {
        let enableState: boolean = true;
        if (this.properties.toggle) {
            enableState = this.properties.state_notReversed;
            this.properties.state_notReversed = !this.properties.state_notReversed;
        }
        this.mesh.setEnabled(enableState);
        this.enableChilds(this.mesh, enableState);
        this.onActuateEnd();

    }

    private enableChilds(mesh: Mesh, enableState: boolean) {
        let nodes: Node[] = mesh.getDescendants(false);
        for (let node of nodes) {
            node.setEnabled(enableState);
        }
    }

    override stop() {
        this.mesh.setEnabled(true);
    }

    override isReady(): boolean {
        return true;
    }

    override getName(): string {
        return "Enabler";
    }

    override getPropertiesType(): typeof ActProperties {
        return ActEnablerProp;
    }

    override onPropertiesChange() {
        if (this.properties.autoStart) {
            var started: boolean = this.start(this.properties.signalId);
        }
    }

    override cleanUp() {
        this.properties.loop = false;
    }
}


SNAManager.getSNAManager().addActuator("Enabler", ActuatorEnabler);