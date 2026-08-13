const WEBP_MIME_TYPE = "image/webp";
const WEBP_QUALITY = 0.82;
const CONVERTIBLE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const CONVERTIBLE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

const getLowercaseExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
};

const getWebpFilename = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  const baseName = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  return `${baseName || "image"}.webp`;
};

const shouldConvertToWebp = (file: File): boolean => {
  return (
    CONVERTIBLE_MIME_TYPES.has(file.type.toLowerCase()) ||
    CONVERTIBLE_EXTENSIONS.has(getLowercaseExtension(file.name))
  );
};

const canvasToWebp = (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not encode this image as WebP."));
        return;
      }

      if (blob.type !== WEBP_MIME_TYPE) {
        reject(new Error("This browser does not support WebP image encoding."));
        return;
      }

      resolve(blob);
    }, WEBP_MIME_TYPE, quality);
  });

/**
 * Convert newly uploaded JPEG and PNG files before they leave the browser.
 * Existing WebP, GIF, SVG, and all non-image files are returned unchanged.
 */
const prepareMediaUpload = async (file: File): Promise<File> => {
  if (!shouldConvertToWebp(file)) return file;

  let image: ImageBitmap | undefined;

  try {
    image = await createImageBitmap(file);
    if (image.width < 1 || image.height < 1) {
      throw new Error("The selected image has invalid dimensions.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The browser could not prepare this image for upload.");
    }

    context.drawImage(image, 0, 0);
    const webp = await canvasToWebp(canvas, WEBP_QUALITY);

    return new File([webp], getWebpFilename(file.name), {
      type: WEBP_MIME_TYPE,
      lastModified: file.lastModified,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to convert ${file.name} to WebP: ${reason}`);
  } finally {
    image?.close();
  }
};

export { prepareMediaUpload };
