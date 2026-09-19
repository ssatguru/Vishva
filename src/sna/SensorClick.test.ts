import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for SensorClick behavior in a WebXR session (task 10.2).
 *
 * These verify that when an XR_Select routes through the scene picking system
 * and fires the mesh's ActionManager pick trigger, the registered SensorClick
 * action emits its signal (Requirements 8.1, 8.2), and that the desktop
 * alt/ctl/shift modifier guard is skipped while `isInXR()` is true so XR
 * selects are never spuriously blocked (Requirement 8.3). A desktop contrast
 * case confirms the guard still blocks a modified click when NOT in XR.
 */

// ─── ActionManager pick trigger IDs (match babylonjs constants) ─────────────

const OnLeftPickTrigger = 1;
const OnRightPickTrigger = 2;
const OnCenterPickTrigger = 3;
const OnPickTrigger = 5;
const OnDoublePickTrigger = 6;
const OnPointerOverTrigger = 10;
const OnPointerOutTrigger = 11;

// ─── Mock babylonjs ─────────────────────────────────────────────────────────

vi.mock("babylonjs", () => {
    class MockActionManager {
        static OnLeftPickTrigger = 1;
        static OnRightPickTrigger = 2;
        static OnCenterPickTrigger = 3;
        static OnPickTrigger = 5;
        static OnDoublePickTrigger = 6;
        static OnPointerOverTrigger = 10;
        static OnPointerOutTrigger = 11;
        actions: any[] = [];
        hoverCursor: string = "";
        constructor(_scene?: any) {}
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

// ─── Mock Vishva ────────────────────────────────────────────────────────────
// A mutable stub whose `key` modifier flags and `isInXR()` result the tests
// flip to exercise the guard in SensorClick's action callback.

const vishvaStub = {
    key: { alt: false, ctl: false, shift: false },
    _inXR: false,
    isInXR() {
        return this._inXR;
    },
};

vi.mock("../Vishva", () => ({
    Vishva: {
        get vishva() {
            return vishvaStub;
        },
    },
}));

// ─── Mock VishvaGUI (SelectType) ────────────────────────────────────────────

vi.mock("../gui/VishvaGUI", () => {
    class SelectType {
        values: string[] = [];
        value: string = "";
        type: string = "SelectType";
    }
    return { SelectType, FileInputType: class {}, Range: class {}, MeshPickerType: class {} };
});

// ─── Mock proximity check — always pass so it never interferes ──────────────

vi.mock("./proximityCheck", () => ({
    shouldEmitByProximity: () => true,
}));

// ─── Mock SNA base module ───────────────────────────────────────────────────
// SensorAbstract.emitSignal is what we assert on. SNAManager.getAV returns null.

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

        emitSignal(_e?: any) {}

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
            if (!SNAManager.sm) SNAManager.sm = new SNAManager();
            return SNAManager.sm;
        }

        addSensor(name: string, sensor: any) {
            this.sensorList.push(name);
            this.sensorMap[name] = sensor;
        }

        getSensorList(): string[] {
            return this.sensorList;
        }

        getAV(): any {
            return null;
        }
    }

    return { SNAproperties, SensorAbstract, SNAManager };
});

// ─── Import after mocks ─────────────────────────────────────────────────────

import { SenClickProp, SensorClick } from "./SensorClick";
import { SNAManager } from "./SNA";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockScene(): any {
    return {
        onBeforeRenderObservable: {
            _observers: [] as any[],
            add(cb: any) {
                const o = { callback: cb };
                this._observers.push(o);
                return o;
            },
            remove(o: any) {
                const i = this._observers.indexOf(o);
                if (i >= 0) this._observers.splice(i, 1);
            },
        },
    };
}

function createMockMesh(scene?: any): any {
    const s = scene || createMockScene();
    return {
        actionManager: null,
        absolutePosition: { x: 0, y: 0, z: 0 },
        getScene: () => s,
    };
}

