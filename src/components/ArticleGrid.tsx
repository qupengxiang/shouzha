'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import PostCard from './PostCard';
import Sidebar, { Category } from './Sidebar';

interface Article {
  id: string; title: string; category: string; categorySlug: string;
  date: string; readTime: string; tags: string[]; excerpt: string; content?: string;
}

interface Props { articles: Article[]; }

const categories: Category[] = [
  { slug: 'life', name: '生活', icon: '🏠', desc: '旅行、美食、日常碎片', color: '#E8D5C4' },
  { slug: 'learn', name: '学习与工作', icon: '📚', desc: '项目笔记、书影音、复盘', color: '#D4E8D4' },
  { slug: 'think', name: '思考与成长', icon: '💡', desc: '随笔、价值观、年终总结', color: '#E8E4D4' },
  { slug: 'knowledge', name: '知识积累', icon: '📦', desc: '技能卡片、工具箱、收藏合集', color: '#D4D8E8' },
];

export default function ArticleGrid({ articles }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  const years = useMemo(() => {
    return [...new Set(articles.map(a => (a.date ?? '').slice(0, 4)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchCat = selectedCategory === 'all' || a.categorySlug === selectedCategory;
      const matchYear = selectedYear === 'all' || a.date.startsWith(selectedYear);
      return matchCat && matchYear;
    });
  }, [articles, selectedCategory, selectedYear]);

  const stats = [
    { number: articles.length, label: '篇文章' },
    { number: categories.length, label: '个板块' },
    { number: new Set(articles.flatMap(a => a.tags ?? [])).size, label: '个标签' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center px-4 relative" id="home">
        <div className="max-w-[680px]">
          <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-800 font-serif text-xs tracking-wider rounded-full mb-6">
            欢迎来到我的数字角落
          </span>
          <h1 className="font-serif font-bold leading-tight mb-6" style={{fontSize:'clamp(2.5rem, 8vw, 4rem)'}}>
            <span className="block">用文字记录</span>
            <span className="block text-amber-600">生活的轨迹</span>
          </h1>
          <p className="text-gray-500 leading-relaxed text-lg mb-8">
            一个记录生活、学习、思考与成长的数字空间。<br />不追求完美，只追求真实。
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <a href="#posts" className="inline-flex items-center px-7 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors">
              浏览文章
            </a>
            <a href="#about" className="inline-flex items-center px-7 py-3 border border-border text-text text-sm rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors">
              了解更多
            </a>
          </div>
          <div className="flex gap-8 justify-center">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-text">{s.number}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-gray-400">
          <span className="text-lg">↓</span>
          <span>向下滚动</span>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16 pb-24" id="posts">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold mb-8 pl-4 border-l-4 border-amber-600">
            {selectedCategory === 'all' ? '最近更新' : categories.find(c => c.slug === selectedCategory)?.name}
          </h2>
          <div className="flex gap-10 items-start lg:flex-row-reverse">
            <Sidebar
              categories={categories} years={years}
              totalCount={articles.length} filteredCount={filteredArticles.length}
              selectedCategory={selectedCategory} selectedYear={selectedYear}
              onCategoryChange={setSelectedCategory} onYearChange={setSelectedYear}
            />
            <div className="flex-1 min-w-0 grid gap-6 sm:grid-cols-2 xl:gap-8">
              {filteredArticles.length === 0 ? (
                <div className="col-span-full text-center py-16 text-gray-400">
                  <span className="text-5xl block mb-4">📭</span>
                  <p className="text-base mb-4">暂无符合条件的文章</p>
                  <button
                    className="px-5 py-2 border border-border text-gray-500 text-sm rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors"
                    onClick={() => { setSelectedCategory('all'); setSelectedYear('all'); }}
                  >
                    清除筛选
                  </button>
                </div>
              ) : (
                filteredArticles.map((article, i) => (
                  <PostCard key={article.id} article={article} index={i} />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-24 bg-paper border-y border-border" id="about">
        <div className="max-w-[720px] mx-auto px-4 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-600 flex items-center justify-center text-5xl shrink-0 shadow-md">
              😊
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-4">关于我</h2>
              <p className="text-sm text-gray-500 leading-8 mb-3">
                你好！这里是曲建国（建国）的数字角落。我在这里记录生活中的点滴、学习中的收获、
                成长中的思考，以及积累的各种知识碎片。
              </p>
              <p className="text-sm text-gray-500 leading-8">
                不追求每篇都完美，只追求真诚记录。希望这个网站能成为一个
                属于自己的数字资产，若干年后回头看，能看到一路走来的轨迹。
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
