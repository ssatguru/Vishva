/**
 * Utility functions for detecting and normalizing world file extensions.
 * Used to route world files through the world loading pipeline.
 */

const TAR_GZ_REGEX = /\.tar\.gz$/i;
const JSON_REGEX = /\.json$/i;

/**
 * Determines if a filename represents a compressed world archive (.tar.gz).
 * Case-insensitive check for the compound extension.
 *
 * Returns true iff the filename ends with `.tar.gz` (any case).
 * Does NOT match `.gz`-only or `.tar`-only filenames.
 */
export function isTarGzFile(filename: string): boolean {
    return TAR_GZ_REGEX.test(filename);
}

/**
 * Determines if a filename represents a JSON world file (.json).
 * Case-insensitive check.
 */
export function isJsonWorldFile(filename: string): boolean {
    return JSON_REGEX.test(filename);
}

/**
 * Determines if a filename represents any kind of world file
 * (.tar.gz archive or .json scene file). Case-insensitive.
 */
export function isWorldFile(filename: string): boolean {
    return isTarGzFile(filename) || isJsonWorldFile(filename);
}

/**
 * Normalizes a .tar.gz extension to consistent lowercase.
 * Returns the filename with a lowercase `.tar.gz` suffix,
 * or null if the filename does not end with .tar.gz.
 */
export function normalizeTarGzExtension(filename: string): string | null {
    if (!TAR_GZ_REGEX.test(filename)) {
        return null;
    }
    // Replace the matched extension (any case) with lowercase
    return filename.replace(TAR_GZ_REGEX, ".tar.gz");
}
