import { FormEvent, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { ErrorAlert } from "../components/ui/ErrorAlert";
import { useAuthStore } from "../store/auth.store";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const lastError = useAuthStore((state) => state.lastError);
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname || "/";
  }, [location.state]);

  if (status === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch {
      setFormError("登录失败，请检查邮箱和密码");
    }
  };

  const isSubmitting = status === "loading";
  const errorMessage = formError ?? lastError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-panel">
        <div className="mb-6">
          <p className="text-sm font-semibold text-brand-700">CRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">登录</h1>
        </div>

        {errorMessage ? (
          <div className="mb-4">
            <ErrorAlert message={errorMessage} />
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">邮箱</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-stone-400 focus:border-brand-600"
              placeholder="name@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">密码</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-stone-400 focus:border-brand-600"
              placeholder="请输入密码"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isSubmitting ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
