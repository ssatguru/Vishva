import { Vishva } from "./Vishva";

import { Mesh, GroundMesh, Vector2, Vector3, SolidParticle, SolidParticleSystem } from "babylonjs";

import { Random } from "./util/Random";

/**
 * spreads a mesh over a rectangular section of the ground
 */
export class GrndSpread {
    public id;
    public name;
    private _vishva: Vishva;
    public mesh: Mesh;
    private _groundMesh: GroundMesh;

    public spreadDtls: SpreadDtl;
    public sps: SolidParticleSystem;
    public spsMesh: Mesh;

    private sx: number = 0;
    private sz: number = 0;
    private sCount: number = 0;

    private _rand: Random;

    //upper left corner and bottom right corner of the rectangle selected
    private _sprdTLC: Vector2 = new Vector2(0, 0);
    private _sprdBRC: Vector2 = new Vector2(0, 0);

    constructor(name: string, vishva: Vishva, mesh: Mesh, groundMesh: GroundMesh, spreadDtls: SpreadDtl) {
        this.name = name;
        this._vishva = vishva;
        this.mesh = mesh;
        this._groundMesh = groundMesh;
        this.spreadDtls = spreadDtls;

        //generate default spread details based on mesh bounding box size
        if (this.spreadDtls == null) {
            this.spreadDtls = new SpreadDtl();
            this._defaultSpreadParms();
        }
        this.sps = new SolidParticleSystem(name, this._vishva.scene, { updatable: false, isPickable: false });

    }

    public generate() {
        this._updateSpreadParms();
        this.sps.addShape(this.mesh, this.sCount, { positionFunction: (p, i, s) => { this._spread(p); } });
        this.spsMesh = this.sps.buildMesh();
        this.spsMesh.material = this.mesh.material;
        this.spsMesh.doNotSerialize = true;
        this.id = this.spsMesh.id;
    }

    public serialize(): GrndSpread_Serializeable {
        return new GrndSpread_Serializeable(
            this.id,
            this.name,
            this.mesh.id,
            this._groundMesh.id,
            new SpreadDtl_Serializable(this.spreadDtls)
        );
    }

    public setSpreadDtls(sd: SpreadDtl) {
        this.spreadDtls = sd;

    }
    public getSpreadDtls(): SpreadDtl {
        return this.spreadDtls;
    }


    private _defaultSpreadParms() {
        let sd: SpreadDtl = this.spreadDtls;
        let m: Mesh = this.mesh;
        let gm: GroundMesh = this._groundMesh;

        sd.seed = Math.random() * 100;

        sd.step = m.getBoundingInfo().boundingSphere.radius;

        sd.sprdCon1 = new Vector2(gm._minX + sd.step, gm._minZ + sd.step);

        sd.sprdCon2 = new Vector2(gm._maxX - sd.step, gm._maxZ - sd.step);

        sd.posRange = 0.5;
        sd.sclRange = 0.5;
        sd.rotRange = Math.PI / 20;

        let n: number;
        n = sd.step * sd.posRange;
        sd.posMax = new Vector3(n, 0, n);

        n = -sd.step * sd.posRange;
        sd.posMin = new Vector3(n, n, n);

        n = (1 + sd.sclRange);
        sd.sclMax = new Vector3(n, n, n);

        n = (1 - sd.sclRange);
        sd.sclMin = new Vector3(n, n, n);

        n = (sd.rotRange);
        sd.rotMax = new Vector3(n, n, n);

        n = (-sd.rotRange);
        sd.rotMin = new Vector3(n, n, n);

    }

    private _updateSpreadParms() {
        let sd: SpreadDtl = this.spreadDtls;

        this._rand = new Random(sd.seed);

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
    }

    /* called per particle */
    private _spread(part: SolidParticle) {
        //position
        part.position.x = this.sx + this._rand.generate(this.spreadDtls.posMin.x, this.spreadDtls.posMax.x);
        part.position.z = this.sz + this._rand.generate(this.spreadDtls.posMin.z, this.spreadDtls.posMax.z);
        part.position.y = (this._groundMesh).getHeightAtCoordinates(part.position.x, part.position.z);
        part.position.y = part.position.y + this._rand.generate(this.spreadDtls.posMin.y, this.spreadDtls.posMax.y);

        //scale
        part.scaling.x = this._rand.generate(this.spreadDtls.sclMin.x, this.spreadDtls.sclMax.x);
        part.scaling.y = this._rand.generate(this.spreadDtls.sclMin.y, this.spreadDtls.sclMax.y);
        part.scaling.z = this._rand.generate(this.spreadDtls.sclMin.z, this.spreadDtls.sclMax.z);

        //rotation
        part.rotation.x = this._rand.generate(this.spreadDtls.rotMin.x, this.spreadDtls.rotMax.x);
        part.rotation.y = this._rand.generate(this.spreadDtls.rotMin.y, this.spreadDtls.rotMax.y);
        part.rotation.z = this._rand.generate(this.spreadDtls.rotMin.z, this.spreadDtls.rotMax.z);


        this.sx = this.sx + this.spreadDtls.step;
        if (this.sx > this._sprdBRC.x) {
            this.sx = this._sprdTLC.x;
            this.sz = this.sz - this.spreadDtls.step;
        }
    }
}

