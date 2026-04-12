import { NextResponse } from 'next/server';
import { getPublishedMiniPrograms } from '@/lib/db';

export async function GET() {
  const programs = getPublishedMiniPrograms();
  return NextResponse.json(programs);
}
