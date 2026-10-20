# Implementation Plan: WebXR Support

> **⚠️ SUPERSEDED (Vishva 0.6.0).** This spec implemented Vishva's own WebXR engine (`XRManager` / `XRSupport` / `XRLocomotion`). That engine has been **removed** and Vishva now delegates WebXR to the BabylonJS-CharacterController library's public XR API (CharacterController 0.5.1). The thin replacement lives in `src/managers/XRIntegration.ts` (session + render-pipeline toggling) and `src/managers/XROptionsHud.ts` (in-headset OPTIONS panel: Exit XR + sensitivity sliders, toggled by the left controller Y button). The outstanding **task 25 (remove the temporary debug-HUD scaffolding)** is satisfied — the debug HUD was dropped entirely in the rollback. See `changelog.md` (0.6.0) for the full migration. The content below is retained for historical reference only.

## Overview

This plan adds a VR/AR preview mode to Vishva in incremental, demoable steps. It first builds the two pure, testable modules (`XRSupport` capability mapping and the `XRLocomotion` state machine), then the BabylonJS-facing `XRManager` lifecycle, then wires NavBar entry points, then layers locomotion, the in-session toggle, SNA click interaction, and finally hardens exit/cleanup with a changelog entry. Pure logic is covered by unit + property tests; `XRManager` is covered with mocks; headset behavior is verified manually.

> **Reconciliation note.** Tasks 1–12 below are the original plan and remain as they were executed. During implementation the feature drifted substantially from the original teleport/point-to-move-centric design: **thumbstick locomotion became the primary movement mechanism**, the follow camera is now orbited/dollied by the right stick and buttons and mirrored onto the XR camera each frame, and an **in-headset HUD** hosts the exit control and tunable, persisted sensitivity settings. The first/third-person mode now only selects camera coupling rather than the movement mechanism, and teleport/point-to-move are retained but no longer the active path. That drifted and added work is captured in tasks 13–24 (all completed), with task 25 (removal of temporary debug-HUD scaffolding) the sole outstanding item. The `_Requirements:` trace lines in tasks 1–12 have been re-pointed at the reconciled requirements where the meaning shifted; the task titles are unchanged.

## Tasks

- [x] 1. XR capability detection + button-state mapping
  - [x] 1.1 Create `src/managers/XRSupport.ts`
    - Define `XRSupportState { vrSupported, arSupported }` and `XRButtonState { vr:{visible,enabled}, ar:{visible,enabled} }`
    - Implement `detectXRSupport()`: thin async probe using `WebXRSessionManager.IsSessionSupportedAsync("immersive-vr")` and `("immersive-ar")`; wrap each so absence of `navigator.xr` or a rejection/throw resolves to `false` (never throws)
    - Implement pure `computeXRButtonState(support)`: a mode's button is visible+enabled iff supported, else `{visible:false,enabled:false}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 Write `src/managers/XRSupport.test.ts`
    - `computeXRButtonState` for all four combinations (both/VR-only/AR-only/none) → correct button states
    - `detectXRSupport` resolves without throwing when `navigator.xr` is absent and when a support query rejects (mocked)
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 1.3 (Optional) Write `src/managers/XRSupport.property.test.ts`
    - **Property 1: Capability mapping reflects support exactly** — for any `{vr,ar}` booleans, button enabled iff supported; never enabled for unsupported
    - **Validates: Requirements 1.4, 2.2, 2.3, 2.6**

