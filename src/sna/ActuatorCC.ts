import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { AnimationRange, Animatable, ArcRotateCamera, Mesh, Skeleton, Scene, Vector3, AnimationGroup } from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";
import { AnimUtils } from "../util/AnimUtils";
import { Vishva } from "../Vishva";
import { CharacterController,Actions } from "babylonjs-charactercontroller";

export class CCProp extends ActProperties {
    action: SelectType = new SelectType();

    constructor() {
        super();
        this.action.values = Actions.getAll();
    }
}

/**
 * this actuator will control the NPC using its CC
 */
export class ActuatorCC extends ActuatorAbstract {
    
    _do:boolean =false;

    override init(){

    }
   

    public actuate() {

        let cc:CharacterController = this.mesh["characterController"];
        if (cc !== undefined){

            if (this.properties.toggle){
                this._do = ! this._do;
            }else this._do=true;

            let props:CCProp = <CCProp> this.properties;
            let action = props.action.value;
            console.log(action,this._do);
            cc[action](this._do);
            this.actuating = true;
        }
        //this.onActuateEnd()

    }

    public stop() {
        let cc:CharacterController = this.mesh["characterController"];
        if (cc !== undefined){
            cc.idle();
            this.onActuateEnd();
        }
    }

    public isReady(): boolean {
        return true;
    }

    override getName(): string {
        return "CC";
    }

    override getPropertiesType(): typeof ActProperties {
        return CCProp;
    }

    public onPropertiesChange() {
        if (this.properties.autoStart) {
            this.start(this.properties.signalId);
        }
    }

    public cleanUp() {
        this.properties.loop = false;
    }
}



SNAManager.getSNAManager().addActuator("CC", ActuatorCC);