import { AbstractMesh, Mesh, Node, Scene, TransformNode } from "babylonjs";
import { AnimationGroup, TargetedAnimation } from "babylonjs/Animations/animationGroup";
import { Skeleton } from "babylonjs/Bones/skeleton";


export class AnimUtils 
{

        // finds all animation groups which can be played on a node
        // if node is part of a hierarchy it can check if an animation group
        // can be played on any nodes in that hierarchy
        // the second arg could be all animation groups in the scene
        public static getMeshAg(node: Node, ags: AnimationGroup[], fromRoot = true): AnimationGroup[] 
        {
                let r: Node;
                let ns: Node[];

                if (fromRoot) 
                {
                        r = AnimUtils.getRoot(node);
                        ns = r.getChildren((n) => { return (n instanceof TransformNode) }, false);

                        //if the root itself is a transform node then lets check it too
                        if (r instanceof TransformNode) ns.push(r);
                } 
                else 
                {
                        r = node;
                        ns = [r];
                }


                let mags: AnimationGroup[] = new Array();
                for (let ag of ags) 
                {
                        let tas: TargetedAnimation[] = ag.targetedAnimations;
                        for (let ta of tas) 
                        {
                                if (ns.indexOf(ta.target) > -1) 
                                {
                                        mags.push(ag);
                                        break;
                                }
                        }
                }
                return mags;
        }

        public static containsAG(node: Node, ags: AnimationGroup[], fromRoot: boolean) {
                let r: Node;
                let ns: Node[];

                if (fromRoot) {
                        r = AnimUtils.getRoot(node);
                        ns = r.getChildren((n) => { return (n instanceof TransformNode) }, false);

                        //if the root itself is a transform node then lets check it too
                        if (r instanceof TransformNode) ns.push(r);

                } else {
                        r = node;
                        ns = [r];
                }


                for (let ag of ags) {
                        let tas: TargetedAnimation[] = ag.targetedAnimations;
                        for (let ta of tas) {
                                if (ns.indexOf(ta.target) > -1) {
                                        return true;
                                }
                        }
                }
                return false;


        }

        public static getMeshSkel(node: Node, fromRoot = true): { "skel": Skeleton, "mesh": AbstractMesh } 
        {
                if (fromRoot) 
                {
                        //if the root itself has a skeleton then return that
                        if (node instanceof AbstractMesh) 
                        {
                                if (node.skeleton != null) return { "skel": node.skeleton, "mesh": node };
                        }

                        let r: Node = AnimUtils.getRoot(node);
                        let ns: AbstractMesh[] = <AbstractMesh[]>r.getChildren((n) => { return (n instanceof AbstractMesh) }, false);
                        for (let n of ns) 
                        {
                                if (n.skeleton != null) return { "skel": n.skeleton, "mesh": n };
                        }
                        return null;
                } else 
                {
                        if (node instanceof AbstractMesh) 
                        {
                                if (node.skeleton == null) return null; else return { "skel": node.skeleton, "mesh": node };
                        } else return null;
                }
        }


        // this checks if any of this skeleton animations is referenced by any targetedAnimation in any of the animationGroup in the scene.
        // scene can have many animationGroups
        // each animationGroup can have many TargetedAnimations. (Each TargetedAnimation has one animation.)
        // skeletion may have many animations
        public static skelDrivenByAG(skel: Skeleton, scene: Scene): boolean {
                if (!skel.animations) return false;

                return skel.animations.some(
                        sa => {
                                console.log(sa.name);
                                scene.animationGroups.some(ag => ag.children.some(ta => ta.animation == sa))
                        }
                );
        }


        /**
         * Returns true if the skeleton is driven by AnimationGroups — i.e., at least
         * one bone has a linked TransformNode (bone.getLinkedTransformNode() != null).
         * Returns false for null/undefined skeletons, null/empty bone arrays, or
         * skeletons where no bone has a linked TransformNode.
         */
        public static isAGDrivenSkeleton(skel: Skeleton): boolean {
                if (skel == null) return false;
                if (skel.bones == null || skel.bones.length === 0) return false;
                return skel.bones.some(b => b.getTransformNode() != null);
        }

        //get the root of Node
        public static getRoot(tn: Node): Node {
                if (tn.parent == null) return tn;
                return AnimUtils.getRoot(tn.parent);
        }

        /** Depth-first search for a node by name within a hierarchy (inclusive of root). */
        public static findNodeInHierarchy(root: Node, name: string): Node | null {
                if (root.name === name) return root;
                for (const child of root.getChildren(null, false)) {
                        const found = AnimUtils.findNodeInHierarchy(child, name);
                        if (found != null) return found;
                }
                return null;
        }

}