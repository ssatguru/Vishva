# Requirements Document

## Introduction

WebXR Support adds an immersive preview/experience mode to Vishva so users can view and move through their 3D worlds in VR headsets and AR passthrough devices, using BabylonJS's native WebXR. The feature is a viewing/experience layer only: desktop editing behavior is unchanged, and entering or exiting XR must leave the desktop editor fully functional.

Inside an XR session the user drives the existing Avatar through the scene primarily with the **thumbsticks**:

- The **left thumbstick** moves the Avatar (walk / walk-back / strafe) through the existing `CharacterController`, using dominant-axis gating so the Avatar never drifts sideways while backing up. Clicking (pressing) the left thumbstick engages **fast** (run) variants of whichever direction is active.
- The **left trigger** makes the Avatar **jump**. The **left Y face button** toggles an in-headset **HUD**.
- The **right thumbstick** **orbits** the follow camera around the Avatar (azimuth/elevation), and the **right B / A face buttons** **dolly** the follow camera toward / away from the Avatar.

The first-/third-person **Locomotion_Mode** is still present and is toggled by the controller A/X face button, but with thumbstick locomotion the mode now only affects camera coupling (whether the follow camera is pulled all the way in to the Avatar) rather than the core movement mechanism. Teleportation and point-to-move remain in the codebase as retained/secondary mechanisms but are no longer the active movement path.

Controller "select" actions still route through the scene picking system so existing SNA (Sensor/Actuator) click behaviors fire in XR exactly as they do with a desktop click.

The orbit and dolly sensitivities are user-tunable via sliders on the in-headset HUD **Options_Panel** and are persisted across sessions in browser `localStorage`.

## Glossary

