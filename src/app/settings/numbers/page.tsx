import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NumbersSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const numbers = await prisma.faxNumber.findMany({
    orderBy: { label: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Company fax numbers
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          These Cyprus numbers are used as the From identity when sending and as
          inbound receive numbers after they are ported to Telnyx and assigned
          to your Programmable Fax Application.
        </p>
      </div>

      {numbers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No numbers configured. Set{" "}
          <code className="rounded bg-slate-100 px-1">FAX_NUMBERS</code> in{" "}
          <code className="rounded bg-slate-100 px-1">.env</code> and run{" "}
          <code className="rounded bg-slate-100 px-1">npm run db:seed</code>.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {numbers.map((number) => (
            <li
              key={number.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{number.label}</p>
                <p className="text-sm text-slate-500">{number.number}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  number.isActive
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {number.isActive ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Telnyx porting checklist</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Create a Telnyx account and Programmable Fax Application</li>
          <li>Port each Cyprus number (LOA, invoice, company registration)</li>
          <li>Assign ported numbers to the Fax Application</li>
          <li>
            Set webhook URL to{" "}
            <code className="rounded bg-white px-1">
              {"${APP_BASE_URL}/api/webhooks/telnyx"}
            </code>
          </li>
          <li>
            Put API credentials in{" "}
            <code className="rounded bg-white px-1">.env</code>
          </li>
        </ol>
      </div>
    </div>
  );
}
