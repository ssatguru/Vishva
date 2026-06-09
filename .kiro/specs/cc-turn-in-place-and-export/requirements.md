# Requirements Document

## Introduction

This feature extends the Character Controller (CC) dialog UI with three additions: a "turnInPlace" toggle field in the Settings form, an "Apply" button that applies CC configuration without closing the dialog, and an "Export" button that downloads the full CC configuration (settings and action map) as a JSON file. The export follows the existing MeshCCSerialized class pattern from VishvaSerialized.ts, serializing AnimationGroup references as name strings and the Sound reference as just the sound filename string.

## Glossary

- **CC_Dialog**: The Character Controller settings dialog, managed by CCUI.ts, containing a Settings tab and a Mappings tab
- **Settings_Form**: The HTML form within the Settings tab (CCML.ts settingFormHtml) that uses a 2-column grid layout with label/input pairs
- **CharacterController**: The babylonjs-charactercontroller CharacterController instance that manages avatar movement, rotation, and animation
- **CCSettings**: The settings object returned by CharacterController.getSettings(), containing all CC configuration properties including turnInPlace
- **ActionMap**: The action-to-animation mapping object returned by CharacterController.getActionMap(), defining speeds, animation names, rates, and loop flags for each action
- **MeshCCSerialized**: The existing serialization class in VishvaSerialized.ts that captures meshId, CCSettings, and ActionMap with AG-to-name string conversion and sound serialization
- **Export_File**: A JSON file downloaded to the user's browser containing both CCSettings and ActionMap data, following the MeshCCSerialized serialization pattern

## Requirements

### Requirement 1: Turn In Place Toggle Field

**User Story:** As a world creator, I want a toggle for the "turnInPlace" property in the CC settings form, so that I can enable or disable turn-in-place behavior for the avatar.

#### Acceptance Criteria

1. THE Settings_Form SHALL display a checkbox input named "turnInPlace" with the label "turn in place" positioned immediately below the "turning speed" field in the 2-column grid layout.
2. WHEN the CC_Dialog opens, THE Settings_Form SHALL display the turnInPlace checkbox checked state matching the current value of CharacterController.isTurnInPlace().
3. WHEN the user saves or applies settings, THE CC_Dialog SHALL call CharacterController.setTurnInPlace() with the boolean value of the turnInPlace checkbox.

### Requirement 2: Apply Button

**User Story:** As a world creator, I want an Apply button that saves my CC settings without closing the dialog, so that I can test changes while keeping the dialog open for further adjustments.

#### Acceptance Criteria

1. THE CC_Dialog SHALL display an "Apply" button positioned before the "Save" button in the button row.
2. WHEN the user clicks the "Apply" button, THE CC_Dialog SHALL save both the Settings tab values and the Mappings tab values to the CharacterController (equivalent to the existing _saveCC operation).
3. WHEN the user clicks the "Apply" button, THE CC_Dialog SHALL remain open and visible after applying the settings.
4. WHEN the user clicks the "Apply" button, THE CC_Dialog SHALL update the UI to reflect the newly applied state (re-read from CharacterController).

### Requirement 3: Export Button

**User Story:** As a world creator, I want an Export button that downloads my CC configuration as a JSON file, so that I can back up or share character controller settings independently of the full world save.

#### Acceptance Criteria

1. THE CC_Dialog SHALL display an "Export" button positioned after the "Save" button and before the "Cancel" button in the button row.
2. WHEN the user clicks the "Export" button, THE CC_Dialog SHALL serialize the current CharacterController configuration following the MeshCCSerialized class pattern: capturing CCSettings from getSettings() and ActionMap from getActionMap().
3. WHEN the user clicks the "Export" button, THE CC_Dialog SHALL trigger a browser file download with the filename "cc-settings.json".
4. THE Export_File SHALL contain a JSON object with two top-level keys: "settings" holding the CCSettings data, and "actionMap" holding the ActionMap data.
5. WHEN the ActionMap contains AnimationGroup references, THE CC_Dialog SHALL replace those AnimationGroup instances with their .name string property in the exported JSON (consistent with the MeshCCSerialized AG serialization pattern).
6. WHEN the CCSettings contains a Sound reference, THE CC_Dialog SHALL serialize the sound as just the sound filename string (the Sound object's .name property), not a full serialized Sound object.

### Requirement 4: Button Order

**User Story:** As a world creator, I want the dialog buttons arranged in a consistent order, so that the interface is predictable and easy to use.

#### Acceptance Criteria

1. THE CC_Dialog SHALL display buttons in the following left-to-right order: "Apply", "Save", "Export", "Cancel".
2. THE CC_Dialog SHALL apply uniform margin styling to all four buttons consistent with the existing button styling (1em margin).
