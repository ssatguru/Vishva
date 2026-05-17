import { Vector3 } from "babylonjs";

/**
 * The computed world-space transforms returned when applying a spawner.
 * Used to position the avatar and camera at load time.
 */
export interface SpawnResult {
    /** World-space avatar position */
    avatarPosition: Vector3;
    /** World-space avatar Y rotation */
    avatarRotationY: number;
    /** ArcRotateCamera alpha */
    cameraAlpha: number;
    /** ArcRotateCamera beta */
    cameraBeta: number;
    /** ArcRotateCamera radius */
    cameraRadius: number;
    /** World-space camera target */
    cameraTarget: Vector3;
}
