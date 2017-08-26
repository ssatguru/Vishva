

namespace org.ssatguru.babylonjs.vishva {

    import AbstractMesh = BABYLON.AbstractMesh;
    import Action = BABYLON.Action;
    import ActionManager = BABYLON.ActionManager;
    import ExecuteCodeAction = BABYLON.ExecuteCodeAction;
    import Mesh = BABYLON.Mesh;
    import Scene = BABYLON.Scene;
    import Tags = BABYLON.Tags;

    export class SenContactProp extends SNAproperties {
        onEnter : boolean = false;
        onExit: boolean = false; 
        public unmarshall(obj: Object): SenContactProp {
            return <SenContactProp>obj;
        }
    }
    
    export class SensorContact extends SensorAbstract {
        
        
        public constructor(mesh: Mesh, prop: SenContactProp) {
           if (prop!=null){
                super(mesh, prop);
            }else{
                super(mesh, new SenContactProp());
            }
            this.processUpdateSpecific();
            
        }

        public getName(): string {
            return "Contact";
        }

        public getProperties(): SNAproperties {
            return this.properties;
        }

        public setProperties(properties: SNAproperties) {
            this.properties =  <SenContactProp> properties;
        }

        public cleanUp() {
        }

        public processUpdateSpecific() {
            let properties : SenContactProp = <SenContactProp> this.properties;
            var scene: Scene = this.mesh.getScene();
            
            if (this.mesh.actionManager == null) {
                this.mesh.actionManager = new ActionManager(scene);
            }


            let otherMesh = scene.getMeshesByTags("Vishva.avatar" )[0];
            
            if (properties.onEnter){
                let action:Action = new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } }, (e) => { return this.emitSignal(e) });
                this.mesh.actionManager.registerAction(action);
                this.actions.push(action);
            }
            
            if (properties.onExit){
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
}
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Contact",org.ssatguru.babylonjs.vishva.SensorContact);