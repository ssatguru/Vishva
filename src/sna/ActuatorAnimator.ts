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
    // state_isAG:boolean=false;
    // state_skel:boolean=false;;
}

export class ActuatorAnimator extends ActuatorAbstract {

    _isAG:boolean = false;
    _skel:boolean = false;

    override init():void {
        var prop: AnimatorProp = <AnimatorProp>this.properties;
        let sm = AnimUtils.getMeshSkel(this.mesh, true);
        let skel:Skeleton = (sm === null) ? null : sm.skel;
        prop.animation.values = [""];
        if (skel != null) {
            this._skel = true;
            //check for animation ranges and animation groups
            let ranges: AnimationRange[] = skel.getAnimationRanges();
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
                skel.enableBlending(0.05);
            }else{
               let ags: AnimationGroup[] = AnimUtils.getMeshAg(this.mesh,Vishva.vishva.scene.animationGroups,true);
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
            return;
        }
    }

    override actuate() {
        let prop: AnimatorProp = <AnimatorProp>this.properties;
        if (this._skel) {
            if(this._isAG){
                Vishva.vishva.scene.getAnimationGroupByName(prop.animation.value).start(prop.loop, prop.rate).onAnimationGroupEndObservable.addOnce(() => { return this.onActuateEnd() });
            }else{
                this.mesh.skeleton.beginAnimation(prop.animation.value, false, prop.rate, () => { return this.onActuateEnd() });
            }
        }else{
            console.log("no skeleton found");
        }
    }

    public stop() {
    }

    public isReady(): boolean {
        return true;
    }

   

    public onPropertiesChange() {
        if (this.properties.autoStart) {
            var started: boolean = this.start(this.properties.signalId);
        }
    }

    public cleanUp() {
        this.properties.loop = false;
    }

    override getName(): string {
        return "Animator";
    }

    override getPropertiesType(): typeof ActProperties {
        return AnimatorProp;
    }
}



SNAManager.getSNAManager().addActuator("Animator", ActuatorAnimator);