- [x] 2. XR locomotion sub-mode state machine (pure)
  - [x] 2.1 Create `src/managers/XRLocomotion.ts`
    - Define `LocomotionMode = 'firstPerson' | 'thirdPerson'` and `ToggleResult { mode, changed, blocked }`
    - Implement `XRLocomotion` with `constructor(initial='thirdPerson')`, `getMode()`, `setMode(mode, canFirstPerson)`, `toggle(canFirstPerson)`
    - Enforce guard: transition to `firstPerson` allowed only when `canFirstPerson` is true; transition to `thirdPerson` always allowed and never blocked
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 2.2 Write `src/managers/XRLocomotion.test.ts`
    - Default mode is `thirdPerson`; permitted toggle to first-person reports `changed:true, blocked:false`; blocked toggle reports `changed:false, blocked:true` and stays third-person; toggle from first-person to third-person always succeeds
    - _Requirements: 4.1, 4.3, 4.4, 4.5_
  - [x] 2.3 Write `src/managers/XRLocomotion.property.test.ts`
    - **Property 2: First-person unreachable without permission** — any sequence with `canFirstPerson=false` never yields `firstPerson`; blocked attempts report `changed:false`
    - **Property 3: Toggle involution under permission** — `toggle(true)` twice returns to start; permitted transitions report `changed:true, blocked:false`
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**

- [x] 3. Checkpoint — pure modules green
  - Run `npm test`; ensure XRSupport + XRLocomotion tests pass. Ask the user if questions arise.

- [x] 4. XRManager skeleton — enter/exit VR & AR
  - [x] 4.1 Create `src/managers/XRManager.ts`
    - `constructor(vishva)`, `isInXR()`, `enterVR()`, `enterAR()`, `exitXR()`
    - `ensureExperience()`: lazily `scene.createDefaultXRExperienceAsync({ disableTeleportation: true })` once and cache; keep pointer selection enabled
    - Guard `enterVR/enterAR` against unsupported modes (via `XRSupport`); no-op leaving desktop untouched
    - Track session via `WebXRState`; `onSessionStart(type)` and `onSessionEnd()` hooks
    - `disableDesktopPipeline()` records + disables SSAO2/prepass/depth renderer; `restoreDesktopPipeline()` restores recorded state and sets `scene.activeCamera = arcCamera`
    - Idempotent `exitXR()` when no active session
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 4.2 Add `enterXR`/`exitXR` delegation on `Vishva`
    - Add `xrManager` field (lazy), `enterXR(type)`, `exitXR()` delegating to `XRManager`
    - _Requirements: 2.4, 2.5, 3.1_
  - [x] 4.3 Write `src/managers/XRManager.test.ts` (mocked experience/feature manager)
    - State tracking: `isInXR()` reflects session start/end; enter→exit→enter cycle restores expected state
    - Pipeline disable-on-enter then restore-on-exit ordering; unsupported-mode enter is a no-op; `exitXR` idempotent
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.7_

- [x] 5. NavBar buttons + GUI wiring, gated by support
  - [x] 5.1 Add buttons to `src/gui/NavBarML.ts`
    - Add `#navEnterVR` ("enter VR") and `#navEnterAR` ("enter AR") buttons with Material Icons after `#navSettings`
    - _Requirements: 2.1_
  - [x] 5.2 Wire handlers + startup gating in `VishvaGUI`
    - On startup call `detectXRSupport()`, apply `computeXRButtonState` to show/hide/disable each button
    - Bind clicks to `vishva.enterXR('vr')` / `vishva.enterXR('ar')`
    - _Requirements: 1.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 5.3 Extend `src/gui/NavBarML.test.ts`
    - Assert `#navEnterVR` and `#navEnterAR` exist with correct titles; test gating logic maps button state to visibility/enabled
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Checkpoint — build + wiring green
  - Run `npm test` and `npm run build`; confirm buttons appear/gate correctly and compile is clean. Ask the user if questions arise.

