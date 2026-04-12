'use client';
import { useState } from 'react';

export interface Category {
  slug: string;
  name: string;
  icon: string;
  desc: string;
  color: string;
}

interface SidebarProps {
  categories: Category[];
  years: string[];
  totalCount: number;
  filteredCount: number;
  selectedCategory: string;
  selectedYear: string;
  onCategoryChange: (slug: string) => void;
  onYearChange: (year: string) => void;
}

export default function Sidebar({
  categories,
  years,
  totalCount,
  filteredCount,
  selectedCategory,
  selectedYear,
  onCategoryChange,
  onYearChange,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <div className="mb-6 lg:hidden">
        <button
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-paper border border-border rounded-lg text-sm text-gray-500 hover:border-amber-600 hover:text-text transition-all cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span>🔍</span>
          <span>
            {selectedCategory === 'all'
              ? '全部'
              : categories.find(c => c.slug === selectedCategory)?.name ?? '全部'} ·{' '}
            {selectedYear === 'all' ? '全部年份' : selectedYear}
          </span>
          <span className="ml-auto text-xs">{mobileOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`w-full ${mobileOpen ? '' : 'hidden'} lg:block`}>
        {/* Category Filter */}
        <div className="py-6 flex flex-col gap-8">
          <div>
            <h3 className="font-serif text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase px-3 mb-2">类别</h3>
            <ul className="flex flex-col gap-0.5">
              <li>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all cursor-pointer text-left ${
                    selectedCategory === 'all'
                      ? 'bg-paper text-amber-600 font-medium shadow-sm'
                      : 'text-gray-500 hover:bg-paper hover:text-text'
                  }`}
                  onClick={() => { onCategoryChange('all'); setMobileOpen(false); }}
                  style={selectedCategory === 'all' ? { borderLeft: '2px solid #d97706' } : undefined}
                >
                  <span className="w-5 text-center shrink-0">📋</span>
                  <span className="flex-1">全部文章</span>
                  <span className="text-xs text-gray-400 bg-paper-dark px-1.5 py-0.5 rounded">{totalCount}</span>
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat.slug}>
                  <button
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all cursor-pointer text-left ${
                      selectedCategory === cat.slug
                        ? 'bg-paper text-amber-600 font-medium shadow-sm'
                        : 'text-gray-500 hover:bg-paper hover:text-text'
                    }`}
                    onClick={() => { onCategoryChange(cat.slug); setMobileOpen(false); }}
                    style={selectedCategory === cat.slug ? { borderLeft: '2px solid #d97706' } : undefined}
                  >
                    <span className="w-5 text-center shrink-0">{cat.icon}</span>
                    <span className="flex-1">{cat.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Year Filter */}
          <div>
            <h3 className="font-serif text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase px-3 mb-2">时间</h3>
            <ul className="flex flex-col gap-0.5">
              <li>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all cursor-pointer text-left ${
                    selectedYear === 'all'
                      ? 'bg-paper text-amber-600 font-medium shadow-sm'
                      : 'text-gray-500 hover:bg-paper hover:text-text'
                  }`}
                  onClick={() => { onYearChange('all'); setMobileOpen(false); }}
                  style={selectedYear === 'all' ? { borderLeft: '2px solid #d97706' } : undefined}
                >
                  <span className="w-5 text-center shrink-0">📅</span>
                  <span className="flex-1">全部时间</span>
                </button>
              </li>
              {years.map(year => (
                <li key={year}>
                  <button
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all cursor-pointer text-left ${
                      selectedYear === year
                        ? 'bg-paper text-amber-600 font-medium shadow-sm'
                        : 'text-gray-500 hover:bg-paper hover:text-text'
                    }`}
                    onClick={() => { onYearChange(year); setMobileOpen(false); }}
                    style={selectedYear === year ? { borderLeft: '2px solid #d97706' } : undefined}
                  >
                    <span className="w-5 text-center shrink-0">🗓</span>
                    <span className="flex-1">{year} 年</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Result count */}
          <p className="font-serif text-xs text-gray-400 text-center px-3 pt-4 border-t border-border tracking-wide">
            {filteredCount === totalCount
              ? `共 ${totalCount} 篇`
              : `${filteredCount} / ${totalCount} 篇`}
          </p>
        </div>
      </div>
    </>
  );
}
