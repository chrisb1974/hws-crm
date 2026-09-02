import type { Metadata } from "next";
import LoginForm from "@/components/login-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.login.title} — connexion` };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const suite = first(params.suite);
  const erreur = first(params.erreur);
  const deconnecte = first(params.deconnecte);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fond px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-navy-400">
            {t.appName}
          </p>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-navy-900">
            {t.login.subtitle}
          </h1>
        </div>

        <div className="rounded-lg border border-bordure bg-surface p-6 shadow-[0_1px_2px_rgba(14,23,59,0.04)]">
          {erreur ? (
            <p
              role="alert"
              className="mb-4 rounded-md border border-danger/30 bg-danger-fond px-3 py-2 text-[13px] text-danger"
            >
              {t.login.linkExpired}
            </p>
          ) : null}
          {deconnecte ? (
            <p
              role="status"
              className="mb-4 rounded-md border border-bordure bg-fond px-3 py-2 text-[13px] text-encre-75"
            >
              {t.login.signedOut}
            </p>
          ) : null}

          <LoginForm suite={suite} />
        </div>
      </div>
    </main>
  );
}
