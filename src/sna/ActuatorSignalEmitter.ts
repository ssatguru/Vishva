import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {  Mesh } from "babylonjs";


export class SignalEmitterProp extends ActProperties {
    signals:string = "";
}

/**
 * Emits a set of signals on each actuation.
 * 
 * The sets of signals are specified in the properties of the actuator.
 * In the sets each set is separated by a "|" character.
 * Within each set, the signals are separated by a ",".
 * 
 * On each actuation the next set from the list is emitted.
 * If the last set is reached, the first set is emitted again.
 * The sets are emitted in the order they are specified.
 * 
 * Example:
 * signals= sig1,sig2,sig3|sig4,sig5,sig6|sig7,sig8
 * Here sig1,sig2,sig3 will be emitted on the first actuation, then sig4,sig5,sig6 and finally sig7,sig8.
 * If the last signal set is reached, the first signal set is emitted again.
 *  
 */
export class ActuatorSignalEmitter extends ActuatorAbstract {
    sigs: string[] = [];
    nextSig : number = 0;

    public constructor(mesh: Mesh, parms: SignalEmitterProp) {
        super(mesh, parms != null ? parms : new SignalEmitterProp());
        if (parms != null) { 
            this.sigs = parms.signals.split("|");
        }
    }

    public actuate() {
        let signals: string[] = this.sigs[this.nextSig].split(",");

        signals.forEach((signal) => {
            console.log("SignalEmitter: emitting signal " + signal);
            SNAManager.getSNAManager().emitSignal(signal.trim());
        });
        // Increment the nextSig index to point to the next signal
        this.nextSig++;
        // Loop back to the beginning if we reach the end of the signals array
        if (this.nextSig >= this.sigs.length) { 
            this.nextSig = 0;
        };
    
        this.onActuateEnd();
     
    }

    public stop() {
    }

    public isReady(): boolean {
        return true;
    }

    public getName(): string {
        return "SignalEmitter";
    }

    public onPropertiesChange() {
        let parms: SignalEmitterProp = <SignalEmitterProp>this.properties;
        if (parms != null) { 
            this.sigs = parms.signals.split("|");
        }
    }

    public cleanUp() {
    }
}

SNAManager.getSNAManager().addActuator("SignalEmitter",ActuatorSignalEmitter );