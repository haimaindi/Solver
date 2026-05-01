import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  X,
  Trophy,
  Flag,
  ArrowRight,
  ArrowLeft,
  Archive
} from 'lucide-react';
import { supabase, Goal, Milestone } from '@/src/lib/supabase';
import { GlassCard, Button, Input, TextArea, Select } from './UI';
import { format, parseISO } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';
import confetti from 'canvas-confetti';

const CATEGORIES = ['Career', 'Financial', 'Health', 'Personal', 'Relationship', 'Spiritual'];

export function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | Partial<Milestone> | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    category: 'Career',
    description: '',
    target_date: ''
  });

  useEffect(() => {
    fetchGoals();
  }, [showArchived]);

  const fetchGoals = async () => {
    setIsLoading(true);
    const userId = localStorage.getItem('user_id');
    if (!userId || userId === 'unknown') return;

    const { data: fetchedGoals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', showArchived)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
      return;
    }

    if (fetchedGoals) {
      setGoals(fetchedGoals);
      // Fetch milestones for all goals
      const goalIds = fetchedGoals.map(g => g.id);
      if (goalIds.length > 0) {
        const { data: fetchedMilestones } = await supabase
          .from('milestones')
          .select('*')
          .in('goal_id', goalIds)
          .order('order_index', { ascending: true });
        
        if (fetchedMilestones) {
          const mlMap: Record<string, Milestone[]> = {};
          fetchedMilestones.forEach(m => {
            if (!mlMap[m.goal_id]) mlMap[m.goal_id] = [];
            mlMap[m.goal_id].push(m);
          });
          setMilestones(mlMap);
        }
      }
    }
    setIsLoading(false);
  };

  const handleAddGoal = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newGoal.title) return;

    try {
      const userId = localStorage.getItem('user_id');
      if (!userId || userId === 'unknown') throw new Error('No valid session. Please log in again.');

      const { data, error } = await supabase
        .from('goals')
        .insert([{
          user_id: userId,
          title: newGoal.title,
          category: newGoal.category,
          description: newGoal.description || null,
          target_date: newGoal.target_date || null
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setGoals([data, ...goals]);
        setMilestones({ ...milestones, [data.id]: [] });
        setIsAdding(false);
        setSelectedGoal(data);
        setNewGoal({ title: '', category: 'Career', description: '', target_date: '' });
        Swal.fire({
          title: 'Goal Set!',
          text: "Every big journey begins with a small step.",
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } catch (err: any) {
      console.error('Goal creation failed:', err);
      Swal.fire('Error', err.message || 'Failed to add goal', 'error');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const result = await Swal.fire({
      title: 'Drop this goal?',
      text: "You can archive it or delete it completely.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Archive',
      cancelButtonText: 'Delete',
      confirmButtonColor: '#003399',
      cancelButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      // Archive
      const { error } = await supabase
        .from('goals')
        .update({ is_archived: true })
        .eq('id', id);
      if (!error) {
        setGoals(goals.filter(g => g.id !== id));
      }
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      // Delete
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      if (!error) {
        setGoals(goals.filter(g => g.id !== id));
      }
    }
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !editingMilestone?.title?.trim()) return;

    if ('id' in editingMilestone && editingMilestone.id) {
      // Update existing
      const { data, error } = await supabase
        .from('milestones')
        .update({
          title: editingMilestone.title.trim(),
          description: editingMilestone.description || null,
          target_date: editingMilestone.target_date || null
        })
        .eq('id', editingMilestone.id)
        .select()
        .single();

      if (!error && data) {
        const newMs = (milestones[selectedGoal.id] || []).map(m => m.id === data.id ? data : m);
        setMilestones({ ...milestones, [selectedGoal.id]: newMs });
        setEditingMilestone(null);
      }
    } else {
      // Create new
      const currentMilestones = milestones[selectedGoal.id] || [];
      const { data, error } = await supabase
        .from('milestones')
        .insert([{
          goal_id: selectedGoal.id,
          title: editingMilestone.title.trim(),
          description: editingMilestone.description || null,
          target_date: editingMilestone.target_date || null,
          order_index: currentMilestones.length
        }])
        .select()
        .single();

      if (!error && data) {
        setMilestones({
          ...milestones,
          [selectedGoal.id]: [...currentMilestones, data]
        });
        setEditingMilestone(null);
      }
    }
  };

  const handleToggleMilestone = async (milestone: Milestone, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { data, error } = await supabase
      .from('milestones')
      .update({ is_completed: !milestone.is_completed })
      .eq('id', milestone.id)
      .select()
      .single();

    if (!error && data) {
      if (data.is_completed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#003399', '#facc15', '#4ade80']
        });
      }
      const newMs = (milestones[milestone.goal_id] || []).map(m => m.id === data.id ? data : m);
      setMilestones({ ...milestones, [milestone.goal_id]: newMs });
    }
  };

  const handleDeleteMilestone = async (milestone: Milestone, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { error } = await supabase.from('milestones').delete().eq('id', milestone.id);
    if (!error) {
      const newMs = (milestones[milestone.goal_id] || []).filter(m => m.id !== milestone.id);
      setMilestones({ ...milestones, [milestone.goal_id]: newMs });
    }
  };

  const getProgress = (goalId: string) => {
    const ms = milestones[goalId] || [];
    if (ms.length === 0) return 0;
    const completed = ms.filter(m => m.is_completed).length;
    return Math.round((completed / ms.length) * 100);
  };

  if (isAdding) {
    return (
      <div className="space-y-6 pb-32">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create New Goal</h2>
            <p className="text-slate-500 mt-1">Set your sights on something meaningful.</p>
          </div>
        </div>

        <GlassCard className="p-8 lg:p-10 max-w-4xl mx-auto shadow-xl border-white/50">
          <form id="addGoalForm" onSubmit={handleAddGoal} className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-bca-blue" />
                What do you want to achieve?
              </label>
              <Input 
                placeholder="e.g., Become a Senior Developer" 
                className="h-16 text-lg w-full bg-slate-50 border-slate-200 focus:bg-white"
                value={newGoal.title}
                onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Category</label>
                <Select 
                  value={newGoal.category}
                  onChange={e => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="h-14 w-full bg-slate-50"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Target Date (Optional)</label>
                <Input 
                  type="date" 
                  className="h-14 w-full text-slate-700 bg-slate-50"
                  value={newGoal.target_date}
                  onChange={e => setNewGoal({ ...newGoal, target_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Flag className="w-4 h-4 text-bca-blue" />
                Why is this important? (Context)
              </label>
              <TextArea 
                placeholder="Describe why this matters to you and what it looks like..." 
                className="min-h-[160px] w-full text-base bg-slate-50 border-slate-200 focus:bg-white p-4"
                value={newGoal.description}
                onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-8 border-t border-slate-100">
              <Button 
                type="submit" 
                disabled={!newGoal.title}
                className="h-14 px-10 text-lg rounded-xl min-w-[200px] shadow-lg shadow-bca-blue/20"
              >
                Save Goal
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 relative">

      {!selectedGoal && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {showArchived ? 'Archived Goals' : 'Goals'}
            </h2>
            <p className="text-slate-500 mt-1">Map your dreams into achievable milestones.</p>
          </div>
          <div className="flex justify-end items-center gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "p-3 rounded-xl transition-colors shadow-sm",
                showArchived ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              title={showArchived ? "Show Active Goals" : "Show Archived Goals"}
            >
              <Archive className="w-5 h-5" />
            </button>
            {!showArchived && (
              <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 h-11 px-6">
                <Plus className="w-4 h-4" />
                <span>New Goal</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Goal List */}
      {!selectedGoal && (
        <>
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Goals...</div>
          ) : goals.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No {showArchived ? 'archived ' : ''}goals yet</h3>
              <p className="text-slate-500">What's the next big thing you want to achieve?</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {goals.map(goal => {
            const progress = getProgress(goal.id);
            const ms = milestones[goal.id] || [];
            
            return (
              <motion.div layout key={goal.id}>
                <GlassCard 
                  className={cn(
                    "p-5 cursor-pointer hover:shadow-xl transition-all h-full flex flex-col",
                    selectedGoal?.id === goal.id ? "ring-2 ring-bca-blue shadow-lg bg-bca-blue/5" : ""
                  )}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-tighter shadow-sm">
                      {goal.category}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 uppercase tracking-tighter line-clamp-2">
                    {goal.title}
                  </h3>
                  
                  <div className="mt-auto pt-4 space-y-3 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                      <span className="text-xl font-black text-slate-700">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn(
                          "h-full rounded-full",
                          progress === 100 ? "bg-emerald-500" : "bg-bca-blue"
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{ms.filter(m => m.is_completed).length} / {ms.length} milestones</span>
                      {goal.target_date && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {format(parseISO(goal.target_date), 'MMM yy')}</span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
      </>
      )}

      {/* Selected Goal Details Mode */}
      <AnimatePresence>
        {selectedGoal && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="mt-8 pt-8 border-t-2 border-slate-200/50"
          >
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <GlassCard className="p-6 sm:p-8 bg-gradient-to-br from-white to-slate-50 border-white/50">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-6 shadow-inner border border-indigo-100">
                    <Target className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-tight">
                    {selectedGoal.title}
                  </h2>
                  <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed">
                    {selectedGoal.description || "No description provided."}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Date</span>
                      <span className="text-sm font-bold text-slate-700">
                        {selectedGoal.target_date ? format(parseISO(selectedGoal.target_date), 'MMM dd, yyyy') : 'No target'}
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="ghost" onClick={() => setSelectedGoal(null)} className="w-full mt-6 flex gap-2 border border-slate-200 hover:bg-slate-100">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </Button>
                </GlassCard>
              </div>

              <div className="w-full lg:w-2/3">
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-bca-blue" />
                        Milestone Journey
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Map the path to your goal</p>
                    </div>
                    <Button onClick={() => setEditingMilestone({ title: '', target_date: '', description: '' })} className="h-10 px-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {!(milestones[selectedGoal.id] && milestones[selectedGoal.id].length > 0) && !editingMilestone && (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-500 font-bold text-sm">No milestones mapped.</p>
                        <p className="text-slate-400 text-xs mt-1">What's the very first microachievement?</p>
                      </div>
                    )}
                    
                    <div className="relative">
                      {milestones[selectedGoal.id]?.length > 0 && (
                        <div className="absolute left-[39px] top-6 bottom-4 w-0.5 bg-slate-200" />
                      )}
                      <div className="space-y-4">
                        {milestones[selectedGoal.id]?.map((milestone, i) => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const isOverdue = !milestone.is_completed && milestone.target_date && milestone.target_date < todayStr;
                          
                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={milestone.id}
                              onClick={() => setEditingMilestone(milestone)}
                              className={cn(
                                "flex items-start gap-5 p-4 lg:p-5 rounded-2xl border transition-all cursor-pointer group relative bg-white",
                                milestone.is_completed ? "border-emerald-100 shadow-sm" : isOverdue ? "border-rose-300 shadow-md bg-rose-50/30 ring-1 ring-rose-100" : "border-slate-200 hover:border-bca-blue/30 hover:shadow-md"
                              )}
                            >
                              <div className="relative z-10 pt-1 shrink-0 bg-white group-hover:bg-transparent rounded-full px-1">
                                <button 
                                  onClick={(e) => handleToggleMilestone(milestone, e)}
                                  className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-full transition-all border-2",
                                    milestone.is_completed 
                                      ? "text-white bg-emerald-500 border-emerald-500" 
                                      : isOverdue 
                                        ? "text-rose-500 border-rose-300 bg-white hover:bg-rose-50"
                                        : "text-slate-300 border-slate-200 bg-white hover:text-bca-blue hover:border-bca-blue/30"
                                  )}
                                >
                                  {milestone.is_completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                                </button>
                              </div>
                              
                              <div className="flex-1 min-w-0 pr-8">
                                <p className={cn(
                                  "text-sm sm:text-base font-bold transition-colors leading-tight mb-1",
                                  milestone.is_completed ? "text-slate-400 line-through" : isOverdue ? "text-rose-700" : "text-slate-800"
                                )}>
                                  {milestone.title}
                                </p>
                                
                                {milestone.description && (
                                  <p className={cn(
                                    "text-xs font-medium line-clamp-2 mt-1",
                                    milestone.is_completed ? "text-slate-400/70" : isOverdue ? "text-rose-600/80" : "text-slate-500"
                                  )}>
                                    {milestone.description}
                                  </p>
                                )}
                                
                                {milestone.target_date && (
                                  <div className={cn(
                                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mt-3",
                                    milestone.is_completed ? "text-emerald-500" : isOverdue ? "text-rose-500" : "text-bca-blue"
                                  )}>
                                    <Calendar className="w-3 h-3" />
                                    {format(parseISO(milestone.target_date), 'MMM dd, yyyy')}
                                    {isOverdue && <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">Overdue</span>}
                                  </div>
                                )}
                              </div>

                              <button 
                                onClick={(e) => handleDeleteMilestone(milestone, e)}
                                className="absolute right-4 top-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {getProgress(selectedGoal.id) === 100 && milestones[selectedGoal.id]?.length > 0 && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center"
                    >
                      <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <h4 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">Goal Achieved!</h4>
                      <p className="text-emerald-700 mt-1 font-medium">You have completed all milestones for this goal. Outstanding execution.</p>
                    </motion.div>
                  )}
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing Milestone Modal */}
      <AnimatePresence>
        {editingMilestone !== null && selectedGoal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {'id' in editingMilestone && editingMilestone.id ? 'Edit Milestone' : 'New Milestone'}
                </h3>
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <form id="editMilestoneForm" onSubmit={handleSaveMilestone} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Milestone Title</label>
                    <Input 
                      placeholder="e.g., Complete UI Design" 
                      className="h-12 w-full font-medium"
                      value={editingMilestone.title || ''}
                      onChange={e => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Target Date</label>
                    <Input 
                      type="date"
                      className="h-12 w-full text-slate-700"
                      value={editingMilestone.target_date || ''}
                      onChange={e => setEditingMilestone({ ...editingMilestone, target_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Description</label>
                    <TextArea 
                      placeholder="Details about what needs to be done..." 
                      className="min-h-[100px] w-full"
                      value={editingMilestone.description || ''}
                      onChange={e => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-3xl shrink-0">
                <Button type="button" variant="ghost" onClick={() => setEditingMilestone(null)} className="px-6 h-11">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="editMilestoneForm"
                  disabled={!editingMilestone.title?.trim()}
                  className="px-8 h-11 shadow-md shadow-bca-blue/20"
                >
                  Save Milestone
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
