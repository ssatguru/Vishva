import { Vishva } from "../Vishva";
import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh, MeshBuilder } from "babylonjs";
import { AdvancedDynamicTexture, TextBlock } from "babylonjs-gui";
import { tonemapPixelShader } from "babylonjs/Shaders/tonemap.fragment";


export class ActTextBar extends ActProperties {
    text: string = "change me";
    fontSize: number = 192;
    color: string = "black";
    background: string = "green";
    outlineColor: string = "blue";
    outlineWidth: number = 10;

    floatHeight: number = 1;
    height: number = 0.5;
    width: number = 1;
    transparent: boolean = false;
    border: boolean = true;

    public constructor() {
        super();

    }
}

/**
 * shows a dialog box on being actuated.
 */
export class ActuatorTextBar extends ActuatorAbstract {

    w: number;
    h: number;
    plane: Mesh;
    td: AdvancedDynamicTexture;
    tb: TextBlock;
    option: { width: 0, height: 0 };

    public constructor(mesh: Mesh, parms: ActTextBar) {
        super(mesh, parms != null ? parms : new ActTextBar());
    }

    public actuate() {
        if (this.properties.toggle) {
            this.plane.isVisible = !this.plane.isVisible;
        } else {
            this.plane.isVisible = true;
        }
        this.onActuateEnd();
    }

    public getName(): string {
        return "TextBar";
    }

    public stop() {
        console.log("stopped ");
    }

    public cleanUp() {
        this.plane.dispose();
    }


    public onPropertiesChange() {
        var props: ActTextBar = <ActTextBar>this.properties;

        if (this.plane != null) this.plane.dispose();

        this.plane = MeshBuilder.CreatePlane("txtPlane", { width: props.width, height: props.height });
        this.plane.parent = this.mesh;
        this.plane.position.y = props.floatHeight;
        this.plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        this.plane.isVisible = false;
        //setting renderingGroupId to 1 (default 0) to avoid the AdvanceDynamictexture issue explained here
        //https://forum.babylonjs.com/t/skybox-visibility-effecting-advanceddynamictexture-transparency/58087
        this.plane.renderingGroupId = 1;

        //GUI doesnot respect right handedness of the scene. So we need to flip the plane scaling if the scene is right handed.
        if (Vishva.vishva.scene.useRightHandedSystem) 
            this.plane.scaling.x = -this.plane.scaling.x;

        if (this.td != null) this.td.dispose();
        let td = AdvancedDynamicTexture.CreateForMesh(this.plane);
        if (!props.transparent) td.background = props.background;
        td.vScale = props.height / props.width;
        td.vOffset = td.vScale / 2;

        if (this.tb != null) this.tb.dispose();
        let tb = new TextBlock();
        tb.text = props.text;
        tb.fontSize = props.fontSize;
        tb.outlineColor = props.outlineColor;
        tb.outlineWidth = props.outlineWidth;
        tb.color = props.color;
        tb.resizeToFit = false;
        tb.fontStyle = "normal";

        this.tb = tb;
        this.td = td;

        td.addControl(tb);

        if (this.properties.autoStart) {
            this.plane.isVisible = true;
        }

    }

    public isReady(): boolean {
        return true;
    }

}


SNAManager.getSNAManager().addActuator("TextBar", ActuatorTextBar);
