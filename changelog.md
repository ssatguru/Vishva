### 05/22/2026 0.4.0-alpha.39

#### World Launcher opens as overlay instead of navigating away
- clicking the "World Launcher" navbar button no longer closes the current scene
- the launcher now opens as a modal overlay on top of the running world
- added a close button (×) in the top-right corner to dismiss the launcher and continue in the current world
- unsaved-changes confirmation only triggers when the user actually selects a world to load, not when opening the launcher
- initial launcher (no world specified on page load) remains unchanged — no close button since there's no scene behind it

#### Dynamic Theme Switching (CSS Custom Properties)
- migrated the entire UI theming system from hardcoded inline color values to CSS custom properties (`--v-light-fg`, `--v-light-bg`, `--v-color-fg`, `--v-color-bg`, `--v-dark-fg`, `--v-dark-bg`)
- themes now switch instantly at runtime — no page reload or rebuild required
- added `VThemes.applyTheme()`, `VThemes.applyPreset()`, `VThemes.restoreTheme()` API
- added 11 theme presets: Eggplant (dark/normal/light), Grey (dark/normal), Black (dark), Dark Grey (dark/normal), Brown (dark/normal/light)
- active theme persisted in `localStorage` and restored on page load
- added theme picker dropdown in Settings dialog (live preview on selection)
- updated all themed components to use `var(--v-*)` references: VButton, VDiag, VTab, NavBarML, SnaUI, WorldLauncher, PropsPanelUI
- removed direct `Vishva.theme.*` and `VThemes.CurrentTheme.*` color reads from UI components
- updated NavBarML tests to assert CSS variable strings instead of resolved color values

### 05/21/2026 0.4.0-alpha.38

#### New Sensor: Keyboard
- added `SensorKeyboard` — detects keyboard key presses/releases and emits a signal
- uses window-level keyboard listeners (not BabylonJS ActionManager) for reliable key detection regardless of canvas focus
- configurable key from 62 options: A–Z, 0–9, F1–F12, arrow keys, Space, Enter, Escape, Tab, Backspace, Delete, Home, End, PageUp, PageDown
- modifier key support: ctrl, alt, shift (exact match required — all three must match)
- event type selection: onKeyDown, onKeyUp (both can be enabled simultaneously)
- optional `onlyOnPointerOver` gating — signal only emits when pointer is hovering over the mesh (uses ActionManager pointer-over/out tracking)
- guard conditions: filters key repeats, respects `keysDisabled` flag (edit mode), skips when focus is on text inputs/textareas/selects/contentEditable elements
- registered as "Keyboard" sensor in SNAManager

#### Sensor Contact renamed to Sensor AvContact 


#### New Sensor: Contact → Mesh-to-Mesh
- `SensorContact` now uses `MeshPickerType` for target mesh selection — user picks any mesh in the scene via a modal ItemListUI dialog
- resolves target mesh by `uniqueId` at runtime
- no longer hardcoded to avatar — works with any mesh pair
- backward compatibility: old serialized "Contact" sensors (without `targetMesh` property) automatically deserialize as "AvContact"

#### MeshPickerType — New SNA Property Type
- added `MeshPickerType` class to `VishvaGUI.ts` — stores mesh `uniqueId` (value) and display name (meshName)
- SnaUI generates a "Choose Mesh" button that opens ItemListUI in modal mode with an optional filter function
- `ItemListUI` now accepts a filter callback; non-matching nodes are shown with parenthesized labels (greyed out, non-clickable)
- `VTree` parenthesized label behavior: leaf nodes wrapped in `(...)` get `opacity:0.5` and `pointer-events:none`; folder labels can also be parenthesized (greyed text, expand/collapse still works)
- `SNA.ts` `unMarshalProps` updated to reconstruct `MeshPickerType` instances during deserialization

#### Tests
- added `SensorKeyboard.test.ts` — unit tests for defaults, registration, listener setup, pointer-over actions, guard conditions
- added `SensorKeyboard.property.test.ts` — property tests for exact key/modifier match, guard conditions, trigger registration, pointer-over gating
- added `SNA.property.test.ts` — property tests for MeshPickerType serialization round-trip and backward-compat name resolution (Contact → AvContact)
- added `VTree.property.test.ts` — property tests for parenthesized label styling and click behavior
- added `ItemListUI.property.test.ts` — property tests for filter label wrapping logic

