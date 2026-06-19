import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";

/**
 * Property-based tests for SensorKeyboard
 */

// Mock babylonjs module
vi.mock("babylonjs", () => {
    const OnPointerOverTrigger = 10;
    const OnPointerOutTrigger = 11;

    class MockActionManager {
        static OnPointerOverTrigger = OnPointerOverTrigger;
        static OnPointerOutTrigger = OnPointerOutTrigger;
        actions: any[] = [];
        hoverCursor: string = "";
        registerAction(action: any) {
            this.actions.push(action);
            return action;
        }
        unregisterAction(action: any) {
            const idx = this.actions.indexOf(action);
            if (idx >= 0) this.actions.splice(idx, 1);
        }
        dispose() {}
    }

    class MockExecuteCodeAction {
        trigger: number;
        _executionFunction: Function;
        constructor(trigger: number, func: Function) {
            this.trigger = trigger;
            this._executionFunction = func;
        }
    }

    return {
        ActionManager: MockActionManager,
        ExecuteCodeAction: MockExecuteCodeAction,
        Action: class {},
        Observer: class {},
        Scene: class {},
    };
});

// Mock Vishva module
vi.mock("../Vishva", () => ({
    Vishva: {
        vishva: {
            keysDisabled: false,
        },
    },
}));

// Mock VishvaGUI module for SelectType
vi.mock("../gui/VishvaGUI", () => {
    class SelectType {
        values: string[] = [];
        value: string = "";
        type: string = "SelectType";
    }
    return { SelectType, FileInputType: class {}, Range: class {}, MeshPickerType: class {} };
});

// Mock the SNA module
vi.mock("./SNA", () => {
    class SNAproperties {
        signalId: string = "0";
        signalEnable: string = "";
        signalDisable: string = "";
    }

    class SensorAbstract {
        mesh: any;
        properties: any;
        actions: any[] = [];
        disabled: boolean = false;
        _keyDownHandler: any = null;
        _keyUpHandler: any = null;

        constructor(mesh: any, properties: any) {
            this.mesh = mesh;
            if (properties == null) {
                const propConstructor = this.getPropertiesType();
                this.properties = new (propConstructor as any)();
            } else {
                this.properties = properties;
            }
        }

        getPropertiesType(): any {
            return SNAproperties;
        }

        emitSignal(e?: any) {}

        removeActions() {
            this.actions = [];
        }

        handlePropertiesChange() {
            this.removeActions();
            this.onPropertiesChange();
        }

        onPropertiesChange() {}

        getType(): string {
            return "SENSOR";
        }
    }

    const sensorList: string[] = [];
    const sensorMap: any = {};

    class SNAManager {
        static sm: SNAManager | null = null;
        sensorList = sensorList;
        sensorMap = sensorMap;

        static getSNAManager(): SNAManager {
            if (!SNAManager.sm) {
                SNAManager.sm = new SNAManager();
            }
            return SNAManager.sm;
        }

        addSensor(name: string, sensor: any) {
            this.sensorList.push(name);
            this.sensorMap[name] = sensor;
        }

        getAV(): any { return null; }
    }

    return { SNAproperties, SensorAbstract, SNAManager };
});

// Provide a minimal document mock for the node test environment
(globalThis as any).document = {
    activeElement: null,
    body: {},
};

// Mock window.addEventListener/removeEventListener for keyboard events
const windowListeners: { [key: string]: Function[] } = {};

const origAdd = globalThis.window?.addEventListener;
const origRemove = globalThis.window?.removeEventListener;

globalThis.window = globalThis.window || {} as any;
(globalThis.window as any).addEventListener = (type: string, handler: any) => {
    if (!windowListeners[type]) windowListeners[type] = [];
    windowListeners[type].push(handler);
};
(globalThis.window as any).removeEventListener = (type: string, handler: any) => {
    if (windowListeners[type]) {
        const idx = windowListeners[type].indexOf(handler);
        if (idx >= 0) windowListeners[type].splice(idx, 1);
    }
};