- **XR_System**: The subsystem responsible for the WebXR session lifecycle, controllers/input, locomotion, camera control, the in-headset HUD, and interaction routing. Realized primarily by `XRManager`, `XRLocomotion`, and `XRSupport`.
- **XR_Session**: An active immersive WebXR session (either VR or AR) created through the BabylonJS default XR experience.
- **VR_Mode**: An immersive-vr WebXR session.
- **AR_Mode**: An immersive-ar WebXR session (passthrough overlay of the world onto the real environment).
- **XR_Support_State**: The pair of booleans `{ vrSupported, arSupported }` describing whether the current device/browser supports each session type.
- **Locomotion_Mode**: The in-session navigation sub-mode, either `firstPerson` or `thirdPerson`. With thumbstick locomotion this mode selects camera coupling only, not the movement mechanism.
- **First_Person_Mode**: A Locomotion_Mode in which the follow camera is allowed to pull all the way in to the Avatar (`CharacterController.setNoFirstPerson(false)`).
- **Third_Person_Mode**: A Locomotion_Mode in which the follow camera is held at the third-person offset behind/above the Avatar (`CharacterController.setNoFirstPerson(true)`).
- **Character_Controller**: The active `CharacterController` instance from `babylonjs-charactercontroller` that drives the Avatar (`Vishva.avManager.cc`).
- **No_First_Person**: The `CCSettings.noFirstPerson` flag on the active Character_Controller; when true, First_Person_Mode is not permitted.
- **Avatar**: The controllable character mesh managed by `AvManager` and Character_Controller.
- **Editor_Camera** / **Follow_Camera**: The desktop `ArcRotateCamera` referenced by `Vishva.arcCamera`. It follows/orbits the Avatar via the Character_Controller and is the source transform mirrored onto the XR camera during a session. Active as the rendered camera only when not in an XR_Session.
- **XR_Camera**: The BabylonJS `WebXRCamera` actually rendered to the headset during a session (`experience.baseExperience.camera`).
- **Render_Pipeline**: The desktop rendering additions attached to the Editor_Camera — depth renderer, `SSAO2RenderingPipeline`, and prepass.
- **Thumbstick_Locomotion**: The primary movement model: the left thumbstick drives the Avatar via the Character_Controller each frame; the right thumbstick and right face buttons control the camera.
- **Stick_Input**: The raw left-thumbstick axes `{ leftX, leftY }` sampled from the controller and fed to `mapSticksToIntent`.
- **Move_Intent**: The set of continuous translation flags `{ walk, walkBack, strafeLeft, strafeRight }` derived from Stick_Input by the pure `mapSticksToIntent`.
- **Stick_Deadzone**: The threshold (default `0.15`) below which a raw stick axis is treated as zero.
- **Dominant_Axis_Gating**: The rule that at most one axis of a stick drives an action per frame — the axis with the larger raw magnitude wins and the other is forced off. Applied to the left stick (forward/back vs strafe; ties resolve to the forward/back axis) and the right stick (orbit alpha vs beta; ties resolve to alpha).
- **Fast_Movement**: The run/fast variant (`run`, `walkBackFast`, `strafeLeftFast`, `strafeRightFast`) engaged while the left thumbstick is pressed (clicked), matched to the currently active direction. Hold-to-go-fast.
- **Jump**: A rising-edge press of the left controller trigger that calls `CharacterController.jump()`.
- **Camera_Orbit**: Adjustment of the Follow_Camera's `alpha` (azimuth) and `beta` (elevation) from the right thumbstick, orbiting the camera around the Avatar without rotating the Avatar.
- **Camera_Dolly**: Adjustment of the Follow_Camera's `radius` (distance from the Avatar) — continuously via the right B / A face buttons, or by the left X-button dolly-to-Avatar toggle.
- **Sensitivity_Rate**: One of three tunable rates — `alphaRate`, `betaRate` (Camera_Orbit, radians/frame at full deflection), and `radiusRate` (Camera_Dolly, radius units/frame while a button is held). Defaults `0.0075` / `0.003` / `0.05`; slider maxes `MAX_ORBIT_RATE` (`0.02`) / `MAX_RADIUS_RATE` (`0.2`).
- **HUD**: The in-headset heads-up display — a world-space plane hosting a `babylonjs-gui` `AdvancedDynamicTexture`, toggled by the left Y face button, starting hidden on entry.
- **Options_Panel**: The permanent, world-locked HUD mode: an Exit XR button, a Debug button, and three Sensitivity_Rate sliders.
- **Debug_Panel**: A temporary, head-locked HUD mode showing a live controller/pose diagnostic readout with a Close button that returns to the Options_Panel. Debug scaffolding, slated for removal.
- **Teleport_Feature**: The BabylonJS WebXR teleportation feature (`WebXRMotionControllerTeleportation`). Retained but never enabled by the active flow (superseded by Thumbstick_Locomotion).
- **Pointer_Selection_Feature**: The BabylonJS WebXR pointer selection feature that emits pointer/pick events from controllers. Left enabled in both modes for SNA interaction.
- **XR_Select**: A controller "select" action (typically the trigger) delivered through the Pointer_Selection_Feature.
- **SNA_Click_Sensor**: A `SensorClick` behavior that reacts to BabylonJS `ActionManager` pick triggers (`OnLeftPickTrigger`, `OnPickTrigger`, etc.).
- **Enter_XR_Button**: One of the two NavBar controls, "Enter VR" and "Enter AR", that start an XR_Session.

## Requirements

### Requirement 1: XR Capability Detection

**User Story:** As a user, I want Vishva to detect whether my device supports VR and/or AR, so that I am only offered modes my hardware and browser can actually run.

#### Acceptance Criteria

1. WHEN the editor initializes, THE XR_System SHALL determine XR_Support_State by querying WebXR session support for `immersive-vr` and `immersive-ar` independently.
2. IF the WebXR API is unavailable in the current browser (no `navigator.xr`), THEN THE XR_System SHALL resolve XR_Support_State to `{ vrSupported: false, arSupported: false }` without throwing.
3. WHEN a support query for a given session type rejects or throws, THE XR_System SHALL treat that session type as unsupported rather than propagating the error.
4. THE XR_System SHALL expose a pure mapping from XR_Support_State to a button-state model that marks each of the VR and AR Enter_XR_Buttons visible and enabled if and only if that session type is supported.

### Requirement 2: Entry Points In The NavBar

**User Story:** As a user, I want clearly labeled buttons to enter VR or AR, so that I can start an immersive session from the editor.

#### Acceptance Criteria

