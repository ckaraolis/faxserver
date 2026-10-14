import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFaxPdf } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const fax = await prisma.fax.findUnique({ where: { id } });

  if (!fax?.mediaPath) {
    return NextResponse.json({ error: "No file available" }, { status: 404 });
  }

  const inline = new URL(request.url).searchParams.get("inline") === "1";

  try {
    const buffer = await readFaxPdf(fax.mediaPath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="fax-${id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
