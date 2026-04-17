import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronRight, Target, CheckCircle2, Clock, XCircle, Pencil } from 'lucide-react';
import { RootCause, Status } from '@/src/lib/supabase';
import { Button, Input, Badge } from './UI';
import { cn } from '@/src/lib/utils';

interface FishboneProps {
  causes: RootCause[];
  onAdd: (cause: string, parentId: string | null) => void;
  onDelete: (id: string) => void;
  onToggleHighlight: (id: string) => void;
  onUpdateStatus: (id: string, status: Status) => void;
}

export function Fishbone({ causes, onAdd, onDelete, onToggleHighlight, onUpdateStatus, onUpdateCause }: FishboneProps & { onUpdateCause: (id: string, cause: string) => void }) {
  const [newCause, setNewCause] = useState('');
  const [activeParent, setActiveParent] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (cause: RootCause) => {
    setEditingId(cause.id);
    setEditValue(cause.cause);
  };

  const handleSaveEdit = () => {
    if (editingId && editValue) {
      onUpdateCause(editingId, editValue);
      setEditingId(null);
      setEditValue('');
    }
  };

  const rootLevel = causes.filter(c => !c.parent_id);

  const renderCause = (cause: RootCause, level: number = 0) => {
    const children = causes.filter(c => c.parent_id === cause.id);
    
    return (
      <div key={cause.id} className="ml-2 sm:ml-4 mt-3 border-l border-slate-200 pl-3 sm:pl-4 relative">
        <div className={cn(
          "group relative p-3 rounded-lg transition-all bg-white border border-slate-200 shadow-sm",
          cause.is_highlighted && "border-2 border-bca-blue shadow-[0_0_10px_rgba(0,51,153,0.1)]"
        )}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {editingId === cause.id ? (
                  <div className="flex gap-2 w-full">
                    <Input 
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="py-1 text-xs"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <Button onClick={handleSaveEdit} className="py-1 px-2 text-[10px]">Save</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-[12px] sm:text-[13px] font-semibold text-slate-900 [overflow-wrap:anywhere] break-all leading-tight">{cause.cause}</span>
                    {cause.is_highlighted && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-bca-blue/10 text-bca-blue font-bold uppercase whitespace-nowrap">Main Root</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-3 mt-3 transition-opacity">
            <button 
              onClick={() => onToggleHighlight(cause.id)}
              className={cn("text-[10px] font-bold uppercase tracking-wider", cause.is_highlighted ? "text-bca-blue" : "text-slate-400 hover:text-bca-blue")}
            >
              {cause.is_highlighted ? 'Highlighted' : 'Highlight'}
            </button>
            <span className="text-slate-300">|</span>
            <div className="flex flex-wrap gap-1">
              {(['Success', 'Pending', 'Cancel'] as Status[]).map(s => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(cause.id, s)}
                  className={cn(
                    "text-[9px] px-2 py-1 rounded transition-all font-bold uppercase",
                    cause.status === s 
                      ? (s === 'Success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : s === 'Pending' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-600 border border-rose-100")
                      : "text-slate-400 hover:bg-slate-50 border border-transparent"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleStartEdit(cause)}
                className="text-bca-blue hover:text-bca-blue/80 p-1.5 bg-bca-blue/5 rounded"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onDelete(cause.id)}
                className="text-rose-500 hover:text-rose-600 p-1.5 bg-rose-50 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setActiveParent(activeParent === cause.id ? null : cause.id)}
            className={cn(
               "absolute -right-2 top-10 sm:top-1/2 -translate-y-1/2 min-w-[24px] h-6 rounded-full flex items-center justify-center transition-all shadow-md z-10 px-1 border group",
               activeParent === cause.id ? "bg-bca-blue text-white border-bca-blue" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
            )}
            title="Add deeper cause"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-tight ml-1 overflow-hidden transition-all duration-300",
              activeParent === cause.id ? "max-w-[100px] opacity-100" : "max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100"
            )}>
              {activeParent === cause.id ? "Close" : "Dig Deeper"}
            </span>
          </button>
        </div>

        <AnimatePresence>
          {activeParent === cause.id && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-2 sm:ml-6 mt-2 overflow-hidden border-l-2 border-dashed border-bca-blue/20 pl-4 py-2"
            >
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-bca-blue uppercase tracking-widest pl-1">
                  What is the cause that makes this happen?
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder={`Why did "${cause.cause}" happen?`}
                    value={newCause}
                    onChange={e => setNewCause(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCause) {
                        onAdd(newCause, cause.id);
                        setNewCause('');
                        setActiveParent(null);
                      }
                    }}
                    className="py-1.5 text-sm"
                    autoFocus
                  />
                  <Button 
                    onClick={() => {
                      if (newCause) {
                        onAdd(newCause, cause.id);
                        setNewCause('');
                        setActiveParent(null);
                      }
                    }}
                    className="py-1.5 text-sm whitespace-nowrap"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {children.map(child => renderCause(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-bca-blue/10 flex items-center justify-center mx-auto sm:mx-0">
            <Target className="w-5 h-5 text-bca-blue" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Root Cause Analysis</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Identify the factors behind each cause to reach the real root.</p>
          </div>
        </div>
        <div className="flex justify-end items-center gap-2">
          <Button 
            onClick={() => setActiveParent(activeParent === 'root' ? null : 'root')} 
            variant="secondary" 
            className="h-10 px-6 flex items-center gap-2 border-bca-blue/20 text-bca-blue hover:bg-bca-blue/5 whitespace-nowrap shadow-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="inline">Add Primary Cause</span>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {activeParent === 'root' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-200"
          >
            <div className="flex gap-2">
              <Input 
                placeholder="Enter primary cause..." 
                value={newCause}
                onChange={e => setNewCause(e.target.value)}
                autoFocus
              />
              <Button onClick={() => {
                if (newCause) {
                  onAdd(newCause, null);
                  setNewCause('');
                  setActiveParent(null);
                }
              }}>Add</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-4">
        <div className="space-y-4">
          {rootLevel.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400">No root causes documented yet.</p>
            </div>
          ) : (
            rootLevel.map(cause => renderCause(cause))
          )}
        </div>
      </div>
    </div>
  );
}
