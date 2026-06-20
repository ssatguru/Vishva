import { MeshPickerType } from "../gui/VishvaGUI";
import { SNAproperties, SensorAbstract, SNAManager } from "./SNA";
import {
    AbstractMesh,
    ActionManager,
    ExecuteCodeAction,
    Scene
} from "babylonjs";

export class SenContactProp extends SNAproperties {
    onEnter: boolean = false;
    onExit: boolean = false;
    targetMesh: MeshPickerType = new MeshPickerType();
}

export class SensorContact extends SensorAbstract {

    override init() {}

    override getName(): string {
        return "Contact";
    }

    override getPropertiesType(): typeof SNAproperties {
        return SenContactProp;
    }

    override getProperties(): SNAproperties {
        return this.properties;
    }

    override setProperties(properties: SNAproperties) {
        this.properties = <SenContactProp>properties;
    }

    override cleanUp() {}

    override onPropertiesChange() {
        let properties: SenContactProp = <SenContactProp>this.properties;
        let scene: Scene = this.mesh.getScene();

        if (!this.mesh.actionManager) {
            this.mesh.actionManager = new ActionManager(scene);
        }

        // Resolve target mesh by uniqueId
        let targetMeshId = properties.targetMesh.value;
        if (!targetMeshId || targetMeshId === "") {
            console.warn("SensorContact: no target mesh selected");
            return;
        }

        let otherMesh: AbstractMesh = scene.getMeshByUniqueId(Number(targetMeshId));

        if (!otherMesh) {
            console.error("SensorContact: target mesh not found in scene (id: " + targetMeshId + ")");
            return;
        }

        if (!(otherMesh instanceof AbstractMesh)) {
            console.warn("SensorContact: target node is not an AbstractMesh (id: " + targetMeshId + ")");
            return;
        }

        if (properties.onEnter) {
            let action = new ExecuteCodeAction(
                { trigger: ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } },
                (e) => this.emitSignal(e)
            );
            this.mesh.actionManager.registerAction(action);
            this.actions.push(action);
        }

        if (properties.onExit) {
            let action = new ExecuteCodeAction(
                { trigger: ActionManager.OnIntersectionExitTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } },
                (e) => this.emitSignal(e)
            );
            this.mesh.actionManager.registerAction(action);
            this.actions.push(action);
        }
    }
}

SNAManager.getSNAManager().addSensor("Contact", SensorContact);
