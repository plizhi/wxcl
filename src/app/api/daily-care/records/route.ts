import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { withErrorHandler, errors } from "@/lib/api-error";

// GET /api/daily-care/records
export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) throw errors.unauthorized();

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = page * limit;

  const [records, total] = await prisma.$transaction([
    prisma.record.findMany({
      where: {
        intent: "daily",
        child: { userId: auth.userId },
      },
      select: {
        id: true,
        content: true,
        reply: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.record.count({
      where: {
        intent: "daily",
        child: { userId: auth.userId },
      },
    }),
  ]);

  return NextResponse.json({
    code: 0,
    message: "成功",
    data: {
      records: records.map((r) => {
        let report = null;
        if (r.reply) {
          try {
            report = typeof r.reply === "string" ? JSON.parse(r.reply) : r.reply;
          } catch {
            report = { growth_summary: r.reply };
          }
        }
        return {
          id: r.id,
          content: r.content,
          reply: r.reply,
          createdAt: r.createdAt,
          report,
        };
      }),
      total,
      page,
      limit,
    },
  });
});
