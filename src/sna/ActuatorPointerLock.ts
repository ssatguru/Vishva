import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {  Mesh } from "babylonjs";
import { Vishva } from "../Vishva";
import { Control, Image, Line, Rectangle, AdvancedDynamicTexture, TextBlock } from "babylonjs-gui";

export class PointerLockProp extends ActProperties {
    public crossHair: boolean = true;
}

/**
 * Locks pointer
 */
export class ActuatorPointerLock extends ActuatorAbstract {
    advancedTexture:AdvancedDynamicTexture;

    override init(){
       
    }

    override actuate() {
        let canvas = Vishva.vishva.canvas;
        // canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock || false;

        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
            let el = ()=>{
                if (document.pointerLockElement !== canvas) {
                    if (props.crossHair) this.advancedTexture.dispose();
                    canvas.focus();
                    document.removeEventListener('pointerlockchange',el);
                }
            }
            document.addEventListener('pointerlockchange', el);
        }
        canvas.focus();

        let props: PointerLockProp = <PointerLockProp>this.properties;
        if (props.crossHair) this.createCrosshair();

        this.onActuateEnd();
     
    }

    private creatCrossHairFromImage(){
        let advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("GUI");

        // Create a plane for the crosshair
        let crosshairPlane = new Image("crosshair", "path/to/your/crosshair.png");
        crosshairPlane.width = "50px"; // Adjust size
        crosshairPlane.height = "50px";
        //crosshairPlane.pointerBlocker = true; // Prevent mouse events from passing through
        crosshairPlane.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        crosshairPlane.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(crosshairPlane);
    }

    private createCrosshair(){
        console.log("adding crosshar");
        // For a simple cross, use a Rectangle with colors
        let simpleCross = new Rectangle("simpleCross");
        simpleCross.width = "1%";
        simpleCross.height = "1%";
        simpleCross.color = "white"; // Or any color
        simpleCross.thickness = 2;
        simpleCross.background = ""; // Transparent background
        simpleCross.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        simpleCross.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        //simpleCross.top = "-20%";

        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("GUI");
        

        // You can also add lines for a more traditional cross
        // let line1 = new Line("line1");
        // line1.x1 = -20; line1.y1 = 0; line1.x2 = 20; line1.y2 = 0; // Horizontal line
        // line1.color = "white"; //line1.thickness = 2;
        // line1.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        // line1.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        // simpleCross.addControl(line1);

        // let line2 = new Line("line2");
        // line2.x1 = 0; line2.y1 = -20; line2.x2 = 0; line2.y2 = 20; // Vertical line
        // line2.color = "white"; //line2.thickness = 2;
        // simpleCross.addControl(line2);

        // Add the crosshair to the GUI
        this.advancedTexture.addControl(simpleCross);
    }

    override stop() {
    }

    override isReady(): boolean {
        return true;
    }

    override getName(): string {
        return "PointerLock";
    }

    override getPropertiesType(): typeof ActProperties {
        return PointerLockProp;
    } 

    override onPropertiesChange() {
    }

    override cleanUp() {
    }
}

SNAManager.getSNAManager().addActuator("PointerLock",ActuatorPointerLock );