1. THE XR_System SHALL present an "Enter VR" Enter_XR_Button and an "Enter AR" Enter_XR_Button in the NavBar.
2. WHILE `vrSupported` is false, THE XR_System SHALL render the "Enter VR" button as hidden or disabled so it cannot start a VR_Session.
3. WHILE `arSupported` is false, THE XR_System SHALL render the "Enter AR" button as hidden or disabled so it cannot start an AR_Session.
4. WHEN the user activates the "Enter VR" button AND `vrSupported` is true, THE XR_System SHALL start a VR_Mode XR_Session.
5. WHEN the user activates the "Enter AR" button AND `arSupported` is true, THE XR_System SHALL start an AR_Mode XR_Session.
6. WHEN neither VR nor AR is supported, THE XR_System SHALL NOT present an enabled Enter_XR_Button that starts a session.

### Requirement 3: XR Session Lifecycle

**User Story:** As a user, I want entering and exiting XR to be reliable and repeatable, so that I can move between the immersive experience and the desktop editor freely.

#### Acceptance Criteria

1. WHEN an XR_Session is first requested, THE XR_System SHALL lazily create a single BabylonJS default XR experience and reuse it for subsequent sessions.
2. WHEN an XR_Session starts, THE XR_System SHALL disable the desktop Render_Pipeline additions (depth renderer, SSAO2, prepass) that are incompatible with the session, recording their prior state.
3. WHEN an XR_Session ends (via exit request or headset/session termination), THE XR_System SHALL restore the Editor_Camera as `scene.activeCamera`, re-attach desktop camera control, and re-enable the recorded Render_Pipeline state.
4. THE XR_System SHALL expose the current session state such that `isInXR()` returns true only while an XR_Session is active.
5. WHEN a request is made to start a session type that is not supported, THE XR_System SHALL decline to start a session and SHALL leave the desktop state unchanged.
6. WHEN the user exits and later re-enters XR, THE XR_System SHALL start a functioning session without requiring a page reload.
7. WHEN `exitXR` is invoked while no XR_Session is active, THE XR_System SHALL perform no destructive action and SHALL leave the desktop state unchanged (idempotent exit).
8. WHEN an XR_Session starts, THE XR_System SHALL create the session with the `local-floor` reference space type.

### Requirement 4: Locomotion Sub-Mode State Machine

**User Story:** As a user, I want a well-defined first/third-person state that respects the avatar configuration, so that switching modes behaves predictably.

#### Acceptance Criteria

1. THE XR_System SHALL maintain a Locomotion_Mode that is either `firstPerson` or `thirdPerson`.
2. THE XR_System SHALL provide a toggle operation that accepts a `canFirstPerson` capability flag and returns a result describing the resulting mode, whether the mode changed, and whether the toggle was blocked.
3. WHEN a toggle is requested toward `firstPerson` AND `canFirstPerson` is false, THE XR_System SHALL keep the Locomotion_Mode at its current value, report the toggle as blocked, and report the mode as unchanged.
4. WHEN a toggle is requested toward `firstPerson` AND `canFirstPerson` is true, THE XR_System SHALL set the Locomotion_Mode to `firstPerson` and report the mode as changed when it differs from the prior mode.
5. WHEN a toggle is requested toward `thirdPerson`, THE XR_System SHALL set the Locomotion_Mode to `thirdPerson` regardless of `canFirstPerson` and SHALL never report that transition as blocked.
6. FOR ANY sequence of toggle operations in which every operation supplies `canFirstPerson = false`, THE Locomotion_Mode SHALL never become `firstPerson`.

### Requirement 5: Locomotion Mode Selects Camera Coupling

**User Story:** As a user, I want the first/third-person mode to change how the camera frames my avatar, so that I can choose a first-person or over-the-shoulder view while moving with the sticks.

#### Acceptance Criteria

