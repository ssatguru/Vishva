/*
 * Sensors and Actuators
 */
namespace org.ssatguru.babylonjs.vishva {

    import AbstractMesh = BABYLON.AbstractMesh;
    import Action = BABYLON.Action;
    import ActionEvent = BABYLON.ActionEvent;
    import ActionManager = BABYLON.ActionManager;
    import Animatable = BABYLON.Animatable;
    import Animation = BABYLON.Animation;
    import AnimationRange = BABYLON.AnimationRange;
    import Axis = BABYLON.Axis;
    import ExecuteCodeAction = BABYLON.ExecuteCodeAction;
    import Matrix = BABYLON.Matrix;
    import Mesh = BABYLON.Mesh;
    import Scene = BABYLON.Scene;
    import Skeleton = BABYLON.Skeleton;
    import Sound = BABYLON.Sound;
    import Tags = BABYLON.Tags;
    import Quaternion = BABYLON.Quaternion;
    import Vector3 = BABYLON.Vector3;

    export interface SNAConfig { }

    export class SNAManager {
        sensors: Object;

        actuators: Object;

        sensorList: string[] = ["Touch", "Collision"];

        actuatorList: string[] = ["Animator", "Mover", "Rotator", "Sound", "Cloaker"];

        snaDisabledList: Array<AbstractMesh> = new Array();

        sig2actMap: Object = <Object>new Object();

        static sm: SNAManager;

        constructor() {
        }

        public static getSNAManager(): SNAManager {
            if (SNAManager.sm == null) {
                SNAManager.sm = new SNAManager();
            }
            return SNAManager.sm;
        }

        public setConfig(snaConfig: Object) {
            this.sensors = <Object>snaConfig["sensors"];
            this.actuators = <Object>snaConfig["actuators"];
            this.sensorList = Object.keys(this.sensors);
            this.actuatorList = Object.keys(this.actuators);
        }

        public getSensorList(): string[] {
            return this.sensorList;
        }

        public getActuatorList(): string[] {
            return this.actuatorList;
        }
        
        /*
         * the first constructor is called by the vishva scene unmarshaller
         * the second by the gui to create a new sensor
         */

        public createSensorByName(name: string, mesh: Mesh, prop: SNAproperties): Sensor {
            if (name === "Touch") {
                if (prop != null) return new SensorTouch(mesh, prop); else return new SensorTouch(mesh, new SenTouchProp());
            } else if (name === "Collision") {
                if (prop != null) return new SensorCollision(mesh, prop); else return new SensorCollision(mesh, new SenCollisionProp());
            } else
                return null;
        }
        
        /*
         * the first constructor is called by the vishva scene unmarshaller
         * the second by the gui to create a new actuator
         */
        public createActuatorByName(name: string, mesh: Mesh, prop: SNAproperties): Actuator {
            if (name === "Mover") {
                if (prop != null) return new ActuatorMover(mesh, <ActMoverParm>prop); else return new ActuatorMover(mesh, new ActMoverParm());
            } else if (name === "Rotator") {
                if (prop != null) return new ActuatorRotator(mesh, <ActRotatorParm>prop); else return new ActuatorRotator(mesh, new ActRotatorParm());
            } else if (name === "Sound") {
                if (prop != null) return new ActuatorSound(mesh, <ActSoundProp>prop); else return new ActuatorSound(mesh, new ActSoundProp());
            } else if (name === "Animator") {
                if (prop != null) return new ActuatorAnimator(mesh, <AnimatorProp>prop); else return new ActuatorAnimator(mesh, new AnimatorProp());
            } else if (name === "Cloaker") {
                if (prop != null) return new ActuatorCloaker(mesh, <ActCloakerProp>prop); else return new ActuatorCloaker(mesh, new ActCloakerProp());
            } else
                return null;
        }

        public getSensorParms(sensor: string): Object {
            var sensorObj: Object = <Object>this.sensors[sensor];
            return <Object>sensorObj["parms"];
        }

        public getActuatorParms(actuator: string): Object {
            var actuatorObj: Object = <Object>this.sensors[actuator];
            return <Object>actuatorObj["parms"];
        }

