import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFaxPdf } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** Public media endpoint for Telnyx to fetch outbound PDFs (unguessable cuid ids). */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const fax = await prisma.fax.findUnique({ where: { id } });

  if (!fax?.mediaPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFaxPdf(fax.mediaPath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="fax-${id}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
