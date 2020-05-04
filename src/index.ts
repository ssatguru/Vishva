import { Vishva } from "./Vishva";

import "./w3.css";
//import "jquery-ui-themes/themes/eggplant/jquery-ui.min.css";
//import "jquery-ui-themes/themes/dark-hive/jquery-ui.min.css";
//import "./jquery-ui-1.12.1.custom/jquery-ui.theme.min.css";

// import "./jquery/dark-hive/jquery-ui.css";
import "./jquery/eggplant/jquery-ui.css";

import "./style.css";

import "jquery-ui/ui/widgets/accordion";
import "jquery-ui/ui/widgets/button";
import "jquery-ui/ui/widgets/dialog";
import "jquery-ui/ui/widgets/menu";
import "jquery-ui/ui/widgets/slider";
import "jquery-ui/ui/widgets/tabs";
import "jquery-ui/ui/widgets/tooltip";
import "jquery-ui/ui/effects/effect-blind";
import "jquery-ui/ui/effects/effect-explode";
import "jquery-ui/ui/effects/effect-scale";

import "jquery-ui/ui/effects/effect-slide.js";

import "babylonjs-inspector";
import "babylonjs-loaders";
import "babylonjs-materials";
import "pepjs";

//import "oimo";
//import "cannon";

//import "./misc/perlin";
// import "./misc/babylon.dynamicTerrain.min";

import "./sna/ActuatorAnimator";
import "./sna/ActuatorAvAnimator";
import "./sna/ActuatorCloaker";
import "./sna/ActuatorDialog";
import "./sna/ActuatorDisabler";
import "./sna/ActuatorEnabler";
import "./sna/ActuatorLight";
import "./sna/ActuatorSound";
import "./sna/SensorClick";
import "./sna/SensorContact";
import "./sna/SensorTimer";

import { HREFsearch } from "./util/HREFsearch";
import { VButton } from "./gui/VButton";
import { VInputSelect } from "./gui/VInputSelect";


declare var defaultWorld: any;
declare var noEditWorlds: any;

window.onload = main;

function main() {


    //http://www.html5gamedevs.com/topic/35741-sceneloaderappend-do-not-load-images-of-models-correctly/?tab=comments#comment-205631
    //in 4.0.3 setting this to true broke babylon file exported from GLB  
    //doesn't seem to make a difference in 4.1
    //BABYLON.Texture.UseSerializedUrlIfAny = true;


    let cls = "." + $("#lightType").val();
    $(".opt").hide();
    $(cls).show();

    //change all buttons to jquery button
    // $("button").button();

    let btns = document.getElementsByTagName("button");
    for (let i = 0; i < btns.length; i++) {
        // btns[i].classList.add("w3-btn");
        // btns[i].classList.add("w3-win8-mauve");
        // btns[i].classList.add("w3-card");
        // btns[i].classList.add("w3-round");
        VButton.styleIt(btns[i]);
    }
    //button color 61,53,68 and 48,38,58 (darker)

    let slcs = document.getElementsByTagName("select");
    for (let i = 0; i < slcs.length; i++) {
        VInputSelect.styleIt(slcs[i]);
    }
    let inps = document.querySelectorAll("input[type=text]");
    console.log("inps " + inps.length);
    for (let i = 0; i < inps.length; i++) {
        inps[i].className = "w3-input";
        (<HTMLElement>inps[i]).style.width = "auto";
    }
    let chks = document.querySelectorAll("input[type=checkbox]");
    console.log("chks " + chks.length);
    for (let i = 0; i < chks.length; i++) {
        chks[i].className = "w3-check";
    }

    //after click loose focus
    $("button").click(function (e) {
        $(this).blur();
    });

    //$('input').addClass("ui-corner-all");


    var search: HREFsearch = new HREFsearch();

    var scene = search.getParm("world");
    var scenePath = "/vishva/worlds/";
    var editEnabled = true;



    console.log(defaultWorld);

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

    new Vishva(scene, scenePath, editEnabled, "vCanvas");
}
