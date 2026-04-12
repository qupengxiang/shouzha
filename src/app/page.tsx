import { getPublishedArticles, getAllCategories } from '@/lib/db';
import ArticleGrid from '@/components/ArticleGrid';

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const categories = await getAllCategories();
  return <ArticleGrid articles={articles} categories={categories} />;
}
