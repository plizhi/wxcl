import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const TOKEN_EXPIRES_IN = '30d';

export interface TokenPayload {
  userId: string;
  phone: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------- 双验过渡：优先新 token，降级旧 token ----------
import { verifyPortalToken } from './auth-portal';

export interface SessionResult {
  mode: 'portal' | 'legacy';
  portalUserId: string | null;
  uid: string | null;
}

export async function verifySession(token: string): Promise<SessionResult | null> {
  // 新 token：RS256 验签，portal_user_id 直接可用
  try {
    const payload = await verifyPortalToken(token);
    return { mode: 'portal', portalUserId: payload.portal_user_id, uid: null };
  } catch { /* fallthrough */ }

  // 过渡期：旧本地 JWT 仍有效
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as { uid: string };
    return { mode: 'legacy', uid: payload.uid, portalUserId: null };
  } catch {
    return null;
  }
}
