import { EmptyState } from "../components/ui/PageState";
import { useAuthStore } from "../store/auth.store";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const lastRequestId = useAuthStore((state) => state.lastRequestId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
        <div className="border-b border-stone-200 pb-4">
          <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-600">{user?.email ?? "当前用户"}</p>
        </div>
        <div className="mt-5">
          <EmptyState />
        </div>
      </section>

      <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">会话</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">用户</p>
            <p className="mt-1 break-words text-stone-700">{user?.email ?? "未加载"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">request_id</p>
            <p className="mt-1 break-all text-stone-700">{lastRequestId || "未记录"}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
