import Vector2 = BABYLON.Vector2;
import Vector3 = BABYLON.Vector3;
import Color3 = BABYLON.Color3;
import GroundMesh = BABYLON.GroundMesh;
import MeshBuilder = BABYLON.MeshBuilder;
import Tags = BABYLON.Tags;
import AbstractMesh = BABYLON.AbstractMesh;
import { Vishva } from "../Vishva";
import { VInputText } from "./VInputText";
import { VInputNumber } from "./VInputNumber";
import { VInputVector2 } from "./VInputVector2";
import { VInputVector3 } from "./VInputVector3";
import { DialogMgr } from "./DialogMgr";
import { VFileInput } from "./VFileInput";
/**
 * Provides a UI to manage Ground Dimensions
 */
export class GrndDimUI {

    private _vishva: Vishva;
    private _grndID: VInputText;
    private _grndHM: VFileInput;
    private _grndW: VInputNumber;
    private _grndL: VInputNumber;
    private _grndS: VInputNumber;
    private _grndminH: VInputNumber;
    private _grndmaxH: VInputNumber;
    private _grndUVOffset: VInputVector2;
    private _grndUVScale: VInputVector2;
    private _grndFC: VInputVector3;
    private _grndUpdate: HTMLButtonElement;

    constructor(vishva: Vishva) {
        this._vishva = vishva;

        let grnd: GroundMesh = <GroundMesh>vishva.ground;

        this._grndID = new VInputText("grndID", grnd.name);
        this._grndHM = new VFileInput("grndHM", null, "Height Map Image", DialogMgr.centerBottom, Vishva.vishvaFiles, "\.bmp$|\.png$|\.tga$\.jpg$", true)
        this._grndW = new VInputNumber("grndW", grnd._width);
        this._grndL = new VInputNumber("grndL", grnd._height);
        this._grndS = new VInputNumber("grndS", grnd.subdivisions);
        this._grndminH = new VInputNumber("grndminH");
        this._grndmaxH = new VInputNumber("grndmaxH");
        this._grndUVOffset = new VInputVector2("grndUVOffset", new Vector2(0, 0));
        this._grndUVScale = new VInputVector2("grndUVScale", new Vector2(1, 1));
        this._grndFC = new VInputVector3("grndFC", new Vector3(0.3, 0.59, 0.11));
        this._grndUpdate = <HTMLButtonElement>document.getElementById("grndUpdate");
        this._grndUpdate.onclick = () => { this.updateGround(); };
    }


    public update() {
        let grnd: GroundMesh = <GroundMesh>this._vishva.ground;
        this._grndID.setValue(grnd.name);
        return true;
    }

    private updateGround() {
        console.log("updateGround");
        let _grnd_old: GroundMesh = <GroundMesh>this._vishva.ground;

        let v: Vector3 = this._grndFC.getValue();
        let color: Color3 = new Color3(v.x, v.y, v.z);
        MeshBuilder.CreateGroundFromHeightMap(this._grndID.getValue(), this._grndHM.getValue(), {
            width: this._grndW.getValue(),
            height: this._grndL.getValue(),
            minHeight: this._grndminH.getValue(),
            maxHeight: this._grndmaxH.getValue(),
            subdivisions: this._grndS.getValue(),
            colorFilter: color,
            updatable: false,
            onReady: (grnd: GroundMesh) => {
                grnd.material = _grnd_old.material;
                grnd.checkCollisions = true;
                grnd.isPickable = false;
                Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
                grnd.receiveShadows = true;
                grnd.freezeWorldMatrix();
                this._vishva.ground = grnd;
                this._vishva.switchEditControl(grnd);
                this._adjustHts(grnd, _grnd_old);
                _grnd_old.dispose();
                //TODO regenerate all the sps
            }

        }, this._vishva.scene);
    }

    private _adjustHts(grnd: GroundMesh, grnd_old: GroundMesh) {
        //all meshes
        let meshes: AbstractMesh[] = this._vishva.scene.meshes;
        for (let mesh of meshes) {
            if (mesh == grnd) continue;
            if (mesh == grnd_old) continue;
            if (mesh.parent != null) continue;
            let x = mesh.position.x;
            let y = mesh.position.y;
            let z = mesh.position.z;
            let dy = y - grnd_old.getHeightAtCoordinates(x, z);
            mesh.position.y = grnd.getHeightAtCoordinates(x, z) + dy;
        }

        let cam = this._vishva.arcCamera;
        let x = cam.position.x;
        let y = cam.position.y;
        let z = cam.position.z;
        let dy = y - grnd_old.getHeightAtCoordinates(x, z);
        cam.position.y = grnd.getHeightAtCoordinates(x, z) + dy;



    }
}