import { NextRequest, NextResponse } from 'next/server';
import { getArticleById, updateArticle, deleteArticle } from '@/lib/db';
import { getAuthenticatedUser, requireAuth } from '@/lib/auth';

async function getAuthUser(req: NextRequest) {
  const userInfo = await getAuthenticatedUser(req);
  if (!requireAuth(userInfo)) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  return { user: userInfo };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;
  
  const { id } = await params;
  const article = await getArticleById(id);
  
  if (!article) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  
  return NextResponse.json({ article });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;
  
  const { id } = await params;
  const body = await req.json();
  
  const existing = await getArticleById(id);
  if (!existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  
  await updateArticle(id, {
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
  
  const updated = await getArticleById(id);
  return NextResponse.json({ article: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUser(req);
  if ('error' in authResult) return authResult.error;
  
  const { id } = await params;
  
  const existing = await getArticleById(id);
  if (!existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  
  await deleteArticle(id);
  return NextResponse.json({ success: true });
}
