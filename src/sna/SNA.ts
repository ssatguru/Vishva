/*
 * Sensors and Actuators
 */
import { Vishva } from "../Vishva";

import AbstractMesh = BABYLON.AbstractMesh;
import Action = BABYLON.Action;
import ActionEvent = BABYLON.ActionEvent;
import Mesh = BABYLON.Mesh;
import Quaternion = BABYLON.Quaternion;
import Scene = BABYLON.Scene;
import Tags = BABYLON.Tags;
import Vector3 = BABYLON.Vector3;
import Vector2 = BABYLON.Vector2;
import { FileInputType, SelectType,Range } from "../gui/VishvaGUI";

//import FileInputType=org.ssatguru.babylonjs.vishva.gui.FileInputType;
//import Range = org.ssatguru.babylonjs.vishva.gui.Range;
//import SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;

export interface SNAConfig { }


export class SNAManager {
    sensors: Object;
    actuators: Object;
    sensorList: string[] = [];
    actuatorList: string[] = [];
    actuatorMap: any = {};
    sensorMap: any = {};
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

    public addActuator(name: string, actuator: any) {
        this.actuatorList.push(name);
        this.actuatorMap[name] = actuator;
    }

    public addSensor(name: string, sensor: any) {
        this.sensorList.push(name);
        this.sensorMap[name] = sensor;
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

    public createSensorByName(name: string, mesh: Mesh, prop: SNAproperties): Sensor {
        let sensor: any = this.sensorMap[name];
        return new sensor(mesh, <SNAproperties>prop)
    }

    public createActuatorByName(name: string, mesh: Mesh, prop: SNAproperties): Actuator {
        let act: any = this.actuatorMap[name];
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
        let actuators: Actuator[] = <Actuator[]>this.sig2actMap[signalId];
        if (actuators == null) return;
        for (let actuator of actuators) {
            actuator.start(signalId);
        }
    }

    //        public emitSignal(signalId: string) {
    //            if(signalId.trim()==="") return;
    //            var keyValue: any=this.sig2actMap[signalId];
    //            if(keyValue!=null) {
    //                window.setTimeout((acts,signalId) => {return this.actuate(acts,signalId)},0,keyValue,signalId);
    //            }
    //        }
    //
    //        private actuate(acts: any, signal:string) {
    //            var actuators: Actuator[]=<Actuator[]>acts;
    //            for(let actuator of actuators) {
    //                actuator.start(signal);
    //            }
    //
    //        }

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
            for (let actuator of actuators) {
                actuator.processQueue();
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
            for (let actuator of actuators) {
                if (actuator.actuating) actuator.stop();
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
            for (let actuator of actuators) {
                if (actuator.properties.autoStart) actuator.start(actuator.properties.signalId);
            }
        }
    }

    /**
     * removes all sensors and actuators from a mesh. 
     * this would be called when say disposing off a mesh
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
            if (actuators.indexOf(actuator) == -1) {
                actuators.push(actuator);
            }
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
        for (let mesh of meshes) {
            meshId = null;
            var actuators: Array<Actuator> = <Array<Actuator>>mesh["actuators"];
            if (actuators != null) {
                meshId = this.getMeshVishvaUid(mesh);
                for (let actuator of actuators) {
                    sna = new SNAserialized();
                    sna.name = actuator.getName();
                    sna.type = actuator.getType();
                    sna.meshId = meshId;
                    sna.properties = actuator.getProperties();
                    snas.push(sna);
                }
            }
            var sensors: Array<Sensor> = <Array<Sensor>>mesh["sensors"];
            if (sensors != null) {
                //if this mesh had actuators then we might have already assigned a uniue id
                //in the previous step
                if (meshId == null) meshId = this.getMeshVishvaUid(mesh);
                for (let sensor of sensors) {
                    sna = new SNAserialized();
                    sna.name = sensor.getName();
                    sna.type = sensor.getType();
                    sna.meshId = meshId;
                    sna.properties = sensor.getProperties();
                    snas.push(sna);
                }
            }
        }
        return snas;
    }

    public unMarshal(snas: SNAserialized[], scene: Scene) {
        let renames: AbstractMesh[] = [];
        if (snas == null) return;
        for (let sna of snas) {
            var mesh: AbstractMesh = scene.getMeshesByTags(sna.meshId)[0];
            //if null then we might be dealing with a instance mesh
            //search by name
            if (mesh == null) {
                mesh = scene.getMeshByName(sna.meshId);
                if (mesh != null) {
                    if (renames.indexOf(mesh) < 0) renames.push(mesh);
                }
            }
            if (mesh != null) {
                this.unMarshalProps(sna.properties);
                if (sna.type === "SENSOR") {
                    this.createSensorByName(sna.name, <Mesh>mesh, sna.properties);
                } else if (sna.type === "ACTUATOR") {
                    this.createActuatorByName(sna.name, <Mesh>mesh, sna.properties);
                }
            } else {
                console.error("Didnot find mesh for tag " + sna.meshId);
            }
        }
        for (let mesh of renames) {
            mesh.name = mesh.name.split(".Vishva.uid.")[0];
        }
    }

    /**
     * Vectors/Quaternions are stored as plain objects with x,y,z or w properties
     * We need to convert them back to Vector/Quaternions objects
     * 
     * FileInputType are stored as objects too
     * 
     */
    private unMarshalProps(obj: Object) {
        let pNames: string[] = Object.keys(obj);
        for (let pName of pNames) {
            let t: string = typeof obj[pName];
            if (t == "object") {
                let o: Object = obj[pName];
                let ns: string[] = Object.keys(o);
                let l: number = ns.length;
                if (ns.indexOf("x") >= 0) {
                    if (ns.indexOf("y") >= 0) {
                        if (ns.indexOf("z") >= 0) {
                            if (ns.indexOf("w") >= 0) {
                                if (l == 4) obj[pName] = new Quaternion(o["x"], o["y"], o["z"], o["w"]);
                            } else {
                                if (l == 3) obj[pName] = new Vector3(o["x"], o["y"], o["z"]);
                            }
                        } else {
                            if (l == 2) obj[pName] = new Vector2(o["x"], o["y"]);
                        }
                    }
                } else if (ns.indexOf("type") >= 0) {
                    if (o["type"] === "FileInputType") {
                        let fit: FileInputType = new FileInputType(o["tile"], o["filter"], o["openAll"]);
                        fit.value = o["value"];
                        obj[pName] = fit;
                    } else if (o["type"] === "Range") {
                        let volume: Range = new Range(o["min"], o["max"], o["value"], o["step"]);
                        obj[pName] = volume;
                    } else if (o["type"] === "SelectType") {
                        let st: SelectType = new SelectType();
                        st.values = o["values"];
                        st.value = o["value"];
                        obj[pName] = st;
                    }
                }
            }
        }

    }

    prevUID: string = "";
    /**
     * Assign a unique id to a mesh
     * NOTE:
     * Instance mesh "id" is not serialized by Babylonjs.
     * Instance mesh "name" is serialized.
     * As such we would append the new vishva.uid to the name during save.
     * When de-serializing, during load, we will remove the vishva.uid from name.
     * see unmarhsall() also.
     * 
     * TODO:check if we can use this method for all meshes rather than just InstancedMesh
     */
    private getMeshVishvaUid(mesh: AbstractMesh): string {

        if (!(mesh instanceof BABYLON.InstancedMesh) && (Tags.HasTags(mesh))) {
            var tags: string[] = (<string>Tags.GetTags(mesh, true)).split(" ");
            for (let tag of tags) {
                var i: number = tag.indexOf("Vishva.uid.");
                if (i >= 0) return tag;
            }
        }
        var uid: string;
        uid = "Vishva.uid." + (<number>new Number(Date.now())).toString();
        while ((uid === this.prevUID)) {
            uid = "Vishva.uid." + (<number>new Number(Date.now())).toString();
        };
        this.prevUID = uid;
        if (mesh instanceof BABYLON.InstancedMesh) {
            mesh.name = mesh.name + "." + uid;
            return mesh.name;
        } else {
            Tags.AddTagsTo(mesh, uid);
            return uid;
        }
    }

    //vishva proxy methods

    public getAV(): Mesh {
        return Vishva.vishva.avatar;
    }

    public disableAV() {
        Vishva.vishva.disableAV();
    }

    public enableAV() {
        Vishva.vishva.enableAV();
    }

    public getCamera() {
        return Vishva.vishva.mainCamera;
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
    handlePropertiesChange();
    /**
     * called by {@processUpdateGeneric}' implementors should do their sensor
     * actuator specific updates here if autostart specified then do a start
     * here
     */
    onPropertiesChange();
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
    start(signal: string): boolean;
    stop();
    actuate();
    isReady(): boolean;
    processQueue();
    getMesh(): Mesh;
}

export abstract class SensorAbstract implements Sensor {
    public abstract getName(): string;
    public abstract onPropertiesChange(): any;
    public abstract cleanUp(): any;

    properties: SNAproperties;
    mesh: Mesh;
    //action: Action;
    actions: Action[] = new Array();

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

    public handlePropertiesChange() {
        //remove all actions which might have been added by previous property
        this.removeActions();
        this.onPropertiesChange();
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
        let i: number;
        for (let action of this.actions) {
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
    public abstract onPropertiesChange(): any;
    public abstract cleanUp(): any;
    /*
     * called when actuator recieves a disable signal or is being disposed
     */
    public abstract stop(): any;
    public abstract actuate(): any;
    public abstract isReady(): any;

    properties: ActProperties;
    mesh: Mesh;
    signalId: string;
    signalEnable: string;
    signalDisable: string;
    actuating: boolean = false;
    ready: boolean = true;
    queued: number = 0;
    disposed: boolean = false;
    disabled: boolean = false;
    stopped: boolean = false;

    public constructor(mesh: Mesh, prop: ActProperties) {
        this.properties = prop;
        this.mesh = mesh;
        this.handlePropertiesChange();
        var actuators: Array<Actuator> = <Array<Actuator>>this.mesh["actuators"];
        if (actuators == null) {
            actuators = new Array<Actuator>();
            this.mesh["actuators"] = actuators;
        }
        actuators.push(this);
    }

    public start(signal: string): boolean {
        if (this.disposed) return false;
        if (!this.ready) return false;
        // donot actuate if this mesh is on the disabled list
        var i: number = SNAManager.getSNAManager().snaDisabledList.indexOf(this.mesh);
        if (i >= 0) return false;
        if (signal == this.signalDisable) {
            if (this.disabled) return false;
            this.disabled = true;
            this.queued = 0;
            this.stopped = true;
            this.stop();
            this.actuating = false;
            return false;
        }
        if (signal == this.signalEnable) {
            this.disabled = false;
            if (this.queued == 0) {
                if (signal != this.signalId) return false;
            } else this.queued--;
        }
        if (this.disabled) {
            return false;
        }
        this.stopped = false;
        //if(this.actuating||this.disabled) {
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
            this.start(this.signalId);
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
        this.handlePropertiesChange();
    }

    public getSignalId(): string {
        return this.properties.signalId;
    }

    public handlePropertiesChange() {
        // check if signalId changed, if yes then resubscribe
        //            if(this.signalId!=null&&this.signalId!==this.properties.signalId) {
        //                SNAManager.getSNAManager().unSubscribe(this,this.signalId);
        //                this.signalId=this.properties.signalId;
        //                SNAManager.getSNAManager().subscribe(this,this.signalId);
        //            } else if(this.signalId==null) {
        //                this.signalId=this.properties.signalId;
        //                SNAManager.getSNAManager().subscribe(this,this.signalId);
        //            }
        if (this.properties.signalId != null && this.properties.signalId != "") {
            if (this.signalId == null) {
                this.signalId = this.properties.signalId;
                SNAManager.getSNAManager().subscribe(this, this.signalId);
            } else if (this.signalId !== this.properties.signalId) {
                SNAManager.getSNAManager().unSubscribe(this, this.signalId);
                this.signalId = this.properties.signalId;
                SNAManager.getSNAManager().subscribe(this, this.signalId);
            }
        }
        if (this.properties.signalEnable != null && this.properties.signalEnable != "") {
            if (this.signalEnable == null) {
                this.signalEnable = this.properties.signalEnable;
                SNAManager.getSNAManager().subscribe(this, this.signalEnable);
            } else if (this.signalEnable !== this.properties.signalEnable) {
                SNAManager.getSNAManager().unSubscribe(this, this.signalEnable);
                this.signalEnable = this.properties.signalEnable;
                SNAManager.getSNAManager().subscribe(this, this.signalEnable);
            }
        }
        if (this.properties.signalDisable != null && this.properties.signalDisable != "") {
            if (this.signalDisable == null) {
                this.signalDisable = this.properties.signalDisable;
                SNAManager.getSNAManager().subscribe(this, this.signalDisable);
            } else if (this.signalDisable !== this.properties.signalDisable) {
                SNAManager.getSNAManager().unSubscribe(this, this.signalDisable);
                this.signalDisable = this.properties.signalDisable;
                SNAManager.getSNAManager().subscribe(this, this.signalDisable);
            }
        }

        this.onPropertiesChange();
    }

    public onActuateEnd(): any {
        SNAManager.getSNAManager().emitSignal(this.properties.signalEnd);
        this.actuating = false;
        if (this.disabled || this.stopped) {
            return;
        }
        if (this.queued > 0) {
            this.queued--;
            this.start(this.signalId);
            return null;
        }
        if (this.properties.loop) {
            this.start(this.signalId);
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
    signalDisable: string = "";
}

export abstract class ActProperties extends SNAproperties {
    signalStart: string = "";
    signalEnd: string = "";
    autoStart: boolean = false;
    loop: boolean = false;
    toggle: boolean = true;

    //when toggle is true then actuator can be in normal or reversed state
    //when toggle is false then its will always be in normal state (or notReversed state);
    //the following property will be used to keep track of what state it is in
    //the prefix "state_" indicates it is a private variable for tracking internal state
    //and thus should not be exposed to the users by the UI
    state_notReversed: boolean = true;
}





