import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser, resetUserPassword, getSession, getUserById, getUserByUsername } from '@/lib/db';

// 更新用户
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '会话已过期' }, { status: 401 });
  }
  
  const currentUser = await getUserById(session.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }
  
  const userId = parseInt(params.id);
  if (!userId) {
    return NextResponse.json({ error: '用户ID无效' }, { status: 400 });
  }
  
  const body = await req.json();
  const { email, role, avatar, bio, newPassword } = body;
  
  // 不能把最后一个管理员改成普通用户
  if (role && role !== 'admin') {
    const targetUser = await getUserById(userId);
    if (targetUser?.role === 'admin') {
      // 检查是否还有其他管理员
      const allUsers = await getUserByUsername('admin'); // 简化检查
      if (currentUser.id === userId) {
        return NextResponse.json({ error: '不能移除自己的管理员身份' }, { status: 400 });
      }
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
    await resetUserPassword(userId, newPassword);
  }
  
  return NextResponse.json({ success: true });
}

// 删除用户
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '会话已过期' }, { status: 401 });
  }
  
  const currentUser = await getUserById(session.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }
  
  const userId = parseInt(params.id);
  if (!userId) {
    return NextResponse.json({ error: '用户ID无效' }, { status: 400 });
  }
  
  // 不能删除自己
  if (currentUser.id === userId) {
    return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
  }
  
  await deleteUser(userId);
  return NextResponse.json({ success: true });
}