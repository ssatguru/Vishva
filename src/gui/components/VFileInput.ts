import { DialogMgr } from "../DialogMgr";
import { VDiag } from "./VDiag";
import { VTreeDialog } from "./VTreeDialog";

/**
 * provides a ui to input a vector3 value
 */
export class VFileInput {


    constructor(eID: string | HTMLElement, private value = "", title = "", pos = VDiag.centerBottom, treeContent: Array<any>, filter = "", openAll = true) {
        let e: HTMLElement;

        if (eID instanceof HTMLElement) {
            e = eID;
        } else e = document.getElementById(eID);


        let fib: HTMLButtonElement = document.createElement("button");
        let fibL: HTMLLabelElement = document.createElement("label");
        if (value == null) {
            fibL.textContent = "No file chosen";
        } else {
            fibL.textContent = value;
        }
        fib.innerText = "Choose File";
        let fiTD: VTreeDialog;
        fib.onclick = (e) => {

            fiTD = new VTreeDialog(null, title, pos, treeContent, filter, openAll);

            fiTD.addTreeListener((f, p, l) => {
                if (l) {
                    if (filter.indexOf(f.substring(f.length - 4)) >= 0) {
                        fibL.textContent = p + f
                        //TODO set this value only if "save button clicked
                        this.value = "vishva/" + fibL.textContent;

                    }
                }
            })

            fiTD.toggle();
        }

        e.appendChild(fibL);
        e.appendChild(document.createElement("br"));
        e.appendChild(fib);

    }



    public getValue(): string {
        return this.value;
    }
    public setValue(s: string) {
        this.value = s;
    }

}