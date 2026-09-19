# Requirements Document

## Introduction

WebXR Support adds an immersive preview/experience mode to Vishva so users can view and move through their 3D worlds in VR headsets and AR passthrough devices, using BabylonJS's native WebXR. The feature is a viewing/experience layer only: desktop editing behavior is unchanged, and entering or exiting XR must leave the desktop editor fully functional.

Inside an XR session the user navigates via two locomotion sub-modes that can be toggled at any time with the controller A/X face button (the `a-button`/`x-button` component):

- **First-person**: teleportation plus controller pointers.
- **Third-person**: the user points a controller at a location and the avatar walks there via the existing `CharacterController.moveTo`, extending Vishva's current click-to-move behavior.

Toggling to first-person is blocked when the active CharacterController is configured with `noFirstPerson`. Controller "select" actions route through the scene picking system so existing SNA (Sensor/Actuator) click behaviors fire in XR just as they do with a desktop click.

## Glossary

- **XR_System**: The subsystem responsible for the WebXR session lifecycle, controllers/input, locomotion sub-modes, and interaction routing. Realized primarily by `XRManager`, `XRLocomotion`, and `XRSupport`.
- **XR_Session**: An active immersive WebXR session (either VR or AR) created through the BabylonJS default XR experience.
- **VR_Mode**: An immersive-vr WebXR session.
- **AR_Mode**: An immersive-ar WebXR session (passthrough overlay of the world onto the real environment).
- **XR_Support_State**: The pair of booleans `{ vrSupported, arSupported }` describing whether the current device/browser supports each session type.
- **Locomotion_Mode**: The in-session navigation sub-mode, either `firstPerson` or `thirdPerson`.
- **First_Person_Mode**: A Locomotion_Mode using WebXR teleportation and controller pointers to move the viewer.
- **Third_Person_Mode**: A Locomotion_Mode where a controller points at a target location and the Avatar is driven there via `CharacterController.moveTo`.
- **Character_Controller**: The active `CharacterController` instance from `babylonjs-charactercontroller` that drives the Avatar (`Vishva.cc` / `AvManager.cc`).
- **No_First_Person**: The `CCSettings.noFirstPerson` flag on the active Character_Controller; when true, First_Person_Mode is not permitted.
- **Avatar**: The controllable character mesh managed by `AvManager` and Character_Controller.
- **Editor_Camera**: The desktop `ArcRotateCamera` referenced by `Vishva.arcCamera`, active when not in an XR_Session.
- **Render_Pipeline**: The desktop rendering additions attached to the Editor_Camera — depth renderer, `SSAO2RenderingPipeline`, and prepass.
- **Teleport_Feature**: The BabylonJS WebXR teleportation feature (`WebXRMotionControllerTeleportation`).
- **Pointer_Selection_Feature**: The BabylonJS WebXR pointer selection feature (`WebXRControllerPointerSelection`) that emits pointer/pick events from controllers.
- **XR_Select**: A controller "select" action (typically the trigger) delivered through the Pointer_Selection_Feature.
- **SNA_Click_Sensor**: A `SensorClick` behavior that reacts to BabylonJS `ActionManager` pick triggers (`OnLeftPickTrigger`, `OnPickTrigger`, etc.).
- **Move_Target**: The world-space point produced by ray-picking the scene from a controller in Third_Person_Mode, passed to `CharacterController.moveTo`.
- **Enter_XR_Button**: One of the two NavBar controls, "Enter VR" and "Enter AR", that start an XR_Session.

## Requirements

### Requirement 1: XR Capability Detection

**User Story:** As a user, I want Vishva to detect whether my device supports VR and/or AR, so that I am only offered modes my hardware and browser can actually run.

#### Acceptance Criteria

