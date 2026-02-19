import { NextRequest, NextResponse } from "next/server";

async function getSessionToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD || "";
  const encoder = new TextEncoder();
  const data = encoder.encode(`tenant-lm:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (
    pathname.startsWith("/lm/") ||
    pathname.startsWith("/api/submissions") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Everything else is admin — check session cookie
  const sessionCookie = request.cookies.get("admin-session")?.value;
  if (!process.env.ADMIN_PASSWORD) {
    // No password configured — allow access (dev convenience)
    return NextResponse.next();
  }

  const expectedToken = await getSessionToken();
  if (sessionCookie === expectedToken) {
    return NextResponse.next();
  }

  // API routes return 401, pages redirect to login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
