#!/usr/bin/env node
/**
 * 旧版 parent_child -> V2 wxcl 数据迁移脚本
 *
 * 使用方式: node scripts/migrate-from-old.js
 *
 * 功能:
 * 1. 迁移用户（基于手机号匹配）
 * 2. 迁移孩子信息
 * 3. 迁移陪伴记录
 * 4. 迁移问答/压力吐槽
 */

const { Client } = require('pg');

const OLD_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'parent_child',
  user: 'postgres',
  password: 'wxcl123',
};

const NEW_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'wxcl',
  user: 'postgres',
  password: 'wxcl123',
};

async function query(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function migrate() {
  console.log('=== 开始迁移数据 ===\n');

  const oldClient = new Client(OLD_DB_CONFIG);
  const newClient = new Client(NEW_DB_CONFIG);

  try {
    await oldClient.connect();
    await newClient.connect();

    // 1. 迁移用户
    console.log('1. 迁移用户...');
    const oldUsers = await query(oldClient, `
      SELECT id, phone, nickname, avatar_url, parent_role, last_login_at, created_at
      FROM "user"
      WHERE phone IS NOT NULL
    `);

    let userCount = 0;
    for (const user of oldUsers) {
      // 检查是否已存在
      const existing = await query(newClient, 'SELECT id FROM users WHERE phone = $1', [user.phone]);
      if (existing.length === 0) {
        await query(newClient, `
          INSERT INTO users (id, phone, nickname, avatar_url, parent_role, last_login_at, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
        `, [user.phone, user.nickname || '用户', user.avatar_url, user.parent_role, user.last_login_at, user.created_at]);
        userCount++;
      }
    }
    console.log(`   迁移了 ${userCount} 个新用户\n`);

    // 2. 迁移孩子信息
    console.log('2. 迁移孩子信息...');
    const oldChildProfiles = await query(oldClient, `
      SELECT cp.*, u.phone
      FROM child_profile cp
      JOIN "user" u ON cp.user_id = u.id
    `);

    let childCount = 0;
    for (const child of oldChildProfiles) {
      // 获取新用户ID
      const newUsers = await query(newClient, 'SELECT id FROM users WHERE phone = $1', [child.phone]);
      if (newUsers.length === 0) continue;

      const newUserId = newUsers[0].id;

      // 检查是否已存在
      const existing = await query(newClient,
        'SELECT id FROM children WHERE user_id = $1', [newUserId]);
      if (existing.length === 0) {
        // 计算年龄
        let birthDate;
        if (child.grade) {
          // 假设 grade 是 "一年级" 这样的格式，转为出生日期
          const gradeMatch = child.grade.match(/(\d+)年级/);
          if (gradeMatch) {
            const grade = parseInt(gradeMatch[1]);
            const year = new Date().getFullYear() - grade - 6;
            birthDate = `${year}-09-01`;
          }
        }
        if (!birthDate) {
          birthDate = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        await query(newClient, `
          INSERT INTO children (id, user_id, name, birth_date, gender, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
        `, [newUserId, child.name || '孩子', birthDate, child.gender, child.created_at]);
        childCount++;
      }
    }
    console.log(`   迁移了 ${childCount} 个孩子信息\n`);

    // 3. 迁移陪伴记录
    console.log('3. 迁移陪伴记录...');
    const oldRecords = await query(oldClient, `
      SELECT dcr.*, u.phone
      FROM daily_care_record dcr
      JOIN "user" u ON dcr.user_id = u.id
      WHERE dcr.content IS NOT NULL
    `);

    let recordCount = 0;
    for (const record of oldRecords) {
      // 获取新用户的孩子ID
      const childResult = await query(newClient, `
        SELECT c.id FROM children c
        JOIN users u ON c.user_id = u.id
        WHERE u.phone = $1
        ORDER BY c.created_at DESC
        LIMIT 1
      `, [record.phone]);

      if (childResult.length === 0) continue;

      const childId = childResult[0].id;

      // 格式化回复
      let reply = '';
      if (record.report) {
        if (typeof record.report === 'object') {
          reply = JSON.stringify(record.report);
        } else {
          reply = String(record.report);
        }
      }

      await query(newClient, `
        INSERT INTO records (id, child_id, content, reply, intent, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'daily', $4)
      `, [childId, record.content, reply, record.created_at]);
      recordCount++;
    }
    console.log(`   迁移了 ${recordCount} 条陪伴记录\n`);

    // 4. 迁移问答/压力吐槽
    console.log('4. 迁移问答...');
    const oldQuestions = await query(oldClient, `
      SELECT q.*, u.phone
      FROM question q
      JOIN "user" u ON q.user_id = u.id
      WHERE q.content IS NOT NULL
    `);

    let questionCount = 0;
    for (const question of oldQuestions) {
      const childResult = await query(newClient, `
        SELECT c.id FROM children c
        JOIN users u ON c.user_id = u.id
        WHERE u.phone = $1
        ORDER BY c.created_at DESC
        LIMIT 1
      `, [question.phone]);

      if (childResult.length === 0) continue;

      const childId = childResult[0].id;
      const answer = question.ai_reply || question.human_reply || '';

      await query(newClient, `
        INSERT INTO questions (id, child_id, content, answer, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
      `, [childId, question.content, answer, question.created_at]);
      questionCount++;
    }
    console.log(`   迁移了 ${questionCount} 条问答\n`);

    console.log('=== 迁移完成 ===');

  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

migrate().catch(console.error);
