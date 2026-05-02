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
  Archive,
  Share2,
  Users,
  Zap
} from 'lucide-react';
import { Habit, HabitLog, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, TextArea } from './UI';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isToday, startOfToday, differenceInDays, parseISO } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';
import { AccessManagerModal } from './AccessManagerModal';

const HABIT_COLORS = [
  { name: 'Blue', value: '#003399' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' }
];

interface HabitTrackerProps {
  prefillHabitId?: string | null;
  onPrefillHandled?: () => void;
}

export function HabitTracker({ prefillHabitId, onPrefillHandled }: HabitTrackerProps) {
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
  const [showShared, setShowShared] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [sharingResourceId, setSharingResourceId] = useState<string | null>(null);
  const [sharingResourceLabel, setSharingResourceLabel] = useState<string>('');
  const [commentingLog, setCommentingLog] = useState<{ date: string, habitId: string, comment: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [showArchived, showShared]);

  useEffect(() => {
    if (prefillHabitId && habits.length > 0) {
      const habit = habits.find(h => h.id === prefillHabitId);
      if (habit) {
        setSelectedHabit(habit);
        onPrefillHandled?.();
      }
    }
  }, [prefillHabitId, habits]);

  const fetchData = async () => {
    const currentUser = localStorage.getItem('user_id');
    const solverId = localStorage.getItem('solver_id');
    if (!currentUser || currentUser === 'unknown') return;
    
    if (showShared) {
      const { data: sharedEntries } = await supabase
        .from('resource_shares')
        .select('shared_by, resource_id')
        .eq('module_name', 'habits')
        .eq('shared_with_solver_id', solverId);
      
      if (!sharedEntries || sharedEntries.length === 0) {
        setHabits([]);
        setLogs([]);
        return;
      }
      
      const moduleWideOwnerIds = sharedEntries.filter(s => !s.resource_id).map(s => s.shared_by);
      const specificResourceIds = sharedEntries.filter(s => s.resource_id).map(s => s.resource_id);

      let data: Habit[] = [];
      
      // Fetch module-wide shared
      if (moduleWideOwnerIds.length > 0) {
        const { data: moduleData } = await supabase
          .from('habits')
          .select('*')
          .in('user_id', moduleWideOwnerIds)
          .eq('is_archived', false);
        if (moduleData) data = [...data, ...moduleData];
      }

      // Fetch specific shared
      if (specificResourceIds.length > 0) {
        const { data: specificData } = await supabase
          .from('habits')
          .select('*')
          .in('id', specificResourceIds)
          .eq('is_archived', false);
        if (specificData) {
          const existingIds = new Set(data.map(h => h.id));
          const uniqueSpecific = specificData.filter(h => !existingIds.has(h.id));
          data = [...data, ...uniqueSpecific];
        }
      }

      const finalHabits = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHabits(finalHabits);
      
      if (finalHabits.length > 0) {
        const { data: grabbedLogs } = await supabase
          .from('habit_logs')
          .select('*')
          .in('habit_id', finalHabits.map(h => h.id));
        if (grabbedLogs) setLogs(grabbedLogs);
      }
      return;
    }

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
      Swal.fire({
        title: 'Success',
        text: `Habit ${!isCurrentlyArchived ? 'archived' : 'unarchived'}`,
        icon: 'success',
        toast: true,
        backdrop: false,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
      if (selectedHabit) setSelectedHabit(null);
    } else {
      Swal.fire('Error', 'Failed to update habit status', 'error');
    }
  };

  const handleCreateHabit = async () => {
    if (!newHabit.name) return;
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser || currentUser === 'unknown') {
      Swal.fire('Error', 'Authentication error. Please re-login.', 'error');
      return;
    }

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

  const toggleHabit = async (habitId: string, e?: React.MouseEvent, targetDateStr?: string) => {
    if (e) e.stopPropagation();
    
    const targetDate = targetDateStr || format(startOfToday(), 'yyyy-MM-dd');
    const existingLog = logs.find(l => l.habit_id === habitId && l.completed_at === targetDate);

    // Optimistic Update
    const originalLogs = [...logs];
    if (existingLog) {
      const willBeCompleted = !existingLog.is_completed;
      
      // If unchecking AND no comment, delete for clean DB
      if (!willBeCompleted && !existingLog.comment) {
        setLogs(logs.filter(l => l.id !== existingLog.id));
        const { error } = await supabase.from('habit_logs').delete().eq('id', existingLog.id);
        if (error) {
          setLogs(originalLogs);
          Swal.fire('Error', 'Failed to update habit', 'error');
        }
      } else {
        setLogs(logs.map(l => l.id === existingLog.id ? { ...l, is_completed: willBeCompleted } : l));
        const { error } = await supabase
          .from('habit_logs')
          .update({ is_completed: willBeCompleted })
          .eq('id', existingLog.id);
        
        if (error) {
          setLogs(originalLogs);
          Swal.fire('Error', 'Failed to update habit', 'error');
        }
      }
    } else {
      const tempId = Math.random().toString();
      const newLog: HabitLog = {
        id: tempId,
        habit_id: habitId,
        completed_at: targetDate,
        is_completed: true,
        created_at: new Date().toISOString()
      };
      setLogs([...logs, newLog]);
      const { data, error } = await supabase.from('habit_logs').insert([{ habit_id: habitId, completed_at: targetDate, is_completed: true }]).select().single();
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
      // Create new log with comment but not necessarily completed
      const tempId = Math.random().toString();
      const newLog: HabitLog = {
        id: tempId,
        habit_id: habitId,
        completed_at: date,
        comment,
        is_completed: false, // Saving a comment doesn't force "Checked" status
        created_at: new Date().toISOString()
      };
      setLogs([...logs, newLog]);
      
      const { data, error } = await supabase
        .from('habit_logs')
        .insert([{ habit_id: habitId, completed_at: date, comment, is_completed: false }])
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
      if (!error) {
        if (selectedHabit) setSelectedHabit(null);
      } else {
        setHabits(originalHabits);
        Swal.fire('Error', 'Failed to delete habit', 'error');
      }
    }
  };

  const getStreak = (habitId: string) => {
    let streak = 0;
    let checkDate = startOfToday();
    
    const completedDates = new Set(
      logs
        .filter(l => l.habit_id === habitId && l.is_completed)
        .map(l => l.completed_at)
    );

    while (completedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = new Date(checkDate.setDate(checkDate.getDate() - 1));
    }
    
    return streak;
  };

  const getCompletionStats = (habit: Habit) => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id && l.is_completed);
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
    <div className="space-y-8 relative">

      {/* Access Manager Modal */}
      <AccessManagerModal 
        isOpen={isAccessModalOpen} 
        onClose={() => setIsAccessModalOpen(false)} 
        moduleName="habits" 
        resourceId={null}
      />
      <AccessManagerModal 
        isOpen={!!sharingResourceId}
        onClose={() => {
          setSharingResourceId(null);
          setSharingResourceLabel('');
        }}
        moduleName="habits"
        resourceId={sharingResourceId}
        resourceLabel={sharingResourceLabel}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left md:text-left">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center justify-start md:justify-start gap-3">
            <TrendingUp className="w-8 h-8 text-bca-blue" />
            {showShared ? 'Shared Habits' : (showArchived ? 'Archived Habits' : 'Habit')}
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Consistency is the key to mastery. Track your progress daily.</p>
        </div>
        <div className="flex justify-end items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
                onClick={() => { setShowArchived(false); setShowShared(true); }}
                className={cn(
                   "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                   showShared ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                )}
             >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Shared</span>
             </button>
             <button 
                onClick={() => { setShowArchived(true); setShowShared(false); }}
                className={cn(
                   "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                   showArchived && !showShared ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                )}
             >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Archived</span>
             </button>
             <button 
                onClick={() => { setShowArchived(false); setShowShared(false); }}
                className={cn(
                   "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                   !showArchived && !showShared ? "bg-white text-bca-blue shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                )}
             >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">My Habits</span>
             </button>
          </div>
          
          {(!showArchived && !showShared) && (
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
                  {showArchived && habit.user_id === localStorage.getItem('user_id') && (
                    <button 
                      onClick={(e) => handleToggleArchiveHabit(habit.id, habit.is_archived || false)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-green-100 text-green-600 hover:bg-green-200"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  )}
                  {habit.user_id === localStorage.getItem('user_id') && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSharingResourceId(habit.id);
                          setSharingResourceLabel(habit.name);
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        title="Share Habit"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
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
                    </>
                  )}
                  {showArchived && habit.user_id === localStorage.getItem('user_id') && (
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
              className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-x-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: selectedHabit.color }}
                  >
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {selectedHabit.user_id === localStorage.getItem('user_id') && (
                    <button 
                      onClick={() => {
                        setSharingResourceId(selectedHabit.id);
                        setSharingResourceLabel(selectedHabit.name);
                      }}
                      className="p-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                      title="Share Habit"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  )}
                  {selectedHabit.user_id === localStorage.getItem('user_id') && (
                    <>
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
                    </>
                  )}
                  <button 
                    onClick={() => setSelectedHabit(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {/* NEW SECTION FOR TITLE AND DESCRIPTION */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900">{selectedHabit.name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{selectedHabit.description}</p>
                </div>

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
                        const isDone = log?.is_completed ?? false;
                        const hasComment = log?.comment;
                        
                        return (
                          <div 
                            key={dateStr}
                            onClick={() => {
                              setCommentingLog({ date: dateStr, habitId: selectedHabit.id, comment: log?.comment || '' });
                            }}
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
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thoughts / Notes</label>
                    <TextArea 
                      placeholder={selectedHabit.user_id === localStorage.getItem('user_id') ? "How did it go today? Any obstacles or wins?" : "No notes for today."}
                      value={commentingLog.comment}
                      readOnly={selectedHabit.user_id !== localStorage.getItem('user_id')}
                      onChange={e => setCommentingLog({ ...commentingLog, comment: e.target.value })}
                      className="min-h-[150px] text-base"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                   {commentingLog && selectedHabit.user_id === localStorage.getItem('user_id') && (
                     <Button 
                       onClick={() => toggleHabit(commentingLog.habitId, undefined, commentingLog.date)}
                       variant="ghost"
                       className={cn(
                         "h-12 rounded-xl text-sm font-bold border-2",
                         logs.some(l => l.habit_id === commentingLog.habitId && l.completed_at === commentingLog.date && l.is_completed)
                           ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                           : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                       )}
                     >
                       {logs.some(l => l.habit_id === commentingLog.habitId && l.completed_at === commentingLog.date && l.is_completed) ? 'Uncheck' : 'Check'}
                     </Button>
                   )}
                   <div className="grid grid-cols-2 gap-3">
                     <Button variant="ghost" onClick={() => setCommentingLog(null)} className="h-12 rounded-xl font-bold">{selectedHabit.user_id === localStorage.getItem('user_id') ? 'Cancel' : 'Close'}</Button>
                     {selectedHabit.user_id === localStorage.getItem('user_id') && (
                       <Button onClick={handleSaveComment} className="h-12 rounded-xl font-bold shadow-lg shadow-bca-blue/20">Save Changes</Button>
                     )}
                   </div>
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
