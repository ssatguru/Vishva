# Requirements Document

## Introduction

When Vishva loads without a `?world=` query parameter and no `defaultWorld` config is set, the app currently falls back to loading an empty world. This feature replaces that fallback with a launcher/chooser UI — a landing page that presents the user with three options for loading a world: picking from server-hosted worlds, picking from browser-saved worlds (IndexedDB), or uploading a `.tar.gz` world file. Once a selection is made, the page reloads with the appropriate `?world=` parameter to load the chosen world through the standard initialization path.

## Glossary

- **Launcher**: The full-page UI overlay shown before Vishva is instantiated, presenting world-loading options to the user
- **Server_World**: A world file hosted in the `vishva/worlds/` directory on the server
- **Browser_World**: A world previously saved to the browser's IndexedDB database ("VishvaWorlds" database, "worlds" object store)
- **World_File**: A `.tar.gz` archive containing a valid Vishva world (with `Vishva.json` and `Scene.babylon`)
- **Index_Endpoint**: A server endpoint or static file that provides the list of available server worlds
- **Chooser_Panel**: A section within the Launcher UI representing one of the three loading options

## Requirements

### Requirement 1: Launcher Display Condition

**User Story:** As a user, I want the launcher to appear only when no world is specified, so that direct links to specific worlds still work without interruption.

#### Acceptance Criteria

1. WHEN the page loads with a `?world=` query parameter present, THE Launcher SHALL NOT be displayed and the world SHALL load through the existing initialization path
2. WHEN the page loads without a `?world=` query parameter AND the `defaultWorld` config variable is defined and non-empty, THE Launcher SHALL NOT be displayed and the default world SHALL load through the existing initialization path
3. WHEN the page loads without a `?world=` query parameter AND the `defaultWorld` config variable is undefined or empty, THE Launcher SHALL be displayed
4. WHILE the Launcher is displayed, THE application SHALL NOT instantiate the Vishva constructor

### Requirement 2: Launcher UI Layout

**User Story:** As a user, I want a clean landing page with clear options, so that I can quickly choose how to load a world.

#### Acceptance Criteria

1. THE Launcher SHALL display a full-page overlay covering the canvas area with a dark background
2. THE Launcher SHALL display a title identifying the application
3. THE Launcher SHALL present exactly three Chooser_Panels: "Load from Server", "Load from Browser Storage", and "Upload a File"
4. THE Launcher SHALL use W3.CSS classes for styling consistent with the existing editor UI
5. THE Launcher SHALL be responsive and usable on screens of varying width

### Requirement 3: Load from Server

**User Story:** As a user, I want to see available worlds on the server and pick one, so that I can quickly open a hosted world.

#### Acceptance Criteria

1. WHEN the user selects the "Load from Server" Chooser_Panel, THE Launcher SHALL fetch the list of available Server_Worlds from the Index_Endpoint
2. WHEN the list of Server_Worlds is successfully fetched, THE Launcher SHALL display each world name as a selectable item
3. WHEN the user selects a Server_World from the list, THE Launcher SHALL reload the page with `?world=<selected_world_name>` appended to the URL
4. IF the Index_Endpoint fetch fails, THEN THE Launcher SHALL display an error message indicating that the server world list could not be loaded
5. WHILE the Server_World list is being fetched, THE Launcher SHALL display a loading indicator within the panel

### Requirement 4: Load from Browser Storage

**User Story:** As a user, I want to see worlds I previously saved in the browser and pick one, so that I can resume work on a local world.

#### Acceptance Criteria

1. WHEN the user selects the "Load from Browser Storage" Chooser_Panel, THE Launcher SHALL query the IndexedDB "VishvaWorlds" database "worlds" object store for all saved entries
2. WHEN saved Browser_Worlds are found, THE Launcher SHALL display each world name as a selectable item
3. WHEN the user selects a Browser_World from the list, THE Launcher SHALL reload the page with `?world=<selected_world_name>` appended to the URL
4. IF no Browser_Worlds are found in IndexedDB, THEN THE Launcher SHALL display a message indicating that no saved worlds exist
5. IF IndexedDB access fails, THEN THE Launcher SHALL display an error message indicating that browser storage is unavailable

### Requirement 5: Upload a File

**User Story:** As a user, I want to upload a `.tar.gz` world file from my computer, so that I can load worlds shared with me or backed up locally.

#### Acceptance Criteria

1. WHEN the user selects the "Upload a File" Chooser_Panel, THE Launcher SHALL present a file input accepting `.tar.gz` files
2. WHEN the user selects a valid World_File through the file input, THE Launcher SHALL store the file data in IndexedDB under the `__uploaded` key and reload the page with `?world=__uploaded`
3. THE Launcher SHALL reuse the existing page-reload upload mechanism from the `world-load-page-reload` feature for file validation and storage
4. IF the selected file fails validation, THEN THE Launcher SHALL display an error message describing the validation failure without reloading the page

### Requirement 6: Launcher Cleanup

**User Story:** As a user, I want the launcher to disappear cleanly once I make a choice, so that the world loading experience is seamless.

#### Acceptance Criteria

1. WHEN the user makes a selection that triggers a page reload, THE Launcher SHALL remain visible until the page navigates away
2. WHEN the page reloads with a `?world=` parameter set, THE Launcher SHALL NOT appear (per Requirement 1) and the world SHALL load normally
3. THE Launcher DOM elements SHALL be created dynamically by JavaScript and SHALL NOT be present in the static `index.html` file

### Requirement 7: Empty World Fallback

**User Story:** As a user, I want an option to start with an empty world from the launcher, so that I can begin creating from scratch without uploading or selecting anything.

#### Acceptance Criteria

1. THE Launcher SHALL include a visible option to load an empty world
2. WHEN the user selects the empty world option, THE Launcher SHALL reload the page with `?world=empty` appended to the URL
