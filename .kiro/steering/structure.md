# Project Structure

```
bin/                        # Build output (webpack bundles here)
src/
  index.ts                  # Entry point — bootstraps Vishva, imports SNA modules
  index.html                # HTML shell with canvas and GUI container
  Vishva.ts                 # Core class — scene management, mesh operations, serialization, avatar setup
  VishvaSerialized.ts       # Serialization models (VishvaSerialized, ObjectIdMap, MeshMetadata, AvSerialized)
  Game.ts                   # Placeholder for game logic
  CameraController.ts       # Custom camera controller (UniCamController)
  GrndSpread.ts             # Ground spreading / SPS vegetation system
  style.css                 # Custom styles
  w3.css                    # W3.CSS framework
  w3-theme-*.css            # W3.CSS theme variants (black, brown, dark-grey, eggplant, grey)

  sna/                      # Sensor & Actuator behavior system
    SNA.ts                  # Core SNA framework: SNAManager, SensorAbstract, ActuatorAbstract, interfaces, serialization
    SensorClick.ts          # Click/pointer sensor
    SensorContact.ts        # Collision/contact sensor
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
    VishvaGUI.ts            # Main GUI controller, navigation menu, dialog management
    VishvaML.ts             # HTML markup generation
    NavBarML.ts             # Navigation bar markup
    DialogMgr.ts            # Dialog manager
    GuiUtils.ts             # GUI utility functions
    UIConst.ts              # UI constants
    CCML.ts / CCUI.ts       # Character controller UI
    EnvironmentML.ts / EnvironmentUI.ts  # Environment settings UI
    SettingsML.ts / SettingsUI.ts        # General settings UI
    SnaML.ts / SnaUI.ts     # SNA behavior editor UI
    SoundML.ts / SoundUI.ts # Sound management UI
    TextureML.ts / TextureUI.ts          # Texture management UI
    WorldLauncher.ts        # World browser UI (lists saved worlds from AssetStore)
    WorldLauncherLogic.ts   # World launcher logic (reads VishvaAssetStore/saved)
    SavePromptUI.ts         # Save prompt dialog UI
    SavePromptLogic.ts      # Save prompt logic (world name normalization, defaults)
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
    SaveManager.ts          # World save (download, IndexedDB, standalone archive)
    LoadManager.ts          # World/asset loading, drag-and-drop
    ProgressManager.ts      # Loading progress tracking
    AssetStore.ts           # IndexedDB-backed asset storage (VishvaAssetStore database, session + saved stores)
    AssetCollector.ts       # Collects assets referenced by the scene for archiving
    AssetResolver.ts        # Resolves asset paths and URLs
    PathRewriter.ts         # Rewrites asset paths for portability (e.g., archive export)
    TarUtils.ts             # Tar archive creation/extraction utilities

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
- `gui/UploadUI.property.test.ts`
- `gui/WorldLauncher.test.ts`, `gui/WorldLauncher.property.test.ts`

## Architecture Patterns

- **GUI convention**: `*ML.ts` files generate HTML markup, `*UI.ts` files handle logic and events. They come in pairs.
- **SNA registration**: Each Sensor/Actuator self-registers with `SNAManager` at import time (side-effect imports in `index.ts`).
- **Serialization**: Vishva extends BabylonJS scene serialization with `VishvaSerialized` for SNA data, avatar state, ground spreads, GUI settings, and object IDs. Backward compatibility with tag-based object identification is maintained alongside the newer `ObjectIdMap` approach.
- **Singleton access**: `Vishva.vishva` is a static reference to the single Vishva instance. `SNAManager.getSNAManager()` is a singleton accessor.
- **No framework**: The UI is built with vanilla DOM manipulation and W3.CSS classes. No component framework.
- **Asset pipeline**: `AssetCollector` gathers scene assets → `AssetResolver` resolves URLs → `PathRewriter` normalizes paths → `TarUtils` packages into archives for standalone export. For IndexedDB saves, `AssetStore` (`VishvaAssetStore` database) provides persistent browser storage with two object stores: `session` (active world working set, cleared on each load) and `saved` (explicitly-saved worlds, keyed by `{worldName}/{assetPath}`). The `WorldLauncher` reads from the `saved` store and routes via `?world=__saved:<name>` URL parameters.
