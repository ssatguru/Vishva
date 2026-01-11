import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { AnimationRange, Animatable, ArcRotateCamera, Mesh, Skeleton, Scene, Vector3, AnimationGroup } from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";
import { AnimUtils } from "../util/AnimUtils";
import { Vishva } from "../Vishva";

export class AvAnimatorProp extends ActProperties {
    changeTrans: boolean = true;
    position: Vector3 = new Vector3(0, 0, 0);
    rotation: Vector3 = new Vector3(0, 0, 0);
    makeChild: boolean = true;
    focusOnAV: boolean = true;
    focusPosition: Vector3 = new Vector3(0, 0, 0);
    animation: SelectType = new SelectType();
    rate: number = 1;
}

/**
 * this actuator will play animation on the Avatar.
 * On receiving a signal this will "capture" the AV
 * To "release" the av send a disable signal.
 * One will have to send an enable signal eventually to make it
 * effective one more time.
 * One way to handle this would be to set the signal id and the signalEnable
 * to the same signal.
 * This way the same signal would enable and start it 
 */
export class ActuatorAvAnimator extends ActuatorAbstract {
    
    _isAG:boolean = false;
    _skel:Skeleton = null;

    override init(){

        this._sp = new Vector3(0, 0, 0);
        this._sr = new Vector3(0, 0, 0);
        this._sct = new Vector3(0, 0, 0);
        this._scp = new Vector3(0, 0, 0);
        this._inControl = false;

        var prop: AvAnimatorProp = <AvAnimatorProp>this.properties;
        let avMesh = Vishva.vishva.avatar;
        let sm = AnimUtils.getMeshSkel(avMesh, true);
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
                       let ags: AnimationGroup[] = AnimUtils.getMeshAg(avMesh,Vishva.vishva.scene.animationGroups,true);
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
                           this._skel.enableBlending(0.05);
                       }
                    }
                } else{
                    console.log("no skeleton");
                }
    }
    private anim: Animatable;
    private ag:AnimationGroup;

    private avMesh: Mesh;
    //save AV position, rotation
    private _sp: Vector3;
    private _sr: Vector3;
    //save camera target and postion
    private _sct: Vector3;
    private _scp: Vector3;
    //check if this actuator is already in control of the avatar
    private _inControl: boolean;

    public actuate() {
        if (this._inControl) return;

        this._inControl = true;
        let prop: AvAnimatorProp = <AvAnimatorProp>this.properties;
        this.avMesh = SNAManager.getSNAManager().getAV();
        //let skel: Skeleton = this.avMesh.skeleton;
        if (this._skel != null) {
            SNAManager.getSNAManager().disableAV();

            this._sp.copyFrom(this.avMesh.position);
            this._sr.copyFrom(this.avMesh.rotation);

            if (prop.makeChild) {
                this.avMesh.parent = this.mesh;
                if (prop.changeTrans) {
                    this.avMesh.position.copyFrom(prop.position);
                    this.avMesh.rotation.copyFrom(prop.rotation);
                } else {
                    this.avMesh.position.subtractInPlace(this.mesh.position);
                }
            } else {
                if (prop.changeTrans) {
                    this.mesh.position.addToRef(prop.position, this.avMesh.position);
                    this.avMesh.rotation.copyFrom(prop.rotation);
                }
            }
            if (prop.focusOnAV) {
                let camera: ArcRotateCamera = SNAManager.getSNAManager().getCamera();
                this._scp.copyFrom(camera.position);
                this._sct.copyFrom(camera.target);
                //camera.setTarget(this.avMesh.absolutePosition);
                camera.setTarget(this.avMesh);
                //camera.target.copyFrom(this.avMesh.position);
            }

            //this.anim = skel.beginAnimation(prop.animation.value, prop.loop, prop.rate);
            if (this._skel != null) {
            if(this._isAG){
                this.ag = Vishva.vishva.scene.getAnimationGroupByName(prop.animation.value).start(prop.loop, prop.rate);
                this.ag.onAnimationGroupEndObservable.addOnce(() => { return this.onActuateEnd() });
            }else{
                this.anim = this.avMesh.skeleton.beginAnimation(prop.animation.value, prop.loop, prop.rate,() => { return this.onActuateEnd() });
            }
        }
        }
    }

    public stop() {
        if (!this._inControl) return;
        let prop: AvAnimatorProp = <AvAnimatorProp>this.properties;
        //anim would be null if user deletes the actuator without it ever being actuated
        //if (this.anim != null) this.anim.stop();
        if(this._isAG){
            this.ag.stop();
        }else{
            if (this.anim != null) this.anim.stop();
        }
        this.avMesh.parent = null;
        this.avMesh.position.copyFrom(this._sp);
        this.avMesh.rotation.copyFrom(this._sr);
        if (prop.focusOnAV) {
            let camera: ArcRotateCamera = SNAManager.getSNAManager().getCamera();
            camera.setPosition(this._scp.clone());
            camera.setTarget(this._sct.clone());
        }
        SNAManager.getSNAManager().enableAV();
        this._inControl = false;
        this.onActuateEnd()
    }

    public isReady(): boolean {
        return true;
    }

    override getName(): string {
        return "AvAnimator";
    }

    override getPropertiesType(): typeof ActProperties {
        return AvAnimatorProp;
    }

    public onPropertiesChange() {
        if (this.properties.autoStart) {
            this.start(this.properties.signalId);
        }
    }

    public cleanUp() {
        this.properties.loop = false;
    }
}



SNAManager.getSNAManager().addActuator("AvAnimator", ActuatorAvAnimator);