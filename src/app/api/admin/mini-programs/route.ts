import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, getAllMiniPrograms, createMiniProgram } from '@/lib/db';
import crypto from 'crypto';

function generateId() {
  return crypto.randomUUID();
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const programs = await getAllMiniPrograms();
  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, excerpt, coverImage, openLink, published, sortOrder } = body;

  if (!title || !openLink) {
    return NextResponse.json({ error: '标题和链接不能为空' }, { status: 400 });
  }

  await createMiniProgram({
    id: generateId(),
    title,
    description: excerpt || '',
    coverImage: coverImage || '',
    openLink,
    published: !!published,
    sortOrder: sortOrder || 0,
  });

  return NextResponse.json({ success: true });
}
