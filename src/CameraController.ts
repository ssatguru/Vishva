import { Scene, Camera, ArcRotateCamera, UniversalCamera, TargetCamera, Vector3, CascadedShadowGenerator } from "babylonjs";

export class UniCamController {
    camera: UniversalCamera;
    canvas: HTMLCanvasElement;
    active: boolean;
    csg: CascadedShadowGenerator;
    scene: Scene;
    defaultSpeed: number;
    isFast: boolean = false;

    constructor(scene: Scene, canvas: HTMLCanvasElement, csg: CascadedShadowGenerator) {
        this.scene = scene;
        this.canvas = canvas;
        this.active = false;
        this.csg = csg;
        console.log("creating new uni camera");
    }

    public start() {
        this.active = true;

        let oldCam: TargetCamera = <TargetCamera>this.scene.activeCamera;
        oldCam.detachControl();

        //this.camera = new UniversalCamera("",oldCam.getFrontPosition(-1),this.scene);
        this.camera = new UniversalCamera("", oldCam.position, this.scene);
        this.camera.setTarget(oldCam.getTarget());//.subtractFromFloats(0,0.5,0));

        this.camera.speed = this.camera.speed / 8;
        this.defaultSpeed = this.camera.speed;

        this.camera.attachControl(this.canvas);

        //left arrow, "a"
        this.camera.keysLeft = [37, 65];
        //right arrow,"d"
        this.camera.keysRight = [39, 68];
        //up arrow,"w"
        this.camera.keysUp = [38, 87];
        //down arrow,"s"
        this.camera.keysDown = [40, 83];

        this.scene.activeCamera = this.camera;

        //if we donot do this then this camera  doesnot move
        this.csg.autoCalcDepthBounds = false;
    }

    public stop() {
        if (!this.active) return;
        this.camera.detachControl();
        this.camera.dispose();
        this.active = false;
        this.csg.autoCalcDepthBounds = true;
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

