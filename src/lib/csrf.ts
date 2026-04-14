// CSRF保护工具

import crypto from 'crypto';

// 生成CSRF令牌
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 验证CSRF令牌
export function validateCsrfToken(token: string): boolean {
  return token.length === 64 && /^[a-f0-9]+$/.test(token);
}

// 为请求设置CSRF令牌
export function setCsrfToken(response: Response): void {
  const token = generateCsrfToken();
  response.headers.set('X-CSRF-Token', token);
  
  // 在cookie中设置CSRF令牌
  const cookieOptions = {
    httpOnly: false, // 需要在客户端读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24, // 24小时
    path: '/'
  };
  
  const cookieString = `csrf_token=${token}; HttpOnly=${cookieOptions.httpOnly}; Secure=${cookieOptions.secure}; SameSite=${cookieOptions.sameSite}; Max-Age=${cookieOptions.maxAge}; Path=${cookieOptions.path}`;
  response.headers.set('Set-Cookie', cookieString);
}

// 验证请求中的CSRF令牌
export function verifyCsrfToken(request: Request): boolean {
  // 从请求头获取令牌
  const headerToken = request.headers.get('X-CSRF-Token');
  
  // 从cookie获取令牌
  const cookieHeader = request.headers.get('Cookie');
  let cookieToken = '';
  if (cookieHeader) {
    const cookies = cookieHeader.split('; ');
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'csrf_token') {
        cookieToken = value;
        break;
      }
    }
  }
  
  // 验证令牌
  return headerToken && cookieToken && headerToken === cookieToken && validateCsrfToken(headerToken);
}
