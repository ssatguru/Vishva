/*
 * Sensors and Actuators
 */
namespace org.ssatguru.babylonjs.vishva {

    import AbstractMesh = BABYLON.AbstractMesh;
    import Action = BABYLON.Action;
    import ActionEvent = BABYLON.ActionEvent;
    import Mesh = BABYLON.Mesh;
    import Scene = BABYLON.Scene;
    import Tags = BABYLON.Tags;

    export interface SNAConfig { }

    
    export class SNAManager {
        sensors: Object;

        actuators: Object;

        sensorList: string[] = [];

        actuatorList: string[] = [];
        
        actuatorMap : any = {};
        sensorMap : any = {};

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
        
        public addActuator(name: string, actuator: any){
            this.actuatorList.push(name);
            this.actuatorMap[name]= actuator;
        }

        public addSensor(name:string, sensor:any){
            this.sensorList.push(name);
            this.sensorMap[name]= sensor;
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

//        public createSensorByName_OLD(name: string, mesh: Mesh, prop: SNAproperties): Sensor {
//            if (name === "Touch") {
//                if (prop != null) return new SensorTouch(mesh, <SenTouchProp>prop); else return new SensorTouch(mesh, new SenTouchProp());
//            } else if (name === "Contact") {
//                if (prop != null) return new SensorContact(mesh, <SenContactProp>prop); else return new SensorContact(mesh, new SenContactProp());
//            } else
//                return null;
//        }
        
         public createSensorByName(name: string, mesh: Mesh, prop: SNAproperties): Sensor {
             let sensor:any = this.sensorMap[name];
            return new sensor(mesh, <SNAproperties>prop) 
        }

        /*
         * the first constructor is called by the vishva scene unmarshaller
         * the second by the gui to create a new actuator
         */
//        public createActuatorByName_OLD(name: string, mesh: Mesh, prop: SNAproperties): Actuator {
//            if (name === "Mover") {
//                //if (prop != null) return new ActuatorMover(mesh, <ActMoverParm>prop); else return new ActuatorMover(mesh, new ActMoverParm());
//                let act:any = this.actuatorMap[name];
//                if (prop != null) return new act(mesh, <ActProperties>prop); else return new act(mesh, null);
//            } else if (name === "Rotator") {
//                if (prop != null) return new ActuatorRotator(mesh, <ActRotatorParm>prop); else return new ActuatorRotator(mesh, new ActRotatorParm());
//            } else if (name === "Sound") {
//                if (prop != null) return new ActuatorSound(mesh, <ActSoundProp>prop); else return new ActuatorSound(mesh, new ActSoundProp());
//            } else if (name === "Animator") {
//                if (prop != null) return new ActuatorAnimator(mesh, <AnimatorProp>prop); else return new ActuatorAnimator(mesh, new AnimatorProp());
//            } else if (name === "Cloaker") {
//                if (prop != null) return new ActuatorCloaker(mesh, <ActCloakerProp>prop); else return new ActuatorCloaker(mesh, new ActCloakerProp());
//            } else if (name === "Disabler") {
//                if (prop != null) return new ActuatorDisabler(mesh, <ActDisablerProp>prop); else return new ActuatorDisabler(mesh, new ActDisablerProp());                
//            } else if (name === "Enabler") {
//                if (prop != null) return new ActuatorEnabler(mesh, <ActEnablerProp>prop); else return new ActuatorEnabler(mesh, new ActEnablerProp());                
//            } else
//                return null;
//        }
        
        public createActuatorByName(name: string, mesh: Mesh, prop: SNAproperties): Actuator {
            let act:any = this.actuatorMap[name];
            //if (prop != null) return new act(mesh, <ActProperties>prop); else return new act(mesh, null);
            return new act(mesh, <ActProperties>prop)
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

                var mesh: Mesh = scene.getMeshesByTags(sna.meshId)[0];
                if (mesh != null) {
                    if (sna.type === "SENSOR") {
                        this.createSensorByName(sna.name, mesh, sna.properties);
                    } else if (sna.type === "ACTUATOR") {
                        this.createActuatorByName(sna.name, mesh, sna.properties);
                    }
                } else {
                    console.log("didnot find mesh for tag " + sna.meshId);
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
        emitSignal(e: ActionEvent);
    }

    export interface Actuator extends SensorActuator {

        // TODO swicth start and actuate
        // start is callled by SNAManager
        start(): boolean;

        stop();

        actuate();

        isReady(): boolean;

        processQueue();

        getMesh(): Mesh;
    }

    export abstract class SensorAbstract implements Sensor {
        public abstract getName(): string;
        public abstract processUpdateSpecific(): any;
        public abstract cleanUp(): any;
        
        properties: SNAproperties;

        mesh: Mesh;

        //action: Action;
        actions:Action[] = new Array();

        public constructor(mesh: Mesh, properties: SNAproperties) {
            
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
            this.removeActions();
            
            //call any sesnor specific cleanup
            this.cleanUp();
        }

        public getSignalId(): string {
            return this.properties.signalId;
        }

        public setSignalId(sid: string) {
            this.properties.signalId = sid;
        }

        public emitSignal(e?: ActionEvent) {
            // donot emit signal if this mesh is on the diabled list
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
        
         /*
         * from this mesh's actionmanager remove all actions 
         * added by this sensor
         * if at end no actions left in the actionmanager 
         * then dispose of the actionmanager itself.
         */
        public removeActions() {
            if (!this.mesh.actionManager) return;
            var actions: Action[] = this.mesh.actionManager.actions;
            let i:number;
            for (let action of this.actions){
                i = actions.indexOf(action);
                actions.splice(i, 1);
            }
            if (actions.length === 0) {
                this.mesh.actionManager.dispose();
                this.mesh.actionManager = null;
            }
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
            // donot actuate if this mesh is on the disabled list
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
            
            // check if signalId changed, if yes then resubscribe
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



    export abstract class SNAproperties {
        signalId: string = "0";

        signalEnable: string = "";

        signalDisble: string = "";

        public abstract unmarshall(obj: Object): SNAproperties;
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

}



