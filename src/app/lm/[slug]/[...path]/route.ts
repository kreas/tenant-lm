import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { r2Get } from "@/lib/r2";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path: pathSegments } = await params;

  // Security: prevent directory traversal
  const requestedPath = pathSegments.join("/");
  if (requestedPath.includes("..") || requestedPath.includes("~")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const result = await r2Get(`${slug}/${requestedPath}`);
  if (!result) {
    return new NextResponse("Not found", { status: 404 });
  }

  const mimeType = getMimeType(requestedPath);

  return new NextResponse(result.body, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