### 05/20/2026 0.4.0-alpha.37

#### Navbar to Menu Bar
- converted the floating navbar (absolutely-positioned over the canvas) into a fixed menu bar at the top of the viewport
- menu bar uses `position:fixed; top:0; width:100%; height:48px` with theme colors (`darkColors.b` background, `darkColors.f` foreground, `lightColors.b` bottom border)
- menu bar is prepended to `<body>` as the first child (before `#vGUI` and `#vCanvas`)
- `#vGUI` and `#vCanvas` offset by 48px from top (`top:48px; height:calc(100% - 48px)`) to make room for the menu bar
- VishvaGUI dynamically syncs canvas/GUI offset with actual `menuBar.offsetHeight` on resize (fallback to `UIConst.MENU_BAR_HEIGHT = 48`)
- all 16 action buttons preserved in order with their IDs and title attributes
- hamburger button toggles `#navMenubar` between `display:inline-flex` and `display:none`
- curated assets submenu (`#AddMenu`) uses `position:absolute; top:100%; left:0; z-index:1000` relative to its wrapper
- added `gap:0.25em` between nav buttons and `margin-right:0.5em` after the hamburger button
- removed `VDiag.leftTop1` position (no longer needed — menu bar is outside `#vGUI`)
- `VDiag.leftTop2` now uses `top:0px` instead of `UIConst._buttonHeight`

#### Dialog Positioning Fixes
- fixed VDiag `_moveIt` clamping: changed from `Vishva.gui.offsetTop` / `Vishva.gui.offsetLeft` to `0` — dialogs are children of `#vGUI` so their coordinates are relative to it, not the viewport
- added `ResizeObserver` on each VDiag window element to re-clamp position when content grows (e.g., expanding a `<details>` section near the bottom of the canvas pushes the dialog upward instead of spilling below)

#### Tests
- added `NavBarML.test.ts` — 13 unit tests for DOM structure, button order, theme colors, hamburger toggle, z-index layering
- added `NavBarML.property.test.ts` — property-based test verifying dialog clamping invariant (top >= 0 for all random positions)

### 05/20/2026 0.4.0-alpha.36

#### Bone Selector Tree Dialog & Bone Attachment
- replaced the old "show all bone markers" behavior with a VTreeDialog-based bone selector
- clicking "show bone selector" opens a tree dialog showing the skeleton's bone hierarchy (fully expanded) and automatically shows the skeleton viewer
- clicking a bone in the tree places a single green sphere marker at that bone's position (renders on top via `renderingGroupId=1`)
- clicking a different bone moves the marker; clicking the same bone is a no-op
- closing the dialog disposes the marker and hides the skeleton viewer (if it was shown by the bone selector)
- mesh selection is locked (`switchDisabled`) while the bone selector dialog is open — prevents accidental deselection
- escape key respects `switchDisabled` — blocked while bone selector is open
- removed the "hide bone selector" button (no longer needed — dialog close handles cleanup)
- added `VTreeDialog.onClose()` method for registering cleanup callbacks
- "attach item to bone" now uses the selected bone from the dialog — user only needs to CTL-click one mesh (the item to attach)
- skeleton viewer is automatically disposed when a mesh is deselected (via escape key or `removeEditControl`)

#### Bone Attachment Serialization
- bone attachments now persist across save/load via `VishvaSerialized.boneAttachments[]`
- added `BoneAttachmentSerialized` class to `VishvaSerialized.ts` (stores attacher node ID, bone index, skeleton mesh ID)
- `Vishva.serializeBoneAttachments()` scans "attacher-" TransformNodes and matches parent node name to bone names (works after `resetSkels()` nulls transform node references)
- `Vishva._reattachBoneAttachments()` re-calls `attachToBone()` on load using the serialized data
- attacher TransformNodes get unique IDs (`attacher-{boneIndex}-{timestamp}`) to avoid collisions
- both JSON and archive save formats include bone attachment data

### 05/17/2026 0.4.0-alpha.35

