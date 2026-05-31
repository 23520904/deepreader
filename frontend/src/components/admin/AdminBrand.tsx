/* eslint-disable @next/next/no-img-element */

/**
 * Shared DeepReader admin brand block.
 *
 * The compact variant is used in the mobile sticky header.
 */
export function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#eff6ff] ring-1 ring-[#dbeafe] sm:h-12 sm:w-12">
        <img
          src="/assets/images/brand/deepreader-favicon.png"
          alt=""
          className="h-9 w-9 object-contain sm:h-10 sm:w-10"
        />
      </div>

      {!compact ? (
        <div className="min-w-0">
          <p className="text-[18px] font-black leading-none text-[#0f172a]">
            DeepReader
          </p>
          <p className="mt-1 text-[12px] font-black uppercase tracking-[0.12em] text-[#2563eb]">
            Admin Panel
          </p>
        </div>
      ) : (
        <p className="truncate text-[16px] font-black text-[#0f172a]">Admin</p>
      )}
    </div>
  );
}