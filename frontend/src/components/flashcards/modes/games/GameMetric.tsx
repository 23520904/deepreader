export function GameMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-white px-4 py-3 ring-1 ring-[#e2e8f0] max-[420px]:px-3">
      <p className="text-[12px] font-black text-[#64748b]">{label}</p>
      <p className="mt-1 truncate text-[clamp(18px,6vw,22px)] font-black text-[#0f172a]">
        {value}
      </p>
    </div>
  );
}
