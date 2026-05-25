# Requirements Document

## Introduction

This feature adds the ability to load a Vishva world file (.tar.gz archive) directly from the user's local machine, either via an upload button in the navigation bar or by dragging and dropping the file onto the 3D scene canvas. Currently, worlds are loaded exclusively via a `world` query parameter in the URL. This feature provides a more interactive and user-friendly way to open world files without requiring server-side hosting.

## Glossary

- **World_File**: A `.tar.gz` compressed TAR archive containing `Vishva.json`, `Scene.babylon`, and an `assets/` directory with all referenced textures and models.
- **Upload_Button**: A button in the navigation bar that opens a file picker dialog for selecting a world file from the local filesystem.
- **Scene_Canvas**: The HTML canvas element where the BabylonJS 3D scene is rendered, identified as `vCanvas`.
- **Load_Manager**: The subsystem responsible for loading worlds and assets into the scene (`LoadManager.ts`).
- **Nav_Bar**: The navigation toolbar at the top-left of the editor containing action buttons.
- **File_Validator**: The logic that determines whether a given file is a valid world file based on its filename extension.
- **Progress_Indicator**: The existing progress overlay that shows loading status to the user.

## Requirements

### Requirement 1: Upload World via Existing Upload Button

**User Story:** As a user, I want the existing upload button in the navigation bar to also accept world files, so that I can load a world file from my local filesystem using the same button I already use for assets.

#### Acceptance Criteria

1. THE existing Upload_Button in the Nav_Bar SHALL have its tooltip updated to indicate "load assets or world" functionality.
2. WHEN a file is selected via the Upload_Button file picker, THE File_Validator SHALL check whether the filename ends with `.tar.gz`.
3. WHEN a file ending with `.tar.gz` is selected, THE Load_Manager SHALL load the file as a world file and replace the current scene with the world contents.
4. WHEN a file not ending with `.tar.gz` is selected, THE Upload_Button SHALL process the file using the existing asset upload behavior.

### Requirement 2: Drag and Drop World File onto Scene

**User Story:** As a user, I want to drag and drop a world file onto the 3D scene canvas, so that I can quickly load a world without navigating through menus.

#### Acceptance Criteria

1. THE Scene_Canvas SHALL accept drag-and-drop events for files ending with `.tar.gz`.
2. WHEN a file ending with `.tar.gz` is dropped onto the Scene_Canvas, THE Load_Manager SHALL load the world file and replace the current scene with the world contents.
3. WHILE a `.tar.gz` file is being dragged over the Scene_Canvas, THE Scene_Canvas SHALL provide a visual indication that a drop is accepted.
4. WHEN a file not ending with `.tar.gz` is dropped onto the Scene_Canvas, THE Load_Manager SHALL treat the file as a regular asset and process it using the existing asset drop behavior.

### Requirement 3: World File Validation

**User Story:** As a user, I want the system to validate world files before loading, so that I receive clear feedback when a file cannot be loaded.

#### Acceptance Criteria

1. THE File_Validator SHALL identify a file as a world file when its filename ends with `.tar.gz`.
2. WHEN a world file is loaded, THE Load_Manager SHALL verify that the archive contains a `Vishva.json` entry.
3. WHEN a world file is loaded, THE Load_Manager SHALL verify that the archive contains a `Scene.babylon` entry.
4. IF a `.tar.gz` file does not contain `Vishva.json`, THEN THE Load_Manager SHALL display an error message indicating the archive is not a valid Vishva world file.
5. IF a `.tar.gz` file does not contain `Scene.babylon`, THEN THE Load_Manager SHALL display an error message indicating the archive is not a valid Vishva world file.
6. IF decompression of the `.tar.gz` file fails, THEN THE Load_Manager SHALL display an error message indicating the file is corrupted or not a valid gzip archive.

### Requirement 4: World Loading from Local File

**User Story:** As a user, I want the loaded world to fully replace the current scene, so that I can work with the uploaded world as if it were loaded from the server.

#### Acceptance Criteria

1. WHEN a valid world file is loaded from a local file, THE Load_Manager SHALL decompress the gzip data into a TAR archive.
2. WHEN a valid world file is loaded from a local file, THE Load_Manager SHALL extract `Vishva.json`, `Scene.babylon`, and all files in the `assets/` directory from the TAR archive.
3. WHEN a valid world file is loaded from a local file, THE Load_Manager SHALL activate the Asset_Resolver with the extracted asset map so that bundled textures and models are resolved from memory.
4. WHEN a valid world file is loaded from a local file, THE Load_Manager SHALL replace the current scene with the loaded scene data.
5. WHILE a world file is being loaded, THE Progress_Indicator SHALL display the current loading stage and progress percentage.

### Requirement 5: File Extension Detection

**User Story:** As a developer, I want a reliable utility to detect `.tar.gz` file extensions, so that the system consistently identifies world files across upload and drag-and-drop paths.

#### Acceptance Criteria

1. THE File_Validator SHALL identify filenames ending with `.tar.gz` as world files regardless of character case (e.g., `.TAR.GZ`, `.Tar.Gz`).
2. THE File_Validator SHALL not identify filenames ending with only `.gz` (without `.tar`) as world files.
3. THE File_Validator SHALL not identify filenames ending with only `.tar` (without `.gz`) as world files.
4. FOR ALL filenames, detecting then formatting the extension SHALL produce a consistent lowercase result (round-trip property).
