// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // only this page stays public
  const publicUrls = ["/update-password"];
  if (publicUrls.includes(req.nextUrl.pathname)) {
    return res;
  }
}