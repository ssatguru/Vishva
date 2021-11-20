import { Vishva } from "../Vishva";
import { VButton } from "./components/VButton";



let navHTML = `
<nav style="position: absolute;left:1em;top:1em;z-index:inherit;">

        <button id="showNavMenu" title="build menu"><span class="material-icons-outlined" >menu</span></button>

        <nav id="navMenubar" style="display: inline-block;">

                <button id="downWorld" title="download scene"><span class="material-icons-outlined" >cloud_download</span></button>

                <button id="navWorldAssets" title="list items">assets in world</button>

                <button id="navAllAssets" title="all assets">all assets</button>

                <div style="display:inline-block;">
                        <button id="navCAssets" title="curated assets">curated assets</button>
                        <div id="AddMenu" style="display: none; position:absolute"></div>
                </div>

                <button id="navPrim" title="add primitives"><span class="material-icons-outlined" >view_in_ar</span></button>

                <button id="navEdit" title="edit"><span class="material-icons-outlined" >construction</span></button>

                <button id="navEnv" title="environment"><span class="material-icons-outlined" >terrain</span></button>

                <button id="navSettings" title="settings"><span class="material-icons-outlined" >settings</span></button>

                <button id="helpLink" title="help"><span class="material-icons-outlined" >help_outline</span></button>
                
                <button id="debugLink" title="inspector"><span class="material-icons-outlined" >info</span></button>
        </nav>

</nav>

`;


let navElement = document.createElement("div");
navElement.style.zIndex = "999";
navElement.innerHTML = navHTML;
VButton.styleThem(navElement.getElementsByTagName("button"));


export { navElement };