
import { Vishva } from "../../Vishva";
import { DialogMgr } from "../DialogMgr";
import { animElement } from "./AnimationML";
import {
    Skeleton,
    AnimationRange,
    AnimationGroup
} from "babylonjs";

/**
 * Provides UI for the Animation (Skeleton) tab of mesh properties
 */
export class AnimationUI {

    private _vishva: Vishva;

    private _arSelect: HTMLSelectElement = null;
    private _animRate: HTMLInputElement;
    private _animLoop: HTMLInputElement;

    private _agSelect: HTMLSelectElement = null;
    private _agRate: HTMLInputElement;
    private _agLoop: HTMLInputElement;
    private _agPlaying: AnimationGroup;

    private _skel: Skeleton;
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
        let animDBS: HTMLInputElement = <HTMLInputElement>document.getElementById("animDBS");
        let animAttach: HTMLInputElement = <HTMLInputElement>document.getElementById("animAttach");
        let animDetach: HTMLInputElement = <HTMLInputElement>document.getElementById("animDetach");

        let animRangeName: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeName");
        let animRangeStart: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeStart");
        let animRangeEnd: HTMLInputElement = <HTMLInputElement>document.getElementById("animRangeEnd");
        let animRangeMake: HTMLButtonElement = <HTMLButtonElement>document.getElementById("animRangeMake");

        this._animSkelList = <HTMLSelectElement>document.getElementById("animSkelList");
        let animSkelChange: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelChange");
        let animSkelClone: HTMLInputElement = <HTMLInputElement>document.getElementById("animSkelClone");

        //enable/disable skeleton view
        animSkelView.onclick = (e) => {
            this._vishva.toggleSkelView();
        }

        //show rest pose 
        animRest.onclick = (e) => {
            this._vishva.animRest();
        }

        animSBS.onclick = (e) => {
            this._vishva._addBoneSelectors(this._skel);
            //this._vishva._debugBoneChilds(this._skel);
        }

        animDBS.onclick = (e) => {
            this._vishva._delBoneSelectors(this._skel);
        }

        animAttach.onclick = (e) => {
            this._vishva._delBoneSelectors(this._skel);
        }

        //attach items to bone
        animAttach.onclick = (e) => {
            let err: string = this._vishva._attach2Bone(this._skel);
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
        //clone the selected skeleton and switch to it
        animSkelClone.onclick = (e) => {

            // if (this._vishva.cloneChangeSkeleton(this._animSkelList.selectedOptions[0].value))
            //     this.update();
            // else DialogMgr.showAlertDiag("Error: unable to clone and switch");

            if (this._vishva.linkAnimationsToSkeleton(this._animSkelList.selectedOptions[0].value))
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
                let group: AnimationGroup = this._vishva.scene.getAnimationGroupByName(agName);
                animElement.getElementsByClassName("agFrom")[0].innerHTML = group.from.toString();
                animElement.getElementsByClassName("agTo")[0].innerHTML = group.to.toString();
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
            let agName: string = this._agSelect.value;
            this._agPlaying = this._vishva.scene.getAnimationGroupByName(agName);
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


    public update() {
        //this.vishva.switchDisabled = true;
        this._skel = this._vishva.getSkeleton();
        var skelName: string;
        if (this._skel == null) {
            skelName = "NO SKELETON";
            this._skelFound.style.display = "none";
        } else {
            skelName = this._skel.name.trim();
            if (skelName === "") skelName = "NO NAME";
            skelName = skelName + ", " + this._skel.id + ", " + this._skel.uniqueId;
            this._skelFound.style.display = "inherit";
            if (this._skel.overrideMesh) {
                this._agFound.style.display = "inherit";
                this._arFound.style.display = "none";
                this._refreshAgSelect();
            } else {
                this._agFound.style.display = "none";
                this._arFound.style.display = "inherit";
                this._refreshArSelect();
            }
        }
        document.getElementById("skelName").innerText = skelName;


        this._refreshAnimSkelList();
    }
    /**
     * refresh the list of animation ranges
     */
    private _refreshArSelect() {
        var childs: HTMLCollection = this._arSelect.children;
        var l: number = (<number>childs.length | 0);
        for (var i: number = l - 1; i >= 0; i--) {
            childs[i].remove();
        }

        var range: AnimationRange[] = this._vishva.getAnimationRanges();
        if (range != null) {
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
            } else {
                document.getElementById("animFrom").innerText = "";
                document.getElementById("animTo").innerText = "";
            }
        } else {
            document.getElementById("animFrom").innerText = "";
            document.getElementById("animTo").innerText = "";
        }
    }

    /**
    * refresh the list of animation groups
    */
    private _refreshAgSelect() {
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
        var groups: AnimationGroup[] = this._vishva.scene.animationGroups;
        if (groups != null) {

            var hoe: HTMLOptionElement;
            for (let g of groups) {
                hoe = document.createElement("option");
                hoe.value = g.name;
                hoe.innerText = g.name;
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
            animElement.getElementsByClassName("agFrom")[0].innerHTML = g.from.toString();
            animElement.getElementsByClassName("agTo")[0].innerHTML = g.to.toString();
        }
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
            opt = document.createElement("option");
            opt.innerText = skel.name + ", " + skel.id + ", " + skel.uniqueId;
            opt.value = skel.uniqueId.toString();
            this._animSkelList.appendChild(opt);
        }
    }
}
