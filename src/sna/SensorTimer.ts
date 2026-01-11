import { SNAproperties } from "./SNA";
import { SensorAbstract } from "./SNA";
import { SNAManager } from "./SNA";

export class SenTimerProp extends SNAproperties {
    interval: number = 1000;
    plusMinus: number = 0;
}

export class SensorTimer extends SensorAbstract {

    timerId: number;

    override init(){}

    override getName(): string {
        return "Timer";
    }

    override getPropertiesType() : typeof SNAproperties {
        return SenTimerProp;
    }

    override getProperties(): SNAproperties {
        return this.properties;
    }

    override setProperties(properties: SNAproperties) {
        this.properties = <SenTimerProp>properties;
    }

    override cleanUp() {
        //window.clearInterval(this.timerId);
        window.clearTimeout(this.timerId);
    }

    public processUpdateSpecific_old() {
        let properties: SenTimerProp = <SenTimerProp>this.properties;
        if (this.timerId) {
            window.clearInterval(this.timerId);
        }
        this.timerId = window.setInterval(() => { this.emitSignal(); }, properties.interval);
    }
    override onPropertiesChange() {
        let properties: SenTimerProp = <SenTimerProp>this.properties;
        if (this.timerId) {
            window.clearTimeout(this.timerId);
        }
        this.timerId = window.setTimeout(() => { this.signalEmitter(); }, properties.interval);
    }

    private signalEmitter() {

        let properties: SenTimerProp = <SenTimerProp>this.properties;
        this.emitSignal();
        window.clearTimeout(this.timerId);
        let i: number = properties.interval;
        let pm: number = properties.plusMinus;
        if (pm > 0) {
            let min: number = i - pm;
            if (min < 0) min = 0;
            i = this.getRandomInt(min, i + pm);
        }
        this.timerId = window.setTimeout(() => { this.signalEmitter(); }, i)
    }
    private getRandomInt(min, max): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
    }

}

SNAManager.getSNAManager().addSensor("Timer", SensorTimer);