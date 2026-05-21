export function GameMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3 ring-1 ring-[#e2e8f0]">
      <p className="text-[12px] font-black text-[#64748b]">{label}</p>
      <p className="mt-1 text-[22px] font-black text-[#0f172a]">{value}</p>
    </div>
  );
}
