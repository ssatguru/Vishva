import { VButton } from "../components/VButton";

let animHTML = `
<h4>skeleton</h4>
name,id,uniqueId : <label id="skelName"></label>
<div style="margin-top:0.5em">
<button id="animSkelView">view skeleton</button>
<button id="animRest">show rest pose</button>
</div>


<h4>animation ranges</h4>
<div style="display:grid; grid-template-columns:1fr 3fr; grid-row-gap:0.5em;align-items:center">
        <div>
        range
        </div>
        <div>
        <select id="animList" class="w3-select" ></select>
        </div>

        <div>
        from - to
        </div>
        <div>
                <label id="animFrom"></label>
                -
                <label id="animTo"></lable>
        </div>

        <div>
        rate
        </div>
        <div>
        <input id="animRate" type="text" class="w3-input" value="1" size="2">
        </div>

        <div>
        loop
        </div>
        <div>
        <input type="checkbox" id="animLoop">
        </div>
</div>
<div style="margin-top:0.5em">
<button id="playAnim">play</button>
<button id="stopAnim">stop</button>
<button id="remAnim">remove</button>
<button id="delAnim">delete</button>
</div>

<h4>create/update an animation range</h4>
<div style="display:grid;grid-template-columns:3fr 1fr 1fr">
        
        <div>range name</div>
        <div>from frame</div>
        <div>to frame</div>

        <div><input type="text" class="w3-input" id="animRangeName"></div>
        <div><input type="text" class="w3-input" id="animRangeStart" size="2" ></div>
        <div><input type="text" class="w3-input" id="animRangeEnd" size="2"></div>    

</div>
<button id="animRangeMake" style="margin-top:0.5em">create/update</button>

<hr>

<h4>skeletons in scene </h4>
<select id="animSkelList" class="ui-widget-content ui-corner-all w3-select"></select>

<div style="margin-top:0.5em">
<button id="animSkelChange">switch to</button>
<button id="animSkelClone">copy animations</button>
<div>
`;
let animElement = document.createElement("div");
animElement.style.padding = "1em";
animElement.innerHTML = animHTML;
VButton.styleThem(animElement.getElementsByTagName("button"));


export { animElement };