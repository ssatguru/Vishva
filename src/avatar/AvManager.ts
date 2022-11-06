import { AnimationRange, SceneLoader, AbstractMesh, IParticleSystem, Mesh, Node, Skeleton, Scene, ShadowGenerator, StandardMaterial, Tags, Vector3, Camera, ArcRotateCamera, Color3, Quaternion } from "babylonjs";
import { CharacterController } from "babylonjs-charactercontroller";
import { EventManager } from "../eventing/EventManager";
import { VEvent } from "../eventing/VEvent";
import { SNAManager } from "../sna/SNA";
import { AnimUtils } from "../util/AnimUtils";

export class AvManager {


    public cc: CharacterController;


    public avatarSkeleton: Skeleton;
    public isAg: boolean; //animation groups or animation ranges

    private _animBlend: number = 0.1;
    private _ff: boolean = false; //face forward

    constructor(
        public avatar: Mesh,
        private avatarFolder: string,
        private avatarFile: string,
        private _avEllipsoid: Vector3,
        private _avEllipsoidOffset: Vector3,
        public scene: Scene,
        private shadowGenerator: ShadowGenerator,
        private spawnPosition: Vector3,
        private mainCamera: ArcRotateCamera,
        private saveAVcameraPos: Vector3) {

        if (this.avatar != null) {
            this.isAg = this._isAg(this.avatar);
            this.avatarSkeleton = this.avatar.skeleton;
        }

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

        this.isAg = AnimUtils.containsAG(avatar, this.scene.animationGroups, true);

        if (!this.isAg) this.fixAnimationRanges(avatarSkeleton);

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
        this.avatar = avatar;
        this.avatarSkeleton = avatarSkeleton;
        this.avatarSkeleton.enableBlending(this._animBlend);
        this.onCreated(avatar);

    }





    /**
     * workaround for bugs in blender exporter 
     * 4.4.3 animation ranges are off by 1 
     * 4.4.4 issue with actions with just 2 frames -> from = to
     * looks like this was fixed in exporter 5.3
     * 5.3.0 aniamtion ranges again off by 1
     * TODO this should be moved to load asset function. Wrong to assume that all asset have been created using blender exporter
     * fixed in 6. grr!!!
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
    public setCharacterController(avatar: Mesh) {

        this.avatar = avatar;
        let cc = new CharacterController(this.avatar, this.mainCamera, this.scene);

        this.mainCamera.lowerRadiusLimit = 1;
        this.mainCamera.upperRadiusLimit = 100;

        // set cc from persisted settings
        cc.setCameraTarget(new Vector3(0, 1.5, 0));
        // cc.setIdleAnim("idle", 1, true);
        // cc.setIdleJumpAnim("idleJump", 0.5, false);
        // cc.setTurnLeftAnim("turnLeft", 0.5, true);
        // cc.setTurnRightAnim("turnRight", 0.5, true);
        // cc.setWalkBackAnim("walkBack", 0.5, true);
        // cc.setRunJumpAnim("runJump", .5, false);
        // cc.setFallAnim("fall", 2, false);
        // cc.setSlideBackAnim("slideBack", 1, false);

        // cc.setTurnSpeed(30);
        cc.setTurningOff(true);

        // cc.setTurnRightKey("D");
        // cc.setTurnLeftKey("A");
        // cc.setStrafeRightKey("E");
        // cc.setStrafeLeftKey("Q");

        // cc.setStepOffset(0.5);
        // cc.setSlopeLimit(60, 80);

        // cc.enableBlending(0.02);

        this.cc = cc;
        return cc;
    }


    public switchAvatar(mesh: Mesh): string {

        this.cc.stop();
        //old avatar
        SNAManager.getSNAManager().enableSnAs(this.avatar);
        this.avatar.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.avatar.rotation.y, this.avatar.rotation.x, this.avatar.rotation.z);
        this.avatar.isPickable = true;
        this.avatar.visibility = 1;
        Tags.RemoveTagsFrom(this.avatar, "Vishva.avatar");
        if (this.avatarSkeleton != null) {
            Tags.RemoveTagsFrom(this.avatarSkeleton, "Vishva.skeleton");
            this.avatarSkeleton.name = "";
        }

        //new avatar
        this.avatar = mesh;
        this.isAg = AnimUtils.containsAG(mesh, this.scene.animationGroups, true);
        let sm = AnimUtils.getMeshSkel(mesh, true);
        this.avatarSkeleton = (sm === null) ? null : sm.skel;
        Tags.AddTagsTo(this.avatar, "Vishva.avatar");
        if (this.avatarSkeleton != null) {
            Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
            this.avatarSkeleton.name = "Vishva.skeleton";
            this.avatarSkeleton.enableBlending(this._animBlend);
        }

        this.avatar.checkCollisions = true;
        this.avatar.ellipsoid = this._avEllipsoid
        this.avatar.ellipsoidOffset = this._avEllipsoidOffset
        this.avatar.isPickable = false;
        this.avatar.rotation = this.avatar.rotationQuaternion.toEulerAngles();
        this.avatar.rotationQuaternion = null;
        // the camera might have been moved around and to/from this mesh
        // we should use the new position as the camera position for the avatar.
        // we shouldnot be moving the camera back to its old postion around the old avatar
        this.saveAVcameraPos.copyFrom(this.mainCamera.position);
        // this._vishva.isFocusOnAv = true;
        // this._vishva.removeEditControl();
        SNAManager.getSNAManager().disableSnAs(<Mesh>this.avatar);

        //make character control to use the new avatar
        this.cc.setAvatar(this.avatar);
        //this.cc.setAvatarSkeleton(this.avatarSkeleton);


        //this.cc.setAnims(this.anims);
        this.cc.start();

        this._ff = false;

        EventManager.publish(VEvent._AVATAR_SWITCHED);

        return null;
    }


    public setFaceForward(b: boolean) {
        this._ff = b;
        this.cc.setFaceForward(b);
    }

    public getFaceForward(): boolean {
        return this._ff;
    }


    /**
     * skeletons animated by animation groups seem to have
     * "overrideMesh" property
     * So if any mesh in the character node hierarchy has a skeleton
     * which has an "overrideMesh" then assume we are dealing
     * with animation groups.
     * 
     */

    // private _isAg(n: Node): boolean {
    //     let root = this._root(n);
    //     let ms = root.getChildMeshes(
    //         false,
    //         (cm) => {
    //             if (cm instanceof Mesh) {
    //                 if (cm.skeleton) {
    //                     if (cm.skeleton.overrideMesh) {
    //                         return true;
    //                     }
    //                 }
    //             }
    //             return false;
    //         });
    //     if (ms.length > 0) return true; else return false;
    // }


    /**
     *  "overrideMesh" property has been removed in 5.0.0
     */


    private _isAg(n: Node): boolean {
        let root = this._root(n);
        let ms = root.getChildMeshes(
            false,
            (cm) => {
                if (cm instanceof Mesh) {
                    if (cm.skeleton) {
                        if (AnimUtils.skelDrivenByAG(cm.skeleton, this.scene)) {
                            return true;
                        }
                    }
                }
                return false;
            });
        if (ms.length > 0) return true; else return false;
    }

    private _root(tn: Node): Node {
        if (tn.parent == null) return tn;
        return this._root(tn.parent);
    }

    // this check if any of this skeleton animations is referenced by any targetedAnimation in any of the animationgroup in the scene.
    private _skelDrivenByAG(skel: Skeleton) {
        return skel.animations.some(sa => this.scene.animationGroups.some(ag => ag.children.some(ta => ta.animation == sa)));
}

}