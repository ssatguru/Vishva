# Vishva — Product Overview

Vishva (Hindi for "World") is a browser-based live 3D scene editor built on BabylonJS. It allows users to create, edit, and interact with 3D worlds directly in the browser.

## Core Capabilities
- Load, place, and manipulate 3D meshes (primitives, imported models, curated assets)
- Attach behaviors to objects via a Sensor/Actuator (SNA) system — sensors detect events, actuators perform actions
- Third-person avatar with character controller for navigating scenes
- Environment controls: skybox, lighting, fog, shadows, weather (rain/snow), water, terrain
- Save/load worlds in two formats:
  - **Archive (.tar.gz)**: full world with all assets bundled — portable, self-contained
  - **JSON only (.json)**: legacy format — scene data without assets (assets loaded from server)
- Browser save/load via IndexedDB (`VishvaAssetStore`) — supports both formats, stores individual assets without tar.gz intermediary for full worlds, or a single `__world.json` entry for JSON-only worlds
- Export standalone world archives (tar-based) for portable distribution
- Physics support via Oimo.js
- Theming system for the editor UI (W3.CSS-based, multiple theme variants)
- Upload and manage custom 3D assets (GLB, glTF, Babylon files)
- Drag-and-drop or upload `.tar.gz` and `.json` world files to load them

## Key Concepts
- **World**: A serialized BabylonJS scene plus Vishva-specific metadata (`VishvaSerialized`)
- **SNA (Sensors & Actuators)**: The behavior system. Sensors emit signals on events (click, contact, timer). Actuators respond to signals (animate, move, rotate, play sound, emit signals, show dialogs, control visibility, etc.)
- **Avatar**: A controllable character mesh with skeleton animations, managed by `AvManager` and `CharacterController`
- **Edit Mode**: When enabled, users can select meshes, transform them with EditControl, and configure properties/behaviors via the GUI
- **Standalone Archive**: A self-contained tar package of a world and all its assets, enabling offline sharing and portability
