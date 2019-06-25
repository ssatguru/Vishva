import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import AnimationRange = BABYLON.AnimationRange;
import Mesh = BABYLON.Mesh;
import Skeleton = BABYLON.Skeleton;
import { SelectType } from "../gui/VishvaGUI";

export class AnimatorProp extends ActProperties {
    animationRange: SelectType = new SelectType();
    rate: number = 1;
}

export class ActuatorAnimator extends ActuatorAbstract {
    public constructor(mesh: Mesh, parms: AnimatorProp) {

        if (parms != null) {
            super(mesh, parms);
        } else {

            super(mesh, new AnimatorProp());
        }
        var prop: AnimatorProp = <AnimatorProp>this.properties;
        var skel: Skeleton = mesh.skeleton;
        if (skel != null) {
            let ranges: AnimationRange[] = skel.getAnimationRanges();
            let animNames: string[] = new Array();
            let i: number = 0;
            for (let range of ranges) {
                if (range != null) {
                    animNames[i] = range.name;
                    i++;
                }
            }
            prop.animationRange.values = animNames;
            skel.enableBlending(0.05);
        } else {
            prop.animationRange.values = [""];
        }
    }

    public actuate() {
        let prop: AnimatorProp = <AnimatorProp>this.properties;
        if (this.mesh.skeleton != null) {
            this.mesh.skeleton.beginAnimation(prop.animationRange.value, false, prop.rate, () => { return this.onActuateEnd() });
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