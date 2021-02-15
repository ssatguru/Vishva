import { VButton } from "./components/VButton";

let hlpHTML = `
<div id="helpDiv" class="noselect">
        <h6>Avatar Movement Keys</h6>
        <ul>
          <li>Turn left, right - press "A,D" or "left,right arrow" key or press and drag left mouse key</li>
          <li>Strafe left, right - press "Q,E" key</li>
          <li>Go forward, backward - press "W,S" or "up,down arrow" key</li>
          <li>Run - press "shift" key while going forward, backward</li>
          <li>Jump - press and release "space" key</li>
        </ul>

        <h6>Item Edit Keys</h6>
        <ul>
          <li>
            To select an item press 'ALT' and mouse LEFT or RIGHT click the item
            <ul>
              <li>LEFT click will pick the root of that item</li>
              <li>RIGHT click will just pick that item</li>
            </ul>
          </li>
          <li>
            To select multiple item press 'CTL' and mouse LEFT or RIGHT click each of the multiple items
            <ul>
              <li>LEFT click will add the item's root and all its childrens to the items already selected</li>
              <li>RIGHT click will just add that item to items already selected</li>
            </ul>
          </li>
          <li>To deselect item - press"Esc" key</li>
          <li>To move,rotate or scale selected item - press "1,2,or 3" key</li>
          <li>To focus (center the camera) on selected item - press "F" key. To focus back on avatar press "Esc" twice.</li>
          <li>To zoom in or out of focused item - scroll mouse wheel forward or backward</li>
          <li>To pan around focused item - press and drag mouse right key</li>
        </ul>

        <h6>For more help</h6>
        <a href="https://github.com/ssatguru/Vishva.ts/tree/modularize" target="_blank">https://github.com/ssatguru/Vishva.ts/tree/modularize</a>

</div>        
`;


let hlpElement = document.createElement("div");
hlpElement.innerHTML = hlpHTML;
VButton.styleThem(hlpElement.getElementsByTagName("button"));


export { hlpElement };