export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  deadline: string; // ISO Date string
  linkedSubjectIds: string[];
  targetHours?: number;
  isCompleted: boolean;
}

export interface Session {
  id: string;
  subjectId: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  durationSeconds: number;
  goalId?: string;
  notes?: string;
  timestamp: number; // Unix timestamp for sorting
}

export interface UserData {
  id: string;
  name: string;
  subjects: Subject[];
  goals: Goal[];
  sessions: Session[];
}

export interface AppData {
  users: UserData[];
  currentUserId: string;
}

export type View = 'dashboard' | 'calendar' | 'goals' | 'stats' | 'settings' | 'install';

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  subjectId: string | null;
  goalId: string | null;
  elapsedOffset: number;
}