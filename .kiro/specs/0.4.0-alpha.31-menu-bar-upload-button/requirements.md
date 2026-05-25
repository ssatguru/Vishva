# Requirements Document

## Introduction

Some browser extensions (e.g., security or privacy extensions) block drag-and-drop of files into the browser window. This prevents users from loading 3D assets into the Vishva scene editor. To overcome this limitation, an "Upload" button will be added to the main navigation menu bar, providing an alternative file/folder upload mechanism that uses the standard HTML file input API instead of drag-and-drop events.

## Glossary

- **Upload_Button**: A button in the main navigation menu bar that triggers a file/folder selection dialog for importing 3D assets into the scene.
- **File_Picker**: The native browser file selection dialog opened by an HTML `<input type="file">` element.
- **NavBar**: The main navigation menu bar rendered by `NavBarML.ts`, containing all top-level editor actions.
- **LoadManager**: The manager responsible for loading assets into the BabylonJS scene, including mesh import and dependency resolution.
- **Supported_Format**: A 3D model file format that Vishva can import — specifically `.gltf`, `.glb`, `.obj`, `.babylon`, and `.stl`.

## Requirements

### Requirement 1: Upload Button Presence in Navigation Bar

**User Story:** As a user whose browser extensions block drag-and-drop, I want an upload button in the main menu bar, so that I can load 3D assets into the scene without relying on drag-and-drop.

#### Acceptance Criteria

1. THE NavBar SHALL contain an Upload_Button with a recognizable upload icon and a tooltip indicating its purpose.
2. THE Upload_Button SHALL be visible whenever the navigation menu bar is displayed.
3. THE Upload_Button SHALL follow the same styling conventions (VButton, Material Icons) as other buttons in the NavBar.

### Requirement 2: Single File Upload

**User Story:** As a user, I want to select one or more 3D model files from my file system via the Upload_Button, so that I can import them into the current scene.

#### Acceptance Criteria

1. WHEN the user clicks the Upload_Button, THE File_Picker SHALL open allowing selection of one or more files.
2. WHEN the user selects one or more files and confirms the File_Picker, THE LoadManager SHALL process each selected file with a Supported_Format and load it into the scene.
3. WHEN the user selects files that do not match any Supported_Format, THE LoadManager SHALL display an error message listing the supported formats.
4. WHEN the user cancels the File_Picker without selecting files, THE system SHALL take no action and return to the normal editor state.

### Requirement 3: Folder Upload

**User Story:** As a user, I want to upload an entire folder containing a 3D model and its dependencies (textures, materials), so that multi-file assets load correctly.

#### Acceptance Criteria

1. THE File_Picker SHALL support folder selection via the `webkitdirectory` attribute or equivalent browser capability.
2. WHEN the user selects a folder, THE LoadManager SHALL scan all files in the folder, identify model files with a Supported_Format, and build a dependency map from the remaining files.
3. WHEN a folder contains model files that reference texture or material files, THE LoadManager SHALL resolve those dependencies from the uploaded folder contents.
4. IF the selected folder contains no files with a Supported_Format, THEN THE system SHALL display an error message indicating no supported model files were found.

### Requirement 4: Consistent Loading Behavior

**User Story:** As a user, I want uploaded files to behave identically to drag-and-dropped files, so that the upload button is a true alternative to drag-and-drop.

#### Acceptance Criteria

1. THE LoadManager SHALL process files uploaded via the Upload_Button using the same loading pipeline as files received via drag-and-drop.
2. WHEN a model is loaded via the Upload_Button, THE LoadManager SHALL position the loaded asset in front of the avatar, consistent with drag-and-drop behavior.
3. WHEN a model is loaded via the Upload_Button, THE LoadManager SHALL fire the world-items-changed event so that the item list updates.

### Requirement 5: User Feedback During Upload

**User Story:** As a user, I want to see feedback when my files are being loaded, so that I know the upload is in progress.

#### Acceptance Criteria

1. WHILE files are being loaded via the Upload_Button, THE system SHALL indicate loading activity (e.g., console logging of file processing consistent with existing drag-and-drop behavior).
2. IF an error occurs during file loading, THEN THE system SHALL display an error message describing the failure.
