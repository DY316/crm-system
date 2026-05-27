import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { LoadingState } from "../components/ui/PageState";
import { useAuthStore } from "../store/auth.store";

export function AuthBootstrap() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const loadCurrentUser = useAuthStore((state) => state.loadCurrentUser);

  useEffect(() => {
    if (!initialized && status !== "loading") {
      void loadCurrentUser();
    }
  }, [initialized, loadCurrentUser, status]);

  if (!initialized || status === "loading") {
    return <LoadingState />;
  }

  return <Outlet />;
}
