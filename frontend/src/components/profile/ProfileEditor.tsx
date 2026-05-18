"use client";

import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { ProfileForm, ProfileHeader } from "@/components/profile/ProfileForm";
import {
  createInitialCropState,
  cropAvatarToDataUrl,
  MAX_AVATAR_FILE_SIZE,
  type CropState,
} from "@/lib/avatarCrop";
import {
  getAuthSessionSnapshot,
  syncProfileIntoSession,
  subscribeAuthSession,
} from "@/lib/authSession";
import {
  createProfileDraftFromProfile,
  createProfileDraftFromSession,
  emptyProfileDraft,
  toUpdateProfilePayload,
  type ProfileDraft,
} from "@/lib/profile";
import {
  fetchUserProfile,
  updateUserProfile,
} from "@/services/profileService";

export function ProfileEditor() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => emptyProfileDraft());
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const activeUserId = session?.userId ?? "";
  const activeToken = session?.token ?? "";
  const sessionDraft = useMemo(() => createProfileDraftFromSession(session), [session]);
  const draft = profileDraft.userId === activeUserId ? profileDraft : sessionDraft;
  const previewAvatarUrl = useMemo(() => draft.avatarUrl.trim() || null, [draft.avatarUrl]);

  useEffect(() => {
    if (!activeUserId || !activeToken) {
      return;
    }

    let cancelled = false;

    fetchUserProfile(activeToken)
      .then((profile) => {
        if (cancelled) {
          return;
        }

        syncProfileIntoSession(profile);
        setProfileDraft(createProfileDraftFromProfile(profile));
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
  }, [activeToken, activeUserId]);

  function updateDraft(patch: Partial<Omit<ProfileDraft, "userId">>) {
    setMessage("");
    setError("");
    setProfileDraft((current) => ({
      ...(current.userId === activeUserId ? current : sessionDraft),
      ...patch,
      userId: activeUserId,
    }));
  }

  function openAvatarPicker() {
    fileInputRef.current?.click();
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
      setCropState(createInitialCropState(String(reader.result)));
    };
    reader.onerror = () => setError("Could not read this image.");
    reader.readAsDataURL(file);
  }

  async function applyCroppedAvatar() {
    if (!cropState) {
      return;
    }

    setIsCropping(true);
    setError("");

    try {
      const dataUrl = await cropAvatarToDataUrl(cropState);
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

    if (!session) {
      setError("Please log in again.");
      return;
    }

    setIsSaving(true);

    try {
      const profile = await updateUserProfile(
        session.token,
        toUpdateProfilePayload(draft),
      );
      syncProfileIntoSession(profile);
      setProfileDraft(createProfileDraftFromProfile(profile));
      setMessage("Profile updated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-[min(960px,calc(100%_-_40px))] py-10 max-[700px]:w-[min(100%_-_28px,960px)]">
      {session ? (
        <>
          <ProfileHeader isSaving={isSaving} />
          <ProfileForm
            session={session}
            draft={draft}
            previewAvatarUrl={previewAvatarUrl}
            isSaving={isSaving}
            message={message}
            error={error}
            fileInputRef={fileInputRef}
            onSubmit={handleSubmit}
            onAvatarChange={handleAvatarFileChange}
            onOpenAvatarPicker={openAvatarPicker}
            onDraftChange={updateDraft}
          />
          {cropState ? (
            <AvatarCropDialog
              cropState={cropState}
              setCropState={setCropState}
              isCropping={isCropping}
              onClose={() => setCropState(null)}
              onChooseOther={openAvatarPicker}
              onApply={applyCroppedAvatar}
            />
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
  );
}
