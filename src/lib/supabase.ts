import { createClient } from '@supabase/supabase-js';
import { Task, User, Submission } from '../types';

// Supabase URL and Anon Key (provided by user)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gzrhexrtdvjitifsdcsv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cmhleHJ0ZHZqaXRpZnNkY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MzY5OTQsImV4cCI6MjEwNTMxMjk5NH0.II-IRV04VYtaRbHOnU6lD9Ql_YVL99_OIT8PRZbHjbA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SQL script for setting up the Supabase database
export const SETUP_SQL = `-- Create custom_users table
CREATE TABLE IF NOT EXISTS custom_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  balance NUMERIC DEFAULT 100.00,
  role TEXT NOT NULL DEFAULT 'advertiser',
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  countries TEXT[] NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  workers_needed INTEGER NOT NULL DEFAULT 20,
  worker_pay NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  instructions TEXT NOT NULL,
  require_proof BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_email TEXT NOT NULL,
  proof_text TEXT NOT NULL,
  proof_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) bypass / public access for ease of use in demo
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow public read/write policies since we are using anon key for simplicity
CREATE POLICY "Public full access on custom_users" ON custom_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

-- Insert dummy admin user (password: admin123)
INSERT INTO custom_users (id, email, balance, role, password, created_at)
VALUES ('admin-id', 'admin@taskzone.com', 9999.00, 'admin', 'admin123', NOW())
ON CONFLICT (id) DO NOTHING;
`;

// Helper to determine if we are currently falling back to LocalStorage
export let isUsingFallback = false;

export function setUsingFallback(val: boolean) {
  isUsingFallback = val;
}

// Check database connection and tables existence
export async function testDbConnection(): Promise<{ connected: boolean; hasTables: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.from('custom_users').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        isUsingFallback = true;
        return { connected: true, hasTables: false, error: 'Tables do not exist. Please run the SQL schema.' };
      }
      isUsingFallback = true;
      return { connected: false, hasTables: false, error: error.message };
    }
    isUsingFallback = false;
    return { connected: true, hasTables: true };
  } catch (err: any) {
    isUsingFallback = true;
    return { connected: false, hasTables: false, error: err.message };
  }
}

// Local Storage Fallback helpers
const LS_KEYS = {
  USERS: 'taskzone_fallback_users',
  TASKS: 'taskzone_fallback_tasks',
  SUBMISSIONS: 'taskzone_fallback_submissions'
};

const getLS = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const setLS = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Initial local storage values if none exist
const defaultUsers: User[] = [
  {
    id: 'admin-id',
    email: 'admin@taskzone.com',
    balance: 9999.00,
    role: 'admin',
    password: 'admin123',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-advertiser',
    email: 'demo@taskzone.com',
    balance: 100.00,
    role: 'advertiser',
    password: 'password123',
    created_at: new Date().toISOString()
  }
];

const defaultTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Watch YouTube Video and Subscribe',
    zone: 'International Zone (Global - Cheap)',
    countries: ['All Countries'],
    category: 'YouTube',
    duration: '3 Days',
    workers_needed: 20,
    worker_pay: 0.08,
    total_cost: 1.60,
    instructions: '1. Go to YouTube and search for "TaskZone Tutorial".\n2. Watch the full video (at least 2 minutes).\n3. Like and subscribe to the channel.\n4. Take a screenshot showing your subscription.',
    require_proof: true,
    status: 'approved',
    created_by: 'demo-advertiser',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'task-2',
    title: 'Sign up on Crypto Wallet App',
    zone: 'USA / Western Zone (US, CA, UK, AU, NZ)',
    countries: ['United States', 'Canada'],
    category: 'Sign up',
    duration: '7 Days',
    workers_needed: 25,
    worker_pay: 0.30,
    total_cost: 7.50,
    instructions: '1. Download the app using our referral link.\n2. Complete the basic registration.\n3. Verify your email address.\n4. Submit your registered username as text proof.',
    require_proof: false,
    status: 'approved',
    created_by: 'demo-advertiser',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

