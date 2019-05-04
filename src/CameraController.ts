import { Scene,  Camera,ArcRotateCamera, UniversalCamera, TargetCamera, Vector3} from "babylonjs";

export class CameraController{
    camera:UniversalCamera;
    saveCamera:ArcRotateCamera;
    saveTarget:Vector3;
    canvas:HTMLCanvasElement;

    scene:Scene;

    constructor(scene:Scene,canvas:HTMLCanvasElement){
        this.scene=scene;
        this.canvas=canvas;
    }

    public start(){
        this.saveCamera = <ArcRotateCamera> this.scene.activeCamera;
        this.saveTarget=this.saveCamera.getTarget();
        this.saveCamera.detachControl(this.canvas);
        this.camera = new UniversalCamera("",this.saveCamera.getFrontPosition(-1),this.scene);
        this.camera.setTarget(this.saveCamera.getTarget());
        this.camera.attachControl(this.canvas);
        //left arrow, "a"
        this.camera.keysLeft=[37,65];
        //right arrow,"d"
        this.camera.keysRight=[39,68];
        //up arrow,"w"
        this.camera.keysUp=[38,87];
        //down arrow,"s"
        this.camera.keysDown=[40,83];
        this.scene.activeCamera=this.camera;

    }

    public stop(){
        this.camera.detachControl(this.canvas);
        this.saveCamera.attachControl(this.canvas);
        this.scene.activeCamera=this.saveCamera;
        this.saveCamera.setTarget(this.saveTarget);
        this.saveCamera.setPosition(this.camera.position.clone());
        this.camera.dispose();
    }

   

   
}