#### Spawner System — Avatar/Camera Placement on Scene Load
- added `SpawnerManager` (`src/managers/spawner/`) — full lifecycle management for spawn points
- NavBar "add spawner" button (`my_location` icon) creates a flat arrow-shaped mesh at the avatar's feet pointing in the avatar's forward direction
- spawner stores avatar position, rotation, and camera params (alpha, beta, radius, target offset) relative to the spawner mesh — moving/rotating the mesh in the editor automatically adjusts the spawn location
- multiple spawners supported: uniform random selection at load time
- spawner meshes render on top of other geometry (`renderingGroupId=1`, `disableDepthWrite`) so they're never hidden
- spawner meshes are invisible/non-pickable by default; participate in the "reveal invisibles" system
- serialized via `VishvaSerialized.spawners[]` array; deserialized and applied in `sceneLoad4` after avatar and CharacterController initialization
- camera focus guard: spawner creation/update blocked when camera is not focused on avatar (shows alert dialog)
- clicking spawner button with another mesh selected uses `switchEditControl` to transfer selection
- clicking spawner button with a spawner selected updates that spawner's transforms in-place
- accounts for CharacterController `faceForward` setting when orienting the arrow mesh
- uses `rotation.y` (not `rotationQuaternion`) when applying spawn transforms to preserve CC rotation system
- legacy `spawnPointId` handling: ignored when spawners exist, used as fallback for old worlds without spawners
- removed legacy spawnPoint tag-based search from all SaveManager serialization paths
- added 17 unit tests (`SpawnerManager.test.ts`) covering mesh geometry, metadata, serialization, collection management, and legacy fallback

### 05/16/2026 0.4.0-alpha.34

#### JSON World Format Support (Legacy Format)
- World Launcher "Load from Server" now shows both `.tar.gz` and `.json` files with full filenames displayed
- added "Download World" format chooser dialog: "Archive (.tar.gz)" for full world with assets, "Scene only (.json)" for legacy format without assets
- added `SaveManager.saveWorldAsJson()` — serializes scene + VishvaSerialized as a single merged JSON (legacy format), no assets bundled
- added `SaveManager.saveWorldToIndexedDBAsJson()` — saves JSON-only world to browser IndexedDB under a single `__world.json` key
- Save to Browser prompt now offers two buttons: "Save (with assets)" and "Save (JSON only)"
- `SavePromptLogic.getDefaultWorldName()` now strips both `.tar.gz` and `.json` suffixes from the pre-filled name
- "Load from Browser Storage" panel now shows format indicator: `worldname (Scene with assets)` or `worldname (Scene without assets)`
- export from browser storage auto-detects format: JSON-only worlds export as `.json`, full worlds export as `.tar.gz`

#### JSON World File Upload & Drag-and-Drop
- "Upload File" button and drag-and-drop now accept `.json` world files (in addition to `.tar.gz`)
- added `FileValidator.isJsonWorldFile()` and `FileValidator.isWorldFile()` helpers
- added `LoadManager.loadWorldFromJsonFile()` — validates JSON has `VishvaSerialized` key, stores in IndexedDB, triggers page reload
- added `LoadManager.loadUploadedJsonWorld()` — retrieves stored JSON after reload, extracts VishvaSerialized, loads scene
- Vishva constructor routes `__uploaded_json` to the new JSON world loading path
- `LoadManager.loadSavedWorld()` detects JSON-only worlds (single `__world.json` entry) and loads without AssetResolver — assets resolve from server

### 05/15/2026 0.4.0-alpha.33

#### Asset Storage Overhaul — IndexedDB-native Save/Load
- browser save no longer creates an intermediate tar.gz blob — assets are stored individually in IndexedDB (`VishvaAssetStore` database, `saved` object store) keyed by `{worldName}/{assetPath}`
- loading a saved world reads assets directly from IndexedDB into the session store, eliminating decompression overhead
- AssetResolver now activates from the AssetStore (IndexedDB) instead of an in-memory Map — pre-loads session keys on activate for synchronous PreprocessUrl compatibility
- AssetResolver gains `resolveAssetPaths()` which deep-traverses VishvaSerialized to resolve `vishva/assets/` paths to blob URLs (handles sounds, dialog HTML, and other non-BabylonJS-pipeline assets)
- SaveManager browser-save path rewritten: collects assets, resolves from session store or fetches from server, and writes all entries in a single `saveWorldBatch` call
- legacy tar.gz fallback retained if AssetStore cannot be opened
- `_loadedAssetMap` (in-memory Map) replaced by `_assetStore` (IndexedDB reference) on Vishva instance — eliminates large in-memory asset retention

