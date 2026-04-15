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
import { Problem, Status, RootCause, ActionPlan } from '@/src/lib/supabase';
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
  const [problems, setProblems] = useState<Problem[]>(MOCK_PROBLEMS);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [causes, setCauses] = useState<RootCause[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleCreateProblem = () => {
    const problem: Problem = {
      ...newProblem as Problem,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      user_id: 'current-user'
    };
    setProblems([problem, ...problems]);
    setNewProblem({
      title: '',
      category: 'Technical',
      context: '',
      significance: 5,
      impact: '',
      status: 'Pending'
    });
    setView('dashboard');
  };

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    // In real app, fetch causes and plans from Supabase here
    setCauses([]);
    setPlans([]);
    setView('detail');
  };

  const handleAddCause = (cause: string, parentId: string | null) => {
    const newCause: RootCause = {
      id: Math.random().toString(36).substr(2, 9),
      problem_id: selectedProblem!.id,
      cause,
      parent_id: parentId,
      is_highlighted: false,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    setCauses([...causes, newCause]);
  };

  const handleAddPlan = (plan: Partial<ActionPlan>) => {
    const newPlan: ActionPlan = {
      ...plan as ActionPlan,
      id: Math.random().toString(36).substr(2, 9),
      problem_id: selectedProblem!.id,
      created_at: new Date().toISOString()
    };
    setPlans([...plans, newPlan]);
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
                  Log New Problem
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
                      <Select 
                        value={newProblem.category}
                        onChange={e => setNewProblem({ ...newProblem, category: e.target.value })}
                      >
                        <option value="Technical">Technical</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Process">Process</option>
                        <option value="Human Resource">Human Resource</option>
                        <option value="Financial">Financial</option>
                      </Select>
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
                      onDelete={(id) => setCauses(causes.filter(c => c.id !== id))}
                      onToggleHighlight={(id) => setCauses(causes.map(c => ({
                        ...c,
                        is_highlighted: c.id === id ? !c.is_highlighted : false
                      })))}
                      onUpdateStatus={(id, status) => setCauses(causes.map(c => 
                        c.id === id ? { ...c, status } : c
                      ))}
                    />
                  </GlassCard>
                </div>

                {/* Right Column: Action & Outcome */}
                <div className="space-y-5 flex flex-col h-full">
                  <GlassCard className="p-5 flex-1">
                    <ActionPlanManager 
                      plans={plans}
                      onAdd={handleAddPlan}
                      onDelete={(id) => setPlans(plans.filter(p => p.id !== id))}
                      onUpdate={(id, updates) => setPlans(plans.map(p => 
                        p.id === id ? { ...p, ...updates } : p
                      ))}
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
                        <Button variant="secondary" className="bg-white text-bca-blue border-none text-[11px] px-3">Update</Button>
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
