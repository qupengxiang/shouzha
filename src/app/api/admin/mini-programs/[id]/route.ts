import { NextRequest, NextResponse } from 'next/server';
import { getMiniProgramById, updateMiniProgram, deleteMiniProgram } from '@/lib/db';
import { getAuthenticatedUser, requireAuth } from '@/lib/auth';

async function getAuthUser(req: NextRequest) {
  const userInfo = await getAuthenticatedUser(req);
  if (!requireAuth(userInfo)) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  return { user: userInfo };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  const { id } = await params;
  const program = await getMiniProgramById(id);
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(program);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  const { id } = await params;
  const body = await req.json();
  const { title, excerpt, coverImage, openLink, published, sortOrder } = body;

  if (!title || !openLink) {
    return NextResponse.json({ error: '标题和链接不能为空' }, { status: 400 });
  }

  await updateMiniProgram(id, { title, description: excerpt, coverImage, openLink, published, sortOrder });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  const { id } = await params;
  await deleteMiniProgram(id);
  return NextResponse.json({ success: true });
}
