import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** 全局安全响应头 */
const SECURITY_HEADERS = {
  // 防止点击劫持
  'X-Frame-Options': 'DENY',
  // 防止 MIME 类型 sniffing
  'X-Content-Type-Options': 'nosniff',
  // XSS 过滤器（IE/Edge）
  'X-XSS-Protection': '1; mode=block',
  // 禁止搜索引擎索引管理后台
  'X-Robots-Tag': 'noindex, nofollow',
  // 权限策略（摄像头/麦克风等全禁）
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  // 引用来源策略
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 内容安全策略（生产环境可收紧）
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 开发需要，部署后可收紧
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
};

import { verifyCsrfToken, setCsrfToken } from './lib/csrf';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 只对 API 路由和管理后台添加安全头
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/') || pathname.startsWith('/admin')) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
  }

  // 登录页强制 HTTPS（生产环境）
  if (
    process.env.NODE_ENV === 'production' &&
    pathname.startsWith('/admin') &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url);
  }

  // 为GET请求设置CSRF令牌
  if (request.method === 'GET' && (pathname.startsWith('/admin') || pathname.startsWith('/api/'))) {
    setCsrfToken(response);
  }

  // 为非GET请求验证CSRF令牌
  if (request.method !== 'GET' && pathname.startsWith('/api/')) {
    if (!verifyCsrfToken(request)) {
      return new NextResponse(JSON.stringify({ error: 'CSRF验证失败' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // 匹配所有 API 和 admin 路由
    '/((?!_next/static|_next/image|favicon.ico|uploads|images).*)',
  ],
};
