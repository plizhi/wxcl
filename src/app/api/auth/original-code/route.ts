import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const codeSession = await prisma.authSession.findFirst({
      where: {
        phone: auth.phone,
        used: true,
      },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    if (!codeSession) {
      return NextResponse.json({ code: 404, message: "未找到激活码" }, { status: 404 });
    }

    return NextResponse.json({
      code: 0,
      data: { code: codeSession.code },
    });
  } catch (error) {
    console.error("get original code error:", error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
