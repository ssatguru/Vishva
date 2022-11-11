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
    draggable: boolean = false;
    transparent: boolean = false;
    border: boolean = true;

    public constructor() {
        super();
        this.sizeType.values = ["%", "px"];
        this.sizeType.value = "%";
    }
}

/**
 * shows a dialog box on being actuated.
 */
export class ActuatorDialog extends ActuatorAbstract {

    div: HTMLDivElement;
    dialog: VDiag;
    w: string;
    h: string;

    public constructor(mesh: Mesh, parms: ActProperties) {
        if (parms != null) {
            super(mesh, parms);
        } else {
            super(mesh, new ActDialogParm());
        }

    }

    public actuate() {
        this.dialog.open();
    }

    public getName(): string {
        return "Dialog";
    }

    public stop() {
    }

    public cleanUp() {
        this.div.remove();
        this.div = null;
        this.dialog = null;
    }

    private setSize() {
        let props: ActDialogParm = <ActDialogParm>this.properties;

        if (props.sizeType.value === "%") {
            this.w = (window.innerWidth * props.width / 100) + "px";
            this.h = (window.innerHeight * props.height / 100) + "px";
        } else {
            this.w = props.width + "px";
            this.h = props.height + "px";
        }

    }

    public onPropertiesChange() {
        var props: ActDialogParm = <ActDialogParm>this.properties;

        //remove after migration to new version of dialog actuator is complete
        //previous version did not have sizeType
        if (!props.sizeType) {
            props.sizeType = new SelectType();
            props.sizeType.values = ["%", "px"];
            props.sizeType.value = "%";
        }

        this.setSize();
        if (this.dialog == null) {
            this.div = GuiUtils.createDiv();
            //this.div.style.visibility = "visible";

            this.dialog = new VDiag(this.div, props.title, VDiag.center, this.w, this.h, "350px", props.modal);

            let button: HTMLButtonElement = this.dialog.addButton("Close");

            button.onclick = (e) => {
                if (!Engine.audioEngine.unlocked) {
                    Engine.audioEngine.unlock();
                }
                if (Engine.audioEngine.audioContext.state === "suspended") {
                    Engine.audioEngine.audioContext.resume().then(() => {
                        this.dialog.close();
                    });
                } else {
                    this.dialog.close();
                }
                return true;
            }
            this.dialog.close();

        }

        if (props.title.trim() == "") {
            this.dialog.hideTitleBar();
        } else {
            this.dialog.showTitleBar();
        }

        if (props.transparent) {
            this.dialog.setBackGround("transparent");
        }

        if (!props.border) {
            this.dialog.setBorder("transparent");
        }


        // this.dialog.setShowEffect({
        //     effect: props.openEffect,
        //     duration: props.openTime
        // });
        // this.dialog.setHideEffect({
        //     effect: props.closeEffect,
        //     duration: props.closeTime
        // });

        this.dialog.setTitle(props.title);
        this.div.innerHTML = props.msg;

        if (props.htmlFile && props.htmlFile.value != null) {
            let xhttp = new XMLHttpRequest();
            xhttp.onload = () => {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    this.div.innerHTML = xhttp.responseText;
                }
            };
            xhttp.open("GET", Vishva.vHome + "assets/" + props.htmlFile.value, true);
            xhttp.send();
        }

        this.dialog.onClose(() => {
            this.onActuateEnd();
        })

        this.dialog.setSize(this.w, this.h);

        window.addEventListener("resize", (event) => {
            this.setSize();
            this.dialog.setSize(this.w, this.h);
        });

        if (this.properties.autoStart) {
            this.dialog.open();
        }

    }

    public isReady(): boolean {
        return true;
    }


}


SNAManager.getSNAManager().addActuator("Dialog", ActuatorDialog);
