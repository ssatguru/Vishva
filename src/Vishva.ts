
/* global variables from script files loaded during startup */
declare var userAssets: Array<any>;
declare var internalAssets: Array<any>;
// TODO Below applies to all curated item.
// should provide for mutiple curated config files, one in each of the "top folder" of curated items
declare var curatedConfig: Object;


import { EditControl } from "babylonjs-editcontrol";
import { ActionMap, CharacterController } from "babylonjs-charactercontroller";
import { UniCamController } from "./CameraController";
import {
    AbstractMesh,
    Animation,
    AnimationRange,
    ArcRotateCamera,
    AssetsManager,
    BaseTexture,
    Bone,
    BoundingInfo,
    Color3,
    Color4,
    CubeTexture,
    CSG,
    DirectionalLight,
    //DynamicTerrain,
    Engine,
    GroundMesh,
    HemisphericLight,
    IShadowLight,
    InstancedMesh,
    Light,
    Material,
    Matrix,
    Mesh,
    MeshBuilder,
    MultiMaterial,
    Node,
    OimoJSPlugin,
    ParticleSystem,
    PBRMetallicRoughnessMaterial,
    PhysicsImpostor,
    PickingInfo,
    Quaternion,
    Scene,
    SceneLoader,
    SceneSerializer,
    ShadowGenerator,
    Skeleton,
    SkeletonViewer,
    SolidParticleSystem,
    SolidParticle,
    StandardMaterial,
    Tags,
    TextFileAssetTask,
    Texture,
    Tools,
    Vector3,
    //WaterMaterial,
    IParticleSystem,
    TargetCamera,
    ImageProcessingConfigurationDefines,
    SpotLight,
    PointLight,
    VertexBuffer,
    PBRMaterial,
    TransformNode,
    StereoscopicArcRotateCamera,
    AnimationGroup,
    AssetContainer
} from "babylonjs";
import WaterMaterial = BABYLON.WaterMaterial;
import DynamicTerrain = BABYLON.DynamicTerrain;

import { GrndSpread, GrndSpread_Serializeable } from "./GrndSpread";
import { SpreadDtl } from "./GrndSpread";
import { SNAserialized } from "./sna/SNA";
import { SNAManager } from "./sna/SNA";
import { SensorActuator } from "./sna/SNA";
import { Sensor } from "./sna/SNA";
import { Actuator } from "./sna/SNA";
import { SNAproperties } from "./sna/SNA";
import { ActuatorRotator } from "./sna/ActuatorRotator";
import { ActRotatorParm } from "./sna/ActuatorRotator";
import { ActuatorMover } from "./sna/ActuatorMover";
import { ActMoverParm } from "./sna/ActuatorMover";
import { AvSerialized, VishvaSerialized } from "./VishvaSerialized";
import { VishvaGUI } from "./gui/VishvaGUI";

import { AvManager } from "./avatar/AvManager";
import { DialogMgr } from "./gui/DialogMgr";
import { VTheme, VThemes } from "./gui/components/VTheme";
import { VEvent } from "./eventing/VEvent";
import { EventManager } from "./eventing/EventManager";
import { InternalTexture } from "babylonjs/Materials/Textures/internalTexture";
import { NodeMaterialBlockTargets } from "babylonjs/Materials/Node/Enums/nodeMaterialBlockTargets";
import { GuiUtils } from "./gui/GuiUtils";



/**
 * @author satguru
 */
export class Vishva {

    public static worldName: string;

    //location of all vishva user assets and worlds
    public static vHome: string = "vishva/";

    //location of all vishva binary files and internal assets
    //normally "/bin/" folder. will keep it relative
    public static vBinHome: string = "bin/";
    public static NO_TEXTURE = Vishva.vBinHome + "assets/internal/textures/no-texture.jpg";
    public static TGA_IMAGE = Vishva.vBinHome + "assets/internal/textures/tga-image.jpg";

    public static userAssets: Array<any>;
    public static internalAssets: Array<any>;

    actuator: string = "none";

    scene: Scene;

    engine: Engine;

    canvas: HTMLCanvasElement;
    public static gui: HTMLElement;
    public static theme: VTheme = VThemes.CurrentTheme;

    editEnabled: boolean;


    private snapTransOn: boolean = false;
    private snapRotOn: boolean = false;
    private snapScaleOn: boolean = false;

    /*
     * snapper mode snaps mesh to global grid points
     * evertime a mesh is selected it will be snapped to
     * the closest global grid point
     * can only work in globalAxisMode
     * 
     */
    public snapperOn: boolean = false;
    public snapTransValue: number = 0.5;
    public snapRotValue: number = Math.PI / 4;
    public snapScaleValue: number = 0.5;
    //outlinewidth
    private ow = 0.01;

    private spaceWorld: boolean = false;

    //skyboxes: Array<string>;



    /**
     * avatar stuff 
     */
    public avManager: AvManager;
    private cc: CharacterController;
    public avatar: Mesh;
    private avatarSkeleton: Skeleton;
    private _avDisabled: boolean = false;


    //spawnPosition:Vector3=new Vector3(-360,620,225);
    private spawnPosition: Vector3 = new Vector3(0, 0.2, 0);
    //spawnPosition: Vector3=new Vector3(0,12,0);



    private _avEllipsoid: Vector3 = new Vector3(0.5, 1, 0.5);
    private _avEllipsoidOffset: Vector3 = new Vector3(0, 1, 0);

    // Note the usage of relative url for internal assets
    // "assets/.." and not "/assets"
    // This is becuase internal assets would be stored in the distribution itself
    private avatarFolder: string = Vishva.vBinHome + "assets/internal/avatar/";
    private avatarFile: string = "starterAvatars.babylon";




    groundTexture: string = Vishva.vBinHome + "assets/internal/textures/ground.jpg";
    groundBumpTexture: string = Vishva.vBinHome + "assets/internal/textures/ground-normal.jpg";
    groundHeightMap: string = Vishva.vBinHome + "assets/internal/textures/ground_heightMap.png";

    terrainTexture: string = Vishva.vBinHome + "assets/internal/textures/earth.jpg";
    terrainHeightMap: string = Vishva.vBinHome + "assets/internal/textures/worldHeightMap.jpg";

    primTexture: string = Vishva.vBinHome + "assets/internal/textures/Birch.jpg";

    waterTexture: string = Vishva.vBinHome + "assets/internal/textures/waterbump.png";

    snowTexture: string = Vishva.vBinHome + "assets/internal/textures/flare.png";
    rainTexture: string = Vishva.vBinHome + "assets/internal/textures/raindrop-1.png";

    snowPart: ParticleSystem = null;
    snowing: boolean = false;

    rainPart: ParticleSystem = null;
    raining: boolean = false;

    SOUND_ASSET_LOCATION: string = Vishva.vHome + "assets/sounds/";

    //each asset has a name and a url
    //sceneloader gets the location of the asset as below
    //if scene name specifed then
    //location = (home url if scene url is relative) + (url of the scene file) + (asset name)
    //thus assets should be located relative to the scene file
    //else
    //location = (home url if asset url is relative) + (asset url)
    //no scene file means the data is being supplied inline as  "data:"
    //
    //Thus it might be good idea to load scene file directly and then just pass data to sceneloader functions
    //This way we can use different base url for scene file and assets
    //Thus read the file using assetmanager as a text file , parse the file data and pass it to the sceneloader fucntion as data
    //
    //sound is different. 
    //location of sound file = home url + sound url
    //we can use below too but then while passing data to scene loader use empty string as root url
    RELATIVE_ASSET_LOCATION: string = "";


    sun: HemisphericLight;
    sunDR: DirectionalLight;
    _sunAlpha: number = 0;
    _sunBeta: number = 45;

    skybox: Mesh;
    skyColor: Color4 = new Color4(0.5, 0.5, 0.5, 1);
    skyBright: number = 0.5;

    waterMesh: Mesh;

    ground: Mesh;



    arcCamera: ArcRotateCamera;
    private _cameraCollision: boolean = true;
    //private _cameraEllipsoid:Vector3= new Vector3(0.01,0.01,0.01);
    private _cameraEllipsoid: Vector3 = new Vector3(1, 1, 1);

    vishvaGUI: VishvaGUI;

    GrndSpreads: GrndSpread[];



    /**
     * use this to prevent users from switching to another mesh during edit.
     */
    public switchDisabled: boolean = false;



    public key: Key;

    private keysDisabled: boolean = false;

    loadingMsg: HTMLElement;

    showBoundingBox: boolean = false;


    //automatcally open edit menu whenever a mesh is selected
    private autoEditMenu: boolean = true;

    private enablePhysics: boolean = true;

    public static vishva: Vishva;
    static version: string = "0.3.0";


