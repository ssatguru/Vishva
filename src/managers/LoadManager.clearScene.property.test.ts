import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: world-load-clear-scene, Property 1: Bug Condition - Scene Content Accumulates on World Load
 *
 * For any scene that already contains meshes, materials, lights, and textures,
 * when loadWorldFromFile is called with a valid .tar.gz world file, the resulting
 * scene should contain ONLY the new world's content — no remnants of the old scene.
 *
 * CRITICAL: This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * Bug Condition: isBugCondition(input) = isTarGzFile(input.file.name)
 *   AND input.currentScene.meshes.length > 0
 *   AND loadPathIsLocalFile(input)
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

// Mock BabylonJS SceneLoader before importing LoadManager
vi.mock("babylonjs", () => {
    return {
        SceneLoader: {
            ShowLoadingScreen: false,
            Append: vi.fn(),
        },
        Vector3: class Vector3 {
            constructor(public x = 0, public y = 0, public z = 0) {}
        },
        Color3: class Color3 {
            constructor(public r = 0, public g = 0, public b = 0) {}
        },
        Tags: { HasTags: vi.fn(() => false), GetTags: vi.fn(() => "") },
        Mesh: class Mesh {},
        AbstractMesh: class AbstractMesh {},
        Material: class Material {},
        StandardMaterial: class StandardMaterial {},
        MultiMaterial: class MultiMaterial {},
        Skeleton: class Skeleton {},
        AnimationGroup: class AnimationGroup {},
        TransformNode: class TransformNode {},
        Matrix: { Identity: () => ({}) },
        Quaternion: { Identity: () => ({}) },
        BoundingInfo: class BoundingInfo {},
        VertexBuffer: {},
        InstancedMesh: class InstancedMesh {},
        Tools: { ToRadians: (d: number) => d * Math.PI / 180 },
        AssetsManager: class AssetsManager {},
        AssetContainer: class AssetContainer {},
        Scene: class Scene {},
    };
});

vi.mock("../VishvaSerialized", () => ({
    VishvaSerialized: class VishvaSerialized {
        bVer = "";
        vVer = "";
        snas = [];
        settings = { cameraCollision: false, autoEditMenu: false };
        misc = {};
        avSerialized = { settings: { ellipsoid: null, ellipsoidOffset: null } };
        objectIds = null;
        meshMetadata = {};
    },
    ObjectIdMap: class ObjectIdMap {},
    MeshMetadataMap: class MeshMetadataMap {},
}));

vi.mock("../sna/SNA", () => ({
    SNAManager: { getSNAManager: () => ({ removeSNAs: vi.fn() }) },
}));

vi.mock("../eventing/VEvent", () => ({ VEvent: {} }));
vi.mock("../eventing/EventManager", () => ({ EventManager: { publish: vi.fn() } }));
vi.mock("./AssetResolver", () => ({
    AssetResolver: class AssetResolver {
        activate() {}
        deactivate() {}
    },
}));
vi.mock("./TarUtils", () => ({
    extractTarArchive: vi.fn(),
}));
vi.mock("./FileValidator", () => ({
    isTarGzFile: (name: string) => /\.tar\.gz$/i.test(name),
}));

import { LoadManager } from "./LoadManager.js";
import { SceneLoader } from "babylonjs";

/**
 * Creates a mock mesh object with a dispose method.
 */
function createMockMesh(name: string) {
    return {
        name,
        id: name,
        dispose: vi.fn(),
        material: null,
        skeleton: null,
        metadata: null,
    };
}

/**
 * Creates a mock material object with a dispose method.
 */
function createMockMaterial(name: string) {
    return { name, id: name, dispose: vi.fn() };
}

/**
 * Creates a mock light object with a dispose method.
 */
function createMockLight(name: string) {
    return { name, id: name, dispose: vi.fn() };
}

/**
 * Creates a mock texture object with a dispose method.
 */
function createMockTexture(name: string) {
    return { name, dispose: vi.fn() };
}

/**
 * Creates a mock Vishva instance with a scene containing the specified
 * number of pre-existing meshes, materials, lights, and textures.
 */
