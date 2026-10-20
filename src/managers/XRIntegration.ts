/**
 * XRIntegration — thin Vishva-side glue over the CharacterController's WebXR API.
 *
 * Vishva no longer owns any WebXR core logic. Session lifecycle, locomotion,
 * camera orbit/dolly/follow, controller binding, and desktop preserve/restore
 * all live inside the CharacterController library (`cc.enableXR/enterXR/exitXR/
 * isInXR`). This module keeps only the concerns the CC does NOT handle:
 *
 *  1. Vishva OWNS the `WebXRDefaultExperience` — it creates the experience and
 *     passes it to `cc.enableXR(experience)` (the CC adopts it rather than
 *     creating its own). Owning the experience lets Vishva observe the session
 *     state directly, because the CC exposes no session start/end hook.
 *  2. Render-pipeline toggling — on session start Vishva disables the editor's
 *     SSAO2 / depth-renderer / prePass additions (which destabilise an XR
 *     session) and restores them on session end, re-activating the editor
 *     camera. Driven off the experience's own `onStateChangedObservable`.
 *  3. The in-headset OPTIONS HUD (see XROptionsHud) — created once XR is
 *     enabled, shown/hidden by the LEFT-Y controller button via the CC's
 *     `onXRHudToggle` callback, and disposed on teardown. Camera elasticity is
 *     suppressed while the HUD is visible (its pickable plane can obstruct the
 *     CC's camera-obstruction ray).
 *
 * Everything is defensively guarded: an avatar-less world has no
 * CharacterController (`vishva.avManager.cc` is null), so every CC call is a
 * safe no-op in that case.
 */

import {
    ArcRotateCamera,
    Camera,
    Nullable,
    Observer,
    Scene,
    SSAO2RenderingPipeline,
    WebXRDefaultExperience,
    WebXRState,
} from "babylonjs";
import type { XRSessionType } from "babylonjs-charactercontroller";
import type { Vishva } from "../Vishva";
import { XROptionsHud } from "./XROptionsHud";

/** Name the SSAO2 pipeline is registered under in `Vishva.loadBabylonjsPart`. */
const SSAO_PIPELINE_NAME = "ssaopipeline";

/**
 * Snapshot of desktop render-pipeline state captured on session start and
 * restored on session end. The CC owns camera/controller preserve-restore; this
 * is strictly Vishva's editor render pipeline.
 */
interface DesktopPipelineSnapshot {
    /** Whether the depth renderer was enabled before the session. */
    depthRendererEnabled: boolean;
    /** Whether the SSAO2 pipeline was attached to the editor camera. */
    ssaoAttached: boolean;
    /** prePass sample count prior to the session, if a prePass renderer exists. */
    prepassSamples?: number;
    /** Editor camera to restore as `scene.activeCamera`. */
    activeCamera: Nullable<Camera>;
}

export class XRIntegration {
    private _vishva: Vishva;

    /** The single, Vishva-owned XR experience, reused across sessions. */
    private _experience: Nullable<WebXRDefaultExperience> = null;

    /** Observer on the experience's XR state changes. Detached on dispose. */
    private _stateObserver: Nullable<Observer<WebXRState>> = null;

    /** Recorded desktop pipeline state, captured on session start. */
    private _pipelineSnapshot: Nullable<DesktopPipelineSnapshot> = null;

    /** The in-headset OPTIONS HUD, created once XR is enabled. */
    private _hud: Nullable<XROptionsHud> = null;

    /** True once the CC HUD-toggle callback has been registered (once). */
    private _hudToggleRegistered = false;

    /**
     * The CC camera-elasticity setting captured when the HUD is shown, so it can
     * be restored when the HUD is hidden. Null when the HUD is not suppressing
     * elasticity. The pickable HUD plane can obstruct the CC's camera-obstruction
     * ray; disabling elasticity while the HUD is visible avoids a spurious camera
     * lurch toward the plane. Only applied when the CC exposes the setter.
     */
    private _hudElasticitySnapshot: Nullable<boolean> = null;

    constructor(vishva: Vishva) {
        this._vishva = vishva;
    }

    /** The active CharacterController, or null in an avatar-less world. */
    private get cc(): any {
        return this._vishva.avManager?.cc ?? null;
    }

