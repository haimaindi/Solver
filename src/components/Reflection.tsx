import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  History, 
  ChevronRight, 
  Save, 
  Trash2, 
  Calendar,
  Clock as ClockIcon,
  BookOpen,
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Palette,
  Pencil,
  Archive
} from 'lucide-react';
import { Reflection, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge } from './UI';
import { ReflectionAdvisor } from './ReflectionAdvisor';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

type Mode = 'GIBBS' | 'ROLFE' | '4L';

const MODES: { id: Mode; name: string; description: string }[] = [
  { id: 'GIBBS', name: 'GIBBS', description: '6-step reflective cycle' },
  { id: 'ROLFE', name: 'ROLFE', description: 'What, So What, Now What?' },
  { id: '4L', name: 'Modified 4L', description: 'Experience, Liked, Learned, Lacked, Longed, Action' }
];

const MODE_FIELDS: Record<Mode, { id: string; label: string; placeholder: string }[]> = {
  GIBBS: [
    { id: 'description', label: '1. Description', placeholder: 'What happened?' },
    { id: 'feelings', label: '2. Feelings', placeholder: 'What were you thinking and feeling?' },
    { id: 'evaluation', label: '3. Evaluation', placeholder: 'What was good and bad about the experience?' },
    { id: 'analysis', label: '4. Analysis', placeholder: 'What sense can you make of the situation?' },
    { id: 'conclusion', label: '5. Conclusion', placeholder: 'What else could you have done?' },
    { id: 'action', label: '6. Action Plan', placeholder: 'If it arose again, what would you do?' }
  ],
  ROLFE: [
    { id: 'what', label: 'What?', placeholder: 'Describe the situation, your role, and what you were trying to achieve.' },
    { id: 'soWhat', label: 'So What?', placeholder: 'What is the importance of the event? What does it mean for your practice?' },
    { id: 'nowWhat', label: 'Now What?', placeholder: 'What are you going to do next? How will you improve?' }
  ],
  '4L': [
    { id: 'experience', label: 'Description/Experience', placeholder: 'Describe the event or experience.' },
    { id: 'liked', label: 'Liked', placeholder: 'What did you like about the experience?' },
    { id: 'learned', label: 'Learned', placeholder: 'What did you learn from this?' },
    { id: 'lacked', label: 'Lacked', placeholder: 'What was missing or what hindered you?' },
    { id: 'longed', label: 'Longed for', placeholder: 'What did you wish for or hope to happen?' },
    { id: 'action', label: 'Action Plan', placeholder: 'What are your next steps?' }
  ]
};

