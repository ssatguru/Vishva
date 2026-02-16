import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";



import {
    Animatable,
    Animation,
    Axis,
    Mesh,
    Quaternion,
    Vector3
} from "babylonjs";
// import Axis = BABYLON.Axis;
// import Mesh = BABYLON.Mesh;
// import Quaternion = BABYLON.Quaternion;

export class ActRotatorParm extends ActProperties {
    x: number = 0;
    y: number = 90;
    z: number = 0;
    duration: number = 1;

    // TODO:always local for now. provide a way to do global rotate
    // boolean local = false;
}

export class ActuatorRotator extends ActuatorAbstract {
    a: Animatable;

    override init(){}

    override actuate() {
        var properties: ActRotatorParm = <ActRotatorParm>this.properties;
        
        // Check if mesh uses quaternion or euler rotation
        const usesQuaternion = this.mesh.rotationQuaternion != null;
        
        if (usesQuaternion) {
            // Original quaternion-based rotation
            var cPos: Quaternion = this.mesh.rotationQuaternion.clone();
            var nPos: Quaternion;
            var rotX: Quaternion = Quaternion.RotationAxis(Axis.X, properties.x * Math.PI / 180);
            var rotY: Quaternion = Quaternion.RotationAxis(Axis.Y, properties.y * Math.PI / 180);
            var rotZ: Quaternion = Quaternion.RotationAxis(Axis.Z, properties.z * Math.PI / 180);
            var abc: Quaternion = Quaternion.RotationYawPitchRoll(properties.y * Math.PI / 180, properties.x * Math.PI / 180, properties.z * Math.PI / 180);
            if (properties.toggle) {
                if (properties.state_notReversed) {
                    nPos = cPos.multiply(abc);
                } else {
                    nPos = cPos.multiply(Quaternion.Inverse(abc));
                }
            } else nPos = cPos.multiply(rotX).multiply(rotY).multiply(rotZ);
            properties.state_notReversed = !properties.state_notReversed;
            
            this.a = Animation.CreateAndStartAnimation("rotate", this.mesh, "rotationQuaternion", 60, 60 * properties.duration, cPos, nPos, Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
                return this.onActuateEnd()
            });
        } else {
            // Euler-based rotation
            var cRot = this.mesh.rotation.clone();
            var nRot = cRot.clone();
            
            if (properties.toggle) {
                if (properties.state_notReversed) {
                    nRot.x += properties.x * Math.PI / 180;
                    nRot.y += properties.y * Math.PI / 180;
                    nRot.z += properties.z * Math.PI / 180;
                } else {
                    nRot.x -= properties.x * Math.PI / 180;
                    nRot.y -= properties.y * Math.PI / 180;
                    nRot.z -= properties.z * Math.PI / 180;
                }
            } else {
                nRot.x += properties.x * Math.PI / 180;
                nRot.y += properties.y * Math.PI / 180;
                nRot.z += properties.z * Math.PI / 180;
            }
            properties.state_notReversed = !properties.state_notReversed;
            
            this.a = Animation.CreateAndStartAnimation("rotate", this.mesh, "rotation", 60, 60 * properties.duration, cRot, nRot, Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
                return this.onActuateEnd()
            });
        }
    }

    override getName(): string {
        return "Rotator";
    }

    override getPropertiesType(): typeof ActProperties {
        return ActRotatorParm;
    }

    override stop() {
        if (this.a != null) {
            this.a.stop();
            window.setTimeout((() => { return this.onActuateEnd() }), 0);
        }
    }

    override cleanUp() {
    }

    override onPropertiesChange() {
        if (this.properties.autoStart) {
            var started: boolean = this.start(this.properties.signalId);
            // sometime a start maynot be possible example during edit
            // if could not start now then queue it for later start
            // if (!started)
            // this.queued++;
        }
    }

    override isReady(): boolean {
        return true;
    }
}

SNAManager.getSNAManager().addActuator("Rotator", ActuatorRotator);