function dispatchKeyEvent(type: "keydown" | "keyup", event: any) {
    const handlers = windowListeners[type] || [];
    for (const handler of handlers) {
        handler(event);
    }
}

function clearWindowListeners() {
    windowListeners["keydown"] = [];
    windowListeners["keyup"] = [];
}

import { SensorKeyboard, SenKeyboardProp } from "./SensorKeyboard";
import { Vishva } from "../Vishva";

// The key values from SenKeyboardProp (62 entries)
const KEY_VALUES = [
    "A","B","C","D","E","F","G","H","I","J","K","L","M",
    "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
    "0","1","2","3","4","5","6","7","8","9",
    "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
    "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
    " ","Enter","Escape","Tab","Backspace","Delete",
    "Home","End","PageUp","PageDown"
];

/**
 * Helper: create a SensorKeyboard instance directly (bypassing queueMicrotask)
 */
function createSensor(config: {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    onKeyDown?: boolean;
    onKeyUp?: boolean;
    onlyOnPointerOver?: boolean;
}) {
    const mockScene = {
        onBeforeRenderObservable: {
            _observers: [] as any[],
            add(cb: any) { const o = { callback: cb }; this._observers.push(o); return o; },
            remove(o: any) { const i = this._observers.indexOf(o); if (i >= 0) this._observers.splice(i, 1); },
        },
    };

    const mesh: any = {
        actionManager: null,
        absolutePosition: { x: 0, y: 0, z: 0 },
        getScene: () => mockScene,
    };

    const props = new SenKeyboardProp();
    props.key.value = config.key;
    props.ctrl = config.ctrl;
    props.alt = config.alt;
    props.shift = config.shift;
    props.onKeyDown = config.onKeyDown ?? true;
    props.onKeyUp = config.onKeyUp ?? false;
    props.onlyOnPointerOver = config.onlyOnPointerOver ?? false;

    const sensor: any = Object.create(SensorKeyboard.prototype);
    sensor.mesh = mesh;
    sensor.properties = props;
    sensor.actions = [];
    sensor.disabled = false;
    sensor._pointerOver = false;
    sensor._keyDownHandler = null;
    sensor._keyUpHandler = null;
    sensor._renderObserver = null;

    return { sensor, mesh };
}

// ─── Property 2: Signal emission requires exact key and modifier match ──────

