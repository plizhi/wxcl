import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

const NZYY_API_URL = process.env.NZYY_API_URL || 'https://nzyy.cc/api';

/**
 * 调用 nzyy 验证 token
 * nzyy 提供 /api/portal/verify-bind 接口
 * 返回 verifiedPhone 如果验证成功
 */
async function verifyNzyyToken(token: string): Promise<{ valid: boolean; phone?: string; error?: string }> {
  try {
    const res = await fetch(`${NZYY_API_URL}/portal/verify-bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, target_app: 'wxcl' }),
    });
    const data = await res.json();
    if (data.valid === true) {
      return { valid: true, phone: data.phone };
    }
    return { valid: false, error: data.error || '验证失败' };
  } catch (err) {
    console.error('[bind] verifyNzyyToken error:', err);
    return { valid: false, error: '网络错误' };
  }
}

/**
 * POST /api/bind
 * 从 nzyy 跳转过来时，创建或更新用户（pending 状态）
 */
export const POST = async (req: NextRequest) => {
  try {
    const { phone: inputPhone, from, token } = await req.json();

    // 安全检查
    if (from !== 'nzyy' || !token) {
      return NextResponse.json({ code: 400, message: '参数错误' }, { status: 400 });
    }

    // 验证 token（调用 nzyy API）
    const verifyResult = await verifyNzyyToken(token);
    if (!verifyResult.valid || !verifyResult.phone) {
      return NextResponse.json(
        { code: 401, message: verifyResult.error || '验证失败' },
        { status: 401 }
      );
    }

    // 使用 nzyy 返回的手机号（更可信）
    const phone = verifyResult.phone;

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
      // 已存在用户，更新状态
      if (user.status === 'active' && user.source === 'organic') {
        // 已经是正式用户，不覆盖，直接返回 token
        const jwt = generateToken(user.id, user.phone || '');
        return NextResponse.json({
          code: 0,
          message: 'success',
          data: { token: jwt, isNew: false },
        });
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
