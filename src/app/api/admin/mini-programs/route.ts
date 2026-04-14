import { NextRequest, NextResponse } from 'next/server';
import { getAllMiniPrograms, createMiniProgram } from '@/lib/db';
import { getAuthenticatedUser, requireAuth } from '@/lib/auth';
import crypto from 'crypto';

function generateId() {
  return crypto.randomUUID();
}

async function getAuthUser(req: NextRequest) {
  const userInfo = await getAuthenticatedUser(req);
  if (!requireAuth(userInfo)) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  return { user: userInfo };
}

export async function GET(req: NextRequest) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  const programs = await getAllMiniPrograms();
  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

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
