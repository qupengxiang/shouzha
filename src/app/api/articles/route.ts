import { NextRequest, NextResponse } from 'next/server';
import { getPublishedArticles, getArticlesByCategory, getArticlesByYear, getArticleById } from '@/lib/db';

// GET /api/articles - list published articles
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const year = searchParams.get('year');
  const id = searchParams.get('id');
  
  // Get single article by ID
  if (id) {
    const article = await getArticleById(id);
    if (!article || !article.published) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return NextResponse.json({ article });
  }
  
  // Filter by category
  if (category) {
    const all = await getArticlesByCategory(category);
    const articles = all.filter(a => a.published);
    return NextResponse.json({ articles });
  }
  
  // Filter by year
  if (year) {
    const all = await getArticlesByYear(parseInt(year));
    const articles = all.filter(a => a.published);
    return NextResponse.json({ articles });
  }
  
  // Get all published articles
  const articles = await getPublishedArticles();
  return NextResponse.json({ articles });
}
