import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    Animatable,
    Animation,
    Mesh
} from "babylonjs";

export class ActCloakerProp extends ActProperties {
    timeToCloak: number = 1;
}

export class ActuatorCloaker extends ActuatorAbstract {
    a: Animatable;
    s: number;
    e: number;

    public constructor(mesh: Mesh, parms: ActCloakerProp) {
        if (parms != null) {
            super(mesh, parms);
        } else {
            super(mesh, new ActCloakerProp());
        }
        this.s = 1;
        this.e = 0;
    }

    public actuate() {
        var props: ActCloakerProp = <ActCloakerProp>this.properties;
        if (props.toggle) {
            if (props.state_notReversed) {
                this.s = 1;
                this.e = 0;
            } else {
                this.s = 0;
                this.e = 1;
            }
            props.state_notReversed = !props.state_notReversed;
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


SNAManager.getSNAManager().addActuator("Cloaker", ActuatorCloaker);