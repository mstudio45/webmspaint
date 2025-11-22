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

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://raw.githubusercontent.com/mspaint-cc/ https://utfs.io https://ob4fgkbb3w.ufs.sh https://q2p0njok3b.ufs.sh;
    font-src 'self' data:;
    connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://raw.githubusercontent.com/mspaint-cc/;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
  `.replace(/\s{2,}/g, ' ').trim()
  
  // response
  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("Content-Security-Policy", cspHeader)
  
  return response
}

export const config = {
  matcher: [
    "/((?!icons|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
