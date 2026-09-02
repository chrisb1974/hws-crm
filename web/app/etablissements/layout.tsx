import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export default async function CrmLayout({ children }: LayoutProps<"/etablissements">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-dvh overflow-hidden bg-fond">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-navy-500 focus:px-3 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Aller au contenu
      </a>

      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col bg-navy-900 px-4 py-5 lg:flex">
        <p className="px-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-navy-400">
          {t.appName}
        </p>
        <nav className="mt-6" aria-label={t.nav.properties}>
          <span
            aria-current="page"
            className="flex items-center rounded-md bg-navy-700 px-3 py-2 text-[13px] font-medium text-white"
          >
            {t.nav.properties}
          </span>
        </nav>
        <div className="mt-auto px-2">
          <p className="truncate text-[11px] text-navy-300" title={user?.email ?? ""}>
            {user?.email}
          </p>
          <form action="/auth/signout" method="post" className="mt-2">
            <button
              type="submit"
              className="text-[12px] text-navy-300 underline underline-offset-2 hover:text-white"
            >
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-bordure bg-surface/95 px-6 backdrop-blur">
          <h1 className="text-[15px] font-semibold tracking-tight text-navy-900">
            {t.list.title}
          </h1>
          <form action="/auth/signout" method="post" className="ml-auto lg:hidden">
            <button type="submit" className="text-[12px] text-encre-60 underline underline-offset-2">
              {t.nav.signOut}
            </button>
          </form>
        </header>

        <main id="contenu" className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
