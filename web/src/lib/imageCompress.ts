/**
 * Compress an image file by drawing it to an off-screen canvas at a
 * capped width and exporting as JPEG. Returns both the binary Blob
 * (for multipart upload) and the data URL (for in-form preview).
 *
 * Used for receipt photos — typical phone-camera input (3–5MB) compresses
 * to ~50–150KB at the defaults below.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read file'));

    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Unexpected reader result'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const targetWidth = Math.min(maxWidth, img.naturalWidth);
        const scale = targetWidth / img.naturalWidth;
        const targetHeight = Math.round(img.naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Encode failed'));
              return;
            }
            const previewUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob, dataUrl: previewUrl });
          },
          'image/jpeg',
          quality,
        );
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
