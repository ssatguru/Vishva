# Requirements Document

## Introduction

This feature enhances the Vishva World Launcher with three improvements: a navbar icon for quick access to the World Launcher without manual URL navigation, a delete action for saved worlds listed in the "Load from Browser Storage" panel, and an export-as-tar.gz action for saved worlds so users can download portable archives of their browser-stored worlds.

## Glossary

- **World_Launcher**: The full-page overlay UI (`WorldLauncher.ts`) that presents world-loading options when no world is specified
- **NavBar**: The toolbar at the top-left of the editor containing icon buttons for various actions (`NavBarML.ts`)
- **Saved_World**: A world persisted in the IndexedDB `VishvaAssetStore` database under the "saved" object store, keyed by `{worldName}/{assetPath}`
- **Asset_Store**: The `AssetStore` class providing IndexedDB operations for the `VishvaAssetStore` database
- **Browser_Storage_Panel**: The content area shown when the user clicks "Load from Browser Storage" in the World Launcher
- **Tar_Archive**: A tar.gz file containing all world assets (Vishva.json, Scene.babylon, and referenced assets) created using `TarUtils.createTarArchive` and gzip compression

## Requirements

### Requirement 1: Navbar World Launcher Icon

**User Story:** As a user editing a world, I want a navbar icon that takes me to the World Launcher, so that I can switch worlds without manually editing the URL.

#### Acceptance Criteria

1. THE NavBar SHALL include a button with a Material Icons icon (e.g., "public" or "rocket_launch") and the title attribute set to "world launcher"
2. THE NavBar SHALL place the World Launcher button as the first button inside the `navMenubar` container, before the download world button
3. WHEN the user clicks the World Launcher navbar button, THE NavBar SHALL navigate the browser to the current pathname with all query parameters removed, causing a full page reload that displays the World Launcher
4. IF the user has unsaved changes when clicking the World Launcher button, THEN THE NavBar SHALL present a browser confirmation prompt before navigating away

### Requirement 2: Delete Saved World

**User Story:** As a user managing my saved worlds, I want to delete a world from browser storage, so that I can free up space and remove worlds I no longer need.

#### Acceptance Criteria

1. WHEN the Browser_Storage_Panel displays the list of saved worlds, THE World_Launcher SHALL show a delete button within each world entry row that does not trigger world loading when clicked
2. WHEN the user clicks the delete button for a saved world, THE World_Launcher SHALL display a confirmation prompt that includes the world name and asks the user to confirm deletion
3. WHEN the user confirms deletion, THE World_Launcher SHALL remove all assets for that world from the Asset_Store "saved" object store using `AssetStore.deleteSavedWorld`
4. WHEN deletion completes successfully, THE World_Launcher SHALL remove the deleted world entry from the displayed list without requiring a full panel reload
5. IF deletion fails, THEN THE World_Launcher SHALL display an error message inline in the Browser_Storage_Panel indicating the failure reason, and SHALL leave the world entry in the list unchanged
6. WHEN the user cancels the confirmation prompt, THE World_Launcher SHALL leave the world entry unchanged and take no further action
7. WHEN deletion completes successfully and no saved worlds remain, THE World_Launcher SHALL display an empty state message indicating no saved worlds are available

### Requirement 3: Export Saved World as Tar.gz

**User Story:** As a user, I want to export a saved world from browser storage as a tar.gz file, so that I can back up my work or share it with others.

#### Acceptance Criteria

1. WHEN the Browser_Storage_Panel displays the list of saved worlds, THE World_Launcher SHALL show an export button alongside each world entry
2. WHEN the user clicks the export button for a saved world, THE World_Launcher SHALL retrieve all assets for that world from the Asset_Store "saved" object store using the world name as scope
3. WHEN assets are retrieved, THE World_Launcher SHALL create a tar archive containing all world assets using `TarUtils.createTarArchive`, with each asset's stored key (the path portion after the world name prefix) as its filename in the archive
4. WHEN the tar archive is created, THE World_Launcher SHALL compress the archive using gzip via the Compression Streams API
5. WHEN compression completes, THE World_Launcher SHALL trigger a browser file download with the filename `{worldName}.tar.gz`
6. IF the export process fails at any step, THEN THE World_Launcher SHALL display an error message indicating which operation failed (asset retrieval, archive creation, or compression), and re-enable the export button
7. WHILE the export is in progress, THE World_Launcher SHALL disable the export button for that world entry to prevent duplicate exports
8. WHEN the export completes successfully, THE World_Launcher SHALL re-enable the export button for that world entry
