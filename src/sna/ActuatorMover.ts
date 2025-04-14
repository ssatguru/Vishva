import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    Animatable,
    Animation,
    Mesh,
    Vector3,
    Matrix
} from "babylonjs";

export class ActMoverParm extends ActProperties {
    x: number = 1;
    y: number = 1;
    z: number = 1;
    duration: number = 1;
    local: boolean = false;
}

export class ActuatorMover extends ActuatorAbstract {
    a: Animatable;

    public constructor(mesh: Mesh, parms: ActMoverParm) {
        super(mesh, parms != null ? parms : new ActMoverParm());
    }

    public actuate() {
        var props: ActMoverParm = <ActMoverParm>this.properties;
        var cPos: Vector3 = this.mesh.position.clone();
        var nPos: Vector3;
        var moveBy: Vector3;
        if (props.local) {
            var meshMatrix: Matrix = this.mesh.getWorldMatrix();
            var localMove: Vector3 = new Vector3(props.x * (1 / this.mesh.scaling.x), props.y * (1 / this.mesh.scaling.y), props.z * (1 / this.mesh.scaling.z));
            moveBy = Vector3.TransformCoordinates(localMove, meshMatrix).subtract(this.mesh.position);
        } else moveBy = new Vector3(props.x, props.y, props.z);
        if (props.toggle) {
            if (props.state_notReversed) {
                nPos = cPos.add(moveBy);
            } else {
                nPos = cPos.subtract(moveBy);
            }
            props.state_notReversed = !props.state_notReversed;
        } else {
            nPos = cPos.add(moveBy);
        }
        this.a = Animation.CreateAndStartAnimation("move", this.mesh, "position", 60, 60 * props.duration, cPos, nPos, 0, null, () => { return this.onActuateEnd() });
    }

     public override getName(): string {
        return "Mover";
    }

    public override stop() {
        if (this.a != null) {
            this.a.stop();
            window.setTimeout((() => { return this.onActuateEnd() }), 0);
        }
    }
    
    public override cleanUp() {
    }

    public override onPropertiesChange() {
        if (this.properties.autoStart) {
            var started: boolean = this.start(this.properties.signalId);
        }
    }

    public override isReady(): boolean {
        return true;
    }

    public newInstance(mesh: Mesh, parms: ActMoverParm): ActuatorMover {
        return new ActuatorMover(mesh, parms);
    }
}


SNAManager.getSNAManager().addActuator("Mover", ActuatorMover);
