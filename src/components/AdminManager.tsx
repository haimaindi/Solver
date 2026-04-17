import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, X, Shield, Calendar, Clock, User, LogIn, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input, TextArea } from './UI';
import { format, addDays, parseISO } from 'date-fns';
import Swal from 'sweetalert2';
import { cn } from '@/src/lib/utils';

interface AppUser {
  id: string;
  code: string;
  password: string;
  username: string | null;
  start_date: string | null;
  duration: number | null;
  end_date: string | null;
  is_unlimited: boolean | null;
  gemini_api_keys: string[] | null;
  created_at: string;
}

export function AdminManager() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    password: '',
    username: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    duration: 1,
    end_date: '',
    is_unlimited: false,
    gemini_api_keys: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update end_date automatically when start_date or duration changes
  useEffect(() => {
    if (formData.start_date && formData.duration) {
      const start = parseISO(formData.start_date);
      const end = addDays(start, formData.duration * 31);
      setFormData(prev => ({ ...prev, end_date: format(end, 'yyyy-MM-dd') }));
    }
  }, [formData.start_date, formData.duration]);

  async function fetchUsers() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('app_access')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsers(data);
    if (error) console.error('Error fetching users:', error);
    setIsLoading(false);
  }

  const handleOpenModal = (user: AppUser | null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        code: user.code,
        password: user.password,
        username: user.username || '',
        start_date: user.start_date ? format(parseISO(user.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        duration: user.duration || 1,
        end_date: user.end_date ? format(parseISO(user.end_date), 'yyyy-MM-dd') : '',
        is_unlimited: user.is_unlimited || false,
        gemini_api_keys: user.gemini_api_keys?.join(', ') || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        code: '',
        password: '',
        username: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        duration: 1,
        end_date: '',
        is_unlimited: false,
        gemini_api_keys: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: formData.code,
      password: formData.password,
      username: formData.username,
      start_date: formData.is_unlimited ? null : formData.start_date,
      duration: formData.is_unlimited ? null : formData.duration,
      end_date: formData.is_unlimited ? null : formData.end_date,
      is_unlimited: formData.is_unlimited,
      gemini_api_keys: formData.gemini_api_keys.split(',').map(k => k.trim()).filter(Boolean)
    };

    if (editingUser) {
      const { error } = await supabase
        .from('app_access')
        .update(payload)
        .eq('id', editingUser.id);

      if (!error) {
        Swal.fire('Success', 'User updated successfully', 'success');
        setIsModalOpen(false);
        fetchUsers();
      } else {
        Swal.fire('Error', error.message, 'error');
      }
    } else {
      const { error } = await supabase
        .from('app_access')
        .insert([{ ...payload, id: crypto.randomUUID() }]);

      if (!error) {
        Swal.fire('Success', 'User created successfully', 'success');
        setIsModalOpen(false);
        fetchUsers();
      } else {
        Swal.fire('Error', error.message, 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This user will lose access immediately!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003399',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('app_access').delete().eq('id', id);
      if (!error) {
        Swal.fire('Deleted!', 'User has been removed.', 'success');
        fetchUsers();
      } else {
        Swal.fire('Error', error.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-bca-blue" />
            System Administration
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Manage access codes and platform user permissions.</p>
        </div>
        <Button onClick={() => handleOpenModal(null)} className="h-11 px-6 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>New User</span>
        </Button>
      </div>

      <GlassCard className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Credentials</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Period</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bca-blue/5 flex items-center justify-center text-bca-blue border border-bca-blue/10">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{user.username || 'Unnamed User'}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {user.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">Code:</span>
                        <span className="font-mono font-bold text-slate-700">{user.code}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">Pass:</span>
                        <span className="font-mono text-slate-400 select-all">{user.password}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-2 py-1 rounded-md font-bold text-xs",
                      user.is_unlimited ? "bg-bca-blue/10 text-bca-blue" : "bg-slate-100 text-slate-600"
                    )}>
                      {user.is_unlimited ? 'Unlimited' : `${user.duration || 1} Months`}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      {user.is_unlimited ? (
                        <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Lifetime Access</div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            <Calendar className="w-3 h-3 text-emerald-500" />
                            <span>{user.start_date ? format(parseISO(user.start_date), 'MMM d, yyyy') : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>{user.end_date ? format(parseISO(user.end_date), 'MMM d, yyyy') : '-'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-bca-blue bg-bca-blue/5 hover:bg-bca-blue/10 rounded-lg transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic">No users found. Start by adding a new one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg"
            >
              <GlassCard className="p-8 shadow-2xl border-white/20">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-bca-blue flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      {editingUser ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add Access Code'}</h3>
                      <p className="text-slate-500 text-xs font-medium">Configure account details and access period.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Code</label>
                      <Input 
                        required 
                        value={formData.code} 
                        onChange={e => setFormData({ ...formData, code: e.target.value })} 
                        placeholder="e.g. USER001"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                       <Input 
                        required 
                        value={formData.password} 
                        onChange={e => setFormData({ ...formData, password: e.target.value })} 
                        placeholder="Secret key"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username / Display Name</label>
                    <Input 
                      required 
                      value={formData.username} 
                      onChange={e => setFormData({ ...formData, username: e.target.value })} 
                      placeholder="e.g. Alex Johnson"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-bca-blue/5 rounded-2xl border border-bca-blue/10">
                    <input 
                      type="checkbox"
                      id="unlimited"
                      className="w-5 h-5 rounded border-slate-300 text-bca-blue focus:ring-bca-blue cursor-pointer"
                      checked={formData.is_unlimited}
                      onChange={e => setFormData({ ...formData, is_unlimited: e.target.checked })}
                    />
                    <label htmlFor="unlimited" className="text-sm font-bold text-slate-700 cursor-pointer">Unlimited Access?</label>
                  </div>

                  {!formData.is_unlimited && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                          <Input 
                            type="date"
                            required 
                            value={formData.start_date} 
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration (Months)</label>
                          <Input 
                            type="number"
                            min="1"
                            required 
                            value={formData.duration} 
                            onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })} 
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-calculated End Date</label>
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-bca-blue" />
                          {formData.end_date ? format(parseISO(formData.end_date), 'MMMM d, yyyy') : 'Calculating...'}
                        </div>
                        <p className="text-[9px] text-slate-400 italic font-medium pt-1">Period is calculated as {formData.duration} x 31 days from start date.</p>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gemini API Keys (Comma Separated)</label>
                      <button 
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[10px] font-bold text-bca-blue hover:text-bca-light-blue flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-bca-blue/5 transition-all outline-none"
                      >
                        {showApiKey ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide Keys</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Show Keys</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative group">
                      <TextArea 
                        value={formData.gemini_api_keys} 
                        onChange={e => setFormData({ ...formData, gemini_api_keys: e.target.value })} 
                        placeholder="key-1, key-2, key-3..."
                        className={cn(
                          "min-h-[100px] text-xs font-mono transition-all duration-300",
                          !showApiKey && "blur-[8px] select-none pointer-events-none opacity-40 grayscale"
                        )}
                      />
                      {!showApiKey && (
                        <div 
                          onClick={() => setShowApiKey(true)}
                          className="absolute inset-0 flex items-center justify-center cursor-pointer rounded-lg bg-black/5 hover:bg-black/10 transition-all z-10"
                        >
                          <div className="bg-white/95 px-4 py-2 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2.5 text-slate-600 text-[11px] font-bold uppercase tracking-wider transform hover:scale-105 transition-transform">
                            <Shield className="w-4 h-4 text-bca-blue" />
                            Click to Reveal Keys
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 italic">User can have multiple keys for rolling access.</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="ghost" className="flex-1 h-12" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-12 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      <span>{editingUser ? 'Save Updates' : 'Grant Access'}</span>
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
