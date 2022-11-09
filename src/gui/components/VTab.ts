import { DivideBlock } from "babylonjs/Materials/Node/Blocks/divideBlock";
import { Vishva } from "../../Vishva";

export class VTab {

        // <div  style="padding-top:0.5em">
        //   <!--- tab buttons - one button for each tab-->
        //   <div class="w3-bar ">
        //     <button class="w3-bar-item w3-btn vtablink" style="margin-right:1em">tab1</button>
        //     <button class="w3-bar-item w3-btn vtablink" >tab2</button>
        //     <button class="w3-bar-item w3-btn vtablink" >tab3</button>
        //     ....
        //   </div>
        //   <!--- tab content - one div for each tab content -->
        //   <div class="w3-card  w3-padding vtab"><div>
        //   <div class="w3-card  w3-padding vtab" style="display:none"><div>
        //   <div class="w3-card  w3-padding vtab" style="display:none"><div>
        //   ....     
        // </div>

        // a map to map tab name to the content div
        mapTab2Div: {} = {};
        public _e: HTMLElement;

        constructor(...tabs: string[]) {

                let rootDiv: HTMLDivElement = document.createElement("div");
                rootDiv.style.paddingTop = "0.5em";
                rootDiv.style.backgroundColor = Vishva.theme.lightColors.b;

                let tabDiv: HTMLDivElement = document.createElement("div");
                tabDiv.className = "w3-bar";

                rootDiv.append(tabDiv);

                let firstTab: boolean = true;
                for (let tab of tabs) {
                        //buttons for each tab
                        let button = document.createElement("button");
                        button.className = "w3-bar-item w3-btn vtablink";
                        if (firstTab) {
                                button.style.marginRight = "1em";
                                //darken the first tab link - on opening the first one is assumed to be selected
                                button.style.backgroundColor = Vishva.theme.darkColors.b;
                                button.style.color = Vishva.theme.darkColors.f;
                                button.style.boxShadow = "0 8px 16px 0 rgba(0, 0, 0, 1)";
                        } else {
                                //lighten the others
                                button.style.backgroundColor = Vishva.theme.lightColors.b;
                                button.style.color = Vishva.theme.lightColors.f;
                                button.style.boxShadow = "none";
                        }
                        button.onclick = (e) => this.openTab(<HTMLButtonElement>e.target, rootDiv);
                        button.innerText = tab;
                        tabDiv.append(button);

                        //div for each tab content
                        let contentDiv = document.createElement("div");
                        contentDiv.className = "w3-card  w3-padding vtab";
                        contentDiv.style.backgroundColor = Vishva.theme.darkColors.b;
                        contentDiv.style.color = Vishva.theme.darkColors.f;
                        if (firstTab) firstTab = false; else contentDiv.style.display = "none";
                        this.mapTab2Div[tab] = contentDiv;
                        rootDiv.appendChild(contentDiv);
                }

                this._e = rootDiv;
        }

        private openTab(btn: HTMLButtonElement, ele: HTMLElement) {

                let contentDiv = this.mapTab2Div[btn.innerText];

                //display the tab body of the tab clicked and hide the other one
                let x: HTMLCollectionOf<Element> = ele.getElementsByClassName("vtab");
                for (let i = 0; i < x.length; i++) {
                        if (x[i] === contentDiv) {
                                (<HTMLElement>x[i]).style.display = "block";
                        } else
                                (<HTMLElement>x[i]).style.display = "none";
                }

                //darken the tab button which was clicked and lighten the others (body of all are dark)
                x = ele.getElementsByClassName("vtablink");
                for (let i = 0; i < x.length; i++) {
                        if (x[i] === btn) {
                                (<HTMLElement>x[i]).style.backgroundColor = Vishva.theme.darkColors.b;
                                (<HTMLElement>x[i]).style.color = Vishva.theme.darkColors.f;
                                (<HTMLElement>x[i]).style.boxShadow = "0 8px 16px 0 rgba(0, 0, 0, 1)";
                        } else {
                                (<HTMLElement>x[i]).style.backgroundColor = Vishva.theme.lightColors.b;
                                (<HTMLElement>x[i]).style.color = Vishva.theme.lightColors.f;
                                (<HTMLElement>x[i]).style.boxShadow = "none";
                        }

                }

        }

        //given a tabname returns the div which should contain the content for that tab
        public getTabDiv(tabName: string): HTMLDivElement {
                return this.mapTab2Div[tabName];
        }
}