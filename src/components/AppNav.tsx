import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function AppNav() {
  const session = await auth();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            Cyprus Fax
          </Link>
          {session?.user && (
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                Inbox
              </Link>
              <Link href="/send" className="hover:text-slate-900">
                Send
              </Link>
              <Link href="/settings/numbers" className="hover:text-slate-900">
                Numbers
              </Link>
            </nav>
          )}
        </div>
        {session?.user && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{session.user.name ?? session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
