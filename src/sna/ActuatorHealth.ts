import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {  Mesh } from "babylonjs";


export class HealthProp extends ActProperties 
{
    health:number=100;
    step:number=10;
    onNoHealth:string="";
    onFullHealth:string="";
}

/**
 * Tracks health of the mesh.
 * 
 * For signal one needs to speicfy two signals seperated by comma exmaple "down,up".
 * The first signal is for decreasing health and the second signal is for reviving health.
 * If it receives the first one (say "down" in the example above) it will reduces the health by a step amount.
 * and if health <= zero it will emit a onNoHealth signal
 * If it receives the second one (say "up" in the example above), it will revive the health by a step amount.
 * When full health is restored it emits a onFullHealth signal
 *  
 */
export class ActuatorHealth extends ActuatorAbstract 
{
    health: number = 0;
    downSig:string;
    upSig:string;

    override init(){}

    override actuate(signal:string) 
    {
        let props: HealthProp = <HealthProp>this.properties;
        if (signal)
        {
            if (signal === this.downSig) 
            {
                this.health = this.health - props.step;
                if (this.health <= 0)
                {
                    this.health = 0;
                    SNAManager.getSNAManager().emitSignal(props.onNoHealth.trim());
                }
            }
            else 
            {
                if (signal === this.upSig) 
                {
                    this.health = this.health + props.step;
                     if (this.health > props.health)
                    {
                        this.health = props.health;
                        SNAManager.getSNAManager().emitSignal(props.onFullHealth.trim());
                    }
                }
            }
        }

        this.onActuateEnd();
    
    }

    override stop() {}

    override isReady(): boolean { return true; }

    override getName(): string { return "Health"; }

    override getPropertiesType(): typeof ActProperties { return HealthProp; } 

    override onPropertiesChange() 
    {
        let props: HealthProp = <HealthProp>this.properties;
        let sigs: string[]=props.signalId.split(",");
        this.downSig = sigs[0];
        if (sigs.length>1)
        {
            this.upSig = sigs[1];
        }
        this.health = props.health;
    }

    override cleanUp() {}
}

SNAManager.getSNAManager().addActuator("Health",ActuatorHealth );