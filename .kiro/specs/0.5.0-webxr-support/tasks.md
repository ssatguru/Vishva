# Implementation Plan: WebXR Support

## Overview

This plan adds a VR/AR preview mode to Vishva in incremental, demoable steps. It first builds the two pure, testable modules (`XRSupport` capability mapping and the `XRLocomotion` state machine), then the BabylonJS-facing `XRManager` lifecycle, then wires NavBar entry points, then layers first-person teleport locomotion, third-person point-and-move locomotion, the in-session toggle, SNA click interaction, and finally hardens exit/cleanup with a changelog entry. Pure logic is covered by unit + property tests; `XRManager` is covered with mocks; headset behavior is verified manually.

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
    - Enable Teleport_Feature (register walkable ground as floor mesh) and keep Pointer_Selection_Feature enabled
    - Ensure teleport is NOT active in third-person mode
    - Default locomotion to first-person when permitted, third-person when `noFirstPerson`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 7.2 Extend `XRManager.test.ts`
    - Assert teleport enabled only in first-person; floor mesh registered; default mode derives from `noFirstPerson`
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 8. Third-person locomotion — point-and-moveTo avatar
  - [x] 8.1 Extract shared click-to-move into `Vishva.moveAvatarTo(target)`
    - Factor the existing right-click move-to body (`Vishva.ts:1200-1208`: marker + `cc.moveTo`) into `moveAvatarTo`; call it from the existing desktop path to avoid duplication
    - _Requirements: 6.2, 6.4_
  - [x] 8.2 Implement third-person select handling in `XRManager.handleSelect`
    - On XR_Select with a valid pick point, compute Move_Target and call `vishva.moveAvatarTo(target)`; ensure CC started; no `moveTo` when pick has no hit; do not rely on keyboard
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 8.3 Extend `XRManager.test.ts`
    - **Property 4: Third-person move requires a valid pick** — `moveTo` called with picked point on hit; not called on miss (mocked CC/pick)
    - **Validates: Requirements 6.1, 6.3**

- [x] 9. In-XR sub-mode toggle with first-person guard
  - [x] 9.1 Bind controller toggle in `XRManager.handleToggleRequest`
    - Bind the controller A/X face button (`a-button` right / `x-button` left) via the motion controller's button component `onButtonStateChangedObservable` to request a toggle on the rising edge of a press; do NOT bind the trigger (reserved for select / point-to-move / SNA click). Fall back to no binding if neither A/X component exists on the connected controller.
    - Derive `canFirstPerson = !activeCCSettings.noFirstPerson`; call `XRLocomotion.toggle`; on `changed` reconfigure features to match; on `blocked` remain third-person and emit lightweight feedback (log/haptic); allow repeated activation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 9.2 Extend `XRManager.test.ts`
    - **Property 5: Toggle capability derives from noFirstPerson** — toggle passes `canFirstPerson = !noFirstPerson`; blocked exactly when `noFirstPerson` true and target is first-person; feature reconfig matches resulting mode
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 10. SNA click interaction in XR
  - [x] 10.1 Ensure XR select routes to scene picking for SNA
    - Confirm Pointer_Selection_Feature dispatches through scene picking so `ActionManager` pick triggers (`OnLeftPickTrigger`/`OnPickTrigger`) used by `SensorClick` fire on XR_Select; add minimal glue if needed
    - Ensure desktop modifier-key guards (alt/ctl/shift) do not spuriously block XR selects (modifiers not asserted in XR)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 10.2 Add SNA-in-XR test
    - Unit-test that an XR select on a mesh with a registered `SensorClick` action triggers `emitSignal` (mock ActionManager/pick path); confirm modifier guards don't block
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 11. Exit/cleanup, lifecycle robustness, and changelog
  - [x] 11.1 Harden `exitXR`/session-end restore in `XRManager`
    - Restore `arcCamera` active + control; restore SSAO2/prepass; restore CC + keyboard config; detach/dispose session observers so enter/exit cycles don't accumulate handlers; ensure re-entry works
    - _Requirements: 3.6, 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 11.2 Extend `XRManager.test.ts` for cleanup idempotency
    - Double-exit safe; enter→exit→enter restores expected state; observers detached count matches attached
    - _Requirements: 3.7, 9.4_
  - [x] 11.3 Add changelog entry
    - Add a `changelog.md` entry describing WebXR (VR + AR) preview support, locomotion modes, and SNA-in-XR
    - _Requirements: (documentation)_

- [x] 12. Final checkpoint — full suite + build
  - Run `npm test` and `npm run build`; ensure all tests pass and the production build is clean. Ask the user if questions arise.

## Notes

- Tasks marked `(Optional)` can be skipped for a faster MVP.
- Each task references specific requirements for traceability; property tasks name the design property they validate.
- Checkpoints ensure incremental validation.
- The pure modules (`XRSupport` mapping, `XRLocomotion`) are BabylonJS-free and tested without a scene or headset; `XRManager` is tested with mocks; VR/AR behavior is validated manually on a device or the WebXR emulator (requires HTTPS/localhost).
- Third-person locomotion shares `Vishva.moveAvatarTo` with the existing desktop click-to-move to avoid divergence.

## Task Dependency Graph

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
