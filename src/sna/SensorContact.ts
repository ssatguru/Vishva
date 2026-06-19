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
    state_mesh: AbstractMesh = null;
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
        // Sync the current uniqueId from the live mesh before returning,
        // and return a plain object without state_mesh to avoid circular
        // references during deep traversal (AssetCollector).
        let props = this.properties as SenContactProp;
        if (props.state_mesh) {
            props.targetMesh.value = props.state_mesh.uniqueId.toString();
        }
        return {
            ...props,
            state_mesh: undefined
        } as any;
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

        let otherMesh: AbstractMesh = null;
        for (let m of scene.meshes) {
            if (m.uniqueId.toString() === targetMeshId) {
                otherMesh = m;
                properties.state_mesh = m;
                break;
            }
        }

        if (!otherMesh) {
            console.warn("SensorContact: target mesh not found in scene (id: " + targetMeshId + ")");
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
