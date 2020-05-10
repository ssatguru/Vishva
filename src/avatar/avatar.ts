import { AnimationRange, SceneLoader, AbstractMesh, IParticleSystem, Mesh, Skeleton, Scene, ShadowGenerator, StandardMaterial, Tags, Vector3, Camera, ArcRotateCamera, Color3 } from "babylonjs";
import { CharacterController } from "babylonjs-charactercontroller";

export class AvManager {


    constructor(private avatarFolder: string,
        private avatarFile: string,
        private _avEllipsoid: Vector3,
        private _avEllipsoidOffset: Vector3,
        private scene: Scene,
        private shadowGenerator: ShadowGenerator,
        private spawnPosition: Vector3,
        private mainCamera: ArcRotateCamera) {
    }
    onCreated: (avatar: Mesh) => void;

    public createAvatar(onCreated: (avatar: Mesh) => void) {
        this.onCreated = onCreated;
        SceneLoader.ImportMesh("",
            this.avatarFolder,
            this.avatarFile,
            this.scene,
            (meshes, particleSystems, skeletons) => { return this.onAvatarLoaded(meshes, particleSystems, skeletons) });
    }

    private onAvatarLoaded(meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[]) {

        let avatar = <Mesh>meshes[0];

        (this.shadowGenerator.getShadowMap().renderList).push(avatar);
        //(this.avShadowGenerator.getShadowMap().renderList).push(this.avatar);
        //TODO
        //this.avatar.receiveShadows = true;

        //dispose of all OTHER meshes
        let l: number = meshes.length;
        for (let i = 1; i < l; i++) {
            meshes[i].checkCollisions = false;
            meshes[i].dispose();
        }

        let avatarSkeleton = skeletons[0];
        //dispose of all OTHER skeletons
        l = skeletons.length;
        for (let i = 1; i < l; i++) {
            skeletons[i].dispose();
        }

        this.fixAnimationRanges(avatarSkeleton);
        avatar.skeleton = avatarSkeleton;

        avatar.position = this.spawnPosition;

        avatar.checkCollisions = true;
        avatar.ellipsoid = this._avEllipsoid
        avatar.ellipsoidOffset = this._avEllipsoidOffset;
        avatar.isPickable = false;
        Tags.AddTagsTo(avatar, "Vishva.avatar");
        Tags.AddTagsTo(avatarSkeleton, "Vishva.skeleton");
        avatarSkeleton.name = "Vishva.skeleton";

        this.mainCamera.alpha = avatar.rotation.y - 4.69;

        var sm: StandardMaterial = <StandardMaterial>avatar.material;
        if (sm.diffuseTexture != null) {
            var textureName: string = sm.diffuseTexture.name;
            sm.diffuseTexture.name = this.avatarFolder + textureName;
            sm.backFaceCulling = true;
            sm.ambientColor = new Color3(0, 0, 0);
        }



        //in 3.0 need to set the camera values again
        //            this.mainCamera.radius=4;
        //            this.mainCamera.alpha=-this.avatar.rotation.y-4.69;
        //            this.mainCamera.beta = 1.4;

        this.onCreated(avatar);

    }





    /**
     * workaround for bugs in blender exporter 
     * 4.4.3 animation ranges are off by 1 
     * 4.4.4 issue with actions with just 2 frames -> from = to
     * looks like this was fixed in exporter 5.3
     * 5.3.0 aniamtion ranges again off by 1
     * TODO this should be moved to load asset function. Wrong to assume that all asset have been created using blender exporter
     * 
     * @param skel
     */
    public fixAnimationRanges(skel: Skeleton) {
        var ranges: AnimationRange[] = skel.getAnimationRanges();

        for (let range of ranges) {
            //                fix for 4.4.4
            //                if (range.from === range.to) {
            //                    console.log("animation issue found in " + range.name + " from " + range.from);
            //                    range.to++;
            //                }

            //fix for 5.3
            range.from++;

        }

    }

    //TODO persist charactercontroller settings
    public setCharacterController(cc: CharacterController) {
        this.mainCamera.lowerRadiusLimit = 1;
        this.mainCamera.upperRadiusLimit = 100;

        cc.setCameraTarget(new Vector3(0, 1.5, 0));
        cc.setIdleAnim("idle", 1, true);
        cc.setIdleJumpAnim("idleJump", 1, false);
        cc.setTurnLeftAnim("turnLeft", 0.5, true);
        cc.setTurnRightAnim("turnRight", 0.5, true);
        cc.setWalkBackAnim("walkBack", 0.5, true);
        cc.setRunJumpAnim("runJump", .5, true);
        cc.setFallAnim("fall", 2, false);
        cc.setSlideBackAnim("slideBack", 1, false);

        cc.setTurnSpeed(10);

        cc.setTurnRightKey("D");
        cc.setTurnLeftKey("A");
        cc.setStrafeRightKey("E");
        cc.setStrafeLeftKey("Q");

        cc.setStepOffset(0.5);
        cc.setSlopeLimit(30, 60);
    }
}