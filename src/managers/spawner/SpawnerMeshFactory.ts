import { Color3, Mesh, Scene, StandardMaterial, Tags, VertexData } from "babylonjs";

/**
 * Factory for creating the arrow-shaped indicator mesh used by spawners.
 * The mesh is a flat arrow pointing in the +Z direction (avatar forward in Vishva's RHS),
 * with minimal Y-axis thickness (≤0.05) and low polygon count (≤20 triangles).
 */
export class SpawnerMeshFactory {

    /** Unique teal/cyan color for spawner meshes — not used by ground, skybox, or primitives */
    private static readonly SPAWNER_COLOR = new Color3(0, 0.8, 0.8);

    /**
     * Create a flat arrow mesh (≤20 triangles, ≤0.05 Y thickness).
     * The arrow points in the +Z direction (Vishva uses right-handed system).
     * The mesh is tagged as internal/invisible and set non-pickable by default.
     */
    public static createArrowMesh(scene: Scene, name: string): Mesh {
        const mesh = new Mesh(name, scene);

        // --- Build arrow geometry ---
        // The arrow shape consists of:
        //   - A rectangular shaft (4 vertices top + 4 bottom = 8 vertices)
        //   - A triangular head (3 vertices top + 3 bottom = 6 vertices)
        // Total: 14 vertices, 16 triangles (well within the 20 triangle limit)
        // Arrow points in +Z direction to match Vishva's RHS avatar forward convention.

        const halfY = 0.025; // Total Y thickness = 0.05

        // Arrow shape vertices (XZ plane), arrow points in +Z direction
        // Shaft: a rectangle from z=-0.5 to z=0.1, width 0.2
        // Head: a triangle from z=0.1 to z=0.5, width 0.4 tapering to 0
        const positions: number[] = [
            // Top face (y = +halfY)
            // Shaft vertices (0-3)
            -0.1, halfY, -0.5,   // 0: back-left
             0.1, halfY, -0.5,   // 1: back-right
             0.1, halfY,  0.1,   // 2: front-right of shaft
            -0.1, halfY,  0.1,   // 3: front-left of shaft
            // Head vertices (4-6)
            -0.2, halfY,  0.1,   // 4: head base-left
             0.2, halfY,  0.1,   // 5: head base-right
             0.0, halfY,  0.5,   // 6: head tip

            // Bottom face (y = -halfY)
            // Shaft vertices (7-10)
            -0.1, -halfY, -0.5,  // 7: back-left
             0.1, -halfY, -0.5,  // 8: back-right
             0.1, -halfY,  0.1,  // 9: front-right of shaft
            -0.1, -halfY,  0.1,  // 10: front-left of shaft
            // Head vertices (11-13)
            -0.2, -halfY,  0.1,  // 11: head base-left
             0.2, -halfY,  0.1,  // 12: head base-right
             0.0, -halfY,  0.5,  // 13: head tip
        ];

        // Indices (triangles) — 16 triangles total
        const indices: number[] = [
            // Top face (CCW when viewed from above)
            // Shaft top: 2 triangles
            0, 1, 2,
            0, 2, 3,
            // Head top: 1 triangle
            4, 5, 6,

            // Bottom face (CW when viewed from above = CCW from below)
            // Shaft bottom: 2 triangles
            7, 9, 8,
            7, 10, 9,
            // Head bottom: 1 triangle
            11, 13, 12,

            // Side faces
            // Shaft back side
            0, 8, 1,
            0, 7, 8,
            // Shaft right side
            1, 9, 2,
            1, 8, 9,
            // Shaft left side
            3, 7, 0,
            3, 10, 7,
            // Head right side
            5, 12, 6,
            6, 12, 13,
            // Head left side
            4, 6, 11,
            6, 13, 11,
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;

        // Compute normals for proper lighting
        const normals: number[] = [];
        VertexData.ComputeNormals(positions, indices, normals);
        vertexData.normals = normals;

        vertexData.applyToMesh(mesh);

        // --- Apply material ---
        const material = new StandardMaterial(name + "_mat", scene);
        material.diffuseColor = SpawnerMeshFactory.SPAWNER_COLOR.clone();
        material.specularColor = new Color3(0, 0, 0);
        material.backFaceCulling = false;
        material.disableDepthWrite = true;
        mesh.material = material;

        // --- Set metadata ---
        mesh.metadata = mesh.metadata || {};
        mesh.metadata.isInternal = true;
        mesh.metadata.isInvisible = true;

        // --- Render on top of other meshes so spawner is never hidden ---
        mesh.renderingGroupId = 1;

        // --- Add tags ---
        Tags.AddTagsTo(mesh, "Vishva.internal invisible");

        // --- Set visibility and pickability ---
        mesh.isVisible = false;
        mesh.isPickable = false;

        return mesh;
    }
}
