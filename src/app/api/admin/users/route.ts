import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword, getSession, getUserById } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit';

// 获取所有用户
export async function GET(req: NextRequest) {
  // 验证管理员身份
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '会话已过期' }, { status: 401 });
  }
  
  const user = await getUserById(session.userId);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }
  
  const users = await getAllUsers();
  // 返回用户列表，不包含密码哈希
  const safeUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    bio: u.bio,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));
  
  return NextResponse.json({ users: safeUsers });
}

// 创建新用户
export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '会话已过期' }, { status: 401 });
  }
  
  const user = await getUserById(session.userId);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }
  
  const body = await req.json();
  const { username, password, email, role } = body;
  
  if (!username?.trim() || !/^[a-zA-Z0-9_]{1,32}$/.test(username.trim())) {
    return NextResponse.json({ error: '用户名格式不正确' }, { status: 400 });
  }
  if (!password?.trim() || password.length < 6) {
    return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 });
  }
  if (!role || !['admin', 'user', 'editor'].includes(role)) {
    return NextResponse.json({ error: '角色无效' }, { status: 400 });
  }
  
  try {
    const userId = await createUser(username.trim(), password, email?.trim());
    // 设置角色（createUser 默认是 user）
    if (role !== 'user') {
      await updateUser(userId, { role });
    }
    return NextResponse.json({ success: true, userId });
  } catch (e: unknown) {
    const err = e as Error;
    if (err.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}