        public emitSignal(signalId: string) {
            if (signalId.trim() === "") return;
            var keyValue: any = this.sig2actMap[signalId];
            if (keyValue != null) {
                window.setTimeout(((acts) => { return this.actuate(acts) }), 0, keyValue);
            }
        }

        private actuate(acts: any) {
            var actuators: Actuator[] = <Actuator[]>acts;
            for (var index151 = 0; index151 < actuators.length; index151++) {
                var actuator = actuators[index151];
                {
                    actuator.start();
                }
            }
        }

        /**
         * this is called to process any signals queued in any of mesh actuators
         * this could be called after say a user has finished editing a mesh during
         * edit all actuators are disabled and some events coudl lead to pending
         * signals one example of such event could be adding a actuator with
         * "autostart" enabled or enabling an existing actuators "autostart" during
         * edit.
         * 
         * @param mesh
         */
        public processQueue(mesh: AbstractMesh) {
            var actuators: Array<Actuator> = <Array<Actuator>>mesh["actuators"];
            if (actuators != null) {
                for (var index152 = 0; index152 < actuators.length; index152++) {
                    var actuator = actuators[index152];
                    {
                        actuator.processQueue();
                    }
                }
            }
        }

        /**
         * this temproraily disables all sensors and actuators on a mesh this could
         * be called for example when editing a mesh
         * 
         * @param mesh
         */
        public disableSnAs(mesh: Mesh) {
            this.snaDisabledList.push(mesh);
            var actuators: Array<ActuatorAbstract> = <Array<ActuatorAbstract>>mesh["actuators"];
            if (actuators != null) {
                for (var index153 = 0; index153 < actuators.length; index153++) {
                    var actuator = actuators[index153];
                    {
                        if (actuator.actuating) actuator.stop();
                    }
                }
            }
        }

        public enableSnAs(mesh: AbstractMesh) {
            var i: number = this.snaDisabledList.indexOf(mesh);
            if (i !== -1) {
                this.snaDisabledList.splice(i, 1);
            }
            var actuators: Array<ActuatorAbstract> = <Array<ActuatorAbstract>>mesh["actuators"];
            if (actuators != null) {
                for (var index154 = 0; index154 < actuators.length; index154++) {
                    var actuator = actuators[index154];
                    {
                        if (actuator.properties.autoStart) actuator.start();
                    }
                }
            }
        }

        /**
         * removes all sensors and actuators from a mesh. this would be called when
         * say disposing off a mesh
         * 
         * @param mesh
         */
        public removeSNAs(mesh: AbstractMesh) {
            var actuators: Array<Actuator> = <Array<Actuator>>mesh["actuators"];
            if (actuators != null) {
                var l: number = actuators.length;
                for (var i: number = l - 1; i >= 0; i--) {
                    actuators[i].dispose();
                }
            }
            var sensors: Array<Sensor> = <Array<Sensor>>mesh["sensors"];
            if (sensors != null) {
                var l: number = sensors.length;
                for (var i: number = l - 1; i >= 0; i--) {
                    sensors[i].dispose();
                }
            }
            var i: number = this.snaDisabledList.indexOf(mesh);
            if (i !== -1) {
                this.snaDisabledList.splice(i, 1);
            }
        }

        public subscribe(actuator: Actuator, signalId: string) {
            var keyValue: any = this.sig2actMap[signalId];
            if (keyValue == null) {
                var actuators: Array<Actuator> = new Array<Actuator>();
                actuators.push(actuator);
                this.sig2actMap[signalId] = actuators;
            } else {
                var actuators: Array<Actuator> = <Array<Actuator>>keyValue;
                actuators.push(actuator);
            }
        }

        public unSubscribe(actuator: Actuator, signalId: string) {
            var keyValue: any = this.sig2actMap[signalId];
            if (keyValue != null) {
                var actuators: Array<Actuator> = <Array<Actuator>>keyValue;
                var i: number = actuators.indexOf(actuator);
                if (i !== -1) {
                    actuators.splice(i, 1);
                }
            }
        }

        public unSubscribeAll() {
        }

