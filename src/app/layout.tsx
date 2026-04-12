import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: '手札 — 个人生活记录',
  description: '记录生活的每一刻，让成长有迹可循。',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✦</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var themes = ['default', 'parchment', 'coral', 'sage', 'herb', 'moss', 'ochre', 'slate'];
              var saved = localStorage.getItem('shouzha-theme');
              if (!saved) {
                var random = themes[Math.floor(Math.random() * themes.length)];
                document.documentElement.setAttribute('data-theme', random);
              } else {
                document.documentElement.setAttribute('data-theme', saved);
              }
            })();
          `
        }} />
        <Navbar />
        <main className="min-h-screen pt-14">{children}</main>
        <footer className="bg-paper border-t border-border pt-14 pb-8">
          <div className="max-w-[960px] mx-auto px-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12 items-start">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-4 text-amber-600">
                <span>✦</span><span className="font-serif font-semibold text-lg text-text">手札</span>
              </div>
              <p className="text-sm text-gray-500 leading-7">
                这是一个属于日常的角落。没有宏大叙事，只是想把看到的、想到的、触到的，
                用文字和图片一点点存下来。若干年后翻看，希望会是一本值得慢慢翻的书。
              </p>
            </div>
            <div className="text-sm text-gray-400">
              <p className="font-serif text-xs tracking-[0.1em] uppercase text-gray-400 mb-3">探索</p>
              <div className="flex flex-col gap-2">
                <a href="/" className="hover:text-amber-600 transition-colors">首页</a>
                <a href="/#posts" className="hover:text-amber-600 transition-colors">文章</a>
                <a href="/mini-programs" className="hover:text-amber-600 transition-colors">造物</a>
                <a href="/#about" className="hover:text-amber-600 transition-colors">关于</a>
              </div>
            </div>
          </div>
          <div className="max-w-[960px] mx-auto px-6 mt-12">
            <div className="border-t border-border pt-6">
              <p className="text-xs text-gray-400 text-center tracking-wide">
                © 2026 手札 · 用心记录，慢慢生长
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
