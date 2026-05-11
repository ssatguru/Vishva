/**
 * Utility functions for detecting and normalizing .tar.gz file extensions.
 * Used to route world files through the world loading pipeline.
 */

const TAR_GZ_REGEX = /\.tar\.gz$/i;

/**
 * Determines if a filename represents a world file (.tar.gz).
 * Case-insensitive check for the compound extension.
 *
 * Returns true iff the filename ends with `.tar.gz` (any case).
 * Does NOT match `.gz`-only or `.tar`-only filenames.
 */
export function isTarGzFile(filename: string): boolean {
    return TAR_GZ_REGEX.test(filename);
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
