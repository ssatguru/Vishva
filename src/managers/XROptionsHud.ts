/**
 * XROptionsHud — the in-headset OPTIONS panel for Vishva's WebXR sessions.
 *
 * A world-space babylonjs-gui plane rendered inside the headset that hosts:
 *  - three sensitivity sliders (orbit alpha, orbit beta, dolly radius) that
 *    drive the CharacterController's XR camera sensitivity via its public
 *    setters (`setXROrbitAlphaRate` / `setXROrbitBetaRate` / `setXRDollyRate`),
 *  - an "Exit XR" button that asks the owner (XRIntegration) to end the session.
 *
 * The CharacterController owns locomotion, camera follow/orbit/dolly, and
 * controller binding; this HUD only exposes the user-tunable sensitivity rates
 * and an exit affordance. Vishva remains the authority for the sensitivity
 * VALUES: the CC exposes setters but NO getters, so the persisted values live
 * here (localStorage) and are pushed to the CC on `show()` and on every slider
 * change.
 *
 * The panel is WORLD-LOCKED: it is placed once in front of the viewer when
 * shown (reading the live head pose from the CC's XR camera rig) and then left
 * fixed. It is a top-level scene mesh (not parented) so it renders at a
 * focusable depth in VR. Every babylonjs-gui / camera access is defensively
 * guarded so the HUD silently no-ops under the mocked node test environment
 * (where GUI construction and the XR camera are absent) and never throws —
 * HUD failure must never affect session behaviour.
 *
 * NOTE: this replaces the old XRManager debug HUD. The DEBUG readout (live
 * stick axes, follow-camera radius/alpha/beta, entry-blend) is intentionally
 * dropped — those values were internals of the old self-owned XR machinery that
 * the CharacterController does not expose through its public API.
 */

import { Mesh, MeshBuilder, Nullable, Scene, Vector3 } from "babylonjs";
import {
    AdvancedDynamicTexture,
    Button,
    Control,
    Rectangle,
    Slider,
    StackPanel,
    TextBlock,
} from "babylonjs-gui";

/** Default ALPHA orbit rate (radians/frame at full stick deflection). */
const DEFAULT_ALPHA_RATE = 0.0075;
/** Default BETA orbit rate (radians/frame at full stick deflection). */
const DEFAULT_BETA_RATE = 0.003;
/** Default RADIUS dolly rate (camera-radius units per frame while held). */
const DEFAULT_RADIUS_RATE = 0.05;

/** Upper bound of the alpha/beta sensitivity sliders (minimum is 0). */
const MAX_ORBIT_RATE = 0.02;
/** Upper bound of the radius sensitivity slider (minimum is 0). */
const MAX_RADIUS_RATE = 0.2;

/** localStorage keys persisting the three orbit/dolly rates across sessions. */
const LS_ALPHA_RATE = "vishva.xr.alphaRate";
const LS_BETA_RATE = "vishva.xr.betaRate";
const LS_RADIUS_RATE = "vishva.xr.radiusRate";

/**
 * The subset of the CharacterController's XR API this HUD depends on. Kept as a
 * narrow structural type so the HUD is testable against a lightweight mock and
 * never imports the concrete class.
 */
export interface XRHudController {
    getXRCamera(): any;
    setXROrbitAlphaRate(v: number): void;
    setXROrbitBetaRate(v: number): void;
    setXRDollyRate(v: number): void;
}

export class XROptionsHud {
    /** The world-space plane hosting the HUD ADT. Null until created. */
    private _plane: Nullable<any> = null;
    private _texture: Nullable<AdvancedDynamicTexture> = null;

    /** Slider + label refs so values can be re-synced from the fields on show. */
    private _alphaSlider: Nullable<Slider> = null;
    private _betaSlider: Nullable<Slider> = null;
    private _radiusSlider: Nullable<Slider> = null;
    private _alphaLabel: Nullable<TextBlock> = null;
    private _betaLabel: Nullable<TextBlock> = null;
    private _radiusLabel: Nullable<TextBlock> = null;

    /** Whether the panel is currently shown. */
    private _visible = false;

    /** Authoritative sensitivity rates (persisted here; pushed to the CC). */
    private _alphaRate = DEFAULT_ALPHA_RATE;
    private _betaRate = DEFAULT_BETA_RATE;
    private _radiusRate = DEFAULT_RADIUS_RATE;

