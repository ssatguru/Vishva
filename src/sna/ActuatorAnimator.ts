import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { AnimationRange, Mesh, Skeleton } from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";
import { AnimUtils } from "../util/AnimUtils";
import { Vishva } from "../Vishva";
import { AnimationGroup } from "babylonjs/Animations/animationGroup";

export class AnimatorProp extends ActProperties {
    animation: SelectType = new SelectType();
    rate: number = 1;
}

export class ActuatorAnimator extends ActuatorAbstract {

    _isAG:boolean = false;
    _skel:Skeleton = null;

    public constructor(mesh: Mesh, parms: AnimatorProp) {

        super(mesh, parms != null ? parms : new AnimatorProp());
        console.log(mesh);
        var prop: AnimatorProp = <AnimatorProp>this.properties;
        // var skel: Skeleton = mesh.skeleton;
        let sm = AnimUtils.getMeshSkel(mesh, true);
        this._skel = (sm === null) ? null : sm.skel;
        prop.animation.values = [""];
        if (this._skel != null) {
            //check for animation ranges and animation groups
            let ranges: AnimationRange[] = this._skel.getAnimationRanges();
            if (ranges.length != 0) {
                let animNames: string[] = new Array();
                let i: number = 0;
                for (let range of ranges) {
                    if (range != null) {
                        animNames[i] = range.name;
                        i++;
                    }
                }
                prop.animation.values = animNames;
                this._skel.enableBlending(0.05);
            }else{
               let ags: AnimationGroup[] = AnimUtils.getMeshAg(mesh,Vishva.vishva.scene.animationGroups,true);
               if(ags.length != 0){
                    this._isAG = true;
                   let animNames: string[] = new Array();
                   let i: number = 0;
                   for (let ag of ags) {
                       if (ag != null) {
                           animNames[i] = ag.name;
                           i++;
                       }
                   }
                   prop.animation.values = animNames;
               }
            }
        } else{
            console.log("no skeleton");
        }
    }

    public actuate() {
        let prop: AnimatorProp = <AnimatorProp>this.properties;
        if (this._skel != null) {
            if(this._isAG){
                Vishva.vishva.scene.getAnimationGroupByName(prop.animation.value).start(prop.loop, prop.rate).onAnimationGroupEndObservable.addOnce(() => { return this.onActuateEnd() });
            }else{
                this.mesh.skeleton.beginAnimation(prop.animation.value, false, prop.rate, () => { return this.onActuateEnd() });
            }
        }
    }

    public stop() {
    }

    public isReady(): boolean {
        return true;
    }

    public getName(): string {
        return "Animator";
    }

    public onPropertiesChange() {
        if (this.properties.autoStart) {
            var started: boolean = this.start(this.properties.signalId);
        }
    }

    public cleanUp() {
        this.properties.loop = false;
    }
}



SNAManager.getSNAManager().addActuator("Animator", ActuatorAnimator);