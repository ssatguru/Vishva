import { Mesh, Vector3 } from "babylonjs";

/**
 * Represents a single spawn point with its mesh and relative transform data.
 * Transforms are stored relative to the Spawner_Mesh so that moving/rotating
 * the mesh in the editor automatically adjusts the spawn location.
 */
export interface Spawner {
    /** The arrow-shaped indicator mesh */
    mesh: Mesh;
    /** Avatar position in spawner-mesh local space */
    relativeAvatarPosition: Vector3;
    /** Avatar Y rotation relative to spawner mesh Y rotation */
    relativeAvatarRotationY: number;
    /** ArcRotateCamera alpha */
    cameraAlpha: number;
    /** ArcRotateCamera beta */
    cameraBeta: number;
    /** ArcRotateCamera radius */
    cameraRadius: number;
    /** Displacement from avatar position to camera target */
    cameraTargetOffset: Vector3;
}
