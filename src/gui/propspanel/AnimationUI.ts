
import { Vishva } from "../../Vishva";
import { DialogMgr } from "../DialogMgr";
import { animElement } from "./AnimationML";
import {
    Skeleton,
    AnimationRange,
    AnimationGroup,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Mesh,
    Bone
} from "babylonjs";
import { AnimUtils } from "../../util/AnimUtils";
import { AbstractMesh } from "babylonjs/Meshes/abstractMesh";
import { VTreeDialog } from "../components/VTreeDialog";
import { VDiag } from "../components/VDiag";

/**
 * Provides UI for the Animation (Skeleton) tab of mesh properties
 */
export class AnimationUI {

    private _vishva: Vishva;

    private _boneSelectorDialog: VTreeDialog | null = null;
    private _boneMarker: Mesh | null = null;
    private _selectedBoneIndex: number = -1;
    private _skelShownByBoneSelector: boolean = false;

    private _arSelect: HTMLSelectElement = null;
    private _animRate: HTMLInputElement;
    private _animLoop: HTMLInputElement;

    private _agSelect: HTMLSelectElement = null;
    private _agRate: HTMLInputElement;
    private _agLoop: HTMLInputElement;
    private _agPlaying: AnimationGroup;

    private _skel: Skeleton;
    private _skelMesh: AbstractMesh;
    private _animSkelList: HTMLSelectElement;

    private _skelFound: HTMLElement;
    private _agFound: HTMLElement;
    private _arFound: HTMLElement;

    private _attMode: number = 0;

