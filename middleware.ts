import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Bu middleware ile admin route'larını koruyacağız
// İleride NextAuth.js ile tam authentication eklenecek

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin route'ları kontrol et
  if (pathname.startsWith('/admin')) {
    // TODO: NextAuth session kontrolü eklenecek
    // Şimdilik basit bir kontrol
    const authToken = request.cookies.get('auth-token')
    
    if (!authToken) {
      // Login sayfasına yönlendir
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// Sadece bu route'larda çalışsın
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
