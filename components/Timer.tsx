import React, { useEffect, useState } from 'react';
import { Play, Square, Clock } from './Icons';
import { formatDurationDigital } from '../utils';
import { Subject, TimerState } from '../types';

interface TimerProps {
  timerState: TimerState;
  subjects: Subject[];
  onStart: (subjectId: string, goalId?: string) => void;
  onStop: () => void;
  activeSubjectName?: string;
  isMinimized?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ 
  timerState, 
  onStop, 
  activeSubjectName,
  isMinimized = false
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: number;
    if (timerState.isRunning && timerState.startTime) {
      // Update immediately
      setElapsed(Math.floor((Date.now() - timerState.startTime) / 1000) + timerState.elapsedOffset);
      
      interval = window.setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - (timerState.startTime || Date.now())) / 1000) + timerState.elapsedOffset;
        setElapsed(currentElapsed);
      }, 1000);
    } else {
      setElapsed(timerState.elapsedOffset);
    }

    return () => clearInterval(interval);
  }, [timerState]);

  if (!timerState.isRunning) return null;

  return (
    <div className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 bg-surface border border-slate-700 shadow-2xl rounded-xl p-4 flex items-center gap-4 z-50 animate-fade-in transition-all ${isMinimized ? 'w-auto' : 'w-64'}`}>
      <div className={`bg-primary/20 p-2 rounded-full ${isMinimized ? '' : 'animate-pulse'}`}>
        <Clock className="w-6 h-6 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 truncate">Current Session</p>
        <h3 className="text-sm font-semibold text-white truncate">{activeSubjectName || 'Unknown Subject'}</h3>
        <p className="text-xl font-mono font-bold text-primary tabular-nums">
          {formatDurationDigital(elapsed)}
        </p>
      </div>

      <button 
        onClick={onStop}
        className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-colors"
        title="Stop Timer"
      >
        <Square className="w-5 h-5 fill-current" />
      </button>
    </div>
  );
};