1. WHEN the editor initializes, THE XR_System SHALL determine XR_Support_State by querying WebXR session support for `immersive-vr` and `immersive-ar` independently.
2. IF the WebXR API is unavailable in the current browser (no `navigator.xr`), THEN THE XR_System SHALL resolve XR_Support_State to `{ vrSupported: false, arSupported: false }` without throwing.
3. WHEN a support query for a given session type rejects or throws, THE XR_System SHALL treat that session type as unsupported rather than propagating the error.
4. THE XR_System SHALL expose a pure mapping from XR_Support_State to a button-state model that indicates, for each of the VR and AR Enter_XR_Buttons, whether it is visible/enabled.

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
2. WHEN an XR_Session starts, THE XR_System SHALL configure the Render_Pipeline for XR stability by disabling or adjusting the desktop SSAO2/prepass additions that are incompatible with the session.
3. WHEN an XR_Session ends (via exit request or headset/session termination), THE XR_System SHALL restore the Editor_Camera as `scene.activeCamera` and re-enable the desktop Render_Pipeline.
4. THE XR_System SHALL expose the current session state such that `isInXR()` returns true only while an XR_Session is active.
5. WHEN a request is made to start a session type that is not supported, THE XR_System SHALL decline to start a session and SHALL leave the desktop state unchanged.
6. WHEN the user exits and later re-enters XR, THE XR_System SHALL start a functioning session without requiring a page reload.
7. WHEN `exitXR` is invoked while no XR_Session is active, THE XR_System SHALL perform no destructive action and SHALL leave the desktop state unchanged (idempotent exit).

### Requirement 4: Locomotion Sub-Mode State Machine

**User Story:** As a user, I want a well-defined first/third-person navigation state that respects the avatar configuration, so that switching modes behaves predictably.

#### Acceptance Criteria

1. THE XR_System SHALL maintain a Locomotion_Mode that is either `firstPerson` or `thirdPerson`.
2. THE XR_System SHALL provide a toggle operation that accepts a `canFirstPerson` capability flag and returns a result describing the resulting mode, whether the mode changed, and whether the toggle was blocked.
3. WHEN a toggle is requested toward `firstPerson` AND `canFirstPerson` is false, THE XR_System SHALL keep the Locomotion_Mode at `thirdPerson`, report the toggle as blocked, and report the mode as unchanged.
4. WHEN a toggle is requested toward `firstPerson` AND `canFirstPerson` is true, THE XR_System SHALL set the Locomotion_Mode to `firstPerson` and report the mode as changed.
5. WHEN a toggle is requested toward `thirdPerson`, THE XR_System SHALL set the Locomotion_Mode to `thirdPerson` regardless of `canFirstPerson` and SHALL never report that transition as blocked.
6. FOR ANY sequence of toggle operations in which every operation supplies `canFirstPerson = false`, THE Locomotion_Mode SHALL never become `firstPerson`.

### Requirement 5: First-Person Locomotion

**User Story:** As a user in first-person mode, I want to teleport and point with my controllers, so that I can move through the world naturally in VR.

#### Acceptance Criteria

1. WHILE the Locomotion_Mode is First_Person_Mode during an XR_Session, THE XR_System SHALL enable the Teleport_Feature and the Pointer_Selection_Feature.
2. WHEN the Teleport_Feature is enabled, THE XR_System SHALL register the walkable ground as a teleportation floor so the user can teleport onto it.
3. WHILE the Locomotion_Mode is Third_Person_Mode, THE XR_System SHALL NOT have the Teleport_Feature active.
4. WHEN an XR_Session starts AND First_Person_Mode is permitted (No_First_Person is false), THE XR_System SHALL default the Locomotion_Mode to First_Person_Mode.
5. WHEN an XR_Session starts AND First_Person_Mode is not permitted (No_First_Person is true), THE XR_System SHALL default the Locomotion_Mode to Third_Person_Mode.

### Requirement 6: Third-Person Locomotion

**User Story:** As a user in third-person mode, I want to point at a spot and have my avatar walk there, so that I can guide the character through the scene from an immersive viewpoint.

#### Acceptance Criteria

