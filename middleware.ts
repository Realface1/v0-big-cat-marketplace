import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const { pathname } = request.nextUrl

  // Subdomain detection — works for both production and preview
  // e.g. admin.bigcatmarketplace.com  or  agent.bigcatmarketplace.com
  const isAdminSubdomain = hostname.startsWith("admin.")
  const isAgentSubdomain = hostname.startsWith("agent.")

  if (isAdminSubdomain) {
    // Serve the admin portal for all paths on the admin subdomain
    const url = request.nextUrl.clone()
    url.pathname = "/admin-portal"
    return NextResponse.rewrite(url)
  }

  if (isAgentSubdomain) {
    // Serve the agent portal for all paths on the agent subdomain
    const url = request.nextUrl.clone()
    url.pathname = "/agent-portal"
    return NextResponse.rewrite(url)
  }

  // On the main domain, block direct access to the portal pages so they
  // are only reachable through their subdomains (security: obscure the URLs)
  if (
    pathname.startsWith("/admin-portal") ||
    pathname.startsWith("/agent-portal")
  ) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf)).*)",
  ],
}
