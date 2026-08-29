import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!code) {
      return NextResponse.json({ code: 400, message: "请输入激活码" }, { status: 400 });
    }

    const session = await prisma.authSession.findFirst({
      where: {
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return NextResponse.json({ code: 400, message: "激活码无效或已过期" }, { status: 400 });
    }

    if (session.used) {
      return NextResponse.json({ code: 400, message: "激活码已被使用" }, { status: 400 });
    }

    if (session.phone && phone && session.phone !== phone) {
      return NextResponse.json({ code: 400, message: "激活码与手机号不匹配" }, { status: 400 });
    }

    await prisma.authSession.update({
      where: { id: session.id },
      data: { used: true },
    });

    const userPhone = session.phone || phone || "";

    let user = await prisma.user.findUnique({
      where: { phone: userPhone },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone: userPhone, nickname: "用户" },
        select: { id: true },
      });
    }

    const token = generateToken({ userId: user.id, phone: userPhone });

    return NextResponse.json({
      code: 0,
      message: "验证成功",
      data: { token, userId: user.id },
    });
  } catch (error) {
    console.error("verify error:", error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
