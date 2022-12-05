
const sndFormHtml: string = `

<form class="snd-settings" style="padding:0.5em; display:grid; grid-template-columns:min-content min-content; white-space: nowrap;grid-gap:0.5em;">
        <label>sound file</label>
        <input name="sndFile" type="text"/>
        
        <label>attach to mesh</label>
        <input name="attachToMesh" type="checkbox"/>

        <label>distamce model</label>
        <select name="distModel" ></select>

        <label title="used with linear distance model">max distance</label>
        <input name="maxDist" type="text" value="100"  >
        
        <label title="used with inverse or exponential distance model">roll off factor</label>
        <input name="rollOff" type="text" />
        
        <label title="used with inverse or exponential distance model">reference distance</label>
        <input name="refDist" type="text" />

        <label>volume</label>
        <input name="vol" type="text" value="0.01"/>
</form>
`;

let sndElement = document.createElement("div");
sndElement.innerHTML = sndFormHtml;
export { sndElement };
