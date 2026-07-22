import type { ApiResponse, User, ChildProfile, DailyCareRecord, DailyCareReport, Question } from './types';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // V2 API 使用 /v2/api 前缀
  const basePath = '/v2';
  const fullPath = path.startsWith('/v2') || path.startsWith('/api') ? path : `${basePath}${path}`;

  const response = await fetch(fullPath, {
    ...options,
    headers,
  });

  const data = await response.json();

  // Handle both {code, data} and direct response formats
  if (data.code !== undefined && data.code !== 0) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
    throw new Error(data.message || '请求失败');
  }

  return (data.data || data) as T;
}

// Auth API
export const authApi = {
  login: (phone: string, activationCode?: string, password?: string, parentRole?: string) =>
    request<{ token: string; userId: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, activationCode, password, parentRole }),
    }),
  sendCode: (phone: string) =>
    request('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyCode: (phone: string, code: string) =>
    request('/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),
};

// User API
export const userApi = {
  getCurrentUser: () => request<User>('/user/me'),
  updateUser: (data: Partial<User>) =>
    request('/user/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getProfile: () => request<User>('/user/profile'),
  getChildren: () => request<ChildProfile[]>('/api/children'),
  saveChild: (data: Omit<ChildProfile, 'id'>) =>
    request<ChildProfile>('/api/children', { method: 'POST', body: JSON.stringify(data) }),
  updateChild: (id: number, data: Partial<ChildProfile>) =>
    request<ChildProfile>('/api/children', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteChild: (id: number) =>
    request(`/api/children?id=${id}`, { method: 'DELETE' }),
};

// Question API
export const questionApi = {
  submitQuestion: (data: { title?: string; content: string; sceneTag: string; childId?: number }) =>
    request<Question>('/questions', { method: 'POST', body: JSON.stringify(data) }),
  getQuestions: (params: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ content?: Question[]; records?: Question[]; list?: Question[]; total: number }>(
      `/questions${qs ? `?${qs}` : ''}`
    );
  },
  submitFeedback: (id: string, feedback: string) =>
    request(`/questions/${id}/feedback`, { method: 'POST', body: JSON.stringify({ feedback }) }),
};

// Daily Care API
export interface DailyCareRecord {
  id: number;
  content: string;
  report?: DailyCareReport;
  createdAt: string;
  growthSummary?: string;
  touchPoint?: string;
  thinkingShift?: string;
  plannedAction?: string;
}

export interface DailyCareReport {
  recordId?: number;
  axis1?: Record<string, { growth_state: string; description: string }>;
  axis2?: Record<string, { parent_state: string; child_state: string; description: string }>;
  growth_summary?: string;
  strengths?: string[];
  opportunity_axis1?: { dimension: string; description: string; suggestion: string };
  opportunity_axis2?: { element: string; description: string; suggestion: string };
  advice?: string;
  reflection_prompt?: string;
  no_records?: boolean;
  message?: string;
  error?: string;
}

export const dailyCareApi = {
  analyze: (content: string, recordDate?: string) =>
    request<DailyCareReport>("/daily-care/analyze?recordDate=" + (recordDate || ""), {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  getRecords: (page = 0, limit = 20) =>
    request<{ records: DailyCareRecord[]; total: number; page: number; limit: number }>(
      "/daily-care/records?page=" + page + "&limit=" + limit
    ),
  getReport: (id: number) =>
    request<DailyCareReport>("/daily-care/report/" + id),
  submitFeedback: (recordId: number, feedback: { touchPoint: string; thinkingShift: string; plannedAction: string }) =>
    request<void>("/daily-care/feedback/" + recordId, {
      method: "POST",
      body: JSON.stringify(feedback),
    }),
  getComprehensive: (childId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return request<DailyCareReport>(
      "/daily-care/comprehensive" + (qs ? "?" + qs : "")
    );
  },
};

// Profile API
export interface Personality {
  type: 'introvert' | 'extrovert' | 'mixed' | '';
  details: string[];
}

export interface GrowthGoals {
  enhancements: string[];
  supports: string[];
}

export interface ProfileData {
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
  snapshot: ProfileData;
  modifiedBy: 'ai' | 'parent';
  modifications: any;
  aiAnalysisAtTime: any;
  reviewFlags: any;
  createdAt?: string;
}

export const profileApi = {
  getProfile: (childId?: string) =>
    request<{ profile: ProfileData | null }>(`/profiles${childId ? '?childId=' + childId : ''}`),
  saveProfile: (data: Partial<ProfileData> & { childId: string }) =>
    request<{ profile: any }>('/profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (data: Partial<ProfileData> & { childId: string; modifiedBy?: 'ai' | 'parent' }) =>
    request<{ profile: any; version: number }>('/profiles', { method: 'PUT', body: JSON.stringify(data) }),
  getEvents: (childId?: string, eventType?: string, limit = 50, offset = 0) =>
    request<{ events: ProfileEvent[] }>(
      `/profiles/events?${childId ? 'childId=' + childId + '&' : ''}${eventType ? 'eventType=' + eventType + '&' : ''}limit=${limit}&offset=${offset}`
    ),
  addEvent: (data: { childId?: string; eventType: string; fact: string; interpretation?: string; source?: string }) =>
    request<{ event: ProfileEvent }>('/profiles/events', { method: 'POST', body: JSON.stringify(data) }),
  getVersions: (childId?: string, limit = 20, offset = 0) =>
    request<{ versions: ProfileVersion[] }>(
      `/profiles/versions?${childId ? 'childId=' + childId + '&' : ''}limit=${limit}&offset=${offset}`
    ),
};

// Nourishment API
export interface NourishmentMoment {
  id?: string;
  childId: string;
  fact: string;
  feeling?: string;
  source: 'manual' | 'accompany' | 'extracted';
  extractedFromRecordId?: string;
  createdAt?: string;
}

export interface NourishmentReport {
  id?: string;
  childId: string;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  content: {
    periodSummary: string;
    momentCount: number;
    feelings: string[];
    facts: string[];
    reflection: string;
  };
  momentCount: number;
  createdAt?: string;
}

export const nourishmentApi = {
  getMoments: (childId?: string, limit = 5, offset = 0) =>
    request<{ moments: NourishmentMoment[]; total: number }>(
      `/nourishment?${childId ? 'childId=' + childId + '&' : ''}limit=${limit}&offset=${offset}`
    ),
  addMoment: (data: { childId?: string; fact: string; feeling?: string; source?: string }) =>
    request<{ moment: NourishmentMoment }>('/nourishment', { method: 'POST', body: JSON.stringify(data) }),
  getReports: (childId?: string, periodType?: string) =>
    request<{ reports: NourishmentReport[] }>(
      `/nourishment/reports?${childId ? 'childId=' + childId + '&' : ''}${periodType ? 'periodType=' + periodType : ''}`
    ),
  generateReport: (data: { childId?: string; periodType: string }) =>
    request<{ report: NourishmentReport }>('/nourishment/reports', { method: 'POST', body: JSON.stringify(data) }),
};