    private _scene: Nullable<Scene> = null;
    private _cc: Nullable<XRHudController> = null;

    /**
     * Invoked when the in-headset "Exit XR" button is pressed. The owner
     * (XRIntegration) wires this to end the session.
     */
    public onExit: (() => void) | null = null;

    /**
     * Build the HUD plane + GUI and bind the sliders to the CharacterController.
     * Idempotent: a no-op when already created. The whole body is guarded so a
     * construction failure (e.g. the mocked test env) leaves the HUD absent
     * rather than throwing. The HUD starts HIDDEN; call {@link show} to reveal.
     */
    public create(scene: Scene, cc: XRHudController): void {
        if (this._plane !== null) {
            return;
        }
        this._scene = scene;
        this._cc = cc;

        // Load persisted rates BEFORE building the sliders so they initialize to
        // the stored values.
        this._loadSensitivityFromStorage();

        try {
            // A world-space plane hosts the HUD so it renders at a focusable
            // depth in VR. DOUBLESIDE so the text is visible regardless of which
            // face ends up toward the viewer.
            const plane = MeshBuilder.CreatePlane(
                "xrOptionsPlane",
                { width: 1.4, height: 1.4, sideOrientation: Mesh.DOUBLESIDE },
                scene
            );
            // Pickable so the XR pointer-selection ray can hit the GUI controls;
            // draws on top of scene geometry.
            plane.isPickable = true;
            plane.renderingGroupId = 1;
            // Start hidden — show() reveals it once the head pose has settled.
            plane.setEnabled?.(false);

            const adt = AdvancedDynamicTexture.CreateForMesh(plane, 1024, 1024, false);

            // Semi-transparent dark backing panel for readable controls.
            const panel = new Rectangle("xrOptionsPanel");
            panel.width = 1;
            panel.height = 1;
            panel.thickness = 0;
            panel.background = "black";
            panel.alpha = 0.3;
            adt.addControl(panel);

            // --- sensitivity sliders (top-center stack) ---
            const sliderStack = new StackPanel("xrSensitivityStack");
            sliderStack.isVertical = true;
            sliderStack.width = 0.7;
            sliderStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            sliderStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            sliderStack.paddingTop = "60px";

            const buildSlider = (
                name: string,
                min: number,
                max: number,
                initial: number,
                assign: (v: number) => void
            ): { label: TextBlock; slider: Slider } => {
                const label = new TextBlock(`xr${name}Label`, `${name}: ${initial.toFixed(4)}`);
                label.color = "white";
                label.fontSize = 34;
                label.height = "50px";
                label.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
                sliderStack.addControl(label);

                const slider = new Slider(`xr${name}Slider`);
                slider.minimum = min;
                slider.maximum = max;
                slider.value = initial;
                slider.width = 0.6;
                slider.height = "70px";
                slider.thumbWidth = "60px";
                slider.isThumbCircle = true;
                slider.isThumbClamped = true;
                slider.color = "lightgreen";
                slider.background = "#444444";
                slider.borderColor = "white";
                slider.paddingBottom = "40px";
                slider.onPointerDownObservable.add(() => {
                    slider.color = "yellow";
                });
                slider.onPointerUpObservable.add(() => {
                    slider.color = "lightgreen";
                });
                slider.onValueChangedObservable.add((v: number) => {
                    assign(v);
                    label.text = `${name}: ${v.toFixed(4)}`;
                    this._saveSensitivityToStorage();
                });
                sliderStack.addControl(slider);
                return { label, slider };
            };

            const alphaPair = buildSlider("alpha", 0, MAX_ORBIT_RATE, this._alphaRate, (v) => {
                this._alphaRate = v;
                this._cc?.setXROrbitAlphaRate?.(v);
            });
            const betaPair = buildSlider("beta", 0, MAX_ORBIT_RATE, this._betaRate, (v) => {
                this._betaRate = v;
                this._cc?.setXROrbitBetaRate?.(v);
            });
            const radiusPair = buildSlider("radius", 0, MAX_RADIUS_RATE, this._radiusRate, (v) => {
                this._radiusRate = v;
                this._cc?.setXRDollyRate?.(v);
            });
            adt.addControl(sliderStack);

            // --- Exit XR button (bottom-left) ---
            const exitBtn = Button.CreateSimpleButton("xrExitBtn", "Exit XR");
            exitBtn.width = 0.35;
            exitBtn.height = "120px";
            exitBtn.color = "white";
            exitBtn.background = "darkred";
            exitBtn.fontSize = 40;
            exitBtn.cornerRadius = 10;
            exitBtn.thickness = 2;
            exitBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            exitBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            exitBtn.paddingLeft = "120px";
            exitBtn.paddingBottom = "40px";
            exitBtn.onPointerUpObservable.add(() => {
                try {
                    this.onExit?.();
                } catch {
                    // best-effort exit — ignore errors
                }
            });
            adt.addControl(exitBtn);

            this._plane = plane;
            this._texture = adt;
            this._alphaSlider = alphaPair.slider;
            this._betaSlider = betaPair.slider;
            this._radiusSlider = radiusPair.slider;
            this._alphaLabel = alphaPair.label;
            this._betaLabel = betaPair.label;
            this._radiusLabel = radiusPair.label;
        } catch {
            // GUI/plane construction failed (mocked env) — leave the HUD absent.
            this._plane = null;
            this._texture = null;
            this._alphaSlider = null;
            this._betaSlider = null;
            this._radiusSlider = null;
            this._alphaLabel = null;
            this._betaLabel = null;
            this._radiusLabel = null;
        }
    }

