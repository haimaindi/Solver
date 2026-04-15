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
  Settings2
} from 'lucide-react';
import { Habit, HabitLog, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge } from './UI';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isToday, startOfToday } from 'date-fns';
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newHabit, setNewHabit] = useState<Partial<Habit>>({
    name: '',
    description: '',
    type: 'build',
    color: '#003399'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').order('created_at', { ascending: false }),
      supabase.from('habit_logs').select('*')
    ]);

    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
  };

  const handleCreateHabit = async () => {
    if (!newHabit.name) return;

    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticHabit: Habit = {
      ...newHabit as Habit,
      id: tempId,
      created_at: new Date().toISOString(),
      user_id: null
    };
    setHabits([optimisticHabit, ...habits]);
    setIsAdding(false);

    const { data, error } = await supabase
      .from('habits')
      .insert([newHabit])
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

  const toggleHabit = async (habitId: string) => {
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

  const deleteHabit = async (id: string) => {
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

  const getMonthlyStats = (habitId: string) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const completedDates = new Set(logs.filter(l => l.habit_id === habitId).map(l => l.completed_at));
    
    return { days, completedDates };
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Habit Tracker</h2>
          <p className="text-slate-500 mt-1">Consistency is the key to mastery. Track your progress daily.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 h-11 px-6">
          <Plus className="w-4 h-4" />
          <span>Add New Habit</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Focus */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-bca-blue" />
              Today's Focus
            </h3>
            <Badge variant="Success" className="bg-bca-blue/10 text-bca-blue">
              {logs.filter(l => l.completed_at === format(startOfToday(), 'yyyy-MM-dd')).length} / {habits.length} Done
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map(habit => {
              const isDoneToday = logs.some(l => l.habit_id === habit.id && l.completed_at === format(startOfToday(), 'yyyy-MM-dd'));
              const streak = getStreak(habit.id);
              
              return (
                <GlassCard 
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={cn(
                    "p-6 cursor-pointer transition-all border-2",
                    isDoneToday ? "border-bca-blue bg-bca-blue/5" : "border-transparent hover:border-slate-200"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900">{habit.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{habit.description}</p>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isDoneToday ? "bg-bca-blue text-white animate-check" : "bg-slate-100 text-slate-300"
                    )}>
                      {isDoneToday ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-orange-500">
                      <Flame className={cn("w-4 h-4", streak > 0 ? "fill-orange-500" : "")} />
                      <span className="text-sm font-bold">{streak} Day Streak</span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(7)].map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isDone = logs.some(l => l.habit_id === habit.id && l.completed_at === dateStr);
                        return (
                          <div 
                            key={i} 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              isDone ? "bg-bca-blue" : "bg-slate-200"
                            )} 
                          />
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Monthly Insights */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-bca-blue" />
            Monthly Progress
          </h3>
          
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {habits.map(habit => {
                const { days, completedDates } = getMonthlyStats(habit.id);
                return (
                  <div key={habit.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">{habit.name}</span>
                      <span className="text-[10px] text-slate-400">{Math.round((completedDates.size / days.length) * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isDone = completedDates.has(dateStr);
                        return (
                          <div 
                            key={dateStr}
                            title={dateStr}
                            className={cn(
                              "aspect-square rounded-sm transition-all",
                              isDone ? "" : "bg-slate-100",
                              isToday(day) && !isDone ? "ring-2 ring-slate-300" : ""
                            )}
                            style={{ backgroundColor: isDone ? habit.color : undefined }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Create New Habit</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setNewHabit({ ...newHabit, type: 'build' })}
                      className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", newHabit.type === 'build' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}
                    >
                      Build
                    </button>
                    <button 
                      onClick={() => setNewHabit({ ...newHabit, type: 'break' })}
                      className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", newHabit.type === 'break' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400")}
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
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                    <Input 
                      placeholder="Why is this important?" 
                      value={newHabit.description}
                      onChange={e => setNewHabit({ ...newHabit, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pick a Color</label>
                    <div className="flex gap-3">
                      {HABIT_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setNewHabit({ ...newHabit, color: c.value })}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all",
                            newHabit.color === c.value ? "ring-4 ring-slate-100 scale-110" : "hover:scale-105"
                          )}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setIsAdding(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleCreateHabit} className="flex-1">Create Habit</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
