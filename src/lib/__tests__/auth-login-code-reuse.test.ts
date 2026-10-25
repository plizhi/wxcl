import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as login } from '@/app/api/auth/login/route';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    authSession: { findFirst: vi.fn(), update: vi.fn() },
    apply: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/user-expiry', () => ({
  initializeNewUser: vi.fn(),
  unfreezeByInvite: vi.fn(),
  recordActivity: vi.fn(),
}));

const mocked = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  authSession: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  apply: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

describe('POST /api/auth/login 通用码分支', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.apply.findFirst.mockResolvedValue(null);
    mocked.user.findUnique.mockResolvedValue(null);
    mocked.authSession.update.mockResolvedValue({});
    mocked.user.create.mockResolvedValue({ id: 'user-1' });
    mocked.apply.create.mockResolvedValue({});
  });

  it('已被消费过的通用码不能再用任意手机号创建账户', async () => {
    // 码的消费只置 used=true、不写 phone，所以 phone 仍为空
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '',
      used: true,
    });

    const res = await login(makeRequest({ phone: '13800001234', activationCode: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('已被使用');
    expect(mocked.user.create).not.toHaveBeenCalled();
    expect(mocked.authSession.update).not.toHaveBeenCalled();
  });

  it('未使用的通用码可以创建账户，但会把码绑定到该手机号', async () => {
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '',
      used: false,
    });

    const res = await login(makeRequest({ phone: '13800001234', activationCode: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(mocked.authSession.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { used: true, phone: '13800001234' },
    });
    expect(mocked.user.create).toHaveBeenCalled();
  });

  it('通用码配上已存在的手机号会被拒绝，要求改用密码', async () => {
    mocked.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hash', nickname: 'n' });
    mocked.authSession.findFirst.mockResolvedValue({
      id: 7,
      phone: '',
      used: false,
    });

    const res = await login(makeRequest({ phone: '13800001234', activationCode: 'ABCD2345' }), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain('密码登录');
    expect(mocked.user.create).not.toHaveBeenCalled();
  });
});
