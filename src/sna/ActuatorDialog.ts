import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh } from "babylonjs";
import { GuiUtils } from "../gui/GuiUtils";
import { FileInputType } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";
import { VDiag } from "../gui/components/VDiag";


export class ActDialogParm extends ActProperties {
    msg: string = "";
    htmlFile: FileInputType = new FileInputType("Html Fragment", "\.html$", true);
    title: string = "";
    height: number = 50;
    width: number = 50;
    modal: boolean = true;
    draggable: boolean = false;
    openEffect: string = "scale";
    openTime: number = 1000;
    closeEffect: string = "explode";
    closeTime: number = 1000;
}

/**
 * shows a dialog box on being actuated.
 */
export class ActuatorDialog extends ActuatorAbstract {

    div: HTMLDivElement;
    dialog: VDiag;

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

    public onPropertiesChange() {
        var props: ActDialogParm = <ActDialogParm>this.properties;
        if (this.dialog == null) {
            console.log(props);
            this.div = GuiUtils.createDiv();
            //this.div.style.visibility = "visible";

            this.dialog = new VDiag(this.div, props.title, VDiag.center, (window.innerWidth * props.width / 100) + "px", (window.innerHeight * props.height / 100) + "px", "350px", props.modal);


            let button: HTMLButtonElement = this.dialog.addButton("Close");

            button.onclick = (e) => {
                this.dialog.close();
                return true;
            }
            this.dialog.close();

        }

        if (props.title.trim() == "") {
            console.log("hidding title bar");
            this.dialog.hideTitleBar();
        } else {
            this.dialog.showTitleBar();
        }

        this.dialog.setShowEffect({
            effect: props.openEffect,
            duration: props.openTime
        });
        this.dialog.setHideEffect({
            effect: props.closeEffect,
            duration: props.closeTime
        });

        this.dialog.setTitle(props.title);
        this.div.innerHTML = props.msg;

        if (props.htmlFile && props.htmlFile.value != null) {
            $.ajax({
                url: Vishva.vHome + "assets/" + props.htmlFile.value,
                success: (data) => {
                    this.div.innerHTML = data;
                },
                dataType: "text"
            });
        }

        this.dialog.onClose(() => {
            //Engine.audioEngine.unlock();
            this.onActuateEnd();
        })

        this.dialog.setSize(window.innerWidth * props.width / 100, window.innerHeight * props.height / 100);

        if (this.properties.autoStart) {
            this.dialog.open();
        }

    }

    public isReady(): boolean {
        return true;
    }


}


SNAManager.getSNAManager().addActuator("Dialog", ActuatorDialog);
