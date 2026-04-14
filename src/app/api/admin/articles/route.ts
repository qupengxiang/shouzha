import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAllArticles, getArticleById, createArticle, updateArticle, deleteArticle, getSession, getUserById } from '@/lib/db';

// Helper to check auth and get user info
async function getUserInfo(req: NextRequest): Promise<{ userId: number; role: string } | null> {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return { userId: user.id, role: user.role };
}

// GET /api/admin/articles - list articles (admin sees all, others see their own)
export async function GET(req: NextRequest) {
  const userInfo = await getUserInfo(req);
  if (!userInfo) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const articles = await getAllArticles(userInfo.userId, userInfo.role);
  return NextResponse.json({ articles });
}

// POST /api/admin/articles - create article (auth required)
export async function POST(req: NextRequest) {
  const userInfo = await getUserInfo(req);
  if (!userInfo) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  const body = await req.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: '请填写标题' }, { status: 400 });
  }

  const categorySlug = body.categorySlug?.trim() || 'life';
  const categoryMap: Record<string, string> = {
    life: '生活', learn: '学习', think: '思考', knowledge: '知识',
  };
  const category = body.category?.trim() || categoryMap[categorySlug] || '生活';

  // 用 UUID v4 作为唯一 ID，标题只用于显示
  const id = crypto.randomUUID();

  const existing = await getArticleById(id);
  if (existing) {
    return NextResponse.json({ error: '文章ID已存在，请修改标题' }, { status: 400 });
  }

  const article = {
    id,
    title: body.title,
    category,
    categorySlug,
    date: body.date || new Date().toISOString().split('T')[0],
    readTime: body.readTime || '5 分钟',
    tags: body.tags || [],
    excerpt: body.excerpt || '',
    content: body.content || '',
    published: body.published || false,
    authorId: userInfo.userId,  // 自动设置作者为当前用户
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createArticle(article);

  return NextResponse.json({ article });
}

// DELETE /api/admin/articles?ids=id1,id2 - delete articles (auth required)
export async function DELETE(req: NextRequest) {
  const userInfo = await getUserInfo(req);
  if (!userInfo) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids');
  if (!ids) return NextResponse.json({ error: '缺少 ids 参数' }, { status: 400 });

  const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
  if (idList.length === 0) return NextResponse.json({ error: '无效的 ids' }, { status: 400 });
  if (idList.length > 50) return NextResponse.json({ error: '一次最多删除 50 篇' }, { status: 400 });

  idList.forEach(id => deleteArticle(id));
  return NextResponse.json({ success: true, deleted: idList.length });
}