1. WHEN an XR_Session starts AND First_Person_Mode is permitted (No_First_Person is false), THE XR_System SHALL default the Locomotion_Mode to First_Person_Mode.
2. WHEN an XR_Session starts AND First_Person_Mode is not permitted (No_First_Person is true), THE XR_System SHALL default the Locomotion_Mode to Third_Person_Mode.
3. WHEN the Locomotion_Mode is applied or changed to First_Person_Mode, THE XR_System SHALL configure the Character_Controller camera coupling via `setNoFirstPerson(false)`.
4. WHEN the Locomotion_Mode is applied or changed to Third_Person_Mode, THE XR_System SHALL configure the Character_Controller camera coupling via `setNoFirstPerson(true)`.
5. WHEN any Locomotion_Mode is applied, THE XR_System SHALL ensure the Teleport_Feature is not active, because Thumbstick_Locomotion has replaced teleportation as the movement mechanism.
6. WHILE an XR_Session is active, THE XR_System SHALL leave the Pointer_Selection_Feature enabled in both modes so SNA click interaction keeps working.

### Requirement 6: Thumbstick Movement (Left Stick)

**User Story:** As a user, I want to move my avatar by pushing the left thumbstick, so that I can walk and strafe naturally through the world in XR.

#### Acceptance Criteria

1. WHILE an XR_Session is active, THE XR_System SHALL sample the bound left thumbstick each render frame and map its axes to a Move_Intent via the pure `mapSticksToIntent`, applying the Stick_Deadzone.
2. WHEN the left thumbstick is pushed forward (`leftY < -deadzone`), THE XR_System SHALL drive the Avatar forward via `CharacterController.walk`; WHEN pulled back (`leftY > deadzone`), THE XR_System SHALL drive the Avatar backward via `CharacterController.walkBack`.
3. WHEN the left thumbstick is pushed right (`leftX > deadzone`), THE XR_System SHALL strafe the Avatar right via `CharacterController.strafeRight`; WHEN pushed left (`leftX < -deadzone`), THE XR_System SHALL strafe the Avatar left via `CharacterController.strafeLeft`.
4. WHEN mapping the left thumbstick, THE XR_System SHALL apply Dominant_Axis_Gating so that at most one of {forward/back} or {strafe} is active per frame, choosing the axis with the larger raw magnitude and resolving ties to the forward/back axis.
5. WHILE any raw left-stick axis is within the Stick_Deadzone, THE XR_System SHALL treat that axis as zero so resting drift produces no movement.
6. THE XR_System SHALL invoke a Character_Controller movement method only on the frame a direction's active state changes (edge-triggered: on `false→true` and `true→false`), not every frame.
7. WHEN an XR_Session ends while a movement is active, THE XR_System SHALL apply a neutral Move_Intent so the Avatar is not left moving on the desktop.

### Requirement 7: Fast Movement

**User Story:** As a user, I want to move faster while I hold the thumbstick pressed, so that I can cover distance quickly without a separate mode.

#### Acceptance Criteria

1. WHILE the left thumbstick is pressed (clicked) AND a movement direction is active, THE XR_System SHALL drive the Avatar using the Fast_Movement variant matching that direction (`run` for forward, `walkBackFast`, `strafeLeftFast`, or `strafeRightFast`).
2. WHEN the left thumbstick is released from pressed while a direction remains active, THE XR_System SHALL switch that direction from its Fast_Movement variant back to its normal variant.
3. WHEN the Fast_Movement state changes for an active direction, THE XR_System SHALL stop the previous-speed Character_Controller method and start the new-speed method so both are never active at once.

### Requirement 8: Jump (Left Trigger)

**User Story:** As a user, I want to jump with the left trigger, so that I can navigate vertical obstacles in XR.

#### Acceptance Criteria

1. WHEN the left controller trigger transitions to pressed (rising edge) during an XR_Session, THE XR_System SHALL call `CharacterController.jump()` once.
2. WHEN the right controller trigger is pressed, THE XR_System SHALL NOT trigger a jump (jump is bound only to the left controller).
3. WHEN an XR_Session ends, THE XR_System SHALL detach the left-trigger jump observers so repeated enter/exit cycles do not accumulate handlers.

### Requirement 9: Camera Orbit (Right Stick)

**User Story:** As a user, I want to orbit the camera around my avatar with the right thumbstick, so that I can look around without turning the avatar.

#### Acceptance Criteria