    /**
     * Enter an immersive WebXR session of the given type. Lazily creates the
     * Vishva-owned experience on first use, enables XR on the CharacterController
     * (which adopts the experience), then enters the session. A no-op when there
     * is no active CharacterController (avatar-less world).
     */
    public async enter(type: XRSessionType): Promise<void> {
        const cc = this.cc;
        if (cc == null) {
            // No CharacterController to drive the session — nothing to do.
            return;
        }

        const experience = await this._ensureExperience();
        if (experience == null) {
            return;
        }

        // Adopt the Vishva-owned experience into the CC (idempotent — enableXR
        // resolves true/false and never throws).
        await cc.enableXR(experience);

        // Build the in-headset OPTIONS HUD (once) and register the LEFT-Y toggle
        // callback on the CC (once — it persists across enter/exit cycles; only
        // the underlying button observer is rebound per session by the CC).
        this._ensureHud(cc);

        // Then enter the session; the CC no-ops if the requested type is
        // unsupported.
        await cc.enterXR(type);
    }

    /**
     * Create the OPTIONS HUD (once) and register the CC HUD-toggle callback
     * (once). The HUD is built but starts HIDDEN; the LEFT-Y controller button
     * surfaced by `cc.onXRHudToggle` toggles it during a session.
     */
    private _ensureHud(cc: any): void {
        if (this._hud === null) {
            this._hud = new XROptionsHud();
            this._hud.onExit = () => {
                // Best-effort session exit from the in-headset button.
                void this.exit();
            };
            this._hud.create(this._vishva.scene, cc);
        }
        if (!this._hudToggleRegistered && typeof cc.onXRHudToggle === "function") {
            cc.onXRHudToggle(() => this._toggleHud());
            this._hudToggleRegistered = true;
        }
    }

    /**
     * Toggle the HUD and manage CC camera elasticity around its visibility. The
     * pickable HUD plane can obstruct the CC's camera-obstruction ray, so while
     * the HUD is shown we disable elasticity and restore it when hidden. Both the
     * elasticity getter/setter are optional on the CC (guarded) so this is a safe
     * no-op when the CC does not expose them.
     */
    private _toggleHud(): void {
        const hud = this._hud;
        if (hud == null) {
            return;
        }
        const willShow = !hud.isVisible();
        if (willShow) {
            this._disableCameraElasticityForHud();
            hud.show();
        } else {
            hud.hide();
            this._restoreCameraElasticityAfterHud();
        }
    }

    /**
     * Capture and disable the CC's camera elasticity while the HUD is shown.
     * Guarded: a no-op when the CC lacks the getter/setter (e.g. mocked env).
     */
    private _disableCameraElasticityForHud(): void {
        if (this._hudElasticitySnapshot !== null) {
            return; // already suppressed
        }
        const cc = this.cc;
        if (cc == null) {
            return;
        }
        try {
            const settings = cc.getSettings?.();
            const elastic = settings?.cameraElastic ?? false;
            if (typeof cc.setCameraElasticity === "function") {
                this._hudElasticitySnapshot = elastic;
                cc.setCameraElasticity(false);
            }
        } catch {
            // elasticity management is advisory — never break the toggle.
        }
    }

    /** Restore the CC camera elasticity captured in the disable step. */
    private _restoreCameraElasticityAfterHud(): void {
        if (this._hudElasticitySnapshot === null) {
            return;
        }
        const cc = this.cc;
        try {
            cc?.setCameraElasticity?.(this._hudElasticitySnapshot);
        } catch {
            // advisory — ignore.
        }
        this._hudElasticitySnapshot = null;
    }

    /**
     * Exit the active WebXR session. Delegates to the CharacterController, which
     * is idempotent when no session is active. Desktop render-pipeline restore
     * runs from the experience's state-change handler (so it also fires on an
     * unexpected session termination).
     */
    public async exit(): Promise<void> {
        const cc = this.cc;
        if (cc == null) {
            return;
        }
        await cc.exitXR();
    }

    /** Whether an immersive WebXR session is currently active. */
    public isInXR(): boolean {
        return this.cc?.isInXR() ?? false;
    }

    /** The active XR experience, or null if none has been created yet. */
    public getExperience(): Nullable<WebXRDefaultExperience> {
        return this._experience;
    }

