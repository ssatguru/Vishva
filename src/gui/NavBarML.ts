import { Vishva } from "../Vishva";
import { VButton } from "./components/VButton";



let navHTML = `
<nav style="position: absolute;left:1em;top:1em;z-index:inherit;border-style:solid;border-width:5px;border-radius: 0.5em;padding:0.25em;cursor:pointer;">

        <button id="showNavMenu" title="build menu"><span class="material-icons-outlined" >menu</span></button>

        <nav id="navMenubar" style="display: inline-block;">

                <button id="downWorld" title="download scene"><span class="material-icons-outlined" >cloud_download</span></button>

                <button id="saveWorld" title="save world to browser"><span class="material-icons-outlined">save</span></button>

                <button id="uploadAsset" title="load assets or world"><span class="material-icons-outlined">upload_file</span></button>

                <button id="navWorldAssets" title="list items in world"><span class="material-icons-outlined">account_tree</span></button>

                <button id="navAllAssets" title="all files"><span class="material-icons-outlined" >folder</span></button>

                <div style="display:inline-block;">
                        <button id="navCAssets" title="assets"><span class="material-icons-outlined" >storefront</span></button>
                        <div id="AddMenu" style="display: none; position:absolute"></div>
                </div>

                <button id="navPrim" title="add primitives"><span class="material-icons-outlined" >view_in_ar</span></button>

                <button id="navEdit" title="edit"><span class="material-icons-outlined" >construction</span></button>

                <button id="navAV" title="character controller"><span class="material-icons-outlined" >face</span></button>

                <button id="navEnv" title="environment"><span class="material-icons-outlined" >terrain</span></button>

                <button id="navSettings" title="settings"><span class="material-icons-outlined" >settings</span></button>

                <button id="debugLink" title="inspector"><span class="material-icons-outlined" >info</span></button>

                <button id="helpLink" title="help"><span class="material-icons-outlined" >help_outline</span></button>

                <button id="pauseActuators" title="pause actuators"><span id ="pauseIcon" class="material-icons-outlined" >pause</span></button>
                
        </nav>

</nav>

`;

export class NavBar{
        navElement:HTMLDivElement;
        constructor() {
                this.navElement = document.createElement("div");
                this.navElement.style.zIndex = "999";
                this.navElement.innerHTML = navHTML;
                this.navElement.getElementsByTagName("nav")[0].style.borderColor = Vishva.theme.lightColors.b;
                VButton.styleThem(this.navElement.getElementsByTagName("button"));
                document.body.appendChild(this.navElement);
        }
}
