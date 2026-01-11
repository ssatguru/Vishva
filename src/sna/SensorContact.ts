import { AnimUtils } from "../util/AnimUtils";
import { Vishva } from "../Vishva";
import { SNAproperties } from "./SNA";
import { SensorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    AbstractMesh,
    Action,
    ActionManager,
    ExecuteCodeAction,
    Mesh,
    Scene,
    Tags
} from "babylonjs";

export class SenContactProp extends SNAproperties {
    onEnter: boolean = false;
    onExit: boolean = false;
}

export class SensorContact extends SensorAbstract {


    override init(){}

    override getName(): string {
        return "Contact";
    }

    override getPropertiesType() : typeof SNAproperties {
        return SenContactProp;
    }

    override getProperties(): SNAproperties {
        return this.properties;
    }

    override setProperties(properties: SNAproperties) {
        this.properties = <SenContactProp>properties;
    }

    override cleanUp() {
    }

    override onPropertiesChange() {
        let properties: SenContactProp = <SenContactProp>this.properties;
        var scene: Scene = this.mesh.getScene();

        if (this.mesh.actionManager == null) {
            this.mesh.actionManager = new ActionManager(scene);
        }

        //find the mesh which has the skeleton attached to it
        //this mesh will have a some size, which is needed for IntersectionMeshTrigger to happen
        let otherMesh=AnimUtils.getMeshSkel(Vishva.vishva.avManager.avatar, true).mesh;
        if (otherMesh == null) {
            console.log("Cannot use this sensor as unable to find a mesh which as non zero size. The AV maynot have a skeleton");
            return;
        }

        if (properties.onEnter) {
            let action: Action = new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } }, (e) => { return this.emitSignal(e) });
            this.mesh.actionManager.registerAction(action);
            this.actions.push(action);

        }
        if (properties.onExit) {
            let action: Action = new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionExitTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } }, (e) => { return this.emitSignal(e) });
            this.mesh.actionManager.registerAction(action);
            this.actions.push(action);
        }
    }



    private findAV(scene: Scene): AbstractMesh {

        for (var index140 = 0; index140 < scene.meshes.length; index140++) {
            var mesh = scene.meshes[index140];
            {
                if (Tags.HasTags(mesh)) {

                    if (Tags.MatchesQuery(mesh, "Vishva.avatar")) {
                        return mesh;
                    }
                }
            }
        }
        return null;
    }
}

SNAManager.getSNAManager().addSensor("Contact", SensorContact);