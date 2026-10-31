# Asset storage, resolution, and collection

This document explains the roles of [`AssetStore`](../src/managers/AssetStore.ts),
[`AssetResolver`](../src/managers/AssetResolver.ts), and
[`AssetCollector`](../src/managers/AssetCollector.ts), and how the load and save
managers connect them.

## The three components

| Component | Responsibility | Does not do |
|---|---|---|
| `AssetStore` | Persists binary asset data in IndexedDB. Provides a `session` store for the active world's assets and a `saved` store for named, explicitly saved worlds. | It does not interpret scene JSON, resolve Babylon URLs, or discover assets in a scene. |
| `AssetResolver` | During scene loading, makes session assets available to Babylon by mapping their structured paths to Blob URLs and intercepting Babylon file/texture URL processing. | It does not persist data; IndexedDB remains the backing store. |
| `AssetCollector` | During saving, scans serialized scene/settings data for asset references and extracts embedded or Blob URL texture bytes so the save operation can package them. | It does not write files to IndexedDB or fetch assets itself. The caller handles fetching, rewriting, and saving. |

`AssetStore` uses the IndexedDB database `VishvaAssetStore`:

- **`session`** stores assets by structured path, such as
  `vishva/assets/audio/footstep.ogg`. The load path clears it before preparing
  a different archive-based world, then inserts that world's assets.
- **`saved`** stores entries under a composite key of
  `{worldName}/{assetPath}`. This store is for named worlds saved by the user.

These are browser-persisted IndexedDB records, not just JavaScript memory.
`AssetResolver` temporarily copies session records into memory while active;
that in-memory map is a runtime lookup cache, not the durable store.

Local upload staging in `VishvaWorlds/worlds` is a separate mechanism from
`AssetStore`. It temporarily holds uploaded world files across the page reload.

## Loading and resolving assets

```mermaid
flowchart TD
    A[Load archive or saved full world] --> B[Extract or read world files]
    B --> C[Read asset paths and binary data]
    C --> D[AssetStore.open]
    D --> E[Clear active session]
    E --> F[Insert archive assets into session]
    F --> G[AssetResolver.activate]
    G --> H[Read session keys and bytes from IndexedDB]
    H --> I[Build in-memory asset map]
    I --> J[Intercept Babylon Tools.PreprocessUrl and Tools.LoadFile]
    J --> K[Babylon requests an asset path]
    K --> L{Path matches cached session asset?}
    L -->|yes| M[Create Blob URL from cached bytes]
    M --> N[Load through original Babylon file loader]
    L -->|no| O[Use original Babylon URL handling]

    G --> P[Resolve vishva/assets paths in VishvaSerialized]
    P --> Q[Replace matching sound and other settings paths with Blob URLs]
    Q --> R[Append scene and load Vishva runtime]
    N --> R
    R --> S[Scene ready]
    S --> T[AssetResolver.deactivate]
    T --> U[Restore Babylon handlers and revoke Blob URLs]
```

In the archive path, `LoadManager` extracts entries named under
`vishva/assets/`. Older `assets/` entries are remapped to that structured
prefix. It clears the session, writes the assets, and activates the resolver
before appending the scene. The full browser-saved-world path copies saved
assets into the session before activating the resolver. A world with no
bundled assets may have no resolver to activate.

The resolver loads the session keys and bytes from IndexedDB into an in-memory
map on activation because Babylon's `Tools.PreprocessUrl` is synchronous.
When a URL matches a stored key (including supported URL-decoded or suffix
matches), it creates a Blob URL and lets Babylon's original loader consume it.
Unmatched URLs fall through to Babylon's original behavior, so server assets
can still be loaded normally.

Some asset references live in `VishvaSerialized` fields rather than in
Babylon's scene asset requests. For example, an avatar character controller's
step sound is serialized under `avSerialized.settings.sound`; mesh controller
sounds are stored under `meshCCs`. `resolveAssetPaths()` traverses the
serialized data and replaces matching `vishva/assets/` strings with Blob URLs
so the sound can be loaded from the session asset bytes.

Once the scene is ready, `deactivate()` restores the original Babylon
handlers, revokes generated Blob URLs, and releases its in-memory asset map.
The resolver's reverse map is intentionally retained for save-time conversion:
revoking a Blob URL does not erase the record of which structured asset path it
represents.

## Collecting assets during save

