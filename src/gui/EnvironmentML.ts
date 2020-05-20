import { VButton } from "./components/VButton";

const envHTML: string = `
<div id="envDiv" title="Environment" class="noselect">
    <table style="width: 100%; text-align: left;">
        <tr>
            <td>sun (west-east)</td>
            <td><div id="sunPos"></div></td>
        </tr>
        <tr>
            <td>sun (north-south)</td>
            <td><div id="sunPosNS"></div></td>
        </tr>
        <tr>
            <td>light</td>
            <td><div id="light"></div></td>
        </tr>
        <tr>
            <td>light color</td>
            <td><div id="lightColor"></div></td>
        </tr>
        <tr>
            <td>shade</td>
            <td><div id="shade"></div></td>
        </tr>
        <tr>
            <td>fog</td>
            <td><div id="fog"></div></td>
        </tr>
        <tr>
            <td>fog color</td>
            <td><div id="fogCol"></div></td>
        </tr>
        <tr>
            <td>ambient color</td>
            <td><div id="ambCol"></div></td>
        </tr>
        <tr>
            <td>toggle snow</td>
            <td><Button id="envSnow">snow</button></td>
        </tr>
        <tr>
            <td>toggle rainy</td>
            <td><Button id="envRain">rain</button></td>
        </tr>
        <tr>
            <td>fov</td>
            <td><div id="fov"></div></td>
        </tr>
        <tr>
            <td>sky</td>
            <td>
                <Button id="skyButton">sky</button>
            </td>
        </tr>
        <tr>
                <td>sky color</td>
                <td>
                    <div id="skyCol">color</div>
                </td>
            </tr>
        <tr>
            <td>sea</td>
            <td><Button id="envSea">add</button>
                <Button id="envSeaEdit">edit</button>
                <Button id="envSeaDel">remove</button>
            </td>
        </tr>
        <tr>
            <td>terrain</td>
            <td><Button id="trnButton">edit terrain</button></td
        </tr>
    </table>
</div>`;

let envElement = document.createElement("div");
envElement.innerHTML = envHTML;
VButton.styleThem(envElement.getElementsByTagName("button"));
var fragment = new DocumentFragment()


export { envElement };