    public constructor(sceneFile: string, scenePath: string, editEnabled: boolean, canvasId: string, guiId: string) {

        //BABYLON.OBJFileLoader.INVERT_Y = true;

        console.log("vishva version : " + Vishva.version);

        Tools.LogLevels = Tools.AllLogLevel;

        Vishva.userAssets = userAssets;
        Vishva.internalAssets = internalAssets;

        Vishva.vishva = this;
        Vishva.worldName = sceneFile;

        this.editEnabled = false;
        this.frames = 0;
        this.f = 0;
        if (!Engine.isSupported()) {
            alert("not supported");
            return;
        }
        this.loadingMsg = document.getElementById("loadingMsg");
        this.loadingMsg.style.visibility = "hidden";

        this.editEnabled = editEnabled;
        this.key = new Key();

        Vishva.gui = <HTMLCanvasElement>document.getElementById(guiId);
        this.canvas = <HTMLCanvasElement>document.getElementById(canvasId);
        //this.engine=new Engine(this.canvas,true,{"disableWebGL2Support":true});
        //this.engine = new Engine(this.canvas, true);
        this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });

        Engine.audioEngine.useCustomUnlockedButton = true;


        this.scene = new Scene(this.engine);
        //let pOn = this.scene.enablePhysics();
        //let pOn = this.scene.enablePhysics(new Vector3(0, -9.8, 0));
        let pOn = this.scene.enablePhysics(new Vector3(0, -9.81, 0), new OimoJSPlugin());
        //this.scene.useRightHandedSystem = true;
        //
        //lets make night black
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        //set ambient to white in case user wants to bypass light conditions for some objects
        this.scene.ambientColor = new Color3(0, 0, 0);
        this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);

        window.addEventListener("resize", (event) => { return this.onWindowResize(event) });
        window.addEventListener("keydown", (e) => { return this.onKeyDown(e) }, false);
        window.addEventListener("keyup", (e) => { return this.onKeyUp(e) }, false);
        window.onfocus = () => {
            this.key.esc = false;
            this.key.shift = false;
            this.key.ctl = false
            this.key.alt = false;
        };

        //fix shadow and skinning issue
        //see http://www.html5gamedevs.com/topic/31834-shadow-casted-by-mesh-with-skeleton-not-proper/ 
        SceneLoader.CleanBoneMatrixWeights = true

        if (sceneFile == "empty") {
            this.sceneLoad3(this.scene, true);
        } else {
            this.sceneLoad1(scenePath, sceneFile + ".js", this.scene);
        }
    }


    // -- sceneload1 --
    private sceneLoad1(scenePath: string, sceneFile: string, scene: Scene) {
        var am: AssetsManager = new AssetsManager(scene);
        var task: TextFileAssetTask = am.addTextFileTask("sceneLoader", scenePath + sceneFile);
        task.onSuccess = (obj) => { return this.sceneLoad2(obj) };
        task.onError = (obj) => { alert("scene load failed"); };
        am.load();
    }

    // -- sceneload2 --
    snas: SNAserialized[];

    vishvaSerialized: VishvaSerialized = null;

    public getGuiSettings(): Object {
        if (this.vishvaSerialized !== null)
            return this.vishvaSerialized.guiSettings;
        else return null;
    }

    private sceneLoad2(obj: any) {
        var tfat: TextFileAssetTask = <TextFileAssetTask>obj;
        var foo: Object = <Object>JSON.parse(tfat.text);

        this.vishvaSerialized = foo["VishvaSerialized"];
        console.log("world babylon version : " + this.vishvaSerialized.bVer);
        console.log("world vishva version : " + this.vishvaSerialized.vVer);

        this.snas = this.vishvaSerialized.snas;
        this._cameraCollision = this.vishvaSerialized.settings.cameraCollision;
        this.autoEditMenu = this.vishvaSerialized.settings.autoEditMenu;
        if (this.vishvaSerialized.misc.skyColor) {
            this.skyColor.r = this.vishvaSerialized.misc.skyColor.r;
            this.skyColor.g = this.vishvaSerialized.misc.skyColor.g;
            this.skyColor.b = this.vishvaSerialized.misc.skyColor.b;
            this.skyColor.a = this.vishvaSerialized.misc.skyColor.a;
        }

        if (typeof this.vishvaSerialized.misc.skyBright !== "undefined") {
            this.skyBright = this.vishvaSerialized.misc.skyBright;
        }

        var sceneData: string = "data:" + tfat.text;
        SceneLoader.ShowLoadingScreen = false;

        //SceneLoader.loggingLevel = SceneLoader.DETAILED_LOGGING;

        SceneLoader.Append("", sceneData, this.scene, (scene) => { return this.sceneLoad3(scene) });

    }


    // -- sceneload3 --

    /**
     * sets the loaded scene
     * checks if the scene is a standard vishva scene - by checking if it has standard vishva assets
     * if not then it creates those standard vishva assets - avatar, sky, camera, terrain
     * 
     * @param scene 
     */
    private sceneLoad3(scene: Scene, empty: boolean = false) {

        var avFound: boolean = false;
        var skelFound: boolean = false;
        var sunFound: boolean = false;
        var groundFound: boolean = false;
        var skyFound: boolean = false;
        var cameraFound: boolean = false;

        for (let mesh of scene.meshes) {

            //sat TODO
            //mesh.receiveShadows = false;
            if (Tags.HasTags(mesh)) {
                if (Tags.MatchesQuery(mesh, "Vishva.avatar")) {
                    avFound = true;
                    this.avatar = <Mesh>mesh;
                    //TODO ellipsoidOffset not serialized?
                    this.avatar.ellipsoidOffset = this._avEllipsoidOffset;
                    //TODO override ellipsoid ?
                    this.avatar.ellipsoid = this._avEllipsoid;
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
            }
        }

        if (!skelFound) {
            console.log("No Skeleton found");
        }

        for (let light of scene.lights) {
            if (Tags.MatchesQuery(light, "Vishva.sun")) {
                sunFound = true;
                this.sun = <HemisphericLight>light;
                this._setSunAB(this.sun.direction);
            }
        }

        if (!sunFound) {
            console.log("no vishva sun found. creating sun");

            this.sun = new HemisphericLight("Vishva.hl01", new Vector3(1, 1, 0), this.scene);
            this.sun.groundColor = new Color3(0.5, 0.5, 0.5);
            Tags.AddTagsTo(this.sun, "Vishva.sun");

            this.sunDR = new DirectionalLight("Vishva.dl01", new Vector3(-1, -1, 0), this.scene);
            this.sunDR.position = new Vector3(0, 1048, 0);

            this._setSunAB(this.sun.direction);

            let sl: IShadowLight = <IShadowLight>(<any>this.sunDR);
            this.shadowGenerator = new ShadowGenerator(1024, sl);
            this.setShadowProperty(sl, this.shadowGenerator);
            //                this.avShadowGenerator=new ShadowGenerator(512,sl);
            //                this.setShadowProperty(sl,this.avShadowGenerator);
        } else {
            for (let light of scene.lights) {
                if (light.id === "Vishva.dl01") {
                    this.sunDR = <DirectionalLight>light;
                    this.shadowGenerator = <ShadowGenerator>light.getShadowGenerator();
                    let sl: IShadowLight = <IShadowLight>(<any>this.sunDR);
                    this.setShadowProperty(sl, this.shadowGenerator);
                }
            }
        }

        for (let mesh of scene.meshes) {
            if (mesh != null) {
                if (mesh instanceof InstancedMesh) {
                    mesh.checkCollisions = mesh.sourceMesh.checkCollisions;
                    //sat TODO remove comment
                    //mesh.receiveShadows = true;
                    this._addToShadowCasters(mesh);

                } else {
                    //(<Mesh>mesh).addLODLevel(55, null);
                    //this._removeFromShadowCasters(mesh);
                }
            }
        }

        //add avatar back to shadow caster list
        if (avFound) this._addToShadowCasters(this.avatar);

        for (let camera of scene.cameras) {
            if (Tags.MatchesQuery(camera, "Vishva.camera")) {
                cameraFound = true;
                this.arcCamera = <ArcRotateCamera>camera;
                this.setCameraSettings(this.arcCamera);
                this.arcCamera.attachControl(this.canvas, true);
                //this.mainCamera.target = this.vishvaSerialized.misc.activeCameraTarget;
            }
        }

        if (!cameraFound) {
            console.log("no vishva camera found. creating camera");
            this.arcCamera = this.createCamera(this.scene, this.canvas);
            this.scene.activeCamera = this.arcCamera;
        }


        //TODO
        this.arcCamera.checkCollisions = this._cameraCollision;
        //this.mainCamera.collisionRadius=new Vector3(0.5,0.5,0.5);
        this.arcCamera.collisionRadius = this._cameraEllipsoid;

        if (!groundFound) {
            if (empty) {
                //only create ground if we are starting from scratch, world=empty
                console.log("no vishva ground found. creating ground");
                //this.ground=this.createGround(this.scene);
                //this.createGround_htmap(this.scene);
                //this.creatDynamicTerrain();
                this._createPlaneGround(this.scene);
            }

        } else {
            //in case this wasn't set in serialized scene
            this.ground.receiveShadows = true;
            //are physicsImpostor serialized?
            //                if (this.enablePhysics) {
            //                    this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.BoxImpostor, {mass: 0, restitution: 0.1}, this.scene);
            //                }
            if (this.vishvaSerialized.grndSpreadArray != null) {
                this.GrndSpreads = new Array()
                for (let gSPSs of this.vishvaSerialized.grndSpreadArray) {
                    try {
                        let gSPS = GrndSpread_Serializeable.deserialize(gSPSs);
                        gSPS.generate();
                        this.GrndSpreads.push(gSPS);
                    } catch (e) {
                        console.log("error during gSPS.generate()")
                        console.log(e);
                    }
                }
            }
        }


        this.scene.clearColor = this.skyColor.scale(this.skyBright);

        if (!skyFound) {
            console.log("no vishva sky found. creating sky");
            //this.skybox = this.createSkyBox(this.scene,this.skyboxTextures);
            this.setSunBright(0.5);
        }
        if (this.scene.fogMode !== Scene.FOGMODE_EXP) {
            this.scene.fogMode = Scene.FOGMODE_EXP;
            this.scene.fogDensity = 0;
        }
        //            if(this.scene.fogMode!==Scene.FOGMODE_LINEAR) {
        //                this.scene.fogMode=Scene.FOGMODE_LINEAR;
        //                this.scene.fogStart=256;
        //                   this.sthis.scene.fogEnd=512;
        //             cene.fogDensity=0;
        //            }
        if (this.editEnabled) {
            this.scene.onPointerDown = (evt, pickResult) => { return this.pickObject(<PointerEvent>evt, pickResult) };
        }

        this.avManager = new AvManager(
            this.avatar,
            this.avatarFolder,
            this.avatarFile,
            this._avEllipsoid,
            this._avEllipsoidOffset,
            this.scene,
            this.shadowGenerator,
            this.spawnPosition,
            this.arcCamera,
            this.saveAVcameraPos
        );

        if (!avFound) {
            console.log("no vishva av found. creating av");
            //remember loadAvatar is async. process
            this.avManager.createAvatar((avatar: Mesh) => {
                this.avatar = avatar;
                this.avatarSkeleton = this.avatar.skeleton;
                this.sceneLoad4();
            });
        } else {
            this.sceneLoad4();
        }
    }

    // -- sceneload4 --

    private sceneLoad4() {

        this.cc = this.avManager.setCharacterController(this.avatar);
        if (this.vishvaSerialized && this.vishvaSerialized.avSerialized) {

            this.cc.setSettings(this.vishvaSerialized.avSerialized.settings);

            //if avatar is animated by animationgroups then we need to re-reference
            //teh niamtion groups from the serialized data/
            let ac: ActionMap = AvSerialized.deSerializeAG(this.scene, this.vishvaSerialized.avSerialized.actionMap);
            this.cc.setActionMap(ac);
        }
        this.cc.start();

        SNAManager.getSNAManager().unMarshal(this.snas, this.scene);
        this.snas = null;
        this.render();
    }



    private render() {
        this.scene.registerBeforeRender(() => { return this.process() });
        this.scene.executeWhenReady(() => { return this.startRenderLoop() });
    }

    private startRenderLoop() {
        //this.backfaceCulling(this.scene.materials);
        if (this.editEnabled) {
            this.vishvaGUI = new VishvaGUI(this);
        } else {
            this.vishvaGUI = null;
        }
        this.engine.hideLoadingUI();

        this.engine.runRenderLoop(() => this.scene.render());
    }

    isFocusOnAv: boolean = true;

    cameraAnimating: boolean = false;
    uniCamController: UniCamController;

    private process() {
        this.sunDR.position.x = this.avatar.position.x + 100;
        this.sunDR.position.y = this.avatar.position.y + 100;
        this.sunDR.position.z = this.avatar.position.z + 0;

        if (this.cameraAnimating) return;

        //sometime (example - when gui dialogs is on and user is typing into it) we donot want to interpret keys
        //except ofcourse the esc key
        if (this.keysDisabled && !this.key.esc) {
            this.resetKeys();
            return;
        }


        if (this.isMeshSelected) {
            if (this.key.focus) {
                //this.key.focus = false;
                this.setFocusOnMesh();
            }
            if (this.key.esc) {
                this.key.esc = false;
                //this.animateMesh(this.meshPicked);
                this.removeEditControl();
                if (!this.isFocusOnAv) {
                    this.setFocusOnNothing();
                    if (this.uniCamController == null) {
                        this.uniCamController = new UniCamController(this.scene, this.canvas);
                    }
                    this.uniCamController.start();
                }

            }
            if (this.key.trans) {
                //this.key.trans = false;
                this.setTransOn();
            }
            if (this.key.rot) {
                //this.key.rot = false;
                this.setRotOn();
            }
            if (this.key.scale) {
                //this.key.scale = false;
                this.setScaleOn();
            }
            if (this.key.del) {
                this.delete_mesh();
            }
            if (this.key.undo) {
                this.undo();
            }
            if (this.key.redo) {
                this.redo();
            }

        }

        if (!this._avDisabled) {
            if (this.isFocusOnAv) {
                if (this.key.esc) {
                    //this.animateMesh(this.avatar, 1.1);
                    this.setFocusOnNothing();
                    if (this.uniCamController == null) {
                        this.uniCamController = new UniCamController(this.scene, this.canvas);
                    }
                    this.uniCamController.start();
                }

            } //else if (this.key.up || this.key.down || this.key.esc) {
            else if (this.key.esc) {
                if (this.editControl == null) {
                    this.switchFocusToAV();
                } else if (!this.editControl.isEditing()) {
                    this.switchFocusToAV();
                }
            }
        }

        if (this.key.esc) {
            this.multiUnSelectAll();
        }

        this.resetKeys();
    }
    private resetKeys() {
        this.key.focus = false;
        this.key.esc = false;
        this.key.trans = false;
        this.key.rot = false;
        this.key.scale = false;
        this.key.del = false;
        this.key.undo = false;
        this.key.redo = false;
    }

    private setShadowProperty(sl: IShadowLight, shadowGenerator: ShadowGenerator) {
        //            shadowGenerator.useBlurVarianceShadowMap = true;
        //            shadowGenerator.bias = 1.0E-6;

        shadowGenerator.useBlurExponentialShadowMap = true;
        //http://www.html5gamedevs.com/topic/31834-shadow-casted-by-mesh-with-skeleton-not-proper/
        shadowGenerator.bias = -0.3;

        //            shadowGenerator.bias = 1.0E-6;
        //            shadowGenerator.depthScale = 2500;
        //            sl.shadowMinZ = 1;
        //            sl.shadowMaxZ = 2500;

        this.sunDR.autoCalcShadowZBounds = true;
        shadowGenerator.depthScale = 4;

    }

    debug: boolean = true;
    private logDebug(msg: string) {
        if (this.debug) console.log(msg);
    }

    //how far away from the center can the avatar go
    //fog will start at the limitStart and will become dense at LimitEnd
    private moveLimitStart = 114;
    private moveLimitEnd = 124;

    oldAvPos: Vector3 = new Vector3(0, 0, 0);

    fogDensity: number = 0;

    private isMeshSelected: boolean = false;
    //NOTE: sometime isMeshSelected is false and meshSelected != null
    //see removeEditControl()
    public meshSelected: TransformNode;
    public getMeshSelected(): TransformNode {
        return this.meshSelected;
    }
    //list of meshes selected 
    //doesnot include the currently picked mesh (the one with edit control)
    //is set to null when all are deslected
    private meshesPicked: Array<TransformNode> = null;

    //did we select just a node or the root of the node.
    private rootSelected: boolean = false;
    public isRootSelected(): boolean {
        return this.rootSelected;
    }


    private cameraTargetPos: Vector3 = new Vector3(0, 0, 0);
    private saveAVcameraPos: Vector3 = new Vector3(0, 0, 0);

    public editControl: EditControl;

    private pickObject(evt: PointerEvent, pickResult: PickingInfo) {
        // prevent curosr from changing to a edit caret in Chrome
        evt.preventDefault();

        if (!pickResult.hit) return

        // pick the hit or its root ancestor or multi select the hit or its root ancestor
        let _pickHit: boolean = (this.key.alt) && (evt.button == 2);
        let _pickRoot: boolean = (this.key.alt) && (evt.button == 0);
        this.rootSelected = _pickRoot;
        let _pickMultiHit: boolean = (this.key.ctl) && (evt.button == 2);
        let _pickMultiRoot: boolean = (this.key.ctl) && (evt.button == 0);

        if (!(_pickHit || _pickRoot || _pickMultiHit || _pickMultiRoot)) return;
        //if (!(evt.button == 0 && (this.key.alt || this.key.ctl || this.key.shift))) return;
        //if(evt.button!==2) return;


        let pm: TransformNode = pickResult.pickedMesh;
        if (_pickRoot || _pickMultiRoot) pm = this._getRootMesh(pm, pm);

        if (_pickHit || _pickRoot) {
            if (!this.isMeshSelected) {
                this.selectForEdit(pm);
            } else {
                if (pm === this.meshSelected) {
                    // if already selected then focus on it
                    this.setFocusOnMesh();
                } else {
                    this.switchEditControl(pm);
                    if (this.snapperOn) this.snapToGlobal()
                }
            }
        } else {
            //if we multiclicked already selected one then ignore
            if (!this.isMeshSelected || pm != this.meshSelected) {
                if (_pickMultiHit) {
                    this.multiSelect(<AbstractMesh>pm);
                } else {
                    this._multiSelectWithChildren(pm);
                }
            }
        }

    }

    /**
     * returns the mesh first(oldest) Transform node ancestor
     * 
     * @param mesh 
     * @param lastMesh 
     */
    private _getRootMesh(mesh: Node, lastMesh: TransformNode) {
        if (mesh.parent == null) {
            if (mesh instanceof TransformNode) return mesh;
            else return lastMesh;
        } else {
            if (mesh instanceof TransformNode) lastMesh = mesh;
            return this._getRootMesh(mesh.parent, lastMesh);
        }
    }

    private selectForEdit(mesh: TransformNode) {
        //if in multiselect then remove from multiselect
        this.multiUnSelect(mesh);
        this.isMeshSelected = true;
        this.meshSelected = mesh;
        SNAManager.getSNAManager().disableSnAs(this.meshSelected);
        if (this.meshSelected instanceof AbstractMesh) {
            this.savePhyParms(this.meshSelected);
        }
        this.switchToQuats(this.meshSelected);
        //this.editControl = new EditControl(<Mesh>this.meshPicked, this.arcCamera, this.canvas, 0.75);
        this.editControl = new EditControl(this.meshSelected, this.scene.activeCamera, this.canvas, 0.5);
        this.editControl.addActionEndListener((actionType: number) => {
            this.vishvaGUI.handleTransChange();
        })
        this.editControl.enableTranslation();
        if (this.spaceWorld) {
            this.editControl.setLocal(false);
        }
        if (this.autoEditMenu) {
            this.vishvaGUI.showPropDiag(mesh);
        }
        //if (this.key.ctl) this.multiSelect(null, this.meshPicked);

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
            if (this.snapScaleOn) {
                this.editControl.setScaleSnap(true);
                this.editControl.setScaleSnapValue(this.snapScaleValue);
            };
        }
    }


    /**
     * switch the edit control to the new mesh
     * 
     * @param mesh
     */
    public switchEditControl(mesh: TransformNode) {
        if (this.switchDisabled) return;
        SNAManager.getSNAManager().enableSnAs(this.meshSelected);
        if (this.meshSelected instanceof AbstractMesh) {
            this.restorePhyParms(this.meshSelected);
        }

        this.meshSelected = mesh;
        if (this.meshSelected instanceof AbstractMesh) {
            this.savePhyParms(this.meshSelected);
        }

        this.switchToQuats(this.meshSelected);
        this.editControl.switchTo(this.meshSelected);
        if (this.meshSelected instanceof AbstractMesh) {
            SNAManager.getSNAManager().disableSnAs(<Mesh>this.meshSelected);
        }
        //if (this.key.ctl) this.multiSelect(prevMesh, this.meshPicked);
        //refresh the properties dialog box if open
        this.vishvaGUI.refreshPropsDiag();
    }
    /**
     * if not set then set the mesh rotation in qauternion
     */
    private switchToQuats(m: TransformNode) {
        if ((m.rotationQuaternion === undefined) || (m.rotationQuaternion === null)) {
            let r: Vector3 = m.rotation;
            m.rotationQuaternion = Quaternion.RotationYawPitchRoll(r.y, r.x, r.z);
        }
    }

    private highLight(am: TransformNode) {
        //            am.renderOutline=true;
        //            am.outlineWidth=this.ow;
        //            am.showBoundingBox=true;
        if (am instanceof AbstractMesh) {
            am.enableEdgesRendering();
            am.edgesWidth = 4.0;
        }
    }

    private unHighLight(am: TransformNode) {
        //            am.renderOutline=false;
        //            am.showBoundingBox=false;
        if (am instanceof AbstractMesh) {
            am.disableEdgesRendering();
        }

    }

    /**
     * select and highlight all children of given transform node
     * if the transform node was already in multiselect then remove
     * it and all its children from the list
     * @param tn 
     */

    private _multiSelectWithChildren(tn: TransformNode) {
        if (this.meshesPicked == null) {
            this.meshesPicked = new Array<AbstractMesh>();
        }
        let children: Array<TransformNode> = tn.getChildTransformNodes();

        if (this.meshesPicked.indexOf(tn) >= 0) {
            this.multiUnSelect(tn);
            for (let child of children) {
                this.multiUnSelect(child);
            }
            return;
        }

        this.meshesPicked.push(tn);
        if (tn instanceof AbstractMesh) this.highLight(tn);

        for (let child of children) {
            if (this.meshesPicked.indexOf(child) >= 0) continue;
            this.meshesPicked.push(child);
            if (child instanceof AbstractMesh) this.highLight(child);
        }
    }

    private multiSelect(currentMesh: AbstractMesh) {
        if (this.meshesPicked == null) {
            this.meshesPicked = new Array<AbstractMesh>();

        }

        //if current mesh was already selected then unselect it
        //else select it
        if (!this.multiUnSelect(currentMesh)) {
            this.meshesPicked.push(currentMesh);
            this.highLight(currentMesh);
        }
    }

    //if mesh was already selected then unselect it
    //return true if the mesh was unselected
    private multiUnSelect(mesh: TransformNode): boolean {
        if (this.meshesPicked == null) return false;
        let i = this.meshesPicked.indexOf(mesh);
        if (i >= 0) {
            this.meshesPicked.splice(i, 1);
            this.unHighLight(mesh);
            return true;
        }
        return false;
    }
    private multiUnSelectAll() {
        if (this.meshesPicked === null) return;
        for (let mesh of this.meshesPicked) {
            this.unHighLight(mesh);
        }
        this.meshesPicked = null;
    }

    public removeEditControl() {
        this.multiUnSelectAll();
        this.isMeshSelected = false;
        //            if (!this.focusOnAv) {
        //                this.switchFocusToAV();
        //            }

        //if scaling is on then we might have changed space to local            
        //restore space to what is was before scaling
        //            if (this.editControl.isScalingEnabled()) {
        //                this.setSpaceLocal(this.wasSpaceLocal);
        //            }
        this.editControl.detach();
        this.editControl = null;

        //if(this.autoEditMenu) this.vishvaGUI.closePropDiag();
        //close properties dialog if open
        this.vishvaGUI.handeEditControlClose();
        SNAManager.getSNAManager().enableSnAs(this.meshSelected);
        if (this.meshSelected != null && this.meshSelected instanceof AbstractMesh) {
            this.restorePhyParms(this.meshSelected);
        }

    }



    private switchFocusToAV() {
        let camera: TargetCamera = <TargetCamera>this.scene.activeCamera;

        this.frames = 25;
        this.f = this.frames;

        this.deltaP = this.saveAVcameraPos.subtract(camera.position).scale(1 / this.frames);


        this.start = camera.getFrontPosition(1);
        this.end = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
        this.deltaT = this.end.subtract(this.start).scale(1 / this.frames);

        camera.setTarget(this.start);

        // this.arcCamera.target = camera.getFrontPosition(1)
        // //this.arcCamera.target = this.end;
        // this.arcCamera.setPosition(camera.position.clone());

        // this.uniCamController.stop();
        // this.scene.activeCamera=this.arcCamera;

        this.cameraAnimating = true;
        this.scene.registerBeforeRender(this.animFunc);
    }

    animFunc: () => void = () => { return this.animateCamera() };
    private animateCamera() {
        let camera: TargetCamera = <TargetCamera>this.scene.activeCamera;

        this.start.addInPlace(this.deltaT);
        camera.setTarget(this.start);
        camera.position.addInPlace(this.deltaP);

        this.f--;
        if (this.f < 0) {
            this.isFocusOnAv = true;
            this.cameraAnimating = false;
            this.scene.unregisterBeforeRender(this.animFunc);

            this.arcCamera.target = this.end;
            this.arcCamera.setPosition(this.saveAVcameraPos);

            this.uniCamController.stop();

            this.arcCamera.attachControl(this.canvas);
            this.cc.start();
        }
    }


    private focusOnMesh(mesh: TransformNode, frames: number) {
        let camera: TargetCamera = <TargetCamera>this.scene.activeCamera;
        this.scene.activeCamera.detachControl();
        this.frames = frames;
        this.f = frames;
        this.start = camera.getFrontPosition(1);
        if (camera instanceof ArcRotateCamera) {
            camera.target = camera.getFrontPosition(1)
        } else
            camera.setTarget(camera.getFrontPosition(1));
        this.deltaT = mesh.getAbsolutePivotPoint().subtract(this.start).scale(1 / this.frames);
        this.cameraAnimating = true;
        this.scene.registerBeforeRender(this.animFunc2);
    }



    animFunc2: () => void = () => { return this.justReFocus() };
    private justReFocus() {
        let camera: TargetCamera = <TargetCamera>this.scene.activeCamera;
        //camera.setTarget((<Vector3>this.mainCamera.target).add(this.delta2));
        //this.drawLine(this.start,this.delta2);

        if (camera instanceof ArcRotateCamera) {
            camera.setTarget(camera.getTarget().add(this.deltaT));
        } else {
            this.start.addInPlace(this.deltaT);
            camera.setTarget(this.start);
        }
        this.f--;
        if (this.f < 0) {
            this.cameraAnimating = false;
            this.scene.unregisterBeforeRender(this.animFunc2);
            if (camera instanceof ArcRotateCamera) {
                camera.attachControl(this.canvas);
            } else {
                if (this.editControl != null) {
                    this.editControl.switchCamera(this.arcCamera);
                }
                this.arcCamera.setPosition(camera.position);
                this.arcCamera.setTarget(this.start);
                this.scene.activeCamera = this.arcCamera;
                this.arcCamera.attachControl(this.canvas);
                this.uniCamController.stop();
            }

        }
    }

    frames: number;
    f: number;
    //position delta
    deltaP: Vector3;
    //target delata
    deltaT: Vector3;
    start: Vector3 = Vector3.Zero();
    end: Vector3 = Vector3.Zero();


    private drawLine(from: Vector3, to: Vector3) {
        MeshBuilder.CreateLines("", { points: [from, from.add(to)] }, this.scene);
    }

    private onWindowResize(event: Event) {
        this.engine.resize();
    }

    private onKeyDown(e: Event) {
        let event: KeyboardEvent = <KeyboardEvent>e;

        if (event.keyCode === 16) this.key.shift = true;
        if (event.keyCode === 17) this.key.ctl = true;
        if (event.keyCode === 18) this.key.alt = true;

        if (event.keyCode === 27) this.key.esc = false;
        if (event.keyCode === 46) this.key.del = false;
        //if (event.key === "Delete") this.key.del = false;


        var chr: string = String.fromCharCode(event.keyCode);
        //WASD or arrow keys
        if ((chr === "W") || (event.keyCode === 38)) this.key.up = true;
        if ((chr === "S") || (event.keyCode === 40)) this.key.down = true;

        //
        if (chr === "1") this.key.trans = false;
        if (chr === "2") this.key.rot = false;
        if (chr === "3") this.key.scale = false;
        if (chr === "F") this.key.focus = false;
    }

    private onKeyUp(e: Event) {
        let event: KeyboardEvent = <KeyboardEvent>e;
        if (event.keyCode === 16) this.key.shift = false;
        if (event.keyCode === 17) this.key.ctl = false;
        if (event.keyCode === 18) this.key.alt = false;

        if (event.keyCode === 27) this.key.esc = true;
        if (event.keyCode === 46) this.key.del = true;
        //if (event.key === "Delete") this.key.del = true;
        //
        var chr: string = String.fromCharCode(event.keyCode);
        if ((chr === "W") || (event.keyCode === 38)) this.key.up = false;
        if ((chr === "S") || (event.keyCode === 40)) this.key.down = false;
        //
        if (chr === "1") this.key.trans = true;
        if (chr === "2") this.key.rot = true;
        if (chr === "3") this.key.scale = true;
        if (chr === "F") this.key.focus = true;

        if (chr === "Z" && this.key.ctl && !this.key.shift) this.key.undo = true;
        if (chr === "Y" && this.key.ctl) this.key.redo = true;
        if (chr === "Z" && this.key.ctl && this.key.shift) this.key.redo = true;
    }

    /**
     * material for primitives
     */
    private primMaterial: StandardMaterial;
    private primPBRMaterial: PBRMetallicRoughnessMaterial;

    private createPrimMaterial() {
        if (this.primMaterial != null) return;
        this.primMaterial = new StandardMaterial("primMat", this.scene);
        //this.primMaterial.diffuseTexture = new Texture(this.primTexture, this.scene);
        //GRAY COLOR
        this.primMaterial.diffuseColor = new Color3(1, 1, 1);
        this.primMaterial.specularColor = new Color3(0, 0, 0);
    }

    private createPrimPBRMaterial() {
        this.primPBRMaterial = new PBRMetallicRoughnessMaterial("primMat", this.scene);
        //this.primPBRMaterial.baseTexture = new Texture(this.primTexture, this.scene);
        this.primPBRMaterial.baseColor = new Color3(0.5, 0.5, 0.5);
        this.primPBRMaterial.roughness = 0.5;
        this.primPBRMaterial.metallic = 0.5;
        this.primPBRMaterial.environmentTexture = (<StandardMaterial>this.skybox.material).reflectionTexture;

    }

    private setPrimProperties(mesh: Mesh) {
        if (this.primMaterial == null) this.createPrimMaterial();
        // if (this.primPBRMaterial == null) this.createPrimPBRMaterial();
        var r: number = mesh.getBoundingInfo().boundingSphere.radiusWorld;
        var placementLocal: Vector3 = new Vector3(0, r, -(r + 2));
        var placementGlobal: Vector3 = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
        mesh.position.addInPlace(placementGlobal);

        mesh.checkCollisions = true;
        this._addToShadowCasters(mesh);
        //sat TODO remove comment
        //mesh.receiveShadows = true;
        Tags.AddTagsTo(mesh, "Vishva.prim Vishva.internal");
        mesh.id = this.uid(mesh.name);//(<number>new Number(Date.now())).toString();
        mesh.name = mesh.id;
        mesh.material = this.primMaterial.clone("m" + mesh.name);
        // mesh.material = this.primPBRMaterial.clone("m" + mesh.name);
    }

    public addPrim(primType: string) {
        let mesh: AbstractMesh = null;
        if (primType === "plane") mesh = this.addPlane();
        else if (primType === "box") mesh = this.addBox();
        else if (primType === "sphere") mesh = this.addSphere();
        else if (primType === "disc") mesh = this.addDisc();
        else if (primType === "cylinder") mesh = this.addCylinder();
        else if (primType === "cone") mesh = this.addCone();
        else if (primType === "torus") mesh = this.addTorus();
        if (mesh !== null) {
            if (!this.isMeshSelected) {
                this.selectForEdit(mesh);
            } else {
                this.switchEditControl(mesh);
            }
            this.animateMesh(mesh);
        }
        EventManager.publish(VEvent._WORLD_ITEMS_CHANGED);
    }

    private addPlane(): AbstractMesh {
        let mesh: Mesh = Mesh.CreatePlane("plane", 1.0, this.scene);
        this.setPrimProperties(mesh);
        mesh.material.backFaceCulling = false;
        return mesh;

    }

    private addBox(): AbstractMesh {
        let mesh: Mesh = Mesh.CreateBox("box", 1, this.scene);
        this.setPrimProperties(mesh);
        return mesh;
    }

    private addSphere(): AbstractMesh {
        let mesh: Mesh = Mesh.CreateSphere("sphere", 10, 1, this.scene);
        this.setPrimProperties(mesh);
        return mesh;
    }

    private addDisc(): AbstractMesh {
        let mesh: Mesh = Mesh.CreateDisc("disc", 0.5, 20, this.scene);
        this.setPrimProperties(mesh);
        mesh.material.backFaceCulling = false;
        return mesh;
    }

    private addCylinder(): AbstractMesh {
        let mesh: Mesh = Mesh.CreateCylinder("cyl", 1, 1, 1, 20, 1, this.scene);
        this.setPrimProperties(mesh);
        return mesh;
    }

    private addCone(): AbstractMesh {
        let mesh: Mesh = Mesh.CreateCylinder("cone", 1, 0, 1, 20, 1, this.scene);
        this.setPrimProperties(mesh);
        return mesh;
    }

    private addTorus(): AbstractMesh {
        let mesh: Mesh = Mesh.CreateTorus("torus", 1, 0.25, 20, this.scene);
        this.setPrimProperties(mesh);
        return mesh;
    }

    public switchGround(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (this.ground != null) {
            Tags.RemoveTagsFrom(this.ground, "Vishva.ground");
            this.ground.isPickable = true;
        }
        this.ground = <Mesh>this.meshSelected;
        this.ground.isPickable = false;
        this.ground.receiveShadows = true;
        Tags.AddTagsTo(this.ground, "Vishva.ground");
        this.removeEditControl();
        return null;
    }

    public instance_mesh(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }

        let inst: TransformNode = this._instanceTransNode(this.meshSelected, null);

        this.animateMesh(inst);
        this.switchEditControl(inst);
        return null;
    }

    //TODO remove when instantiateHierarchy() has been fixed. Very slow for now. (12/24/2019)
    //TODO submeshes? synchronizeInstances()?
    /**
     * 
     * @param tn node to be instanced
     * @param ptn node to which "tn" should be parented 
     */
    private _instanceTransNode(tn: TransformNode, ptn: TransformNode): TransformNode {
        let _name: string = this.uid(tn.name);
        let _tnInst: TransformNode;
        // we cannot create an instance from the instance ,
        // we can only clone it
        if (tn instanceof Mesh) {
            if ((<Mesh>tn).geometry == null) {
                //_tnInst = new TransformNode(_name);
                _tnInst = new Mesh(_name);
                _tnInst.scaling.copyFrom(tn.scaling);
                _tnInst.position.copyFrom(tn.position);
                if (tn.rotationQuaternion != null) _tnInst.rotationQuaternion = tn.rotationQuaternion.clone();
                // if (tn.rotation != null) _tnInst.rotation = tn.rotation.clone();

            } else {
                _tnInst = (<Mesh>tn).createInstance(_name);
                (<InstancedMesh>_tnInst).checkCollisions = (<Mesh>tn).checkCollisions;
            }
            if (ptn == null) {
                _tnInst.scaling.copyFrom(tn.absoluteScaling);
                _tnInst.position.copyFrom(tn.absolutePosition);
                if (tn.absoluteRotationQuaternion != null) _tnInst.rotationQuaternion = tn.absoluteRotationQuaternion.clone();
            } else {
                _tnInst.parent = ptn;
            }

        } else {
            if (tn instanceof InstancedMesh) {
                //TODO revist
                // due to a bug The cloning of instanced mesh takes a long time if the instanced mesh has a parent which is also instanced mesh.
                // As a workaround remove the parent, clone , restore parent.
                let _saveParent: Node = null;
                if (tn.parent != null && (!(tn.parent instanceof Mesh))) {
                    _saveParent = tn.parent;
                    tn.parent = null;
                }
                _tnInst = tn.clone(_name, null, true);
                (<InstancedMesh>_tnInst).checkCollisions = (<InstancedMesh>tn).checkCollisions;
                if (_saveParent != null) {
                    tn.parent = _saveParent;
                }
            } else {
                _tnInst = new TransformNode(_name);
                _tnInst.scaling.copyFrom(tn.scaling);
                _tnInst.position.copyFrom(tn.position);
                if (tn.rotationQuaternion != null) _tnInst.rotationQuaternion = tn.rotationQuaternion.clone();
                // if (tn.rotation != null) _tnInst.rotation = tn.rotation.clone();
            }
            if (ptn == null) {
                _tnInst.scaling.copyFrom(tn.absoluteScaling);
                _tnInst.position.copyFrom(tn.absolutePosition);
                if (tn.absoluteRotationQuaternion != null) _tnInst.rotationQuaternion = tn.absoluteRotationQuaternion.clone();
                // if (tn.rotation != null) _tnInst.rotation = tn.rotation.clone();
            } else {
                _tnInst.parent = ptn;
            }
        }

        let children = tn.getChildTransformNodes(true);
        for (let child of children) {
            this._instanceTransNode(child, _tnInst);
        }
        //TODO ??
        //this._addToShadowCasters(<AbstractMesh>inst);

        return _tnInst;
    }


    public instance_mesh_old(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        //            if((this.meshPicked!=null&&this.meshPicked instanceof BABYLON.InstancedMesh)) {
        //                return ("this is an instance mesh. you cannot create instance of that");
        //            }
        console.log(this.meshSelected.position);
        console.log(this.meshSelected.absolutePosition);
        let name: string = (<number>new Number(Date.now())).toString();
        //var inst: InstancedMesh;
        let inst: TransformNode;
        if ((this.meshSelected != null && this.meshSelected instanceof InstancedMesh)) {

            //inst = <InstancedMesh>(<InstancedMesh>this.meshPicked).clone(name, null, true);
            //TODO 
            //this is VERY SLOW. need an alternate version
            inst = this.meshSelected.instantiateHierarchy();
            //inst.scaling.copyFrom(this.meshPicked.scaling);
            //inst.position.copyFrom(this.meshPicked.absolutePosition);

        } else {
            //inst = (<Mesh>this.meshPicked).createInstance(name);
            inst = this.meshSelected.instantiateHierarchy();
            //inst.position.copyFrom(this.meshPicked.absolutePosition);
        }
        //            delete inst["sensors"];
        //            delete inst["actuators"];

        this.animateMesh(<AbstractMesh>inst);
        this.switchEditControl(<AbstractMesh>inst);

        this._addToShadowCasters(<AbstractMesh>inst);

        return null;
    }

    public toggleCollision() {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (this.meshSelected instanceof AbstractMesh) {
            this.meshSelected.checkCollisions = !this.meshSelected.checkCollisions;
        }
    }

    public enableCollision(b: boolean) {
        if (this.meshSelected instanceof AbstractMesh) {
            this.meshSelected.checkCollisions = b;
        }
    }

    // make all instances of a mesh collidable or not
    public enableInstancesCollision(b: boolean) {
        if (this.meshSelected instanceof AbstractMesh) {
            let source: AbstractMesh = this.meshSelected instanceof InstancedMesh ? this.meshSelected.sourceMesh : this.meshSelected;
            source.checkCollisions = b;
            for (let im of (<Mesh>source).instances) {
                im.checkCollisions = b;
            }

        }
    }

    public isCollideable() {
        if (this.meshSelected instanceof AbstractMesh) {
            return this.meshSelected.checkCollisions;
        } else return false;
    }

    public toggleEnable() {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        this.meshSelected.setEnabled(!this.meshSelected.isEnabled());
        if (this.meshSelected instanceof AbstractMesh) {
            this.meshSelected.showBoundingBox = true;
        }
    }



    public disableIt(yes: boolean) {
        this.meshSelected.setEnabled(!yes);
    }

    public isDisabled(): boolean {
        return !this.meshSelected.isEnabled();
    }


    public showAllDisabled() {
        for (let mesh of this.scene.meshes) {
            if (!mesh.isEnabled()) {
                this.highLight(mesh);
                mesh.outlineWidth = this.ow;
            }
        }
    }
    public hideAllDisabled() {
        for (let mesh of this.scene.meshes) {
            if (!mesh.isEnabled()) {
                this.unHighLight(mesh);
            }
        }
    }

    public makeVisibile(yes: boolean) {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (!(this.meshSelected instanceof AbstractMesh)) {
            return "not a mesh. just a transformnode";
        }
        var mesh = this.meshSelected;
        if (yes) {
            if (Tags.HasTags(mesh) && Tags.MatchesQuery(mesh, "invisible")) {
                Tags.RemoveTagsFrom(this.meshSelected, "invisible")
                this.meshSelected.isVisible = true;
                this.meshSelected.isPickable = true;
                if (this.showingAllInvisibles)
                    this.unHighLight(mesh);
            }
        }
        else {
            Tags.AddTagsTo(this.meshSelected, "invisible");
            if (this.showingAllInvisibles) {
                if (this.meshSelected instanceof InstancedMesh) this.meshSelected.isVisible = false;
                else this.meshSelected.visibility = 0.5;
                this.highLight(mesh);
                this.meshSelected.isPickable = true;
            } else {
                this.meshSelected.isVisible = false;
                this.meshSelected.isPickable = false;
            }
        }
    }
    public isVisible(): boolean {
        if (Tags.HasTags(this.meshSelected)) {
            if (Tags.MatchesQuery(this.meshSelected, "invisible")) {
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
                    this.highLight(mesh);
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
                        this.unHighLight(mesh);
                        mesh.isPickable = false;
                    }
                }
            }
        }
    }

    public toggleBoundingBox() {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (!(this.meshSelected instanceof AbstractMesh)) {
            return "not a mesh. just a transformnode";
        }
        console.log("bbox " + this.meshSelected.showBoundingBox)
        this.meshSelected.showBoundingBox = !this.meshSelected.showBoundingBox;

    }

    private _filterOutChilds(tns: Array<TransformNode>): Array<TransformNode> {
        let tns2: Array<TransformNode> = new Array<TransformNode>();
        for (let tn of tns) {
            if (tn.parent == null) tns2.push(tn);
        }
        return tns2;

    }

    public makeParent(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if ((this.meshesPicked == null) || (this.meshesPicked.length === 0)) {
            return "select atleast two mesh. use \'ctl\' and mouse left click to select multiple meshes";
        }

        //only parent meshes which have no parent
        let tns: Array<TransformNode> = new Array<TransformNode>();
        for (let tn of this.meshesPicked) {
            if (tn.parent == null) tns.push(tn);
            else this.unHighLight(tn);
        }

        this.meshSelected.computeWorldMatrix(true);
        var invParentMatrix: Matrix = Matrix.Invert(this.meshSelected.getWorldMatrix());
        var m: Matrix;
        for (let mesh of tns) {
            try {
                mesh.computeWorldMatrix(true);
                if (mesh === this.meshSelected.parent) {
                    m = this.meshSelected.getWorldMatrix();
                    if (this.meshSelected.rotationQuaternion == null) this.meshSelected.rotationQuaternion = Quaternion.Identity();
                    m.decompose(this.meshSelected.scaling, this.meshSelected.rotationQuaternion, this.meshSelected.position);
                    this.meshSelected.parent = null;
                }
                if (mesh !== this.meshSelected) {

                    this.unHighLight(mesh);
                    m = mesh.getWorldMatrix().multiply(invParentMatrix);
                    if (mesh.rotationQuaternion == null) mesh.rotationQuaternion = Quaternion.Identity();
                    m.decompose(mesh.scaling, mesh.rotationQuaternion, mesh.position);
                    mesh.parent = this.meshSelected;

                }
            } catch (e) {
                console.error("was not able to parent " + mesh.id + " - " + mesh.name);
                console.error(e);
            }

        }
        this.unHighLight(this.meshSelected);
        this.meshesPicked = null;
        return null;
    }

    public removeParent(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (this.meshSelected.parent == null) {
            return "this mesh has no parent";
        }
        var m: Matrix = this.meshSelected.getWorldMatrix();
        m.decompose(this.meshSelected.scaling, this.meshSelected.rotationQuaternion, this.meshSelected.position);
        this.meshSelected.parent = null;
        return "parent removed";
    }

    public removeChildren(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        var mesh: Mesh = <Mesh>this.meshSelected;
        var children: AbstractMesh[] = <AbstractMesh[]>mesh.getChildren();
        if (children.length === 0) {
            return "this mesh has no children";
        }
        var m: Matrix;
        var i: number = 0;

        for (let child of children) {
            try {
                m = child.getWorldMatrix();
                if (child.rotationQuaternion == null) child.rotationQuaternion = Quaternion.Identity();
                m.decompose(child.scaling, child.rotationQuaternion, child.position);
                child.parent = null;
                i++;
            } catch (e) {
                console.error("was not able to remove child " + child.id + " - " + child.name);
                console.error(e);
            }
        }

        return i + " children removed";
    }

    public clone_mesh(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        var clonedMeshesPicked: Array<TransformNode> = new Array<TransformNode>();
        var clone: TransformNode;
        //check if multiple meshes selected. If yes clone all except the last
        if (this.meshesPicked != null) {
            for (let mesh of this.meshesPicked) {
                if (mesh !== this.meshSelected) {
                    if ((mesh.parent != null)) {
                        //If the mesh parent is already in the selection then when it is cloned this mesh will
                        //also be cloned. So no need to clone it now.
                        //TODO what about ancestors!!
                        if ((mesh.parent == this.meshSelected) || this.meshesPicked.indexOf(<AbstractMesh>mesh.parent) >= 0) {
                            this.unHighLight(mesh);
                            continue;
                        }
                    }
                    if (!(mesh != null && mesh instanceof InstancedMesh)) {
                        clone = this.clonetheMesh(mesh);
                        clonedMeshesPicked.push(clone);
                    }
                }
            }
        }
        //TODO what if mesh selected is a child or grandchild of another selected mesh!!
        clone = this.clonetheMesh(this.meshSelected);
        if (this.meshesPicked != null) {
            clonedMeshesPicked.push(clone);
            this.meshesPicked = clonedMeshesPicked;
        }
        this.switchEditControl(clone);
        return null;
    }



    public clonetheMesh(mesh: TransformNode): TransformNode {

        var name: string = this.uid(mesh.name);
        //TODO should clone the children too.
        //TODO to do that make sure the children are also not selected
        //let clone: AbstractMesh=mesh.clone(name,null,true);
        let clone: TransformNode = mesh.clone(name, null, false);
        clone.scaling.copyFrom(mesh.scaling);
        delete clone["sensors"];
        delete clone["actuators"];
        //console.log(mesh);
        //console.log(clone);

        this.animateMesh(clone);
        //TODO think
        //clone.receiveShadows = true;
        this.unHighLight(mesh);
        if (clone instanceof AbstractMesh) {
            this._addToShadowCasters(clone);
        }
        return clone;
    }

    //play a small scaling animation when cloning or instancing a mesh.
    private animateMesh(mesh: TransformNode, scale?: number): void {
        //if (!(mesh instanceof AbstractMesh)) return;
        if (scale == null) scale = 1.5;
        let startScale: Vector3 = mesh.scaling.clone().scaleInPlace(scale);
        let endScale: Vector3 = mesh.scaling.clone();
        Animation.CreateAndStartAnimation('boxscale', mesh, 'scaling', 10, 2, startScale, endScale, 0);
    }

    public delete_mesh(): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (this.meshesPicked != null) {
            for (let mesh of this.meshesPicked) {
                if (mesh !== this.meshSelected) {
                    this.deleteTheMesh(mesh);
                }
            }
            this.meshesPicked = null;
        }
        this.removeEditControl();
        this.deleteTheMesh(this.meshSelected);
        this.meshSelected = null;

        return null;
    }

    public deleteTheMesh(mesh: TransformNode) {
        if (mesh instanceof AbstractMesh) {
            SNAManager.getSNAManager().removeSNAs(mesh);
            this._removeFromShadowCasters(mesh);
            //check if this mesh is an SPS mesh.
            //if yes then delete the sps
            this.deleteSPS(mesh);
        }

        mesh.dispose();
        mesh == null;
    }

    public mergeMeshes_old() {
        if (this.meshesPicked != null) {
            for (let mesh of this.meshesPicked) {
                if (mesh instanceof InstancedMesh) {
                    return "some of your meshes are instance meshes. cannot merge those";
                }
            }
            this.meshesPicked.push(this.meshSelected);
            let ms: any = this.meshesPicked;
            let mergedMesh: Mesh = Mesh.MergeMeshes(<Mesh[]>ms, false);
            this.meshesPicked.pop();
            let newPivot: Vector3 = this.meshSelected.position.multiplyByFloats(-1, -1, -1);
            //mergedMesh.setPivotMatrix(Matrix.Translation(newPivot.x, newPivot.y, newPivot.z));
            mergedMesh.setPivotPoint(this.meshSelected.position.clone());
            //mergedMesh.computeWorldMatrix(true);
            mergedMesh.position = this.meshSelected.position.clone();
            this.switchEditControl(mergedMesh);
            this.animateMesh(mergedMesh);
            return null;
        } else {
            return "please select two or more mesh";
        }
    }
    public mergeMeshes() {
        if (this.meshesPicked != null) {
            for (let mesh of this.meshesPicked) {
                if (mesh instanceof InstancedMesh) {
                    return "some of your meshes are instance meshes. cannot merge those";
                }
                //TODO what happens when meshes have different material
                //crashes
                //                    if (mesh.material != this.meshPicked.material){
                //                        return "some of your meshes have different material. cannot merge those";
                //                    }
            }
            this.meshesPicked.push(this.meshSelected);

            let savePos: Vector3[] = new Array(this.meshesPicked.length);
            let i: number = 0;
            for (let mesh of this.meshesPicked) {
                savePos[i] = mesh.position.clone();
                i++;
                mesh.position.subtractInPlace(this.meshSelected.position);
            }

            let ms: any = this.meshesPicked;
            let mergedMesh: Mesh = Mesh.MergeMeshes(<Mesh[]>ms, false);
            i = 0;
            for (let mesh of this.meshesPicked) {
                mesh.position = savePos[i]
                i++;
            }
            this.meshesPicked.pop();
            mergedMesh.position = this.meshSelected.position.clone();
            this.switchEditControl(mergedMesh);
            this.animateMesh(mergedMesh);
            this._addToShadowCasters(mergedMesh);
            this.multiUnSelectAll();
            return null;
        } else {
            return "select two or more mesh";
        }
    }
    public csgOperation(op: string): string {

        if (this.meshesPicked != null) {
            if (!(this.meshSelected instanceof AbstractMesh && this.meshesPicked[0] instanceof AbstractMesh)) {
                return "a selection is not a mesh, is just a transformnode";
            }
            if (this.meshesPicked.length > 2) {
                return "please select only two mesh";
            }
            let csg1: CSG = CSG.FromMesh(<Mesh>this.meshSelected);
            let csg2: CSG = CSG.FromMesh(<Mesh>this.meshesPicked[0]);
            let csg3: CSG;
            if (op === "subtract") {
                csg3 = csg2.subtract(csg1);
            } else if (op === "intersect") {
                csg3 = csg2.intersect(csg1);
            } else if (op === "union") {
                csg3 = csg2.union(csg1);
            } else {
                return "invalid operation";
            }
            let name: string = (<number>new Number(Date.now())).toString();
            let newMesh: Mesh = csg3.toMesh(name, (<AbstractMesh>this.meshesPicked[0]).material, this.scene, false);
            if (this.meshesPicked[0].parent != null) {
                newMesh.parent = this.meshesPicked[0].parent;
            }

            this.multiUnSelectAll();
            this.switchEditControl(newMesh);
            this.animateMesh(newMesh);
            return null;
        } else {
            return "please select two mesh";
        }
    }

    // PHYSICS
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

    /**
     * Note: these parms will be applied by restorePhyParms()
     * when the mesh is deselected.
     * @param parms 
     */
    public setMeshPickedPhyParms(parms: PhysicsParm) {
        this.meshPickedPhyParms = parms;
    }

    //we donot want physics enabled during edit
    //so save and remove physics parms defore edit and restore them after edit.
    private savePhyParms(mesh: AbstractMesh) {
        if ((mesh.physicsImpostor === undefined) || (mesh.physicsImpostor === null)) {
            this.meshPickedPhyParms = null;
        } else {
            this.meshPickedPhyParms = new PhysicsParm();
            this.meshPickedPhyParms.type = mesh.physicsImpostor.type;
            this.meshPickedPhyParms.mass = mesh.physicsImpostor.getParam("mass");
            this.meshPickedPhyParms.friction = mesh.physicsImpostor.getParam("friction");
            this.meshPickedPhyParms.restitution = mesh.physicsImpostor.getParam("restitution");
            this.meshPickedPhyParms.disableBidirectionalTransformation = mesh.physicsImpostor.getParam("disableBidirectionalTransformation");
            mesh.physicsImpostor.dispose();
            mesh.physicsImpostor = null;
        }
    }

    /**
     * this will be called when the mesh is deselected
     */

    private restorePhyParms(mesh: AbstractMesh) {
        //reset any physics test which might have been done
        this.resetPhysics(mesh);
        if (this.meshPickedPhyParms != null) {
            mesh.physicsImpostor = new PhysicsImpostor(mesh, this.meshPickedPhyParms.type);
            mesh.physicsImpostor.setParam("mass", this.meshPickedPhyParms.mass);
            mesh.physicsImpostor.setParam("friction", this.meshPickedPhyParms.friction);
            mesh.physicsImpostor.setParam("restitution", this.meshPickedPhyParms.restitution);
            mesh.physicsImpostor.setParam("disableBidirectionalTransformation", this.meshPickedPhyParms.disableBidirectionalTransformation);
            this.meshPickedPhyParms = null;
        }
    }

    savePos: Vector3;
    saveRot: Quaternion;
    didPhysTest: boolean = false;
    public testPhysics(phyParm: PhysicsParm) {
        if (!(this.meshSelected instanceof AbstractMesh)) return;
        let mesh: AbstractMesh = <AbstractMesh>this.meshSelected;
        this.resetPhysics(mesh);
        this.didPhysTest = true;
        this.savePos = this.meshSelected.position.clone();
        this.saveRot = this.meshSelected.rotationQuaternion.clone();
        mesh.physicsImpostor = new PhysicsImpostor(mesh, phyParm.type);
        mesh.physicsImpostor.setParam("mass", phyParm.mass);
        mesh.physicsImpostor.setParam("friction", phyParm.friction);
        mesh.physicsImpostor.setParam("restitution", phyParm.restitution);
    }
    public resetPhysics(mesh: AbstractMesh) {
        if (this.didPhysTest) {
            this.didPhysTest = false;
            mesh.position.copyFrom(this.savePos);
            mesh.rotationQuaternion.copyFrom(this.saveRot);
            mesh.physicsImpostor.dispose();
            mesh.physicsImpostor = null;
        }
    }

    //MATERIAL




    public setTextURL(textID: string, textName: string) {
        let bt: Texture = <Texture>this.getTextureByID(textID);
        bt.name = textName;
        bt.updateURL(textName);
    }

    public setTextHScale(textID: string, scale: number) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        text.uScale = scale;
    }
    public getTextHScale(textID: string): string {
        let text: Texture = <Texture>this.getTextureByID(textID);
        return Number(text.uScale).toString();
    }
    public setTextVScale(textID: string, scale: number) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        text.vScale = scale;
    }
    public getTextVScale(textID: string) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        return Number(text.vScale).toString();
    }


    public setTextHO(textID: string, o: number) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        text.uOffset = o;
    }
    public getTextHO(textID: string) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        return Number(text.uOffset).toString();
    }
    public setTextVO(textID: string, o: number) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        text.vOffset = o;
    }
    public getTextVO(textID: string) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        return Number(text.vOffset).toString();
    }
    public setTextRot(textID: string, rot: number, type: string) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        rot = rot * Math.PI / 180;
        if (type == "u") {
            text.uAng = rot;
        } else if (type == "v") {
            text.vAng = rot;
        } else if (type == "w") {
            text.wAng = rot;
        }
    }
    public getTextRot(textID: string) {
        let text: Texture = <Texture>this.getTextureByID(textID);
        return Number(text.wAng * 180 / Math.PI).toString();
    }
    public getTextures(): string[] {
        let ts: BaseTexture[] = this.scene.textures;
        let ns: string[] = [];
        for (let t of ts) {
            ns.push(t.name);
        }
        return ns;
    }
    private getTextureByName(name: String): BaseTexture {
        let ts: BaseTexture[] = this.scene.textures;
        for (let t of ts) {
            if (t.name == name) return t;
        }
        return null;
    }
    private getTextureByID(id: String): BaseTexture {
        let ts: BaseTexture[] = this.scene.textures;
        for (let t of ts) {
            if (t.uid == id) return t;
        }
        return null;
    }

    public getMeshList(): Array<AbstractMesh> {
        let meshList: Array<AbstractMesh> = new Array();
        for (let mesh of this.scene.meshes) {
            if (mesh != this.ground && mesh != this.avatar && mesh != this.skybox) {

                if (this.editControl == null) meshList.push(mesh);
                else if (this.editControl.getRoot() != mesh) meshList.push(mesh);

            }
        }
        return meshList;
    }

    public getNodeList(): Array<Node> {
        let nodeList: Array<Node> = new Array();
        for (let rootNode of this.scene.rootNodes) {
            if (rootNode != this.ground && rootNode != this.avatar && rootNode != this.skybox) {

                if (this.editControl == null) nodeList.push(rootNode);
                else if (this.editControl.getRoot() != rootNode) nodeList.push(rootNode);

            }
        }
        return nodeList;
    }

    public selectMesh(meshId: string) {
        let mesh: TransformNode = this.scene.getTransformNodeByUniqueID(Number(meshId));
        if (mesh == null) mesh = this.scene.getMeshByUniqueID(Number(meshId));
        if (mesh == null) {
            return;
        }
        if (!this.isMeshSelected) {
            this.selectForEdit(mesh);
        } else {
            this.switchEditControl(mesh);
        }

    }

    public selectGround(): boolean {
        if (this.ground == null) {
            DialogMgr.showAlertDiag("no ground found");
            return false;

        }
        if (!this.isMeshSelected) {
            this.selectForEdit(this.ground);
        } else {
            this.switchEditControl(this.ground);
        }
        this.ground.unfreezeWorldMatrix();
        return true;
    }

    public unSelectGrnd() {
        this.removeEditControl();
    }


    //
    // LIGHTS

    /*
     * Checks if the selected Mesh has any lights attached
     * if yes then returns that light 
     * else return null
     */
    public getAttachedLight(): LightParm {
        var childs: Node[] = this.meshSelected.getDescendants();
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

        if (light instanceof SpotLight) {
            lightParm.type = "Spot"
            lightParm.angle = light.angle;
            lightParm.exponent = light.exponent;
        }
        if (light instanceof PointLight) {
            lightParm.type = "Point"
        }
        if (light instanceof DirectionalLight) {
            lightParm.type = "Dir"
        }
        if (light instanceof HemisphericLight) {
            lightParm.type = "Hemi";
            lightParm.direction = light.direction;
            lightParm.gndClr = light.groundColor;
        }
        return lightParm;
    }

    public attachAlight(lightParm: LightParm) {
        this.detachLight();
        let light: Light = null;
        let name: string = this.meshSelected.name + "-light";
        if (lightParm.type === "Spot") {
            light = new SpotLight(name, Vector3.Zero(), new Vector3(0, -1, 0), lightParm.angle * Math.PI / 180, lightParm.exponent, this.scene);
        } else if (lightParm.type === "Point") {
            light = new PointLight(name, Vector3.Zero(), this.scene);
        } else if (lightParm.type === "Dir") {
            light = new DirectionalLight(name, new Vector3(0, -1, 0), this.scene);
        } else if (lightParm.type === "Hemi") {
            light = new HemisphericLight(name, lightParm.direction, this.scene);
            (<HemisphericLight>light).groundColor = lightParm.gndClr;
        }
        if (light !== null) {
            light.diffuse = lightParm.diffuse;
            light.specular = lightParm.specular;
            light.range = lightParm.range;
            light.radius = lightParm.radius;
            light.intensity = lightParm.intensity;
            light.parent = this.meshSelected;

        }
    }

    public detachLight() {
        var childs: Node[] = this.meshSelected.getDescendants();
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
        light.setEnabled(false);
        light.dispose();
    }

    public setTransOn() {
        //if scaling is on then we might have changed space to local            
        //restore space to what is was before scaling
        //            if (this.editControl.isScalingEnabled()) {
        //                this.setSpaceLocal(this.wasSpaceLocal);
        //            }
        this.editControl.setLocal(!this.spaceWorld);
        this.editControl.enableTranslation();
    }
    public isTransOn(): boolean {
        return this.editControl.isTranslationEnabled();
    }
    public setRotOn() {
        //if scaling is on then we might have changed space to local            
        //restore space to what is was before scaling
        //            if (this.editControl.isScalingEnabled()) {
        //                this.setSpaceLocal(this.wasSpaceLocal);
        //            }
        this.editControl.setLocal(!this.spaceWorld);
        this.editControl.enableRotation();
    }
    public isRotOn(): boolean {
        return this.editControl.isRotationEnabled();
    }

    //wasSpaceLocal: boolean;
    public setScaleOn() {
        //make space local for scaling
        //remember what the space was so we can restore it back later on
        //            if (!this.isSpaceLocal()) {
        //                this.setSpaceLocal(true);
        //                this.wasSpaceLocal = false;
        //            } else {
        //                this.wasSpaceLocal = true;
        //            }
        this.editControl.setLocal(true);
        this.editControl.enableScaling();
    }

    public isScaleOn(): boolean {
        return this.editControl.isScalingEnabled();
    }

    public setFocusOnMesh() {
        if (this.isFocusOnAv) {
            this.cc.stop();
            this.saveAVcameraPos.copyFrom(this.arcCamera.position);
            this.isFocusOnAv = false;
            this.avatar.visibility = 0.5;
        }
        // if (this.cameraController != null) this.cameraController.stop();
        this.focusOnMesh(this.meshSelected, 25);
    }
    /*
     * if user presses esc when focus on av then take camera off av
     * camera can be moved anywhere now
     */
    public setFocusOnNothing() {
        if (this.isFocusOnAv) {
            this.cc.stop();
            this.saveAVcameraPos.copyFrom(this.arcCamera.position);
            this.isFocusOnAv = false;
            this.avatar.visibility = 0.5;
        }
    }


    public setSpace(space: string): string {
        if (this.snapperOn) {
            return "Cannot switch space when snapper is on"
        }
        if (space === "local") {
            this.setSpaceLocal(true);
        } else {
            this.setSpaceLocal(false);
        }
        return null;
    }

    public getSpace(): string {
        if (this.isSpaceLocal()) return "local";
        else return "world";
    }
    public setSpaceLocal(yes: boolean): string {
        if ((this.editControl != null) && (!this.editControl.isScalingEnabled())) this.editControl.setLocal(yes);
        this.spaceWorld = !yes;
        return null;
    }

    public isSpaceLocal(): boolean {
        //if (this.editControl != null) return this.editControl.isLocal(); else return true;
        return !this.spaceWorld;
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
        if (isNaN(val)) return;
        this.snapTransValue = val;
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
        if (isNaN(val)) return;
        let inrad: number = val * Math.PI / 180;
        this.snapRotValue = inrad;
        this.editControl.setRotSnapValue(inrad);
    }

    public isSnapScaleOn(): boolean {
        return this.snapScaleOn;
    }
    public setSnapScaleValue(val: number) {
        if (isNaN(val)) return;
        this.snapScaleValue = val;
        this.editControl.setScaleSnapValue(val);
    }
    public snapScale(yes: boolean): string {
        if (this.snapperOn) {
            return "Cannot change snapping mode when snapper is on"
        }
        this.snapScaleOn = yes;
        if (this.editControl != null) {
            if (!this.snapScaleOn) {
                this.editControl.setScaleSnap(false);
            } else {
                this.editControl.setScaleSnap(true);
                this.editControl.setScaleSnapValue(this.snapScaleValue);
            }
        }
        return;
    }

    public snapper(yes: boolean): string {
        if (!this.spaceWorld && yes) {
            this.spaceWorld = true;
            //                this.wasSpaceLocal = false;
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
        this.editControl.setScaleSnap(true);
        this.editControl.setRotSnapValue(this.snapRotValue);
        this.editControl.setTransSnapValue(this.snapTransValue);
        this.editControl.setScaleSnapValue(this.snapScaleValue);
        this.snapToGlobal();
    }

    private setSnapperOff() {
        this.editControl.setRotSnap(false);
        this.editControl.setTransSnap(false);
        this.editControl.setScaleSnap(false);
    }

    public isSnapperOn(): boolean {
        return this.snapperOn;
    }

    private snapToGlobal() {

        if (this.isMeshSelected) {
            let tx: number = Math.round(this.meshSelected.position.x / this.snapTransValue) * this.snapTransValue;
            let ty: number = Math.round(this.meshSelected.position.y / this.snapTransValue) * this.snapTransValue;
            let tz: number = Math.round(this.meshSelected.position.z / this.snapTransValue) * this.snapTransValue;
            this.meshSelected.position = new Vector3(tx, ty, tz);

            var eulerRotation: Vector3 = this.meshSelected.rotationQuaternion.toEulerAngles();
            let rx: number = Math.round(eulerRotation.x / this.snapRotValue) * this.snapRotValue;
            let ry: number = Math.round(eulerRotation.y / this.snapRotValue) * this.snapRotValue;
            let rz: number = Math.round(eulerRotation.z / this.snapRotValue) * this.snapRotValue;
            this.meshSelected.rotationQuaternion = Quaternion.RotationYawPitchRoll(ry, rx, rz);

        }

    }

    public getSoundFiles(): string[] {
        //TODO implement this.
        return null;
        //return <string[]>this.assets["sounds"];
    }

    public anyMeshSelected(): boolean {
        return this.isMeshSelected;
    }

    public getName(): string {
        return this.meshSelected.name;
    }

    public setName(name: string) {
        this.meshSelected.name = name;
    }

    public getLocation(): Vector3 {
        return this.meshSelected.position;
    }


    //Translation
    public setLocation(valX: number, valY: number, valZ: number) {
        if (isNaN(valX) || isNaN(valY) || isNaN(valZ)) return;
        if (this.isMeshSelected) {
            this.meshSelected.position.x = valX;
            this.meshSelected.position.y = valY;
            this.meshSelected.position.z = valZ;
        }
    }

    public setRotation(valX: number, valY: number, valZ: number) {
        if (isNaN(valX) || isNaN(valY) || isNaN(valZ)) return;
        if (this.isMeshSelected) {
            Quaternion.RotationYawPitchRollToRef(valY * Math.PI / 180, valX * Math.PI / 180, valZ * Math.PI / 180, this.meshSelected.rotationQuaternion)
        }
    }
    public setScale(valX: number, valY: number, valZ: number) {
        if (isNaN(valX) || isNaN(valY) || isNaN(valZ)) return;
        if (this.isMeshSelected) {
            this.meshSelected.scaling.x = valX;
            this.meshSelected.scaling.y = valY;
            this.meshSelected.scaling.z = valZ;
        }
    }

    public getRotation(): Vector3 {
        var euler: Vector3 = this.meshSelected.rotationQuaternion.toEulerAngles();
        var r: number = 180 / Math.PI;
        var degrees: Vector3 = euler.multiplyByFloats(r, r, r);
        return degrees;
    }

    public getScale(): Vector3 {
        return this.meshSelected.scaling;
    }

    //TODO scaling doesnot effect the bounding box size
    public getSize(): Vector3 {
        if (this.meshSelected instanceof AbstractMesh) {
            let max = this.meshSelected.getBoundingInfo().boundingBox.maximum;
            let min = this.meshSelected.getBoundingInfo().boundingBox.minimum;
            return max.subtract(min).multiplyInPlace(this.meshSelected.scaling);
        } else {
            return Vector3.Zero();
        }
    }

    public bakeTransforms(): string {
        if (this.meshSelected instanceof Mesh) {
            this._bakeTransforms(<Mesh>this.meshSelected);
            return null;
        } else {
            return "cannot bake. not a mesh";
        }
    }

    public _bakeTransforms(mesh: Mesh) {
        let savePos: Vector3 = mesh.position.clone();
        mesh.position.copyFromFloats(0, 0, 0);
        mesh.bakeCurrentTransformIntoVertices();
        mesh.position = savePos;
        mesh.computeWorldMatrix(true);
    }

    public snapToGrid() {
        this._snapToGrid(this.meshSelected)
    }

    private _snapToGrid(tn: TransformNode) {
        let s = this.snapTransValue;
        if (s <= 0) return;
        let m = this.meshSelected;
        m.position.x = s * Math.round(m.position.x / s)
        m.position.y = s * Math.round(m.position.y / s)
        m.position.z = s * Math.round(m.position.z / s)
    }

    // ANIMATIONS
    public getSkelName(): string {
        if (!(this.meshSelected instanceof AbstractMesh)) return null;
        if (this.meshSelected.skeleton == null) return null; else return this.meshSelected.skeleton.name;
    }

    public getSkeleton(): Skeleton {
        if (!(this.meshSelected instanceof AbstractMesh)) return null;
        if (this.meshSelected.skeleton == null) return null; else return this.meshSelected.skeleton;
    }

    /**
     * attach an existing skeleton to a mesh
     * 
     * @param skelId 
     * @returns 
     */


    public changeSkeleton(skelId: string): boolean {
        if (!(this.meshSelected instanceof AbstractMesh)) return false;

        this.meshSelected.skeleton = this.scene.getSkeletonByUniqueId(Number(skelId));

        // if the source skeleton had an overrideMesh, in otherwords was setup
        // for playing animation groups, then set the override mesh of the
        // cloned skeleton to the mesh selected.
        //TODO overrideMesh has been removed from 5.0.0
        // if (this.meshSelected.skeleton.overrideMesh) {
        //     this.meshSelected.skeleton.overrideMesh = this.meshSelected;
        // }


        console.log(this.meshSelected.skeleton.bones);
        for (let b of this.meshSelected.skeleton.bones) {
            console.log(b.id);
        }
        let tns: TransformNode[] = this.meshSelected.getChildTransformNodes(false, (node) => {
            return !(node instanceof AbstractMesh);
        })
        console.log(tns);
        for (let tn of tns) {
            console.log(tn.id);
        }

        return true;
    }

    /**
     * clone an existing skeleton 
     * 
     * @param skelId 
     * @returns 
     */
    //TODO during save unused skeleton are dropped and ID are reassigned.
    //how do we handle that.
    public cloneSkeleton(skelId: string): boolean {

        if (!(this.meshSelected instanceof AbstractMesh)) return false;

        let skel = this.scene.getSkeletonByUniqueId(Number(skelId));
        if (skel == null) return false;

        var newId: string = (<number>new Number(Date.now())).toString();
        var clonedSkel: Skeleton = skel.clone(skel.name, newId);

        // if the source skeleton had an overrideMesh, in otherwords was setup
        // for playing animation groups, then set the override mesh of the
        // cloned skeleton to the mesh selected.
        //if (skel.overrideMesh) clonedSkel.overrideMesh = this.meshSelected;

        //this.meshSelected.skeleton = clonedSkel;


        return true;
    }

    /**
     * source skeleton - passed skel id
     * target skeleton - selected mesh's skeleton
     * 
     * link animation of each bones of source to
     * each bone of the target
     * 
     * copy (create) animation ranges on target for each one on source
     * 
     * @param skelId 
     * @returns 
     */
    public linkAnimationsToSkeleton(skelId: string): boolean {

        if (!(this.meshSelected instanceof AbstractMesh)) return false;

        let skel = this.scene.getSkeletonByUniqueId(Number(skelId));
        if (skel == null) return false;
        let fromBones: Bone[] = skel.bones;

        //link animations
        let toBones: Bone[] = this.meshSelected.skeleton.bones;
        for (let i = 0; i < fromBones.length; i++) {
            console.log(fromBones[i].name, fromBones[i].animations);
            toBones[i].animations = fromBones[i].animations;
        }

        //create animation range
        let fromAnimRanges: AnimationRange[] = skel.getAnimationRanges();
        for (let fromAnimRange of fromAnimRanges) {
            this.meshSelected.skeleton.createAnimationRange(fromAnimRange.name, fromAnimRange.from, fromAnimRange.to);
        }
        return true;
    }


    skelViewerArr: SkeletonViewer[] = [];
    public toggleSkelView(skel: Skeleton, mesh: AbstractMesh) {

        if (skel === null || mesh === null) return;
        let sv = this.findSkelViewer(this.skelViewerArr, mesh);
        if (sv === null) {
            sv = new SkeletonViewer(skel, mesh, this.scene);
            sv.isEnabled = true;
            this.skelViewerArr.push(sv);
        } else {
            this.delSkelViewer(this.skelViewerArr, sv);
            sv.dispose();
            sv = null;
        }
    }

    private findSkelViewer(sva: SkeletonViewer[], mesh: AbstractMesh): SkeletonViewer {
        for (let sv of sva) {
            if (sv.mesh === mesh) return sv;
        }
        return null;
    }
    private delSkelViewer(sva: SkeletonViewer[], sv: SkeletonViewer) {
        let i: number = sva.indexOf(sv);
        if (i >= 0) sva.splice(i, 1);
    }

    public animRest() {
        if (!(this.meshSelected instanceof AbstractMesh)) return false;
        if (this.meshSelected.skeleton === null || this.meshSelected.skeleton === undefined) return;
        this.scene.stopAnimation(this.meshSelected.skeleton);
        this.meshSelected.skeleton.returnToRest();
    }

    public createAnimRange(name: string, start: number, end: number) {
        if (!(this.meshSelected instanceof AbstractMesh)) return;
        //remove the range if it already exist
        this.meshSelected.skeleton.deleteAnimationRange(name, false);
        this.meshSelected.skeleton.createAnimationRange(name, start, end);
    }
    public delAnimRange(name: string, del: boolean) {
        if (!(this.meshSelected instanceof AbstractMesh)) return;
        //delete or remove the range
        this.meshSelected.skeleton.deleteAnimationRange(name, del);
    }

    public getAnimationRanges(): AnimationRange[] {
        if (!(this.meshSelected instanceof AbstractMesh)) return null;
        var skel: Skeleton = this.meshSelected.skeleton;
        if (skel !== null && skel !== undefined) {
            var ranges: AnimationRange[] = skel.getAnimationRanges()
            return ranges;
        } else return null;
    }

    public _debugAnimCount(skel: Skeleton) {
        var bones: Bone[] = skel.bones;
        for (let bone of bones) {
            console.log(bone.name + "," + bone.animations.length + " , " + bone.animations[0].getHighestFrame());
            console.log(bone.animations[0]);
        }
    }

    public _debugBoneChilds(skel: Skeleton) {
        var bones: Bone[] = skel.bones;
        let i = 0;
        for (let bone of bones) {
            console.log(i + "," + bone.name);
            console.log(bone.getChildMeshes());;

        }
    }
    public _addBoneSelectors(skel: Skeleton) {

        let bones: Bone[] = skel.bones;
        let mesh: Mesh = Mesh.CreateBox("box", 0.1, this.scene);
        this.createPrimMaterial();
        mesh.material = this.primMaterial
        let i = 0;
        for (let bone of bones) {
            let inst = mesh.createInstance("boneMarker-" + i);
            inst.attachToBone(bone, this.meshSelected);
            i++;
        }
    }

    public _delBoneSelectors(skel: Skeleton) {

        let bones: Bone[] = skel.bones;
        let i = 0;
        let sm: Mesh = null; //source mesh
        for (let bone of bones) {
            let markers: AbstractMesh[] = bone.getChildMeshes();
            for (let marker of markers) {
                if (marker.id.startsWith("boneMarker")) {
                    marker.detachFromBone();
                    sm = (<InstancedMesh>marker).sourceMesh;
                    marker.dispose();
                }
            }
        }
        if (sm != null) sm.dispose();
    }

    public _attach2Bone(skel: Skeleton): string {
        if (this.meshesPicked == null) {
            return "please select (CTL-MouseLeftClick) two mesh - a) bone selector b) item to attach to the bone";
        }
        if (this.meshesPicked.length > 2) {
            return "please select only two mesh";
        }

        let bm: AbstractMesh = null;
        let att: AbstractMesh = null;

        for (let mesh of this.meshesPicked) {
            if (mesh.id.startsWith("boneMarker")) {
                bm = <AbstractMesh>mesh;
            } else {
                att = <AbstractMesh>mesh;
            }
        }
        if (bm == null) {
            return "no bone selector selected";
        }
        if (att == null) {
            return "no item selected for attachment";
        }
        let boneIndex = Number(bm.id.split("-")[1]);
        let bone = skel.bones[boneIndex];
        let tn: TransformNode = new TransformNode("attacher-" + boneIndex);
        console.log(att);
        tn.attachToBone(bone, this.meshSelected);
        att.setParent(tn);
        //att.attachToBone(bone, bone.getTransformNode());
        //att.position = Vector3.Zero();
        this.multiUnSelectAll();
        this._delBoneSelectors(skel);

        return null;
    }

    //detach an item from the bone
    public _detach4Bone(skel: Skeleton): string {
        if (this.meshesPicked == null || this.meshesPicked.length == 0) {
            return "please select (CTL-MouseLeftClick) the mesh to detach";
        }
        if (this.meshesPicked.length > 1) {
            return "please select only one mesh";
        }

        let att: AbstractMesh = <AbstractMesh>this.meshesPicked[0];
        let tn: TransformNode = <TransformNode>att.parent;
        if (tn == null) {
            return "selected mesh has no parent. It is not attached to this skeleton";
        }
        if (!tn.name.startsWith("attacher-")) {
            return "selected mesh parent is not a bone attacher. It's name does not start with 'attacher-'";
        }

        var m: Matrix = att.getWorldMatrix();
        m.decompose(att.scaling, att.rotationQuaternion, att.position);
        att.parent = null;

        tn.detachFromBone();
        tn.dispose();

        this.multiUnSelectAll();

        return null;
    }

    public playAnimation(animName: string, animRate: string, loop: boolean) {
        if (!(this.meshSelected instanceof AbstractMesh)) return;
        var skel: Skeleton = this.meshSelected.skeleton;
        if (skel == null) return;
        var r: number = parseFloat(animRate);
        if (isNaN(r)) r = 1;
        skel.beginAnimation(animName, loop, r);
    }

    public stopAnimation() {
        if (!(this.meshSelected instanceof AbstractMesh)) return;
        if (this.meshSelected.skeleton == null) return;
        this.scene.stopAnimation(this.meshSelected.skeleton);
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
        var sens: Array<SensorActuator> = <Array<SensorActuator>>this.meshSelected["sensors"];
        if (sens == null) sens = new Array<SensorActuator>();
        return sens;
    }

    public getActuators(): Array<SensorActuator> {
        if (!this.isMeshSelected) {
            return null;
        }
        var acts: Array<SensorActuator> = <Array<SensorActuator>>this.meshSelected["actuators"];
        if (acts == null) acts = new Array<SensorActuator>();
        return acts;
    }

    public addSensorbyName(sensName: string): Sensor {
        if (!this.isMeshSelected) {
            return null;
        }
        return SNAManager.getSNAManager().createSensorByName(sensName, <Mesh>this.meshSelected, null);
    }

    public addActuaorByName(actName: string): Actuator {
        if (!this.isMeshSelected) {
            return null;
        }
        return SNAManager.getSNAManager().createActuatorByName(actName, <Mesh>this.meshSelected, null);
    }

    public add_sensor(sensName: string, prop: SNAproperties): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        return null;
    }

    public addActuator(actName: string, parms: SNAproperties): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        var act: Actuator;
        if (actName === "Rotator") {
            act = new ActuatorRotator(<Mesh>this.meshSelected, <ActRotatorParm>parms);
        } else if (actName === "Mover") {
            act = new ActuatorMover(<Mesh>this.meshSelected, <ActMoverParm>parms);
        } else return "No such actuator";
        return null;
    }

    public removeSensor(index: number): string {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        var sensors: Array<Sensor> = <Array<Sensor>>this.meshSelected["sensors"];
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
        var actuators: Array<Actuator> = <Array<Actuator>>this.meshSelected["actuators"];
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

    //setting sun beta (north south)
    public setSunNS(d: number) {
        this._sunBeta = d;
        this.setSunPos();
    }

    //setting sun alpha (east wes)
    public setSunEW(d: number) {
        this._sunAlpha = d;
        this.setSunPos();
    }


    private setSunPos() {
        let a: number = Math.PI * (180 - this._sunAlpha) / 180;

        let x: number = Math.cos(a);
        let y: number = Math.sin(a);
        let z: number = this._sunBeta / 100;

        this.sun.direction.x = x;
        this.sun.direction.y = y;
        this.sun.direction.z = z;

        // this.sun.direction.x = 0;
        // this.sun.direction.y = 1;
        // this.sun.direction.z = 0;

        this.sunDR.direction.x = -x;
        this.sunDR.direction.y = -y;
        this.sunDR.direction.z = -z;
    }

    private _setSunAB(v: Vector3) {
        let a: number = Math.atan2(v.y, v.x);
        this._sunAlpha = 180 - a * 180 / Math.PI;
        this._sunBeta = v.z * 100;
    }

    public getSunAlpha(): number {
        return this._sunAlpha;
    }
    public getSunBeta(): number {
        return this._sunBeta;
    }

    public setSunBright(d: number) {
        this.sunDR.intensity = d;
    }

    public getSunBright(): number {
        return this.sunDR.intensity;
    }

    public setSceneBright(d: number) {
        this.sun.intensity = d;
    }

    public getSceneBright(): number {
        return this.sun.intensity;
    }

    public setSkyBright(d: number) {
        if (this.skybox != null) this.skybox.visibility = d;
        this.scene.clearColor = this.skyColor.scale(d);
        this.skyBright = d;
    }

    public getSkyBright(): number {
        return this.skyBright
    }

    public setShade(dO: any) {
        var d: number = <number>dO;
        d = 1 - d;
        this.sun.groundColor = new Color3(d, d, d);
    }

    public getShade(): number {
        return (1 - this.sun.groundColor.r);
    }

    /**
     * change the fog slowly at first and then fast towards the end,
     * in other words exponentially.
     * @param d 
     */
    public setFog(d: number) {

        if (d != 0) {
            d = 0.00005 * Math.pow(1.08, d);
        }
        this.scene.fogDensity = d;
        //this.scene.fogStart = 10220*(1 - d/0.1);


    }

    public getFog(): number {
        //return (10220 - this.scene.fogStart )*0.1/10220;
        //return this.scene.fogDensity;
        if (this.scene.fogDensity == 0) return 0;
        let d = Math.log(this.scene.fogDensity / 0.00005) / Math.log(1.08);
        return d;
    }

    public setFogColor(fogColor: string) {
        this.scene.fogColor = Color3.FromHexString(fogColor);
    }

    public getFogColor(): string {
        return this.scene.fogColor.toHexString();
    }

    public setFov(dO: any) {
        var d: number = <number>dO;
        this.scene.activeCamera.fov = (d * 3.14 / 180);
        //this.arcCamera.fov = (d * 3.14 / 180);
    }

    public getFov(): number {
        return this.arcCamera.fov * 180 / 3.14;
    }


    public setSky(sky: any) {
        if (this.skybox == null) {
            if (sky === "none") {
                return;
            } else {
                let skyFile: string = Vishva.vHome + "assets/curated/skyboxes/" + sky + "/" + sky;
                this.skybox = this.createSkyBox(this.scene, skyFile);
            }
        } else {
            if (sky === "none") {
                this._deleteSkyBox();
                return;
            } else {
                let mat: StandardMaterial = <StandardMaterial>this.skybox.material;
                mat.reflectionTexture.dispose();
                let skyFile: string = Vishva.vHome + "assets/curated/skyboxes/" + sky + "/" + sky;
                mat.reflectionTexture = new CubeTexture(skyFile, this.scene);
                mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
            }
        }

        //TODO PBR stuff
        //            if (this.primMaterial !=null)
        //            this.primMaterial.environmentTexture = (<StandardMaterial> this.skybox.material).reflectionTexture;
    }

    public getSky(): string {
        var mat: StandardMaterial = <StandardMaterial>this.skybox.material;
        var skyname: string = mat.reflectionTexture.name;
        var i: number = skyname.lastIndexOf("/");
        return skyname.substring(i + 1);
    }

    public getAmbientColor(): string {
        return this.scene.ambientColor.toHexString();
    }
    public setAmbientColor(hex: string) {
        this.scene.ambientColor = Color3.FromHexString(hex);
    }

    public isGroundPicked(): boolean {
        if (!this.isMeshSelected) return false;
        if (this.meshSelected == this.ground) return true;
        else return false;
    }

    /*
    public setGroundColor(hex: string) {
        let sm: StandardMaterial=<StandardMaterial>this.ground.material;
        sm.diffuseColor=Color3.FromHexString(hex);
    }
    public getGroundColor(): string {
        let sm: StandardMaterial=<StandardMaterial>this.ground.material;
        return sm.diffuseColor.toHexString();
    }
    */

    //private _grndSPS: GroundSPS;
    public getGrndSPSbyID(gSpsId: string): GrndSpread {
        for (let g of this.GrndSpreads) {
            if (g.id == gSpsId) {
                return g;
            }
        }
        return null;
    }

    public createGrndSPS(): GrndSpread | string {
        let gs: GrndSpread;
        if (this.meshesPicked == null) {
            return "select a mesh to spread - use ctl-right click to select";
        } else if (this.meshesPicked.length > 1) {
            return "more than one mesh selected to spread - select only one";
        }
        let mesh: Mesh = <Mesh>this.meshesPicked[0];
        gs = new GrndSpread(mesh.name + "-SPS", this, mesh, <GroundMesh>this.ground, null);
        return gs;
    }

    public getMeshSpreadDtls(meshId: string): SpreadDtl | string {
        let gs: GrndSpread;
        let mesh: Mesh = <Mesh>this.scene.getMeshByID(meshId);
        if (mesh == null) {
            return "no mesh found with id : " + meshId;
        }
        gs = new GrndSpread(mesh.name + "-SPS", this, mesh, <GroundMesh>this.ground, null);
        return gs.getSpreadDtls();
    }

    public updateSPSArray(gs: GrndSpread) {
        if (this.GrndSpreads == null) {
            this.GrndSpreads = new Array();
        }
        this.GrndSpreads.push(gs);
    }

    /**
     * delete the sps if its underlying mesh is being deleted
     */
    public deleteSPS(mesh: AbstractMesh) {
        if (this.GrndSpreads == null) return;
        let i: number = 0;
        for (let gSps of this.GrndSpreads) {
            console.log(gSps);
            if (gSps.spsMesh == mesh) {
                console.log("removing sps");
                this.GrndSpreads.splice(i, 1);
                gSps.sps.dispose();
            }
            i++;
        }

    }
    public getGrndSPSList(): Array<{ id: string, desc: string }> {
        let sl: Array<{ id: string, desc: string }> = new Array();
        if (this.GrndSpreads == null) return sl;
        for (let gSps of this.GrndSpreads) {
            sl.push({ id: gSps.id, desc: gSps.name });
        }
        return sl;
    }


    // public spreadOnGround(): string {
    //     if (!this.isMeshSelected) {
    //         return "no mesh selected";
    //     }
    //     let seed: number = Math.random() * 100;
    //     let spreadDtls: SpreadDtls = {
    //         seed: seed,
    //         step: 5,
    //         posMax: new Vector3(5, -1, 5)
    //     };
    //     let groundSPS: GroundSPS = new GroundSPS("sps", this, <Mesh>this.meshSelected, <GroundMesh>this.ground, spreadDtls);
    //     if (this.GroundSPSs == null) {
    //         this.GroundSPSs = new Array();
    //     }
    //     this.GroundSPSs.push(groundSPS);
    //     return null;
    // }


    debugVisible: boolean = false;
    public toggleDebug() {
        //if (this.scene.debugLayer.isVisible()) {
        if (this.debugVisible) {
            this.scene.debugLayer.hide();
        } else {
            //let win = window.open("", "inpsector", "width=200,height=800");
            //this.scene.debugLayer.show({ globalRoot: win.document.body, showExplorer: true, embedMode: true, overlay: false, enablePopup: true });
            this.scene.debugLayer.show({ showExplorer: true, embedMode: true, overlay: false, enablePopup: true });
        }
        this.debugVisible = !this.debugVisible;

    }

    /**
     * question: should texture location be vishav based location?
     * if meant to be used within vishva then yes
     * else no but then we should probably provide an option to save texture too
     * 
     * for now lets keep as vishva based location
     * 
     */

    public saveAsset(): string {
        if (!this.isMeshSelected) {
            return null;
        }
        //this.renameWorldTextures();
        let p: Vector3 = this.meshSelected.position.clone();
        let re: Vector3 = this.meshSelected.rotation.clone();
        let rq: Quaternion = this.meshSelected.rotationQuaternion.clone();
        this.meshSelected.position = Vector3.Zero();
        this.meshSelected.rotation = Vector3.Zero();
        var meshObj: any = SceneSerializer.SerializeMesh(this.meshSelected, false, true);
        this.meshSelected.position = p;
        this.meshSelected.rotation = re;
        this.meshSelected.rotationQuaternion = rq;
        var meshString: string = JSON.stringify(meshObj);
        var file: File = new File([meshString], "AssetFile.babylon");
        return URL.createObjectURL(file);
    }
    public saveAsset_old(): string {
        if (!this.isMeshSelected) {
            return null;
        }
        //this.renameWorldTextures();
        var clone: Mesh = <Mesh>this.meshSelected.clone(this.meshSelected.name, null, false);
        clone.position = Vector3.Zero();
        clone.rotation = Vector3.Zero();
        //var meshObj: any=SceneSerializer.SerializeMesh(clone,false);
        var meshObj: any = SceneSerializer.SerializeMesh(this.meshSelected, false, true);
        clone.dispose();
        var meshString: string = JSON.stringify(meshObj);
        var file: File = new File([meshString], "AssetFile.babylon");
        return URL.createObjectURL(file);
    }
    public saveWorld(): string {

        if (this.editControl != null) {
            DialogMgr.showAlertDiag("cannot save during edit");
            return null;
        }

        if (!this.isFocusOnAv) {
            DialogMgr.showAlertDiag("cannot save. focus is not on avatar. press esc to switch focus to avatar and try again");
            return null;
        }

        this.removeInstancesFromShadow();
        this.renameMeshIds();
        this.cleanupSkels();
        this.resetSkels(this.scene);
        //this.cleanupMats();
        //this.renameWorldTextures();

        let vishvaSerialzed = new VishvaSerialized(this);
        vishvaSerialzed.bVer = Engine.Version;
        vishvaSerialzed.vVer = Vishva.version;

        vishvaSerialzed.settings.cameraCollision = this._cameraCollision;
        vishvaSerialzed.settings.autoEditMenu = this.autoEditMenu;

        vishvaSerialzed.guiSettings = this.vishvaGUI.guiSettings;

        vishvaSerialzed.misc.activeCameraTarget = this.arcCamera.target;
        vishvaSerialzed.misc.skyColor = this.skyColor;
        vishvaSerialzed.misc.skyBright = this.skyBright;

        //serialize sna before scene
        //we might add tags to meshes in scene during sna serialize.
        //if we serialize scene before then we would miss those
        //var snaObj: Object = SNAManager.getSNAManager().serializeSnAs(this.scene);
        vishvaSerialzed.snas = <SNAserialized[]>SNAManager.getSNAManager().serializeSnAs(this.scene);

        let sceneObj: Object = <Object>SceneSerializer.Serialize(this.scene);
        //this.changeSoundUrl(sceneObj);
        this.removeSounds(sceneObj);

        //sceneObj["VishvaSNA"] = snaObj;
        sceneObj["VishvaSerialized"] = vishvaSerialzed;

        let sceneString: string = JSON.stringify(sceneObj);
        //var file: File = new File([sceneString], "WorldFile.babylon");
        let blob = new Blob([sceneString], { type: "octet/stream" });
        this.addInstancesToShadow();
        //return URL.createObjectURL(file);
        return URL.createObjectURL(blob);
    }


    private removeInstancesFromShadow() {
        var meshes: AbstractMesh[] = this.scene.meshes;
        for (let mesh of meshes) {
            if (mesh != null && mesh instanceof InstancedMesh) {
                this._removeFromShadowCasters(mesh);
            }
        }
    }

    private _removeFromShadowCasters(mesh: AbstractMesh) {
        var shadowMeshes: Array<AbstractMesh> = this.shadowGenerator.getShadowMap().renderList;
        var i: number = shadowMeshes.indexOf(mesh);
        if (i >= 0) {
            shadowMeshes.splice(i, 1);
        }
    }

    private _addToShadowCasters(mesh: AbstractMesh) {
        if ((<Mesh>mesh).geometry != null)
            (this.shadowGenerator.getShadowMap().renderList).push(mesh);

        //TODO think
        //mesh.receiveShadows = true;
    }


    private addInstancesToShadow() {
        for (let mesh of this.scene.meshes) {
            if (mesh != null && mesh instanceof InstancedMesh) {
                this._addToShadowCasters(mesh);
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
        for (let mesh of this.scene.meshes) {
            mesh.id = (<number>new Number(i)).toString();
            i++;
        }
    }

    /**
     * resets each skel.assign. unique id to each skeleton. deserialization uses
     * skeleton id to associate skel with mesh. if id isn't unique wrong skels
     * could get assigned to a mesh.
     * 
     * @param scene
     */
    private resetSkels(scene: Scene) {
        var i: number = 0;
        for (let skel of scene.skeletons) {
            skel.id = (<number>new Number(i)).toString();
            i++;
            skel.returnToRest();
        }
    }

    private renameWorldTextures() {
        var mats: Material[] = this.scene.materials;
        this.renameWorldMaterials(mats);
        var mms: MultiMaterial[] = this.scene.multiMaterials;
        for (let mm of mms) {
            this.renameWorldMaterials(mm.subMaterials);
        }
    }

    private renameWorldMaterials(mats: Material[]) {
        var sm: StandardMaterial;
        for (let mat of mats) {
            if (mat != null && mat instanceof StandardMaterial) {
                sm = <StandardMaterial>mat;
                this.rename(sm.diffuseTexture);
                this.rename(sm.reflectionTexture);
                this.rename(sm.opacityTexture);
                this.rename(sm.specularTexture);
                this.rename(sm.bumpTexture);
                this.rename(sm.ambientTexture);

            }
        }
    }

    public rename(bt: BaseTexture) {
        if (bt == null) return;
        console.log("renaming " + bt.name);
        //bt.name=this.RELATIVE_ASSET_LOCATION+bt.name;
        bt.name = this.RELATIVE_ASSET_LOCATION + (<Texture>bt).url;
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
                //TODO need to verify this
                //sound["url"] = this.RELATIVE_ASSET_LOCATION + this.SOUND_ASSET_LOCATION + sound["url"];
                sound["url"] = this.SOUND_ASSET_LOCATION + sound["url"];
            }
            //sceneObj["sounds"] = soundList;
        }
    }
    /**
     * there seems to be some issue with sounds attached to mesh "instances"
     * they donot deserialze properly
     */
    private removeSounds(sceneObj: Object) {
        var sounds = sceneObj["sounds"];
        if (sounds != null) {
            sceneObj["sounds"] = [];
        }

    }

    /**
     * remove all materials not referenced by any mesh
     * TODO do we really want to do this?. Materila might be needed later on.
     */
    private cleanupMats() {
        var meshes: AbstractMesh[] = this.scene.meshes;
        var mats: Array<Material> = new Array<Material>();
        var mms: Array<MultiMaterial> = new Array<MultiMaterial>();
        for (let mesh of meshes) {
            if (mesh.material != null) {
                if (mesh.material != null && mesh.material instanceof MultiMaterial) {
                    var mm: MultiMaterial = <MultiMaterial>mesh.material;
                    mms.push(mm);
                    var ms: Material[] = mm.subMaterials;
                    for (let mat of ms) {
                        mats.push(mat);
                    }
                } else {
                    mats.push(mesh.material);
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
     *  TODO do we really want to do this?. Skeleton might be needed later on.
     * 
     */
    private cleanupSkels() {
        var meshes: AbstractMesh[] = this.scene.meshes;
        var skels: Array<Skeleton> = new Array<Skeleton>();
        for (let mesh of meshes) {
            if (mesh.skeleton != null) {
                skels.push(mesh.skeleton);
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

    //older, used by old GUI file loader dislog
    public loadAssetFile(file: File) {
        var sceneFolderName: string = file.name.split(".")[0];
        SceneLoader.ImportMesh("", Vishva.vHome + "assets/" + sceneFolderName + "/", file.name, this.scene, (meshes, particleSystems, skeletons, animationGroups) => { return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, "", "") });
    }

    filePath: string;

    file: string;

    /**
     * used to load internal/curated assets
     * 
     * @param assetType 
     * @param file 
     */
    public loadCurAsset(assetType: string, file: string) {
        console.log("loading curated");
        this.filePath = assetType;
        this.file = file;
        let fileName: string = file.split(".")[0];
        SceneLoader.ImportMesh("",
            Vishva.vHome + "assets/curated/" + assetType + "/" + fileName + "/",
            file,
            this.scene,
            (meshes, particleSystems, skeletons, animationGroups) => { return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file, "curated") });
    }

    /**
     * used to load user assets
     * 
     * @param path 
     * @param file 
     */

    public loadUserAsset1(path: string, file: string) {
        this.filePath = path;
        this.file = file;
        SceneLoader.ImportMesh("",
            Vishva.vHome + "assets/" + path,
            file,
            this.scene,
            (meshes, particleSystems, skeletons, animationGroups) => { return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file, "user") });
    }

    public loadUserAsset(path: string, file: string) {
        this.filePath = path;
        this.file = file;
        SceneLoader.LoadAssetContainer(
            Vishva.vHome + "assets/" + path,
            file,
            this.scene,
            (assets: AssetContainer) => {
                let meshes = assets.meshes;
                let particleSystems = assets.particleSystems;
                let skeletons = assets.skeletons;
                let animationGroups = assets.animationGroups;
                assets.addAllToScene();
                return this.onMeshLoaded(meshes, particleSystems, skeletons, animationGroups, file, "user")
            });
    }

    public loadUserAsset3(path: string, file: string) {
        this.filePath = path;
        this.file = file;
        SceneLoader.Append(
            Vishva.vHome + "assets/" + path,
            file,
            this.scene,
            (scene) => {
                console.log("scene loaded");
            });
    }




    //TODO if mesh created using Blender (check producer == Blender, find all skeleton animations and increment "from frame"  by 1

    /*
     * if multiple meshes and more than one are parentless then create a empty mesh and add all the parentless meshes to 
     * it as childs.
     * if just one mesh or just on root mesh then just add them to scene
     */


    private onMeshLoaded(meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[], file: string, assetType: string) {
        console.log("loading meshes " + file);


        for (let s of skeletons) {
            this.scene.stopAnimation(s);
        }

        for (let ag of animationGroups) {
            ag.stop();
        }


        if (file.split(".")[1] == "obj") {
            this._fixObj(meshes);
        }

        //this._fixGLB(meshes);

        let _rootMeshesCount: number = 0;
        let rootMesh: TransformNode = null;
        for (let mesh of meshes) {

            mesh.isPickable = true;

            if (mesh.parent == null) {
                _rootMeshesCount++;
                rootMesh = <Mesh>mesh;
            }

            this._addToShadowCasters(mesh);

            //no need to rename, 3.1 version seems to preserve the texture img urls
            //this._renameTextures(mesh);

            this.scene.stopAnimation(mesh);
            if (mesh.skeleton != null) {
                this.scene.stopAnimation(mesh.skeleton);
                this.avManager.fixAnimationRanges(mesh.skeleton);
            }


        }
        /*
        if multiple meshes then create a empty root mesh, place it in front of the avatar
        and add all other meshes as children to this.
        else if just one mesh add that in front of avatar
        */
        if (_rootMeshesCount > 1) {

            rootMesh = new TransformNode(file, this.scene, true);

            //cannot instance mesh without geometry
            //so create a small mesh
            //rootMesh = Mesh.CreatePlane("root-" + this.uid(), 0.01, this.scene);
            //rootMesh = new Mesh("root-" + this.uid(), this.scene);

            for (let mesh of meshes) {
                if (mesh.parent == null) {
                    mesh.parent = rootMesh;
                }
            }

        } else {
            if (rootMesh != null) {
                if (rootMesh.name === "__root__") {
                    rootMesh.name = file;
                }
            }
        }


        // if a rootmesh was created before then scaling will not happen
        // as we didnot add the rootmesh (a TransformNode) to the meshes array (Array of AbstractMesh)
        // and thus are not passing that rootmesh below. all other meshes now have a parent (the rootmesh).
        // Hences we should not do scaling in postLoad
        this._postLoad(meshes, assetType);

        let boundingRadius: number = this.getBoundingRadius(meshes);
        //bounding radius doesnot seem to change with scale (radius or radiusWorld give same result)

        let scaling = false;
        let sf: Vector3;
        if (curatedConfig["scale"]) {
            scaling = true;
            sf = new Vector3();
            sf.x = Number(curatedConfig["scale"][0]);
            sf.y = Number(curatedConfig["scale"][1]);
            sf.z = Number(curatedConfig["scale"][2]);
            if (rootMesh != null) {
                rootMesh.scaling.multiplyInPlace(sf);
                //for bounding we will assume, for now, that scaling is same in all three dimensions
                boundingRadius = boundingRadius * sf.x;
            }
        }

        let bb: { max, min } = rootMesh.getHierarchyBoundingVectors()

        //rootmesh location wrt min = - bb.min

        // 2 m in front of av
        let placementLocal: Vector3 = new Vector3(0, 0, -10);
        let placementGlobal: Vector3 = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());

        //let placementLocal: Vector3 = new Vector3(0, 0, -(boundingRadius + 2));
        //let placementGlobal: Vector3 = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
        if (rootMesh != null) {
            rootMesh.position.addInPlace(placementGlobal);
            rootMesh.position.subtractInPlace(bb.min);

            if (!this.isMeshSelected) {
                this.selectForEdit(rootMesh);
            } else {
                this.switchEditControl(rootMesh);
            }
            this.rootSelected = true;
            this.animateMesh(rootMesh);
        }

        EventManager.publish(VEvent._WORLD_ITEMS_CHANGED);
    }

    private _fixGLB(meshes: AbstractMesh[]) {
        for (let mesh of meshes) {
            console.log(mesh.name);
            if (mesh.name === "__root__") {
                console.log("found glb");
                let childs: AbstractMesh[] = mesh.getChildMeshes();
                for (let child of childs) {
                    mesh.removeChild(child);
                    this._reverseAxis(<Mesh>child);
                }
                mesh.dispose();
            }
        }
    }

    private _fixObj(meshes: AbstractMesh[]) {
        console.log("fixing obj");
        let a: Mesh;
        let s: Vector3;
        for (let mesh of meshes) {
            if (mesh.parent != null) continue;

            //this._switchXZ2(<Mesh>mesh);
            // this._reverseAxis(mesh);

            s = mesh.scaling;
            s.z = -s.z;
            //mesh.scaling = s.multiplyByFloats(3.0, 3.0, 3.0);
            this._bakeTransforms(<Mesh>mesh);

        }
    }

    //https://www.html5gamedevs.com/topic/33907-altering-the-vertices-of-an-imported-mesh/
    private _switchXZ(mesh: AbstractMesh) {

        console.log(mesh.name);
        let positions = mesh.getVerticesData(VertexBuffer.PositionKind);

        let numberOfVertices = positions.length / 3;
        console.log("vertices " + numberOfVertices);
        let z: number;
        for (var i = 0; i < numberOfVertices; i++) {
            // z = positions[i * 3 + 2];
            // positions[i * 3 + 2] = positions[i * 3 + 0];
            // positions[i * 3 + 0] = z;
            positions[i * 3 + 2] = -positions[i * 3 + 2];

        }

        let x2 = 0, y2 = 0, z2 = 0, j = 0;
        let numOfTriags = numberOfVertices / 3;
        for (var i = 0; i < numOfTriags; i++) {
            j = i * 9;
            x2 = positions[j + 3];
            y2 = positions[j + 4];
            z2 = positions[j + 5];

            positions[j + 3] = positions[j + 6];
            positions[j + 4] = positions[j + 7];
            positions[j + 5] = positions[j + 8];

            positions[j + 6] = x2;
            positions[j + 7] = y2;
            positions[j + 8] = z2;

        }
        //mesh.updateVerticesData(VertexBuffer.PositionKind, positions,true);
        mesh.setVerticesData(VertexBuffer.PositionKind, positions, true);


        // let normals = mesh.getVerticesData(VertexBuffer.NormalKind);
        // let numberOfNormals = normals.length / 3;
        // console.log("normals " + numberOfNormals);
        // for (var i = 0; i < numberOfNormals; i++) {
        //     // z = normals[i * 3 + 2];
        //     // normals[i * 3 + 2] = normals[i * 3 + 0];
        //     // normals[i * 3 + 0] = z;
        //     normals[i * 3 + 2] = -normals[i * 3 + 2];
        // }
        // //mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
        // mesh.setVerticesData(VertexBuffer.NormalKind, normals, true);

    }

    private _switchXZ2(mesh: Mesh) {

        let positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        let normals = mesh.getVerticesData(VertexBuffer.NormalKind);

        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals, true);

        mesh.updateMeshPositions((positions) => {
            let numberOfVertices = positions.length / 3;
            console.log("vertices " + numberOfVertices);
            let z: number;
            for (var i = 0; i < numberOfVertices; i++) {
                positions[i * 3 + 2] = -positions[i * 3 + 2];
            }

            // let x2 = 0, y2 = 0, z2 = 0, j = 0;
            // let numOfTriags = numberOfVertices / 3;
            // for (var i = 0; i < numOfTriags; i++) {
            //     j = i * 9;
            //     x2 = positions[j + 3];
            //     y2 = positions[j + 4];
            //     z2 = positions[j + 5];

            //     positions[j + 3] = positions[j + 6];
            //     positions[j + 4] = positions[j + 7];
            //     positions[j + 5] = positions[j + 8];

            //     positions[j + 6] = x2;
            //     positions[j + 7] = y2;
            //     positions[j + 8] = z2;
            // }

        }, true);





    }

    /**
     * interchange the y & z axis to change fro RHS to LHS
     * @param mesh 
     */

    private _reverseAxis(mesh: AbstractMesh) {
        let positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        let numberOfVertices = positions.length / 3;
        let z: number;
        for (var i = 0; i < numberOfVertices; i++) {
            z = positions[i * 3 + 2];
            positions[i * 3 + 2] = positions[i * 3 + 1];
            positions[i * 3 + 1] = z;
            //positions[i * 3 + 2] = -positions[i * 3 + 2];
        }
        mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
        //this._bakeTransforms(mesh);

        let normals = mesh.getVerticesData(VertexBuffer.NormalKind);
        let numberOfNormals = normals.length / 3;
        for (var i = 0; i < numberOfNormals; i++) {
            z = normals[i * 3 + 2];
            normals[i * 3 + 2] = normals[i * 3 + 1];
            normals[i * 3 + 1] = z;
            //positions[i * 3 + 2] = -positions[i * 3 + 2];
        }
        mesh.updateVerticesData(VertexBuffer.NormalKind, normals);

    }

    //select and animate the last mesh loaded
    private _postLoad(meshes: AbstractMesh[], assetType: string) {
        if (meshes.length > 0) {
            for (let mesh of meshes) {

                if (assetType == "curated") {
                    if (curatedConfig["reuseMaterial"] == true && mesh instanceof Mesh) {
                        this._processMaterial(mesh, m => this._reuseMaterial(m));
                    }

                    if (curatedConfig["collision"] == true && mesh instanceof Mesh) {
                        mesh.checkCollisions = true;
                    }

                } else {
                    this._processMaterial(mesh, m => this._makeMatIdUnique(m));
                }

                //TODO one time. remove afterwards
                this._processMaterial(mesh, m => this._removeSpecular(m));
            }

        }
    }



    /*
        If a material already exist lets reuse it
        instead of creating a new material.
        This is only done for  curated assets
        The first one will be suffxed by "@cur"
    */

    private _reuseMaterial(mat: Material): Material {
        let m = this.scene.getLastMaterialByID(mat.id + "@cur");
        if (m != null) {
            mat.dispose();
            return m;
        } else {
            mat.id = mat.id + "@cur";
            return mat;
        }
    }

    /*
     * if we load the same mesh more than once than 
     * these meshes end up with the same material id.
     * 
     */
    private _makeMatIdUnique(mat: Material): Material {
        mat.id = this.uid(mat.id);
        return mat;
    }

    private _removeSpecular(m: Material) {
        if (m instanceof StandardMaterial) {
            m.specularColor = Color3.Black();
        }
        return m;
    }

    private _processMaterial(mesh: AbstractMesh, f: (mat: Material) => Material) {
        if (mesh.material != null) {
            if (mesh.material instanceof MultiMaterial) {
                var mm: MultiMaterial = <MultiMaterial>mesh.material;
                var mats: Material[] = mm.subMaterials;
                for (let i = 0; i < mats.length; i++) {
                    mats[i] = f(mats[i]);
                }
            } else {
                mesh.material = f(mesh.material);
            }
        }
    }

    /**
     * newids = oldsIds + "@" + some new unique number
     * To ensure IDs donot keep becoming large the previous old unique number
     * added after "@" is replaced with the new one
     * 
     */
    private prevUid: number = 0;
    private uidPlus = 0;
    private uid(oldId?: string): string {
        let newUid: number = Date.now();
        let ups = "";
        if (newUid == this.prevUid) {
            ups = (new Number(this.uidPlus)).toString()
            this.uidPlus++;
        } else {
            this.prevUid = newUid;
        }
        let newId: string = oldId.split("@")[0] + "@" + (Number(newUid)).toString() + ups;
        oldId.split("@")[0]
        return newId;
    }


    private _renameAssetTextures(sm: Material) {
        if (!(sm instanceof StandardMaterial)) return;
        this.renameAssetTexture(sm.diffuseTexture);
        this.renameAssetTexture(sm.reflectionTexture);
        this.renameAssetTexture(sm.opacityTexture);
        this.renameAssetTexture(sm.specularTexture);
        this.renameAssetTexture(sm.bumpTexture);
    }

    public renameAssetTexture(bt: BaseTexture) {
        if (bt == null) return;
        var textureName: string = bt.name;
        console.log("renaming " + textureName);
        // if (textureName.indexOf(this.vHome + "/") !== 0 && textureName.indexOf("../") !== 0) {
        //     //bt.name=this.vHome + "/assets/"+this.filePath+"/"+this.file.split(".")[0]+"/"+textureName;
        //     bt.name = (<Texture>bt).url;
        // }
    }

    /**
     * finds the bounding sphere radius for a set of meshes. 
     * 
     * for each mesh gets bounding radius in world scale (radiusWorld).
     * as these meshes jave just been loaded they will be located at world origin.
     * get the radius of the sphere, centered at world origin) which encloses it.
     * 
     * takes the maximum of these
     * 
     * @param meshes
     * @return
     */
    private getBoundingRadius(meshes: AbstractMesh[]): number {
        var maxRadius: number = 0;
        for (let mesh of meshes) {
            var bi: BoundingInfo = mesh.getBoundingInfo();
            var rw: number = bi.boundingSphere.radiusWorld;
            if (isFinite(rw)) {
                var r: number = rw + mesh.absolutePosition.length();
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
        //TODO Charcter Controller check implication
        // this.prevAnim = null; 
        SceneLoader.Load("worlds/" + this.sceneFolderName + "/", this.sceneData, this.engine, (scene) => { return this.sceneLoad3(scene) });
    }

    shadowGenerator: ShadowGenerator;
    avShadowGenerator: ShadowGenerator;


    public createWater() {
        console.log("creating water");

        var water: WaterMaterial = new WaterMaterial("water", <any>this.scene);
        water.backFaceCulling = true;
        water.bumpTexture = <any>new Texture(this.waterTexture, this.scene);
        //repoint the path, so that we can reload this if it is saved in scene 
        water.bumpTexture.name = this.RELATIVE_ASSET_LOCATION + water.bumpTexture.name;

        //beach
        water.windForce = -5;
        water.waveHeight = 0.5;
        //water.waterColor = new Color3(0.1, 0.1, 0.6);
        water.colorBlendFactor = 0;
        water.bumpHeight = 0.1;
        water.waveLength = 0.1;

        water.addToRenderList(this.skybox);
        //water.addToRenderList(this.ground);

        this.waterMesh = Mesh.CreateGround("waterMesh", 1024, 1024, 32, this.scene, false);
        //waterMesh.position.y = 1;
        this.waterMesh.material = <any>water;

    }

    public addWater() {
        if (!this.isMeshSelected) {
            return "no mesh selected";
        }
        if (!(this.meshSelected instanceof AbstractMesh)) return;
        var water: WaterMaterial = new WaterMaterial("water", <any>this.scene);
        water.bumpTexture = <any>new Texture(this.waterTexture, this.scene);
        water.windForce = 0.1;
        water.waveHeight = 0.1;
        //water.waterColor = new Color3(0.1, 0.1, 0.6);
        water.colorBlendFactor = 0;
        water.bumpHeight = 0;
        water.waveLength = 0;
        water.addToRenderList(this.skybox);
        this.meshSelected.material = <any>water;
    }





    private createGround(scene: Scene): Mesh {
        var groundMaterial: StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
        groundMaterial.bumpTexture = new Texture(this.groundBumpTexture, scene);

        (<Texture>groundMaterial.diffuseTexture).uScale = 6.0;
        (<Texture>groundMaterial.diffuseTexture).vScale = 6.0;
        (<Texture>groundMaterial.bumpTexture).uScale = 100.0;
        (<Texture>groundMaterial.bumpTexture).vScale = 100.0;

        groundMaterial.diffuseColor = new Color3(0.9, 0.6, 0.4);
        groundMaterial.specularColor = new Color3(0, 0, 0);
        var grnd: Mesh = Mesh.CreateGround("ground", 256, 256, 1, scene);
        grnd.material = groundMaterial;
        grnd.checkCollisions = true;
        grnd.isPickable = false;
        Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
        grnd.freezeWorldMatrix();
        grnd.receiveShadows = true;
        if (this.enablePhysics) {
            grnd.physicsImpostor = new PhysicsImpostor(grnd, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, this.scene);
        }
        this.ground = grnd;
        return grnd;
    }

    private _createPlaneGround(scene: Scene): Mesh {
        var groundMaterial: StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMaterial.diffuseColor = new Color3(0.25, 0.45, 0.18);
        groundMaterial.specularColor = new Color3(0, 0, 0);

        var grnd: Mesh = Mesh.CreateGround("ground", 256, 256, 1, scene);
        grnd.material = groundMaterial;
        grnd.checkCollisions = true;
        grnd.isPickable = false;
        Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
        grnd.freezeWorldMatrix();
        grnd.receiveShadows = true;
        if (this.enablePhysics) {
            grnd.physicsImpostor = new PhysicsImpostor(grnd, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, this.scene);
        }
        this.ground = grnd;
        return grnd;
    }

    private createGround_htmap(scene: Scene) {
        let groundMaterial: StandardMaterial = this.createGroundMaterial(scene);
        MeshBuilder.CreateGroundFromHeightMap("ground", this.groundHeightMap, {
            width: 256,
            height: 256,
            //                width: 10240,
            //                height: 10240,
            minHeight: 0,
            maxHeight: 20,
            //                minHeight: 0,
            //                maxHeight: 1000,
            subdivisions: 32,
            updatable: false,
            onReady: (grnd: GroundMesh) => {
                console.log("ground created");
                grnd.material = groundMaterial;
                grnd.checkCollisions = true;
                grnd.isPickable = false;
                Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");

                grnd.receiveShadows = true;

                //HeightmapImpostor doesnot seem to work.
                //                    if(this.enablePhysics) {
                //                        grnd.physicsImpostor=new BABYLON.PhysicsImpostor(grnd,BABYLON.PhysicsImpostor.HeightmapImpostor,{mass: 0,restitution: 0.1},this.scene);
                //                    }
                grnd.freezeWorldMatrix();
                this.ground = grnd;
                this.spawnPosition.y = grnd.getHeightAtCoordinates(0, 0) + 5;
                if (this.avatar != null) {
                    this.avatar.position = this.spawnPosition;
                }
            }

        }, scene);
    }

    private createGroundMaterial(scene: Scene): StandardMaterial {
        let groundMaterial: StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
        groundMaterial.bumpTexture = new Texture(this.groundBumpTexture, scene);

        //            (<Texture> groundMaterial.diffuseTexture).uScale = 6.0;
        //            (<Texture> groundMaterial.diffuseTexture).vScale = 6.0;
        (<Texture>groundMaterial.diffuseTexture).uScale = 25.0;
        (<Texture>groundMaterial.diffuseTexture).vScale = 25.0;
        (<Texture>groundMaterial.bumpTexture).uScale = 50.0;
        (<Texture>groundMaterial.bumpTexture).vScale = 50.0;
        //groundMaterial.diffuseColor=new Color3(0.9,0.6,0.4);
        groundMaterial.specularColor = new Color3(0, 0, 0);
        return groundMaterial;
    }

    private onDataMapReady(map: number[] | Float32Array, subX: number, subZ: number) {
        let normal = new Float32Array(map.length);
        DynamicTerrain.ComputeNormalsFromMapToRef(map, subX, subZ, normal);

        let parms = {
            mapData: map,
            mapSubX: subX,
            mapSubZ: subZ,
            mapNormals: normal,
            terrainSub: 120
        };
        let terrain: DynamicTerrain = new DynamicTerrain("t", parms, <any>this.scene);

        let mat: StandardMaterial = new StandardMaterial("tm", this.scene);
        //mat.diffuseTexture=new Texture(this.terrainTexture, this.scene);

        mat.diffuseTexture = new Texture(this.groundTexture, this.scene);
        (<Texture>mat.diffuseTexture).uScale = 6.0;
        (<Texture>mat.diffuseTexture).vScale = 6.0;
        mat.bumpTexture = new Texture(this.groundBumpTexture, this.scene);
        (<Texture>mat.bumpTexture).uScale = 64.0;
        (<Texture>mat.bumpTexture).vScale = 64.0;
        mat.specularColor = Color3.Black();
        mat.diffuseColor = new Color3(0.9, 0.6, 0.4);

        terrain.mesh.material = <any>mat;

        // compute the UVs to stretch the image on the whole map
        terrain.createUVMap();
        terrain.update(true);
        terrain.mesh.checkCollisions = true;
        this.ground = <any>terrain.mesh;
        Tags.AddTagsTo(this.ground, "Vishva.ground Vishva.internal");
    }

    private creatDynamicTerrain() {
        let dmOptions = {
            width: 1024,
            height: 1024,
            subX: 512,
            subZ: 512,
            minHeight: 0,
            maxHeight: 10,
            offsetX: 0,
            offsetZ: 0,
            onReady: (map: number[] | Float32Array, subX: number, subZ: number) => { this.onDataMapReady(map, subX, subZ); }
        }
        let mapData: Float32Array = new Float32Array(512 * 512 * 3);
        //            DynamicTerrain.CreateMapFromHeightMapToRef(this.terrainHeightMap,
        //                dmOptions,mapData,this.scene);
        DynamicTerrain.CreateMapFromHeightMapToRef(this.groundHeightMap,
            dmOptions, mapData, <any>this.scene);
    }

    private createSkyBox(scene: Scene, skyFile: string): Mesh {


        var skyboxMaterial: StandardMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skyboxMaterial.reflectionTexture = new CubeTexture(skyFile, scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;


        var skybox: Mesh = Mesh.CreateBox("skyBox", 10000.0, scene);
        //var skybox: Mesh=Mesh.CreateSphere("skybox",4,10000,scene);
        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;
        skybox.renderingGroupId = 0;
        skybox.isPickable = false;
        //skybox.position.y=-100;

        //as the light becomes dim make the sybox less visible, more transparent
        //show the sky's "clear color" which also becomes darker as the light dims
        skybox.visibility = this.sun.intensity;

        Tags.AddTagsTo(skybox, "Vishva.sky Vishva.internal");
        return skybox;
    }

    private _deleteSkyBox() {
        if (this.skybox == null) return;
        this.skybox.material.dispose();
        this.skybox.dispose();
        this.skybox = null;
        this.scene.clearColor = this.skyColor.scale(this.skyBright);
    }



    public toggleSnow() {
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

    public toggleRain() {
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
    private createSnowPart(): ParticleSystem {
        let part = new ParticleSystem("snow", 4000, this.scene);
        part.particleTexture = new Texture(this.snowTexture, this.scene);
        part.emitter = new Mesh("snowEmitter", this.scene, this.arcCamera);

        part.maxEmitBox = new Vector3(100, 40, 100);
        part.minEmitBox = new Vector3(-100, 40, -100);

        part.emitRate = 1000;
        part.updateSpeed = 0.005;
        part.minLifeTime = 1;
        part.maxLifeTime = 5;
        part.minSize = 0.1;
        part.maxSize = 0.5;
        part.color1 = new Color4(1, 1, 1, 1);
        part.color2 = new Color4(1, 1, 1, 1);
        part.colorDead = new Color4(0, 0, 0, 0);
        //part.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        part.gravity = new Vector3(0, -9.81, 0);
        return part;

    }



    /**
     * create a rain particle system
     */
    private createRainPart(): ParticleSystem {
        let part = new ParticleSystem("rain", 4000, this.scene);
        part.particleTexture = new Texture(this.rainTexture, this.scene);
        part.emitter = new Mesh("rainEmitter", this.scene, this.arcCamera);
        //part.emitter=new Vector3(0,40,0);
        part.maxEmitBox = new Vector3(100, 40, 100);
        part.minEmitBox = new Vector3(-100, 40, -100);
        part.emitRate = 1000;
        part.updateSpeed = 0.02;
        part.minLifeTime = 5;
        part.maxLifeTime = 10;
        part.minSize = 0.1;
        part.maxSize = 0.8;
        part.color1 = new Color4(1, 1, 1, 0.5);
        part.color2 = new Color4(0, 0, 1, 1);
        part.colorDead = new Color4(0, 0, 0, 0);
        //part.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        part.gravity = new Vector3(0, -9.81, 0);

        return part;
    }

    public createParticles(partId: string) {
        if (!(this.meshSelected instanceof AbstractMesh)) return false;
        if (this.meshSelected == null) {
            return "no mesh selected";
        }
        let part: ParticleSystem = null;
        if (partId == "fire") {
            part = this._createFirePart()
        } else if (partId == "smoke") {
            part = this._createSmokePart()
        } else {
            console.log("no particles")
        }
        if (part != null) {
            part.emitter = this.meshSelected;
            part.start();
        }
    }

    public removeParticles(partId: string) {
        if (!(this.meshSelected instanceof AbstractMesh)) return false;
        if (this.meshSelected == null) {
            return "no mesh selected";
        }
        let pss: ParticleSystem[] = <ParticleSystem[]>this.scene.particleSystems;

        for (let ps of pss) {
            if (ps.emitter == this.meshSelected) {
                if (partId === ps.name || partId === "") {
                    ps.stop();
                    ps.dispose();
                }
            }
        }

    }

    private _createFirePart(): ParticleSystem {

        // Create a particle system
        let fireSystem = new ParticleSystem("fire", 2000, this.scene);

        //Texture of each particle
        fireSystem.particleTexture = new Texture(Vishva.vBinHome + "assets/internal/particles/fire/flare.png", this.scene);

        // Where the particles come from
        // fireSystem.emitter = this.meshSelected; // the starting object, the emitter
        fireSystem.minEmitBox = new Vector3(-0.5, 1, -0.5); // Starting all from
        fireSystem.maxEmitBox = new Vector3(0.5, 1, 0.5); // To...

        // Colors of all particles
        fireSystem.color1 = new Color4(1, 0.5, 0, 1.0);
        fireSystem.color2 = new Color4(1, 0.5, 0, 1.0);
        fireSystem.colorDead = new Color4(0, 0, 0, 0.0);

        // Size of each particle (random between...
        fireSystem.minSize = 0.3;
        fireSystem.maxSize = 1;

        // Life time of each particle (random between...
        fireSystem.minLifeTime = 0.2;
        fireSystem.maxLifeTime = 0.4;

        // Emission rate
        fireSystem.emitRate = 600;

        // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
        fireSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

        // Set the gravity of all particles
        fireSystem.gravity = new Vector3(0, 0, 0);

        // Direction of each particle after it has been emitted
        fireSystem.direction1 = new Vector3(0, 4, 0);
        fireSystem.direction2 = new Vector3(0, 4, 0);

        // Angular speed, in radians
        fireSystem.minAngularSpeed = 0;
        fireSystem.maxAngularSpeed = Math.PI;

        // Speed
        fireSystem.minEmitPower = 1;
        fireSystem.maxEmitPower = 3;
        fireSystem.updateSpeed = 0.007;


        return fireSystem;
    }

    private _createSmokePart(): ParticleSystem {
        var smokeSystem = new ParticleSystem("smoke", 1000, this.scene);
        smokeSystem.particleTexture = new Texture(Vishva.vBinHome + "assets/internal/particles/smoke/flare.png", this.scene);

        smokeSystem.minEmitBox = new Vector3(-0.5, 1, -0.5); // Starting all from
        smokeSystem.maxEmitBox = new Vector3(0.5, 1, 0.5); // To...

        smokeSystem.color1 = new Color4(0.02, 0.02, 0.02, .02);
        smokeSystem.color2 = new Color4(0.02, 0.02, 0.02, .02);
        smokeSystem.colorDead = new Color4(0, 0, 0, 0.0);

        smokeSystem.minSize = 1;
        smokeSystem.maxSize = 3;

        smokeSystem.minLifeTime = 0.3;
        smokeSystem.maxLifeTime = 1.5;

        smokeSystem.emitRate = 350;

        // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
        smokeSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

        smokeSystem.gravity = new Vector3(0, 0, 0);

        smokeSystem.direction1 = new Vector3(-1.5, 8, -1.5);
        smokeSystem.direction2 = new Vector3(1.5, 8, 1.5);

        smokeSystem.minAngularSpeed = 0;
        smokeSystem.maxAngularSpeed = Math.PI;

        smokeSystem.minEmitPower = 0.5;
        smokeSystem.maxEmitPower = 1.5;
        smokeSystem.updateSpeed = 0.005;

        return smokeSystem;
    }

    private createCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
        //lets create a camera located way high so that it doesnotcollide with any terrain
        var camera: ArcRotateCamera = new ArcRotateCamera("v.c-camera", 1, 1.4, 4, new Vector3(0, 1000, 0), scene);
        //var camera: StereoscopicArcRotateCamera = new StereoscopicArcRotateCamera("v.c-camera", 1, 1.4, 4, new Vector3(0, 1000, 0), 0.005, true, scene);
        this.setCameraSettings(camera);
        camera.attachControl(canvas, true);
        if ((this.avatar !== null) && (this.avatar !== undefined)) {
            camera.target = new Vector3(this.avatar.position.x, this.avatar.position.y + 1.5, this.avatar.position.z);
            camera.alpha = -this.avatar.rotation.y - 4.69;
        }
        camera.checkCollisions = this._cameraCollision;
        camera.collisionRadius = this._cameraEllipsoid;


        Tags.AddTagsTo(camera, "Vishva.camera");
        return camera;
    }





    /**
     * called by AvAnimator actuator via sna manger
     */
    public disableAV() {
        this.cc.stop();
        (<Mesh>this.avatar).checkCollisions = false;
        this.scene.stopAnimation(this.avatar.skeleton);
        this._avDisabled = true;
    }

    public enableAV() {
        this.scene.stopAnimation(this.avatar.skeleton);
        this.cc.start();
        (<Mesh>this.avatar).checkCollisions = true;
        this._avDisabled = false;
    }


    private setCameraSettings(camera: ArcRotateCamera) {
        camera.lowerRadiusLimit = 0.25;

        camera.keysLeft = [];
        camera.keysRight = [];
        camera.keysUp = [];
        camera.keysDown = [];

        camera.panningInertia = 0.1;
        camera.inertia = 0.1;

        camera.panningSensibility = 250;
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
        this.cc.stop();
    }
    public enableKeys() {
        this.keysDisabled = false;
        if (this.isFocusOnAv) this.cc.start();
    }

    public enableCameraCollision(yesNo: boolean) {
        this._cameraCollision = yesNo;
        this.arcCamera.checkCollisions = yesNo;
        this.cc.cameraCollisionChanged();
    }

    public isCameraCollisionOn(): boolean {
        return this._cameraCollision;
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
    public trans: boolean;
    public rot: boolean;
    public scale: boolean;
    public esc: boolean;
    public shift: boolean;
    public ctl: boolean;
    public alt: boolean;
    public focus: boolean;
    public del: boolean;
    public undo: boolean;
    public redo: boolean;

    constructor() {
        this.up = false;
        this.down = false;
        this.right = false;
        this.left = false;
        this.stepRight = false;
        this.stepLeft = false;
        this.jump = false;
        this.trans = false;
        this.rot = false;
        this.scale = false;
        this.esc = false;
        this.shift = false;
        this.ctl = false;
        this.alt = false;
        this.focus = false;
        this.del = false;
        this.undo = false;
        this.redo = false;
    }
}

export class AnimData {

    public name: string;
    //loop
    public l: boolean;
    //rate
    public r: number;
    public exist: boolean = false;

    public constructor(name: string, l: boolean, r: number) {
        this.name = name;
        this.l = l;
        this.r = r;
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
    public disableBidirectionalTransformation: any;
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



