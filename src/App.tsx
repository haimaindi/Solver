import React, { useState, useEffect, useRef } from 'react';
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
  Archive,
  TrendingUp,
  ListTodo, 
  Sparkles,
  X,
  Pill, 
  ChevronDown,
  Waypoints, 
  Puzzle,
  BookOpen,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Calendar
} from 'lucide-react';
import { Problem, Status, RootCause, ActionPlan, Reflection, supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, Badge, Select, TextArea } from './components/UI';
import { Fishbone } from './components/Fishbone';
import { ActionPlanManager } from './components/ActionPlan';
import { ReflectionManager } from './components/Reflection';
import { HabitTracker } from './components/HabitTracker';
import { TodoList } from './components/TodoList';
import { Supplement } from './components/Supplement';
import { AdminManager } from './components/AdminManager';
import { ProblemAdvisor } from './components/ProblemAdvisor';
import { cn } from '@/src/lib/utils';
import { differenceInDays, parseISO, format, addDays, isWithinInterval } from 'date-fns';
import { PROFILE_NAME } from './profile';
import { ASSETS } from './assets';
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
    is_archived: false,
    created_at: new Date().toISOString(),
    user_id: 'user1'
  }
];

function AuthGate({ isAuthenticated, onLogin, children }: { isAuthenticated: boolean, onLogin: (code: string, pass: string) => void, children: React.ReactNode }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Clear credentials on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setCode('');
      setPass('');
    }
  }, [isAuthenticated]);

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
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password" 
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    className="h-12 bg-white/50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-bca-blue transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
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
  const [view, setView] = useState<'dashboard' | 'list' | 'detail' | 'create' | 'edit' | 'supplement' | 'reflection' | 'habits' | 'todos' | 'admin'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [causes, setCauses] = useState<RootCause[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [dashboardPlans, setDashboardPlans] = useState<(ActionPlan & { problem_title?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [showArchivedProblems, setShowArchivedProblems] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [worldTime, setWorldTime] = useState<Date>(new Date());
  const [categories, setCategories] = useState(['Technical', 'Infrastructure', 'Process', 'Human Resource', 'Financial']);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [prefillTodo, setPrefillTodo] = useState<{ task: string; description: string; date: string } | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProblems();
      fetchDashboardPlans();
    }
  }, [isAuthenticated, view, showArchivedProblems]);

  useEffect(() => {
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
  }, [view, showArchivedProblems]);

  // Sidebar Body Scroll Lock
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const checkAuth = async () => {
    const auth = localStorage.getItem('solver_auth');
    if (auth === 'true') {
      const data = localStorage.getItem('session_data');
      if (data) {
        const session = JSON.parse(data);
        const currentTime = await fetchWorldTime();
        setWorldTime(currentTime);
        
        // Force logout if expired (check against world time)
        // Use a strict date parser to avoid timezone local shifts
        const expiryDate = new Date(session.end_date + 'T00:00:00Z');
        
        if (session.end_date && !session.is_unlimited && currentTime >= expiryDate) {
          handleLogout();
          return;
        }

        setSessionData(session);
        setIsAuthenticated(true);
      } else {
        // No session data but auth true? Should probably logout
        handleLogout();
        return;
      }
    }
    setIsAuthChecking(false);
  };

  const fetchWorldTime = async (): Promise<Date> => {
    try {
      // Primary source: worldtimeapi.org
      const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
      if (!res.ok) throw new Error('Primary API failed');
      const data = await res.json();
      return parseISO(data.datetime);
    } catch (err) {
      console.warn('Primary world time API failed, trying secondary:', err);
      try {
        // Secondary source: timeapi.io
        const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC');
        if (!res.ok) throw new Error('Secondary API failed');
        const data = await res.json();
        return parseISO(data.dateTime);
      } catch (err2) {
        console.error('All world time APIs failed, falling back to local time:', err2);
        return new Date();
      }
    }
  };

  const handleLogin = async (code: string, pass: string) => {
    const { data, error } = await supabase
      .from('app_access')
      .select('*')
      .eq('code', code)
      .eq('password', pass)
      .single();

    if (data) {
      const worldNow = await fetchWorldTime();
      
      if (!data.is_unlimited) {
        const start = data.start_date ? parseISO(data.start_date) : worldNow;
        const end = data.end_date ? parseISO(data.end_date) : worldNow;

        if (!isWithinInterval(worldNow, { start, end })) {
          Swal.fire('Access Expired', `Your access period was from ${format(start, 'MMM d, yyyy')} to ${format(end, 'MMM d, yyyy')}`, 'error');
          return;
        }
      }

      localStorage.setItem('solver_auth', 'true');
      localStorage.setItem('user_id', data.id);
      localStorage.setItem('user_name', data.username || data.code);
      localStorage.setItem('session_data', JSON.stringify(data));
      setSessionData(data);
      setIsAuthenticated(true);
      
      // Auto-open profile modal on login
      setView('dashboard');
      setShowProfileModal(true);

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
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('session_data');
    setSessionData(null);
    setIsAuthenticated(false);
  };

  const handleToggleArchiveProblem = async (problemId: string, isCurrentlyArchived: boolean) => {
    const { error } = await supabase
      .from('problems')
      .update({ is_archived: !isCurrentlyArchived })
      .eq('id', problemId);
      
    if (!error) {
      fetchProblems();
      Swal.fire('Success', `Problem ${!isCurrentlyArchived ? 'archived' : 'unarchived'}`, 'success');
    } else {
      Swal.fire('Error', 'Failed to update problem status', 'error');
    }
  };

  const fetchProblems = async () => {
    const currentUser = localStorage.getItem('user_id');
    if (!isAuthenticated || !currentUser || currentUser === 'unknown') return;

    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('user_id', currentUser)
      .eq('is_archived', showArchivedProblems)
      .order('created_at', { ascending: false });
    
    if (data) {
      setProblems(data);
      // Get unique categories from user's problems
      const dbCategories = Array.from(new Set(data.map(p => p.category))).filter(Boolean);
      const defaultCategories = ['Technical', 'Infrastructure', 'Process', 'Human Resource', 'Financial'];
      
      // Merge defaults with DB categories, uniquely
      setCategories(prev => {
        const combined = Array.from(new Set([...defaultCategories, ...dbCategories])).sort();
        return combined;
      });
    }
    if (error) console.error('Error fetching problems:', error);
  };

  const fetchDashboardPlans = async () => {
    const currentUser = localStorage.getItem('user_id');
    if (!isAuthenticated || !currentUser || currentUser === 'unknown') return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('action_plans')
      .select(`
        *,
        problems (
          title
        )
      `)
      .eq('user_id', currentUser)
      .eq('is_controllable', true)
      .eq('status', 'Pending')
      .lte('scheduled_date', addDays(new Date(), 3).toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true });

    if (data) {
      const formattedPlans = data.map((plan: any) => ({
        ...plan,
        problem_title: plan.problems?.title || 'Unknown Problem'
      }));
      setDashboardPlans(formattedPlans);
    }
    if (error) console.error('Error fetching dashboard plans:', error);
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
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser || currentUser === 'unknown') {
      Swal.fire('Error', 'Authentication error. Please re-login.', 'error');
      return;
    }

    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticProblem: Problem = {
      ...newProblem as Problem,
      id: tempId,
      created_at: new Date().toISOString(),
      is_archived: false,
      user_id: currentUser
    };
    setProblems([optimisticProblem, ...problems]);
    setView('list');

    const { data, error } = await supabase
      .from('problems')
      .insert([{
        ...newProblem,
        category: newProblem.category,
        is_archived: false,
        user_id: currentUser
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

  const handleActionPlanToTodo = (description: string, notes: string, date: string | null) => {
    setPrefillTodo({
      task: description,
      description: notes || '',
      date: date || format(new Date(), 'yyyy-MM-dd')
    });
    setView('todos');
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
      user_id: null,
      is_archived: false,
      created_at: new Date().toISOString()
    };
    setPlans([...plans, optimisticPlan]);

    const { data, error } = await supabase
      .from('action_plans')
      .insert([{
        ...plan,
        problem_id: selectedProblem!.id,
        user_id: null
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
      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm"
            >
              <GlassCard className="p-8 shadow-2xl border-white/20">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-bca-blue flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{localStorage.getItem('user_name') || PROFILE_NAME}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Account</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setShowProfileModal(false)} className="p-1 -mr-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5 text-slate-400" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    {sessionData?.is_unlimited ? (
                       <div className="flex items-center gap-2 text-emerald-600">
                         
                         <span className="text-[13px] font-bold uppercase tracking-wider text-center block">Unlimited Access</span>
                       </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 text-slate-500">
                             <Calendar className="w-4 h-4" />
                             <span className="text-[11px] font-bold uppercase tracking-wider ">Access Expired</span>
                           </div>
                           <span className="text-[13px] font-bold text-slate-700">
                            {sessionData?.end_date ? format(parseISO(sessionData.end_date), 'MMM d, yyyy') : 'N/A'}
                           </span>
                        </div>
                        
                        {sessionData?.end_date && (
                          <div className="pt-2">
                            {(() => {
                              const daysLeft = differenceInDays(parseISO(sessionData.end_date), new Date());
                              if (daysLeft <= 7) {
                                return (
                                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-[11px] font-bold">Your access is about to expire in {daysLeft} days!</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-[11px] font-bold">Active subscription ({daysLeft} days left)</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                 <div className="flex gap-4 mt-6">
                    <Button 
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-[11px]"
                    >
                      UNDERSTAND
                    </Button>
                    <Button 
                      onClick={handleLogout}
                      className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest text-[11px]"
                    >
                      LOGOUT
                    </Button>
                 </div>

              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-bca-blue/10 selection:text-bca-blue">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 h-[64px] bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => {
            if (window.innerWidth < 768) setIsSidebarOpen(true);
            else setView('dashboard');
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden p-1 border border-slate-100 transition-all group-active:scale-95">
            <img src={ASSETS.LOGO_URL} alt="Solver" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-bca-blue uppercase">Solver</h1>
        </div>

        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <div className="hidden md:flex items-center gap-2 pointer-events-auto">
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
              <Puzzle className="w-4 h-4" />
              Problem
            </button>
            <button 
              onClick={() => setView('todos')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'todos' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <ListTodo className="w-4 h-4" />
              To Do
            </button>
            <button 
              onClick={() => setView('habits')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'habits' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Habit
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
              onClick={() => setView('supplement')}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                view === 'supplement' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Pill className="w-4 h-4" />
              Supplement
            </button>
            {localStorage.getItem('user_name') === 'admin' && (
              <button 
                onClick={() => setView('admin')}
                className={cn(
                  "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                  view === 'admin' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[13px] font-bold text-slate-900 leading-tight">{localStorage.getItem('user_name') || PROFILE_NAME}</span>
              {sessionData && (
                <span className={cn(
                  "text-[10px] leading-none mt-0.5",
                  (sessionData.is_unlimited || (sessionData.end_date && differenceInDays(new Date(sessionData.end_date + 'T00:00:00Z'), worldTime) > 7)) ? "text-emerald-600" : "text-rose-600"
                )}>
                  {sessionData.is_unlimited ? 'Unlimited Access' : 
                    (differenceInDays(new Date(sessionData.end_date + 'T00:00:00Z'), worldTime) < 0 ? 'Has expired' :
                    (differenceInDays(new Date(sessionData.end_date + 'T00:00:00Z'), worldTime) <= 7 ? `Expired at ${format(new Date(sessionData.end_date + 'T00:00:00Z'), 'dd/MM/yyyy')} (${differenceInDays(new Date(sessionData.end_date + 'T00:00:00Z'), worldTime)} days)` :
                    `Expired at ${format(new Date(sessionData.end_date + 'T00:00:00Z'), 'dd/MM/yyyy')}`))}
                </span>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden p-1 border border-slate-100">
                  <img src={ASSETS.LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-xl font-extrabold tracking-tighter text-bca-blue uppercase">Solver</h1>
              </div>
              
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                  <Puzzle className="w-5 h-5" />
                  Problem
                </button>
                <button 
                  onClick={() => { setView('todos'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'todos' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <ListTodo className="w-5 h-5" />
                  To Do
                </button>
                <button 
                  onClick={() => { setView('habits'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'habits' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <TrendingUp className="w-5 h-5" />
                  Habit
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
                  onClick={() => { setView('supplement'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    view === 'supplement' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Pill className="w-5 h-5" />
                  Supplement
                </button>
                {localStorage.getItem('user_name') === 'admin' && (
                  <button 
                    onClick={() => { setView('admin'); setIsSidebarOpen(false); }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                      view === 'admin' ? "bg-bca-blue/5 text-bca-blue" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Shield className="w-5 h-5" />
                    Admin
                  </button>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 mt-auto">

                 <Button 
                   onClick={handleLogout}
                   variant="ghost" 
                   className="w-full h-12 flex items-center justify-center gap-3 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-bold uppercase tracking-widest text-[11px]"
                 >
                   <LogOut className="w-4 h-4" />
                   Sign Out Platform
                 </Button>
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
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
                  <p className="text-slate-500 mt-1">Real-time overview of engineering problem solving metrics.</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-3">
                  <Button variant="secondary" onClick={() => setView('list')} className="h-11 px-6 w-full sm:w-auto">View All Problems</Button>
                  <Button onClick={() => setView('create')} className="h-11 px-6 flex items-center justify-center gap-2 w-full sm:w-auto">
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
                    <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0} debounce={50}>
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
                    <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0} debounce={50}>
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
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Title</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline</th>
                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dashboardPlans.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-sm italic">
                            No upcoming deadlines found.
                          </td>
                        </tr>
                      ) : (
                        dashboardPlans.map(plan => (
                          <tr 
                            key={plan.id} 
                            className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={async () => {
                              const { data: problem } = await supabase
                                .from('problems')
                                .select('*')
                                .eq('id', plan.problem_id)
                                .single();
                              if (problem) handleSelectProblem(problem);
                            }}
                          >
                            <td className="py-4">
                              <span className="text-[13px] font-bold text-slate-900 line-clamp-2 max-w-[300px] break-words leading-tight block">{plan.description}</span>
                            </td>
                            <td className="py-4">
                              <span className="text-[11px] font-medium text-slate-500 line-clamp-1 max-w-[200px] break-words block">{plan.problem_title}</span>
                            </td>
                            <td className="py-4">
                              <span className="text-[11px] font-bold text-amber-600">
                                {plan.scheduled_date ? format(new Date(plan.scheduled_date), 'MMM d, yyyy') : 'No date'}
                              </span>
                            </td>
                            <td className="py-4">
                              <Badge variant={plan.status}>{plan.status}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
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
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {showArchivedProblems ? 'Archived Problem' : 'Problem'}
                  </h2>
                  <p className="text-slate-500 mt-1">Detailed view of all documented engineering challenges.</p>
                </div>
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={() => setShowArchivedProblems(!showArchivedProblems)}
                    className={cn(
                      "p-3 rounded-xl transition-colors shadow-sm",
                      showArchivedProblems ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    title={showArchivedProblems ? "Show Active Problems" : "Show Archived Problems"}
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                  {!showArchivedProblems && (
                    <Button onClick={() => setView('create')} className="h-11 px-6 flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>New Problem</span>
                    </Button>
                  )}
                </div>
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
                            handleToggleArchiveProblem(problem.id, problem.is_archived);
                          }}
                          className="p-1.5 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-md transition-all"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
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
                          <div className="w-8 h-8 rounded-full bg-bca-blue flex items-center justify-center text-[10px] font-bold text-white shadow-sm shadow-bca-blue/20">
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

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminManager />
            </motion.div>
          )}

          {view === 'todos' && (
            <motion.div 
              key="todos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TodoList 
                prefillData={prefillTodo} 
                onPrefillHandled={() => setPrefillTodo(null)} 
              />
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
                    <div className="space-y-2 relative" ref={categoryRef}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <div className="relative">
                        <div 
                          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-bca-blue/10 focus:border-bca-blue transition-all text-sm flex items-center justify-between cursor-pointer"
                        >
                          <span className={cn((view === 'create' ? !newProblem.category : !editingProblem?.category) && "text-slate-400")}>
                            {(view === 'create' ? newProblem.category : editingProblem?.category) || "Select category..."}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" style={{ transform: showCategoryDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
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
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      setShowCategoryDropdown(false);
                                    }
                                  }}
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
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-bca-blue"
                        style={{
                          background: `linear-gradient(to right, #003399 0%, #003399 ${(( (view === 'create' ? newProblem.significance : editingProblem?.significance || 1) - 1) / 9) * 100}%, #f1f5f9 ${(( (view === 'create' ? newProblem.significance : editingProblem?.significance || 1) - 1) / 9) * 100}%, #f1f5f9 100%)`
                        }}
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setView('list')} className="p-2">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Logged on {format(new Date(selectedProblem.created_at), 'MMMM d, yyyy')}</h2>
                      <div className="flex items-center gap-3">
                         <Badge variant={selectedProblem.status}>{selectedProblem.status}</Badge>
                         <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setEditingProblem(selectedProblem);
                                setView('edit');
                              }}
                              className="p-1.5 text-bca-blue hover:bg-bca-blue/5 rounded-md transition-all"
                              title="Edit Problem"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteProblem(selectedProblem.id, e)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                              title="Delete Problem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Section 1: Top - Full Width (Problem Info) */}
                <GlassCard className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Grid: Context & Goal (rata kiri) */}
                    <div className="flex flex-col justify-between space-y-8">
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">MASALAH UTAMA</div>
                        <div className="text-[18px] font-bold text-slate-900 leading-tight">
                          {selectedProblem.title}
                        </div>
                      </div>

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
                  <GlassCard className="p-4 md:p-6 min-h-[500px] overflow-hidden">
                    <div className="w-full">
                      <div className="w-full">
                        <Fishbone 
                          causes={causes}
                          onAdd={handleAddCause}
                          onDelete={handleDeleteCause}
                          onToggleHighlight={handleToggleCauseHighlight}
                          onUpdateStatus={handleUpdateCauseStatus}
                          onUpdateCause={async (id, cause) => {
                            const { error } = await supabase.from('root_causes').update({ cause }).eq('id', id);
                            if (!error && selectedProblem) fetchDetails(selectedProblem.id);
                          }}
                        />
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4 md:p-6 min-h-[500px]">
                    <ActionPlanManager 
                      plans={plans}
                      onAdd={handleAddPlan}
                      onDelete={handleDeletePlan}
                      onUpdate={handleUpdatePlan}
                      onAddToTodo={handleActionPlanToTodo}
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
                          onClick={(e) => {
                            if (e.currentTarget.showPicker) {
                              try { e.currentTarget.showPicker(); } catch (err) {}
                            }
                          }}
                          onKeyDown={(e) => e.preventDefault()}
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

              {/* AI Expert Consultant (Floating) */}
              <ProblemAdvisor 
                problem={selectedProblem} 
                causes={causes} 
                plans={plans} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
      

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden p-1 border border-slate-100">
              <img src={ASSETS.LOGO_URL} alt="Solver Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <span className="font-bold text-slate-900">Solver</span>
            <span className="text-slate-400 text-sm">© 2026 Daily Solver Engineering</span>
          </div>

        </div>
      </footer>
      </div>
    </AuthGate>
  );
}
