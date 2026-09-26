import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { prisma } from '@/lib/prisma';

const AUTH_BASE     = process.env.AUTH_BASE_URL!;
const CLIENT_ID     = process.env.CLIENT_ID! || 'wxcl';
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI  = process.env.WXCL_REDIRECT_URI!;
const JWT_ISSUER   = process.env.JWT_ISSUER!;

// JWKS 远程公钥集，jose 自动缓存 + 按 kid 轮换
const JWKS = createRemoteJWKSet(new URL(`${AUTH_BASE}/.well-known/jwks.json`));

export interface PortalPayload extends JWTPayload {
  sub: string;
  portal_user_id: string;
  client_id: string;
}

// ---------- 新 token 验证：本地 RS256 验签，不依赖网络 ----------
export async function verifyPortalToken(accessToken: string): Promise<PortalPayload> {
  const { payload } = await jwtVerify(accessToken, JWKS, { issuer: JWT_ISSUER });
  return payload as PortalPayload;
}

// ---------- code 换 token ----------
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret:  CLIENT_SECRET,
      redirect_uri:   REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json();
}

// ---------- 获取 userinfo ----------
export async function fetchUserInfo(accessToken: string): Promise<{
  portal_user_id: string;
  phone: string | null;
  nickname: string | null;
}> {
  const res = await fetch(`${AUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  return res.json();
}

// ---------- 绑定/创建本地用户 ----------
export async function bindOrCreateUser(portal: {
  unionId: string;
  phone: string | null;
  nickname: string | null;
}) {
  // 优先按 portalUserId 命中（已绑定过的老用户）
  if (portal.unionId) {
    const existing = await prisma.user.findUnique({
      where: { portalUserId: portal.unionId },
    });
    if (existing) return existing;
  }

  // 按 phone 匹配存量用户 → 自动绑定（39 人的主路径）
  if (portal.phone) {
    const byPhone = await prisma.user.findUnique({
      where: { phone: portal.phone },
    });
    if (byPhone) {
      return prisma.user.update({
        where: { id: byPhone.id },
        data: { portalUserId: portal.unionId },
      });
    }
  }

  // 全新用户 → 创建（无密码，凭证完全托管给 auth）
  return prisma.user.create({
    data: {
      phone:       portal.phone ?? null,
      password:    '',          // 本地不再使用密码
      nickname:    portal.nickname ?? '用户',
      portalUserId: portal.unionId,
    },
  });
}
