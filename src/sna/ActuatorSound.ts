import { ActProperties } from "./SNA";
import { ActuatorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import { Mesh, Sound } from "babylonjs";
import { FileInputType, SelectType, Range } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";
import { Engine } from "babylonjs";

export class ActSoundProp extends ActProperties {

    soundFile: FileInputType = new FileInputType("Sound Files", "\.wav$|\.ogg$|\.mp3$", true);
    attachToMesh: boolean = false;
    maxDistance: number = 100;
    rolloffFactor: number = 1;
    refDistance: number = 1
    distanceModel: SelectType = new SelectType();
    //volume: Range = new Range(0.0, 1.0, 1.0, 0.1);
    volume: number = 0.01;

    constructor() {
        super();
        this.distanceModel.values = ["exponential", "linear"];
        this.distanceModel.value = "exponential";
    }
}

export class ActuatorSound extends ActuatorAbstract {

    sound: Sound;

    public constructor(mesh: Mesh, prop: ActSoundProp) {
        super(mesh, prop != null ? prop : new ActSoundProp());
    }

    public actuate() {
        if (Engine.audioEngine.audioContext.state === "suspended") {
            window.setTimeout((() => {
                return this.onActuateEnd()
            }), 0);
            return;
        }
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
        var _props: ActSoundProp = <ActSoundProp>this.properties;
        if (_props.soundFile.value == null) return;

        let _sndOptions: Object;
        if (_props.distanceModel == null) {
            _sndOptions = {};
        } else {
            _sndOptions = {
                distanceModel: _props.distanceModel.value,
                rolloffFactor: _props.rolloffFactor,
                maxDistance: _props.maxDistance,
                refDistance: _props.refDistance
            };
        }
        //if the first time or if the soundfile changed then setup
        if (this.sound == null || _props.soundFile.value !== this.sound.name) {
            if (this.sound != null) {
                this.stop();
                this.sound.dispose();
            }
            this.actuating = true;
            this.sound = new Sound(Vishva.vHome + "assets/" + _props.soundFile.value, Vishva.vHome + "assets/" + _props.soundFile.value, this.mesh.getScene(),
                () => {
                    this.actuating = false;
                    if (_props.autoStart || this.queued > 0) {
                        this.start(this.properties.signalId);
                    }
                }
                , _sndOptions);
            this.updateSound(_props);
        } else {
            this.stop();
            this.sound.updateOptions(_sndOptions);
            this.updateSound(_props);
        }
    }

    private updateSound(properties: ActSoundProp) {
        if (properties.attachToMesh) {
            this.sound.attachToMesh(this.mesh);
        }
        this.sound.onended = () => { return this.onActuateEnd() };
        //this.sound.setVolume(properties.volume.value);
        this.sound.setVolume(properties.volume);
        this.sound.setPosition(this.mesh.position.clone());
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
        if (this.sound != null)
            this.sound.dispose();
    }

    public isReady(): boolean {
        return this.ready;
    }
}

SNAManager.getSNAManager().addActuator("Sound", ActuatorSound);