#### Structured Asset Paths (`vishva/assets/...`)
- all archive and IndexedDB asset paths now use a structured prefix: `vishva/assets/` instead of flat `assets/`
- embedded textures stored under `vishva/assets/data/`, blob textures under `vishva/assets/blob/`
- server-relative assets (skyboxes, curated content, sounds) collected via new `AssetCollector.collectServerAssets()` deep-scan and stored under their original `vishva/...` path
- PathRewriter updated to write the full structured path directly (no longer prepends `assets/`)
- backward compatibility: LoadManager remaps old `assets/` paths to `vishva/assets/` on import

#### World Launcher Enhancements
- added "World Launcher" globe button (`public` icon) to the navbar for quick access to the launcher from within a loaded world
- unsaved-changes guard: clicking the launcher button shows a confirmation dialog if the scene is dirty
- browser storage panel now reads saved worlds from `VishvaAssetStore` (via `AssetStore.listSavedWorlds()`) instead of the old `VishvaWorlds` database
- each saved world row now shows export (download) and delete (trash) action buttons alongside the world name
- delete action: confirmation prompt → `AssetStore.deleteSavedWorld()` → row removal → empty state if no worlds remain
- export action: reads all assets from the saved store → creates tar archive (with UStar long-path support) → gzip compresses → triggers browser download as `{worldName}.tar.gz`
- inline error display for failed delete/export operations

#### TarUtils — UStar Long Path Support
- `createTarArchive` now supports filenames up to 255 bytes using the UStar prefix field (bytes 345–499)
- `extractTarArchive` reads the prefix field and reconstructs full paths on extraction
- SaveManager's inline `_createTarArchive` removed in favor of the shared `TarUtils.createTarArchive`

#### Save Prompt & World Name Improvements
- `normalizeWorldName` no longer appends `.tar.gz` — browser-saved worlds are stored by plain name
- `getDefaultWorldName` strips `.tar.gz` suffix from server-loaded world names for cleaner display; defaults to "world" instead of "empty"
- `HREFsearch.getParm()` now URL-decodes parameter values (fixes `__saved:` names with special characters)

#### Saved World Loading via `?world=__saved:<name>`
- Vishva constructor recognizes `__saved:` prefix and routes to `LoadManager.loadSavedWorld()`
- `loadSavedWorld` reads from the `saved` store, copies assets into the `session` store, activates AssetResolver, and loads the scene — no decompression step

#### SNA Actuator Path Fixes
- ActuatorSound and ActuatorDialog no longer prepend `Vishva.vHome + "assets/"` — asset paths are now fully qualified (either server-relative or blob URLs resolved by AssetResolver)
- SnaUI asset tree selection now prepends `Vishva.vHome + "assets/"` at selection time so the stored path is correct for both server and archive contexts

#### Dirty State Tracking
- added `Vishva._dirty` flag, `isDirty()` and `setDirty()` methods
- scene marked dirty after SNA unmarshal completes (i.e., after world load finishes and user can edit)
- used by the World Launcher navbar button to warn about unsaved changes

#### Misc
- removed stray `console.log` in `addBox()`
- AssetCollector skips CubeTexture base paths (no file extension) from the external URL collection — only actual face images are collected via `collectServerAssets`

### 05/10/2026 0.4.0-alpha.32

#### World Launcher Chooser
- added a launcher/chooser UI that appears when no `?world=` query parameter is provided and no `defaultWorld` config is set
- launcher presents three world-loading options: "Load from Server", "Load from Browser Storage", and "Upload a File", plus an "Empty World" fallback button
- "Load from Server" fetches a static `vishva/worlds/index.json` file listing available `.tar.gz` worlds, displays them as clickable items
- "Load from Browser Storage" queries IndexedDB for previously saved worlds and displays them as clickable items
- "Upload a File" validates and stores a `.tar.gz` world file in IndexedDB, then reloads with `?world=__uploaded`
- every selection triggers a page reload with the appropriate `?world=` parameter, ensuring a clean WebGL context
- launcher is completely decoupled from Vishva — it runs before the 3D engine is instantiated
- added `WorldLauncherLogic.ts` with pure testable functions: `shouldShowLauncher`, `buildWorldQueryString`, `processServerWorldList`, `storeUploadedWorld`
- added `WorldLauncher.ts` UI class using W3.CSS styling consistent with the editor
- modified `index.ts` to show the launcher instead of loading an empty world when no world is specified
- created `vishva/worlds/index.json` static index of available server worlds
- added property-based tests for launcher display decision, server world list processing, and query string round-trip
- added unit tests for DOM structure, panel behaviors, and upload validation

