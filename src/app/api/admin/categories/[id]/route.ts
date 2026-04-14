import { NextRequest, NextResponse } from 'next/server';
import { updateCategory } from '@/lib/db';
import { getAuthenticatedUser, requireAuth } from '@/lib/auth';

async function getAuthUser(req: NextRequest) {
  const userInfo = await getAuthenticatedUser(req);
  if (!requireAuth(userInfo)) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  return { user: userInfo };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, slug, sortOrder } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: '名称不能为空' }, { status: 400 });
    }

    let sanitizedSlug = slug;
    if (slug) {
      sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!sanitizedSlug) {
        return NextResponse.json({ error: '别名格式无效' }, { status: 400 });
      }
    }

    await updateCategory(id, {
      name: name.trim(),
      slug: sanitizedSlug,
      sortOrder: sortOrder ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: '别名已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
