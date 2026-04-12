'use client';
import { Suspense } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only on the client side using Suspense.
 * Handles both browser-only APIs and useSearchParams correctly.
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
