import { ActProperties, SNAproperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { MeshPickerType, SelectType } from "../gui/VishvaGUI";
import { CharacterController } from "babylonjs-charactercontroller";
import { AbstractMesh, Scene } from "babylonjs";

export class CCMoveToTurnToProp extends ActProperties 
{
    action: SelectType = new SelectType();
    targetMesh: MeshPickerType = new MeshPickerType();
    howClose : number = 2;
    run : boolean = false;
    // loop: boolean = null;
    // toggle: boolean = null;

    constructor() 
    {
        super();
        this.action.values = ["MoveTo","RotateTo"];
    }
  
}

/**
 * this actuator will use CC to make the NPC MoveTo or TurnTo a target
 */
export class ActuatorCCMoveToTurnTo extends ActuatorAbstract 
{

    public init(): void {}
    
    override getProperties(): SNAproperties 
    {
        return this.properties;
    }

    public actuate() 
    {
        let properties: CCMoveToTurnToProp = <CCMoveToTurnToProp>this.properties;
        let scene: Scene = this.mesh.getScene();

        let targetMesh : AbstractMesh = this.getTargetMesh(properties.targetMesh.value, scene);
        if (targetMesh == null){
            this.onActuateEnd();
            return
        }

        let cc:CharacterController = this.mesh["characterController"];
        if (cc == undefined) return;

        let props:CCMoveToTurnToProp = <CCMoveToTurnToProp> this.properties;
        let action = props.action.value;

        if (action == "MoveTo")
        {
            cc.moveTo
            ( 
                targetMesh,
                {
                    arrivalDistance:properties.howClose,
                    run:properties.run,
                    onComplete:() => this.stop()
                }
            )
        }
        else
        {
            cc.turnTo
            ( 
                targetMesh,
                {   
                    angularTolerance:properties.howClose,
                    onComplete:() => this.stop()
                }
            )
        }
        this.actuating = true;
    }

    // Resolve target mesh by uniqueId
    private getTargetMesh(id:String, scene:Scene):AbstractMesh
    {
        if (!id || id === "") 
        {
            console.warn("ActuatorCCMoveTurn: no target mesh selected");
            return;
        }

        let targetMesh: AbstractMesh =  scene.getMeshByUniqueId(Number(id));

        if (!targetMesh) 
        {
            console.warn("ActuatorCCMoveTurn: target mesh not found in scene (id: " + id + ")");
            return null;
        }

        if (!(targetMesh instanceof AbstractMesh)) 
        {
            console.warn("ActuatorCCMoveTurn: target node is not an AbstractMesh (id: " + id + ")");
            return null;
        }

        return targetMesh;
    }

    public stop() 
    {
        let props: CCMoveToTurnToProp = <CCMoveToTurnToProp>this.properties;
        let cc:CharacterController = this.mesh["characterController"];
        if (cc !== undefined)
        {
            if (props.action.value == "MoveTo") cc.moveToStop();
            else cc.turnToStop();
            this.onActuateEnd();
        }
    }

    public isReady(): boolean { return true; }
    
    override getName(): string { return "CCMoveToTurnTo"; }

    override getPropertiesType(): typeof ActProperties { return CCMoveToTurnToProp; }

    public onPropertiesChange() 
    {
        if (this.properties.autoStart) 
        {
            this.start(this.properties.signalId);
        }
    }

    public cleanUp() {}
}

SNAManager.getSNAManager().addActuator("CCMoveToTurnTo", ActuatorCCMoveToTurnTo);