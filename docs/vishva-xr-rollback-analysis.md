# Vishva WebXR Rollback Analysis — Replace Vishva XR with CharacterController XR

> **Session purpose:** Planning the rollback of WebXR changes added to Vishva (spec `0.5.0-webxr-support`) and replacing them with the WebXR support now built into the BabylonJS-CharacterController library (v0.5.0).

---

## 1. Background

WebXR support was added to Vishva as part of kiro spec `0.5.0-webxr-support`. Separately, WebXR support was added to the BabylonJS-CharacterController library (spec `webxr-support`). The CharacterController now provides a public XR API that covers the core XR functionality Vishva implemented in its own XRManager. The goal is to remove Vishva's redundant XR code and delegate to the CharacterController instead.

---

## 2. Vishva's WebXR Implementation (to be rolled back)

### 2.1 XR-Specific Files (created for WebXR)

| File | Description |
|------|-------------|
| `src/managers/XRManager.ts` | Main XR session lifecycle manager (~1000+ lines). Handles: session create/enter/exit, render pipeline toggling (SSAO2/prepass/depth renderer), locomotion (thumbstick movement, fast, jump), camera orbit/dolly, XR camera follow, controller ray management, in-headset HUD (options panel + debug panel), sensitivity persistence (localStorage), camera elasticity disabling when HUD shown, desktop state preservation (CC keyboard/running state) |
| `src/managers/XRSupport.ts` | XR capability detection (`detectXRSupport`) + NavBar button-state mapping (`computeXRButtonState`, `XRButtonState`) |
| `src/managers/XRLocomotion.ts` | Locomotion state machine (`XRLocomotion` class, first/third person toggle) + thumbstick-to-intent mapping (`mapSticksToIntent`, `MoveIntent`, `StickInput`, `neutralMoveIntent`) |
| `src/managers/XRManager.test.ts` | XRManager unit tests |
| `src/managers/XRSupport.test.ts` | XRSupport unit tests |
| `src/managers/XRSupport.property.test.ts` | XRSupport property tests |
| `src/managers/XRLocomotion.test.ts` | XRLocomotion unit tests |
| `src/managers/XRLocomotion.property.test.ts` | XRLocomotion property tests |

### 2.2 Modified Files (XR-specific changes to revert/replace)

| File | XR Changes |
|------|------------|
| `src/Vishva.ts` | Import of `XRManager, XRSessionType` from `./managers/XRManager`; `xrManager` field (lazy); `enterXR(type)`, `exitXR()`, `isInXR()` methods delegating to XRManager; `moveAvatarTo(target)` extracted for XR click-to-move |
| `src/gui/VishvaGUI.ts` | Import of `detectXRSupport, computeXRButtonState, XRButtonState` from `../managers/XRSupport`; NavBar button click handlers (`navEnterVR` → `vishva.enterXR('vr')`, `navEnterAR` → `vishva.enterXR('ar')`); `detectXRSupport()` call on startup with `_applyXRButtonState()` to gate buttons; `_applyXRButtonState(state)` private method |
| `src/gui/NavBarML.ts` | Two new buttons added: `#navEnterVR` (title="enter VR", icon `vrpano`) and `#navEnterAR` (title="enter AR", icon `3d_rotation`), placed after `#navSettings` |
| `src/sna/SensorClick.ts` | `Vishva.vishva.isInXR()` check to skip desktop modifier-key guard (alt/ctl/shift) during XR sessions so SNA click behaviors fire on XR controller select (Requirement 8.3) |
| `src/gui/NavBarML.test.ts` | Imports `computeXRButtonState, XRButtonState`; tests for `#navEnterVR`/`#navEnterAR` button existence, titles, placement in navMenubar, and gating logic for all four support combinations |
| `changelog.md` | Entries for 0.5.0 WebXR Support and 0.5.1 WebXR entry camera fix |

### 2.3 Spec Files

| File | Description |
|------|-------------|
| `.kiro/specs/0.5.0-webxr-support/requirements.md` | Full requirements document (20 requirements covering capability detection, entry points, session lifecycle, locomotion, camera control, HUD, sensitivity, SNA interaction, desktop preservation, known limitations) |
| `.kiro/specs/0.5.0-webxr-support/tasks.md` | 25 tasks (tasks 1-24 completed, task 25 = remove temporary debug HUD scaffolding, still outstanding) |
| `.kiro/specs/0.5.0-webxr-support/design.md` | Design document |

---

## 3. CharacterController's XR API (the replacement)

### 3.1 Public API (in `src/CharacterController.ts`)

