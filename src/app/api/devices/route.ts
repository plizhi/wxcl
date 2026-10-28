import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error";
import { checkNotExpired } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/devices
 * 列出当前用户绑定的设备（不返回任何令牌信息）
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) return authOrRes;
  const auth = authOrRes;

  const devices = await prisma.device.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      name: true,
      deviceKey: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ code: 0, message: "成功", data: { devices } });
});
