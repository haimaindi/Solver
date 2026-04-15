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
  description: string;
  is_controllable: boolean;
  is_feasible: boolean;
  scheduled_date: string | null;
  status: Status;
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
  completion_date: string | null;
  outcome: string;
  created_at: string;
  user_id: string;
}
