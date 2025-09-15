import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

export default async function middleware(req: NextRequest) {
  await auth();

  // Registry redirection
  if (
    req.nextUrl.pathname.startsWith("/r/") &&
    !req.nextUrl.pathname.endsWith(".json")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `${url.pathname}.json`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!icons|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
