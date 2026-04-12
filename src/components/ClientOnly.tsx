'use client';
import { useState, useEffect } from 'react';

/**
 * Renders children only on the client side.
 * Prevents SSR hydration mismatches for components that use
 * browser-only APIs (like TipTap's dangerouslySetInnerHTML).
 */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}
