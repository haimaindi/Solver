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
  Copy,
  MapPin,
  Calendar,
  MoreVertical,
  LayoutGrid,
  List as ListIcon,
  ArrowLeft,
  Search,
  Check
} from 'lucide-react';
import { Todo, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge } from './UI';
import { format, startOfToday, addDays, parseISO, isSameDay, startOfDay } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  position: [number, number] | null;
}

function LocationMarker({ onLocationSelect, position }: MapPickerProps) {
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(position);

  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setMarkerPos(newPos);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return markerPos === null ? null : (
    <Marker position={markerPos} />
  );
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedDateStr, setSelectedDateStr] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detail View State
  const [newTask, setNewTask] = useState('');
  const [targetTime, setTargetTime] = useState('09:00');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);

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
      target_time: targetTime,
      completed: false,
      date: selectedDateStr,
      is_archived: false,
      latitude: selectedLocation?.lat || null,
      longitude: selectedLocation?.lng || null,
    };

    const { data, error } = await supabase.from('todos').insert([newTodo]).select().single();
    if (data) {
      setTodos([...todos, data]);
      setNewTask('');
      setSelectedLocation(null);
      setIsMapOpen(false);
      Swal.fire({
        title: 'Task Added',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
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
      title: 'Archive all tasks for this date?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, archive'
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('todos')
        .update({ is_archived: !showArchived })
        .eq('date', date)
        .eq('is_archived', showArchived);
      
      if (!error) {
        fetchTodos();
        Swal.fire('Success', 'Date archived', 'success');
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
        Swal.fire('Deleted', 'All tasks for this date removed', 'success');
      }
    }
  };

  const goToDate = (offset: number) => {
    const current = parseISO(selectedDateStr);
    const next = addDays(current, offset);
    setSelectedDateStr(format(next, 'yyyy-MM-dd'));
  };

  const selectedDateTodos = todos.filter(t => t.date === selectedDateStr);
  const completionRate = selectedDateTodos.length > 0
    ? Math.round((selectedDateTodos.filter(t => t.completed).length / selectedDateTodos.length) * 100)
    : 0;

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
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Input 
                value={newTask} 
                onChange={e => setNewTask(e.target.value)} 
                placeholder="What needs to be done?" 
                className="h-12 pl-4"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input 
                type="time" 
                value={targetTime} 
                onChange={e => setTargetTime(e.target.value)} 
                className="h-12 w-28"
              />
              <button 
                onClick={() => setIsMapOpen(!isMapOpen)}
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                  isMapOpen || selectedLocation ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-500"
                )}
                title="Add Location"
              >
                <MapPin className="w-5 h-5" />
              </button>
              <Button onClick={handleCreateTodo} className="h-12 px-6 shadow-lg shadow-bca-blue/20">
                <Plus className="w-5 h-5 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isMapOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 400 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border border-slate-200 relative"
              >
                <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm text-xs font-bold text-slate-600">
                  Click on the map to set pinpoint coordinate
                </div>
                <MapContainer center={[-6.2088, 106.8456]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker 
                    onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })} 
                    position={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : null}
                  />
                </MapContainer>
                {selectedLocation && (
                  <div className="absolute bottom-4 right-4 z-[400] flex gap-2">
                    <Button 
                      onClick={() => setIsMapOpen(false)}
                      variant="ghost" 
                      className="bg-white/90 backdrop-blur shadow-sm h-10 px-4 text-xs font-bold"
                    >
                      Confirm Location
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Achievement</div>
              <div className="flex-1 w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-bca-blue transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-sm font-black text-bca-blue">{completionRate}%</span>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {selectedDateTodos.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ListIcon className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No tasks for this day</h3>
              <p className="text-slate-500">Plan your day by adding some items above.</p>
            </div>
          ) : (
            selectedDateTodos.map(todo => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <GlassCard className={cn(
                  "p-5 flex items-center justify-between group transition-all",
                  todo.completed ? "bg-slate-50/50" : "bg-white"
                )}>
                  <div className="flex items-center gap-4 flex-1">
                    <button 
                      onClick={() => toggleTodo(todo)}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all",
                        todo.completed 
                          ? "bg-green-500 border-green-500 text-white" 
                          : "border-slate-200 text-transparent hover:border-bca-blue"
                      )}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-bold truncate text-lg transition-all",
                        todo.completed ? "text-slate-400 line-through" : "text-slate-900"
                      )}>
                        {todo.task}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {todo.target_time}
                        </span>
                        {todo.latitude && (
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-500" />
                            Location pinned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))
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
             <h3 className="text-xl font-bold text-slate-400 font-mono">NO LOGS FOUND</h3>
             <p className="text-slate-400 text-sm mt-2">Create your first daily todo log to get started.</p>
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
                    <div className="flex gap-1 group-hover:opacity-100 opacity-60 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleBulkArchive(dateStr); }}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                        title="Archive All"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleBulkDelete(dateStr); }}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                        title="Delete All"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion</div>
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

                  {/* Icon Decoration */}
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