1. WHILE the Locomotion_Mode is Third_Person_Mode during an XR_Session, WHEN the user performs an XR_Select that ray-picks a valid scene point, THE XR_System SHALL compute a Move_Target from the picked point and SHALL invoke `CharacterController.moveTo(Move_Target)`.
2. WHEN a Move_Target-driven move is invoked, THE XR_System SHALL ensure the Character_Controller is started so the Avatar animates and moves.
3. WHILE the Locomotion_Mode is Third_Person_Mode, WHEN an XR_Select does not produce a valid pick point, THE XR_System SHALL NOT invoke `moveTo`.
4. THE XR_System SHALL reuse the existing click-to-move marker/visual approach for indicating the Move_Target rather than introducing a divergent mechanism.
5. WHILE the Locomotion_Mode is Third_Person_Mode, THE XR_System SHALL NOT rely on keyboard input for locomotion.

### Requirement 7: In-Session Sub-Mode Toggle

**User Story:** As a user, I want to switch between first- and third-person at any time with a controller button, so that I can choose how I move without leaving XR.

#### Acceptance Criteria

1. THE XR_System SHALL bind the controller A/X face button (the `a-button` on the right controller / `x-button` on the left controller) to request a Locomotion_Mode toggle during an XR_Session. THE XR_System SHALL NOT bind the toggle to the trigger, so that trigger-driven select (point-to-move and SNA click) is never conflated with a toggle.
2. WHEN the toggle control is activated, THE XR_System SHALL derive `canFirstPerson` as the logical negation of the active Character_Controller's No_First_Person setting and SHALL pass it to the toggle operation.
3. WHEN a toggle results in a changed Locomotion_Mode, THE XR_System SHALL reconfigure the active features to match the new mode (Teleport_Feature enabled for First_Person_Mode, point-to-move active for Third_Person_Mode).
4. WHEN a toggle toward First_Person_Mode is blocked because No_First_Person is true, THE XR_System SHALL remain in Third_Person_Mode and SHALL provide lightweight feedback to the user (for example a log, haptic pulse, or on-screen indication).
5. THE XR_System SHALL allow the toggle to be activated repeatedly within a single XR_Session.

### Requirement 8: SNA Click Interaction In XR

**User Story:** As a user, I want pointing and selecting with my controller to trigger the same object behaviors as a desktop click, so that interactive worlds work in XR.

#### Acceptance Criteria

1. WHILE an XR_Session is active, WHEN the user performs an XR_Select on a mesh that has an SNA_Click_Sensor, THE XR_System SHALL route the selection through the scene picking system so the mesh's `ActionManager` pick trigger fires.
2. WHEN an SNA_Click_Sensor's pick trigger fires from an XR_Select, THE SNA_Click_Sensor SHALL emit its signal exactly as it would for the equivalent desktop pointer click.
3. THE XR_System SHALL NOT allow the desktop modifier-key guards (alt/ctl/shift) to spuriously block XR_Select-driven SNA behavior, given that those modifiers are not asserted during an XR_Session.
4. WHERE an XR_Select occurs in Third_Person_Mode, THE XR_System SHALL still allow SNA_Click_Sensor behaviors to fire when the selected mesh carries one (interaction and locomotion pointing coexist).

### Requirement 9: Desktop State Preservation

**User Story:** As an editor, I want the desktop editor to be exactly as I left it after leaving XR, so that immersive preview never disrupts my editing workflow.

#### Acceptance Criteria

1. WHEN an XR_Session ends, THE XR_System SHALL restore the Editor_Camera as the active camera and SHALL restore desktop camera control.
2. WHEN an XR_Session ends, THE XR_System SHALL restore the Render_Pipeline (SSAO2/prepass) to its pre-session state.
3. WHEN an XR_Session ends, THE XR_System SHALL restore the Character_Controller and its keyboard-input configuration to a state consistent with desktop operation.
4. WHEN an XR_Session ends, THE XR_System SHALL detach or dispose any observers/listeners it added for the session so that repeated enter/exit cycles do not accumulate handlers.
5. WHILE entering, running, and exiting an XR_Session, THE XR_System SHALL NOT alter desktop editing capabilities (selection, transform, property editing) beyond the documented camera/pipeline/controller restoration.
