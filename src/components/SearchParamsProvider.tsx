'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export function SearchParamsProvider({ children }: { children: (params: URLSearchParams) => React.ReactNode }) {
  const params = useSearchParams();
  return <>{children(params)}</>;
}

export function SuspenseWrap({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <Suspense fallback={fallback ?? null}>{children}</Suspense>;
}