#### World Load via Page Reload
- replaced in-place world loading from local files with a page-reload strategy to eliminate scene accumulation bugs caused by stale WebGL state
- upload and drag-and-drop of `.tar.gz` world files now stores the file in IndexedDB and reloads the page with `?world=__uploaded`
- on reload, Vishva constructor detects the `__uploaded` flag, retrieves the file from IndexedDB, and loads it through the standard initialization pipeline
- added lightweight pre-reload validation: decompresses gzip and checks tar headers for `Vishva.json` and `Scene.babylon` before storing
- added `LoadManager.validateWorldFile()` for archive validation and `LoadManager.loadWorldFromFile()` for the store-and-reload flow
- added `LoadManager.loadUploadedWorld()` for post-reload retrieval, decompression, extraction, and loading
- added IndexedDB helper methods (`_storeInIndexedDB`, `_getFromIndexedDB`, `_deleteFromIndexedDB`) for temporary upload storage
- added `FileValidator.ts` utility with `isTarGzFile()` and `normalizeTarGzExtension()` for reliable `.tar.gz` detection (case-insensitive)
- Vishva constructor now routes `__uploaded` to the dedicated uploaded-world loading path alongside existing `empty` and server-fetch paths
- cleanup guarantees: IndexedDB `__uploaded` entry is always deleted and URL is cleaned via `history.replaceState` after load attempt (success or failure)
- graceful fallback: if `?world=__uploaded` is visited without stored data, loads an empty world with a console warning
- drag-and-drop of non-`.tar.gz` asset files (GLB, glTF, OBJ, etc.) continues to append to the current scene unchanged
- progress feedback shown during both pre-reload validation/storage and post-reload decompression/loading phases
- added property-based tests for archive validation, scene file routing, tar round-trip, and file type classification
- added unit tests for the full upload-reload-load-cleanup flow

#### Save World Name prompt when saving to browser
- allows user to change the file name before saving

### 05/10/2026 0.4.0-alpha.31

#### Standalone World Archive
- world archives are now fully self-contained — all referenced assets (textures, meshes, particle textures, environment maps) are bundled into the archive under an `assets/` folder
- added AssetCollector (`src/managers/AssetCollector.ts`) — scans serialized scene JSON to discover all external asset URLs, resolves relative paths, decodes data URIs, deduplicates entries, and generates disambiguated archive filenames
- added PathRewriter (`src/managers/PathRewriter.ts`) — rewrites all asset URLs in the scene JSON from server-relative paths to archive-relative paths (`assets/<filename>`)
- added AssetResolver (`src/managers/AssetResolver.ts`) — intercepts BabylonJS file requests during load and serves matching assets from the extracted archive via Blob URLs, with cleanup after scene load
- added TarUtils (`src/managers/TarUtils.ts`) — tar archive creation/extraction utilities
- updated SaveManager to collect assets, rewrite paths, fetch asset binaries, and bundle them into the tar archive during save
- updated LoadManager to detect bundled assets in archives and activate AssetResolver for self-contained loading
- IndexedDB save/load also supports bundled assets
- legacy archives without `assets/` folder continue to load via existing server-fetch behavior (backward compatible)
- graceful degradation on asset fetch failure — save continues with a warning, skipping unfetchable assets
- added test framework: vitest + fast-check for property-based testing
- added property tests for asset collection completeness, URL resolution, data URI round-trip, deduplication, filename uniqueness, path rewriting completeness, TAR round-trip, asset resolver routing, and asset presence detection

#### Menu Bar Upload Button
- added "Upload" button to the navigation bar with `upload_file` Material Icon, providing an alternative to drag-and-drop for loading 3D assets
- upload button shows a dropdown menu with "Upload File(s)" and "Upload Folder" options
- file upload supports multiple file selection with format filtering (gltf, glb, obj, babylon, stl)
- folder upload uses `webkitdirectory` attribute for selecting entire folders with dependencies
- upload feeds files into the existing `processDroppedFiles` pipeline — identical behavior to drag-and-drop (format validation, dependency resolution, asset positioning, event firing)
- made `processDroppedFiles` public in LoadManager to support the upload integration
- added browser compatibility detection for `webkitdirectory` — folder option hidden if unsupported
- added property tests for file format classification partition and supported format identification

