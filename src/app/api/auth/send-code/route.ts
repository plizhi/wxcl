import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ code: 400, message: "请输入正确的手机号" }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.authSession.deleteMany({ where: { phone } });
    await prisma.authSession.create({
      data: { phone, code, expiresAt },
    });

    return NextResponse.json({
      code: 0,
      message: "验证码已发送",
      data: { phone },
    });
  } catch (error) {
    console.error("send-code error:", error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
