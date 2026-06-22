import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function navClass(isActive: boolean) {
  return isActive
    ? "rounded-lg bg-cyan-400/10 px-3 py-2 text-cyan-300"
    : "rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white";
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="text-xl font-bold text-cyan-300">
            TropelCare
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <NavLink to="/dashboard" className={({ isActive }) => navClass(isActive)}>
              Dashboard
            </NavLink>

            <span className="hidden text-slate-400 md:inline">
              {user?.displayName} · {user?.teamCode}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-3 py-2 font-semibold text-white hover:bg-red-400"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}