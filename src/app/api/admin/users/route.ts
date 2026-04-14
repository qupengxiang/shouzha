import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, getUserById } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

async function requireAdmin(req: NextRequest) {
  const userInfo = await getAuthenticatedUser(req);
  if (!userInfo) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  const user = await getUserById(userInfo.userId);
  if (!user || user.role !== 'admin') {
    return { error: NextResponse.json({ error: '权限不足' }, { status: 403 }) };
  }
  return { success: true };
}

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ('error' in authResult) return authResult.error;
  
  const users = await getAllUsers();
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

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ('error' in authResult) return authResult.error;
  
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
    const result = await createUser(username.trim(), password, email?.trim());
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (role !== 'user') {
      await updateUser(result.id, { role });
    }
    return NextResponse.json({ success: true, userId: result.id });
  } catch (e: unknown) {
    const err = e as Error;
    if (err.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}