export class GrndSpread_Serializeable {

    constructor(
        private id: string,
        private name: string,
        private meshID: string,
        private groundMeshID: string,
        private spreadDtlsS: SpreadDtl_Serializable) { }

    public static deserialize(g: GrndSpread_Serializeable): GrndSpread {
        let mesh: Mesh;
        try {
            mesh = <Mesh>Vishva.vishva.scene.getMeshById(g.meshID);
        } catch (e) {
            throw new Error("Could not find sps base mesh with id = " + g.meshID)
        }
        //TODO when ground is changed, update each sps grdounMeshID
        //for now let's assume just one groundmesh and use that
        //let groundMesh: GroundMesh=<GroundMesh>this.scene.getMeshByID(gSPSs.groundMeshID);
        let groundMesh: GroundMesh = <GroundMesh>Vishva.vishva.ground;
        let gsps = new GrndSpread(g.name, Vishva.vishva, mesh, groundMesh, SpreadDtl_Serializable.deserialize(g.spreadDtlsS));
        gsps.id = g.id;
        return gsps;
    }

}

export class SpreadDtl {
    seed: number;
    step: number;
    sprdCon1: Vector2;
    sprdCon2: Vector2;
    posRange: number;
    sclRange: number;
    rotRange: number;
    posMin: Vector3;
    posMax: Vector3;
    sclMin: Vector3;
    sclMax: Vector3;
    rotMin: Vector3;
    rotMax: Vector3;
}

//need this because somebody in babylon decided to change
//vector3 x,y,z properties to accessors!!
export class SpreadDtl_Serializable {
    seed: number;
    step: number;
    sprdCon1: number[];
    sprdCon2: number[];
    posRange: number;
    sclRange: number;
    rotRange: number;
    posMin: number[];
    posMax: number[];
    sclMin: number[];
    sclMax: number[];
    rotMin: number[];
    rotMax: number[];

    constructor(sd: SpreadDtl) {
        this.seed = sd.seed;
        this.step = sd.step;
        this.sprdCon1 = [sd.sprdCon1.x, sd.sprdCon1.y];
        this.sprdCon2 = [sd.sprdCon2.x, sd.sprdCon2.y];
        this.posRange = sd.posRange;
        this.sclRange = sd.sclRange;
        this.rotRange = sd.rotRange;
        this.posMin = [sd.posMin.x, sd.posMin.y, sd.posMin.z];
        this.posMax = [sd.posMax.x, sd.posMax.y, sd.posMax.z];
        this.sclMin = [sd.sclMin.x, sd.sclMin.y, sd.sclMin.z];
        this.sclMax = [sd.sclMax.x, sd.sclMax.y, sd.sclMax.z];
        this.rotMin = [sd.rotMin.x, sd.rotMin.y, sd.rotMin.z];
        this.rotMax = [sd.rotMax.x, sd.rotMax.y, sd.rotMax.z];
    }

    public static deserialize(sds: SpreadDtl_Serializable): SpreadDtl {
        let sd: SpreadDtl = new SpreadDtl();
        sd.seed = sds.seed;
        sd.step = sds.step;
        sd.sprdCon1 = new Vector2(sds.sprdCon1[0], sds.sprdCon1[1]);
        sd.sprdCon2 = new Vector2(sds.sprdCon2[0], sds.sprdCon2[1]);
        sd.posRange = sds.posRange;
        sd.sclRange = sds.sclRange;
        sd.rotRange = sds.rotRange;
        sd.posMin = new Vector3(sds.posMin[0], sds.posMin[1], sds.posMin[2]);
        sd.posMax = new Vector3(sds.posMax[0], sds.posMax[1], sds.posMax[2]);
        sd.sclMin = new Vector3(sds.sclMin[0], sds.sclMin[1], sds.sclMin[2]);
        sd.sclMax = new Vector3(sds.sclMax[0], sds.sclMax[1], sds.sclMax[2]);
        sd.rotMin = new Vector3(sds.rotMin[0], sds.rotMin[1], sds.rotMin[2]);
        sd.rotMax = new Vector3(sds.rotMax[0], sds.rotMax[1], sds.rotMax[2]);
        return sd;
    }
}



