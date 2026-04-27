import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Pencil, Briefcase, Users, DollarSign, BookOpen, Heart, Box, HelpCircle } from 'lucide-react';
import { OwnedResource, ResourceType } from '@/src/lib/supabase';
import { Button, Input, Select, TextArea } from './UI';
import { cn } from '@/src/lib/utils';

interface OwnedResourcesProps {
  resources: OwnedResource[];
  onAdd: (resource: Partial<OwnedResource>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OwnedResource>) => void;
}

const RESOURCE_TYPES: { type: ResourceType; icon: any; color: string; hint: string }[] = [
  { type: 'Skills', icon: Briefcase, color: 'text-indigo-500', hint: 'Technical abilities, soft skills, or mastery.' },
  { type: 'Relations', icon: Users, color: 'text-rose-500', hint: 'Network, family, friends, or mentors.' },
  { type: 'Financial', icon: DollarSign, color: 'text-emerald-500', hint: 'Money, assets, or budget.' },
  { type: 'Knowledge', icon: BookOpen, color: 'text-amber-500', hint: 'Information, experience, or wisdom.' },
  { type: 'Religion', icon: Heart, color: 'text-purple-500', hint: 'Faith, spiritual support, or values.' },
  { type: 'Others', icon: Box, color: 'text-slate-500', hint: 'Physical tools, location, or time.' }
];

export function OwnedResources({ resources, onAdd, onDelete, onUpdate }: OwnedResourcesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newResource, setNewResource] = useState<Partial<OwnedResource>>({
    name: '',
    type: 'Skills',
    description: ''
  });

  const handleEdit = (resource: OwnedResource) => {
    setNewResource({
      name: resource.name,
      type: resource.type,
      description: resource.description
    });
    setEditingId(resource.id);
    setIsAdding(true);
  };

  const getIcon = (type: ResourceType) => {
    const found = RESOURCE_TYPES.find(r => r.type === type);
    return found ? found.icon : Box;
  };

  const getColor = (type: ResourceType) => {
    const found = RESOURCE_TYPES.find(r => r.type === type);
    return found ? found.color : 'text-slate-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Box className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Owned Resources</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Map your strengths to conquer challenges</p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setEditingId(null);
            setNewResource({ name: '', type: 'Skills', description: '' });
            setIsAdding(true);
          }} 
          className="h-10 px-4 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </Button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resource Name</label>
              <Input 
                placeholder="e.g., Expert JavaScript Skill" 
                value={newResource.name}
                onChange={e => setNewResource({ ...newResource, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resource Type</label>
              <Select 
                value={newResource.type}
                onChange={e => setNewResource({ ...newResource, type: e.target.value as ResourceType })}
              >
                {RESOURCE_TYPES.map(r => (
                  <option key={r.type} value={r.type}>{r.type}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description / Hint</label>
            <TextArea 
              placeholder="How this resource helps you?"
              value={newResource.description}
              onChange={e => setNewResource({ ...newResource, description: e.target.value })}
            />
            <div className="mt-2 p-3 bg-white/50 border border-slate-100 rounded-xl flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-bca-blue mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500 italic">
                {RESOURCE_TYPES.find(r => r.type === newResource.type)?.hint}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (newResource.name) {
                if (editingId) onUpdate(editingId, newResource);
                else onAdd(newResource);
                setIsAdding(false);
                setEditingId(null);
              }
            }}>{editingId ? 'Update' : 'Save Resource'}</Button>
          </div>
        </motion.div>
      )}

      {resources.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Box className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-sm">No resources mapped yet.</p>
          <p className="text-slate-400 text-xs mt-1">Start by listing what you have to help solve this problem.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => {
            const Icon = getIcon(resource.type);
            const colorClass = getColor(resource.type);
            return (
              <motion.div 
                layout
                key={resource.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={cn("p-2 rounded-xl bg-slate-50", colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(resource)}
                      className="p-1.5 text-slate-400 hover:text-bca-blue hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDelete(resource.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{resource.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{resource.description}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-tighter", colorClass)}>
                    {resource.type}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
