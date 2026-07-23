/**
 * 用户数据迁移脚本
 * 从 parent_child 数据库迁移到 wxcl 数据库
 *
 * 运行: npx tsx scripts/migrate-users.ts
 */

import { Pool } from 'pg';

const OLD_DB = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'parent_child',
  user: 'postgres',
  password: 'wxcl123',
});

const NEW_DB = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'wxcl',
  user: 'postgres',
  password: 'wxcl123',
});

interface OldUser {
  id: number;
  phone: string;
  nickname: string;
  avatar_url: string | null;
  password: string | null;
  parent_role: string | null;
  child_gender: string | null;
  child_grade: string | null;
  child_personality: string | null;
  main_concerns: string | null;
  change_goal: string | null;
  profile_completed: boolean;
  created_at: Date;
}

interface OldChildProfile {
  id: number;
  user_id: number;
  name: string;
  gender: string;
  grade: string;
  personality: string;
  main_concerns: string;
  change_goal: string;
  created_at: Date;
}

interface OldQuestion {
  id: number;
  user_id: number;
  title: string;
  content: string;
  scene_tag: string;
  status: string;
  ai_reply: string;
  human_reply: string;
  created_at: Date;
  child_id: number;
}

interface OldCheckin {
  id: number;
  user_id: number;
  checkin_date: Date;
  emotion: string;
  good_thing: string;
  created_at: Date;
}

async function migrate() {
  console.log('开始迁移用户数据...\n');

  // 1. 迁移用户
  console.log('1. 迁移用户...');
  const oldUsers = await OLD_DB.query<OldUser>(
    'SELECT * FROM "user" ORDER BY id'
  );

  const userIdMap = new Map<number, string>(); // old user id -> new user id

  for (const user of oldUsers.rows) {
    // 检查手机号是否已存在
    const existing = await NEW_DB.query(
      'SELECT id FROM users WHERE phone = $1',
      [user.phone]
    );

    if (existing.rows.length > 0) {
      console.log(`  用户 ${user.phone} 已存在，跳过`);
      userIdMap.set(user.id, existing.rows[0].id);
      continue;
    }

    // 创建新用户
    const result = await NEW_DB.query<{ id: string }>(
      `INSERT INTO users (phone, nickname, avatar_url, password, parent_role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        user.phone,
        user.nickname,
        user.avatar_url,
        user.password,
        user.parent_role,
        user.created_at,
      ]
    );

    userIdMap.set(user.id, result.rows[0].id);
    console.log(`  迁移用户: ${user.phone} -> ${result.rows[0].id}`);
  }

  console.log(`\n用户迁移完成: ${userIdMap.size} 个\n`);

  // 2. 迁移孩子档案
  console.log('2. 迁移孩子档案...');
  const oldChildren = await OLD_DB.query<OldChildProfile>(
    'SELECT * FROM child_profile ORDER BY id'
  );

  const childIdMap = new Map<number, string>(); // old child id -> new child id

  for (const child of oldChildren.rows) {
    const newUserId = userIdMap.get(child.user_id);
    if (!newUserId) {
      console.log(`  跳过孩子 ${child.id}，用户 ${child.user_id} 未找到`);
      continue;
    }

    // 估算出生日期（根据年级估算）
    let birthDate: Date;
    const currentYear = new Date().getFullYear();
    if (child.grade) {
      const gradeYear = parseInt(child.grade.replace(/\D/g, '')) || currentYear - 10;
      const age = currentYear - gradeYear + 6; // 6岁上学
      birthDate = new Date(currentYear - age, 5, 15); // 假设6月15日出生
    } else {
      birthDate = new Date(2015, 5, 15); // 默认2015年
    }

    const result = await NEW_DB.query<{ id: string }>(
      `INSERT INTO children (user_id, name, birth_date, gender, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [newUserId, child.name || '孩子', birthDate, child.gender, child.created_at]
    );

    childIdMap.set(child.id, result.rows[0].id);
    console.log(`  迁移孩子: ${child.name || '孩子'} -> ${result.rows[0].id}`);
  }

  console.log(`\n孩子档案迁移完成: ${childIdMap.size} 个\n`);

  // 3. 迁移问答记录
  console.log('3. 迁移问答记录...');
  const oldQuestions = await OLD_DB.query<OldQuestion>(
    'SELECT * FROM question ORDER BY id'
  );

  let qCount = 0;
  for (const q of oldQuestions.rows) {
    const newUserId = userIdMap.get(q.user_id);
    if (!newUserId) continue;

    const newChildId = q.child_id ? childIdMap.get(q.child_id) : null;

    await NEW_DB.query(
      `INSERT INTO questions (child_id, content, answer, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        newChildId || null,
        (q.title ? q.title + '\n\n' : '') + q.content,
        q.ai_reply || q.human_reply || null,
        q.created_at,
      ]
    );
    qCount++;
  }

  console.log(`问答记录迁移完成: ${qCount} 条\n`);

  // 4. 迁移打卡记录（作为陪伴记录）
  console.log('4. 迁移打卡记录...');
  const oldCheckins = await OLD_DB.query<OldCheckin>(
    'SELECT * FROM checkin ORDER BY id'
  );

  let cCount = 0;
  for (const checkin of oldCheckins.rows) {
    const newUserId = userIdMap.get(checkin.user_id);
    if (!newUserId) continue;

    // 获取用户的第一个孩子
    const children = await NEW_DB.query(
      'SELECT id FROM children WHERE user_id = $1 LIMIT 1',
      [newUserId]
    );

    if (children.rows.length === 0) continue;

    const content = checkin.good_thing
      ? `[${checkin.emotion}] ${checkin.good_thing}`
      : `[${checkin.emotion}] 心情打卡`;

    await NEW_DB.query(
      `INSERT INTO records (child_id, content, intent, created_at)
       VALUES ($1, $2, $3, $4)`,
      [children.rows[0].id, content, 'daily', checkin.created_at]
    );
    cCount++;
  }

  console.log(`打卡记录迁移完成: ${cCount} 条\n`);

  // 5. 打印统计
  console.log('=== 迁移完成 ===');
  console.log(`用户: ${userIdMap.size}`);
  console.log(`孩子: ${childIdMap.size}`);
  console.log(`问答: ${qCount}`);
  console.log(`打卡: ${cCount}`);

  await OLD_DB.end();
  await NEW_DB.end();
}

migrate().catch(console.error);
