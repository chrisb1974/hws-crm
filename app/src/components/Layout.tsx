import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sales: "Sales",
  support: "Support",
};

export function Layout({ children }: { children: ReactNode }) {
  const { appUser, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-ink">
            HWS <span className="text-brand">CRM</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {appUser && (
              <span className="text-muted">
                {appUser.full_name || appUser.email}
                <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs text-muted">
                  {ROLE_LABEL[appUser.role] ?? appUser.role}
                </span>
              </span>
            )}
            <button
              onClick={() => signOut()}
              className="rounded-md border border-line px-3 py-1.5 text-muted transition hover:border-danger hover:text-danger"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
