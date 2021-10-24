import { Vishva } from "../Vishva";
import { VButton } from "./components/VButton";



let navHTML = `
<div style="padding: 4px; position: absolute; top: 0px; left: 0px; display: block;z-index:inherit">
        <button id="showNavMenu" title="build menu"><span class="material-icons-outlined" >menu</span></button>
</div>

<div id="navMenubar" style="display:grid; grid-auto-columns:min-content; grid-auto-flow:column; grid-gap:4px; position: absolute;z-index:inherit">

        <button id="downWorld" title="download scene"><span class="material-icons-outlined" >cloud_download</span></button>

        <button id="navWorldAssets" title="list items">assets in world</button>
        <button id="navAllAssets" title="all assets">all assets</button>
        <button id="navCAssets" title="curated assets">curated assets</button>
        <button id="navPrim" title="add primitives"><span class="material-icons-outlined" >view_in_ar</span></button>

        <button id="navEdit" title="edit"><span class="material-icons-outlined" >construction</span></button>

        <button id="navEnv" title="environment"><span class="material-icons-outlined" >terrain</span></button>

        <button id="navSettings" title="settings"><span class="material-icons-outlined" >settings</span></button>

        <button id="helpLink" title="help"><span class="material-icons-outlined" >help_outline</span></button>
        
        <button id="debugLink" title="inspector"><span class="material-icons-outlined" >info</span></button>
</div>

<div id="AddMenu" style="display: inline-grid; grid-template-columns: auto; grid-row-gap: 4px;"></div>
`;


let navElement = document.createElement("div");
navElement.style.zIndex = "999";
navElement.innerHTML = navHTML;
VButton.styleThem(navElement.getElementsByTagName("button"));


export { navElement };