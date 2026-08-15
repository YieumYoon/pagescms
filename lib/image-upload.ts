const WEBP_MIME_TYPE = "image/webp";
const WEBP_QUALITY = 0.82;
const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_PIXELS = 16_000_000;
const CONVERTIBLE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const CONVERTIBLE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

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

const getCanvasDimensions = (
  width: number,
  height: number,
): { width: number; height: number } => {
  const dimensionScale = Math.min(
    1,
    MAX_CANVAS_DIMENSION / width,
    MAX_CANVAS_DIMENSION / height,
  );
  const pixelScale = Math.min(
    1,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  );
  const scale = Math.min(dimensionScale, pixelScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const decodeWithImageElement = (file: File): Promise<DecodedImage> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      if (image.naturalWidth < 1 || image.naturalHeight < 1) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The selected image has invalid dimensions."));
        return;
      }

      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The browser could not decode this image."));
    };
    image.src = objectUrl;
  });

const decodeImage = async (file: File): Promise<DecodedImage> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width < 1 || bitmap.height < 1) {
        bitmap.close();
        throw new Error("The selected image has invalid dimensions.");
      }

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Some browsers reject large or metadata-heavy images here even though
      // their regular image decoder can still render them.
    }
  }

  return decodeWithImageElement(file);
};

/**
 * Convert newly uploaded JPEG and PNG files before they leave the browser.
 * Existing WebP, GIF, SVG, and all non-image files are returned unchanged.
 */
const prepareMediaUpload = async (file: File): Promise<File> => {
  if (!shouldConvertToWebp(file)) return file;

  let image: DecodedImage | undefined;

  try {
    image = await decodeImage(file);
    const dimensions = getCanvasDimensions(image.width, image.height);

    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The browser could not prepare this image for upload.");
    }

    context.drawImage(image.source, 0, 0, dimensions.width, dimensions.height);
    const webp = await canvasToWebp(canvas, WEBP_QUALITY);

    return new File([webp], getWebpFilename(file.name), {
      type: WEBP_MIME_TYPE,
      lastModified: file.lastModified,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to convert ${file.name} to WebP: ${reason}`);
  } finally {
    image?.cleanup();
  }
};

export { prepareMediaUpload };
