import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword, createSession, updateLastLogin } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit';

const LOGIN_RATE_LIMIT = 5;        // 每 15 分钟最多 5 次登录尝试
const LOGIN_WINDOW_MS  = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  // ── 速率限制 ──────────────────────────────────
  const ip = getClientIP(req);
  const loginKey = `login:${ip}`;
  const { allowed, retryAfterMs } = checkRateLimit(loginKey, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS);
  if (!allowed) {
    return rateLimitResponse(retryAfterMs);
  }

  // ── 输入校验 ──────────────────────────────────
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { username, password } = body;

  // 参数白名单：只允许字母数字下划线
  if (!username?.trim() || !/^[a-zA-Z0-9_]{1,32}$/.test(username.trim())) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }
  if (!password?.trim() || password.length > 128) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  // ── 认证 ──────────────────────────────────────
  console.log('Login attempt with username:', username.trim());
  console.log('Environment:', process.env.NODE_ENV);
  
  const user = await getUserByUsername(username.trim());
  console.log('Retrieved user:', user ? { ...user, passwordHash: '***' } : null);
  
  if (!user) {
    // 故意延时，防止通过响应时间判断用户是否存在
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  // 验证密码
  console.log('Password hash length:', user.passwordHash.length);
  
  const valid = await verifyPassword(password, user.passwordHash);
  console.log('Password verification result:', valid);
  
  if (!valid) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  // ── 创建会话 ──────────────────────────────────
  const userId = user.id as number;
  const sessionId = await createSession(userId);
  await updateLastLogin(userId);

  const isProd = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({
    success: true,
    user: {
      id: userId,
      username: user.username as string,
      role: user.role as string,
      avatar: user.avatar as string | null,
    },
  });

  response.cookies.set('session_id', sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,   // 7 天
    path: '/',
    priority: 'high',
  });

  return response;
}
