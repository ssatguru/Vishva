namespace org.ssatguru.babylonjs.vishva {

    import Animatable = BABYLON.Animatable;
    import Animation = BABYLON.Animation;
    import Mesh = BABYLON.Mesh;
    import Vector3 = BABYLON.Vector3;
    import Matrix = BABYLON.Matrix;

    export class ActMoverParm extends ActProperties {
        x: number = 1;
        y: number = 1;
        z: number = 1;
        duration: number = 1;
        local: boolean = false;

        public unmarshall(obj: Object): ActMoverParm {
            return <ActMoverParm> obj;
        }
    }

    export class ActuatorMover extends ActuatorAbstract {
        a: Animatable;

        public constructor(mesh: Mesh, parms: ActProperties) {
            if (parms != null) {
                super(mesh, parms);
            } else {
                super(mesh, new ActMoverParm());
            }
        }


        public actuate() {
            var props: ActMoverParm = <ActMoverParm> this.properties;
            var cPos: Vector3 = this.mesh.position.clone();
            var nPos: Vector3;
            var moveBy: Vector3;
            if (props.local) {
                var meshMatrix: Matrix = this.mesh.getWorldMatrix();
                var localMove: Vector3 = new Vector3(props.x * (1 / this.mesh.scaling.x), props.y * (1 / this.mesh.scaling.y), props.z * (1 / this.mesh.scaling.z));
                moveBy = Vector3.TransformCoordinates(localMove, meshMatrix).subtract(this.mesh.position);
            } else moveBy = new Vector3(props.x, props.y, props.z);
            if (props.toggle) {
                if (props.state_toggle) {
                    nPos = cPos.add(moveBy);
                } else {
                    nPos = cPos.subtract(moveBy);
                }
                props.state_toggle = !props.state_toggle;
            } else {
                nPos = cPos.add(moveBy);
            }
            this.a = Animation.CreateAndStartAnimation("move", this.mesh, "position", 60, 60 * props.duration, cPos, nPos, 0, null, () => {return this.onActuateEnd()});
        }

        public getName(): string {
            return "Mover";
        }

        public stop() {
            if (this.a != null) {
                this.a.stop();
                window.setTimeout((() => {return this.onActuateEnd()}), 0);
            }
        }

        public cleanUp() {
        }

        public processUpdateSpecific() {
            if (this.properties.autoStart) {
                var started: boolean = this.start();
            }
        }

        public isReady(): boolean {
            return true;
        }

        public newInstance(mesh: Mesh, parms: ActProperties): ActuatorMover {
            return new ActuatorMover(mesh, parms);
        }
    }
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Mover", org.ssatguru.babylonjs.vishva.ActuatorMover);
