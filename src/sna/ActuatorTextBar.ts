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
    outlineWidth: number = 5;

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
    dt: AdvancedDynamicTexture;
    tb: TextBlock;
    option: { width: 0, height: 0 };

    override init(){}

    override actuate() {
        if (this.properties.toggle) {
            this.plane.isVisible = !this.plane.isVisible;
        } else {
            this.plane.isVisible = true;
        }
        this.onActuateEnd();
    }

    override getName(): string {
        return "TextBar";
    }

    override getPropertiesType() : typeof ActTextBar{
        return ActTextBar;
    }

    override stop() {
    }

    override cleanUp() {
        this.plane.dispose();
    }


    override onPropertiesChange() {
        var props: ActTextBar = <ActTextBar>this.properties;

        if (this.plane != null){ 
            this.plane.material.dispose();
            this.plane.dispose();
        }

        this.plane = MeshBuilder.CreatePlane("ActuatorTextBar", { width: props.width, height: props.height });
        this.plane.doNotSerialize = true;
        this.plane.parent = this.mesh;
        this.plane.position.y = props.floatHeight;
        this.plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        this.plane.isVisible = false;
        //setting renderingGroupId to 1 (default 0) to avoid the AdvanceDynamictexture issue explained here
        //https://forum.babylonjs.com/t/skybox-visibility-effecting-advanceddynamictexture-transparency/58087
        this.plane.renderingGroupId = 1;

        if (this.dt != null) this.dt.dispose();
        const texWidth = 256;
        const texHeight = Math.max(64, Math.round(texWidth * (props.height / props.width)));
        let dt = AdvancedDynamicTexture.CreateForMesh(this.plane, texWidth, texHeight);
        if (!props.transparent) dt.background = props.background;
        //dt.vScale = props.height / props.width;
        //dt.vOffset = dt.vScale / 2;

        if (this.tb != null) this.tb.dispose();
        let tb = new TextBlock();
        tb.text = props.text;
        tb.fontSize = props.fontSize;
        tb.outlineColor = props.outlineColor;
        tb.outlineWidth = props.outlineWidth;
        tb.color = props.color;
        tb.resizeToFit = false;
        tb.textWrapping = true; 
        tb.fontStyle = "normal";

        this.tb = tb;
        this.dt = dt;

        dt.addControl(tb);

        if (this.properties.autoStart) {
            this.plane.isVisible = true;
        }

    }

    override isReady(): boolean {
        return true;
    }

}


SNAManager.getSNAManager().addActuator("TextBar", ActuatorTextBar);
