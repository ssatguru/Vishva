import { AbstractMesh, Matrix, Mesh, Quaternion, Scene, Vector3 } from "babylonjs";
import { Spawner } from "./Spawner";
import { SpawnerMeshFactory } from "./SpawnerMeshFactory";
import { SpawnerSerialized } from "./SpawnerSerialized";
import { SpawnResult } from "./SpawnResult";

/**
 * Central manager for all spawner lifecycle operations.
 * Handles creation, update, serialization, deserialization, and spawn application.
 */
export class SpawnerManager {
    private _spawners: Spawner[] = [];
    private _scene: Scene;
    private _counter: number = 0;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    /**
     * Create a new spawner at the avatar's current position/rotation.
     * Places the spawner mesh at ground level (avatar feet) and computes
     * relative transforms for avatar position, rotation, and camera params.
     */
    public createSpawner(
        avatarPosition: Vector3,
        avatarRotationY: number,
        avatarEllipsoidHeight: number,
        cameraAlpha: number,
        cameraBeta: number,
        cameraRadius: number,
        cameraTarget: Vector3,
        faceForward: boolean = false
    ): Spawner {
        // Generate unique mesh name
        const meshName = "spawner_" + this._counter++;

        // Create the arrow mesh
        const mesh = SpawnerMeshFactory.createArrowMesh(this._scene, meshName);

        // Place mesh at avatar's ground-level position (feet).
        // The avatar mesh origin is already at foot level; ellipsoidOffset only shifts
        // the collision ellipsoid upward, it does not affect mesh.position.
        mesh.position = avatarPosition.clone();

        // Orient mesh to match avatar's forward direction.
        // When faceForward is false, the avatar model faces -Z at rotation.y=0,
        // but the arrow geometry points +Z, so we add π to align them.
        // When faceForward is true, the avatar model faces +Z, matching the arrow.
        const rotationOffset = faceForward ? 0 : Math.PI;
        mesh.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), avatarRotationY + rotationOffset);

        // Force world matrix computation before computing relative transforms
        mesh.computeWorldMatrix(true);

        // Compute relative transforms (world → local)
        const inverseWorldMatrix = Matrix.Invert(mesh.getWorldMatrix());
        const relativeAvatarPosition = Vector3.TransformCoordinates(avatarPosition, inverseWorldMatrix);

        // Extract mesh world Y rotation from its quaternion
        const meshRotationY = this._getQuaternionYRotation(mesh.rotationQuaternion);
        const relativeAvatarRotationY = avatarRotationY - meshRotationY;

        const cameraTargetOffset = cameraTarget.subtract(avatarPosition);

        // Build the spawner object
        const spawner: Spawner = {
            mesh: mesh,
            relativeAvatarPosition: relativeAvatarPosition,
            relativeAvatarRotationY: relativeAvatarRotationY,
            cameraAlpha: cameraAlpha,
            cameraBeta: cameraBeta,
            cameraRadius: cameraRadius,
            cameraTargetOffset: cameraTargetOffset
        };

        // Store in collection
        this._spawners.push(spawner);

        // Auto-remove spawner when mesh is disposed/deleted from the scene
        mesh.onDisposeObservable.add(() => this.removeSpawner(mesh));

        return spawner;
    }

    /**
     * Update an existing spawner's position to current avatar state.
     * Repositions the mesh at the avatar's ground-level position and orientation,
     * then recomputes all relative transforms.
     */
    public updateSpawner(
        spawner: Spawner,
        avatarPosition: Vector3,
        avatarRotationY: number,
        avatarEllipsoidHeight: number,
        cameraAlpha: number,
        cameraBeta: number,
        cameraRadius: number,
        cameraTarget: Vector3,
        faceForward: boolean = false
    ): void {
        const mesh = spawner.mesh;

        // Reposition mesh at avatar's ground-level position (feet).
        // The avatar mesh origin is already at foot level.
        mesh.position = avatarPosition.clone();

        // Re-orient mesh to match avatar's forward direction
        const rotationOffset = faceForward ? 0 : Math.PI;
        mesh.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), avatarRotationY + rotationOffset);

        // Force world matrix computation before computing relative transforms
        mesh.computeWorldMatrix(true);

        // Recompute relative transforms (world → local)
        const inverseWorldMatrix = Matrix.Invert(mesh.getWorldMatrix());
        const relativeAvatarPosition = Vector3.TransformCoordinates(avatarPosition, inverseWorldMatrix);

        // Extract mesh world Y rotation from its quaternion
        const meshRotationY = this._getQuaternionYRotation(mesh.rotationQuaternion);
        const relativeAvatarRotationY = avatarRotationY - meshRotationY;

        const cameraTargetOffset = cameraTarget.subtract(avatarPosition);

        // Update spawner data
        spawner.relativeAvatarPosition = relativeAvatarPosition;
        spawner.relativeAvatarRotationY = relativeAvatarRotationY;
        spawner.cameraAlpha = cameraAlpha;
        spawner.cameraBeta = cameraBeta;
        spawner.cameraRadius = cameraRadius;
        spawner.cameraTargetOffset = cameraTargetOffset;
    }

    /**
     * Remove a spawner by its mesh reference.
     * Finds the spawner whose mesh matches and removes it from the collection.
     */
    public removeSpawner(mesh: AbstractMesh): void {
        const index = this._spawners.findIndex(s => s.mesh === mesh);
        if (index !== -1) {
            this._spawners.splice(index, 1);
        }
    }

    /**
     * Get all spawners in the collection.
     */
    public getSpawners(): Spawner[] {
        return this._spawners;
    }

    /**
     * Select a random spawner for application.
     * Returns a uniformly random spawner from the collection, or null if empty.
     */
    public selectRandom(): Spawner | null {
        if (this._spawners.length === 0) {
            return null;
        }
        return this._spawners[Math.floor(Math.random() * this._spawners.length)];
    }

    /**
     * Serialize all spawners for VishvaSerialized.
     * Converts each spawner to SpawnerSerialized format with mesh ID,
     * relative position/rotation, and camera params.
     */
    public serialize(): SpawnerSerialized[] {
        return this._spawners.map(spawner => ({
            meshId: spawner.mesh.id,
            relativeAvatarPosition: {
                x: spawner.relativeAvatarPosition.x,
                y: spawner.relativeAvatarPosition.y,
                z: spawner.relativeAvatarPosition.z
            },
            relativeAvatarRotationY: spawner.relativeAvatarRotationY,
            cameraAlpha: spawner.cameraAlpha,
            cameraBeta: spawner.cameraBeta,
            cameraRadius: spawner.cameraRadius,
            cameraTargetOffset: {
                x: spawner.cameraTargetOffset.x,
                y: spawner.cameraTargetOffset.y,
                z: spawner.cameraTargetOffset.z
            }
        }));
    }

    /**
     * Deserialize spawners from VishvaSerialized and associate with scene meshes.
     * Clears existing spawners, looks up meshes by ID, discards entries with
     * missing mesh IDs and logs a console warning.
     */
    public deserialize(data: SpawnerSerialized[], scene: Scene): void {
        // Clear existing spawners
        this._spawners = [];

        for (const entry of data) {
            const mesh = scene.getMeshById(entry.meshId) as Mesh | null;
            if (!mesh) {
                console.warn("Spawner references missing mesh: " + entry.meshId + ", discarding");
                continue;
            }

            const spawner: Spawner = {
                mesh: mesh,
                relativeAvatarPosition: new Vector3(
                    entry.relativeAvatarPosition.x,
                    entry.relativeAvatarPosition.y,
                    entry.relativeAvatarPosition.z
                ),
                relativeAvatarRotationY: entry.relativeAvatarRotationY,
                cameraAlpha: entry.cameraAlpha,
                cameraBeta: entry.cameraBeta,
                cameraRadius: entry.cameraRadius,
                cameraTargetOffset: new Vector3(
                    entry.cameraTargetOffset.x,
                    entry.cameraTargetOffset.y,
                    entry.cameraTargetOffset.z
                )
            };

            this._spawners.push(spawner);

            // Re-apply rendering properties that may not survive serialization
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.disableDepthWrite = true;
            }

            // Ensure spawner meshes are non-pickable and invisible on load
            // (they become visible/pickable only via "reveal invisibles")
            mesh.isPickable = false;
            mesh.isVisible = false;

            // Subscribe to mesh dispose for auto-removal
            mesh.onDisposeObservable.add(() => this.removeSpawner(mesh));
        }
    }

    /**
     * Compute world-space avatar position/rotation from a spawner.
     * Transforms relative avatar position from local to world space via the
     * spawner mesh's world matrix, combines Y rotations, and computes camera target.
     *
     * Non-uniform scale is handled correctly: TransformCoordinates applies scale
     * to position via the world matrix, while rotation is extracted from the
     * quaternion which ignores scale.
     */
    public computeSpawnTransform(spawner: Spawner): SpawnResult {
        // Ensure the world matrix is up to date before reading it
        spawner.mesh.computeWorldMatrix(true);

        // Transform relative avatar position from local space to world space
        const avatarPosition = Vector3.TransformCoordinates(
            spawner.relativeAvatarPosition,
            spawner.mesh.getWorldMatrix()
        );

        // Extract the spawner mesh's Y rotation from its quaternion
        const meshRotationY = this._getQuaternionYRotation(spawner.mesh.rotationQuaternion!);

        // Combine spawner mesh Y rotation with relative avatar rotation
        const avatarRotationY = meshRotationY + spawner.relativeAvatarRotationY;

        // Compute camera target from avatar position plus stored offset
        const cameraTarget = avatarPosition.add(spawner.cameraTargetOffset);

        return {
            avatarPosition,
            avatarRotationY,
            cameraAlpha: spawner.cameraAlpha,
            cameraBeta: spawner.cameraBeta,
            cameraRadius: spawner.cameraRadius,
            cameraTarget
        };
    }

    /**
     * Dispose all spawners and cleanup.
     * Disposes each spawner's mesh and clears the collection.
     */
    public dispose(): void {
        for (const spawner of this._spawners) {
            spawner.mesh.dispose();
        }
        this._spawners = [];
    }

    /**
     * Extract the Y-axis rotation (yaw) from a quaternion.
     * Returns the rotation angle around the Y axis in radians.
     */
    private _getQuaternionYRotation(quaternion: Quaternion): number {
        // Convert quaternion to Euler angles and extract Y
        const euler = quaternion.toEulerAngles();
        return euler.y;
    }
}
