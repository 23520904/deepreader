import { AdminManagementShell } from "@/components/admin/AdminManagementShell";

export default function AdminLoading() {
  return (
    <AdminManagementShell>
      <div className="grid gap-6">
        <div className="h-[176px] animate-pulse rounded-[24px] bg-white/70 shadow-[0_24px_70px_rgba(20,40,90,0.08)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-[132px] animate-pulse rounded-[20px] bg-white/70" />
          ))}
        </div>
        <div className="h-[360px] animate-pulse rounded-[22px] bg-white/70" />
      </div>
    </AdminManagementShell>
  );
}
