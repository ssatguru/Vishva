/**
 * Pure logic module for the Save World Name Prompt.
 * Separated from UI for testability.
 */

/**
 * Normalizes the world name for saving.
 * Trims whitespace. Does not append any file extension since
 * browser-saved worlds are stored directly in IndexedDB (not as tar.gz files).
 */
export function normalizeWorldName(name: string): string {
    return name.trim();
}

/**
 * Returns true if the name is valid (non-empty after trimming).
 * Returns false for empty or whitespace-only strings.
 */
export function isValidWorldName(name: string): boolean {
    return name.trim().length > 0;
}

/**
 * Returns the default world name to pre-fill when the current name is
 * empty or undefined.
 * Strips ".tar.gz" or ".json" suffix if present (server-loaded worlds have these suffixes).
 * Returns "world" for falsy/empty values, otherwise returns the cleaned input.
 */
export function getDefaultWorldName(currentName: string | undefined | null): string {
    if (!currentName || currentName.length === 0 || currentName === "empty") {
        return "world";
    }
    // Strip .tar.gz suffix for display
    if (currentName.toLowerCase().endsWith(".tar.gz")) {
        return currentName.slice(0, -7);
    }
    // Strip .json suffix for display
    if (currentName.toLowerCase().endsWith(".json")) {
        return currentName.slice(0, -5);
    }
    return currentName;
}
