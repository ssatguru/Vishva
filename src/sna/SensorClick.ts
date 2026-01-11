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
import { Vishva } from "../Vishva";

export class SenClickProp extends SNAproperties {
    clickType: SelectType = new SelectType();

    constructor() {
        super();
        this.clickType.values = ["leftClick", "middleClick", "rightClick", "anyClick", "doubleClick"];
        this.clickType.value = "leftClick";
    }
}

export class SensorClick extends SensorAbstract {
    //properties: SNAproperties;

    override init(){};

    override getName(): string {
        return "Click";
    }

    override getPropertiesType() : typeof SNAproperties {
        return SenClickProp;
    }

    override getProperties(): SNAproperties {
        return this.properties;
    }

    override setProperties(properties: SNAproperties) {
        this.properties = properties;
    }


    override cleanUp() {

    }

    override onPropertiesChange() {
        if (this.mesh.actionManager == null) {
            this.mesh.actionManager = new ActionManager(this.mesh.getScene());
        }
        let clickProp: SenClickProp = <SenClickProp>this.properties;
        let actType: number;
        if (clickProp.clickType.value == "doubleClick") {
            actType = ActionManager.OnDoublePickTrigger;
        } else if (clickProp.clickType.value == "rightClick") {
            actType = ActionManager.OnRightPickTrigger;
        } else if (clickProp.clickType.value == "leftClick") {
            actType = ActionManager.OnLeftPickTrigger;
        } else if (clickProp.clickType.value == "middleClick") {
            actType = ActionManager.OnCenterPickTrigger;
        } else if (clickProp.clickType.value == "anyClick") {
            actType = ActionManager.OnPickTrigger;
        }


        let action: Action = new ExecuteCodeAction(actType, (e) => {

            if (Vishva.vishva.key.alt ||
                Vishva.vishva.key.ctl ||
                Vishva.vishva.key.shift
            ) return;

            this.emitSignal(e);
        }
        );


        this.mesh.actionManager.registerAction(action);

        this.actions.push(action)
    }
}

SNAManager.getSNAManager().addSensor("Click", SensorClick);