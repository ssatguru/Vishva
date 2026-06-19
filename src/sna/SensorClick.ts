import { SNAproperties } from "./SNA";
import { SensorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { shouldEmitByProximity } from "./proximityCheck";
import {
    Action,
    ActionManager,
    ExecuteCodeAction,
    Observer,
    Scene
} from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";

export class SenClickProp extends SNAproperties {
    clickType: SelectType = new SelectType();
    avProximity: number = 0;

    constructor() {
        super();
        this.clickType.values = ["leftClick", "middleClick", "rightClick", "anyClick", "doubleClick"];
        this.clickType.value = "leftClick";
    }
}

export class SensorClick extends SensorAbstract {

    private _renderObserver: Observer<Scene> | null = null;
    private _isHovering: boolean = false;

    override init() { }

    override getName(): string {
        return "Click";
    }

    override getPropertiesType(): typeof SNAproperties {
        return SenClickProp;
    }

    override getProperties(): SNAproperties {
        return this.properties;
    }

    override setProperties(properties: SNAproperties) {
        this.properties = properties;
    }

    override cleanUp() { }

    public removeActions() {
        // Remove render observer
        if (this._renderObserver) {
            this.mesh.getScene().onBeforeRenderObservable.remove(this._renderObserver);
            this._renderObserver = null;
        }
        // Remove ActionManager actions (base class pattern)
        if (this.mesh.actionManager) {
            for (let action of this.actions) {
                this.mesh.actionManager.unregisterAction(action);
            }
            if (this.mesh.actionManager.actions.length === 0) {
                this.mesh.actionManager.dispose();
                this.mesh.actionManager = null;
            }
        }
        this.actions = [];
    }

    override onPropertiesChange() {
        if (this.mesh.actionManager == null) {
            this.mesh.actionManager = new ActionManager(this.mesh.getScene());
        }
        let clickProp: SenClickProp = this.properties as SenClickProp;
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

            // Proximity guard
            if (!shouldEmitByProximity(
                (this.properties as SenClickProp).avProximity,
                this.mesh.absolutePosition,
                SNAManager.getSNAManager().getAV()
            )) return;

            this.emitSignal(e);
        });

        this.mesh.actionManager.registerAction(action);
        this.actions.push(action);

        // Pointer-over/out tracking for dynamic cursor
        let overAction: Action = new ExecuteCodeAction(
            ActionManager.OnPointerOverTrigger,
            () => { this._isHovering = true; }
        );
        this.mesh.actionManager.registerAction(overAction);
        this.actions.push(overAction);

        let outAction: Action = new ExecuteCodeAction(
            ActionManager.OnPointerOutTrigger,
            () => { this._isHovering = false; }
        );
        this.mesh.actionManager.registerAction(outAction);
        this.actions.push(outAction);

        // Dynamic cursor: update every frame while hovering
        if (clickProp.avProximity > 0) {
            let scene = this.mesh.getScene();
            this._renderObserver = scene.onBeforeRenderObservable.add(() => {
                if (!this._isHovering) return;
                const inRange = shouldEmitByProximity(
                    (this.properties as SenClickProp).avProximity,
                    this.mesh.absolutePosition,
                    SNAManager.getSNAManager().getAV()
                );
                this.mesh.actionManager.hoverCursor = inRange ? "pointer" : "default";
            });
        } else {
            this.mesh.actionManager.hoverCursor = "pointer";
        }
    }
}

SNAManager.getSNAManager().addSensor("Click", SensorClick);
