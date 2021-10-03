import { Vishva } from "../Vishva";
import { VButton } from "./components/VButton";

let navHTML = `
<div style="padding: 4px; position: absolute; top: 0px; left: 0px; display: block;z-index:inherit">
        <!-- <button id="showNavMenu">&#9776;</button> -->
        <button id="showNavMenu">&#8801;</button>
</div>

<div id="navMenubar" style="display:grid; grid-auto-columns:min-content; grid-auto-flow:column; grid-gap:4px; position: absolute;z-index:inherit">

        <!-- <button id="downWorld" ><span class="ui-icon ui-icon ui-icon-arrowthickstop-1-s" title="download scene"></span></button> -->
        <button id="downWorld" title="download scene">&#8681;</span></button>

        <button id="navItems" title="list items">assets in world</button>
        <button id="navAdd" title="add assets">all assets</button>
        <button id="navCAssets">curated assets</button>
        <button id="navPrim" title="add primitives">prim</button>

        <!-- <button id="navEdit"><span class="ui-icon ui-icon-wrench" title="edit"></span></button> -->
        <!-- <button id="navEdit" title="edit">&#9874;</button> -->
        <button id="navEdit" title="edit">&#128295;</button>

        <!-- <button id="navEnv"><span class="ui-icon ui-icon-image" title="environment"></span></button> -->
        <button id="navEnv" title="environment">&#127780; </span></button>

        <button id="navSettings"><span class="ui-icon ui-icon-gear" title="settings"></span></button>

        <!-- <button id="helpLink"><span class="ui-icon ui-icon-help" title="help"></span></button>-->
        <button id="helpLink" title="help">&#10068;</span></button>
        
        <button id="debugLink"><span class="ui-icon ui-icon-info" title="debug"></span></button>
</div>

<div id="AddMenu" style="display: inline-grid; grid-template-columns: auto; grid-row-gap: 4px;"></div>
`;


let navElement = document.createElement("div");
navElement.style.zIndex = "999";
navElement.innerHTML = navHTML;
VButton.styleThem(navElement.getElementsByTagName("button"));


export { navElement };