import { VButton } from "../components/VButton";

let animHTML = `
<h4>skeleton</h4>
name,id,uniqueId : <label id="skelName"></label>

<div >

        <div class="skelFound" style="margin-top:0.5em">
                <hr>
                <button id="animSkelView">view skeleton</button>
                <button id="animRest">show rest pose</button>
                <hr>
                <button id="animSBS">show bone selector</button>
                <button id="animDBS">hide bone selector</button>
                <br><br>
                <button id="animAttach">attach item to bone</button>
                <button id="animDetach">detach item from bone</button>
        </div>
        <HR>

        <div class="agFound">
                <h4>animation groups</h4>
                <div style="display:grid; grid-template-columns:1fr 3fr; grid-row-gap:0.5em;align-items:center">
                        <div>
                                group
                        </div>

                        <div>
                                <select class="agList w3-select" ></select>
                        </div>

                        <div>
                                from - to
                        </div>

                        <div>
                                <label class="agFrom"></label>
                                -
                                <label class="agTo"></lable>
                        </div>

                        <div>
                                rate
                        </div>

                        <div>
                                <input type="text" class="agRate w3-input" value="1" size="2">
                        </div>

                        <div>
                                loop
                        </div>

                        <div>
                                <input type="checkbox" class="agLoop">
                        </div>
                </div>
                <div style="margin-top:0.5em">
                        <button class="agPlay">play</button>
                        <button class="agStop">stop</button>
                </div>
        </div>

        <div class="arFound">
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
        </div>
</div>
<hr>

<h4>skeletons in scene </h4>
<select id="animSkelList" class="w3-select"></select>
<div style="margin-top:0.5em">
        <button id="animSkelClone">clone skeleton</button>
        <button id="animSkelChange">switch to</button>
        <button id="animSkelLinkAnims">copy animations</button>
</div>
`;
let animElement = document.createElement("div");
animElement.style.padding = "1em";
animElement.innerHTML = animHTML;
VButton.styleThem(animElement.getElementsByTagName("button"));


export { animElement };