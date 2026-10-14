import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveFaxPdf } from "@/lib/storage";
import { downloadMedia, verifyTelnyxWebhook } from "@/lib/telnyx";

type TelnyxPayload = {
  data?: {
    event_type?: string;
    payload?: {
      fax_id?: string;
      id?: string;
      connection_id?: string;
      direction?: string;
      from?: string;
      to?: string;
      status?: string;
      media_url?: string;
      page_count?: number;
      failure_reason?: string;
      call_duration_secs?: number;
    };
  };
};

function mapOutboundStatus(eventType: string, status?: string): string | null {
  switch (eventType) {
    case "fax.queued":
      return "queued";
    case "fax.media.processed":
      return "media_processed";
    case "fax.sending.started":
      return "sending";
    case "fax.delivered":
      return "delivered";
    case "fax.failed":
      return "failed";
    default:
      return status ?? null;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("telnyx-signature-ed25519");
  const timestamp = request.headers.get("telnyx-timestamp");

  const valid = await verifyTelnyxWebhook(rawBody, signature, timestamp);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: TelnyxPayload;
  try {
    body = JSON.parse(rawBody) as TelnyxPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.data?.event_type ?? "";
  const payload = body.data?.payload ?? {};
  const telnyxFaxId = String(payload.fax_id ?? payload.id ?? "");

  if (!eventType) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (eventType === "fax.received") {
      const fromNumber = String(payload.from ?? "unknown");
      const toNumber = String(payload.to ?? "unknown");
      let mediaPath: string | null = null;

      if (payload.media_url) {
        const pdf = await downloadMedia(payload.media_url);
        mediaPath = await saveFaxPdf(pdf, "inbound");
      }

      if (telnyxFaxId) {
        const existing = await prisma.fax.findUnique({
          where: { telnyxFaxId },
        });
        if (existing) {
          await prisma.fax.update({
            where: { id: existing.id },
            data: {
              status: "received",
              mediaPath: mediaPath ?? existing.mediaPath,
              pages: payload.page_count ?? existing.pages,
              deliveredAt: new Date(),
            },
          });
          return NextResponse.json({ ok: true, updated: existing.id });
        }
      }

      const created = await prisma.fax.create({
        data: {
          direction: "inbound",
          status: "received",
          fromNumber,
          toNumber,
          telnyxFaxId: telnyxFaxId || null,
          mediaPath,
          pages: payload.page_count ?? null,
          deliveredAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true, created: created.id });
    }

    if (!telnyxFaxId) {
      return NextResponse.json({ ok: true, ignored: "missing fax id" });
    }

    const status = mapOutboundStatus(eventType, payload.status);
    const fax = await prisma.fax.findUnique({ where: { telnyxFaxId } });

    if (!fax) {
      // Inbound may arrive with intermediate events before fax.received
      if (payload.direction === "inbound" || eventType.startsWith("fax.receiving")) {
        return NextResponse.json({ ok: true, pending: true });
      }
      return NextResponse.json({ ok: true, ignored: "unknown fax" });
    }

    await prisma.fax.update({
      where: { id: fax.id },
      data: {
        status: status ?? fax.status,
        pages: payload.page_count ?? fax.pages,
        failureReason: payload.failure_reason ?? fax.failureReason,
        deliveredAt:
          eventType === "fax.delivered" ? new Date() : fax.deliveredAt,
      },
    });

    return NextResponse.json({ ok: true, updated: fax.id });
  } catch (error) {
    console.error("Telnyx webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
