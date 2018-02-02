namespace org.ssatguru.babylonjs.vishva.gui {
    import DialogOptions=JQueryUI.DialogOptions;
    import Skeleton=BABYLON.Skeleton;
    import AnimationRange=BABYLON.AnimationRange;
    import Vector3=BABYLON.Vector3;
    /**
     * Provides UI to manage an Item(mesh) properties
     */
    export class ItemPropsUI {
       
        private _vishva: Vishva;
        private _vishvaGUI: VishvaGUI;
        //private _snaUI:SnaUI;
        
        private _propsDiag: JQuery=null;
        private _fixingDragIssue: boolean=false;
        private _activePanel: number=-1;


        constructor(vishva: Vishva,vishvaGUI:VishvaGUI) {
            this._vishva=vishva;
            this._vishvaGUI=vishvaGUI;
        
            let propsAcc: JQuery=$("#propsAcc");

            propsAcc.accordion({
                animate: 100,
                heightStyle: "content",
                collapsible: true,
                activate: () => {
                    this._activePanel=propsAcc.accordion("option","active");
                },
                beforeActivate: (e,ui) => {
                    this.refreshPanel(this.getPanelIndex(ui.newHeader));

                }
            });

            //property dialog box
            this._propsDiag=$("#propsDiag");
            var dos: DialogOptions={
                autoOpen: false,
                resizable: false,
                position: DialogMgr.leftCenter,
                minWidth: 420,
                width: 420,
                // height: "auto",
                height: 650,
                closeOnEscape: false,
                //a) on open set the values of the fields in the active panel.
                //b) also if we switched from another mesh vishav will close open
                //by calling refreshPropsDiag()
                //c) donot bother refreshing values if we are just restarting
                //dialog for height and width re-sizing after drag
                open: (e,ui) => {
                    if(!this._fixingDragIssue) {
                        // refresh the active tab
                        this._activePanel=propsAcc.accordion("option","active");
                        this.refreshPanel(this._activePanel);
                        this.refreshingPropsDiag=false;
                    } else {
                        this._fixingDragIssue=false;
                    }
                },
                closeText: "",
                close: (e,ui) => {
                    if(!this._fixingDragIssue&&!this.refreshingPropsDiag&&(this._generalUI._snaUI!=null)&&this._generalUI._snaUI.isOpen()) {
                        this._generalUI._snaUI.close();
                    }
                },
                //after drag the dialog box doesnot resize
                //force resize by closing and opening
                dragStop: (e,ui) => {
                    this._fixingDragIssue=true;
                    this._propsDiag.dialog("close");
                    this._propsDiag.dialog("open");
                }
            };
            this._propsDiag.dialog(dos);
            this._propsDiag["jpo"]=DialogMgr.leftCenter;
            this._vishvaGUI.dialogs.push(this._propsDiag);
        }
        
        public open(){
            this._propsDiag.dialog("open");
        }
        public isOpen():boolean{
            return this._propsDiag.dialog("isOpen");
        }
        public close(){
            this._propsDiag.dialog("close");
        }
        
        /*
         * called by vishva when editcontrol
         * is switched from another mesh
         */
        refreshingPropsDiag: boolean=false;
        public refreshPropsDiag() {
            if((this._propsDiag===undefined)||(this._propsDiag===null)) return;
            if(this._propsDiag.dialog("isOpen")===true) {
                this.refreshingPropsDiag=true;
                this._propsDiag.dialog("close");
                this._propsDiag.dialog("open");
            }
        }
        //only refresh if general panel is active;
        public refreshGeneralPanel() {
            if(this._activePanel===propertyPanel.General) this.refreshPropsDiag();
        }

        private getPanelIndex(ui: JQuery): number {
            if(ui.text()=="General") return propertyPanel.General;
            if(ui.text()=="Physics") return propertyPanel.Physics;
            if(ui.text()=="Material") return propertyPanel.Material;
            if(ui.text()=="Lights") return propertyPanel.Lights;
            if(ui.text()=="Animations") return propertyPanel.Animations;

        }
        
        private _generalUI:GeneralUI;
        private _lightUI:LightUI;
        private _animationUI:AnimationUI;
        private _physicsUI:PhysicsUI;
         private _materialUI:MaterialUI;
        private refreshPanel(panelIndex: number) {
            if(panelIndex===propertyPanel.General) {
                if(this._generalUI==null) this._generalUI=new GeneralUI(this._vishva);
                this._generalUI._updateGeneral();
            } else if(panelIndex===propertyPanel.Lights) {
                if(this._lightUI==null) this._lightUI=new LightUI(this._vishva);
                this._lightUI._updateLight();
            } else if(panelIndex===propertyPanel.Animations) {
                if(this._animationUI==null) this._animationUI=new AnimationUI(this._vishva);
                this._animationUI._updateAnimations();
            } else if(panelIndex===propertyPanel.Physics) {
                if(this._physicsUI==null) this._physicsUI=new PhysicsUI(this._vishva);
                this._physicsUI._updatePhysics()
            } else if(panelIndex===propertyPanel.Material) {
                if(this._materialUI==null) this._materialUI=new MaterialUI(this._vishva);
                this._materialUI.updateMatUI();
            }
            //refresh sNaDialog if open
            if(this._generalUI._snaUI!=null && this._generalUI._snaUI.isOpen()) {
                this._generalUI._snaUI.close();
                this._generalUI._snaUI.show_sNaDiag();
            }
        }
    }
    const enum propertyPanel {
        General,
        Physics,
        Material,
        Lights,
        Animations
    }
}


