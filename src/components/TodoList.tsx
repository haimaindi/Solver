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
  AlertCircle
} from 'lucide-react';
import { Todo, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, TextArea, Badge } from './UI';
import { format, startOfToday, addDays, parseISO, isSameDay, isBefore } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedDateStr, setSelectedDateStr] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detail View State
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [targetTime, setTargetTime] = useState('09:00');

  useEffect(() => {
    fetchTodos();
  }, [showArchived]);

  const fetchTodos = async () => {
    setIsLoading(true);
    const currentUser = localStorage.getItem('user_id') || 'unknown';
    
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
    const currentUser = localStorage.getItem('user_id') || 'unknown';
    
    const newTodo = {
      user_id: currentUser,
      task: newTask,
      description: newDescription,
      target_time: targetTime,
      completed: false,
      date: selectedDateStr,
      is_archived: false
    };

    const { data, error } = await supabase.from('todos').insert([newTodo]).select().single();
    if (data) {
      setTodos([...todos, data]);
      setNewTask('');
      setNewDescription('');
      Swal.fire({
        title: 'Task Added',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    }
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
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Todo Detail
              </h2>
              <p className="text-slate-500 font-medium">{format(parseISO(selectedDateStr), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => goToDate(-1)} variant="ghost" className="p-2 aspect-square"><ChevronLeft className="w-5 h-5" /></Button>
            <Button onClick={() => goToDate(1)} variant="ghost" className="p-2 aspect-square"><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>

        <GlassCard className="p-6 space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <Input 
                        value={newTask} 
                        onChange={e => setNewTask(e.target.value)} 
                        placeholder="Task Title" 
                        className="h-12"
                    />
                </div>
                <div>
                    <Input 
                        type="time" 
                        value={targetTime} 
                        onChange={e => setTargetTime(e.target.value)} 
                        className="h-12"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <TextArea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Brief description of the task..."
                    className="min-h-[100px]"
                />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Achievement</div>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                        className="h-full bg-bca-blue transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                        />
                    </div>
                    <span className="text-sm font-black text-bca-blue">{completionRate}%</span>
                </div>
                <Button onClick={handleCreateTodo} className="h-11 px-8">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Task
                </Button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedDateTodos.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <h3 className="text-xl font-bold text-slate-400">No tasks for this day</h3>
            </div>
          ) : (
            selectedDateTodos.map(todo => {
              const overdue = isOverdue(todo);
              return (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GlassCard className={cn(
                    "p-5 h-full flex flex-col justify-between border-2 transition-all relative group",
                    todo.completed ? "border-green-100 bg-green-50/20" : 
                    overdue ? "border-rose-100 bg-rose-50/40" : "border-transparent bg-white"
                  )}>
                    {overdue && !todo.completed && (
                        <div className="absolute -top-3 -right-3">
                            <Badge variant="Cancel" className="shadow-sm">Overdue</Badge>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                            <button 
                                onClick={() => toggleTodo(todo)}
                                className={cn(
                                    "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all",
                                    todo.completed 
                                    ? "bg-green-500 border-green-500 text-white" 
                                    : overdue ? "border-rose-400 text-rose-400" : "border-slate-200 text-transparent hover:border-bca-blue"
                                )}
                            >
                                <Check className="w-5 h-5" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                    "font-black text-lg tracking-tight truncate",
                                    todo.completed ? "text-slate-400 line-through" : overdue ? "text-rose-900" : "text-slate-900"
                                )}>
                                    {todo.task}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Clock className={cn("w-3.5 h-3.5", overdue && !todo.completed ? "text-rose-500" : "text-slate-400")} />
                                    <span className={cn("text-xs font-bold", overdue && !todo.completed ? "text-rose-600" : "text-slate-400")}>
                                        {todo.target_time}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {todo.description && (
                            <div className={cn(
                                "text-sm font-medium line-clamp-3 p-3 rounded-lg bg-slate-50/50",
                                todo.completed ? "text-slate-400" : overdue ? "text-rose-700/70" : "text-slate-600"
                            )}>
                                {todo.description}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-100">
                        <button 
                            onClick={() => deleteTodo(todo.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete Task"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {showArchived ? 'Archived To Do' : 'To Do'}
          </h2>
          <p className="text-slate-500 mt-1">Strategic timeline management for your daily tasks.</p>
        </div>
        <div className="flex items-center gap-2">
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
                           rate === 100 ? "text-green-600" : rate >= 50 ? "text-bca-blue" : "text-amber-600"
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
                          rate === 100 ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]" : 
                          rate >= 50 ? "bg-bca-blue" : "bg-amber-500"
                        )}
                      />
                    </div>
                  </div>
                  <Calendar className="absolute -right-4 -bottom-4 w-16 h-16 text-slate-50 transition-all group-hover:text-slate-100 rotate-12" />
                </GlassCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
