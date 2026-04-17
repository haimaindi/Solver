import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Calendar, CheckCircle2, XCircle, Clock, Settings, Zap, Pencil } from 'lucide-react';
import { ActionPlan, Status } from '@/src/lib/supabase';
import { Button, Input, Badge, Select, TextArea } from './UI';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';

interface ActionPlanProps {
  plans: ActionPlan[];
  onAdd: (plan: Partial<ActionPlan>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ActionPlan>) => void;
}

export function ActionPlanManager({ plans, onAdd, onDelete, onUpdate }: ActionPlanProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState<Partial<ActionPlan>>({
    description: '',
    is_controllable: true,
    is_feasible: true,
    status: 'Pending',
    notes: ''
  });

  const handleEdit = (plan: ActionPlan) => {
    setNewPlan({
      description: plan.description,
      is_controllable: plan.is_controllable,
      is_feasible: plan.is_feasible,
      status: plan.status,
      notes: plan.notes || '',
      scheduled_date: plan.scheduled_date
    });
    setEditingId(plan.id);
    setIsAdding(true);
  };

  const controllable = plans.filter(p => p.is_controllable);
  const uncontrollable = plans.filter(p => !p.is_controllable);

  const renderPlanCard = (plan: ActionPlan) => (
    <motion.div 
      layout
      key={plan.id}
      className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-slate-900 leading-tight">{plan.description}</p>
          <div className="flex items-center gap-3 mt-2">
            {plan.is_controllable && (
              <>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Calendar className="w-3 h-3" />
                  {plan.scheduled_date ? format(new Date(plan.scheduled_date), 'MMM d, yyyy') : 'No date'}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight">
                  {plan.is_feasible ? (
                    <span className="text-emerald-500 flex items-center gap-0.5">✓ Feasible</span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-0.5">X Not Feasible</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <Badge variant={plan.status} className="text-[9px] px-1.5 py-0.5">{plan.status}</Badge>
      </div>

      {plan.notes && (
        <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-md mb-2 italic leading-relaxed">
          "{plan.notes}"
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-50 transition-opacity">
        <div className="flex gap-1">
          {(['Success', 'Pending', 'Cancel'] as Status[]).map(s => (
            <button
              key={s}
              onClick={() => onUpdate(plan.id, { status: s })}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded transition-all font-bold uppercase",
                plan.status === s 
                  ? (s === 'Success' ? "bg-emerald-50 text-emerald-600" : s === 'Pending' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600")
                  : "text-slate-400 hover:bg-slate-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleEdit(plan)}
            className="text-bca-blue hover:text-bca-blue/80 p-1 bg-bca-blue/5 rounded transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onDelete(plan.id)}
            className="text-rose-500 hover:text-rose-600 p-1 bg-rose-50 rounded transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-bca-blue/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-bca-blue" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Action Plan</h3>
        </div>
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              setEditingId(null);
              setNewPlan({
                description: '',
                is_controllable: true,
                is_feasible: true,
                status: 'Pending',
                notes: ''
              });
              setIsAdding(true);
            }} 
            className="h-10 px-4 flex items-center gap-2 shadow-lg shadow-bca-blue/20 whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Action</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900">{editingId ? 'Edit Action Plan' : 'New Action Plan'}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Action Description</label>
              <Input 
                placeholder="What needs to be done?" 
                value={newPlan.description}
                onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Control</label>
              <Select 
                value={newPlan.is_controllable ? 'true' : 'false'}
                onChange={e => setNewPlan({ ...newPlan, is_controllable: e.target.value === 'true' })}
              >
                <option value="true">Controllable</option>
                <option value="false">Uncontrollable</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {newPlan.is_controllable && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Schedule Date</label>
                  <Input 
                    type="date"
                    className="bg-white border-slate-200"
                    value={newPlan.scheduled_date ? format(new Date(newPlan.scheduled_date), 'yyyy-MM-dd') : ''}
                    onClick={(e) => {
                      if (e.currentTarget.showPicker) {
                        try { e.currentTarget.showPicker(); } catch (err) {}
                      }
                    }}
                    onKeyDown={(e) => e.preventDefault()}
                    onChange={e => setNewPlan({ ...newPlan, scheduled_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Feasibility</label>
                  <Select 
                    value={newPlan.is_feasible ? 'true' : 'false'}
                    onChange={e => setNewPlan({ ...newPlan, is_feasible: e.target.value === 'true' })}
                  >
                    <option value="true">Feasible</option>
                    <option value="false">Not Feasible</option>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Initial Status</label>
              <Select 
                value={newPlan.status}
                onChange={e => setNewPlan({ ...newPlan, status: e.target.value as Status })}
              >
                <option value="Pending">Pending</option>
                <option value="Success">Success</option>
                <option value="Cancel">Cancel</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Notes / Outcome</label>
            <TextArea 
              placeholder="Any additional details or results..."
              value={newPlan.notes}
              onChange={e => setNewPlan({ ...newPlan, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (newPlan.description) {
                if (editingId) {
                  onUpdate(editingId, newPlan);
                } else {
                  onAdd(newPlan);
                }
                setIsAdding(false);
                setEditingId(null);
                setNewPlan({
                  description: '',
                  is_controllable: true,
                  is_feasible: true,
                  status: 'Pending',
                  notes: ''
                });
              }
            }}>{editingId ? 'Update Action' : 'Save Action Plan'}</Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-bca-blue [&::-webkit-scrollbar-track]:bg-slate-100 min-w-0">
        {/* Controllable Column */}
        <div className="space-y-4 min-w-[300px]">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <div className="w-2 h-2 rounded-full bg-bca-blue" />
            <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Controllable (Internal)</h4>
            <span className="ml-auto text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{controllable.length}</span>
          </div>
          <div className="space-y-3">
            {controllable.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm italic">No internal actions defined.</p>
            ) : (
              controllable.map(renderPlanCard)
            )}
          </div>
        </div>

        {/* Uncontrollable Column */}
        <div className="space-y-4 min-w-[300px]">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Uncontrollable (External)</h4>
            <span className="ml-auto text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{uncontrollable.length}</span>
          </div>
          <div className="space-y-3">
            {uncontrollable.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm italic">No external factors identified.</p>
            ) : (
              uncontrollable.map(renderPlanCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