    constructor(vishva: Vishva) {
        this._vishva = vishva;

        this._skelFound = <HTMLElement>animElement.getElementsByClassName("skelFound")[0];
        this._agFound = <HTMLElement>animElement.getElementsByClassName("agFound")[0];
        this._arFound = <HTMLElement>animElement.getElementsByClassName("arFound")[0];

        let animSkelView: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelView");
        let animRest: HTMLInputElement = <HTMLInputElement>document.getElementById("animRest");

        let animSBS: HTMLInputElement = <HTMLInputElement>document.getElementById("animSBS");
        let animAttach: HTMLInputElement = <HTMLInputElement>document.getElementById("animAttach");
        let animDetach: HTMLInputElement = <HTMLInputElement>document.getElementById("animDetach");

        let animRangeName: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeName");
        let animRangeStart: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeStart");
        let animRangeEnd: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeEnd");
        let animRangeMake: HTMLButtonElement = <HTMLButtonElement>document.getElementById("animRangeMake");

        this._animSkelList = <HTMLSelectElement>document.getElementById("animSkelList");
        let animSkelChange: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelChange");
        let animSkelLinkAnims: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelLinkAnims");
        let animSkelClone: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelClone");

        //enable/disable skeleton view
        animSkelView.onclick = (e) => {
            this._vishva.toggleSkelView(this._skel, this._skelMesh);
        }

        //show rest pose 
        animRest.onclick = (e) => {
            this._vishva.animRest();
        }

        animSBS.onclick = (e) => {
            this._toggleBoneSelectorDialog();
        }


        //attach items to bone
        animAttach.onclick = (e) => {
            if (this._selectedBoneIndex < 0) {
                DialogMgr.showAlertDiag("please select a bone first using the bone selector");
                return;
            }
            let err: string = this._vishva._attach2Bone(this._skel, this._selectedBoneIndex, this._skelMesh);
            if (err != null) {
                DialogMgr.showAlertDiag(err);
            }
        }

        //attach items to bone
        animDetach.onclick = (e) => {
            let err: string = this._vishva._detach4Bone(this._skel);
            if (err != null) {
                DialogMgr.showAlertDiag(err);
            }

        }


        //change the mesh skeleton
        animSkelChange.onclick = (e) => {

            if (this._vishva.changeSkeleton(this._animSkelList.selectedOptions[0].value))
                this.update();
            else DialogMgr.showAlertDiag("Error: unable to switch");
        }


        //clone the animations from selected skeleton and link to the skeleton of the selected character
        animSkelLinkAnims.onclick = (e) => {

            // if (this._vishva.cloneChangeSkeleton(this._animSkelList.selectedOptions[0].value))
            //     this.update();
            // else DialogMgr.showAlertDiag("Error: unable to clone and switch");

            if (this._vishva.linkAnimationsToSkeleton(this._animSkelList.selectedOptions[0].value))
                this.update();
            else DialogMgr.showAlertDiag("Error: unable to clone and switch");
        }

        //clone the selected skeleton
        animSkelClone.onclick = (e) => {

            if (this._vishva.cloneSkeleton(this._animSkelList.selectedOptions[0].value))
                this.update();
            else DialogMgr.showAlertDiag("Error: unable to clone and switch");


        }



        //create
        animRangeMake.onclick = (e) => {

            var name = animRangeName.value;
            var ars: number = parseInt(animRangeStart.value);
            if (isNaN(ars)) {
                DialogMgr.showAlertDiag("from frame is not a number")
            }
            var are: number = parseInt(animRangeEnd.value);
            if (isNaN(are)) {
                DialogMgr.showAlertDiag("to frame is not a number")
            }
            this._vishva.createAnimRange(name, ars, are)
            this._refreshArSelect();
        }

        //select for animation groups
        this._agSelect = <HTMLSelectElement>animElement.getElementsByClassName("agList")[0];
        this._agSelect.onchange = (e) => {
            let agName = this._agSelect.value;
            if (agName != null) {
                let group: AnimationGroup = this._agSelect.options[this._agSelect.selectedIndex]["ag"];
                animElement.getElementsByClassName("agFrom")[0].innerHTML = Math.round(group.from).toString();
                animElement.getElementsByClassName("agTo")[0].innerHTML = Math.round(group.to).toString();
                this._agRate.value = group.speedRatio.toString();
            }
            return true;
        }
        //play animation group
        this._agRate = <HTMLInputElement>animElement.getElementsByClassName("agRate")[0];
        this._agRate.onchange = (e) => {
            if (this._agPlaying != null) {
                this._agPlaying.speedRatio = Number(this._agRate.value);
            }
        }
        this._agLoop = <HTMLInputElement>animElement.getElementsByClassName("agLoop")[0];
        (<HTMLElement>animElement.getElementsByClassName("agPlay")[0]).onclick = (e) => {
            if (this._agPlaying! = null) this._agPlaying.stop();
            this._agPlaying = this._agSelect.options[this._agSelect.selectedIndex]["ag"];
            if (this._agPlaying != null) {
                this._agPlaying.play(this._agLoop.checked);
                this._agPlaying.speedRatio = Number(this._agRate.value);
            }
            return true;
        };
        (<HTMLElement>animElement.getElementsByClassName("agStop")[0]).onclick = (e) => {
            if (this._agPlaying != null) {
                this._agPlaying.stop();
                this._agPlaying = null;
            }
            return true;
        };


        //select for animation ranges
        this._arSelect = <HTMLSelectElement>document.getElementById("animList");
        this._arSelect.onchange = (e) => {
            var animName: string = this._arSelect.value;
            animRangeName.value = animName;
            if (animName != null) {
                var range: AnimationRange = this._skel.getAnimationRange(animName);
                document.getElementById("animFrom").innerText = (<number>new Number(range.from)).toString();
                document.getElementById("animTo").innerText = (<number>new Number(range.to)).toString();
                animRangeStart.value = (<number>new Number(range.from)).toString();
                animRangeEnd.value = (<number>new Number(range.to)).toString();;
            }
            return true;
        };


        //play
        this._animRate = <HTMLInputElement>document.getElementById("animRate");
        this._animLoop = <HTMLInputElement>document.getElementById("animLoop");
        document.getElementById("playAnim").onclick = (e) => {
            if (this._skel == null) return true;
            let animName: string = this._arSelect.value;
            let rate: string = this._animRate.value;
            if (animName != null) {
                this._vishva.playAnimation(animName, rate, this._animLoop.checked);
            }
            return true;
        };
        document.getElementById("stopAnim").onclick = (e) => {
            if (this._skel == null) return true;
            this._vishva.stopAnimation();
            return true;
        };
        document.getElementById("remAnim").onclick = (e) => {
            if (this._skel == null) return true;
            let animName: string = this._arSelect.value;
            this._vishva.delAnimRange(animName, false);
            this._refreshArSelect();
            return true;
        };
        document.getElementById("delAnim").onclick = (e) => {
            if (this._skel == null) return true;
            let animName: string = this._arSelect.value;
            this._vishva.delAnimRange(animName, true);
            this._refreshArSelect();
            return true;
        };

    }

