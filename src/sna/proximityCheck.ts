import { Vector3, Mesh } from "babylonjs";

/**
 * Returns true if the signal should be emitted (proximity check passes).
 * Returns false if the signal should be suppressed.
 *
 * @param avProximity - The configured proximity threshold (0 = disabled)
 * @param meshPosition - The sensor mesh's absolute world position
 * @param avatar - The avatar mesh, or null if no avatar is present
 */
export function shouldEmitByProximity(
    avProximity: number,
    meshPosition: Vector3,
    avatar: Mesh | null
): boolean {
    // Treat negative or zero as disabled
    if (avProximity <= 0) return true;

    // No avatar = pass through
    if (avatar == null) return true;

    const distance = Vector3.Distance(avatar.absolutePosition, meshPosition);
    return distance <= avProximity;
}
