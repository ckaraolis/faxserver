import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FaxList } from "@/components/FaxList";
import { redirect } from "next/navigation";

type HomeProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function HomePage({ searchParams }: HomeProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const tab = params.tab === "outbox" ? "outbox" : "inbox";
  const direction = tab === "inbox" ? "inbound" : "outbound";

  const faxes = await prisma.fax.findMany({
    where: { direction },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Faxes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Receive on your Cyprus company numbers and send using the same IDs.
          </p>
        </div>
        <Link
          href="/send"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Send fax
        </Link>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <TabLink href="/?tab=inbox" active={tab === "inbox"}>
          Inbox
        </TabLink>
        <TabLink href="/?tab=outbox" active={tab === "outbox"}>
          Outbox
        </TabLink>
      </div>

      <FaxList
        faxes={faxes}
        emptyLabel={
          tab === "inbox"
            ? "No received faxes yet. Configure Telnyx webhooks to populate the inbox."
            : "No sent faxes yet. Use Send to transmit a PDF."
        }
      />
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-teal-700 text-teal-800"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}