    public update() 
    {
        // Clean up bone selector state when mesh selection changes
        this._disposeBoneMarker();
        if (this._boneSelectorDialog != null && this._boneSelectorDialog.isOpen()) 
        {
            this._boneSelectorDialog.close();
        }

        // Hide skeleton viewer if it was visible for the previous mesh
        if (this._skelMesh != null) 
        {
            let sv = this._vishva.findSkelViewer(this._vishva.skelViewerArr, this._skelMesh);
            if (sv != null) 
            {
                this._vishva.toggleSkelView(this._skel, this._skelMesh);
            }
        }

        //this.vishva.switchDisabled = true;
        let sm = AnimUtils.getMeshSkel(this._vishva.getMeshSelected(), this._vishva.isRootSelected());
        this._skel = (sm === null) ? null : sm.skel;
        this._skelMesh = (sm === null) ? null : sm.mesh;

        var skelName: string;
        if (this._skel == null) 
        {
            skelName = "NO SKELETON";
            this._skelFound.style.display = "none";
            //check if we have character animation groups without skeleton
            if (this._refreshAgSelect()) 
            {
                this._agFound.style.display = "inherit";
                this._arFound.style.display = "none";
            } 
            else 
            {
                this._agFound.style.display = "none";
                this._arFound.style.display = "none";
            }
        } 
        else 
        {
            skelName = this._skel.name.trim();
            if (skelName === "") skelName = "NO NAME";
            skelName = skelName + ", " + this._skel.id + ", " + this._skel.uniqueId;
            this._skelFound.style.display = "inherit";
            console.log(this._skel.animations);

            //if (AnimUtils.skelDrivenByAG(this._skel, this._vishva.scene)) {
            if (this._refreshAgSelect()) 
            {
                this._agFound.style.display = "inherit";
                this._arFound.style.display = "none";
            } 
            else
            {
                 if (this._refreshArSelect()) 
                {
                    this._agFound.style.display = "none";
                    this._arFound.style.display = "inherit";
                } 
                else 
                {
                    this._agFound.style.display = "none";
                    this._arFound.style.display = "none";
                }
            }
        }
        document.getElementById("skelName").innerText = skelName;
        this._refreshAnimSkelList();
    }
    /**
     * refresh the list of animation ranges
     */
    private _refreshArSelect(): boolean {
        var childs: HTMLCollection = this._arSelect.children;
        var l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }

