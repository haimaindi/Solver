import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Flame, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Target,
  Trophy,
  History,
  Settings2,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  X,
  Archive
} from 'lucide-react';
import { Habit, HabitLog, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, TextArea } from './UI';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isToday, startOfToday, differenceInDays, parseISO } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';

const HABIT_COLORS = [
  { name: 'Blue', value: '#003399' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' }
];

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newHabit, setNewHabit] = useState<Partial<Habit>>({
    name: '',
    description: '',
    type: 'build',
    color: '#003399'
  });
  const [showArchived, setShowArchived] = useState(false);
  const [commentingLog, setCommentingLog] = useState<{ date: string, habitId: string, comment: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [showArchived]);

  const fetchData = async () => {
    const currentUser = localStorage.getItem('user_id') || 'unknown';
    
    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', currentUser).eq('is_archived', showArchived).order('created_at', { ascending: false }),
      supabase.from('habit_logs').select('*, habits!inner(user_id)').eq('habits.user_id', currentUser)
    ]);

    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
  };

  const handleToggleArchiveHabit = async (habitId: string, isCurrentlyArchived: boolean) => {
    const { error } = await supabase
      .from('habits')
      .update({ is_archived: !isCurrentlyArchived })
      .eq('id', habitId);

    if (!error) {
      fetchData();
      Swal.fire('Success', `Habit ${!isCurrentlyArchived ? 'archived' : 'unarchived'}`, 'success');
    } else {
      Swal.fire('Error', 'Failed to update habit status', 'error');
    }
  };

  const handleCreateHabit = async () => {
    if (!newHabit.name) return;
    const currentUser = localStorage.getItem('user_id') || 'unknown';

    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticHabit: Habit = {
      ...newHabit as Habit,
      id: tempId,
      created_at: new Date().toISOString(),
      user_id: currentUser
    };
    setHabits([optimisticHabit, ...habits]);
    setIsAdding(false);

    const { data, error } = await supabase
      .from('habits')
      .insert([{ ...newHabit, user_id: currentUser }])
      .select()
      .single();

    if (data) {
      setHabits(prev => prev.map(h => h.id === tempId ? data : h));
      setNewHabit({ name: '', description: '', type: 'build', color: '#003399' });
    } else if (error) {
      setHabits(habits);
      Swal.fire('Error', 'Failed to create habit', 'error');
    }
  };

  const toggleHabit = async (habitId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const existingLog = logs.find(l => l.habit_id === habitId && l.completed_at === today);

    // Optimistic Update
    const originalLogs = [...logs];
    if (existingLog) {
      setLogs(logs.filter(l => l.id !== existingLog.id));
      const { error } = await supabase.from('habit_logs').delete().eq('id', existingLog.id);
      if (error) {
        setLogs(originalLogs);
        Swal.fire('Error', 'Failed to update habit', 'error');
      }
    } else {
      const tempId = Math.random().toString();
      const newLog: HabitLog = {
        id: tempId,
        habit_id: habitId,
        completed_at: today,
        created_at: new Date().toISOString()
      };
      setLogs([...logs, newLog]);
      const { data, error } = await supabase.from('habit_logs').insert([{ habit_id: habitId, completed_at: today }]).select().single();
      if (data) {
        setLogs(prev => prev.map(l => l.id === tempId ? data : l));
      } else if (error) {
        setLogs(originalLogs);
        Swal.fire('Error', 'Failed to update habit', 'error');
      }
    }
  };

  const handleSaveComment = async () => {
    if (!commentingLog) return;
    
    const { date, habitId, comment } = commentingLog;
    const existingLog = logs.find(l => l.habit_id === habitId && l.completed_at === date);
    
    if (existingLog) {
      // Update existing log
      const originalLogs = [...logs];
      setLogs(logs.map(l => l.id === existingLog.id ? { ...l, comment } : l));
      
      const { error } = await supabase
        .from('habit_logs')
        .update({ comment })
        .eq('id', existingLog.id);
        
      if (error) {
        setLogs(originalLogs);
        Swal.fire('Error', 'Failed to save comment', 'error');
      }
    } else {
      // Create new log with comment
      const tempId = Math.random().toString();
      const newLog: HabitLog = {
        id: tempId,
        habit_id: habitId,
        completed_at: date,
        comment,
        created_at: new Date().toISOString()
      };
      setLogs([...logs, newLog]);
      
      const { data, error } = await supabase
        .from('habit_logs')
        .insert([{ habit_id: habitId, completed_at: date, comment }])
        .select()
        .single();
        
      if (data) {
        setLogs(prev => prev.map(l => l.id === tempId ? data : l));
      } else if (error) {
        setLogs(logs);
        Swal.fire('Error', 'Failed to save comment', 'error');
      }
    }
    setCommentingLog(null);
  };

  const deleteHabit = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const result = await Swal.fire({
      title: 'Delete Habit?',
      text: "This will remove all progress logs for this habit.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003399',
      cancelButtonColor: '#ef4444',
    });

    if (result.isConfirmed) {
      const originalHabits = [...habits];
      setHabits(habits.filter(h => h.id !== id));
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) {
        setHabits(originalHabits);
        Swal.fire('Error', 'Failed to delete habit', 'error');
      }
    }
  };

  const getStreak = (habitId: string) => {
    let streak = 0;
    let checkDate = startOfToday();
    
    const completedDates = new Set(logs.filter(l => l.habit_id === habitId).map(l => l.completed_at));

    while (completedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = new Date(checkDate.setDate(checkDate.getDate() - 1));
    }
    
    return streak;
  };

  const getCompletionStats = (habit: Habit) => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id);
    const checkedCount = habitLogs.length;
    const totalDays = differenceInDays(startOfToday(), parseISO(habit.created_at)) + 1;
    return { checkedCount, totalDays };
  };

  const getMonthlyStats = (habitId: string) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const habitLogs = logs.filter(l => l.habit_id === habitId);
    
    return { days, habitLogs };
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left md:text-left">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center justify-start md:justify-start gap-3">
            <TrendingUp className="w-8 h-8 text-bca-blue" />
            {showArchived ? 'Archived Habit' : 'Habit'}
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Consistency is the key to mastery. Track your progress daily.</p>
        </div>
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "p-3 rounded-xl transition-colors shadow-sm",
              showArchived ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
            title={showArchived ? "Show Active Habits" : "Show Archived Habits"}
          >
            <Archive className="w-5 h-5" />
          </button>
          {!showArchived && (
            <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 h-11 px-6 shadow-lg shadow-bca-blue/20">
              <Plus className="w-4 h-4" />
              <span>Add New Habit</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map(habit => {
          const isDoneToday = logs.some(l => l.habit_id === habit.id && l.completed_at === format(startOfToday(), 'yyyy-MM-dd'));
          const streak = getStreak(habit.id);
          const { checkedCount, totalDays } = getCompletionStats(habit);
          
          return (
            <GlassCard 
              key={habit.id}
              onClick={() => setSelectedHabit(habit)}
              className={cn(
                "p-6 cursor-pointer transition-all border-l-4 group hover:translate-y-[-4px]",
                isDoneToday ? "bg-white shadow-md" : "bg-white/50"
              )}
              style={{ borderLeftColor: habit.color }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 group-hover:text-bca-blue transition-colors">{habit.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{habit.description}</p>
                </div>
                <div className="flex gap-2">
                  {showArchived && (
                    <button 
                      onClick={(e) => handleToggleArchiveHabit(habit.id, habit.is_archived || false)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-green-100 text-green-600 hover:bg-green-200"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => toggleHabit(habit.id, e)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                      isDoneToday ? "text-white animate-check" : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                    )}
                    style={{ backgroundColor: isDoneToday ? habit.color : undefined }}
                  >
                    {isDoneToday ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  {showArchived && (
                    <button 
                      onClick={(e) => deleteHabit(habit.id, e)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Flame className={cn("w-4 h-4", streak > 0 ? "fill-orange-500" : "")} />
                    <span className="text-xs font-bold">{streak} Day Streak</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {checkedCount} / {totalDays} days checked
                  </div>
                </div>

                <div className="flex gap-1 justify-between">
                  {[...Array(7)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const log = logs.find(l => l.habit_id === habit.id && l.completed_at === dateStr);
                    const isDone = !!log;
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "flex-1 h-1.5 rounded-full transition-all",
                          isDone ? "" : "bg-slate-100"
                        )} 
                        style={{ backgroundColor: isDone ? habit.color : undefined }}
                      />
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Expanded Habit View Modal */}
      <AnimatePresence>
        {selectedHabit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHabit(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: selectedHabit.color }}
                  >
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedHabit.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">{selectedHabit.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleToggleArchiveHabit(selectedHabit.id, selectedHabit.is_archived)}
                    className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => deleteHabit(selectedHabit.id, e)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedHabit(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Stats Column */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                          <Flame className="w-4 h-4 fill-orange-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Streak</span>
                        </div>
                        <div className="text-2xl font-black text-orange-700">{getStreak(selectedHabit.id)}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Trophy className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
                        </div>
                        <div className="text-2xl font-black text-blue-700">{logs.filter(l => l.habit_id === selectedHabit.id).length}</div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Habit Info</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Started</span>
                          <span className="font-bold text-slate-900">{format(parseISO(selectedHabit.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Type</span>
                          <Badge variant={selectedHabit.type === 'build' ? 'Success' : 'Cancel'} className="uppercase text-[10px]">
                            {selectedHabit.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Column */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-bca-blue" />
                        Consistency Calendar
                      </h4>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-bold text-slate-900 min-w-[120px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase py-2">{day}</div>
                      ))}
                      {getMonthlyStats(selectedHabit.id).days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const log = logs.find(l => l.habit_id === selectedHabit.id && l.completed_at === dateStr);
                        const isDone = !!log;
                        const hasComment = log?.comment;
                        
                        return (
                          <div 
                            key={dateStr}
                            onClick={() => setCommentingLog({ date: dateStr, habitId: selectedHabit.id, comment: log?.comment || '' })}
                            className={cn(
                              "aspect-square rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group",
                              isDone ? "text-white shadow-sm" : "bg-slate-50 text-slate-400 hover:bg-slate-100",
                              isToday(day) && !isDone ? "ring-2 ring-bca-blue ring-offset-2" : ""
                            )}
                            style={{ backgroundColor: isDone ? selectedHabit.color : undefined }}
                          >
                            <span className="text-xs font-bold">{format(day, 'd')}</span>
                            {hasComment && (
                              <div className="absolute top-1 right-1">
                                <AlertCircle className={cn("w-3 h-3", isDone ? "text-white/80" : "text-amber-500")} />
                              </div>
                            )}
                            
                            {/* Hover Preview */}
                            {hasComment && (
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                <div className="font-bold mb-1 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" /> Review:
                                </div>
                                {hasComment}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comment Modal */}
      <AnimatePresence>
        {commentingLog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommentingLog(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Daily Review</h3>
                    <p className="text-sm text-slate-500 font-medium">{format(parseISO(commentingLog.date), 'EEEE, MMMM d')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-bca-blue/5 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-bca-blue" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Thoughts / Notes</label>
                    <TextArea 
                      placeholder="How did it go today? Any obstacles or wins?"
                      value={commentingLog.comment}
                      onChange={e => setCommentingLog({ ...commentingLog, comment: e.target.value })}
                      className="min-h-[150px] text-base"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setCommentingLog(null)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSaveComment} className="flex-1 shadow-lg shadow-bca-blue/20">Save Review</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Create New Habit</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setNewHabit({ ...newHabit, type: 'build' })}
                      className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all", newHabit.type === 'build' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}
                    >
                      Build
                    </button>
                    <button 
                      onClick={() => setNewHabit({ ...newHabit, type: 'break' })}
                      className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all", newHabit.type === 'break' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400")}
                    >
                      Break
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Habit Name</label>
                    <Input 
                      placeholder="e.g., Morning Meditation" 
                      value={newHabit.name}
                      onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                    <Input 
                      placeholder="Why is this important?" 
                      value={newHabit.description}
                      onChange={e => setNewHabit({ ...newHabit, description: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pick a Color</label>
                    <div className="flex flex-wrap gap-3 p-1">
                      {HABIT_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setNewHabit({ ...newHabit, color: c.value })}
                          className={cn(
                            "w-10 h-10 rounded-full transition-all flex items-center justify-center border-2",
                            newHabit.color === c.value 
                              ? "border-slate-900 scale-110 shadow-lg" 
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: c.value }}
                        >
                          {newHabit.color === c.value && <CheckCircle2 className="w-5 h-5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setIsAdding(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleCreateHabit} className="flex-1 shadow-lg shadow-bca-blue/20">Create Habit</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
