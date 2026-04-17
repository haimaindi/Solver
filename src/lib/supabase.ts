import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Status = 'Success' | 'Pending' | 'Cancel';

export interface RootCause {
  id: string;
  problem_id: string;
  cause: string;
  parent_id: string | null; // For fishbone nesting
  is_highlighted: boolean;
  status: Status;
  created_at: string;
}

export interface ActionPlan {
  id: string;
  problem_id: string;
  user_id: string;
  description: string;
  is_controllable: boolean;
  is_feasible: boolean;
  scheduled_date: string | null;
  status: Status;
  is_archived: boolean;
  notes: string;
  created_at: string;
}

export interface Problem {
  id: string;
  title: string;
  category: string;
  context: string;
  significance: number; // 1-10
  impact: string;
  status: Status;
  is_archived: boolean;
  completion_date: string | null;
  outcome: string;
  created_at: string;
  user_id: string;
}

export interface Reflection {
  id: string;
  mode: 'GIBBS' | 'ROLFE' | '4L';
  title: string;
  content: Record<string, any>;
  satisfaction_label: 'Need Evaluation' | 'Dissatisfied' | 'Neutral' | 'Satisfied' | 'Very Satisfied';
  satisfaction_color: string;
  created_at: string;
  user_id: string | null;
  is_archived: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  type: 'build' | 'break';
  color: string;
  is_archived: boolean;
  created_at: string;
  user_id: string | null;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string; // YYYY-MM-DD
  comment?: string;
  is_completed: boolean;
  created_at: string;
}

export interface AppAccess {
  id: string;
  code: string;
  password: string;
  username?: string;
  start_date?: string;
  duration?: number;
  end_date?: string;
  is_unlimited?: boolean;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  task: string;
  description: string;
  target_time: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  is_archived: boolean;
  impact_level: 'High' | 'Low';
  effort_level: 'High' | 'Low';
  created_at: string;
}
