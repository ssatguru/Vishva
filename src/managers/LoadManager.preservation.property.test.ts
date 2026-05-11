import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: world-load-clear-scene, Property 2: Preservation - Non-World-Load Operations Unchanged
 *
 * For any input where the operation is NOT a local file world load into a non-empty scene
 * (individual asset uploads, server-based loading, error cases), the code SHALL produce
 * exactly the same behavior as the original code, preserving all existing functionality.
 *
 * These tests run on UNFIXED code and MUST PASS — they capture baseline behavior to preserve.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

// Mock BabylonJS SceneLoader before importing LoadManager
vi.mock("babylonjs", () => {
    return {
        SceneLoader: {
            ShowLoadingScreen: false,
            Append: vi.fn(),
            ImportMesh: vi.fn(),
            LoadAssetContainer: vi.fn(),
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
        AssetsManager: class AssetsManager {
            tasks: any[] = [];
            addTextFileTask(name: string, url: string) {
                const task = { name, url, onSuccess: null as any, onError: null as any };
                this.tasks.push(task);
                return task;
            }
            load() {
                // no-op in tests
            }
        },
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
        isPickable: false,
        parent: null,
        checkCollisions: false,
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
    const meshes = Array.from({ length: meshCount }, (_, i) => createMockMesh(`existing_mesh_${i}`));
    const materials = Array.from({ length: materialCount }, (_, i) => createMockMaterial(`existing_mat_${i}`));
    const lights = Array.from({ length: lightCount }, (_, i) => createMockLight(`existing_light_${i}`));
    const textures = Array.from({ length: textureCount }, (_, i) => createMockTexture(`existing_tex_${i}`));

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
        loadBabylonjsPart: vi.fn(),
        cc: null,
        GrndSpreads: [],
    };

    return { vishva, scene, meshes, materials, lights, textures };
}

describe("Property 2: Preservation - Non-World-Load Operations Unchanged", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Arbitrary for generating initial scene states with varying content counts.
     */
    const sceneStateArb = fc.record({
        meshCount: fc.integer({ min: 1, max: 10 }),
        materialCount: fc.integer({ min: 1, max: 5 }),
        lightCount: fc.integer({ min: 1, max: 3 }),
        textureCount: fc.integer({ min: 0, max: 5 }),
    });

    /**
     * Arbitrary for generating random archive contents that are MISSING Vishva.json.
     * These archives have random keys but never include "Vishva.json".
     */
    const archiveMissingVishvaJsonArb = fc.array(
        fc.record({
            key: fc.string({ minLength: 1, maxLength: 30 }).filter(
                (k) => k !== "Vishva.json" && k !== "Scene.babylon"
            ),
            value: fc.uint8Array({ minLength: 1, maxLength: 50 }),
        }),
        { minLength: 0, maxLength: 5 }
    ).map((entries) => {
        const map = new Map<string, Uint8Array>();
        // Always include Scene.babylon so only Vishva.json is missing
        map.set("Scene.babylon", new TextEncoder().encode("{}"));
        for (const { key, value } of entries) {
            map.set(key, value);
        }
        return map;
    });

    /**
     * Arbitrary for generating random archive contents that are MISSING Scene.babylon.
     * These archives have random keys but never include "Scene.babylon".
     */
    const archiveMissingSceneBabylonArb = fc.array(
        fc.record({
            key: fc.string({ minLength: 1, maxLength: 30 }).filter(
                (k) => k !== "Vishva.json" && k !== "Scene.babylon"
            ),
            value: fc.uint8Array({ minLength: 1, maxLength: 50 }),
        }),
        { minLength: 0, maxLength: 5 }
    ).map((entries) => {
        const map = new Map<string, Uint8Array>();
        // Always include Vishva.json so only Scene.babylon is missing
        map.set("Vishva.json", new TextEncoder().encode("{}"));
        for (const { key, value } of entries) {
            map.set(key, value);
        }
        return map;
    });

    /**
     * Arbitrary for generating random archive contents missing BOTH required files.
     */
    const archiveMissingBothArb = fc.array(
        fc.record({
            key: fc.string({ minLength: 1, maxLength: 30 }).filter(
                (k) => k !== "Vishva.json" && k !== "Scene.babylon"
            ),
            value: fc.uint8Array({ minLength: 1, maxLength: 50 }),
        }),
        { minLength: 0, maxLength: 5 }
    ).map((entries) => {
        const map = new Map<string, Uint8Array>();
        for (const { key, value } of entries) {
            map.set(key, value);
        }
        return map;
    });

    describe("Requirement 3.3: Invalid archives (missing Vishva.json) leave scene unchanged", () => {
        it("for all archives missing Vishva.json, loadWorldFromFile leaves scene unchanged and shows error", async () => {
            await fc.assert(
                fc.asyncProperty(
                    sceneStateArb,
                    archiveMissingVishvaJsonArb,
                    async ({ meshCount, materialCount, lightCount, textureCount }, invalidArchive) => {
                        vi.clearAllMocks();

                        const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                        const loadManager = new LoadManager(vishva);

                        // Snapshot scene state before loading
                        const meshesBefore = [...scene.meshes];
                        const materialsBefore = [...scene.materials];
                        const lightsBefore = [...scene.lights];
                        const texturesBefore = [...scene.textures];

                        // Mock decompression to succeed
                        (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
                        // Mock extraction to return the invalid archive
                        (loadManager as any)._extractTarArchive = vi.fn().mockResolvedValue(invalidArchive);

                        // Mock alert to capture error message
                        const alertMock = vi.fn();
                        globalThis.alert = alertMock;

                        const mockFile = new File(
                            [new Uint8Array([0x1f, 0x8b])],
                            "test-world.tar.gz",
                            { type: "application/gzip" }
                        );

                        await loadManager.loadWorldFromFile(mockFile);

                        // PRESERVATION: Scene content must be unchanged
                        expect(scene.meshes).toEqual(meshesBefore);
                        expect(scene.materials).toEqual(materialsBefore);
                        expect(scene.lights).toEqual(lightsBefore);
                        expect(scene.textures).toEqual(texturesBefore);

                        // Error should be shown to user
                        expect(alertMock).toHaveBeenCalledWith(
                            expect.stringContaining("missing Vishva.json")
                        );

                        // SceneLoader.Append should NOT have been called
                        expect(SceneLoader.Append).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe("Requirement 3.3: Invalid archives (missing Scene.babylon) leave scene unchanged", () => {
        it("for all archives missing Scene.babylon, loadWorldFromFile leaves scene unchanged and shows error", async () => {
            await fc.assert(
                fc.asyncProperty(
                    sceneStateArb,
                    archiveMissingSceneBabylonArb,
                    async ({ meshCount, materialCount, lightCount, textureCount }, invalidArchive) => {
                        vi.clearAllMocks();

                        const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                        const loadManager = new LoadManager(vishva);

                        // Snapshot scene state before loading
                        const meshesBefore = [...scene.meshes];
                        const materialsBefore = [...scene.materials];
                        const lightsBefore = [...scene.lights];
                        const texturesBefore = [...scene.textures];

                        // Mock decompression to succeed
                        (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
                        // Mock extraction to return the invalid archive
                        (loadManager as any)._extractTarArchive = vi.fn().mockResolvedValue(invalidArchive);

                        // Mock alert to capture error message
                        const alertMock = vi.fn();
                        globalThis.alert = alertMock;

                        const mockFile = new File(
                            [new Uint8Array([0x1f, 0x8b])],
                            "test-world.tar.gz",
                            { type: "application/gzip" }
                        );

                        await loadManager.loadWorldFromFile(mockFile);

                        // PRESERVATION: Scene content must be unchanged
                        expect(scene.meshes).toEqual(meshesBefore);
                        expect(scene.materials).toEqual(materialsBefore);
                        expect(scene.lights).toEqual(lightsBefore);
                        expect(scene.textures).toEqual(texturesBefore);

                        // Error should be shown to user
                        expect(alertMock).toHaveBeenCalledWith(
                            expect.stringContaining("missing Scene.babylon")
                        );

                        // SceneLoader.Append should NOT have been called
                        expect(SceneLoader.Append).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe("Requirement 3.3: Invalid archives (missing both) leave scene unchanged", () => {
        it("for all archives missing both required files, loadWorldFromFile leaves scene unchanged and shows error", async () => {
            await fc.assert(
                fc.asyncProperty(
                    sceneStateArb,
                    archiveMissingBothArb,
                    async ({ meshCount, materialCount, lightCount, textureCount }, invalidArchive) => {
                        vi.clearAllMocks();

                        const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                        const loadManager = new LoadManager(vishva);

                        // Snapshot scene state before loading
                        const meshesBefore = [...scene.meshes];
                        const materialsBefore = [...scene.materials];
                        const lightsBefore = [...scene.lights];
                        const texturesBefore = [...scene.textures];

                        // Mock decompression to succeed
                        (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
                        // Mock extraction to return the invalid archive
                        (loadManager as any)._extractTarArchive = vi.fn().mockResolvedValue(invalidArchive);

                        // Mock alert to capture error message
                        const alertMock = vi.fn();
                        globalThis.alert = alertMock;

                        const mockFile = new File(
                            [new Uint8Array([0x1f, 0x8b])],
                            "test-world.tar.gz",
                            { type: "application/gzip" }
                        );

                        await loadManager.loadWorldFromFile(mockFile);

                        // PRESERVATION: Scene content must be unchanged
                        expect(scene.meshes).toEqual(meshesBefore);
                        expect(scene.materials).toEqual(materialsBefore);
                        expect(scene.lights).toEqual(lightsBefore);
                        expect(scene.textures).toEqual(texturesBefore);

                        // Error should be shown to user (either missing file)
                        expect(alertMock).toHaveBeenCalled();

                        // SceneLoader.Append should NOT have been called
                        expect(SceneLoader.Append).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe("Requirement 3.4: Decompression failure leaves scene intact", () => {
        it("for all scene states, decompression failure leaves scene unchanged and shows error", async () => {
            await fc.assert(
                fc.asyncProperty(
                    sceneStateArb,
                    async ({ meshCount, materialCount, lightCount, textureCount }) => {
                        vi.clearAllMocks();

                        const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                        const loadManager = new LoadManager(vishva);

                        // Snapshot scene state before loading
                        const meshesBefore = [...scene.meshes];
                        const materialsBefore = [...scene.materials];
                        const lightsBefore = [...scene.lights];
                        const texturesBefore = [...scene.textures];

                        // Mock decompression to FAIL
                        (loadManager as any)._decompressGzip = vi.fn().mockRejectedValue(
                            new Error("Decompression failed: invalid gzip data")
                        );

                        // Mock alert to capture error message
                        const alertMock = vi.fn();
                        globalThis.alert = alertMock;

                        const mockFile = new File(
                            [new Uint8Array([0x00, 0x00])], // invalid gzip data
                            "corrupted-world.tar.gz",
                            { type: "application/gzip" }
                        );

                        await loadManager.loadWorldFromFile(mockFile);

                        // PRESERVATION: Scene content must be unchanged
                        expect(scene.meshes).toEqual(meshesBefore);
                        expect(scene.materials).toEqual(materialsBefore);
                        expect(scene.lights).toEqual(lightsBefore);
                        expect(scene.textures).toEqual(texturesBefore);

                        // Error should be shown to user
                        // With page-reload strategy, validateWorldFile catches decompression errors
                        expect(alertMock).toHaveBeenCalledWith(
                            expect.stringContaining("Not a valid Vishva world file")
                        );

                        // SceneLoader.Append should NOT have been called
                        expect(SceneLoader.Append).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe("Requirement 3.2: Individual asset loading appends without clearing", () => {
        /**
         * Arbitrary for generating supported file extensions for individual assets.
         */
        const assetExtensionArb = fc.constantFrom("glb", "gltf", "obj", "babylon", "stl");

        it("for all non-tar.gz file inputs, loadDroppedAsset appends to scene without clearing", async () => {
            await fc.assert(
                fc.asyncProperty(
                    sceneStateArb,
                    assetExtensionArb,
                    async ({ meshCount, materialCount, lightCount, textureCount }, extension) => {
                        vi.clearAllMocks();

                        const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                        const loadManager = new LoadManager(vishva);

                        // Snapshot scene state before loading
                        const meshCountBefore = scene.meshes.length;
                        const materialCountBefore = scene.materials.length;
                        const lightCountBefore = scene.lights.length;
                        const textureCountBefore = scene.textures.length;

                        // Mock URL.createObjectURL and URL.revokeObjectURL
                        globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
                        globalThis.URL.revokeObjectURL = vi.fn();

                        // Track that SceneLoader.ImportMesh is called (appending behavior)
                        (SceneLoader.ImportMesh as any).mockImplementation(
                            (_names: any, _url: string, _sceneFilename: string, _scene: any, onSuccess: Function) => {
                                // Simulate adding new meshes to the scene (append behavior)
                                const newMesh = createMockMesh(`imported_${extension}_mesh`);
                                scene.meshes.push(newMesh);
                                if (onSuccess) {
                                    onSuccess([newMesh], [], [], []);
                                }
                            }
                        );

                        // Mock the onMeshLoaded to avoid complex post-processing
                        (loadManager as any).onMeshLoaded = vi.fn();

                        const mockFile = new File(
                            [new Uint8Array([1, 2, 3])],
                            `my-asset.${extension}`,
                            { type: "application/octet-stream" }
                        );

                        loadManager.loadDroppedAsset(mockFile);

                        // PRESERVATION: SceneLoader.ImportMesh should be called (append, not replace)
                        expect(SceneLoader.ImportMesh).toHaveBeenCalled();

                        // PRESERVATION: Existing scene content should still be present
                        // (meshes are only added, never removed)
                        expect(scene.meshes.length).toBeGreaterThanOrEqual(meshCountBefore);
                        expect(scene.materials.length).toBe(materialCountBefore);
                        expect(scene.lights.length).toBe(lightCountBefore);
                        expect(scene.textures.length).toBe(textureCountBefore);

                        // PRESERVATION: No dispose was called on existing meshes
                        for (let i = 0; i < meshCountBefore; i++) {
                            expect(scene.meshes[i].dispose).not.toHaveBeenCalled();
                        }
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe("Requirement 3.1: sceneLoad1/loadZipWorld do not call any clearing logic", () => {
        it("sceneLoad1 with non-compressed file does not clear scene content", () => {
            const { vishva, scene } = createMockVishva(5, 3, 2, 2);
            const loadManager = new LoadManager(vishva);

            // Snapshot scene state
            const meshesBefore = [...scene.meshes];
            const materialsBefore = [...scene.materials];
            const lightsBefore = [...scene.lights];
            const texturesBefore = [...scene.textures];

            // Call sceneLoad1 with a non-compressed file
            loadManager.sceneLoad1("/worlds/", "myworld.js", scene as any);

            // PRESERVATION: Scene content must be unchanged (no clearing happened)
            expect(scene.meshes).toEqual(meshesBefore);
            expect(scene.materials).toEqual(materialsBefore);
            expect(scene.lights).toEqual(lightsBefore);
            expect(scene.textures).toEqual(texturesBefore);

            // No dispose was called on any existing mesh
            for (const mesh of meshesBefore) {
                expect(mesh.dispose).not.toHaveBeenCalled();
            }
        });

        it("sceneLoad1 with compressed .gz file does not clear scene content before loading", async () => {
            const { vishva, scene } = createMockVishva(4, 2, 1, 3);
            const loadManager = new LoadManager(vishva);

            // Snapshot scene state
            const meshesBefore = [...scene.meshes];
            const materialsBefore = [...scene.materials];
            const lightsBefore = [...scene.lights];

            // Mock fetch for loadZipWorld
            const mockResponse = {
                ok: true,
                blob: vi.fn().mockResolvedValue(new Blob([new Uint8Array([0x1f, 0x8b])])),
            };
            globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

            // Mock decompression and extraction
            (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

            const validArchive = new Map<string, Uint8Array>();
            const encoder = new TextEncoder();
            validArchive.set("Vishva.json", encoder.encode(JSON.stringify({
                bVer: "8.0", vVer: "1.0", snas: [],
                settings: { cameraCollision: false, autoEditMenu: false },
                misc: {}, avSerialized: { settings: { ellipsoid: null, ellipsoidOffset: null } },
                objectIds: null, meshMetadata: {},
            })));
            validArchive.set("Scene.babylon", encoder.encode(JSON.stringify({ meshes: [], materials: [], lights: [] })));
            (loadManager as any)._extractTarArchive = vi.fn().mockResolvedValue(validArchive);

            // Mock SceneLoader.Append to track calls
            (SceneLoader.Append as any).mockImplementation(
                (_rootUrl: string, _sceneData: string, sceneRef: any, onSuccess: Function) => {
                    if (onSuccess) onSuccess(sceneRef);
                }
            );

            // Mock _loadWorldFromIndexedDB to return null (not found)
            (loadManager as any)._loadWorldFromIndexedDB = vi.fn().mockResolvedValue(null);

            // Call sceneLoad1 with a compressed file
            loadManager.sceneLoad1("/worlds/", "myworld.tar.gz", scene as any);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            // PRESERVATION: No dispose was called on any existing mesh
            // (server-based loading at startup doesn't clear because scene is assumed empty)
            for (const mesh of meshesBefore) {
                expect(mesh.dispose).not.toHaveBeenCalled();
            }

            // PRESERVATION: Existing materials and lights were not disposed
            for (const mat of materialsBefore) {
                expect(mat.dispose).not.toHaveBeenCalled();
            }
            for (const light of lightsBefore) {
                expect(light.dispose).not.toHaveBeenCalled();
            }
        });
    });

    describe("Requirement 3.4: TAR extraction failure leaves scene intact", () => {
        it("for all scene states, extraction failure leaves scene unchanged and shows error", async () => {
            await fc.assert(
                fc.asyncProperty(
                    sceneStateArb,
                    async ({ meshCount, materialCount, lightCount, textureCount }) => {
                        vi.clearAllMocks();

                        const { vishva, scene } = createMockVishva(meshCount, materialCount, lightCount, textureCount);
                        const loadManager = new LoadManager(vishva);

                        // Snapshot scene state before loading
                        const meshesBefore = [...scene.meshes];
                        const materialsBefore = [...scene.materials];
                        const lightsBefore = [...scene.lights];
                        const texturesBefore = [...scene.textures];

                        // Mock decompression to succeed
                        (loadManager as any)._decompressGzip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
                        // Mock extraction to FAIL
                        (loadManager as any)._extractTarArchive = vi.fn().mockRejectedValue(
                            new Error("Invalid TAR archive: unexpected end of data")
                        );

                        // Mock alert to capture error message
                        const alertMock = vi.fn();
                        globalThis.alert = alertMock;

                        const mockFile = new File(
                            [new Uint8Array([0x1f, 0x8b])],
                            "broken-archive.tar.gz",
                            { type: "application/gzip" }
                        );

                        await loadManager.loadWorldFromFile(mockFile);

                        // PRESERVATION: Scene content must be unchanged
                        expect(scene.meshes).toEqual(meshesBefore);
                        expect(scene.materials).toEqual(materialsBefore);
                        expect(scene.lights).toEqual(lightsBefore);
                        expect(scene.textures).toEqual(texturesBefore);

                        // Error should be shown to user
                        // With page-reload strategy, validateWorldFile catches extraction errors
                        expect(alertMock).toHaveBeenCalledWith(
                            expect.stringContaining("Not a valid Vishva world file")
                        );

                        // SceneLoader.Append should NOT have been called
                        expect(SceneLoader.Append).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 30 }
            );
        });
    });
});