### 02/23/2026 0.4.0-alpha.30
- migrated Vishva meta information from Babylon.js Tags API to structured metadata in VishvaSerialized
- added ObjectIdMap and MeshMetadata classes to VishvaSerialized for tracking object IDs and mesh properties
- updated SaveManager to capture objectIds (avatar, skybox, ground, camera, sun, skeleton, spawnPoint) and meshMetadata (isPrimitive, isInternal, isInvisible, vishvaUid) during save
- updated LoadManager to restore metadata from VishvaSerialized during load
- refactored object finding throughout codebase to use ID-based lookups with tag fallback for backward compatibility
- updated all object creation methods (ground, skybox, camera, sun, avatar, primitives) to set objectIds and metadata
- improved performance with O(1) ID lookups instead of O(n) tag iterations
- maintained full backward compatibility with old world files through dual write strategy (metadata + tags)
- affected components: Vishva core, SaveManager, LoadManager, SNA system, AvManager, ground creation, skybox, camera, lighting
### 02/17/2026 0.4.0-alpha.29
- updated to compression stream api intead of jszip to compress and decompress world file. this is native api feature , so no externa library required. world is now stored as a tar gzip file.
- progress manager updated and refactored. Now the all statuses of task are displayed instead of just the last status. More refinement needed.
### 02/17/2026 0.4.0-alpha.28
- upgraded CharacterController 0.4.4-alpha.13 which no longer requires character rotation be in euler. removed code which converted rotation to euler.
### 02/16/2026 0.4.0-alpha.27
- added ability to save world to browser IndexedDB ("Save World to Browser" button)
- load now checks browser IndexedDB first and will load world from browser storage if available (falls back to server)
### 02/15/2026 0.4.0-alpha.26
- saveWorld now saves VishvaSerialized and Scene as separate files (Vishva.json and Scene.babylon) in a zip archive
- world files now have .zip extension
- loading supports both new .zip format and legacy single-file format for backward compatibility
- ActuatorRotator now supports both Quaternion and Euler rotation modes
- improved drag and drop to handle multiple files and dependencies (textures, MTL files, etc.)
- added progress bar during load and save
### 02/14/2026 0.4.0-alpha.25
- added drag and drop support for loading 3D assets directly from file system to canvas
- supported formats: GLTF, GLB, OBJ, Babylon, STL
- refactored code - now save world and load assets functionalites are in their own seperate files - SaveManager.ts and LoadManager.ts
### 02/01/2026 0.4.0-alpha.24
- added ability to add and remove character controller from any mesh
- character controllers attached to meshes are now serialized and deserialized when world is saved and loaded
- added cancel/close handling for character controller dialog - if new character controller is cancelled, it is properly cleaned up
- character controller is only started after save button is clicked in character controller dialog
- original ellipsoid value is restored when character controller is removed from mesh
### 01/30/2026 0.4.0-alpha.22
- updated tsconfig
- fixed charactercontroller animblending issue when empty world is loaded
- fxied issue with 0.4.0-alpha.21 version world failing during load. character controller ellipsoid values were not being serialized previously
### 01/30/2026 0.4.0-alpha.22
- added modal capability to dialog box
- Character Controller can now be added to any mesh. Previosuly it was just menat for the Avatar.
- upgraded to the current version of babylonjs 8.47.0
### 01/11/2026 0.4.0-alpha.21
- fixed Acuator TextBar serialization issue wherein disposed material was being serialized
- updated AvAnimator. added "restoreOnDisable" property. fixed vector3 deserialization
### 01/11/2026 0.4.0-alpha.20
- made some architectural changes to the SNA framework. Simplified its usage
### 01/08/2026 0.4.0-alpha.19
- added animation blend field in character controller UI.
- updated Animator and AvAnimator actutators to work with animation groups too. Previously it was just animation ranges.
- updated DialogActuator. Added "position" parameter to postion the dialog.
- fixed prim placement issue. if avatar was forward facing the prim was created at back of avatar
- fixed click to move avatar issue. if avatar was facing forward the avatar would not move. the system would think the distance to click point had increased rather than decreased.
### 01/01/2026 0.4.0-alpha.18
- improved curated asset property setting. scale,reusematerial and collision proeprties can be set or all curated assets, or a category of asset or a specific asset. previously it was just scale.
  setting collision 'on' for characters can create problem if character has mutiple meshes.
