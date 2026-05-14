/* eslint-disable @next/next/no-img-element */
"use client";

import type {
  Dispatch,
  PointerEvent,
  SetStateAction,
  SyntheticEvent,
  WheelEvent,
} from "react";
import { useRef } from "react";
import {
  clampCrop,
  CROP_INITIAL_ZOOM_MULTIPLIER,
  CROP_VIEWPORT_SIZE,
  getMaxCropZoom,
  resizeCropBox,
  type CropDrag,
  type CropResizeHandle,
  type CropState,
} from "@/lib/avatarCrop";

const cropResizeHandles: Array<{
  handle: CropResizeHandle;
  className: string;
  cursor: string;
  label: string;
}> = [
  {
    handle: "nw",
    className: "left-0 top-0 h-10 w-10",
    cursor: "nwse-resize",
    label: "Resize crop from top left",
  },
  {
    handle: "ne",
    className: "right-0 top-0 h-10 w-10",
    cursor: "nesw-resize",
    label: "Resize crop from top right",
  },
  {
    handle: "sw",
    className: "bottom-0 left-0 h-10 w-10",
    cursor: "nesw-resize",
    label: "Resize crop from bottom left",
  },
  {
    handle: "se",
    className: "bottom-0 right-0 h-10 w-10",
    cursor: "nwse-resize",
    label: "Resize crop from bottom right",
  },
  {
    handle: "n",
    className: "left-1/2 top-0 h-8 w-14 -translate-x-1/2",
    cursor: "ns-resize",
    label: "Resize crop from top",
  },
  {
    handle: "s",
    className: "bottom-0 left-1/2 h-8 w-14 -translate-x-1/2",
    cursor: "ns-resize",
    label: "Resize crop from bottom",
  },
  {
    handle: "w",
    className: "left-0 top-1/2 h-14 w-8 -translate-y-1/2",
    cursor: "ew-resize",
    label: "Resize crop from left",
  },
  {
    handle: "e",
    className: "right-0 top-1/2 h-14 w-8 -translate-y-1/2",
    cursor: "ew-resize",
    label: "Resize crop from right",
  },
];

type AvatarCropDialogProps = {
  cropState: CropState;
  setCropState: Dispatch<SetStateAction<CropState | null>>;
  isCropping: boolean;
  onClose: () => void;
  onChooseOther: () => void;
  onApply: () => void;
};

function getCropHandleVisualClass(handle: CropResizeHandle) {
  if (handle === "n" || handle === "s") {
    return "h-2 w-11 rounded-[2px] bg-white";
  }

  if (handle === "e" || handle === "w") {
    return "h-11 w-2 rounded-[2px] bg-white";
  }

  if (handle === "nw") {
    return "h-8 w-8 rounded-tl-[4px] border-l-[6px] border-t-[6px] border-white";
  }

  if (handle === "ne") {
    return "h-8 w-8 rounded-tr-[4px] border-r-[6px] border-t-[6px] border-white";
  }

  if (handle === "sw") {
    return "h-8 w-8 rounded-bl-[4px] border-b-[6px] border-l-[6px] border-white";
  }

  return "h-8 w-8 rounded-br-[4px] border-b-[6px] border-r-[6px] border-white";
}

