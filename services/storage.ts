import { AppData, UserData, Session, Subject, Goal } from '../types';
import { generateId, getRandomColor } from '../utils';

const STORAGE_KEY = 'dev_rating_app_v1';

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub_1', name: 'Personal Project', color: '#3b82f6' },
  { id: 'sub_2', name: 'Blender', color: '#f97316' },
  { id: 'sub_3', name: 'React/Code', color: '#10b981' },
];

const INITIAL_DATA: AppData = {
  users: [
    {
      id: 'user_1',
      name: 'User 1',
      subjects: DEFAULT_SUBJECTS,
      goals: [],
      sessions: []
    },
    {
      id: 'user_2',
      name: 'User 2',
      subjects: DEFAULT_SUBJECTS,
      goals: [],
      sessions: []
    }
  ],
  currentUserId: 'user_1'
};

export const loadData = (): AppData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load data", e);
  }
  return INITIAL_DATA;
};

export const saveData = (data: AppData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};

export const exportData = (data: AppData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dev-rating-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
