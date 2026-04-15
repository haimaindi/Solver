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
  Target
} from 'lucide-react';
import { Problem, Status, RootCause, ActionPlan, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, Select, TextArea } from './components/UI';
import { Fishbone } from './components/Fishbone';
import { ActionPlanManager } from './components/ActionPlan';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';

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
  const [view, setView] = useState<'dashboard' | 'detail' | 'create'>('dashboard');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [causes, setCauses] = useState<RootCause[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(['Technical', 'Infrastructure', 'Process', 'Human Resource', 'Financial']);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

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
      // Extract unique categories from existing problems
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

  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProblem = async () => {
    const categoryToUse = showCustomCategory ? customCategory : newProblem.category;
    
    if (!categoryToUse) return;

    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('problems')
      .insert([{
        ...newProblem,
        category: categoryToUse,
        user_id: userData.user?.id || '00000000-0000-0000-0000-000000000000'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating problem:', error);
      return;
    }

    if (data) {
      setProblems([data, ...problems]);
      if (showCustomCategory) {
        setCategories(prev => Array.from(new Set([...prev, customCategory])));
      }
      setNewProblem({
        title: '',
        category: 'Technical',
        context: '',
        significance: 5,
        impact: '',
        status: 'Pending'
      });
      setCustomCategory('');
      setShowCustomCategory(false);
      handleSelectProblem(data);
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
            <span className="text-[13px] font-medium text-slate-900">Eng. Ridwan Saputra</span>
            <div className="w-8 h-8 rounded-full bg-bca-blue text-white flex items-center justify-center text-xs font-bold">RS</div>
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
                <Button onClick={() => setView('create')} className="h-11 px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  New Problem
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
                <Button variant="secondary" className="h-11 px-6">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProblems.map((problem, i) => (
                  <GlassCard 
                    key={problem.id} 
                    delay={i * 0.1}
                    onClick={() => handleSelectProblem(problem)}
                    className="group cursor-pointer hover:ring-2 hover:ring-bca-blue/20 transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant={problem.status}>{problem.status}</Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{problem.category}</span>
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

          {view === 'create' && (
            <motion.div 
              key="create"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <GlassCard className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Log New Problem</h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Problem Title</label>
                    <Input 
                      placeholder="e.g., Database connection timeouts in production" 
                      value={newProblem.title}
                      onChange={e => setNewProblem({ ...newProblem, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      {!showCustomCategory ? (
                        <Select 
                          value={newProblem.category}
                          onChange={e => {
                            if (e.target.value === 'ADD_NEW') {
                              setShowCustomCategory(true);
                            } else {
                              setNewProblem({ ...newProblem, category: e.target.value });
                            }
                          }}
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="ADD_NEW" className="text-bca-blue font-bold">+ Add New Category...</option>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Type new category..." 
                            value={customCategory}
                            onChange={e => setCustomCategory(e.target.value)}
                            autoFocus
                          />
                          <Button variant="secondary" onClick={() => setShowCustomCategory(false)} className="px-3">Cancel</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Significance (1-10)</label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={newProblem.significance}
                        onChange={e => setNewProblem({ ...newProblem, significance: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Context / Goal</label>
                    <Input 
                      placeholder="What is the context or goal this problem hinders?" 
                      value={newProblem.context}
                      onChange={e => setNewProblem({ ...newProblem, context: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Impact Description</label>
                    <TextArea 
                      placeholder="Describe the long-term impact of this problem..." 
                      value={newProblem.impact}
                      onChange={e => setNewProblem({ ...newProblem, impact: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setView('dashboard')}>Cancel</Button>
                    <Button onClick={handleCreateProblem} className="px-8">Create Problem Log</Button>
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

              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_300px] gap-5 items-start">
                {/* Left Column: Problem Info */}
                <div className="space-y-5">
                  <GlassCard className="p-5">
                    <div className="text-[12px] font-bold text-bca-blue uppercase tracking-wider mb-4">Problem Context</div>
                    <div className="space-y-4">
                      <div className="meta-group">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Kategori</div>
                        <div className="text-[13px] font-semibold">{selectedProblem.category}</div>
                      </div>
                      <div className="meta-group">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Konteks & Tujuan</div>
                        <div className="text-[13px] font-medium leading-snug">{selectedProblem.context}</div>
                      </div>
                      <div className="meta-group">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Signifikansi (Skala 1-10)</div>
                        <div className="h-[6px] bg-slate-100 rounded-full overflow-hidden my-2">
                          <div 
                            className="h-full bg-bca-blue" 
                            style={{ width: `${selectedProblem.significance * 10}%` }} 
                          />
                        </div>
                        <div className="text-[11px] font-bold text-right text-slate-600">
                          {selectedProblem.significance >= 8 ? 'Critical' : selectedProblem.significance >= 5 ? 'Moderate' : 'Low'} ({selectedProblem.significance})
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-5 bg-[#fff5f5] border-l-4 border-l-red-500">
                    <div className="text-[10px] text-red-800 uppercase font-bold mb-2">Dampak Utama</div>
                    <p className="text-[12px] text-red-900 leading-relaxed">
                      {selectedProblem.impact}
                    </p>
                  </GlassCard>
                </div>

                {/* Middle Column: Analysis */}
                <div className="space-y-5">
                  <GlassCard className="p-5 min-h-[500px]">
                    <Fishbone 
                      causes={causes}
                      onAdd={handleAddCause}
                      onDelete={handleDeleteCause}
                      onToggleHighlight={handleToggleCauseHighlight}
                      onUpdateStatus={handleUpdateCauseStatus}
                    />
                  </GlassCard>
                </div>

                {/* Right Column: Action & Outcome */}
                <div className="space-y-5 flex flex-col h-full">
                  <GlassCard className="p-5 flex-1">
                    <ActionPlanManager 
                      plans={plans}
                      onAdd={handleAddPlan}
                      onDelete={handleDeletePlan}
                      onUpdate={handleUpdatePlan}
                    />
                  </GlassCard>

                  <GlassCard className="p-5 bg-bca-blue text-white border-none mt-auto">
                    <div className="text-[10px] text-white/70 uppercase font-bold mb-3">Final Outcome</div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">Status:</span>
                        <Badge variant={selectedProblem.status} className="bg-white/20 text-white border-none">
                          {selectedProblem.status}
                        </Badge>
                      </div>
                      <TextArea 
                        className="bg-white/10 border-white/20 text-white text-[12px] placeholder:text-white/40 focus:ring-white/30 min-h-[60px]"
                        placeholder="What was the final result?"
                        value={selectedProblem.outcome}
                        onChange={e => setSelectedProblem({ ...selectedProblem, outcome: e.target.value })}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <Select 
                          className="flex-1 bg-white/10 border-white/20 text-white text-[11px]"
                          value={selectedProblem.status}
                          onChange={e => setSelectedProblem({ ...selectedProblem, status: e.target.value as Status })}
                        >
                          <option value="Pending" className="text-slate-900">Pending</option>
                          <option value="Success" className="text-slate-900">Success</option>
                          <option value="Cancel" className="text-slate-900">Cancel</option>
                        </Select>
                        <Button 
                          variant="secondary" 
                          className="bg-white text-bca-blue border-none text-[11px] px-3"
                          onClick={handleUpdateProblemOutcome}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </div>
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
