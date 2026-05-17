/**
 * The serialization format for a Spawner, stored in VishvaSerialized.
 * Uses plain {x, y, z} objects instead of Vector3 for JSON compatibility.
 */
export interface SpawnerSerialized {
    /** ID of the Spawner_Mesh in the scene */
    meshId: string;
    /** Relative avatar position in spawner-mesh local space */
    relativeAvatarPosition: { x: number; y: number; z: number };
    /** Avatar Y rotation relative to spawner mesh Y rotation */
    relativeAvatarRotationY: number;
    /** ArcRotateCamera alpha */
    cameraAlpha: number;
    /** ArcRotateCamera beta */
    cameraBeta: number;
    /** ArcRotateCamera radius */
    cameraRadius: number;
    /** Displacement from avatar position to camera target */
    cameraTargetOffset: { x: number; y: number; z: number };
}
