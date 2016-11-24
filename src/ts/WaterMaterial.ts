"Generated from Java with JSweet 1.1.1 - http://www.jsweet.org";
namespace BABYLON {
    import Vector2 = BABYLON.Vector2;

    import Color3 = BABYLON.Color3;

    import Texture = BABYLON.Texture;

    import Mesh = BABYLON.Mesh;

    import Scene = BABYLON.Scene;

    import Material = BABYLON.Material;

    export declare class WaterMaterial extends Material {
        public windForce : number;

        public waveHeight : number;

        public bumpHeight : number;

        public windDirection : Vector2;

        public waterColor : Color3;

        public colorBlendFactor : number;

        public waveLength : number;

        public bumpTexture : Texture;

        public addToRenderList(mesh : Mesh);

        public constructor(name : string, scene : Scene);
    }
}

