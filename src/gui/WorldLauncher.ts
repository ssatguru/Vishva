/**
 * Full-page launcher UI shown when no world is specified.
 * Creates DOM dynamically, presents world-loading options,
 * and triggers page reload with the appropriate ?world= parameter.
 *
 * This class is completely independent of Vishva — it runs BEFORE
 * Vishva is instantiated.
 */

import { buildWorldQueryString, processServerWorldList, storeUploadedWorld, deleteWorldFromStore, exportWorldAsTarGz } from "./WorldLauncherLogic";
import { VThemes } from "./components/VTheme";
import { AssetStore } from "../managers/AssetStore";

/* global variable from userAssets.js script loaded during startup */
declare var worlds: Array<any>;

export class WorldLauncher {
    private _overlay: HTMLDivElement;
    private _contentArea: HTMLDivElement;
    private _panelButtons: HTMLButtonElement[] = [];

    constructor() {
        this._overlay = this._createOverlay();
        document.body.appendChild(this._overlay);
    }

    /** Remove the launcher DOM from the page */
    public dispose(): void {
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
    }

    private _createOverlay(): HTMLDivElement {
        const overlay = document.createElement("div");
        overlay.id = "worldLauncherOverlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.92)";
        overlay.style.zIndex = "10000";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.fontFamily = "Arial, sans-serif";

        const container = this._createContainer();
        overlay.appendChild(container);

        return overlay;
    }

    private _createContainer(): HTMLDivElement {
        const container = document.createElement("div");
        container.className = "w3-card-4";
        container.style.backgroundColor = VThemes.CurrentTheme.darkColors.b;
        container.style.color = VThemes.CurrentTheme.darkColors.f;
        container.style.width = "90%";
        container.style.maxWidth = "600px";
        container.style.borderRadius = "8px";
        container.style.overflow = "hidden";

        // Title
        const titleBar = document.createElement("div");
        titleBar.className = "w3-container w3-padding";
        titleBar.style.backgroundColor = VThemes.CurrentTheme.colors.b;
        titleBar.style.color = VThemes.CurrentTheme.colors.f;
        titleBar.style.textAlign = "center";

        const title = document.createElement("h2");
        title.textContent = "Vishva - World Launcher";
        title.style.margin = "8px 0";
        titleBar.appendChild(title);
        container.appendChild(titleBar);

        // Panel buttons row
        const btnRow = document.createElement("div");
        btnRow.className = "w3-bar w3-padding";
        btnRow.style.backgroundColor = VThemes.CurrentTheme.darkColors.b;
        btnRow.style.display = "flex";
        btnRow.style.justifyContent = "center";
        btnRow.style.gap = "8px";
        btnRow.style.flexWrap = "wrap";

        const serverBtn = this._createPanelButton("Load from Server", () => this._showServerPanel());
        const storageBtn = this._createPanelButton("Load from Browser Storage", () => this._showBrowserStoragePanel());
        const uploadBtn = this._createPanelButton("Upload a File", () => this._showUploadPanel());

        btnRow.appendChild(serverBtn);
        btnRow.appendChild(storageBtn);
        btnRow.appendChild(uploadBtn);
        container.appendChild(btnRow);

        // Content area (shows content for active panel)
        this._contentArea = document.createElement("div");
        this._contentArea.className = "w3-container w3-padding";
        this._contentArea.style.minHeight = "150px";
        this._contentArea.style.maxHeight = "300px";
        this._contentArea.style.overflowY = "auto";
        container.appendChild(this._contentArea);

        // Empty World button (always visible)
        const emptyBtnContainer = document.createElement("div");
        emptyBtnContainer.className = "w3-container w3-padding w3-center";
        emptyBtnContainer.style.borderTop = "1px solid " + VThemes.CurrentTheme.lightColors.b;

        const emptyBtn = document.createElement("button");
        emptyBtn.className = "w3-button w3-round";
        emptyBtn.textContent = "Empty World";
        emptyBtn.style.backgroundColor = VThemes.CurrentTheme.lightColors.b;
        emptyBtn.style.color = VThemes.CurrentTheme.lightColors.f;
        emptyBtn.style.padding = "10px 32px";
        emptyBtn.style.marginTop = "4px";
        emptyBtn.style.marginBottom = "4px";
        emptyBtn.onclick = () => {
            window.location.search = buildWorldQueryString("empty");
        };
        emptyBtnContainer.appendChild(emptyBtn);
        container.appendChild(emptyBtnContainer);

        return container;
    }

    private _createPanelButton(label: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.className = "w3-button w3-round";
        btn.textContent = label;
        btn.style.backgroundColor = VThemes.CurrentTheme.lightColors.b;
        btn.style.color = VThemes.CurrentTheme.lightColors.f;
        btn.style.padding = "8px 16px";
        btn.onclick = () => {
            // Highlight active button
            this._panelButtons.forEach(b => {
                b.style.backgroundColor = VThemes.CurrentTheme.lightColors.b;
                b.style.color = VThemes.CurrentTheme.lightColors.f;
            });
            btn.style.backgroundColor = VThemes.CurrentTheme.colors.b;
            btn.style.color = VThemes.CurrentTheme.colors.f;
            onClick();
        };
        this._panelButtons.push(btn);
        return btn;
    }

