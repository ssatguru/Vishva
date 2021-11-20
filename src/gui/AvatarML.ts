
const avHTML: string = `

<div  style="padding:0.5em; display:grid; grid-template-columns:auto auto; grid-gap:0.5em;">

        <label>face forward</label>
        <input class="faceFor" type="checkbox"/>

        <div  style="padding:0.5em; display:grid; grid-template-columns:auto auto; grid-gap:0.5em;">
             
                <div>motion</div>
                <div>animation</div>

                <label>idle</label>
                <div class="idle"></div>

                <label>idle jump</label>
                <div class="idleJump"></div>

                <label>walk</label>
                <div class="walk"></div>

                <label>walk back</label>
                <div class="walkBack"></div>

                <label>walk back fast</label>
                <div class="walkBackFast"></div>

                <label>run</label>
                <div class="run"></div>

                <label>run jump</label>
                <div class="runJump"></div>

                <label>fall</label>
                <div class="falll"></div>

                <label>fall</label>
                <div class="fall"></div>

                <label>turn right</label>
                <div class="turnRight"></div>

                <label>turn right fast</label>
                <div class="turnRightFast"></div>

                <label>turn left</label>
                <div class="turnLeft"></div>

                <label>turn left fast</label>
                <div class="turnLeftFast"></div>

                <label>strafe right</label>
                <div class="strafeRight"></div>

                <label>strafe right fast</label>
                <div class="strafeRightFast"></div>

                <label>strafe left</label>
                <div class="strafeLeft"></div>

                <label>strafe left fast</label>
                <div class="strafeLeftFast"></div>

                <label>slide down</label>
                <div class="slideDown"></div>
        </div>

        <div  class="animList" style="padding:0.5em; display:grid; grid-template-columns:auto; grid-auto-rows: min-content; grid-gap:0.5em;">
                <div> range/group </div>
                <div> walk </div>
                <div> run </div>
        </div>
</div>
`;

export { avHTML };