### 01/01/2026 0.4.0-alpha.17
- fixed minor focus issues when focus is on dialog and mouse moves to canvas. previosuly one had to click canvas to say move avatar. now the focus shifts to canvas if mouse moved to over canvas.
- moved few fields around in mesh property dialog box. 
- fixed issue of assets placement when the avatar is switched. previously the assets would be placed in front of old avatar
### 01/01/2026 0.4.0-alpha.16
- fixed issue where if two character animationgroups were named the same, clicking "play" in the animation section of mesh property dialog box, will play the animationgroup  on a different character and not the one selected
### 12/16/2025 0.4.0-alpha.15
- improved asset placement position when asset is added to the scene.
- provided for how curated asset are scaled when being added to the scene. previously there was a global setting which effected all curated asset. Now an individual asset can override the global setting.
### 12/15/2025 0.4.0-alpha.14
- fixed issue - when scene dialog box  is moved the content scrolls to the top. now scroll position will be restored
- fixed issue - when serialized to babylonjs file, glb object in scene have their color map/texture seems faded/washed out . this was due to change in engine which forced sRGB buffer support. This is now set to false when creating engine
- rolled back some of the "pause all actuators". pause still happens but with some caveat namely resume doesn't start always from correct postion. 
### 12/13/2025 0.4.0-alpha.13
- added button in navbar to pause all actuators
- made dialog box resizable
- made dialog box border larger
- nav bar ui changed, all icons now
- in query parm "world  " should be set to the fullname (includig filetype) of the world, so "world=fantasy.js" rather than "world=fantasy"
- method name refactoring
- fixed issue with character controller dialog closing and opening the first time
- upgraded to babylonjs to 8.41.1 from 8.4.0
- some docs generated by AI
- added new UserAssets.ts for loading user asset list after vishva has started (wip)
### 7/20/2025 0.4.0-alpha.12
- switched to new version of character controller
- added option to show avatar ellipsoid in av manger dialog box
- fixed issue with dialog box and dialog box actuator showing scroll bars every time
- fixed issue with snapper where snapping would not happen when switching edit from one selected asset to another
- fixed issue when avatar becomes semi transparent on pressing "esc" and then wrongly remains semi-transparent even after "esc" is pressed again and focus switches back to avatar
### 4/27/2025 0.4.0-alpha.11
- fixed issue of dialog box spilling out of canvas when its content height exceed the canvas height
- when switching avatar and the new avatar root is not a mesh throws a error and prevents switching
- if avatar mesh has one or more children then instead of just making the mesh unpickable make all chilren unpickable too
### 4/26/2025 0.4.0-alpha.10
- fixed issue of dialog box spilling out of canvas when it is restored after minimizing and moving it around
- fixed SNA ActuatorTextBar. Text would become transparent when the background was skybox
### 4/25/2025 0.4.0-alpha.9
- fixed universal camera not becoming active due to ambient occlusion issue
- added keys q and e to move universal camera up and down
- added option to disable shadow and serilizing that option during save
- upgraded to bablonjs version 8.4
### 4/24/2025 0.4.0-alpha.8
- added ambient occlusion
- fixed hemisphere light orientation
### 4/19/2025 0.4.0-alpha.7
- updated babylonjs to 8.x version
### 4/13/2025 0.4.0-alpha.5
- added new actuator SignalEmitter
- refactored actuators
### 9/13/2023 0.4.0-alpha.4
- added two depth renderer for each of the arc and uni cameras. previous fix for unicam not moving when Cascade shadow map used no longer required
### 9/13/2023 0.4.0-alpha.3
- fix issue of not picking up shadowgenerator when loading saved scene
- added two depth renderer for each of the arc and uni cameras. previous fix for unicam not moving when Cascade shadow map used no longer required
### 9/13/2023 0.4.0-alpha.2
- fix issue of unicam not moving when Cascade shadow map used
- fix issue of not picking up shadowgenerator when loading saved scene
- unicam speed increases when shft key is pressed
### 9/13/2023 0.4.0-alpha.1
- azimuth and elevation algorithm changed 
### 9/12/2023 0.4.0-alpha.0 
- light direction now set using azimuth and elevation
- shadows now generated using CascadedShadowGenerator

