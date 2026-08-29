import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

// GET /api/daily-care/report/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const userId = auth.userId;
  const { id } = await params;

  try {
    const record = await prisma.record.findFirst({
      where: {
        id,
        intent: "daily",
        child: { userId },
      },
      select: {
        id: true,
        content: true,
        reply: true,
        createdAt: true,
      },
    });

    if (!record) {
      return NextResponse.json({ code: 404, message: "Record not found" }, { status: 404 });
    }

    // reply 存储时是 JSON.stringify 后的字符串，读取时需要 parse
    let report: Record<string, unknown> | null = null;
    if (record.reply) {
      try {
        report = typeof record.reply === "string"
          ? JSON.parse(record.reply)
          : (record.reply as Record<string, unknown>);
      } catch {
        report = null;
      }
    }

    return NextResponse.json({
      code: 0,
      message: "成功",
      data: {
        id: record.id,
        content: record.content,
        reply: record.reply,
        createdAt: record.createdAt,
        report,
      },
    });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
