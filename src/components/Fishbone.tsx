import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronRight, Target, CheckCircle2, Clock, XCircle } from 'lucide-react';
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

export function Fishbone({ causes, onAdd, onDelete, onToggleHighlight, onUpdateStatus }: FishboneProps) {
  const [newCause, setNewCause] = useState('');
  const [activeParent, setActiveParent] = useState<string | null>(null);

  const rootLevel = causes.filter(c => !c.parent_id);

  const renderCause = (cause: RootCause, level: number = 0) => {
    const children = causes.filter(c => c.parent_id === cause.id);
    
    return (
      <div key={cause.id} className="ml-4 mt-3 border-l border-slate-200 pl-4 relative">
        <div className={cn(
          "group relative p-3 rounded-lg transition-all bg-white border border-slate-200 shadow-sm",
          cause.is_highlighted && "border-2 border-bca-blue shadow-[0_0_10px_rgba(0,51,153,0.1)]"
        )}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-slate-900">{cause.cause}</span>
                {cause.is_highlighted && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-bca-blue/10 text-bca-blue font-bold uppercase">Main Root</span>
                )}
              </div>
            </div>
            <Badge variant={cause.status} className="text-[9px] px-1.5 py-0.5">{cause.status}</Badge>
          </div>

          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onToggleHighlight(cause.id)}
              className={cn("text-[10px] font-bold uppercase tracking-wider", cause.is_highlighted ? "text-bca-blue" : "text-slate-400 hover:text-bca-blue")}
            >
              {cause.is_highlighted ? 'Highlighted' : 'Highlight'}
            </button>
            <span className="text-slate-300">|</span>
            <div className="flex gap-1">
              {(['Success', 'Pending', 'Cancel'] as Status[]).map(s => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(cause.id, s)}
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded transition-all font-bold uppercase",
                    cause.status === s ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-slate-300">|</span>
            <button 
              onClick={() => onDelete(cause.id)}
              className="text-rose-400 hover:text-rose-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          
          <button 
            onClick={() => setActiveParent(activeParent === cause.id ? null : cause.id)}
            className={cn(
              "absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10",
              activeParent === cause.id ? "bg-bca-blue text-white" : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-50"
            )}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <AnimatePresence>
          {activeParent === cause.id && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-6 mt-2 overflow-hidden"
            >
              <div className="flex gap-2">
                <Input 
                  placeholder="Why? (Root of root...)" 
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
                />
                <Button 
                  onClick={() => {
                    if (newCause) {
                      onAdd(newCause, cause.id);
                      setNewCause('');
                      setActiveParent(null);
                    }
                  }}
                  className="py-1.5 text-sm"
                >
                  Add
                </Button>
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-bca-blue" />
          Root Cause Analysis (Fishbone)
        </h3>
        <Button 
          variant="secondary" 
          onClick={() => setActiveParent(activeParent === 'root' ? null : 'root')}
          className="text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Primary Cause
        </Button>
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

      <div className="space-y-2">
        {rootLevel.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400">No root causes documented yet.</p>
          </div>
        ) : (
          rootLevel.map(cause => renderCause(cause))
        )}
      </div>
    </div>
  );
}