function createMockVishva(meshCount: number, materialCount: number, lightCount: number, textureCount: number) {
    const meshes = Array.from({ length: meshCount }, (_, i) => createMockMesh(`old_mesh_${i}`));
    const materials = Array.from({ length: materialCount }, (_, i) => createMockMaterial(`old_mat_${i}`));
    const lights = Array.from({ length: lightCount }, (_, i) => createMockLight(`old_light_${i}`));
    const textures = Array.from({ length: textureCount }, (_, i) => createMockTexture(`old_tex_${i}`));

    const scene = {
        meshes: [...meshes],
        materials: [...materials],
        lights: [...lights],
        textures: [...textures],
        skeletons: [],
        particleSystems: [],
        animationGroups: [],
        shadowsEnabled: true,
        executeWhenReady: vi.fn((cb: Function) => cb()),
    };

    const vishva = {
        scene,
        progressManager: {
            show: vi.fn(),
            update: vi.fn(),
            hide: vi.fn(),
        },
        vishvaSerialized: null,
        snas: [],
        _cameraCollision: false,
        autoEditMenu: false,
        skyColor: { r: 0, g: 0, b: 0, a: 1 },
        skyBright: 1,
        _objectIds: null,
        _meshMetadata: {},
        loadBabylonjsPart: vi.fn((s: any) => {
            // Simulate loadBabylonjsPart adding new world content
            // In reality this is called by SceneLoader.Append callback
        }),
        cc: null,
        GrndSpreads: [],
    };

    return { vishva, scene, meshes, materials, lights, textures };
}