- [x] 7. First-person locomotion — teleport + controller pointers
  - [x] 7.1 Implement first-person mode in `XRManager.applyLocomotionMode`
    - (As built: teleport was superseded by thumbstick locomotion in tasks 13+; `applyLocomotionMode` now selects camera coupling via `setNoFirstPerson` and ensures the Teleport_Feature stays disabled.)
    - Keep Pointer_Selection_Feature enabled in both modes
    - Default locomotion to first-person when permitted, third-person when `noFirstPerson`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 7.2 Extend `XRManager.test.ts`
    - Assert teleport never enabled; default mode derives from `noFirstPerson`; pointer selection left enabled
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 8. Third-person locomotion — point-and-moveTo avatar
  - [x] 8.1 Extract shared click-to-move into `Vishva.moveAvatarTo(target)`
    - Factor the existing right-click move-to body (`Vishva.ts:1200-1208`: marker + `cc.moveTo`) into `moveAvatarTo`; call it from the existing desktop path to avoid duplication
    - (As built: `moveAvatarTo` is retained and reused by the point-to-move helper; thumbstick locomotion in tasks 13+ became the active movement path.)
    - _Requirements: 18.1_
  - [x] 8.2 Implement third-person select handling in `XRManager.handleSelect`
    - On a valid pick point, compute Move_Target and call `vishva.moveAvatarTo(target)`; ensure CC started; no `moveTo` when pick has no hit; do not rely on keyboard
    - (As built: `handleSelect` is the retained point-to-move helper, not routed by the active session flow.)
    - _Requirements: 18.1, 18.2, 18.3_
  - [x] 8.3 Extend `XRManager.test.ts`
    - **Property 5: Retained third-person move requires a valid pick** — `moveTo` called with picked point on hit; not called on miss (mocked CC/pick)
    - **Validates: Requirements 18.1, 18.2**

- [x] 9. In-XR sub-mode toggle with first-person guard
  - [x] 9.1 Bind controller toggle in `XRManager.handleToggleRequest`
    - Bind the controller A/X face button via the motion controller's button component `onButtonStateChangedObservable` to request a toggle on the rising edge of a press; do NOT bind the trigger (reserved for select / SNA click). Fall back to no binding if neither A/X component exists on the connected controller.
    - Derive `canFirstPerson = !activeCCSettings.noFirstPerson`; call `XRLocomotion.toggle`; on `changed` reconfigure camera coupling to match; on `blocked` remain third-person and emit lightweight feedback (log/haptic); allow repeated activation
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 9.2 Extend `XRManager.test.ts`
    - **Property 2 / Property 3: Toggle capability derives from noFirstPerson** — toggle passes `canFirstPerson = !noFirstPerson`; blocked exactly when `noFirstPerson` true and target is first-person; coupling reconfig matches resulting mode
    - **Validates: Requirements 4.3, 4.4, 16.2, 16.3**

- [x] 10. SNA click interaction in XR
  - [x] 10.1 Ensure XR select routes to scene picking for SNA
    - Confirm Pointer_Selection_Feature dispatches through scene picking so `ActionManager` pick triggers (`OnLeftPickTrigger`/`OnPickTrigger`) used by `SensorClick` fire on XR_Select; add minimal glue if needed
    - Ensure desktop modifier-key guards (alt/ctl/shift) do not spuriously block XR selects (modifiers not asserted in XR)
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [x] 10.2 Add SNA-in-XR test
    - Unit-test that an XR select on a mesh with a registered `SensorClick` action triggers `emitSignal` (mock ActionManager/pick path); confirm modifier guards don't block
    - _Requirements: 17.1, 17.2, 17.3_

- [x] 11. Exit/cleanup, lifecycle robustness, and changelog
  - [x] 11.1 Harden `exitXR`/session-end restore in `XRManager`
    - Restore `arcCamera` active + control; restore SSAO2/prepass; restore CC + keyboard config; detach/dispose session observers so enter/exit cycles don't accumulate handlers; ensure re-entry works
    - _Requirements: 3.3, 3.6, 19.1, 19.2, 19.3, 19.4, 19.5_
  - [x] 11.2 Extend `XRManager.test.ts` for cleanup idempotency
    - Double-exit safe; enter→exit→enter restores expected state; observers detached count matches attached
    - _Requirements: 3.7, 19.4_
  - [x] 11.3 Add changelog entry
    - Add a `changelog.md` entry describing WebXR (VR + AR) preview support, locomotion modes, and SNA-in-XR
    - _Requirements: (documentation)_

- [x] 12. Final checkpoint — full suite + build
  - Run `npm test` and `npm run build`; ensure all tests pass and the production build is clean. Ask the user if questions arise.

---

> **Tasks 13–25 (post-plan reconciliation).** The tasks below capture work that drifted from or was added beyond the original 12-task plan. They were implemented iteratively during on-device bring-up rather than scheduled as waves. All are completed except task 25 (removal of the temporary debug-HUD scaffolding), which is the sole outstanding item.

