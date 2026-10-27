export type PreparedImage = { blob: Blob; thumbBlob: Blob | null; width: number | null; height: number | null };

/** Reads an image file and makes a small JPEG thumbnail on this device. Falls back to no thumbnail. */
export async function prepareImage(file: Blob, maxSize = 320): Promise<PreparedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const thumbBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    const result = { blob: file, thumbBlob, width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch {
    return { blob: file, thumbBlob: null, width: null, height: null };
  }
}
