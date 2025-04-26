import { Scene, Camera, ArcRotateCamera, UniversalCamera, TargetCamera, Vector3, CascadedShadowGenerator, DepthRenderer } from "babylonjs";

export class UniCamController {
    camera: UniversalCamera;
    canvas: HTMLCanvasElement;
    active: boolean;
    csg: CascadedShadowGenerator;
    dr: DepthRenderer;

    oldCam: TargetCamera;
    oldDr: DepthRenderer;
    scene: Scene;
    defaultSpeed: number;
    isFast: boolean = false;

    constructor(scene: Scene, canvas: HTMLCanvasElement, csg: CascadedShadowGenerator, oldDr: DepthRenderer) {

        console.log("creating new uni camera");

        this.scene = scene;
        this.canvas = canvas;
        this.active = false;
        this.csg = csg;
        this.oldDr = oldDr;

        this.camera = new UniversalCamera("UniCam", Vector3.Zero(), this.scene);
        
        this.camera.speed = this.camera.speed / 8;
        this.defaultSpeed = this.camera.speed;
        this.dr = this.scene.enableDepthRenderer(this.camera);
        this.dr.useOnlyInActiveCamera = true;

        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssaopipeline", this.camera);

    }

    public start() {
        if (this.active) return;
        this.active = true;

        this.oldCam = <TargetCamera>this.scene.activeCamera;
        this.oldCam.detachControl();

        this.camera.position = this.oldCam.position;
        this.camera.setTarget(this.oldCam.getTarget());

        this.camera.attachControl(true);
       
        this.camera.keysLeft = [37, 65]; //left arrow, "a"
        this.camera.keysRight = [39, 68];//right arrow,"d"
        this.camera.keysUp = [38, 87];//up arrow,"w"
        this.camera.keysDown = [40, 83];//down arrow,"s"
        this.camera.keysUpward = [33, 81]; //page up,"q"
        this.camera.keysDownward = [34, 69]; //page down,"e"

        this.oldDr.enabled = false;
        this.dr.enabled = true;
        this.csg.setDepthRenderer(this.dr);
        this.scene.activeCamera = this.camera;

        //if we donot do this then this camera  doesnot move
        this.csg.autoCalcDepthBounds = true;
    }

    public stop() {
        if (!this.active) return;
        this.active = false;

        this.camera.detachControl();
        this.dr.enabled = false;

        this.oldDr.enabled = true;
        this.csg.setDepthRenderer(this.oldDr);
        this.csg.autoCalcDepthBounds = true;
        (<ArcRotateCamera>this.oldCam).attachControl(true, false, 2);
        this.scene.activeCamera = this.oldCam;
    }

    public speedUp() {
        if (this.isFast) return;
        this.isFast = true;
        this.camera.speed = this.defaultSpeed * 4;
    }

    public slowDown() {
        if (!this.isFast) return;
        this.isFast = false;
        this.camera.speed = this.defaultSpeed;
    }




}

