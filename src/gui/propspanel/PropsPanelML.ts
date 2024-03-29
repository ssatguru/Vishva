import { VButton } from "../components/VButton";
import { VThemes } from "../components/VTheme";

const ppHTML = `
<div id="propsDiag" >
        <div id="propsAcc" >
                <details class="props" id="gen" class="mesh">
                        <summary class="mesh" style="padding:0.5em">General</summary>
                </details>

                <details class="props" id="grndDiv" class="grnd">
                        <summary class="grnd" style="padding:0.5em">Ground Dimensions</summary>
                </details>

                <details class="props" id="Physics" class="mesh">
                        <summary class="mesh" style="padding:0.5em">Physics</summary>
                </details>

                <details class="props" id="Material">
                        <summary style="padding:0.5em">Material</summary>
                </details>

                <details class="props" id="Lights" class="mesh">
                        <summary class="mesh" style="padding:0.5em">Lights</summary>
                </details>

                <details class="props" id="meshAnimDiag" class="mesh">
                        <summary class="mesh" style="padding:0.5em">Skeletons & Animations</summary>
                </details>

                <details class="props" id="grndSPS" class="grnd">
                        <summary class="grnd" style="padding:0.5em">Ground SPS</summary>
                </details>
        </div>
</div>`;

//Note the <summary> text  above is used by PropsPanelUI.getPanelIndex() method


let ppElement = document.createElement("div");
ppElement.style.visibility = "hidden";
// ppElement.style.color = VThemes.CurrentTheme.colors.f;
// ppElement.style.backgroundColor = VThemes.CurrentTheme.colors.b;

ppElement.innerHTML = ppHTML;
VButton.styleThem(ppElement.getElementsByTagName("button"));

export { ppElement };