1. WHILE an XR_Session is active, WHEN the right thumbstick X axis is beyond the Stick_Deadzone, THE XR_System SHALL change the Follow_Camera's `alpha` by `alphaRate` scaled by the raw axis value.
2. WHILE an XR_Session is active, WHEN the right thumbstick Y axis is beyond the Stick_Deadzone, THE XR_System SHALL change the Follow_Camera's `beta` by `betaRate` scaled by the raw axis value, decreasing `beta` for forward (`rightY < 0`) and increasing it for back, then clamping `beta` within the camera's beta limits (or a pole-avoiding fallback range).
3. WHEN applying Camera_Orbit, THE XR_System SHALL apply Dominant_Axis_Gating so that only one of `alpha` or `beta` changes per frame, choosing the axis with the larger raw magnitude and resolving ties to `alpha`.
4. WHILE applying Camera_Orbit, THE XR_System SHALL NOT rotate the Avatar (no Character_Controller turn calls).

### Requirement 10: Camera Dolly (Right B / A Buttons and Left X Button)

**User Story:** As a user, I want to move the camera closer to or farther from my avatar, so that I can frame the view I want.

#### Acceptance Criteria

1. WHILE the right controller B face button is held during an XR_Session, THE XR_System SHALL decrease the Follow_Camera's `radius` by `radiusRate` each frame (dolly toward the Avatar).
2. WHILE the right controller A face button is held during an XR_Session, THE XR_System SHALL increase the Follow_Camera's `radius` by `radiusRate` each frame (dolly away from the Avatar).
3. WHEN a Camera_Dolly changes `radius`, THE XR_System SHALL clamp `radius` within the Follow_Camera's `lowerRadiusLimit`/`upperRadiusLimit` when present.
4. WHEN the left controller X face button transitions to pressed (rising edge), THE XR_System SHALL toggle the Follow_Camera between a dollied-to-Avatar state (snapping `radius` to `lowerRadiusLimit`, or 0 when no limit, and remembering the prior `radius`) and a restored state (returning `radius` to the remembered value).
5. THE XR_System SHALL capture the right B / A dolly button components only on the right controller (by handedness), and SHALL clear those captures when the session ends.

### Requirement 11: XR Camera Follows the Avatar

**User Story:** As a user, I want the headset view to follow and orbit my avatar as I move and adjust the camera, so that the third-person follow experience carries into XR.

#### Acceptance Criteria

1. WHILE an XR_Session is active, THE XR_System SHALL, each render frame, mirror the Follow_Camera's transform onto the XR_Camera via `setTransformationFromNonVRCamera(arcCamera, true)`.
2. WHEN the per-frame mirror forces the XR_Camera's `position.y` to zero, THE XR_System SHALL then set the XR_Camera's `position.y` to the Follow_Camera's current Y so camera height (driven by `beta`) is preserved.
3. THE XR_System SHALL perform the per-frame follow after sampling the sticks and after HUD placement, so the headset view reflects the same-frame Follow_Camera pose.
4. WHEN an XR_Session ends, THE XR_System SHALL detach the per-frame render observer so repeated enter/exit cycles do not accumulate render callbacks.

### Requirement 12: Sensitivity Settings and Persistence

**User Story:** As a user, I want to tune orbit and dolly sensitivity in the headset and have my choices remembered, so that navigation feels right to me across sessions.

#### Acceptance Criteria

1. THE XR_System SHALL hold the three Sensitivity_Rate values (`alphaRate`, `betaRate`, `radiusRate`) as adjustable instance state, initialized to their defaults (`0.0075`, `0.003`, `0.05`).
2. THE XR_System SHALL present three sliders on the HUD Options_Panel that adjust `alphaRate` and `betaRate` over the range `0…MAX_ORBIT_RATE` and `radiusRate` over `0…MAX_RADIUS_RATE`.
3. WHEN a sensitivity slider value changes, THE XR_System SHALL update the corresponding rate, update the slider's label, and persist all three rates to `localStorage` (keys `vishva.xr.alphaRate`, `vishva.xr.betaRate`, `vishva.xr.radiusRate`).
4. WHEN an XR_Session starts, THE XR_System SHALL load each persisted rate from `localStorage`, applying a stored value only when it parses to a finite number within the valid range (`0…max`) and otherwise keeping the current value.
5. IF `localStorage` is unavailable or throws, THEN THE XR_System SHALL keep the current rate values and continue without error.

### Requirement 13: In-Headset HUD

