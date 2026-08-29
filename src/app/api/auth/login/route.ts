import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { phone, password, activationCode, parentRole } = await request.json();

    if (!phone) {
      return NextResponse.json({ code: 400, message: "请输入手机号" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, password: true, nickname: true },
    });

    if (!password) {
      if (!activationCode) {
        return NextResponse.json({ code: 400, message: "请输入激活码或密码" }, { status: 400 });
      }

      const codeSession = await prisma.authSession.findFirst({
        where: {
          code: activationCode,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!codeSession) {
        return NextResponse.json({ code: 400, message: "激活码无效或已过期" }, { status: 400 });
      }

      if (!codeSession.phone) {
        if (user) {
          return NextResponse.json({ code: 400, message: "该激活码已被使用，请使用密码登录" }, { status: 400 });
        }

        await prisma.authSession.update({
          where: { id: codeSession.id },
          data: { used: true, phone },
        });

        const hashedCode = hashPassword(activationCode);
        const newUser = await prisma.user.create({
          data: { phone, nickname: "用户", parentRole: parentRole || null, password: hashedCode },
          select: { id: true },
        });

        const token = generateToken({ userId: newUser.id, phone });
        return NextResponse.json({
          code: 0,
          message: "注册成功",
          data: { token, userId: newUser.id },
        });
      } else {
        if (!user) {
          return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });
        }

        if (codeSession.phone !== phone) {
          return NextResponse.json({ code: 400, message: "激活码无效" }, { status: 400 });
        }

        const hashedCode = hashPassword(activationCode);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedCode },
        });

        const token = generateToken({ userId: user.id, phone });
        return NextResponse.json({
          code: 0,
          message: "密码已重置",
          data: { token, userId: user.id },
        });
      }
    }

    if (!user) {
      return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });
    }

    if (!user.password || !verifyPassword(password, user.password)) {
      return NextResponse.json({ code: 400, message: "手机号或密码错误" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({ userId: user.id, phone });

    return NextResponse.json({
      code: 0,
      message: "登录成功",
      data: { token, userId: user.id },
    });
  } catch (error) {
    console.error("login error:", error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