| Method | Description |
|--------|-------------|
| `enableXR(xr?: WebXRDefaultExperience \| WebXRCamera): Promise<boolean>` | Enable XR by adopting an existing experience/camera or lazily creating one. Resolves true/false. |
| `disableXR(): Promise<void>` | Disable XR, restore desktop mode. No-op if never enabled. |
| `enterXR(type: XRSessionType): Promise<void>` | Enter immersive VR or AR session. No-op if XR not enabled or unsupported. |
| `exitXR(): Promise<void>` | Exit active XR session. Idempotent no-op if no session. |
| `isInXR(): boolean` | True only while XR session is active. |
| `isXRSupported(): Promise<XRSupportState>` | Returns `{vrSupported, arSupported}`. Resolves false for both if XR not enabled. |
| `getXRCamera(): WebXRCamera \| null` | The rendered XR camera, or null. |
| `setXRStickDeadzone(v: number): void` | Set stick deadzone (default 0.15, clamped to [0,1]). |
| `setXROrbitAlphaRate(v: number): void` | Set camera orbit alpha (azimuth) rate (clamped 0-0.02). |
| `setXROrbitBetaRate(v: number): void` | Set camera orbit beta (elevation) rate (clamped 0-0.02). |
| `setXRDollyRate(v: number): void` | Set camera dolly rate (clamped 0-0.2). |
| `setXRInputMapping(mapping: Partial<XRInputMapping>): MappingResult` | Configure which controller inputs drive which actions. |
| `getDefaultXRInputMapping(): XRInputMapping` | Get the default input mapping. |
| `getEffectiveXRInputMapping(): XRInputMapping` | Get the effective mapping (default + overrides). |

### 3.2 Re-exported Types (from library entry point)

- `XRSessionType` ("vr" | "ar")
- `XRSupportState` ({vrSupported, arSupported})
- `XRInputMapping`, `MappingResult`, `DEFAULT_XR_INPUT_MAPPING`, `mergeXRInputMapping`, `validateXRInputMapping`
- `BindableAction`, `BindableInput` (enumerations for configurable input bindings)
- `XRLocomotion`, `mapStickToIntent`, `detectXRSupport`
- Types: `LocomotionMode`, `ToggleResult`, `MoveIntent`, `StickInput`

### 3.3 What the CharacterController's XR Handles (replaces Vishva's XRManager core)

- Session lifecycle (create/enter/exit/restore, lazy creation, state tracking)
- Locomotion (thumbstick movement, dominant-axis gating, deadzone, edge-triggered)
- Fast movement (hold left stick pressed → run variants)
- Jump (left trigger rising edge)
- Camera orbit (right stick alpha/beta, dominant-axis, beta clamping)
- Camera dolly (right B/A continuous radius, left X dolly-to-avatar toggle)
- XR camera follow (mirror ArcRotateCamera transform each frame)
- Controller ray management (hide left ray, raise right ring above HUD group)
- Desktop state preservation (keyboard enabled + running state snapshot/restore)
- Sensitivity rates (alpha/beta/radius as instance state)
- Input mapping (configurable bindings, default mapping, validation)
- Locomotion mode toggle (first/third person via A/X face button)
- Initial pose hook (smooth XR camera entry, no floor-snap)

### 3.4 What the CharacterController's XR Does NOT Handle (Vishva app-level concerns)

| Concern | Notes |
|---------|-------|
| NavBar buttons (VR/AR entry points) | Application UI responsibility |
| Render pipeline toggling (SSAO2/prepass/depth renderer) | Application responsibility; CC does not expose hooks for session start/end |
| SNA click sensor routing | Application responsibility; CC's isInXR() can be used |
| In-headset HUD (options panel, exit button, sensitivity sliders, debug panel) | Application responsibility |
| Sensitivity persistence (localStorage) | CC holds rates as instance state only; app must persist/restore |
| Camera elasticity disabling when HUD shown | Application responsibility; CC does not manage elasticity during XR |
| Session start/end hooks/callbacks | CC's `onSessionStart`/`onSessionEnd` are internal to XRController (private) |
| No public getter for the XR experience object | Only `getXRCamera()` is exposed; no `getXRExperience()` |

---

## 4. Dependency Version

- Vishva currently depends on `babylonjs-charactercontroller: ^0.4.4-alpha.13` (no XR API)
- CharacterController in workspace is version `0.5.0` (has full XR API)
- **Vishva must update its dependency to 0.5.0** to use the XR API

---

## 5. Key Challenges

1. **No session lifecycle hooks**: The CharacterController doesn't expose callbacks for session start/end. Vishva needs to toggle its render pipeline (SSAO2/prepass/depth renderer) when XR starts/stops. Options: (a) Vishva creates its own XR experience and passes it to `cc.enableXR(experience)`, then observes the experience's WebXRState directly; (b) Vishva wraps `cc.enterXR()`/`cc.exitXR()` calls with pre/post logic; (c) Drop render pipeline toggling.

2. **No XR experience getter**: The CC only exposes `getXRCamera()`, not the full `WebXRDefaultExperience`. If Vishva needs the experience for render pipeline management or HUD creation, it should create the experience itself and pass it to `cc.enableXR(experience)`.

3. **In-headset HUD**: Extensive HUD code lives in Vishva's XRManager (options panel, debug panel, sensitivity sliders, exit button, world-space plane + babylonjs-gui ADT). The CC provides no HUD. This code would need to be extracted into a separate module or dropped.

