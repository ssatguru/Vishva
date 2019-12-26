import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh } from "babylonjs";
import { GuiUtils } from "../gui/GuiUtils";
import { VDialog } from "../gui/VDialog";
import { DialogMgr } from "../gui/DialogMgr";
import { WindowsMotionController } from "babylonjs";
import DialogButtonOptions = JQueryUI.DialogButtonOptions;
import { FileInputType } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";


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
    dialog: VDialog;

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

            this.div = GuiUtils.createDiv();
            this.dialog = new VDialog(this.div, props.title, DialogMgr.center, window.innerWidth * props.width / 100, window.innerHeight * props.height / 100, 350, props.modal);
            this.dialog.hideTitileBar();

            let dboClose: DialogButtonOptions = {};
            dboClose.text = "Close";
            dboClose.click = (e) => {
                this.dialog.close();
                return true;
            }
            let dbos: DialogButtonOptions[] = [dboClose];
            this.dialog.setButtons(dbos);
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
        //this.div.innerHTML = props.msg;

        console.log("loading html file");
        if (props.htmlFile && props.htmlFile.value != null) {
            console.log("doing ajax");
            $.ajax({
                url: Vishva.vHome + "/assets/"+props.htmlFile.value,
                success: (data) => {
                    this.div.innerHTML = data;
                },
                dataType: "text"
            });
        }



        this.dialog.onClose(() => {
            BABYLON.Engine.audioEngine.unlock();
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
