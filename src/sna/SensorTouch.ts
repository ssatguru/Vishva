import { SNAproperties } from "./SNA";
import { SensorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    Action,
    ActionManager,
    ExecuteCodeAction,
    Mesh
} from "babylonjs";

export class SenTouchProp extends SNAproperties {
}

export class SensorTouch extends SensorAbstract {
    properties: SNAproperties;

    public constructor(mesh: Mesh, prop: SNAproperties) {
        if (prop != null) {
            super(mesh, prop);
        } else {
            super(mesh, new SenTouchProp());
        }
        if (this.mesh.actionManager == null) {
            this.mesh.actionManager = new ActionManager(this.mesh.getScene());
        }

        let action: Action = new ExecuteCodeAction(ActionManager.OnPickUpTrigger, (e) => {
            let pe: PointerEvent = e.sourceEvent;
            if (pe.button === 0) this.emitSignal(e);
        }
        );
        this.mesh.actionManager.registerAction(action);
        this.actions.push(action)
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

    }

    public onPropertiesChange() {

    }
}

SNAManager.getSNAManager().addSensor("Touch", SensorTouch);