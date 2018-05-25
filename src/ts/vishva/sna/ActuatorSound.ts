//TODO Vishva.getSoundFiles() needs to be implemented.
//     This populates ActSoundProp.soundFile  value.
namespace org.ssatguru.babylonjs.vishva {
    
    
    import Mesh = BABYLON.Mesh;
    import SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
    import Range = org.ssatguru.babylonjs.vishva.gui.Range;
    import Sound = BABYLON.Sound;
    
    export class ActSoundProp extends ActProperties {
  
        soundFile: SelectType = new SelectType();
        attachToMesh: boolean = false;
        volume: Range = new Range(0.0, 1.0, 1.0, 0.1);
    }
    
    export class ActuatorSound extends ActuatorAbstract {

        sound: Sound;

        public constructor(mesh: Mesh, prop: ActSoundProp) {
            if (prop!=null){
                super(mesh, prop);
            }else{
                super(mesh, new ActSoundProp());
            }
        }

        public actuate() {
            if (this.properties.toggle) {
                if (this.properties.state_notReversed) {
                    this.sound.play();
                } else {
                    window.setTimeout((() => { return this.onActuateEnd() }), 0);
                }
                this.properties.state_notReversed = !this.properties.state_notReversed;
            } else {
                this.sound.play();
            }
        }

        /*
        update is little tricky here as sound file has to be loaded and that
        happens aynchronously
        it is not ready to play immediately
        */
        public onPropertiesChange() {
            var SOUND_ASSET_LOCATION: string = "vishva/assets/sounds/";
            //let RELATIVE_ASSET_LOCATION: string = "../../../../";
            let RELATIVE_ASSET_LOCATION: string = "";
            var properties: ActSoundProp = <ActSoundProp>this.properties;
            if (properties.soundFile.value == null) return;
            if (this.sound == null || properties.soundFile.value !== this.sound.name) {
                if (this.sound != null) {
                    this.stop();
                    this.sound.dispose();
                }
                this.ready = false;
                this.sound = new Sound(properties.soundFile.value, RELATIVE_ASSET_LOCATION + SOUND_ASSET_LOCATION + properties.soundFile.value, this.mesh.getScene(), ((properties) => {
                    return () => {
                        this.updateSound(properties);
                    }
                })(properties));
            } else {
                this.stop();
                this.updateSound(properties);
            }
        }

        private updateSound(properties: ActSoundProp) {
            this.ready = true;
            if (properties.attachToMesh) {
                this.sound.attachToMesh(this.mesh);
            }
            this.sound.onended = () => { return this.onActuateEnd() };
            this.sound.setVolume(properties.volume.value);
            if (properties.autoStart) {
                var started: boolean = this.start(this.properties.signalId);
                if (!started) this.queued++;
            }
        }

        public getName(): string {
            return "Sound";
        }

        public stop() {
            if (this.sound != null) {
                if (this.sound.isPlaying) {
                    this.sound.stop();
                    window.setTimeout((() => { return this.onActuateEnd() }), 0);
                }
            }
        }

        public cleanUp() {
        }

        public isReady(): boolean {
            return this.ready;
        }
    }

}

org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Sound", org.ssatguru.babylonjs.vishva.ActuatorSound);