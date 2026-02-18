import { readChunk, writeChunk } from 'png-metadata';
import { Buffer } from 'buffer';

/**
 * Embeds alt text into a PNG buffer as a tEXt chunk.
 * @param pngBuffer The input PNG buffer.
 * @param altText The alt text to embed.
 * @returns A new buffer with the embedded alt text.
 * @throws Error if the input is not a valid PNG or if embedding fails.
 */
export function embedAltText(pngBuffer: Buffer, altText: string): Buffer {
    try {
        // Validate input buffer (basic check for PNG signature)
        if (!pngBuffer.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
            throw new Error('Input buffer is not a valid PNG file.');
        }

        // Read existing chunks from the PNG buffer
        const chunks = readChunk(pngBuffer);

        // Check if a tEXt chunk with 'Description' keyword already exists
        const existingTextChunkIndex = chunks.findIndex(
            chunk => chunk.type === 'tEXt' && chunk.data.toString('utf8').startsWith('Description\0')
        );

        // Prepare the new tEXt chunk data (keyword 'Description' followed by alt text)
        const newTextChunkData = Buffer.from(`Description\0${altText}`, 'utf8');

        if (existingTextChunkIndex >= 0) {
            // Update existing tEXt chunk
            chunks[existingTextChunkIndex].data = newTextChunkData;
        } else {
            // Add a new tEXt chunk before the IEND chunk
            const iendIndex = chunks.findIndex(chunk => chunk.type === 'IEND');
            if (iendIndex >= 0) {
                chunks.splice(iendIndex, 0, { type: 'tEXt', data: newTextChunkData });
            } else {
                throw new Error('Invalid PNG structure: IEND chunk not found.');
            }
        }

        // Write the updated chunks back to a new buffer
        return writeChunk(chunks);
    } catch (error) {
        throw new Error(`Failed to embed alt text: ${error.message}`);
    }
}

/**
 * Example usage of embedding alt text into a downloaded PNG buffer.
 * @param downloadedBuffer The buffer of the downloaded PNG image.
 * @param altText The alt text to embed.
 * @returns The updated buffer with embedded alt text.
 */
export async function embedAltTextOnDownload(downloadedBuffer: Buffer, altText: string): Promise<Buffer> {
    return embedAltText(downloadedBuffer, altText);
}
