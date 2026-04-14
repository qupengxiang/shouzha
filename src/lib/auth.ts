import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserById } from '@/lib/db';

export interface AuthenticatedUser {
  userId: number;
  role: string;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return { userId: user.id, role: user.role };
}

export function requireAuth(user: AuthenticatedUser | null): user is AuthenticatedUser {
  return user !== null;
}
