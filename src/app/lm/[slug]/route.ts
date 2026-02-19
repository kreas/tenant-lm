import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Security: prevent directory traversal
  if (slug.includes("..") || slug.includes("~") || slug.includes("/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const indexPath = path.join(process.cwd(), "uploads", slug, "index.html");

  if (!fs.existsSync(indexPath)) {
    return new NextResponse("Lead magnet not found", { status: 404 });
  }

  const html = fs.readFileSync(indexPath, "utf-8");

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