describe("Feature: sensor-keyboard, Property 2: Signal emission requires exact key and modifier match", () => {

    afterEach(() => {
        clearWindowListeners();
    });

    it("emits signal iff key and all modifiers match exactly", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...KEY_VALUES),
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                fc.constantFrom(...KEY_VALUES),
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                (configKey, configCtrl, configAlt, configShift,
                 eventKey, eventCtrl, eventAlt, eventShift) => {
                    clearWindowListeners();
                    (Vishva as any).vishva = { keysDisabled: false };

                    const { sensor } = createSensor({
                        key: configKey,
                        ctrl: configCtrl,
                        alt: configAlt,
                        shift: configShift,
                    });

                    let signalEmitted = false;
                    sensor.emitSignal = () => { signalEmitted = true; };

                    sensor.onPropertiesChange();

                    // Dispatch a keydown event
                    dispatchKeyEvent("keydown", {
                        key: eventKey,
                        ctrlKey: eventCtrl,
                        altKey: eventAlt,
                        shiftKey: eventShift,
                        repeat: false,
                    });

                    const shouldEmit =
                        eventKey.toLowerCase() === configKey.toLowerCase() &&
                        eventCtrl === configCtrl &&
                        eventAlt === configAlt &&
                        eventShift === configShift;

                    expect(signalEmitted).toBe(shouldEmit);
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ─── Property 4: Trigger registration matches event type configuration ──────

describe("Feature: sensor-keyboard, Property 4: Trigger registration matches event type configuration", () => {

    afterEach(() => {
        clearWindowListeners();
    });

    it("number of registered window listeners equals count of true values among {onKeyDown, onKeyUp}", () => {
        fc.assert(
            fc.property(
                fc.boolean(),
                fc.boolean(),
                (onKeyDown: boolean, onKeyUp: boolean) => {
                    clearWindowListeners();

                    const { sensor } = createSensor({
                        key: " ",
                        ctrl: false,
                        alt: false,
                        shift: false,
                        onKeyDown,
                        onKeyUp,
                        onlyOnPointerOver: false,
                    });

                    sensor.onPropertiesChange();

                    const keydownCount = (windowListeners["keydown"] || []).length;
                    const keyupCount = (windowListeners["keyup"] || []).length;

                    expect(keydownCount).toBe(onKeyDown ? 1 : 0);
                    expect(keyupCount).toBe(onKeyUp ? 1 : 0);
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ─── Property 3: Guard conditions prevent signal emission ───────────────────

const TEXT_INPUT_TYPES = ["text", "number", "password", "email", "search", "url", "tel"];
type GuardType = "repeat" | "keysDisabled" | "textarea" | "select" | "input" | "contentEditable";
const GUARD_TYPES: GuardType[] = ["repeat", "keysDisabled", "textarea", "select", "input", "contentEditable"];

describe("Feature: sensor-keyboard, Property 3: Guard conditions prevent signal emission", () => {

    const arbKey = fc.constantFrom(...KEY_VALUES);
    const arbModifiers = fc.record({
        ctrl: fc.boolean(),
        alt: fc.boolean(),
        shift: fc.boolean()
    });
    const arbGuard = fc.constantFrom(...GUARD_TYPES);
    const arbGuards = fc.uniqueArray(arbGuard, { minLength: 1, maxLength: GUARD_TYPES.length });
    const arbInputType = fc.constantFrom(...TEXT_INPUT_TYPES);

    let activeElementMock: any = null;

    function mockActiveElement(el: any) {
        activeElementMock = el;
        Object.defineProperty(document, "activeElement", {
            get: () => activeElementMock,
            configurable: true
        });
    }

    function resetActiveElement() {
        activeElementMock = null;
        Object.defineProperty(document, "activeElement", {
            get: () => null,
            configurable: true
        });
    }

    function applyGuard(guard: GuardType, inputType: string) {
        switch (guard) {
            case "repeat": break;
            case "keysDisabled":
                (Vishva.vishva as any).keysDisabled = true;
                break;
            case "textarea":
                mockActiveElement({ tagName: "TEXTAREA", contentEditable: "false" });
                break;
            case "select":
                mockActiveElement({ tagName: "SELECT", contentEditable: "false" });
                break;
            case "input":
                mockActiveElement({ tagName: "INPUT", type: inputType, contentEditable: "false" });
                break;
            case "contentEditable":
                mockActiveElement({ tagName: "DIV", contentEditable: "true" });
                break;
        }
    }

    function cleanupGuards() {
        (Vishva.vishva as any).keysDisabled = false;
        resetActiveElement();
    }

    afterEach(() => {
        cleanupGuards();
        clearWindowListeners();
    });

    it("no signal is emitted when at least one guard condition is active", () => {
        fc.assert(
            fc.property(
                arbKey,
                arbModifiers,
                arbGuards,
                arbInputType,
                (key, modifiers, guards, inputType) => {
                    cleanupGuards();
                    clearWindowListeners();

                    const { sensor } = createSensor({
                        key,
                        ctrl: modifiers.ctrl,
                        alt: modifiers.alt,
                        shift: modifiers.shift,
                    });

                    const emitSpy = vi.fn();
                    sensor.emitSignal = emitSpy;
                    sensor.onPropertiesChange();

                    for (const guard of guards) {
                        applyGuard(guard, inputType);
                    }

                    const isRepeat = guards.includes("repeat");
                    dispatchKeyEvent("keydown", {
                        key,
                        ctrlKey: modifiers.ctrl,
                        altKey: modifiers.alt,
                        shiftKey: modifiers.shift,
                        repeat: isRepeat,
                    });

                    expect(emitSpy).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it("each individual guard type independently prevents signal emission", () => {
        fc.assert(
            fc.property(
                arbKey,
                arbModifiers,
                arbGuard,
                arbInputType,
                (key, modifiers, guard, inputType) => {
                    cleanupGuards();
                    clearWindowListeners();

                    const { sensor } = createSensor({
                        key,
                        ctrl: modifiers.ctrl,
                        alt: modifiers.alt,
                        shift: modifiers.shift,
                    });

                    const emitSpy = vi.fn();
                    sensor.emitSignal = emitSpy;
                    sensor.onPropertiesChange();

                    applyGuard(guard, inputType);

                    const isRepeat = guard === "repeat";
                    dispatchKeyEvent("keydown", {
                        key,
                        ctrlKey: modifiers.ctrl,
                        altKey: modifiers.alt,
                        shiftKey: modifiers.shift,
                        repeat: isRepeat,
                    });

                    expect(emitSpy).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ─── Property 5: Pointer-over gating controls signal emission ───────────────

describe("Feature: sensor-keyboard, Property 5: Pointer-over gating controls signal emission", () => {

    const keyArb = fc.constantFrom(...KEY_VALUES);

    afterEach(() => {
        clearWindowListeners();
    });

    function testPointerOverGating(
        key: string,
        ctrl: boolean,
        alt: boolean,
        shift: boolean,
        onlyOnPointerOver: boolean,
        pointerOver: boolean
    ): boolean {
        clearWindowListeners();
        (Vishva.vishva as any).keysDisabled = false;

        const { sensor } = createSensor({
            key,
            ctrl,
            alt,
            shift,
            onlyOnPointerOver,
        });

        sensor._pointerOver = pointerOver;

        let signalEmitted = false;
        sensor.emitSignal = () => { signalEmitted = true; };

        sensor.onPropertiesChange();

        dispatchKeyEvent("keydown", {
            key,
            ctrlKey: ctrl,
            altKey: alt,
            shiftKey: shift,
            repeat: false,
        });

        return signalEmitted;
    }

    it("signal emitted iff onlyOnPointerOver is false OR pointer is over mesh", () => {
        fc.assert(
            fc.property(
                keyArb,
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                (key, ctrl, alt, shift, onlyOnPointerOver, pointerOver) => {
                    const emitted = testPointerOverGating(key, ctrl, alt, shift, onlyOnPointerOver, pointerOver);
                    const expectedEmission = !onlyOnPointerOver || pointerOver;
                    expect(emitted).toBe(expectedEmission);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("when onlyOnPointerOver is false, signal is always emitted", () => {
        fc.assert(
            fc.property(
                keyArb,
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                (key, ctrl, alt, shift, pointerOver) => {
                    const emitted = testPointerOverGating(key, ctrl, alt, shift, false, pointerOver);
                    expect(emitted).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("when onlyOnPointerOver is true and pointer is NOT over mesh, signal is NOT emitted", () => {
        fc.assert(
            fc.property(
                keyArb,
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                (key, ctrl, alt, shift) => {
                    const emitted = testPointerOverGating(key, ctrl, alt, shift, true, false);
                    expect(emitted).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("when onlyOnPointerOver is true and pointer IS over mesh, signal is emitted", () => {
        fc.assert(
            fc.property(
                keyArb,
                fc.boolean(),
                fc.boolean(),
                fc.boolean(),
                (key, ctrl, alt, shift) => {
                    const emitted = testPointerOverGating(key, ctrl, alt, shift, true, true);
                    expect(emitted).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
