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
        if (this.loadingMsg) {
            this.loadingMsg.style.visibility = "hidden";
        }
        if (this.modalOverlay) {
            this.modalOverlay.style.display = "none";
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
     */
    public setStatus(status: string) {
        if (this.loadingStatus) {
            this.loadingStatus.textContent = status;
        }
    }

    /**
     * Update progress percentage (0-100)
     */
    public setProgress(percent: number) {
        percent = Math.max(0, Math.min(100, percent));
        
        if (this.loadingProgress) {
            this.loadingProgress.style.width = percent + "%";
        }
        
        if (this.loadingPercent) {
            this.loadingPercent.textContent = Math.round(percent) + "%";
        }
    }

    /**
     * Update both status and progress
     */
    public update(status: string, percent: number) {
        this.setStatus(status);
        this.setProgress(percent);
    }
}
