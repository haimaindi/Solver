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
}

export function AccessManagerModal({ isOpen, onClose, moduleName }: AccessManagerModalProps) {
  const [shares, setShares] = useState<any[]>([]);
  const [newSolverId, setNewSolverId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchShares();
  }, [isOpen, moduleName]);

  const fetchShares = async () => {
    const currentUser = localStorage.getItem('user_id');
    if (!currentUser) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('module_shares')
      .select('*')
      .eq('module_name', moduleName)
      .eq('shared_by', currentUser)
      .order('created_at', { ascending: false });
    
    if (data) setShares(data);
    setIsLoading(false);
  };

  const handleShare = async () => {
    if (!newSolverId.trim()) return;
    
    const mySolverId = localStorage.getItem('solver_id');
    if (newSolverId.trim() === mySolverId) {
       Swal.fire('Error', 'You cannot share with yourself', 'error');
       return;
    }

    setIsLoading(true);
    const currentUser = localStorage.getItem('user_id');
    const { error } = await supabase.from('module_shares').insert([{
      module_name: moduleName,
      shared_by: currentUser,
      shared_with_solver_id: newSolverId.trim()
    }]);

    if (error) {
       if (error.code === '23505') {
          Swal.fire('Notice', 'Already shared with this Solver ID', 'info');
       } else {
          Swal.fire('Error', 'Failed to grant access', 'error');
       }
    } else {
       Swal.fire({ title: 'Access Granted', icon: 'success', toast: true, backdrop: false, position: 'top-end', showConfirmButton: false, timer: 1500 });
       setNewSolverId('');
       fetchShares();
    }
    setIsLoading(false);
  };

  const handleRevoke = async (id: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('module_shares').delete().eq('id', id);
    if (!error) {
      Swal.fire({ title: 'Access Revoked', icon: 'success', toast: true, backdrop: false, position: 'top-end', showConfirmButton: false, timer: 1500 });
      fetchShares();
    } else {
      Swal.fire('Error', 'Failed to revoke access', 'error');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md"
        >
          <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-bca-blue/10 rounded-xl">
                  <Users className="w-5 h-5 text-bca-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">Module Access</h3>
                  <p className="text-xs font-semibold text-slate-500">Manage who can view your data</p>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose} className="p-2 -mr-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </Button>
            </div>

            <div className="flex gap-2 mb-6">
              <Input
                placeholder="Enter Solver ID (e.g. A1B2c3D)"
                value={newSolverId}
                onChange={(e) => setNewSolverId(e.target.value)}
                className="font-mono text-sm uppercase"
                maxLength={7}
              />
              <Button onClick={handleShare} disabled={isLoading || !newSolverId} className="bg-bca-blue hover:bg-bca-blue/90 text-white shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Granted Access</h4>
              {shares.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl">
                  <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No one has access to this module.</p>
                </div>
              ) : (
                shares.map(share => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-500" />
                      </div>
                      <code className="text-sm font-bold font-mono text-slate-700 bg-white px-2 py-1 rounded shadow-sm">
                        {share.shared_with_solver_id}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleRevoke(share.id)}
                      disabled={isLoading}
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600/80 font-medium leading-relaxed">
                <strong className="font-bold text-blue-700">Note:</strong> Users you share with will have 
                <span className="font-bold"> read-only access </span> to all current and future data in this module.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
