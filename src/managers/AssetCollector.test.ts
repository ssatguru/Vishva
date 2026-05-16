import { describe, it, expect } from "vitest";
import { AssetCollector, AssetEntry } from "./AssetCollector.js";

describe("AssetCollector", () => {
    const collector = new AssetCollector();
    const baseUrl = "http://localhost:8080/bin/";

    describe("collect - texture scanning", () => {
        it("collects textures[].name", () => {
            const scene = {
                textures: [
                    { name: "textures/ground.jpg" },
                    { name: "textures/sky.png" },
                ],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(2);
            expect(entries.map((e) => e.originalUrl)).toContain("textures/ground.jpg");
            expect(entries.map((e) => e.originalUrl)).toContain("textures/sky.png");
        });

        it("collects textures[].url", () => {
            const scene = {
                textures: [{ url: "textures/diffuse.jpg" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].originalUrl).toBe("textures/diffuse.jpg");
        });

        it("collects both name and url from same texture if different", () => {
            const scene = {
                textures: [{ name: "textures/a.jpg", url: "textures/b.jpg" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(2);
        });

        it("deduplicates when name and url are the same", () => {
            const scene = {
                textures: [{ name: "textures/same.jpg", url: "textures/same.jpg" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
        });
    });

    describe("collect - material texture scanning", () => {
        it("collects nested texture references from materials", () => {
            const scene = {
                materials: [
                    {
                        diffuseTexture: { name: "textures/diffuse.jpg" },
                        bumpTexture: { name: "textures/bump.png" },
                        specularTexture: { name: "textures/specular.jpg" },
                    },
                ],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(3);
            const urls = entries.map((e) => e.originalUrl);
            expect(urls).toContain("textures/diffuse.jpg");
            expect(urls).toContain("textures/bump.png");
            expect(urls).toContain("textures/specular.jpg");
        });
    });

    describe("collect - particle systems", () => {
        it("collects particleSystems[].textureName", () => {
            const scene = {
                particleSystems: [
                    { textureName: "particles/flare.png" },
                    { textureName: "particles/smoke.png" },
                ],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(2);
        });
    });

    describe("collect - meshes", () => {
        it("collects meshes[].delayLoadingFile", () => {
            const scene = {
                meshes: [{ delayLoadingFile: "models/tree.babylon" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].originalUrl).toBe("models/tree.babylon");
        });
    });

    describe("collect - environment textures", () => {
        it("collects top-level environmentTexture", () => {
            const scene = {
                environmentTexture: "environment/skybox.env",
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].originalUrl).toBe("environment/skybox.env");
        });

        it("collects reflectionTexture.name", () => {
            const scene = {
                reflectionTexture: { name: "environment/reflection.hdr" },
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].originalUrl).toBe("environment/reflection.hdr");
        });
    });

    describe("URL resolution", () => {
        it("resolves relative URLs to absolute using baseUrl", () => {
            const scene = {
                textures: [{ name: "textures/ground.jpg" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries[0].fetchUrl).toBe("http://localhost:8080/bin/textures/ground.jpg");
        });

        it("handles absolute URLs correctly", () => {
            const scene = {
                textures: [{ name: "http://cdn.example.com/texture.png" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries[0].fetchUrl).toBe("http://cdn.example.com/texture.png");
        });
    });

    describe("data URI handling", () => {
        it("detects and decodes base64 data URIs", () => {
            const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const base64 = Buffer.from(binaryData).toString("base64");
            const dataUri = `data:image/png;base64,${base64}`;

            const scene = {
                textures: [{ name: dataUri }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].decodedData).toBeDefined();
            expect(entries[0].decodedData).toEqual(binaryData);
        });

        it("generates filename from MIME type for data URIs", () => {
            const dataUri = "data:image/png;base64,iVBORw0KGgo=";
            const scene = {
                textures: [{ name: dataUri }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries[0].archiveFilename).toBe("vishva/assets/data/data_asset.png");
        });
    });

    describe("deduplication", () => {
        it("deduplicates entries by originalUrl", () => {
            const scene = {
                textures: [{ name: "textures/shared.jpg" }],
                materials: [
                    {
                        diffuseTexture: { name: "textures/shared.jpg" },
                    },
                ],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].originalUrl).toBe("textures/shared.jpg");
        });
    });

    describe("filename generation", () => {
        it("extracts basename from URL path", () => {
            const scene = {
                textures: [{ name: "path/to/deep/texture.jpg" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries[0].archiveFilename).toBe("texture.jpg");
        });

        it("strips query strings and fragments", () => {
            const scene = {
                textures: [{ name: "texture.jpg?v=123#section" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries[0].archiveFilename).toBe("texture.jpg");
        });

        it("disambiguates colliding basenames with numeric suffix", () => {
            const scene = {
                textures: [
                    { name: "path/a/texture.jpg" },
                    { name: "path/b/texture.jpg" },
                    { name: "path/c/texture.jpg" },
                ],
            };
            const entries = collector.collect(scene, baseUrl);
            const filenames = entries.map((e) => e.archiveFilename);
            expect(filenames).toContain("texture.jpg");
            expect(filenames).toContain("texture_1.jpg");
            expect(filenames).toContain("texture_2.jpg");
            // All unique
            expect(new Set(filenames).size).toBe(3);
        });
    });

    describe("edge cases", () => {
        it("handles empty scene object", () => {
            const entries = collector.collect({}, baseUrl);
            expect(entries).toHaveLength(0);
        });

        it("skips empty string URLs", () => {
            const scene = {
                textures: [{ name: "" }, { url: "" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(0);
        });

        it("skips null/undefined texture entries", () => {
            const scene = {
                textures: [null, undefined, { name: "valid.jpg" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
        });

        it("handles reflectionTextures array", () => {
            const scene = {
                reflectionTextures: [{ name: "env/cubemap.env" }],
            };
            const entries = collector.collect(scene, baseUrl);
            expect(entries).toHaveLength(1);
            expect(entries[0].originalUrl).toBe("env/cubemap.env");
        });
    });
});
