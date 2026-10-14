import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SendFaxForm } from "@/components/SendFaxForm";

export default async function SendPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const numbers = await prisma.faxNumber.findMany({
    where: { isActive: true },
    orderBy: { label: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Send a fax
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF and send it from one of your company Cyprus numbers.
        </p>
      </div>
      <SendFaxForm numbers={numbers} />
    </div>
  );
}
