import { describe, it, expect, vi } from "vitest";

// ─── Mock babylonjs ─────────────────────────────────────────────────────────

vi.mock("babylonjs", () => {
    class Vector3 {
        x: number;
        y: number;
        z: number;
        constructor(x: number, y: number, z: number) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        static Distance(a: Vector3, b: Vector3): number {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dz = a.z - b.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    }

    class MockActionManager {
        static OnPointerOverTrigger = 10;
        static OnPointerOutTrigger = 11;
        actions: any[] = [];
        hoverCursor: string = "";
        registerAction(action: any) { this.actions.push(action); return action; }
        unregisterAction(action: any) {}
        dispose() {}
    }

    class MockExecuteCodeAction {
        constructor(trigger: number, func: Function) {}
    }

    return {
        Vector3,
        Mesh: class {},
        Observer: class {},
        Scene: class {},
        ActionManager: MockActionManager,
        ExecuteCodeAction: MockExecuteCodeAction,
        Action: class {},
    };
});

// ─── Mock VishvaGUI (needed by SenClickProp/SenKeyboardProp imports) ────────

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
        constructor(mesh: any, properties: any) {
            this.mesh = mesh;
            this.properties = properties;
        }
        getPropertiesType(): any { return SNAproperties; }
        emitSignal(e?: any) {}
        removeActions() { this.actions = []; }
        onPropertiesChange() {}
        getType(): string { return "SENSOR"; }
    }

    class SNAManager {
        static sm: SNAManager | null = null;
        static getSNAManager(): SNAManager {
            if (!SNAManager.sm) SNAManager.sm = new SNAManager();
            return SNAManager.sm;
        }
        addSensor(name: string, sensor: any) {}
        getAV(): any { return null; }
    }

    return { SNAproperties, SensorAbstract, SNAManager };
});

// ─── Mock Vishva ────────────────────────────────────────────────────────────

vi.mock("../Vishva", () => ({
    Vishva: { vishva: { keysDisabled: false } },
}));

// ─── Imports after mocks ────────────────────────────────────────────────────

import { shouldEmitByProximity } from "./proximityCheck";
import { Vector3 } from "babylonjs";
import { SenClickProp } from "./SensorClick";
import { SenKeyboardProp } from "./SensorKeyboard";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SenClickProp and SenKeyboardProp default avProximity", () => {
    it("SenClickProp.avProximity defaults to 0", () => {
        const props = new SenClickProp();
        expect(props.avProximity).toBe(0);
    });

    it("SenKeyboardProp.avProximity defaults to 0", () => {
        const props = new SenKeyboardProp();
        expect(props.avProximity).toBe(0);
    });
});

describe("shouldEmitByProximity boundary tests", () => {
    it("returns true when distance exactly equals avProximity", () => {
        const avProximity = 10;
        // Place mesh at origin, avatar at (10, 0, 0) → distance = 10
        const meshPosition = new Vector3(0, 0, 0);
        const avatarMesh = { absolutePosition: new Vector3(10, 0, 0) };

        const result = shouldEmitByProximity(
            avProximity,
            meshPosition as any,
            avatarMesh as any
        );

        expect(result).toBe(true);
    });

    it("returns false when distance is avProximity + epsilon", () => {
        const avProximity = 10;
        // Place mesh at origin, avatar at (10.0001, 0, 0) → distance > 10
        const meshPosition = new Vector3(0, 0, 0);
        const avatarMesh = { absolutePosition: new Vector3(10.0001, 0, 0) };

        const result = shouldEmitByProximity(
            avProximity,
            meshPosition as any,
            avatarMesh as any
        );

        expect(result).toBe(false);
    });
});

describe("shouldEmitByProximity legacy deserialization", () => {
    it("legacy deserialization without avProximity field defaults to 0 (always emits)", () => {
        // Simulate legacy save data missing avProximity
        const legacyData = {
            signalId: "1",
            signalEnable: "",
            signalDisable: "",
            clickType: { values: ["leftClick"], value: "leftClick", type: "SelectType" },
            // Note: no avProximity field
        };

        // Instantiate fresh props (gets default avProximity = 0)
        const props = new SenClickProp();
        // Overlay legacy data (simulating deserialization)
        Object.assign(props, legacyData);

        // avProximity should remain 0 since it wasn't in legacyData
        expect(props.avProximity).toBe(0);

        // With avProximity=0, proximity check is disabled → always emits
        const meshPosition = new Vector3(0, 0, 0);
        const avatarMesh = { absolutePosition: new Vector3(999, 999, 999) };
        const result = shouldEmitByProximity(
            props.avProximity,
            meshPosition as any,
            avatarMesh as any
        );
        expect(result).toBe(true);
    });

    it("legacy SenKeyboardProp deserialization without avProximity defaults to 0", () => {
        const legacyData = {
            signalId: "2",
            key: { values: [" "], value: " ", type: "SelectType" },
            ctrl: false,
            alt: false,
            shift: false,
            onKeyDown: true,
            onKeyUp: false,
            onlyOnPointerOver: false,
            // Note: no avProximity field
        };

        const props = new SenKeyboardProp();
        Object.assign(props, legacyData);

        expect(props.avProximity).toBe(0);

        // Confirm proximity check passes with avProximity=0
        const meshPosition = new Vector3(0, 0, 0);
        const avatarMesh = { absolutePosition: new Vector3(500, 500, 500) };
        const result = shouldEmitByProximity(
            props.avProximity,
            meshPosition as any,
            avatarMesh as any
        );
        expect(result).toBe(true);
    });
});
