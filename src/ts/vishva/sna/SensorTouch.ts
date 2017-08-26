namespace org.ssatguru.babylonjs.vishva {

    import Action = BABYLON.Action;
    import ActionManager = BABYLON.ActionManager;
    import ExecuteCodeAction = BABYLON.ExecuteCodeAction;
    import Mesh = BABYLON.Mesh;
    
    export class SenTouchProp extends SNAproperties {
        public unmarshall(obj: Object): SenTouchProp {
            return <SenTouchProp>obj;
        }
    }
    
    export class SensorTouch extends SensorAbstract {
        properties: SNAproperties;

        public constructor(mesh: Mesh, prop: SNAproperties) {
            if (prop!=null){
                super(mesh, prop);
            }else{
                super(mesh, new SenTouchProp());
            }
             if (this.mesh.actionManager == null) {
                this.mesh.actionManager = new ActionManager(this.mesh.getScene());
            }
            
            let action:Action = new ExecuteCodeAction(ActionManager.OnPickUpTrigger, (e) => { 
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

        public processUpdateSpecific() {
           
        }
    }
}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Touch",org.ssatguru.babylonjs.vishva.SensorTouch);