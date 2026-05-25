# Requirements Document

## Introduction

When the user clicks the "save world to browser" button in the navbar, the system currently saves the world immediately using the current `Vishva.worldName` value (defaulting to "empty" when no name is set). This feature updates that behavior to prompt the user for a world name before saving, pre-filling the current name and automatically appending the `.tar.gz` extension if the user omits it.

## Glossary

- **Save_Prompt**: A modal dialog that appears when the user initiates a save-to-browser action, allowing them to confirm or change the world name before saving.
- **World_Name**: The string identifier used as the key when storing the world archive in browser IndexedDB. It may or may not include the `.tar.gz` extension.
- **Save_Button**: The navbar button with id `saveWorld` that triggers saving the world to browser storage (IndexedDB).
- **Name_Input**: The text input field within the Save_Prompt where the user can view and edit the world name.
- **Extension_Normalizer**: The logic responsible for ensuring the final world name ends with `.tar.gz`.

## Requirements

### Requirement 1: Display Save Prompt on Button Click

**User Story:** As a user, I want to be prompted for a world name when I click the save-to-browser button, so that I can choose a meaningful name before saving.

#### Acceptance Criteria

1. WHEN the Save_Button is clicked, THE Save_Prompt SHALL be displayed to the user.
2. WHEN the Save_Prompt is displayed, THE Name_Input SHALL be pre-filled with the current World_Name value.
3. IF the current World_Name is empty or undefined, THEN THE Name_Input SHALL be pre-filled with the value "empty".

### Requirement 2: Allow User to Modify World Name

**User Story:** As a user, I want to edit the world name in the prompt, so that I can rename my world before saving.

#### Acceptance Criteria

1. WHILE the Save_Prompt is displayed, THE Name_Input SHALL be editable by the user.
2. WHEN the user confirms the Save_Prompt, THE system SHALL use the value from the Name_Input as the World_Name for saving.

### Requirement 3: Automatic Extension Normalization

**User Story:** As a user, I want the `.tar.gz` extension to be appended automatically if I forget it, so that my saved worlds always have a consistent file format suffix.

#### Acceptance Criteria

1. WHEN the user confirms the Save_Prompt with a World_Name that does not end with ".tar.gz", THE Extension_Normalizer SHALL append ".tar.gz" to the World_Name before saving.
2. WHEN the user confirms the Save_Prompt with a World_Name that already ends with ".tar.gz", THE Extension_Normalizer SHALL use the World_Name as-is without appending a duplicate extension.
3. WHEN the user confirms the Save_Prompt with a World_Name that ends with ".TAR.GZ" or any mixed-case variant, THE Extension_Normalizer SHALL treat it as already having the extension (case-insensitive check).

### Requirement 4: Cancel Save Operation

**User Story:** As a user, I want to cancel the save prompt, so that I can abort saving if I change my mind.

#### Acceptance Criteria

1. WHEN the user cancels or dismisses the Save_Prompt, THE system SHALL not save the world to browser storage.
2. WHEN the user cancels or dismisses the Save_Prompt, THE system SHALL not modify the current World_Name.

### Requirement 5: Update Stored World Name After Save

**User Story:** As a user, I want the application to remember the name I chose, so that subsequent saves default to my last-used name.

#### Acceptance Criteria

1. WHEN the world is successfully saved with a confirmed World_Name, THE system SHALL update the application's current World_Name to the confirmed value (with extension normalization applied).

### Requirement 6: Validate World Name Input

**User Story:** As a user, I want to be prevented from saving with an empty name, so that all saved worlds have a meaningful identifier.

#### Acceptance Criteria

1. IF the user confirms the Save_Prompt with an empty or whitespace-only Name_Input value, THEN THE system SHALL not proceed with saving.
2. IF the user confirms the Save_Prompt with an empty or whitespace-only Name_Input value, THEN THE Save_Prompt SHALL remain open for the user to provide a valid name.
