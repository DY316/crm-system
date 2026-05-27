import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useAuthStore } from "../store/auth.store";

export function ProtectedRoute() {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const lastError = useAuthStore((state) => state.lastError);
  const loadCurrentUser = useAuthStore((state) => state.loadCurrentUser);

  if (!token || status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === "error") {
    return <ErrorState message={lastError ?? "会话加载失败"} onRetry={() => void loadCurrentUser()} />;
  }

  if (!user) {
    return <LoadingState />;
  }

  return <Outlet />;
}