const defaultSubmissions: Submission[] = [];

// Initialize LocalStorage if empty
if (!localStorage.getItem(LS_KEYS.USERS)) setLS(LS_KEYS.USERS, defaultUsers);
if (!localStorage.getItem(LS_KEYS.TASKS)) setLS(LS_KEYS.TASKS, defaultTasks);
if (!localStorage.getItem(LS_KEYS.SUBMISSIONS)) setLS(LS_KEYS.SUBMISSIONS, defaultSubmissions);

// Database Operations
export async function getUsers(): Promise<User[]> {
  if (isUsingFallback) {
    return getLS<User[]>(LS_KEYS.USERS, defaultUsers);
  }
  try {
    const { data, error } = await supabase.from('custom_users').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to LocalStorage', err);
    isUsingFallback = true;
    return getLS<User[]>(LS_KEYS.USERS, defaultUsers);
  }
}

export async function saveUser(user: User): Promise<User> {
  if (isUsingFallback) {
    const users = getLS<User[]>(LS_KEYS.USERS, defaultUsers);
    // Avoid duplicates
    const idx = users.findIndex(u => u.email === user.email || u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setLS(LS_KEYS.USERS, users);
    return user;
  }
  try {
    const { data, error } = await supabase.from('custom_users').upsert(user).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save user failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveUser(user);
  }
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  if (isUsingFallback) {
    const users = getLS<User[]>(LS_KEYS.USERS, defaultUsers);
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx].balance = parseFloat(newBalance.toFixed(2));
      setLS(LS_KEYS.USERS, users);
    }
    return;
  }
  try {
    const { error } = await supabase.from('custom_users').update({ balance: parseFloat(newBalance.toFixed(2)) }).eq('id', userId);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase update balance failed, using LocalStorage', err);
    isUsingFallback = true;
    await updateUserBalance(userId, newBalance);
  }
}

export async function getTasks(): Promise<Task[]> {
  if (isUsingFallback) {
    return getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
  }
  try {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch tasks failed, using LocalStorage', err);
    isUsingFallback = true;
    return getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
  }
}

export async function saveTask(task: Task): Promise<Task> {
  if (isUsingFallback) {
    const tasks = getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
    tasks.push(task);
    setLS(LS_KEYS.TASKS, tasks);
    return task;
  }
  try {
    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save task failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveTask(task);
  }
}

export async function updateTaskStatus(taskId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (isUsingFallback) {
    const tasks = getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      tasks[idx].status = status;
      setLS(LS_KEYS.TASKS, tasks);
    }
    return;
  }
  try {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase update task status failed, using LocalStorage', err);
    isUsingFallback = true;
    await updateTaskStatus(taskId, status);
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  if (isUsingFallback) {
    return getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
  }
  try {
    const { data, error } = await supabase.from('submissions').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch submissions failed, using LocalStorage', err);
    isUsingFallback = true;
    return getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
  }
}

export async function saveSubmission(submission: Submission): Promise<Submission> {
  if (isUsingFallback) {
    const submissions = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
    submissions.push(submission);
    setLS(LS_KEYS.SUBMISSIONS, submissions);
    return submission;
  }
  try {
    const { data, error } = await supabase.from('submissions').insert(submission).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save submission failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveSubmission(submission);
  }
}

export async function updateSubmissionStatus(submissionId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (isUsingFallback) {
    const submissions = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
    const idx = submissions.findIndex(s => s.id === submissionId);
    if (idx >= 0) {
      submissions[idx].status = status;
      setLS(LS_KEYS.SUBMISSIONS, submissions);
    }
    return;
  }
  try {
    const { error } = await supabase.from('submissions').update({ status }).eq('id', submissionId);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase update submission status failed, using LocalStorage', err);
    isUsingFallback = true;
    await updateSubmissionStatus(submissionId, status);
  }
}
