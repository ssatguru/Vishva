import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Unit tests for SenKeyboardProp defaults and SensorKeyboard registration.
 */

// ─── Mock babylonjs ─────────────────────────────────────────────────────────

const OnPointerOverTrigger = 10;
const OnPointerOutTrigger = 11;

vi.mock("babylonjs", () => {
    class MockActionManager {
        static OnPointerOverTrigger = 10;
        static OnPointerOutTrigger = 11;
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
        ActionEvent: class {},
    };
});

// ─── Mock Vishva ────────────────────────────────────────────────────────────

vi.mock("../Vishva", () => ({
    Vishva: {
        vishva: {
            keysDisabled: false,
        },
    },
}));

// ─── Mock VishvaGUI ─────────────────────────────────────────────────────────

vi.mock("../gui/VishvaGUI", () => {
    class SelectType {
        values: string[] = [];
        value: string = "";
        type: string = "SelectType";
    }
    return { SelectType, FileInputType: class {}, Range: class {}, MeshPickerType: class {} };
});

// ─── Mock SNA module ────────────────────────────────────────────────────────

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

        getSensorList(): string[] {
            return this.sensorList;
        }
    }

    return { SNAproperties, SensorAbstract, SNAManager };
});

// ─── Mock window listeners ──────────────────────────────────────────────────

const windowListeners: { [key: string]: Function[] } = {};

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

function clearWindowListeners() {
    windowListeners["keydown"] = [];
    windowListeners["keyup"] = [];
}

// ─── Import after mocks ─────────────────────────────────────────────────────

import { SenKeyboardProp, SensorKeyboard } from "./SensorKeyboard";
import { SNAManager } from "./SNA";

// ─── Helper ─────────────────────────────────────────────────────────────────

function createMockMesh(): any {
    return {
        actionManager: null,
        getScene: () => ({}),
    };
}

function createSensor(props?: SenKeyboardProp): { sensor: any; mesh: any } {
    const mesh = createMockMesh();
    const p = props ?? new SenKeyboardProp();

    const sensor = Object.create(SensorKeyboard.prototype);
    sensor.mesh = mesh;
    sensor.properties = p;
    sensor.actions = [];
    sensor.disabled = false;
    sensor._pointerOver = false;
    sensor._keyDownHandler = null;
    sensor._keyUpHandler = null;

    return { sensor, mesh };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

afterEach(() => {
    clearWindowListeners();
});

describe("SenKeyboardProp defaults", () => {
    it("key.value defaults to space character", () => {
        const props = new SenKeyboardProp();
        expect(props.key.value).toBe(" ");
    });

    it("key.values contains 62 entries", () => {
        const props = new SenKeyboardProp();
        expect(props.key.values.length).toBe(62);
    });

    it("ctrl defaults to false", () => {
        const props = new SenKeyboardProp();
        expect(props.ctrl).toBe(false);
    });

    it("alt defaults to false", () => {
        const props = new SenKeyboardProp();
        expect(props.alt).toBe(false);
    });

    it("shift defaults to false", () => {
        const props = new SenKeyboardProp();
        expect(props.shift).toBe(false);
    });

    it("onKeyDown defaults to true", () => {
        const props = new SenKeyboardProp();
        expect(props.onKeyDown).toBe(true);
    });

    it("onKeyUp defaults to false", () => {
        const props = new SenKeyboardProp();
        expect(props.onKeyUp).toBe(false);
    });

    it("onlyOnPointerOver defaults to false", () => {
        const props = new SenKeyboardProp();
        expect(props.onlyOnPointerOver).toBe(false);
    });
});

describe("SensorKeyboard registration and identity", () => {
    it("getName() returns 'Keyboard'", () => {
        const { sensor } = createSensor();
        expect(sensor.getName()).toBe("Keyboard");
    });

    it("getType() returns 'SENSOR'", () => {
        const { sensor } = createSensor();
        expect(sensor.getType()).toBe("SENSOR");
    });

    it("SNAManager.getSensorList() includes 'Keyboard'", () => {
        const sensorList = SNAManager.getSNAManager().getSensorList();
        expect(sensorList).toContain("Keyboard");
    });
});

describe("SensorKeyboard keyboard listener registration", () => {
    it("registers keydown listener when onKeyDown is true", () => {
        clearWindowListeners();
        const { sensor } = createSensor();
        sensor.onPropertiesChange();
        expect((windowListeners["keydown"] || []).length).toBe(1);
    });

    it("does not register keyup listener when onKeyUp is false (default)", () => {
        clearWindowListeners();
        const { sensor } = createSensor();
        sensor.onPropertiesChange();
        expect((windowListeners["keyup"] || []).length).toBe(0);
    });

    it("registers keyup listener when onKeyUp is true", () => {
        clearWindowListeners();
        const props = new SenKeyboardProp();
        props.onKeyUp = true;
        const { sensor } = createSensor(props);
        sensor.onPropertiesChange();
        expect((windowListeners["keyup"] || []).length).toBe(1);
    });
});

describe("SensorKeyboard pointer-over actions", () => {
    it("registers pointer-over and pointer-out actions when onlyOnPointerOver is true", () => {
        clearWindowListeners();
        const props = new SenKeyboardProp();
        props.onlyOnPointerOver = true;
        const { sensor } = createSensor(props);

        sensor.onPropertiesChange();

        // Only pointer-over/out actions go to mesh.actionManager (stored in this.actions)
        const pointerOverActions = sensor.actions.filter(
            (a: any) => a.trigger === OnPointerOverTrigger
        );
        const pointerOutActions = sensor.actions.filter(
            (a: any) => a.trigger === OnPointerOutTrigger
        );
        expect(pointerOverActions.length).toBe(1);
        expect(pointerOutActions.length).toBe(1);
    });

    it("does not register pointer-over actions when onlyOnPointerOver is false", () => {
        clearWindowListeners();
        const props = new SenKeyboardProp();
        props.onlyOnPointerOver = false;
        const { sensor } = createSensor(props);

        sensor.onPropertiesChange();

        expect(sensor.actions.length).toBe(0);
    });

    it("sets hoverCursor to 'pointer' when onlyOnPointerOver is true", () => {
        clearWindowListeners();
        const props = new SenKeyboardProp();
        props.onlyOnPointerOver = true;
        const { sensor, mesh } = createSensor(props);

        sensor.onPropertiesChange();

        expect(mesh.actionManager.hoverCursor).toBe("pointer");
    });

    it("does not create mesh actionManager when onlyOnPointerOver is false", () => {
        clearWindowListeners();
        const props = new SenKeyboardProp();
        props.onlyOnPointerOver = false;
        const { sensor, mesh } = createSensor(props);

        sensor.onPropertiesChange();

        expect(mesh.actionManager).toBeNull();
    });
});
