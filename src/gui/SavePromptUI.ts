import { Vishva } from "../Vishva";
import { DialogMgr } from "./DialogMgr";
import { VButton } from "./components/VButton";
import { VDiag } from "./components/VDiag";
import { getDefaultWorldName, isValidWorldName, normalizeWorldName } from "./SavePromptLogic";

/**
 * UI class for the Save World Name Prompt dialog.
 * Displays a modal dialog that lets the user confirm or edit the world name
 * before saving to IndexedDB. Offers two save formats:
 * - Full (with assets) — stores scene + all assets in IndexedDB
 * - JSON only — stores just the scene JSON (assets loaded from server)
 */
export class SavePromptUI {
    private _dialog: VDiag;
    private _nameInput: HTMLInputElement;
    private _errorMsg: HTMLElement;

    constructor() {
        // Build dialog content
        const container = document.createElement("div");
        container.style.padding = "1em";

        // Label
        const label = document.createElement("label");
        label.innerText = "World Name:";
        label.style.display = "block";
        label.style.marginBottom = "0.5em";
        container.appendChild(label);

        // Text input
        this._nameInput = document.createElement("input");
        this._nameInput.type = "text";
        this._nameInput.style.width = "100%";
        this._nameInput.style.padding = "0.4em";
        this._nameInput.style.boxSizing = "border-box";
        this._nameInput.classList.add("w3-input");
        container.appendChild(this._nameInput);

        // Error message element
        this._errorMsg = document.createElement("div");
        this._errorMsg.style.color = "#f44336";
        this._errorMsg.style.fontSize = "0.85em";
        this._errorMsg.style.marginTop = "0.3em";
        this._errorMsg.style.minHeight = "1.2em";
        container.appendChild(this._errorMsg);

        // Create modal dialog
        this._dialog = new VDiag(container, "Save World", VDiag.center, "24em", "auto", "18em", true);

        // Add Cancel, Save JSON, and Save Full buttons via VDiag's addButton
        const cancelBtn = this._dialog.addButton("Cancel");
        const saveJsonBtn = this._dialog.addButton("Save (JSON only)");
        const saveBtn = this._dialog.addButton("Save (with assets)");

        // Clear error when user modifies input
        this._nameInput.addEventListener("input", () => {
            this._errorMsg.innerText = "";
        });

        // Save (with assets) button click handler
        saveBtn.onclick = async () => {
            const name = this._validateAndGetName();
            if (!name) return;

            this.hide();
            const success = await Vishva.vishva.saveManager.saveWorldToIndexedDB(name);
            if (success) {
                Vishva.worldName = name;
            }
        };

        // Save (JSON only) button click handler
        saveJsonBtn.onclick = async () => {
            const name = this._validateAndGetName();
            if (!name) return;

            this.hide();
            const success = await Vishva.vishva.saveManager.saveWorldToIndexedDBAsJson(name);
            if (success) {
                Vishva.worldName = name;
            }
        };

        // Cancel button click handler
        cancelBtn.onclick = () => {
            this.hide();
        };

        // Also handle dialog close via the X button
        this._dialog.onHide(() => {
            this._errorMsg.innerText = "";
        });

        // Start hidden
        this._dialog.hide(false);
    }

    /**
     * Validate the name input and return the normalized name, or null if invalid.
     */
    private _validateAndGetName(): string | null {
        const rawValue = this._nameInput.value;

        if (!isValidWorldName(rawValue)) {
            this._errorMsg.innerText = "Name cannot be empty.";
            return null;
        }

        return normalizeWorldName(rawValue.trim());
    }

    /**
     * Show the prompt pre-filled with the given world name.
     */
    public show(currentWorldName: string): void {
        this._nameInput.value = getDefaultWorldName(currentWorldName);
        this._errorMsg.innerText = "";
        this._dialog.show();
        this._nameInput.focus();
        this._nameInput.select();
    }

    /**
     * Hide the prompt without saving.
     */
    public hide(): void {
        this._dialog.hide();
    }
}
