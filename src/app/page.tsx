import { getPublishedArticles } from '@/lib/db';
import ArticleGrid from '@/components/ArticleGrid';

export default function HomePage() {
  const articles = getPublishedArticles();
  return <ArticleGrid articles={articles} />;
}
