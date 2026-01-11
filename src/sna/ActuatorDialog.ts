import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh } from "babylonjs";
import { GuiUtils } from "../gui/GuiUtils";
import { FileInputType, SelectType } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";
import { VDiag } from "../gui/components/VDiag";
import { Engine } from "babylonjs";


export class ActDialogParm extends ActProperties {
    msg: string = "";
    htmlFile: FileInputType = new FileInputType("Html Fragment", "\.html$", true);
    title: string = "";
    height: number = 50;
    width: number = 50;
    sizeType: SelectType = new SelectType();
    modal: boolean = true;
    resizable: boolean = false;
    draggable: boolean = false;
    transparent: boolean = false;
    border: boolean = true;
    openEffect: SelectType = new SelectType();
    openDuration: number = 0.5;
    closeEffect: SelectType = new SelectType();
    closeDuration: number = 0.5;
    position: SelectType = new SelectType();

    public constructor() {
        super();
        this.sizeType.values = ["%", "px"];
        this.sizeType.value = "%";
        this.openEffect.values = ["scale", "fade", "rotate", "newsFlash"];
        this.openEffect.value = "scale";
        this.closeEffect.values = this.openEffect.values;
        this.closeEffect.value = this.openEffect.value;
        this.position.values = [VDiag.leftTop, VDiag.leftTop1, VDiag.leftTop2, VDiag.leftCenter, VDiag.leftBottom, VDiag.centerTop, VDiag.center, VDiag.centerBottom, VDiag.rightTop, VDiag.rightCenter, VDiag.rightBottom];
    }
}

/**
 * shows a dialog box on being actuated.
 */
export class ActuatorDialog extends ActuatorAbstract {

    _div: HTMLDivElement;
    _dialog: VDiag;
    _w: string;
    _h: string;
    _pos: string = VDiag.leftTop;

    override init(){}

    override actuate() {
        this._dialog.open();
    }

    override getName(): string {
        return "Dialog";
    }

    override getPropertiesType(): typeof ActProperties {
        return ActDialogParm;
    }

    override stop() {
    }

    override cleanUp() {
        this._div.remove();
        this._div = null;
        this._dialog = null;
    }

    private setSize() {
        let props: ActDialogParm = <ActDialogParm>this.properties;

        if (props.sizeType.value === "%") {
            this._w = (window.innerWidth * props.width / 100) + "px";
            this._h = (window.innerHeight * props.height / 100) + "px";
        } else {
            this._w = props.width + "px";
            this._h = props.height + "px";
        }

    }

    override onPropertiesChange() {

        if (this._dialog != null){
            this._dialog.dispose();
            this._dialog = null;
        }

        var props: ActDialogParm = <ActDialogParm>this.properties;

        this.setSize();
 

        this._div = GuiUtils.createDiv();

        //TODO
        //position is new.
        //we need to take care of old serialized worlds which don't have position
        //should be removed when old worlds have been upgraded
        if (!props.position){
            props.position = new SelectType();
            props.position.values = [VDiag.leftTop, VDiag.leftTop1, VDiag.leftTop2, VDiag.leftCenter, VDiag.leftBottom, VDiag.centerTop, VDiag.center, VDiag.centerBottom, VDiag.rightTop, VDiag.rightCenter, VDiag.rightBottom];
            props.position.value = VDiag.center;
        }
        this._dialog = new VDiag(this._div, props.title, props.position.value, this._w, this._h, "350px", props.modal,props.resizable,props.draggable);

        this._dialog.setType("g");

        let button: HTMLButtonElement = this._dialog.addButton("Close");

        button.onclick = (e) => {
            if (!Engine.audioEngine.unlocked) {
                Engine.audioEngine.unlock();
            }
            if (Engine.audioEngine.audioContext.state === "suspended") {
                Engine.audioEngine.audioContext.resume().then(() => {
                    this._dialog.close();
                });
            } else {
                this._dialog.close();
            }
            return true;
        }

        //close dialog without doing the close animation
        this._dialog.close(false);

        if (props.openEffect) {
            this._dialog.setEffects(props.openEffect.value,
                props.openDuration.toString() + "s",
                props.closeEffect.value,
                props.closeDuration.toString() + "s");
        }
    
        if (props.title.trim() == "") {
            this._dialog.hideTitleBar();
        } else {
            this._dialog.setTitle(props.title);
            this._dialog.showTitleBar();
        }

        if (props.transparent) {
            this._dialog.setBackGround("transparent");
        }

        if (!props.border) {
            this._dialog.setBorder("transparent");
        }
       
        this._div.innerHTML = props.msg;

        if (props.htmlFile && props.htmlFile.value != null) {
            let xhttp = new XMLHttpRequest();
            xhttp.onload = () => {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    this._div.innerHTML = xhttp.responseText;
                }
            };
            xhttp.open("GET", Vishva.vHome + "assets/" + props.htmlFile.value, true);
            xhttp.send();
        } else {
            this._div.innerHTML = props.msg;
            this._div.style.display = "flex";
            this._div.style.justifyContent = "center";
            this._div.style.alignItems = "center";
        }

        this._dialog.onClose(() => {
            this.onActuateEnd();
        })

        this._pos = props.position.value;

        if (this.properties.autoStart) {
            this._dialog.open();
        }

    }

    override isReady(): boolean {
        return true;
    }


}


SNAManager.getSNAManager().addActuator("Dialog", ActuatorDialog);
