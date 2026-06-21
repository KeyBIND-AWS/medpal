import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/proxy'

export async function proxy(request: NextRequest) {
  // Update/refresh session and get the current user
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/')
  ) {
    return supabaseResponse
  }
  
  // Protect all pages except the landing page ('/')
  // The matcher configuration already excludes assets/API routes.
  if (pathname !== '/') {
    if (!user) {
      // Redirect to the landing page
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|icons).*)',
  ],
}
