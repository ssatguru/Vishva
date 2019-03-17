import "babylonjs-inspector";
import "babylonjs-loaders";
import "babylonjs-materials";
import "pepjs";

import { HREFsearch } from "./util/HREFsearch";
import { Vishva } from "./Vishva";

declare var defaultWorld:any;
declare var noEditWorlds:any;

import "./sna/ActuatorAnimator";
import "./sna/ActuatorAvAnimator";
import "./sna/ActuatorCloaker";
import "./sna/ActuatorDisabler";
import "./sna/ActuatorEnabler";
import "./sna/ActuatorLight";
import "./sna/ActuatorSound";
import "./sna/SensorClick";
import "./sna/SensorContact";
import "./sna/SensorTimer";





//http://www.html5gamedevs.com/topic/35741-sceneloaderappend-do-not-load-images-of-models-correctly/?tab=comments#comment-205631
BABYLON.Texture.UseSerializedUrlIfAny = true;

let cls = "." + $("#lightType").val();
$(".opt").hide();
$(cls).show();

//change all buttons to jquery button
$("button").button();
$("button").click(function (e) {
    $(this).blur();
});

$('input').addClass("ui-corner-all");


var search: HREFsearch = new HREFsearch();

var scene = search.getParm("world");
var scenePath = "vishva/worlds/";
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
