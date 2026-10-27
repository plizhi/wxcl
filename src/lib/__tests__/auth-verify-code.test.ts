import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as verifyCode } from '@/app/api/auth/verify-code/route';

// mock 顺序很重要：verify-code 路由 import 了 account-registration，
// 它也会 import prisma，所以必须先 mock 掉。
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    authSession: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/account-registration', () => ({
  triggerRegistration: vi.fn(),
}));

// 限速器是模块级内存 Map，跨用例会累积（每个用例限 5 次，10 个用例必然触发 429）。
// 这里 mock 成永远放行，让每个用例只测自己想测的那条分支；
// 限速本身由 rate-limit.ts 的逻辑保证，不在这里重复验证。
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 99, resetIn: 60000 })),
  rateLimitResponse: vi.fn(() => new Response('{}', { status: 429 })),
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    // token 解析固定放行，省得每个用例都造 JWT
    getTokenFromHeader: vi.fn(() => 'fake-token'),
    verifyToken: vi.fn(() => ({ userId: 'u1', phone: '13800138000' })),
  };
});

const mocked = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  authSession: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    json: async () => body,
    headers: new Headers(headers),
  } as any;
}

describe('POST /api/auth/verify-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.user.findUnique.mockResolvedValue({
      id: 'u1',
      phone: '13800138000',
      phoneVerifiedAt: null,
      portalUserId: null,
    });
    mocked.user.update.mockResolvedValue({});
    mocked.user.updateMany.mockResolvedValue({ count: 1 });
    mocked.authSession.update.mockResolvedValue({});
  });

  it('验证成功时只写 phone_verified_at，不动 password', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '13800138000',
      used: false,
    });

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.code).toBe(0);

    // 这是本接口的核心承诺：开通跨应用账号不该让人丢掉现有密码
    const updateArg = mocked.user.update.mock.calls[0][0];
    expect(updateArg.data).toHaveProperty('phoneVerifiedAt');
    expect(updateArg.data).not.toHaveProperty('password');
  });

  it('验证成功后把码置为已使用', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '13800138000',
      used: false,
    });

    await verifyCode(makeRequest({ code: 'ABCD2345' }), {});

    expect(mocked.authSession.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { used: true },
    });
  });

  it('查码只按 code 查，不按 phone 查（与 login 专属码分支一致）', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '13800138000',
      used: false,
    });

    await verifyCode(makeRequest({ code: 'abcd2345' }), {});

    const where = mocked.authSession.findFirst.mock.calls[0][0].where;
    expect(where.code).toBe('ABCD2345');
    expect(where).not.toHaveProperty('phone');
  });

  it('通用码（未绑定手机号）被拒绝', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '',
      used: false,
    });

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('手机号归属');
    expect(mocked.user.update).not.toHaveBeenCalled();
    expect(mocked.authSession.update).not.toHaveBeenCalled();
  });

  it('码与当前账号手机号不匹配时被拒绝', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '13900000000',
      used: false,
    });

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('不匹配');
    expect(mocked.user.update).not.toHaveBeenCalled();
  });

  it('已被使用的码被拒绝', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '13800138000',
      used: true,
    });

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('已被使用');
    expect(mocked.user.update).not.toHaveBeenCalled();
  });

  it('码不存在或已过期时被拒绝', async () => {
    mocked.authSession.findFirst.mockResolvedValue(null);

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('无效或已过期');
    expect(mocked.user.update).not.toHaveBeenCalled();
  });

  it('码长度不对时被拒绝，不查库', async () => {
    const res = await verifyCode(makeRequest({ code: 'ABC' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(mocked.authSession.findFirst).not.toHaveBeenCalled();
  });

  it('未登录时被拒绝', async () => {
    const { verifyToken } = await import('@/lib/auth');
    (verifyToken as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    expect(res.status).toBe(401);
    expect(mocked.user.findUnique).not.toHaveBeenCalled();
  });

  it('账号没有手机号时被拒绝', async () => {
    mocked.user.findUnique.mockResolvedValue({
      id: 'u1',
      phone: null,
      phoneVerifiedAt: null,
      portalUserId: null,
    });

    const res = await verifyCode(makeRequest({ code: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('手机号');
    expect(mocked.authSession.findFirst).not.toHaveBeenCalled();
  });
});
