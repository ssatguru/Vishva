# Design: SNA Overview Dialog

## Problem

Sensors and actuators (SNA) are attached per mesh and edited through the properties panel, one mesh at a time. In worlds with many meshes it is hard to see which meshes have behaviors, how signals connect them, or which signals are wired incorrectly.

## Goals

- One read-only dialog listing every mesh that has sensors or actuators.
- Show each sensor and actuator with its standard attributes: `signalId`, `signalEnable`, `signalDisable`, `signalStart`, `signalEnd`, `autoStart`, `loop`, `toggle`.
- Mesh-centric layout (grouped by mesh).
- List orphan signals: emitted but never received, or received but never emitted.

## Non-goals

- Editing from the dialog (read-only in this version).
- A signal-centric view (signal to emitters to receivers).
- Live updates. The dialog refreshes on open and when Refresh is pressed.

## Data model

Each mesh or transform node keeps its live behaviors in `node["sensors"]` and `node["actuators"]`. Each item exposes `getName()` and `getProperties()`.

| Property | Sensor | Actuator |
|---|---|---|
| `signalId` | signal emitted | signal that starts the actuator |
| `signalEnable`, `signalDisable` | listened | listened |
| `signalStart`, `signalEnd` | not present | emitted |
| `autoStart`, `loop`, `toggle` | not present | present |

Properties are defined in `SNAproperties` and `ActProperties` in `src/sna/SNA.ts`. Sensors show "–" for the actuator-only columns.

The scene is scanned directly (`scene.meshes` and `scene.transformNodes`, de-duplicated by `uniqueId`). `SNAManager.meshesWithSNA` is not used because it was not verified to stay current on delete and load.

## Components

| File | Status | Role |
|---|---|---|
| `src/sna/SNAOverviewLogic.ts` | new | Pure logic, no DOM or BabylonJS dependency |
| `src/gui/SnaOverviewML.ts` | new | Dialog markup |
| `src/gui/SnaOverviewUI.ts` | new | Builds the `VDiag`, collects scene data, renders, handles clicks |
| `src/gui/NavBarML.ts` | edited | New `navSnaOverview` button (icon `hub`), placed after `navWorldAssets` |
| `src/gui/VishvaGUI.ts` | edited | Wires the button to `SnaOverviewUI.toggle()`; holds `_snaOverviewUI` |

This follows the repo convention of `*ML.ts` for markup and `*UI.ts` for logic and events.

### SNAOverviewLogic.ts

Input is a list of `SnaSource` (`meshId`, `meshName`, `sensors[]`, `actuators[]`), where each sensor or actuator only needs `getName()` and `getProperties()`.

- `buildRows(sources)` returns flat `SnaRow[]`. Non-string signal values become `""`, and booleans are coerced.
- `filterRows(rows, filter)` applies free text (mesh name, item name, any signal field), the sensor and actuator toggles, and a signal filter that matches rows emitting or listening on that signal.
- `sortRows(rows, key, ascending)` is stable and returns a new array.
- `groupByMesh(rows)` groups by `meshId`, so two meshes with the same name stay separate.
- `emittedSignals(row)` and `receivedSignals(row)` define signal direction (see below).
- `findOrphanSignals(rows)` returns `OrphanSignal[]` with the signal, the problem type and the `mesh / item` names involved.
- `splitSignals(s)` splits comma-separated lists, trims, and drops empty entries.

### Signal direction rules

- Sensor emits `signalId`.
- Actuator emits `signalStart`, `signalEnd`, and the extra emit properties `signals` (SignalEmitter), `onNoHealth` and `onFullHealth` (Health).
- Sensor and actuator both listen on `signalEnable` and `signalDisable`.
- Actuator also listens on `signalId`, except when `autoStart` is true (it starts without a signal).

An orphan is a signal in the emitted set with no receiver, or in the received set with no emitter. Orphans are computed over all rows, not the filtered rows.

New actuators that emit signals through their own properties need their property name added to `EXTRA_EMIT_PROPS` in `SNAOverviewLogic.ts`, otherwise their signals will be reported as received-but-never-emitted.

### SnaOverviewUI.ts

- `toggle()`, `show()`, `isOpen()`, `refresh()`.
- A single `VDiag` is created on first show (non-modal, resizable, centered) and reused afterward. `onShow` and `onHide` call `disableKeys()` and `enableKeys()` so typing in filter boxes does not move the avatar.
- Table header: clicking a column sorts by it. A "sort meshes by name" row sorts the groups.
- Mesh header row: click selects the mesh and focuses the camera (`selectMesh` then `setFocusOnMesh`). Double click collapses or expands the group.
- Item row: click selects the mesh (`selectMesh`) without moving the camera.
- Orphan section: a `<details>` element with a table. Clicking an entry copies its signal into the signal filter.
- Cell text is set with `textContent`, so mesh and signal names are never interpreted as HTML.
- Colors use the existing `--v-*` theme variables.

## Behavior notes

- Selecting a mesh through the dialog uses the same `Vishva.selectMesh()` path as the item list, so edit controls and the properties panel behave as usual.
- The dialog is a snapshot. After adding, removing or editing behaviors, press Refresh.
- Rebuilding the whole table on each filter change is acceptable for hundreds of rows. Virtual scrolling would be needed for much larger scenes.

## Testing

- `NavBarML.test.ts` passes unchanged. It filters to its expected button ids, so the added button does not affect it.
- `tsc` reports no errors in the changed files. The project has pre-existing type errors from conflicting BabylonJS definitions that are unrelated to this change.
- No tests were added for the new code. `SNAOverviewLogic.ts` has no DOM or Babylon dependency, so unit and property tests (Vitest and fast-check) can be added directly. Good candidates:
  - `splitSignals` trimming and empty removal
  - filter results being a subset of the input
  - sort stability and permutation
  - every row appearing in exactly one group
  - orphan results being consistent with `emittedSignals` and `receivedSignals`
- The dialog was tested manually in the browser and works as designed.

## Future work

- Inline editing, which must go through `setProperties()` so subscriptions are updated.
- Signal-centric view.
- Auto-refresh on SNA add, remove and edit events.