export function AvatarCropDialog({
  cropState,
  setCropState,
  isCropping,
  onClose,
  onChooseOther,
  onApply,
}: AvatarCropDialogProps) {
  const cropDragRef = useRef<CropDrag | null>(null);

  function handleCropImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setCropState((current) => {
      if (!current) {
        return current;
      }

      const minZoom = Math.max(1, naturalWidth / naturalHeight);
      const initialZoom = minZoom * CROP_INITIAL_ZOOM_MULTIPLIER;
      return clampCrop({
        ...current,
        minZoom,
        zoom: initialZoom,
        offsetX: 0,
        offsetY: 0,
        naturalWidth,
        naturalHeight,
      });
    });
  }

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerId: event.pointerId,
      kind: "image",
      startX: event.clientX,
      startY: event.clientY,
      offsetX: cropState.offsetX,
      offsetY: cropState.offsetY,
      box: cropState.cropBox,
    };
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setCropState((current) => {
      if (!current) {
        return current;
      }

      if (drag.kind === "resize" && drag.handle) {
        return clampCrop({
          ...current,
          cropBox: resizeCropBox(
            drag.box,
            drag.handle,
            event.clientX - drag.startX,
            event.clientY - drag.startY,
          ),
        });
      }

      return clampCrop({
        ...current,
        offsetX: drag.offsetX + event.clientX - drag.startX,
        offsetY: drag.offsetY + event.clientY - drag.startY,
      });
    });
  }

  function handleCropPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;

    if (drag?.pointerId === event.pointerId) {
      cropDragRef.current = null;
    }
  }

  function handleCropResizePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    handle: CropResizeHandle,
  ) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerId: event.pointerId,
      kind: "resize",
      handle,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: cropState.offsetX,
      offsetY: cropState.offsetY,
      box: cropState.cropBox,
    };
  }

  function updateCropZoom(nextZoom: number) {
    setCropState((current) => {
      if (!current) {
        return current;
      }

      return clampCrop({
        ...current,
        zoom: nextZoom,
      });
    });
  }

  function nudgeCropZoom(direction: -1 | 1) {
    setCropState((current) => {
      if (!current) {
        return current;
      }

      const step = Math.max(0.08, current.minZoom * 0.08);
      return clampCrop({
        ...current,
        zoom: current.zoom + step * direction,
      });
    });
  }

  function handleCropWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    setCropState((current) => {
      if (!current) {
        return current;
      }

      const step = Math.max(0.06, current.minZoom * 0.05);
      return clampCrop({
        ...current,
        zoom: current.zoom + (event.deltaY > 0 ? -step : step),
      });
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 px-4 backdrop-blur-[4px]">
      <div className="w-[min(520px,100%)] rounded-[8px] bg-white p-5 shadow-[0_34px_90px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#e3e8f4] pb-4">
          <h2 className="text-[22px] font-black text-[#1d355b]">Upload Avatar</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#dfe5f4] text-[#4053c7] transition hover:bg-[#eef3ff]"
            aria-label="Close upload avatar dialog"
          >
            <span className="text-[22px] leading-none">x</span>
          </button>
        </div>

        <div className="mt-5 rounded-[8px] bg-black/90 p-4">
          <div
            className="relative mx-auto aspect-square w-[min(360px,calc(100vw_-_72px))] cursor-grab touch-none overflow-hidden rounded-[4px] bg-black active:cursor-grabbing"
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerEnd}
            onPointerCancel={handleCropPointerEnd}
            onWheel={handleCropWheel}
          >
            <img
              src={cropState.imageSrc}
              alt=""
              draggable={false}
              onLoad={handleCropImageLoad}
              className="absolute left-1/2 top-1/2 h-auto max-w-none select-none"
              style={{
                width: `${cropState.zoom * 100}%`,
                transform: `translate(calc(-50% + ${cropState.offsetX}px), calc(-50% + ${cropState.offsetY}px))`,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 bg-black/48"
              style={{
                width: CROP_VIEWPORT_SIZE,
                height: cropState.cropBox.y,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 bg-black/48"
              style={{
                top: cropState.cropBox.y + cropState.cropBox.size,
                width: CROP_VIEWPORT_SIZE,
                height: CROP_VIEWPORT_SIZE - cropState.cropBox.y - cropState.cropBox.size,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bg-black/48"
              style={{
                left: 0,
                top: cropState.cropBox.y,
                width: cropState.cropBox.x,
                height: cropState.cropBox.size,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bg-black/48"
              style={{
                left: cropState.cropBox.x + cropState.cropBox.size,
                top: cropState.cropBox.y,
                width: CROP_VIEWPORT_SIZE - cropState.cropBox.x - cropState.cropBox.size,
                height: cropState.cropBox.size,
              }}
            />
            <div
              className="pointer-events-none absolute z-20 border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.22)]"
              style={{
                left: cropState.cropBox.x,
                top: cropState.cropBox.y,
                width: cropState.cropBox.size,
                height: cropState.cropBox.size,
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_33.333%,rgba(255,255,255,0.26)_33.333%,rgba(255,255,255,0.26)_34%,transparent_34%,transparent_66.666%,rgba(255,255,255,0.26)_66.666%,rgba(255,255,255,0.26)_67.333%,transparent_67.333%),linear-gradient(0deg,transparent_33.333%,rgba(255,255,255,0.26)_33.333%,rgba(255,255,255,0.26)_34%,transparent_34%,transparent_66.666%,rgba(255,255,255,0.26)_66.666%,rgba(255,255,255,0.26)_67.333%,transparent_67.333%)]" />
              {cropResizeHandles.map((item) => (
                <button
                  key={item.handle}
                  type="button"
                  aria-label={item.label}
                  className={`pointer-events-auto absolute grid place-items-center ${item.className}`}
                  style={{ cursor: item.cursor }}
                  onPointerDown={(event) => handleCropResizePointerDown(event, item.handle)}
                >
                  <span
                    className={`block shadow-[0_2px_8px_rgba(0,0,0,0.28)] ${getCropHandleVisualClass(item.handle)}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-4 flex w-[min(360px,calc(100vw_-_72px))] items-center gap-3">
            <button
              type="button"
              onClick={() => nudgeCropZoom(-1)}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-[22px] font-black leading-none text-[#245895] transition hover:bg-[#eef3ff]"
              aria-label="Zoom out"
            >
              -
            </button>
            <input
              type="range"
              min={cropState.minZoom}
              max={getMaxCropZoom(cropState)}
              step="0.01"
              value={cropState.zoom}
              onChange={(event) => updateCropZoom(Number(event.target.value))}
              className="min-w-0 flex-1 accent-[#245895]"
              aria-label="Avatar zoom"
            />
            <button
              type="button"
              onClick={() => nudgeCropZoom(1)}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-[22px] font-black leading-none text-[#245895] transition hover:bg-[#eef3ff]"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onChooseOther}
            className="flex min-h-[44px] min-w-[128px] cursor-pointer items-center justify-center rounded-[8px] border border-[#c8d4e6] px-5 text-[14px] font-black text-[#4053c7] transition hover:bg-[#eef3ff]"
          >
            Choose Other
          </button>
          <button
            type="button"
            disabled={isCropping}
            onClick={onApply}
            className="flex min-h-[44px] min-w-[128px] cursor-pointer items-center justify-center rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
          >
            {isCropping ? "Uploading..." : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