        public serializeSnAs(scene: Scene): Object {
            var snas: Array<SNAserialized> = new Array<SNAserialized>();
            var sna: SNAserialized;
            var meshes: AbstractMesh[] = scene.meshes;
            var meshId: string;
            for (var index155 = 0; index155 < meshes.length; index155++) {
                var mesh = meshes[index155];
                {
                    meshId = null;
                    var actuators: Array<Actuator> = <Array<Actuator>>mesh["actuators"];
                    if (actuators != null) {
                        meshId = this.getMeshVishvaUid(mesh);
                        for (var index156 = 0; index156 < actuators.length; index156++) {
                            var actuator = actuators[index156];
                            {
                                sna = new SNAserialized();
                                sna.name = actuator.getName();
                                sna.type = actuator.getType();
                                sna.meshId = meshId;
                                sna.properties = actuator.getProperties();
                                snas.push(sna);
                            }
                        }
                    }
                    var sensors: Array<Sensor> = <Array<Sensor>>mesh["sensors"];
                    if (sensors != null) {
                        if (meshId == null) meshId = this.getMeshVishvaUid(mesh);
                        for (var index157 = 0; index157 < sensors.length; index157++) {
                            var sensor = sensors[index157];
                            {
                                sna = new SNAserialized();
                                sna.name = sensor.getName();
                                sna.type = sensor.getType();
                                sna.meshId = meshId;
                                sna.properties = sensor.getProperties();
                                snas.push(sna);
                            }
                        }
                    }
                }
            }
            return snas;
        }

        public unMarshal(snas: SNAserialized[], scene: Scene) {
            if (snas == null) return;
            for (var index158 = 0; index158 < snas.length; index158++) {
                var sna = snas[index158];
                {
                    var mesh: Mesh = scene.getMeshesByTags(sna.meshId)[0];
                    if (mesh != null) {
                        if (sna.type === "SENSOR") {
                            this.createSensorByName(sna.name, mesh, sna.properties);
                        } else if (sna.type === "ACTUATOR") {
                            this.createActuatorByName(sna.name, mesh, sna.properties);
                        }
                    }
                }
            }
        }

        prevUID: string = "";

        private getMeshVishvaUid(mesh: AbstractMesh): string {
            if (Tags.HasTags(mesh)) {
                var tags: string[] = (<string>Tags.GetTags(mesh, true)).split(" ");
                for (var index159 = 0; index159 < tags.length; index159++) {
                    var tag = tags[index159];
                    {
                        var i: number = tag.indexOf("Vishva.uid.");
                        if (i >= 0) {
                            return tag;
                        }
                    }
                }
            }
            var uid: string;
            uid = "Vishva.uid." + (<number>new Number(Date.now())).toString();
            while ((uid === this.prevUID)) {
                console.log("regenerating uid");
                uid = "Vishva.uid." + (<number>new Number(Date.now())).toString();
            };
            this.prevUID = uid;
            Tags.AddTagsTo(mesh, uid);
            return uid;
        }
    }

    export class SNAserialized {
        name: string;

        type: string;

        meshId: string;

        properties: SNAproperties;

        constructor() {
        }
    }

    export interface SensorActuator {
        getName(): string;

        getType(): string;

        getProperties(): SNAproperties;

        setProperties(properties: SNAproperties);

        /**
         * this is called by the system after the actuator properties are updated
         */
        processUpdateGeneric();

        /**
         * called by {@processUpdateGeneric}' implementors should do their sensor
         * actuator specific updates here if autostart specified then do a start
         * here
         */
        processUpdateSpecific();

        getSignalId(): string;

        dispose();

        /**
         * called by dispose() the implementor of the a sensor actuator should do
         * all cleanup specific to their sensor actuator here
         */
        cleanUp();
    }

    export interface Sensor extends SensorActuator {
        getName(): string;

        getType(): string;

        getProperties(): SNAproperties;

        setProperties(properties: SNAproperties);

        processUpdateGeneric();

        processUpdateSpecific();

        getSignalId(): string;

        dispose();

        cleanUp();

        emitSignal(e: ActionEvent);
    }

    export interface Actuator extends SensorActuator {
        getName(): string;

        getType(): string;

