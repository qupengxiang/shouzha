import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getArticleById, getAllArticles, getPublishedArticles, getSession, getUserById } from '@/lib/db';

interface Props {
  params: Promise<{ id: string }>;
}

// 所有文章都要预生成路由（草稿也能预览）
export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map(a => ({ id: a.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return {};
  // 草稿文章不暴露 SEO 信息
  if (!article.published) return { title: `${article.title} — 手札 [草稿]`, robots: 'noindex' };
  return {
    title: `${article.title} — 手札`,
    description: article.excerpt,
  };
}

// 验证是否为管理员（复用 /api/admin/check 的逻辑）
async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return false;
  const session = await getSession(sessionId);
  if (!session) return false;
  const user = await getUserById(session.userId);
  return user?.role === 'admin';
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  // 未发布的文章，只有管理员能看
  const admin = await isAdmin();
  if (!article.published && !admin) notFound();

  // 上下篇导航只显示已发布的文章
  const publishedArticles = await getPublishedArticles();
  const currentIndex = publishedArticles.findIndex(a => a.id === id);
  const prev = publishedArticles[currentIndex - 1];
  const next = publishedArticles[currentIndex + 1];

  return (
    <div className="min-h-screen pt-14">
      {/* Hero */}
      <section className="py-12 pb-8 border-b border-border">
        <div className="max-w-[760px] mx-auto px-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link href="/" className="hover:text-amber-600 transition-colors">首页</Link>
            <span>/</span>
            <Link href="/#posts" className="hover:text-amber-600 transition-colors">{article.category}</Link>
            <span>/</span><span>正文</span>
          </div>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded tracking-wide mb-4">
              {article.category}
            </span>
            {!article.published && (
              <span className="inline-block px-2 py-1 bg-red-50 text-red-500 text-xs font-medium rounded mb-4">
                草稿
              </span>
            )}
          </span>
          <h1 className="font-serif font-bold leading-tight mb-6" style={{fontSize:'clamp(1.8rem, 5vw, 2.6rem)', letterSpacing:'-0.01em'}}>
            {article.title}
          </h1>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>📅 {article.date}</span>
            <span>⏱ {article.readTime}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="py-12 pb-24">
        <div className="max-w-[760px] mx-auto px-4">
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-12 pt-8 border-t border-border">
            <span className="text-xs text-gray-400">标签：</span>
            {(article.tags ?? []).map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-paper text-gray-500 text-xs rounded">{tag}</span>
            ))}
          </div>

          {/* Prev / Next */}
          {(prev || next) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {prev ? (
                <Link href={`/post/${prev.id}`} className="group p-6 bg-paper border border-border rounded-lg hover:border-amber-600 hover:shadow transition-all">
                  <span className="block text-xs text-gray-400 mb-1">← 上一篇</span>
                  <span className="block font-serif font-medium text-sm text-text group-hover:text-amber-600 transition-colors">{prev.title}</span>
                </Link>
              ) : <div />}
              {next ? (
                <Link href={`/post/${next.id}`} className="group p-6 bg-paper border border-border rounded-lg hover:border-amber-600 hover:shadow transition-all text-right">
                  <span className="block text-xs text-gray-400 mb-1">下一篇 →</span>
                  <span className="block font-serif font-medium text-sm text-text group-hover:text-amber-600 transition-colors">{next.title}</span>
                </Link>
              ) : <div />}
            </div>
          )}

          <div className="mt-8 text-sm text-gray-400">
            <Link href="/" className="hover:text-amber-600 transition-colors">← 返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
