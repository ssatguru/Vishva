export class VButton {
        public static create(id: string, label: string): HTMLButtonElement {
                let btn: HTMLButtonElement = <HTMLButtonElement>document.createElement("BUTTON");
                btn.id = id;
                btn.innerHTML = label;
                this.styleIt(btn);
                return btn;
        }

        public static styleIt(btn: HTMLButtonElement) {
                btn.classList.add("w3-btn");
                btn.style.color = "var(--v-light-fg)";
                btn.style.backgroundColor = "var(--v-light-bg)";
        }

        public static styleThem(btns: HTMLCollectionOf<HTMLButtonElement>) {
                let l = btns.length
                for (let i = 0; i < l; i++) {
                        VButton.styleIt(btns[i]);
                }
        }

}
