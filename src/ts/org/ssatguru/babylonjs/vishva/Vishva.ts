
namespace org.ssatguru.babylonjs.vishva {
    import EditControl = org.ssatguru.babylonjs.component.EditControl;
    import AbstractMesh = BABYLON.AbstractMesh;
    import Action = BABYLON.Action;
    import ActionEvent = BABYLON.ActionEvent;
    import ActionManager = BABYLON.ActionManager;
    import Animatable = BABYLON.Animatable;
    import Animation = BABYLON.Animation;
    import AnimationRange = BABYLON.AnimationRange;
    import ArcRotateCamera = BABYLON.ArcRotateCamera;
    import AssetsManager = BABYLON.AssetsManager;
    import Axis = BABYLON.Axis;
    import BaseTexture = BABYLON.BaseTexture;
    import Bone = BABYLON.Bone;
    import BoundingInfo = BABYLON.BoundingInfo;
    import Camera = BABYLON.Camera;
    import Color3 = BABYLON.Color3;
    import CubeTexture = BABYLON.CubeTexture;
    import DirectionalLight = BABYLON.DirectionalLight;
    import Engine = BABYLON.Engine;
    import ExecuteCodeAction = BABYLON.ExecuteCodeAction;
    import GroundMesh = BABYLON.GroundMesh;
    import HemisphericLight = BABYLON.HemisphericLight;
    import IAssetTask = BABYLON.IAssetTask;
    import IShadowLight = BABYLON.IShadowLight;
    import InstancedMesh = BABYLON.InstancedMesh;
    import Light = BABYLON.Light;
    import Material = BABYLON.Material;
    import Matrix = BABYLON.Matrix;
    import Mesh = BABYLON.Mesh;
    import MultiMaterial = BABYLON.MultiMaterial;
    import Node = BABYLON.Node;
    import ParticleSystem = BABYLON.ParticleSystem;
    import PhysicsImpostor = BABYLON.PhysicsImpostor;
    import PickingInfo = BABYLON.PickingInfo;
    import PointLight = BABYLON.PointLight
    import Quaternion = BABYLON.Quaternion;
    import Scene = BABYLON.Scene;
    import SceneLoader = BABYLON.SceneLoader;
    import SceneSerializer = BABYLON.SceneSerializer;
    import ShadowGenerator = BABYLON.ShadowGenerator;
    import IShadowGenerator = BABYLON.IShadowGenerator;
    import Skeleton = BABYLON.Skeleton;
    import Sound = BABYLON.Sound;
    import StandardMaterial = BABYLON.StandardMaterial;
    import Tags = BABYLON.Tags;
    import TextFileAssetTask = BABYLON.TextFileAssetTask;
    import Texture = BABYLON.Texture;
    import Vector3 = BABYLON.Vector3;
    import WaterMaterial = BABYLON.WaterMaterial;
    //import VishvaSerialized = org.ssatguru.babylonjs.vishva.VishvaSerialized;

    /**
     * @author satguru
     */
    export class Vishva {
        actuator: string = "none";

        scene: Scene;

        engine: Engine;

        canvas: HTMLCanvasElement;

        editEnabled: boolean;


        private snapTransOn: boolean = false;
        private snapTransValue: number = 1;

        private snapRotOn: boolean = false;
        private snapRotValue: number = Math.PI / 4;
        /*
         * snapper mode snaps mesh to global grid points
         * evertime a mesh is selected it will be snapped to
         * the closest global grid point
         * can only work in globalAxisMode
         * 
         */
        private snapperOn: boolean = false;

        private globalAxisMode: boolean = false;

        skyboxes: Array<string>;

        assets: Object;

        skyboxTextures: string = "vishva/internal/textures/skybox-default/default";

        avatarFolder: string = "vishva/internal/avatar/";

        avatarFile: string = "starterAvatars.babylon";

        groundTexture: string = "vishva/internal/textures/ground.jpg";

        primTexture: string = "vishva/internal/textures/Birch.jpg";

        waterTexture: string = "vishva/internal/textures/waterbump.png";

        snowTexture: string = "vishva/internal/textures/flare.png";
        rainTexture: string = "vishva/internal/textures/raindrop-1.png";

        snowPart: ParticleSystem = null;
        snowing: boolean = false;

        rainPart: ParticleSystem = null;
        raining: boolean = false;

        SOUND_ASSET_LOCATION: string = "vishva/assets/sounds/";

        RELATIVE_ASSET_LOCATION: string = "../../../../";

        sun: HemisphericLight;

        sunDR: DirectionalLight;

        skybox: Mesh;

        ground: Mesh;

        avatar: Mesh;

        avatarSkeleton: Skeleton;

        mainCamera: ArcRotateCamera;

        vishvaGUI: VishvaGUI;



        /**
         * use this to prevent users from switching to another mesh during edit.
         */
        public switchDisabled: boolean = false;

        walk: AnimData;

        walkBack: AnimData;

        idle: AnimData;

        run: AnimData;

        jump: AnimData;

        turnLeft: AnimData;

        turnRight: AnimData;

        strafeLeft: AnimData;

        strafeRight: AnimData;

        anims: AnimData[];

        avatarSpeed: number = 0.05;

        prevAnim: AnimData = null;

        key: Key;

        private keysDisabled: boolean = false;

        loadingMsg: HTMLElement;

        loadingStatus: HTMLElement;

        showBoundingBox: boolean = false;

        cameraCollision: boolean = true;
        //automatcally open edit menu whenever a mesh is selected
        private autoEditMenu: boolean = true;

        private enablePhysics: boolean = true;

        //how far away from the center can the avatar go
        //fog will start at the limitStart and will become dense at LimitEnd
        private moveLimitStart = 114;
        private moveLimitEnd = 124;

        public constructor(scenePath: string, sceneFile: string, canvasId: string, editEnabled: boolean, assets: Object) {
            this.editEnabled = false;
            this.frames = 0;
            this.f = 0;
            if (!Engine.isSupported()) {
                alert("not supported");
                return;
            }
            this.loadingMsg = document.getElementById("loadingMsg");
            this.loadingMsg.style.visibility = "visible";
            this.loadingStatus = document.getElementById("loadingStatus");

            this.editEnabled = editEnabled;
            this.assets = assets;
            this.key = new Key();
            this.initAnims();
            this.canvas = <HTMLCanvasElement>document.getElementById(canvasId);
            this.engine = new Engine(this.canvas, true);
            this.scene = new Scene(this.engine);
            this.scene.enablePhysics();

            window.addEventListener("resize", (event) => { return this.onWindowResize(event) });
            window.addEventListener("keydown", (e) => { return this.onKeyDown(e) }, false);
            window.addEventListener("keyup", (e) => { return this.onKeyUp(e) }, false);

            this.scenePath = scenePath;
            if (sceneFile == null) {
                this.onSceneLoaded(this.scene);
            } else {
                this.loadingStatus.innerHTML = "downloading world";
                this.loadSceneFile(scenePath, sceneFile + ".js", this.scene);
            }
        }

        scenePath: string;

        private loadSceneFile(scenePath: string, sceneFile: string, scene: Scene) {
            var am: AssetsManager = new AssetsManager(scene);
            var task: IAssetTask = am.addTextFileTask("sceneLoader", scenePath + sceneFile);
            task.onSuccess = (obj) => { return this.onTaskSuccess(obj) };
            task.onError = (obj) => { return this.onTaskFailure(obj) };
            am.load();
        }

        snas: SNAserialized[];

        vishvaSerialized: VishvaSerialized;

        private onTaskSuccess(obj: any) {
            var tfat: TextFileAssetTask = <TextFileAssetTask>obj;
            var foo: Object = <Object>JSON.parse(tfat.text);

            this.vishvaSerialized = foo["VishvaSerialized"];
            //this.snas = <SNAserialized[]>foo["VishvaSNA"];
            this.snas = this.vishvaSerialized.snas;
            this.cameraCollision = this.vishvaSerialized.settings.cameraCollision;
            this.autoEditMenu = this.vishvaSerialized.settings.autoEditMenu;

            var sceneData: string = "data:" + tfat.text;
            SceneLoader.ShowLoadingScreen = false;
            this.loadingStatus.innerHTML = "loading scene";
            SceneLoader.Append(this.scenePath, sceneData, this.scene, (scene) => { return this.onSceneLoaded(scene) });
        }

        private onTaskFailure(obj: any) {
            alert("scene load failed");
        }

        private onSceneLoaded(scene: Scene) {
            this.loadingStatus.innerHTML = "checking assets";
            var avFound: boolean = false;
            var skelFound: boolean = false;
            var sunFound: boolean = false;
            var groundFound: boolean = false;
            var skyFound: boolean = false;
            var cameraFound: boolean = false;

            for (let mesh of scene.meshes) {
                //sat TODO
                mesh.receiveShadows = false;
                if (Tags.HasTags(mesh)) {
                    if (Tags.MatchesQuery(mesh, "Vishva.avatar")) {
                        avFound = true;
                        this.avatar = <Mesh>mesh;
                        this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                        /*
                        if (this.enablePhysics) {
                            this.avatar.checkCollisions = false;
                            this.avatar.physicsImpostor = new BABYLON.PhysicsImpostor(this.avatar, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0.1 }, this.scene);
                        }
                        */
                    } else if (Tags.MatchesQuery(mesh, "Vishva.sky")) {
                        skyFound = true;
                        this.skybox = <Mesh>mesh;
                        this.skybox.isPickable = false;
                    } else if (Tags.MatchesQuery(mesh, "Vishva.ground")) {
                        groundFound = true;
                        this.ground = <Mesh>mesh;
                    }
                }
            }

            for (let skeleton of scene.skeletons) {
                if (Tags.MatchesQuery(skeleton, "Vishva.skeleton") || (skeleton.name === "Vishva.skeleton")) {
                    skelFound = true;
                    this.avatarSkeleton = skeleton;
                    this.checkAnimRange(this.avatarSkeleton);
                }
            }
            if (!skelFound) {
                console.error("ALARM: No Skeleton found");
            }

            for (let light of scene.lights) {
                if (Tags.MatchesQuery(light, "Vishva.sun")) {
                    sunFound = true;
                    this.sun = <HemisphericLight>light;
                }
            }

            if (!sunFound) {
                console.log("no vishva sun found. creating sun");
                var hl: HemisphericLight = new HemisphericLight("Vishva.hl01", new Vector3(0, 1, 0), this.scene);
                hl.groundColor = new Color3(0.5, 0.5, 0.5);
                hl.intensity = 0.4;
                this.sun = hl;
                Tags.AddTagsTo(hl, "Vishva.sun");
                this.sunDR = new DirectionalLight("Vishva.dl01", new Vector3(-1, -1, 0), this.scene);
                this.sunDR.intensity = 0.5;
                var sl: IShadowLight = <IShadowLight>(<any>this.sunDR);
                this.shadowGenerator = new ShadowGenerator(1024, sl);
                this.shadowGenerator.useBlurVarianceShadowMap = true;
                this.shadowGenerator.bias = 1.0E-6;
            } else {
                for (let light of scene.lights) {
                    if (light.id === "Vishva.dl01") {
                        this.sunDR = <DirectionalLight>light;
                        this.shadowGenerator = <ShadowGenerator>light.getShadowGenerator();
                        this.shadowGenerator.bias = 1.0E-6;
                        this.shadowGenerator.useBlurVarianceShadowMap = true;
                    }
                }
            }

            for (let mesh of scene.meshes) {
                if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                    //sat TODO remove comment
                    //mesh.receiveShadows = true;
                    (this.shadowGenerator.getShadowMap().renderList).push(mesh);

                }
            }

