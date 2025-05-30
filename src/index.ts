import { Vishva } from "./Vishva";

import "./w3.css";
//import "./w3-theme-eggplant.css";
import "./style.css";


// import "babylonjs-inspector";
import "babylonjs-loaders";
import "babylonjs-materials";
import "pepjs";

//add this when GLTF export is needed
//import "babylonjs-serializers";

//import "oimo";
//import "cannon";

//import "./misc/perlin";
//import "./misc/babylon.dynamicTerrain.min";

import "./sna/ActuatorAnimator";
import "./sna/ActuatorAvAnimator";
import "./sna/ActuatorCloaker";
import "./sna/ActuatorDialog";
import "./sna/ActuatorDisabler";
import "./sna/ActuatorEnabler";
import "./sna/ActuatorLight";
import "./sna/ActuatorTextBar";
import "./sna/ActuatorSignalEmitter";
import "./sna/ActuatorSound";
import "./sna/SensorClick";
import "./sna/SensorContact";
import "./sna/SensorTimer";

import { HREFsearch } from "./util/HREFsearch";
import { VInputSelect } from "./gui/components/VInputSelect";
import { Game } from "./Game";



declare var defaultWorld: any;
declare var noEditWorlds: any;

window.onload = main;

function main() {

    //adjust for hi dpi monitors
    // var el = document.body;
    // var fs = window.getComputedStyle(el, null).getPropertyValue('font-size');
    // var fontSize = parseFloat(fs); 
    // el.style.fontSize = (fontSize/window.devicePixelRatio) + 'px';

    //http://www.html5gamedevs.com/topic/35741-sceneloaderappend-do-not-load-images-of-models-correctly/?tab=comments#comment-205631
    //in 4.0.3 setting this to true broke babylon file exported from GLB  
    //doesn't seem to make a difference in 4.1
    //BABYLON.Texture.UseSerializedUrlIfAny = true;

    let slcs = document.getElementsByTagName("select");
    for (let i = 0; i < slcs.length; i++) {
        VInputSelect.styleIt(slcs[i]);
    }
    let inps = document.querySelectorAll("input[type=text]");
    for (let i = 0; i < inps.length; i++) {
        inps[i].className = "w3-input";
        (<HTMLElement>inps[i]).style.width = "auto";
    }
    let chks = document.querySelectorAll("input[type=checkbox]");
    for (let i = 0; i < chks.length; i++) {
        chks[i].className = "w3-check";
    }


    let search: HREFsearch = new HREFsearch();

    let scene = search.getParm("world");
    let scenePath = "vishva/worlds/";
    let editEnabled = true;

    if (!scene) {
        if (typeof (defaultWorld) !== "undefined") {
            scene = defaultWorld;
        } else {
            scene = "empty";
        }
    }

    if (typeof (noEditWorlds) !== "undefined") {
        var l = noEditWorlds.length;
        for (let i: number = 0; i < l; i++) {
            if (noEditWorlds[i] == scene) {
                editEnabled = false;
            }
        }
    }

    let vishva = new Vishva(scene, scenePath, editEnabled, "vCanvas", "vGUI");
    new Game(vishva);
}
