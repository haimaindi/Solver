import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  BarChart3,
  LayoutDashboard,
  LogOut,
  User,
  Target,
  Settings,
  Trash2
} from 'lucide-react';
import { Problem, Status, RootCause, ActionPlan, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, Select, TextArea } from './components/UI';
import { Fishbone } from './components/Fishbone';
import { ActionPlanManager } from './components/ActionPlan';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { PROFILE_NAME } from './profile';

// Mock Data for initial view if Supabase is not connected
const MOCK_PROBLEMS: Problem[] = [
  {
    id: '1',
    title: 'High Server Latency during Peak Hours',
    category: 'Infrastructure',
    context: 'Customer satisfaction and checkout conversion',
    significance: 8,
    impact: 'Users experience 5s+ load times, leading to 15% cart abandonment.',
    status: 'Pending',
    completion_date: null,
    outcome: '',
    created_at: new Date().toISOString(),
    user_id: 'user1'
  }
];

export default function App() {
  const [view, setView] = useState<'dashboard' | 'detail' | 'create' | 'edit'>('dashboard');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [causes, setCauses] = useState<RootCause[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [categories, setCategories] = useState(['Technical', 'Infrastructure', 'Process', 'Human Resource', 'Financial']);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setProblems(data);
      const existingCategories = Array.from(new Set(data.map(p => p.category)));
      setCategories(prev => Array.from(new Set([...prev, ...existingCategories])));
    }
    if (error) console.error('Error fetching problems:', error);
  };

  const fetchDetails = async (problemId: string) => {
    const [causesRes, plansRes] = await Promise.all([
      supabase.from('root_causes').select('*').eq('problem_id', problemId).order('created_at', { ascending: true }),
      supabase.from('action_plans').select('*').eq('problem_id', problemId).order('created_at', { ascending: true })
    ]);

    if (causesRes.data) setCauses(causesRes.data);
    if (plansRes.data) setPlans(plansRes.data);
  };

  // Form states for new problem
  const [newProblem, setNewProblem] = useState<Partial<Problem>>({
    title: '',
    category: 'Technical',
    context: '',
    significance: 5,
    impact: '',
    status: 'Pending'
  });

  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProblem = async () => {
    if (!newProblem.category) return;

    const { data, error } = await supabase
      .from('problems')
      .insert([{
        ...newProblem,
        category: newProblem.category
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating problem:', error);
      return;
    }

    if (data) {
      setProblems([data, ...problems]);
      setCategories(prev => Array.from(new Set([...prev, data.category])));
      setNewProblem({
        title: '',
        category: 'Technical',
        context: '',
        significance: 5,
        impact: '',
        status: 'Pending'
      });
      handleSelectProblem(data);
    }
  };

  const handleUpdateProblem = async () => {
    if (!editingProblem) return;

    const { data, error } = await supabase
      .from('problems')
      .update({
        title: editingProblem.title,
        category: editingProblem.category,
        context: editingProblem.context,
        significance: editingProblem.significance,
        impact: editingProblem.impact,
        status: editingProblem.status
      })
      .eq('id', editingProblem.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating problem:', error);
      return;
    }

    if (data) {
      setProblems(problems.map(p => p.id === data.id ? data : p));
      setEditingProblem(null);
      setView('dashboard');
    }
  };

  const handleDeleteProblem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this problem? All related root causes and action plans will be removed.')) return;

    const { error } = await supabase.from('problems').delete().eq('id', id);
    if (!error) {
      setProblems(problems.filter(p => p.id !== id));
      if (selectedProblem?.id === id) {
        setSelectedProblem(null);
        setView('dashboard');
      }
    } else {
      console.error('Error deleting problem:', error);
    }
  };

  const handleSelectProblem = async (problem: Problem) => {
    setSelectedProblem(problem);
    await fetchDetails(problem.id);
    setView('detail');
  };

  const handleAddCause = async (cause: string, parentId: string | null) => {
    const { data, error } = await supabase
      .from('root_causes')
      .insert([{
        problem_id: selectedProblem!.id,
        cause,
        parent_id: parentId,
        is_highlighted: false,
        status: 'Pending'
      }])
      .select()
      .single();

    if (data) setCauses([...causes, data]);
    if (error) console.error('Error adding cause:', error);
  };

  const handleDeleteCause = async (id: string) => {
    const { error } = await supabase.from('root_causes').delete().eq('id', id);
    if (!error) setCauses(causes.filter(c => c.id !== id));
  };

  const handleUpdateCauseStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from('root_causes').update({ status }).eq('id', id);
    if (!error) setCauses(causes.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleToggleCauseHighlight = async (id: string) => {
    const cause = causes.find(c => c.id === id);
    if (!cause) return;
    
    // First, unhighlight all for this problem
    await supabase.from('root_causes').update({ is_highlighted: false }).eq('problem_id', selectedProblem!.id);
    
    const { error } = await supabase.from('root_causes').update({ is_highlighted: !cause.is_highlighted }).eq('id', id);
    if (!error) {
      setCauses(causes.map(c => ({
        ...c,
        is_highlighted: c.id === id ? !c.is_highlighted : false
      })));
    }
  };

  const handleAddPlan = async (plan: Partial<ActionPlan>) => {
    const { data, error } = await supabase
      .from('action_plans')
      .insert([{
        ...plan,
        problem_id: selectedProblem!.id
      }])
      .select()
      .single();

    if (data) setPlans([...plans, data]);
    if (error) console.error('Error adding plan:', error);
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await supabase.from('action_plans').delete().eq('id', id);
    if (!error) setPlans(plans.filter(p => p.id !== id));
  };

  const handleUpdatePlan = async (id: string, updates: Partial<ActionPlan>) => {
    const { error } = await supabase.from('action_plans').update(updates).eq('id', id);
    if (!error) setPlans(plans.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleUpdateProblemOutcome = async () => {
    if (!selectedProblem) return;
    const { error } = await supabase
      .from('problems')
      .update({ 
        outcome: selectedProblem.outcome,
        status: selectedProblem.status,
        completion_date: selectedProblem.status === 'Success' ? new Date().toISOString() : null
      })
      .eq('id', selectedProblem.id);
    
    if (!error) {
      setProblems(problems.map(p => p.id === selectedProblem.id ? selectedProblem : p));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-bca-blue/10 selection:text-bca-blue">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 h-[64px] bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 bg-bca-blue rounded-lg flex items-center justify-center shadow-lg shadow-bca-blue/20">
            <Target className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-bca-blue uppercase">Solver</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-slate-900">{PROFILE_NAME}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-6 min-h-[calc(100vh-64px)]">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Problem Dashboard</h2>
                  <p className="text-slate-500 mt-1">Track and solve engineering challenges systematically.</p>
                </div>
                <Button onClick={() => setView('create')} className="h-11 px-6 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>New Problem</span>
                </Button>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input 
                    placeholder="Search problems or categories..." 
                    className="pl-12 h-11"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select 
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as Status | 'All')}
                    className="h-11"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Success">Success</option>
                    <option value="Cancel">Cancel</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProblems.map((problem, i) => (
                  <GlassCard 
                    key={problem.id} 
                    delay={i * 0.1}
                    onClick={() => handleSelectProblem(problem)}
                    className="group cursor-pointer hover:ring-2 hover:ring-bca-blue/20 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant={problem.status}>{problem.status}</Badge>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProblem(problem);
                            setView('edit');
                          }}
                          className="p-1.5 text-slate-400 hover:text-bca-blue hover:bg-bca-blue/5 rounded-md transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProblem(problem.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{problem.category}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-bca-blue transition-colors mb-2">{problem.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-6">{problem.impact}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {problem.significance}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Significance</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-bca-blue group-hover:translate-x-1 transition-all" />
                      </div>
                    </GlassCard>
                ))}
                
                {filteredProblems.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No problems found</h3>
                    <p className="text-slate-500">Try adjusting your search or log a new challenge.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {(view === 'create' || view === 'edit') && (
            <motion.div 
              key={view}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <GlassCard className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">
                  {view === 'create' ? 'Log New Problem' : 'Edit Problem Log'}
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Problem Title</label>
                    <Input 
                      placeholder="e.g., Database connection timeouts in production" 
                      value={view === 'create' ? newProblem.title : editingProblem?.title}
                      onChange={e => view === 'create' 
                        ? setNewProblem({ ...newProblem, title: e.target.value })
                        : setEditingProblem({ ...editingProblem!, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <Input 
                        list="category-suggestions"
                        placeholder="Type or select category..."
                        value={view === 'create' ? newProblem.category : editingProblem?.category}
                        onChange={e => view === 'create'
                          ? setNewProblem({ ...newProblem, category: e.target.value })
                          : setEditingProblem({ ...editingProblem!, category: e.target.value })
                        }
                      />
                      <datalist id="category-suggestions">
                        {categories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Significance (1-10)</label>
                        <span className="text-sm font-bold text-bca-blue">
                          {view === 'create' ? newProblem.significance : editingProblem?.significance}
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        step="1"
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-bca-blue"
                        value={view === 'create' ? newProblem.significance : editingProblem?.significance}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          view === 'create'
                            ? setNewProblem({ ...newProblem, significance: val })
                            : setEditingProblem({ ...editingProblem!, significance: val });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Context / Goal</label>
                    <Input 
                      placeholder="What is the context or goal this problem hinders?" 
                      value={view === 'create' ? newProblem.context : editingProblem?.context}
                      onChange={e => view === 'create'
                        ? setNewProblem({ ...newProblem, context: e.target.value })
                        : setEditingProblem({ ...editingProblem!, context: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Impact Description</label>
                    <TextArea 
                      placeholder="Describe the long-term impact of this problem..." 
                      value={view === 'create' ? newProblem.impact : editingProblem?.impact}
                      onChange={e => view === 'create'
                        ? setNewProblem({ ...newProblem, impact: e.target.value })
                        : setEditingProblem({ ...editingProblem!, impact: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => {
                      setView('dashboard');
                      setEditingProblem(null);
                    }}>Cancel</Button>
                    <Button 
                      onClick={view === 'create' ? handleCreateProblem : handleUpdateProblem} 
                      className="px-8"
                    >
                      {view === 'create' ? 'Create Problem Log' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {view === 'detail' && selectedProblem && (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setView('dashboard')} className="p-2">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedProblem.title}</h2>
                    <Badge variant={selectedProblem.status}>{selectedProblem.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Logged on {format(new Date(selectedProblem.created_at), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Section 1: Top - Full Width (Problem Info) */}
                <GlassCard className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Grid: Context & Goal (rata kiri) */}
                    <div className="flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">KONTEKS & TUJUAN</div>
                        <div className="text-[15px] font-medium text-slate-700 leading-relaxed text-left">
                          {selectedProblem.context}
                        </div>
                      </div>
                    </div>

                    {/* Right Grid: Category & Significance (rata kiri) */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">KATEGORI</div>
                        <div className="text-[18px] font-bold text-bca-blue text-left">
                          {selectedProblem.category}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">SIGNIFIKANSI</div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                            <div 
                              className="h-full bg-bca-blue" 
                              style={{ width: `${selectedProblem.significance * 10}%` }} 
                            />
                          </div>
                          <span className="text-[14px] font-bold text-slate-700">{selectedProblem.significance}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="text-[10px] text-red-600 uppercase font-bold tracking-wider mb-3">DAMPAK UTAMA</div>
                    <div className="text-[15px] text-slate-700 leading-relaxed bg-[#fff5f5] p-5 rounded-2xl border border-red-100/30">
                      {selectedProblem.impact}
                    </div>
                  </div>
                </GlassCard>

                {/* Section 2: Middle - 2 Columns (Analysis & Action Plan) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <GlassCard className="p-6 min-h-[500px]">
                    <Fishbone 
                      causes={causes}
                      onAdd={handleAddCause}
                      onDelete={handleDeleteCause}
                      onToggleHighlight={handleToggleCauseHighlight}
                      onUpdateStatus={handleUpdateCauseStatus}
                    />
                  </GlassCard>

                  <GlassCard className="p-6 min-h-[500px]">
                    <ActionPlanManager 
                      plans={plans}
                      onAdd={handleAddPlan}
                      onDelete={handleDeletePlan}
                      onUpdate={handleUpdatePlan}
                    />
                  </GlassCard>
                </div>

                {/* Section 3: Bottom - Full Width (Outcome) */}
                <GlassCard className="p-8 bg-white border border-slate-200 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-10">
                    <div className="flex-1 space-y-6">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">FINAL OUTCOME</div>
                      <div className="space-y-4">
                        <TextArea 
                          className="bg-slate-50 border-slate-200 text-bca-blue font-semibold text-[15px] placeholder:text-slate-300 focus:ring-bca-blue/10 min-h-[120px]"
                          placeholder="What was the final result?"
                          value={selectedProblem.outcome}
                          onChange={e => setSelectedProblem({ ...selectedProblem, outcome: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-80 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-slate-600 uppercase tracking-tight">Status:</span>
                          <Badge variant={selectedProblem.status}>{selectedProblem.status}</Badge>
                        </div>
                        <Select 
                          className="w-full bg-slate-50 border-slate-200 text-slate-700 text-[13px]"
                          value={selectedProblem.status}
                          onChange={e => setSelectedProblem({ ...selectedProblem, status: e.target.value as Status })}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Success">Success</option>
                          <option value="Cancel">Cancel</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completion Date</label>
                        <Input 
                          type="date"
                          className="bg-slate-50 border-slate-200 text-[13px]"
                          value={selectedProblem.completion_date ? format(new Date(selectedProblem.completion_date), 'yyyy-MM-dd') : ''}
                          onChange={e => setSelectedProblem({ ...selectedProblem, completion_date: e.target.value })}
                        />
                      </div>
                      <Button 
                        onClick={handleUpdateProblemOutcome}
                        className="w-full h-11 bg-bca-blue text-white font-bold uppercase tracking-wider text-[12px]"
                      >
                        Update Outcome
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-bca-blue" />
            <span className="font-bold text-slate-900">Solver</span>
            <span className="text-slate-400 text-sm">© 2026 Problem Solver Engineering</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-bca-blue transition-colors">Documentation</a>
            <a href="#" className="hover:text-bca-blue transition-colors">Methodology</a>
            <a href="#" className="hover:text-bca-blue transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
