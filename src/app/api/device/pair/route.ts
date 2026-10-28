import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, errors } from "@/lib/api-error";
import { claimDevice } from "@/lib/device-auth";

/**
 * POST /api/device/pair
 * 用配对码换设备令牌。此接口不需要用户 JWT —— 配对码本身就是凭证。
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  let body: { code?: string; deviceKey?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    throw errors.badRequest("请求体必须是 JSON");
  }

  const { code, deviceKey, name } = body || {};

  if (!code || typeof code !== "string") {
    throw errors.badRequest("code 必填");
  }
  if (!deviceKey || typeof deviceKey !== "string") {
    throw errors.badRequest("deviceKey 必填");
  }
  if (deviceKey.length > 64) {
    throw errors.badRequest("deviceKey 长度不能超过 64");
  }

  const result = await claimDevice({ code, deviceKey, name });

  return NextResponse.json({
    code: 0,
    message: "成功",
    data: { deviceId: result.deviceId, deviceToken: result.deviceToken },
  });
});