            for (let camera of scene.cameras) {
                if (Tags.MatchesQuery(camera, "Vishva.camera")) {
                    cameraFound = true;
                    this.mainCamera = <ArcRotateCamera>camera;
                    this.setCameraSettings(this.mainCamera);
                    this.mainCamera.attachControl(this.canvas, true);
                    //this.mainCamera.target = this.vishvaSerialized.misc.activeCameraTarget;
                }
            }

            if (!cameraFound) {
                console.log("no vishva camera found. creating camera");
                this.mainCamera = this.createCamera(this.scene, this.canvas);
                this.scene.activeCamera = this.mainCamera;
            }

            //TODO
            this.mainCamera.checkCollisions = true;
            this.mainCamera.collisionRadius = new Vector3(0.5, 0.5, 0.5);

            if (!groundFound) {
                console.log("no vishva ground found. creating ground");
                this.ground = this.createGround(this.scene);
            } else {
                //in case this wasn't set in serialized scene
                this.ground.receiveShadows = true;
            }
            if (this.enablePhysics) {
                this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, this.scene);
            }

            if (!skyFound) {
                console.log("no vishva sky found. creating sky");
                this.skybox = this.createSkyBox(this.scene);
            }
            if (this.scene.fogMode !== Scene.FOGMODE_EXP) {
                this.scene.fogMode = Scene.FOGMODE_EXP;
                this.scene.fogDensity = 0;
            }
            if (this.editEnabled) {
                this.scene.onPointerDown = (evt, pickResult) => { return this.pickObject(evt, pickResult) };
            }
            if (!avFound) {
                console.log("no vishva av found. creating av");
                this.loadAvatar();
            } else {
                this.avatarSkeleton.enableBlending(0.1);
            }
            SNAManager.getSNAManager().unMarshal(this.snas, this.scene);
            this.snas = null;
            this.render();
        }

        private render() {
            this.scene.registerBeforeRender(() => { return this.process() });
            this.scene.executeWhenReady(() => { return this.startRenderLoop() });
        }

        private startRenderLoop() {
            this.backfaceCulling(this.scene.materials);
            if (this.editEnabled) {
                this.vishvaGUI = new VishvaGUI(this);
            } else {
                this.vishvaGUI = null;
            }
            this.engine.hideLoadingUI();
            this.loadingMsg.style.visibility = "hidden";
            this.engine.runRenderLoop(() => this.scene.render());
        }

        focusOnAv: boolean = true;

        cameraAnimating: boolean = false;

        private process() {
            if (this.cameraAnimating) return;

            //sometime (like when gui dialogs is on and user is typing into it) we donot want to interpret keys
            //except ofcourse the esc key
            if (this.keysDisabled && !this.key.esc) return;

            //switch to first person?
            if (this.mainCamera.radius <= 0.75) {
                this.mainCamera.radius = 0.75;
                this.avatar.visibility = 0;
                this.mainCamera.checkCollisions = false;
            } else {
                this.avatar.visibility = 1;
                this.mainCamera.checkCollisions = this.cameraCollision;
            }
            if (this.isMeshSelected) {
                if (this.key.focus) {
                    this.key.focus = false;
                    if (this.focusOnAv) {
                        this.saveAVcameraPos.copyFrom(this.mainCamera.position);
                        this.focusOnAv = false;
                    }
                    this.focusOnMesh(this.meshPicked, 25);
                }
                if (this.key.esc) {
                    this.key.esc = false;
                    this.removeEditControl();
                }
                if (this.key.trans) {
                    this.key.trans = false;
                    this.editControl.enableTranslation();
                }
                if (this.key.rot) {
                    this.key.rot = false;
                    this.editControl.enableRotation();
                }
                if (this.key.scale) {
                    this.key.scale = false;
                    this.editControl.enableScaling();
                }
            }
            if (this.focusOnAv) {
                if (this.editControl == null) {
                    this.moveAVandCamera();
                } else {
                    if (!this.editControl.isEditing()) {
                        this.moveAVandCamera();
                    }
                }
            } else if (this.key.up || this.key.down) {
                if (!this.editControl.isEditing()) {
                    this.switchFocusToAV();
                }
            }
        }

        private jumpCycleMax: number = 25;

        private jumpCycle: number = this.jumpCycleMax;

        private wasJumping: boolean = false;

        private moveAVandCamera() {
            let oldAvPos = this.avatar.position.clone();
            var anim: AnimData = this.idle;
            var moving: boolean = false;
            var speed: number = 0;
            var upSpeed: number = 0.05;
            var dir: number = 1;
            var forward: Vector3;
            var backwards: Vector3;
            var stepLeft: Vector3;
            var stepRight: Vector3;
            var up: Vector3;
            if (this.key.up) {
                if (this.key.shift) {
                    speed = this.avatarSpeed * 2;
                    anim = this.run;
                } else {
                    speed = this.avatarSpeed;
                    anim = this.walk;
                }
                if (this.key.jump) {
                    this.wasJumping = true;
                }
                if (this.wasJumping) {
                    upSpeed *= 2;
                    if (this.jumpCycle < this.jumpCycleMax / 2) {
                        dir = 1;
                        if (this.jumpCycle < 0) {
                            this.jumpCycle = this.jumpCycleMax;
                            upSpeed /= 2;
                            this.key.jump = false;
                            this.wasJumping = false;
                        }
                    } else {
                        anim = this.jump;
                        dir = -1;
                    }
                    this.jumpCycle--;
                }
                //TODO testing physics
                forward = this.avatar.calcMovePOV(0, -upSpeed * dir, speed);
                this.avatar.moveWithCollisions(forward);
                //this.avatar.physicsImpostor.applyForce(new BABYLON.Vector3(0, 0, 1), this.avatar.getAbsolutePosition());
                moving = true;
            } else if (this.key.down) {
                backwards = this.avatar.calcMovePOV(0, -upSpeed * dir, -this.avatarSpeed / 2);
                this.avatar.moveWithCollisions(backwards);
                moving = true;
                anim = this.walkBack;
                if (this.key.jump) this.key.jump = false;
            } else if (this.key.stepLeft) {
                anim = this.strafeLeft;
                stepLeft = this.avatar.calcMovePOV(-this.avatarSpeed / 2, -upSpeed * dir, 0);
                this.avatar.moveWithCollisions(stepLeft);
                moving = true;
            } else if (this.key.stepRight) {
                anim = this.strafeRight;
                stepRight = this.avatar.calcMovePOV(this.avatarSpeed / 2, -upSpeed * dir, 0);
                this.avatar.moveWithCollisions(stepRight);
                moving = true;
            }
            if (!moving) {
                if (this.key.jump) {
                    this.wasJumping = true;
                }
                if (this.wasJumping) {
                    upSpeed *= 2;
                    if (this.jumpCycle < this.jumpCycleMax / 2) {
                        dir = 1;
                        if (this.jumpCycle < 0) {
                            this.jumpCycle = this.jumpCycleMax;
                            upSpeed /= 2;
                            this.key.jump = false;
                            this.wasJumping = false;
                        }
                    } else {
                        anim = this.jump;
                        dir = -1;
                    }
                    this.jumpCycle--;
                } else dir = dir / 2;
                this.avatar.moveWithCollisions(new Vector3(0, -upSpeed * dir, 0));
            }
            if (!this.key.stepLeft && !this.key.stepRight) {
                if (this.key.left) {
                    this.mainCamera.alpha = this.mainCamera.alpha + 0.022;
                    if (!moving) {
                        this.avatar.rotation.y = -4.69 - this.mainCamera.alpha;
                        anim = this.turnLeft;
                    }
                } else if (this.key.right) {
                    this.mainCamera.alpha = this.mainCamera.alpha - 0.022;
                    if (!moving) {
                        this.avatar.rotation.y = -4.69 - this.mainCamera.alpha;
                        anim = this.turnRight;
                    }
                }
            }
            if (moving) {
                this.avatar.rotation.y = -4.69 - this.mainCamera.alpha;
            }
            if (this.prevAnim !== anim) {
                if (anim.exist) {
                    this.avatarSkeleton.beginAnimation(anim.name, true, anim.r);
                }
                this.prevAnim = anim;
            }
            let avPos = this.avatar.position.length();
            if (avPos > this.moveLimitStart) {
                this.scene.fogDensity = this.fogDensity + 0.01 * (avPos - this.moveLimitStart) / (this.moveLimitEnd - this.moveLimitStart)
            } else {
                this.scene.fogDensity = this.fogDensity;
            }
            if (avPos > this.moveLimitEnd) {
                this.avatar.position = oldAvPos;
            }
            this.mainCamera.target = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
        }
        fogDensity: number = 0;

        private meshPicked: AbstractMesh;


        private meshesPicked: Array<AbstractMesh>;


        private isMeshSelected: boolean = false;

        private cameraTargetPos: Vector3 = new Vector3(0, 0, 0);

        private saveAVcameraPos: Vector3 = new Vector3(0, 0, 0);

        private editControl: EditControl;

        private pickObject(evt: PointerEvent, pickResult: PickingInfo) {
            // prevent curosr from changing to a edit caret in Chrome
            evt.preventDefault();
            if (evt.button !== 2) return;
            if (pickResult.hit) {
                if (!this.isMeshSelected) {
                    // if none selected then select the one clicked
                    this.isMeshSelected = true;
                    this.meshPicked = pickResult.pickedMesh;
                    SNAManager.getSNAManager().disableSnAs(<Mesh>this.meshPicked);
                    this.savePhyParms();
                    this.editControl = new EditControl(<Mesh>this.meshPicked, this.mainCamera, this.canvas, 0.75);
                    this.editControl.enableTranslation();
                    if (this.globalAxisMode) {
                        this.editControl.setLocal(false);
                    }
                    if (this.autoEditMenu) {
                        this.vishvaGUI.showPropDiag();
                    }
                    if (this.key.ctl) this.multiSelect(null,this.meshPicked);

                    if (this.snapperOn) {
                        this.setSnapperOn();
                    } else {
                        if (this.snapTransOn) {
                            this.editControl.setTransSnap(true);
                            this.editControl.setTransSnapValue(this.snapTransValue);
                        };
                        if (this.snapRotOn) {
                            this.editControl.setRotSnap(true);
                            this.editControl.setRotSnapValue(this.snapRotValue);
                        };
                    }

                } else {
                    if (pickResult.pickedMesh === this.meshPicked) {
                        if (this.key.ctl) {
                            this.multiSelect(null, this.meshPicked);
                        } else {
                            // if already selected then focus on it
                            if (this.focusOnAv) {
                                this.saveAVcameraPos.copyFrom(this.mainCamera.position);
                                this.focusOnAv = false;
                            }
                            this.focusOnMesh(this.meshPicked, 50);
                        }
                    } else {
                        this.switchEditControl(pickResult.pickedMesh);
                        if (this.snapperOn) this.snapToGlobal()
                    }
                }
            }
        }

        private savePhyParms() {
            if ((this.meshPicked.physicsImpostor === undefined) || (this.meshPicked.physicsImpostor === null)) {
                this.meshPickedPhyParms = null;
            } else {
                this.meshPickedPhyParms = new PhysicsParm();
                this.meshPickedPhyParms.type = this.meshPicked.physicsImpostor.type;
                this.meshPickedPhyParms.mass = this.meshPicked.physicsImpostor.getParam("mass");
                this.meshPickedPhyParms.friction = this.meshPicked.physicsImpostor.getParam("friction");
                this.meshPickedPhyParms.restitution = this.meshPicked.physicsImpostor.getParam("restitution");
                this.meshPicked.physicsImpostor.dispose();
                this.meshPicked.physicsImpostor = null;
            }

        }

        private restorePhyParms() {
            if (this.meshPickedPhyParms != null) {
                this.meshPicked.physicsImpostor = new PhysicsImpostor(this.meshPicked, this.meshPickedPhyParms.type);
                this.meshPicked.physicsImpostor.setParam("mass", this.meshPickedPhyParms.mass);
                this.meshPicked.physicsImpostor.setParam("friction", this.meshPickedPhyParms.friction);
                this.meshPicked.physicsImpostor.setParam("restitution", this.meshPickedPhyParms.restitution);
                this.meshPickedPhyParms = null;
            }
        }
        /**
         * switch the edit control to the new mesh
         * 
         * @param mesh
         */
        private switchEditControl(mesh: AbstractMesh) {
            if (this.switchDisabled) return;
            SNAManager.getSNAManager().enableSnAs(this.meshPicked);
            this.restorePhyParms();
            let prevMesh:AbstractMesh = this.meshPicked;
            this.meshPicked = mesh;
            this.savePhyParms();
            this.editControl.switchTo(<Mesh>this.meshPicked);
            SNAManager.getSNAManager().disableSnAs(<Mesh>this.meshPicked);
            if (this.key.ctl) this.multiSelect(prevMesh,this.meshPicked);
            //refresh the properties dialog box if open
            this.vishvaGUI.refreshPropsDiag();


        }

        //        private multiSelect() {
        //            if (this.meshesPicked == null) {
        //                this.meshesPicked = new Array<AbstractMesh>();
        //                
        //            }
        //            //if already selected then unselect it
        //            var i: number = this.meshesPicked.indexOf(this.meshPicked);
        //            if (i >= 0) {
        //                this.meshesPicked.splice(i, 1);
        //                this.meshPicked.showBoundingBox = false;
        //            } else {
        //                this.meshesPicked.push(this.meshPicked);
        //                this.meshPicked.showBoundingBox = true;
        //            }
        //        }
        
        private multiSelect(prevMesh: AbstractMesh, currentMesh: AbstractMesh) {
            if (this.meshesPicked == null) {
                this.meshesPicked = new Array<AbstractMesh>();

            }
            //if previous mesh isn't selected then select it too
            var i: number;
            if (prevMesh != null) {
                i = this.meshesPicked.indexOf(prevMesh);
                if (!(i >= 0)) {
                    this.meshesPicked.push(prevMesh);
                    prevMesh.showBoundingBox = true;
                }
            }
            
            //if current mesh was already selected then unselect it
            i = this.meshesPicked.indexOf(currentMesh);
            if (i >= 0) {
                this.meshesPicked.splice(i, 1);
                this.meshPicked.showBoundingBox = false;
            } else {
                this.meshesPicked.push(currentMesh);
                currentMesh.showBoundingBox = true;
            }

        }

        private removeEditControl() {
            if (this.meshesPicked != null) {
                for (var index148 = 0; index148 < this.meshesPicked.length; index148++) {
                    var mesh = this.meshesPicked[index148];
                    {
                        mesh.showBoundingBox = false;
                    }
                }
                this.meshesPicked = null;
            }
            this.isMeshSelected = false;
            if (!this.focusOnAv) {
                this.switchFocusToAV();
            }
            this.editControl.detach();
            this.editControl = null;
            //if (!this.editAlreadyOpen) this.vishvaGUI.closeEditMenu();
            if (this.autoEditMenu) this.vishvaGUI.closePropDiag();
            //close properties dialog if open
            this.vishvaGUI.closePropsDiag();
            if (this.meshPicked != null) {
                SNAManager.getSNAManager().enableSnAs(this.meshPicked);
                this.restorePhyParms();
            }
        }

        private switchFocusToAV() {
            this.mainCamera.detachControl(this.canvas);

            this.frames = 25;
            this.f = this.frames;

            this.delta = this.saveAVcameraPos.subtract(this.mainCamera.position).scale(1 / this.frames);

            var avTarget: Vector3 = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
            this.delta2 = avTarget.subtract((<Vector3>this.mainCamera.target)).scale(1 / this.frames);

            this.cameraAnimating = true;
            this.scene.registerBeforeRender(this.animFunc);
        }

        private focusOnMesh(mesh: AbstractMesh, frames: number) {
            this.mainCamera.detachControl(this.canvas);
            this.frames = frames;
            this.f = frames;
            this.delta2 = mesh.absolutePosition.subtract((<Vector3>this.mainCamera.target)).scale(1 / this.frames);
            this.cameraAnimating = true;
            this.scene.registerBeforeRender(this.animFunc2);
        }

        animFunc: () => void = () => { return this.animateCamera() };

        animFunc2: () => void = () => { return this.justReFocus() };

        frames: number;

        f: number;

        delta: Vector3;

        delta2: Vector3;

        private animateCamera() {
            var avTarget: Vector3 = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
            var targetDiff = avTarget.subtract((<Vector3>this.mainCamera.target)).length();
            if (targetDiff > 0.01)
                this.mainCamera.setTarget((<Vector3>this.mainCamera.target).add(this.delta2));

            var posDiff = this.saveAVcameraPos.subtract(this.mainCamera.position).length();
            if (posDiff > 0.01)
                this.mainCamera.setPosition(this.mainCamera.position.add(this.delta));

            this.f--;
            if (this.f < 0) {
                this.focusOnAv = true;
                this.cameraAnimating = false;
                this.scene.unregisterBeforeRender(this.animFunc);
                this.mainCamera.attachControl(this.canvas);
            }
        }

        private justReFocus() {
            this.mainCamera.setTarget((<Vector3>this.mainCamera.target).add(this.delta2));
            this.f--;
            if (this.f < 0) {
                this.cameraAnimating = false;
                this.scene.unregisterBeforeRender(this.animFunc2);
                this.mainCamera.attachControl(this.canvas);
            }
        }

        //////////////////////////////////////////////////////////

        private initAnims() {
            this.walk = new AnimData("walk", 7, 35, 1);
            this.walkBack = new AnimData("walkBack", 39, 65, 0.5);
            this.idle = new AnimData("idle", 203, 283, 1);
            this.run = new AnimData("run", 69, 95, 1);
            this.jump = new AnimData("jump", 101, 103, 0.5);
            this.turnLeft = new AnimData("turnLeft", 107, 151, 0.5);
            this.turnRight = new AnimData("turnRight", 155, 199, 0.5);
            this.strafeLeft = new AnimData("strafeLeft", 0, 0, 1);
            this.strafeRight = new AnimData("strafeRight", 0, 0, 1);
            this.anims = [this.walk, this.walkBack, this.idle, this.run, this.jump, this.turnLeft, this.turnRight, this.strafeLeft, this.strafeRight];
        }

        private onWindowResize(event: Event) {
            this.engine.resize();
        }

        private onKeyDown(e: Event) {
            var event: KeyboardEvent = <KeyboardEvent>e;
            if (event.keyCode === 16) this.key.shift = true;
            if (event.keyCode === 17) this.key.ctl = true;
            if (event.keyCode === 32) this.key.jump = false;
            if (event.keyCode === 27) this.key.esc = false;
            var chr: string = String.fromCharCode(event.keyCode);
            if ((chr === "W") || (event.keyCode === 38)) this.key.up = true;
            if ((chr === "A") || (event.keyCode === 37)) this.key.left = true;
            if ((chr === "D") || (event.keyCode === 39)) this.key.right = true;
            if ((chr === "S") || (event.keyCode === 40)) this.key.down = true;
            if (chr === "Q") this.key.stepLeft = true;
            if (chr === "E") this.key.stepRight = true;
            if (chr === "1") this.key.trans = false;
            if (chr === "2") this.key.rot = false;
            if (chr === "3") this.key.scale = false;
            if (chr === "F") this.key.focus = false;
        }

        private onKeyUp(e: Event) {
            var event: KeyboardEvent = <KeyboardEvent>e;
            if (event.keyCode === 16) this.key.shift = false;
            if (event.keyCode === 17) this.key.ctl = false;
            if (event.keyCode === 32) this.key.jump = true;
            if (event.keyCode === 27) this.key.esc = true;
            var chr: string = String.fromCharCode(event.keyCode);
            if ((chr === "W") || (event.keyCode === 38)) this.key.up = false;
            if ((chr === "A") || (event.keyCode === 37)) this.key.left = false;
            if ((chr === "D") || (event.keyCode === 39)) this.key.right = false;
            if ((chr === "S") || (event.keyCode === 40)) this.key.down = false;
            if (chr === "Q") this.key.stepLeft = false;
            if (chr === "E") this.key.stepRight = false;
            if (chr === "1") this.key.trans = true;
            if (chr === "2") this.key.rot = true;
            if (chr === "3") this.key.scale = true;
            if (chr === "F") this.key.focus = true;
        }

        /**
         * material for primitives
         */
        private primMaterial: StandardMaterial;

        private createPrimMaterial() {
            this.primMaterial = new StandardMaterial("primMat", this.scene);
            this.primMaterial.diffuseTexture = new Texture(this.primTexture, this.scene);
            this.primMaterial.diffuseColor = new Color3(1, 1, 1);
            this.primMaterial.specularColor = new Color3(0, 0, 0);
        }

        private setPrimProperties(mesh: Mesh) {
            if (this.primMaterial == null) this.createPrimMaterial();
            var r: number = mesh.getBoundingInfo().boundingSphere.radiusWorld;
            var placementLocal: Vector3 = new Vector3(0, r, -(r + 2));
            var placementGlobal: Vector3 = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
            mesh.position.addInPlace(placementGlobal);
            mesh.material = this.primMaterial;
            mesh.checkCollisions = true;
            (this.shadowGenerator.getShadowMap().renderList).push(mesh);
            //sat TODO remove comment
            //mesh.receiveShadows = true;
            Tags.AddTagsTo(mesh, "Vishva.prim Vishva.internal");
            mesh.id = (<number>new Number(Date.now())).toString();
            mesh.name = mesh.id;
        }

        public addPrim(primType: string) {
            if (primType === "plane") this.addPlane(); else if (primType === "box") this.addBox(); else if (primType === "sphere") this.addSphere(); else if (primType === "disc") this.addDisc(); else if (primType === "cylinder") this.addCylinder(); else if (primType === "cone") this.addCone(); else if (primType === "torus") this.addTorus();
        }

        public addPlane() {
            let mesh: Mesh = Mesh.CreatePlane("", 1.0, this.scene);
            this.setPrimProperties(mesh);
            mesh.material.backFaceCulling = false;

        }

        public addBox() {
            let mesh: Mesh = Mesh.CreateBox("", 1, this.scene);
            this.setPrimProperties(mesh);
        }

        public addSphere() {
            let mesh: Mesh = Mesh.CreateSphere("", 10, 1, this.scene);
            this.setPrimProperties(mesh);
        }

        public addDisc() {
            let mesh: Mesh = Mesh.CreateDisc("", 0.5, 20, this.scene);
            this.setPrimProperties(mesh);
            mesh.material.backFaceCulling = false;
        }

        public addCylinder() {
            let mesh: Mesh = Mesh.CreateCylinder("", 1, 1, 1, 20, 1, this.scene);
            this.setPrimProperties(mesh);
        }

        public addCone() {
            let mesh: Mesh = Mesh.CreateCylinder("", 1, 0, 1, 20, 1, this.scene);
            this.setPrimProperties(mesh);
        }

        public addTorus() {
            let mesh: Mesh = Mesh.CreateTorus("", 1, 0.25, 20, this.scene);
            this.setPrimProperties(mesh);
        }

        public switchGround(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            Tags.RemoveTagsFrom(this.ground, "Vishva.ground");
            this.ground.isPickable = true;
            this.ground = <Mesh>this.meshPicked;
            this.ground.isPickable = false;
            Tags.AddTagsTo(this.ground, "Vishva.ground");
            this.removeEditControl();
            return null;
        }

        public instance_mesh(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if ((this.meshPicked != null && this.meshPicked instanceof BABYLON.InstancedMesh)) {
                return ("this is an instance mesh. you cannot create instance of that");
            }
            var name: string = (<number>new Number(Date.now())).toString();
            var inst: InstancedMesh = (<Mesh>this.meshPicked).createInstance(name);
            //inst.position = this.meshPicked.position.add(new Vector3(0.1, 0.1, 0.1));
            this.animateCopy(inst);
            this.meshPicked = inst;
            this.switchEditControl(inst);
            //TODO think
            //inst.receiveShadows = true;
            (this.shadowGenerator.getShadowMap().renderList).push(inst);
            return null;
        }

        public toggleCollision() {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            this.meshPicked.checkCollisions = !this.meshPicked.checkCollisions;
        }

        public enableCollision(yes: boolean) {
            this.meshPicked.checkCollisions = yes;
        }

        public isCollideable() {
            return this.meshPicked.checkCollisions
        }

        public toggleEnable() {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            this.meshPicked.setEnabled(!this.meshPicked.isEnabled());
            console.log("enable : " + this.meshPicked.isEnabled())
        }

        public disableIt(yes: boolean) {
            this.meshPicked.setEnabled(!yes);
        }

        public isDisabled(): boolean {
            return !this.meshPicked.isEnabled();
        }


        public showAllDisabled() {
            for (let mesh of this.scene.meshes) {
                if (!mesh.isEnabled()) {
                    mesh.showBoundingBox = true;
                }
            }
        }
        public hideAllDisabled() {
            for (let mesh of this.scene.meshes) {
                if (!mesh.isEnabled()) {
                    mesh.showBoundingBox = false;
                }
            }
        }

        public makeVisibile(yes: boolean) {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            var mesh = this.meshPicked;
            if (yes) {
                if (Tags.HasTags(mesh) && Tags.MatchesQuery(mesh, "invisible")) {
                    Tags.RemoveTagsFrom(this.meshPicked, "invisible")
                    this.meshPicked.visibility = 1;
                    this.meshPicked.isPickable = true;
                    if (this.showingAllInvisibles)
                        mesh.showBoundingBox = false;
                }
            }
            else {
                Tags.AddTagsTo(this.meshPicked, "invisible");
                if (this.showingAllInvisibles) {
                    this.meshPicked.visibility = 0.5;
                    mesh.showBoundingBox = true;
                    this.meshPicked.isPickable = true;
                } else {
                    this.meshPicked.visibility = 0;
                    this.meshPicked.isPickable = false;
                }
            }
        }
        public isVisible(): boolean {
            if (Tags.HasTags(this.meshPicked)) {
                if (Tags.MatchesQuery(this.meshPicked, "invisible")) {
                    return false;
                }
            }
            return true;
        }

        showingAllInvisibles: boolean = false;
        public showAllInvisibles() {
            this.showingAllInvisibles = true;
            for (var i = 0; i < this.scene.meshes.length; i++) {
                var mesh = this.scene.meshes[i];
                if (Tags.HasTags(mesh)) {
                    if (Tags.MatchesQuery(mesh, "invisible")) {
                        mesh.visibility = 0.5;
                        mesh.showBoundingBox = true;
                        mesh.isPickable = true;
                    }
                }
            }
        }

        public hideAllInvisibles() {
            this.showingAllInvisibles = false;
            for (var i = 0; i < this.scene.meshes.length; i++) {
                for (var i = 0; i < this.scene.meshes.length; i++) {
                    var mesh = this.scene.meshes[i];
                    if (Tags.HasTags(mesh)) {
                        if (Tags.MatchesQuery(mesh, "invisible")) {
                            mesh.visibility = 0;
                            mesh.showBoundingBox = false;
                            mesh.isPickable = false;
                        }
                    }
                }
            }
        }
        public makeParent(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if ((this.meshesPicked == null) || (this.meshesPicked.length === 1)) {
                return "select atleast two mesh. use \'ctl\' and mosue right click to select multiple meshes";
            }
            this.meshPicked.computeWorldMatrix(true);
            var invParentMatrix: Matrix = Matrix.Invert(this.meshPicked.getWorldMatrix());
            var m: Matrix;
            console.log("this.meshPicked quat");
            console.log(this.meshPicked.rotationQuaternion);
            console.log("this.meshPicked euler ");
            console.log(this.meshPicked.rotation);
            for (var index122 = 0; index122 < this.meshesPicked.length; index122++) {
                var mesh = this.meshesPicked[index122];
                {
                    mesh.computeWorldMatrix(true);
                    console.log("mesh quat");
                    console.log(mesh.rotationQuaternion);
                    console.log("mesh euler");
                    console.log(mesh.rotation);
                    if (mesh === this.meshPicked.parent) {
                        m = this.meshPicked.getWorldMatrix();
                        m.decompose(this.meshPicked.scaling, this.meshPicked.rotationQuaternion, this.meshPicked.position);
                        this.meshPicked.parent = null;
                    }
                    if (mesh !== this.meshPicked) {
                        console.log("transforming");
                        mesh.showBoundingBox = false;
                        m = mesh.getWorldMatrix().multiply(invParentMatrix);
                        m.decompose(mesh.scaling, mesh.rotationQuaternion, mesh.position);
                        mesh.parent = this.meshPicked;
                    }
                }
            }
            this.meshPicked.showBoundingBox = false;
            this.meshesPicked = null;
            return null;
        }

        public removeParent(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if (this.meshPicked.parent == null) {
                return "this mesh has no parent";
            }
            var m: Matrix = this.meshPicked.getWorldMatrix();
            m.decompose(this.meshPicked.scaling, this.meshPicked.rotationQuaternion, this.meshPicked.position);
            this.meshPicked.parent = null;
            return "parent removed";
        }

        public removeChildren(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            var mesh: Mesh = <Mesh>this.meshPicked;
            var children: AbstractMesh[] = <AbstractMesh[]>mesh.getChildren();
            if (children.length === 0) {
                return "this mesh has no children";
            }
            var m: Matrix;
            var i: number = 0;
            for (var index123 = 0; index123 < children.length; index123++) {
                var child = children[index123];
                {
                    m = child.getWorldMatrix();
                    m.decompose(child.scaling, child.rotationQuaternion, child.position);
                    child.parent = null;
                    i++;
                }
            }
            return i + " children removed";
        }

        public clone_mesh(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if ((this.meshPicked != null && this.meshPicked instanceof BABYLON.InstancedMesh)) {
                return ("this is an instance mesh. you cannot clone these");
            }
            var clonedMeshesPicked: Array<AbstractMesh> = new Array<AbstractMesh>();
            var clone: AbstractMesh;
            //check if multiple meshes selected. If yes clone all except the last
            if (this.meshesPicked != null) {
                for (let mesh of this.meshesPicked) {
                    if (mesh !== this.meshPicked) {
                        if (!(mesh != null && mesh instanceof BABYLON.InstancedMesh)) {
                            clone = this.clonetheMesh(mesh);
                            clonedMeshesPicked.push(clone);
                        }
                    }
                }
            }
            clone = this.clonetheMesh(this.meshPicked);
            if (this.meshesPicked != null) {
                clonedMeshesPicked.push(clone);
                this.meshesPicked = clonedMeshesPicked;
            }
            this.switchEditControl(clone);
            return null;
        }

        public clonetheMesh(mesh: AbstractMesh): AbstractMesh {
            var name: string = (<number>new Number(Date.now())).toString();
            var clone: AbstractMesh = mesh.clone(name, null, true);
            delete clone["sensors"];
            delete clone["actuators"];
            this.animateCopy(clone);
            //clone.position = mesh.position.add(new Vector3(0.1, 0.1, 0.1));
            //TODO think
            //clone.receiveShadows = true;
            mesh.showBoundingBox = false;
            (this.shadowGenerator.getShadowMap().renderList).push(clone);
            return clone;
        }
        //play a small scaling animation when cloning or instancing a mesh.
        private animateCopy(mesh: AbstractMesh): void {
            let startScale: Vector3 = new Vector3(1.5, 1.5, 1.5);
            let endScale: Vector3 = new Vector3(1, 1, 1);
            Animation.CreateAndStartAnimation('boxscale', mesh, 'scaling', 10, 2, startScale, endScale, 0);
        }

        public delete_mesh(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if (this.meshesPicked != null) {
                for (var index125 = 0; index125 < this.meshesPicked.length; index125++) {
                    var mesh = this.meshesPicked[index125];
                    {
                        if (mesh !== this.meshPicked) {
                            this.deleteTheMesh(mesh);
                        }
                    }
                }
                this.meshesPicked = null;
            }
            this.deleteTheMesh(this.meshPicked);
            this.meshPicked = null;
            this.removeEditControl();
            return null;
        }

        public deleteTheMesh(mesh: AbstractMesh) {
            SNAManager.getSNAManager().removeSNAs(mesh);
            var meshes: Array<AbstractMesh> = this.shadowGenerator.getShadowMap().renderList;
            var i: number = meshes.indexOf(mesh);
            if (i >= 0) {
                meshes.splice(i, 1);
            }
            mesh.dispose();
        }

        public mergeMeshes() {
            if (this.meshesPicked != null) {
                //TODO - check for instance meshes
                for (let mesh of this.meshesPicked){
                    if (mesh instanceof BABYLON.InstancedMesh){
                        return "some of your meshes are instance meshes. cannot merge those";
                    }
                }
                let ms: any = this.meshesPicked;
                let newMesh:Mesh = Mesh.MergeMeshes(<Mesh[]>ms, false);
                this.switchEditControl(newMesh);
                this.animateCopy(newMesh);
                
            }
            return null;
        }

        meshPickedPhyParms: PhysicsParm = null;

        private physTypes() {
            console.log("BoxImpostor " + PhysicsImpostor.BoxImpostor);
            console.log("SphereImpostor " + PhysicsImpostor.SphereImpostor);
            console.log("PlaneImpostor " + PhysicsImpostor.PlaneImpostor);
            console.log("CylinderImpostor " + PhysicsImpostor.CylinderImpostor);
            console.log("MeshImpostor " + PhysicsImpostor.MeshImpostor);
            console.log("ParticleImpostor " + PhysicsImpostor.ParticleImpostor);
            console.log("HeightmapImpostor " + PhysicsImpostor.HeightmapImpostor);
        }

        public getMeshPickedPhyParms() {
            return this.meshPickedPhyParms;
        }
        public setMeshPickedPhyParms(parms: PhysicsParm) {
            this.meshPickedPhyParms = parms;
        }

        /*
         * Checks if the selected Mesh has any lights attached
         * if yes then returns that light 
         * else return null
         */
        public getAttachedLight(): LightParm {
            var childs: Node[] = this.meshPicked.getDescendants();
            if (childs.length === 0) return null;
            var light: Light = null;
            for (let child of childs) {
                if (child instanceof Light) {
                    light = child;
                    break;
                }
            }
            if (light === null) return null;
            var lightParm = new LightParm();

            lightParm.diffuse = light.diffuse;
            lightParm.specular = light.specular;
            lightParm.range = light.range;
            lightParm.radius = light.radius;
            lightParm.intensity = light.intensity;

            if (light instanceof BABYLON.SpotLight) {
                lightParm.type = "Spot"
                lightParm.angle = light.angle;
                lightParm.exponent = light.exponent;
            }
            if (light instanceof BABYLON.PointLight) {
                lightParm.type = "Point"
            }
            if (light instanceof BABYLON.DirectionalLight) {
                lightParm.type = "Dir"
            }
            if (light instanceof BABYLON.HemisphericLight) {
                lightParm.type = "Hemi";
                lightParm.direction = light.direction;
                lightParm.gndClr = light.groundColor;
            }
            return lightParm;
        }

        public attachAlight(lightParm: LightParm) {
            this.detachLight();
            let light: Light = null;
            let name: string = this.meshPicked.name + "-light";
            if (lightParm.type === "Spot") {
                light = new BABYLON.SpotLight(name, Vector3.Zero(), new Vector3(0, -1, 0), lightParm.angle * Math.PI / 180, lightParm.exponent, this.scene);
            } else if (lightParm.type === "Point") {
                light = new BABYLON.PointLight(name, Vector3.Zero(), this.scene);
            } else if (lightParm.type === "Dir") {
                light = new BABYLON.DirectionalLight(name, new Vector3(0, -1, 0), this.scene);
            } else if (lightParm.type === "Hemi") {
                light = new BABYLON.HemisphericLight(name, lightParm.direction, this.scene);
                (<BABYLON.HemisphericLight>light).groundColor = lightParm.gndClr;
            }
            if (light !== null) {
                light.diffuse = lightParm.diffuse;
                light.specular = lightParm.specular;
                light.range = lightParm.range;
                light.radius = lightParm.radius;
                light.intensity = lightParm.intensity;
                light.parent = this.meshPicked;

            }
        }

        public detachLight() {
            var childs: Node[] = this.meshPicked.getDescendants();
            if (childs.length === 0) return;
            var light: Light = null;
            for (let child of childs) {
                if (child instanceof Light) {
                    light = child;
                    break;
                }
            }
            if (light === null) return;
            light.parent = null;
            light.dispose();
        }

        public setTransOn() {
            this.editControl.enableTranslation();
        }
        public isTransOn(): boolean {
            return this.editControl.isTranslationEnabled();
        }
        public setRotOn() {
            this.editControl.enableRotation();
        }
        public isRotOn(): boolean {
            return this.editControl.isRotationEnabled();
        }
        public setScaleOn() {
            this.editControl.enableScaling();
        }
        public isScaleOn(): boolean {
            return this.editControl.isScalingEnabled();
        }

        public setSpaceLocal(yes: boolean): string {
            if (this.snapperOn) {
                return "Cannot switch axis mode when snapper is on"
            }
            if (this.editControl != null) this.editControl.setLocal(yes);
            this.globalAxisMode = !this.globalAxisMode;
            return null;
        }

        public isSpaceLocal(): boolean {
            //if (this.editControl != null) return this.editControl.isLocal(); else return true;
            return !this.globalAxisMode;
        }

        public undo() {
            if (this.editControl != null) this.editControl.undo();
            return;
        }

        public redo() {
            if (this.editControl != null) this.editControl.redo();
            return;
        }


        public snapTrans(yes: boolean): string {
            if (this.snapperOn) {
                return "Cannot change snapping mode when snapper is on"
            }
            this.snapTransOn = yes;
            if (this.editControl != null) {
                if (!this.snapTransOn) {
                    this.editControl.setTransSnap(false);
                } else {
                    this.editControl.setTransSnap(true);
                    this.editControl.setTransSnapValue(this.snapTransValue);
                }
            }
            return;
        }
        public isSnapTransOn(): boolean {
            return this.snapTransOn;
        }

        public setSnapTransValue(val: number) {
            this.editControl.setTransSnapValue(val);
        }

        public snapRot(yes: boolean): string {
            if (this.snapperOn) {
                return "Cannot change snapping mode when snapper is on"
            }
            this.snapRotOn = yes;
            if (this.editControl != null) {
                if (!this.snapRotOn) {
                    this.editControl.setRotSnap(false);
                } else {
                    this.editControl.setRotSnap(true);
                    this.editControl.setRotSnapValue(this.snapRotValue);
                }
            }
            return;
        }

        public isSnapRotOn(): boolean {
            return this.snapRotOn;
        }
        public setSnapRotValue(val: number) {
            let inrad: number = val * Math.PI / 180;
            this.editControl.setRotSnapValue(inrad);
        }


        public snapper(yes: boolean): string {
            if (!this.globalAxisMode && yes) {
                return "Snapper can only be turned on in Global Axis Mode"
            }
            this.snapperOn = yes;
            //if edit control is already up then lets switch snaps on
            if (this.editControl != null) {
                if (this.snapperOn) {
                    this.setSnapperOn();
                } else {
                    this.setSnapperOff();
                }
            }
            return;
        }

        private setSnapperOn() {
            this.editControl.setRotSnap(true);
            this.editControl.setTransSnap(true);
            this.editControl.setRotSnapValue(this.snapRotValue);
            this.editControl.setTransSnapValue(this.snapTransValue);
            this.snapToGlobal();
        }

        private setSnapperOff() {
            this.editControl.setRotSnap(false);
            this.editControl.setTransSnap(false);
        }

        public isSnapperOn(): boolean {
            return this.snapperOn;
        }

        private snapToGlobal() {

            if (this.isMeshSelected) {
                let tx: number = Math.round(this.meshPicked.position.x / this.snapTransValue) * this.snapTransValue;
                let ty: number = Math.round(this.meshPicked.position.y / this.snapTransValue) * this.snapTransValue;
                let tz: number = Math.round(this.meshPicked.position.z / this.snapTransValue) * this.snapTransValue;
                this.meshPicked.position = new Vector3(tx, ty, tz);

                var eulerRotation: Vector3 = this.meshPicked.rotationQuaternion.toEulerAngles();
                let rx: number = Math.round(eulerRotation.x / this.snapRotValue) * this.snapRotValue;
                let ry: number = Math.round(eulerRotation.y / this.snapRotValue) * this.snapRotValue;
                let rz: number = Math.round(eulerRotation.z / this.snapRotValue) * this.snapRotValue;
                this.meshPicked.rotationQuaternion = Quaternion.RotationYawPitchRoll(ry, rx, rz);

            }

        }

        public getSoundFiles(): string[] {
            return <string[]>this.assets["sounds"];
        }

        public anyMeshSelected(): boolean {
            return this.isMeshSelected;
        }

        public getName(): string {
            return this.meshPicked.name;
        }

        public setName(name: string) {
            this.meshPicked.name = name;
        }

        public getLocation(): Vector3 {
            return this.meshPicked.position;
        }

        public getRotation(): Vector3 {
            var euler: Vector3 = this.meshPicked.rotationQuaternion.toEulerAngles();
            var r: number = 180 / Math.PI;
            var degrees: Vector3 = euler.multiplyByFloats(r, r, r);
            return degrees;
        }

        public getScale(): Vector3 {
            return this.meshPicked.scaling;
        }

        public getSkelName(): string {
            if (this.meshPicked.skeleton == null) return null; else return this.meshPicked.skeleton.name;
        }

        public getSkeleton(): Skeleton {
            if (this.meshPicked.skeleton == null) return null; else return this.meshPicked.skeleton;
        }

        public createAnimRange(name: string, start: number, end: number) {
            this.meshPicked.skeleton.createAnimationRange(name, start, end);
        }
        public getAnimationRanges(): AnimationRange[] {
            var skel: Skeleton = this.meshPicked.skeleton;
            //            var getAnimationRanges: Function = <Function>skel["getAnimationRanges"];
            //            var ranges: AnimationRange[] = <AnimationRange[]>getAnimationRanges.call(skel);
            if (skel !== null) {
                var ranges: AnimationRange[] = skel.getAnimationRanges()
                return ranges;
            } else return null;
        }

        public printAnimCount(skel: Skeleton) {
            var bones: Bone[] = skel.bones;
            for (var index126 = 0; index126 < bones.length; index126++) {
                var bone = bones[index126];
                {
                    console.log(bone.name + "," + bone.animations.length + " , " + bone.animations[0].getHighestFrame());
                    console.log(bone.animations[0]);
                }
            }
        }

        public playAnimation(animName: string, animRate: string, loop: boolean) {

            var skel: Skeleton = this.meshPicked.skeleton;
            if (skel == null) return;
            var r: number = parseFloat(animRate);
            if (isNaN(r)) r = 1;
            skel.beginAnimation(animName, loop, r);
        }

        public stopAnimation() {
            if (this.meshPicked.skeleton == null) return;
            this.scene.stopAnimation(this.meshPicked.skeleton);
        }

        public getSensorList(): string[] {
            return SNAManager.getSNAManager().getSensorList();
        }

        public getActuatorList(): string[] {
            return SNAManager.getSNAManager().getActuatorList();
        }

        public getSensorParms(sensor: string): Object {
            return SNAManager.getSNAManager().getSensorParms(sensor);
        }

        public getActuatorParms(actuator: string): Object {
            return SNAManager.getSNAManager().getActuatorParms(actuator);
        }

        public getSensors(): Array<SensorActuator> {
            if (!this.isMeshSelected) {
                return null;
            }
            var sens: Array<SensorActuator> = <Array<SensorActuator>>this.meshPicked["sensors"];
            if (sens == null) sens = new Array<SensorActuator>();
            return sens;
        }

        public getActuators(): Array<SensorActuator> {
            if (!this.isMeshSelected) {
                return null;
            }
            var acts: Array<SensorActuator> = <Array<SensorActuator>>this.meshPicked["actuators"];
            if (acts == null) acts = new Array<SensorActuator>();
            return acts;
        }

        public addSensorbyName(sensName: string): Sensor {
            if (!this.isMeshSelected) {
                return null;
            }
            return SNAManager.getSNAManager().createSensorByName(sensName, <Mesh>this.meshPicked, null);
        }

        public addActuaorByName(actName: string): Actuator {
            if (!this.isMeshSelected) {
                return null;
            }
            return SNAManager.getSNAManager().createActuatorByName(actName, <Mesh>this.meshPicked, null);
        }

        public add_sensor(sensName: string, prop: SNAproperties): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if (sensName === "Touch") {
                var st: SensorTouch = new SensorTouch(<Mesh>this.meshPicked, prop);
            } else return "No such sensor";
            return null;
        }

        public addActuator(actName: string, parms: SNAproperties): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            var act: Actuator;
            if (actName === "Rotator") {
                act = new ActuatorRotator(<Mesh>this.meshPicked, <ActRotatorParm>parms);
            } else if (actName === "Mover") {
                act = new ActuatorMover(<Mesh>this.meshPicked, <ActMoverParm>parms);
            } else return "No such actuator";
            return null;
        }

        public removeSensor(index: number): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            var sensors: Array<Sensor> = <Array<Sensor>>this.meshPicked["sensors"];
            if (sensors != null) {
                var sens: Sensor = sensors[index];
                if (sens != null) {
                    sens.dispose();
                } else return "no sensor found";
            } else return "no sensor found";
            return null;
        }

        public removeActuator(index: number): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            var actuators: Array<Actuator> = <Array<Actuator>>this.meshPicked["actuators"];
            if (actuators != null) {
                var act: Actuator = actuators[index];
                if (act != null) {
                    act.dispose();
                } else return "no actuator found";
            } else return "no actuator found";
            return null;
        }

        public removeSensorActuator(sa: SensorActuator) {
            sa.dispose();
        }

        public setSunPos(d: number) {
            var r: number = Math.PI * (180 - d) / 180;
            var x: number = -Math.cos(r);
            var y: number = -Math.sin(r);
            this.sunDR.direction = new Vector3(x, y, 0);
        }

        public getSunPos(): number {
            var sunDir: Vector3 = this.sunDR.direction;
            var x: number = sunDir.x;
            var y: number = sunDir.y;
            var l: number = Math.sqrt(x * x + y * y);
            var d: number = Math.acos(x / l);
            return d * 180 / Math.PI;
        }

        public setLight(d: number) {
            this.sun.intensity = d;
            this.sunDR.intensity = d;
        }

        public getLight(): number {
            return this.sun.intensity;
        }

        public setShade(dO: any) {
            var d: number = <number>dO;
            d = 1 - d;
            this.sun.groundColor = new Color3(d, d, d);
        }

        public getShade(): number {
            return (1 - this.sun.groundColor.r);
        }

        public setFog(d: any) {
            this.scene.fogDensity = <number>d;
        }

        public getFog(): number {
            return this.scene.fogDensity;
        }

        public setFov(dO: any) {
            var d: number = <number>dO;
            this.mainCamera.fov = (d * 3.14 / 180);
        }

        public getFov(): number {
            return this.mainCamera.fov * 180 / 3.14;
        }

        public setSky(sky: any) {
            var mat: StandardMaterial = <StandardMaterial>this.skybox.material;
            mat.reflectionTexture.dispose();
            var skyFile: string = "vishva/assets/skyboxes/" + sky + "/" + sky;
            mat.reflectionTexture = new CubeTexture(skyFile, this.scene);
            mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        }

        public getSky(): string {
            var mat: StandardMaterial = <StandardMaterial>this.skybox.material;
            var skyname: string = mat.reflectionTexture.name;
            var i: number = skyname.lastIndexOf("/");
            return skyname.substring(i + 1);
        }

        public setGroundColor(gcolor: any) {
            var ground_color: number[] = <number[]>gcolor;
            var r: number = ground_color[0] / 255;
            var g: number = ground_color[1] / 255;
            var b: number = ground_color[2] / 255;
            var color: Color3 = new Color3(r, g, b);
            var gmat: StandardMaterial = <StandardMaterial>this.ground.material;
            gmat.diffuseColor = color;
        }

        public getGroundColor(): number[] {
            var ground_color: number[] = new Array(3);
            var gmat: StandardMaterial = <StandardMaterial>this.ground.material;
            if (gmat.diffuseColor != null) {
                ground_color[0] = (gmat.diffuseColor.r * 255);
                ground_color[1] = (gmat.diffuseColor.g * 255);
                ground_color[2] = (gmat.diffuseColor.b * 255);
                return ground_color;
            } else {
                return null;
            }
        }
        debugVisible: boolean = false;
        public toggleDebug() {
            //if (this.scene.debugLayer.isVisible()) {
            if (this.debugVisible) {
                console.log("hiding debug");
                this.scene.debugLayer.hide();
            } else {
                console.log("showing debug");
                this.scene.debugLayer.show();
            }
            this.debugVisible = !this.debugVisible;

        }

        public saveAsset(): string {
            if (!this.isMeshSelected) {
                return null;
            }
            //this.renameWorldTextures();
            var clone: Mesh = <Mesh>this.meshPicked.clone(this.meshPicked.name, null);
            clone.position = Vector3.Zero();
            clone.rotation = Vector3.Zero();
            var meshObj: any = SceneSerializer.SerializeMesh(clone, false);
            clone.dispose();
            var meshString: string = JSON.stringify(meshObj);
            var file: File = new File([meshString], "AssetFile.babylon");
            return URL.createObjectURL(file);
        }

        public saveWorld(): string {

            if (this.editControl != null) {
                alert("cannot save during edit");
                return null;
            }

            this.removeInstancesFromShadow();
            this.renameMeshIds();
            this.cleanupSkels();
            this.resetSkels(this.scene);
            this.cleanupMats();
            this.renameWorldTextures();

            let vishvaSerialzed = new VishvaSerialized();
            vishvaSerialzed.settings.cameraCollision = this.cameraCollision;
            vishvaSerialzed.settings.autoEditMenu = this.autoEditMenu;
            vishvaSerialzed.misc.activeCameraTarget = this.mainCamera.target;
            //serialize sna first
            //we might add tags to meshes in scene during sna serialize.
            //if we serialize scene before we would miss those
            //var snaObj: Object = SNAManager.getSNAManager().serializeSnAs(this.scene);
            vishvaSerialzed.snas = <SNAserialized[]>SNAManager.getSNAManager().serializeSnAs(this.scene);

            var sceneObj: Object = <Object>SceneSerializer.Serialize(this.scene);
            this.changeSoundUrl(sceneObj);

            //sceneObj["VishvaSNA"] = snaObj;
            sceneObj["VishvaSerialized"] = vishvaSerialzed;

            var sceneString: string = JSON.stringify(sceneObj);
            var file: File = new File([sceneString], "WorldFile.babylon");
            this.addInstancesToShadow();
            return URL.createObjectURL(file);
        }

        private removeInstancesFromShadow() {
            var meshes: AbstractMesh[] = this.scene.meshes;
            for (var index127 = 0; index127 < meshes.length; index127++) {
                var mesh = meshes[index127];
                {
                    if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                        var shadowMeshes: Array<AbstractMesh> = this.shadowGenerator.getShadowMap().renderList;
                        var i: number = shadowMeshes.indexOf(mesh);
                        if (i >= 0) {
                            shadowMeshes.splice(i, 1);
                        }
                    }
                }
            }
        }

        private addInstancesToShadow() {
            for (var index128 = 0; index128 < this.scene.meshes.length; index128++) {
                var mesh = this.scene.meshes[index128];
                {
                    if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                        //TODO think
                        //mesh.receiveShadows = true;
                        (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                    }
                }
            }
        }

        /**
         * 
         * assign unique id to each mesh. serialization uses mesh id to add mesh to
         * the shadowgenerator renderlist if two or more mesh have same id then
         * during desrialization only one mesh gets added to the renderlist
         * 
         */
        private renameMeshIds() {
            var i: number = 0;
            for (var index129 = 0; index129 < this.scene.meshes.length; index129++) {
                var mesh = this.scene.meshes[index129];
                {
                    mesh.id = (<number>new Number(i)).toString();
                    i++;
                }
            }
        }

        /**
         * resets each skel a assign. unique id to each skeleton. deserialization uses
         * skeleton id to associate skel with mesh. if id isn't unique wrong skels
         * could get assigned to a mesh.
         * 
         * @param scene
         */
        private resetSkels(scene: Scene) {
            var i: number = 0;
            for (var index130 = 0; index130 < scene.skeletons.length; index130++) {
                var skel = scene.skeletons[index130];
                {
                    skel.id = (<number>new Number(i)).toString();
                    i++;
                    skel.returnToRest();
                }
            }
        }

        private renameWorldTextures() {
            var mats: Material[] = this.scene.materials;
            this.renameWorldMaterials(mats);
            var mms: MultiMaterial[] = this.scene.multiMaterials;
            for (var index131 = 0; index131 < mms.length; index131++) {
                var mm = mms[index131];
                {
                    this.renameWorldMaterials(mm.subMaterials);
                }
            }
        }

        private renameWorldMaterials(mats: Material[]) {
            var sm: StandardMaterial;
            for (var index132 = 0; index132 < mats.length; index132++) {
                var mat = mats[index132];
                {
                    if (mat != null && mat instanceof BABYLON.StandardMaterial) {
                        sm = <StandardMaterial>mat;
                        this.rename(sm.diffuseTexture);
                        this.rename(sm.reflectionTexture);
                        this.rename(sm.opacityTexture);
                        this.rename(sm.specularTexture);
                        this.rename(sm.bumpTexture);
                    }
                }
            }
        }

        public rename(bt: BaseTexture) {
            if (bt == null) return;
            if (bt.name.substring(0, 2) !== "..") {
                bt.name = this.RELATIVE_ASSET_LOCATION + bt.name;
            }
        }
        /*
         * since 2.5, June 17 2016  sound is being serialized.
         * 
         * (see src/Audio/babylon.sound.js
         * changes at
         * https://github.com/BabylonJS/Babylon.js/commit/6ba058aec5ffaceb8aef3abecdb95df4b95ac2ac)
         * 
         * the url property only has the file name not path.
         * we need to add the full path
         * 
         */
        public changeSoundUrl(sceneObj: Object) {
            var sounds = sceneObj["sounds"];
            if (sounds != null) {
                var soundList: [Object] = sounds;
                for (let sound of soundList) {
                    sound["url"] = this.RELATIVE_ASSET_LOCATION + this.SOUND_ASSET_LOCATION + sound["url"];
                }
                //sceneObj["sounds"] = soundList;
            }
        }

        /**
         * remove all materials not referenced by any mesh
         * 
         */
        private cleanupMats() {
            var meshes: AbstractMesh[] = this.scene.meshes;
            var mats: Array<Material> = new Array<Material>();
            var mms: Array<MultiMaterial> = new Array<MultiMaterial>();
            for (var index133 = 0; index133 < meshes.length; index133++) {
                var mesh = meshes[index133];
                {
                    if (mesh.material != null) {
                        if (mesh.material != null && mesh.material instanceof BABYLON.MultiMaterial) {
                            var mm: MultiMaterial = <MultiMaterial>mesh.material;
                            mms.push(mm);
                            var ms: Material[] = mm.subMaterials;
                            for (var index134 = 0; index134 < ms.length; index134++) {
                                var mat = ms[index134];
                                {
                                    mats.push(mat);
                                }
                            }
                        } else {
                            mats.push(mesh.material);
                        }
                    }
                }
            }
            var allMats: Material[] = this.scene.materials;
            var l: number = allMats.length;
            for (var i: number = l - 1; i >= 0; i--) {
                if (mats.indexOf(allMats[(<number>i | 0)]) === -1) {
                    allMats[(<number>i | 0)].dispose();
                }
            }
            var allMms: MultiMaterial[] = this.scene.multiMaterials;
            l = allMms.length;
            for (var i: number = l - 1; i >= 0; i--) {
                if (mms.indexOf(allMms[(<number>i | 0)]) === -1) {
                    allMms[(<number>i | 0)].dispose();
                }
            }
        }

        /**
         * remove all skeletons not referenced by any mesh
         * 
         */
        private cleanupSkels() {
            var meshes: AbstractMesh[] = this.scene.meshes;
            var skels: Array<Skeleton> = new Array<Skeleton>();
            for (var index135 = 0; index135 < meshes.length; index135++) {
                var mesh = meshes[index135];
                {
                    if (mesh.skeleton != null) {
                        skels.push(mesh.skeleton);
                    }
                }
            }
            var allSkels: Skeleton[] = this.scene.skeletons;
            var l: number = allSkels.length;
            for (var i: number = l - 1; i >= 0; i--) {
                if (skels.indexOf(allSkels[(<number>i | 0)]) === -1) {
                    allSkels[(<number>i | 0)].dispose();
                }
            }
        }

        public loadAssetFile(file: File) {
            var sceneFolderName: string = file.name.split(".")[0];
            SceneLoader.ImportMesh("", "vishva/assets/" + sceneFolderName + "/", file.name, this.scene, (meshes, particleSystems, skeletons) => { return this.onMeshLoaded(meshes, particleSystems, skeletons) });
        }

        assetType: string;

        file: string;

        public loadAsset(assetType: string, file: string) {
            this.assetType = assetType;
            this.file = file;
            SceneLoader.ImportMesh("", "vishva/assets/" + assetType + "/" + file + "/", file + ".babylon", this.scene, (meshes, particleSystems, skeletons) => { return this.onMeshLoaded(meshes, particleSystems, skeletons) });
        }

        private onMeshLoaded(meshes: AbstractMesh[], particleSystems: ParticleSystem[], skeletons: Skeleton[]) {
            var boundingRadius: number = this.getBoundingRadius(meshes);
            {
                var array137 = <Mesh[]>meshes;
                for (var index136 = 0; index136 < array137.length; index136++) {
                    var mesh = array137[index136];
                    {
                        mesh.isPickable = true;
                        mesh.checkCollisions = true;
                        var placementLocal: Vector3 = new Vector3(0, 0, -(boundingRadius + 2));
                        var placementGlobal: Vector3 = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
                        mesh.position.addInPlace(placementGlobal);
                        (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                        //TODO think
                        //mesh.receiveShadows = true;
                        if (mesh.material != null && mesh.material instanceof BABYLON.MultiMaterial) {
                            var mm: MultiMaterial = <MultiMaterial>mesh.material;
                            var mats: Material[] = mm.subMaterials;
                            for (var index138 = 0; index138 < mats.length; index138++) {
                                var mat = mats[index138];
                                {
                                    mesh.material.backFaceCulling = false;
                                    mesh.material.alpha = 1;
                                    if (mat != null && mat instanceof BABYLON.StandardMaterial) {
                                        this.renameAssetTextures(<StandardMaterial>mat);
                                    }
                                }
                            }
                        } else {
                            mesh.material.backFaceCulling = false;
                            mesh.material.alpha = 1;
                            var sm: StandardMaterial = <StandardMaterial>mesh.material;
                            this.renameAssetTextures(sm);
                        }
                        if (mesh.skeleton != null) {
                            this.fixAnimationRanges(mesh.skeleton);
                        }
                    }
                }
            }
        }

        private renameAssetTextures(sm: StandardMaterial) {
            this.renameAssetTexture(sm.diffuseTexture);
            this.renameAssetTexture(sm.reflectionTexture);
            this.renameAssetTexture(sm.opacityTexture);
            this.renameAssetTexture(sm.specularTexture);
            this.renameAssetTexture(sm.bumpTexture);
        }

        public renameAssetTexture(bt: BaseTexture) {
            if (bt == null) return;
            var textureName: string = bt.name;
            if (textureName.indexOf("vishva/") !== 0 && textureName.indexOf("../") !== 0) {
                bt.name = "vishva/assets/" + this.assetType + "/" + this.file + "/" + textureName;
            }
        }

        /**
         * finds the bounding sphere radius for a set of meshes. for each mesh gets
         * bounding radius from the local center. this is the bounding world radius
         * for that mesh plus the distance from the local center. takes the maximum
         * of these
         * 
         * @param meshes
         * @return
         */
        private getBoundingRadius(meshes: AbstractMesh[]): number {
            var maxRadius: number = 0;
            for (var index139 = 0; index139 < meshes.length; index139++) {
                var mesh = meshes[index139];
                {
                    var bi: BoundingInfo = mesh.getBoundingInfo();
                    var r: number = bi.boundingSphere.radiusWorld + mesh.position.length();
                    if (maxRadius < r) maxRadius = r;
                }
            }
            return maxRadius;
        }

        private loadWorldFile(file: File) {
            this.sceneFolderName = file.name.split(".")[0];
            var fr: FileReader = new FileReader();
            fr.onload = (e) => { return this.onSceneFileRead(e) };
            fr.readAsText(file);
        }

        private onSceneFileRead(e: Event): any {
            this.sceneData = "data:" + <string>(<FileReader>e.target).result;
            this.engine.stopRenderLoop();
            this.scene.onDispose = () => { return this.onSceneDispose() };
            this.scene.dispose();
            return null;
        }

        sceneFolderName: string;

        sceneData: string;

        private onSceneDispose() {
            this.scene = null;
            this.avatarSkeleton = null;
            this.avatar = null;
            this.prevAnim = null;
            SceneLoader.Load("worlds/" + this.sceneFolderName + "/", this.sceneData, this.engine, (scene) => { return this.onSceneLoaded(scene) });
        }

        shadowGenerator: ShadowGenerator;


        public createWater() {
            var waterMesh: Mesh = Mesh.CreateGround("waterMesh", 512, 512, 32, this.scene, false);
            //waterMesh.position.y = 0;
            var water: WaterMaterial = new WaterMaterial("water", this.scene);
            water.bumpTexture = new Texture(this.waterTexture, this.scene);
            //repoint the path, so that we can reload this if it is saved in scene 
            water.bumpTexture.name = this.RELATIVE_ASSET_LOCATION + water.bumpTexture.name;
            //wavy
            //            water.windForce = -5;
            //            water.waveHeight = 0.5;
            //            water.waterColor = new Color3(0.1, 0.1, 0.6);
            //            water.colorBlendFactor = 0;
            //            water.bumpHeight = 0.1;
            //            water.waveLength = 0.1;


            //calm
            water.windForce = -5;
            water.waveHeight = 0.02;
            water.bumpHeight = 0.05;
            water.waterColor = new Color3(0.047, 0.23, 0.015);
            water.colorBlendFactor = 0.5;
            water.addToRenderList(this.skybox);
            water.addToRenderList(this.ground);


            waterMesh.material = water;
        }

        public addWater() {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            var water: WaterMaterial = new WaterMaterial("water", this.scene);
            water.bumpTexture = new Texture(this.waterTexture, this.scene);
            water.windForce = -5;
            water.waveHeight = 0.5;
            water.waterColor = new Color3(0.1, 0.1, 0.6);
            water.colorBlendFactor = 0;
            water.bumpHeight = 0.1;
            water.waveLength = 0.1;
            water.addToRenderList(this.skybox);
            this.meshPicked.material = water;
        }

        public switch_avatar(): string {
            if (!this.isMeshSelected) {
                return "no mesh selected";
            }
            if (this.isAvatar(<Mesh>this.meshPicked)) {
                SNAManager.getSNAManager().enableSnAs(this.avatar);
                this.avatar.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.avatar.rotation.y, this.avatar.rotation.x, this.avatar.rotation.z);
                this.avatar.isPickable = true;
                Tags.RemoveTagsFrom(this.avatar, "Vishva.avatar");
                if (this.avatarSkeleton != null) {
                    Tags.RemoveTagsFrom(this.avatarSkeleton, "Vishva.skeleton");
                    this.avatarSkeleton.name = "";
                }
                this.avatar = <Mesh>this.meshPicked;
                this.avatarSkeleton = this.avatar.skeleton;
                Tags.AddTagsTo(this.avatar, "Vishva.avatar");
                if (this.avatarSkeleton != null) {
                    Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
                    this.avatarSkeleton.name = "Vishva.skeleton";
                    this.checkAnimRange(this.avatarSkeleton);
                    this.avatarSkeleton.enableBlending(0.1);
                }
                this.avatar.checkCollisions = true;
                this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                this.avatar.isPickable = false;
                this.avatar.rotation = this.avatar.rotationQuaternion.toEulerAngles();
                this.avatar.rotationQuaternion = null;
                this.saveAVcameraPos = this.mainCamera.position;
                this.focusOnAv = false;
                this.removeEditControl();
                SNAManager.getSNAManager().disableSnAs(<Mesh>this.avatar);
            } else {
                return "cannot use this as avatar";
            }
            return null;
        }

        private isAvatar(mesh: Mesh): boolean {
            if (mesh.skeleton == null) {
                return false;
            }
            return true;
        }

        /**
         * check how many of standard avatar animations are present in this skeleton
         * 
         * @param skel
         */
        private checkAnimRange(skel: Skeleton) {
            for (var index146 = 0; index146 < this.anims.length; index146++) {
                var anim = this.anims[index146];
                {
                    if (skel.getAnimationRange(anim.name) != null) {
                        anim.exist = true;
                    } else {
                        anim.exist = false;
                    }
                }
            }
        }

        private setAvatar(avName: string, meshes: AbstractMesh[]) {
            var mesh: Mesh;
            for (var index147 = 0; index147 < meshes.length; index147++) {
                var amesh = meshes[index147];
                {
                    mesh = <Mesh>amesh;
                    if ((mesh.id === avName)) {
                        var saveRotation: Vector3;
                        var savePosition: Vector3;
                        if (this.avatar != null) {
                            saveRotation = this.avatar.rotation;
                            savePosition = this.avatar.position;
                        } else {
                            saveRotation = new Vector3(0, Math.PI, 0);
                            savePosition = new Vector3(0, 0, 0);
                        }
                        this.avatar = mesh;
                        this.avatar.rotation = saveRotation;
                        this.avatar.position = savePosition;
                        this.avatar.visibility = 1;
                        this.avatar.skeleton = this.avatarSkeleton;
                        this.avatar.checkCollisions = true;
                        this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                        this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                        this.avatar.isPickable = false;
                    } else {
                        mesh.skeleton = null;
                        mesh.visibility = 0;
                        mesh.checkCollisions = false;
                    }
                }
            }
        }



        private createGround(scene: Scene): Mesh {
            var groundMaterial: StandardMaterial = new StandardMaterial("groundMat", scene);
            groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
            (<Texture>groundMaterial.diffuseTexture).uScale = 6.0;
            (<Texture>groundMaterial.diffuseTexture).vScale = 6.0;
            groundMaterial.diffuseColor = new Color3(0.9, 0.6, 0.4);
            groundMaterial.specularColor = new Color3(0, 0, 0);
            var grnd: Mesh = Mesh.CreateGround("ground", 256, 256, 1, scene);
            grnd.material = groundMaterial;
            grnd.checkCollisions = true;
            grnd.isPickable = false;
            Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
            grnd.freezeWorldMatrix();
            grnd.receiveShadows = true;
            return grnd;
        }

        private createSkyBox(scene: Scene): Mesh {
            var skybox: Mesh = Mesh.CreateBox("skyBox", 1000.0, scene);
            var skyboxMaterial: StandardMaterial = new StandardMaterial("skyBox", scene);
            skyboxMaterial.backFaceCulling = false;
            skybox.material = skyboxMaterial;
            skybox.infiniteDistance = true;
            skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
            skyboxMaterial.specularColor = new Color3(0, 0, 0);
            skyboxMaterial.reflectionTexture = new CubeTexture(this.skyboxTextures, scene);
            skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
            skybox.renderingGroupId = 0;
            skybox.isPickable = false;
            Tags.AddTagsTo(skybox, "Vishva.sky Vishva.internal");
            return skybox;
        }


        public toggleSnow() {
            console.log("creating snow");
            if (this.snowPart === null) {
                this.snowPart = this.createSnowPart();
            }
            if (this.snowing) {
                this.snowPart.stop();
            } else {
                this.snowPart.start();
                if (this.raining) {
                    this.rainPart.stop();
                    this.raining = false;
                }
            }
            this.snowing = !this.snowing;
        }

        /**
         * create a snow particle system
         */
        private createSnowPart(): ParticleSystem {
            let part = new ParticleSystem("snow", 1000, this.scene);
            part.particleTexture = new BABYLON.Texture(this.snowTexture, this.scene);
            part.emitter = new Vector3(0, 10, 0);
            part.maxEmitBox = new Vector3(100, 10, 100);
            part.minEmitBox = new Vector3(-100, 10, -100);

            part.emitRate = 1000;
            part.updateSpeed = 0.005;
            part.minLifeTime = 1;
            part.maxLifeTime = 5;
            part.minSize = 0.1;
            part.maxSize = 0.5;
            part.color1 = new BABYLON.Color4(1, 1, 1, 1);
            part.color2 = new BABYLON.Color4(1, 1, 1, 1);
            part.colorDead = new BABYLON.Color4(0, 0, 0, 0);
            //part.blendMode = ParticleSystem.BLENDMODE_STANDARD;
            part.gravity = new BABYLON.Vector3(0, -9.81, 0);
            return part;

        }

        public toggleRain() {
            console.log("creating rain");
            if (this.rainPart === null) {
                this.rainPart = this.createRainPart();
            }
            if (this.raining) {
                this.rainPart.stop();
            } else {
                this.rainPart.start();
                if (this.snowing) {
                    this.snowPart.stop();
                    this.snowing = false;
                }
            }
            this.raining = !this.raining;
        }

        /**
         * create a snow particle system
         */
        private createRainPart(): ParticleSystem {
            let part = new ParticleSystem("rain", 4000, this.scene);
            part.particleTexture = new BABYLON.Texture(this.rainTexture, this.scene);
            part.emitter = new Vector3(0, 40, 0);
            part.maxEmitBox = new Vector3(100, 40, 100);
            part.minEmitBox = new Vector3(-100, 40, -100);
            part.emitRate = 1000;
            part.updateSpeed = 0.02;
            part.minLifeTime = 5;
            part.maxLifeTime = 10;
            part.minSize = 0.1;
            part.maxSize = 0.8;
            part.color1 = new BABYLON.Color4(1, 1, 1, 0.5);
            part.color2 = new BABYLON.Color4(0, 0, 1, 1);
            part.colorDead = new BABYLON.Color4(0, 0, 0, 0);
            //part.blendMode = ParticleSystem.BLENDMODE_STANDARD;
            part.gravity = new BABYLON.Vector3(0, -9.81, 0);

            return part;

        }
        private createCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
            var camera: ArcRotateCamera = new ArcRotateCamera("v.c-camera", 1, 1.4, 4, new Vector3(0, 0, 0), scene);
            this.setCameraSettings(camera);
            camera.attachControl(canvas, true);
            if ((this.avatar !== null) && (this.avatar !== undefined)) {
                camera.target = new Vector3(this.avatar.position.x, this.avatar.position.y + 1.5, this.avatar.position.z);
                camera.alpha = -this.avatar.rotation.y - 4.69;
            } else {
                camera.target = Vector3.Zero();
            }
            camera.checkCollisions = this.cameraCollision;
            camera.collisionRadius = new Vector3(0.5, 0.5, 0.5);

            Tags.AddTagsTo(camera, "Vishva.camera");
            return camera;
        }

        private loadAvatar() {
            SceneLoader.ImportMesh("", this.avatarFolder, this.avatarFile, this.scene, (meshes, particleSystems, skeletons) => { return this.onAvatarLoaded(meshes, particleSystems, skeletons) });
        }

        private onAvatarLoaded(meshes: AbstractMesh[], particleSystems: ParticleSystem[], skeletons: Skeleton[]) {
            this.avatar = <Mesh>meshes[0];
            (this.shadowGenerator.getShadowMap().renderList).push(this.avatar);
            //TODO
            //this.avatar.receiveShadows = true;
            var l: number = meshes.length;
            for (var i: number = 1; i < l; i++) {
                meshes[i].checkCollisions = false;
                meshes[i].dispose();
            }
            this.avatarSkeleton = skeletons[0];
            l = skeletons.length;
            for (var i: number = 1; i < l; i++) {
                skeletons[i].dispose();
            }
            this.fixAnimationRanges(this.avatarSkeleton);
            this.avatar.skeleton = this.avatarSkeleton;
            this.checkAnimRange(this.avatarSkeleton);
            this.avatarSkeleton.enableBlending(0.1);
            //this.avatar.rotation.y = Math.PI;
            this.avatar.position = new Vector3(0, 0, 0);
            this.avatar.checkCollisions = true;
            this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
            this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
            this.avatar.isPickable = false;
            Tags.AddTagsTo(this.avatar, "Vishva.avatar");
            Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
            this.avatarSkeleton.name = "Vishva.skeleton";

            this.mainCamera.alpha = -this.avatar.rotation.y - 4.69;
            this.mainCamera.target = new Vector3(this.avatar.position.x, this.avatar.position.y + 1.5, this.avatar.position.z);
            var sm: StandardMaterial = <StandardMaterial>this.avatar.material;
            if (sm.diffuseTexture != null) {
                var textureName: string = sm.diffuseTexture.name;
                sm.diffuseTexture.name = this.avatarFolder + textureName;
            }
        }

        private setAnimationRange(skel: Skeleton) {
            for (var index149 = 0; index149 < this.anims.length; index149++) {
                var anim = this.anims[index149];
                {
                    skel.createAnimationRange(anim.name, anim.s, anim.e);
                }
            }
        }

        /**
         * workaround for bug in blender exporter 4.4.3 animation ranges are off by
         * 1 4.4.4 issue with actions with just 2 frames -> from = to
         * 
         * @param skel
         */
        private fixAnimationRanges(skel: Skeleton) {
            var getAnimationRanges: Function = <Function>skel["getAnimationRanges"];
            var ranges: AnimationRange[] = <AnimationRange[]>getAnimationRanges.call(skel);
            for (var index150 = 0; index150 < ranges.length; index150++) {
                var range = ranges[index150];
                {
                    if (range.from === range.to) {
                        range.to++;
                    }
                }
            }
        }

        private setCameraSettings(camera: ArcRotateCamera) {
            camera.lowerRadiusLimit = 0.25;
            camera.keysLeft = [];
            camera.keysRight = [];
            camera.keysUp = [];
            camera.keysDown = [];
            camera.panningSensibility = 10;
            camera.inertia = 0.1;
            camera.angularSensibilityX = 250;
            camera.angularSensibilityY = 250;
        }

        private backfaceCulling(mat: Material[]) {
            var index: number;
            for (index = 0; index < mat.length; ++index) {
                mat[index].backFaceCulling = false;
            }
        }

        public disableKeys() {
            this.keysDisabled = true;
        }
        public enableKeys() {
            this.keysDisabled = false;
        }

        public enableCameraCollision(yesNo: boolean) {
            this.cameraCollision = yesNo;
            this.mainCamera.checkCollisions = yesNo;
        }

        public isCameraCollisionOn(): boolean {
            return this.cameraCollision;
        }

        public enableAutoEditMenu(yesNo: boolean) {
            this.autoEditMenu = yesNo;
        }

        public isAutoEditMenuOn(): boolean {
            return this.autoEditMenu;
        }

    }

    export class Key {
        public up: boolean;

        public down: boolean;

        public right: boolean;

        public left: boolean;

        public stepRight: boolean;

        public stepLeft: boolean;

        public jump: boolean;

        public shift: boolean;

        public trans: boolean;

        public rot: boolean;

        public scale: boolean;

        public esc: boolean;

        public ctl: boolean;

        public focus: boolean;

        constructor() {
            this.up = false;
            this.down = false;
            this.right = false;
            this.left = false;
            this.stepRight = false;
            this.stepLeft = false;
            this.jump = false;
            this.shift = false;
            this.trans = false;
            this.rot = false;
            this.scale = false;
            this.esc = false;
            this.ctl = false;
            this.focus = false;
        }
    }

    export class AnimData {
        public name: string;

        public s: number;

        public e: number;

        public r: number;

        public exist: boolean = false;

        public constructor(name: string, s: number, e: number, d: number) {
            this.s = 0;
            this.e = 0;
            this.r = 0;
            this.name = name;
            this.s = s;
            this.e = e;
            this.r = d;
        }
    }
    /*
     * will be used to store a meshes, usually mesh picked for edit,
     * physics parms if physics is enabled for it
     */
    export class PhysicsParm {
        public type: number;
        public mass: number;
        public restitution: number;
        public friction: number;
    }

    export class LightParm {
        public type: string = "Spot";
        public diffuse: Color3 = Color3.White();;
        public specular: Color3 = Color3.White();;
        public intensity: number = 1;
        public range: number = 5;
        public radius: number = 5;
        public angle: number = 45;
        public exponent: number = 1;
        public gndClr: Color3 = Color3.White();
        public direction: Vector3 = Vector3.Zero();




    }

}

