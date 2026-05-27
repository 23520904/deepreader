export const CROP_VIEWPORT_SIZE = 360;
export const CROP_OUTPUT_SIZE = 512;
export const MAX_AVATAR_FILE_SIZE = 6 * 1024 * 1024;
export const CROP_INITIAL_ZOOM_MULTIPLIER = 1.12;
export const CROP_BOX_INITIAL_INSET = 18;
export const CROP_BOX_MIN_SIZE = 96;

export type CropBox = {
  x: number;
  y: number;
  size: number;
};

export type CropState = {
  imageSrc: string;
  zoom: number;
  minZoom: number;
  offsetX: number;
  offsetY: number;
  naturalWidth: number;
  naturalHeight: number;
  cropBox: CropBox;
};

export type CropResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

export type CropDrag = {
  pointerId: number;
  kind: "image" | "resize";
  handle?: CropResizeHandle;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  box: CropBox;
};

export function createInitialCropState(imageSrc: string): CropState {
  return {
    imageSrc,
    zoom: 1,
    minZoom: 1,
    offsetX: 0,
    offsetY: 0,
    naturalWidth: 1,
    naturalHeight: 1,
    cropBox: getInitialCropBox(),
  };
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = src;
  });
}

export function getCropBounds(crop: CropState) {
  const imageRatio = crop.naturalHeight / crop.naturalWidth;
  const displayWidth = CROP_VIEWPORT_SIZE * crop.zoom;
  const displayHeight = CROP_VIEWPORT_SIZE * crop.zoom * imageRatio;

  return {
    maxX: Math.max(0, (displayWidth - CROP_VIEWPORT_SIZE) / 2),
    maxY: Math.max(0, (displayHeight - CROP_VIEWPORT_SIZE) / 2),
  };
}

export function getMaxCropZoom(crop: CropState) {
  return Math.max(crop.minZoom + 2, crop.minZoom * 3);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getInitialCropBox() {
  const size = CROP_VIEWPORT_SIZE - CROP_BOX_INITIAL_INSET * 2;

  return {
    x: CROP_BOX_INITIAL_INSET,
    y: CROP_BOX_INITIAL_INSET,
    size,
  };
}

export function clampCropBox(box: CropBox): CropBox {
  const size = clamp(box.size, CROP_BOX_MIN_SIZE, CROP_VIEWPORT_SIZE);

  return {
    x: clamp(box.x, 0, CROP_VIEWPORT_SIZE - size),
    y: clamp(box.y, 0, CROP_VIEWPORT_SIZE - size),
    size,
  };
}

export function clampCrop(crop: CropState): CropState {
  const zoomedCrop = {
    ...crop,
    zoom: clamp(crop.zoom, crop.minZoom, getMaxCropZoom(crop)),
  };
  const bounds = getCropBounds(zoomedCrop);

  return {
    ...zoomedCrop,
    offsetX: clamp(zoomedCrop.offsetX, -bounds.maxX, bounds.maxX),
    offsetY: clamp(zoomedCrop.offsetY, -bounds.maxY, bounds.maxY),
    cropBox: clampCropBox(zoomedCrop.cropBox),
  };
}

export function resizeCropBox(
  box: CropBox,
  handle: CropResizeHandle,
  deltaX: number,
  deltaY: number,
) {
  const right = box.x + box.size;
  const bottom = box.y + box.size;
  const centerX = box.x + box.size / 2;
  const centerY = box.y + box.size / 2;
  let nextSize = box.size;
  let nextX = box.x;
  let nextY = box.y;

  if (handle === "se") {
    nextSize = box.size + (Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY);
    nextX = box.x;
    nextY = box.y;
  } else if (handle === "sw") {
    nextSize = box.size + (Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY);
    nextX = right - nextSize;
    nextY = box.y;
  } else if (handle === "ne") {
    nextSize = box.size + (Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY);
    nextX = box.x;
    nextY = bottom - nextSize;
  } else if (handle === "nw") {
    nextSize = box.size + (Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : -deltaY);
    nextX = right - nextSize;
    nextY = bottom - nextSize;
  } else if (handle === "e") {
    nextSize = box.size + deltaX;
    nextX = box.x;
    nextY = centerY - nextSize / 2;
  } else if (handle === "w") {
    nextSize = box.size - deltaX;
    nextX = right - nextSize;
    nextY = centerY - nextSize / 2;
  } else if (handle === "s") {
    nextSize = box.size + deltaY;
    nextX = centerX - nextSize / 2;
    nextY = box.y;
  } else if (handle === "n") {
    nextSize = box.size - deltaY;
    nextX = centerX - nextSize / 2;
    nextY = bottom - nextSize;
  }

  nextSize = clamp(nextSize, CROP_BOX_MIN_SIZE, CROP_VIEWPORT_SIZE);

  return clampCropBox({
    x: nextX,
    y: nextY,
    size: nextSize,
  });
}

export async function cropAvatarToDataUrl(cropState: CropState) {
  const image = await loadImage(cropState.imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not crop this image.");
  }

  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);

  const imageRatio = image.naturalHeight / image.naturalWidth;
  const displayWidth = CROP_VIEWPORT_SIZE * cropState.zoom;
  const displayHeight = CROP_VIEWPORT_SIZE * cropState.zoom * imageRatio;
  const imageLeft = (CROP_VIEWPORT_SIZE - displayWidth) / 2 + cropState.offsetX;
  const imageTop = (CROP_VIEWPORT_SIZE - displayHeight) / 2 + cropState.offsetY;
  const sourceX = ((cropState.cropBox.x - imageLeft) / displayWidth) * image.naturalWidth;
  const sourceY = ((cropState.cropBox.y - imageTop) / displayHeight) * image.naturalHeight;
  const sourceSize = (cropState.cropBox.size / displayWidth) * image.naturalWidth;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    CROP_OUTPUT_SIZE,
    CROP_OUTPUT_SIZE,
  );

  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

  if (dataUrl.length > 800000) {
    throw new Error("Cropped avatar is too large. Please choose a smaller image.");
  }

  return dataUrl;
}