        var range: AnimationRange[] = this._vishva.getAnimationRanges();
        if (range != null && range.length > 0) {
            var animOpt: HTMLOptionElement;
            for (let ar of range) {
                //if a range is deleted using skeleton.deleteAnimationRange , it shows up as null !!
                if (ar == null) continue;
                animOpt = document.createElement("option");
                animOpt.value = ar.name;
                animOpt.innerText = ar.name;
                this._arSelect.appendChild(animOpt);
            }

            if (range[0] != null) {
                document.getElementById("animFrom").innerText = (<number>new Number(range[0].from)).toString();
                document.getElementById("animTo").innerText = (<number>new Number(range[0].to)).toString();
                return true;
            } else {
                document.getElementById("animFrom").innerText = "";
                document.getElementById("animTo").innerText = "";
                return false;
            }
        } else {
            document.getElementById("animFrom").innerText = "";
            document.getElementById("animTo").innerText = "";
            return false;
        }
    }

    /**
    * refresh the list of animation groups
    * if none found then returns false else returns true
    */
    private _refreshAgSelect(): boolean {
        var childs: HTMLCollection = this._agSelect.children;
        var l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }

        //TODO filter out all animation groups which do not relate to this mesh.
        //Check targets in each targetedAnimation in each animationgroup to see if they target
        //any part of this mesh hierarchy
        //NOTE targets are not mesh but transformnodes which are in the mesh-node hierrachy, not
        // child of mesh but maybe peer or parent
        var groups: AnimationGroup[] = AnimUtils.getMeshAg(this._vishva.getMeshSelected(), this._vishva.scene.animationGroups, this._vishva.isRootSelected());
        if (groups.length > 0) {

            var hoe: HTMLOptionElement;
            for (let g of groups) {
                hoe = document.createElement("option");
                hoe.value = g.name;
                hoe.innerText = g.name;
                // animation group name is not unique
                // so storing just animation group name is not good enough, as we will not be able to retrieve the aniamtion group by its name
                // so lets store reference to the animation group itseld in the option
                hoe["ag"] = g;
                this._agSelect.appendChild(hoe);
                if (g.isPlaying) {
                    this._agPlaying = g;
                    this._agSelect.selectedIndex = hoe.index;
                }
            }

            let g: AnimationGroup;
            if (this._agPlaying == null) {
                g = groups[0];
                this._agSelect.selectedIndex = 0;
            } else {
                g = this._agPlaying;
            }
            this._agLoop.checked = g.loopAnimation;
            this._agRate.value = g.speedRatio.toString();
            animElement.getElementsByClassName("agFrom")[0].innerHTML = Math.round(g.from).toString();
            animElement.getElementsByClassName("agTo")[0].innerHTML = Math.round(g.to).toString();
            return true;
        } else return false;
    }


    /**
     * Builds VTreeDialog-compatible tree data from a skeleton's bone hierarchy.
     * Root bones (no parent) become top-level entries.
     * Bones with children become { d: boneName, f: [...childNodes] }.
     * Leaf bones become plain strings.
     */
    private _buildBoneTreeData(skel: Skeleton): Array<string | { d: string; f: any[] }> {
        const roots = skel.bones.filter(b => b.getParent() == null);
        return roots.map(b => this._buildBoneNode(b));
    }

    private _buildBoneNode(bone: Bone): string | { d: string; f: any[] } {
        if (bone.children.length === 0) {
            return bone.name;
        }
        return {
            d: bone.name,
            f: bone.children.map(child => this._buildBoneNode(child))
        };
    }

    /**
     * Callback fired when a bone is clicked in the VTreeDialog tree.
     * Creates a marker sphere at the bone's position, or moves the existing marker.
     */
    private _onBoneSelected(boneName: string, path: string, isLeaf: boolean): void {
        if (this._skel == null) return;

        const boneIndex = this._skel.bones.findIndex(b => b.name === boneName);
        if (boneIndex === -1) {
            console.warn(`[AnimationUI] Bone not found in skeleton: "${boneName}"`);
            return;
        }

        // Same bone already selected — no-op
        if (boneIndex === this._selectedBoneIndex) {
            return;
        }

        const bone = this._skel.bones[boneIndex];
        const skelMesh = this._skelMesh;

        if (this._boneMarker == null) {
            // Create a new marker sphere
            const marker = MeshBuilder.CreateSphere("boneSelector-marker", { diameter: 0.05 }, this._vishva.scene);
            const mat = new StandardMaterial("boneSelector-mat", this._vishva.scene);
            mat.emissiveColor = new Color3(0, 1, 0);
            mat.disableLighting = true;
            marker.material = mat;
            marker.renderingGroupId = 1;
            marker.isPickable = false;

            try {
                marker.attachToBone(bone, skelMesh);
            } catch (e) {
                console.error("[AnimationUI] Failed to attach marker to bone:", e);
                mat.dispose();
                marker.dispose();
                return;
            }

            this._boneMarker = marker;
        } else {
            // Move existing marker to the new bone
            this._boneMarker.detachFromBone();
            try {
                this._boneMarker.attachToBone(bone, skelMesh);
            } catch (e) {
                console.error("[AnimationUI] Failed to attach marker to bone:", e);
                this._boneMarker.material.dispose();
                this._boneMarker.dispose();
                this._boneMarker = null;
                this._selectedBoneIndex = -1;
                return;
            }
        }

        this._selectedBoneIndex = boneIndex;
    }

    /**
     * Locks mesh selection by setting Vishva.switchDisabled = true.
     * Prevents selection of other meshes and deselection of the current mesh
     * while the bone selector dialog is open.
     */
    private _lockMeshSelection(): void {
        this._vishva.switchDisabled = true;
    }

    /**
     * Unlocks mesh selection by setting Vishva.switchDisabled = false.
     * Restores normal mesh selection behavior when the dialog closes.
     */
    private _unlockMeshSelection(): void {
        this._vishva.switchDisabled = false;
    }

    /**
     * Disposes the bone marker sphere, its material, and resets selection state.
     * No-op if no marker exists.
     */
    private _disposeBoneMarker(): void {
        if (this._boneMarker == null) return;
        this._boneMarker.detachFromBone();
        this._boneMarker.material.dispose();
        this._boneMarker.dispose();
        this._boneMarker = null;
        this._selectedBoneIndex = -1;
    }

    /**
     * Toggles the bone selector dialog open/closed.
     * If open, closes it. If closed or null, creates and opens a new one.
     */
    private _toggleBoneSelectorDialog(): void {
        if (this._boneSelectorDialog != null && this._boneSelectorDialog.isOpen()) {
            this._boneSelectorDialog.close();
            return;
        }

        // Show skeleton viewer if not already visible
        this._skelShownByBoneSelector = false;
        if (this._vishva.findSkelViewer(this._vishva.skelViewerArr, this._skelMesh) == null) {
            this._vishva.toggleSkelView(this._skel, this._skelMesh);
            this._skelShownByBoneSelector = true;
        }

        const treeData = this._buildBoneTreeData(this._skel);
        this._boneSelectorDialog = new VTreeDialog(this._vishva, "Bone Selector",  VDiag.leftTop, treeData, undefined, true, false);
        this._boneSelectorDialog.addTreeListener((boneName, path, isLeaf) => this._onBoneSelected(boneName, path, isLeaf));
        this._boneSelectorDialog.onClose(() => {
            this._disposeBoneMarker();
            if (this._skelShownByBoneSelector) {
                this._vishva.toggleSkelView(this._skel, this._skelMesh);
                this._skelShownByBoneSelector = false;
            }
            this._unlockMeshSelection();
            this._boneSelectorDialog = null;
        });
        this._boneSelectorDialog.open();
        this._lockMeshSelection();
    }

    /**
     * refresh list of skeletons shown in animation tab
     */
    private _refreshAnimSkelList() {
        var childs: HTMLCollection = this._animSkelList.children;
        var l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }

        var skels: Skeleton[] = this._vishva.scene.skeletons;
        var opt: HTMLOptionElement;
        //NOTE:skel id is not unique
        for (let skel of skels) {
            // exclude the skeleton belonging to the currently selected mesh
            if (skel === this._skel) continue;
            opt = document.createElement("option");
            opt.innerText = skel.name + ", " + skel.id + ", " + skel.uniqueId;
            opt.value = skel.uniqueId.toString();
            this._animSkelList.appendChild(opt);
        }
    }
}
