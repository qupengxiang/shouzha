'use client';
import { useState, useEffect, useRef } from 'react';

const themes = [
  { id: 'default', name: '米纸', color: '#FAF8F5', desc: '温暖米白' },
  { id: 'parchment', name: '羊皮', color: '#F5F0E6', desc: '复古质感' },
  { id: 'coral', name: '珊瑚', color: '#FDF6F4', desc: '温柔粉调' },
  { id: 'sage', name: '鼠尾草', color: '#F4F6F3', desc: '清新绿意' },
  { id: 'ochre', name: '赭石', color: '#F8F4F0', desc: '大地暖棕' },
  { id: 'herb', name: '芳草', color: '#F5F9F4', desc: '春日嫩绿' },
  { id: 'moss', name: '苔藓', color: '#F2F5F0', desc: '静谧深绿' },
  { id: 'slate', name: '暖灰', color: '#F5F4F2', desc: '简约中性' },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('shouzha-theme');
    if (saved) {
      setCurrentTheme(saved);
    } else {
      const current = document.documentElement.getAttribute('data-theme') || 'default';
      setCurrentTheme(current);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('shouzha-theme', themeId);
    setIsOpen(false);
  };

  const current = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-amber-600 transition-colors text-sm text-gray-500 hover:text-text"
        onClick={() => setIsOpen(!isOpen)}
        title="切换主题"
      >
        <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ background: current.color }} />
        <span className="hidden sm:inline">{current.name}</span>
        <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-paper border border-border rounded-xl shadow-lg z-50 py-2 overflow-hidden">
            {themes.map(theme => (
              <button
                key={theme.id}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                  currentTheme === theme.id
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-600 hover:bg-paper-dark hover:text-text'
                }`}
                onClick={() => handleThemeChange(theme.id)}
              >
                <span
                  className="w-5 h-5 rounded-full border border-gray-200 shrink-0"
                  style={{ background: theme.color }}
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{theme.name}</span>
                  <span className="block text-xs text-gray-400">{theme.desc}</span>
                </span>
                {currentTheme === theme.id && <span className="text-amber-600 text-sm">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
