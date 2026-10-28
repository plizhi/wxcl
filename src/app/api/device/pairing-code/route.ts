import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error";
import { checkNotExpired } from "@/lib/auth-utils";
import {
  createPairingCode,
  pruneBurstPairingCodes,
  PAIRING_BURST_MAX,
} from "@/lib/device-auth";

/**
 * POST /api/device/pairing-code
 * 用户登录态生成配对码（用户在 App / 网页端展示给设备输入）
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) return authOrRes;
  const auth = authOrRes;

  // 60 秒内最多保留 PAIRING_BURST_MAX 个有效配对码，
  // 新生成一个之前先把超出配额的旧码置为过期（这里留一个位置给新码）
  await pruneBurstPairingCodes(auth.userId, PAIRING_BURST_MAX - 1);

  const { code, expiresAt } = await createPairingCode(auth.userId);

  return NextResponse.json({
    code: 0,
    message: "成功",
    data: { code: { code, expiresAt } },
  });
});
