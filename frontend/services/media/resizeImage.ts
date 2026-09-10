const DEFAULT_MAX_DIMENSION = 640;
const JPEG_QUALITY = 0.85;

/**
 * Redimensionne une image selectionnee (web) avant envoi au serveur :
 * limite sa plus grande dimension et la reencode en JPEG pour reduire
 * le poids de l'upload. Retourne une data URL base64 prete a etre postee.
 */
export async function resizeImageToDataUrl(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Contexte de dessin indisponible");
    }

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