    /** Whether the panel is currently shown. */
    public isVisible(): boolean {
        return this._visible;
    }

    /**
     * Push the authoritative sensitivity rates to the CharacterController. Called
     * on show (and usable by the owner right after the session starts) so the
     * CC's XR camera uses the persisted rates. Guarded — safe when the CC lacks
     * a setter (mocked env).
     */
    public pushSensitivityToController(): void {
        this._cc?.setXROrbitAlphaRate?.(this._alphaRate);
        this._cc?.setXROrbitBetaRate?.(this._betaRate);
        this._cc?.setXRDollyRate?.(this._radiusRate);
    }

    /**
     * Show the panel: re-sync the sliders to the stored values, push those
     * values to the CC, enable + world-lock the plane in front of the current
     * view. A no-op when the HUD was never built.
     */
    public show(): void {
        this._visible = true;
        // Re-sync slider values/labels from the authoritative fields.
        this._syncSlidersFromFields();
        // Ensure the CC uses the persisted rates.
        this.pushSensitivityToController();
        if (this._plane) {
            this._plane.setEnabled?.(true);
            this._plane.isPickable = true;
        }
        // Place once, world-locked, in front of the current head pose.
        this._positionPlaneInFront();
    }

    /** Hide the panel (keeps it built for a later show). No-op when absent. */
    public hide(): void {
        this._visible = false;
        if (this._plane) {
            this._plane.isPickable = false;
            this._plane.setEnabled?.(false);
        }
    }