const SATISFACTION_LEVELS = [
  { label: 'Need Evaluation', color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  { label: 'Dissatisfied', color: '#f59e0b', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  { label: 'Neutral', color: '#eab308', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
  { label: 'Satisfied', color: '#10b981', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  { label: 'Very Satisfied', color: '#003399', bg: 'bg-bca-blue/5', border: 'border-bca-blue/20', text: 'text-bca-blue' }
];

const COLORS = [
  { name: 'Black', color: '#000000' },
  { name: 'Primary', color: '#003399' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Green', color: '#10b981' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Slate', color: '#64748b' }
];

const MenuBar = ({ editor }: { editor: any }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('bold') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('italic') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('underline') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('strike') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      
      <div className="w-px h-4 bg-slate-200 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('bulletList') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('orderedList') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={cn(
          "p-2 rounded-lg transition-all",
          editor.isActive('taskList') ? "bg-bca-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <CheckSquare className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <div className="relative">
        <button 
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-all flex items-center gap-1"
        >
          <Palette className="w-4 h-4" />
          <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'transparent' }} />
        </button>
        <AnimatePresence>
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 flex flex-wrap items-center gap-2 z-50 min-w-[160px]"
              >
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => {
                      editor.chain().focus().setColor(c.color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-9 h-9 rounded-xl border border-slate-100 transition-all hover:scale-110 hover:shadow-lg active:scale-95"
                    style={{ backgroundColor: c.color === 'inherit' ? '#fff' : c.color }}
                    title={c.name}
                  />
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const RichTextEditor = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4 min-h-[150px]',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-bca-blue/10 focus-within:border-bca-blue transition-all overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export function ReflectionManager() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);
  const [currentMode, setCurrentMode] = useState<Mode>('GIBBS');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [satisfaction, setSatisfaction] = useState(SATISFACTION_LEVELS[2]); // Default Neutral
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchReflections();
  }, [showArchived]);

  const fetchReflections = async () => {
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser || currentUser === 'unknown') return;
    
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', currentUser)
      .eq('is_archived', showArchived)
      .order('created_at', { ascending: false });
    
    if (data) setReflections(data);
    if (error) console.error('Error fetching reflections:', error);
  };

  const handleSave = async () => {
    if (!title) {
      Swal.fire('Error', 'Please enter a title', 'error');
      return;
    }
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser || currentUser === 'unknown') {
      Swal.fire('Error', 'Authentication error. Please re-login.', 'error');
      return;
    }

    const reflectionData = {
      mode: currentMode,
      title,
      content: formData,
      satisfaction_label: satisfaction.label as any,
      satisfaction_color: satisfaction.color,
      user_id: currentUser, // Added user ID
      is_archived: false,
      created_at: editingId ? reflections.find(r => r.id === editingId)?.created_at : new Date().toISOString()
    };

    // Optimistic Update
    const tempId = editingId || Math.random().toString();
    const optimisticReflection: Reflection = {
      ...reflectionData,
      id: tempId,
      user_id: currentUser,
      created_at: reflectionData.created_at || new Date().toISOString()
    };

    if (editingId) {
      setReflections(reflections.map(r => r.id === editingId ? optimisticReflection : r));
    } else {
      setReflections([optimisticReflection, ...reflections]);
    }
    
    setIsAdding(false);
    setEditingId(null);

    const query = editingId 
      ? supabase.from('reflections').update(reflectionData).eq('id', editingId)
      : supabase.from('reflections').insert([reflectionData]);

    const { data, error } = await query.select().single();

    if (data) {
      setReflections(prev => prev.map(r => r.id === tempId ? data : r));
      setTitle('');
      setFormData({});
      setSatisfaction(SATISFACTION_LEVELS[2]);
      Swal.fire({
        title: 'Success',
        text: `Reflection ${editingId ? 'updated' : 'saved'} successfully`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
    if (error) {
      console.error('Error saving reflection:', error);
      fetchReflections(); // Rollback
      Swal.fire('Error', 'Failed to save reflection', 'error');
    }
  };

  const handleToggleArchiveReflection = async (id: string, isCurrentlyArchived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('reflections')
      .update({ is_archived: !isCurrentlyArchived })
      .eq('id', id);

    if (!error) {
      fetchReflections();
      Swal.fire('Success', `Reflection ${!isCurrentlyArchived ? 'archived' : 'unarchived'}`, 'success');
    } else {
      Swal.fire('Error', 'Failed to update reflection status', 'error');
    }
  };

  const handleEdit = (reflection: Reflection, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMode(reflection.mode);
    setTitle(reflection.title);
    setFormData(reflection.content as Record<string, string>);
    setSatisfaction(SATISFACTION_LEVELS.find(l => l.label === reflection.satisfaction_label) || SATISFACTION_LEVELS[2]);
    setEditingId(reflection.id);
    setIsAdding(true);
    setSelectedReflection(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003399',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      // Optimistic Update
      const originalReflections = [...reflections];
      setReflections(reflections.filter(r => r.id !== id));
      if (selectedReflection?.id === id) setSelectedReflection(null);

      const { error } = await supabase.from('reflections').delete().eq('id', id);
      if (error) {
        setReflections(originalReflections);
        Swal.fire('Error', 'Failed to delete reflection', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left md:text-left">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {showArchived ? 'Archived Reflection' : 'Reflection'}
          </h2>
          <p className="text-slate-500 mt-1">Document your learning journey and professional growth.</p>
        </div>
        {!isAdding && !selectedReflection && (
          <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  "p-3 rounded-xl transition-colors shadow-sm",
                  showArchived ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
                title={showArchived ? "Show Active Reflections" : "Show Archived Reflections"}
              >
                <Archive className="w-5 h-5" />
              </button>
              {!showArchived && (
                <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 h-11 px-6">
                  <Plus className="w-4 h-4" />
                  <span>New Reflection</span>
                </Button>
              )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard className="p-8 space-y-8">
              <div className="flex flex-col gap-6 border-b border-slate-100 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); setTitle(''); setFormData({}); }} className="p-2">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Reflection' : 'Create New Reflection'}</h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setCurrentMode(m.id);
                        setFormData({});
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none",
                        currentMode === m.id 
                          ? "bg-bca-blue text-white shadow-lg shadow-bca-blue/20" 
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reflection Title</label>
                  <Input 
                    placeholder="e.g., Weekly Sprint Review - Week 14" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Satisfaction</label>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                       {SATISFACTION_LEVELS.map(level => (
                         <button
                           key={level.label}
                           onClick={() => setSatisfaction(level)}
                           className={cn(
                             "w-full px-4 py-3 rounded-xl text-center font-bold transition-all border-2 text-xs",
                             satisfaction.label === level.label 
                               ? `border-transparent text-white shadow-lg` 
                               : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100"
                           )}
                           style={{ backgroundColor: satisfaction.label === level.label ? level.color : undefined }}
                         >
                           {level.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  {MODE_FIELDS[currentMode].map(field => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                      <RichTextEditor 
                        placeholder={field.placeholder}
                        value={formData[field.id] || ''}
                        onChange={val => setFormData({ ...formData, [field.id]: val })}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); setTitle(''); setFormData({}); }}>Cancel</Button>
                  <Button onClick={handleSave} className="px-8 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    <span>{editingId ? 'Update Reflection' : 'Save Reflection'}</span>
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ) : selectedReflection ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard className="p-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div className="flex items-start gap-4">
                  <Button variant="ghost" onClick={() => setSelectedReflection(null)} className="p-2 mt-1">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">{selectedReflection.title}</h3>
                      <Badge variant="Success" className="bg-bca-blue/10 text-bca-blue">{selectedReflection.mode}</Badge>
                      <ReflectionAdvisor reflection={selectedReflection} />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-slate-400 text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(selectedReflection.created_at), 'MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {format(new Date(selectedReflection.created_at), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="ghost" onClick={(e) => handleEdit(selectedReflection, e)} className="p-2 text-bca-blue hover:bg-bca-blue/5">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="danger" onClick={(e) => handleDelete(selectedReflection.id, e)} className="p-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {MODE_FIELDS[selectedReflection.mode].map(field => (
                  <div key={field.id} className="space-y-3">
                    <div className="text-[10px] font-bold text-bca-blue uppercase tracking-widest">{field.label}</div>
                    <div 
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed reflection-content break-words overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: selectedReflection.content[field.id] || '<span class="text-slate-300 italic">No content provided.</span>' }}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {reflections.length > 0 ? (
              reflections.map((r, idx) => {
                const sat = SATISFACTION_LEVELS.find(l => l.label === r.satisfaction_label) || SATISFACTION_LEVELS[2];
                return (
                  <GlassCard 
                    key={r.id} 
                    delay={idx * 0.05}
                    onClick={() => setSelectedReflection(r)}
                    className={cn(
                      "p-6 cursor-pointer group transition-all border-l-4",
                      sat.border
                    )}
                    style={{ borderLeftColor: r.satisfaction_color }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-bca-blue/5 rounded-lg text-bca-blue group-hover:bg-bca-blue group-hover:text-white transition-colors">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="Success" className="bg-slate-100 text-slate-500 group-hover:bg-bca-blue/10 group-hover:text-bca-blue transition-colors">
                          {r.mode}
                        </Badge>
                        <span className={cn("text-[9px] font-bold uppercase tracking-tighter", sat.text)}>
                          {r.satisfaction_label}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-bca-blue transition-colors">{r.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(r.created_at), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {format(new Date(r.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => handleEdit(r, e)}
                          className="p-2 text-slate-400 hover:text-bca-blue hover:bg-bca-blue/5 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleToggleArchiveReflection(r.id, r.is_archived || false, e)}
                          className={cn("p-2 rounded-lg transition-all", r.is_archived ? "text-green-600 hover:bg-green-50" : "text-amber-600 hover:bg-amber-50")}
                          title={r.is_archived ? "Unarchive" : "Archive"}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(r.id, e)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-hover:text-bca-blue group-hover:bg-bca-blue/5 transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No reflections yet</h3>
                <p className="text-slate-500">Start documenting your growth today.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
