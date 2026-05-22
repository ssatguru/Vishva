# Project Structure

```
bin/                        # Build output (webpack bundles here)
src/
  index.ts                  # Entry point — bootstraps Vishva, imports SNA modules
  index.html                # HTML shell with canvas and GUI container
  Vishva.ts                 # Core class — scene management, mesh operations, serialization, avatar setup
  VishvaSerialized.ts       # Serialization models (VishvaSerialized, ObjectIdMap, MeshMetadata, BoneAttachmentSerialized, AvSerialized)
  Game.ts                   # Placeholder for game logic
  CameraController.ts       # Custom camera controller (UniCamController)
  GrndSpread.ts             # Ground spreading / SPS vegetation system
  style.css                 # Custom styles + CSS custom properties for theming (--v-light-*, --v-color-*, --v-dark-*)
  w3.css                    # W3.CSS framework
  w3-theme-*.css            # W3.CSS theme variants (black, brown, dark-grey, eggplant, grey)

  sna/                      # Sensor & Actuator behavior system
    SNA.ts                  # Core SNA framework: SNAManager, SensorAbstract, ActuatorAbstract, interfaces, serialization
    SensorAvContact.ts      # Avatar-specific intersection sensor (onEnter/onExit with avatar mesh)
    SensorClick.ts          # Click/pointer sensor
    SensorContact.ts        # Mesh-to-mesh intersection sensor (user picks target mesh via MeshPickerType)
    SensorKeyboard.ts       # Keyboard key sensor (window-level listener, modifier keys, pointer-over gating)
    SensorTimer.ts          # Timer-based sensor
    ActuatorAnimator.ts     # Mesh animation actuator
    ActuatorAvAnimator.ts   # Avatar animation actuator
    ActuatorCC.ts           # Character controller actuator
    ActuatorCloaker.ts      # Visibility toggle actuator
    ActuatorDialog.ts       # Dialog display actuator
    ActuatorDisabler.ts     # Disable mesh actuator
    ActuatorEnabler.ts      # Enable mesh actuator
    ActuatorLight.ts        # Light control actuator
    ActuatorMover.ts        # Movement actuator
    ActuatorPointerLock.ts  # Pointer lock actuator
    ActuatorRotator.ts      # Rotation actuator
    ActuatorSignalEmitter.ts # Signal emission actuator
    ActuatorSound.ts        # Sound playback actuator
    ActuatorTextBar.ts      # Text bar display actuator

  gui/                      # Editor UI (vanilla DOM, W3.CSS)
    VishvaGUI.ts            # Main GUI controller, navigation menu, dialog management, layout sync
    VishvaML.ts             # HTML markup generation
    NavBarML.ts             # Menu bar markup (fixed position, top of viewport)
    DialogMgr.ts            # Dialog manager
    GuiUtils.ts             # GUI utility functions
    UIConst.ts              # UI constants (MENU_BAR_HEIGHT, dialog dimensions)
    CCML.ts / CCUI.ts       # Character controller UI
    EnvironmentML.ts / EnvironmentUI.ts  # Environment settings UI
    SettingsML.ts / SettingsUI.ts        # General settings UI (includes theme picker)
    SnaML.ts / SnaUI.ts     # SNA behavior editor UI
    SoundML.ts / SoundUI.ts # Sound management UI
    TextureML.ts / TextureUI.ts          # Texture management UI
    WorldLauncher.ts        # World browser UI (lists saved worlds from AssetStore, shows format type)
    WorldLauncherLogic.ts   # World launcher logic (reads VishvaAssetStore/saved, processes server world list for .tar.gz and .json)
    SavePromptUI.ts         # Save prompt dialog UI (world name + format choice: with assets or JSON only)
    SavePromptLogic.ts      # Save prompt logic (world name normalization, strips .tar.gz/.json suffixes)
    HelpML.ts               # Help dialog markup
    InternalAssetsUI.ts     # Internal asset browser
    ItemListUI.ts           # Item list management
    MaterialListUI.ts       # Material list management
    UploadUI.ts             # File upload handling
    ColorPickerFld.ts       # Color picker field wrapper
    colorpicker/            # Color picker widget (themes + logic)
    components/             # Reusable UI components (VButton, VDiag, VTree, VInputNumber, VRange, etc.)
    propspanel/             # Properties panel for selected mesh (General, Material, Physics, Animation, Lights, SNA)

  managers/                 # Subsystem managers
    SaveManager.ts          # World save (download as tar.gz or JSON, browser IndexedDB save with or without assets, standalone archive)
    LoadManager.ts          # World/asset loading, drag-and-drop, supports .tar.gz and .json world files
    ProgressManager.ts      # Loading progress tracking
    AssetStore.ts           # IndexedDB-backed asset storage (VishvaAssetStore database, session + saved stores)
    AssetCollector.ts       # Collects assets referenced by the scene for archiving
    AssetResolver.ts        # Resolves asset paths and URLs
    PathRewriter.ts         # Rewrites asset paths for portability (e.g., archive export)
    FileValidator.ts        # File type detection (isTarGzFile, isJsonWorldFile, isWorldFile, normalizeTarGzExtension)
    TarUtils.ts             # Tar archive creation/extraction utilities
    spawner/                # Spawner system — avatar/camera placement on scene load
      Spawner.ts            # Spawner interface (mesh + relative transforms + camera params)
      SpawnerSerialized.ts  # Serialization format for VishvaSerialized
      SpawnResult.ts        # Computed world-space transforms returned on spawn application
      SpawnerMeshFactory.ts # Creates flat arrow-shaped indicator mesh (≤20 tris, renders on top)
      SpawnerManager.ts     # Lifecycle manager: create, update, serialize, deserialize, apply
      SpawnerManager.test.ts # Unit tests

  eventing/                 # Simple pub/sub event system
    EventManager.ts         # Static publish/subscribe event bus
    VEvent.ts               # Event name constants

  avatar/
    AvManager.ts            # Avatar creation, skeleton, character controller setup

  assets/                   # Asset management and internal assets
    internalAssets.js        # Internal asset registry
    updateAssets.js          # Asset update utilities
    UserAsset.ts             # User asset model
    internal/               # Built-in assets (avatar models, textures, particle textures, primitive thumbnails)

  util/                     # Utility classes
    AnimUtils.ts            # Animation helper utilities
    HREFsearch.ts           # URL/query string parsing
    Random.ts               # Random number utilities
  lib/                      # Vendored JS libraries (Oimo.js)
  misc/                     # Misc vendored scripts (perlin.js, babylon.dynamicTerrain.min.js)
  d.ts/                     # Custom type declarations
```

