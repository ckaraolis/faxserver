import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type FaxDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function FaxDetailPage({ params }: FaxDetailProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const fax = await prisma.fax.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!fax) {
    notFound();
  }

  const timeline = [
    { label: "Created", at: fax.createdAt },
    fax.deliveredAt
      ? { label: fax.direction === "inbound" ? "Received" : "Delivered", at: fax.deliveredAt }
      : null,
    { label: "Last updated", at: fax.updatedAt },
  ].filter(Boolean) as { label: string; at: Date }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">
              ← Back to list
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {fax.direction === "inbound" ? "Received fax" : "Sent fax"}
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-500">
            Status: {fax.status.replaceAll("_", " ")}
          </p>
        </div>
        {fax.mediaPath && (
          <a
            href={`/api/faxes/${fax.id}/download`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Download PDF
          </a>
        )}
      </div>

      <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Detail label="From" value={fax.fromNumber} />
        <Detail label="To" value={fax.toNumber} />
        <Detail label="Direction" value={fax.direction} />
        <Detail label="Pages" value={fax.pages != null ? String(fax.pages) : "—"} />
        <Detail
          label="Sent by"
          value={fax.createdBy?.name ?? (fax.direction === "inbound" ? "External" : "—")}
        />
        <Detail label="Telnyx ID" value={fax.telnyxFaxId ?? "—"} />
        {fax.notes && <Detail label="Notes" value={fax.notes} />}
        {fax.failureReason && (
          <Detail label="Failure reason" value={fax.failureReason} />
        )}
      </dl>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
        <ol className="mt-3 space-y-2">
          {timeline.map((item) => (
            <li
              key={`${item.label}-${item.at.toISOString()}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-700">{item.label}</span>
              <time className="text-slate-500">{item.at.toLocaleString()}</time>
            </li>
          ))}
        </ol>
      </section>

      {fax.mediaPath && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Preview</h2>
          <iframe
            title="Fax PDF preview"
            src={`/api/faxes/${fax.id}/download?inline=1`}
            className="h-[70vh] w-full rounded-md border border-slate-200"
          />
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm text-slate-900">{value}</dd>
    </div>
  );
}
