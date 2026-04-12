import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserById } from '@/lib/db';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value;
  
  if (!sessionId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    const response = NextResponse.json({ error: '会话已过期' }, { status: 401 });
    response.cookies.delete('session_id');
    return response;
  }
  
  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 });
  }
  
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
    }
  });
}