## Test Files

Test files live alongside their source files using these conventions:
- `*.test.ts` — Unit tests (run by Vitest)
- `*.property.test.ts` — Property-based tests (fast-check + Vitest)

Current test coverage:
- `managers/AssetStore.test.ts`
- `managers/AssetCollector.test.ts`, `managers/AssetCollector.property.test.ts`
- `managers/AssetCollector.serverAssets.property.test.ts`, `managers/AssetCollector.serverAssets.preservation.property.test.ts`
- `managers/AssetCollector.blobfix.property.test.ts`
- `managers/AssetResolver.test.ts`, `managers/AssetResolver.property.test.ts`
- `managers/PathRewriter.test.ts`, `managers/PathRewriter.property.test.ts`
- `managers/AssetPresenceDetection.property.test.ts`
- `managers/SaveManager.property.test.ts`
- `managers/TarRoundTrip.property.test.ts`
- `managers/LoadManager.preservation.property.test.ts`, `managers/LoadManager.clearScene.property.test.ts`
- `managers/LoadManager.pageReload.test.ts`
- `managers/spawner/SpawnerManager.test.ts`
- `sna/SNA.property.test.ts`
- `sna/SensorKeyboard.test.ts`, `sna/SensorKeyboard.property.test.ts`
- `gui/UploadUI.property.test.ts`
- `gui/WorldLauncher.test.ts`, `gui/WorldLauncher.property.test.ts`
- `gui/NavBarML.test.ts`, `gui/NavBarML.property.test.ts`
- `gui/ItemListUI.property.test.ts`
- `gui/components/VTree.property.test.ts`
- `gui/propspanel/AnimationUI.test.ts`

## Architecture Patterns

