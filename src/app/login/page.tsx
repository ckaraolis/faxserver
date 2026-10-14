import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
