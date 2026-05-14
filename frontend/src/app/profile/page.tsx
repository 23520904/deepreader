/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import Link from "next/link";
import type {
  ChangeEvent,
  FormEvent,
  PointerEvent,
  SyntheticEvent,
  WheelEvent,
} from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AccountAvatar,
  getAccountDisplayName,
  getAccountName,
} from "@/components/AccountSidebar";
import { SiteNavbar } from "@/components/SiteNavbar";
import {
  fetchUserProfile,
  getAuthSessionSnapshot,
  subscribeAuthSession,
  updateUserProfile,
  type UserProfile,
} from "@/lib/auth";

const EDIT_ICON = "/assets/icons/profile/edit-icon.png";
const CROP_VIEWPORT_SIZE = 360;
const CROP_OUTPUT_SIZE = 512;
const MAX_AVATAR_FILE_SIZE = 6 * 1024 * 1024;
const CROP_INITIAL_ZOOM_MULTIPLIER = 1.12;
const CROP_BOX_INITIAL_INSET = 18;
const CROP_BOX_MIN_SIZE = 96;

type ProfileDraft = {
  userId: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  avatarUrl: string;
};

type CropState = {
  imageSrc: string;
  zoom: number;
  minZoom: number;
  offsetX: number;
  offsetY: number;
  naturalWidth: number;
  naturalHeight: number;
  cropBox: CropBox;
};

type CropBox = {
  x: number;
  y: number;
  size: number;
};

type CropDrag = {
  pointerId: number;
  kind: "image" | "resize";
  handle?: CropResizeHandle;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  box: CropBox;
};

type CropResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

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