/**
 * Build a SensorClick with real prototype methods, wired to a mock mesh, then
 * run onPropertiesChange so it registers its ActionManager pick action.
 */
function createSensor(clickType: string = "leftClick"): { sensor: any; mesh: any } {
    const mesh = createMockMesh();
    const props = new SenClickProp();
    props.clickType.value = clickType;
    props.avProximity = 0;

    const sensor = Object.create(SensorClick.prototype);
    sensor.mesh = mesh;
    sensor.properties = props;
    sensor.actions = [];
    sensor.disabled = false;
    sensor._renderObserver = null;
    sensor._isHovering = false;

    sensor.onPropertiesChange();
    return { sensor, mesh };
}

/**
 * Find the pick-trigger action (the one that emits the signal) among the
 * actions registered on the mesh's ActionManager and invoke its execution
 * function, simulating a pick fired through the scene picking system.
 */
function firePick(mesh: any, triggerId: number): void {
    const action = mesh.actionManager.actions.find((a: any) => a.trigger === triggerId);
    expect(action, "pick action should be registered").toBeTruthy();
    action._executionFunction({ source: mesh });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    vishvaStub.key.alt = false;
    vishvaStub.key.ctl = false;
    vishvaStub.key.shift = false;
    vishvaStub._inXR = false;
});

describe("SensorClick registration", () => {
    it("registers 'Click' with the SNAManager", () => {
        expect(SNAManager.getSNAManager().getSensorList()).toContain("Click");
    });

    it("registers a leftClick pick action on the mesh ActionManager", () => {
        const { mesh } = createSensor("leftClick");
        const pickAction = mesh.actionManager.actions.find(
            (a: any) => a.trigger === OnLeftPickTrigger
        );
        expect(pickAction).toBeTruthy();
    });
});

describe("SensorClick XR select fires the signal (Requirements 8.1, 8.2)", () => {
    it("emits its signal when an XR select fires the mesh pick trigger", () => {
        const { sensor, mesh } = createSensor("leftClick");
        const emitSpy = vi.spyOn(sensor, "emitSignal");

        vishvaStub._inXR = true; // active XR session
        firePick(mesh, OnLeftPickTrigger);

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it("emits for an anyClick sensor via OnPickTrigger in XR", () => {
        const { sensor, mesh } = createSensor("anyClick");
        const emitSpy = vi.spyOn(sensor, "emitSignal");

        vishvaStub._inXR = true;
        firePick(mesh, OnPickTrigger);

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});

describe("SensorClick modifier guard is skipped in XR (Requirement 8.3)", () => {
    it("still emits when alt is asserted but a session is active", () => {
        const { sensor, mesh } = createSensor("leftClick");
        const emitSpy = vi.spyOn(sensor, "emitSignal");

        vishvaStub._inXR = true;
        vishvaStub.key.alt = true; // stale/asserted modifier — must not block in XR

        firePick(mesh, OnLeftPickTrigger);

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it("still emits when ctl and shift are asserted but a session is active", () => {
        const { sensor, mesh } = createSensor("leftClick");
        const emitSpy = vi.spyOn(sensor, "emitSignal");

        vishvaStub._inXR = true;
        vishvaStub.key.ctl = true;
        vishvaStub.key.shift = true;

        firePick(mesh, OnLeftPickTrigger);

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});

describe("SensorClick desktop modifier guard still blocks when not in XR (contrast)", () => {
    it("does NOT emit when alt is asserted and no session is active", () => {
        const { sensor, mesh } = createSensor("leftClick");
        const emitSpy = vi.spyOn(sensor, "emitSignal");

        vishvaStub._inXR = false;
        vishvaStub.key.alt = true;

        firePick(mesh, OnLeftPickTrigger);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    it("emits on an unmodified desktop click (no session, no modifiers)", () => {
        const { sensor, mesh } = createSensor("leftClick");
        const emitSpy = vi.spyOn(sensor, "emitSignal");

        vishvaStub._inXR = false; // desktop

        firePick(mesh, OnLeftPickTrigger);

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});
