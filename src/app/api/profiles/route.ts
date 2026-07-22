import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

// 获取画像
export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get("childId") || DEFAULT_CHILD_ID;

  try {
    const profile = await queryOne(
      `SELECT id, child_id, personality, interests, strengths, challenges,
              core_needs, growth_goals, ai_analysis, parent_weight, updated_at
       FROM child_profiles
       WHERE child_id = $1`,
      [childId]
    );

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        childId: profile.child_id,
        personality: profile.personality,
        interests: profile.interests,
        strengths: profile.strengths,
        challenges: profile.challenges,
        coreNeeds: profile.core_needs,
        growthGoals: profile.growth_goals,
        aiAnalysis: profile.ai_analysis,
        parentWeight: profile.parent_weight,
        updatedAt: profile.updated_at,
      }
    });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// 创建或更新画像
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      childId = DEFAULT_CHILD_ID,
      personality,
      interests,
      strengths,
      challenges,
      coreNeeds,
      growthGoals,
      aiAnalysis,
      parentWeight = 0.5,
    } = body;

    // 确保 JSON 字段被正确序列化
    const personalityJson = personality ? JSON.stringify(personality) : null;
    const interestsJson = interests ? JSON.stringify(interests) : null;
    const strengthsJson = strengths ? JSON.stringify(strengths) : null;
    const challengesJson = challenges ? JSON.stringify(challenges) : null;
    const coreNeedsJson = coreNeeds ? JSON.stringify(coreNeeds) : null;
    const growthGoalsJson = growthGoals ? JSON.stringify(growthGoals) : null;
    const aiAnalysisJson = aiAnalysis ? JSON.stringify(aiAnalysis) : null;

    // upsert
    const result = await queryOne(
      `INSERT INTO child_profiles (child_id, personality, interests, strengths, challenges, core_needs, growth_goals, ai_analysis, parent_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (child_id) DO UPDATE SET
         personality = COALESCE(EXCLUDED.personality, child_profiles.personality),
         interests = COALESCE(EXCLUDED.interests, child_profiles.interests),
         strengths = COALESCE(EXCLUDED.strengths, child_profiles.strengths),
         challenges = COALESCE(EXCLUDED.challenges, child_profiles.challenges),
         core_needs = COALESCE(EXCLUDED.core_needs, child_profiles.core_needs),
         growth_goals = COALESCE(EXCLUDED.growth_goals, child_profiles.growth_goals),
         ai_analysis = COALESCE(EXCLUDED.ai_analysis, child_profiles.ai_analysis),
         parent_weight = $9,
         updated_at = NOW()
       RETURNING id, child_id, updated_at`,
      [childId, personalityJson, interestsJson, strengthsJson, challengesJson, coreNeedsJson, growthGoalsJson, aiAnalysisJson, parentWeight]
    );

    return NextResponse.json({ profile: result });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// 更新画像（带版本记录）
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      childId = DEFAULT_CHILD_ID,
      personality,
      interests,
      strengths,
      challenges,
      coreNeeds,
      growthGoals,
      aiAnalysis,
      parentWeight,
      modifiedBy = 'parent',
      reviewFlags,
    } = body;

    // 获取当前版本号
    const currentVersion = await queryOne(
      `SELECT COALESCE(MAX(version), 0) as v FROM profile_versions WHERE child_id = $1`,
      [childId]
    );
    const newVersion = (currentVersion?.v || 0) + 1;

    // 获取当前画像作为快照
    const currentProfile = await queryOne(
      `SELECT * FROM child_profiles WHERE child_id = $1`,
      [childId]
    );

    // 记录版本历史
    if (currentProfile) {
      await query(
        `INSERT INTO profile_versions (child_id, version, snapshot, modified_by, modifications, ai_analysis_at_time, review_flags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          childId,
          newVersion,
          JSON.stringify(currentProfile),
          modifiedBy,
          JSON.stringify({ personality, interests, strengths, challenges, coreNeeds, growthGoals }),
          currentProfile.ai_analysis,
          reviewFlags ? JSON.stringify(reviewFlags) : null,
        ]
      );
    }

    // 更新画像
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (personality !== undefined) {
      updates.push(`personality = $${paramIndex++}`);
      values.push(personality ? JSON.stringify(personality) : null);
    }
    if (interests !== undefined) {
      updates.push(`interests = $${paramIndex++}`);
      values.push(interests ? JSON.stringify(interests) : null);
    }
    if (strengths !== undefined) {
      updates.push(`strengths = $${paramIndex++}`);
      values.push(strengths ? JSON.stringify(strengths) : null);
    }
    if (challenges !== undefined) {
      updates.push(`challenges = $${paramIndex++}`);
      values.push(challenges ? JSON.stringify(challenges) : null);
    }
    if (coreNeeds !== undefined) {
      updates.push(`core_needs = $${paramIndex++}`);
      values.push(coreNeeds ? JSON.stringify(coreNeeds) : null);
    }
    if (growthGoals !== undefined) {
      updates.push(`growth_goals = $${paramIndex++}`);
      values.push(growthGoals ? JSON.stringify(growthGoals) : null);
    }
    if (aiAnalysis !== undefined) {
      updates.push(`ai_analysis = $${paramIndex++}`);
      values.push(aiAnalysis ? JSON.stringify(aiAnalysis) : null);
    }
    if (parentWeight !== undefined) {
      updates.push(`parent_weight = $${paramIndex++}`);
      values.push(parentWeight);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(childId);

    const result = await queryOne(
      `UPDATE child_profiles SET ${updates.join(', ')} WHERE child_id = $${paramIndex} RETURNING id, child_id, updated_at`,
      values
    );

    return NextResponse.json({ profile: result, version: newVersion });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
