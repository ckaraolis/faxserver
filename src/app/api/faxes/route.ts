import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFaxPdf } from "@/lib/storage";
import { normalizeE164, sendFax } from "@/lib/telnyx";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction");

  const faxes = await prisma.fax.findMany({
    where:
      direction === "inbound" || direction === "outbound"
        ? { direction }
        : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    take: 100,
  });

  return NextResponse.json({ faxes });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const fromNumberRaw = String(form.get("fromNumber") ?? "");
    const toNumberRaw = String(form.get("toNumber") ?? "");
    const notes = String(form.get("notes") ?? "").trim() || null;
    const file = form.get("file");

    if (!fromNumberRaw || !toNumberRaw) {
      return NextResponse.json(
        { error: "From and To numbers are required" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const fromNumber = normalizeE164(fromNumberRaw);
    const toNumber = normalizeE164(toNumberRaw);

    const companyNumber = await prisma.faxNumber.findFirst({
      where: { number: fromNumber, isActive: true },
    });
    if (!companyNumber) {
      return NextResponse.json(
        { error: "From number is not an active company fax number" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }
    if (buffer.byteLength > 40 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF must be under 40MB" }, { status: 400 });
    }

    const mediaPath = await saveFaxPdf(buffer, "outbound");

    const fax = await prisma.fax.create({
      data: {
        direction: "outbound",
        status: "queued",
        fromNumber,
        toNumber,
        mediaPath,
        notes,
        createdByUserId: session.user.id,
      },
    });

    const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) {
      return NextResponse.json(
        { error: "APP_BASE_URL is not configured" },
        { status: 500 }
      );
    }

    const mediaUrl = `${baseUrl}/api/media/${fax.id}`;

    try {
      const telnyxResult = await sendFax({
        from: fromNumber,
        to: toNumber,
        mediaUrl,
      });

      const updated = await prisma.fax.update({
        where: { id: fax.id },
        data: {
          telnyxFaxId: telnyxResult.id || null,
          status: telnyxResult.status || "queued",
        },
      });

      return NextResponse.json({ fax: updated }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Send failed";
      const failed = await prisma.fax.update({
        where: { id: fax.id },
        data: { status: "failed", failureReason: message },
      });
      return NextResponse.json({ fax: failed, error: message }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
