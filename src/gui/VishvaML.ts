import { VButton } from "./components/VButton";

const saveHTML: string = `
<div id="saveDiv" oncontextmenu="event.stopPropagation();return true;">
        <br/>
        Your world file is ready for download.
        <p>
        <a id="downloadLink" href="www" download oncontextmenu="return true;">
                Right click here
        </a>
        <br>
        then select "Save link as..." 
        <br>
        to save this file on your computer
        <br />
        <br />
        </p>
</div>

<div id="saveAssetDiv" oncontextmenu="event.stopPropagation();return true;">
        <br/>Your asset file is ready for download.
        <p>
        <a id="downloadAssetLink" href="www" download oncontextmenu="return true;">
                Right click here
        </a>
        <br>
        then select "Save link as..." 
        <br>
        to save this file on your computer
        <br/>
        <br/>
        </p>
</div>`;


let saveElement = document.createElement("div");
saveElement.innerHTML = saveHTML;
saveElement.style.visibility = "hidden";
VButton.styleThem(saveElement.getElementsByTagName("button"));
var fragment = new DocumentFragment()


export { saveElement };      