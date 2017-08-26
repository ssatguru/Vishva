namespace org.ssatguru.babylonjs.vishva {

    import AbstractMesh = BABYLON.AbstractMesh;
    import Action = BABYLON.Action;
    import ActionManager = BABYLON.ActionManager;
    import ExecuteCodeAction = BABYLON.ExecuteCodeAction;
    import Mesh = BABYLON.Mesh;
    import Scene = BABYLON.Scene;
    import Tags = BABYLON.Tags;

    export class SenTimerProp extends SNAproperties {
        interval : number = 1000;
        public unmarshall(obj: Object): SenTimerProp {
            return <SenTimerProp>obj;
        }
    }
    
    export class SensorTimer extends SensorAbstract {
        
        timerId:number;
        
        public constructor(mesh: Mesh, prop: SenTimerProp) {
           if (prop!=null){
                super(mesh, prop);
            }else{
                super(mesh, new SenTimerProp());
            }
            this.processUpdateSpecific();
        }

        public getName(): string {
            return "Timer";
        }

        public getProperties(): SNAproperties {
            return this.properties;
        }

        public setProperties(properties: SNAproperties) {
            this.properties =  <SenTimerProp> properties;
        }

        public cleanUp() {
            window.clearInterval(this.timerId);
        }

        public processUpdateSpecific() {
            let properties : SenTimerProp = <SenTimerProp> this.properties;
            if (this.timerId){
                window.clearInterval(this.timerId);
            }
            this.timerId = window.setInterval(() => {this.emitSignal();}, properties.interval);
        }
      
    }            
}
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Timer",org.ssatguru.babylonjs.vishva.SensorTimer);