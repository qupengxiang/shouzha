'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

const navLinks = [
  { href: '/#posts', label: '文章' },
  { href: '/mini-programs', label: '造物' },
  { href: '/#about', label: '关于' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[1000] h-14 transition-all duration-300 ${
      scrolled ? 'bg-paper border-b border-border shadow-sm' : 'bg-transparent border-transparent'
    }`}>
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif font-semibold text-lg text-text tracking-wide hover:text-amber-600 transition-colors">
          <span className="text-amber-600">✦</span>
          <span>手札</span>
        </Link>

        <ul className="hidden md:flex list-none gap-8 items-center">
          {navLinks.map(link => (
            <li key={link.href}>
              <Link href={link.href} className="text-sm text-gray-500 tracking-wider relative py-1 after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-px after:bg-amber-600 hover:after:w-full after:transition-all duration-300 hover:text-amber-600 transition-colors">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <button
            className={`md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px]`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <span className={`block w-5 h-0.5 bg-text rounded transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-text rounded transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-text rounded transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col items-center gap-6 py-8 px-4 bg-paper border-t border-border">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="font-serif text-2xl text-text hover:text-amber-600 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
