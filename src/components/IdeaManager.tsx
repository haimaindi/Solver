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
  Info,
  Share2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, Idea, Maturity, NextAction } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, TextArea, Select } from './UI';
import Swal from 'sweetalert2';
import { format, isAfter, parseISO } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { AccessManagerModal } from './AccessManagerModal';

export function IdeaManager() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [maturityFilter, setMaturityFilter] = useState<Maturity | 'All'>('All');
  const [actionFilter, setActionFilter] = useState<NextAction | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [sharingResourceId, setSharingResourceId] = useState<string | null>(null);
  const [sharingResourceLabel, setSharingResourceLabel] = useState<string>('');

  // Detail/Edit Modal State
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  useEffect(() => {
    fetchIdeas();
  }, [showArchived, showShared]);

  const fetchIdeas = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    setIsLoading(true);

    if (showShared) {
      const { data: sharedEntries } = await supabase
        .from('resource_shares')
        .select('shared_by, resource_id')
        .eq('module_name', 'ideas')
        .eq('shared_with_solver_id', userId);
      
      if (!sharedEntries || sharedEntries.length === 0) {
        setIdeas([]);
        setIsLoading(false);
        return;
      }
      
      const moduleWideOwnerIds = sharedEntries.filter(s => !s.resource_id).map(s => s.shared_by);
      const specificResourceIds = sharedEntries.filter(s => s.resource_id).map(s => s.resource_id);

      let data: Idea[] = [];
      
      // Fetch module-wide shared ideas
      if (moduleWideOwnerIds.length > 0) {
        const { data: moduleData } = await supabase
          .from('ideas')
          .select('*')
          .in('user_id', moduleWideOwnerIds)
          .eq('is_archived', false);
        if (moduleData) data = [...data, ...moduleData];
      }

      // Fetch specific shared ideas
      if (specificResourceIds.length > 0) {
        const { data: specificData } = await supabase
          .from('ideas')
          .select('*')
          .in('id', specificResourceIds)
          .eq('is_archived', false);
        if (specificData) {
          // Avoid duplicates if already added via module-wide
          const existingIds = new Set(data.map(i => i.id));
          const uniqueSpecific = specificData.filter(i => !existingIds.has(i.id));
          data = [...data, ...uniqueSpecific];
        }
      }

      setIdeas(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setIsLoading(false);
      return;
    }

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

  const handleAddIdea = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'NEW IDEA SPARK',
      html: `
        <div class="text-left space-y-5 px-1">
          <div class="space-y-2">
            <input id="swal-title" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-sm font-bold placeholder:text-slate-300 transition-all" placeholder="What's the spark?">
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description / Context</label>
            <textarea id="swal-description" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-xs sm:text-sm min-h-[120px] placeholder:text-slate-300 transition-all resize-none" placeholder="Flesh out the idea briefly..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Maturity</label>
              <select id="swal-maturity" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-xs font-bold bg-white appearance-none transition-all">
                <option value="Thin">Thin (Draft)</option>
                <option value="Mature">Mature (Solid)</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Next Action</label>
              <select id="swal-action" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-xs font-bold bg-white appearance-none transition-all">
                <option value="Research">Research (Study)</option>
                <option value="Plan">Plan (Blueprint)</option>
                <option value="Execute Now">Execute Now (Action)</option>
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Recall Reminder (Optional)</label>
            <input id="swal-remind" type="date" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-sm font-bold transition-all">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'RECORD',
      cancelButtonText: 'DISCARD',
      confirmButtonColor: '#003399',
      cancelButtonColor: '#6b7280',
      width: 'min(520px, 95vw)',
      padding: '3rem 2rem',
      customClass: {
        popup: 'rounded-[40px] border-none shadow-2xl overflow-hidden',
        title: 'text-2xl font-black text-slate-900 pb-4 uppercase tracking-tighter',
        htmlContainer: 'text-left overflow-visible p-0 mt-4',
        confirmButton: 'rounded-2xl px-10 py-4 font-black uppercase tracking-widest text-[11px] h-14 shadow-xl shadow-bca-blue/20 m-2',
        cancelButton: 'rounded-2xl px-10 py-4 font-black uppercase tracking-widest text-[11px] h-14 bg-slate-500 shadow-xl shadow-slate-200 m-2',
        actions: 'flex gap-4 w-full justify-center pt-4'
      },
      preConfirm: () => {
        const title = (document.getElementById('swal-title') as HTMLInputElement).value;
        const description = (document.getElementById('swal-description') as HTMLTextAreaElement).value;
        const maturity = (document.getElementById('swal-maturity') as HTMLSelectElement).value;
        const next_action = (document.getElementById('swal-action') as HTMLSelectElement).value;
        const remind_at = (document.getElementById('swal-remind') as HTMLInputElement).value;

        if (!title.trim()) {
          Swal.showValidationMessage('Title is required');
          return false;
        }

        return { title, description, maturity, next_action, remind_at };
      }
    });

    if (formValues) {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;

      const newIdea = {
        user_id: userId,
        title: formValues.title,
        description: formValues.description,
        maturity: formValues.maturity as Maturity,
        next_action: formValues.next_action as NextAction,
        remind_at: formValues.remind_at || null,
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
        Swal.fire({
          title: 'Idea Recorded',
          icon: 'success',
          toast: true,
          backdrop: false,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      }
    }
  };

  const handleEditIdea = async (idea: Idea) => {
    const { value: formValues } = await Swal.fire({
      title: 'REFINE IDEA SPARK',
      html: `
        <div class="text-left space-y-5 px-1">
          <div class="space-y-2">
            <input id="swal-title" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-sm font-bold placeholder:text-slate-300 transition-all" placeholder="What's the spark?" value="${idea.title.replace(/"/g, '&quot;')}">
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description / Context</label>
            <textarea id="swal-description" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-xs sm:text-sm min-h-[120px] placeholder:text-slate-300 transition-all resize-none" placeholder="Flesh out the idea briefly...">${(idea.description || '').replace(/"/g, '&quot;')}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Maturity</label>
              <select id="swal-maturity" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-xs font-bold bg-white appearance-none transition-all">
                <option value="Thin" ${idea.maturity === 'Thin' ? 'selected' : ''}>Thin (Draft)</option>
                <option value="Mature" ${idea.maturity === 'Mature' ? 'selected' : ''}>Mature (Solid)</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Next Action</label>
              <select id="swal-action" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-xs font-bold bg-white appearance-none transition-all">
                <option value="Research" ${idea.next_action === 'Research' ? 'selected' : ''}>Research (Study)</option>
                <option value="Plan" ${idea.next_action === 'Plan' ? 'selected' : ''}>Plan (Blueprint)</option>
                <option value="Execute Now" ${idea.next_action === 'Execute Now' ? 'selected' : ''}>Execute Now (Action)</option>
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Recall Reminder (Optional)</label>
            <input id="swal-remind" type="date" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-bca-blue focus:outline-none text-sm font-bold transition-all" value="${idea.remind_at || ''}">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'RECORD',
      cancelButtonText: 'DISCARD',
      confirmButtonColor: '#003399',
      cancelButtonColor: '#6b7280',
      width: 'min(520px, 95vw)',
      padding: '3rem 2rem',
      customClass: {
        popup: 'rounded-[40px] border-none shadow-2xl overflow-hidden',
        title: 'text-2xl font-black text-slate-900 pb-4 uppercase tracking-tighter',
        htmlContainer: 'text-left overflow-visible p-0 mt-4',
        confirmButton: 'rounded-2xl px-10 py-4 font-black uppercase tracking-widest text-[11px] h-14 shadow-xl shadow-bca-blue/20 m-2',
        cancelButton: 'rounded-2xl px-10 py-4 font-black uppercase tracking-widest text-[11px] h-14 bg-slate-500 shadow-xl shadow-slate-200 m-2',
        actions: 'flex gap-4 w-full justify-center pt-4'
      },
      preConfirm: () => {
        const title = (document.getElementById('swal-title') as HTMLInputElement).value;
        const description = (document.getElementById('swal-description') as HTMLTextAreaElement).value;
        const maturity = (document.getElementById('swal-maturity') as HTMLSelectElement).value;
        const next_action = (document.getElementById('swal-action') as HTMLSelectElement).value;
        const remind_at = (document.getElementById('swal-remind') as HTMLInputElement).value;

        if (!title.trim()) {
          Swal.showValidationMessage('Title is required');
          return false;
        }

        return { title, description, maturity, next_action, remind_at };
      }
    });

    if (formValues) {
      const updatedIdea = {
        title: formValues.title,
        description: formValues.description,
        maturity: formValues.maturity as Maturity,
        next_action: formValues.next_action as NextAction,
        remind_at: formValues.remind_at || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('ideas')
        .update(updatedIdea)
        .eq('id', idea.id)
        .select()
        .single();

      if (error) {
        Swal.fire('Error', 'Failed to update idea', 'error');
      } else {
        setIdeas(ideas.map(i => i.id === idea.id ? data : i));
        if (selectedIdea?.id === idea.id) setSelectedIdea(data);
        Swal.fire({
          title: 'Refinement Recorded',
          icon: 'success',
          toast: true,
          backdrop: false,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      }
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
      {/* Access Manager Modal */}
      <AccessManagerModal 
        isOpen={isAccessModalOpen} 
        onClose={() => setIsAccessModalOpen(false)} 
        moduleName="ideas" 
        resourceId={null}
      />
      <AccessManagerModal 
        isOpen={!!sharingResourceId}
        onClose={() => {
          setSharingResourceId(null);
          setSharingResourceLabel('');
        }}
        moduleName="ideas"
        resourceId={sharingResourceId}
        resourceLabel={sharingResourceLabel}
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {showShared ? 'Shared Ideas' : (showArchived ? 'Archived Ideas' : 'Idea Repository')}
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Document, categorize, and never lose a brilliant spark again.</p>
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
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">My Ideas</span>
            </button>
          </div>

          {(!showArchived && !showShared) && (
            <Button onClick={handleAddIdea} className="h-11 px-6 flex items-center gap-2 shadow-lg shadow-bca-blue/20">
              <Plus className="w-4 h-4" />
              <span>Capture Idea</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Quick View (Active only) */}
      {(!showArchived && !showShared) && (
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
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
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
                onClick={() => handleEditIdea(idea)}
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
                      {idea.user_id === localStorage.getItem('user_id') && (
                        <>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSharingResourceId(idea.id);
                              setSharingResourceLabel(idea.title);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Share Idea"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditIdea(idea); }}
                            className="p-1.5 text-slate-400 hover:text-bca-blue hover:bg-bca-blue/5 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
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
                        </>
                      )}
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
    </div>
  );
}
