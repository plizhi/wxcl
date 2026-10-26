import { prisma } from '@/lib/prisma';
import { requestRegistration } from '@/lib/auth-portal';

// 把「这个手机号属于本用户」登记到认证中心（账号层）。
//
// 三个前提，缺一不可：
// 1. 手机号归属已被「绑定手机号的专属激活码」证明过（phone_verified_at 非空）；
//    通用码注册的手机号是用户自填的，证明不了归属，登记它等于承认「手机号即账号」。
// 2. 本地还没绑定体系账号（portal_user_id 为空），否则是重复登记。
// 3. 不在请求路径上 await：认证服务抖动不能变成用户注册/登录转圈。
//
// 认证服务不可达时只记日志，不影响本次注册或登录的结果；漏掉的登记由
// 「登录时再次触发」和 auth 侧的补登脚本兜底。

export function triggerRegistration(user: {
  id: string;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  portalUserId: string | null;
}) {
  if (!user.phone || !user.phoneVerifiedAt || user.portalUserId) return;

  void requestRegistration(user.phone, user.id)
    .then(async (result) => {
      // 只有认证中心确认是「本次新建」才拿得到主体 ID；
      // 已存在时不返主体 ID（防止未证明占有的一方拿走既有锚点）。
      if (result.status !== 'created' || !result.portal_user_id) return;

      // 只在本地还没绑定时写，且不覆盖已有绑定。
      await prisma.user.updateMany({
        where: { id: user.id, portalUserId: null },
        data: { portalUserId: result.portal_user_id },
      });
    })
    .catch((err) => {
      console.warn('[registration] 登记失败', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}