function emptyDraft(userId = ""): ProfileDraft {
  return {
    userId,
    username: "",
    fullName: "",
    phoneNumber: "",
    location: "",
    avatarUrl: "",
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function createDraftFromProfile(profile: UserProfile): ProfileDraft {
  return {
    userId: profile.userId,
    username: profile.username?.trim() || getAccountDisplayName(profile.email),
    fullName: profile.fullName?.trim() ?? "",
    phoneNumber: profile.phoneNumber?.trim() ?? "",
    location: profile.location?.trim() ?? "",
    avatarUrl: profile.avatarUrl?.trim() ?? "",
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = src;
  });
}

function getCropBounds(crop: CropState) {
  const imageRatio = crop.naturalHeight / crop.naturalWidth;
  const displayWidth = CROP_VIEWPORT_SIZE * crop.zoom;
  const displayHeight = CROP_VIEWPORT_SIZE * crop.zoom * imageRatio;

  return {
    maxX: Math.max(0, (displayWidth - CROP_VIEWPORT_SIZE) / 2),
    maxY: Math.max(0, (displayHeight - CROP_VIEWPORT_SIZE) / 2),
  };
}

function getMaxCropZoom(crop: CropState) {
  return Math.max(crop.minZoom + 2, crop.minZoom * 3);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getInitialCropBox() {
  const size = CROP_VIEWPORT_SIZE - CROP_BOX_INITIAL_INSET * 2;

  return {
    x: CROP_BOX_INITIAL_INSET,
    y: CROP_BOX_INITIAL_INSET,
    size,
  };
}

function clampCropBox(box: CropBox): CropBox {
  const size = clamp(box.size, CROP_BOX_MIN_SIZE, CROP_VIEWPORT_SIZE);

  return {
    x: clamp(box.x, 0, CROP_VIEWPORT_SIZE - size),
    y: clamp(box.y, 0, CROP_VIEWPORT_SIZE - size),
    size,
  };
}

function clampCrop(crop: CropState): CropState {
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

function resizeCropBox(box: CropBox, handle: CropResizeHandle, deltaX: number, deltaY: number) {
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

export default function ProfilePage() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropDragRef = useRef<CropDrag | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => emptyDraft());
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const activeUserId = session?.userId ?? "";
  const sessionDraft = useMemo<ProfileDraft>(() => {
    if (!session) {
      return emptyDraft();
    }

    return {
      ...emptyDraft(session.userId),
      username: getAccountName(session),
      avatarUrl: session.avatarUrl?.trim() ?? "",
    };
  }, [session]);
  const draft = profileDraft.userId === activeUserId ? profileDraft : sessionDraft;
  const previewAvatarUrl = useMemo(() => draft.avatarUrl.trim() || null, [draft.avatarUrl]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    let cancelled = false;

    fetchUserProfile()
      .then((profile) => {
        if (cancelled) {
          return;
        }

        setProfileDraft(createDraftFromProfile(profile));
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Could not load profile.");
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  function updateDraft(patch: Partial<Omit<ProfileDraft, "userId">>) {
    setMessage("");
    setError("");
    setProfileDraft((current) => ({
      ...(current.userId === activeUserId ? current : sessionDraft),
      ...patch,
      userId: activeUserId,
    }));
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError("Avatar image must be 6MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMessage("");
      setError("");
      setCropState({
        imageSrc: String(reader.result),
        zoom: 1,
        minZoom: 1,
        offsetX: 0,
        offsetY: 0,
        naturalWidth: 1,
        naturalHeight: 1,
        cropBox: getInitialCropBox(),
      });
    };
    reader.onerror = () => setError("Could not read this image.");
    reader.readAsDataURL(file);
  }

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
    if (!cropState) {
      return;
    }

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
    if (!cropState) {
      return;
    }

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

  async function applyCroppedAvatar() {
    if (!cropState) {
      return;
    }

    setIsCropping(true);
    setError("");

    try {
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

      updateDraft({ avatarUrl: dataUrl });
      setCropState(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not crop this image.");
    } finally {
      setIsCropping(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!draft.username.trim()) {
      setError("Please enter a user name.");
      return;
    }

    setIsSaving(true);

    try {
      const profile = await updateUserProfile({
        username: draft.username.trim(),
        fullName: optionalText(draft.fullName),
        phoneNumber: optionalText(draft.phoneNumber),
        location: optionalText(draft.location),
        avatarUrl: optionalText(draft.avatarUrl),
      });
      setProfileDraft(createDraftFromProfile(profile));
      setMessage("Profile updated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#e9ecf4] text-[#17345d]">
      <SiteNavbar activeItem="Profile" />

      <section className="mx-auto w-[min(960px,calc(100%_-_40px))] py-10 max-[700px]:w-[min(100%_-_28px,960px)]">
        {session ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.12em] text-[#4053c7]">
                  Profile settings
                </p>
                <h1 className="mt-2 text-[34px] font-black leading-tight text-[#1d355b]">
                  Edit Profile
                </h1>
              </div>
              <button
                type="submit"
                form="profileForm"
                disabled={isSaving}
                className="flex min-h-[46px] min-w-[150px] cursor-pointer items-center justify-center rounded-[8px] bg-[#245895] px-6 text-[14px] font-black text-white shadow-[0_14px_28px_rgba(36,88,149,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <form id="profileForm" onSubmit={handleSubmit}>
              <section className="rounded-[8px] border border-white/80 bg-white px-7 py-7 shadow-[0_22px_60px_rgba(31,41,55,0.08)]">
                <div className="border-b border-[#e3e8f4] pb-5">
                  <h2 className="text-[22px] font-black text-[#1d355b]">
                    Personal Information
                  </h2>
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="relative">
                    <AccountAvatar
                      avatarUrl={previewAvatarUrl}
                      size={108}
                      imagePaddingClassName="p-6"
                      className="grid h-[108px] w-[108px] place-items-center bg-[#eef3ff] shadow-[0_16px_34px_rgba(36,88,149,0.16)] ring-4 ring-white"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-[3px] border-white bg-[#245895] shadow-[0_12px_24px_rgba(36,88,149,0.26)] transition hover:-translate-y-0.5 hover:bg-[#1d4d86] focus:outline-none focus:ring-4 focus:ring-[#245895]/20"
                      aria-label="Upload avatar"
                    >
                      <Image
                        src={EDIT_ICON}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 object-contain"
                        style={{ filter: "brightness(0) invert(1)" }}
                      />
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarFileChange}
                />

                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66]">
                    Email
                    <input
                      value={session.email}
                      readOnly
                      className="h-12 rounded-[8px] border border-[#d9e1ef] bg-[#f6f8fc] px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#64708d] outline-none"
                    />
                  </label>

                  <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66]">
                    User Name
                    <input
                      value={draft.username}
                      maxLength={80}
                      onChange={(event) => updateDraft({ username: event.target.value })}
                      className="h-12 rounded-[8px] border border-[#c8d4e6] bg-white px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#17213a] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                      placeholder="Your username"
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66]">
                    Full Name
                    <input
                      value={draft.fullName}
                      maxLength={120}
                      onChange={(event) => updateDraft({ fullName: event.target.value })}
                      className="h-12 rounded-[8px] border border-[#c8d4e6] bg-white px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#17213a] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66]">
                    Phone
                    <input
                      value={draft.phoneNumber}
                      maxLength={30}
                      onChange={(event) => updateDraft({ phoneNumber: event.target.value })}
                      className="h-12 rounded-[8px] border border-[#c8d4e6] bg-white px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#17213a] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                      placeholder="+84..."
                    />
                  </label>

                  <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66] md:col-span-2">
                    Location
                    <input
                      value={draft.location}
                      maxLength={120}
                      onChange={(event) => updateDraft({ location: event.target.value })}
                      className="h-12 rounded-[8px] border border-[#c8d4e6] bg-white px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#17213a] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                      placeholder="City, country"
                    />
                  </label>
                </div>

                {message ? (
                  <p className="mt-6 rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {message}
                  </p>
                ) : null}

                {error ? (
                  <p className="mt-6 rounded-[8px] bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </p>
                ) : null}
              </section>
            </form>

            {cropState ? (
              <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 px-4 backdrop-blur-[4px]">
                <div className="w-[min(520px,100%)] rounded-[8px] bg-white p-5 shadow-[0_34px_90px_rgba(0,0,0,0.42)]">
                  <div className="flex items-center justify-between gap-4 border-b border-[#e3e8f4] pb-4">
                    <h2 className="text-[22px] font-black text-[#1d355b]">Upload Avatar</h2>
                    <button
                      type="button"
                      onClick={() => setCropState(null)}
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
                          height:
                            CROP_VIEWPORT_SIZE - cropState.cropBox.y - cropState.cropBox.size,
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
                          width:
                            CROP_VIEWPORT_SIZE - cropState.cropBox.x - cropState.cropBox.size,
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
                            onPointerDown={(event) =>
                              handleCropResizePointerDown(event, item.handle)
                            }
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
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-[44px] min-w-[128px] cursor-pointer items-center justify-center rounded-[8px] border border-[#c8d4e6] px-5 text-[14px] font-black text-[#4053c7] transition hover:bg-[#eef3ff]"
                    >
                      Choose Other
                    </button>
                    <button
                      type="button"
                      disabled={isCropping}
                      onClick={applyCroppedAvatar}
                      className="flex min-h-[44px] min-w-[128px] cursor-pointer items-center justify-center rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
                    >
                      {isCropping ? "Uploading..." : "Use Photo"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mx-auto mt-16 max-w-[520px] rounded-[8px] border border-white/80 bg-white px-7 py-12 text-center shadow-[0_24px_70px_rgba(31,41,55,0.08)]">
            <h1 className="text-[30px] font-black text-[#1d355b]">Profile</h1>
            <p className="mt-3 text-[16px] font-medium text-[#7f8aa8]">
              Log in to edit your account profile.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex min-h-[44px] items-center justify-center rounded-[8px] bg-[#245895] px-6 text-[14px] font-black text-white transition hover:bg-[#1d4d86]"
            >
              Go to Login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
