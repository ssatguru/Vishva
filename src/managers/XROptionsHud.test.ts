/**
 * Unit tests for XROptionsHud (the in-headset OPTIONS panel).
 *
 * babylonjs and babylonjs-gui are mocked so the HUD can be built in the node
 * test environment. The GUI mocks capture the slider onValueChanged / button
 * onPointerUp callbacks so tests can fire them and assert the CC setters + the
 * localStorage persistence. A fake XR camera (with a rig camera) exercises the
 * world-lock placement path.
 *
 * Covers plan Task 8.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock babylonjs: the HUD needs Mesh.DOUBLESIDE, MeshBuilder.CreatePlane, and
// Vector3 Up/Right/Forward + add/scale. Everything else is a type-only stub.
// ---------------------------------------------------------------------------
vi.mock("babylonjs", () => {
    class V3 {
        constructor(public x = 0, public y = 0, public z = 0) {}
        add(o: V3) {
            return new V3(this.x + o.x, this.y + o.y, this.z + o.z);
        }
        scale(s: number) {
            return new V3(this.x * s, this.y * s, this.z * s);
        }
        copyFrom(o: V3) {
            this.x = o.x;
            this.y = o.y;
            this.z = o.z;
            return this;
        }
        static Up() {
            return new V3(0, 1, 0);
        }
        static Right() {
            return new V3(1, 0, 0);
        }
        static Forward() {
            return new V3(0, 0, 1);
        }
        static Zero() {
            return new V3(0, 0, 0);
        }
    }

    const fakePlane = {
        isPickable: false,
        renderingGroupId: 0,
        position: new V3(0, 0, 0),
        enabled: false,
        setEnabled(v: boolean) {
            this.enabled = v;
        },
        lookAt: vi.fn(),
        dispose: vi.fn(),
    };

    return {
        Mesh: { DOUBLESIDE: 2 },
        MeshBuilder: {
            CreatePlane: vi.fn(() => fakePlane),
        },
        Vector3: V3,
        Scene: class {},
        Nullable: undefined,
        // expose the shared plane so tests can inspect it
        __fakePlane: fakePlane,
    };
});

// ---------------------------------------------------------------------------
// Mock babylonjs-gui: capture control instances + their observable callbacks.
// ---------------------------------------------------------------------------
const guiState = vi.hoisted(() => ({
    sliders: [] as any[],
    buttons: [] as any[],
    adtDisposed: false,
}));

vi.mock("babylonjs-gui", () => {
    function makeObservable() {
        const cbs: Array<(v: any) => void> = [];
        return {
            cbs,
            add: (cb: (v: any) => void) => {
                cbs.push(cb);
                return cb;
            },
            fire: (v: any) => cbs.forEach((c) => c(v)),
        };
    }

    class Slider {
        name: string;
        minimum = 0;
        maximum = 1;
        value = 0;
        width: any = 1;
        height: any = "";
        thumbWidth: any = "";
        isThumbCircle = false;
        isThumbClamped = false;
        color = "";
        background = "";
        borderColor = "";
        paddingBottom: any = "";
        onPointerDownObservable = makeObservable();
        onPointerUpObservable = makeObservable();
        onValueChangedObservable = makeObservable();
        constructor(name: string) {
            this.name = name;
            guiState.sliders.push(this);
        }
    }

    class TextBlock {
        name: string;
        text: string;
        color = "";
        fontSize = 0;
        height: any = "";
        textHorizontalAlignment = 0;
        textVerticalAlignment = 0;
        paddingLeft: any = "";
        paddingTop: any = "";
        textWrapping = false;
        static HORIZONTAL_ALIGNMENT_LEFT = 0;
        static VERTICAL_ALIGNMENT_TOP = 0;
        constructor(name: string, text = "") {
            this.name = name;
            this.text = text;
        }
    }

    class Rectangle {
        name: string;
        width: any = 1;
        height: any = 1;
        thickness = 0;
        background = "";
        alpha = 1;
        horizontalAlignment = 0;
        verticalAlignment = 0;
        static HORIZONTAL_ALIGNMENT_LEFT = 0;
        static VERTICAL_ALIGNMENT_TOP = 0;
        addControl() {}
        constructor(name: string) {
            this.name = name;
        }
    }

    class StackPanel {
        name: string;
        isVertical = true;
        width: any = 1;
        horizontalAlignment = 0;
        verticalAlignment = 0;
        paddingTop: any = "";
        addControl() {}
        constructor(name: string) {
            this.name = name;
        }
    }

    const Button = {
        CreateSimpleButton: (name: string, _label: string) => {
            const btn: any = {
                name,
                width: 1,
                height: "",
                color: "",
                background: "",
                fontSize: 0,
                cornerRadius: 0,
                thickness: 0,
                verticalAlignment: 0,
                horizontalAlignment: 0,
                paddingLeft: "",
                paddingRight: "",
                paddingBottom: "",
                isVisible: true,
                onPointerUpObservable: makeObservable(),
            };
            guiState.buttons.push(btn);
            return btn;
        },
    };

    const Control = {
        HORIZONTAL_ALIGNMENT_LEFT: 0,
        HORIZONTAL_ALIGNMENT_CENTER: 1,
        HORIZONTAL_ALIGNMENT_RIGHT: 2,
        VERTICAL_ALIGNMENT_TOP: 0,
        VERTICAL_ALIGNMENT_BOTTOM: 2,
    };

    const AdvancedDynamicTexture = {
        CreateForMesh: () => ({
            addControl: () => {},
            dispose: () => {
                guiState.adtDisposed = true;
            },
        }),
    };

    return { AdvancedDynamicTexture, Button, Control, Rectangle, Slider, StackPanel, TextBlock };
});

import { XROptionsHud } from "./XROptionsHud.js";

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function makeFakeCC() {
    return {
        getXRCamera: vi.fn(() => makeFakeXRCamera()),
        setXROrbitAlphaRate: vi.fn(),
        setXROrbitBetaRate: vi.fn(),
        setXRDollyRate: vi.fn(),
    };
}

function makeFakeXRCamera() {
    const eye = {
        computeWorldMatrix: vi.fn(),
        globalPosition: { x: 0, y: 1.6, z: 0 },
        position: { x: 0, y: 1.6, z: 0 },
        getFrontPosition: (d: number) => ({ x: 0, y: 1.6, z: d }),
        getDirection: (axis: any) => ({ x: axis.x, y: axis.y, z: axis.z }),
    };
    return { rigCameras: [eye] };
}

// A localStorage shim for the node env.
function installLocalStorage(initial: Record<string, string> = {}) {
    const store: Record<string, string> = { ...initial };
    (globalThis as any).localStorage = {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
            store[k] = String(v);
        },
        removeItem: (k: string) => {
            delete store[k];
        },
    };
    return store;
}

beforeEach(() => {
    guiState.sliders.length = 0;
    guiState.buttons.length = 0;
    guiState.adtDisposed = false;
    delete (globalThis as any).localStorage;
});

afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).localStorage;
});

describe("XROptionsHud — construction + sliders (Task 8)", () => {
    it("create() builds three sensitivity sliders and an Exit XR button", () => {
        const hud = new XROptionsHud();
        hud.create({} as any, makeFakeCC() as any);
        const names = guiState.sliders.map((s) => s.name).sort();
        expect(names).toEqual(["xralphaSlider", "xrbetaSlider", "xrradiusSlider"]);
        expect(guiState.buttons.map((b) => b.name)).toContain("xrExitBtn");
    });

    it("a slider change calls the matching CC setter and persists to localStorage", () => {
        installLocalStorage();
        const cc = makeFakeCC();
        const hud = new XROptionsHud();
        hud.create({} as any, cc as any);

        const alpha = guiState.sliders.find((s) => s.name === "xralphaSlider")!;
        alpha.onValueChangedObservable.fire(0.01);
        expect(cc.setXROrbitAlphaRate).toHaveBeenCalledWith(0.01);
        expect((globalThis as any).localStorage.getItem("vishva.xr.alphaRate")).toBe("0.01");

        const beta = guiState.sliders.find((s) => s.name === "xrbetaSlider")!;
        beta.onValueChangedObservable.fire(0.005);
        expect(cc.setXROrbitBetaRate).toHaveBeenCalledWith(0.005);
        expect((globalThis as any).localStorage.getItem("vishva.xr.betaRate")).toBe("0.005");

        const radius = guiState.sliders.find((s) => s.name === "xrradiusSlider")!;
        radius.onValueChangedObservable.fire(0.1);
        expect(cc.setXRDollyRate).toHaveBeenCalledWith(0.1);
        expect((globalThis as any).localStorage.getItem("vishva.xr.radiusRate")).toBe("0.1");
    });

    it("the Exit XR button invokes onExit", () => {
        const hud = new XROptionsHud();
        hud.create({} as any, makeFakeCC() as any);
        const onExit = vi.fn();
        hud.onExit = onExit;
        const exitBtn = guiState.buttons.find((b) => b.name === "xrExitBtn")!;
        exitBtn.onPointerUpObservable.fire(undefined);
        expect(onExit).toHaveBeenCalledTimes(1);
    });
});

describe("XROptionsHud — show/hide/toggle/dispose (Task 8)", () => {
    it("show() pushes the persisted rates to the CC and places the plane", () => {
        installLocalStorage();
        const cc = makeFakeCC();
        const hud = new XROptionsHud();
        hud.create({} as any, cc as any);

        hud.show();
        expect(hud.isVisible()).toBe(true);
        // Pushed all three defaults on show.
        expect(cc.setXROrbitAlphaRate).toHaveBeenCalledWith(0.0075);
        expect(cc.setXROrbitBetaRate).toHaveBeenCalledWith(0.003);
        expect(cc.setXRDollyRate).toHaveBeenCalledWith(0.05);
        // Placement read the XR camera.
        expect(cc.getXRCamera).toHaveBeenCalled();
    });

    it("toggle() flips visibility", () => {
        const hud = new XROptionsHud();
        hud.create({} as any, makeFakeCC() as any);
        expect(hud.isVisible()).toBe(false);
        hud.toggle();
        expect(hud.isVisible()).toBe(true);
        hud.toggle();
        expect(hud.isVisible()).toBe(false);
    });

    it("dispose() disposes the ADT + plane and tears down cleanly", () => {
        const hud = new XROptionsHud();
        hud.create({} as any, makeFakeCC() as any);
        hud.dispose();
        expect(guiState.adtDisposed).toBe(true);
        expect(hud.isVisible()).toBe(false);
    });
});

describe("XROptionsHud — sensitivity persistence (Task 8)", () => {
    it("loads persisted rates within range on create and pushes them to the CC on show", () => {
        installLocalStorage({
            "vishva.xr.alphaRate": "0.012",
            "vishva.xr.betaRate": "0.004",
            "vishva.xr.radiusRate": "0.15",
        });
        const cc = makeFakeCC();
        const hud = new XROptionsHud();
        hud.create({} as any, cc as any);
        hud.show();
        expect(cc.setXROrbitAlphaRate).toHaveBeenCalledWith(0.012);
        expect(cc.setXROrbitBetaRate).toHaveBeenCalledWith(0.004);
        expect(cc.setXRDollyRate).toHaveBeenCalledWith(0.15);
    });

    it("ignores out-of-range and non-finite persisted values (keeps defaults)", () => {
        installLocalStorage({
            "vishva.xr.alphaRate": "5", // > MAX_ORBIT_RATE (0.02)
            "vishva.xr.betaRate": "not-a-number",
            "vishva.xr.radiusRate": "-1", // < 0
        });
        const cc = makeFakeCC();
        const hud = new XROptionsHud();
        hud.create({} as any, cc as any);
        hud.pushSensitivityToController();
        expect(cc.setXROrbitAlphaRate).toHaveBeenCalledWith(0.0075);
        expect(cc.setXROrbitBetaRate).toHaveBeenCalledWith(0.003);
        expect(cc.setXRDollyRate).toHaveBeenCalledWith(0.05);
    });

    it("create() is a safe no-op for persistence when localStorage is absent", () => {
        // No installLocalStorage() call -> localStorage undefined.
        const cc = makeFakeCC();
        const hud = new XROptionsHud();
        expect(() => hud.create({} as any, cc as any)).not.toThrow();
        hud.pushSensitivityToController();
        expect(cc.setXROrbitAlphaRate).toHaveBeenCalledWith(0.0075);
    });
});