    // ─── Load from Server ───────────────────────────────────────────────

    private _showServerPanel(): void {
        this._contentArea.innerHTML = "";

        // Use the worlds global variable (populated by updateAssets.js) instead of fetching index.json
        if (typeof worlds === "undefined" || !Array.isArray(worlds)) {
            const errMsg = document.createElement("div");
            errMsg.className = "w3-panel w3-padding";
            errMsg.style.color = "#ff6b6b";
            errMsg.textContent = "No server world list available";
            this._contentArea.appendChild(errMsg);
            return;
        }

        // worlds is an array of strings (filenames) and objects (directories).
        // Extract just the string filenames at the top level for the world list.
        const filenames: string[] = worlds.filter(item => typeof item === "string");
        const serverWorlds = processServerWorldList(filenames);

        if (serverWorlds.length === 0) {
            const msg = document.createElement("div");
            msg.className = "w3-center w3-padding";
            msg.textContent = "No worlds available on server";
            msg.style.color = VThemes.CurrentTheme.darkColors.f;
            this._contentArea.appendChild(msg);
            return;
        }

        const list = this._createWorldList(serverWorlds.map(w => ({
            name: w.display,
            onClick: () => {
                window.location.search = buildWorldQueryString(w.filename);
            }
        })));
        this._contentArea.appendChild(list);
    }

    // ─── Load from Browser Storage ──────────────────────────────────────

    private _showBrowserStoragePanel(): void {
        this._contentArea.innerHTML = "";

        const loading = document.createElement("div");
        loading.className = "w3-center w3-padding";
        loading.textContent = "Loading...";
        loading.style.color = VThemes.CurrentTheme.darkColors.f;
        this._contentArea.appendChild(loading);

        this._loadBrowserWorldsWithType()
            .then(worlds => {
                this._contentArea.innerHTML = "";

                if (worlds.length === 0) {
                    this._showEmptyState();
                    return;
                }

                const listContainer = document.createElement("div");
                for (const world of worlds) {
                    const displayName = world.type === "json"
                        ? world.name + " (Scene without assets)"
                        : world.name + " (Scene with assets)";
                    const row = this._createBrowserWorldRow(
                        world.name,
                        listContainer,
                        () => {
                            window.location.search = buildWorldQueryString("__saved:" + world.name);
                        },
                        displayName
                    );
                    listContainer.appendChild(row);
                }
                this._contentArea.appendChild(listContainer);
            })
            .catch(() => {
                this._contentArea.innerHTML = "";
                const errMsg = document.createElement("div");
                errMsg.className = "w3-panel w3-padding";
                errMsg.style.color = "#ff6b6b";
                errMsg.textContent = "Browser storage is unavailable";
                this._contentArea.appendChild(errMsg);
            });
    }

    private async _loadBrowserWorlds(): Promise<string[]> {
        if (!AssetStore.isAvailable()) {
            throw new Error("IndexedDB is not available");
        }
        const store = new AssetStore();
        try {
            await store.open();
            const worlds = await store.listSavedWorlds();
            return worlds;
        } finally {
            store.close();
        }
    }

    private async _loadBrowserWorldsWithType(): Promise<Array<{ name: string; type: "json" | "full" }>> {
        if (!AssetStore.isAvailable()) {
            throw new Error("IndexedDB is not available");
        }
        const store = new AssetStore();
        try {
            await store.open();
            const worldNames = await store.listSavedWorlds();
            const results: Array<{ name: string; type: "json" | "full" }> = [];
            for (const name of worldNames) {
                const keys = await store.listSavedKeys(name);
                const isJson = keys.length === 1 && keys[0] === "__world.json";
                results.push({ name, type: isJson ? "json" : "full" });
            }
            return results;
        } finally {
            store.close();
        }
    }

    // ─── Upload a File ──────────────────────────────────────────────────

    private _showUploadPanel(): void {
        this._contentArea.innerHTML = "";

        const uploadContainer = document.createElement("div");
        uploadContainer.className = "w3-center w3-padding";

        const label = document.createElement("p");
        label.textContent = "Select a .tar.gz world file to upload:";
        label.style.color = VThemes.CurrentTheme.darkColors.f;
        uploadContainer.appendChild(label);

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".tar.gz";
        fileInput.style.color = VThemes.CurrentTheme.darkColors.f;
        fileInput.style.margin = "8px 0";

        const statusMsg = document.createElement("div");
        statusMsg.className = "w3-padding";
        statusMsg.style.marginTop = "8px";

        fileInput.addEventListener("change", () => {
            if (!fileInput.files || fileInput.files.length === 0) return;
            const file = fileInput.files[0];

            // Show processing indicator
            statusMsg.textContent = "Processing...";
            statusMsg.style.color = VThemes.CurrentTheme.darkColors.f;

            storeUploadedWorld(file).then(result => {
                if (result.success) {
                    window.location.search = "?world=__uploaded";
                } else {
                    statusMsg.textContent = result.error || "Upload failed";
                    statusMsg.style.color = "#ff6b6b";
                }
            });
        });

        uploadContainer.appendChild(fileInput);
        uploadContainer.appendChild(statusMsg);
        this._contentArea.appendChild(uploadContainer);
    }

