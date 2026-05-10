## Issue 1:
The textures are still being saved as base64. I checked the Scene.babylon file extracted from the saved world sofa.tar.gz.  

The glb file "SheenWoodLeatherSofa.glb" was dragged and dropped into the scene and then the scene was saved as sofa.tar.gz. All its texture were saved in Scene.babylon as base64

### Root Cause: 
When BabylonJS loads a GLB file, its GLTF loader extracts textures and stores them in memory with the binary data as base64 data URIs in the texture's internal buffer. When SceneSerializer.Serialize() runs, even with ForceSerializeBuffers = false, textures that already have their data embedded (from GLB extraction) get serialized with a base64String field containing the full data URI (e.g., "data:image/webp;base64,...") directly in the material's texture objects.

The AssetCollector was only scanning name and url fields — it never looked at base64String. So these massive base64 strings stayed in Scene.babylon untouched.

### Fix (2 files):

AssetCollector.ts
 — Added:

EmbeddedTextureEntry interface for tracking textures with base64String fields
collectEmbeddedTextures() method that scans materials and texture arrays for base64String fields, decodes the data URIs, and generates archive filenames from the texture's name field
stripEmbeddedTextures() method that removes base64String from the scene JSON and updates name/url to point to the archive path
_scanMaterialsForEmbedded() and _scanTextureArrayForEmbedded() helper methods
Updated _scanMaterials() and _scanTextureArray() to skip textures that have base64String (they're handled separately)
SaveManager.ts
 — Updated the save pipeline to:

Call collectEmbeddedTextures() right after serialization
Call stripEmbeddedTextures() to remove base64 data from the scene JSON
Include the decoded texture files in the archive alongside regular assets
The result: textures from GLB files are now extracted as separate .webp/.png/etc. files in the assets/ folder of the tar archive, and Scene.babylon references them by path instead of embedding megabytes of base64 data.

## Issue 2
The textures are now being stored proeprly in the assets folder but they are not being loaded when the world is loaded. 
I get 404 when loading textures.
The texture links are like
http://localhost:8080/assets/Paisley%20(Occlusion).webp

### Root Cause: 
The AssetResolver was only overriding Tools.LoadFile, which BabylonJS uses for loading text/binary files (like .babylon scene files). However, texture images (.webp, .jpg, .png, etc.) are loaded through a different path — BabylonJS creates <img> elements and sets their src attribute directly. The Tools.LoadFile override never sees these image requests, so they fall through to the browser's normal fetch, hitting http://localhost:8080/assets/Paisley%20(Occlusion).webp which doesn't exist on the server.

### Fix: 
I added an override of Tools.PreprocessUrl — this is BabylonJS's hook that's called for every URL before it's used, including texture image URLs. The resolver now:

Pre-creates blob URLs for all assets at activation time (with proper MIME types)
Intercepts Tools.PreprocessUrl to rewrite any matching texture URL to its blob URL before BabylonJS tries to load it
Handles URL-encoded filenames (e.g., Paisley%20(Occlusion).webp → Paisley (Occlusion).webp) by decoding before matching
Still keeps the Tools.LoadFile override for non-image assets
This ensures textures bundled in the tar archive are served from memory via blob URLs instead of being fetched from the server.

## Issue 3:
still the images are not loaded. 
console shows followiing error
Failed to load resource: net::ERR_FILE_NOT_FOUND
and the textures are now referenced as follows
blob:http://localhost:8080/4f69ca1b-d77a-4842-9f2c-4676ef9cbb6d

### Problem: 
The blob URLs were being revoked too early. SceneLoader.Append's success callback fires as soon as the scene JSON is parsed and meshes are created, but texture images are still being fetched asynchronously in the background. When deactivate() called URL.revokeObjectURL() on all the blob URLs, the browser could no longer access them, causing ERR_FILE_NOT_FOUND for textures still in-flight.

### Fix: 
Replaced the immediate assetResolver.deactivate() with scene.executeWhenReady(() => assetResolver.deactivate()). BabylonJS's executeWhenReady waits until all pending resources (including textures) have finished loading before firing, so the blob URLs stay valid until the textures are fully loaded into GPU memory.

## Issue 4:
Save and load is working fine now.

I notice that when a  scene is serialized into a babylon file, floating points number are saved upto 18 decimal places. This increase the file size. Is so much precision required and does babylon provides a way to reduce the precision.

### your response
Good observation. You're right that 18 decimal places of precision in serialized .babylon files is excessive and bloats file size significantly. Most 3D applications work fine with 4-6 decimal places for positions/rotations and don't need full IEEE 754 double precision in the saved output.

Does BabylonJS provide a built-in way to reduce precision?

No, BabylonJS doesn't have a built-in serialization option to control floating point precision. When you call SceneSerializer.Serialize() or similar, it uses standard JSON.stringify which outputs full double precision.

Options to reduce it:

1. Post-process with a custom replacer — The simplest approach is to round floats during or after serialization:
// Custom JSON.stringify replacer that rounds numbers
function serializeWithPrecision(obj: any, decimals: number = 4): string {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'number') {
            return parseFloat(value.toFixed(decimals));
        }
        return value;
    });
}
2. Patch before stringify — Walk the serialized object and truncate numbers in-place before saving.
Is the precision needed?

For most use cases, no:

Positions: 4 decimals gives you sub-millimeter precision at world scale — more than enough.
Rotations (quaternions): 5-6 decimals is plenty for smooth rotations.
Colors/intensities: 3-4 decimals is fine.
UV coordinates: 4-6 decimals is standard.
The only case where high precision matters is if you have objects positioned very far from the origin (large world coordinates), but even then 6 decimals is typically sufficient.

Recommendation for your project:

Since your SaveManager controls serialization, you could apply the replacer when saving the .babylon JSON. Something like 4-5 decimal places would give you a meaningful file size reduction (often 20-40% smaller) with no visible quality loss. Want me to implement that in your save pipeline?

### my response : Yes

### your response:

Done. Here's what I added to SaveManager:

A static _stringifyWithPrecision method that uses a JSON.stringify replacer to round all non-integer numbers to 4 decimal places.
Applied it to all three serialization points: saveAsset(), and both the Vishva.json and Scene.babylon outputs in _getWorldZipBlob().
Integer values (like IDs, counts) are left untouched. Only fractional numbers get rounded. With 4 decimal places you get sub-millimeter precision for positions and smooth-enough quaternion values — more than sufficient for a 3D scene editor. You should see a noticeable reduction in .babylon file size on your next save.

## Issue 5

the change has broken texture saving and texture loading.

during save the textures are not being saved in asset folder and during loading I see following error in console

Failed to load resource: the server responded with a status of 404 (Not Found)

The images are being referenced as http://localhost:8080/assets/Fringe%20(Base%20Color).webp