- [x] 13. Thumbstick locomotion (left stick) — pure mapping + edge-triggered CharacterController
  - Add `StickInput`/`MoveIntent`/`neutralMoveIntent` and the pure `mapSticksToIntent` (dominant-axis gating, deadzone, ties→forward/back) to `XRLocomotion.ts`
  - Add the per-frame stick sampler (`startStickSampler`/`stopStickSampler`/`sampleSticks`) plus `applyIntent`/`applyMovementDirection` edge-triggering and `stopAllMovement` (neutral intent on exit) in `XRManager`; classify sticks by handedness in `bindMotionControllerSticks`
  - Tests: `XRLocomotion.property.test.ts` (Property 4) and `XRManager.test.ts` stick forward/back/strafe/deadzone/stop-on-exit cases
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 14. Fast movement (hold left stick pressed)
  - Combine `leftStick.pressed` with the active `MoveIntent` in `applyIntent`/`applyMovementDirection` so the matching Fast_Movement variant (`run`, `walkBackFast`, `strafeLeftFast`, `strafeRightFast`) drives the active direction; swap normal↔fast without ever running both at once
  - Tests: `XRManager.test.ts` fast-movement swap cases
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 15. Jump (left trigger) + left/right controller button binding
  - `bindLeftControllerButtons` — left trigger rising edge → `cc.jump()`, left `y-button` rising edge → `toggleDiagHud`; right trigger never triggers jump; detach trigger/button observers on exit
  - Tests: `XRManager.test.ts` jump left-only + observer-teardown cases
  - _Requirements: 8.1, 8.2, 8.3, 13.3, 13.6_

