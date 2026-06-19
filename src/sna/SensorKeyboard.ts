import { SNAproperties } from "./SNA";
import { SensorAbstract } from "./SNA";
import { SNAManager } from "./SNA";
import {
    Action,
    ActionManager,
    ExecuteCodeAction,
    Observer,
    Scene
} from "babylonjs";
import { SelectType } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";
import { shouldEmitByProximity } from "./proximityCheck";

export class SenKeyboardProp extends SNAproperties {
    key: SelectType = new SelectType();
    ctrl: boolean = false;
    alt: boolean = false;
    shift: boolean = false;
    onKeyDown: boolean = true;
    onKeyUp: boolean = false;
    onlyOnPointerOver: boolean = false;
    avProximity: number = 0;

    constructor() {
        super();
        this.key.values = [
            // Letters A-Z
            "A","B","C","D","E","F","G","H","I","J","K","L","M",
            "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
            // Digits 0-9
            "0","1","2","3","4","5","6","7","8","9",
            // Function keys F1-F12
            "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
            // Arrow keys
            "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
            // Common keys
            " ","Enter","Escape","Tab","Backspace","Delete",
            "Home","End","PageUp","PageDown"
        ];
        this.key.value = " "; // Default to Space (KeyboardEvent.key for spacebar is " ")
    }
}

export class SensorKeyboard extends SensorAbstract {
    private _pointerOver: boolean = false;
    private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
    private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
    private _renderObserver: Observer<Scene> | null = null;

    override init() {}

    override getName(): string {
        return "Keyboard";
    }

    override getPropertiesType(): typeof SNAproperties {
        return SenKeyboardProp;
    }

    override getProperties(): SNAproperties {
        return this.properties;
    }

    override setProperties(properties: SNAproperties) {
        this.properties = properties;
    }

    override cleanUp() {
        this._pointerOver = false;
    }

    /**
     * Override removeActions to remove window keyboard listeners,
     * render observer, and pointer-over actions from mesh.actionManager.
     */
    public removeActions() {
        // Remove window keyboard listeners
        if (this._keyDownHandler) {
            window.removeEventListener("keydown", this._keyDownHandler);
            this._keyDownHandler = null;
        }
        if (this._keyUpHandler) {
            window.removeEventListener("keyup", this._keyUpHandler);
            this._keyUpHandler = null;
        }

        // Remove render observer
        if (this._renderObserver) {
            this.mesh.getScene().onBeforeRenderObservable.remove(this._renderObserver);
            this._renderObserver = null;
        }

        // Remove pointer-over actions from mesh.actionManager
        if (this.mesh.actionManager) {
            for (let action of this.actions) {
                this.mesh.actionManager.unregisterAction(action);
            }
            if (this.mesh.actionManager.actions.length === 0) {
                this.mesh.actionManager.dispose();
                this.mesh.actionManager = null;
            }
        }

        this.actions = [];
    }

    override onPropertiesChange() {
        let props = this.properties as SenKeyboardProp;

        // Register window-level keyboard listeners
        if (props.onKeyDown) {
            this._keyDownHandler = (e: KeyboardEvent) => this._handleKeyEvent(e);
            window.addEventListener("keydown", this._keyDownHandler);
        }

        if (props.onKeyUp) {
            this._keyUpHandler = (e: KeyboardEvent) => this._handleKeyEvent(e);
            window.addEventListener("keyup", this._keyUpHandler);
        }

        // Register pointer-over tracking on mesh ActionManager if enabled
        if (props.onlyOnPointerOver) {
            if (this.mesh.actionManager == null) {
                this.mesh.actionManager = new ActionManager(this.mesh.getScene());
            }

            let overAction: Action = new ExecuteCodeAction(
                ActionManager.OnPointerOverTrigger,
                () => { this._pointerOver = true; }
            );
            this.mesh.actionManager.registerAction(overAction);
            this.actions.push(overAction);

            let outAction: Action = new ExecuteCodeAction(
                ActionManager.OnPointerOutTrigger,
                () => { this._pointerOver = false; }
            );
            this.mesh.actionManager.registerAction(outAction);
            this.actions.push(outAction);

            // Dynamic cursor: update every frame while hovering
            if (props.avProximity > 0) {
                let scene = this.mesh.getScene();
                this._renderObserver = scene.onBeforeRenderObservable.add(() => {
                    if (!this._pointerOver) return;
                    const inRange = shouldEmitByProximity(
                        (this.properties as SenKeyboardProp).avProximity,
                        this.mesh.absolutePosition,
                        SNAManager.getSNAManager().getAV()
                    );
                    this.mesh.actionManager.hoverCursor = inRange ? "pointer" : "default";
                });
            } else {
                this.mesh.actionManager.hoverCursor = "pointer";
            }
        }
    }

    private _handleKeyEvent(e: KeyboardEvent) {
        let props = this.properties as SenKeyboardProp;

        // Guard: repeat key filter
        if (e.repeat) return;

        // Guard: edit mode — keys disabled
        if ((Vishva.vishva as any).keysDisabled) return;

        // Guard: edit mode — active text input element
        let activeEl = document.activeElement;
        if (activeEl) {
            let tag = activeEl.tagName;
            if (tag === "TEXTAREA" || tag === "SELECT") return;
            if (tag === "INPUT") {
                let inputType = (activeEl as HTMLInputElement).type?.toLowerCase();
                if (["text", "number", "password", "email", "search", "url", "tel"].includes(inputType)) return;
            }
            if ((activeEl as HTMLElement).contentEditable === "true") return;
        }

        // Guard: pointer-over gating
        if (props.onlyOnPointerOver && !this._pointerOver) return;

        // Check key match (case-insensitive for letter keys)
        if (e.key.toLowerCase() !== props.key.value.toLowerCase()) return;

        // Check exact modifier match
        if (e.ctrlKey !== props.ctrl) return;
        if (e.altKey !== props.alt) return;
        if (e.shiftKey !== props.shift) return;

        // Proximity guard
        if (!shouldEmitByProximity(
            (this.properties as SenKeyboardProp).avProximity,
            this.mesh.absolutePosition,
            SNAManager.getSNAManager().getAV()
        )) return;

        // All checks passed — emit signal
        this.emitSignal();
    }
}

SNAManager.getSNAManager().addSensor("Keyboard", SensorKeyboard);