        getProperties(): SNAproperties;

        setProperties(properties: SNAproperties);

        getSignalId(): string;

        processUpdateGeneric();

        processUpdateSpecific();

        dispose();

        cleanUp();

        start(): boolean;

        stop();

        actuate();

        isReady(): boolean;

        processQueue();

        getMesh(): Mesh;
    }

    export abstract class SensorAbstract implements Sensor {
        public abstract getName(): any;
        public abstract processUpdateSpecific(): any;
        public abstract cleanUp(): any;
        properties: SNAproperties;

        mesh: Mesh;

        action: Action;

        public constructor(mesh: Mesh, properties: SNAproperties) {
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.Sensor", "org.ssatguru.babylonjs.SensorActuator"] });
            this.properties = properties;
            this.mesh = mesh;
            var sensors: Array<Sensor> = <Array<Sensor>>this.mesh["sensors"];
            if (sensors == null) {
                sensors = new Array<Sensor>();
                mesh["sensors"] = sensors;
            }
            sensors.push(this);
        }

        public dispose() {
            var sensors: Array<Sensor> = <Array<Sensor>>this.mesh["sensors"];
            if (sensors != null) {
                var i: number = sensors.indexOf(this);
                if (i !== -1) {
                    sensors.splice(i, 1);
                }
            }
            this.cleanUp();
        }

        public getSignalId(): string {
            return this.properties.signalId;
        }

        public setSignalId(sid: string) {
            this.properties.signalId = sid;
        }

        public emitSignal(e: ActionEvent) {
            var i: number = SNAManager.getSNAManager().snaDisabledList.indexOf(this.mesh);
            if (i >= 0) return;
            SNAManager.getSNAManager().emitSignal(this.properties.signalId);
        }

        public getProperties(): SNAproperties {
            return this.properties;
        }

        public setProperties(prop: SNAproperties) {
            this.properties = prop;
        }

        public processUpdateGeneric() {
            this.processUpdateSpecific();
        }

        public getType(): string {
            return "SENSOR";
        }
    }

    export class SensorTouch extends SensorAbstract {
        properties: SNAproperties;

        public constructor(mesh: Mesh, properties: SNAproperties) {
            super(mesh, properties);
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.Sensor", "org.ssatguru.babylonjs.SensorActuator"] });
            if (this.mesh.actionManager == null) {
                this.mesh.actionManager = new ActionManager(mesh.getScene());
            }
            this.action = new ExecuteCodeAction(ActionManager.OnLeftPickTrigger, (e) => { return this.emitSignal(e) });
            this.mesh.actionManager.registerAction(this.action);
        }

        public getName(): string {
            return "Touch";
        }

        public getProperties(): SNAproperties {
            return this.properties;
        }

        public setProperties(properties: SNAproperties) {
            this.properties = properties;
        }

        public cleanUp() {
            var actions: Array<Action> = this.mesh.actionManager.actions;
            var i: number = actions.indexOf(this.action);
            actions.splice(i, 1);
            if (actions.length === 0) {
                this.mesh.actionManager.dispose();
                this.mesh.actionManager = null;
            }
        }

        public processUpdateSpecific() {
        }
    }



    export class SensorCollision extends SensorAbstract {
        properties: SenCollisionProp;