    /**
     * Lazily create the single Vishva-owned XR experience and cache it for reuse
     * across sessions. Teleportation is disabled at creation (stick locomotion
     * owned by the CC replaces it); pointer selection is left enabled so SNA
     * click interaction works in XR. Registers a single state observer that
     * toggles the desktop render pipeline on session start/end. Guarded so a
     * failure leaves the experience null rather than throwing.
     */
    private async _ensureExperience(): Promise<Nullable<WebXRDefaultExperience>> {
        if (this._experience !== null) {
            return this._experience;
        }

        const scene: Scene = this._vishva.scene;
        try {
            const experience = await scene.createDefaultXRExperienceAsync({
                // Teleport is owned by the CC's locomotion; never enable it here.
                disableTeleportation: true,
                // Pointer selection stays enabled (default) for SNA interaction.
            });

            // Observe session start/end from XR state transitions. This also
            // catches unexpected termination (e.g. headset removed), so the
            // desktop render pipeline is always restored.
            this._stateObserver = experience.baseExperience.onStateChangedObservable.add(
                (state: WebXRState) => {
                    if (state === WebXRState.IN_XR) {
                        this._disableDesktopPipeline();
                        // Each session starts with the HUD hidden; it is shown by
                        // the LEFT-Y toggle once the head pose has settled.
                        this._hud?.hide();
                    } else if (state === WebXRState.NOT_IN_XR) {
                        // Ensure the HUD is hidden and elasticity restored before
                        // desktop restore (also fires on unexpected termination).
                        if (this._hud?.isVisible()) {
                            this._hud.hide();
                            this._restoreCameraElasticityAfterHud();
                        }
                        this._restoreDesktopPipeline();
                    }
                }
            );

            this._experience = experience;
            return experience;
        } catch {
            // Experience creation failed (unsupported / mocked env) — leave it
            // null so enter() becomes a safe no-op.
            this._experience = null;
            return null;
        }
    }

    /**
     * Record and disable the desktop render-pipeline additions (SSAO2, prePass,
     * depth renderer) that can destabilise an XR session. Captured state is
     * restored by {@link _restoreDesktopPipeline} on session end.
     */
    private _disableDesktopPipeline(): void {
        const scene: Scene = this._vishva.scene;
        const arcCamera: Nullable<ArcRotateCamera> = this._vishva.arcCamera;

        const dr = this._vishva.dr;
        const depthRendererEnabled = dr ? dr.enabled : false;

        const ssao = this._getSSAOPipeline();
        const ssaoAttached = ssao !== null && arcCamera != null;

        const prepass = scene.prePassRenderer;
        const prepassSamples = prepass ? prepass.samples : undefined;

        this._pipelineSnapshot = {
            depthRendererEnabled,
            ssaoAttached,
            prepassSamples,
            activeCamera: scene.activeCamera,
        };

        // Disable depth renderer so it does not run against the XR camera.
        if (dr) {
            dr.enabled = false;
        }

        // Detach SSAO2 from the editor camera for the duration of the session.
        if (ssaoAttached && arcCamera) {
            scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
                SSAO_PIPELINE_NAME,
                arcCamera
            );
        }
    }

    /**
     * Restore the desktop render pipeline recorded in
     * {@link _disableDesktopPipeline} and re-activate the editor camera. The CC
     * detaches the desktop camera's input when the WebXR camera becomes active on
     * session enter; re-attaching here restores mouse/pointer control of the
     * ArcRotateCamera on the canvas. `attachControl(true, false, 2)` mirrors how
     * Vishva attaches the editor camera at scene setup.
     */
    private _restoreDesktopPipeline(): void {
        const scene: Scene = this._vishva.scene;
        const arcCamera: Nullable<ArcRotateCamera> = this._vishva.arcCamera;
        const snapshot = this._pipelineSnapshot;

        if (arcCamera) {
            scene.activeCamera = arcCamera;
            arcCamera.attachControl?.(true, false, 2);
        }

        if (snapshot) {
            // Restore depth renderer enabled state.
            if (this._vishva.dr) {
                this._vishva.dr.enabled = snapshot.depthRendererEnabled;
            }

            // Re-attach SSAO2 to the editor camera if it was attached before.
            if (snapshot.ssaoAttached && arcCamera) {
                scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
                    SSAO_PIPELINE_NAME,
                    arcCamera
                );
            }

            // Restore prePass sample count.
            if (snapshot.prepassSamples !== undefined && scene.prePassRenderer) {
                scene.prePassRenderer.samples = snapshot.prepassSamples;
            }
        }

        this._pipelineSnapshot = null;
    }

    /** Look up the SSAO2 pipeline by its registered name, or null if absent. */
    private _getSSAOPipeline(): Nullable<SSAO2RenderingPipeline> {
        const manager = this._vishva.scene.postProcessRenderPipelineManager;
        const pipeline = manager.supportedPipelines.find(
            (p) => p.name === SSAO_PIPELINE_NAME
        );
        return (pipeline as SSAO2RenderingPipeline) ?? null;
    }

    /**
     * Tear down the experience's state observer. Leaves the created experience
     * in place (BabylonJS owns its lifecycle with the scene). Idempotent.
     */
    public dispose(): void {
        if (this._stateObserver && this._experience) {
            this._experience.baseExperience.onStateChangedObservable.remove(
                this._stateObserver
            );
        }
        this._stateObserver = null;
        this._restoreCameraElasticityAfterHud();
        this._hud?.dispose();
        this._hud = null;
        this._hudToggleRegistered = false;
    }
}
