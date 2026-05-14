"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent, RefObject } from "react";
import { AccountAvatar } from "@/components/AccountSidebar";
import type { AuthResponse } from "@/lib/auth";
import type { ProfileDraft } from "@/lib/profile";

const EDIT_ICON = "/assets/icons/profile/edit-icon.png";
export const PROFILE_FORM_ID = "profileForm";

type ProfileFormProps = {
  session: AuthResponse;
  draft: ProfileDraft;
  previewAvatarUrl: string | null;
  isSaving: boolean;
  message: string;
  error: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenAvatarPicker: () => void;
  onDraftChange: (patch: Partial<Omit<ProfileDraft, "userId">>) => void;
};

export function ProfileHeader({ isSaving }: { isSaving: boolean }) {
  return (
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
        form={PROFILE_FORM_ID}
        disabled={isSaving}
        className="flex min-h-[46px] min-w-[150px] cursor-pointer items-center justify-center rounded-[8px] bg-[#245895] px-6 text-[14px] font-black text-white shadow-[0_14px_28px_rgba(36,88,149,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

export function ProfileForm({
  session,
  draft,
  previewAvatarUrl,
  message,
  error,
  fileInputRef,
  onSubmit,
  onAvatarChange,
  onOpenAvatarPicker,
  onDraftChange,
}: ProfileFormProps) {
  return (
    <form id={PROFILE_FORM_ID} onSubmit={onSubmit}>
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
              onClick={onOpenAvatarPicker}
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
          onChange={onAvatarChange}
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
              onChange={(event) => onDraftChange({ username: event.target.value })}
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
              onChange={(event) => onDraftChange({ fullName: event.target.value })}
              className="h-12 rounded-[8px] border border-[#c8d4e6] bg-white px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#17213a] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
              placeholder="Your full name"
            />
          </label>

          <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66]">
            Phone
            <input
              value={draft.phoneNumber}
              maxLength={30}
              onChange={(event) => onDraftChange({ phoneNumber: event.target.value })}
              className="h-12 rounded-[8px] border border-[#c8d4e6] bg-white px-4 text-[15px] font-semibold normal-case tracking-[0] text-[#17213a] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
              placeholder="+84..."
            />
          </label>

          <label className="grid gap-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2d3e66] md:col-span-2">
            Location
            <input
              value={draft.location}
              maxLength={120}
              onChange={(event) => onDraftChange({ location: event.target.value })}
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
  );
}
