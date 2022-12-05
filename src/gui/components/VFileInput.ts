import { Vishva } from "../../Vishva";
import { DialogMgr } from "../DialogMgr";
import { VDiag } from "./VDiag";
import { VTreeDialog } from "./VTreeDialog";

/**
 * provides a ui to input a file
 */
export class VFileInput {


    constructor(eID: string | HTMLElement, private value = "", title = "", pos = VDiag.centerBottom, treeContent: Array<any>, filter = "", openAll = true) {
        let e: HTMLElement = null;
        let ein: HTMLInputElement = null;
        let fibL: HTMLLabelElement = null;
        const noFile: string = "No file chosen";

        let fib: HTMLButtonElement = document.createElement("button");
        fib.innerText = "Choose File";
        fib.type = "button";

        if (eID instanceof HTMLInputElement) {
            ein = eID;
            ein.value = (value == null) ? noFile : value;
            ein.readOnly = true;
            let br = document.createElement("br");
            ein.insertAdjacentElement('afterend', br);
            br.insertAdjacentElement('afterend', fib);
        } else {
            if (eID instanceof HTMLElement) {
                e = eID;
            } else e = document.getElementById(eID);

            fibL = document.createElement("label");
            fibL.textContent = (value == null) ? noFile : value;
            e.appendChild(fibL);
            e.appendChild(document.createElement("br"));
            e.appendChild(fib);
        }

        let fiTD: VTreeDialog;
        fib.onclick = (e) => {

            fiTD = new VTreeDialog(null, title, pos, treeContent, filter, openAll);

            fiTD.addTreeListener((f, p, l) => {
                if (l) {
                    if (filter.indexOf(f.substring(f.length - 4)) >= 0) {
                        if (fibL != null)
                            fibL.textContent = Vishva.vHome + "assets/" + p + f;
                        else
                            ein.value = Vishva.vHome + "assets/" + p + f;
                        //TODO set this value only if "save button clicked
                        this.value = Vishva.vHome + "assets/" + p + f;

                    }
                }
            })

            // fiTD.toggle();
        }

    }



    public getValue(): string {
        return this.value;
    }
    public setValue(s: string) {
        this.value = s;
    }

}