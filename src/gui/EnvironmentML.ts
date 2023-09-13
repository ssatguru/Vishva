import { VButton } from "./components/VButton";

const envHTML: string = `
<div id="envDiv" style="display:grid;grid-template-columns:auto auto;align-items:center;grid-gap:0.75em;padding:0.5em" class="noselect">
        
            <div style="justify-self: end;">sun elevation</div>
            <div><input type="range" class="sunElev"></input></div>
        
            <div style="justify-self: end;">sun azimuth</div>
            <div><input type="range" class="sunAzim"></input></div>

            <div style="justify-self: end;">sun brightness</div>            
            <div><input type="range" class="sunBright"></input></div>

            <div style="justify-self: end;">sky brightness</div>            
            <div><input type="range" class="skyBright"></input></div>

            <div style="justify-self: end;">scene brightness</div>            
            <div><input type="range" class="sceneBright"></input></div>
        
            <div style="justify-self: end;">light color</div>
            <div><div id="lightColor"></div></div>
        
            <div style="justify-self: end;">shade</div>
            <div><input type="range" class="shade"></input></div>
        
            <div style="justify-self: end;">fog</div>
            <div><input type="range" class="fog"></input></div>
        
            <div style="justify-self: end;">fog color</div>
            <div><div id="fogCol"></div></div>
        
            <div style="justify-self: end;">ambient color</div>
            <div><div id="ambCol"></div></div>
        
            <div style="justify-self: end;">toggle snow</div>
            <div><Button id="envSnow">snow</button></div>
        
            <div style="justify-self: end;">toggle rainy</div>
            <div><Button id="envRain">rain</button></div>
        
            <div style="justify-self: end;">fov</div>
            <div><input class="fov" type="range"></input></div>
        
            <div style="justify-self: end;">sky</div>
            <div><Button id="skyButton">sky</button></div>
    
            <div style="justify-self: end;">sky color</div>
            <div><div id="skyCol">color</div></div>
        
            <div style="justify-self: end;">sea</div>
            <div>
                <Button id="envSea">add</button>
                <Button id="envSeaEdit">edit</button>
                <Button id="envSeaDel">remove</button>
            </div>
        
            <div style="justify-self: end;">terrain</div>
            <div><Button id="trnButton">edit terrain</button></div>

            <div style="justify-self: end;">avatar</div>
            <div><Button id="avButton">avatar settings</button></div>
        
</div>`;

let envElement = document.createElement("div");
envElement.style.visibility = "hidden";
envElement.innerHTML = envHTML;
VButton.styleThem(envElement.getElementsByTagName("button"));

export { envElement };