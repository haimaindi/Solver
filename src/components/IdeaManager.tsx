import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Plus, 
  Search, 
  Trash2, 
  Archive, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Calendar,
  X,
  Target,
  FlaskConical,
  Zap,
  ChevronRight,
  Edit2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, Idea, Maturity, NextAction } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, TextArea, Select } from './UI';
import Swal from 'sweetalert2';
import { format, isAfter, parseISO } from 'date-fns';
import { cn } from '@/src/lib/utils';

export function IdeaManager() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [maturityFilter, setMaturityFilter] = useState<Maturity | 'All'>('All');
  const [actionFilter, setActionFilter] = useState<NextAction | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);

  // Detail/Edit Modal State
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    maturity: 'Thin' as Maturity,
    next_action: 'Research' as NextAction,
    remind_at: ''
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    maturity: 'Thin' as Maturity,
    next_action: 'Research' as NextAction,
    remind_at: ''
  });

  useEffect(() => {
    fetchIdeas();
  }, [showArchived]);

  const fetchIdeas = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', showArchived)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ideas:', error);
    } else {
      setIdeas(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    if (!formData.title.trim()) {
      Swal.fire('Error', 'Title is required', 'error');
      return;
    }

    const newIdea = {
      user_id: userId,
      title: formData.title,
      description: formData.description,
      maturity: formData.maturity,
      next_action: formData.next_action,
      remind_at: formData.remind_at || null,
      is_archived: false
    };

    const { data, error } = await supabase
      .from('ideas')
      .insert([newIdea])
      .select()
      .single();

    if (error) {
      Swal.fire('Error', 'Failed to save idea', 'error');
    } else {
      setIdeas([data, ...ideas]);
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        maturity: 'Thin',
        next_action: 'Research',
        remind_at: ''
      });
      Swal.fire({
        title: 'Idea Captured',
        text: 'Your idea has been documented successfully.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const handleViewDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setEditFormData({
      title: idea.title,
      description: idea.description,
      maturity: idea.maturity,
      next_action: idea.next_action,
      remind_at: idea.remind_at || ''
    });
    setIsEditing(false);
    setIsDetailOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea) return;

    if (!editFormData.title.trim()) {
      Swal.fire('Error', 'Title is required', 'error');
      return;
    }

    const updatedIdea = {
      title: editFormData.title,
      description: editFormData.description,
      maturity: editFormData.maturity,
      next_action: editFormData.next_action,
      remind_at: editFormData.remind_at || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ideas')
      .update(updatedIdea)
      .eq('id', selectedIdea.id)
      .select()
      .single();

    if (error) {
      Swal.fire('Error', 'Failed to update idea', 'error');
    } else {
      setIdeas(ideas.map(i => i.id === selectedIdea.id ? data : i));
      setSelectedIdea(data);
      setIsEditing(false);
      Swal.fire({
        title: 'Updated',
        text: 'Idea details saved.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const handleToggleArchive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('ideas')
      .update({ is_archived: !currentStatus })
      .eq('id', id);

    if (error) {
      Swal.fire('Error', 'Failed to update idea', 'error');
    } else {
      setIdeas(ideas.filter(i => i.id !== id));
    }
  };

  const handleDelete = async (id: string) => {
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
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (error) {
        Swal.fire('Error', 'Failed to delete idea', 'error');
      } else {
        setIdeas(ideas.filter(i => i.id !== id));
        Swal.fire('Deleted!', 'Your idea has been deleted.', 'success');
      }
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMaturity = maturityFilter === 'All' || idea.maturity === maturityFilter;
    const matchesAction = actionFilter === 'All' || idea.next_action === actionFilter;
    return matchesSearch && matchesMaturity && matchesAction;
  });

  const getActionIcon = (action: NextAction) => {
    switch (action) {
      case 'Execute Now': return <Zap className="w-4 h-4 text-emerald-500" />;
      case 'Research': return <FlaskConical className="w-4 h-4 text-bca-blue" />;
      case 'Plan': return <Target className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {showArchived ? 'Archived Ideas' : 'Idea Repository'}
          </h2>
          <p className="text-slate-500 mt-1">Document, categorize, and never lose a brilliant spark again.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "p-3 rounded-xl transition-all shadow-sm border",
              showArchived ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
            )}
            title={showArchived ? "Back to Active" : "View Archive"}
          >
            <Archive className="w-5 h-5" />
          </button>
          {!showArchived && (
            <Button onClick={() => setShowAddModal(true)} className="h-11 px-6 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Capture Idea</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Quick View (Active only) */}
      {!showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-4 border-l-4 border-emerald-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Execute Now</p>
                <h4 className="text-xl font-black text-slate-900">{ideas.filter(i => i.next_action === 'Execute Now').length}</h4>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4 border-l-4 border-bca-blue">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bca-blue/5 rounded-lg">
                <FlaskConical className="w-5 h-5 text-bca-blue" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Research Required</p>
                <h4 className="text-xl font-black text-slate-900">{ideas.filter(i => i.next_action === 'Research').length}</h4>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Planning Stage</p>
                <h4 className="text-xl font-black text-slate-900">{ideas.filter(i => i.next_action === 'Plan').length}</h4>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            placeholder="Search through your sparks..." 
            className="pl-12 h-12" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select 
            value={maturityFilter} 
            onChange={(e) => setMaturityFilter(e.target.value as Maturity | 'All')}
            className="h-12 w-40"
          >
            <option value="All">All Maturity</option>
            <option value="Thin">Thin (Draft)</option>
            <option value="Mature">Mature (Solid)</option>
          </Select>
          <Select 
            value={actionFilter} 
            onChange={(e) => setActionFilter(e.target.value as NextAction | 'All')}
            className="h-12 w-48"
          >
            <option value="All">All Actions</option>
            <option value="Execute Now">Execute Now</option>
            <option value="Research">Research</option>
            <option value="Plan">Plan</option>
          </Select>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredIdeas.map((idea, idx) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              layout
            >
              <GlassCard 
                className="h-full flex flex-col group hover:border-bca-blue/30 transition-all cursor-pointer overflow-hidden relative border-white/40"
                onClick={() => handleViewDetail(idea)}
              >
                {/* Status Bar */}
                <div className={cn(
                  "h-1.5 w-full",
                  idea.next_action === 'Execute Now' ? "bg-emerald-500" : 
                  idea.next_action === 'Research' ? "bg-bca-blue" : "bg-amber-500"
                )} />

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                        idea.maturity === 'Mature' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {idea.maturity}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-100">
                        {getActionIcon(idea.next_action)}
                        <span className="text-[10px] font-bold text-slate-700 uppercase">{idea.next_action}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleViewDetail(idea); }}
                        className="p-1.5 text-slate-400 hover:text-bca-blue hover:bg-bca-blue/5 rounded-lg transition-all"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleArchive(idea.id, idea.is_archived); }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(idea.id); }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{idea.title}</h3>
                  <p className="text-sm text-slate-500 mb-6 line-clamp-3 leading-relaxed">{idea.description || 'No description provided.'}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5 text-slate-300" />
                       <span className="text-[10px] font-bold text-slate-400">
                        {format(new Date(idea.created_at), 'MMM dd, yyyy')}
                       </span>
                    </div>
                    {idea.remind_at && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                        isAfter(new Date(), parseISO(idea.remind_at)) ? "bg-rose-50 text-rose-600" : "bg-bca-blue/5 text-bca-blue"
                      )}>
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {format(parseISO(idea.remind_at), 'MMM dd')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredIdeas.length === 0 && !isLoading && (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No ideas found</h3>
          <p className="text-slate-500">Capture your thoughts before they slip away into the void.</p>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <GlassCard className="p-8 shadow-2xl border-white/20">
                <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/10 backdrop-blur-lg -mx-8 -mt-8 p-8 border-b border-white/20 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bca-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">New Idea Spark</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document it now before it's gone</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idea Heading</label>
                    <Input 
                      placeholder="What's the spark?" 
                      className="h-12 text-base font-medium"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Context</label>
                    <TextArea 
                      placeholder="Flesh out the idea briefly..." 
                      className="min-h-[120px] text-sm py-4"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maturity Level</label>
                      <Select 
                        value={formData.maturity}
                        onChange={e => setFormData({ ...formData, maturity: e.target.value as Maturity })}
                        className="h-12"
                      >
                        <option value="Thin">Thin (Surface Level)</option>
                        <option value="Mature">Mature (Ready)</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Engagement</label>
                      <Select 
                        value={formData.next_action}
                        onChange={e => setFormData({ ...formData, next_action: e.target.value as NextAction })}
                        className="h-12"
                      >
                        <option value="Research">Research (Study)</option>
                        <option value="Plan">Plan (Blueprint)</option>
                        <option value="Execute Now">Execute Now (Action)</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recall Reminder (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        type="date" 
                        className="h-12 pl-12"
                        value={formData.remind_at}
                        onChange={e => setFormData({ ...formData, remind_at: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1 h-12 uppercase font-black text-[11px] tracking-widest border-slate-200">
                      Discard
                    </Button>
                    <Button type="submit" className="flex-2 h-12 uppercase font-black text-[11px] tracking-widest shadow-xl shadow-bca-blue/20">
                      Document Spark
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail / Edit Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedIdea && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setIsDetailOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <GlassCard className="p-8 shadow-2xl border-white/20">
                <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/10 backdrop-blur-lg -mx-8 -mt-8 p-8 border-b border-white/20 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bca-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                        {isEditing ? 'Edit Idea' : 'Idea Vision'}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {isEditing ? 'Refine your spark into a flame' : 'The architecture of your thought'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-bca-blue hover:bg-bca-blue/10 rounded-full transition-colors"
                        title="Edit Idea"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  {isEditing ? (
                    <form onSubmit={handleUpdate} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idea Heading</label>
                        <Input 
                          placeholder="What's the spark?" 
                          className="h-12 text-base font-medium"
                          value={editFormData.title}
                          onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Context</label>
                        <TextArea 
                          placeholder="Flesh out the idea briefly..." 
                          className="min-h-[120px] text-sm py-4"
                          value={editFormData.description}
                          onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maturity Level</label>
                          <Select 
                            value={editFormData.maturity}
                            onChange={e => setEditFormData({ ...editFormData, maturity: e.target.value as Maturity })}
                            className="h-12"
                          >
                            <option value="Thin">Thin (Surface Level)</option>
                            <option value="Mature">Mature (Ready)</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Engagement</label>
                          <Select 
                            value={editFormData.next_action}
                            onChange={e => setEditFormData({ ...editFormData, next_action: e.target.value as NextAction })}
                            className="h-12"
                          >
                            <option value="Research">Research (Study)</option>
                            <option value="Plan">Plan (Blueprint)</option>
                            <option value="Execute Now">Execute Now (Action)</option>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recall Reminder (Optional)</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            type="date" 
                            className="h-12 pl-12"
                            value={editFormData.remind_at}
                            onChange={e => setEditFormData({ ...editFormData, remind_at: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex gap-4">
                        <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="flex-1 h-12 uppercase font-black text-[11px] tracking-widest border-slate-200">
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-2 h-12 uppercase font-black text-[11px] tracking-widest shadow-xl shadow-bca-blue/20">
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-8 pb-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idea Heading</label>
                         <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">{selectedIdea.title}</h2>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insights & Context</label>
                         <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedIdea.description || 'No detailed context provided for this spark.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maturity</label>
                           <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter",
                                selectedIdea.maturity === 'Mature' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                              )}>
                                {selectedIdea.maturity}
                              </span>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Action</label>
                           <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full w-fit">
                              {getActionIcon(selectedIdea.next_action)}
                              <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{selectedIdea.next_action}</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Captured On</span>
                           <span className="text-xs font-bold text-slate-700">{format(new Date(selectedIdea.created_at), 'MMMM dd, yyyy')}</span>
                        </div>
                        {selectedIdea.remind_at && (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled Recall</span>
                            <div className="flex items-center gap-1.5 text-bca-blue">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-xs font-black uppercase">{format(parseISO(selectedIdea.remind_at), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
