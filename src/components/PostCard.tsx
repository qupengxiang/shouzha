import Link from 'next/link';
import type { Article } from '@/data/articles';

const categoryIcons: Record<string, string> = {
  life: '🏠', learn: '📚', think: '💡', knowledge: '📦',
};
const categoryColors: Record<string, string> = {
  life: '#E8D5C4', learn: '#D4E8D4', think: '#E8E4D4', knowledge: '#D4D8E8',
};

interface Props { article: Article; index?: number; }

export default function PostCard({ article, index = 0 }: Props) {
  const bg = categoryColors[article.categorySlug] || '#E8D5C4';
  return (
    <article
      className="bg-paper border border-border rounded-lg overflow-hidden flex flex-col hover:border-amber-600 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative h-[180px] flex items-center justify-center overflow-hidden" style={{ background: bg }}>
        <span className="text-5xl drop-shadow-md">{categoryIcons[article.categorySlug] || '📝'}</span>
        <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 text-amber-800 text-xs font-medium rounded backdrop-blur-sm tracking-wide">
          {article.category}
        </span>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-gray-400 font-mono">{article.date}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400 font-mono">{article.readTime}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold leading-relaxed mb-2">
          <Link href={`/post/${article.id}`} className="text-text hover:text-amber-600 transition-colors">
            {article.title}
          </Link>
        </h3>
        <p className="text-sm text-gray-500 leading-7 flex-1 mb-4 line-clamp-2">{article.excerpt}</p>
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link href={`/post/${article.id}`} className="text-sm text-amber-600 font-medium hover:text-amber-700 transition-colors">
            阅读全文 →
          </Link>
          <div className="flex gap-1.5">
            {(article.tags ?? []).slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-paper text-gray-500 text-xs rounded">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
