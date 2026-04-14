import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, deleteCategory } from '@/lib/db';
import { getAuthenticatedUser, requireAuth } from '@/lib/auth';

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
  
  const categories = await getAllCategories();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { name, slug, sortOrder } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: '名称和别名不能为空' }, { status: 400 });
    }

    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!sanitizedSlug) {
      return NextResponse.json({ error: '别名格式无效' }, { status: 400 });
    }

    await createCategory({ name: name.trim(), slug: sanitizedSlug, sortOrder: sortOrder || 0 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: '别名已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少分类ID' }, { status: 400 });

    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
