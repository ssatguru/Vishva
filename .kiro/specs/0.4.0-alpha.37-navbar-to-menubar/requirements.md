# Requirements Document

## Introduction

This feature converts the existing floating navbar (currently positioned absolutely over the 3D canvas) into a fixed menu bar that sits above the canvas. The menu bar will occupy a dedicated horizontal strip at the top of the viewport, and the canvas will be resized to fill the remaining space below it. This gives the editor a more traditional desktop-application feel with a persistent, always-visible menu bar.

## Glossary

- **Menu_Bar**: The horizontal bar rendered above the canvas containing editor action buttons, replacing the current floating navbar.
- **Canvas**: The HTML `<canvas>` element (`#vCanvas`) where the BabylonJS 3D scene is rendered.
- **GUI_Container**: The `#vGUI` div that hosts all editor UI elements (dialogs, overlays, the menu bar).
- **Editor**: The Vishva 3D scene editor application running in the browser.
- **Hamburger_Button**: The toggle button (`#showNavMenu`) that shows/hides the menu items.

## Requirements

### Requirement 1: Menu Bar Positioning

**User Story:** As an editor user, I want the menu bar to be fixed at the top of the viewport above the canvas, so that it behaves like a traditional application menu bar and does not overlap the 3D scene.

#### Acceptance Criteria

1. THE Menu_Bar SHALL render as a horizontal strip fixed to the top of the browser viewport, spanning the full viewport width and occupying a single row height determined by its content (no taller than 48px).
2. THE Menu_Bar SHALL use fixed positioning so that it remains at the top of the viewport regardless of any scrolling, and SHALL not overlap or obscure any part of the Canvas.
3. THE Canvas SHALL fill the full viewport width and the remaining viewport height below the Menu_Bar, with 0px gap between the bottom edge of the Menu_Bar and the top edge of the Canvas.
4. WHEN the browser window is resized, THE Editor SHALL adjust the Canvas dimensions within the same animation frame so that the Menu_Bar remains at the top and the Canvas fills the remaining viewport area below it without overlap or gap.

### Requirement 2: Menu Bar Appearance

**User Story:** As an editor user, I want the menu bar to look like a standard application menu bar, so that the editor feels professional and familiar.

#### Acceptance Criteria

1. THE Menu_Bar SHALL span the full width of the viewport (100%) and be positioned at the top edge of the editor area.
2. THE Menu_Bar SHALL display action buttons in a single horizontal row without wrapping to additional lines.
3. THE Menu_Bar SHALL use the theme's `lightColors.b` value as its bottom border color with a border width of 1px.
4. THE Menu_Bar SHALL have a fixed height between 36px and 48px, sufficient to contain a single row of icon buttons with padding.
5. THE Menu_Bar SHALL use the theme's `darkColors.b` value as its background color and `darkColors.f` as its foreground color.

### Requirement 3: Button Preservation

**User Story:** As an editor user, I want all existing navbar buttons to remain available in the menu bar, so that I do not lose any functionality.

#### Acceptance Criteria

1. THE Menu_Bar SHALL contain all 16 action buttons that currently exist in the navbar, identified by their IDs: worldLauncher, downWorld, saveWorld, uploadAsset, navWorldAssets, navAllAssets, navCAssets, navPrim, navEdit, navAV, navEnv, navAddSpawner, navSettings, debugLink, helpLink, pauseActuators.
2. THE Menu_Bar SHALL render the 16 action buttons in the following left-to-right order: worldLauncher, downWorld, saveWorld, uploadAsset, navWorldAssets, navAllAssets, navCAssets, navPrim, navEdit, navAV, navEnv, navAddSpawner, navSettings, debugLink, helpLink, pauseActuators.
3. THE Menu_Bar SHALL preserve the existing button IDs so that event handlers continue to function.
4. THE Menu_Bar SHALL preserve the existing button title attributes: "world launcher", "download world", "save world to browser", "load assets or world", "list items in world", "all files", "assets", "add primitives", "edit", "character controller", "environment", "add spawner", "settings", "inspector", "help", "pause actuators".
5. IF the navCAssets button is present, THEN THE Menu_Bar SHALL preserve the associated AddMenu container element (id="AddMenu") as a sibling of the navCAssets button within a shared parent element.

### Requirement 4: Hamburger Toggle Behavior

**User Story:** As an editor user, I want the hamburger button to still toggle the visibility of menu items, so that I can collapse the menu bar content when I want a cleaner view.

#### Acceptance Criteria

1. THE Hamburger_Button SHALL remain as the first element in the Menu_Bar.
2. WHEN the Menu_Bar is first rendered, THE Menu_Bar SHALL display all action buttons in a visible state.
3. WHEN the user clicks the Hamburger_Button while the action buttons are visible, THE Menu_Bar SHALL hide all action buttons.
4. WHEN the user clicks the Hamburger_Button while the action buttons are hidden, THE Menu_Bar SHALL show all action buttons.
5. WHILE the action buttons are hidden, THE Menu_Bar SHALL continue to display the Hamburger_Button and the Menu_Bar container.

### Requirement 5: Canvas Resize Handling

**User Story:** As an editor user, I want the 3D engine to correctly handle the new canvas dimensions, so that the scene renders without distortion.

#### Acceptance Criteria

1. WHEN the NavBar is rendered, THE Editor SHALL call engine.resize() so the BabylonJS engine updates its internal canvas width and height to match the current canvas element dimensions.
2. WHEN the browser window is resized, THE Editor SHALL call engine.resize() within the same animation frame so the scene viewport matches the new canvas element dimensions.
3. WHEN the canvas element dimensions change due to layout updates or window resize, THE Editor SHALL ensure the camera aspect ratio equals the canvas width divided by canvas height, so that the rendered scene appears without horizontal or vertical stretching.
4. IF engine.resize() is called but the canvas element dimensions have not changed, THEN THE Editor SHALL not produce visible rendering artifacts or errors.

### Requirement 6: Curated Assets Submenu

**User Story:** As an editor user, I want the curated assets dropdown to still appear correctly relative to its trigger button, so that I can browse asset categories without layout issues.

#### Acceptance Criteria

1. WHEN the user clicks the curated assets button, THE Menu_Bar SHALL display the submenu positioned directly below the trigger button with its left edge aligned to the trigger button's left edge.
2. THE submenu SHALL render fully visible within the browser viewport without being clipped by the Menu_Bar's overflow boundaries, by using absolute positioning that escapes the parent container's box.
3. WHEN the user clicks a category button within the submenu, THE Menu_Bar SHALL hide the submenu.
4. WHEN the user clicks the curated assets button while the submenu is visible, THE Menu_Bar SHALL hide the submenu.

### Requirement 7: Z-Index and Layering

**User Story:** As an editor user, I want the menu bar and its submenus to appear above all canvas content, and dialogs to render within the canvas area below the menu bar, so that the menu bar is always visible and accessible.

#### Acceptance Criteria

1. THE Menu_Bar SHALL render at a higher stacking order than the Canvas element so that menu buttons remain visible and clickable when positioned over the 3D viewport.
2. THE Menu_Bar submenus SHALL render at a stacking order equal to or higher than the Menu_Bar so that dropdown content is not obscured by the Canvas.
3. WHEN a dialog window is opened by the Editor, THE dialog SHALL render within the Canvas area below the Menu_Bar, constrained so that no part of the dialog extends above the top edge of the Canvas.
4. WHILE a dialog window is displayed, THE Menu_Bar SHALL remain fully visible and accessible above the dialog, without any dialog content overlapping or obscuring the Menu_Bar.
