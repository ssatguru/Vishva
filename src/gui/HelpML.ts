import { VButton } from "./components/VButton";

let hlpHTML = `
<div id="helpDiv" title="Help" class="noselect">
        <h4>Avatar Movement Keys</h4>
        <ul>
          <li>Turn left, right - press "A,D" or "left,right arrow" key or press and drag left mouse key</li>
          <li>Strafe left, right - press "Q,E" key</li>
          <li>Go forward, backward - press "W,S" or "up,down arrow" key</li>
          <li>Run - press "shift" key while going forward, backward</li>
          <li>Jump - press and release "space" key</li>
        </ul>

        <h4>Item Edit Keys</h4>
        <ul>
          <li>
            To select an item
            <ul>
              <li>press"ALT" key and mouse LEFT click the item - this will pick root of item,</li>
              <li>press"ALT" key and mouse RIGHT click the item - this will pick just item,</li>
            </ul>
          </li>
          <li>
            To select multiple item
            <ul>
              <li>press"CTL" key and mouse LEFT click the item - this will pick its root and all its childrens,</li>
              <li>press"CTL" key and mouse RIGHT click the item - this will pick just item,</li>
            </ul>
          </li>
          <li>To deselect item - press"Esc" key</li>
          <li>To move,rotate or scale selected item - press "1,2,or 3" key</li>
          <li>To focus (center the camera) on selected item - press "F" key. To focus back on avatar press "Esc" twice.</li>
          <li>To zoom in or out of focused item - scroll mouse wheel forward or backward</li>
          <li>To pan around focused item - press and drag mouse right key</li>
        </ul>

        <h4>For more help</h4>
        <a href="https://github.com/ssatguru/Vishva.ts/tree/modularize" target="_blank">https://github.com/ssatguru/Vishva.ts/tree/modularize</a>
        <h4></h4>
</div>        
`;


let hlpElement = document.createElement("div");
hlpElement.innerHTML = hlpHTML;
VButton.styleThem(hlpElement.getElementsByTagName("button"));


export { hlpElement };