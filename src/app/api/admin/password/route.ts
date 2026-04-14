import { NextRequest, NextResponse } from 'next/server';
import { getUserById, verifyPassword, changePassword } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit';
import { getAuthenticatedUser, requireAuth } from '@/lib/auth';

const PWD_RATE_LIMIT = 3;
const PWD_WINDOW_MS  = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed, retryAfterMs } = checkRateLimit(`pwd:${ip}`, PWD_RATE_LIMIT, PWD_WINDOW_MS);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const userInfo = await getAuthenticatedUser(request);
  if (!requireAuth(userInfo)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return NextResponse.json({ error: '请填写当前密码' }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json({ error: '请填写新密码' }, { status: 400 });
  }
  if (newPassword.length < 6 || newPassword.length > 128) {
    return NextResponse.json({ error: '新密码长度需在 6-128 位之间' }, { status: 400 });
  }

  const user = await getUserById(userInfo.userId);
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const valid = await verifyPassword(currentPassword, user.passwordHash as string);
  if (!valid) return NextResponse.json({ error: '当前密码错误' }, { status: 400 });

  await changePassword(userInfo.userId, newPassword);
  return NextResponse.json({ success: true, message: '密码修改成功' });
}