4. **Sensitivity persistence**: The CC holds sensitivity rates as instance state but doesn't persist them. Vishva's localStorage persistence logic would need to call CC's setters (`setXROrbitAlphaRate()`, `setXROrbitBetaRate()`, `setXRDollyRate()`) on session start after loading from localStorage.

5. **Camera elasticity**: Vishva disables CC's camera elasticity/springback when the HUD is shown (the pickable HUD plane obstructs the camera-obstruction ray). The CC doesn't manage elasticity during XR. This logic would need to stay in Vishva.

6. **Entry camera fix (0.5.1)**: Vishva added a smoothstep-blend entry camera fix in 0.5.1. The CharacterController's XRController has an "initial pose hook" (`_registerInitialPoseHook`) that handles the same problem. This Vishva-specific fix becomes redundant.

---

## 6. Open Questions (awaiting user answers)

### Question 1: Render pipeline toggling

The CharacterController does NOT provide hooks for session start/end, so Vishva has no built-in way to toggle its render pipeline (SSAO2/prepass/depth renderer) when XR starts/stops. How should this be handled?

- **(a)** Vishva wraps the calls — Vishva creates a thin XR integration module that calls `cc.enableXR()` / `cc.enterXR()` / `cc.exitXR()` and wraps them with pre/post logic for render pipeline toggling. Vishva creates its own XR experience and passes it to `cc.enableXR(experience)` so it can also observe session state changes directly.
- **(b)** Drop render pipeline toggling — Accept that SSAO2/prepass/depth renderer stay as-is during XR sessions (may cause visual artifacts but simplifies the rollback).
- **(c)** Other — Provide your own answer

### Question 2: In-headset HUD

The in-headset HUD (options panel with Exit XR button, sensitivity sliders, debug panel) is application-specific and NOT provided by the CharacterController. Vishva's XRManager contains extensive HUD code. What should happen to it?

- **(a)** Keep the HUD in Vishva — Extract the HUD code into a separate module that works alongside the CharacterController's XR. Vishva still manages the HUD plane, GUI, and sensitivity persistence (calling CC's `setXROrbitAlphaRate()` etc. when sliders change).
- **(b)** Drop the HUD entirely — Remove the HUD. Users exit XR via the NavBar button only (or a keyboard shortcut). Sensitivity sliders and persistence are dropped.
- **(c)** Other — Provide your own answer

### Question 3: Architecture of the replacement layer

What scope of rollback do you want? The XRManager/XRSupport/XRLocomotion modules clearly get removed and replaced with CC's API. But the application-level integration (NavBar buttons, SensorClick's isInXR check, render pipeline, HUD) needs a new thin layer in Vishva. Should this thin layer live as a new module, or be inlined into existing files?

- **(a)** New module — Create a new `src/managers/XRIntegration.ts` (or similar) that wraps the CC's XR API and handles Vishva's app-level concerns (render pipeline, HUD, sensitivity persistence, SensorClick coordination). This replaces XRManager with a much smaller file.
- **(b)** Inline into existing files — Put the XR wiring directly into `Vishva.ts` and `VishvaGUI.ts` without a separate manager module.
- **(c)** Other — Provide your own answer

---

## 7. Files Affected Summary

### Files to DELETE (XR-specific modules and tests)
- `src/managers/XRManager.ts`
- `src/managers/XRSupport.ts`
- `src/managers/XRLocomotion.ts`
- `src/managers/XRManager.test.ts`
- `src/managers/XRSupport.test.ts`
- `src/managers/XRSupport.property.test.ts`
- `src/managers/XRLocomotion.test.ts`
- `src/managers/XRLocomotion.property.test.ts`

### Files to MODIFY
- `src/Vishva.ts` — Remove XRManager import/field/methods; add CC XR wiring; revert moveAvatarTo if it was only for XR
- `src/gui/VishvaGUI.ts` — Remove XRSupport import; replace with CC's `isXRSupported()`/`detectXRSupport`; update button wiring
- `src/gui/NavBarML.ts` — Keep or remove VR/AR buttons depending on scope decision
- `src/sna/SensorClick.ts` — Replace `Vishva.vishva.isInXR()` with CharacterController's `isInXR()`
- `src/gui/NavBarML.test.ts` — Update or remove XR button tests
- `package.json` — Update `babylonjs-charactercontroller` dependency to `^0.5.0`
- `changelog.md` — Add rollback entry

### Spec files (may be archived/updated)
- `.kiro/specs/0.5.0-webxr-support/` — requirements.md, design.md, tasks.md

---

## 8. Session State

This analysis was produced during a planning session. The three questions in section 6 have been asked but NOT yet answered. When resuming:

1. Answer the three questions in section 6
2. Based on answers, the planning agent will create a detailed implementation plan with task breakdown
3. After plan confirmation, the plan will be passed to an execution agent

---

> **File location:** `d:\0-PROJECTS\0-babylonjs\0-vishva\Vishva\vishva-xr-rollback-analysis.md`
>
> **To resume:** Open this file, answer the three questions, and tell the planning agent to proceed with the implementation plan.