**User Story:** As a user, I want an in-headset panel with an exit button and settings, so that I can leave XR and adjust options without removing the headset.

#### Acceptance Criteria

1. THE XR_System SHALL provide an HUD rendered on a world-space plane textured with a `babylonjs-gui` AdvancedDynamicTexture, and SHALL make the plane pickable so its GUI controls can be hit by the pointer ray.
2. WHEN an XR_Session starts, THE XR_System SHALL leave the HUD hidden until the user shows it.
3. WHEN the left controller Y face button transitions to pressed (rising edge), THE XR_System SHALL toggle HUD visibility, returning to the Options_Panel mode each time it is shown.
4. WHILE the HUD is shown in Options_Panel mode, THE XR_System SHALL display an Exit XR button that ends the session, a Debug button that switches to Debug_Panel mode, and the three Sensitivity_Rate sliders, and SHALL place the panel world-locked in front of the viewer on the first frame with a valid head pose.
5. WHILE the HUD is shown in Debug_Panel mode, THE XR_System SHALL display a live diagnostic readout and a Close button that returns to Options_Panel mode, and SHALL reposition the panel in front of the head each frame.
6. WHEN the left controller Y face button is used, THE XR_System SHALL bind the toggle to the `y-button` component rather than the platform `menu` button, because the `menu` button's pressed state is reserved and unreliably delivered in WebXR.

Note: The Debug_Panel readout, the `diag*` diagnostic fields, and the controller/handedness dump are temporary debug scaffolding slated for removal. The Options_Panel with the Exit button, Debug button, and sensitivity sliders, and the sensitivity persistence, are permanent.

### Requirement 14: Camera Elasticity While the HUD Is Shown

**User Story:** As a user, I want the camera to stay steady when the HUD is on screen, so that the view does not lurch while I interact with the panel.

#### Acceptance Criteria

1. WHEN the HUD is shown, THE XR_System SHALL disable the Character_Controller's camera elasticity and springback, recording their prior state, because the pickable HUD plane otherwise obstructs the controller's camera-obstruction ray and causes a camera jerk.
2. WHEN the HUD is hidden OR the XR_Session ends, THE XR_System SHALL restore the recorded camera elasticity and springback state.
3. WHEN hiding the HUD, THE XR_System SHALL make the HUD plane non-pickable and disabled before restoring elasticity so re-enabling elasticity does not lurch the camera while the plane is still in the obstruction path.

### Requirement 15: Controller Ray Management

**User Story:** As a user, I want the controller pointer feedback to make sense for how the controllers are used, so that pointing is clear and never hidden behind the HUD.

#### Acceptance Criteria

1. WHILE an XR_Session is active, THE XR_System SHALL hide the left controller's pointer-selection laser ray and selection ring, because the left trigger is bound to jump and the ray would be misleading.
2. WHILE an XR_Session is active, THE XR_System SHALL raise the right controller's pointer-selection ring and laser above the HUD plane's rendering group so they remain visible over the panel.
3. WHERE the pointer-selection meshes are created asynchronously after a controller is added, THE XR_System SHALL retry the hide and the raise each render frame until they succeed, then stop retrying.
4. WHEN an XR_Session ends, THE XR_System SHALL reset the ray-hide and ring-raise state so the next session re-applies them to its controllers.

### Requirement 16: In-Session Locomotion Toggle

**User Story:** As a user, I want to switch between first- and third-person camera coupling at any time with a controller button, so that I can choose my view without leaving XR.

#### Acceptance Criteria

1. THE XR_System SHALL bind the controller A/X face button (the `a-button` on the right controller / `x-button` on the left) to request a Locomotion_Mode toggle during an XR_Session, and SHALL NOT bind the toggle to the trigger.
2. WHEN the toggle control is activated, THE XR_System SHALL derive `canFirstPerson` as the logical negation of the active Character_Controller's No_First_Person setting and SHALL pass it to the toggle operation.
3. WHEN a toggle results in a changed Locomotion_Mode, THE XR_System SHALL reconfigure the Character_Controller camera coupling to match the new mode.
4. WHEN a toggle toward First_Person_Mode is blocked because No_First_Person is true, THE XR_System SHALL remain in Third_Person_Mode and SHALL provide lightweight feedback (a log plus a best-effort haptic pulse on the requesting controller).
5. THE XR_System SHALL allow the toggle to be activated repeatedly within a single XR_Session.

