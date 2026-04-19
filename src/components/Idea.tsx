import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Pencil, X, CheckCircle2, Lightbulb, ClipboardList, BookOpen, Search } from 'lucide-react';
import { Idea, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, TextArea, Badge, Select } from './UI';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';

interface IdeaProps {
  ideas: Idea[];
  onAdd: (idea: Partial<Idea>) => void;
  onUpdate: (id: string, updates: Partial<Idea>) => void;
  onDelete: (id: string) => void;
}

export function IdeaManager({ ideas, onAdd, onUpdate, onDelete }: IdeaProps) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Idea>>({
    category: 'General',
    idea: '',
    description: '',
    act_content: '',
    research_content: '',
    plan_content: '',
    checked: false
  });

  const handleEdit = (idea: Idea, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(idea);
    setEditingId(idea.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-amber-500" />
            Ideas
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Capture your sparks of genius and plan your next steps.</p>
        </div>
        <Button onClick={() => { setFormData({ category: 'General', idea: '', description: '', act_content: '', research_content: '', plan_content: '', checked: false }); setIsAdding(true); setEditingId(null); }} className="h-11 px-6 shadow-lg shadow-bca-blue/20">
          <Plus className="w-4 h-4 mr-2" />
          Add New Idea
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.map((idea) => (
          <motion.div
            key={idea.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-xl group",
              idea.checked ? "bg-bca-blue/5 border-bca-blue" : "bg-white border-slate-200"
            )}
            onClick={() => setSelectedIdea(idea)}
          >
            <div className="flex justify-between items-start mb-4">
              <Badge variant="Success" className="bg-slate-100 text-slate-600 uppercase">{idea.category}</Badge>
              <div className="flex gap-2">
                <button onClick={(e) => handleEdit(idea, e)} className="text-slate-400 hover:text-bca-blue"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h4 className="font-bold text-slate-900 mb-2">{idea.idea}</h4>
            <p className="text-sm text-slate-600 line-clamp-3 mb-4">{idea.description}</p>
            
            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className="px-2 py-1 bg-red-100 text-red-600 rounded">Act</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded">Res</span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded">Plan</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIdea && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedIdea(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[32px] shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">{selectedIdea.idea}</h3>
                <button onClick={() => setSelectedIdea(null)}><X /></button>
              </div>
              <div className="space-y-4">
                <p className="text-slate-600">{selectedIdea.description}</p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-red-50 rounded-xl"><h5 className="font-bold text-red-600 mb-1">Act</h5><p className="text-sm">{selectedIdea.act_content}</p></div>
                  <div className="p-4 bg-orange-50 rounded-xl"><h5 className="font-bold text-orange-600 mb-1">Research</h5><p className="text-sm">{selectedIdea.research_content}</p></div>
                  <div className="p-4 bg-emerald-50 rounded-xl"><h5 className="font-bold text-emerald-600 mb-1">Plan</h5><p className="text-sm">{selectedIdea.plan_content}</p></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAdding(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[32px] shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-6">{editingId ? 'Edit Idea' : 'Add New Idea'}</h3>
              <div className="space-y-4">
                <Input placeholder="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                <Input placeholder="Idea Name" value={formData.idea} onChange={e => setFormData({...formData, idea: e.target.value})} />
                <TextArea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <TextArea placeholder="Act Content" value={formData.act_content} onChange={e => setFormData({...formData, act_content: e.target.value})} />
                <TextArea placeholder="Research Content" value={formData.research_content} onChange={e => setFormData({...formData, research_content: e.target.value})} />
                <TextArea placeholder="Plan Content" value={formData.plan_content} onChange={e => setFormData({...formData, plan_content: e.target.value})} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.checked} onChange={e => setFormData({...formData, checked: e.target.checked})} />
                  <label>Finished (Checked)</label>
                </div>
                <Button onClick={() => { if(editingId) onUpdate(editingId, formData); else onAdd(formData); setIsAdding(false); }}>{editingId ? 'Update' : 'Save'}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
