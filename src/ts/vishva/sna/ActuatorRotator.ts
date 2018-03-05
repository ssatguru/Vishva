
namespace org.ssatguru.babylonjs.vishva {

    import Animatable = BABYLON.Animatable;
    import Animation = BABYLON.Animation;
    import Axis = BABYLON.Axis;
    import Mesh = BABYLON.Mesh;
    import Quaternion = BABYLON.Quaternion;

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

        public constructor(mesh: Mesh, parms: ActRotatorParm) {
            if (parms != null) {
                super(mesh, parms);
            } else {
                super(mesh, new ActRotatorParm());
            }
        }

        public actuate() {
            var properties: ActRotatorParm = <ActRotatorParm> this.properties;
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
            var cY: number = this.mesh.position.y;
            var nY: number = this.mesh.position.y + 5;
            this.a = Animation.CreateAndStartAnimation("rotate", this.mesh, "rotationQuaternion", 60, 60 * properties.duration, cPos, nPos, 0, null, () => {
            return this.onActuateEnd()});
        }

        public getName(): string {
            return "Rotator";
        }

        public stop() {
            if (this.a != null) {
                this.a.stop();
                window.setTimeout((() => {return this.onActuateEnd()}), 0);
            }
        }

        public cleanUp() {
        }

        public onPropertiesChange() {
            if (this.properties.autoStart) {
                var started: boolean = this.start(this.properties.signalId);
                // sometime a start maynot be possible example during edit
                // if could not start now then queue it for later start
                // if (!started)
                // this.queued++;
            }
        }

        public isReady(): boolean {
            return true;
        }
    }
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Rotator", org.ssatguru.babylonjs.vishva.ActuatorRotator);