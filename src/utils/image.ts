export const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    image.src = objectUrl;
  });

export const getImageSize = async (blob: Blob): Promise<{ width: number; height: number }> => {
  const image = await loadImageFromBlob(blob);
  return { width: image.width, height: image.height };
};

export const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.96,
): Promise<Blob> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) {
    throw new Error("FAILED_TO_SERIALIZE_CANVAS");
  }
  return blob;
};

export const readFileAsBlob = async (file: File): Promise<Blob> =>
  new Blob([await file.arrayBuffer()], { type: file.type || "image/png" });
