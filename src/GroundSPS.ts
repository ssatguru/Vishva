import { Vishva } from "./Vishva";

import { Mesh, GroundMesh, Vector2, Vector3, SolidParticle, SolidParticleSystem } from "babylonjs";
//import GroundMesh = BABYLON.GroundMesh;
// import Vector2 = BABYLON.Vector2;
// import Vector3 = BABYLON.Vector3;
// import SolidParticle = BABYLON.SolidParticle;
// import SolidParticleSystem = BABYLON.SolidParticleSystem;
import { Random } from "./util/Random";

/**
 * Manages a SPS whose particles are spread over a gound mesh.
 */
export class GroundSPS {
    public id;
    public name;
    private _vishva: Vishva;
    public mesh: Mesh;
    private _groundMesh: GroundMesh;

    private _spreadDtls: SpreadDtls;
    public sps: SolidParticleSystem;
    public spsMesh: Mesh;

    private sx: number = 0;
    private sz: number = 0;
    private sCount: number = 0;

    private _rand: Random;

    //upper left corner and bottom right corner of the rectangle selected
    private _sprdTLC: Vector2 = new Vector2(0, 0);
    private _sprdBRC: Vector2 = new Vector2(0, 0);

    constructor(name: string, vishva: Vishva, mesh: Mesh, groundMesh: GroundMesh, spreadDtls: SpreadDtls) {
        this.name = name;
        this._vishva = vishva;
        this.mesh = mesh;
        this._groundMesh = groundMesh;
        this._spreadDtls = spreadDtls;

        this.sps = new SolidParticleSystem(name, this._vishva.scene, { updatable: false, isPickable: false });
        //generate default spread details based on mesh bounding box size
        this._updateSpreadParms(this.mesh, this._groundMesh, this._spreadDtls);
    }

    public generate() {
        this._updateSpreadParms(this.mesh, this._groundMesh, this._spreadDtls);
        this.sps.addShape(this.mesh, this.sCount, { positionFunction: (p, i, s) => { this._spread(p); } });
        this.spsMesh = this.sps.buildMesh();
        this.spsMesh.material = this.mesh.material;
        this.spsMesh.doNotSerialize = true;
        this.id = this.spsMesh.id;
    }

    public serialize(): GroundSPSserialized {
        return {
            id: this.id,
            name: this.name,
            meshID: this.mesh.id,
            groundMeshID: this._groundMesh.id,
            spreadDtls: this._spreadDtls
        };
    }

    public setSpreadDtls(sd: SpreadDtls) {
        this._spreadDtls = sd;

    }
    public getSpreadDtls(): SpreadDtls {
        return this._spreadDtls;
    }

    private _updateSpreadParms(m: Mesh, gm: GroundMesh, sd: SpreadDtls) {
        if (!sd.seed) {
            this._spreadDtls.seed = Math.random() * 100;
        }
        this._rand = new Random(this._spreadDtls.seed);

        if (!sd.step)
            sd.step = m.getBoundingInfo().boundingSphere.radius;

        if (!sd.sprdCon1) {
            sd.sprdCon1 = new Vector2(gm._minX + sd.step, gm._minZ + sd.step);
        }
        if (!sd.sprdCon2) {
            sd.sprdCon2 = new Vector2(gm._maxX - sd.step, gm._maxZ - sd.step);
        }

        this._sprdTLC.x = Math.min(sd.sprdCon1.x, sd.sprdCon2.x);
        this._sprdTLC.y = Math.max(sd.sprdCon1.y, sd.sprdCon2.y);
        this._sprdBRC.x = Math.max(sd.sprdCon1.x, sd.sprdCon2.x);
        this._sprdBRC.y = Math.min(sd.sprdCon1.y, sd.sprdCon2.y);

        this.sCount = (((this._sprdBRC.x - this._sprdTLC.x) / sd.step) + 1) * (((this._sprdTLC.y - this._sprdBRC.y) / sd.step) + 1);

        //we will start from top left corner and work down, row wise, to bottom right corner
        // s--------->
        //  --------->
        //  --------->e 
        this.sx = this._sprdTLC.x;
        this.sz = this._sprdTLC.y;

        if (!sd.posRange) sd.posRange = 0.5;
        if (!sd.sclRange) sd.sclRange = 0.5;
        if (!sd.rotRange) sd.rotRange = Math.PI / 20;

        let n: number;
        if (!sd.posMax) {
            n = sd.step * sd.posRange;
            sd.posMax = new Vector3(n, 0, n);
        }
        if (!sd.posMin) {
            n = -sd.step * sd.posRange;
            sd.posMin = new Vector3(n, n, n);
        }
        if (!sd.sclMax) {
            n = (1 + sd.sclRange);
            sd.sclMax = new Vector3(n, n, n);
        }
        if (!sd.sclMin) {
            n = (1 - sd.sclRange);
            sd.sclMin = new Vector3(n, n, n);
        }
        if (!sd.rotMax) {
            n = (sd.rotRange);
            sd.rotMax = new Vector3(n, n, n);
        }
        if (!sd.rotMin) {
            n = (-sd.rotRange);
            sd.rotMin = new Vector3(n, n, n);
        }

    }

    /* called per particle */
    private _spread(part: SolidParticle) {
        //position
        part.position.x = this.sx + this._rand.generate(this._spreadDtls.posMin.x, this._spreadDtls.posMax.x);
        part.position.z = this.sz + this._rand.generate(this._spreadDtls.posMin.z, this._spreadDtls.posMax.z);
        part.position.y = (this._groundMesh).getHeightAtCoordinates(part.position.x, part.position.z);
        part.position.y = part.position.y + this._rand.generate(this._spreadDtls.posMin.y, this._spreadDtls.posMax.y);

        //scale
        part.scaling.x = this._rand.generate(this._spreadDtls.sclMin.x, this._spreadDtls.sclMax.x);
        part.scaling.y = this._rand.generate(this._spreadDtls.sclMin.y, this._spreadDtls.sclMax.y);
        part.scaling.z = this._rand.generate(this._spreadDtls.sclMin.z, this._spreadDtls.sclMax.z);

        //rotation
        part.rotation.x = this._rand.generate(this._spreadDtls.rotMin.x, this._spreadDtls.rotMax.x);
        part.rotation.y = this._rand.generate(this._spreadDtls.rotMin.y, this._spreadDtls.rotMax.y);
        part.rotation.z = this._rand.generate(this._spreadDtls.rotMin.z, this._spreadDtls.rotMax.z);


        this.sx = this.sx + this._spreadDtls.step;
        if (this.sx > this._sprdBRC.x) {
            this.sx = this._sprdTLC.x;
            this.sz = this.sz - this._spreadDtls.step;
        }
    }
}

export interface GroundSPSserialized {
    id: string;
    name: string;
    meshID: string;
    groundMeshID: string;
    spreadDtls: SpreadDtls;
}

export interface SpreadDtls {
    seed?: number;
    step?: number;
    sprdCon1?: Vector2;
    sprdCon2?: Vector2;
    posRange?: number;
    sclRange?: number;
    rotRange?: number;
    posMin?: Vector3;
    posMax?: Vector3;
    sclMin?: Vector3;
    sclMax?: Vector3;
    rotMin?: Vector3;
    rotMax?: Vector3;
}



