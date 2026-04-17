import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Archive, CheckCircle2, Circle, Clock, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { Todo, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input } from './UI';
import { format, startOfToday, addDays, parseISO } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [newTask, setNewTask] = useState('');
  const [targetTime, setTargetTime] = useState('09:00');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, [selectedDate, showArchived]);

  const fetchTodos = async () => {
    const currentUser = localStorage.getItem('user_id') || 'unknown';
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', currentUser)
      .eq('date', dateStr)
      .eq('is_archived', showArchived)
      .order('target_time', { ascending: true });

    if (data) setTodos(data);
  };

  const handleCreateTodo = async () => {
    if (!newTask) return;
    const currentUser = localStorage.getItem('user_id') || 'unknown';
    
    const newTodo = {
      user_id: currentUser,
      task: newTask,
      target_time: targetTime,
      completed: false,
      date: format(selectedDate, 'yyyy-MM-dd'),
      is_archived: false,
    };

    const { data, error } = await supabase.from('todos').insert([newTodo]).select().single();
    if (data) {
      setTodos([...todos, data]);
      setNewTask('');
    }
  };

  const toggleTodo = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id);
    if (!error) fetchTodos();
  };

  const handleToggleArchiveTodo = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_archived: !todo.is_archived })
      .eq('id', todo.id);
    if (!error) fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (!error) fetchTodos();
  };

  const duplicateToNextDay = async (todo: Todo) => {
    const currentUser = localStorage.getItem('user_id') || 'unknown';
    const nextDay = addDays(parseISO(todo.date), 1);
    const newTodo = {
      user_id: currentUser,
      task: todo.task,
      target_time: todo.target_time,
      completed: false,
      date: format(nextDay, 'yyyy-MM-dd'),
      is_archived: false,
    };
    
    await supabase.from('todos').insert([newTodo]);
    Swal.fire('Success', 'Task duplicated to tomorrow', 'success');
  };

  const completionRate = todos.length > 0
    ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100)
    : 0;

  const getProgressColor = (rate: number) => {
    if (rate <= 30) return 'text-red-500';
    if (rate <= 60) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showArchived ? 'Archived Todo List' : 'Daily Todo List'}
          </h2>
          <p className="text-gray-500">{format(selectedDate, 'MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArchived(!showArchived)} className={cn("p-3 rounded-xl shadow-sm", showArchived ? "bg-amber-100 text-amber-700" : "bg-gray-100")}>
            <Archive className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <Button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 aspect-square"><ChevronLeft className="w-4 h-4" /></Button>
            <Button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 aspect-square"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {!showArchived && (
        <GlassCard className="p-6">
            <div className="flex items-center gap-4">
                <Input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add task..." />
                <Input type="time" value={targetTime} onChange={e => setTargetTime(e.target.value)} />
                <Button onClick={handleCreateTodo}><Plus className="w-5 h-5" /></Button>
            </div>
            <div className={`mt-2 font-bold ${getProgressColor(completionRate)}`}>Achievement: {completionRate}%</div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todos.map(todo => (
          <GlassCard key={todo.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => toggleTodo(todo)}>
                {todo.completed ? <CheckCircle2 className="text-green-500" /> : <Circle />}
              </button>
              <div>
                <div className="font-bold">{todo.task}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {todo.target_time}</div>
              </div>
            </div>
            <div className="flex gap-2">
                {!showArchived && <button onClick={() => duplicateToNextDay(todo)}><Copy className="w-4 h-4 text-slate-400" /></button>}
                <button onClick={() => handleToggleArchiveTodo(todo)}><Archive className="w-4 h-4 text-amber-500" /></button>
                {showArchived && <button onClick={() => deleteTodo(todo.id)}><Trash2 className="w-4 h-4 text-red-500" /></button>}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
