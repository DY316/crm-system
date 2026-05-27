import { EmptyState } from "../components/ui/PageState";
import { useAuthStore } from "../store/auth.store";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const workspace = useAuthStore((state) => state.workspace);
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const dataScope = useAuthStore((state) => state.data_scope);
  const lastRequestId = useAuthStore((state) => state.lastRequestId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
        <div className="border-b border-stone-200 pb-4">
          <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-600">{user?.email ?? "Current user"}</p>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-stone-500">Workspace</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {workspace?.name ?? "Not returned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-stone-500">Data scope</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{dataScope ?? "Not returned"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-stone-500">Roles</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{roles.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-stone-500">Permissions</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{permissions.length}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <EmptyState />
        </div>
      </section>

      <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Session</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">User</p>
            <p className="mt-1 break-words text-stone-700">{user?.email ?? "Not loaded"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">request_id</p>
            <p className="mt-1 break-all text-stone-700">{lastRequestId || "Not recorded"}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
