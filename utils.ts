export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m ${s}s`;
};

export const formatDurationDigital = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const parseDurationInput = (input: string): number => {
  // Supports "1:30" (1h 30m), "90" (90m), "1.5" (1.5h)
  if (input.includes(':')) {
    const parts = input.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h * 3600 + m * 60;
  }
  
  if (input.toLowerCase().includes('h')) {
      const h = parseFloat(input);
      return Math.round(h * 3600);
  }

  const val = parseFloat(input);
  if (!isNaN(val)) {
    // Treat as minutes if just a number, unless decimal likely hours
    if (val < 10 && val % 1 !== 0) { // e.g. 1.5 -> 1.5 hours
         return Math.round(val * 3600);
    }
    return Math.round(val * 60);
  }
  return 0;
};

export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const SUBJECT_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
];

export const getRandomColor = () => SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];