describe("Property 1: Bug Condition - Scene Content Accumulates on World Load", () => {
    // Number of new meshes that the loaded world will add
    const NEW_MESH_COUNT = 3;
    const NEW_MATERIAL_COUNT = 2;
    const NEW_LIGHT_COUNT = 1;

    // Valid Vishva.json content for the archive
    const validVishvaJson = JSON.stringify({
        bVer: "8.0",
        vVer: "1.0",
        snas: [],
        settings: { cameraCollision: false, autoEditMenu: false },
        misc: {},
        avSerialized: { settings: { ellipsoid: null, ellipsoidOffset: null } },
        objectIds: null,
        meshMetadata: {},
    });

    // Valid Scene.babylon content for the archive
    const validSceneJson = JSON.stringify({
        meshes: Array.from({ length: NEW_MESH_COUNT }, (_, i) => ({ name: `new_mesh_${i}`, id: `new_mesh_${i}` })),
        materials: Array.from({ length: NEW_MATERIAL_COUNT }, (_, i) => ({ name: `new_mat_${i}`, id: `new_mat_${i}` })),
        lights: Array.from({ length: NEW_LIGHT_COUNT }, (_, i) => ({ name: `new_light_${i}`, id: `new_light_${i}` })),
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Arbitrary for generating initial scene states with varying content counts.
     * meshCount: 1-10, materialCount: 1-5, lightCount: 1-3, textureCount: 0-5
     */
    const sceneStateArb = fc.record({
        meshCount: fc.integer({ min: 1, max: 10 }),
        materialCount: fc.integer({ min: 1, max: 5 }),
        lightCount: fc.integer({ min: 1, max: 3 }),
        textureCount: fc.integer({ min: 0, max: 5 }),
    });

    it("scene should contain ONLY new world content after loadWorldFromFile (no old meshes/materials/lights remain)", async () => {
        await fc.assert(
            fc.asyncProperty(sceneStateArb, async ({ meshCount, materialCount, lightCount, textureCount }) => {
                vi.clearAllMocks();

                const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                const loadManager = new LoadManager(vishva);

                // Track the scene state at the moment SceneLoader.Append is called
                let sceneStateAtAppendTime: {
                    meshCount: number;
                    materialCount: number;
                    lightCount: number;
                    textureCount: number;
                } | null = null;

                // Mock SceneLoader.Append to capture scene state and simulate adding new meshes
                (SceneLoader.Append as any).mockImplementation(
                    (_rootUrl: string, _sceneData: string, sceneRef: any, onSuccess: Function) => {
                        // Capture the scene state at the time Append is called
                        sceneStateAtAppendTime = {
                            meshCount: sceneRef.meshes.length,
                            materialCount: sceneRef.materials.length,
                            lightCount: sceneRef.lights.length,
                            textureCount: sceneRef.textures.length,
                        };

                        // Simulate SceneLoader.Append adding new world content
                        for (let i = 0; i < NEW_MESH_COUNT; i++) {
                            sceneRef.meshes.push(createMockMesh(`new_mesh_${i}`));
                        }
                        for (let i = 0; i < NEW_MATERIAL_COUNT; i++) {
                            sceneRef.materials.push(createMockMaterial(`new_mat_${i}`));
                        }
                        for (let i = 0; i < NEW_LIGHT_COUNT; i++) {
                            sceneRef.lights.push(createMockLight(`new_light_${i}`));
                        }

                        // Call the success callback
                        if (onSuccess) {
                            onSuccess(sceneRef);
                        }
                    }
                );

                // Create a valid .tar.gz file mock
                const encoder = new TextEncoder();
                const vishvaBytes = encoder.encode(validVishvaJson);
                const sceneBytes = encoder.encode(validSceneJson);

                const archiveFiles = new Map<string, Uint8Array>();
                archiveFiles.set("Vishva.json", vishvaBytes);
                archiveFiles.set("Scene.babylon", sceneBytes);

                // Mock the internal decompression and extraction methods
                // We need to mock the File's arrayBuffer method and the internal pipeline
                const mockFile = new File(
                    [new Uint8Array([0x1f, 0x8b])], // gzip magic bytes
                    "test-world.tar.gz",
                    { type: "application/gzip" }
                );

                // Override the private methods by mocking the decompression pipeline
                // Since _decompressGzip and _extractTarArchive are private, we mock them
                // by replacing the prototype methods
                const originalDecompress = (loadManager as any)._decompressGzip;
                const originalExtract = (loadManager as any)._extractTarArchive;

                (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
                (loadManager as any)._extractTarArchive = vi.fn().mockResolvedValue(archiveFiles);

                // Mock _storeInIndexedDB to succeed
                (loadManager as any)._storeInIndexedDB = vi.fn().mockResolvedValue(undefined);

                // Mock window.location.search setter (page-reload strategy)
                // With the page-reload approach, loadWorldFromFile does NOT modify the scene.
                // It validates, stores in IndexedDB, and triggers a page reload.
                // The bug is fixed because the scene is loaded fresh on the new page.
                const locationMock = { search: "" };
                Object.defineProperty(globalThis, "window", {
                    value: { location: locationMock },
                    writable: true,
                    configurable: true,
                });

                // Mock alert
                globalThis.alert = vi.fn();

                // Execute loadWorldFromFile
                await loadManager.loadWorldFromFile(mockFile);

                // With the page-reload strategy, the scene is NOT modified in-place.
                // The method validates, stores in IndexedDB, and sets window.location.search.
                // The scene accumulation bug is fixed because loading happens on a fresh page.
                // Verify that the page reload was triggered:
                expect(locationMock.search).toBe("?world=__uploaded");

                // Verify that _storeInIndexedDB was called with the correct key
                expect((loadManager as any)._storeInIndexedDB).toHaveBeenCalledWith("__uploaded", expect.any(ArrayBuffer));

                // SceneLoader.Append should NOT have been called (no in-place loading)
                expect(SceneLoader.Append).not.toHaveBeenCalled();
            }),
            { numRuns: 50 }
        );
    });

    it("counterexample documentation: specific case demonstrating mesh accumulation", async () => {
        // With the page-reload strategy, loadWorldFromFile no longer does in-place loading.
        // It validates, stores in IndexedDB, and triggers a page reload.
        // The bug is fixed because the world loads on a fresh page with clean WebGL context.
        const { vishva, scene } = createMockVishva(5, 2, 1, 3);
        const loadManager = new LoadManager(vishva);

        (SceneLoader.Append as any).mockImplementation(
            (_rootUrl: string, _sceneData: string, sceneRef: any, onSuccess: Function) => {
                for (let i = 0; i < NEW_MESH_COUNT; i++) {
                    sceneRef.meshes.push(createMockMesh(`new_mesh_${i}`));
                }
                for (let i = 0; i < NEW_MATERIAL_COUNT; i++) {
                    sceneRef.materials.push(createMockMaterial(`new_mat_${i}`));
                }
                for (let i = 0; i < NEW_LIGHT_COUNT; i++) {
                    sceneRef.lights.push(createMockLight(`new_light_${i}`));
                }
                if (onSuccess) onSuccess(sceneRef);
            }
        );

        const encoder = new TextEncoder();
        const archiveFiles = new Map<string, Uint8Array>();
        archiveFiles.set("Vishva.json", encoder.encode(validVishvaJson));
        archiveFiles.set("Scene.babylon", encoder.encode(validSceneJson));

        const mockFile = new File(
            [new Uint8Array([0x1f, 0x8b])],
            "my-world.tar.gz",
            { type: "application/gzip" }
        );

        (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
        (loadManager as any)._extractTarArchive = vi.fn().mockResolvedValue(archiveFiles);
        (loadManager as any)._storeInIndexedDB = vi.fn().mockResolvedValue(undefined);

        // Mock window.location for page reload
        const locationMock = { search: "" };
        Object.defineProperty(globalThis, "window", {
            value: { location: locationMock },
            writable: true,
            configurable: true,
        });
        globalThis.alert = vi.fn();

        await loadManager.loadWorldFromFile(mockFile);

        // With page-reload strategy, the scene is NOT modified.
        // The old scene content remains untouched (5 meshes, 2 materials, 1 light, 3 textures).
        // The page reload will load the world fresh.
        expect(scene.meshes.length).toBe(5); // Scene unchanged - no accumulation possible
        expect(scene.materials.length).toBe(2); // Scene unchanged
        expect(scene.lights.length).toBe(1); // Scene unchanged

        // Page reload was triggered
        expect(locationMock.search).toBe("?world=__uploaded");

        // SceneLoader.Append was NOT called (no in-place loading)
        expect(SceneLoader.Append).not.toHaveBeenCalled();
    });
});
