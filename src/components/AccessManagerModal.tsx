import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Users, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '@/src/lib/supabase';
import { GlassCard, Button, Input } from './UI';

interface AccessManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  resourceId?: string | null;
  resourceLabel?: string;
}

export function AccessManagerModal({ isOpen, onClose, moduleName, resourceId = null, resourceLabel }: AccessManagerModalProps) {
  const [shares, setShares] = useState<any[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [newUserId, setNewUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchShares();
  }, [isOpen, moduleName, resourceId]);

  const fetchShares = async () => {
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser) return;
    setIsLoading(true);
    
    let query = supabase
      .from('resource_shares')
      .select('*')
      .eq('module_name', moduleName)
      .eq('shared_by', currentUser);

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    } else {
      query = query.is('resource_id', null);
    }

    const { data } = await query.order('created_at', { ascending: false });
    
    if (data) {
      setShares(data);
      // Fetch usernames for these IDs
      const uids = data.map(s => s.shared_with_solver_id);
      if (uids.length > 0) {
        const { data: usersData } = await supabase
          .from('app_access')
          .select('id, username')
          .in('id', uids);
        
        if (usersData) {
          const map: Record<string, string> = {};
          usersData.forEach(u => map[u.id] = u.username);
          setUsernames(prev => ({ ...prev, ...map }));
        }
      }
    }
    setIsLoading(false);
  };

  const handleShare = async () => {
    const targetUid = newUserId.trim();
    if (!targetUid) return;
    
    const myUserId = localStorage.getItem('user_id');
    setIsLoading(true);

    // 1. Verify user exists and get username (support short ID or full ID)
    const { data: userData, error: userError } = await supabase
      .from('app_access')
      .select('id, username')
      .or(`id.eq.${targetUid},id.ilike.${targetUid}%`)
      .maybeSingle();

    if (userError || !userData) {
      setIsLoading(false);
      Swal.fire({
        title: 'Error',
        text: 'User ID not found. Please verify the ID.',
        icon: 'error',
        customClass: { container: 'swal2-high-z' }
      });
      return;
    }

    const finalTargetId = userData.id;

    if (finalTargetId === myUserId) {
       setIsLoading(false);
       Swal.fire({
         title: 'Error',
         text: 'You cannot share with yourself',
         icon: 'error',
         customClass: { container: 'swal2-high-z' }
       });
       return;
    }

    // 2. Confirm share
    const confirm = await Swal.fire({
      title: 'Confirm Share',
      html: `Do you want to share access with:<br/><b class="text-bca-blue text-lg">${userData.username}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Grant Access',
      cancelButtonText: 'Cancel',
      customClass: { container: 'swal2-high-z' }
    });

    if (!confirm.isConfirmed) {
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('resource_shares').insert([{
      module_name: moduleName,
      resource_id: resourceId,
      shared_by: myUserId,
      shared_with_solver_id: finalTargetId
    }]);

    if (error) {
       if (error.code === '23505') {
          Swal.fire({
            title: 'Notice',
            text: 'Already shared with this User',
            icon: 'info',
            customClass: { container: 'swal2-high-z' }
          });
       } else {
          Swal.fire({
            title: 'Error',
            text: 'Failed to grant access',
            icon: 'error',
            customClass: { container: 'swal2-high-z' }
          });
       }
    } else {
       Swal.fire({ 
         title: 'Access Granted', 
         icon: 'success', 
         toast: true, 
         backdrop: false, 
         position: 'top-end', 
         showConfirmButton: false, 
         timer: 1500,
         customClass: { container: 'swal2-high-z' }
       });
       setNewUserId('');
       fetchShares();
    }
    setIsLoading(false);
  };

  const handleRevoke = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'Revoke Access?',
      text: "User will no longer be able to see this content.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Revoke',
      confirmButtonColor: '#ef4444',
      customClass: { container: 'swal2-high-z' }
    });

    if (!confirm.isConfirmed) return;

    setIsLoading(true);
    const { error } = await supabase.from('resource_shares').delete().eq('id', id);
    if (!error) {
      Swal.fire({ 
        title: 'Access Revoked', 
        icon: 'success', 
        toast: true, 
        backdrop: false, 
        position: 'top-end', 
        showConfirmButton: false, 
        timer: 1500,
        customClass: { container: 'swal2-high-z' }
      });
      fetchShares();
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Failed to revoke access',
        icon: 'error',
        customClass: { container: 'swal2-high-z' }
      });
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md"
        >
          <GlassCard className="p-6 border-slate-200/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-bca-blue/10 rounded-2xl shadow-inner">
                  <Users className="w-5 h-5 text-bca-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                    {resourceId ? 'Item Access' : 'Module Access'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {resourceLabel || moduleName}
                  </p>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose} className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </Button>
            </div>

            <div className="flex flex-col gap-3 mb-8 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <Input
                placeholder="User ID"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="font-mono text-[11px] bg-transparent border-transparent focus:ring-0"
              />
              <Button 
                onClick={handleShare} 
                disabled={isLoading || !newUserId} 
                className="bg-bca-blue hover:bg-bca-blue/90 text-white shadow-lg shadow-bca-blue/20 rounded-xl px-6 h-10"
              >
                 Grant Access
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authorized Users</h4>
                <div className="h-[1px] flex-1 bg-slate-100 ml-4"></div>
              </div>
              
              {shares.length === 0 ? (
                <div className="text-center py-10 px-6 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                  <ShieldAlert className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">No active shares for this {resourceId ? 'item' : 'module'}.</p>
                </div>
              ) : (
                <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {shares.map(share => (
                    <div key={share.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                          <Users className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 tracking-tight">
                            {usernames[share.shared_with_solver_id] || 'Unknown User'}
                          </span>
                          <code className="text-[9px] font-bold font-mono text-indigo-400 tracking-tighter">
                            {share.shared_with_solver_id.split('-')[0].toUpperCase()}
                          </code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleRevoke(share.id)}
                        disabled={isLoading}
                        className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <ShieldAlert className="w-12 h-12 text-indigo-600" />
              </div>
              <p className="text-[11px] text-indigo-600 font-bold leading-relaxed relative z-10 tracking-tight">
                Users with access can view this content in their "Shared" tab
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
