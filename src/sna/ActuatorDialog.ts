import {ActProperties} from "./SNA";
import {ActuatorAbstract} from "./SNA";
import {SNAManager} from "./SNA";
import {Mesh} from "babylonjs";
import { GuiUtils } from "../gui/GuiUtils";
import { VDialog } from "../gui/VDialog";
import {DialogMgr} from "../gui/DialogMgr";
import { WindowsMotionController } from "babylonjs";

export class ActDialogParm extends ActProperties {
    msg: string="";
    title:string="";
}

/**
 * shows a dialog box on being actuated.
 */
export class ActuatorDialog extends ActuatorAbstract {
    
    div:HTMLDivElement;
    dialog:VDialog;

    public constructor(mesh: Mesh,parms: ActProperties) {
        if(parms!=null) {
            super(mesh,parms);
        } else {
            super(mesh,new ActDialogParm());
        }
    }


    public actuate() {
        this.dialog.setSize(window.innerWidth/2, window.innerHeight/2);
        this.dialog.open();
        this.onActuateEnd();
    }

    public getName(): string {
        return "Dialog";
    }

    public stop() {
       
    }

    public cleanUp() {
        this.div.remove();
        this.div=null;
        this.dialog=null;
    }

    public onPropertiesChange() {
        var props: ActDialogParm=<ActDialogParm>this.properties;
        if (this.dialog==null){
            
            this.div=GuiUtils.createDiv();
            this.dialog = new VDialog(this.div,props.title,DialogMgr.center,window.innerWidth/2, window.innerHeight/2, 350,true);
        }

        this.dialog.setTitle(props.title);
        this.div.innerHTML=props.msg;

        if(this.properties.autoStart) {
            this.dialog.open();
        }
    }

    public isReady(): boolean {
        return true;
    }

    
}


SNAManager.getSNAManager().addActuator("Dialog",ActuatorDialog);
