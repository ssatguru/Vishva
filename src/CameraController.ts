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

        this.camera = new UniversalCamera("", Vector3.Zero(), this.scene);
        this.camera.speed = this.camera.speed / 8;
        this.defaultSpeed = this.camera.speed;
        this.dr = this.scene.enableDepthRenderer(this.camera);
        this.dr.useOnlyInActiveCamera = true;

    }

    public start() {
        this.active = true;

        this.oldCam = <TargetCamera>this.scene.activeCamera;
        this.oldCam.detachControl();

        //this.camera = new UniversalCamera("",oldCam.getFrontPosition(-1),this.scene);
        // this.camera = new UniversalCamera("", oldCam.position, this.scene);

        this.camera.position = this.oldCam.position;
        this.camera.setTarget(this.oldCam.getTarget());//.subtractFromFloats(0,0.5,0));

        this.camera.attachControl(true);

        //left arrow, "a"
        this.camera.keysLeft = [37, 65];
        //right arrow,"d"
        this.camera.keysRight = [39, 68];
        //up arrow,"w"
        this.camera.keysUp = [38, 87];
        //down arrow,"s"
        this.camera.keysDown = [40, 83];

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
        //this.camera.dispose();


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

