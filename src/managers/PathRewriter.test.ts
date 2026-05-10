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
        it("replaces texture name fields with archive-relative paths", () => {
            const scene: any = {
                textures: [
                    { name: "textures/ground.jpg", otherProp: 42 },
                    { name: "textures/sky.png" },
                ],
            };
            const entries = [
                makeEntry("textures/ground.jpg", "ground.jpg"),
                makeEntry("textures/sky.png", "sky.png"),
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("assets/ground.jpg");
            expect(scene.textures[1].name).toBe("assets/sky.png");
        });

        it("replaces texture url fields", () => {
            const scene: any = {
                textures: [{ url: "textures/diffuse.jpg" }],
            };
            const entries = [makeEntry("textures/diffuse.jpg", "diffuse.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].url).toBe("assets/diffuse.jpg");
        });

        it("replaces material nested texture references", () => {
            const scene: any = {
                materials: [
                    {
                        diffuseTexture: { name: "textures/diffuse.jpg" },
                        bumpTexture: { name: "textures/bump.png" },
                    },
                ],
            };
            const entries = [
                makeEntry("textures/diffuse.jpg", "diffuse.jpg"),
                makeEntry("textures/bump.png", "bump.png"),
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.materials[0].diffuseTexture.name).toBe("assets/diffuse.jpg");
            expect(scene.materials[0].bumpTexture.name).toBe("assets/bump.png");
        });

        it("replaces particleSystems[].textureName", () => {
            const scene: any = {
                particleSystems: [{ textureName: "particles/flare.png" }],
            };
            const entries = [makeEntry("particles/flare.png", "flare.png")];

            rewriter.rewrite(scene, entries);

            expect(scene.particleSystems[0].textureName).toBe("assets/flare.png");
        });

        it("replaces top-level environmentTexture", () => {
            const scene: any = {
                environmentTexture: "environment/skybox.env",
            };
            const entries = [makeEntry("environment/skybox.env", "skybox.env")];

            rewriter.rewrite(scene, entries);

            expect(scene.environmentTexture).toBe("assets/skybox.env");
        });

        it("replaces reflectionTexture.name", () => {
            const scene: any = {
                reflectionTexture: { name: "environment/reflection.hdr" },
            };
            const entries = [makeEntry("environment/reflection.hdr", "reflection.hdr")];

            rewriter.rewrite(scene, entries);

            expect(scene.reflectionTexture.name).toBe("assets/reflection.hdr");
        });

        it("replaces meshes[].delayLoadingFile", () => {
            const scene: any = {
                meshes: [{ delayLoadingFile: "models/tree.babylon" }],
            };
            const entries = [makeEntry("models/tree.babylon", "tree.babylon")];

            rewriter.rewrite(scene, entries);

            expect(scene.meshes[0].delayLoadingFile).toBe("assets/tree.babylon");
        });
    });

    describe("rewrite - data URI replacement", () => {
        it("replaces data URI strings with archive paths", () => {
            const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
            const scene: any = {
                textures: [{ name: dataUri }],
            };
            const entries: AssetEntry[] = [
                {
                    originalUrl: dataUri,
                    fetchUrl: dataUri,
                    archiveFilename: "data_asset.png",
                    decodedData: new Uint8Array([1, 2, 3]),
                },
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("assets/data_asset.png");
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
                    archiveFilename: "data_asset.jpg",
                    decodedData: new Uint8Array([4, 5, 6]),
                },
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.materials[0].diffuseTexture.name).toBe("assets/data_asset.jpg");
        });
    });

    describe("rewrite - deep traversal", () => {
        it("replaces URLs at arbitrary nesting depth", () => {
            const scene: any = {
                level1: {
                    level2: {
                        level3: {
                            someUrl: "textures/deep.jpg",
                        },
                    },
                },
            };
            const entries = [makeEntry("textures/deep.jpg", "deep.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.level1.level2.level3.someUrl).toBe("assets/deep.jpg");
        });

        it("replaces URLs inside arrays at arbitrary depth", () => {
            const scene: any = {
                items: [
                    { nested: [{ url: "textures/array.jpg" }] },
                ],
            };
            const entries = [makeEntry("textures/array.jpg", "array.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.items[0].nested[0].url).toBe("assets/array.jpg");
        });

        it("replaces string values directly in arrays", () => {
            const scene: any = {
                urls: ["textures/a.jpg", "textures/b.jpg", "not-a-url"],
            };
            const entries = [
                makeEntry("textures/a.jpg", "a.jpg"),
                makeEntry("textures/b.jpg", "b.jpg"),
            ];

            rewriter.rewrite(scene, entries);

            expect(scene.urls[0]).toBe("assets/a.jpg");
            expect(scene.urls[1]).toBe("assets/b.jpg");
            expect(scene.urls[2]).toBe("not-a-url");
        });

        it("replaces the same URL appearing in multiple locations", () => {
            const scene: any = {
                textures: [{ name: "shared.jpg" }],
                materials: [
                    { diffuseTexture: { name: "shared.jpg" } },
                ],
                other: { ref: "shared.jpg" },
            };
            const entries = [makeEntry("shared.jpg", "shared.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.textures[0].name).toBe("assets/shared.jpg");
            expect(scene.materials[0].diffuseTexture.name).toBe("assets/shared.jpg");
            expect(scene.other.ref).toBe("assets/shared.jpg");
        });
    });

    describe("rewrite - edge cases", () => {
        it("does nothing with empty asset entries", () => {
            const scene: any = { textures: [{ name: "textures/ground.jpg" }] };
            const original = JSON.parse(JSON.stringify(scene));

            rewriter.rewrite(scene, []);

            expect(scene).toEqual(original);
        });

        it("does nothing with null/undefined entries", () => {
            const scene: any = { textures: [{ name: "textures/ground.jpg" }] };
            const original = JSON.parse(JSON.stringify(scene));

            rewriter.rewrite(scene, null as any);

            expect(scene).toEqual(original);
        });

        it("handles empty scene object", () => {
            const scene: any = {};
            // Should not throw
            rewriter.rewrite(scene, [makeEntry("textures/a.jpg", "a.jpg")]);
            expect(scene).toEqual({});
        });

        it("does not modify non-matching string values", () => {
            const scene: any = {
                name: "MyScene",
                id: "scene-123",
                textures: [{ name: "textures/ground.jpg", type: "Texture" }],
            };
            const entries = [makeEntry("textures/ground.jpg", "ground.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.name).toBe("MyScene");
            expect(scene.id).toBe("scene-123");
            expect(scene.textures[0].type).toBe("Texture");
            expect(scene.textures[0].name).toBe("assets/ground.jpg");
        });

        it("does not modify numeric or boolean values", () => {
            const scene: any = {
                count: 5,
                enabled: true,
                textures: [{ name: "textures/a.jpg", width: 1024 }],
            };
            const entries = [makeEntry("textures/a.jpg", "a.jpg")];

            rewriter.rewrite(scene, entries);

            expect(scene.count).toBe(5);
            expect(scene.enabled).toBe(true);
            expect(scene.textures[0].width).toBe(1024);
        });

        it("handles null values in the scene object gracefully", () => {
            const scene: any = {
                textures: [null, { name: "textures/a.jpg" }, undefined],
                nullProp: null,
            };
            const entries = [makeEntry("textures/a.jpg", "a.jpg")];

            // Should not throw
            rewriter.rewrite(scene, entries);

            expect(scene.textures[1].name).toBe("assets/a.jpg");
        });
    });

    describe("rewrite - mutates in place", () => {
        it("mutates the original object (does not return a copy)", () => {
            const scene: any = {
                textures: [{ name: "textures/ground.jpg" }],
            };
            const entries = [makeEntry("textures/ground.jpg", "ground.jpg")];

            rewriter.rewrite(scene, entries);

            // The original object should be mutated
            expect(scene.textures[0].name).toBe("assets/ground.jpg");
        });
    });
});
