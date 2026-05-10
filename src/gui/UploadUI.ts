import { VButton } from "./components/VButton";

/**
 * Handles file/folder upload via hidden <input type="file"> elements.
 * Provides a dropdown menu with "Upload File(s)" and "Upload Folder" options,
 * following the same pattern as the curated assets menu (AddMenu) in NavBarML.
 */
export class UploadUI {

    private _fileInput: HTMLInputElement;
    private _folderInput: HTMLInputElement;
    private _uploadMenu: HTMLDivElement;
    private _vishva: any;

    constructor(vishva: any) {
        this._vishva = vishva;
        this._createFileInputs();
        this._createUploadMenu();
    }

    /**
     * Show/hide the upload dropdown menu (file vs folder choice).
     */
    public handleUploadClick(): void {
        if (this._uploadMenu.style.display === "none") {
            this._uploadMenu.style.display = "block";
        } else {
            this._uploadMenu.style.display = "none";
        }
    }

    private _createFileInputs(): void {
        // Hidden file input for selecting one or more files
        // No accept filter — users need to select model files AND their dependencies
        // (e.g., .obj + .mtl + .tga textures)
        this._fileInput = document.createElement("input");
        this._fileInput.type = "file";
        this._fileInput.multiple = true;
        this._fileInput.style.display = "none";
        this._fileInput.addEventListener("change", () => {
            this._onFilesSelected(this._fileInput.files);
            // Reset so the same file can be re-selected
            this._fileInput.value = "";
        });
        document.body.appendChild(this._fileInput);

        // Hidden file input for folder selection
        this._folderInput = document.createElement("input");
        this._folderInput.type = "file";
        this._folderInput.setAttribute("webkitdirectory", "");
        this._folderInput.style.display = "none";
        this._folderInput.addEventListener("change", () => {
            this._onFolderSelected(this._folderInput.files);
            // Reset so the same folder can be re-selected
            this._folderInput.value = "";
        });
        document.body.appendChild(this._folderInput);
    }

    private _createUploadMenu(): void {
        // Dropdown menu following the same pattern as AddMenu
        this._uploadMenu = document.createElement("div");
        this._uploadMenu.style.display = "none";
        this._uploadMenu.style.position = "absolute";
        this._uploadMenu.style.zIndex = "inherit";

        // "Upload File(s)" button
        let fileBtn: HTMLButtonElement = VButton.create("uploadFiles", "Upload File(s)");
        fileBtn.style.display = "block";
        fileBtn.style.margin = "0.2em";
        fileBtn.onclick = () => {
            this._fileInput.click();
            this._uploadMenu.style.display = "none";
        };
        this._uploadMenu.appendChild(fileBtn);

        // "Upload Folder" button
        let folderBtn: HTMLButtonElement = VButton.create("uploadFolder", "Upload Folder");
        folderBtn.style.display = "block";
        folderBtn.style.margin = "0.2em";
        folderBtn.onclick = () => {
            this._folderInput.click();
            this._uploadMenu.style.display = "none";
        };
        this._uploadMenu.appendChild(folderBtn);

        // Hide folder option if webkitdirectory is not supported
        if (!('webkitdirectory' in document.createElement('input'))) {
            folderBtn.style.display = "none";
        }

        // Attach the menu next to the upload button in the DOM
        let uploadBtn = document.getElementById("uploadAsset");
        if (uploadBtn && uploadBtn.parentElement) {
            // Wrap the button and menu in an inline-block div (same as navCAssets + AddMenu pattern)
            let wrapper = document.createElement("div");
            wrapper.style.display = "inline-block";
            uploadBtn.parentElement.insertBefore(wrapper, uploadBtn);
            wrapper.appendChild(uploadBtn);
            wrapper.appendChild(this._uploadMenu);
        }
    }

    private _onFilesSelected(files: FileList): void {
        if (!files || files.length === 0) return;
        let fileArray: File[] = Array.from(files);
        this._vishva.loadManager.processDroppedFiles(fileArray);
    }

    private _onFolderSelected(files: FileList): void {
        if (!files || files.length === 0) return;
        let fileArray: File[] = Array.from(files);
        this._vishva.loadManager.processDroppedFiles(fileArray);
    }
}
