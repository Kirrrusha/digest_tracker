import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../../stores/auth.store";
import { Sidebar } from "./Sidebar";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