```mermaid
flowchart TD
    A[SaveManager serializes scene and VishvaSerialized] --> B[AssetCollector scans references]
    B --> C[collectServerAssets scans vishva paths]
    B --> D[collect scans scene textures, materials, particles, meshes, environment]
    A --> E[collectEmbeddedTextures finds base64 data URIs]
    A --> F[collectBlobTextures finds Blob URL textures]

    C --> G[Deduplicate references and generate archive paths]
    D --> G
    E --> H[Decode embedded data URI to bytes]
    F --> I[SaveManager fetches Blob URL to bytes]
    H --> J[Rewrite serialized texture to structured asset path]
    I --> J
    G --> K[PathRewriter rewrites references]
    J --> L{Save destination}
    K --> L

    L -->|full download| M[For each server asset check active session first]
    M --> N{Bytes in session?}
    N -->|yes| O[Reuse stored bytes even if server URL is stale]
    N -->|no| P[Fetch from server]
    O --> Q[Fetch unresolved external assets and carry forward other session assets]
    P --> Q
    Q --> R[Write scene, settings, and assets to TAR then gzip]

    L -->|full browser save| S[Reuse session bytes or fetch referenced bytes]
    S --> T[Write scene, settings, and assets to saved store]

    L -->|JSON-only save| U[Keep URL references; omit separate bundled assets]
```

`AssetCollector` handles multiple serialized representations:

- **Server paths:** `collectServerAssets()` recursively finds eligible
  `vishva/...` strings in scene and Vishva data. It skips generated data/blob
  archive paths and non-fetchable cube-texture base paths.
- **External scene references:** `collect()` checks the serialized scene's
  texture arrays, reflection textures, material textures, particle texture
  names, delayed mesh files, and environment/reflection texture fields. It
  returns deduplicated references with resolved fetch URLs and archive paths.
- **Embedded textures:** `collectEmbeddedTextures()` decodes `data:` URI
  `base64String` values to bytes. After the caller has retained those bytes,
  `stripEmbeddedTextures()` removes the inline data and points the texture at
  its generated `vishva/assets/data/...` path.
- **Blob URL textures:** `collectBlobTextures()` finds texture URLs created at
  runtime by the resolver. `SaveManager` fetches each Blob URL while it is
  valid, saves the bytes, and changes the serialized texture reference to its
  generated `vishva/assets/blob/...` path.

Before writing any world format, `SaveManager` calls
`reverseAllBlobUrls()` on the complete `VishvaSerialized` object—not only its
SNA properties. This converts resolver-created Blob URLs in controller sound
settings (including avatar and mesh controllers) back to their original
`vishva/assets/...` paths. The original path is therefore serialized, not a
temporary Blob URL that will be revoked after loading.

For full saves, the SaveManager coordinates the rest: it uses `PathRewriter`
to update references, and sends collected entries to the archive builder or
`AssetStore.saveWorldBatch()`. For a full archive download, server assets are
looked up in the active session first; if present, those bytes are reused and
the server URL is not fetched. This lets a re-save keep a sound from the loaded
world even if its original server file has since been renamed or removed. If
the asset is absent from the session, the save falls back to fetching it from
the server and reports fetch failures. External assets are fetched as needed,
and still-referenced session assets are carried forward. The full browser-save
path also checks the session before fetching server or external assets.
JSON-only formats intentionally omit separate asset files and depend on URL
references or data that remains embedded.

## End-to-end responsibilities

```mermaid
flowchart LR
    A[LoadManager] -->|writes or copies active asset bytes| B[AssetStore session in IndexedDB]
    B -->|reads bytes and serves matching paths during load| C[AssetResolver]
    C -->|Blob URLs and loaded scene| D[Babylon scene]
    D -->|serialized scene at save time| E[SaveManager]
    E -->|asks what references and texture bytes are present| F[AssetCollector]
    F -->|descriptions and binary texture data| E
    E -->|writes named-world entries| G[AssetStore saved in IndexedDB]
```

The key distinction is: **Store persists bytes, Resolver makes stored bytes
loadable at runtime and tracks reversible Blob URLs, and Collector discovers
and organizes bytes for saving.** `AssetCollector` and `AssetResolver` do not
replace one another: one is used primarily on the save/serialization path,
the other on the load/runtime path.

## Source map

- IndexedDB session and named-world operations:
  [`AssetStore.ts`](../src/managers/AssetStore.ts)
- Babylon request interception and Blob URL lifecycle:
  [`AssetResolver.ts`](../src/managers/AssetResolver.ts)
- Serialized-scene asset discovery and texture extraction:
  [`AssetCollector.ts`](../src/managers/AssetCollector.ts)
- Archive ingestion and activation during load:
  [`LoadManager.ts`](../src/managers/LoadManager.ts)
- Serialization, collection, fetching, and output:
  [`SaveManager.ts`](../src/managers/SaveManager.ts)
