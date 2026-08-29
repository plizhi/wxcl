import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { withErrorHandler, errors } from "@/lib/api-error";

// GET /api/daily-care/report/[id]
export const GET = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = getAuthFromRequest(req);
  if (!auth) throw errors.unauthorized();
  const userId = auth.userId;
  const { id } = await params;

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
    throw errors.notFound("Record not found");
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
});