    /** Flip the panel's visibility. Bound to the LEFT-Y controller button. */
    public toggle(): void {
        if (this._visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Dispose the HUD plane + GUI texture. Idempotent and guarded. Leaves the
     * authoritative rates intact (they persist in localStorage).
     */
    public dispose(): void {
        this._visible = false;
        try {
            this._texture?.dispose?.();
        } catch {
            /* ignore */
        }
        try {
            this._plane?.dispose?.();
        } catch {
            /* ignore */
        }
        this._plane = null;
        this._texture = null;
        this._alphaSlider = null;
        this._betaSlider = null;
        this._radiusSlider = null;
        this._alphaLabel = null;
        this._betaLabel = null;
        this._radiusLabel = null;
    }

    // ------------------------------------------------------------------
    // Placement
    // ------------------------------------------------------------------

    /**
     * Place the panel at a world-space point in front of the live head pose and
     * orient it to face the head. Reads the TRUE head pose from the CC's XR
     * camera RIG (eye) camera when available, falling back to the base camera.
     * Every computed position is finite-guarded; a non-finite pose leaves the
     * plane where it is. Fully guarded so it never throws in the mocked env.
     */
    private _positionPlaneInFront(): void {
        if (this._plane === null || this._cc === null) {
            return;
        }
        try {
            const cam = this._cc.getXRCamera?.();
            if (!cam) {
                return;
            }

            const rig = (cam as any).rigCameras;
            const usingRig = Array.isArray(rig) && rig.length > 0;
            const headCam: any = usingRig ? rig[0] : cam;
            if (!headCam) {
                return;
            }

            const isFiniteVec = (v: any): boolean =>
                !!v &&
                Number.isFinite(v.x) &&
                Number.isFinite(v.y) &&
                Number.isFinite(v.z);

            if (typeof headCam.computeWorldMatrix === "function") {
                headCam.computeWorldMatrix(true);
            }

            let headPos: any = headCam.globalPosition;
            if (!isFiniteVec(headPos)) {
                headPos = headCam.position;
            }

            const DISTANCE = 3; // meters ahead of the head
            const UP_OFFSET = 0; // options panel centered at eye level
            const LEFT_OFFSET = 0; // centered horizontally

            let pos: any = null;
            if (typeof headCam.getFrontPosition === "function") {
                const frontPoint = headCam.getFrontPosition(DISTANCE);
                let up: any;
                let right: any;
                if (typeof headCam.getDirection === "function") {
                    up = headCam.getDirection(Vector3.Up());
                    right = headCam.getDirection(Vector3.Right());
                } else {
                    up = Vector3.Up();
                    right = Vector3.Right();
                }
                if (isFiniteVec(frontPoint) && isFiniteVec(up) && isFiniteVec(right)) {
                    pos = frontPoint.add(up.scale(UP_OFFSET)).add(right.scale(-LEFT_OFFSET));
                }
            } else if (typeof headCam.getDirection === "function" && isFiniteVec(headPos)) {
                const forward = headCam.getDirection(Vector3.Forward());
                const up = headCam.getDirection(Vector3.Up());
                const right = headCam.getDirection(Vector3.Right());
                if (isFiniteVec(forward) && isFiniteVec(up) && isFiniteVec(right)) {
                    pos = headPos
                        .add(forward.scale(DISTANCE))
                        .add(up.scale(UP_OFFSET))
                        .add(right.scale(-LEFT_OFFSET));
                }
            }

            if (pos === null || !isFiniteVec(pos)) {
                return; // leave the plane where it is; never fling to NaN
            }

            this._plane.position.copyFrom(pos);
            if (isFiniteVec(headPos) && typeof this._plane.lookAt === "function") {
                this._plane.lookAt(headPos);
            }
        } catch {
            // Placement must never throw.
        }
    }

    // ------------------------------------------------------------------
    // Sensitivity persistence
    // ------------------------------------------------------------------

    /** Re-sync slider values + labels from the authoritative rate fields. */
    private _syncSlidersFromFields(): void {
        const apply = (slider: Nullable<Slider>, label: Nullable<TextBlock>, name: string, v: number) => {
            if (slider) slider.value = v;
            if (label) label.text = `${name}: ${v.toFixed(4)}`;
        };
        apply(this._alphaSlider, this._alphaLabel, "alpha", this._alphaRate);
        apply(this._betaSlider, this._betaLabel, "beta", this._betaRate);
        apply(this._radiusSlider, this._radiusLabel, "radius", this._radiusRate);
    }

    /**
     * Load the three rates from localStorage, overriding defaults with any
     * previously-persisted value that is finite and within its slider range.
     * Guarded: localStorage may be absent (node env) or throw (private mode).
     */
    private _loadSensitivityFromStorage(): void {
        if (typeof localStorage === "undefined") {
            return;
        }
        try {
            const read = (key: string, current: number, max: number): number => {
                const raw = localStorage.getItem(key);
                if (raw === null) {
                    return current;
                }
                const parsed = parseFloat(raw);
                if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
                    return current;
                }
                return parsed;
            };
            this._alphaRate = read(LS_ALPHA_RATE, this._alphaRate, MAX_ORBIT_RATE);
            this._betaRate = read(LS_BETA_RATE, this._betaRate, MAX_ORBIT_RATE);
            this._radiusRate = read(LS_RADIUS_RATE, this._radiusRate, MAX_RADIUS_RATE);
        } catch {
            // localStorage unavailable/threw — keep whatever defaults are set.
        }
    }

    /** Persist the three current rates to localStorage (best-effort, guarded). */
    private _saveSensitivityToStorage(): void {
        if (typeof localStorage === "undefined") {
            return;
        }
        try {
            localStorage.setItem(LS_ALPHA_RATE, String(this._alphaRate));
            localStorage.setItem(LS_BETA_RATE, String(this._betaRate));
            localStorage.setItem(LS_RADIUS_RATE, String(this._radiusRate));
        } catch {
            // best-effort persistence
        }
    }
}
