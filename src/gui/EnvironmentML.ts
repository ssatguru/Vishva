import { VButton } from "./components/VButton";

const envHTML: string = `
<div id="envDiv" style="display:grid;grid-template-columns:auto auto;align-items:center;grid-gap:0.75em;padding:1em" class="noselect">
        
            <div>sun (west-east)</div>
            <div><div id="sunPos"></div></div>
        
            <div>sun (north-south)</div>
            <div><div id="sunPosNS"></div></div>
        
            <div>light</div>
            <div><div id="light"></div></div>
        
            <div>light color</div>
            <div><div id="lightColor"></div></div>
        
            <div>shade</div>
            <div><div id="shade"></div></div>
        
            <div>fog</div>
            <div><div id="fog"></div></div>
        
            <div>fog color</div>
            <div><div id="fogCol"></div></div>
        
            <div>ambient color</div>
            <div><div id="ambCol"></div></div>
        
            <div>toggle snow</div>
            <div><Button id="envSnow">snow</button></div>
        
            <div>toggle rainy</div>
            <div><Button id="envRain">rain</button></div>
        
            <div>fov</div>
            <div><div id="fov"></div></div>
        
            <div>sky</div>
            <div><Button id="skyButton">sky</button></div>
    
            <div>sky color</div>
            <div><div id="skyCol">color</div></div>
        
            <div>sea</div>
            <div>
                <Button id="envSea">add</button>
                <Button id="envSeaEdit">edit</button>
                <Button id="envSeaDel">remove</button>
            </div>
        
            <div>terrain</div>
            <div><Button id="trnButton">edit terrain</button></td
        
</div>`;

let envElement = document.createElement("div");
envElement.style.visibility = "hidden";
envElement.innerHTML = envHTML;
VButton.styleThem(envElement.getElementsByTagName("button"));
var fragment = new DocumentFragment()


export { envElement };