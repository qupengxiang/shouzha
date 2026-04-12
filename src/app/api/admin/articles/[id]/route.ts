import { NextRequest, NextResponse } from 'next/server';
import { getArticleById, updateArticle, deleteArticle, getSession } from '@/lib/db';

async function getUserId(req: NextRequest): Promise<number | null> {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  return session?.userId || null;
}

// GET /api/admin/articles/[id] - get single article
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const { id } = await params;
  const article = getArticleById(id);
  
  if (!article) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  
  return NextResponse.json({ article });
}

// PUT /api/admin/articles/[id] - update article
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const { id } = await params;
  const body = await req.json();
  
  const existing = getArticleById(id);
  if (!existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  
  updateArticle(id, {
    title: body.title,
    category: body.category,
    categorySlug: body.categorySlug,
    date: body.date,
    readTime: body.readTime,
    tags: body.tags,
    excerpt: body.excerpt,
    content: body.content,
    published: body.published,
  });
  
  const updated = getArticleById(id);
  return NextResponse.json({ article: updated });
}

// DELETE /api/admin/articles/[id] - delete article
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const { id } = await params;
  
  const existing = getArticleById(id);
  if (!existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  
  deleteArticle(id);
  return NextResponse.json({ success: true });
}
