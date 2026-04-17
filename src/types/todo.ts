export interface Todo {
  id: string;
  user_id: string;
  task: string;
  target_time: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  is_archived: boolean;
  created_at: string;
}
