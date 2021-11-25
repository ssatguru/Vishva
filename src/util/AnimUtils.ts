import { Mesh, Node, TransformNode } from "babylonjs";
import { AnimationGroup, TargetedAnimation } from "babylonjs/Animations/animationGroup";



export class AnimUtils {

        // finds all animation groups which can be played on a node
        // if node is part of a hierarchy it will check if an animation group
        // can be played on any nodes in that hierarchy

        public static getMeshAg(node: Node, ags: AnimationGroup[]): AnimationGroup[] {


                let r: Node = AnimUtils.getRoot(node);
                let ns: Node[] = r.getChildren((n) => { return n instanceof TransformNode }, false);
                let mags: AnimationGroup[] = new Array();
                for (let ag of ags) {
                        let tas: TargetedAnimation[] = ag.targetedAnimations;
                        for (let ta of tas) {
                                if (ns.indexOf(ta.target) > -1) {
                                        mags.push(ag);
                                        break;
                                }
                        }
                }
                return mags;
        }


        //get the root of Node
        public static getRoot(tn: Node): Node {
                if (tn.parent == null) return tn;
                return AnimUtils.getRoot(tn.parent);
        }

}