        public constructor(mesh: Mesh, properties: SenCollisionProp) {
            super(mesh, properties);
            this.properties = properties;
            if (this.mesh.actionManager == null) {
                this.mesh.actionManager = new ActionManager(mesh.getScene());
            }
            var scene: Scene = mesh.getScene();
            var otherMesh = this.findAV(scene);
            this.action = new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } }, (e) => { return this.emitSignal(e) });
            this.mesh.actionManager.registerAction(this.action);
        }

        public getName(): string {
            return "Collision";
        }

        public getProperties(): SNAproperties {
            return this.properties;
        }

        public setProperties(properties: SNAproperties) {
            this.properties = properties;
        }

        public cleanUp() {
            var actions: Array<Action> = this.mesh.actionManager.actions;
            var i: number = actions.indexOf(this.action);
            actions.splice(i, 1);
            if (actions.length === 0) {
                this.mesh.actionManager.dispose();
                this.mesh.actionManager = null;
            }
        }

        public processUpdateSpecific() {
        }

        private findAV(scene: Scene): AbstractMesh {

            for (var index140 = 0; index140 < scene.meshes.length; index140++) {
                var mesh = scene.meshes[index140];
                {
                    if (Tags.HasTags(mesh)) {
                        if (Tags.MatchesQuery(mesh, "Vishva.avatar")) {
                            return mesh;
                        }
                    }
                }
            }
            return null;
        }
    }


    export abstract class ActuatorAbstract implements Actuator {
        public abstract getName(): any;
        public abstract processUpdateSpecific(): any;
        public abstract cleanUp(): any;
        public abstract stop(): any;
        public abstract actuate(): any;
        public abstract isReady(): any;
        properties: ActProperties;

        mesh: Mesh;

        signalId: string;

        actuating: boolean = false;

        ready: boolean = true;

        queued: number = 0;

        disposed: boolean = false;

        public constructor(mesh: Mesh, prop: ActProperties) {
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
            this.properties = prop;
            this.mesh = mesh;
            this.processUpdateGeneric();
            var actuators: Array<Actuator> = <Array<Actuator>>this.mesh["actuators"];
            if (actuators == null) {
                actuators = new Array<Actuator>();
                this.mesh["actuators"] = actuators;
            }
            actuators.push(this);
        }

        public start(): boolean {
            if (this.disposed) return false;
            if (!this.ready) return false;
            var i: number = SNAManager.getSNAManager().snaDisabledList.indexOf(this.mesh);
            if (i >= 0) return false;
            if (this.actuating) {
                if (!this.properties.loop) {
                    this.queued++;
                }
                return true;
            }
            SNAManager.getSNAManager().emitSignal(this.properties.signalStart);
            this.actuating = true;
            this.actuate();
            return true;
        }

        public processQueue() {
            if (this.queued > 0) {
                this.queued--;
                this.start();
            }
        }

        public getType(): string {
            return "ACTUATOR";
        }

        public getMesh(): Mesh {
            return this.mesh;
        }

        public getProperties(): SNAproperties {
            return this.properties;
        }

        public setProperties(prop: SNAproperties) {
            this.properties = <ActProperties>prop;
            this.processUpdateGeneric();
        }

        public getSignalId(): string {
            return this.properties.signalId;
        }

        public processUpdateGeneric() {
            if (this.signalId != null && this.signalId !== this.properties.signalId) {
                SNAManager.getSNAManager().unSubscribe(this, this.signalId);
                this.signalId = this.properties.signalId;
                SNAManager.getSNAManager().subscribe(this, this.signalId);
            } else if (this.signalId == null) {
                this.signalId = this.properties.signalId;
                SNAManager.getSNAManager().subscribe(this, this.signalId);
            }
            this.processUpdateSpecific();
        }

        public onActuateEnd(): any {
            SNAManager.getSNAManager().emitSignal(this.properties.signalEnd);
            this.actuating = false;
            if (this.queued > 0) {
                this.queued--;
                this.start();
                return null;
            }
            if (this.properties.loop) {
                this.start();
                return null;
            }
            return null;
        }

        public dispose() {
            this.disposed = true;
            SNAManager.getSNAManager().unSubscribe(this, this.properties.signalId);
            var actuators: Array<Actuator> = <Array<Actuator>>this.mesh["actuators"];
            if (actuators != null) {
                this.stop();
                var i: number = actuators.indexOf(this);
                if (i !== -1) {
                    actuators.splice(i, 1);
                }
            }
            this.cleanUp();
            this.mesh = null;
        }
    }

    export class ActuatorRotator extends ActuatorAbstract {
        a: Animatable;

        public constructor(mesh: Mesh, parm: ActRotatorParm) {
            super(mesh, parm);
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
        }

        public actuate() {
            var properties: ActRotatorParm = <ActRotatorParm>this.properties;
            var cPos: Quaternion = this.mesh.rotationQuaternion.clone();
            var nPos: Quaternion;
            var rotX: Quaternion = Quaternion.RotationAxis(Axis.X, properties.x * Math.PI / 180);
            var rotY: Quaternion = Quaternion.RotationAxis(Axis.Y, properties.y * Math.PI / 180);
            var rotZ: Quaternion = Quaternion.RotationAxis(Axis.Z, properties.z * Math.PI / 180);
            var abc: Quaternion = Quaternion.RotationYawPitchRoll(properties.y * Math.PI / 180, properties.x * Math.PI / 180, properties.z * Math.PI / 180);
            if (properties.toggle) {
                if (properties.state_toggle) {
                    nPos = cPos.multiply(abc);
                } else {
                    nPos = cPos.multiply(Quaternion.Inverse(abc));
                }
            } else nPos = cPos.multiply(rotX).multiply(rotY).multiply(rotZ);
            properties.state_toggle = !properties.state_toggle;
            var cY: number = this.mesh.position.y;
            var nY: number = this.mesh.position.y + 5;
            this.a = Animation.CreateAndStartAnimation("rotate", this.mesh, "rotationQuaternion", 60, 60 * properties.duration, cPos, nPos, 0, null, () => { return this.onActuateEnd() });
        }

        public getName(): string {
            return "Rotator";
        }

        public stop() {
            if (this.a != null) {
                this.a.stop();
                window.setTimeout((() => { return this.onActuateEnd() }), 0);
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
    }

    export class ActuatorMover extends ActuatorAbstract {
        a: Animatable;

        public constructor(mesh: Mesh, parms: ActMoverParm) {
            super(mesh, parms);
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
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
                if (props.state_toggle) {
                    nPos = cPos.add(moveBy);
                } else {
                    nPos = cPos.subtract(moveBy);
                }
                props.state_toggle = !props.state_toggle;
            } else {
                nPos = cPos.add(moveBy);
            }
            this.a = Animation.CreateAndStartAnimation("move", this.mesh, "position", 60, 60 * props.duration, cPos, nPos, 0, null, () => { return this.onActuateEnd() });
        }

        public getName(): string {
            return "Mover";
        }

        public stop() {
            if (this.a != null) {
                this.a.stop();
                window.setTimeout((() => { return this.onActuateEnd() }), 0);
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
    }

    export class ActuatorAnimator extends ActuatorAbstract {
        public constructor(mesh: Mesh, prop: AnimatorProp) {
            super(mesh, prop);
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
            var skel: Skeleton = mesh.skeleton;
            if (skel != null) {
                var getAnimationRanges: Function = <Function>skel["getAnimationRanges"];
                var ranges: AnimationRange[] = <AnimationRange[]>getAnimationRanges.call(skel);
                var animNames: string[] = new Array(ranges.length);
                var i: number = 0;
                for (var index160 = 0; index160 < ranges.length; index160++) {
                    var range = ranges[index160];
                    {
                        animNames[i] = range.name;
                        i++;
                    }
                }
                prop.animationRange.values = animNames;
            } else {
                prop.animationRange.values = [""];
            }
        }

        public actuate() {
            var prop: AnimatorProp = <AnimatorProp>this.properties;
            if (this.mesh.skeleton != null) {
                this.mesh.skeleton.beginAnimation(prop.animationRange.value, false, prop.rate, () => { return this.onActuateEnd() });
            }
        }

        public stop() {
        }

        public isReady(): boolean {
            return true;
        }

        public getName(): string {
            return "Animator";
        }

        public processUpdateSpecific() {
            if (this.properties.autoStart) {
                var started: boolean = this.start();
            }
        }

        public cleanUp() {
            this.properties.loop = false;
        }
    }

    export class ActuatorCloaker extends ActuatorAbstract {
        a: Animatable;
        s: number = 1;
        e: number = 0;

        public constructor(mesh: Mesh, prop: ActCloakerProp) {
            super(mesh, prop);
        }

        public actuate() {
            var props: ActCloakerProp = <ActCloakerProp>this.properties;
            if (props.toggle) {
                if (props.state_toggle) {
                    this.s = 1;
                    this.e = 0;
                } else {
                    this.s = 0;
                    this.e = 1;
                }
                props.state_toggle = !props.state_toggle;
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

        public processUpdateSpecific() {
            if (this.properties.autoStart) {
                var started: boolean = this.start();
            }
        }

        public cleanUp() {
            this.properties.loop = false;
        }
    }


    export class ActuatorSound extends ActuatorAbstract {
        sound: Sound;

        public constructor(mesh: Mesh, prop: ActSoundProp) {
            super(mesh, prop);
            Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
        }

        public actuate() {
            if (this.properties.toggle) {
                if (this.properties.state_toggle) {
                    this.sound.play();
                } else {
                    window.setTimeout((() => { return this.onActuateEnd() }), 0);
                }
                this.properties.state_toggle = !this.properties.state_toggle;
            } else {
                this.sound.play();
            }
        }

        public processUpdateSpecific() {
            var properties: ActSoundProp = <ActSoundProp>this.properties;
            if (properties.soundFile.value == null) return;
            if (this.sound == null || properties.soundFile.value !== this.sound.name) {
                if (this.sound != null) {
                    this.stop();
                    this.sound.dispose();
                }
                this.ready = false;
                this.sound = new Sound(properties.soundFile.value, "vishva/assets/sounds/" + properties.soundFile.value, this.mesh.getScene(), ((properties) => {
                    return () => {
                        this.updateSound(properties);
                    }
                })(properties));
            } else {
                this.stop();
                this.updateSound(properties);
            }
        }

        private updateSound(properties: ActSoundProp) {
            this.ready = true;
            if (properties.attachToMesh) {
                this.sound.attachToMesh(this.mesh);
            }
            this.sound.onended = () => { return this.onActuateEnd() };
            this.sound.setVolume(properties.volume.value);
            if (properties.autoStart) {
                var started: boolean = this.start();
                if (!started) this.queued++;
            }
        }

        public getName(): string {
            return "Sound";
        }

        public stop() {
            if (this.sound != null) {
                if (this.sound.isPlaying) {
                    this.sound.stop();
                    window.setTimeout((() => { return this.onActuateEnd() }), 0);
                }
            }
        }

        public cleanUp() {
        }

        public isReady(): boolean {
            return this.ready;
        }
    }

    export abstract class SNAproperties {
        signalId: string = "0";

        signalEnable: string = "";

        signalDisble: string = "";

        public abstract unmarshall(obj: Object): SNAproperties;
    }

    export class SenTouchProp extends SNAproperties {
        public unmarshall(obj: Object): SenTouchProp {
            return <SenTouchProp>obj;
        }
    }

    export class SenCollisionProp extends SNAproperties {
        public unmarshall(obj: Object): SenCollisionProp {
            return <SenCollisionProp>obj;
        }
    }

    export abstract class ActProperties extends SNAproperties {
        signalStart: string = "";

        signalEnd: string = "";

        autoStart: boolean = false;

        loop: boolean = false;

        toggle: boolean = true;

        state_toggle: boolean = true;

        public abstract unmarshall(obj: Object): ActProperties;
    }

    export class ActRotatorParm extends ActProperties {
        x: number = 0;

        y: number = 90;

        z: number = 0;

        duration: number = 1;

        public unmarshall(obj: Object): ActRotatorParm {
            return <ActRotatorParm>obj;
        }
    }

    export class ActMoverParm extends ActProperties {
        x: number = 1;

        y: number = 1;

        z: number = 1;

        duration: number = 1;

        local: boolean = false;

        public unmarshall(obj: Object): ActMoverParm {
            return <ActMoverParm>obj;
        }
    }

    export class AnimatorProp extends ActProperties {
        animationRange: SelectType = new SelectType();

        rate: number = 1;

        public unmarshall(obj: Object): ActProperties {
            return null;
        }
    }

    export class ActSoundProp extends ActProperties {
        soundFile: SelectType = new SelectType();

        attachToMesh: boolean = false;

        volume: Range = new Range(0.0, 1.0, 1.0, 0.1);

        public unmarshall(obj: Object): ActSoundProp {
            return null;
        }
    }

    export class ActCloakerProp extends ActProperties {
        timeToCloak: number = 1;


        public unmarshall(obj: Object): ActCloakerProp {
            return null;
        }
    }
}