    // ─── Browser Storage Row ────────────────────────────────────────────

    private _createBrowserWorldRow(
        worldName: string,
        listContainer: HTMLDivElement,
        onLoad: () => void,
        displayName?: string
    ): HTMLDivElement {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.borderBottom = "1px solid rgba(255,255,255,0.1)";

        // World name (clickable to load)
        const nameSpan = document.createElement("span");
        nameSpan.className = "w3-button w3-hover-dark-grey";
        nameSpan.style.flex = "1";
        nameSpan.style.color = VThemes.CurrentTheme.darkColors.f;
        nameSpan.style.padding = "10px 16px";
        nameSpan.style.textAlign = "left";
        nameSpan.textContent = displayName || worldName;
        nameSpan.onclick = onLoad;

        // Export button
        const exportBtn = document.createElement("button");
        exportBtn.className = "w3-button w3-hover-dark-grey";
        exportBtn.title = "export world";
        exportBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px">download</span>';
        exportBtn.style.color = VThemes.CurrentTheme.darkColors.f;
        exportBtn.onclick = (e) => {
            e.stopPropagation();
            this._exportWorld(worldName, exportBtn, row);
        };

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "w3-button w3-hover-dark-grey";
        deleteBtn.title = "delete world";
        deleteBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px">delete</span>';
        deleteBtn.style.color = "#ff6b6b";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this._deleteWorld(worldName, row, listContainer);
        };

        row.appendChild(nameSpan);
        row.appendChild(exportBtn);
        row.appendChild(deleteBtn);
        return row;
    }

    private async _deleteWorld(
        worldName: string,
        row: HTMLDivElement,
        listContainer: HTMLDivElement
    ): Promise<void> {
        if (!confirm(`Delete world "${worldName}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteWorldFromStore(worldName);
            row.remove();

            // Show empty state if no worlds remain
            if (listContainer.children.length === 0) {
                this._showEmptyState();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._showInlineError(`Failed to delete "${worldName}": ${msg}`);
        }
    }

    private async _exportWorld(
        worldName: string,
        exportBtn: HTMLButtonElement,
        row: HTMLDivElement
    ): Promise<void> {
        exportBtn.disabled = true;
        exportBtn.style.opacity = "0.5";

        try {
            await exportWorldAsTarGz(worldName);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._showInlineError(`Export failed: ${msg}`);
        } finally {
            exportBtn.disabled = false;
            exportBtn.style.opacity = "1";
        }
    }

    // ─── Inline feedback ────────────────────────────────────────────────

    /**
     * Display a styled red error message in the browser storage panel content area.
     * If an error div already exists, update its text instead of creating a new one.
     */
    private _showInlineError(message: string): void {
        const existingError = this._contentArea.querySelector("[data-inline-error]") as HTMLDivElement | null;
        if (existingError) {
            existingError.textContent = message;
            return;
        }

        const errorDiv = document.createElement("div");
        errorDiv.setAttribute("data-inline-error", "true");
        errorDiv.className = "w3-panel w3-padding";
        errorDiv.style.color = "#ff6b6b";
        errorDiv.textContent = message;
        this._contentArea.appendChild(errorDiv);
    }

    /**
     * Display an empty state message indicating no saved worlds are available.
     * Replaces the content area contents.
     */
    private _showEmptyState(): void {
        this._contentArea.innerHTML = "";

        const msg = document.createElement("div");
        msg.className = "w3-center w3-padding";
        msg.textContent = "No saved worlds available";
        msg.style.color = VThemes.CurrentTheme.darkColors.f;
        this._contentArea.appendChild(msg);
    }

    // ─── Shared helpers ─────────────────────────────────────────────────

    private _createWorldList(items: Array<{ name: string; onClick: () => void }>): HTMLDivElement {
        const list = document.createElement("div");

        for (const item of items) {
            const row = document.createElement("div");
            row.className = "w3-button w3-block w3-left-align w3-hover-dark-grey";
            row.style.color = VThemes.CurrentTheme.darkColors.f;
            row.style.padding = "10px 16px";
            row.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
            row.style.cursor = "pointer";
            row.textContent = item.name;
            row.onclick = item.onClick;
            list.appendChild(row);
        }

        return list;
    }
}
