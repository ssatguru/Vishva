import { VButton } from "./components/VButton";



let navHTML = `
        <button id="showNavMenu" title="build menu" style="margin-right:0.5em;"><span class="material-icons-outlined">menu</span></button>

        <nav id="navMenubar" style="display:inline-flex; align-items:center; flex-wrap:nowrap; gap:0.25em;">

                <button id="worldLauncher" title="world launcher"><span class="material-icons-outlined">public</span></button>

                <button id="downWorld" title="download world"><span class="material-icons-outlined">cloud_download</span></button>

                <button id="saveWorld" title="save world to browser"><span class="material-icons-outlined">save</span></button>

                <button id="uploadAsset" title="load assets or world"><span class="material-icons-outlined">upload_file</span></button>

                <button id="navWorldAssets" title="list items in world"><span class="material-icons-outlined">account_tree</span></button>

                <button id="navAllAssets" title="all files"><span class="material-icons-outlined">folder</span></button>

                <div style="position:relative; display:inline-block;">
                        <button id="navCAssets" title="assets"><span class="material-icons-outlined">storefront</span></button>
                        <div id="AddMenu" style="display:none; position:absolute; top:100%; left:0; z-index:1000;"></div>
                </div>

                <button id="navPrim" title="add primitives"><span class="material-icons-outlined">view_in_ar</span></button>

                <button id="navEdit" title="edit"><span class="material-icons-outlined">construction</span></button>

                <button id="navAV" title="character controller"><span class="material-icons-outlined">face</span></button>

                <button id="navEnv" title="environment"><span class="material-icons-outlined">terrain</span></button>

                <button id="navAddSpawner" title="add spawner"><span class="material-icons-outlined">my_location</span></button>

                <button id="navSettings" title="settings"><span class="material-icons-outlined">settings</span></button>

                <button id="debugLink" title="inspector"><span class="material-icons-outlined">info</span></button>

                <button id="helpLink" title="help"><span class="material-icons-outlined">help_outline</span></button>

                <button id="pauseActuators" title="pause actuators"><span id="pauseIcon" class="material-icons-outlined">pause</span></button>

        </nav>
`;

export class NavBar {
        navElement: HTMLDivElement;
        constructor() {
                this.navElement = document.createElement("div");
                this.navElement.id = "menuBar";
                this.navElement.style.position = "fixed";
                this.navElement.style.top = "0";
                this.navElement.style.left = "0";
                this.navElement.style.width = "100%";
                this.navElement.style.zIndex = "999";
                this.navElement.style.display = "flex";
                this.navElement.style.alignItems = "center";
                this.navElement.style.padding = "0 0.5em";
                this.navElement.style.height = "48px";
                this.navElement.style.boxSizing = "border-box";
                this.navElement.style.backgroundColor = "var(--v-dark-bg)";
                this.navElement.style.color = "var(--v-dark-fg)";
                this.navElement.style.borderBottom = "1px solid var(--v-light-bg)";
                this.navElement.innerHTML = navHTML;
                VButton.styleThem(this.navElement.getElementsByTagName("button"));
                document.body.prepend(this.navElement);
        }
}
