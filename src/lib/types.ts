// Types for the parent-child-assistant app

export interface User {
  id: string;
  phone?: string;
  nickname?: string;
  streakDays?: number;
  createdAt?: string;
  childGender?: string;
  childGrade?: string;
  childPersonality?: string;
  mainConcerns?: string[];
  changeGoal?: string[];
  profileCompleted?: boolean;
  parentRole?: string;
}

export interface ChildProfile {
  id?: string;
  name?: string;
  gender: 'boy' | 'girl' | '';
  grade: string;
  personality: 'introvert' | 'extrovert' | 'mixed' | '';
  mainConcerns: string[];
  changeGoal: string[];
  createdAt?: string;
}

export interface Question {
  id: string;
  title?: string;
  content: string;
  sceneTag: SceneTag;
  status: QuestionStatus;
  aiReply?: string;
  humanReply?: string;
  followups?: Followup[];
  feedback?: string;
  createdAt: string;
  phone?: string;
  userId?: string;
}

export type SceneTag = 'emotion' | 'conflict' | 'silent' | 'education' | 'daily' | 'other';
export type QuestionStatus = 'ai_replied' | 'need_human' | 'human_replied' | 'closed' | 'pending_review';

export interface Followup {
  id: string;
  content: string;
  aiReply?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  content: string;
  taskType: TaskType;
  status: 'pending' | 'completed';
}

export type TaskType = 'break_ice' | 'good_thing' | 'emotion_checkin' | 'show_weakness' | 'non_study_talk' | 'self_care' | 'weekly_review';

export interface Checkin {
  id: string;
  emotion: Emotion;
  goodThing?: string;
  createdAt: string;
}

export type Emotion = 'great' | 'good' | 'okay' | 'bad' | 'angry';

export interface PhraseCategory {
  code: string;
  name: string;
  icon: string;
}

export interface Phrase {
  id: string;
  scene: string;
  content: string;
  timing: string;
}

export interface Badge {
  code: string;
  name: string;
  icon: string;
  progress?: number;
  total?: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

// ========== 画像相关类型 ==========

export interface Personality {
  type: 'introvert' | 'extrovert' | 'mixed' | '';
  details: string[];
}

export interface GrowthGoals {
  enhancements: string[];
  supports: string[];
}

export interface ChildProfileData {
  id?: string;
  childId: string;
  personality: Personality;
  interests: string[];
  strengths: string[];
  challenges: string[];
  coreNeeds: string[];
  growthGoals: GrowthGoals;
  aiAnalysis: any;
  parentWeight: number;
  updatedAt?: string;
}

export interface ProfileEvent {
  id?: string;
  childId: string;
  eventType: 'strength' | 'challenge' | 'milestone' | 'interaction' | 'growth';
  fact: string;
  interpretation?: string;
  source: 'manual' | 'accompany' | 'venting';
  createdAt?: string;
}

export interface ProfileVersion {
  id?: string;
  childId: string;
  version: number;
  snapshot: ChildProfileData;
  modifiedBy: 'ai' | 'parent';
  modifications: any;
  aiAnalysisAtTime: any;
  reviewFlags: any;
  createdAt?: string;
}

export interface DailyCareRecord {
  id: string;
  childId: string;
  content: string;
  reply: any;
  report?: DailyCareReport;
  createdAt: string;
  growthSummary?: string;
  touchPoint?: string;
  thinkingShift?: string;
  plannedAction?: string;
  intent: string;
}

export interface DailyCareReport {
  recordId?: number;
  axis1?: Record<string, { growth_state: string; description: string }>;
  axis2?: Record<string, { parent_state: string; child_state: string; description: string }>;
  growth_summary?: string;
  strengths?: string[];
  opportunity_axis1?: {
    dimension: string;
    description: string;
    suggestion: string;
  };
  opportunity_axis2?: {
    element: string;
    description: string;
    suggestion: string;
  };
  advice?: string;
  reflection_prompt?: string;
  no_records?: boolean;
  message?: string;
  error?: string;
}
