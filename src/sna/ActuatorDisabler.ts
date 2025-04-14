import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    Mesh,
    Node
} from "babylonjs";

export class ActDisablerProp extends ActProperties {
}

export class ActuatorDisabler extends ActuatorAbstract {


    public constructor(mesh: Mesh, parms: ActDisablerProp) {
        super(mesh, parms != null ? parms : new ActDisablerProp());
    }

    public actuate() {
        let enableState: boolean = false;
        if (this.properties.toggle) {
            enableState = !this.properties.state_notReversed;
            this.properties.state_notReversed = !this.properties.state_notReversed;
        } else {
            enableState = false;
        }
        this.mesh.setEnabled(enableState);
        this.disableChilds(this.mesh, enableState);
        this.onActuateEnd();
    }

    private disableChilds(mesh: Mesh, enableState: boolean) {
        let nodes: Node[] = mesh.getDescendants(false);
        for (let node of nodes) {
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
        if (this.properties.autoStart) {
            var started: boolean = this.start(this.properties.signalId);
        }
    }

    public cleanUp() {
        this.properties.loop = false;
    }
}

SNAManager.getSNAManager().addActuator("Disabler", ActuatorDisabler);