Note: On the right controller the `a-button` is owned by the Camera_Dolly binding (Requirement 10.2). In the current build the generic face-button toggle path binds the left `x-button`, which drives the dolly-to-Avatar toggle (Requirement 10.4); the first/third-person coupling toggle is driven through `handleToggleRequest`. The trigger is never bound to a toggle.

### Requirement 17: SNA Click Interaction In XR

**User Story:** As a user, I want pointing and selecting with my controller to trigger the same object behaviors as a desktop click, so that interactive worlds work in XR.

#### Acceptance Criteria

1. WHILE an XR_Session is active, WHEN the user performs an XR_Select on a mesh that has an SNA_Click_Sensor, THE XR_System SHALL route the selection through the scene picking system so the mesh's `ActionManager` pick trigger fires.
2. WHEN an SNA_Click_Sensor's pick trigger fires from an XR_Select, THE SNA_Click_Sensor SHALL emit its signal exactly as it would for the equivalent desktop pointer click.
3. THE XR_System SHALL NOT allow the desktop modifier-key guards (alt/ctl/shift) to spuriously block XR_Select-driven SNA behavior, given that those modifiers are not asserted during an XR_Session.
4. WHERE an XR_Select occurs in any Locomotion_Mode, THE XR_System SHALL still allow SNA_Click_Sensor behaviors to fire when the selected mesh carries one.

### Requirement 18: Retained Point-to-Move Helper

**User Story:** As a maintainer, I want the point-to-move helper preserved as a reusable path, so that the shared click-to-move logic remains available even though thumbstick locomotion is now primary.

#### Acceptance Criteria

1. WHERE the point-to-move helper is invoked in Third_Person_Mode with a valid picked point, THE XR_System SHALL start the Character_Controller and drive the Avatar there via the shared `Vishva.moveAvatarTo` (marker + `CharacterController.moveTo`).
2. WHERE the point-to-move helper is invoked with no valid picked point, THE XR_System SHALL NOT invoke `moveTo`.
3. THE XR_System SHALL NOT route controller select through the point-to-move helper during the active session, because Thumbstick_Locomotion is the movement mechanism; the helper is retained for reuse and contract testing only.

### Requirement 19: Desktop State Preservation

**User Story:** As an editor, I want the desktop editor to be exactly as I left it after leaving XR, so that immersive preview never disrupts my editing workflow.

#### Acceptance Criteria

1. WHEN an XR_Session ends, THE XR_System SHALL restore the Editor_Camera as the active camera and SHALL re-attach desktop camera control.
2. WHEN an XR_Session ends, THE XR_System SHALL restore the Render_Pipeline (depth renderer, SSAO2, prepass) to its pre-session state.
3. WHEN an XR_Session starts, THE XR_System SHALL keep the Character_Controller running while disabling only its keyboard input, and WHEN the session ends, THE XR_System SHALL restore the recorded keyboard-enabled and running state.
4. WHEN an XR_Session ends, THE XR_System SHALL detach or clear the observers, listeners, and component captures it added for the session so that repeated enter/exit cycles do not accumulate handlers.
5. WHILE entering, running, and exiting an XR_Session, THE XR_System SHALL NOT alter desktop editing capabilities (selection, transform, property editing) beyond the documented camera/pipeline/controller restoration.

### Requirement 20: Known Limitations

**User Story:** As a user, I want predictable behavior around the current limitations, so that I understand why certain combined actions do not work yet.

#### Acceptance Criteria

1. WHEN a Jump is requested while a movement is active, THE XR_System SHALL exhibit mutually exclusive jump-and-move behavior, because `CharacterController.jump()` resets the movement action state; simultaneous move-and-jump is a known limitation deferred to a future Character_Controller enhancement.
2. WHEN an XR_Session starts, THE XR_System SHALL keep the HUD hidden until the left Y button is pressed, mitigating a known entry-drop where the first follow frame snaps the XR_Camera Y down to the Follow_Camera's low follow-Y; the root-cause fix is deferred.
