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
  Pencil,
  Trash2,
  TrendingUp,
  ListTodo, 
  Sparkles,
  ChevronDown,
  Waypoints, 
  BookOpen,
  Loader2
} from 'lucide-react';
import { Problem, Status, RootCause, ActionPlan, Reflection, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, Select, TextArea } from './components/UI';
import { Fishbone } from './components/Fishbone';
import { ActionPlanManager } from './components/ActionPlan';
import { ReflectionManager } from './components/Reflection';
import { HabitTracker } from './components/HabitTracker';
import { Supplement } from './components/Supplement';
import { cn } from '@/src/lib/utils';
import { format, isAfter, addDays } from 'date-fns';
import { PROFILE_NAME } from './profile';
import Swal from 'sweetalert2';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

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

function AuthGate({ isAuthenticated, onLogin, children }: { isAuthenticated: boolean, onLogin: (code: string, pass: string) => void, children: React.ReactNode }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-bca-blue/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-bca-blue/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative"
      >
        <GlassCard className="p-8 space-y-8 border-white/20 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-bca-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-bca-blue/20">
              <Waypoints className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Solver Access</h2>
            <p className="text-slate-500 text-sm">Please enter your credentials to access the platform.</p>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); onLogin(code, pass); }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Code</label>
                <Input 
                  placeholder="Enter code" 
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="h-12 bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <Input 
                  type="password"
                  placeholder="Enter password" 
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  className="h-12 bg-white/50"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-bold uppercase tracking-widest">
              Unlock Platform
            </Button>
          </form>

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2026 Daily Solver Engineering</p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'dashboard' | 'list' | 'detail' | 'create' | 'edit' | 'supplement' | 'reflection' | 'habits'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [causes, setCauses] = useState<RootCause[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [categories, setCategories] = useState(['Technical', 'Infrastructure', 'Process', 'Human Resource', 'Financial']);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchProblems();

    // Mobile Gestures
    let touchStart = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEnd = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      
      // Pull to refresh
      if (window.scrollY === 0 && touchEnd - touchStart > 150) {
        window.location.reload();
      }

      // Swipe back (left to right) - Edge swipe detection (0-30px)
      if (touchStartX < 30 && touchEndX - touchStartX > 100 && Math.abs(touchEnd - touchStart) < 50) {
        if (view !== 'dashboard') {
          setIsSwiping(true);
          setTimeout(() => {
            if (view === 'detail') setView('list');
            else setView('dashboard');
            setIsSwiping(false);
          }, 300);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [view]);

  const checkAuth = () => {
    const auth = localStorage.getItem('solver_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);
  };

  const handleLogin = async (code: string, pass: string) => {
    const { data, error } = await supabase
      .from('app_access')
      .select('*')
      .eq('code', code)
      .eq('password', pass)
      .single();

    if (data) {
      localStorage.setItem('solver_auth', 'true');
      setIsAuthenticated(true);
      Swal.fire({
        title: 'Access Granted',
        text: 'Welcome back to Solver',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } else {
      Swal.fire('Access Denied', 'Invalid code or password', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('solver_auth');
    setIsAuthenticated(false);
  };

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

    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticProblem: Problem = {
      ...newProblem as Problem,
      id: tempId,
      created_at: new Date().toISOString(),
      user_id: 'temp'
    };
    setProblems([optimisticProblem, ...problems]);
    setView('list');

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
      setProblems(problems.filter(p => p.id !== tempId));
      Swal.fire('Error', 'Failed to create problem', 'error');
      return;
    }

    if (data) {
      setProblems(prev => prev.map(p => p.id === tempId ? data : p));
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

    // Optimistic Update
    const originalProblems = [...problems];
    setProblems(problems.map(p => p.id === editingProblem.id ? editingProblem : p));
    setView('list');

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
      setProblems(originalProblems);
      Swal.fire('Error', 'Failed to update problem', 'error');
      return;
    }

    if (data) {
      setProblems(prev => prev.map(p => p.id === data.id ? data : p));
      setEditingProblem(null);
    }
  };

  const handleDeleteProblem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "All related root causes and action plans will be removed!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003399',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    // Optimistic Update
    const originalProblems = [...problems];
    setProblems(problems.filter(p => p.id !== id));

    const { error } = await supabase.from('problems').delete().eq('id', id);
    if (error) {
      console.error('Error deleting problem:', error);
      setProblems(originalProblems);
      Swal.fire('Error', 'Failed to delete problem', 'error');
    } else {
      if (selectedProblem?.id === id) {
        setSelectedProblem(null);
        setView('list');
      }
      Swal.fire('Deleted!', 'Problem has been deleted.', 'success');
    }
  };

  const handleSelectProblem = async (problem: Problem) => {
    setSelectedProblem(problem);
    await fetchDetails(problem.id);
    setView('detail');
  };

  const handleAddCause = async (cause: string, parentId: string | null) => {
    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticCause: RootCause = {
      id: tempId,
      problem_id: selectedProblem!.id,
      cause,
      parent_id: parentId,
      is_highlighted: false,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    setCauses([...causes, optimisticCause]);

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

    if (data) {
      setCauses(prev => prev.map(c => c.id === tempId ? data : c));
    }
    if (error) {
      console.error('Error adding cause:', error);
      setCauses(causes.filter(c => c.id !== tempId));
      Swal.fire('Error', 'Failed to add cause', 'error');
    }
  };

  const handleDeleteCause = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Cause?',
      text: "This will remove this cause and all its sub-causes.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003399',
      cancelButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    // Optimistic Update
    const originalCauses = [...causes];
    setCauses(causes.filter(c => c.id !== id));

    const { error } = await supabase.from('root_causes').delete().eq('id', id);
    if (error) {
      console.error('Error deleting cause:', error);
      setCauses(originalCauses);
      Swal.fire('Error', 'Failed to delete cause', 'error');
    }
  };

  const handleUpdateCauseStatus = async (id: string, status: Status) => {
    // Optimistic Update
    const originalCauses = [...causes];
    setCauses(causes.map(c => c.id === id ? { ...c, status } : c));

    const { error } = await supabase.from('root_causes').update({ status }).eq('id', id);
    if (error) {
      console.error('Error updating status:', error);
      setCauses(originalCauses);
    }
  };

  const handleToggleCauseHighlight = async (id: string) => {
    const cause = causes.find(c => c.id === id);
    if (!cause) return;
    
    // Optimistic Update
    const originalCauses = [...causes];
    setCauses(causes.map(c => ({
      ...c,
      is_highlighted: c.id === id ? !c.is_highlighted : false
    })));

    // First, unhighlight all for this problem
    await supabase.from('root_causes').update({ is_highlighted: false }).eq('problem_id', selectedProblem!.id);
    
    const { error } = await supabase.from('root_causes').update({ is_highlighted: !cause.is_highlighted }).eq('id', id);
    if (error) {
      console.error('Error toggling highlight:', error);
      setCauses(originalCauses);
    }
  };

  const handleAddPlan = async (plan: Partial<ActionPlan>) => {
    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticPlan: ActionPlan = {
      ...plan as ActionPlan,
      id: tempId,
      problem_id: selectedProblem!.id,
      created_at: new Date().toISOString()
    };
    setPlans([...plans, optimisticPlan]);

    const { data, error } = await supabase
      .from('action_plans')
      .insert([{
        ...plan,
        problem_id: selectedProblem!.id
      }])
      .select()
      .single();

    if (data) {
      setPlans(prev => prev.map(p => p.id === tempId ? data : p));
    }
    if (error) {
      console.error('Error adding plan:', error);
      setPlans(plans.filter(p => p.id !== tempId));
      Swal.fire('Error', 'Failed to add action plan', 'error');
    }
  };

  const handleDeletePlan = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Action Plan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003399',
      cancelButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    // Optimistic Update
    const originalPlans = [...plans];
    setPlans(plans.filter(p => p.id !== id));

    const { error } = await supabase.from('action_plans').delete().eq('id', id);
    if (error) {
      console.error('Error deleting plan:', error);
      setPlans(originalPlans);
      Swal.fire('Error', 'Failed to delete action plan', 'error');
    }
  };

  const handleUpdatePlan = async (id: string, updates: Partial<ActionPlan>) => {
    // Optimistic Update
    const originalPlans = [...plans];
    setPlans(plans.map(p => p.id === id ? { ...p, ...updates } : p));

    const { error } = await supabase.from('action_plans').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating plan:', error);
      setPlans(originalPlans);
    }
  };

  const handleUpdateProblemOutcome = async () => {
    if (!selectedProblem) return;

    // Optimistic Update
    const originalProblems = [...problems];
    setProblems(problems.map(p => p.id === selectedProblem.id ? selectedProblem : p));

    const { error } = await supabase
      .from('problems')
      .update({ 
        outcome: selectedProblem.outcome,
        status: selectedProblem.status,
        completion_date: selectedProblem.status === 'Success' ? new Date().toISOString() : null
      })
      .eq('id', selectedProblem.id);
    
    if (error) {
      console.error('Error updating outcome:', error);
      setProblems(originalProblems);
      Swal.fire('Error', 'Failed to update outcome', 'error');
    } else {
      Swal.fire('Success', 'Outcome updated successfully', 'success');
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-bca-blue animate-spin" />
      </div>
    );
  }

  return (
    <AuthGate isAuthenticated={isAuthenticated} onLogin={handleLogin}>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-bca-blue/10 selection:text-bca-blue">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 h-[64px] bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-8">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => {
              if (window.innerWidth < 768) setIsSidebarOpen(true);
              else setView('dashboard');
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group-active:scale-90">
              <Target className="text-bca-blue w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-bca-blue uppercase">Solver</h1>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => setView('dashboard')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'dashboard' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'list' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <ListTodo className="w-4 h-4" />
              Problem List
            </button>
            <button 
              onClick={() => setView('reflection')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'reflection' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <BookOpen className="w-4 h-4" />
              Reflection
            </button>
            <button 
              onClick={() => setView('habits')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'habits' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Habit Tracker
            </button>
            <button 
              onClick={() => setView('supplement')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'supplement' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Supplement
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-slate-900">{PROFILE_NAME}</span>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                  <Target className="text-bca-blue w-7 h-7" />
                </div>
                <h1 className="text-xl font-extrabold tracking-tighter text-bca-blue uppercase">Solver</h1>
              </div>
              
              <div className="flex-1 p-4 space-y-2">
                <button 
                  onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'dashboard' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </button>
                <button 
                  onClick={() => { setView('list'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'list' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <ListTodo className="w-5 h-5" />
                  Problem List
                </button>
                <button 
                  onClick={() => { setView('reflection'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'reflection' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <BookOpen className="w-5 h-5" />
                  Reflection
                </button>
                <button 
                  onClick={() => { setView('habits'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'habits' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <TrendingUp className="w-5 h-5" />
                  Habit Tracker
                </button>
                <button 
                  onClick={() => { setView('supplement'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'supplement' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Sparkles className="w-5 h-5" />
                  Supplement
                </button>
              </div>

              <div className="p-6 border-t border-slate-100">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-bca-blue/10 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-bca-blue" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{PROFILE_NAME}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.main 
        animate={{ 
          scale: isSwiping ? 0.96 : 1,
          opacity: isSwiping ? 0.7 : 1,
          x: isSwiping ? 20 : 0
        }}
        transition={{ duration: 0.3 }}
        className="max-w-[1400px] mx-auto px-6 py-6 min-h-[calc(100vh-64px)]"
      >
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
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
                  <p className="text-slate-500 mt-1">Real-time overview of engineering problem solving metrics.</p>
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-3">
                  <Button variant="secondary" onClick={() => setView('list')} className="h-11 px-6 flex-1 md:flex-none">View All Problems</Button>
                  <Button onClick={() => setView('create')} className="h-11 px-6 flex items-center justify-center gap-2 flex-1 md:flex-none">
                    <Plus className="w-4 h-4" />
                    <span>New Problem</span>
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassCard className="p-6 border-l-4 border-l-bca-blue">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Problems</p>
                      <h3 className="text-3xl font-bold text-slate-900">{problems.length}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-bca-blue/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-bca-blue" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-emerald-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>Active tracking enabled</span>
                  </div>
                </GlassCard>

                <GlassCard className="p-6 border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Solved</p>
                      <h3 className="text-3xl font-bold text-slate-900">
                        {problems.filter(p => p.status === 'Success').length}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400">
                    {Math.round((problems.filter(p => p.status === 'Success').length / (problems.length || 1)) * 100)}% resolution rate
                  </p>
                </GlassCard>

                <GlassCard className="p-6 border-l-4 border-l-amber-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pending</p>
                      <h3 className="text-3xl font-bold text-slate-900">
                        {problems.filter(p => p.status === 'Pending').length}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400">Requires immediate attention</p>
                </GlassCard>

                <GlassCard className="p-6 border-l-4 border-l-rose-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cancelled</p>
                      <h3 className="text-3xl font-bold text-slate-900">
                        {problems.filter(p => p.status === 'Cancel').length}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-rose-500" />
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400">Archived/Not feasible</p>
                </GlassCard>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <GlassCard className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Problem Distribution by Category</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categories.map(cat => ({
                        name: cat,
                        count: problems.filter(p => p.category === cat).length
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="count" fill="#003399" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Status Breakdown</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Success', value: problems.filter(p => p.status === 'Success').length, color: '#10b981' },
                            { name: 'Pending', value: problems.filter(p => p.status === 'Pending').length, color: '#f59e0b' },
                            { name: 'Cancel', value: problems.filter(p => p.status === 'Cancel').length, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { color: '#10b981' },
                            { color: '#f59e0b' },
                            { color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              {/* Deadline Tracker */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Upcoming Action Plan Deadlines</h3>
                  <Badge variant="Pending">Critical Attention</Badge>
                </div>
                <div className="overflow-x-auto -mx-6 px-6 pb-4">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Title</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {problems
                        .filter(p => p.status === 'Pending')
                        .slice(0, 5)
                        .map(problem => (
                        <tr key={problem.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <span className="text-[13px] font-bold text-slate-900">{problem.title}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[11px] font-medium text-slate-500">{problem.category}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[11px] font-bold text-amber-600">
                              {format(addDays(new Date(problem.created_at), 7), 'MMM d, yyyy')}
                            </span>
                          </td>
                          <td className="py-4">
                            <Badge variant={problem.status}>{problem.status}</Badge>
                          </td>
                          <td className="py-4">
                            <button 
                              onClick={() => handleSelectProblem(problem)}
                              className="text-bca-blue hover:underline text-[11px] font-bold"
                            >
                              Analyze Now
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Problem List</h2>
                  <p className="text-slate-500 mt-1">Detailed view of all documented engineering challenges.</p>
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
                          className="p-1.5 text-bca-blue bg-bca-blue/5 hover:bg-bca-blue/10 rounded-md transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProblem(problem.id, e)}
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-all"
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

          {view === 'supplement' && (
            <motion.div 
              key="supplement"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Supplement />
            </motion.div>
          )}

          {view === 'reflection' && (
            <motion.div 
              key="reflection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ReflectionManager />
            </motion.div>
          )}

          {view === 'habits' && (
            <motion.div 
              key="habits"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <HabitTracker />
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
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <div className="relative">
                        <div 
                          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-bca-blue/10 focus:border-bca-blue transition-all text-sm flex items-center justify-between cursor-pointer"
                        >
                          <span className={cn((view === 'create' ? !newProblem.category : !editingProblem?.category) && "text-slate-400")}>
                            {(view === 'create' ? newProblem.category : editingProblem?.category) || "Select category..."}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>

                        <AnimatePresence>
                          {showCategoryDropdown && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
                            >
                              <div className="p-2 border-b border-slate-100">
                                <Input 
                                  placeholder="Search or type new..." 
                                  className="h-9 text-xs"
                                  autoFocus
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (view === 'create') setNewProblem({ ...newProblem, category: val });
                                    else setEditingProblem({ ...editingProblem!, category: val });
                                  }}
                                />
                              </div>
                              <div className="max-h-[200px] overflow-y-auto">
                                {categories.map(cat => (
                                  <div 
                                    key={cat}
                                    onClick={() => {
                                      if (view === 'create') setNewProblem({ ...newProblem, category: cat });
                                      else setEditingProblem({ ...editingProblem!, category: cat });
                                      setShowCategoryDropdown(false);
                                    }}
                                    className="px-4 py-2 text-sm text-slate-700 hover:bg-bca-blue/5 hover:text-bca-blue cursor-pointer transition-colors"
                                  >
                                    {cat}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
                      setView('list');
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
                <Button variant="ghost" onClick={() => setView('list')} className="p-2">
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
                  <GlassCard className="p-6 min-h-[500px] overflow-hidden">
                    <div className="overflow-x-auto hide-scrollbar -mx-6 px-6">
                      <div className="min-w-[500px]">
                        <Fishbone 
                          causes={causes}
                          onAdd={handleAddCause}
                          onDelete={handleDeleteCause}
                          onToggleHighlight={handleToggleCauseHighlight}
                          onUpdateStatus={handleUpdateCauseStatus}
                        />
                      </div>
                    </div>
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
                          type={selectedProblem.completion_date ? "date" : "text"}
                          placeholder="dd/mm/yyyy"
                          className="bg-slate-50 border-slate-200 text-[13px]"
                          value={selectedProblem.completion_date ? format(new Date(selectedProblem.completion_date), 'yyyy-MM-dd') : ''}
                          onFocus={(e) => (e.target.type = "date")}
                          onBlur={(e) => {
                            if (!e.target.value) e.target.type = "text";
                          }}
                          onChange={e => setSelectedProblem({ ...selectedProblem, completion_date: e.target.value || null })}
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
      </motion.main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Waypoints className="w-5 h-5 text-bca-blue" />
            <span className="font-bold text-slate-900">Solver</span>
            <span className="text-slate-400 text-sm">© 2026 Daily Solver Engineering</span>
          </div>

        </div>
      </footer>
      </div>
    </AuthGate>
  );
}
