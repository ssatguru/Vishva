# Design Document

## Overview

This design covers adding three features to the Character Controller (CC) dialog: a "turnInPlace" checkbox in the Settings form, an "Apply" button that saves settings without closing the dialog, and an "Export" button that downloads the CC configuration as JSON following the existing MeshCCSerialized serialization pattern.

## Architecture

The changes are confined to the CC dialog subsystem (CCML.ts and CCUI.ts). No new classes or modules are introduced. The export serialization logic is a private method within CCUI that replicates the MeshCCSerialized pattern inline, with one difference: sound is serialized as `sound.name` (filename string) rather than `sound.serialize()`.

```
┌─────────────────────────────────────────────────┐
│                   CCUI.ts                        │
│                                                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ _saveCC() │  │ _apply() │  │ _exportCC()  │  │
│  │ (existing)│  │  (new)   │  │   (new)      │  │
│  └─────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│        │              │               │          │
│        ▼              ▼               ▼          │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐   │
│  │_saveCCSet│   │ _saveCC  │   │ serialize  │   │
│  │_saveCCMap│   │_updateUI │   │ + download │   │
│  └──────────┘   └──────────┘   └────────────┘   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  CCML.ts                          │
│                                                  │
│  settingFormHtml: adds turnInPlace checkbox       │
│  after "turning speed" field                     │
└─────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. CCML.ts — Turn In Place Checkbox

A new label/input pair is inserted into `settingFormHtml` immediately after the "turning speed" row:

```typescript
<label>turn in place</label>
<input name="turnInPlace" type="checkbox"/>
```

This follows the existing 2-column grid pattern (label in column 1, input in column 2).

### 2. CCUI.ts — Turn In Place Read/Write

**Read (in `_updateUISet()`):**

```typescript
form.turnInPlace.checked = this._cc.isTurnInPlace();
```

**Write (in `_saveCCSet()`):**

```typescript
this._cc.setTurnInPlace(form["turnInPlace"].checked);
```

### 3. CCUI.ts — Apply Button

A new "Apply" button is created via `VButton.create("apply", "Apply")` and appended to the dialog element before the Save button. Its click handler:

```typescript
dboApply.onclick = (e) => {
    this._saveCC();
    this._updateUI();
    return true;
};
```

Key behaviors:
- Calls `_saveCC()` (same as Save — persists both Settings and Mappings)
- Calls `_updateUI()` to re-read from the CharacterController and refresh the form
- Does NOT call `this._ccDiag.dispose()` — the dialog stays open

### 4. CCUI.ts — Export Button

A new "Export" button is created via `VButton.create("export", "Export")` and appended after the Save button. Its click handler calls a private `_exportCC()` method.

### 5. CCUI.ts — `_exportCC()` Method

This method serializes the CC configuration and triggers a browser download:

```typescript
private _exportCC() {
    // 1. Capture settings (clone via getSettings)
    let settings: CCSettings = this._cc.getSettings();

    // 2. Serialize sound as filename string only
    if (settings.sound) {
        settings.sound = settings.sound.name;
    }

    // 3. Capture action map
    let actionMap: ActionMap = this._cc.getActionMap();

    // 4. Replace AG instances with name strings, null out sounds
    let keys = Object.keys(actionMap);
    for (let key of keys) {
        let ad: ActionData = actionMap[key];
        ad.sound = null;
        if (ad.ag instanceof AnimationGroup) {
            actionMap[key]["ag"] = actionMap[key]["ag"].name;
        }
    }

    // 5. Build export object
    let exportObj = {
        settings: settings,
        actionMap: actionMap
    };

    // 6. Trigger download
    let json = JSON.stringify(exportObj, null, 2);
    let blob = new Blob([json], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "cc-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

This follows the exact MeshCCSerialized pattern:
- `getSettings()` → capture settings
- Sound → `sound.name` (differs from MeshCCSerialized which uses `sound.serialize()`)
- `getActionMap()` → capture action map
- AG instances → `.name` string
- ActionData sounds → null

### 6. Button Order

Buttons are appended in order: Apply, Save, Export, Cancel. All use `style.margin = "1em"`.

```typescript
let dboApply: HTMLButtonElement = VButton.create("apply", "Apply");
let dboSave: HTMLButtonElement = VButton.create("save", "Save");
let dboExport: HTMLButtonElement = VButton.create("export", "Export");
let dboCancel: HTMLButtonElement = VButton.create("cancel", "Cancel");

dboApply.style.margin = "1em";
dboSave.style.margin = "1em";
dboExport.style.margin = "1em";
dboCancel.style.margin = "1em";

this.ccElement.appendChild(dboApply);
this.ccElement.appendChild(dboSave);
this.ccElement.appendChild(dboExport);
this.ccElement.appendChild(dboCancel);
```

### 7. CharacterController Interface (Existing)

No new public interfaces are introduced. The feature uses existing CharacterController methods:

| Method | Purpose |
|--------|---------|
| `isTurnInPlace(): boolean` | Read current turnInPlace state |
| `setTurnInPlace(v: boolean): void` | Set turnInPlace state |
| `getSettings(): CCSettings` | Get all CC settings |
| `setSettings(s: CCSettings): void` | Apply CC settings |
| `getActionMap(): ActionMap` | Get action-to-animation mappings |

## Data Models

### Export JSON Structure

```json
{
  "settings": {
    "faceForward": true,
    "topDown": false,
    "turningOff": false,
    "smoothTurnSpeed": 0.1,
    "cameraElastic": false,
    "elasticSteps": 0,
    "makeInvisble": false,
    "gravity": 9.8,
    "keyboard": true,
    "maxSlopeLimit": 45,
    "minSlopeLimit": 30,
    "stepOffset": 0.25,
    "noFirstPerson": false,
    "cameraTarget": { "x": 0, "y": 1, "z": 0 },
    "ellipsoid": { "x": 0.5, "y": 1, "z": 0.5 },
    "ellipsoidOffset": { "x": 0, "y": 1, "z": 0 },
    "sound": "footstep.ogg",
    "animBlend": 0.05
  },
  "actionMap": {
    "walk": { "ag": "Walking", "speed": 1.5, "rate": 1, "loop": true, "exist": true },
    "run": { "ag": "Running", "speed": 3.0, "rate": 1, "loop": true, "exist": true },
    "idle": { "ag": "Idle", "speed": 0, "rate": 1, "loop": true, "exist": true }
  }
}
```

Key serialization rules:
- `settings.sound` → string (the Sound's `.name` filename), not a serialized Sound object
- `actionMap[action].ag` → string (the AnimationGroup's `.name`), not an AG instance
- `actionMap[action].sound` → null (not serialized per MeshCCSerialized pattern)

## Error Handling

- If `settings.sound` is null/undefined, it is omitted from the export (no transformation needed)
- If an ActionData entry has no AG (ag is undefined/null), it remains as-is in the export
- The download mechanism uses standard Blob/URL.createObjectURL which is supported in all modern browsers
- No user-facing error dialogs are needed; the export operation cannot fail in a meaningful way given valid CC state

## Testing Strategy

**Property-based tests** (`src/gui/CCUI.property.test.ts`):
- Test the export serialization logic in isolation (pure function extractable for testing)
- Generate arbitrary CCSettings (with/without Sound) and ActionMaps (with/without AG instances)
- Verify structural invariants (two top-level keys, sound as string, AGs as strings)
- Minimum 100 iterations per property

**Unit tests** (`src/gui/CCUI.test.ts`):
- Verify turnInPlace checkbox is present in settingFormHtml after "turning speed"
- Verify button order: Apply, Save, Export, Cancel
- Verify Apply does not dispose the dialog
- Verify export triggers download with correct filename

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Turn In Place UI reflects CC state

*For any* boolean value of the CharacterController's turnInPlace state, after `_updateUISet()` executes, the turnInPlace checkbox's checked state SHALL equal the value returned by `isTurnInPlace()`.

**Validates: Requirements 1.2**

### Property 2: Turn In Place save round-trip

*For any* boolean state of the turnInPlace checkbox in the Settings form, calling `_saveCCSet()` SHALL invoke `setTurnInPlace()` with that exact boolean value.

**Validates: Requirements 1.3**

### Property 3: Export produces valid structure with correct serialization

*For any* CharacterController configuration (CCSettings with optional Sound, and ActionMap with optional AnimationGroup references), the exported JSON SHALL:
- contain exactly two top-level keys: "settings" and "actionMap"
- have `settings.sound` as a string (the sound filename) when a Sound exists, not a serialized Sound object
- have all `actionMap[action].ag` values as strings (AG names) when AnimationGroups exist, not AG instances

**Validates: Requirements 3.2, 3.4, 3.5, 3.6**
