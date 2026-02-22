/**
 * Manages progress display for loading and saving operations
 */
export class ProgressManager {
    private loadingMsg: HTMLElement;
    private loadingText: HTMLElement;
    private loadingStatus: HTMLElement;
    private loadingProgress: HTMLElement;
    private loadingPercent: HTMLElement;
    private modalOverlay: HTMLElement;
    private statusHistory: Array<{ message: string; startTime: number }> = [];

    constructor() {
        this.loadingMsg = document.getElementById("loadingMsg");
        this.loadingText = document.getElementById("loadingText");
        this.loadingStatus = document.getElementById("loadingStatus");
        this.loadingProgress = document.getElementById("loadingProgress");
        this.loadingPercent = document.getElementById("loadingPercent");
        this.modalOverlay = document.getElementById("modalOverlay");
    }

    /**
     * Show progress bar with initial message
     */
    public show(title: string = "Loading", status: string = "Please wait...") {
        if (this.loadingMsg) {
            this.loadingMsg.style.visibility = "visible";
            this.setTitle(title);
            
            // Clear previous status messages
            if (this.loadingStatus) {
                this.loadingStatus.innerHTML = "";
                // Set up scrolling for status area
                this.loadingStatus.style.overflowY = "auto";
                this.loadingStatus.style.maxHeight = "150px";
            }
            
            this.statusHistory = [];
            this.setStatus(status);
            this.setProgress(0);
        }
        if (this.modalOverlay) {
            this.modalOverlay.style.display = "block";
        }
    }

    /**
     * Hide progress bar
     */
    public hide() {
        this.setStatus("Completed");
        if (this.modalOverlay) {
            this.modalOverlay.style.display = "none";
        }
        
        // Show and configure close button
        const closeButton = document.getElementById("closeButton");
        if (closeButton) {
            closeButton.style.display = "inline-block";
            
            // Remove any existing click handlers by cloning and replacing
            const newCloseButton = closeButton.cloneNode(true) as HTMLElement;
            closeButton.parentNode?.replaceChild(newCloseButton, closeButton);
            
            // Add click handler to close the dialog
            newCloseButton.addEventListener("click", () => {
                if (this.loadingMsg) {
                    this.loadingMsg.style.visibility = "hidden";
                }
                newCloseButton.style.display = "none";
                const progressbar = document.getElementById("loadingProgress");
                if (progressbar) {
                    progressbar.style.width = "0%";
                } 
            });
        }
    }

    /**
     * Update progress title
     */
    public setTitle(title: string) {
        if (this.loadingText) {
            this.loadingText.textContent = title;
        }
    }

    /**
     * Update progress status message
     * Keeps previous statuses with their execution time
     */
    private setStatus(status: string) {
        if (this.loadingStatus) {
            // If there's a previous status, add it to history with elapsed time
            if (this.statusHistory.length > 0) {
                const lastStatus = this.statusHistory[this.statusHistory.length - 1];
                const elapsed = Date.now() - lastStatus.startTime;
                const elapsedSec = (elapsed / 1000).toFixed(2);
                
                // Append previous status with time to the display
                const statusLine = document.createElement("div");
                statusLine.style.fontSize = "0.9em";
                statusLine.style.opacity = "0.7";
                statusLine.style.marginBottom = "4px";
                statusLine.textContent = `✓ ${lastStatus.message} (${elapsedSec}s)`;
                
                this.loadingStatus.appendChild(statusLine);
            }
            
            // Add new status to history
            this.statusHistory.push({
                message: status,
                startTime: Date.now()
            });
            
            // Display new status
            const currentStatusLine = document.createElement("div");
            currentStatusLine.style.fontSize = "1em";
            currentStatusLine.style.fontWeight = "bold";
            currentStatusLine.style.marginTop = "8px";
            currentStatusLine.textContent = status;
            
            this.loadingStatus.appendChild(currentStatusLine);
            
            // Scroll to bottom so user sees the latest status
            this.loadingStatus.scrollTop = this.loadingStatus.scrollHeight;
        }
    }

    /**
     * Update progress percentage (0-100)
     */
    private setProgress(percent: number) {
        percent = Math.max(0, Math.min(100, percent));
        
        if (this.loadingProgress) {
            this.loadingProgress.style.width = percent + "%";
        }
        
        if (this.loadingPercent) {
            this.loadingPercent.textContent = Math.round(percent) + "%";
        }
    }

    /**
     * Update both status and/or progress. Both parameters are optional.
     * If a parameter is omitted, the corresponding internal setter is not called.
     */
    public async update(status?: string, percent?: number) {
        let changed = false;
        if (typeof status !== "undefined") {
            this.setStatus(status);
            changed = true;
        }
        if (typeof percent !== "undefined") {
            this.setProgress(percent);
            changed = true;
        }

        // Give the UI time to render when something changed
        if (changed) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
