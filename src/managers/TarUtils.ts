/**
 * TAR archive utility functions.
 * Extracted from SaveManager._createTarArchive and LoadManager._extractTarArchive
 * for testability and reuse.
 */

/**
 * Create a TAR archive from a set of files.
 * @param files Array of filename/data pairs to include in the archive
 * @returns The TAR archive as a Uint8Array
 */
export async function createTarArchive(files: Array<{ filename: string; data: Uint8Array }>): Promise<Uint8Array> {
    const blocks: Uint8Array[] = [];

    for (const file of files) {
        // Create TAR header (512 bytes)
        const header = new Uint8Array(512);
        const encoder = new TextEncoder();

        // File name (0-99)
        const nameBytes = encoder.encode(file.filename);
        header.set(nameBytes.slice(0, Math.min(100, nameBytes.length)), 0);

        // File mode (100-107) - default: 644 (octal)
        const modeStr = "0000644\0";
        header.set(encoder.encode(modeStr), 100);

        // Owner's user ID (108-115) - 0
        const uidStr = "0000000\0";
        header.set(encoder.encode(uidStr), 108);

        // Group's user ID (116-123) - 0
        const gidStr = "0000000\0";
        header.set(encoder.encode(gidStr), 116);

        // File size in bytes (124-135)
        const sizeStr = file.data.length.toString(8).padStart(11, '0') + '\0';
        header.set(encoder.encode(sizeStr), 124);

        // Last modification time (136-147)
        const timeStr = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
        header.set(encoder.encode(timeStr), 136);

        // Checksum (148-155) - initially all spaces
        header.set(encoder.encode('        '), 148);

        // Type flag (156) - '0' for regular file
        header[156] = 0x30; // '0'

        // Link name (157-256) - empty

        // UStar indicator (257-262)
        header.set(encoder.encode('ustar\0'), 257);

        // Calculate and set checksum
        let checksum = 0;
        for (let i = 0; i < 512; i++) {
            checksum += header[i];
        }
        const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
        header.set(encoder.encode(checksumStr), 148);

        blocks.push(header);
        blocks.push(file.data);

        // Pad file data to 512-byte boundary
        const padding = (512 - (file.data.length % 512)) % 512;
        if (padding > 0) {
            blocks.push(new Uint8Array(padding));
        }
    }

    // Add two final 512-byte zero blocks to mark end of archive
    blocks.push(new Uint8Array(512));
    blocks.push(new Uint8Array(512));

    // Concatenate all blocks
    const totalLength = blocks.reduce((acc, curr) => acc + curr.length, 0);
    const tarData = new Uint8Array(totalLength);
    let offset = 0;
    for (const block of blocks) {
        tarData.set(block, offset);
        offset += block.length;
    }

    return tarData;
}

/**
 * Extract files from a TAR archive.
 * @param tarData The TAR archive as a Uint8Array
 * @returns Map from filename to file data
 */
export async function extractTarArchive(tarData: Uint8Array): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>();
    let offset = 0;

    while (offset < tarData.length) {
        // Check for end of archive (two consecutive 512-byte blocks of zeros)
        if (offset + 512 <= tarData.length) {
            const header = tarData.slice(offset, offset + 512);
            let isAllZeros = true;
            for (let i = 0; i < 512; i++) {
                if (header[i] !== 0) {
                    isAllZeros = false;
                    break;
                }
            }
            if (isAllZeros) {
                // Check the next block too
                if (offset + 1024 <= tarData.length) {
                    const nextHeader = tarData.slice(offset + 512, offset + 1024);
                    let nextIsAllZeros = true;
                    for (let i = 0; i < 512; i++) {
                        if (nextHeader[i] !== 0) {
                            nextIsAllZeros = false;
                            break;
                        }
                    }
                    if (nextIsAllZeros) {
                        break; // End of archive
                    }
                }
            }
        }

        if (offset + 512 > tarData.length) break;

        const header = tarData.slice(offset, offset + 512);
        offset += 512;

        // Parse TAR header
        const decoder = new TextDecoder();

        // Extract filename (0-99)
        let filenameBytesLen = 0;
        for (let i = 0; i < 100 && header[i] !== 0; i++) {
            filenameBytesLen++;
        }
        const filename = decoder.decode(header.slice(0, filenameBytesLen));

        // Extract file size (124-135)
        const sizeStr = decoder.decode(header.slice(124, 135)).trim();
        const fileSize = parseInt(sizeStr, 8);

        if (isNaN(fileSize) || fileSize < 0) {
            break;
        }

        // Extract file data
        if (offset + fileSize <= tarData.length) {
            const fileData = tarData.slice(offset, offset + fileSize);
            files.set(filename, fileData);
            offset += fileSize;

            // Align to 512-byte boundary
            const padding = (512 - (fileSize % 512)) % 512;
            offset += padding;
        } else {
            break;
        }
    }

    return files;
}
