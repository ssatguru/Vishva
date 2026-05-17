import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NullEngine, Scene, Tags, Vector3, Mesh } from "babylonjs";
import { SpawnerManager } from "./SpawnerManager.js";
import { SpawnerMeshFactory } from "./SpawnerMeshFactory.js";
import { SpawnerSerialized } from "./SpawnerSerialized.js";

/**
 * Unit tests for SpawnerManager and SpawnerMeshFactory.
 *
 * Validates: Requirements 1.2, 1.3, 2.1, 2.6, 5.6, 6.5, 7.2, 7.3, 8.1, 8.2
 */

describe("SpawnerManager", () => {
    let engine: NullEngine;
    let scene: Scene;
    let manager: SpawnerManager;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        manager = new SpawnerManager(scene);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    describe("SpawnerMeshFactory", () => {
        it("should create mesh with ≤20 triangles", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            const indices = mesh.getIndices();
            expect(indices).not.toBeNull();
            const triangleCount = indices!.length / 3;
            expect(triangleCount).toBeLessThanOrEqual(20);
            mesh.dispose();
        });

        it("should create mesh with ≤0.05 Y-axis thickness", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            mesh.computeWorldMatrix(true);
            const boundingInfo = mesh.getBoundingInfo();
            const yMin = boundingInfo.boundingBox.minimumWorld.y;
            const yMax = boundingInfo.boundingBox.maximumWorld.y;
            const yThickness = yMax - yMin;
            expect(yThickness).toBeLessThanOrEqual(0.05);
            mesh.dispose();
        });

        it("should set isInternal metadata to true", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            expect(mesh.metadata).not.toBeNull();
            expect(mesh.metadata.isInternal).toBe(true);
            mesh.dispose();
        });

        it("should set isInvisible metadata to true", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            expect(mesh.metadata).not.toBeNull();
            expect(mesh.metadata.isInvisible).toBe(true);
            mesh.dispose();
        });

        it("should add Vishva.internal and invisible tags", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            expect(Tags.HasTags(mesh)).toBe(true);
            expect(Tags.MatchesQuery(mesh, "Vishva.internal")).toBe(true);
            expect(Tags.MatchesQuery(mesh, "invisible")).toBe(true);
            mesh.dispose();
        });

        it("should be non-pickable by default", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            expect(mesh.isPickable).toBe(false);
            mesh.dispose();
        });

        it("should be invisible by default", () => {
            const mesh = SpawnerMeshFactory.createArrowMesh(scene, "test_arrow");
            expect(mesh.isVisible).toBe(false);
            mesh.dispose();
        });
    });

    describe("createSpawner", () => {
        it("should place mesh at avatar ground-level position", () => {
            const avatarPosition = new Vector3(5, 3, 7);
            const avatarRotationY = 0;
            const ellipsoidHeight = 0.8;
            const cameraAlpha = -1.57;
            const cameraBeta = 1.4;
            const cameraRadius = 4;
            const cameraTarget = new Vector3(5, 4.5, 7);

            const spawner = manager.createSpawner(
                avatarPosition, avatarRotationY, ellipsoidHeight,
                cameraAlpha, cameraBeta, cameraRadius, cameraTarget
            );

            // Mesh should be at avatar position (avatar mesh origin is already at feet)
            expect(spawner.mesh.position.x).toBeCloseTo(avatarPosition.x, 4);
            expect(spawner.mesh.position.y).toBeCloseTo(avatarPosition.y, 4);
            expect(spawner.mesh.position.z).toBeCloseTo(avatarPosition.z, 4);
        });

        it("should orient mesh to match avatar Y rotation", () => {
            const avatarPosition = new Vector3(0, 2, 0);
            const avatarRotationY = Math.PI / 4; // 45 degrees
            const ellipsoidHeight = 0.8;
            const cameraAlpha = -1.57;
            const cameraBeta = 1.4;
            const cameraRadius = 4;
            const cameraTarget = new Vector3(0, 3, 0);

            const spawner = manager.createSpawner(
                avatarPosition, avatarRotationY, ellipsoidHeight,
                cameraAlpha, cameraBeta, cameraRadius, cameraTarget
            );

            // The mesh should have a rotation quaternion set
            expect(spawner.mesh.rotationQuaternion).not.toBeNull();

            // Extract Y rotation from the quaternion — includes π offset for RHS alignment
            const euler = spawner.mesh.rotationQuaternion!.toEulerAngles();
            // The mesh rotation is avatarRotationY + π (wrapped to [-π, π])
            const expectedRotation = avatarRotationY + Math.PI;
            // Normalize both to compare (handle wrapping)
            const diff = Math.abs(euler.y - expectedRotation) % (2 * Math.PI);
            const normalizedDiff = Math.min(diff, 2 * Math.PI - diff);
            expect(normalizedDiff).toBeCloseTo(0, 4);
        });
    });

    describe("deserialize", () => {
        it("should discard spawner with missing mesh ID and log warning", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const data: SpawnerSerialized[] = [
                {
                    meshId: "nonexistent_mesh_id",
                    relativeAvatarPosition: { x: 0, y: 0.8, z: 0 },
                    relativeAvatarRotationY: 0,
                    cameraAlpha: -1.57,
                    cameraBeta: 1.4,
                    cameraRadius: 4,
                    cameraTargetOffset: { x: 0, y: 1.5, z: 0 }
                }
            ];

            manager.deserialize(data, scene);

            expect(manager.getSpawners()).toHaveLength(0);
            expect(warnSpy).toHaveBeenCalledWith(
                "Spawner references missing mesh: nonexistent_mesh_id, discarding"
            );

            warnSpy.mockRestore();
        });

        it("should reconstruct spawner with valid mesh ID", () => {
            // Create a mesh in the scene that can be found by ID
            const mesh = new Mesh("valid_spawner_mesh", scene);
            mesh.id = "valid_spawner_mesh_id";

            const data: SpawnerSerialized[] = [
                {
                    meshId: "valid_spawner_mesh_id",
                    relativeAvatarPosition: { x: 1, y: 0.8, z: 2 },
                    relativeAvatarRotationY: 0.5,
                    cameraAlpha: -1.57,
                    cameraBeta: 1.4,
                    cameraRadius: 4,
                    cameraTargetOffset: { x: 0, y: 1.5, z: 0 }
                }
            ];

            manager.deserialize(data, scene);

            const spawners = manager.getSpawners();
            expect(spawners).toHaveLength(1);
            expect(spawners[0].mesh).toBe(mesh);
            expect(spawners[0].relativeAvatarPosition.x).toBeCloseTo(1, 4);
            expect(spawners[0].relativeAvatarPosition.y).toBeCloseTo(0.8, 4);
            expect(spawners[0].relativeAvatarPosition.z).toBeCloseTo(2, 4);
            expect(spawners[0].relativeAvatarRotationY).toBeCloseTo(0.5, 4);
            expect(spawners[0].cameraAlpha).toBeCloseTo(-1.57, 4);
            expect(spawners[0].cameraBeta).toBeCloseTo(1.4, 4);
            expect(spawners[0].cameraRadius).toBeCloseTo(4, 4);
            expect(spawners[0].cameraTargetOffset.x).toBeCloseTo(0, 4);
            expect(spawners[0].cameraTargetOffset.y).toBeCloseTo(1.5, 4);
            expect(spawners[0].cameraTargetOffset.z).toBeCloseTo(0, 4);

            mesh.dispose();
        });
    });

    describe("selectRandom", () => {
        it("should return null when collection is empty", () => {
            const result = manager.selectRandom();
            expect(result).toBeNull();
        });

        it("should return a valid spawner from non-empty collection", () => {
            const spawner = manager.createSpawner(
                new Vector3(0, 2, 0), 0, 0.8,
                -1.57, 1.4, 4, new Vector3(0, 3, 0)
            );

            const result = manager.selectRandom();
            expect(result).not.toBeNull();
            expect(result).toBe(spawner);
        });
    });

    describe("removeSpawner", () => {
        it("should remove spawner when mesh is disposed", () => {
            const spawner = manager.createSpawner(
                new Vector3(0, 2, 0), 0, 0.8,
                -1.57, 1.4, 4, new Vector3(0, 3, 0)
            );

            expect(manager.getSpawners()).toHaveLength(1);

            // Disposing the mesh should trigger auto-removal via onDispose observable
            spawner.mesh.dispose();

            expect(manager.getSpawners()).toHaveLength(0);
        });
    });

    describe("default spawn behavior", () => {
        it("should have empty spawner collection when no spawners exist", () => {
            // When no spawners exist, selectRandom returns null
            // The caller (LoadManager) should then use default position (0, 0.2, 0)
            expect(manager.getSpawners()).toHaveLength(0);
            expect(manager.selectRandom()).toBeNull();
        });
    });

    describe("legacy fallback and override", () => {
        it("should use spawner system when spawners exist (legacy override)", () => {
            // Create a spawner - this simulates a world with spawners present
            const spawner = manager.createSpawner(
                new Vector3(10, 5, 10), 1.0, 0.8,
                -1.57, 1.4, 4, new Vector3(10, 6.5, 10)
            );

            // When spawners exist, selectRandom should return a valid spawner
            const selected = manager.selectRandom();
            expect(selected).not.toBeNull();
            expect(selected).toBe(spawner);

            // The computed spawn transform should NOT be the default (0, 0.2, 0)
            const result = manager.computeSpawnTransform(selected!);
            expect(result.avatarPosition.x).not.toBeCloseTo(0, 1);
            expect(result.avatarPosition.z).not.toBeCloseTo(0, 1);
        });

        it("should fall back to default when no spawners exist (legacy fallback scenario)", () => {
            // When no spawners exist, selectRandom returns null
            // The LoadManager should then check for legacy spawnPointId
            // and if that also doesn't exist, use default (0, 0.2, 0)
            const selected = manager.selectRandom();
            expect(selected).toBeNull();
            // This confirms the spawner system correctly signals "no spawners"
            // so the caller can fall back to legacy or default behavior
        });
    });
});