- [x] 16. Right-stick camera orbit (alpha/beta) with dominant-axis gating
  - `applyCameraOrbit(rightX, rightY)` — deadzone-gated, dominant-axis (ties→alpha), analog `alpha += alphaRate*x` OR `beta += betaRate*y`; `clampBeta` within limits/pole-avoiding fallback; recompute world matrix; never turn the avatar
  - Tests: `XRManager.test.ts` orbit alpha/beta, dominant-axis, beta-clamp, no-avatar-turn cases
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 17. Camera dolly — right B/A continuous radius + left-X dolly-to-avatar toggle
  - `applyButtonDolly` (B→radius−, A→radius+, clamp to radius limits); `bindRightControllerHeightButtons` capturing `b-button`/`a-button` on the right controller by handedness; `toggleXDolly` for the left-X dolly-to-avatar snap/restore; clear captures on exit
  - Tests: `XRManager.test.ts` continuous dolly + clamp, right-only capture, left-X round-trip, cleared-on-exit cases
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 18. XR camera follows the avatar
  - `updateXRCameraFollow` — `setTransformationFromNonVRCamera(arcCamera, true)` then copy the arc camera's Y onto the XR camera Y; run it in the per-frame observer after `sampleSticks` and after HUD placement; detach the render observer on exit
  - Tests: `XRManager.test.ts` per-frame follow + arc-Y copy + observer-detach cases
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 19. Sensitivity settings + localStorage persistence
  - `alphaRate`/`betaRate`/`radiusRate` instance fields (defaults + `MAX_ORBIT_RATE`/`MAX_RADIUS_RATE` clamps); Options-panel sliders; `loadSensitivityFromStorage`/`saveSensitivityToStorage` (`vishva.xr.alphaRate|betaRate|radiusRate`), applying only finite in-range values, guarded against `localStorage` absence/throw
  - Tests: `XRManager.test.ts` default-when-absent, load-in-range, save-writes-three-keys cases
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 20. In-headset HUD — Options panel (permanent) + Debug panel (temporary)
  - `createDiagHud` (world-space plane + `babylonjs-gui` ADT, pickable, starts hidden), `toggleDiagHud`, `applyHudMode`, and placement helpers; Options mode = Exit XR + Debug buttons + three sensitivity sliders (permanent, world-locked); Debug mode = live readout + Close (temporary, head-locked); left `y-button` toggles, returning to Options each show
  - Tests: `XRManager.test.ts` y-button visibility toggle + deferred Options placement cases
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 21. Camera elasticity disabled while HUD shown
  - `disableCameraElasticityForHud`/`restoreCameraElasticityAfterHud` (record + restore CC elasticity/springback); on hide, make the HUD plane non-pickable and disabled before restoring elasticity so the plane no longer sits in the obstruction ray
  - Tests: `XRManager.test.ts` elasticity-disabled-while-shown + restore-order cases
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 22. Controller ray management
  - Hide the left controller ray + selection ring (`rememberLeftControllerAndHideRay`/`retryHideLeftControllerRay`/`hideLeftControllerRay`); raise the right controller ring/laser above the HUD (`retryRaiseRightSelectionRing`/`raiseRightSelectionRingRenderingGroup` → `renderingGroupId = 2`); retry each frame until the async pointer-selection meshes exist, then stop; reset the hide/raise state on exit
  - Tests: `XRManager.test.ts` left-ray-hidden, right-ring-raised, flag-latch cases
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 23. Locomotion mode selects camera coupling (revised behavior) + in-session toggle
  - `applyLocomotionMode` → `setNoFirstPerson(mode !== 'firstPerson')` (camera coupling only) and ensure teleport stays disabled; `handleToggleRequest` drives `XRLocomotion.toggle` and reconfigures coupling on change; `emitToggleBlockedFeedback` (log + best-effort haptic) on block; teleport/point-to-move retained but never the active path
  - Tests: `XRManager.test.ts` coupling-per-mode, teleport-never-enabled, toggle-block-feedback cases
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 24. Test infrastructure — vitest self-shim + HTTPS dev cert
  - Add `vitest.setup.ts` (`globalThis.self = globalThis`) wired via `setupFiles` in `vitest.config.ts` so modules that reference browser `self` at load time (e.g. `babylonjs-editcontrol`) do not throw in node; add `scripts/gen-cert.js` (self-signed cert into `certs/`) plus the `https-server`/`dev:https` package scripts for on-device WebXR testing; apply stale-test fixups (`AnimGroupDedup`/`AnimRangeDedup`/`LoadManager`/`NavBarML`) to keep the suite green
  - _Requirements: (test infrastructure / documentation)_

- [ ] 25. Cleanup — strip temporary debug HUD scaffolding
  - Remove the `Debug_Panel` readout, the `diag*` fields, the `captureDiagController` handedness/component dump, the `babylonjs-gui` diagnostic text, and the related `detach*Observers` that exist only for diagnostics — ONCE the on-device stick/handedness bug is confirmed resolved. Keep the Options panel, sliders, and sensitivity persistence. Then run `npm test` and `npm run build`.
  - _Requirements: 13 (note), 20.3 / design "Known Issues — Debug HUD scaffolding removal"_

## Notes

- Tasks marked `(Optional)` can be skipped for a faster MVP.
- Each task references specific requirements for traceability; property tasks name the design property they validate.
- Checkpoints ensure incremental validation.
- The pure modules (`XRSupport` mapping, `XRLocomotion`) are BabylonJS-free and tested without a scene or headset; `XRManager` is tested with mocks; VR/AR behavior is validated manually on a device or the WebXR emulator (requires HTTPS/localhost).
- Third-person locomotion shares `Vishva.moveAvatarTo` with the existing desktop click-to-move to avoid divergence.

## Task Dependency Graph

> The waves below describe the original 12-task plan. Tasks 13–24 were implemented iteratively during post-plan on-device bring-up and are not scheduled as waves; task 25 (debug-HUD scaffolding removal) is the sole outstanding item.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3"] },
    { "id": 5, "tasks": ["7.1", "8.1"] },
    { "id": 6, "tasks": ["7.2", "8.2"] },
    { "id": 7, "tasks": ["8.3", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.1"] },
    { "id": 9, "tasks": ["10.2", "11.1"] },
    { "id": 10, "tasks": ["11.2", "11.3"] }
  ]
}
```
