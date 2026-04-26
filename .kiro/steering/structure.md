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

  sna/                      # Sensor & Actuator behavior system
    SNA.ts                  # Core SNA framework: SNAManager, SensorAbstract, ActuatorAbstract, interfaces, serialization
    Sensor*.ts              # Sensor implementations (SensorClick, SensorContact, SensorTimer)
    Actuator*.ts            # Actuator implementations (Animator, Mover, Rotator, Sound, Light, Dialog, etc.)

  gui/                      # Editor UI (vanilla DOM, W3.CSS)
    VishvaGUI.ts            # Main GUI controller, navigation menu, dialog management
    VishvaML.ts             # HTML markup generation
    NavBarML.ts             # Navigation bar markup
    DialogMgr.ts            # Dialog manager
    components/             # Reusable UI components (VButton, VDiag, VTree, VInputNumber, VRange, etc.)
    propspanel/             # Properties panel for selected mesh (General, Material, Physics, Animation, Lights, SNA)
    *ML.ts                  # Markup/template files (HTML generation)
    *UI.ts                  # UI logic files (event handling, state)

  managers/                 # Subsystem managers
    SaveManager.ts          # World save (download, IndexedDB)
    LoadManager.ts          # World/asset loading, drag-and-drop
    ProgressManager.ts      # Loading progress tracking

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
  lib/                      # Vendored JS libraries (Oimo.js)
  misc/                     # Misc vendored scripts (perlin noise, dynamic terrain)
  d.ts/                     # Custom type declarations
  *.css                     # W3.CSS themes and custom styles
```

## Architecture Patterns

- **GUI convention**: `*ML.ts` files generate HTML markup, `*UI.ts` files handle logic and events. They come in pairs.
- **SNA registration**: Each Sensor/Actuator self-registers with `SNAManager` at import time (side-effect imports in `index.ts`).
- **Serialization**: Vishva extends BabylonJS scene serialization with `VishvaSerialized` for SNA data, avatar state, ground spreads, GUI settings, and object IDs. Backward compatibility with tag-based object identification is maintained alongside the newer `ObjectIdMap` approach.
- **Singleton access**: `Vishva.vishva` is a static reference to the single Vishva instance. `SNAManager.getSNAManager()` is a singleton accessor.
- **No framework**: The UI is built with vanilla DOM manipulation and W3.CSS classes. No component framework.
