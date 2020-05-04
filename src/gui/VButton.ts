export class VButton {
        public static create(id: string, label: string): HTMLButtonElement {
                let btn: HTMLButtonElement = <HTMLButtonElement>document.createElement("BUTTON");

                btn.id = id;
                btn.innerHTML = label;

                btn.className = "w3-btn w3-round w3-theme-d1";

                return btn;


        }

        public static styleIt(btn: HTMLButtonElement) {
                btn.classList.add("w3-btn");
                btn.classList.add("w3-theme-d1");
                // btn.classList.add("w3-card");
                btn.classList.add("w3-round");
        }

}