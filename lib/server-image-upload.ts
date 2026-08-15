import sharp from "sharp";

const WEBP_QUALITY = 82;
const MAX_IMAGE_DIMENSION = 8192;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_INPUT_PIXELS = 100_000_000;
const CONVERTIBLE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

type ServerMediaUpload = {
  path: string;
  contentBase64: string;
  converted: boolean;
};

const getExtension = (path: string): string => {
  const filename = path.split("/").pop() ?? "";
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
};

const getWebpPath = (path: string): string => {
  const lastSlash = path.lastIndexOf("/");
  const lastDot = path.lastIndexOf(".");
  const basePath = lastDot > lastSlash ? path.slice(0, lastDot) : path;
  return `${basePath || "image"}.webp`;
};

const getTargetDimensions = (
  width: number,
  height: number,
): { width: number; height: number } => {
  const dimensionScale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / width,
    MAX_IMAGE_DIMENSION / height,
  );
  const pixelScale = Math.min(
    1,
    Math.sqrt(MAX_IMAGE_PIXELS / (width * height)),
  );
  const scale = Math.min(dimensionScale, pixelScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const prepareServerMediaUpload = async (
  path: string,
  contentBase64: string,
): Promise<ServerMediaUpload> => {
  if (!CONVERTIBLE_EXTENSIONS.has(getExtension(path))) {
    return { path, contentBase64, converted: false };
  }

  try {
    const source = Buffer.from(contentBase64, "base64");
    if (source.length === 0) {
      throw new Error("The uploaded image is empty.");
    }

    const image = sharp(source, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    });
    const metadata = await image.metadata();
    const swapsDimensions =
      metadata.orientation !== undefined &&
      metadata.orientation >= 5 &&
      metadata.orientation <= 8;
    const width = swapsDimensions ? metadata.height : metadata.width;
    const height = swapsDimensions ? metadata.width : metadata.height;

    let pipeline = image.rotate();
    if (width && height) {
      const dimensions = getTargetDimensions(width, height);
      if (dimensions.width !== width || dimensions.height !== height) {
        pipeline = pipeline.resize(dimensions.width, dimensions.height, {
          fit: "fill",
          withoutEnlargement: true,
        });
      }
    }

    const webp = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    return {
      path: getWebpPath(path),
      contentBase64: webp.toString("base64"),
      converted: true,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Server failed to convert "${path}" to WebP: ${reason}`);
  }
};

export { prepareServerMediaUpload };
