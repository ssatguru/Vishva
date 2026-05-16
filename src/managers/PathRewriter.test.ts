import { describe, it, expect } from "vitest";
import { PathRewriter } from "./PathRewriter.js";
import { AssetEntry } from "./AssetCollector.js";

describe("PathRewriter", () => {
    const rewriter = new PathRewriter();

    function makeEntry(originalUrl: string, archiveFilename: string): AssetEntry {
        return {
            originalUrl,
            fetchUrl: `http://localhost:8080/bin/${originalUrl}`,
            archiveFilename,
        };
    }

    describe("rewrite - basic string replacement", () => {
        it("replaces texture name fields with full structured archive paths", () => {
            const scene: any = {
                textures: [
                    { name: "vishva/assets/textures/ground.jpg", otherProp: 42 },
                    { name: "vishva/assets/textures/sky.png" },
                ],
            };
            const entries = [
                makeEntry("vishva/assets/textures/ground.jpg", "vishva/assets/textures/ground.jpg"),
                makeEntry("vishva/assets/textures/sky.png", "vishva/assets/textures/sky.png"),
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("vishva/assets/textures/ground.jpg");
            expect(scene.textures[1].name).toBe("vishva/assets/textures/sky.png");
        });

        it("replaces texture url fields", () => {
            const scene: any = {
                textures: [{ url: "vishva/assets/textures/diffuse.jpg" }],
            };
            const entries = [makeEntry("vishva/assets/textures/diffuse.jpg", "vishva/assets/textures/diffuse.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].url).toBe("vishva/assets/textures/diffuse.jpg");
        });

        it("replaces material nested texture references", () => {
            const scene: any = {
                materials: [
                    {
                        diffuseTexture: { name: "vishva/assets/textures/diffuse.jpg" },
                        bumpTexture: { name: "vishva/assets/textures/bump.png" },
                    },
                ],
            };
            const entries = [
                makeEntry("vishva/assets/textures/diffuse.jpg", "vishva/assets/textures/diffuse.jpg"),
                makeEntry("vishva/assets/textures/bump.png", "vishva/assets/textures/bump.png"),
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.materials[0].diffuseTexture.name).toBe("vishva/assets/textures/diffuse.jpg");
            expect(scene.materials[0].bumpTexture.name).toBe("vishva/assets/textures/bump.png");
        });

        it("replaces particleSystems[].textureName", () => {
            const scene: any = {
                particleSystems: [{ textureName: "vishva/assets/particles/flare.png" }],
            };
            const entries = [makeEntry("vishva/assets/particles/flare.png", "vishva/assets/particles/flare.png")];

            rewriter.rewrite(scene, entries);

            expect(scene.particleSystems[0].textureName).toBe("vishva/assets/particles/flare.png");
        });

        it("replaces top-level environmentTexture", () => {
            const scene: any = {
                environmentTexture: "vishva/assets/environment/skybox.env",
            };
            const entries = [makeEntry("vishva/assets/environment/skybox.env", "vishva/assets/environment/skybox.env")];

            rewriter.rewrite(scene, entries);

            expect(scene.environmentTexture).toBe("vishva/assets/environment/skybox.env");
        });

        it("replaces reflectionTexture.name", () => {
            const scene: any = {
                reflectionTexture: { name: "vishva/assets/environment/reflection.hdr" },
            };
            const entries = [makeEntry("vishva/assets/environment/reflection.hdr", "vishva/assets/environment/reflection.hdr")];

            rewriter.rewrite(scene, entries);

            expect(scene.reflectionTexture.name).toBe("vishva/assets/environment/reflection.hdr");
        });

        it("replaces meshes[].delayLoadingFile", () => {
            const scene: any = {
                meshes: [{ delayLoadingFile: "vishva/assets/models/tree.babylon" }],
            };
            const entries = [makeEntry("vishva/assets/models/tree.babylon", "vishva/assets/models/tree.babylon")];

            rewriter.rewrite(scene, entries);

            expect(scene.meshes[0].delayLoadingFile).toBe("vishva/assets/models/tree.babylon");
        });
    });

    describe("rewrite - data URI replacement", () => {
        it("replaces data URI strings with structured archive paths", () => {
            const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
            const scene: any = {
                textures: [{ name: dataUri }],
            };
            const entries: AssetEntry[] = [
                {
                    originalUrl: dataUri,
                    fetchUrl: dataUri,
                    archiveFilename: "vishva/assets/data/data_asset.png",
                    decodedData: new Uint8Array([1, 2, 3]),
                },
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("vishva/assets/data/data_asset.png");
        });

        it("replaces long data URIs in deeply nested objects", () => {
            const dataUri = "data:image/jpeg;base64," + "A".repeat(1000);
            const scene: any = {
                materials: [
                    {
                        diffuseTexture: { name: dataUri },
                    },
                ],
            };
            const entries: AssetEntry[] = [
                {
                    originalUrl: dataUri,
                    fetchUrl: dataUri,
                    archiveFilename: "vishva/assets/data/data_asset.jpg",
                    decodedData: new Uint8Array([4, 5, 6]),
                },
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.materials[0].diffuseTexture.name).toBe("vishva/assets/data/data_asset.jpg");
        });
    });

    describe("rewrite - deep traversal", () => {
        it("replaces URLs at arbitrary nesting depth", () => {
            const scene: any = {
                level1: {
                    level2: {
                        level3: {
                            someUrl: "vishva/assets/textures/deep.jpg",
                        },
                    },
                },
            };
            const entries = [makeEntry("vishva/assets/textures/deep.jpg", "vishva/assets/textures/deep.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.level1.level2.level3.someUrl).toBe("vishva/assets/textures/deep.jpg");
        });

        it("replaces URLs inside arrays at arbitrary depth", () => {
            const scene: any = {
                items: [
                    { nested: [{ url: "vishva/assets/textures/array.jpg" }] },
                ],
            };
            const entries = [makeEntry("vishva/assets/textures/array.jpg", "vishva/assets/textures/array.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.items[0].nested[0].url).toBe("vishva/assets/textures/array.jpg");
        });

        it("replaces string values directly in arrays", () => {
            const scene: any = {
                urls: ["vishva/assets/textures/a.jpg", "vishva/assets/textures/b.jpg", "not-a-url"],
            };
            const entries = [
                makeEntry("vishva/assets/textures/a.jpg", "vishva/assets/textures/a.jpg"),
                makeEntry("vishva/assets/textures/b.jpg", "vishva/assets/textures/b.jpg"),
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.urls[0]).toBe("vishva/assets/textures/a.jpg");
            expect(scene.urls[1]).toBe("vishva/assets/textures/b.jpg");
            expect(scene.urls[2]).toBe("not-a-url");
        });

        it("replaces the same URL appearing in multiple locations", () => {
            const scene: any = {
                textures: [{ name: "vishva/assets/textures/shared.jpg" }],
                materials: [
                    { diffuseTexture: { name: "vishva/assets/textures/shared.jpg" } },
                ],
                other: { ref: "vishva/assets/textures/shared.jpg" },
            };
            const entries = [makeEntry("vishva/assets/textures/shared.jpg", "vishva/assets/textures/shared.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("vishva/assets/textures/shared.jpg");
            expect(scene.materials[0].diffuseTexture.name).toBe("vishva/assets/textures/shared.jpg");
            expect(scene.other.ref).toBe("vishva/assets/textures/shared.jpg");
        });
    });

    describe("rewrite - edge cases", () => {
        it("does nothing with empty asset entries", () => {
            const scene: any = { textures: [{ name: "vishva/assets/textures/ground.jpg" }] };
            const original = JSON.parse(JSON.stringify(scene));

            rewriter.rewrite(scene, []);

            expect(scene).toEqual(original);
        });

        it("does nothing with null/undefined entries", () => {
            const scene: any = { textures: [{ name: "vishva/assets/textures/ground.jpg" }] };
            const original = JSON.parse(JSON.stringify(scene));

            rewriter.rewrite(scene, null as any);

            expect(scene).toEqual(original);
        });

        it("handles empty scene object", () => {
            const scene: any = {};
            // Should not throw
            rewriter.rewrite(scene, [makeEntry("vishva/assets/textures/a.jpg", "vishva/assets/textures/a.jpg")]);
            expect(scene).toEqual({});
        });

        it("does not modify non-matching string values", () => {
            const scene: any = {
                name: "MyScene",
                id: "scene-123",
                textures: [{ name: "vishva/assets/textures/ground.jpg", type: "Texture" }],
            };
            const entries = [makeEntry("vishva/assets/textures/ground.jpg", "vishva/assets/textures/ground.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.name).toBe("MyScene");
            expect(scene.id).toBe("scene-123");
            expect(scene.textures[0].type).toBe("Texture");
            expect(scene.textures[0].name).toBe("vishva/assets/textures/ground.jpg");
        });

        it("does not modify numeric or boolean values", () => {
            const scene: any = {
                count: 5,
                enabled: true,
                textures: [{ name: "vishva/assets/textures/a.jpg", width: 1024 }],
            };
            const entries = [makeEntry("vishva/assets/textures/a.jpg", "vishva/assets/textures/a.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.count).toBe(5);
            expect(scene.enabled).toBe(true);
            expect(scene.textures[0].width).toBe(1024);
        });

        it("handles null values in the scene object gracefully", () => {
            const scene: any = {
                textures: [null, { name: "vishva/assets/textures/a.jpg" }, undefined],
                nullProp: null,
            };
            const entries = [makeEntry("vishva/assets/textures/a.jpg", "vishva/assets/textures/a.jpg")];

            // Should not throw
            rewriter.rewrite(scene, entries);

            expect(scene.textures[1].name).toBe("vishva/assets/textures/a.jpg");
        });
    });

    describe("rewrite - mutates in place", () => {
        it("mutates the original object (does not return a copy)", () => {
            const scene: any = {
                textures: [{ name: "vishva/assets/textures/ground.jpg" }],
            };
            const entries = [makeEntry("vishva/assets/textures/ground.jpg", "vishva/assets/textures/ground.jpg")];

            rewriter.rewrite(scene, entries);

            // The original object should be mutated
            expect(scene.textures[0].name).toBe("vishva/assets/textures/ground.jpg");
        });
    });

    describe("rewrite - maps different originalUrl to structured archiveFilename", () => {
        it("rewrites originalUrl to the archiveFilename directly", () => {
            const scene: any = {
                textures: [{ name: "vishva/assets/audio/footstep.ogg" }],
            };
            const entries = [makeEntry("vishva/assets/audio/footstep.ogg", "vishva/assets/audio/footstep.ogg")];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("vishva/assets/audio/footstep.ogg");
        });

        it("rewrites non-vishva originalUrl to structured archiveFilename", () => {
            const scene: any = {
                textures: [{ name: "some/other/path/texture.jpg" }],
            };
            // archiveFilename is the full structured path from AssetCollector
            const entries = [makeEntry("some/other/path/texture.jpg", "vishva/assets/textures/texture.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("vishva/assets/textures/texture.jpg");
        });
    });
});
