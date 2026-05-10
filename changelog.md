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

