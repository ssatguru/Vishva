import { VButton } from "../components/VButton";

let animHTML = `
<br>skeleton name : <label id="skelName"></label>
<br>
<button id="animSkelView">view skeleton</button>
<button id="animRest">show rest pose</button>

<br>
<br>skeleton animation ranges
<table>
        <tr>
        <td>range</td>
        <td><select id="animList"></select>
                <label id="animFrom"></label>
                <label id="animTo"></lable>
        </tr>
        <tr>
        <td>rate</td>
        <td><input id="animRate" type="text" value="1" size="2"></td>
        </tr>
        <tr>
        <td>loop</td>
        <td><input type="checkbox" id="animLoop"></td>
        </tr>
</table>
<button id="playAnim">play</button>
<button id="stopAnim">stop</button>
<button id="remAnim">remove</button>
<button id="delAnim">delete</button>
<br>
<br>
create/modify an animation range
<table>
        <tr>
        <td>range name</td>
        <td>from frame</td>
        <td>to frame</td>
        </tr>
        <tr>
        <td><input type="text" id="animRangeName"></td>
        <td><input type="text" id="animRangeStart" size="2" ></td>
        <td><input type="text" id="animRangeEnd" size="2"></td>    
        </tr>
</table>
<button id="animRangeMake">create</button>
<br>
<hr>
<br>
skeletons in scene : <select id="animSkelList" class="ui-widget-content ui-corner-all"></select>
<br>
<br>
<button id="animSkelChange">switch to</button>
<button id="animSkelClone">clone and switch to</button>
`;
let animElement = document.createElement("div");
animElement.innerHTML = animHTML;
VButton.styleThem(animElement.getElementsByTagName("button"));


export { animElement };