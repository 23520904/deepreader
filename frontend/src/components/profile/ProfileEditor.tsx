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

// Main component for editing the current user's profile.
export function ProfileEditor() {
  // Reads the current auth session and updates this component when the session changes.
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  // Ref for the hidden file input used to choose an avatar image.
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stores the editable profile data before it is saved to the server.
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => emptyProfileDraft());

  // Stores avatar crop data while the user is cropping a selected image.
  const [cropState, setCropState] = useState<CropState | null>(null);

  // Success message shown after saving or updating profile data.
  const [message, setMessage] = useState("");

  // Error message shown when loading, saving, or image handling fails.
  const [error, setError] = useState("");

  // True while the profile update request is running.
  const [isSaving, setIsSaving] = useState(false);

  // True while the cropped avatar image is being created.
  const [isCropping, setIsCropping] = useState(false);

  // These values are taken from the current session and reused in profile actions.
  const activeUserId = session?.userId ?? "";
  const activeToken = session?.token ?? "";

  // Creates a profile draft from the session.
  // useMemo avoids rebuilding this draft unless the session changes.
  const sessionDraft = useMemo(() => createProfileDraftFromSession(session), [session]);

  // Uses the saved local draft only when it belongs to the active user.
  // Otherwise, it falls back to the draft created from the current session.
  const draft = profileDraft.userId === activeUserId ? profileDraft : sessionDraft;

  // Avatar preview URL shown in the form.
  // Empty strings are converted to null so the form can handle "no avatar" clearly.
  const previewAvatarUrl = useMemo(() => draft.avatarUrl.trim() || null, [draft.avatarUrl]);

  // Loads the latest profile from the server when the active user and token are available.
  useEffect(() => {
    if (!activeUserId || !activeToken) {
      return;
    }

    // Prevents state updates if the component unmounts before the request finishes.
    let cancelled = false;

    fetchUserProfile(activeToken)
      .then((profile) => {
        if (cancelled) {
          return;
        }

        // Keep the auth session and local draft in sync with the loaded profile.
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

  // Updates part of the profile draft when the user edits the form.
  function updateDraft(patch: Partial<Omit<ProfileDraft, "userId">>) {
    setMessage("");
    setError("");
    setProfileDraft((current) => ({
      ...(current.userId === activeUserId ? current : sessionDraft),
      ...patch,
      userId: activeUserId,
    }));
  }

  // Opens the hidden avatar file input.
  function openAvatarPicker() {
    fileInputRef.current?.click();
  }

  // Handles the image file selected by the user for the avatar.
  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Reset the input so the same file can be selected again later.
    event.target.value = "";

    if (!file) {
      return;
    }

    // Only image files are allowed for avatars.
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    // Reject images that are too large.
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError("Avatar image must be 6MB or smaller.");
      return;
    }

    // Read the selected image as a data URL so it can be shown in the crop dialog.
    const reader = new FileReader();
    reader.onload = () => {
      setMessage("");
      setError("");
      setCropState(createInitialCropState(String(reader.result)));
    };
    reader.onerror = () => setError("Could not read this image.");
    reader.readAsDataURL(file);
  }

  // Applies the selected crop and saves the cropped avatar into the profile draft.
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

  // Saves the edited profile data to the server.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    // Username is required before submitting the profile.
    if (!draft.username.trim()) {
      setError("Please enter a user name.");
      return;
    }

    // A valid session is required to update the profile.
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

      // After saving, update both the session and the local draft with server data.
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
    // Main profile editor page container.
    <section className="mx-auto w-[min(960px,calc(100%_-_40px))] py-10 max-[700px]:w-[min(100%_-_28px,960px)]">
      {session ? (
        <>
          {/* Header for the profile editor screen */}
          <ProfileHeader isSaving={isSaving} />

          {/* Main profile form with avatar, profile fields, messages, and submit handling */}
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

          {/* Avatar crop dialog shown after the user selects an image */}
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
        // Login prompt shown when there is no active session.
        <div className="mx-auto mt-16 max-w-[520px] rounded-[8px] border border-white/80 bg-white px-7 py-12 text-center shadow-[0_24px_70px_rgba(31,41,55,0.08)]">
          <h1 className="text-[30px] font-black text-[#1d355b]">Profile</h1>
          <p className="mt-3 text-[16px] font-medium text-[#7f8aa8]">
            Log in to edit your account profile.
          </p>

          {/* Link that sends the user to the login page */}
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