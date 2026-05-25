"use client";

/* eslint-disable @next/next/no-img-element */
export const DEFAULT_USER_ICON = "/assets/icons/sidebar/user-icon.png";

export const accountIconTint = {
  filter:
    "invert(26%) sepia(89%) saturate(1558%) hue-rotate(222deg) brightness(91%) contrast(88%)",
};

type AccountAvatarProps = {
  avatarUrl?: string | null;
  size: number;
  imagePaddingClassName: string;
  className?: string;
};

export function AccountAvatar({
  avatarUrl,
  size,
  imagePaddingClassName,
  className = "",
}: AccountAvatarProps) {
  const trimmedAvatarUrl = avatarUrl?.trim();

  return (
    <div className={`overflow-hidden rounded-full bg-[#eaf2ff] ${className}`}>
      {trimmedAvatarUrl ? (
        <span
          aria-hidden="true"
          className="block h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(trimmedAvatarUrl)})` }}
        />
      ) : (
        <img
          src={DEFAULT_USER_ICON}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover ${imagePaddingClassName}`}
          style={accountIconTint}
        />
      )}
    </div>
  );
}
