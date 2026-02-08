import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  // Registry redirection
  if (
    req.nextUrl.pathname.startsWith("/r/") &&
    !req.nextUrl.pathname.endsWith(".json")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `${url.pathname}.json`;
    return NextResponse.rewrite(url);
  }

  const acceptHeader = req.headers.get("accept") || "";
  if (!acceptHeader.includes("text/html")) {
    return NextResponse.next();
  }

  // response
  const response = NextResponse.next()
  const isProd = process.env.NODE_ENV == "production";

  if (isProd) {
    const cspHeader = `
    default-src 'none';
    script-src 'self' 'unsafe-inline' https://www.mspaint.cc https://mspaint.cc https://cdn.vercel-insights.com https://vercel.live https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://www.mspaint.cc https://mspaint.cc https://cdn.discordapp.com/avatars/ https://raw.githubusercontent.com/mspaint-cc/ https://utfs.io https://ob4fgkbb3w.ufs.sh https://q2p0njok3b.ufs.sh;
    font-src 'self' data:;
    connect-src 'self' https://www.mspaint.cc https://mspaint.cc https://va.vercel-scripts.com https://vitals.vercel-insights.com https://raw.githubusercontent.com/mspaint-cc/;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self' https://shop.mspaint.cc https://www.mspaint.cc https://mspaint.cc;
    `.replace(/\s{2,}/g, ' ').trim()
    
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "SAMEORIGIN")
    response.headers.set("Content-Security-Policy", cspHeader)
  }
  
  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};
