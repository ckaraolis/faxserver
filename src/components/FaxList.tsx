import Link from "next/link";

export type FaxListItem = {
  id: string;
  direction: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  pages: number | null;
  createdAt: string | Date;
  createdBy?: { name: string } | null;
};

function statusClass(status: string) {
  switch (status) {
    case "delivered":
    case "received":
      return "bg-emerald-50 text-emerald-800";
    case "failed":
      return "bg-rose-50 text-rose-800";
    case "sending":
    case "queued":
    case "media_processed":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function FaxList({
  faxes,
  emptyLabel,
}: {
  faxes: FaxListItem[];
  emptyLabel: string;
}) {
  if (faxes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {faxes.map((fax) => (
        <li key={fax.id}>
          <Link
            href={`/faxes/${fax.id}`}
            className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {fax.direction === "inbound"
                  ? `From ${fax.fromNumber}`
                  : `To ${fax.toNumber}`}
              </p>
              <p className="truncate text-xs text-slate-500">
                {fax.direction === "inbound"
                  ? `Received on ${fax.toNumber}`
                  : `From ${fax.fromNumber}`}
                {fax.createdBy?.name ? ` · ${fax.createdBy.name}` : ""}
                {fax.pages != null ? ` · ${fax.pages} page(s)` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(fax.status)}`}
              >
                {fax.status.replaceAll("_", " ")}
              </span>
              <time className="text-xs text-slate-500">
                {new Date(fax.createdAt).toLocaleString()}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
