import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, errors } from "@/lib/api-error";
import { checkNotExpired } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/devices/[id]
 * 远程吊销设备：设备置为 revoked，其所有令牌同时作废
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const authOrRes = await checkNotExpired(req);
    if (authOrRes instanceof NextResponse) return authOrRes;
    const auth = authOrRes;

    const { id } = await params;
    if (!id) {
      throw errors.badRequest("缺少设备 id");
    }

    const device = await prisma.device.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });
    if (!device) {
      throw errors.notFound("设备不存在");
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.device.update({
        where: { id: device.id },
        data: { status: "revoked" },
      }),
      prisma.deviceToken.updateMany({
        where: { deviceId: device.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return NextResponse.json({
      code: 0,
      message: "成功",
      data: { id: device.id, status: "revoked" },
    });
  }
);
