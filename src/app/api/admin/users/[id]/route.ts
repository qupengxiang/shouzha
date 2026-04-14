import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser, resetUserPassword, getUserById } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

async function requireAdmin(req: NextRequest) {
  const userInfo = await getAuthenticatedUser(req);
  if (!userInfo) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  const currentUser = await getUserById(userInfo.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: NextResponse.json({ error: '权限不足' }, { status: 403 }) };
  }
  return { user: currentUser };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if ('error' in authResult) return authResult.error;
  const currentUser = authResult.user;
  
  const { id } = await params;
  const userId = parseInt(id);
  if (!userId) {
    return NextResponse.json({ error: '用户ID无效' }, { status: 400 });
  }
  
  const body = await req.json();
  const { email, role, avatar, bio, newPassword } = body;
  
  if (role && role !== 'admin') {
    const targetUser = await getUserById(userId);
    if (targetUser?.role === 'admin' && currentUser.id === userId) {
      return NextResponse.json({ error: '不能移除自己的管理员身份' }, { status: 400 });
    }
  }
  
  const updates: { email?: string; role?: string; avatar?: string; bio?: string } = {};
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (avatar !== undefined) updates.avatar = avatar;
  if (bio !== undefined) updates.bio = bio;
  
  if (Object.keys(updates).length > 0) {
    await updateUser(userId, updates);
  }
  
  if (newPassword?.trim() && newPassword.length >= 6) {
    const result = await resetUserPassword(userId, newPassword);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if ('error' in authResult) return authResult.error;
  const currentUser = authResult.user;
  
  const { id } = await params;
  const userId = parseInt(id);
  if (!userId) {
    return NextResponse.json({ error: '用户ID无效' }, { status: 400 });
  }
  
  if (currentUser.id === userId) {
    return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
  }
  
  await deleteUser(userId);
  return NextResponse.json({ success: true });
}