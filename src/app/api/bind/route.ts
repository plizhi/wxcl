import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

const NZYY_API_URL = process.env.NZYY_API_URL || 'https://nzyy.cc/api';

interface BindParams {
  phone: string;
  from: string;
  token: string;
}

/**
 * 验证 nzyy 跳转 token
 */
async function verifyNzyyToken(phone: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${NZYY_API_URL}/verify-bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

/**
 * POST /api/bind
 * 从 nzyy 跳转过来时，创建或更新用户（pending 状态）
 */
export const POST = async (req: NextRequest) => {
  try {
    const { phone, from, token } = await req.json() as BindParams;

    // 安全检查
    if (from !== 'nzyy' || !phone || !token) {
      return NextResponse.json({ code: 400, message: '参数错误' }, { status: 400 });
    }

    // 验证 token（调用 nzyy API）
    const valid = await verifyNzyyToken(phone, token);
    if (!valid) {
      return NextResponse.json({ code: 401, message: '验证失败，请勿重复操作' }, { status: 401 });
    }

    // 查找或创建用户
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // 新建用户
      user = await prisma.user.create({
        data: {
          phone,
          status: 'pending',
          source: 'nzyy',
          expireAt: new Date('2020-01-01'), // 已过期，冻结状态
        },
      });
    } else {
      // 已存在用户，更新状态（如果当前是 organic 或非 pending）
      if (user.status === 'active' && user.source === 'organic') {
        // 已经是正式用户，不覆盖
        // 生成 token 返回
        const jwt = generateToken(user.id, user.phone || '');
        return NextResponse.json({ code: 0, message: 'success', data: { token: jwt, isNew: false } });
      }
      // 更新为 pending
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'pending',
          source: 'nzyy',
          expireAt: new Date('2020-01-01'),
        },
      });
    }

    // 生成登录 token
    const jwt = generateToken(user.id, user.phone || '');

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        token: jwt,
        isNew: true,
        pending: user.status === 'pending',
      },
    });
  } catch (err) {
    console.error('[bind] error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
};
