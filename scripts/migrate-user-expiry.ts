/**
 * 老用户时长初始化脚本
 *
 * 将所有没有 expireAt 且没有任何行为记录的用户，设置为24个月后到期
 *
 * 使用方法：
 * npx tsx scripts/migrate-user-expiry.ts
 */

import { prisma } from '../src/lib/prisma';
import { OLD_USER_MONTHS } from '../src/lib/user-expiry';

async function migrate() {
  console.log('开始迁移老用户时长...\n');

  // 找到所有没有过期时间且没有任何行为记录的用户
  const oldUsers = await prisma.user.findMany({
    where: {
      expireAt: null,
      activities: { none: {} },
    },
    select: { id: true, phone: true, createdAt: true },
  });

  console.log(`找到 ${oldUsers.length} 个老用户需要初始化\n`);

  if (oldUsers.length === 0) {
    console.log('没有需要迁移的用户');
    return;
  }

  const expireAt = new Date();
  expireAt.setMonth(expireAt.getMonth() + OLD_USER_MONTHS);

  for (const user of oldUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { expireAt },
    });
    console.log(`  - ${user.phone || user.id}: 设置到期时间为 ${expireAt.toISOString()}`);
  }

  console.log(`\n迁移完成，共处理 ${oldUsers.length} 个用户`);
  console.log(`到期时间统一设置为: ${expireAt.toISOString()}`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
