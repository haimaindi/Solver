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
  Pencil,
  XCircle,
  Share2,
  Users
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Todo, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, TextArea, Badge } from './UI';
import { format, startOfToday, addDays, parseISO, isSameDay, isBefore } from 'date-fns';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';
import { AccessManagerModal } from './AccessManagerModal';

interface TodoListProps {
  prefillData?: { task: string; description: string; date: string } | null;
  prefillTodoId?: string | null;
  onPrefillHandled?: () => void;
}

export function TodoList({ prefillData, prefillTodoId, onPrefillHandled }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedDateStr, setSelectedDateStr] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [showArchived, setShowArchived] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detail View State
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [targetTime, setTargetTime] = useState('09:00');
  const [impactLevel, setImpactLevel] = useState<'High' | 'Low'>('High');
  const [effortLevel, setEffortLevel] = useState<'High' | 'Low'>('Low');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [viewingTodo, setViewingTodo] = useState<Todo | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, [showArchived, showShared]);

  useEffect(() => {
    if (prefillTodoId && todos.length > 0) {
      const todo = todos.find(t => t.id === prefillTodoId);
      if (todo) {
        setSelectedDateStr(todo.date);
        setViewingTodo(todo);
        setViewMode('detail');
        onPrefillHandled?.();
      }
    }
  }, [prefillTodoId, todos]);

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
    const solverId = localStorage.getItem('solver_id');
    if (!currentUser || currentUser === 'unknown') {
      setIsLoading(false);
      return;
    }
    
    if (showShared) {
      const { data: sharedKeys } = await supabase
        .from('module_shares')
        .select('shared_by')
        .eq('module_name', 'todos')
        .eq('shared_with_solver_id', solverId);
      
      if (!sharedKeys || sharedKeys.length === 0) {
        setTodos([]);
        setIsLoading(false);
        return;
      }
      
      const ownerIds = sharedKeys.map(s => s.shared_by);
      const { data } = await supabase
        .from('todos')
        .select('*')
        .in('user_id', ownerIds)
        .eq('is_archived', false)
        .order('date', { ascending: false })
        .order('target_time', { ascending: true });

      if (data) setTodos(data);
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
        setIsFormModalOpen(false);
        Swal.fire({ title: 'Task Updated', icon: 'success', toast: true, backdrop: false, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    } else {
      const { data, error } = await supabase.from('todos').insert([newTodo]).select().single();
      if (data) {
        setTodos([...todos, data]);
        resetForm();
        setIsFormModalOpen(false);
        Swal.fire({ title: 'Task Added', icon: 'success', toast: true, backdrop: false, position: 'top-end', showConfirmButton: false, timer: 1500 });
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
    setIsFormModalOpen(true);
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
      inputValue: format(startOfToday(), 'yyyy-MM-dd'),
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
          backdrop: false,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
      }
    }
  };

  const selectedDateTodos = useMemo(() => {
    return todos.filter(t => t.date === selectedDateStr);
  }, [todos, selectedDateStr]);

  const completionRate = selectedDateTodos.length > 0
    ? Math.round((selectedDateTodos.filter(t => t.completed).length / selectedDateTodos.length) * 100)
    : 0;

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Immediate cleanup to fix interaction lag
    window.getSelection()?.removeAllRanges();
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    // Define column mapping
    const columnMapping: Record<string, { impact: 'High' | 'Low', effort: 'High' | 'Low', title: string }> = {
      'top-priorities': { impact: 'High', effort: 'Low', title: 'Top Priorities' },
      'second-priorities': { impact: 'High', effort: 'High', title: 'Second Priorities' },
      'delegates': { impact: 'Low', effort: 'Low', title: 'Delegates' },
      'ignore': { impact: 'Low', effort: 'High', title: 'Ignore / Postpone' }
    };

    const targetConfig = columnMapping[destination.droppableId];
    if (!targetConfig) return;

    // Update local state first for instant feedback (Optimistic Update)
    setTodos(prev => prev.map(todo => {
      if (todo.id === draggableId) {
        return {
          ...todo,
          impact_level: targetConfig.impact,
          effort_level: targetConfig.effort
        };
      }
      return todo;
    }));

    // Update Supabase
    const { error } = await supabase
      .from('todos')
      .update({
        impact_level: targetConfig.impact,
        effort_level: targetConfig.effort
      })
      .eq('id', draggableId);

    if (error) {
       console.error('Drag update error:', error);
       fetchTodos(); // Rollback if error
       Swal.fire({ title: 'Update Failed', text: 'Error syncing drag action', icon: 'error', toast: true, backdrop: false, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } else {
      // Drag & Drop successful - no Swal as requested for robustness
    }

    // Force browser reflow/interaction reset to fix "stuck" click bug after drop
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      window.getSelection()?.removeAllRanges();
      // Additional hack to ensure focus is removed from any dragging element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, 200);
  };

  const goToDate = (offset: number) => {
    const current = parseISO(selectedDateStr);
    const next = addDays(current, offset);
    setSelectedDateStr(format(next, 'yyyy-MM-dd'));
  };

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
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1">
              <Button onClick={() => goToDate(-1)} variant="ghost" className="p-2 aspect-square"><ChevronLeft className="w-5 h-5" /></Button>
              <Button onClick={() => goToDate(1)} variant="ghost" className="p-2 aspect-square"><ChevronRight className="w-5 h-5" /></Button>
            </div>
            <Button 
              onClick={() => {
                resetForm();
                setIsFormModalOpen(true);
              }}
              className="h-10 px-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Add Task</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start overflow-x-auto pb-4 px-1">
              {/* Column 1: Top Priorities */}
              {renderMatrixColumn(
                "top-priorities",
                "Top Priorities", 
                "Immediate actions",
                "bg-blue-50/40 border-blue-100",
                "text-blue-700",
                "bg-blue-600",
                selectedDateTodos.filter(t => t.impact_level === 'High' && t.effort_level === 'Low')
              )}

              {/* Column 2: Second Priorities */}
              {renderMatrixColumn(
                "second-priorities",
                "Second Priorities", 
                "Strategic projects",
                "bg-emerald-50/40 border-emerald-100",
                "text-emerald-700",
                "bg-emerald-600",
                selectedDateTodos.filter(t => t.impact_level === 'High' && t.effort_level === 'High')
              )}

              {/* Column 3: Delegates */}
              {renderMatrixColumn(
                "delegates",
                "Delegates", 
                "Quick tasks",
                "bg-amber-50/40 border-amber-100",
                "text-amber-700",
                "bg-amber-600",
                selectedDateTodos.filter(t => t.impact_level === 'Low' && t.effort_level === 'Low')
              )}

              {/* Column 4: Ignore */}
              {renderMatrixColumn(
                "ignore",
                "Ignore / Postpone", 
                "Low value distractions",
                "bg-rose-50/40 border-rose-100",
                "text-rose-700",
                "bg-rose-600",
                selectedDateTodos.filter(t => (t.impact_level === 'Low' && (t.effort_level === 'High' || !t.effort_level)) || (!t.impact_level && t.effort_level === 'High'))
              )}
           </div>
        </DragDropContext>

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
           {isFormModalOpen && (
             <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 20 }}
                   className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[92vh] custom-scrollbar"
                >
                   <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                            {editingTodoId ? 'Edit Task' : 'New Task'}
                         </h3>
                         <button 
                            onClick={() => {
                               resetForm();
                               setIsFormModalOpen(false);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                         >
                            <XCircle className="w-6 h-6 text-slate-400" />
                         </button>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Task Title</div>
                             <TextArea 
                                 value={newTask} 
                                 onChange={e => setNewTask(e.target.value)} 
                                 placeholder="What needs to be done?" 
                                 className="min-h-[80px] text-lg font-bold p-4 rounded-2xl"
                             />
                         </div>

                         <div className="space-y-2">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Task Details</div>
                             <TextArea
                                 value={newDescription}
                                 onChange={e => setNewDescription(e.target.value)}
                                 placeholder="Add some context or specific steps..."
                                 className="min-h-[120px] p-5 rounded-2xl text-base"
                             />
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                            <div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Impact</div>
                               <div className="flex bg-slate-100 p-1.5 rounded-2xl h-14">
                                  <button 
                                     onClick={() => setImpactLevel('High')}
                                     className={cn(
                                       "flex-1 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                                       impactLevel === 'High' ? "bg-white text-bca-blue shadow-md" : "text-slate-500 hover:text-slate-700"
                                     )}
                                  >
                                     High
                                  </button>
                                  <button 
                                     onClick={() => setImpactLevel('Low')}
                                     className={cn(
                                       "flex-1 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                                       impactLevel === 'Low' ? "bg-white text-slate-700 shadow-md" : "text-slate-500 hover:text-slate-700"
                                     )}
                                  >
                                     Low
                                  </button>
                               </div>
                            </div>
                            <div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Effort / Urgency</div>
                               <div className="flex bg-slate-100 p-1.5 rounded-2xl h-14">
                                  <button 
                                     onClick={() => setEffortLevel('High')}
                                     className={cn(
                                       "flex-1 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                                       effortLevel === 'High' ? "bg-white text-rose-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                                     )}
                                  >
                                     High
                                  </button>
                                  <button 
                                     onClick={() => setEffortLevel('Low')}
                                     className={cn(
                                       "flex-1 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                                       effortLevel === 'Low' ? "bg-white text-emerald-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                                     )}
                                  >
                                     Low
                                  </button>
                               </div>
                            </div>
                            <div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Time</div>
                               <Input 
                                   type="time" 
                                   value={targetTime} 
                                   onChange={e => setTargetTime(e.target.value)} 
                                   className="h-14 text-center font-mono font-bold text-xl"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-4 pt-4 border-t border-slate-100">
                         <Button 
                             onClick={handleCreateTodo} 
                             className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 text-lg font-bold"
                         >
                             <span>{editingTodoId ? 'Save' : 'Create'}</span>
                         </Button>
                         <Button 
                            variant="ghost" 
                            className="h-14 rounded-2xl px-8"
                            onClick={() => {
                               resetForm();
                               setIsFormModalOpen(false);
                            }}
                         >
                            Discard
                         </Button>
                      </div>
                   </div>
                </motion.div>
             </div>
           )}
        </AnimatePresence>

        {/* Read Only Modal */}
        <AnimatePresence>
           {viewingTodo && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] custom-scrollbar"
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

                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                         {viewingTodo.user_id === localStorage.getItem('user_id') && (
                           <Button 
                              className="flex-1 h-12 rounded-2xl whitespace-nowrap px-4 font-bold flex items-center justify-center leading-none"
                              onClick={() => {
                                 toggleTodo(viewingTodo);
                                 setViewingTodo(null);
                              }}
                           >
                              <span className="truncate">{viewingTodo.completed ? 'Mark Uncomplete' : 'Mark Complete'}</span>
                           </Button>
                         )}
                         <Button 
                            variant="ghost" 
                            className={cn(
                              "h-12 rounded-2xl px-8",
                              viewingTodo.user_id !== localStorage.getItem('user_id') ? "flex-1" : ""
                            )}
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

  function renderMatrixColumn(id: string, title: string, desc: string, styles: string, textStyle: string, dotStyle: string, items: Todo[]) {
    // Verified edit
    return (
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <GlassCard 
            className={cn(
              "flex flex-col h-[calc(100vh-280px)] min-h-[500px] transition-all border overflow-hidden",
              styles,
              snapshot.isDraggingOver ? "ring-2 ring-indigo-400/50 border-indigo-200 bg-indigo-50/30" : "border-slate-100"
            )}
            style={{ minWidth: 'min(300px, 90vw)' }}
          >
            <div className="p-4 border-b border-slate-100 flex-shrink-0 bg-white/40 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotStyle)} />
                    <h4 className={cn("font-black tracking-tight text-[11px] sm:text-xs uppercase truncate", textStyle)} title={title}>{title}</h4>
                 </div>
                 <Badge variant="Pending" className="bg-white/80 border-none font-bold text-[10px] h-5">{items.length}</Badge>
              </div>
              <p className="text-[9px] text-slate-500 font-medium leading-tight truncate">{desc}</p>
            </div>

            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar"
            >
               {items.length === 0 ? (
                 <div className="h-48 flex flex-col items-center justify-center opacity-20 italic">
                    <LayoutGrid className="w-5 h-5 mb-1" />
                    <span className="text-[8px] font-bold">Drop tasks here</span>
                 </div>
               ) : (
                 items.map((todo, index) => {
                   const overdue = isOverdue(todo);
                   return (
                     <Draggable key={todo.id} draggableId={todo.id} index={index} isDragDisabled={todo.user_id !== localStorage.getItem('user_id')}>
                        {(dragProvided, dragSnapshot) => {
                          const child = (
                            <div 
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                transition: dragSnapshot.isDragging ? 'none' : dragProvided.draggableProps.style?.transition,
                              }}
                              className={cn(
                                 "relative mb-2",
                                 dragSnapshot.isDragging ? "z-50" : ""
                              )}
                            >
                               <div 
                                  onClick={() => setViewingTodo(todo)}
                                  className={cn(
                                     "w-full bg-white p-2.5 rounded-xl border shadow-sm transition-all flex items-start gap-2",
                                     todo.user_id === localStorage.getItem('user_id') ? "cursor-pointer hover:shadow-md" : "cursor-default",
                                     todo.completed ? "opacity-60 grayscale border-slate-100 bg-slate-50/50" : 
                                     overdue ? "border-rose-100 ring-1 ring-rose-50" : "border-slate-100",
                                     dragSnapshot.isDragging ? "shadow-xl ring-2 ring-indigo-500/20" : ""
                                  )}
                               >
                                  <button 
                                     onClick={(e) => { 
                                       if (todo.user_id === localStorage.getItem('user_id')) {
                                         e.stopPropagation(); toggleTodo(todo); 
                                       }
                                     }}
                                     className={cn(
                                        "w-5 h-5 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center border-2 transition-all",
                                        todo.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-200",
                                        todo.user_id !== localStorage.getItem('user_id') ? "opacity-70 cursor-default" : ""
                                     )}
                                  >
                                     {todo.completed && <Check className="w-3 h-3" />}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                     <h5 className={cn(
                                        "text-sm font-bold tracking-tight break-words",
                                        todo.completed ? "text-slate-400 line-through" : "text-slate-900"
                                     )}>
                                        {todo.task}
                                     </h5>
                                     <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                                        <div className="flex items-center gap-1">
                                           <Clock className="w-3 h-3 text-slate-400" />
                                           <span className="text-[9px] font-medium text-slate-400 font-mono">{todo.target_time}</span>
                                        </div>
                                        {overdue && !todo.completed && (
                                           <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Overdue</span>
                                        )}
                                        {todo.user_id === localStorage.getItem('user_id') && (
                                          <div className="ml-auto flex items-center gap-1.5">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); copyTodo(todo); }}
                                                 className="p-1 text-slate-400 hover:text-bca-blue hover:bg-slate-50 rounded-lg transition-all"
                                                 title="Duplicate"
                                              >
                                                 <Copy className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                 onClick={(e) => { e.stopPropagation(); handleEditTodo(todo); }}
                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Edit"
                                             >
                                                <Pencil className="w-3.5 h-3.5" />
                                             </button>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Delete"
                                             >
                                                <Trash2 className="w-3.5 h-3.5" />
                                             </button>
                                          </div>
                                        )}
                                     </div>
                                  </div>
                               </div>
                            </div>
                          );

                          if (dragSnapshot.isDragging) {
                            return createPortal(child, document.body);
                          }
                          return child;
                        }}
                     </Draggable>
                   );
                 })
               )}
               {provided.placeholder}
            </div>
          </GlassCard>
        )}
      </Droppable>
    );
  }

  return (
    <div className="space-y-8">
      <AccessManagerModal 
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        moduleName="todos"
        moduleLabel="To Do"
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {showShared ? 'Shared To Do' : showArchived ? 'Archived To Do' : 'To Do'}
          </h2>
          <p className="text-slate-500 mt-1">Strategic timeline management for your daily tasks.</p>
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
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">My To Do</span>
             </button>
          </div>
          
          <Button 
            onClick={() => setIsAccessModalOpen(true)}
            variant="ghost"
            title="Manage Access"
            className="w-11 h-11 p-0 flex items-center justify-center rounded-xl border border-slate-200 hover:border-bca-blue hover:text-bca-blue hover:bg-bca-blue/5 transition-all bg-white shadow-sm"
          >
            <Share2 className="w-5 h-5 text-slate-500 group-hover:text-bca-blue" />
          </Button>

          {!showArchived && !showShared && (
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
                      {!showShared && (
                        <>
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
                        </>
                      )}
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
