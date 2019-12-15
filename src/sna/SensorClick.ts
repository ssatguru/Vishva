import { SNAproperties } from "./SNA";
import { SensorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    Action,
    ActionManager,
    ExecuteCodeAction,
    Mesh
} from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";

export class SenClickProp extends SNAproperties {
    clickType: SelectType = new SelectType();

    constructor() {
        super();
        this.clickType.values = ["leftClick", "middleClick", "rightClick", "doubleClick"];
        this.clickType.value = "leftClick";
    }
}

export class SensorClick extends SensorAbstract {
    //properties: SNAproperties;

    public constructor(mesh: Mesh, prop: SenClickProp) {
        if (prop != null) {
            super(mesh, prop);
        } else {
            super(mesh, new SenClickProp());
        }
    }



    public getName(): string {
        return "Click";
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
        if (this.mesh.actionManager == null) {
            this.mesh.actionManager = new ActionManager(this.mesh.getScene());
        }
        let clickProp: SenClickProp = <SenClickProp>this.properties;
        let actType: number;
        if (clickProp.clickType.value == "doubleClick") {
            actType = ActionManager.OnDoublePickTrigger;
        } else if (clickProp.clickType.value == "rightClick") {
            actType = ActionManager.OnRightPickTrigger
        } else if (clickProp.clickType.value == "leftClick") {
            actType = ActionManager.OnLeftPickTrigger
        } else if (clickProp.clickType.value == "middleClick") {
            actType = ActionManager.OnCenterPickTrigger
        }

        let action: Action = new ExecuteCodeAction(actType, (e) => {
            this.emitSignal(e);
        }
        );

        this.mesh.actionManager.registerAction(action);
        this.actions.push(action)
    }
}

SNAManager.getSNAManager().addSensor("Click", SensorClick);