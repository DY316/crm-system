import { Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/auth.store";
import { ErrorAlert } from "../ui/ErrorAlert";

export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const lastError = useAuthStore((state) => state.lastError);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-ink">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-brand-700">CRM</p>
            <p className="text-xs text-stone-500">Frontend Foundation</p>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {user?.email ? (
              <span className="hidden truncate text-sm text-stone-600 sm:block">{user.email}</span>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-700"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {lastError ? (
          <div className="mb-4">
            <ErrorAlert message={lastError} />
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
