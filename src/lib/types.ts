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
  id?: number;
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
