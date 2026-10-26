import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { prisma } from '@/lib/prisma';
import { addMonths, INITIAL_MONTHS } from '@/lib/user-expiry';
import { errors } from '@/lib/api-error';

const AUTH_BASE     = process.env.AUTH_BASE_URL;
const CLIENT_ID     = process.env.CLIENT_ID! || 'wxcl';
const CLIENT_SECRET = process.env.CLIENT_WXCL_SECRET!;
const REDIRECT_URI  = process.env.WXCL_REDIRECT_URI!;
const JWT_ISSUER   = process.env.JWT_ISSUER!;

export { AUTH_BASE, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, JWT_ISSUER };

// 认证服务不可达时不能把用户请求挂住，否则 auth 抖动 = 注册/登录转圈
const AUTH_FETCH_TIMEOUT_MS = 10_000;

// 惰性创建：模块加载时若 AUTH_BASE_URL 缺失就 new URL 会直接抛错，
// 导致任何 import 本模块的地方（测试、CI）都崩
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function requireAuthBase(): string {
  if (!AUTH_BASE) throw new Error('AUTH_BASE_URL 未配置');
  return AUTH_BASE;
}
function getJwks() {
  if (!jwks) {
    // JWKS 远程公钥集，jose 自动缓存 + 按 kid 轮换
    jwks = createRemoteJWKSet(new URL(`${requireAuthBase()}/.well-known/jwks.json`));
  }
  return jwks;
}

export interface PortalPayload extends JWTPayload {
  sub: string;
  portal_user_id: string;
  client_id: string;
}

// ---------- 新 token 验证：本地 RS256 验签，不依赖网络 ----------
export async function verifyPortalToken(accessToken: string): Promise<PortalPayload> {
  // audience 必须锁定本 client：认证服务对所有 client 用同一个 issuer，
  // 不锁 audience 的话，别的应用（荔学卷）的 token 也能在这里通过验签。
  const { payload } = await jwtVerify(accessToken, getJwks(), {
    issuer: JWT_ISSUER,
    audience: CLIENT_ID,
  });
  return payload as PortalPayload;
}

// ---------- code 换 token ----------
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${requireAuthBase()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret:  CLIENT_SECRET,
      redirect_uri:   REDIRECT_URI,
    }),
    signal: AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS),
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
  const res = await fetch(`${requireAuthBase()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  return res.json();
}

// ---------- 申请「设置统一密码」的凭据 ----------
// 配置与 SSO 入口分开：SSO 入口是否渲染由 AUTH_BASE_URL / WXCL_REDIRECT_URI 决定，
// 生产刻意不配这两项来关闭入口。统一密码要连认证服务，但不该顺带打开 SSO 入口，
// 所以生产只配 CREDENTIAL_* 这一组。
const CREDENTIAL_AUTH_BASE = process.env.CREDENTIAL_AUTH_BASE || AUTH_BASE;
const CREDENTIAL_CLIENT_ID = process.env.CREDENTIAL_CLIENT_ID || CLIENT_ID;
const CREDENTIAL_CLIENT_SECRET = process.env.CREDENTIAL_CLIENT_SECRET || CLIENT_SECRET;

// 证明依据固定是 activation_code：只有绑定手机号的专属激活码能证明手机号归属，
// 通用码注册时手机号是用户自填的，不能拿来申请。
export async function requestActivationCredential(phone: string): Promise<{
  activation_url: string;
  expires_at: string;
}> {
  if (!CREDENTIAL_AUTH_BASE || !CREDENTIAL_CLIENT_ID || !CREDENTIAL_CLIENT_SECRET) {
    throw new Error('统一密码未配置：缺少 CREDENTIAL_AUTH_BASE / CREDENTIAL_CLIENT_ID / CREDENTIAL_CLIENT_SECRET');
  }
  const basic = Buffer.from(`${CREDENTIAL_CLIENT_ID}:${CREDENTIAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${CREDENTIAL_AUTH_BASE}/internal/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({ phone, proof: 'activation_code' }),
    signal: AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`credential request failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  return res.json();
}

// ---------- 手机号归一化 ----------
// auth-dev 统一存 +86，本地库存 11 位。匹配前必须归一化，
// 否则同一个自然人会被当成两个账户（存量用户永远匹配不上）。
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('86')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits || null;
}

// SSO 直接注册的用户起步时长。普通用户靠邀请码换 6 个月，
// SSO 用户没有拉新曝光，起点时长相应降低，之后靠分享/邀请/反馈增长。
export const SSO_INITIAL_MONTHS = 3;

// ---------- 绑定/创建本地用户 ----------
// 原则：账号打通只证明「是谁」，身份与时长一律以本地规则为准。
export async function bindOrCreateUser(portal: {
  portal_user_id: string;
  phone: string | null;
  nickname: string | null;
}) {
  const phone = normalizePhone(portal.phone);

  // 优先按 portalUserId 命中（已绑定过的老用户）
  if (portal.portal_user_id) {
    const existing = await prisma.user.findUnique({
      where: { portalUserId: portal.portal_user_id },
    });
    if (existing) return existing;
  }

  // 按归一化手机号匹配存量用户 → 只补绑定，不动其身份与时长
  if (phone) {
    const byPhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (byPhone) {
      // 已绑到别的体系账号时不能静默改绑，否则两个账号会互相顶掉
      if (byPhone.portalUserId && byPhone.portalUserId !== portal.portal_user_id) {
        throw errors.conflict('该手机号已绑定其他体系账号');
      }
      return prisma.user.update({
        where: { id: byPhone.id },
        data: { portalUserId: portal.portal_user_id },
      });
    }
  }

  // 全新用户
  // 若此前在 wxcl 预注册过（有 Apply），保留其分享码与归属，
  // 且属于被推荐来源，起步时长与普通注册用户一致
  const apply = phone
    ? await prisma.apply.findUnique({ where: { phone } })
    : null;
  const months = apply?.referrerId ? INITIAL_MONTHS : SSO_INITIAL_MONTHS;

  const user = await prisma.user.create({
    data: {
      phone,
      password:    null,        // 密码未设置前不可密码登录（登录接口会挡住空密码）
      nickname:    portal.nickname || '用户',
      portalUserId: portal.portal_user_id,
      source:      'sso',
      expireAt:    addMonths(new Date(), months),
    },
  });

  // 关联既有 Apply：激活并绑定账户，归属不丢
  if (apply && !apply.userId) {
    await prisma.apply.update({
      where: { id: apply.id },
      data: { status: 'activated', userId: user.id, activatedAt: new Date() },
    });
  }

  return user;
}