- **GUI convention**: `*ML.ts` files generate HTML markup, `*UI.ts` files handle logic and events. They come in pairs.
- **SNA registration**: Each Sensor/Actuator self-registers with `SNAManager` at import time (side-effect imports in `index.ts`). Backward compatibility: old serialized "Contact" sensors (without `targetMesh`) are automatically deserialized as "AvContact".
- **MeshPickerType**: A property type for SNA sensors/actuators that lets the user pick a mesh from the scene via a modal ItemListUI dialog. Serialized with `type`, `value` (uniqueId), and `meshName`. Used by SensorContact for target mesh selection. SnaUI renders a "Choose Mesh" button that opens ItemListUI with an optional filter function.
- **Serialization**: Vishva extends BabylonJS scene serialization with `VishvaSerialized` for SNA data, avatar state, ground spreads, GUI settings, object IDs, and bone attachments. Backward compatibility with tag-based object identification is maintained alongside the newer `ObjectIdMap` approach.
- **Bone attachment system**: Meshes can be attached to skeleton bones via "attacher-" TransformNodes. `Vishva._attach2Bone()` creates the node and calls `attachToBone()`. Attachments are serialized in `VishvaSerialized.boneAttachments[]` (bone name matching against parent node) and re-attached on load via `_reattachBoneAttachments()`. The bone selector UI in AnimationUI provides a VTreeDialog for browsing the skeleton hierarchy and selecting bones.
- **Singleton access**: `Vishva.vishva` is a static reference to the single Vishva instance. `SNAManager.getSNAManager()` is a singleton accessor.
- **No framework**: The UI is built with vanilla DOM manipulation and W3.CSS classes. No component framework.
- **Menu bar layout**: The editor uses a stacked layout — a fixed menu bar (`#menuBar`, 48px max height, `position:fixed; top:0`) sits above the canvas. `#vGUI` and `#vCanvas` are offset by the menu bar height (`top:48px; height:calc(100% - 48px)`). VishvaGUI syncs the offset dynamically via `menuBar.offsetHeight` on resize. VDiag dialogs are children of `#vGUI` and clamped to its bounds (top >= 0), so they never overlap the menu bar. A `ResizeObserver` on each VDiag re-clamps position when content grows (e.g., `<details>` expansion).
- **Asset pipeline**: `AssetCollector` gathers scene assets → `AssetResolver` resolves URLs → `PathRewriter` normalizes paths → `TarUtils` packages into archives for standalone export. For IndexedDB saves, `AssetStore` (`VishvaAssetStore` database) provides persistent browser storage with two object stores: `session` (active world working set, cleared on each load) and `saved` (explicitly-saved worlds, keyed by `{worldName}/{assetPath}`). The `WorldLauncher` reads from the `saved` store and routes via `?world=__saved:<name>` URL parameters.
- **Dual save formats**: Worlds can be saved/downloaded in two formats: (1) full archive with assets (tar.gz / IndexedDB with Vishva.json + Scene.babylon + asset entries), or (2) JSON-only legacy format (single merged scene JSON with VishvaSerialized as a top-level key, stored as `__world.json` in IndexedDB). JSON-only worlds rely on the server for assets.
- **World file routing**: `FileValidator` provides `isTarGzFile()`, `isJsonWorldFile()`, and `isWorldFile()` for routing uploaded/dropped files. Upload and drag-and-drop detect both formats and route to the appropriate loader (`loadWorldFromFile` for tar.gz, `loadWorldFromJsonFile` for JSON). Both use a store-in-IndexedDB-then-reload pattern (`__uploaded` / `__uploaded_json`).
- **Spawner system**: `SpawnerManager` manages spawn points for avatar/camera placement on scene load. Spawners store transforms *relative* to a visual arrow mesh, so moving the mesh in the editor adjusts the spawn location. Multiple spawners supported with uniform random selection at load time. Spawner meshes render on top of other geometry (`renderingGroupId=1`, `disableDepthWrite`), are invisible/non-pickable by default (participate in "reveal invisibles"), and are serialized via `VishvaSerialized.spawners[]`. The system replaces the legacy `spawnPointId` mechanism. The CharacterController's `faceForward` setting is accounted for when orienting the arrow mesh.
- **Theming system**: The editor UI uses CSS custom properties (`--v-light-fg`, `--v-light-bg`, `--v-color-fg`, `--v-color-bg`, `--v-dark-fg`, `--v-dark-bg`) for dynamic theme switching. `VThemes.applyTheme()` writes these variables to `:root`; all UI components reference them via `var(--v-*)` inline styles. Theme presets are defined in `VThemes.presets[]` (11 combinations across 5 color families × light/normal/dark). The active preset is persisted in `localStorage` and restored on page load via `VThemes.restoreTheme()`. The theme picker lives in SettingsUI as a `<select>` dropdown with live preview.
