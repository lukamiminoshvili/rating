import React from 'react';
import { Goal, Subject } from '../types';
import { formatDuration } from '../utils';
import { Target, CheckCircle, Clock } from './Icons';

interface GoalCardProps {
  goal: Goal;
  progressSeconds: number;
  subjects: Subject[];
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, progressSeconds, subjects }) => {
  const targetSeconds = (goal.targetHours || 0) * 3600;
  const percentage = targetSeconds > 0 ? Math.min(100, (progressSeconds / targetSeconds) * 100) : 0;
  const isExpired = new Date(goal.deadline) < new Date() && !goal.isCompleted && percentage < 100;
  
  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

  const linkedSubjectNames = subjects
    .filter(s => goal.linkedSubjectIds.includes(s.id))
    .map(s => s.name)
    .join(', ');

  return (
    <div className="bg-surface rounded-xl p-4 border border-slate-700 flex flex-col gap-3 hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
            <Target className={`w-5 h-5 ${percentage >= 100 ? 'text-green-500' : 'text-primary'}`} />
            <h3 className="font-semibold text-white">{goal.name}</h3>
        </div>
        {percentage >= 100 && <CheckCircle className="w-5 h-5 text-green-500" />}
      </div>
      
      {goal.description && <p className="text-sm text-slate-400">{goal.description}</p>}
      
      <div className="text-xs text-slate-500">
        Subjects: <span className="text-slate-300">{linkedSubjectNames}</span>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{formatDuration(progressSeconds)} spent</span>
          {targetSeconds > 0 && <span className="text-slate-400">{Math.round(percentage)}% of {goal.targetHours}h</span>}
        </div>
        {targetSeconds > 0 && (
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-green-500' : 'bg-primary'}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs mt-1">
        <Clock className="w-3 h-3 text-slate-500" />
        <span className={`${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
          {daysLeft < 0 ? 'Ended' : `${daysLeft} days left`} • {new Date(goal.deadline).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};