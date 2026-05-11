/**
 * Pure logic module for the Save World Name Prompt.
 * Separated from UI for testability.
 */

/**
 * Ensures the name ends with ".tar.gz".
 * Case-insensitive check — if the name already ends with any case variant
 * of ".tar.gz", it is returned as-is.
 * Otherwise, ".tar.gz" is appended.
 */
export function normalizeWorldName(name: string): string {
    if (name.toLowerCase().endsWith(".tar.gz")) {
        return name;
    }
    return name + ".tar.gz";
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
 * Returns "empty" for falsy/empty values, otherwise returns the input.
 */
export function getDefaultWorldName(currentName: string | undefined | null): string {
    if (!currentName || currentName.length === 0) {
        return "empty";
    }
    return currentName;
}
