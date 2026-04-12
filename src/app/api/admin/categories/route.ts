import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, deleteCategory, getSession } from '@/lib/db';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  const categories = getAllCategories();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, slug, sortOrder } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: '名称和别名不能为空' }, { status: 400 });
    }

    // Sanitize slug
    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!sanitizedSlug) {
      return NextResponse.json({ error: '别名格式无效' }, { status: 400 });
    }

    createCategory({ name: name.trim(), slug: sanitizedSlug, sortOrder: sortOrder || 0 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: '别名已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少分类ID' }, { status: 400 });

    deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
