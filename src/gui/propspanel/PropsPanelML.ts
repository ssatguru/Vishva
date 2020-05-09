import { VButton } from "../components/VButton";

const ppHTML = `
<div id="propsDiag" title="mesh properties" >
<div id="propsAcc" >
        <h3 class="mesh">General</h3>
        <div id="gen" class="mesh"></div>

        <h3 class="grnd">Ground Dimensions</h3>
        <div id="grndDiv" class="grnd"></div>

        <h3 class="mesh">Physics</h3>
        <div id="Physics" class="mesh" ></div>

        <h3 >Material</h3>
        <div id="Material"></div>

        <h3 class="mesh">Lights</h3>
        <div id="Lights" class="mesh"></div>

        <h3 class="mesh">Animations</h3>
        <div id="meshAnimDiag" class="mesh"></div>

        <h3 class="grnd">Ground SPS</h3>
        <div id="grndSPS" class="grnd"></div>
</div>
</div>`;


let ppElement = document.createElement("div");
ppElement.style.visibility = "hidden";
ppElement.innerHTML = ppHTML;
VButton.styleThem(ppElement.getElementsByTagName("button"));

export { ppElement };