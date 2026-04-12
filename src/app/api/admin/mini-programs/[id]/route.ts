import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, getMiniProgramById, updateMiniProgram, deleteMiniProgram } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const program = await getMiniProgramById(id);
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(program);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await deleteMiniProgram(id);
  return NextResponse.json({ success: true });
}
