import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error";

// 短信通道未接入：激活码由管理员在 /admin/codes 发放。
// 这个端点保留下来是为了不打断可能存在的外部调用，但不再落库，
// 也不再删除该手机号已有的激活码——那会直接锁死已发码的用户。
export const POST = withErrorHandler(async () => {
  return NextResponse.json({
    code: 0,
    message: "短信验证码未启用，请使用管理员发放的激活码或密码登录",
  });
});
