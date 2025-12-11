import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  LayoutDashboard, 
  Calendar, 
  Target, 
  BarChart2, 
  Settings, 
  Play, 
  Plus, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Download,
  Share,
  Copy,
  ExternalLink,
  CheckCircle,
  Mail,
  Smartphone,
  Edit2,
  Wifi,
  Globe
} from './components/Icons';
import { Timer } from './components/Timer';
import { GoalCard } from './components/GoalCard';
import { 
  AppData, 
  UserData, 
  Subject, 
  Session, 
  Goal, 
  View, 
  TimerState 
} from './types';
import { 
  loadData, 
  saveData, 
  exportData 
} from './services/storage';
import { 
  formatDuration, 
  parseDurationInput, 
  getTodayString, 
  generateId, 
  getRandomColor 
} from './utils';

const VIEWS: { id: View; label: string; icon: React.FC<any> }[] = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'calendar', label: 'Log', icon: Calendar },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'stats', label: 'Stats', icon: BarChart2 },
  { id: 'install', label: 'Mobile', icon: Smartphone },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  // --- Global State ---
  const [data, setData] = useState<AppData>(loadData());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    subjectId: null,
    goalId: null,
    elapsedOffset: 0
  });

  // --- View Specific State (Hoisted to avoid Hook Errors) ---
  
  // Dashboard State
  const [manualTime, setManualTime] = useState('');
  const [selectedSubForManual, setSelectedSubForManual] = useState<string>(''); 
  const [selectedGoalForManual, setSelectedGoalForManual] = useState<string>('');

  // Goals State
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalSubjects, setNewGoalSubjects] = useState<string[]>([]);

  // Settings/Install State
  const [newSubName, setNewSubName] = useState('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'local' | 'public'>('local');
  const [localIp, setLocalIp] = useState('');
  const [localPort, setLocalPort] = useState('');

  // Initialize share URL and Port on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
        // Default public URL
        const savedUrl = localStorage.getItem('dev_rating_share_url');
        if (savedUrl) {
           setShareUrl(savedUrl);
        } else {
           setShareUrl(window.location.href);
        }

        // Detect Port
        const port = window.location.port;
        setLocalPort(port || (window.location.protocol === 'https:' ? '443' : '80'));
        
        // Detect localhost to default connection method
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        setConnectionMethod(isLocal ? 'local' : 'public');
    }
  }, []);

  // Construct effective URL for QR code
  const getEffectiveUrl = () => {
      if (connectionMethod === 'public') {
          return shareUrl;
      } else {
          // Local Wifi Mode
          const ip = localIp.trim() || '192.168.1.X';
          const port = localPort ? `:${localPort}` : '';
          return `http://${ip}${port}`;
      }
  };

  // Update localStorage when shareUrl changes
  const updateShareUrl = (url: string) => {
    setShareUrl(url);
    localStorage.setItem('dev_rating_share_url', url);
  };

  // Derived state for current user
  const currentUser = data.users.find(u => u.id === data.currentUserId) || data.users[0];
  const userIndex = data.users.findIndex(u => u.id === data.currentUserId);

  // Initialize selected subject if empty
  useEffect(() => {
    if (!selectedSubForManual && currentUser.subjects.length > 0) {
      setSelectedSubForManual(currentUser.subjects[0].id);
    }
  }, [currentUser.subjects, selectedSubForManual]);

  // --- Effects ---
  useEffect(() => {
    saveData(data);
  }, [data]);

  // --- Actions ---

  const switchUser = (userId: string) => {
    setData(prev => ({ ...prev, currentUserId: userId }));
    setTimerState({ isRunning: false, startTime: null, subjectId: null, goalId: null, elapsedOffset: 0 }); // Reset timer on user switch
  };

  const addSubject = (name: string) => {
    const newSubject: Subject = {
      id: generateId(),
      name,
      color: getRandomColor()
    };
    updateUser(u => ({ ...u, subjects: [...u.subjects, newSubject] }));
  };

  const addGoal = (goal: Goal) => {
    updateUser(u => ({ ...u, goals: [...u.goals, goal] }));
  };

  const addSession = (session: Session) => {
    updateUser(u => ({ ...u, sessions: [...u.sessions, session] }));
  };

  const deleteSession = (sessionId: string) => {
      updateUser(u => ({ ...u, sessions: u.sessions.filter(s => s.id !== sessionId) }));
  }

  const updateUser = (fn: (u: UserData) => UserData) => {
    setData(prev => {
      const newUsers = [...prev.users];
      newUsers[userIndex] = fn(newUsers[userIndex]);
      return { ...prev, users: newUsers };
    });
  };

  // --- Timer Logic ---
  const startTimer = (subjectId: string, goalId?: string) => {
    setTimerState({
      isRunning: true,
      startTime: Date.now(),
      subjectId,
      goalId: goalId || null,
      elapsedOffset: 0
    });
  };

  const stopTimer = () => {
    if (!timerState.startTime || !timerState.subjectId) return;

    const duration = Math.floor((Date.now() - timerState.startTime) / 1000) + timerState.elapsedOffset;
    if (duration > 5) { // Only save if > 5 seconds
      addSession({
        id: generateId(),
        subjectId: timerState.subjectId,
        date: getTodayString(),
        durationSeconds: duration,
        goalId: timerState.goalId || undefined,
        timestamp: Date.now()
      });
    }

    setTimerState({
      isRunning: false,
      startTime: null,
      subjectId: null,
      goalId: null,
      elapsedOffset: 0
    });
  };

  // --- Render Helpers ---
  const getSubject = (id: string) => currentUser.subjects.find(s => s.id === id);
  const getSessionsForDate = (date: string) => currentUser.sessions.filter(s => s.date === date);
  const getTotalForSubjectOnDate = (subjectId: string, date: string) => {
    return getSessionsForDate(date)
      .filter(s => s.subjectId === subjectId)
      .reduce((acc, s) => acc + s.durationSeconds, 0);
  };
  const getTotalForDate = (date: string) => {
    return getSessionsForDate(date).reduce((acc, s) => acc + s.durationSeconds, 0);
  };

  // --- Views ---

  const renderDashboard = () => {
    const todaySessions = getSessionsForDate(getTodayString());

    const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const seconds = parseDurationInput(manualTime);
      if (seconds > 0 && selectedSubForManual) {
        addSession({
          id: generateId(),
          subjectId: selectedSubForManual,
          date: getTodayString(),
          durationSeconds: seconds,
          goalId: selectedGoalForManual || undefined,
          timestamp: Date.now()
        });
        setManualTime('');
      }
    };

    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <header className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-white">Today's Progress</h1>
                <p className="text-slate-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-right">
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-2xl font-mono text-primary font-bold">{formatDuration(getTotalForDate(getTodayString()))}</p>
            </div>
        </header>

        {/* Quick Add / Subject List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentUser.subjects.map(subject => {
            const todayTotal = getTotalForSubjectOnDate(subject.id, getTodayString());
            const isTimerActiveForThis = timerState.isRunning && timerState.subjectId === subject.id;

            return (
              <div key={subject.id} className="bg-surface rounded-xl p-5 border border-slate-700 flex flex-col gap-4 shadow-lg hover:border-slate-600 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-white" style={{ color: subject.color }}>{subject.name}</h3>
                    <p className="text-sm text-slate-400">Today: {formatDuration(todayTotal)}</p>
                  </div>
                  {isTimerActiveForThis ? (
                      <div className="animate-pulse text-red-500 font-mono">Running...</div>
                  ) : (
                      <button 
                        onClick={() => startTimer(subject.id)}
                        disabled={timerState.isRunning}
                        className={`p-2 rounded-full ${timerState.isRunning ? 'bg-slate-700 opacity-50' : 'bg-primary/20 text-primary hover:bg-primary hover:text-white'} transition-colors`}
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Manual Entry Section */}
        <div className="bg-surface rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-secondary" />
                Log Manual Time
            </h3>
            <form onSubmit={handleManualSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs text-slate-400 mb-1 block">Subject</label>
                    <select 
                        value={selectedSubForManual}
                        onChange={(e) => setSelectedSubForManual(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none"
                    >
                        {currentUser.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs text-slate-400 mb-1 block">Duration (e.g. 1h 30m, 90)</label>
                    <input 
                        type="text"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        placeholder="1:30"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <div className="flex-1 w-full">
                   <label className="text-xs text-slate-400 mb-1 block">Goal (Optional)</label>
                    <select 
                         value={selectedGoalForManual}
                         onChange={(e) => setSelectedGoalForManual(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">None</option>
                        {currentUser.goals.filter(g => !g.isCompleted && g.linkedSubjectIds.includes(selectedSubForManual)).map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
                    Add
                </button>
            </form>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const sessions = getSessionsForDate(selectedDate);
    
    // Sort sessions descending by time
    const sortedSessions = [...sessions].sort((a,b) => b.timestamp - a.timestamp);

    const changeDate = (offset: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-6 pb-20">
             <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-slate-700">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-white">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                    <p className="text-primary font-mono">{formatDuration(getTotalForDate(selectedDate))}</p>
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-full"><ChevronRight className="w-5 h-5" /></button>
             </div>

             <div className="space-y-3">
                 {sortedSessions.length === 0 ? (
                     <div className="text-center py-10 text-slate-500">No activity logged for this day.</div>
                 ) : (
                     sortedSessions.map(session => {
                         const subject = getSubject(session.subjectId);
                         return (
                            <div key={session.id} className="bg-surface p-4 rounded-xl border border-slate-700 flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject?.color || '#ccc' }}></div>
                                    <div>
                                        <p className="font-semibold text-white">{subject?.name}</p>
                                        <p className="text-xs text-slate-400">{session.goalId ? `Goal: ${currentUser.goals.find(g => g.id === session.goalId)?.name}` : 'No Goal'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-slate-200">{formatDuration(session.durationSeconds)}</span>
                                    <button onClick={() => deleteSession(session.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                         );
                     })
                 )}
             </div>
        </div>
    );
  };

  const renderGoals = () => {
      const handleAddGoal = (e: React.FormEvent) => {
          e.preventDefault();
          if(!newGoalName || !newGoalDate) return;

          addGoal({
              id: generateId(),
              name: newGoalName,
              deadline: newGoalDate,
              linkedSubjectIds: newGoalSubjects.length ? newGoalSubjects : currentUser.subjects.map(s => s.id),
              targetHours: parseFloat(newGoalTarget) || undefined,
              isCompleted: false
          });
          setShowAddGoal(false);
          setNewGoalName('');
          setNewGoalTarget('');
          setNewGoalDate('');
          setNewGoalSubjects([]);
      };

      const toggleSubjectSelect = (id: string) => {
          if (newGoalSubjects.includes(id)) {
              setNewGoalSubjects(newGoalSubjects.filter(sid => sid !== id));
          } else {
              setNewGoalSubjects([...newGoalSubjects, id]);
          }
      };

      return (
          <div className="space-y-6 pb-20">
              <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Goals</h1>
                <button onClick={() => setShowAddGoal(!showAddGoal)} className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Goal
                </button>
              </header>

              {showAddGoal && (
                  <form onSubmit={handleAddGoal} className="bg-surface p-6 rounded-xl border border-slate-700 space-y-4 animate-fade-in">
                      <div>
                          <label className="block text-xs text-slate-400 mb-1">Goal Name</label>
                          <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} required />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Target Hours (Optional)</label>
                            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} />
                        </div>
                        <div className="flex-1">
                             <label className="block text-xs text-slate-400 mb-1">Deadline</label>
                             <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" value={newGoalDate} onChange={e => setNewGoalDate(e.target.value)} required />
                        </div>
                      </div>
                      <div>
                          <label className="block text-xs text-slate-400 mb-2">Linked Subjects (Select specific or leave empty for all)</label>
                          <div className="flex flex-wrap gap-2">
                              {currentUser.subjects.map(s => (
                                  <button 
                                    type="button"
                                    key={s.id} 
                                    onClick={() => toggleSubjectSelect(s.id)}
                                    className={`px-3 py-1 rounded-full text-xs border ${newGoalSubjects.includes(s.id) ? 'bg-primary text-white border-primary' : 'bg-transparent text-slate-400 border-slate-700'}`}
                                  >
                                      {s.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowAddGoal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                          <button type="submit" className="bg-primary px-6 py-2 rounded-lg text-white">Create</button>
                      </div>
                  </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser.goals.length === 0 ? <p className="text-slate-500 col-span-full text-center py-10">No goals set yet.</p> : null}
                  {currentUser.goals.map(goal => {
                       // Calculate progress
                       const progress = currentUser.sessions
                        .filter(s => s.goalId === goal.id)
                        .reduce((acc, s) => acc + s.durationSeconds, 0);

                       return <GoalCard key={goal.id} goal={goal} progressSeconds={progress} subjects={currentUser.subjects} />;
                  })}
              </div>
          </div>
      );
  };

  const renderStats = () => {
    // 1. Subject Totals
    const subjectStats = currentUser.subjects.map(sub => {
        const total = currentUser.sessions.filter(s => s.subjectId === sub.id).reduce((acc, s) => acc + s.durationSeconds, 0);
        return { name: sub.name, total, color: sub.color };
    }).sort((a,b) => b.total - a.total);

    // 2. Last 7 Days Trend
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
            date: dateStr,
            dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
            totalHours: Number((getTotalForDate(dateStr) / 3600).toFixed(1))
        };
    });

    // 3. Top Days
    const dailyTotals: Record<string, number> = {};
    currentUser.sessions.forEach(s => {
        dailyTotals[s.date] = (dailyTotals[s.date] || 0) + s.durationSeconds;
    });
    const topDays = Object.entries(dailyTotals)
        .map(([date, total]) => ({ date, total }))
        .sort((a,b) => b.total - a.total)
        .slice(0, 5);

    return (
        <div className="space-y-8 pb-20">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-6">Last 7 Days (Hours)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={last7Days}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="dayName" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    cursor={{fill: '#334155', opacity: 0.4}}
                                />
                                <Bar dataKey="totalHours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-6">Subject Distribution</h3>
                    <div className="h-64 w-full flex items-center justify-center">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={subjectStats.filter(s => s.total > 0)}
                                    dataKey="total"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {subjectStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                            </PieChart>
                         </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-4">
                        {subjectStats.filter(s => s.total > 0).map(s => (
                            <div key={s.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="text-slate-300">{s.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ratings Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                        <h3 className="font-semibold text-white">Top Subjects</h3>
                    </div>
                    <div className="divide-y divide-slate-700">
                        {subjectStats.map((sub, i) => (
                            <div key={sub.name} className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-500 font-mono text-sm w-4">{i + 1}</span>
                                    <span className="text-white">{sub.name}</span>
                                </div>
                                <span className="font-mono text-primary font-medium">{formatDuration(sub.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                        <h3 className="font-semibold text-white">Most Productive Days</h3>
                    </div>
                     <div className="divide-y divide-slate-700">
                        {topDays.map((day, i) => (
                            <div key={day.date} className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-500 font-mono text-sm w-4">{i + 1}</span>
                                    <span className="text-white">{new Date(day.date).toLocaleDateString()}</span>
                                </div>
                                <span className="font-mono text-emerald-400 font-medium">{formatDuration(day.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderInstall = () => {
      const effectiveUrl = getEffectiveUrl();
      const isConfiguredLocal = connectionMethod === 'local' && localIp.length > 0;
      const isPublic = connectionMethod === 'public';
      
      const handleCopyLink = () => {
          navigator.clipboard.writeText(effectiveUrl).then(() => {
              setCopyFeedback(true);
              setTimeout(() => setCopyFeedback(false), 2000);
          });
      };

      const handleNativeShare = () => {
          if (navigator.share) {
              navigator.share({
                  title: 'DevRating App',
                  text: 'Track your development time and goals.',
                  url: effectiveUrl
              }).catch(console.error);
          } else {
             handleCopyLink();
          }
      };
      
      const emailSubject = encodeURIComponent("My DevRating App Link");
      const emailBody = encodeURIComponent(`Here is the link to the DevRating app: ${effectiveUrl}`);
      const mailtoLink = `mailto:?subject=${emailSubject}&body=${emailBody}`;

      return (
          <div className="space-y-8 pb-20">
              <header>
                <h1 className="text-2xl font-bold text-white">Mobile Connection</h1>
                <p className="text-slate-400">Choose how you want to connect your phone.</p>
              </header>

              {/* Connection Mode Switch */}
              <div className="bg-surface p-1 rounded-lg border border-slate-700 flex">
                  <button 
                    onClick={() => setConnectionMethod('local')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${connectionMethod === 'local' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Wifi className="w-4 h-4" />
                      Home / Local WiFi
                  </button>
                  <button 
                    onClick={() => setConnectionMethod('public')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${connectionMethod === 'public' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Globe className="w-4 h-4" />
                      Public Link (Vercel)
                  </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Configuration & QR */}
                  <div className="bg-surface p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-4">Step 1: Get the Link</h3>
                        
                        {connectionMethod === 'local' && (
                            <div className="space-y-4 mb-6">
                                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-sm text-blue-200">
                                    <strong>How Local Connection Works:</strong><br/>
                                    Your phone must be on the <u>same Wi-Fi</u> as this computer. You need to enter your computer's "IP Address" below so your phone can find it.
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Enter Computer IP Address</label>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="text" 
                                            value={localIp}
                                            onChange={(e) => setLocalIp(e.target.value)}
                                            placeholder="e.g. 192.168.1.5"
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono placeholder:text-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        />
                                        <div className="text-slate-500 font-mono">:</div>
                                        <input 
                                            type="text" 
                                            value={localPort}
                                            onChange={(e) => setLocalPort(e.target.value)}
                                            placeholder="3000"
                                            className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500 flex gap-4">
                                        <span>Windows: Run <code>ipconfig</code> in CMD</span>
                                        <span>Mac: Check System Settings &gt; Wi-Fi</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {connectionMethod === 'public' && (
                            <div className="mb-6">
                                <label className="block text-xs text-slate-400 mb-1">Enter Public URL</label>
                                <input 
                                    type="text" 
                                    value={shareUrl}
                                    onChange={(e) => updateShareUrl(e.target.value)}
                                    placeholder="https://my-app.vercel.app"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        )}

                        <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                             {/* Blur the QR code if we need input but haven't gotten it yet */}
                             <div className={`relative transition-all duration-300 ${(!isConfiguredLocal && !isPublic) ? 'blur-md opacity-30 grayscale' : 'opacity-100'}`}>
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(effectiveUrl)}`} 
                                    alt="QR Code" 
                                    className="w-48 h-48 object-contain bg-white p-2 rounded-lg" 
                                />
                             </div>
                             
                             {(!isConfiguredLocal && !isPublic) && (
                                 <div className="absolute font-medium text-slate-400">Enter IP Address above to generate QR</div>
                             )}

                             <div className="mt-4 font-mono text-sm text-primary break-all text-center">
                                 {effectiveUrl}
                             </div>
                        </div>
                  </div>

                  {/* Right Column: iOS Instructions */}
                  <div className="space-y-6">
                      <div className="bg-surface p-6 rounded-xl border border-slate-700">
                          <h3 className="text-lg font-semibold text-white mb-4">Step 2: Add to Home Screen</h3>
                          <div className="space-y-4">
                              <div className="flex items-start gap-4">
                                  <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                                  <div>
                                      <p className="text-white font-medium">Scan & Open in Safari</p>
                                      <p className="text-sm text-slate-400">Use your phone camera. Make sure it opens in the Safari browser.</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4">
                                  <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                                  <div>
                                      <p className="text-white font-medium">Tap Share Icon</p>
                                      <p className="text-sm text-slate-400">Tap the square with an arrow at the bottom of the screen.</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4">
                                  <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                                  <div>
                                      <p className="text-white font-medium">Add to Home Screen</p>
                                      <p className="text-sm text-slate-400">Scroll down and tap 'Add to Home Screen', then confirm.</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-surface p-6 rounded-xl border border-slate-700">
                           <h3 className="text-lg font-semibold text-white mb-4">Troubleshooting</h3>
                           <ul className="space-y-3 text-sm text-slate-400">
                               <li className="flex gap-2">
                                   <span className="text-red-400 font-bold">•</span>
                                   <span><strong>"Site can't be reached"?</strong> Check that both devices are on the same Wi-Fi network.</span>
                               </li>
                               <li className="flex gap-2">
                                   <span className="text-red-400 font-bold">•</span>
                                   <span><strong>Firewall?</strong> Your computer's firewall might be blocking the connection. Try turning it off temporarily.</span>
                               </li>
                               <li className="flex gap-2">
                                   <span className="text-red-400 font-bold">•</span>
                                   <span><strong>Wrong IP?</strong> Double check the IP address. It usually looks like 192.168.x.x or 10.0.0.x.</span>
                               </li>
                           </ul>
                           
                           <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between gap-3">
                                <button 
                                    onClick={handleNativeShare}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Share className="w-4 h-4" /> Share
                                </button>
                                <a 
                                    href={mailtoLink}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Mail className="w-4 h-4" /> Email
                                </a>
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderSettings = () => {
      const handleAddSubject = (e: React.FormEvent) => {
          e.preventDefault();
          if (newSubName) {
              addSubject(newSubName);
              setNewSubName('');
          }
      };
      
      return (
          <div className="space-y-8 pb-20">
              <header>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </header>

              <div className="bg-surface p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Active User
                  </h3>
                  <div className="flex gap-4">
                      {data.users.map(u => (
                          <button
                            key={u.id}
                            onClick={() => switchUser(u.id)}
                            className={`flex-1 py-3 px-4 rounded-lg border transition-all ${u.id === data.currentUserId ? 'bg-primary/20 border-primary text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          >
                              {u.name}
                          </button>
                      ))}
                  </div>
              </div>

               <div className="bg-surface p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Manage Subjects</h3>
                  <div className="space-y-3 mb-4">
                      {currentUser.subjects.map(s => (
                          <div key={s.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                              <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                                  <span className="text-white">{s.name}</span>
                              </div>
                          </div>
                      ))}
                  </div>
                  <form onSubmit={handleAddSubject} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newSubName} 
                        onChange={e => setNewSubName(e.target.value)} 
                        placeholder="New Subject Name"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                      <button type="submit" className="bg-primary hover:bg-blue-600 text-white px-4 rounded-lg">Add</button>
                  </form>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                  <button onClick={() => exportData(data)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors">
                      <Download className="w-4 h-4" /> Export Data to JSON
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-background text-slate-200 font-sans selection:bg-primary/30">
      {/* Sidebar (Desktop) */}
      <nav className="hidden md:flex flex-col w-64 fixed h-full bg-surface border-r border-slate-800 p-4">
          <div className="mb-8 px-2 flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-400 rounded-lg"></div>
             <span className="text-xl font-bold text-white tracking-tight">DevRating</span>
          </div>
          
          <div className="space-y-1">
              {VIEWS.map(view => (
                  <button
                    key={view.id}
                    onClick={() => setCurrentView(view.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === view.id ? 'bg-primary text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                      <view.icon className="w-5 h-5" />
                      <span className="font-medium">{view.label}</span>
                  </button>
              ))}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800">
              <div className="px-4 py-2 flex items-center gap-3 text-sm text-slate-500">
                  <User className="w-4 h-4" />
                  <span>{currentUser.name}</span>
              </div>
          </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'calendar' && renderCalendar()}
            {currentView === 'goals' && renderGoals()}
            {currentView === 'stats' && renderStats()}
            {currentView === 'install' && renderInstall()}
            {currentView === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-md border-t border-slate-800 flex justify-around p-2 z-40 pb-safe">
        {VIEWS.map(view => (
             <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${currentView === view.id ? 'text-primary' : 'text-slate-500'}`}
             >
                 <view.icon className="w-6 h-6 mb-1" />
                 <span className="text-[10px] font-medium">{view.label}</span>
             </button>
        ))}
      </nav>

      {/* Floating Timer */}
      <Timer 
        timerState={timerState} 
        subjects={currentUser.subjects}
        onStart={startTimer}
        onStop={stopTimer}
        activeSubjectName={timerState.subjectId ? getSubject(timerState.subjectId)?.name : undefined}
      />
    </div>
  );
}