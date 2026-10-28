import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error";
import { requireDevice } from "@/lib/device-auth";

/**
 * GET /api/device/ping
 * 设备心跳：验证令牌是否还有效
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const device = await requireDevice(req);

  return NextResponse.json({
    code: 0,
    message: "成功",
    data: {
      ok: true,
      deviceName: device.deviceName,
      userId: device.userId,
    },
  });
});
