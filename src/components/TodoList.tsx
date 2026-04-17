import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Archive, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid,
  Calendar,
  ArrowLeft,
  Check,
  AlignLeft,
  AlertCircle,
  Copy,
  PlusCircle,
  Eye,
  Zap,
  ChevronDown,
  Pencil
} from 'lucide-react';
import { Todo, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, TextArea, Badge } from './UI';
import { format, startOfToday, addDays, parseISO, isSameDay, isBefore } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';

interface TodoListProps {
  prefillData?: { task: string; description: string; date: string } | null;
  onPrefillHandled?: () => void;
}

export function TodoList({ prefillData, onPrefillHandled }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedDateStr, setSelectedDateStr] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detail View State
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [targetTime, setTargetTime] = useState('09:00');
  const [impactLevel, setImpactLevel] = useState<'High' | 'Low'>('High');
  const [effortLevel, setEffortLevel] = useState<'High' | 'Low'>('Low');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [viewingTodo, setViewingTodo] = useState<Todo | null>(null);

  useEffect(() => {
    fetchTodos();
  }, [showArchived]);

  useEffect(() => {
    if (prefillData) {
      setNewTask(prefillData.task);
      setNewDescription(prefillData.description);
      setSelectedDateStr(prefillData.date);
      setImpactLevel('High');
      setEffortLevel('Low');
      setViewMode('detail');
      onPrefillHandled?.();
    }
  }, [prefillData]);

  const fetchTodos = async () => {
    setIsLoading(true);
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser || currentUser === 'unknown') {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', currentUser)
        .eq('is_archived', showArchived)
        .order('date', { ascending: false })
        .order('target_time', { ascending: true });

      if (data) setTodos(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedTodos = useMemo(() => {
    const groups: Record<string, Todo[]> = {};
    todos.forEach(todo => {
      if (!groups[todo.date]) groups[todo.date] = [];
      groups[todo.date].push(todo);
    });
    return groups;
  }, [todos]);

  const datesList = useMemo(() => {
    return Object.keys(groupedTodos).sort((a, b) => b.localeCompare(a));
  }, [groupedTodos]);

  const handleCreateTodo = async () => {
    if (!newTask) return;
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser || currentUser === 'unknown') {
      Swal.fire('Error', 'Authentication error. Please re-login.', 'error');
      return;
    }
    
    const newTodo = {
      user_id: currentUser,
      task: newTask,
      description: newDescription,
      target_time: targetTime,
      completed: false,
      date: selectedDateStr,
      is_archived: false,
      impact_level: impactLevel,
      effort_level: effortLevel
    };

    if (editingTodoId) {
      const { data, error } = await supabase
        .from('todos')
        .update(newTodo)
        .eq('id', editingTodoId)
        .select()
        .single();
      
      if (data) {
        setTodos(prev => prev.map(t => t.id === editingTodoId ? data : t));
        setEditingTodoId(null);
        resetForm();
        Swal.fire({ title: 'Task Updated', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    } else {
      const { data, error } = await supabase.from('todos').insert([newTodo]).select().single();
      if (data) {
        setTodos([...todos, data]);
        resetForm();
        Swal.fire({ title: 'Task Added', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    }
  };

  const resetForm = () => {
    setNewTask('');
    setNewDescription('');
    setTargetTime('09:00');
    setImpactLevel('High');
    setEffortLevel('Low');
    setEditingTodoId(null);
  };

  const handleEditTodo = (todo: Todo) => {
    setNewTask(todo.task);
    setNewDescription(todo.description);
    setTargetTime(todo.target_time);
    setImpactLevel(todo.impact_level || 'High');
    setEffortLevel(todo.effort_level || 'Low');
    setEditingTodoId(todo.id);
    document.querySelector('.todo-form-top')?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTodo = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id);
    
    if (!error) {
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t));
    }
  };

  const deleteTodo = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Task?',
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (!error) {
        setTodos(prev => prev.filter(t => t.id !== id));
      }
    }
  };

  const handleBulkArchive = async (date: string) => {
    const result = await Swal.fire({
      title: showArchived ? 'Restore all tasks?' : 'Archive all tasks?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes'
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('todos')
        .update({ is_archived: !showArchived })
        .eq('date', date)
        .eq('is_archived', showArchived);
      
      if (!error) {
        fetchTodos();
        Swal.fire('Success', 'Action performed', 'success');
      }
    }
  };

  const handleBulkDelete = async (date: string) => {
    const result = await Swal.fire({
      title: 'Delete all tasks for this date?',
      text: "Permanent action!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('todos').delete().eq('date', date);
      if (!error) {
        fetchTodos();
        Swal.fire('Deleted', 'All tasks removed', 'success');
      }
    }
  };

  const copyTodo = async (todo: Todo) => {
    const { value: date } = await Swal.fire({
      title: 'Copy to Date',
      html: `
        <div class="text-sm text-slate-500 mb-2">Select target date for duplication</div>
      `,
      input: 'date',
      inputValue: todo.date,
      showCancelButton: true,
      confirmButtonText: 'Duplicate',
      confirmButtonColor: '#003399',
      width: '360px',
      customClass: {
        popup: 'rounded-3xl border-none shadow-2xl',
        title: 'text-xl font-black text-slate-800 pt-6',
        input: 'max-w-[240px] mx-auto rounded-xl border-slate-200 focus:ring-bca-blue text-center font-bold h-12 flex justify-center',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
      }
    });

    if (date) {
      const currentUser = localStorage.getItem('user_id');
      if (!currentUser) return;

      const { data, error } = await supabase.from('todos').insert([{
        user_id: currentUser,
        task: todo.task,
        description: todo.description,
        target_time: todo.target_time,
        completed: false,
        date: date,
        is_archived: false,
        impact_level: todo.impact_level || 'High',
        effort_level: todo.effort_level || 'Low'
      }]).select().single();

      if (data) {
        setTodos(prev => [...prev, data]);
        Swal.fire({
          title: 'Task Copied',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
      }
    }
  };

  const goToDate = (offset: number) => {
    const current = parseISO(selectedDateStr);
    const next = addDays(current, offset);
    setSelectedDateStr(format(next, 'yyyy-MM-dd'));
  };

  const selectedDateTodos = useMemo(() => {
    return todos.filter(t => t.date === selectedDateStr);
  }, [todos, selectedDateStr]);

  const completionRate = selectedDateTodos.length > 0
    ? Math.round((selectedDateTodos.filter(t => t.completed).length / selectedDateTodos.length) * 100)
    : 0;

  const isOverdue = (todo: Todo) => {
    if (todo.completed) return false;
    const today = format(startOfToday(), 'yyyy-MM-dd');
    if (todo.date < today) return true;
    if (todo.date === today) {
        const now = new Date();
        const nowStr = format(now, 'HH:mm');
        return todo.target_time < nowStr;
    }
    return false;
  };

  if (viewMode === 'detail') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('grid')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                Todo Detail
              </h2>
              <p className="text-sm md:text-base text-slate-500 font-medium">{format(parseISO(selectedDateStr), 'EEEE, MMMM d, yyyy')}</p>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Achievement</div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 md:w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                        className={cn(
                            "h-full transition-all duration-500",
                            completionRate <= 33 ? "bg-rose-500" : completionRate <= 66 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${completionRate}%` }}
                        />
                    </div>
                    <span className={cn(
                        "text-xs font-black",
                        completionRate <= 33 ? "text-rose-600" : completionRate <= 66 ? "text-amber-600" : "text-green-600"
                    )}>{completionRate}%</span>
                  </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => goToDate(-1)} variant="ghost" className="p-2 aspect-square"><ChevronLeft className="w-5 h-5" /></Button>
            <Button onClick={() => goToDate(1)} variant="ghost" className="p-2 aspect-square"><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>

        <GlassCard className="p-4 md:p-6 space-y-4 todo-form-top">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4">
                <div className="flex-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Task Title</div>
                    <Input 
                        value={newTask} 
                        onChange={e => setNewTask(e.target.value)} 
                        placeholder={editingTodoId ? "Update task..." : "What needs to be done?"} 
                        className="h-12"
                    />
                </div>
                <div className="sm:w-24 w-full flex-shrink-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Time</div>
                    <Input 
                        type="time" 
                        value={targetTime} 
                        onChange={e => setTargetTime(e.target.value)} 
                        className="h-12 text-center font-mono font-bold"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Impact Level</div>
                  <div className="flex bg-slate-100 p-1 rounded-xl h-12">
                     <button 
                        onClick={() => setImpactLevel('High')}
                        className={cn(
                          "flex-1 rounded-lg text-xs font-bold transition-all",
                          impactLevel === 'High' ? "bg-white text-bca-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                     >
                        High Impact
                     </button>
                     <button 
                        onClick={() => setImpactLevel('Low')}
                        className={cn(
                          "flex-1 rounded-lg text-xs font-bold transition-all",
                          impactLevel === 'Low' ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                     >
                        Low Impact
                     </button>
                  </div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Effort / Urgency</div>
                  <div className="flex bg-slate-100 p-1 rounded-xl h-12">
                     <button 
                        onClick={() => setEffortLevel('High')}
                        className={cn(
                          "flex-1 rounded-lg text-xs font-bold transition-all",
                          effortLevel === 'High' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                     >
                        High Effort
                     </button>
                     <button 
                        onClick={() => setEffortLevel('Low')}
                        className={cn(
                          "flex-1 rounded-lg text-xs font-bold transition-all",
                          effortLevel === 'Low' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                     >
                        Low Effort
                     </button>
                  </div>
               </div>
            </div>

            <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</div>
                <TextArea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Brief description of the task..."
                    className="min-h-[80px]"
                />
            </div>
            <div className="flex items-center justify-end pt-2 gap-3">
                {editingTodoId && (
                  <Button variant="ghost" onClick={resetForm} className="h-11 px-6">Cancel</Button>
                )}
                <Button 
                    onClick={handleCreateTodo} 
                    className="h-11 px-8 w-full md:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5 flex-shrink-0" />
                    <span>{editingTodoId ? 'Update Task' : 'Add Task'}</span>
                </Button>
            </div>
          </div>
        </GlassCard>

        {/* Matrix Header Labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/5 p-4 rounded-2xl border border-slate-200/50">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-bca-blue/10 flex items-center justify-center text-bca-blue">
                 <Zap className="w-4 h-4" />
              </div>
              <div>
                 <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase">Impact Focus</div>
                 <div className="text-sm font-bold text-slate-700">Strategic Value Matrix</div>
              </div>
           </div>
           <div className="hidden md:flex items-center justify-end gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-300" /> Low Effort
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-500" /> High Effort
              </div>
           </div>
        </div>

        {/* 2x2 Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* TOP LEFT: Top Priorities (High Impact, Low Effort) */}
           {renderMatrixCell(
             "Top Priorities", 
             "Immediate actions for maximum gain with minimal cost.",
             "bg-blue-50/50 hover:bg-blue-50 border-blue-200/50",
             "text-blue-700",
             "bg-blue-600",
             selectedDateTodos.filter(t => t.impact_level === 'High' && t.effort_level === 'Low')
           )}

           {/* TOP RIGHT: Second Priorities (High Impact, High Effort) */}
           {renderMatrixCell(
             "Second Priorities", 
             "Strategic projects requiring significant resource commitment.",
             "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/50",
             "text-emerald-700",
             "bg-emerald-600",
             selectedDateTodos.filter(t => t.impact_level === 'High' && t.effort_level === 'High')
           )}

           {/* BOTTOM LEFT: Delegates (Low Impact, Low Effort) */}
           {renderMatrixCell(
             "Delegates", 
             "Quick tasks that provide some value but can be offloaded.",
             "bg-amber-50/50 hover:bg-amber-50 border-amber-200/50",
             "text-amber-700",
             "bg-amber-600",
             selectedDateTodos.filter(t => t.impact_level === 'Low' && t.effort_level === 'Low')
           )}

           {/* BOTTOM RIGHT: Ignore", Low Impact, High Effort) */}
           {renderMatrixCell(
             "Ignore / Postpone", 
             "Low value tasks with high costs. Likely distractions.",
             "bg-rose-50/50 hover:bg-rose-50 border-rose-200/50",
             "text-rose-700",
             "bg-rose-600",
             selectedDateTodos.filter(t => (t.impact_level === 'Low' && t.effort_level === 'High') || (!t.impact_level && t.effort_level === 'High'))
           )}
        </div>

        {/* Read Only Modal */}
        <AnimatePresence>
           {viewingTodo && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                   <div className="p-8 space-y-6">
                      <div className="flex items-start justify-between">
                         <div className="space-y-1">
                            <Badge variant={viewingTodo.impact_level === 'High' ? 'Success' : 'Pending'}>
                               {viewingTodo.impact_level || 'Low'} Impact
                            </Badge>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight pt-2">
                               {viewingTodo.task}
                            </h3>
                         </div>
                         <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold font-mono">{viewingTodo.target_time}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effort / Urgency</div>
                            <div className="text-sm font-bold text-slate-700">{viewingTodo.effort_level || 'Low'}</div>
                         </div>
                         <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                            <div className="text-sm font-bold text-slate-700">{viewingTodo.completed ? 'Completed' : 'Not Started'}</div>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Details</div>
                         <div className="text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 min-h-[100px] whitespace-pre-wrap">
                            {viewingTodo.description || 'No description provided.'}
                         </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                         <Button 
                            className="flex-1 h-12 rounded-2xl gap-2"
                            onClick={() => {
                               toggleTodo(viewingTodo);
                               setViewingTodo(null);
                            }}
                         >
                            <CheckCircle2 className="w-5 h-5" />
                            {viewingTodo.completed ? 'Mark Uncomplete' : 'Mark Complete'}
                         </Button>
                         <Button 
                            variant="ghost" 
                            className="h-12 rounded-2xl px-6"
                            onClick={() => setViewingTodo(null)}
                         >
                            Close
                         </Button>
                      </div>
                   </div>
                </motion.div>
             </div>
           )}
        </AnimatePresence>
      </div>
    );
  }

  function renderMatrixCell(title: string, desc: string, styles: string, textStyle: string, dotStyle: string, items: Todo[]) {
    return (
      <GlassCard className={cn(
        "flex flex-col h-full min-h-[350px] transition-all border-2 overflow-hidden",
        styles
      )}>
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", dotStyle)} />
                <h4 className={cn("font-black tracking-tight text-lg uppercase", textStyle)}>{title}</h4>
             </div>
             <Badge variant="Pending" className="bg-white/80 border-none font-black">{items.length}</Badge>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{desc}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {items.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30 italic py-12">
                <LayoutGrid className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold">No tasks found</span>
             </div>
           ) : (
             items.map(todo => {
               const overdue = isOverdue(todo);
               return (
                 <div 
                   key={todo.id}
                   className="group relative"
                 >
                    <div 
                       onClick={() => setViewingTodo(todo)}
                       className={cn(
                          "w-full bg-white p-3 rounded-2xl border shadow-sm transition-all cursor-pointer hover:shadow-md flex items-center gap-3",
                          todo.completed ? "opacity-60 grayscale border-slate-100 bg-slate-50/50" : 
                          overdue ? "border-rose-100 ring-1 ring-rose-100" : "border-slate-100"
                       )}
                    >
                       <button 
                          onClick={(e) => { e.stopPropagation(); toggleTodo(todo); }}
                          className={cn(
                             "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all",
                             todo.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-200"
                          )}
                       >
                          {todo.completed && <Check className="w-3.5 h-3.5" />}
                       </button>

                       <div className="flex-1 min-w-0 pr-12">
                          <h5 className={cn(
                             "text-[13px] font-bold truncate tracking-tight",
                             todo.completed ? "text-slate-400 line-through" : "text-slate-900"
                          )}>
                             {todo.task}
                          </h5>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-[10px] font-medium text-slate-400 font-mono">{todo.target_time}</span>
                             {overdue && !todo.completed && (
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Overdue</span>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto bg-gradient-to-l from-white via-white to-transparent pl-4 py-1 pr-1">
                       <button 
                          onClick={(e) => { e.stopPropagation(); copyTodo(todo); }}
                          className="p-1.5 text-slate-400 hover:text-bca-blue transition-all"
                          title="Copy"
                       >
                          <Copy className="w-3.5 h-3.5" />
                       </button>
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleEditTodo(todo); }}
                          className="p-1.5 text-slate-400 hover:text-bca-blue transition-all"
                          title="Edit"
                       >
                          <Pencil className="w-3.5 h-3.5" />
                       </button>
                       <button 
                          onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-all"
                          title="Delete"
                       >
                          <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 </div>
               );
             })
           )}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {showArchived ? 'Archived To Do' : 'To Do'}
          </h2>
          <p className="text-slate-500 mt-1">Strategic timeline management for your daily tasks.</p>
        </div>
        <div className="flex justify-end items-center gap-2">
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={cn(
              "p-3 rounded-xl transition-all shadow-sm", 
              showArchived ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
            title={showArchived ? "Show Active" : "Show Archived"}
          >
            <Archive className="w-5 h-5" />
          </button>
          {!showArchived && (
            <Button 
              onClick={() => {
                setSelectedDateStr(format(startOfToday(), 'yyyy-MM-dd'));
                setViewMode('detail');
              }}
              className="h-11 px-6 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Daily Log</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          ))
        ) : datesList.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
             <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-400 font-mono text-center w-full">NO LOGS FOUND</h3>
          </div>
        ) : (
          datesList.map((dateStr, idx) => {
            const dateTodos = groupedTodos[dateStr];
            const total = dateTodos.length;
            const completed = dateTodos.filter(t => t.completed).length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const dateObj = parseISO(dateStr);

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassCard 
                  onClick={() => {
                    setSelectedDateStr(dateStr);
                    setViewMode('detail');
                  }}
                  className="p-6 cursor-pointer group hover:ring-2 hover:ring-bca-blue/20 transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">
                        {isSameDay(dateObj, startOfToday()) ? 'Today' : format(dateObj, 'MMM d, yyyy')}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {format(dateObj, 'EEEE')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleBulkArchive(dateStr); }}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleBulkDelete(dateStr); }}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks</div>
                        <div className="text-2xl font-black text-slate-900">{completed}<span className="text-slate-300 font-medium">/{total}</span></div>
                      </div>
                      <div className="text-right">
                         <div className={cn(
                           "text-2xl font-black",
                           rate <= 33 ? "text-rose-600" : rate <= 66 ? "text-amber-600" : "text-green-600"
                         )}>
                           {rate}<span className="text-base font-bold opacity-40">%</span>
                         </div>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        className={cn(
                          "h-full transition-all duration-1000",
                          rate <= 33 ? "bg-rose-500" : rate <= 66 ? "bg-amber-500" : "bg-green-500"
                        )}
                      />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
